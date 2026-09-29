import {
  getEnergyReadings,
  getFacilityStatuses,
  getMachineStatuses,
  getProductionSchedules,
  getWifiActivity,
} from "@/lib/connectors/external-systems";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [wifi, energy, facilities, machines, schedules] = await Promise.all([
    getWifiActivity(),
    getEnergyReadings(),
    getFacilityStatuses(),
    getMachineStatuses(),
    getProductionSchedules(),
  ]);
  return Response.json({
    data: { wifi: wifi.data, energy: energy.data, facilities: facilities.data, machines: machines.data, schedules: schedules.data },
    sources: [wifi, energy, facilities, machines, schedules].map(({ source, status, timestamp, error }) => ({ source, status, timestamp, ...(error ? { error } : {}) })),
    generatedAt: new Date().toISOString(),
  }, { headers: { "Cache-Control": "no-store" } });
}
