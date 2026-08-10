/**
 * Adaptive δ via Prediction with Expert Advice (Hedge / Exponentiated Gradient).
 *
 * Candidate thresholds {δ₁,…,δₘ}. Each expert publishes iff |p−0.5|≥δ_j,
 * else incurs a "sit-out" loss (default = 0.25 ≈ UNC of a coin-flip).
 * Published rounds incur Brier (p−y)².
 *
 * Hedge:
 *   w_{t+1,j} ∝ w_{t,j} · exp(−η · ℓ_{t,j})
 * Regret O(√(T ln m)) vs best fixed δ in hindsight.
 *
 * Shadow / offline only. Does not mutate SELECTIVE_PUBLISH_DELTA env.
 */

export type DeltaExpertSample = {
  readonly sampleId: string;
  readonly p: number;
  readonly y: 0 | 1;
  readonly t?: string | number;
};

export type AdaptiveDeltaOptions = {
  readonly deltas?: readonly number[];
  /** Learning rate for Hedge (default 0.35). */
  readonly eta?: number;
  /** Loss when |p−0.5| < δ (sit-out). Default 0.25 ≈ UNC. */
  readonly sitOutLoss?: number;
  readonly initialWeights?: readonly number[];
};

export type AdaptiveDeltaStep = {
  readonly sampleId: string;
  readonly p: number;
  readonly y: 0 | 1;
  readonly chosenDelta: number;
  readonly published: boolean;
  readonly lossChosen: number;
  readonly expertLosses: readonly number[];
  readonly weightsBefore: readonly number[];
};

export type AdaptiveDeltaReport = {
  readonly n: number;
  readonly deltas: readonly number[];
  readonly finalWeights: readonly number[];
  readonly recommendedDelta: number;
  /** Mean loss of Hedge mixture (chosen expert each round). */
  readonly meanLossHedge: number;
  /** Mean loss of best fixed δ in hindsight. */
  readonly meanLossBestFixed: number;
  readonly bestFixedDelta: number;
  readonly beatsBestFixed: boolean;
  /** Online published-set Brier (only rounds chosen expert published). */
  readonly publishedBrierHedge: number;
  readonly publishedN: number;
  readonly steps: readonly AdaptiveDeltaStep[];
  readonly priced: false;
  readonly status: "shadow";
  readonly note: string;
};

function argmax(ws: readonly number[]): number {
  let bi = 0;
  let bv = -Infinity;
  for (let i = 0; i < ws.length; i++) {
    if (ws[i]! > bv) {
      bv = ws[i]!;
      bi = i;
    }
  }
  return bi;
}

function normalize(w: number[]): number[] {
  const s = w.reduce((a, b) => a + b, 0);
  if (s <= 0) {
    const eq = 1 / w.length;
    return w.map(() => eq);
  }
  return w.map((x) => x / s);
}

/**
 * Expert loss for threshold δ on one sample.
 * Publish → Brier; sit-out → sitOutLoss.
 */
export function expertLossAtDelta(
  p: number,
  y: 0 | 1,
  delta: number,
  sitOutLoss: number,
): { loss: number; published: boolean } {
  if (Math.abs(p - 0.5) >= delta) {
    return { loss: (p - y) ** 2, published: true };
  }
  return { loss: sitOutLoss, published: false };
}

/**
 * Chronological Hedge over δ candidates. Chooses argmax weight each round
 * (deterministic exploit); updates all experts with their realized losses.
 */
export function runAdaptiveDeltaHedge(
  samples: readonly DeltaExpertSample[],
  options: AdaptiveDeltaOptions = {},
): AdaptiveDeltaReport {
  const deltas = options.deltas ?? [0, 0.08, 0.1, 0.12, 0.15, 0.18, 0.2, 0.25];
  const eta = options.eta ?? 0.35;
  const sitOut = options.sitOutLoss ?? 0.25;
  const m = deltas.length;

  let weights =
    options.initialWeights && options.initialWeights.length === m
      ? normalize([...options.initialWeights])
      : Array.from({ length: m }, () => 1 / m);

  const ordered = [...samples].sort((a, b) => {
    const ta = a.t ?? a.sampleId;
    const tb = b.t ?? b.sampleId;
    if (typeof ta === "number" && typeof tb === "number") return ta - tb;
    return String(ta).localeCompare(String(tb));
  });

  const steps: AdaptiveDeltaStep[] = [];
  const cumExpertLoss = new Array(m).fill(0);
  let sumChosen = 0;
  let pubBrSum = 0;
  let pubN = 0;

  for (const s of ordered) {
    if (!(s.p > 0 && s.p < 1) || (s.y !== 0 && s.y !== 1)) continue;
    const j = argmax(weights);
    const losses: number[] = [];
    let publishedFlags: boolean[] = [];
    for (let i = 0; i < m; i++) {
      const { loss, published } = expertLossAtDelta(s.p, s.y as 0 | 1, deltas[i]!, sitOut);
      losses.push(loss);
      publishedFlags.push(published);
      cumExpertLoss[i] += loss;
    }

    const lossChosen = losses[j]!;
    const published = publishedFlags[j]!;
    sumChosen += lossChosen;
    if (published) {
      pubBrSum += (s.p - s.y) ** 2;
      pubN += 1;
    }

    steps.push({
      sampleId: s.sampleId,
      p: s.p,
      y: s.y as 0 | 1,
      chosenDelta: deltas[j]!,
      published,
      lossChosen,
      expertLosses: losses,
      weightsBefore: [...weights],
    });

    // Hedge / EG update
    const next = weights.map((w, i) => w * Math.exp(-eta * losses[i]!));
    weights = normalize(next);
  }

  const n = steps.length;
  let bestFixedIdx = 0;
  for (let i = 1; i < m; i++) {
    if (cumExpertLoss[i]! < cumExpertLoss[bestFixedIdx]!) bestFixedIdx = i;
  }
  const meanLossHedge = n === 0 ? NaN : sumChosen / n;
  const meanLossBestFixed = n === 0 ? NaN : cumExpertLoss[bestFixedIdx]! / n;
  const recIdx = argmax(weights);

  return {
    n,
    deltas,
    finalWeights: weights,
    recommendedDelta: deltas[recIdx]!,
    meanLossHedge,
    meanLossBestFixed,
    bestFixedDelta: deltas[bestFixedIdx]!,
    beatsBestFixed:
      n >= 40 &&
      Number.isFinite(meanLossHedge) &&
      meanLossHedge <= meanLossBestFixed + 1e-6,
    publishedBrierHedge: pubN === 0 ? NaN : pubBrSum / pubN,
    publishedN: pubN,
    steps,
    priced: false,
    status: "shadow",
    note:
      "Hedge adaptive-δ (shadow). Sit-out loss=0.25≈UNC. Does not write SELECTIVE_PUBLISH_DELTA. " +
      "Use recommendedDelta as advisory only after integrity check on live sample.",
  };
}
