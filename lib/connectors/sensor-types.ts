export type SensorReading = {
  sensorId: string;
  value: number;
  unit: string;
  timestamp: string;
};

export type WifiZoneActivity = {
  zoneId: string;
  activity: "active" | "idle" | "offline";
  occupied: boolean;
  peopleCount?: number;
  confidence?: number;
  timestamp: string;
};

export type EnergyZoneReading = {
  zoneId: string;
  energyUsage: number;
  energyUnit: string;
  power?: number;
  powerUnit?: string;
  timestamp: string;
};

export type FacilityStatus = {
  id: string;
  zoneId?: string;
  system: string;
  status: "active" | "idle" | "offline" | "alarm" | "unknown";
  temperature?: number;
  temperatureUnit?: string;
  setpoint?: number;
  mode?: string;
  timestamp: string;
};

export type MachineStatus = {
  id: string;
  name: string;
  lineId: string;
  status: "running" | "idle" | "stopped" | "alarm" | "unknown";
  product?: string;
  orderId?: string;
  timestamp: string;
};

export type ProductionSchedule = {
  orderId: string;
  lineId: string;
  product: string;
  plannedQuantity: number;
  producedQuantity?: number;
  startsAt?: string;
  endsAt?: string;
  status: string;
};

export type AnalyticsHistoryRow = {
  shift: string;
  energyKwh: number;
  utilizationPct: number;
  zoneId?: string;
  occupiedHours?: number;
  period?: string;
};

export type SensorResponse = { data: SensorReading; protocol: "mqtt" };

export function parseSensorReading(input: unknown): SensorReading {
  if (typeof input !== "object" || input === null) {
    throw new Error("Data sensor harus berupa objek.");
  }
  const data = input as Record<string, unknown>;
  if (
    typeof data.sensorId !== "string" || !data.sensorId.trim() ||
    typeof data.value !== "number" || !Number.isFinite(data.value) ||
    typeof data.unit !== "string" ||
    typeof data.timestamp !== "string" || !Number.isFinite(Date.parse(data.timestamp))
  ) {
    throw new Error("Data sensor harus memiliki sensorId, value, unit, dan timestamp yang valid.");
  }
  return { sensorId: data.sensorId, value: data.value, unit: data.unit, timestamp: data.timestamp };
}
