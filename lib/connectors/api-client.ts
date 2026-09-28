import type {
  EnergyZoneReading,
  FacilityStatus,
  MachineStatus,
  ProductionSchedule,
  WifiZoneActivity,
} from "./sensor-types";

export type ApiSourceResult<T> = {
  source: string;
  status: "connected" | "not_configured" | "error";
  timestamp: string;
  data: T[];
  error?: string;
};

export type DashboardData = {
  data: {
    wifi: WifiZoneActivity[];
    energy: EnergyZoneReading[];
    facilities: FacilityStatus[];
    machines: MachineStatus[];
    schedules: ProductionSchedule[];
  };
  sources: Array<Omit<ApiSourceResult<unknown>, "data">>;
  generatedAt: string;
};

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { cache: "no-store", signal });
  const body = await response.json();
  if (!response.ok) throw new Error(typeof body?.error === "string" ? body.error : `API ${path} gagal (${response.status}).`);
  return body as T;
}

export function getWifiSensor(signal?: AbortSignal) {
  return getJson<{ data: ApiSourceResult<WifiZoneActivity> }>("/api/sensors/wifi", signal);
}

export function getFacilities(signal?: AbortSignal) {
  return getJson<{ data: { energy: ApiSourceResult<EnergyZoneReading>; bms: ApiSourceResult<FacilityStatus> } }>("/api/facilities", signal);
}

export function getOperations(signal?: AbortSignal) {
  return getJson<{ data: { machines: ApiSourceResult<MachineStatus>; schedules: ApiSourceResult<ProductionSchedule> } }>("/api/operations", signal);
}

export function getDashboardData(signal?: AbortSignal) {
  return getJson<DashboardData>("/api/dashboard", signal);
}
