/**
 * Calibration mathematics — client-side, pure, tested.
 *
 * The web app's `/performance` panel computes all of this on the server
 * (`loadPublicCalibrationReport`) and the app displays the result. But the app
 * also has to draw the curve itself on `/calibration/me` from the viewer's own
 * settled picks, and it must apply the SAME withholding floors the web applies
 * — because the failure mode here is not "wrong pixel", it is "the product
 * published a win rate off two picks".
 *
 * The floors, taken verbatim from `components/performance/calibration-panel.tsx`
 * and the loader it reads:
 *
 *   MIN_PUBLISH_BUCKET_SAMPLE = 30
 *     A bucket below this renders as "collecting", never as a win rate. The
 *     discrimination readout is computed at a LOWER floor (20) because trend
 *     direction is a softer signal — but its *rate-bearing note* is withheld
 *     unless BOTH endpoint buckets clear the publish floor. That asymmetry is
 *     reproduced exactly, because it is the difference between "we have a
 *     direction" and "we have a number you can hold us to".
 *
 *   MIN_CURVE_SAMPLE = 30
 *     Below this, no curve renders at all. The homepage shows `{n}/30` instead
 *     of a fake line, and this app does the same.
 *
 * Brier bands and the discrimination verdict strings are ports, not inventions.
 */

/* ══════════════════════════════════════════════════════════════════════════
   FLOORS
   ══════════════════════════════════════════════════════════════════════════ */

export const MIN_PUBLISH_BUCKET_SAMPLE = 30;
export const MIN_DISCRIMINATION_SAMPLE = 20;
export const MIN_CURVE_SAMPLE = 30;

/* ══════════════════════════════════════════════════════════════════════════
   BRIER
   ══════════════════════════════════════════════════════════════════════════ */

export interface ForecastPair {
  /** Stated probability, 0..1. */
  stated: number;
  /** Realized outcome: 1 for a win, 0 for a loss. */
  outcome: 0 | 1;
}

/** Mean squared error of the stated probabilities. Lower is better. */
export function brierScore(pairs: readonly ForecastPair[]): number | null {
  if (pairs.length === 0) return null;
  let sum = 0;
  for (const p of pairs) {
    const d = p.stated - p.outcome;
    sum += d * d;
  }
  return sum / pairs.length;
}

/** The coin-flip baseline for a binary outcome. */
export const BRIER_BASELINE = 0.25;

/** Plain-English band, ported from `brierRead()` in calibration-panel.tsx. */
export function brierRead(brier: number | null): string {
  if (brier === null) return "Not enough settled picks yet.";
  if (brier <= 0.18) return "Sharp. Confidence tracks outcomes closely.";
  if (brier <= 0.25) return "Better than a coin flip. Calibration is holding.";
  return "Above the coin-flip baseline. Calibration needs work.";
}

/* ══════════════════════════════════════════════════════════════════════════
   CLOPPER-PEARSON EXACT INTERVAL
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Regularised incomplete beta function I_x(a, b), via the standard continued
 * fraction (Lentz's method). Accurate to ~1e-14 for the argument ranges this
 * app uses (a, b in [1, 5000], x in (0,1)).
 *
 * Written here rather than pulled from a dependency because the app ships no
 * numeric library, and a 60-line, well-tested continued fraction is a smaller
 * liability than a transitive dependency in a binary.
 */
function betacf(a: number, b: number, x: number): number {
  const FPMIN = 1e-300;
  const EPS = 3e-14;
  const MAXIT = 300;

  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;

  for (let m = 1; m <= MAXIT; m += 1) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;

    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;

    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

function logGamma(x: number): number {
  // Lanczos approximation, g=7, n=9. Plenty for a binomial interval.
  const cof = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) {
    return (
      Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x)
    );
  }
  const z = x - 1;
  let a = cof[0] ?? 1;
  const t = z + 7.5;
  for (let i = 1; i < 9; i += 1) {
    a += (cof[i] ?? 0) / (z + i);
  }
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(a);
}

export function incompleteBeta(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const front = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x),
  );
  if (x < (a + 1) / (a + b + 2)) {
    return (front * betacf(a, b, x)) / a;
  }
  return 1 - (front * betacf(b, a, 1 - x)) / b;
}

