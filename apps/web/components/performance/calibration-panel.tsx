import { loadPublicCalibrationReport } from "@/lib/calibration/report";
import { HonestBand } from "@/components/performance/honest-band";
import { wilsonInterval, formatWilsonPct } from "@/lib/performance/wilson-interval";
import {
  NUMERIC_TEXT_CLASS,
  STAT_PLACEHOLDER,
  formatBrier,
  formatCount,
  formatRatioAsPercent,
} from "@/lib/format/stat";

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
function brierRead(brier: number | null, probabilitySampleSize: number): string {
  if (brier === null || probabilitySampleSize === 0) {
    return "Waiting for frozen model probabilities; strength scores are not substituted.";
  }
  if (brier <= 0.18) return "Sharp. Confidence tracks outcomes closely.";
  if (brier <= 0.25) return "Better than a coin flip. Calibration is holding.";
  return "Above the coin-flip baseline. Calibration needs work.";
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
    label: "Higher confidence is winning less. Under review",
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
  const observedWidth = bucket.probabilityObservedWinRate === null
    ? undefined
    : `${Math.round(bucket.probabilityObservedWinRate * 100)}%`;
  const expectedLeft = bucket.expectedWinRate === null
    ? null
    : `${Math.round(bucket.expectedWinRate * 100)}%`;
  const empty = bucket.probabilitySampleSize === 0;
  const publishable =
    bucket.sufficientProbabilitySample &&
    bucket.probabilityObservedWinRate !== null &&
    bucket.expectedWinRate !== null;
  const ci = publishable
    ? wilsonInterval(
        Math.round(bucket.probabilityObservedWinRate! * bucket.probabilitySampleSize),
        bucket.probabilitySampleSize,
      )
    : null;
  return (
    <div className="flex items-center gap-3 py-2" data-testid="reliability-row">
      <span className={`w-14 shrink-0 text-xs text-ion-1 ${NUMERIC_TEXT_CLASS}`}>
        {bucket.label}
      </span>
      <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-titanium">
        {publishable && (
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent-500 to-accent-400 transition-all"
            style={{ width: observedWidth }}
          />
        )}
        {publishable && expectedLeft && (
          <div
            className="absolute top-0 h-full w-0.5 bg-ion-white/70"
            style={{ left: expectedLeft }}
            aria-hidden="true"
          />
        )}
      </div>
      <span
        className={`w-14 shrink-0 text-right text-xs font-semibold text-ion ${NUMERIC_TEXT_CLASS}`}
      >
        {publishable
          ? formatRatioAsPercent(bucket.probabilityObservedWinRate!)
          : STAT_PLACEHOLDER}
      </span>
      <span
        className={`hidden w-28 shrink-0 text-right text-[11px] text-ion-2 sm:inline-block ${NUMERIC_TEXT_CLASS}`}
      >
        {ci ? `95% ${formatWilsonPct(ci)}` : ""}
      </span>
      <span
        className={`w-16 shrink-0 text-right text-[11px] text-ion-2 ${NUMERIC_TEXT_CLASS}`}
      >
        {empty
          ? "no data"
          : publishable
            ? `n=${formatCount(bucket.probabilitySampleSize)}`
            : `${formatCount(bucket.probabilitySampleSize)}/30`}
      </span>
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
    // Never vanish silently: the section heading above this panel would be
    // left dangling over nothing, which reads as a rendering bug. Say what
    // happened instead (outage != verdict, same doctrine as /verify).
    return (
      <div
        data-testid="calibration-unreachable-state"
        className="rounded-2xl border border-caution/40 bg-caution/[0.06] px-6 py-8 text-center"
      >
        <p className="text-sm font-semibold text-ion-white">
          Calibration data is temporarily unavailable.
        </p>
        <p className="mt-2 text-xs leading-5 text-ion-2">
          A connection problem, not a verdict. The graded record is unchanged;
          refresh in a moment.
        </p>
      </div>
    );
  }
  const data = report.data;
  const d = data.discrimination;
  const meta = VERDICT_META[d.trend];
  const collecting = data.isCollecting || data.sampleSize === 0;
  const overallObserved = data.overallObservedWinRate;

  // Discrimination's low/high readout is computed at a LOWER floor than the
  // publish floor (MIN_DISCRIMINATION_SAMPLE=20 < MIN_PUBLISH_BUCKET_SAMPLE=30):
  // the trend direction is a softer signal, so a 20–29-pick bucket legitimately
  // counts toward the verdict. But its observed win-rate NUMBER is still below
  // the publish floor — the same rate the ReliabilityRow withholds as "n/30".
  // Gate the per-bucket % readout on the SAME `sufficientSample` flag (looked up
  // by the discrimination labels) so a sub-30 bucket never publishes a concrete
  // win-rate here while it reads "collecting" two rows down.
  const bucketBySufficient = (label: string | null): boolean =>
    label !== null &&
    (data.buckets.find((b) => b.label === label)?.sufficientSample ?? false);
  const discriminationRatesPublishable =
    bucketBySufficient(d.lowestBucketLabel) && bucketBySufficient(d.highestBucketLabel);

  return (
    <section
      data-testid="calibration-panel"
      className="mb-12 overflow-hidden rounded-2xl border border-titanium bg-gradient-to-br from-eclipse to-carbon"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-titanium px-6 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-ion-2">
          Calibration &amp; discrimination
        </h2>
        <span
          className={`text-[11px] uppercase tracking-widest text-ion-2 ${NUMERIC_TEXT_CLASS}`}
        >
          {collecting
            ? "Collecting"
            : `${formatCount(data.sampleSize)} settled picks`}
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
          {/* d.note embeds concrete low/high bucket win-rate %s on improving/
              inverted trends, but those buckets can sit in the 20–29 discrimination
              window — below the 30-pick publish floor. Withhold the rate-bearing
              note in that case (the verdict headline above still conveys direction);
              render it verbatim otherwise (flat/insufficient notes carry no rates). */}
          <p className="mt-2 text-sm leading-relaxed text-ion-1">
            {discriminationRatesPublishable ||
            (d.trend !== "improving" && d.trend !== "inverted")
              ? d.note
              : "Higher-confidence picks are separating from lower-confidence ones, but each bucket is still below the publish threshold, so concrete win rates are withheld until they clear it."}
          </p>
          {discriminationRatesPublishable &&
            d.spread !== null &&
            d.lowestBucketWinRate !== null &&
            d.highestBucketWinRate !== null && (
              <div className="mt-4 flex items-center gap-3 text-xs text-ion-1">
                <span className={NUMERIC_TEXT_CLASS}>
                  {d.lowestBucketLabel}: {formatRatioAsPercent(d.lowestBucketWinRate)}
                </span>
                <span className="flex-1 border-t border-dashed border-titanium" />
                <span className={NUMERIC_TEXT_CLASS}>
                  {d.highestBucketLabel}: {formatRatioAsPercent(d.highestBucketWinRate)}
                </span>
              </div>
            )}
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-ion-2">
            Reliability by frozen model probability
          </h3>
          <span className="text-[11px] text-ion-2">
            bar = observed · marker = committed probability
          </span>
        </div>
        <div className="divide-y divide-titanium/60">
          {data.buckets.map((b) => (
            <ReliabilityRow key={b.label} bucket={b} />
          ))}
        </div>
      </div>

      {overallObserved !== null && data.decidedSampleSize >= 30 && (
        <div className="px-6 pb-6">
          <HonestBand
            observedRate={overallObserved}
            sampleSize={data.decidedSampleSize}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-titanium px-6 py-4">
        <div>
          <span className="text-xs uppercase tracking-widest text-ion-2">Brier score</span>{" "}
          <span className={`ml-1 text-sm font-semibold text-ion ${NUMERIC_TEXT_CLASS}`}>
            {formatBrier(data.brierScore)}
          </span>
        </div>
        <p className="text-xs text-ion-2">
          {brierRead(data.brierScore, data.probabilitySampleSize)}
        </p>
      </div>

      <div className="border-t border-titanium px-6 py-3">
        <p className="text-[11px] leading-relaxed text-ion-2">
          {data.publicMessage} Calibration is evidence only. It never auto-adjusts
          the model. Past performance does not guarantee future results.
        </p>
      </div>
    </section>
  );
}
