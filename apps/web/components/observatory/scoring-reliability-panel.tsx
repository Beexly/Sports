import type { CalibrationReportPayload } from "@/lib/calibration/report";
import { buildScoringReliabilityReport } from "@/lib/calibration/scoring-reliability";
import {
  NUMERIC_TEXT_CLASS,
  formatCount,
  formatRatioAsPercent,
} from "@/lib/format/stat";

function widthFor(ratio: number): string {
  const pct = Math.max(1, Math.min(100, ratio * 100));
  return `${pct}%`;
}

export function ScoringReliabilityPanel({
  gated,
  report,
}: {
  readonly gated: boolean;
  readonly report: CalibrationReportPayload["data"];
}) {
  const scoring = buildScoringReliabilityReport(report);
  const statusLabel = gated
    ? "Gate closed"
    : scoring.status === "READY"
      ? "Settled report"
      : "Collecting";

  return (
    <section
      data-testid="scoring-reliability-panel"
      className="overflow-hidden rounded-2xl border border-titanium bg-gradient-to-br from-eclipse to-carbon"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-titanium px-6 py-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-ion-2">
            Scoring rules: reliability diagram
          </h2>
          <p className="mt-1 text-[11px] text-ion-2">
            Observed win rate by confidence bucket, from settled canonical picks. The Edge Index
            is a ranking signal, not a forecast probability, so no Brier score, expected
            calibration error, or gap-to-confidence is scored against it — only the real,
            observed rate per bucket is shown.
          </p>
        </div>
        <span className="rounded-full border border-titanium px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ion-2">
          {statusLabel}
        </span>
      </div>

      <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
        {[
          { label: "Sample", value: formatCount(scoring.sampleSize) },
          { label: "Buckets", value: formatCount(scoring.reliabilityPoints.length) },
        ].map((stat) => (
          <div key={stat.label} className="min-w-0 border-l border-titanium pl-3">
            <p className="text-[10px] uppercase tracking-wider text-ion-3">{stat.label}</p>
            <p className={`mt-1 text-lg font-semibold text-ion-white ${NUMERIC_TEXT_CLASS}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {scoring.reliabilityPoints.length === 0 ? (
        <div className="border-t border-titanium px-6 py-8" data-testid="reliability-gated">
          <p className="max-w-2xl text-sm leading-relaxed text-ion-1">
            {report.publicMessage} The observatory keeps this panel in a collecting state until
            real settled rows clear the public calibration gate.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-titanium/60 border-t border-titanium">
          {scoring.reliabilityPoints.map((point) => (
            <li
              key={point.label}
              data-testid="reliability-bucket"
              className="grid gap-3 px-6 py-4 sm:grid-cols-[90px_1fr_100px] sm:items-center"
            >
              <div>
                <p className="text-sm font-semibold text-ion-white">{point.label}</p>
                <p className={`mt-0.5 text-[11px] text-ion-2 ${NUMERIC_TEXT_CLASS}`}>
                  {formatCount(point.sampleSize)} picks
                </p>
              </div>

              {/* Devin Review (PR #737): a bar and a gap line here used to
                  compare the observed rate against the bucket's mean
                  confidence, rendered as a fraction — the same
                  probability-scoring framing C-224 removed elsewhere. Only
                  the real, gated observed rate is shown now. */}
              <div className="h-2 overflow-hidden rounded-full bg-titanium/40">
                <div
                  className="h-full rounded-full bg-orbital-cyan"
                  style={{ width: widthFor(point.observedWinRate) }}
                />
              </div>

              <div className={`text-sm sm:text-right ${NUMERIC_TEXT_CLASS}`}>
                <p className="text-ion-1">
                  Obs {formatRatioAsPercent(point.observedWinRate)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-titanium px-6 py-3">
        <p className="text-[11px] leading-relaxed text-ion-2">
          {scoring.note} This is a draft-only observatory artifact; it does not flip projection
          publishing, provider, pricing, or model-version flags.
        </p>
      </div>
    </section>
  );
}
