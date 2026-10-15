import type { Metadata } from "next";
import Link from "next/link";
import { loadSeaDenDossier } from "@/lib/reasoning/sea-den-dossier";

export const metadata: Metadata = {
  title: "Layer 2 Situational Read — SEA @ DEN (2026_06_SEA_DEN) · GSE",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function SeaDenReasoningPage() {
  const { dossier, depthLadder, dossierSha256 } = loadSeaDenDossier();

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 text-zinc-100">
      {/* Locked Banner */}
      <div
        data-testid="emission-locked-banner"
        className="mb-6 rounded-lg border border-amber-500/60 bg-amber-950/50 px-5 py-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-sm font-bold tracking-wide text-amber-300">
            Emission locked — ZERO_OBJECT
          </p>
          <span className="font-mono text-xs text-amber-200/80">
            walk_forward.json passed=false · No picks emitted · Layer 2 situational read only
          </span>
        </div>
      </div>

      {/* Header */}
      <header className="mb-8 border-b border-zinc-800 pb-6">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">
              SPEC-C Introspection Dossier v{dossier.version} · {dossier.game_id}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              {dossier.matchup} — Layer 2 Situational Stack
            </h1>
          </div>
          <div className="text-right font-mono text-xs text-zinc-400">
            <div>Kickoff: {dossier.kickoff_utc}</div>
            <div>PIT Cutoff (T−90m): {dossier.pit_cutoff_utc}</div>
            <div>Server Stamped: {dossier.server_stamped_at}</div>
          </div>
        </div>

        {/* Summary Metrics Bar */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded border border-zinc-800 bg-zinc-900/60 p-3">
            <div className="font-mono text-xs text-zinc-400">Graph Edges</div>
            <div className="mt-1 font-mono text-xl font-semibold text-emerald-400">
              {dossier.graph_summary.total_edges} edges
            </div>
          </div>
          <div className="rounded border border-zinc-800 bg-zinc-900/60 p-3">
            <div className="font-mono text-xs text-zinc-400">Stamped Premises</div>
            <div className="mt-1 font-mono text-xl font-semibold text-sky-400">
              {dossier.premise_count} premises
            </div>
          </div>
          <div className="rounded border border-zinc-800 bg-zinc-900/60 p-3">
            <div className="font-mono text-xs text-zinc-400">Non-Stat Context</div>
            <div className="mt-1 font-mono text-xl font-semibold text-violet-400">
              {dossier.non_stat_premise_count} premises
            </div>
          </div>
          <div className="rounded border border-zinc-800 bg-zinc-900/60 p-3">
            <div className="font-mono text-xs text-zinc-400">Shadow / Blocked</div>
            <div className="mt-1 font-mono text-xl font-semibold text-zinc-200">
              {depthLadder.shadow_ledger_rows_count} rows
            </div>
          </div>
          <div className="rounded border border-zinc-800 bg-zinc-900/60 p-3">
            <div className="font-mono text-xs text-zinc-400">Universal Catalog</div>
            <div className="mt-1 font-mono text-xl font-semibold text-zinc-200">
              {depthLadder.accounting_check_279} / 279
            </div>
          </div>
        </div>
        <p className="mt-3 font-mono text-xs text-zinc-500">
          Dossier v{dossier.version} SHA-256: {dossierSha256}
        </p>
      </header>

      {/* Depth Ladder Panel (L0-L5 + BLOCKED) */}
      <section className="mb-8 rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-zinc-300">
            Depth Ladder (279-Row Universal Ingestion Ledger)
          </h2>
          <span className="font-mono text-xs text-emerald-400">
            +{depthLadder.upgrades_count} signals promoted L2 → L3 tonight
          </span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-7">
          {(["L0", "L1", "L2", "L3", "L4", "L5", "BLOCKED"] as const).map((rung) => (
            <div
              key={rung}
              className="rounded border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-center"
            >
              <div className="font-mono text-xs text-zinc-400">{rung}</div>
              <div className="mt-1 font-mono text-lg font-semibold text-zinc-100">
                {depthLadder.rung_counts[rung]}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* T0 Line-Move Forecast & Situational Stack Summary */}
      <section className="mb-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
          <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-zinc-300">
            T0 Line-Move Forecast & Archiver Status
          </h2>
          <p className="mt-2 font-mono text-xs text-amber-300">
            T0 Status: {dossier.t0_line_move_forecast.status} (earliest_observed_at:{" "}
            {dossier.t0_line_move_forecast.earliest_observed_at})
          </p>
          <p className="mt-2 text-sm text-zinc-300">
            {dossier.t0_line_move_forecast.reason}
          </p>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
          <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-zinc-300">
            3 Highlighted Non-Stat Context Premises
          </h2>
          <ul className="mt-2 space-y-2 text-xs text-zinc-300">
            {dossier.non_stat_premises_highlighted.map((h) => (
              <li key={h.premise_id} className="border-l-2 border-violet-500 pl-3">
                <span className="font-mono font-semibold text-violet-300">
                  [{h.premise_id}] {h.category}:
                </span>{" "}
                {h.summary}{" "}
                <span className="font-mono text-zinc-500">({h.stamp_source})</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Situational Graph Edge Summary */}
      <section className="mb-8 rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-zinc-300">
          Situational Graph Edges ({dossier.graph_summary.total_edges} PIT-Verified Edges across{" "}
          {dossier.graph_summary.total_nodes} Nodes)
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(dossier.graph_summary.edges_by_type).map(([etype, count]) => (
            <span
              key={etype}
              className="rounded border border-zinc-700 bg-zinc-950 px-2.5 py-1 font-mono text-xs text-zinc-300"
            >
              {etype}: {count}
            </span>
          ))}
        </div>
      </section>

      {/* Full Stamped Premise List */}
      <section className="mb-10">
        <h2 className="mb-4 font-mono text-sm font-semibold uppercase tracking-wider text-zinc-300">
          Full Stamped Premise Stack ({dossier.premise_count} Premises)
        </h2>
        <div className="space-y-4">
          {dossier.premises.map((p) => (
            <article
              key={p.premise_id}
              className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-sky-400">
                    {p.premise_id}
                  </span>
                  <span className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-xs text-zinc-300">
                    {p.layer}
                  </span>
                  {p.non_stat_context && (
                    <span className="rounded bg-violet-950/80 px-2 py-0.5 font-mono text-xs text-violet-300">
                      NON-STAT CONTEXT
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 font-mono text-xs">
                  <span className="text-emerald-300">DIRECTION: {p.DIRECTION}</span>
                  <span className="text-zinc-400">CLASS: {p.confidence_class}</span>
                  <span className="text-zinc-400">p={p.p.toFixed(2)}</span>
                </div>
              </div>
              <div className="mt-3 space-y-1.5 text-sm">
                <p>
                  <span className="font-mono text-xs uppercase text-zinc-400">
                    Trigger:{" "}
                  </span>
                  {p.TRIGGER}
                </p>
                <p>
                  <span className="font-mono text-xs uppercase text-zinc-400">
                    Affected:{" "}
                  </span>
                  {p.AFFECTED}
                </p>
                <p className="text-xs text-zinc-300">
                  <span className="font-mono uppercase text-zinc-400">
                    Resolution Criterion:{" "}
                  </span>
                  {p.resolution_criterion}
                </p>
                <p className="font-mono text-xs text-zinc-500">
                  visible_at: {p.visible_at} · stamp: {p.stamp_source} · census:{" "}
                  {p.census_ids.join(", ")}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-zinc-800 pt-4 font-mono text-xs text-zinc-500">
        <Link href="/reasoning" className="text-sky-400 hover:underline">
          ← All Reasoning Dossiers
        </Link>
      </footer>
    </main>
  );
}
