import { getEnergyReadings, getFacilityStatuses } from "@/lib/connectors/external-systems";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [energy, bms] = await Promise.all([getEnergyReadings(), getFacilityStatuses()]);
  return Response.json({ data: { energy, bms } }, { headers: { "Cache-Control": "no-store" } });
}
