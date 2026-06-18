/**
 * Creator network config — Workstream M4 (/cockpit/creator-network).
 *
 * Source: docs/revenue/revenue-operating-system.md, "Revenue lanes & priority order",
 * lane 13 / creator-network section and Workstream M4.
 *
 * HONESTY RULES (non-negotiable):
 * - The creator roster is EMPTY at launch — no fabricated creators.
 * - Earnings, referral stats, content counts: all null (unknown) until a
 *   creator is recruited and connected.
 * - Compliance guardrails are defined structurally, not aspirationally.
 */

// ── Creator lane definitions ──────────────────────────────────────────────────

export type CreatorLaneId =
  | "nfl"
  | "cfb"
  | "nba"
  | "mlb"
  | "fantasy"
  | "dfs"
  | "betting-education"
  | "houston-local";

export interface CreatorLane {
  readonly id: CreatorLaneId;
  readonly name: string;
  readonly description: string;
  /** Ideal creator profile for this lane */
  readonly targetProfile: string;
}

export const CREATOR_LANES: readonly CreatorLane[] = [
  {
    id: "nfl",
    name: "NFL",
    description:
      "NFL signal analysts, film-room creators, injury/line movement commentators.",
    targetProfile:
      "1K–50K followers, data-forward, avoids tout language, posts consistent analysis.",
  },
  {
    id: "cfb",
    name: "College Football (CFB)",
    description:
      "CFB analytics, recruiting intelligence, line-movement context.",
    targetProfile:
      "Regional CFB focus acceptable. Data > narrative. Honest about limits.",
  },
  {
    id: "nba",
    name: "NBA",
    description:
      "NBA prop analysis, pace/matchup breakdowns, player signal vs noise.",
    targetProfile:
      "Prop-focused creators with honest track records over hype-driven."
  },
  {
    id: "mlb",
    name: "MLB",
    description:
      "MLB advanced metrics, pitcher matchup intelligence, line-value identification.",
    targetProfile:
      "Statcast-aware creators. Slow-burn audience fine — MLB is a marathon sport.",
  },
  {
    id: "fantasy",
    name: "Fantasy Sports",
    description:
      "Fantasy football and basketball strategy, waiver wire intel, DFS crossover.",
    targetProfile:
      "Analytically grounded fantasy creators. No reckless 'this is a must-start' certainty language.",
  },
  {
    id: "dfs",
    name: "DFS (Daily Fantasy Sports)",
    description:
      "DFS lineup strategy, slate-building theory, value-finding frameworks.",
    targetProfile:
      "Process-first DFS creators. Disclosure-aware. Must comply with responsible gaming guardrails.",
  },
  {
    id: "betting-education",
    name: "Betting Education",
    description:
      "How odds work, line movement, expected value, responsible bankroll management. No picks.",
    targetProfile:
      "Education-first creators who never guarantee outcomes. Ideal partner for trust-first positioning.",
  },
  {
    id: "houston-local",
    name: "Houston Local",
    description:
      "Texans, Rockets, Astros, Houston-area sports community creators.",
    targetProfile:
      "Local community reach. Galaxy's home market. High-leverage for early word-of-mouth.",
  },
];

// ── Creator roster ────────────────────────────────────────────────────────────

export interface Creator {
  readonly id: string;
  readonly name: string;
  readonly lane: CreatorLaneId;
  readonly handle: string | null;
  readonly platform: string | null;
  readonly referralCode: string | null;
  readonly status: "prospect" | "contacted" | "active" | "paused" | "declined";
  readonly revenueSharePct: number | null;
  readonly contentCountLast30Days: number | null;
  readonly referralSignups: number | null;
  readonly earnings: number | null;
  readonly notes: string | null;
}

/**
 * The creator roster.
 *
 * HONEST EMPTY at launch — no creators have been recruited yet.
 * Add entries here as real outreach converts. Never fabricate a creator.
 */
export const CREATORS: readonly Creator[] = [];
// Empty at launch — add via real outreach.

// ── Contributor offer ─────────────────────────────────────────────────────────

/**
 * The structured offer presented to potential creator partners.
 * Source: revenue-operating-system.md — "creator network" section.
 */
export interface ContributorOffer {
  readonly revenueSharePct: number;
  readonly referralCodeFormat: string;
  readonly assets: readonly string[];
  readonly complianceGuardrails: readonly string[];
}

export const CONTRIBUTOR_OFFER: ContributorOffer = {
  revenueSharePct: 20,
  referralCodeFormat: "CREATOR-{HANDLE}",
  assets: [
    "Branded brief templates (Galaxy voice, anti-tout tone)",
    "Referral code + tracking link",
    "Content brief framework (one brief → derivative formats)",
    "Brand guidelines + compliance checklist",
    "Ask Galaxy intake link for their audience",
  ],
  complianceGuardrails: [
    "Zero promised outcomes — ever. Not even 'very likely' without a disclosed confidence basis.",
    "No reckless or hype language. Banned: certainty claims, can't-miss framing, easy-money framing, tout language of any kind.",
    "No sportsbook / casino promotion unless reviewed and approved by GAUGE + owner.",
    "No impersonation of Galaxy as a sportsbook or wagering service.",
    "FTC-style disclosure on any paid placement or affiliate link (example: 'Galaxy partner — I earn a referral fee').",
    "No automated betting advice. Picks are decision-support signals, not instructions to bet.",
    "Responsible gaming language required on any content that touches wagering.",
    "Content must pass the trust-gate banned-phrase check before publishing.",
  ],
};

// ── Summary helpers ───────────────────────────────────────────────────────────

export type RosterSummary = {
  readonly totalCreators: number;
  readonly byLane: Record<CreatorLaneId, number>;
  readonly byStatus: Record<Creator["status"], number>;
  readonly note: string;
};

export function getRosterSummary(): RosterSummary {
  const byLane: Record<CreatorLaneId, number> = {
    nfl: 0,
    cfb: 0,
    nba: 0,
    mlb: 0,
    fantasy: 0,
    dfs: 0,
    "betting-education": 0,
    "houston-local": 0,
  };

  const byStatus: Record<Creator["status"], number> = {
    prospect: 0,
    contacted: 0,
    active: 0,
    paused: 0,
    declined: 0,
  };

  for (const c of CREATORS) {
    byLane[c.lane] = (byLane[c.lane] ?? 0) + 1;
    byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
  }

  return {
    totalCreators: CREATORS.length,
    byLane,
    byStatus,
    note:
      CREATORS.length === 0
        ? "No creators recruited yet. The lanes and offer structure are ready — add entries as real outreach converts."
        : `${CREATORS.length} creator(s) in the network.`,
  };
}
