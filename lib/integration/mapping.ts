export const sources = ["wifi-csi", "energy-meter", "bms", "hvac", "plc", "mes", "scada"] as const;
export type Source = (typeof sources)[number];
type Row = Record<string, unknown>;

function object(value: unknown): Row {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected object");
  return value as Row;
}
function string(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) throw new Error("Expected non-empty string");
  return value.trim();
}
function number(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new Error("Expected non-negative number");
  return value;
}
function choice<T extends string>(value: unknown, options: readonly T[]): T {
  const normalized = string(value).toLowerCase();
  if (!options.includes(normalized as T)) throw new Error("Invalid enum");
  return normalized as T;
}
function timestamp(value: unknown): string {
  const raw = string(value);
  if (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(raw) || !Number.isFinite(Date.parse(raw))) throw new Error("Expected timestamp with timezone");
  return new Date(raw).toISOString();
}
function measurement(value: unknown, units: Record<string, number>): number {
  const data = object(value);
  const unit = string(data.unit);
  if (!Object.hasOwn(units, unit)) throw new Error("Unsupported unit");
  return number(number(data.value) * units[unit]);
}

/** Gateway contract is deliberately explicit; vendor adapters map into this schema. */
export function mapPayload(source: Source, payload: unknown) {
  const root = object(payload);
  if (!Array.isArray(root.data) || root.data.length > 10000) throw new Error("Expected data array with at most 10000 records");
  const ids = new Set<string>();
  return root.data.map((value) => {
    const row = object(value);
    const base = { id: string(row.id), zoneId: string(row.zoneId), source, observedAt: timestamp(row.observedAt) };
    if (ids.has(base.id)) throw new Error("Duplicate id");
    ids.add(base.id);
    if (source === "wifi-csi") {
      if (row.occupied !== null && typeof row.occupied !== "boolean") throw new Error("Expected boolean or null");
      return { ...base, kind: "occupancy" as const, status: choice(row.status, ["active", "idle", "offline"]), occupied: row.occupied,
        activity: choice(row.activity, ["motion", "stationary", "none", "unknown"]) };
    }
    if (source === "energy-meter" || source === "bms" || source === "hvac") {
      return { ...base, kind: "facility" as const, status: choice(row.status, ["running", "idle", "off", "fault", "offline", "unknown"]),
        energyKwh: row.energy == null ? null : measurement(row.energy, { Wh: 0.001, kWh: 1, MWh: 1000 }),
        powerKw: row.power == null ? null : measurement(row.power, { W: 0.001, kW: 1, MW: 1000 }) };
    }
    if (!Array.isArray(row.schedule)) throw new Error("Expected schedule array");
    const schedule = row.schedule.map((item) => {
      const entry = object(item);
      const startAt = timestamp(entry.startAt);
      const endAt = timestamp(entry.endAt);
      if (endAt <= startAt) throw new Error("Invalid schedule interval");
      return { orderId: string(entry.orderId), startAt, endAt };
    });
    return { ...base, kind: "production" as const, machineId: string(row.machineId), lineId: string(row.lineId),
      machineStatus: choice(row.machineStatus, ["running", "idle", "stopped", "fault", "offline", "unknown"]),
      lineStatus: choice(row.lineStatus, ["running", "idle", "stopped", "fault", "offline", "unknown"]), schedule };
  });
}
