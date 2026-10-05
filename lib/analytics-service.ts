import "server-only";
import { getFacilityMockData, getFacilityZoneName } from "@/lib/mockData";
import {
  getAnalyticsHistory,
  getEnergyReadings,
  getWifiActivity,
  type SourceResult,
} from "@/lib/connectors/external-systems";
import type { AnalyticsHistoryRow } from "@/lib/connectors/sensor-types";

const sampleShiftTrends = [
  { shift: "Shift A", period: "06:00–14:00", energyKwh: 798, utilizationPct: 57.5 },
  { shift: "Shift B", period: "14:00–22:00", energyKwh: 835, utilizationPct: 63.2 },
  { shift: "Shift C", period: "22:00–06:00", energyKwh: 702, utilizationPct: 41.8 },
];

export type AnalyticsZone = {
  zoneId: string;
  zone: string;
  energyKwh: number | null;
  occupied: boolean | null;
  utilizationPct: number | null;
  status: string;
  alert: boolean;
};

export type ShiftTrend = {
  shift: string;
  period?: string;
  energyKwh: number;
  utilizationPct: number;
};

function aggregateShiftHistory(rows: AnalyticsHistoryRow[]): ShiftTrend[] {
  const groups = new Map<string, AnalyticsHistoryRow[]>();
  for (const row of rows) groups.set(row.shift, [...(groups.get(row.shift) ?? []), row]);
  return [...groups.entries()].map(([shift, items]) => ({
    shift,
    ...(items.find((row) => row.period)?.period ? { period: items.find((row) => row.period)!.period } : {}),
    energyKwh: Number(items.reduce((sum, row) => sum + row.energyKwh, 0).toFixed(1)),
    utilizationPct: Number((items.reduce((sum, row) => sum + row.utilizationPct, 0) / items.length).toFixed(1)),
  }));
}

export async function getEnergyAnalytics(facility: "Jakarta Plant 01" | "Jakarta Plant 02" | "Jakarta Plant 03" = "Jakarta Plant 01") {
  const [wifi, energy, history] = await Promise.all([
    getWifiActivity(),
    getEnergyReadings(),
    getAnalyticsHistory(),
  ]);
  const configuredThreshold = Number(process.env.ENERGY_IDLE_THRESHOLD_KWH ?? 50);
  const idleThresholdKwh = Number.isFinite(configuredThreshold) && configuredThreshold >= 0
    ? configuredThreshold
    : 50;
  const demoMode = wifi.status === "not_configured" && energy.status === "not_configured";

  let rows: AnalyticsZone[];
  if (demoMode) {
    const facilityData = getFacilityMockData(facility);
    const usageByZone = new Map(facilityData.energyByZone.map((row) => [row.zone.toLowerCase(), row]));
    rows = facilityData.zones.map((zone) => {
      const sample = usageByZone.get(zone.name.toLowerCase()) ?? usageByZone.get(zone.name.replace("Cold Storage", "Cold store").toLowerCase());
      const energyKwh = sample?.energy ?? zone.energyUsage;
      const utilizationPct = sample ? Number((sample.occupancy / 8 * 100).toFixed(1)) : null;
      return {
        zoneId: zone.id,
        zone: zone.name,
        energyKwh,
        occupied: zone.isOccupied,
        utilizationPct,
        status: zone.isOccupied ? "Occupied" : "Empty",
        alert: !zone.isOccupied && energyKwh >= idleThresholdKwh,
      };
    });
  } else {
    const energyById = new Map(energy.data.map((row) => [row.zoneId.toLowerCase(), row]));
    const wifiById = new Map(wifi.data.map((row) => [row.zoneId.toLowerCase(), row]));
    const ids = new Set([...energyById.keys(), ...wifiById.keys()]);
    rows = [...ids].map((id) => {
      const meter = energyById.get(id);
      const activity = wifiById.get(id);
      const occupied = activity?.occupied ?? null;
      const energyKwh = meter?.energyUsage ?? null;
      return {
        zoneId: meter?.zoneId ?? activity?.zoneId ?? id,
      zone: getFacilityZoneName(meter?.zoneId ?? activity?.zoneId ?? id),
        energyKwh,
        occupied,
        utilizationPct: occupied === null ? null : occupied ? 100 : 0,
        status: activity ? (activity.occupied ? "Occupied" : "Empty") : "Status unavailable",
        alert: occupied === false && energyKwh !== null && energyKwh >= idleThresholdKwh,
      };
    }).sort((a, b) => a.zone.localeCompare(b.zone));
  }

  const usableEnergy = rows.reduce((sum, row) => sum + (row.energyKwh ?? 0), 0);
  const knownUtilization = rows.filter((row) => row.utilizationPct !== null);
  const averageUtilization = knownUtilization.length
    ? knownUtilization.reduce((sum, row) => sum + (row.utilizationPct ?? 0), 0) / knownUtilization.length
    : null;
  const flaggedZones = rows.filter((row) => row.alert);
  const flaggedEnergy = flaggedZones.reduce((sum, row) => sum + (row.energyKwh ?? 0), 0);
  const historyTrends = aggregateShiftHistory(history.data);

  return {
    generatedAt: new Date().toISOString(),
    dataMode: demoMode ? "sample" as const : "live" as const,
    idleThresholdKwh,
    summary: {
      totalEnergyKwh: Number(usableEnergy.toFixed(1)),
      averageUtilizationPct: averageUtilization === null ? null : Number(averageUtilization.toFixed(1)),
      flaggedZoneCount: flaggedZones.length,
      energyInFlaggedZonesKwh: Number(flaggedEnergy.toFixed(1)),
    },
    zones: rows,
    alerts: flaggedZones,
    shifts: history.status === "connected" ? historyTrends : sampleShiftTrends.map((shift) => ({
      ...shift,
      energyKwh: Number((shift.energyKwh * (facility === "Jakarta Plant 02" ? 1.12 : facility === "Jakarta Plant 03" ? 0.91 : 1)).toFixed(1)),
      utilizationPct: Number((shift.utilizationPct + (facility === "Jakarta Plant 02" ? -5 : facility === "Jakarta Plant 03" ? 8 : 0)).toFixed(1)),
    })),
    sources: [wifi, energy, history].map((source: SourceResult<unknown>) => ({
      source: source.source,
      status: source.status,
      timestamp: source.timestamp,
      ...(source.error ? { error: source.error } : {}),
    })),
    shiftTrendMode: history.status === "connected" ? "live" as const : "sample" as const,
  };
}
