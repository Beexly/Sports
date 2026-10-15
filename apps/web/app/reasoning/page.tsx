import type { Metadata } from "next";
import Link from "next/link";
import { loadSeaDenDossier } from "@/lib/reasoning/sea-den-dossier";

export const metadata: Metadata = {
  title: "Layer 2 Situational Reasoning Index · GSE",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function ReasoningIndexPage() {
  const { dossier, depthLadder, dossierSha256 } = loadSeaDenDossier();

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 text-zinc-100">
      <div className="mb-6 rounded-lg border border-amber-500/60 bg-amber-950/50 px-5 py-4">
        <p className="font-mono text-sm font-bold tracking-wide text-amber-300">
          Emission locked — ZERO_OBJECT
        </p>
        <p className="mt-1 font-mono text-xs text-amber-200/80">
          walk_forward.json passed=false · Layer 2 situational reasoning surface only
        </p>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight">
        GSE Layer 2 Situational Reasoning Dossiers
      </h1>
      <p className="mt-2 text-sm text-zinc-400">
        Stamped pre-kickoff situational graphs, directional premises, and universal ingestion
        depth ladder. No picks or probabilities emitted while the walk-forward gate is closed.
      </p>

      <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs text-zinc-400">
              {dossier.game_id} · Week {dossier.week} ({dossier.kickoff_utc})
            </p>
            <h2 className="mt-1 text-lg font-semibold text-sky-400">
              <Link href="/reasoning/2026-06-sea-den" className="hover:underline">
                {dossier.matchup} (Dossier v{dossier.version})
              </Link>
            </h2>
          </div>
          <div className="font-mono text-xs text-zinc-300">
            <span>{dossier.graph_summary.total_edges} edges</span> ·{" "}
            <span>{dossier.premise_count} premises</span> ·{" "}
            <span>{depthLadder.shadow_ledger_rows_count} shadow/blocked</span>
          </div>
        </div>
        <p className="mt-2 font-mono text-xs text-zinc-500">
          SHA-256: {dossierSha256}
        </p>
      </div>
    </main>
  );
}
