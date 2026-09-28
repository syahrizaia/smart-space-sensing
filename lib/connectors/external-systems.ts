import "server-only";
import type {
  EnergyZoneReading,
  AnalyticsHistoryRow,
  FacilityStatus,
  MachineStatus,
  ProductionSchedule,
  WifiZoneActivity,
} from "./sensor-types";
import { readMqttWifiActivity, SensorConnectionError } from "./mqtt-client";

export type SourceResult<T> = {
  source: string;
  status: "connected" | "not_configured" | "error";
  timestamp: string;
  data: T[];
  error?: string;
};

type SourceConfig = {
  name: string;
  urlKey: string;
  tokenKey: string;
};

const configs = {
  wifi: { name: "wifi-csi", urlKey: "WIFI_CSI_API_URL", tokenKey: "WIFI_CSI_API_TOKEN" },
  energy: { name: "energy-meter", urlKey: "ENERGY_METER_API_URL", tokenKey: "ENERGY_METER_API_TOKEN" },
  bms: { name: "bms-hvac", urlKey: "BMS_API_URL", tokenKey: "BMS_API_TOKEN" },
  plc: { name: "plc", urlKey: "PLC_API_URL", tokenKey: "PLC_API_TOKEN" },
  mes: { name: "mes-scada", urlKey: "MES_API_URL", tokenKey: "MES_API_TOKEN" },
  analytics: { name: "analytics-history", urlKey: "ANALYTICS_HISTORY_API_URL", tokenKey: "ANALYTICS_HISTORY_API_TOKEN" },
} satisfies Record<string, SourceConfig>;

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function rows(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.map(record);
  const root = record(value);
  const candidates = [root.data, root.items, root.results];
  const list = candidates.find(Array.isArray);
  return Array.isArray(list) ? list.map(record) : [root];
}

function str(row: Record<string, unknown>, keys: string[], fallback = ""): string {
  for (const key of keys) if (typeof row[key] === "string" && (row[key] as string).trim()) return (row[key] as string).trim();
  return fallback;
}

function num(row: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return undefined;
}

function bool(row: Record<string, unknown>, keys: string[]): boolean | undefined {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "boolean") return value;
    if (value === 1 || value === "1" || value === "true") return true;
    if (value === 0 || value === "0" || value === "false") return false;
  }
  return undefined;
}

function timestamp(row: Record<string, unknown>): string {
  const value = str(row, ["timestamp", "recordedAt", "updatedAt", "time", "ts"]);
  return Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : new Date().toISOString();
}

function canonicalStatus(value: string, options: string[]): string {
  const normalized = value.toLowerCase().replace(/[ _-]/g, "");
  const matches: Record<string, string> = {
    active: "active", occupied: "active", running: "active", on: "active", operational: "active",
    idle: "idle", standby: "idle", ready: "idle",
    offline: "offline", disconnected: "offline", unavailable: "offline",
    alarm: "alarm", fault: "alarm", error: "alarm", critical: "alarm",
    stopped: "stopped", stop: "stopped", down: "stopped",
  };
  const result = matches[normalized] ?? "unknown";
  return options.includes(result) ? result : "unknown";
}

async function readSource<T>(config: SourceConfig, map: (row: Record<string, unknown>) => T): Promise<SourceResult<T>> {
  const url = process.env[config.urlKey];
  const now = new Date().toISOString();
  if (!url) return { source: config.name, status: "not_configured", timestamp: now, data: [] };
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
    const localHttp = parsedUrl.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsedUrl.hostname);
    if (parsedUrl.protocol !== "https:" && !localHttp) {
      throw new Error("Gunakan HTTPS untuk koneksi API eksternal.");
    }
  } catch (error) {
    return { source: config.name, status: "error", timestamp: now, data: [], error: error instanceof Error ? error.message : "URL sumber tidak valid." };
  }
  const controller = new AbortController();
  const configuredTimeout = Number(process.env.EXTERNAL_API_TIMEOUT_MS ?? 5000);
  const timeout = Number.isInteger(configuredTimeout) && configuredTimeout >= 100 && configuredTimeout <= 30000
    ? configuredTimeout
    : 5000;
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(parsedUrl, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(process.env[config.tokenKey] ? { Authorization: `Bearer ${process.env[config.tokenKey]}` } : {}),
      },
    });
    if (!response.ok) throw new Error(`Sumber eksternal merespons HTTP ${response.status}.`);
    const result = await response.json();
    return { source: config.name, status: "connected", timestamp: new Date().toISOString(), data: rows(result).map(map) };
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError"
      ? "Waktu tunggu sumber eksternal habis."
      : error instanceof Error ? error.message : "Gagal membaca sumber eksternal.";
    return { source: config.name, status: "error", timestamp: new Date().toISOString(), data: [], error: message };
  } finally {
    clearTimeout(timer);
  }
}

