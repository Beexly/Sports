/**
 * Expected information gain — pure shadow diagnostics.
 *
 * Complements:
 *  - odds-api-voi.ts (credit knapsack heuristics)
 *  - offline-hyperparam-search infoGainSelectNext (discrete MES-style)
 *
 * These functions make the *entropy* definition of information gain explicit
 * and unit-testable so VoI ranking is not only a hand-tuned product of
 * urgency × sparsity.
 *
 * SAFETY: priced:false, status:shadow everywhere. No API calls. No gate flips.
 */

export interface ShadowEig {
  readonly priced: false;
  readonly status: "shadow";
}

/** Binary entropy H₂(p) in nats. H(0)=H(1)=0; max at p=0.5. */
export function binaryEntropy(p: number): number {
  if (!Number.isFinite(p)) return Number.NaN;
  const x = Math.min(1, Math.max(0, p));
  if (x <= 0 || x >= 1) return 0;
  return -x * Math.log(x) - (1 - x) * Math.log(1 - x);
}

/** Binary entropy in bits (log2). */
export function binaryEntropyBits(p: number): number {
  const h = binaryEntropy(p);
  if (!Number.isFinite(h)) return h;
  return h / Math.LN2;
}

/**
 * KL(Bernoulli(p) ‖ Bernoulli(q)) in nats.
 * Measures how much p diverges from reference q (e.g. model vs market).
 */
export function klBernoulli(p: number, q: number): number {
  if (!Number.isFinite(p) || !Number.isFinite(q)) return Number.POSITIVE_INFINITY;
  const eps = 1e-12;
  const pp = Math.min(1 - eps, Math.max(eps, p));
  const qq = Math.min(1 - eps, Math.max(eps, q));
  return pp * Math.log(pp / qq) + (1 - pp) * Math.log((1 - pp) / (1 - qq));
}

/**
 * Entropy reduction if belief moves from prior p0 to posterior p1.
 * Positive ⇒ posterior is sharper (more informative). Can be negative if
 * the update *increases* uncertainty (honest; not floored to 0 by default).
 */
export function entropyReduction(p0: number, p1: number): number {
  return binaryEntropy(p0) - binaryEntropy(p1);
}

/**
 * Expected information gain for a binary forecast if we will observe the
 * true outcome y ~ Bern(p). After observing y, entropy is 0, so
 * EIG = H(p). That is the value of *settlement* information, not of an
 * odds pull.
 */
export function eigOfOutcomeObservation(p: number): number {
  return binaryEntropy(p);
}

/**
 * Proxy EIG of acquiring a market price m when current model belief is p.
 *
 * Interpretation (transparent, not optimal experimental design):
 *  - If the market is sharper than the model (H(m) < H(p)), gain ≈ H(p)−H(m)
 *    plus a KL term that rewards markets that *disagree* with us (learning
 *    value of a distinct signal).
 *  - If market is wider / equal, pure sharpness gain is ≤ 0; disagreement
 *    KL still credits informative challenge.
 *
 * gain = max(0, H(p) − H(m)) + λ * KL(m ‖ p)
 *
 * λ defaults to 0.25 so pure disagreement without sharpening still ranks.
 */
export function eigOfMarketPull(
  modelP: number,
  marketP: number,
  disagreementWeight = 0.25,
): number {
  const sharpness = Math.max(0, entropyReduction(modelP, marketP));
  const disagree = klBernoulli(marketP, modelP);
  const lambda = Number.isFinite(disagreementWeight)
    ? Math.max(0, disagreementWeight)
    : 0.25;
  // Pure scalar — shadow contract lives on rankMarketPullsByEig results.
  return sharpness + lambda * disagree;
}

/**
 * Expected residual nonconformity under Bern(p) for score s=|p−y|:
 * E[s] = p(1−p) + (1−p)p = 2p(1−p).
 * Peak 0.5 at p=0.5 — most nonconforming mass when most uncertain.
 * Used to couple Mondrian residual budgets to entropy/EIG stories.
 */
export function expectedAbsoluteResidual(p: number): number {
  if (!Number.isFinite(p)) return 1;
  const x = Math.min(1, Math.max(0, p));
  return 2 * x * (1 - x);
}

export interface MarketPullEigCandidate {
  readonly id: string;
  readonly modelP: number;
  /** If unknown pre-pull, omit — falls back to max-entropy market (0.5). */
  readonly expectedMarketP?: number;
  readonly creditCost: number;
  readonly hoursToStart?: number;
  readonly hasCloseSnapshot?: boolean;
}

/**
 * Rank market pulls by EIG per credit, with mild urgency toward kickoff.
 * Snapshot already held → score 0. Shadow only.
 */
export function rankMarketPullsByEig(
  candidates: readonly MarketPullEigCandidate[],
  remainingCredits: number,
  disagreementWeight = 0.25,
): {
  readonly ranked: readonly (MarketPullEigCandidate & {
    readonly eig: number;
    readonly eigPerCredit: number;
    readonly priced: false;
    readonly status: "shadow";
  })[];
  readonly selected: readonly (MarketPullEigCandidate & {
    readonly eig: number;
    readonly eigPerCredit: number;
    readonly priced: false;
    readonly status: "shadow";
  })[];
  readonly estimatedSpend: number;
  readonly priced: false;
  readonly status: "shadow";
} {
  type Row = MarketPullEigCandidate & {
    readonly eig: number;
    readonly eigPerCredit: number;
    readonly priced: false;
    readonly status: "shadow";
  };

  const ranked: Row[] = candidates
    .map((c) => {
      if (c.hasCloseSnapshot) {
        return {
          ...c,
          eig: 0,
          eigPerCredit: 0,
          priced: false as const,
          status: "shadow" as const,
        };
      }
      const market = c.expectedMarketP ?? 0.5;
      const base = eigOfMarketPull(c.modelP, market, disagreementWeight);
      const hours = c.hoursToStart ?? 48;
      const urgency = 1 / (1 + Math.max(0, hours));
      // Blend: keep EIG primary, urgency as ≤2× multiplier near kickoff
      const eig = base * (0.5 + 0.5 * urgency);
      const cost = Number.isFinite(c.creditCost) && c.creditCost > 0 ? c.creditCost : Infinity;
      const eigPerCredit = cost === Infinity ? 0 : eig / cost;
      return {
        ...c,
        eig,
        eigPerCredit,
        priced: false as const,
        status: "shadow" as const,
      };
    })
    .sort((a, b) => b.eigPerCredit - a.eigPerCredit);

  const selected: Row[] = [];
  let spend = 0;
  const budget = Number.isFinite(remainingCredits) ? Math.max(0, remainingCredits) : 0;
  for (const r of ranked) {
    if (r.eigPerCredit <= 0) continue;
    if (!Number.isFinite(r.creditCost) || r.creditCost <= 0) continue;
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
