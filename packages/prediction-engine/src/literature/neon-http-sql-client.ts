/**
 * @file neon-http-sql-client.ts
 * SqlClient over Neon's SQL-over-HTTPS endpoint (parameterised queries).
 *
 * Used where raw Postgres TCP is unavailable (sandboxed agents, edge
 * runtimes). Requires `fetch`; behind an HTTP(S) proxy run Node with
 * NODE_USE_ENV_PROXY=1 or fetch will ignore the proxy and hang.
 */
import type { SqlClient } from "./literature-retrieval.js";

export function neonHttpSqlClient(databaseUrl: string, opts?: { readonly timeoutMs?: number }): SqlClient {
  const clean = databaseUrl.replace(/[?&]channel_binding=[^&]*/, "");
  const endpoint = `https://${new URL(clean).hostname}/sql`;
  const timeoutMs = opts?.timeoutMs ?? 60_000;
  return {
    async query(text, values) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Neon-Connection-String": clean, "Content-Type": "application/json" },
          body: JSON.stringify({ query: text, params: values ?? [] }),
          signal: ctrl.signal,
        });
        const body = (await res.json()) as { rows?: unknown[]; rowCount?: number; message?: string };
        if (!res.ok) throw new Error(body.message ?? `HTTP ${res.status}`);
        return { rows: body.rows ?? [], rowCount: body.rowCount ?? null };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
