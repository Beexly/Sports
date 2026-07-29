/**
 * /own-api — Own Feed dominance surface.
 * Honesty not volume. Odds vendors optional. LIVE_BOARD founder-gated.
 */
import type { Metadata } from "next";
import {
  designSpaceReport,
  handleOwnCatalog,
  handleOwnSnapshot,
  OWN_METRICS,
} from "@sports/stats-api";

export const metadata: Metadata = {
  title: "Own Feed API | Galaxy Sports Edge",
  description:
    "First-party sports intelligence feed — model, calibration, gate, ledger, and derived formulas. Odds vendors optional.",
};

export const dynamic = "force-dynamic";

export default function OwnApiPage() {
  const snap = handleOwnSnapshot();
  const catalog = handleOwnCatalog({ publicOnly: true });
  const data = snap.ok ? snap.data : null;
  const metrics = catalog.ok ? catalog.data.metrics : [];
  const design = designSpaceReport();

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 text-zinc-100">
      <header className="mb-10 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400/90">
          Own Feed · oddsApiRequired=false
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Intelligence we own — not lines we rent
        </h1>
        <p className="max-w-2xl text-zinc-400">
          {data?.claim ??
            "First-party model, calibration, gate, ledger, and derived formulas."}
        </p>
      </header>

      {data && (
        <section className="mb-10 grid gap-4 sm:grid-cols-3">
          <StatTile label="Self-reliance" value={`${data.dominance.selfReliance}%`} />
          <StatTile label="Registered contracts" value={String(data.metricCount)} />
          <StatTile
            label="Public-eligible"
            value={String(data.publicEligibleCount)}
          />
        </section>
      )}

      <section className="mb-10 rounded-xl border border-zinc-800 bg-zinc-950/60 p-6">
        <h2 className="mb-3 text-lg font-medium">Law strip</h2>
        <ul className="space-y-2 text-sm text-zinc-400">
          {(data?.law ?? []).map((line) => (
            <li key={line} className="flex gap-2">
              <span className="text-emerald-500">·</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-medium">Design space (not accuracy claims)</h2>
        <p className="mb-2 text-sm text-zinc-500">{design.note}</p>
        <p className="text-sm text-zinc-400">
          Theoretical owned rolling variants across sports:{" "}
          <span className="font-mono text-zinc-200">
            {design.theoreticalOwnedRolling}
          </span>{" "}
          · registered now:{" "}
          <span className="font-mono text-zinc-200">{OWN_METRICS.length}</span>
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-medium">Public own contracts</h2>
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-zinc-900/80 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Plane</th>
                <th className="px-3 py-2">Ownership</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) => (
                <tr key={m.id} className="border-t border-zinc-800/80">
                  <td className="px-3 py-2 font-mono text-xs text-emerald-300/90">
                    {m.id}
                  </td>
                  <td className="px-3 py-2 text-zinc-400">{m.plane}</td>
                  <td className="px-3 py-2 text-zinc-400">{m.ownership}</td>
                  <td className="px-3 py-2 text-zinc-300">{m.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-zinc-500">
          API: <code className="text-zinc-400">GET /api/gse/v1/own</code> ·{" "}
          <code className="text-zinc-400">GET /api/gse/v1/own/catalog</code> ·{" "}
          <code className="text-zinc-400">POST /api/gse/v1/own/values</code>
        </p>
      </section>
    </main>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 px-4 py-5">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-50">{value}</p>
    </div>
  );
}
