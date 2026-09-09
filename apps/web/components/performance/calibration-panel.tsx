import { loadPublicCalibrationReport } from "@/lib/calibration/report";
import { HonestBand } from "@/components/performance/honest-band";
import { formatClopperPearsonPct } from "@/lib/performance/clopper-pearson-interval";
import {
  NUMERIC_TEXT_CLASS,
  STAT_PLACEHOLDER,
  formatCount,
  formatRatioAsPercent,
} from "@/lib/format/stat";
import { formatRelative } from "@/lib/utils";

/**
 * Calibration & Discrimination panel — the public "proof, not promises" surface.
 *
 * The /performance page is titled "Calibration Report" but historically only
 * rendered win/loss tables. This panel renders what the title promises:
 *   1. Discrimination — does observed win rate RISE as confidence rises? This is
 *      the honest headline even for spread/total markets (priced ~50%), where an
 *      absolute "X% win rate" is the wrong lens. (Powered by computeDiscrimination.)
 *   2. The reliability curve — observed vs. expected win rate per confidence bucket.
 *   3. A statement of what the panel is: a separation read on a ranking
 *      signal, NOT a calibration score on a probability (C-176).
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
  const empty = bucket.sampleSize === 0;
  // Min-sample floor: a bucket below the publish threshold must NEVER show a
  // win-rate number — a 2-pick bucket reading a raw single-sample rate is an unsupported claim.
  // Withhold the observed bar, the percentage, and the CI; show only the
  // sample-progress so the reader sees it is still collecting.
  const publishable = bucket.sufficientSample;
  const decidedN = bucket.wins + bucket.losses;
  const decidedRate = decidedN > 0 ? bucket.wins / decidedN : 0;
  const observedWidth = `${Math.round(decidedRate * 100)}%`;
  const ci =
    publishable && bucket.clopperPearsonLow != null && bucket.clopperPearsonHigh != null
      ? {
          point: decidedRate,
          low: bucket.clopperPearsonLow,
          high: bucket.clopperPearsonHigh,
          n: decidedN,
          alpha: 0.05,
        }
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
        {/* NO "EXPECTED" MARKER (C-176). It used to sit at confidence/100, which
            asserts the Edge Index IS a win probability. It is not - the home
            copy, the proof page and the B2B API all say so, and this panel was
            the last surface still drawing the diagonal. What the bar shows is
            the OBSERVED decided win rate for the band, with its interval; the
            reader compares bands to each other, not to a promised number. */}
      </div>
      <span
        className={`w-14 shrink-0 text-right text-xs font-semibold text-ion ${NUMERIC_TEXT_CLASS}`}
      >
        {publishable ? formatRatioAsPercent(decidedRate) : STAT_PLACEHOLDER}
      </span>
      <span
        className={`hidden w-28 shrink-0 text-right text-[11px] text-ion-2 sm:inline-block ${NUMERIC_TEXT_CLASS}`}
      >
        {ci ? `95% CP ${formatClopperPearsonPct(ci)}` : ""}
      </span>
      <span
        className={`w-16 shrink-0 text-right text-[11px] text-ion-2 ${NUMERIC_TEXT_CLASS}`}
      >
        {empty
          ? "no data"
          : publishable
            ? `n=${formatCount(bucket.sampleSize)}`
            : `${formatCount(bucket.sampleSize)}/30`}
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

  // Headline rate is decided picks only (wins / decided), matching the
  // Clopper-Pearson band. Withhold the band below 30 decided so a 2-pick
  // sample cannot render as a trustworthy interval.
  const decided = data.population.decided;
  const overallObserved = decided > 0 ? data.population.wins / decided : 0;

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

      {/* Reliability curve. */}
      <div className="px-6 py-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-ion-2">
            Reliability by confidence bucket
          </h3>
          {/* The marker this legend used to name was removed in C-176 because it
              asserted the Edge Index IS a win probability. The legend outlived it,
              so every row documented a cue that is not drawn - and re-made the
              claim the marker was removed for. Describe only what is rendered. */}
          <span className="text-[11px] text-ion-2">
            bar = observed decided win rate · Clopper-Pearson interval
          </span>
        </div>
        <div className="divide-y divide-titanium/60">
          {data.buckets.map((b) => (
            <ReliabilityRow key={b.label} bucket={b} />
          ))}
        </div>
        <h3 className="mb-3 mt-8 text-xs font-semibold uppercase tracking-widest text-ion-2">
          Equal-mass confidence quantiles
        </h3>
        <div className="divide-y divide-titanium/60">
          {data.quantileBuckets.map((b) => (
            <ReliabilityRow key={b.label} bucket={b} />
          ))}
        </div>
      </div>

      {/* Honest band uses Clopper-Pearson on the decided population. */}
      {decided >= 30 && (
        <div className="px-6 pb-6">
          <HonestBand
            observedRate={overallObserved}
            sampleSize={decided}
            intervalLow={data.headlineClopperPearsonLow}
            intervalHigh={data.headlineClopperPearsonHigh}
            method="clopper-pearson"
          />
        </div>
      )}

      {/* WHAT THIS PANEL IS, AND WHAT IT IS NOT (C-176).
          The Brier score that used to sit here was computed as
          (confidence/100 - outcome)^2 - it scored the Edge Index AS a forecast
          probability, which is exactly the claim this product refuses to make
          everywhere else. A score is only a calibration score if the number
          being scored is a probability. The calibration the gate measures is
          the market-anchored one, on moneylines, and it is published under its
          own eligibility floors - not here. */}
      <div className="border-t border-titanium px-6 py-4">
        <p className="text-xs leading-relaxed text-ion-2">
          This is a separation read, not a calibration score. The Edge Index is a
          0-100 ranking signal, not a win probability, so there is no promised
          rate for a band to land on. What the bands answer is narrower and
          checkable: do higher-Edge picks win more often than lower-Edge ones.
        </p>
      </div>

      <div className="border-t border-titanium px-6 py-3">
        <p className="text-[11px] leading-relaxed text-ion-2">
          {data.publicMessage} {data.disclaimer}
        </p>
        {data.modelVersions.length > 0 && (
          <p className={`mt-1 text-[11px] text-ion-3 ${NUMERIC_TEXT_CLASS}`}>
            Model version{data.modelVersions.length === 1 ? "" : "s"}: {data.modelVersions.join(", ")}
          </p>
        )}
        {/* data.updatedAt is stamped server-side (now.toISOString()) at request
            time in report.ts — including in the isCollecting/gated branches —
            so this is always present and never a build-time or client-side
            Date() call that would silently lie about freshness. */}
        <p
          className={`mt-1 text-[11px] text-ion-3 ${NUMERIC_TEXT_CLASS}`}
          data-testid="calibration-updated-at"
        >
          Updated {formatRelative(data.updatedAt)}
        </p>
      </div>
    </section>
  );
}
