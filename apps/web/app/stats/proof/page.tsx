import { Shell, Cards, DataTable, ScoreRing, InsightCard, SectionHeader, StatusRibbon } from "../_components";
import { loadBacktests } from "@/lib/statking/product";
import { loadKingStandard } from "@/lib/statking/king-standard-loader";
import { isMeasured } from "@/lib/statking/king-standard";

export const metadata = {
  title: "Proof & Backtests: How Galaxy Stats Is Validated",
  description: "Backtests, metric reliability, and the honest proof layer behind Galaxy Stats metrics.",
  alternates: { canonical: "/stats/proof" },
};

// Proof Readiness reads real settled/graded-pick counts from the DB — this
// page must not be statically frozen at build time. See
// lib/statking/king-standard-loader.ts.
export const dynamic = "force-dynamic";

export default async function Page() {
  const b = loadBacktests();
  const king = await loadKingStandard();
  const proofArchive = king.dimensions.proofArchive;
  const measured = isMeasured(proofArchive);
  const hasFixtureRuns = b.runs.some((r: Record<string, unknown>) => String(r.status ?? "").includes("fixture"));

  return (
    <Shell title="Proof & Backtests" eyebrow="Validation layer">
      <StatusRibbon status="fixture" label="Backtest proof updated every cycle" />
      <Cards items={[
        { label: "Runs", value: b.runs.length },
        { label: "Proof state", value: "fixture" },
        {
          label: "Archive status",
          value: measured ? `${proofArchive.score}/100` : "not measured",
          note: measured ? proofArchive.basis : proofArchive.reason,
        },
        { label: "Next milestone", value: "store predictions", note: "One prediction stored = proof starts" }
      ]} />
      <div className="flex flex-col items-center gap-2">
        <ScoreRing score={measured ? proofArchive.score : 0} notMeasured={!measured} label="Proof Readiness" size={140} />
        <p className="max-w-md text-center text-[11px] leading-snug text-ion-2">
          {measured ? proofArchive.basis : proofArchive.reason}
        </p>
      </div>
      <InsightCard
        eyebrow={`Proof Readiness · ${measured ? `${proofArchive.score} / 100` : "not yet measured"}`}
        headline="Predictions are logged, settled, and checked once live data flows"
        body="Proof Readiness is computed from real settled/graded pick counts against the platform's own readiness floor, never hand-typed. It reads 'not yet measured' instead of a number whenever the database isn't reachable at render time, and it rises automatically as real picks settle — every pick is archived with the model version, input data snapshot, and outcome, making the calibration score auditable."
        tone="warn"
      />
      <div>
        <SectionHeader eyebrow={b.runs.length + " runs recorded"} title="Backtest Archive" />
        {b.runs.length === 0 ? (
          <p className="text-sm text-ion-1 py-6 px-4 border border-mineral bg-eclipse/40 text-center">No backtest runs in snapshot. This will populate with live prediction data.</p>
        ) : (
          <>
            {hasFixtureRuns && (
              <p className="mb-2 border border-caution/40 bg-caution/5 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-caution">
                Fixture — not a production record. These rows demonstrate the proof-archive UI and scoring math; they are not real settled predictions.
              </p>
            )}
            <DataTable
              caption="Backtest archive: run ID, type, status, mean absolute error, calibration, and what each run proves"
              rows={b.runs.map((r: Record<string, unknown>) => ({
                run_id: String(r.run_id ?? ""),
                type: String(r.type ?? ""),
                status: String(r.status ?? ""),
                mae: typeof r.mae === "number" ? r.mae : "—",
                calibration: String(r.calibration ?? "—"),
                proven: String(r.what_is_proven ?? "")
              }))}
              maxRows={50}
            />
          </>
        )}
      </div>
    </Shell>
  );
}
