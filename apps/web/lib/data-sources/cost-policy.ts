/**
 * Cost-first source policy.
 *
 * Owner directive: use free sources first to save money. This encodes that as a
 * deterministic ordering so source selection never reaches for a paid feed when a
 * free one already covers the need at acceptable confidence.
 *
 * Marginal cost to us, cheapest first:
 *   free_unlimited  — $0, no quota (open datasets, self-hosted)        rank 0
 *   free_quota      — $0 but rate/credit-limited                       rank 1
 *   licensed_flat   — already paid, flat rate, no per-call charge      rank 2
 *   trial           — free but time-limited                            rank 3
 *   paid_metered    — costs money per use                              rank 4
 *
 * Selection rule: for a data need, walk sources cheapest-first and stop at the first
 * that covers it. Escalate to a costlier tier ONLY when the cheaper source is missing
 * the need, stale, or below confidence. Every source here is still rights-gated — cost
 * order never overrides the clearance gate.
 */

export type CostTier =
  | "free_unlimited"
  | "free_quota"
  | "licensed_flat"
  | "trial"
  | "paid_metered";

export const COST_TIER_RANK: Record<CostTier, number> = {
  free_unlimited: 0,
  free_quota: 1,
  licensed_flat: 2,
  trial: 3,
  paid_metered: 4,
};

/** Data needs we shop for across sources. */
export type DataNeed =
  | "cfb_scores"
  | "cfb_standings"
  | "cfb_rankings"
  | "cfb_schedules"
  | "cfb_stats"
  | "cfb_odds";

export type SourceCostProfile = {
  /** Matches a sports-data-candidate id or a rights-registry source_id. */
  readonly id: string;
  readonly name: string;
  readonly tier: CostTier;
  readonly covers: readonly DataNeed[];
  /** Still gated until the source-provider + clearance gate clears it. */
  readonly gated: boolean;
  readonly note: string;
};

export const SOURCE_COST_PROFILES: readonly SourceCostProfile[] = [
  {
    id: "henrygd-ncaa",
    name: "henrygd NCAA API",
    tier: "free_unlimited", // self-hosted → no key, no quota
    covers: ["cfb_scores", "cfb_standings", "cfb_rankings", "cfb_schedules"],
    gated: true,
    note: "Approved free-first. Self-host to remove the public-demo rate cap; facts only.",
  },
  {
    id: "cfbd",
    name: "CollegeFootballData (CFBD)",
    tier: "free_quota", // free key, 1,000 calls/mo
    covers: ["cfb_scores", "cfb_schedules", "cfb_stats", "cfb_standings"],
    gated: true,
    note: "Free key (1,000/mo). Highest-value free CFB stats; spend the quota on stats the free fallback lacks.",
  },
  {
    id: "espn-public-api",
    name: "ESPN Public API (unofficial)",
    tier: "free_quota", // no key, rate-limited; facts only
    covers: ["cfb_scores", "cfb_standings", "cfb_rankings", "cfb_schedules"],
    gated: false, // already approved_public_logged_off in the rights registry (facts only)
    note: "Already cleared for facts (approved_public_logged_off). Free, no key. Strong free CFB scores/rankings fallback; no commercial display/storage without a license.",
  },
  {
    id: "highlightly",
    name: "Highlightly NFL/NCAA",
    tier: "free_quota", // free key, 100/day
    covers: ["cfb_scores", "cfb_standings"],
    gated: true,
    note: "Free key, 100/day. Broad live-score check source.",
  },
  {
    id: "api-sports",
    name: "API-SPORTS NFL & NCAA",
    tier: "free_quota", // free key, 100/day
    covers: ["cfb_scores", "cfb_stats", "cfb_standings"],
    gated: true,
    note: "Free key, 100/day. Validate CFB depth before relying.",
  },
  {
    id: "bigballs",
    name: "Big Balls Sports Data",
    tier: "free_quota", // free 1,000–2,000/day
    covers: ["cfb_scores", "cfb_stats", "cfb_standings", "cfb_schedules", "cfb_odds"],
    gated: true,
    note: "Free 1,000–2,000/day. Promising free breadth; verify before production.",
  },
  {
    id: "sports-game-data",
    name: "Sports Game Data",
    tier: "free_quota", // free 2,500 objects/mo
    covers: ["cfb_scores", "cfb_stats", "cfb_odds"],
    gated: true,
    note: "Free 2,500 objects/mo, 10-min updates. Validate freshness for live use.",
  },
  {
    id: "balldontlie-ncaaf",
    name: "BALLDONTLIE NCAAF",
    tier: "free_quota", // free key, ~5/min, limited endpoints
    covers: ["cfb_standings"],
    gated: true,
    note: "Free roster/identity + standings supplement (~5/min). Not a main engine.",
  },
  {
    id: "therundown",
    name: "TheRundown",
    tier: "free_quota", // free 20,000 points/day
    covers: ["cfb_odds"],
    gated: true,
    note: "Free 20,000 points/day, 5-min delay. Free odds baseline.",
  },
  {
    id: "the-odds-api-ncaaf",
    name: "The Odds API (NCAAF)",
    tier: "licensed_flat", // already licensed; free tier 500 credits/mo
    covers: ["cfb_odds"],
    gated: false,
    note: "Already licensed + wired (americanfootball_ncaaf active). Mind the 500/mo free-credit cap — gate to in-season.",
  },
  {
    id: "sportsdataio-cfb",
    name: "SportsDataIO College Football",
    tier: "trial",
    covers: ["cfb_scores", "cfb_stats", "cfb_odds", "cfb_schedules", "cfb_standings"],
    gated: true,
    note: "Trial → paid. Evaluation/licensing only; do not assume free production use.",
  },
  {
    id: "sportradar-ncaaf-v7",
    name: "Sportradar NCAA Football v7",
    tier: "paid_metered",
    covers: ["cfb_scores", "cfb_stats", "cfb_odds", "cfb_schedules", "cfb_standings"],
    gated: true,
    note: "Enterprise, likely future-paid. Reference architecture only for now.",
  },
];

/** Sources covering a need, cheapest marginal cost first (ties keep declared order). */
export function selectSourcesForNeed(need: DataNeed): readonly SourceCostProfile[] {
  return SOURCE_COST_PROFILES
    .filter((s) => s.covers.includes(need))
    .slice()
    .sort((a, b) => COST_TIER_RANK[a.tier] - COST_TIER_RANK[b.tier]);
}

/** The cheapest source that covers a need (still subject to the clearance gate). */
export function cheapestSourceForNeed(need: DataNeed): SourceCostProfile | undefined {
  return selectSourcesForNeed(need)[0];
}

/**
 * The cheapest source that is ALREADY cleared (gate passed) — what you can pull
 * from right now without an owner/legal decision. Free-first still applies among
 * cleared sources.
 */
export function cheapestClearedSourceForNeed(need: DataNeed): SourceCostProfile | undefined {
  return selectSourcesForNeed(need).find((s) => !s.gated);
}

/** True if a free (zero marginal $) source already covers the need. */
export function hasFreeCoverage(need: DataNeed): boolean {
  return SOURCE_COST_PROFILES.some(
    (s) => s.covers.includes(need) && (s.tier === "free_unlimited" || s.tier === "free_quota"),
  );
}
