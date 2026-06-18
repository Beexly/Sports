import { Shell, Cards, DataTable, ScoreRing, InsightCard, SectionHeader, StatusRibbon } from "../_components";
import { loadBacktests } from "@/lib/statking/product";
export const metadata = {
  title: "Proof & Backtests — How StatKing Is Validated",
  description: "Backtests, metric reliability, and the honest proof layer behind StatKing metrics.",
  alternates: { canonical: "/stats/proof" },
};
export default function Page() {
  const b = loadBacktests();
  const proofScore = 61;

  return (
    <Shell title="Proof & Backtests">
      <StatusRibbon status="fixture" label="Backtest proof updated every cycle" />
      <Cards items={[
        { label: "Runs", value: b.runs.length },
        { label: "Proof state", value: "fixture" },
        { label: "Archive status", value: "missing", note: "Will auto-populate on live ingestion" },
        { label: "Next milestone", value: "store predictions", note: "One prediction stored = proof starts" }
      ]} />
      <div className="flex justify-center">
        <ScoreRing score={proofScore} label="Proof Readiness" size={140} />
      </div>
      <InsightCard
        eyebrow="How StatKing Validates Its Work"
        headline="Predictions are logged, settled, and checked — once live data flows"
        body="The proof archive is currently empty because no live predictions have been stored yet. This changes the moment real data ingestion goes active. Every pick will be archived with the model version, input data snapshot, and outcome — making the calibration score auditable."
        tone="warn"
      />
      <div>
        <SectionHeader eyebrow={b.runs.length + " runs recorded"} title="Backtest Archive" />
        {b.runs.length === 0 ? (
          <p className="text-sm text-ink-300 py-6 px-4 border border-white/[0.08] bg-white/[0.04]/40 text-center">No backtest runs in snapshot — will populate with live prediction data.</p>
        ) : (
          <DataTable
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
        )}
      </div>
    </Shell>
  );
}
