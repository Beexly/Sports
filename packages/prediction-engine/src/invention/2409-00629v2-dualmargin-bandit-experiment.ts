/**
 * Dual-margin pre-registered experiment with Thompson-sampling contextual
 * bandit assignment — arXiv 2409.00629v2 ("Upselling in Online Fantasy
 * Sports: Dream11 Experiments and Causal Policy").
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes
 * predictions and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: fantasy-sports upsell experiments evaluated on two
 * margins at once — revenue-per-visitor AND conversion rate — with a
 * pre-registered design over upsell intensities. The paper's lesson for GSE:
 * replace fixed-arm assignment with a Thompson-sampling contextual bandit
 * so the experiment minimizes regret (lost revenue) while it runs, and
 * keep the CATE-assignment half only if offline uplift estimates replicate
 * live — otherwise ship the best uniform arm.
 *
 * Improvement (record): Replace fixed-arm fantasy upsell experiments with
 * the paper's pre-registered dual-margin design upgraded to
 * Thompson-sampling contextual bandit assignment across the four upsell
 * intensities, minimizing regret during the experiment itself.
 *
 * ACCEPTANCE GATE: ADAPT the experiment design if: a pre-registered
 * dual-margin experiment shows >=5% revenue-per-visitor lift with conversion
 * decline <1 pp over >=4 weeks. REJECT the CATE-assignment half if offline
 * uplift estimates cannot be replicated in a live A/B — ship only the best
 * uniform arm. (Gate requires live experiment traffic; run via the promo
 * experiment harness.)
 */

/** The four upsell intensities (arms 0..3, e.g. none/soft/standard/hard). */
export const NUM_ARMS = 4;

export interface ExperimentSpec {
  readonly name: string;
  readonly arms: readonly string[];
  /** Pre-registered primary metric. */
  readonly primaryMetric: "revenue_per_visitor";
  /** Pre-registered guardrail metric. */
  readonly guardrailMetric: "conversion_rate";
  /** Gate thresholds: >=5% RPV lift, conversion decline <1pp. */
  readonly minRevenueLift: number;
  readonly maxConversionDeclinePp: number;
  /** Minimum experiment length in weeks. */
  readonly minWeeks: number;
  readonly registeredAt: string;
}

export interface BanditArmState {
  /** Beta posterior for the conversion Bernoulli outcome. */
  alpha: number;
  beta: number;
  /** Running revenue-per-visitor mean and count. */
  revenueSum: number;
  pulls: number;
  /** Contextual segment weights (segment -> weight multiplier). */
  segmentWeights: Record<string, number>;
}

export function initialArmState(): BanditArmState {
  return { alpha: 1, beta: 1, revenueSum: 0, pulls: 0, segmentWeights: {} };
}

export interface Assignment {
  readonly arm: number;
  readonly sampledConversionProb: number;
  readonly segment: string;
}

/** Sample one Beta(alpha, beta) via the gamma-ratio method. */
function sampleBeta(alpha: number, beta: number, rng: () => number): number {
  const sampleGamma = (k: number): number => {
    // Marsaglia-Tsang for k >= 1; augment for k < 1.
    let d = k;
    let boost = 1;
    if (d < 1) {
      d += 1;
      boost = Math.pow(rng(), 1 / k);
    }
    const c = 1 / Math.sqrt(9 * d);
    for (;;) {
      let x = 0;
      let v = 0;
      do {
        x = 1 - rng() + 1e-12;
        v = Math.log(x / (1 - x + 1e-12));
      } while (v < -6);
      const z = x - c * v;
      if (z <= 0) continue;
      const u = rng();
      const lhs = Math.log(u);
      const rhs =
        0.5 * x * x +
        d -
        d * z +
        d * Math.log(z);
      if (lhs < rhs) return boost * d * z;
    }
  };
  const g1 = sampleGamma(alpha);
  const g2 = sampleGamma(beta);
  return g1 / (g1 + g2);
}

