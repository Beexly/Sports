/**
 * Offline hyperparameter search over shadow UQ knobs.
 *
 * Historical-replay ONLY. Never writes to live config, never flips gates,
 * never auto-promotes a winner into production.
 *
 * Two modes:
 *  1. gridSearchShadow — exhaustive discrete grid (default, auditable)
 *  2. ucbSelectNext — one step of GP-UCB-style selection among unevaluated
 *     configs when evaluations are expensive (uses empirical mean/var of
 *     already-scored neighbors as a crude surrogate — not a full GP)
 *
 * Objective should be a scalar where HIGHER is better (e.g. -meanWinkler,
 * meanLogScore, or a composite of coverage-near-target + negative width).
 */

export interface ShadowHyperparamConfig {
  readonly id: string;
  /** e.g. Mondrian minSamples */
  readonly minSamples: number;
  /** ACI learning rate */
  readonly learningRate: number;
  /** Taxonomy level 1 | 2 */
  readonly taxonomyLevel: 1 | 2;
  /** Target coverage for residual quantile */
  readonly targetCoverage: number;
}

export interface EvaluatedConfig extends ShadowHyperparamConfig {
  readonly objective: number;
  readonly nEval: number;
  readonly priced: false;
  readonly status: "shadow";
}

export interface GridSearchResult {
  readonly evaluations: readonly EvaluatedConfig[];
  readonly best: EvaluatedConfig | null;
  readonly priced: false;
  readonly status: "shadow";
  /** Explicit: caller must founder-gate any promotion. */
  readonly autoPromoted: false;
}

/** Cartesian product of discrete grids. */
export function expandShadowGrid(options: {
  readonly minSamples: readonly number[];
  readonly learningRates: readonly number[];
  readonly taxonomyLevels: readonly (1 | 2)[];
  readonly targetCoverages: readonly number[];
}): readonly ShadowHyperparamConfig[] {
  const out: ShadowHyperparamConfig[] = [];
  let i = 0;
  for (const minSamples of options.minSamples) {
    for (const learningRate of options.learningRates) {
      for (const taxonomyLevel of options.taxonomyLevels) {
        for (const targetCoverage of options.targetCoverages) {
          out.push({
            id: `cfg_${i++}`,
            minSamples,
            learningRate,
            taxonomyLevel,
            targetCoverage,
          });
        }
      }
    }
  }
  return out;
}

/**
 * Evaluate every config via caller-supplied objective on historical replay.
 * objective(config) must be pure and side-effect free w.r.t. production state.
 */
export function gridSearchShadow(
  configs: readonly ShadowHyperparamConfig[],
  objective: (cfg: ShadowHyperparamConfig) => number,
): GridSearchResult {
  const evaluations: EvaluatedConfig[] = configs.map((cfg) => {
    const value = objective(cfg);
    return {
      ...cfg,
      objective: Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY,
      nEval: 1,
      priced: false as const,
      status: "shadow" as const,
    };
  });

  let best: EvaluatedConfig | null = null;
  for (const e of evaluations) {
    if (best === null || e.objective > best.objective) best = e;
  }

  return {
    evaluations,
    best,
    priced: false,
    status: "shadow",
    autoPromoted: false,
  };
}

/**
 * UCB1-style next config among discrete candidates with partial evaluations.
 * score = mean + sqrt(2 ln N / n_i). Unevaluated configs get +Infinity priority.
 */
export function ucbSelectNext(
  candidates: readonly ShadowHyperparamConfig[],
  history: readonly EvaluatedConfig[],
): ShadowHyperparamConfig | null {
  if (candidates.length === 0) return null;

  const byId = new Map<string, EvaluatedConfig>();
  for (const h of history) byId.set(h.id, h);

  const totalN = history.reduce((s, h) => s + h.nEval, 0);
  let bestCfg: ShadowHyperparamConfig | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const c of candidates) {
    const h = byId.get(c.id);
    if (!h || h.nEval <= 0) {
      // Force exploration of never-tried configs
      return c;
    }
    const bonus = Math.sqrt((2 * Math.log(Math.max(totalN, 1))) / h.nEval);
    const score = h.objective + bonus;
    if (score > bestScore) {
      bestScore = score;
      bestCfg = c;
    }
  }
  return bestCfg;
}
