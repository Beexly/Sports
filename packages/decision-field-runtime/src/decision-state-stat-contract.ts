/**
 * DECISION FIELD RUNTIME — Decision-State Stat Contracts.
 *
 * The organism's hunger system, expressed as a contract: for each decision state, WHICH facts must
 * be knowable for the card to claim anything, and how strong it may be when a required fact is
 * missing. This is what binds the NFL fact ontology to the compiler — a decision can never claim
 * more than its evidence licenses. Pure + deterministic; no I/O, no clock.
 *
 * `FactType`/`LegalVerdict` are reused from `@sports/data-intelligence` — not re-authored.
 */

import type { FactType, LegalVerdict } from "@sports/data-intelligence";
import type { DecisionState } from "./decision-state.js";

// The decision-state grammar is canonical in ./decision-state.ts — the single source of truth.
// Re-exported here so existing importers of this module keep resolving the same type.
export type { DecisionState };

/** The permission ladder — how strong a public expression a card is allowed to make. */
export type MaxPermittedStrength =
  | "INFO_ONLY"
  | "WATCH"
  | "WAIT"
  | "PERSONALIZED"
  | "ACTION"
  | "PUBLIC_ACTION";

export const STRENGTH_ORDER: Readonly<Record<MaxPermittedStrength, number>> = {
  INFO_ONLY: 0,
  WATCH: 1,
  WAIT: 2,
  PERSONALIZED: 3,
  ACTION: 4,
  PUBLIC_ACTION: 5,
};

const STRENGTH_BY_RANK: readonly MaxPermittedStrength[] = [
  "INFO_ONLY",
  "WATCH",
  "WAIT",
  "PERSONALIZED",
  "ACTION",
  "PUBLIC_ACTION",
];

export function rankOf(s: MaxPermittedStrength): number {
  return STRENGTH_ORDER[s];
}

/** Lattice meet (the weaker of two strengths) — the operation that bounds a card by its weakest gate. */
export function strengthMin(a: MaxPermittedStrength, b: MaxPermittedStrength): MaxPermittedStrength {
  return rankOf(a) <= rankOf(b) ? a : b;
}

export function strengthMax(a: MaxPermittedStrength, b: MaxPermittedStrength): MaxPermittedStrength {
  return rankOf(a) >= rankOf(b) ? a : b;
}

/** Convert a numeric gradient in [0,1] to a strength bucket (fail-closed: 0 → INFO_ONLY). */
export function bucketStrength(gradient: number): MaxPermittedStrength {
  if (!Number.isFinite(gradient) || gradient <= 0) return "INFO_ONLY";
  if (gradient <= 0.12) return "WATCH";
  if (gradient <= 0.25) return "WAIT";
  if (gradient <= 0.45) return "PERSONALIZED";
  if (gradient <= 0.7) return "ACTION";
  return "PUBLIC_ACTION";
}

/** A required-fact group: at least one of `anyOf` must be knowable, else the card is capped. */
export interface RequiredFactGroup {
  readonly label: string;
  readonly anyOf: readonly FactType[];
  /** The strongest a card may be if this group is unsatisfied. */
  readonly capIfMissing: MaxPermittedStrength;
}

export interface DecisionStateStatContract {
  readonly decisionState: DecisionState;
  readonly requiredGroups: readonly RequiredFactGroup[];
  readonly optionalStrengtheners: readonly FactType[];
  /** A fact resolved through a weaker rights status than this can never satisfy a required group. */
  readonly minimumRightsStatus: readonly LegalVerdict[];
  readonly publicLanguageLimits: readonly string[];
}

/**
 * The seeded contracts. ROLE_UP_FANTASY_LATE is the Field-001 contract: a role-delta fact is required
 * to say anything at all (else INFO_ONLY), and a fantasy-belief snapshot is required to claim the
 * fantasy market is *late* (else the card is capped at WATCH — we can see the lag but can't prove it).
 */
