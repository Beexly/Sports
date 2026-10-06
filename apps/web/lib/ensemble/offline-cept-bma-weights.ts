/**
 * C3 offline CEPT / BMA weight-schedule proposal (cat:C3).
 *
 * Given per-expert historical Brier (or log-loss) on identical settled rows,
 * propose multiplicative / BMA-style weights. Measurement / proposal only —
 * does not change production ensemble weights or MODEL_VERSION.
 *
 * Spirit: Bayesian model averaging + e-process / multiplicative weights
 * (CEPT meta-model). Softmax over −loss with temperature τ.
 */

export type ExpertLossRow = {
  readonly expertId: string;
  /** Mean loss on the evaluation window (Brier or log-loss); lower is better. */
  readonly meanLoss: number;
  readonly n: number;
};

export type ProposedWeight = {
  readonly expertId: string;
  readonly weight: number;
  readonly meanLoss: number;
  readonly n: number;
};

export type OfflineCeptBmaResult = {
  readonly temperature: number;
  readonly weights: readonly ProposedWeight[];
  /** Sum of weights (should be ~1). */
  readonly weightSum: number;
  readonly notes: readonly string[];
};

function clampLoss(x: number): number {
  if (!Number.isFinite(x)) return 1;
  return Math.max(0, x);
}

/**
 * Softmax weights: w_i ∝ exp(−meanLoss_i / temperature).
 * temperature → 0 concentrates on the best expert; → ∞ approaches uniform.
 */
export function proposeCeptBmaWeights(
  rows: readonly ExpertLossRow[],
  temperature: number = 0.05,
): OfflineCeptBmaResult {
  const tau = Number.isFinite(temperature) && temperature > 0 ? temperature : 0.05;
  const usable = rows.filter(
    (r) => typeof r.expertId === "string" && r.expertId.length > 0 && r.n > 0,
  );
  if (usable.length === 0) {
    return {
      temperature: tau,
      weights: [],
      weightSum: 0,
      notes: [
        "No experts with n > 0 — empty proposal.",
        "Offline only — do not write these weights into production without founder OK.",
      ],
    };
  }
  const scaled = usable.map((r) => ({
    expertId: r.expertId,
    meanLoss: clampLoss(r.meanLoss),
    n: r.n,
    score: Math.exp(-clampLoss(r.meanLoss) / tau),
  }));
  const z = scaled.reduce((s, r) => s + r.score, 0);
  const weights: ProposedWeight[] = scaled.map((r) => ({
    expertId: r.expertId,
    weight: z > 0 ? r.score / z : 1 / scaled.length,
    meanLoss: r.meanLoss,
    n: r.n,
  }));
  // Stable order: weight desc, then expertId
  weights.sort((a, b) => b.weight - a.weight || a.expertId.localeCompare(b.expertId));
  const weightSum = weights.reduce((s, w) => s + w.weight, 0);
  return {
    temperature: tau,
    weights,
    weightSum,
    notes: [
      "Offline / proposal only — does not mutate production ensemble weights.",
      "Softmax over −loss; tune temperature on a held-out window before adopting.",
      "Market-implied probability can be one expertId (e.g. \"market\") in the table.",
      "No MODEL_VERSION / gate changes in this unit.",
    ],
  };
}

export const OFFLINE_CEPT_BMA_FIXTURE: readonly ExpertLossRow[] = [
  { expertId: "current", meanLoss: 0.22, n: 200 },
  { expertId: "logistic", meanLoss: 0.21, n: 200 },
  { expertId: "poisson", meanLoss: 0.23, n: 200 },
  { expertId: "market", meanLoss: 0.2, n: 200 },
];
