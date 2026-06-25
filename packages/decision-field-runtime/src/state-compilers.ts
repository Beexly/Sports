/**
 * DECISION FIELD RUNTIME — state-specific compilers.
 *
 * One organism, but each decision state tells its OWN story. The conductor no longer hardcodes a
 * role-rising narrative for every candidate: it looks up the compiler for the candidate's state, which
 * builds that state's claims, its public narrative, and reports the fact actually observed (not always
 * route_rate). The registry is keyed EXHAUSTIVELY by the canonical DecisionState — a compile error if a
 * state is ever added without a compiler. Pure + deterministic; public copy only (no internal names).
 */

import type { FactType } from "@sports/data-intelligence";
import type { DecisionState } from "./decision-state.js";
import { type CardClaim, claim } from "./card-claim.js";

/** Engine role signal (from roleVsProduction) — only the values the compilers branch on. */
export type RoleSignal = string;

export interface CompileContext {
  readonly subjectLabel: string;
  readonly creditableTypes: ReadonlySet<FactType>;
  readonly roleSignal: RoleSignal;
  readonly hasContradiction: boolean;
  readonly marketAlreadyCaughtUp: boolean;
}

export interface CompiledNarrative {
  readonly title: string;
  readonly whatChanged: string;
  readonly whatItMeans: string;
  /** The fact actually observed for this change (drives detectedChanges); null if none. */
  readonly observedFact: FactType | null;
  readonly changeKind: string;
}

export interface DecisionStateCompiler {
  readonly state: DecisionState;
  detectClaims(ctx: CompileContext): CardClaim[];
  buildNarrative(ctx: CompileContext): CompiledNarrative;
}

// ── Fact groups (shared vocabulary). ──────────────────────────────────────────────────────────────
const ROLE: readonly FactType[] = ["route_rate", "snap_share", "target_share", "carry_share"];
const USAGE_MASS: readonly FactType[] = ["snap_share", "carry_share", "target_share"];
const MARKET: readonly FactType[] = ["player_prop", "spread", "total", "moneyline"];
const FANTASY: readonly FactType[] = ["platform_projection", "roster_pct", "adp", "start_pct"];
const CROWD: readonly FactType[] = ["betting_splits", "roster_pct", "add_drop_velocity", "social_trend"];
const PRICE_HISTORY: readonly FactType[] = ["odds_history", "closing_line"];
const INJURY: readonly FactType[] = ["injury_report", "practice_status", "inactive_status"];
const DFS_PRICE: readonly FactType[] = ["dfs_salary", "dfs_slate"];
const OWNERSHIP: readonly FactType[] = ["ownership_projection", "actual_ownership"];

function firstPresent(set: ReadonlySet<FactType>, group: readonly FactType[]): FactType | null {
  return group.find((f) => set.has(f)) ?? null;
}
function hasAny(set: ReadonlySet<FactType>, group: readonly FactType[]): boolean {
  return group.some((f) => set.has(f));
}

/** A claim's proof status from whether its evidence is present (and whether sources contradict). */
function statusOf(present: boolean, contradicted: boolean): CardClaim["proofStatus"] {
  if (!present) return "BLOCKED";
  return contradicted ? "CONFLICTED" : "SUPPORTED";
}

// ── Per-state compilers. ─────────────────────────────────────────────────────────────────────────

function roleUpFantasyLate(): DecisionStateCompiler {
  return {
    state: "ROLE_UP_FANTASY_LATE",
    detectClaims(ctx) {
      const hasRole = hasAny(ctx.creditableTypes, ROLE);
      const hasFantasy = hasAny(ctx.creditableTypes, FANTASY);
      const claims: CardClaim[] = [
        claim("role", "ROLE", `${ctx.subjectLabel}'s role is rising.`, !hasRole ? "BLOCKED" : ctx.roleSignal === "box_score_fraud" ? "CONFLICTED" : "SUPPORTED", true),
      ];
      if (hasAny(ctx.creditableTypes, MARKET)) {
        claims.push(claim("market", "MARKET", "The market is starting to move.", ctx.marketAlreadyCaughtUp ? "INFERRED" : "SUPPORTED", false));
      }
      claims.push(claim("fantasy_late", "FANTASY", "The fantasy market is late.", hasFantasy ? (ctx.hasContradiction ? "SUPPORTED" : "INFERRED") : "BLOCKED", false));
      return claims;
    },
    buildNarrative(ctx) {
      return {
        title: `${ctx.subjectLabel}: role rising`,
        whatChanged: `${ctx.subjectLabel}'s role stepped up (routes/targets), ahead of production and the fantasy market.`,
        whatItMeans: "The job got bigger before the points — a role-up that the fantasy market hasn't priced.",
        observedFact: firstPresent(ctx.creditableTypes, ROLE),
        changeKind: "role_change",
      };
    },
  };
}

