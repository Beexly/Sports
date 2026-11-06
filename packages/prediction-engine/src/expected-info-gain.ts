/**
 * Expected information gain — pure shadow diagnostics.
 *
 * Residual-risk closures (2026-07-31):
 *  R1 — never silently treat unknown market as a forecast; max-entropy is labeled
 *  R2 — production calibration certificate is a separate gate (see binary-adapter)
 *  R3 — compareVoIRankings surfaces heuristic vs entropy-EIG disagreement
 *
 * SAFETY: priced:false, status:shadow. No API calls. No gate flips.
 */

export interface ShadowEig {
  readonly priced: false;
  readonly status: "shadow";
}

/**
 * R1: Market belief is either an explicit point estimate or an admitted unknown.
 * Unknown is NOT a forecast of 50% — it is max-entropy for math only.
 */
export type MarketBelief =
  | { readonly kind: "point"; readonly p: number }
  | { readonly kind: "unknown" };

export function marketBeliefFromOptional(
  p: number | undefined | null,
): MarketBelief {
  if (typeof p === "number" && Number.isFinite(p)) {
    return { kind: "point", p: Math.min(1, Math.max(0, p)) };
  }
  return { kind: "unknown" };
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

/** KL(Bernoulli(p) ‖ Bernoulli(q)) in nats. */
export function klBernoulli(p: number, q: number): number {
  if (!Number.isFinite(p) || !Number.isFinite(q)) return Number.POSITIVE_INFINITY;
  const eps = 1e-12;
  const pp = Math.min(1 - eps, Math.max(eps, p));
  const qq = Math.min(1 - eps, Math.max(eps, q));
  return pp * Math.log(pp / qq) + (1 - pp) * Math.log((1 - pp) / (1 - qq));
}

export function entropyReduction(p0: number, p1: number): number {
  return binaryEntropy(p0) - binaryEntropy(p1);
}

/** EIG of observing the true binary outcome y ~ Bern(p) = H(p). */
export function eigOfOutcomeObservation(p: number): number {
  return binaryEntropy(p);
}

/**
 * Market-pull EIG with explicit belief handling (R1).
 *
 * - point market: sharpness + λ KL(m‖p)
 * - unknown market: only if allowMaxEntropyPrior=true; uses m=0.5 labeled, and
 *   applies unknownPriorPenalty (default 0.5) so unknown never outranks a real quote
 */
export function eigOfMarketPull(
  modelP: number,
  market: MarketBelief,
  options?: {
    readonly disagreementWeight?: number;
    /** Required to use m=0.5 when market.kind==="unknown". Default false. */
    readonly allowMaxEntropyPrior?: boolean;
    /** Multiplier on EIG when market is unknown (0–1). Default 0.5. */
    readonly unknownPriorPenalty?: number;
  },
): {
  readonly eig: number;
  readonly marketPriorKind: "point" | "max_entropy_default" | "rejected_unknown";
  readonly usedMarketP: number | null;
  readonly priced: false;
  readonly status: "shadow";
} {
  const lambda = Math.max(0, options?.disagreementWeight ?? 0.25);
  const allowUnknown = options?.allowMaxEntropyPrior === true;
  const penalty = Math.min(1, Math.max(0, options?.unknownPriorPenalty ?? 0.5));

  if (market.kind === "unknown") {
    if (!allowUnknown) {
      return {
        eig: 0,
        marketPriorKind: "rejected_unknown",
        usedMarketP: null,
        priced: false,
        status: "shadow",
      };
    }
    const m = 0.5;
    const sharpness = Math.max(0, entropyReduction(modelP, m));
    const disagree = klBernoulli(m, modelP);
    return {
      eig: (sharpness + lambda * disagree) * penalty,
      marketPriorKind: "max_entropy_default",
      usedMarketP: m,
      priced: false,
      status: "shadow",
    };
  }

  const m = market.p;
  const sharpness = Math.max(0, entropyReduction(modelP, m));
  const disagree = klBernoulli(m, modelP);
  return {
    eig: sharpness + lambda * disagree,
    marketPriorKind: "point",
    usedMarketP: m,
    priced: false,
    status: "shadow",
  };
}

/** E[|p−y|] under Bern(p) = 2p(1−p). */
export function expectedAbsoluteResidual(p: number): number {
  if (!Number.isFinite(p)) return 1;
  const x = Math.min(1, Math.max(0, p));
  return 2 * x * (1 - x);
}

export interface MarketPullEigCandidate {
  readonly id: string;
  readonly modelP: number;
  /** Prefer MarketBelief; number still accepted and treated as point. */
  readonly market?: MarketBelief;
  /** @deprecated use market: {kind:"point", p} — number alone is a point belief */
  readonly expectedMarketP?: number;
  readonly creditCost: number;
  readonly hoursToStart?: number;
  readonly hasCloseSnapshot?: boolean;
}

function resolveMarket(c: MarketPullEigCandidate): MarketBelief {
  if (c.market) return c.market;
  return marketBeliefFromOptional(c.expectedMarketP);
}

/**
 * Rank market pulls by EIG per credit (R1: unknown markets opt-in only).
 */
export function rankMarketPullsByEig(
  candidates: readonly MarketPullEigCandidate[],
  remainingCredits: number,
  options?: {
    readonly disagreementWeight?: number;
    readonly allowMaxEntropyPrior?: boolean;
    readonly unknownPriorPenalty?: number;
  },
): {
  readonly ranked: readonly (MarketPullEigCandidate & {
    readonly eig: number;
    readonly eigPerCredit: number;
    readonly marketPriorKind: "point" | "max_entropy_default" | "rejected_unknown";
    readonly usedMarketP: number | null;
    readonly priced: false;
    readonly status: "shadow";
  })[];
  readonly selected: readonly (MarketPullEigCandidate & {
    readonly eig: number;
    readonly eigPerCredit: number;
    readonly marketPriorKind: "point" | "max_entropy_default" | "rejected_unknown";
    readonly usedMarketP: number | null;
    readonly priced: false;
    readonly status: "shadow";
  })[];
  readonly estimatedSpend: number;
  readonly unknownMarketCount: number;
  readonly rejectedUnknownCount: number;
  readonly priced: false;
  readonly status: "shadow";
} {
  type Row = MarketPullEigCandidate & {
    readonly eig: number;
    readonly eigPerCredit: number;
    readonly marketPriorKind: "point" | "max_entropy_default" | "rejected_unknown";
    readonly usedMarketP: number | null;
    readonly priced: false;
    readonly status: "shadow";
  };

  let unknownMarketCount = 0;
  let rejectedUnknownCount = 0;

  const ranked: Row[] = candidates
    .map((c) => {
      if (c.hasCloseSnapshot) {
        return {
          ...c,
          eig: 0,
          eigPerCredit: 0,
          marketPriorKind: "point" as const,
          usedMarketP: null,
          priced: false as const,
          status: "shadow" as const,
        };
      }
      const belief = resolveMarket(c);
      if (belief.kind === "unknown") unknownMarketCount += 1;
      const pull = eigOfMarketPull(c.modelP, belief, options);
      if (pull.marketPriorKind === "rejected_unknown") rejectedUnknownCount += 1;
      const hours = c.hoursToStart ?? 48;
      const urgency = 1 / (1 + Math.max(0, hours));
      const eig = pull.eig * (0.5 + 0.5 * urgency);
      const cost =
        Number.isFinite(c.creditCost) && c.creditCost > 0 ? c.creditCost : Infinity;
      const eigPerCredit = cost === Infinity ? 0 : eig / cost;
      return {
        ...c,
        eig,
        eigPerCredit,
        marketPriorKind: pull.marketPriorKind,
        usedMarketP: pull.usedMarketP,
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
    unknownMarketCount,
    rejectedUnknownCount,
    priced: false,
    status: "shadow",
  };
}

// ── R3: dual-ranker disagreement ─────────────────────────────────

export interface RankedIdScore {
  readonly id: string;
  readonly score: number;
}

export interface VoIRankingComparison extends ShadowEig {
  readonly heuristicTop: readonly string[];
  readonly eigTop: readonly string[];
  readonly agreement: readonly string[];
  /** In both top-k but different order */
  readonly orderDiscord: readonly { readonly id: string; readonly heuristicRank: number; readonly eigRank: number }[];
  readonly onlyHeuristic: readonly string[];
  readonly onlyEig: readonly string[];
  /** Jaccard of top-k sets */
  readonly jaccardTopK: number;
  /** True when lists can be spent without manual inspect (strict agreement) */
  readonly safeToSpendWithoutInspect: boolean;
  readonly inspectRequired: boolean;
  readonly rationale: string;
}

/**
 * Compare heuristic VoI ranking vs entropy-EIG ranking (R3).
 * inspectRequired when top-k sets differ or order of shared ids differs materially.
 */
export function compareVoIRankings(
  heuristic: readonly RankedIdScore[],
  eig: readonly RankedIdScore[],
  topK = 5,
): VoIRankingComparison {
  const k = Math.max(1, Math.floor(topK));
  const hTop = heuristic.slice(0, k).map((r) => r.id);
  const eTop = eig.slice(0, k).map((r) => r.id);
  const hSet = new Set(hTop);
  const eSet = new Set(eTop);

  const agreement = hTop.filter((id) => eSet.has(id));
  const onlyHeuristic = hTop.filter((id) => !eSet.has(id));
  const onlyEig = eTop.filter((id) => !hSet.has(id));

  const hRank = new Map(hTop.map((id, i) => [id, i]));
  const eRank = new Map(eTop.map((id, i) => [id, i]));
  const orderDiscord = agreement
    .map((id) => ({
      id,
      heuristicRank: hRank.get(id)!,
      eigRank: eRank.get(id)!,
    }))
    .filter((d) => d.heuristicRank !== d.eigRank);

  const union = new Set([...hTop, ...eTop]);
  const jaccardTopK = union.size === 0 ? 1 : agreement.length / union.size;

  const safe =
    onlyHeuristic.length === 0 &&
    onlyEig.length === 0 &&
    orderDiscord.length === 0;

  const rationale = safe
    ? `top-${k} identical order — dual rankers agree`
    : onlyHeuristic.length || onlyEig.length
      ? `top-${k} set mismatch: onlyHeuristic=[${onlyHeuristic.join(",")}] onlyEig=[${onlyEig.join(",")}] — inspect before spend`
      : `top-${k} same set, order differs on ${orderDiscord.map((d) => d.id).join(",")} — inspect before spend`;

  return {
    heuristicTop: hTop,
    eigTop: eTop,
    agreement,
    orderDiscord,
    onlyHeuristic,
    onlyEig,
    jaccardTopK,
    safeToSpendWithoutInspect: safe,
    inspectRequired: !safe,
    rationale,
    priced: false,
    status: "shadow",
  };
}