export async function getWifiActivity(): Promise<SourceResult<WifiZoneActivity>> {
  if (process.env.WIFI_CSI_API_URL) return readSource(configs.wifi, (row): WifiZoneActivity => {
    const status = canonicalStatus(str(row, ["activity", "status", "state"]), ["active", "idle", "offline"]);
    return {
      zoneId: str(row, ["zoneId", "zone_id", "areaId", "area_id", "id"], "unknown"),
      activity: status as WifiZoneActivity["activity"],
      occupied: bool(row, ["occupied", "isOccupied", "presence"]) ?? status === "active",
      ...(num(row, ["peopleCount", "occupancy", "count"]) !== undefined ? { peopleCount: num(row, ["peopleCount", "occupancy", "count"]) } : {}),
      ...(num(row, ["confidence", "score"]) !== undefined ? { confidence: num(row, ["confidence", "score"]) } : {}),
      timestamp: timestamp(row),
    };
  });
  if (!process.env.WIFI_CSI_MQTT_TOPIC || !process.env.MQTT_URL) {
    return { source: configs.wifi.name, status: "not_configured", timestamp: new Date().toISOString(), data: [] };
  }
  try {
    const activity = await readMqttWifiActivity();
    return { source: "wifi-csi-mqtt", status: "connected", timestamp: new Date().toISOString(), data: [activity] };
  } catch (error) {
    return {
      source: "wifi-csi-mqtt",
      status: "error",
      timestamp: new Date().toISOString(),
      data: [],
      error: error instanceof SensorConnectionError ? error.message : "Gagal membaca WiFi CSI MQTT.",
    };
  }
}

export function getEnergyReadings() {
  return readSource(configs.energy, (row): EnergyZoneReading => ({
    zoneId: str(row, ["zoneId", "zone_id", "areaId", "meterId", "id"], "unknown"),
    energyUsage: num(row, ["energyUsage", "energy", "consumption", "kwh"]) ?? 0,
    energyUnit: str(row, ["energyUnit", "unit"], "kWh"),
    ...(num(row, ["power", "demand", "kw"]) !== undefined ? { power: num(row, ["power", "demand", "kw"]) } : {}),
    powerUnit: str(row, ["powerUnit"], "kW"),
    timestamp: timestamp(row),
  }));
}

export function getFacilityStatuses() {
  return readSource(configs.bms, (row): FacilityStatus => ({
    id: str(row, ["id", "deviceId", "device_id", "equipmentId"], "unknown"),
    ...(str(row, ["zoneId", "zone_id", "areaId"]) ? { zoneId: str(row, ["zoneId", "zone_id", "areaId"]) } : {}),
    system: str(row, ["system", "type", "name"], "HVAC"),
    status: canonicalStatus(str(row, ["status", "state", "mode"]), ["active", "idle", "offline", "alarm", "unknown"]) as FacilityStatus["status"],
    ...(num(row, ["temperature", "temp", "temperatureC"]) !== undefined ? { temperature: num(row, ["temperature", "temp", "temperatureC"]) } : {}),
    temperatureUnit: str(row, ["temperatureUnit", "unit"], "°C"),
    ...(num(row, ["setpoint", "targetTemperature"]) !== undefined ? { setpoint: num(row, ["setpoint", "targetTemperature"]) } : {}),
    ...(str(row, ["mode", "operatingMode"]) ? { mode: str(row, ["mode", "operatingMode"]) } : {}),
    timestamp: timestamp(row),
  }));
}

export function getMachineStatuses() {
  return readSource(configs.plc, (row): MachineStatus => ({
    id: str(row, ["id", "machineId", "machine_id", "tag"], "unknown"),
    name: str(row, ["name", "machineName", "description"], "Machine"),
    lineId: str(row, ["lineId", "line_id", "line"], "unknown"),
    status: canonicalStatus(str(row, ["status", "state", "machineStatus"]), ["running", "idle", "stopped", "alarm", "unknown"]) as MachineStatus["status"],
    ...(str(row, ["product", "sku", "productName"]) ? { product: str(row, ["product", "sku", "productName"]) } : {}),
    ...(str(row, ["orderId", "order_id", "workOrder"]) ? { orderId: str(row, ["orderId", "order_id", "workOrder"]) } : {}),
    timestamp: timestamp(row),
  }));
}

export function getProductionSchedules() {
  return readSource(configs.mes, (row): ProductionSchedule => ({
    orderId: str(row, ["orderId", "order_id", "id"], "unknown"),
    lineId: str(row, ["lineId", "line_id", "line"], "unknown"),
    product: str(row, ["product", "sku", "productName"], "unknown"),
    plannedQuantity: num(row, ["plannedQuantity", "planned", "target", "quantity"]) ?? 0,
    ...(num(row, ["producedQuantity", "produced", "actual"]) !== undefined ? { producedQuantity: num(row, ["producedQuantity", "produced", "actual"]) } : {}),
    ...(str(row, ["startsAt", "start", "scheduledStart"]) ? { startsAt: str(row, ["startsAt", "start", "scheduledStart"]) } : {}),
    ...(str(row, ["endsAt", "end", "scheduledEnd"]) ? { endsAt: str(row, ["endsAt", "end", "scheduledEnd"]) } : {}),
    status: str(row, ["status", "state"], "scheduled"),
  }));
}

export function getAnalyticsHistory() {
  return readSource(configs.analytics, (row): AnalyticsHistoryRow => ({
    shift: str(row, ["shift", "shiftName", "shiftId"], "Unassigned"),
    energyKwh: num(row, ["energyKwh", "energy", "consumption", "kwh"]) ?? 0,
    utilizationPct: Math.max(0, Math.min(100, num(row, ["utilizationPct", "utilization", "areaUtilization"]) ?? 0)),
    ...(str(row, ["zoneId", "zone_id", "areaId"]) ? { zoneId: str(row, ["zoneId", "zone_id", "areaId"]) } : {}),
    ...(num(row, ["occupiedHours", "occupancyHours", "occupied_hours"]) !== undefined ? { occupiedHours: num(row, ["occupiedHours", "occupancyHours", "occupied_hours"]) } : {}),
    ...(str(row, ["period", "date", "businessDate"]) ? { period: str(row, ["period", "date", "businessDate"]) } : {}),
  }));
}