function goodIdeaBadPrice(): DecisionStateCompiler {
  return {
    state: "GOOD_IDEA_BAD_PRICE",
    detectClaims(ctx) {
      const hasBasis = hasAny(ctx.creditableTypes, [...ROLE, ...INJURY]);
      const hasPrice = hasAny(ctx.creditableTypes, MARKET);
      return [
        claim("edge_basis", "RISK", `There's a real read on ${ctx.subjectLabel}.`, statusOf(hasBasis, ctx.hasContradiction), true),
        claim("price_gone", "MARKET", "The number has already moved past it.", hasPrice ? "SUPPORTED" : "BLOCKED", true),
      ];
    },
    buildNarrative(ctx) {
      return {
        title: `${ctx.subjectLabel}: right idea, wrong price`,
        whatChanged: `The read on ${ctx.subjectLabel} is sound, but the market number moved before we'd act.`,
        whatItMeans: "We like the side; we don't like the price. Acting here pays the move, not the edge.",
        observedFact: firstPresent(ctx.creditableTypes, MARKET),
        changeKind: "price_move",
      };
    },
  };
}

function publicOverreaction(): DecisionStateCompiler {
  return {
    state: "PUBLIC_OVERREACTION",
    detectClaims(ctx) {
      const hasCrowd = hasAny(ctx.creditableTypes, CROWD);
      const hasReality = hasAny(ctx.creditableTypes, [...ROLE, ...INJURY]);
      return [
        claim("crowd_move", "MARKET", "The crowd is piling in.", hasCrowd ? "SUPPORTED" : "BLOCKED", true),
        claim("reality_check", "RISK", "The underlying role doesn't justify the move.", statusOf(hasReality, ctx.hasContradiction), true),
      ];
    },
    buildNarrative(ctx) {
      return {
        title: `${ctx.subjectLabel}: crowd's overreacting`,
        whatChanged: `Money/roster moves on ${ctx.subjectLabel} are running ahead of the actual role.`,
        whatItMeans: "The move is public sentiment, not grounded in usage — a fade candidate, not a follow.",
        observedFact: firstPresent(ctx.creditableTypes, CROWD),
        changeKind: "crowd_move",
      };
    },
  };
}

function roleMassMisallocated(): DecisionStateCompiler {
  return {
    state: "ROLE_MASS_MISALLOCATED",
    detectClaims(ctx) {
      const hasUsage = hasAny(ctx.creditableTypes, USAGE_MASS);
      return [
        claim("usage_shift", "ROLE", "Opportunity moved to a player the crowd isn't watching.", statusOf(hasUsage, ctx.hasContradiction), true),
      ];
    },
    buildNarrative(ctx) {
      return {
        title: `${ctx.subjectLabel}: credit's misplaced`,
        whatChanged: `Snaps/carries/targets around ${ctx.subjectLabel} shifted away from where the crowd assigns credit.`,
        whatItMeans: "The opportunity is real but mis-attributed — value hides where attention isn't.",
        observedFact: firstPresent(ctx.creditableTypes, USAGE_MASS),
        changeKind: "usage_reallocation",
      };
    },
  };
}

function dataConflict(): DecisionStateCompiler {
  return {
    state: "DATA_CONFLICT",
    detectClaims(ctx) {
      const hasSignal = hasAny(ctx.creditableTypes, [...INJURY, ...ROLE, ...MARKET]);
      return [
        claim("disagreement", "PROOF", "Sources disagree on the same fact.", hasSignal ? "CONFLICTED" : "BLOCKED", true),
      ];
    },
    buildNarrative(ctx) {
      return {
        title: `${ctx.subjectLabel}: sources disagree`,
        whatChanged: `Two sources report different things about ${ctx.subjectLabel}.`,
        whatItMeans: "We surface the disagreement rather than resolving it as fact — no clean read yet.",
        observedFact: firstPresent(ctx.creditableTypes, [...INJURY, ...ROLE, ...MARKET]),
        changeKind: "source_conflict",
      };
    },
  };
}