export const STAT_CONTRACTS: Readonly<Record<DecisionState, DecisionStateStatContract>> = {
  ROLE_UP_FANTASY_LATE: {
    decisionState: "ROLE_UP_FANTASY_LATE",
    requiredGroups: [
      {
        label: "role_delta",
        anyOf: ["route_rate", "snap_share", "target_share", "carry_share"],
        capIfMissing: "INFO_ONLY",
      },
      {
        label: "fantasy_belief_snapshot",
        anyOf: ["platform_projection", "roster_pct", "adp", "start_pct"],
        capIfMissing: "WATCH",
      },
    ],
    optionalStrengtheners: ["player_prop", "add_drop_velocity", "injury_report", "air_yards", "red_zone_touch"],
    minimumRightsStatus: ["FREE_OPEN", "FREE_CAUTION", "LICENSED"],
    publicLanguageLimits: ["no certainty language", "name the role source (snaps/routes/targets)"],
  },
  GOOD_IDEA_BAD_PRICE: {
    decisionState: "GOOD_IDEA_BAD_PRICE",
    requiredGroups: [
      { label: "edge_basis", anyOf: ["snap_share", "route_rate", "target_share", "injury_report"], capIfMissing: "INFO_ONLY" },
      { label: "live_price", anyOf: ["player_prop", "spread", "total", "moneyline"], capIfMissing: "WATCH" },
    ],
    optionalStrengtheners: ["odds_history", "closing_line", "betting_splits"],
    minimumRightsStatus: ["FREE_OPEN", "FREE_CAUTION", "LICENSED"],
    publicLanguageLimits: ["no certainty language", "name the price that kills it"],
  },
  PUBLIC_OVERREACTION: {
    decisionState: "PUBLIC_OVERREACTION",
    requiredGroups: [
      { label: "crowd_move", anyOf: ["betting_splits", "roster_pct", "add_drop_velocity", "social_trend"], capIfMissing: "INFO_ONLY" },
      { label: "reality_check", anyOf: ["snap_share", "route_rate", "target_share", "injury_report"], capIfMissing: "WATCH" },
    ],
    optionalStrengtheners: ["player_prop", "odds_history"],
    minimumRightsStatus: ["FREE_OPEN", "FREE_CAUTION", "LICENSED"],
    publicLanguageLimits: ["no certainty language"],
  },
  DATA_CONFLICT: {
    decisionState: "DATA_CONFLICT",
    requiredGroups: [{ label: "any_signal", anyOf: ["injury_report", "practice_status", "snap_share", "player_prop"], capIfMissing: "INFO_ONLY" }],
    optionalStrengtheners: [],
    minimumRightsStatus: ["FREE_OPEN", "FREE_CAUTION", "LICENSED"],
    publicLanguageLimits: ["surface the disagreement; do not resolve it as fact"],
  },
  DFS_SALARY_LAG: {
    decisionState: "DFS_SALARY_LAG",
    requiredGroups: [
      { label: "role_delta", anyOf: ["route_rate", "snap_share", "target_share", "carry_share"], capIfMissing: "INFO_ONLY" },
      { label: "dfs_pricing", anyOf: ["dfs_salary", "dfs_slate"], capIfMissing: "INFO_ONLY" },
    ],
    optionalStrengtheners: ["ownership_projection", "platform_projection", "injury_report"],
    // DFS salary/slate is a licensed/paid feed — the contract may credit a PAID_REQUIRED fact.
    minimumRightsStatus: ["FREE_OPEN", "FREE_CAUTION", "LICENSED", "PAID_REQUIRED"],
    publicLanguageLimits: ["no certainty language", "requires a licensed salary feed"],
  },
  OWNERSHIP_OVERREACTION: {
    decisionState: "OWNERSHIP_OVERREACTION",
    requiredGroups: [
      { label: "ownership_signal", anyOf: ["ownership_projection", "actual_ownership"], capIfMissing: "INFO_ONLY" },
      { label: "reality_check", anyOf: ["snap_share", "route_rate", "target_share", "injury_report"], capIfMissing: "WATCH" },
    ],
    optionalStrengtheners: ["dfs_salary", "player_prop"],
    minimumRightsStatus: ["FREE_OPEN", "FREE_CAUTION", "LICENSED", "PAID_REQUIRED"],
    publicLanguageLimits: ["no certainty language"],
  },
  // States whose Phase-0 contract is intentionally minimal (hardened in Phase 1).
  ACTIONABLE: minimalContract("ACTIONABLE"),
  ROLE_MASS_MISALLOCATED: minimalContract("ROLE_MASS_MISALLOCATED"),
  NEEDS_CONFIRMATION: minimalContract("NEEDS_CONFIRMATION", "WATCH"),
  TOO_LATE: minimalContract("TOO_LATE", "INFO_ONLY"),
  PASS: minimalContract("PASS", "INFO_ONLY"),
  TRAP: minimalContract("TRAP", "INFO_ONLY"),
  WATCHLIST: minimalContract("WATCHLIST", "WATCH"),
  NEEDS_LIVE_DATA: minimalContract("NEEDS_LIVE_DATA", "INFO_ONLY"),
};

function minimalContract(state: DecisionState, capIfMissing: MaxPermittedStrength = "INFO_ONLY"): DecisionStateStatContract {
  return {
    decisionState: state,
    requiredGroups: [{ label: "any_credible_fact", anyOf: ["injury_report", "snap_share", "player_prop", "platform_projection"], capIfMissing }],
    optionalStrengtheners: [],
    minimumRightsStatus: ["FREE_OPEN", "FREE_CAUTION", "LICENSED"],
    publicLanguageLimits: ["no certainty language"],
  };
}

export interface RequiredStatAudit {
  readonly decisionState: DecisionState;
  readonly satisfied: boolean;
  readonly missingGroups: readonly string[];
  readonly presentStrengtheners: readonly FactType[];
  /** The strongest the card may be, given which required groups are (un)satisfied. */
  readonly maxStrength: MaxPermittedStrength;
  readonly note: string;
}

/**
 * Audit a decision state against the set of *creditable* (point-in-time, rights-cleared) fact types.
 * Every unsatisfied required group lowers the ceiling to its `capIfMissing`; the audit returns the
 * minimum (weakest) ceiling. All groups satisfied → PUBLIC_ACTION ceiling (other gates still apply).
 */
export function auditRequiredStats(
  decisionState: DecisionState,
  creditableFactTypes: ReadonlySet<FactType>,
): RequiredStatAudit {
  const contract = STAT_CONTRACTS[decisionState];
  const missingGroups: string[] = [];
  let ceiling: MaxPermittedStrength = "PUBLIC_ACTION";
  for (const group of contract.requiredGroups) {
    const satisfied = group.anyOf.some((f) => creditableFactTypes.has(f));
    if (!satisfied) {
      missingGroups.push(group.label);
      ceiling = strengthMin(ceiling, group.capIfMissing);
    }
  }
  const presentStrengtheners = contract.optionalStrengtheners.filter((f) => creditableFactTypes.has(f));
  return {
    decisionState,
    satisfied: missingGroups.length === 0,
    missingGroups,
    presentStrengtheners,
    maxStrength: ceiling,
    note:
      missingGroups.length === 0
        ? `All required fact groups present; ${presentStrengtheners.length} strengthener(s) available.`
        : `Missing required group(s): ${missingGroups.join(", ")} — capped at ${ceiling}.`,
  };
}

export { STRENGTH_BY_RANK };
