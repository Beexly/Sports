import { MIN_PUBLIC_CLV_SAMPLE, type PublicClvAggregate } from "@sports/prediction-engine";
import { loadPublicCalibrationReport } from "@/lib/calibration/report";
import { dec, int, pct, signed, TABULAR } from "@/lib/format/numbers";

/**
 * Calibration & Discrimination panel — the public "proof, not promises" surface.
 *
 * The /performance page is titled "Calibration Report" but historically only
 * rendered win/loss tables. This panel renders what the title promises:
 *   1. Discrimination — does observed win rate RISE as confidence rises? This is
 *      the honest headline even for spread/total markets (priced ~50%), where an
 *      absolute "X% win rate" is the wrong lens. (Powered by computeDiscrimination.)
 *   2. The reliability curve — observed vs. expected win rate per confidence bucket.
 *   3. The Brier score — the single calibration number, with a plain-English read.
 *
 * Honesty + brand rules this panel obeys:
 *   - Every number is rendered from `loadPublicCalibrationReport()` at request time;
 *     nothing is hardcoded. In bootstrap mode the report returns a collecting state.
 *   - Colors use GSE design tokens (verify / alert / ultraviolet / ion), never
 *     casino green/red — the trust surface must not look like a tout. Verdicts also
 *     carry a non-color glyph so meaning never depends on color alone (a11y).
 *   - No win-rate math lives here — the engine computed it; we only display it.
 */

type CalibrationData = Awaited<ReturnType<typeof loadPublicCalibrationReport>>["data"];
type Bucket = CalibrationData["buckets"][number];
type Discrimination = CalibrationData["discrimination"];

// Brier score reads better with a plain-English band. Lower is better; 0.25 is
// the coin-flip baseline for a binary outcome, so under it is meaningfully sharp.
function brierRead(brier: number | null): string {
  if (brier === null) return "Not enough settled picks yet.";
  if (brier <= 0.18) return "Sharp — confidence tracks outcomes closely.";
  if (brier <= 0.25) return "Better than a coin flip — calibration is holding.";
  return "Above the coin-flip baseline — calibration needs work.";
}

const VERDICT_META: Record<
  Discrimination["trend"],
  { label: string; tone: string; ring: string; glyph: string }
> = {
  improving: {
    label: "Confidence ranks picks correctly",
    tone: "text-verify",
    ring: "border-verify/40 bg-verify/5",
    glyph: "▲",
  },
  inverted: {
    label: "Higher confidence is winning less — under review",
    tone: "text-alert",
    ring: "border-alert/40 bg-alert/5",
    glyph: "▼",
  },
  flat: {
    label: "Confidence is not separating outcomes yet",
    tone: "text-ultraviolet-glow",
    ring: "border-ultraviolet/40 bg-ultraviolet/5",
    glyph: "→",
  },
  "insufficient-data": {
    label: "Building discrimination history",
    tone: "text-ion-1",
    ring: "border-titanium bg-eclipse/40",
    glyph: "◴",
  },
};

function ReliabilityRow({ bucket }: { bucket: Bucket }) {
  const observedWidth = `${Math.round(bucket.observedWinRate * 100)}%`;
  const expectedLeft = `${Math.round(bucket.expectedWinRate * 100)}%`;
  const empty = bucket.sampleSize === 0;
  return (
    <div className="flex items-center gap-3 py-2" data-testid="reliability-row">
      <span className="w-14 shrink-0 font-mono text-xs text-ion-1">{bucket.label}</span>
      <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-titanium">
        {!empty && (
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent-500 to-accent-400 transition-all"
            style={{ width: observedWidth }}
          />
        )}
        {/* Expected marker — where a perfectly calibrated bucket would land. */}
        <div
          className="absolute top-0 h-full w-0.5 bg-ion-white/70"
          style={{ left: expectedLeft }}
          aria-hidden="true"
        />
      </div>
      <span className={`w-12 shrink-0 text-right text-xs font-semibold text-ion ${TABULAR}`}>
        {empty ? "—" : pct(bucket.observedWinRate * 100)}
      </span>
      <span className={`w-16 shrink-0 text-right text-[11px] text-ion-2 ${TABULAR}`}>
        {empty ? "no data" : `n=${int(bucket.sampleSize)}`}
      </span>
    </div>
  );
}

/**
 * Closing-line value proof stat — aggregate only, public-safe.
 *
 * Renders the beat-the-close rate ONLY when the graded sample clears
 * MIN_PUBLIC_CLV_SAMPLE (real settled picks graded against a captured closing
 * line). Below the floor it shows the same "collecting" treatment as the rest
 * of the panel — no number is ever fabricated or extrapolated. Per-pick CLV,
 * confidence, and premium fields never appear here.
 *
 * Exported (not default-rendered standalone) so the gating behavior is
 * directly unit-testable without standing up the async server component.
 */