/**
 * Thompson-sampling contextual assignment: sample a conversion
 * probability per arm from its Beta posterior, scale by the visitor's
 * segment weight (context), and pull the argmax arm. Regret-minimizing
 * while the experiment itself runs.
 */
export function assignArm(
  states: readonly BanditArmState[],
  segment: string,
  rng: () => number,
): Assignment {
  let best = 0;
  let bestScore = -Infinity;
  let bestP = 0;
  for (let i = 0; i < states.length; i++) {
    const s = states[i]!;
    const p = sampleBeta(s.alpha, s.beta, rng);
    const w = s.segmentWeights[segment] ?? 1;
    const score = p * w;
    if (score > bestScore) {
      bestScore = score;
      best = i;
      bestP = p;
    }
  }
  return { arm: best, sampledConversionProb: bestP, segment };
}

/** Record one visitor outcome into the pulled arm's posteriors. */
export function recordOutcome(
  states: BanditArmState[],
  arm: number,
  converted: boolean,
  revenue: number,
): void {
  const s = states[arm]!;
  s.alpha += converted ? 1 : 0;
  s.beta += converted ? 0 : 1;
  s.revenueSum += revenue;
  s.pulls += 1;
}

export interface DualMarginResult {
  /** Revenue-per-visitor lift vs the no-upsell control arm. */
  readonly revenueLift: number;
  /** Conversion-rate change in percentage points vs control. */
  readonly conversionChangePp: number;
  readonly weeks: number;
  readonly totalPulls: number;
}

/** Compute dual-margin metrics from arm states (arm 0 = control). */
export function computeDualMargin(
  states: readonly BanditArmState[],
  bestArm: number,
  weeks: number,
): DualMarginResult {
  const ctrl = states[0]!;
  const trt = states[bestArm]!;
  const ctrlRpv = ctrl.pulls > 0 ? ctrl.revenueSum / ctrl.pulls : 0;
  const trtRpv = trt.pulls > 0 ? trt.revenueSum / trt.pulls : 0;
  const ctrlConv = ctrl.pulls > 0 ? ctrl.alpha / (ctrl.alpha + ctrl.beta) : 0;
  const trtConv = trt.pulls > 0 ? trt.alpha / (trt.alpha + trt.beta) : 0;
  return {
    revenueLift: ctrlRpv > 0 ? (trtRpv - ctrlRpv) / ctrlRpv : 0,
    conversionChangePp: (trtConv - ctrlConv) * 100,
    weeks,
    totalPulls: states.reduce((t, s) => t + s.pulls, 0),
  };
}

/**
 * Gate check from the record: >=5% RPV lift, conversion decline <1pp,
 * experiment ran >=4 weeks.
 */
export function passesDualMarginGate(
  spec: ExperimentSpec,
  result: DualMarginResult,
): boolean {
  return (
    result.revenueLift >= spec.minRevenueLift &&
    -result.conversionChangePp < spec.maxConversionDeclinePp &&
    result.weeks >= spec.minWeeks
  );
}

/**
 * CATE-replication check: REJECT the CATE-assignment half when the live A/B
 * uplift disagrees in sign with the offline uplift estimate (cannot
 * replicate) — the record then says ship only the best uniform arm.
 */
export function cateReplicatesLive(
  offlineUplift: number,
  liveUplift: number,
  tolerance = 0.5,
): boolean {
  if (Math.sign(offlineUplift) !== Math.sign(liveUplift)) return false;
  if (Math.abs(offlineUplift) < 1e-12 && Math.abs(liveUplift) < 1e-12)
    return true;
  const denom = Math.max(Math.abs(offlineUplift), 1e-12);
  return Math.abs(liveUplift - offlineUplift) / denom <= tolerance;
}

export function defaultExperimentSpec(): ExperimentSpec {
  return {
    name: "fantasy-upsell-dualmargin-v1",
    arms: ["none", "soft", "standard", "hard"],
    primaryMetric: "revenue_per_visitor",
    guardrailMetric: "conversion_rate",
    minRevenueLift: 0.05,
    maxConversionDeclinePp: 1,
    minWeeks: 4,
    registeredAt: new Date().toISOString(),
  };
}