function needsConfirmation(): DecisionStateCompiler {
  return {
    state: "NEEDS_CONFIRMATION",
    detectClaims(ctx) {
      const hasSignal = hasAny(ctx.creditableTypes, [...ROLE, ...MARKET, ...INJURY]);
      return [
        claim("first_signal", "PROOF", "One signal points this way.", statusOf(hasSignal, ctx.hasContradiction), true),
        claim("needs_second", "RISK", "It needs one confirmation before acting.", "INFERRED", true),
      ];
    },
    buildNarrative(ctx) {
      return {
        title: `${ctx.subjectLabel}: needs one confirmation`,
        whatChanged: `A first signal on ${ctx.subjectLabel} is in, but only one.`,
        whatItMeans: "One more independent signal would make this actionable; alone it isn't.",
        observedFact: firstPresent(ctx.creditableTypes, [...ROLE, ...MARKET, ...INJURY]),
        changeKind: "single_signal",
      };
    },
  };
}

function tooLate(): DecisionStateCompiler {
  return {
    state: "TOO_LATE",
    detectClaims(ctx) {
      const hasHistory = hasAny(ctx.creditableTypes, PRICE_HISTORY);
      return [
        claim("window_closed", "MARKET", "The number has fully absorbed the edge.", hasHistory ? "SUPPORTED" : "INFERRED", true),
      ];
    },
    buildNarrative(ctx) {
      return {
        title: `${ctx.subjectLabel}: too late`,
        whatChanged: `The market on ${ctx.subjectLabel} closed the gap before we could act.`,
        whatItMeans: "The window shut — chasing it now is paying full freight for no edge.",
        observedFact: firstPresent(ctx.creditableTypes, PRICE_HISTORY),
        changeKind: "window_closed",
      };
    },
  };
}

function pass(): DecisionStateCompiler {
  return {
    state: "PASS",
    detectClaims() {
      return [claim("no_edge", "RISK", "Nothing here clears the bar.", "INFERRED", true)];
    },
    buildNarrative(ctx) {
      return {
        title: `${ctx.subjectLabel}: pass`,
        whatChanged: "Nothing actionable surfaced this cycle.",
        whatItMeans: "No edge worth your attention — the honest call is to do nothing.",
        observedFact: null,
        changeKind: "no_edge",
      };
    },
  };
}

function trap(): DecisionStateCompiler {
  return {
    state: "TRAP",
    detectClaims(ctx) {
      const hasRole = hasAny(ctx.creditableTypes, ROLE);
      return [
        claim("resembles_trap", "RISK", "This rhymes with a pattern that has burned us before.", "INFERRED", true),
        claim("surface_appeal", "ROLE", "It looks appealing on the surface.", hasRole ? "SUPPORTED" : "BLOCKED", false),
      ];
    },
    buildNarrative(ctx) {
      return {
        title: `${ctx.subjectLabel}: looks like a trap`,
        whatChanged: `${ctx.subjectLabel} looks tempting, but matches a shape that has fooled us before.`,
        whatItMeans: "Surface appeal, known failure pattern — we step back rather than repeat the mistake.",
        observedFact: firstPresent(ctx.creditableTypes, ROLE),
        changeKind: "trap_resemblance",
      };
    },
  };
}

function watchlist(): DecisionStateCompiler {
  return {
    state: "WATCHLIST",
    detectClaims(ctx) {
      const hasSignal = hasAny(ctx.creditableTypes, [...ROLE, ...MARKET]);
      return [
        claim("on_radar", "PROOF", "Worth tracking; not yet a move.", statusOf(hasSignal, ctx.hasContradiction), true),
      ];
    },
    buildNarrative(ctx) {
      return {
        title: `${ctx.subjectLabel}: watching`,
        whatChanged: `${ctx.subjectLabel} is developing but hasn't crossed the line into a call.`,
        whatItMeans: "On the radar — we'll act if one more thing breaks the right way.",
        observedFact: firstPresent(ctx.creditableTypes, [...ROLE, ...MARKET]),
        changeKind: "watch",
      };
    },
  };
}

function needsLiveData(): DecisionStateCompiler {
  return {
    state: "NEEDS_LIVE_DATA",
    detectClaims() {
      return [claim("needs_live", "PROOF", "We can't responsibly call this without live inputs.", "BLOCKED", true)];
    },
    buildNarrative(ctx) {
      return {
        title: `${ctx.subjectLabel}: needs live data`,
        whatChanged: "The inputs this call needs aren't live yet.",
        whatItMeans: "We won't fake a read — this waits for live, rights-cleared data.",
        observedFact: null,
        changeKind: "needs_live",
      };
    },
  };
}

