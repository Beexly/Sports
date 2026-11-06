/**
 * ADDITIVE ONLY — arXiv 1301.0594 (markets / steam surprise).
 *
 * Variance-normalized surprise on an NFL pre-kickoff implied-probability path.
 * Does not alter scoring, confidence, publish gates, or MODEL_VERSION.
 * Disabled by default: callers must opt in; training / production wiring is
 * founder-gated.
 *
 * ACCEPTANCE GATE (lab): ADAPT confirmed if, on the 2025 NFL season, variance-
 * normalized surprise moves predict the direction of the remaining move to
 * close at ≥55% accuracy (baseline 50%) with ≥200 flagged steam events.
 */

/** Probability path sample at one timestamp (American / decimal already mapped to p). */
export interface ProbabilityTick {
  /** Unix ms. */
  readonly t: number;
  /** Implied fair probability in (0, 1). */
  readonly p: number;
}

/** Optional news item for causal attribution near a steam move. */
export interface NewsItem {
  readonly t: number;
  readonly text: string;
}

export interface SteamSurpriseResult {
  readonly deltaLogit: number;
  readonly varT: number;
  readonly surpriseS: number;
  readonly isSteam: boolean;
}

export interface NewsAttribution {
  readonly windowStartMs: number;
  readonly windowEndMs: number;
  readonly matched: readonly string[];
  /** Expected entropy loss proxy over matched tokens (non-negative). */
  readonly expectedEntropyLoss: number;
}

export interface SteamGateReport {
  readonly flagged: number;
  readonly correctDirection: number;
  readonly accuracy: number;
  readonly passes: boolean;
}

const EPS = 1e-9;
const DEFAULT_K = 2;
/** ±30 minutes in ms. */
export const NEWS_HALF_WINDOW_MS = 30 * 60 * 1000;

const ATTRIBUTION_TOKENS = [
  "out",
  "questionable",
  "weather",
] as const;

/**
 * Logit of a probability clamped away from {0,1}.
 */
export function logit(p: number): number {
  const x = Math.min(1 - EPS, Math.max(EPS, p));
  return Math.log(x / (1 - x));
}

/**
 * Change in logit between two probabilities.
 */
export function deltaLogit(pPrev: number, pNext: number): number {
  return logit(pNext) - logit(pPrev);
}

/**
 * Variance-normalized surprise S = Δlogit(p) / sqrt(Var_t).
 * Var_t must be positive; non-finite or non-positive variance yields 0.
 */
export function surpriseS(deltaLogitValue: number, varT: number): number {
  if (!Number.isFinite(deltaLogitValue) || !Number.isFinite(varT) || varT <= 0) {
    return 0;
  }
  return deltaLogitValue / Math.sqrt(varT);
}

/**
 * Steam when |Δlogit| exceeds k × predicted scale (sqrt(Var_t)).
 * Raw Δp is never used for the flag.
 */
export function isSteamMove(
  deltaLogitValue: number,
  varT: number,
  k: number = DEFAULT_K,
): boolean {
  if (!Number.isFinite(deltaLogitValue) || !Number.isFinite(varT) || varT <= 0) {
    return false;
  }
  if (!Number.isFinite(k) || k <= 0) {
    return false;
  }
  const scale = Math.sqrt(varT);
  return Math.abs(deltaLogitValue) > k * scale;
}

/**
 * Evaluate one step on a probability path.
 */
export function evaluateSteamStep(
  pPrev: number,
  pNext: number,
  varT: number,
  k: number = DEFAULT_K,
): SteamSurpriseResult {
  const d = deltaLogit(pPrev, pNext);
  const s = surpriseS(d, varT);
  return {
    deltaLogit: d,
    varT,
    surpriseS: s,
    isSteam: isSteamMove(d, varT, k),
  };
}

/**
 * Scan news in ±30 minutes of event time for player names / status / weather.
 * playerNames are caller-supplied (no fabricated roster).
 */
export function attributeNewsWindow(
  eventTimeMs: number,
  news: readonly NewsItem[],
  playerNames: readonly string[] = [],
): NewsAttribution {
  const windowStartMs = eventTimeMs - NEWS_HALF_WINDOW_MS;
  const windowEndMs = eventTimeMs + NEWS_HALF_WINDOW_MS;
  const matched: string[] = [];
  const lowerPlayers = playerNames.map((n) => n.toLowerCase());

  for (const item of news) {
    if (item.t < windowStartMs || item.t > windowEndMs) {
      continue;
    }
    const lower = item.text.toLowerCase();
    for (const token of ATTRIBUTION_TOKENS) {
      if (lower.includes(token) && !matched.includes(token)) {
        matched.push(token);
      }
    }
    for (const name of lowerPlayers) {
      if (name.length > 0 && lower.includes(name) && !matched.includes(name)) {
        matched.push(name);
      }
    }
  }

  // Expected entropy-loss proxy: more distinct matched cues → higher loss.
  const expectedEntropyLoss =
    matched.length === 0 ? 0 : Math.log(1 + matched.length);

  return {
    windowStartMs,
    windowEndMs,
    matched,
    expectedEntropyLoss,
  };
}

/**
 * Direction of remaining move to close: sign of (pClose - pAtFlag).
 * Surprise direction: sign of surpriseS (or deltaLogit).
 */
export function predictsCloseDirection(
  surprise: number,
  pAtFlag: number,
  pClose: number,
): boolean {
  if (!Number.isFinite(surprise) || surprise === 0) {
    return false;
  }
  const remaining = pClose - pAtFlag;
  if (!Number.isFinite(remaining) || remaining === 0) {
    return false;
  }
  return Math.sign(surprise) === Math.sign(remaining);
}

/**
 * ACCEPTANCE GATE: ≥55% direction accuracy on ≥200 flagged steam events.
 */
export function passesSteamGate(
  flagged: number,
  correctDirection: number,
): SteamGateReport {
  const safeFlagged = Math.max(0, Math.floor(flagged));
  const safeCorrect = Math.max(0, Math.floor(correctDirection));
  const accuracy = safeFlagged === 0 ? 0 : safeCorrect / safeFlagged;
  const passes = safeFlagged >= 200 && accuracy >= 0.55;
  return {
    flagged: safeFlagged,
    correctDirection: safeCorrect,
    accuracy,
    passes,
  };
}
