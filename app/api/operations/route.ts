import { getMachineStatuses, getProductionSchedules } from "@/lib/connectors/external-systems";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [machines, schedules] = await Promise.all([getMachineStatuses(), getProductionSchedules()]);
  return Response.json({ data: { machines, schedules } }, { headers: { "Cache-Control": "no-store" } });
}
