/**
 * Value-of-information ranking for Odds-API credit spend.
 *
 * Pure decision-support math. Does not call the API, does not set env keys,
 * does not schedule jobs. Founder/ops uses the ranked list under the existing
 * free-tier quota (500 credits/mo documented in OMNIBUS).
 *
 * Heuristic expected information gain proxies:
 *  - unresolved CLV learning value (games near kickoff without a close snapshot)
 *  - taxonomy sparsity (under-filled Mondrian categories benefit more from data)
 *  - sport priority (NFL fantasy-first path weights higher)
 *
 * This is NOT a claim of optimal experimental design optimality — it is a
 * transparent ranking function so credit burn is intentional, not FIFO.
 */

export interface OddsPullCandidate {
  readonly id: string;
  readonly sport: string;
  /** Estimated credits this pull would consume. */
  readonly creditCost: number;
  /** Hours until scheduled start (smaller → higher urgency for closing line). */
  readonly hoursToStart: number;
  /** True if we already hold a usable close/snapshot. */
  readonly hasCloseSnapshot: boolean;
  /** Mondrian category sample size if known (sparse → higher VoI). */
  readonly taxonomySampleSize?: number;
  /** Optional manual priority boost (e.g. 1.5 for NFL). */
  readonly priorityBoost?: number;
  /**
   * Optional model win-prob for entropy/EIG blend (see expected-info-gain.ts).
   * When set with expectedMarketP, score blends heuristic VoI with eigOfMarketPull.
   */
  readonly modelP?: number;
  /** Optional expected market implied prob after pull (defaults to 0.5 if modelP set). */
  readonly expectedMarketP?: number;
}

export interface RankedOddsPull extends OddsPullCandidate {
  readonly voiScore: number;
  readonly priced: false;
  readonly status: "shadow";
}

/**
 * Score one candidate. Higher = spend a credit here first.
 *
 * Components (multiplicative / additive mix kept simple and auditable):
 *  - urgency: 1 / (1 + hoursToStart) — closing-line value decays toward kickoff
 *  - novelty: 0 if hasCloseSnapshot else 1
 *  - sparsity: 1 / (1 + taxonomySampleSize) — fill thin Mondrian cells
 *  - boost: priorityBoost ?? (sport === "nfl" ? 1.5 : 1)
 *  - efficiency: score / max(creditCost, 1)
 */
export function scoreOddsPullCandidate(c: OddsPullCandidate): number {
  if (!Number.isFinite(c.creditCost) || c.creditCost <= 0) return 0;
  if (c.hasCloseSnapshot) return 0; // no new close information

  const hours = Number.isFinite(c.hoursToStart) ? Math.max(0, c.hoursToStart) : 168;
  const urgency = 1 / (1 + hours);
  const n = c.taxonomySampleSize ?? 0;
  const sparsity = 1 / (1 + Math.max(0, n));
  const boost =
    c.priorityBoost ??
    (c.sport.toLowerCase() === "nfl" || c.sport.toLowerCase() === "americanfootball_nfl"
      ? 1.5
      : 1);

  const raw = urgency * (0.5 + 0.5 * sparsity) * boost;

  // Optional entropy/EIG blend when modelP is supplied (see expected-info-gain.ts)
  let eigBoost = 1;
  if (typeof c.modelP === "number" && Number.isFinite(c.modelP)) {
    const eps = 1e-12;
    const clamp01 = (x: number) => Math.min(1 - eps, Math.max(eps, x));
    const binaryH = (x: number) => {
      if (!Number.isFinite(x)) return Number.NaN;
      const z = Math.min(1, Math.max(0, x));
      if (z <= 0 || z >= 1) return 0;
      return -z * Math.log(z) - (1 - z) * Math.log(1 - z);
    };
    const p = Math.min(1, Math.max(0, c.modelP));
    const mRaw =
      typeof c.expectedMarketP === "number" && Number.isFinite(c.expectedMarketP)
        ? c.expectedMarketP
        : 0.5;
    const m = Math.min(1, Math.max(0, mRaw));
    const sharpness = Math.max(0, binaryH(p) - binaryH(m));
    const pp = clamp01(p);
    const mm = clamp01(m);
    const kl_m_p = mm * Math.log(mm / pp) + (1 - mm) * Math.log((1 - mm) / (1 - pp));
    const eig = sharpness + 0.25 * kl_m_p;
    eigBoost = 1 + Math.max(0, eig);
  }

  return (raw * eigBoost) / c.creditCost;
}

/**
 * Rank candidates descending by VoI score, then greedily select under a remaining
 * credit budget (knapsack-greedy by score density already in score).
 */
export function rankOddsPullsForBudget(
  candidates: readonly OddsPullCandidate[],
  remainingCredits: number,
): {
  readonly ranked: readonly RankedOddsPull[];
  readonly selected: readonly RankedOddsPull[];
  readonly estimatedSpend: number;
  readonly priced: false;
  readonly status: "shadow";
} {
  const ranked: RankedOddsPull[] = candidates
    .map((c) => ({
      ...c,
      voiScore: scoreOddsPullCandidate(c),
      priced: false as const,
      status: "shadow" as const,
    }))
    .sort((a, b) => b.voiScore - a.voiScore);

  const selected: RankedOddsPull[] = [];
  let spend = 0;
  const budget = Number.isFinite(remainingCredits) ? Math.max(0, remainingCredits) : 0;
  for (const r of ranked) {
    if (r.voiScore <= 0) continue;
    if (spend + r.creditCost > budget) continue;
    selected.push(r);
    spend += r.creditCost;
  }

  return {
    ranked,
    selected,
    estimatedSpend: spend,
    priced: false,
    status: "shadow",
  };
}