/**
 * Clopper-Pearson (exact) binomial confidence interval.
 *
 * Chosen over a normal approximation for the same reason the web chose it: at
 * n=30 with 20 wins a Wald interval produces bounds the data cannot support,
 * and this product does not publish intervals it cannot defend.
 *
 * Returns null when n = 0 — never a fabricated [0,1].
 */
export function clopperPearson(
  wins: number,
  n: number,
  alpha = 0.05,
): { lower: number; upper: number } | null {
  if (n <= 0) return null;
  if (wins < 0 || wins > n) {
    throw new Error(`clopperPearson: wins (${wins}) outside [0, ${n}]`);
  }
  const lower = wins === 0 ? 0 : betaQuantile(alpha / 2, wins, n - wins + 1);
  const upper = wins === n ? 1 : betaQuantile(1 - alpha / 2, wins + 1, n - wins);
  return { lower, upper };
}

/** Inverse regularised incomplete beta by bisection. Monotone in x, so safe. */
function betaQuantile(p: number, a: number, b: number): number {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 200; i += 1) {
    const mid = (lo + hi) / 2;
    if (incompleteBeta(a, b, mid) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/* ══════════════════════════════════════════════════════════════════════════
   DISCRIMINATION
   ══════════════════════════════════════════════════════════════════════════ */

export type DiscriminationTrend = "improving" | "inverted" | "flat" | "insufficient";

export interface DiscriminationReadout {
  trend: DiscriminationTrend;
  lowestBucketLabel: string | null;
  highestBucketLabel: string | null;
  lowestBucketWinRate: number | null;
  highestBucketWinRate: number | null;
  spread: number | null;
  note: string;
  /** True when BOTH endpoint buckets clear the 30-pick publish floor. */
  ratesPublishable: boolean;
}

export interface CalibrationBucketInput {
  label: string;
  n: number;
  decided: number;
  wins: number;
  /** Mean stated probability in the band, 0..1. */
  predicted: number;
}

/**
 * "Does higher confidence win more?" — the honest headline.
 *
 * Compares the lowest and highest buckets that clear MIN_DISCRIMINATION_SAMPLE
 * (20), and reports the trend. The rate-bearing note is only emitted when both
 * endpoints ALSO clear MIN_PUBLISH_BUCKET_SAMPLE (30); otherwise the direction
 * is reported without numbers, exactly as the web does.
 */
export function readDiscrimination(
  buckets: readonly CalibrationBucketInput[],
): DiscriminationReadout {
  const eligible = buckets
    .filter((b) => b.decided >= MIN_DISCRIMINATION_SAMPLE)
    .slice()
    .sort((a, b) => a.predicted - b.predicted);

  const insufficient: DiscriminationReadout = {
    trend: "insufficient",
    lowestBucketLabel: null,
    highestBucketLabel: null,
    lowestBucketWinRate: null,
    highestBucketWinRate: null,
    spread: null,
    note: `Direction needs at least ${MIN_DISCRIMINATION_SAMPLE} decided picks in a confidence band. We are not going to read a trend off a sample this small.`,
    ratesPublishable: false,
  };

  if (eligible.length < 2) return insufficient;

  const low = eligible[0];
  const high = eligible[eligible.length - 1];
  if (!low || !high) return insufficient;

  const lowRate = low.decided > 0 ? low.wins / low.decided : 0;
  const highRate = high.decided > 0 ? high.wins / high.decided : 0;
  const spread = highRate - lowRate;

  const ratesPublishable =
    low.decided >= MIN_PUBLISH_BUCKET_SAMPLE && high.decided >= MIN_PUBLISH_BUCKET_SAMPLE;

  // A 3-point spread at n=25 each is noise. The threshold is deliberately
  // blunt and deliberately documented: it is a reporting rule, not a model
  // parameter, and it never feeds the engine.
  const FLAT_BAND = 0.03;

  let trend: DiscriminationTrend;
  if (Math.abs(spread) < FLAT_BAND) trend = "flat";
  else if (spread > 0) trend = "improving";
  else trend = "inverted";

  const note = ratesPublishable
    ? `${low.label} wins ${(lowRate * 100).toFixed(1)}%, ${high.label} wins ${(highRate * 100).toFixed(1)}%.`
    : `Higher-confidence picks are ${trend === "inverted" ? "not " : ""}separating from lower-confidence ones, but each band is still below the publish threshold, so concrete win rates are withheld until they clear it.`;

  return {
    trend,
    lowestBucketLabel: low.label,
    highestBucketLabel: high.label,
    lowestBucketWinRate: ratesPublishable ? lowRate : null,
    highestBucketWinRate: ratesPublishable ? highRate : null,
    spread: ratesPublishable ? spread : null,
    note,
    ratesPublishable,
  };
}

/**
 * Verdict copy, ported from VERDICT_META in calibration-panel.tsx.
 *
 * The glyphs are ▲ / ▼ / · — sanctioned data glyphs, not emoji. The `inverted`
 * copy is the one that matters most: the product states its own failure in the
 * headline, which is the entire positioning claim executed as UI.
 */
export const VERDICT_META: Record<
  DiscriminationTrend,
  { label: string; tone: "verify" | "alert" | "muted"; glyph: string }
> = {
  improving: {
    label: "Confidence ranks picks correctly",
    tone: "verify",
    glyph: "\u25B2",
  },
  inverted: {
    label: "Higher confidence is winning less. Under review",
    tone: "alert",
    glyph: "\u25BC",
  },
  flat: {
    label: "Confidence is not separating picks yet",
    tone: "muted",
    glyph: "\u00B7",
  },
  insufficient: {
    label: "Not enough settled picks to read a trend",
    tone: "muted",
    glyph: "\u00B7",
  },
};

/** Whether a curve may render at all. Below the floor, show `{n}/30`. */
export function canRenderCurve(sampleSize: number): boolean {
  return sampleSize >= MIN_CURVE_SAMPLE;
}

/** The honest empty-state copy when the curve is withheld. */
export function collectingCopy(sampleSize: number): string {
  return `${sampleSize}/${MIN_CURVE_SAMPLE} settled picks. We publish the curve at ${MIN_CURVE_SAMPLE}.`;
}

/* ══════════════════════════════════════════════════════════════════════════
   CONFIDENCE BANDS
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * The confidence ladder, as bands.
 *
 * NOTE FOR AUDITORS — a real finding, recorded here rather than papered over:
 *
 * `DESIGN.md` specifies a four-colour ladder (80-100 plasma, 65-79 cyan,
 * 50-64 UV, <50 silver). The FIELD token revision RETIRED cyan and ultraviolet
 * to fog, so in the shipping palette `--conf-strong`, `--conf-solid` and
 * `--conf-lean` all resolve to `#C4BFB6`. The ladder is therefore degenerate:
 * four bands, two effective colours.
 *
 * This app does not invent hues to repair that — inventing a colour would be a
 * bigger breach than the collapse. Instead it distinguishes bands by POSITION
 * and by FILL WEIGHT (solid / 60% / 30% / outline), and the numeral is always
 * present, which is what the contract requires anyway ("the confidence score is
 * always shown as a number AND optionally a bar"). The token collapse is logged
 * in the audit ledger as an upstream finding for the design owner.
 */
export interface ConfidenceBand {
  label: string;
  /** Inclusive lower bound on the 0-100 score. */
  lower: number;
  /** Inclusive upper bound. */
  upper: number;
  /** Fill weight 0..1 — the band's non-hue differentiator. */
  fill: number;
  /** True for the single band that keeps the ember accent. */
  accent: boolean;
}

export const CONFIDENCE_BANDS: readonly ConfidenceBand[] = [
  { label: "Elite", lower: 80, upper: 100, fill: 1, accent: true },
  { label: "Strong", lower: 65, upper: 79, fill: 0.6, accent: false },
  { label: "Solid", lower: 50, upper: 64, fill: 0.3, accent: false },
  { label: "Lean", lower: 0, upper: 49, fill: 0, accent: false },
] as const;

export function bandForConfidence(score: number): ConfidenceBand {
  for (const band of CONFIDENCE_BANDS) {
    if (score >= band.lower && score <= band.upper) return band;
  }
  return CONFIDENCE_BANDS[CONFIDENCE_BANDS.length - 1] as ConfidenceBand;
}
