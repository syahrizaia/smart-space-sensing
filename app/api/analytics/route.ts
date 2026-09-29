import { getEnergyAnalytics } from "@/lib/analytics-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getEnergyAnalytics();
  return Response.json({ data }, { headers: { "Cache-Control": "no-store" } });
}
