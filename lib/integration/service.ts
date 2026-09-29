import { mapPayload, sources, type Source } from "./mapping";

type Code = "NOT_CONFIGURED" | "INVALID_CONFIG" | "UPSTREAM_ERROR" | "INVALID_PAYLOAD" | "TIMEOUT";
class IntegrationError extends Error {
  constructor(public code: Code) { super(code); }
}
export type Environment = Record<string, string | undefined>;
const maxBytes = 2 * 1024 * 1024;

async function readPayload(response: Response): Promise<unknown> {
  if (!response.body) throw new IntegrationError("INVALID_PAYLOAD");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw new IntegrationError("INVALID_PAYLOAD");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new IntegrationError("INVALID_PAYLOAD"); }
}

export async function collect(selected: readonly Source[] = sources, env: Environment = process.env, fetcher: typeof fetch = fetch) {
  const results = await Promise.all(selected.map(async (source) => {
    const prefix = `INTEGRATION_${source.replaceAll("-", "_").toUpperCase()}`;
    try {
      const endpoint = env[`${prefix}_URL`];
      if (!endpoint) throw new IntegrationError("NOT_CONFIGURED");
      let url: URL;
      try { url = new URL(endpoint); } catch { throw new IntegrationError("INVALID_CONFIG"); }
      if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.hash) throw new IntegrationError("INVALID_CONFIG");
      const timeout = Number(env.INTEGRATION_TIMEOUT_MS ?? 5000);
      if (!Number.isInteger(timeout) || timeout < 1 || timeout > 30000) throw new IntegrationError("INVALID_CONFIG");
      const signal = AbortSignal.timeout(timeout);
      const token = env[`${prefix}_TOKEN`];
      let payload: unknown;
      try {
        const response = await fetcher(url, { method: "GET", redirect: "error", cache: "no-store", signal,
          headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
        if (!response.ok) { await response.body?.cancel(); throw new IntegrationError("UPSTREAM_ERROR"); }
        payload = await readPayload(response);
      } catch (error) {
        if (signal.aborted) throw new IntegrationError("TIMEOUT");
        throw error;
      }
      try { return { source, data: mapPayload(source, payload), error: null }; }
      catch { throw new IntegrationError("INVALID_PAYLOAD"); }
    } catch (error) {
      return { source, data: [], error: { source, code: error instanceof IntegrationError ? error.code : "UPSTREAM_ERROR" as Code } };
    }
  }));
  const errors = results.flatMap((result) => result.error ? [result.error] : []);
  return { data: results.flatMap((result) => result.data), errors,
    meta: { schemaVersion: "1.0", fetchedAt: new Date().toISOString(), status: errors.length === 0 ? "ok" : errors.length === selected.length ? "unavailable" : "partial",
      sources: results.map((result) => ({ source: result.source, status: result.error ? "error" : "ok", count: result.data.length })) } };
}
