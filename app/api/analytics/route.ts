import { getEnergyAnalytics } from "@/lib/analytics-service";
import { facilities, isFacilityName } from "@/lib/facilities";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestedFacility = new URL(request.url).searchParams.get("facility");
  const facility = isFacilityName(requestedFacility) ? requestedFacility : facilities[0];
  const data = await getEnergyAnalytics(facility);
  return Response.json({ data }, { headers: { "Cache-Control": "no-store" } });
}
