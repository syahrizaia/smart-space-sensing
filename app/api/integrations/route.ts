import { timingSafeEqual } from "node:crypto";
import { collect } from "@/lib/integration/service";
import { sources, type Source } from "@/lib/integration/mapping";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  const fail = (status: number, code: string) => Response.json({ data: [], errors: [{ code }], meta: { schemaVersion: "1.0", status: "unavailable", fetchedAt: new Date().toISOString() } }, { status, headers });
  const token = process.env.INTEGRATION_API_TOKEN;
  if (!token) return fail(503, "API_NOT_CONFIGURED");
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${token}`);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return fail(401, "UNAUTHORIZED");
  const params = new URL(request.url).searchParams;
  const source = params.get("source");
  if ([...params.keys()].some((key) => key !== "source") || params.getAll("source").length > 1 || (source !== null && !sources.includes(source as Source))) return fail(400, "INVALID_QUERY");
  const result = await collect(source === null ? sources : [source as Source]);
  return Response.json(result, { status: result.meta.status === "unavailable" ? 503 : 200, headers });
}
