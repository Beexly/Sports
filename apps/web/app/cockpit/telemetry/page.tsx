import type { Metadata } from "next";
import { headers } from "next/headers";
import type { TelemetrySummary } from "@/lib/cockpit/telemetry-summary";

interface TelemetryEnvelope extends TelemetrySummary {
  meta: { logPath: string; logBytes: number; sinceMs: number };
}

export const metadata: Metadata = {
  title: "Telemetry · Cockpit",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

async function loadSummary(): Promise<TelemetryEnvelope | { error: string }> {
  const hdrs = await headers();
  const host = hdrs.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  try {
    const res = await fetch(
      `${protocol}://${host}/api/cockpit/telemetry?sinceMs=${7 * 24 * 60 * 60 * 1000}`,
      {
        cache: "no-store",
        headers: { cookie: hdrs.get("cookie") ?? "" },
      }
    );
    if (!res.ok) return { error: `HTTP ${res.status}` };
    return (await res.json()) as TelemetryEnvelope;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "fetch failed" };
  }
}

function fmtPct(n: number): string {
  return `${Math.round(n * 1000) / 10}%`;
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export default async function CockpitTelemetryPage() {
  const result = await loadSummary();
  const hasError = "error" in result;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-white">Claude telemetry</h1>
        <p className="mt-1 text-sm text-gray-500">
          Per-call-site cache hit rate + token usage + latency. Reads the
          append-only <code className="text-gray-400">_logs/claude-usage.log</code> that
          every Claude call writes (Cycle 18). Validates the Cycle 14
          prompt-caching forward investment.
        </p>
      </header>

      {hasError ? (
        <p
          data-testid="telemetry-error"
          className="rounded-xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-300"
        >
          Telemetry endpoint returned an error: {result.error}
        </p>
      ) : (
        <>
          <section
            data-testid="telemetry-window"
            className="rounded-xl border border-gray-800 bg-gray-900/40 p-4 text-sm text-gray-300"
          >
            Window {result.windowStart ?? "—"} → {result.windowEnd ?? "—"} ·{" "}
            <strong className="text-white">{result.totalCalls}</strong> calls,{" "}
            <strong
              className={
                result.totalErrors > 0 ? "text-red-300" : "text-gray-400"
              }
            >
              {result.totalErrors}
            </strong>{" "}
            errors · log {fmtBytes(result.meta.logBytes)}
          </section>

          <section data-testid="telemetry-bysite">
            <h2 className="text-sm font-bold text-white">By call site</h2>
            {result.bySite.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">
                No telemetry rows in window yet.
              </p>
            ) : (
              <table className="mt-3 w-full table-auto text-left text-xs text-gray-300">
                <thead className="text-[10px] uppercase tracking-widest text-gray-600">
                  <tr>
                    <th className="px-2 py-1">Call site</th>
                    <th className="px-2 py-1">Calls</th>
                    <th className="px-2 py-1">Errors</th>
                    <th className="px-2 py-1">Avg ms</th>
                    <th className="px-2 py-1">P95 ms</th>
                    <th className="px-2 py-1">Input tok</th>
                    <th className="px-2 py-1">Output tok</th>
                    <th className="px-2 py-1">Cache hit</th>
                  </tr>
                </thead>
                <tbody>
                  {result.bySite.map((s) => (
                    <tr
                      key={s.callSite}
                      data-testid={`telemetry-row-${s.callSite}`}
                      className="border-t border-gray-800"
                    >
                      <td className="px-2 py-1 font-medium text-gray-100">
                        {s.callSite}
                      </td>
                      <td className="px-2 py-1">{s.calls}</td>
                      <td
                        className={
                          s.errors > 0
                            ? "px-2 py-1 text-red-300"
                            : "px-2 py-1 text-gray-500"
                        }
                      >
                        {s.errors}
                      </td>
                      <td className="px-2 py-1">{s.avgLatencyMs}</td>
                      <td className="px-2 py-1">{s.p95LatencyMs}</td>
                      <td className="px-2 py-1">{s.inputTokensTotal.toLocaleString()}</td>
                      <td className="px-2 py-1">{s.outputTokensTotal.toLocaleString()}</td>
                      <td className="px-2 py-1 text-emerald-300">
                        {fmtPct(s.cacheHitRate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {result.errorClasses.length > 0 ? (
            <section data-testid="telemetry-errors">
              <h2 className="text-sm font-bold text-white">Error classes</h2>
              <ul className="mt-2 text-xs text-gray-300">
                {result.errorClasses.map((e) => (
                  <li key={e.errorClass}>
                    <code>{e.errorClass}</code> × {e.count}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
