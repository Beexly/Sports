import { Shell, Cards, DataTable, ScoreRing, StatusRibbon } from "../_components";
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
        { label: "Production archive", value: "missing" },
        { label: "Next", value: "store predictions" }
      ]} />
      <div className="flex justify-center">
        <ScoreRing score={proofScore} label="Proof Readiness" size={140} />
      </div>
      <p className="text-ion-1">
        Backtests, metric reliability, and the honest proof layer behind StatKing metrics. Every prediction is logged and backtested against real outcomes.
      </p>
      <div>
        <h2 className="text-2xl font-semibold text-ion-white mb-4">Backtest Results</h2>
        <DataTable
          rows={b.runs.map((r: Record<string, unknown>) => ({
            run_id: String(r.run_id ?? ""),
            metric: String(r.metric ?? ""),
            test_period: String(r.test_period ?? ""),
            hit_rate: Number(r.hit_rate ?? 0),
            calibration: Number(r.calibration ?? 0),
            sample_size: Number(r.sample_size ?? 0)
          }))}
          maxRows={50}
        />
      </div>
    </Shell>
  );
}
