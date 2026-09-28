import { getWifiActivity } from "@/lib/connectors/external-systems";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getWifiActivity();
  return Response.json({ data }, { headers: { "Cache-Control": "no-store" } });
}