function actionable(): DecisionStateCompiler {
  return {
    state: "ACTIONABLE",
    detectClaims(ctx) {
      const hasRead = hasAny(ctx.creditableTypes, [...ROLE, ...INJURY]);
      const hasPrice = hasAny(ctx.creditableTypes, MARKET);
      return [
        claim("read", "RISK", `The read on ${ctx.subjectLabel} holds up.`, statusOf(hasRead, ctx.hasContradiction), true),
        claim("price_ok", "MARKET", "The price still pays for it.", hasPrice ? "SUPPORTED" : "BLOCKED", true),
      ];
    },
    buildNarrative(ctx) {
      return {
        title: `${ctx.subjectLabel}: worth a look`,
        whatChanged: `The read and the price on ${ctx.subjectLabel} line up right now.`,
        whatItMeans: "The edge and the number agree — this is the cleanest kind of call.",
        observedFact: firstPresent(ctx.creditableTypes, MARKET) ?? firstPresent(ctx.creditableTypes, ROLE),
        changeKind: "edge_aligned",
      };
    },
  };
}

function dfsSalaryLag(): DecisionStateCompiler {
  return {
    state: "DFS_SALARY_LAG",
    detectClaims(ctx) {
      const hasRole = hasAny(ctx.creditableTypes, ROLE);
      const hasSalary = hasAny(ctx.creditableTypes, DFS_PRICE);
      return [
        claim("role", "ROLE", `${ctx.subjectLabel}'s role grew.`, statusOf(hasRole, ctx.hasContradiction), true),
        claim("salary_lag", "DFS", "The DFS salary hasn't caught up to the role.", hasSalary ? "SUPPORTED" : "BLOCKED", true),
      ];
    },
    buildNarrative(ctx) {
      return {
        title: `${ctx.subjectLabel}: salary hasn't caught up`,
        whatChanged: `${ctx.subjectLabel}'s role grew faster than the DFS price did.`,
        whatItMeans: "Cheaper than the role implies — a salary-lag value, if the slate confirms it.",
        observedFact: firstPresent(ctx.creditableTypes, DFS_PRICE) ?? firstPresent(ctx.creditableTypes, ROLE),
        changeKind: "salary_lag",
      };
    },
  };
}

function ownershipOverreaction(): DecisionStateCompiler {
  return {
    state: "OWNERSHIP_OVERREACTION",
    detectClaims(ctx) {
      const hasOwnership = hasAny(ctx.creditableTypes, OWNERSHIP);
      const hasReality = hasAny(ctx.creditableTypes, [...ROLE, ...INJURY]);
      return [
        claim("ownership_spike", "DFS", "Projected ownership is running hot.", hasOwnership ? "SUPPORTED" : "BLOCKED", true),
        claim("edge_check", "RISK", "The actual edge doesn't justify the chalk.", statusOf(hasReality, ctx.hasContradiction), true),
      ];
    },
    buildNarrative(ctx) {
      return {
        title: `${ctx.subjectLabel}: crowd's piling in`,
        whatChanged: `Projected ownership on ${ctx.subjectLabel} is ahead of the real edge.`,
        whatItMeans: "Chalk forming faster than the value supports — a leverage/fade spot in DFS.",
        observedFact: firstPresent(ctx.creditableTypes, OWNERSHIP),
        changeKind: "ownership_spike",
      };
    },
  };
}

/** The registry — keyed EXHAUSTIVELY by the canonical DecisionState (compile error if one is missing). */
export const STATE_COMPILERS: Readonly<Record<DecisionState, DecisionStateCompiler>> = {
  ROLE_UP_FANTASY_LATE: roleUpFantasyLate(),
  GOOD_IDEA_BAD_PRICE: goodIdeaBadPrice(),
  PUBLIC_OVERREACTION: publicOverreaction(),
  ROLE_MASS_MISALLOCATED: roleMassMisallocated(),
  DATA_CONFLICT: dataConflict(),
  NEEDS_CONFIRMATION: needsConfirmation(),
  TOO_LATE: tooLate(),
  PASS: pass(),
  TRAP: trap(),
  WATCHLIST: watchlist(),
  NEEDS_LIVE_DATA: needsLiveData(),
  ACTIONABLE: actionable(),
  DFS_SALARY_LAG: dfsSalaryLag(),
  OWNERSHIP_OVERREACTION: ownershipOverreaction(),
};
