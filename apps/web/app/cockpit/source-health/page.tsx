import type { Metadata } from "next";
import { headers } from "next/headers";
import type { SourceHealthReport } from "@/lib/cockpit/source-health";

export const metadata: Metadata = {
  title: "Source health · Cockpit",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

async function loadReport(): Promise<SourceHealthReport | { error: string }> {
  const hdrs = await headers();
  const host = hdrs.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  try {
    const res = await fetch(`${protocol}://${host}/api/cockpit/source-health`, {
      cache: "no-store",
      headers: {
        // forward the session cookie so the route's auth() check passes
        cookie: hdrs.get("cookie") ?? "",
      },
    });
    if (!res.ok) {
      return { error: `HTTP ${res.status}` };
    }
    return (await res.json()) as SourceHealthReport;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "fetch failed" };
  }
}

function statusBadge(status: string): string {
  if (status === "FRESH") {
    return "bg-green-900/40 text-green-300 border-green-800";
  }
  if (status === "AGING") {
    return "bg-yellow-900/40 text-yellow-300 border-yellow-800";
  }
  if (status === "STALE") {
    return "bg-red-900/40 text-red-300 border-red-800";
  }
  return "bg-gray-800 text-gray-400 border-gray-700";
}

function severityBadge(severity: string): string {
  if (severity === "HIGH") return "bg-red-900/40 text-red-300";
  if (severity === "MEDIUM") return "bg-yellow-900/40 text-yellow-300";
  return "bg-gray-800 text-gray-400";
}

export default async function CockpitSourceHealthPage() {
  const report = await loadReport();
  const hasError = "error" in report;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-white">Source health</h1>
        <p className="mt-1 text-sm text-gray-500">
          Per-provider freshness for ingestion sources. When a source degrades
          AGING → STALE, picks generated against it work from degraded data —
          this is the always-current read.
        </p>
      </header>

      {hasError ? (
        <p
          data-testid="source-health-error"
          className="rounded-xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-300"
        >
          Source-health endpoint returned an error: {report.error}
        </p>
      ) : (
        <>
          <section
            data-testid="source-health-narrative"
            className="rounded-xl border border-gray-800 bg-gray-900/40 p-4"
          >
            <h2 className="text-[10px] uppercase tracking-widest text-gray-600">
              Operator read
            </h2>
            <p className="mt-2 text-sm text-gray-200">{report.narrative}</p>
            <p className="mt-3 text-[10px] text-gray-600">
              Composed {report.composedAt} · model{" "}
              {report.model ?? "fallback (deterministic)"}
            </p>
          </section>

          {report.alerts.length > 0 ? (
            <section
              data-testid="source-health-alerts"
              className="rounded-xl border border-gray-800 bg-gray-900/40 p-4"
            >
              <h2 className="text-sm font-bold text-white">Alerts</h2>
              <ul className="mt-3 flex flex-col gap-2">
                {report.alerts.map((a, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 rounded-lg border border-gray-800 bg-gray-950 p-2 text-sm"
                  >
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${severityBadge(a.severity)}`}
                    >
                      {a.severity}
                    </span>
                    <span className="text-gray-200">{a.message}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section data-testid="source-health-table">
            <h2 className="text-sm font-bold text-white">Sources</h2>
            {report.sources.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">
                No source probes available yet.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {report.sources.map((s, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-950 p-2 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-100">
                        {s.provider}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {s.sourceKind} · last fetch {s.fetchedAt}
                      </p>
                    </div>
                    <span
                      className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${statusBadge(s.status)}`}
                    >
                      {s.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
