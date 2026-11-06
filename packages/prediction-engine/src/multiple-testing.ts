/**
 * Multiple-testing control — the conscience of an autonomous discovery engine.
 *
 * When a nightly job tests many candidate signals at once, raw per-test p-values
 * lie: at α=0.05, testing 20 dead signals yields ~1 "significant" result by pure
 * chance. The Benjamini-Hochberg step-up procedure controls the FALSE DISCOVERY
 * RATE — the expected fraction of declared discoveries that are actually noise —
 * across the whole family tested in a single night.
 *
 * A subtler trap is testing the SAME candidate night after night: even when each
 * night is FDR-clean, repeated looks inflate the cumulative error, so a noise
 * signal eventually gets a lucky night. `meetsCrossNightConfirmation` is the
 * discipline for that — a candidate is only promotable after surviving K
 * consecutive nightly discoveries AND clearing a Bonferroni-over-nights bar that
 * pays for every look it has had.
 *
 * This is what separates honest signal discovery from the "turf domes after a
 * primetime loss cover 61%" overfitting trap. Pure, deterministic, no I/O —
 * no DB, no Date, no RNG — so every promotion decision is replayable.
 */

export interface PValueEntry {
  /** Stable identifier for the candidate hypothesis (e.g. a signal id). */
  readonly key: string;
  /** The candidate's p-value under its null hypothesis, in [0, 1]. */
  readonly pValue: number;
}

export interface BenjaminiHochbergResult {
  readonly key: string;
  readonly pValue: number;
  /** 1-based rank after sorting p-values ascending (ties broken by key). */
  readonly rank: number;
  /** The BH critical value for this rank: (rank / m) · q. */
  readonly bhThreshold: number;
  /**
   * True if this hypothesis is a discovery. BH is a STEP-UP procedure: every
   * hypothesis with rank ≤ the largest passing rank is a discovery, even if its
   * own p-value exceeds its own critical value.
   */
  readonly discovery: boolean;
  /** BH-adjusted p-value (q-value): monotone non-decreasing in rank, clamped to ≤ 1. */
  readonly qValue: number;
}

export interface BenjaminiHochbergSummary {
  /** The target false-discovery rate this family was controlled at. */
  readonly q: number;
  /** m — the number of hypotheses in the family. */
  readonly familySize: number;
  /** How many hypotheses were declared discoveries. */
  readonly discoveries: number;
  /** Largest rank k where p(k) ≤ (k/m)·q; 0 if none passes. */
  readonly maxPassingRank: number;
  /** Results in rank order (ascending p-value, ties broken by key). */
  readonly results: readonly BenjaminiHochbergResult[];
}

function assertProbability(p: number, label: string): void {
  if (!Number.isFinite(p) || p < 0 || p > 1) {
    throw new RangeError(`${label} must be a finite probability in [0, 1], got ${String(p)}`);
  }
}

/**
 * Benjamini-Hochberg step-up FDR control over a family of p-values.
 *
 * Procedure: sort p-values ascending p(1) ≤ … ≤ p(m); find the largest rank k
 * with p(k) ≤ (k/m)·q; declare every hypothesis with rank ≤ k a discovery.
 * Under independence (or positive dependence) this bounds E[false discoveries /
 * total discoveries] ≤ q.
 *
 * @param entries the family of candidate hypotheses (order-independent)
 * @param q target false-discovery rate, in (0, 1]
 * @returns a summary with per-hypothesis discovery flags and BH-adjusted q-values
 */
