/**
 * Adaptive Conformal Inference (ACI) — per-group show/abstain only.
 *
 * Feature flag: CONFORMAL_ABSTAIN_ENABLED (default false).
 * MUST NOT drive calibrationPublished, PERFORMANCE_STATS, or LIVE_BOARD.
 *
 * groupKey = sport|market; rolling nonconformity scores; alpha adapts toward
 * alphaTarget with step gamma; singleton prediction set ⇒ show else abstain.
 */

export interface AciConfig {
  readonly alphaTarget: number;
  readonly gamma: number;
  readonly alphaMin: number;
  readonly alphaMax: number;
  readonly nMin: number;
  readonly windowSize: number;
}

export const DEFAULT_ACI_CONFIG: AciConfig = {
  alphaTarget: 0.1,
  gamma: 0.01,
  alphaMin: 0.02,
  alphaMax: 0.4,
  nMin: 50,
  windowSize: 200,
};

export interface AciGroupState {
  readonly groupKey: string;
  readonly alpha: number;
  /** Rolling nonconformity scores (higher = more nonconforming). */
  readonly scores: readonly number[];
  readonly shown: number;
  readonly hits: number;
  readonly misses: number;
  readonly abstentions: number;
  readonly updatedAt: string;
  readonly version: number;
}

export interface AciDecision {
  readonly groupKey: string;
  readonly show: boolean;
  readonly abstain: boolean;
  readonly alpha: number;
  readonly threshold: number | null;
  readonly setSize: number;
  readonly reason: string;
  readonly n: number;
}

export function isConformalAbstainEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env["CONFORMAL_ABSTAIN_ENABLED"]?.trim().toLowerCase() === "true";
}

/** Nonconformity for probability of chosen side: 1 - p_side (standard). */
export function nonconformityScore(pSide: number): number {
  return 1 - Math.min(1, Math.max(0, pSide));
}

function quantile(sortedAsc: readonly number[], q: number): number {
  if (sortedAsc.length === 0) return 1;
  const qq = Math.min(1, Math.max(0, q));
  const idx = Math.ceil((sortedAsc.length) * (1 - qq)) - 1;
  const i = Math.min(sortedAsc.length - 1, Math.max(0, idx));
  return sortedAsc[i]!;
}

export function emptyGroupState(groupKey: string, alphaTarget = 0.1): AciGroupState {
  return {
    groupKey,
    alpha: alphaTarget,
    scores: [],
    shown: 0,
    hits: 0,
    misses: 0,
    abstentions: 0,
    updatedAt: new Date().toISOString(),
    version: 1,
  };
}

/**
 * Decide show/abstain for a forecast without mutating history.
 * Prediction set for binary: include side if score ≤ threshold(alpha).
 * Singleton ⇒ show.
 */
export function decideAciShow(
  state: AciGroupState,
  pSide: number,
  config: AciConfig = DEFAULT_ACI_CONFIG,
): AciDecision {
  const n = state.scores.length;
  if (n < config.nMin) {
    return {
      groupKey: state.groupKey,
      show: false,
      abstain: true,
      alpha: state.alpha,
      threshold: null,
      setSize: 2,
      reason: `n=${n} < nMin=${config.nMin} — abstain`,
      n,
    };
  }
  const sorted = [...state.scores].sort((a, b) => a - b);
  const thr = quantile(sorted, state.alpha);
  const scoreChosen = nonconformityScore(pSide);
  const scoreOther = nonconformityScore(1 - pSide);
  let setSize = 0;
  if (scoreChosen <= thr) setSize += 1;
  if (scoreOther <= thr) setSize += 1;
  // If neither (pathological), treat as empty → abstain
  if (setSize === 0) setSize = 2;

  const show = setSize === 1 && scoreChosen <= thr;
  return {
    groupKey: state.groupKey,
    show,
    abstain: !show,
    alpha: state.alpha,
    threshold: thr,
    setSize,
    reason: show
      ? `Singleton set at α=${state.alpha.toFixed(3)} thr=${thr.toFixed(3)} — show`
      : `setSize=${setSize} at α=${state.alpha.toFixed(3)} — abstain`,
    n,
  };
}

/**
 * After outcome known: update rolling scores + alpha (ACI miss/hit).
 * miss = shown and wrong; hit = shown and correct. Abstain does not update alpha
 * toward target via err (only records abstention).
 */
export function updateAciGroup(
  state: AciGroupState,
  input: {
    readonly pSide: number;
    readonly ySide: 0 | 1; // 1 if chosen side won
    readonly didShow: boolean;
  },
  config: AciConfig = DEFAULT_ACI_CONFIG,
): AciGroupState {
  const score = nonconformityScore(input.pSide);
  const scores = [...state.scores, score].slice(-config.windowSize);

  let alpha = state.alpha;
  let shown = state.shown;
  let hits = state.hits;
  let misses = state.misses;
  let abstentions = state.abstentions;

  if (!input.didShow) {
    abstentions += 1;
  } else {
    shown += 1;
    const err = input.ySide === 1 ? 0 : 1; // miss = 1
    if (err === 0) hits += 1;
    else misses += 1;
    // ACI: α ← α + γ (err − α_target) then clip
    alpha = alpha + config.gamma * (err - config.alphaTarget);
    alpha = Math.min(config.alphaMax, Math.max(config.alphaMin, alpha));
  }

  return {
    groupKey: state.groupKey,
    alpha,
    scores,
    shown,
    hits,
    misses,
    abstentions,
    updatedAt: new Date().toISOString(),
    version: state.version,
  };
}

export function realizedCoverage(state: AciGroupState): number | null {
  if (state.shown <= 0) return null;
  return state.hits / state.shown;
}

export interface AciArtifact {
  readonly version: 1;
  readonly generatedAt: string;
  readonly config: AciConfig;
  readonly groups: readonly AciGroupState[];
  readonly note: string;
}
