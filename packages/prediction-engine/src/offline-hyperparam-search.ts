/**
 * Offline hyperparameter search over shadow UQ knobs.
 *
 * Historical-replay ONLY. Never writes to live config, never flips gates,
 * never auto-promotes a winner into production.
 *
 * Modes:
 *  1. gridSearchShadow — exhaustive discrete grid (default, auditable)
 *  2. ucbSelectNext — UCB1 among partially evaluated configs
 *  3. infoGainSelectNext — discrete MES-style: prefer configs that most
 *     reduce uncertainty about the best objective value (max-value entropy
 *     philosophy without a continuous GP)
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

/**
 * Discrete MES-style selection: prefer the unevaluated (or under-evaluated)
 * config that most reduces uncertainty about the *best objective value*.
 *
 * Continuous MES (Wang & Jegelka) targets H[y*] under a GP. Here the search
 * space is a finite grid of shadow UQ configs, so we approximate:
 *
 *  - Maintain empirical distribution of observed objectives.
 *  - For each candidate, estimate how much observing it would shrink entropy
 *    of the running max (or of a discrete histogram over objective bins).
 *  - Prefer never-tried configs; among tried, prefer high residual uncertainty
 *    relative to the current best (value-of-information about y*).
 *
 * This is NOT a GP-MES implementation. It is the max-value entropy *philosophy*
 * on a discrete auditable grid. Still shadow-only; never auto-promotes.
 */
export function infoGainSelectNext(
  candidates: readonly ShadowHyperparamConfig[],
  history: readonly EvaluatedConfig[],
): {
  readonly next: ShadowHyperparamConfig | null;
  readonly rationale: string;
  readonly priced: false;
  readonly status: "shadow";
} {
  if (candidates.length === 0) {
    return {
      next: null,
      rationale: "empty candidate set",
      priced: false,
      status: "shadow",
    };
  }

  const byId = new Map<string, EvaluatedConfig>();
  for (const h of history) byId.set(h.id, h);

  // Force explore never-tried first (maximum info about unknown arms)
  for (const c of candidates) {
    const h = byId.get(c.id);
    if (!h || h.nEval <= 0) {
      return {
        next: c,
        rationale: `unevaluated config ${c.id} — max info about unknown arm`,
        priced: false,
        status: "shadow",
      };
    }
  }

  // All evaluated at least once: rank by "uncertainty about beating y*"
  const objectives = history.map((h) => h.objective).filter(Number.isFinite);
  const yStar =
    objectives.length > 0 ? Math.max(...objectives) : Number.NEGATIVE_INFINITY;

  // Sample variance of objectives as crude entropy proxy for p(y*)
  const mean =
    objectives.length > 0
      ? objectives.reduce((a, b) => a + b, 0) / objectives.length
      : 0;
  const variance =
    objectives.length > 1
      ? objectives.reduce((s, v) => s + (v - mean) ** 2, 0) / (objectives.length - 1)
      : 1;

  let bestCfg: ShadowHyperparamConfig | null = null;
  let bestGain = Number.NEGATIVE_INFINITY;
  let bestWhy = "";

  for (const c of candidates) {
    const h = byId.get(c.id)!;
    // Distance below y* weighted by 1/sqrt(n) — more value learning about
    // whether this arm can redefine the max when under-sampled or near-best
    const gap = yStar - h.objective; // >= 0 if h is not the unique best
    const uncertainty = Math.sqrt(variance / Math.max(h.nEval, 1));
    // Info proxy: high if under-sampled near the frontier; low if clearly dominated
    const gain = uncertainty / (1 + Math.max(0, gap));
    if (gain > bestGain) {
      bestGain = gain;
      bestCfg = c;
      bestWhy = `cfg ${c.id}: gain=${gain.toFixed(4)} gap=${gap.toFixed(4)} n=${h.nEval}`;
    }
  }

  return {
    next: bestCfg,
    rationale: bestWhy || "no gain computed",
    priced: false,
    status: "shadow",
  };
}