export function benjaminiHochberg(
  entries: readonly PValueEntry[],
  q: number,
): BenjaminiHochbergSummary {
  if (!Number.isFinite(q) || q <= 0 || q > 1) {
    throw new RangeError(`q must be in (0, 1], got ${String(q)}`);
  }

  const m = entries.length;
  if (m === 0) {
    return { q, familySize: 0, discoveries: 0, maxPassingRank: 0, results: [] };
  }

  for (const e of entries) assertProbability(e.pValue, `pValue for "${e.key}"`);

  // Sort ascending by p-value; break ties by key for deterministic, replayable ranks.
  const sorted = [...entries].sort(
    (a, b) => a.pValue - b.pValue || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0),
  );

  // Largest rank k* (1-based) with p(k) ≤ (k/m)·q.
  let maxPassingRank = 0;
  for (let i = 1; i <= m; i += 1) {
    if (sorted[i - 1]!.pValue <= (i / m) * q) maxPassingRank = i;
  }

  // BH-adjusted q-values: sweep from the largest rank down, taking a running min of
  // (m/i)·p(i) so the adjusted values are monotone non-decreasing in rank.
  const qValues = new Array<number>(m);
  let runningMin = Number.POSITIVE_INFINITY;
  for (let i = m; i >= 1; i -= 1) {
    const raw = (m / i) * sorted[i - 1]!.pValue;
    runningMin = Math.min(runningMin, raw);
    qValues[i - 1] = Math.min(1, runningMin);
  }

  const results: BenjaminiHochbergResult[] = sorted.map((e, idx) => {
    const rank = idx + 1;
    return {
      key: e.key,
      pValue: e.pValue,
      rank,
      bhThreshold: (rank / m) * q,
      discovery: rank <= maxPassingRank,
      qValue: qValues[idx]!,
    };
  });

  return { q, familySize: m, discoveries: maxPassingRank, maxPassingRank, results };
}

export interface NightlyObservation {
  /** The candidate's per-night p-value from that night's family test, in [0, 1]. */
  readonly pValue: number;
  /** Whether the candidate was a BH discovery that night. */
  readonly discovery: boolean;
}

export interface CrossNightOptions {
  /** Consecutive most-recent discovery nights required to confirm. Default 3. */
  readonly requiredConsecutive?: number;
  /** Promotion significance bar BEFORE the over-nights Bonferroni penalty. Default 0.05. */
  readonly alphaPromote?: number;
}

export interface CrossNightConfirmation {
  readonly confirmed: boolean;
  /** Consecutive discovery nights ending at the most recent observation. */
  readonly consecutiveDiscoveries: number;
  /** Total nights this candidate has been tested — the family size for the penalty. */
  readonly nightsTested: number;
  /** Smallest p-value across the trailing consecutive-discovery streak (∞ if none). */
  readonly bestStreakPValue: number;
  /** alphaPromote / nightsTested — the Bonferroni-over-nights bar the streak must clear. */
  readonly bonferroniBar: number;
}

/**
 * Confirm a candidate for promotion only after it survives repeated independent
 * looks — the cross-night discipline that single-night FDR control cannot provide.
 *
 * `history` is ordered oldest → newest. A candidate is confirmed iff it was a
 * discovery on each of the last `requiredConsecutive` nights AND its best p-value
 * over that streak clears `alphaPromote / nightsTested` (a Bonferroni correction
 * that charges for every night it has been looked at). One lucky night can never
 * promote a noise signal.
 *
 * @param history the candidate's per-night observations, oldest first
 * @param options consecutive-night requirement and pre-penalty alpha
 */
export function meetsCrossNightConfirmation(
  history: readonly NightlyObservation[],
  options: CrossNightOptions = {},
): CrossNightConfirmation {
  const requiredConsecutive = options.requiredConsecutive ?? 3;
  const alphaPromote = options.alphaPromote ?? 0.05;
  if (!Number.isFinite(alphaPromote) || alphaPromote <= 0 || alphaPromote > 1) {
    throw new RangeError(`alphaPromote must be in (0, 1], got ${String(alphaPromote)}`);
  }
  if (!Number.isInteger(requiredConsecutive) || requiredConsecutive < 1) {
    throw new RangeError(
      `requiredConsecutive must be a positive integer, got ${String(requiredConsecutive)}`,
    );
  }
  for (const o of history) assertProbability(o.pValue, "observation pValue");

  const nightsTested = history.length;
  const bonferroniBar = nightsTested > 0 ? alphaPromote / nightsTested : alphaPromote;

  // Walk backwards from the most recent night, counting the trailing discovery streak.
  let consecutiveDiscoveries = 0;
  let bestStreakPValue = Number.POSITIVE_INFINITY;
  for (let i = nightsTested - 1; i >= 0; i -= 1) {
    const o = history[i]!;
    if (!o.discovery) break;
    consecutiveDiscoveries += 1;
    bestStreakPValue = Math.min(bestStreakPValue, o.pValue);
  }

  const confirmed =
    consecutiveDiscoveries >= requiredConsecutive && bestStreakPValue <= bonferroniBar;

  return { confirmed, consecutiveDiscoveries, nightsTested, bestStreakPValue, bonferroniBar };
}