export function ClvProofStat({ clv }: { clv: PublicClvAggregate }) {
  if (!clv.meetsPublicSampleFloor || clv.beatCloseRate === null) {
    return (
      <div
        data-testid="clv-proof-collecting"
        className="border-t border-titanium px-6 py-4"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-ion-2">
          Closing-line value
        </p>
        <p className={`mt-2 flex items-center gap-2 text-sm text-ion-1 ${TABULAR}`}>
          <span aria-hidden="true">◴</span>
          Collecting — publishes once {int(MIN_PUBLIC_CLV_SAMPLE)} settled picks
          have been graded against a captured closing line
          {clv.gradedSampleSize > 0 ? ` (${int(clv.gradedSampleSize)} graded so far)` : ""}.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="clv-proof" className="border-t border-titanium px-6 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-ion-2">
            Closing-line value
          </p>
          <p className="mt-2 text-sm text-ion-1">
            <span
              data-testid="clv-beat-close-rate"
              className={`text-xl font-bold text-ion ${TABULAR}`}
            >
              {pct(clv.beatCloseRate * 100)}
            </span>{" "}
            beat the close
          </p>
        </div>
        <div className="text-right">
          <p className={`text-[11px] uppercase tracking-widest text-ion-2 ${TABULAR}`}>
            {int(clv.gradedSampleSize)} graded picks
          </p>
          {clv.averageClvPoints !== null && (
            <p className={`mt-1 font-mono text-xs text-ion-1 ${TABULAR}`}>
              avg {signed(clv.averageClvPoints)} pts vs the close (spread/total)
            </p>
          )}
        </div>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-ion-2">
        Share of settled picks whose published line or price beat where the
        market closed — the leading indicator of real edge, graded
        automatically at settlement.
      </p>
    </div>
  );
}

export async function CalibrationPanel() {
  // Own error handling: a transient calibration read failure must not take down
  // the whole /performance page (this renders outside the page's fetch try/catch).
  let report: Awaited<ReturnType<typeof loadPublicCalibrationReport>>;
  try {
    report = await loadPublicCalibrationReport();
  } catch {
    return null;
  }
  const data = report.data;
  const d = data.discrimination;
  const meta = VERDICT_META[d.trend];
  const collecting = data.isCollecting || data.sampleSize === 0;

  return (
    <section
      data-testid="calibration-panel"
      className="mb-12 overflow-hidden rounded-2xl border border-titanium bg-gradient-to-br from-eclipse to-carbon"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-titanium px-6 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-ion-2">
          Calibration &amp; discrimination
        </h2>
        <span className={`text-[11px] uppercase tracking-widest text-ion-2 ${TABULAR}`}>
          {collecting ? "Collecting" : `${int(data.sampleSize)} settled picks`}
        </span>
      </div>

      {/* Discrimination verdict — the honest headline. */}
      <div className="px-6 pt-6">
        <div className={`rounded-xl border ${meta.ring} p-5`}>
          <p className="text-xs font-semibold uppercase tracking-widest text-ion-2">
            Does higher confidence win more?
          </p>
          <p className={`mt-2 flex items-center gap-2 text-xl font-bold ${meta.tone}`}>
            <span aria-hidden="true">{meta.glyph}</span>
            {meta.label}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ion-1">{d.note}</p>
          {d.spread !== null &&
            d.lowestBucketWinRate !== null &&
            d.highestBucketWinRate !== null && (
              <div className="mt-4 flex items-center gap-3 text-xs text-ion-1">
                <span className={`font-mono ${TABULAR}`}>
                  {d.lowestBucketLabel}: {pct(d.lowestBucketWinRate * 100)}
                </span>
                <span className="flex-1 border-t border-dashed border-titanium" />
                <span className={`font-mono ${TABULAR}`}>
                  {d.highestBucketLabel}: {pct(d.highestBucketWinRate * 100)}
                </span>
              </div>
            )}
        </div>
      </div>

      {/* Reliability curve. */}
      <div className="px-6 py-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-ion-2">
            Reliability by confidence bucket
          </h3>
          <span className="text-[11px] text-ion-2">bar = observed · marker = expected</span>
        </div>
        <div className="divide-y divide-titanium/60">
          {data.buckets.map((b) => (
            <ReliabilityRow key={b.label} bucket={b} />
          ))}
        </div>
      </div>

      {/* Closing-line value — beat-the-close proof, gated on a real graded sample. */}
      <ClvProofStat clv={data.clv} />

      {/* Brier score footer. */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-titanium px-6 py-4">
        <div>
          <span className="text-xs uppercase tracking-widest text-ion-2">Brier score</span>{" "}
          <span className={`ml-1 font-mono text-sm font-semibold text-ion ${TABULAR}`}>
            {/* Brier is the one deliberate exception to the one-decimal standard:
                three decimals, because 0.2 vs 0.25 is the whole story. */}
            {dec(data.brierScore, 3)}
          </span>
        </div>
        <p className="text-xs text-ion-2">{brierRead(data.brierScore)}</p>
      </div>

      <div className="border-t border-titanium px-6 py-3">
        <p className="text-[11px] leading-relaxed text-ion-2">
          {data.publicMessage} Calibration is evidence only — it never auto-adjusts
          the model. Past performance does not guarantee future results.
        </p>
      </div>
    </section>
  );
}
