/**
 * NFL STAT UNIVERSE — manifest audit (the A–J invariants).
 *
 * The manifest is only trustworthy if it provably keeps weak facts from backing strong cards. These
 * checks are the executable contract: every stat is reachable, every path is legal, forbidden sources
 * never back production, paid-only stats are flagged for acquisition, derived stats name their inputs,
 * and role/DFS/market-lag/fantasy-lag stats carry the evidence their claims require. Pure.
 */

import type { FactType } from "@sports/data-intelligence";
import type { NflStatDefinition } from "./stat-definition.js";
import { AUTHORITY_ORDER, isForbiddenForProduction, isProductionUsable, isPaidRequired } from "./stat-definition.js";
import { NFL_STAT_MANIFEST } from "./nfl-stat-manifest.js";
import { ALL_STAT_CATEGORIES } from "./stat-category.js";

export interface AuditResult {
  readonly check: string;
  readonly ok: boolean;
  readonly offenders: readonly string[];
}

const USAGE_TYPES: ReadonlySet<FactType> = new Set<FactType>(["snap_share", "route_rate", "target_share", "carry_share"]);
const rank = (s: NflStatDefinition): number => AUTHORITY_ORDER[s.maxAuthority];
const PUBLIC = AUTHORITY_ORDER.PUBLIC_CARD;
const WATCH = AUTHORITY_ORDER.WATCHLIST_CARD;

function audit(check: string, manifest: readonly NflStatDefinition[], bad: (s: NflStatDefinition) => boolean): AuditResult {
  const offenders = manifest.filter(bad).map((s) => s.statKey);
  return { check, ok: offenders.length === 0, offenders };
}

/** (A) Every stat has ≥1 source path OR a GSE derivation. */
export const everyStatReachable = (m = NFL_STAT_MANIFEST): AuditResult =>
  audit("A: every stat reachable", m, (s) => s.legalSourceOptions.length === 0 && !s.derivableByGSE);

/** (B) Every source path carries a legal status (non-empty LegalVerdict). */
export const everyPathLegallyClassified = (m = NFL_STAT_MANIFEST): AuditResult =>
  audit("B: every source path has a legal status", m, (s) => s.legalSourceOptions.some((p) => !p.legalStatus));

/** (C) A production stat (≥ WATCHLIST) can't be backed ONLY by forbidden sources unless derivable. */
export const forbiddenCantSatisfyProduction = (m = NFL_STAT_MANIFEST): AuditResult =>
  audit("C: forbidden sources can't satisfy production", m, (s) =>
    rank(s) >= WATCH && !s.derivableByGSE && s.legalSourceOptions.length > 0 && s.legalSourceOptions.every(isForbiddenForProduction),
  );

/** (D) Stats whose only lane is paid (no free/licensed-now path and not derivable) — flag for acquisition. */
export function statsRequiringAcquisition(m = NFL_STAT_MANIFEST): readonly string[] {
  return m
    .filter((s) => !s.derivableByGSE && s.legalSourceOptions.length > 0 && !s.legalSourceOptions.some(isProductionUsable) && s.legalSourceOptions.some(isPaidRequired))
    .map((s) => s.statKey);
}

/** (E) Every derived stat lists its required inputs. */
export const everyDerivedListsInputs = (m = NFL_STAT_MANIFEST): AuditResult =>
  audit("E: derived stats list required inputs", m, (s) => s.derivableByGSE && (s.requiredInputs?.length ?? 0) === 0);

/** (F) Role/usage stats can't be high-confidence (≥ PUBLIC) without a usage fact type. */
export const roleStatsNeedUsage = (m = NFL_STAT_MANIFEST): AuditResult =>
  audit("F: role stats need a usage input to go public", m, (s) =>
    (s.category === "ROLE_STATE" || s.category === "PLAYER_USAGE") && rank(s) >= PUBLIC && !s.factTypes.some((t) => USAGE_TYPES.has(t)),
  );

/** (G) DFS stats can't be ACTION_RECOMMENDATION without a licensed salary/slate feed. */
export const dfsActionNeedsLicensedSalary = (m = NFL_STAT_MANIFEST): AuditResult =>
  audit("G: DFS action needs a licensed salary/slate feed", m, (s) =>
    s.category === "DFS_MARKET" &&
    s.maxAuthority === "ACTION_RECOMMENDATION" &&
    !(s.legalSourceOptions.some((p) => p.method === "licensed_feed") && s.factTypes.some((t) => t === "dfs_salary" || t === "dfs_slate")),
  );

/** (H) Market-lag stats require timestamped book snapshots (odds_history). */
export const marketLagNeedsTimestampedBooks = (m = NFL_STAT_MANIFEST): AuditResult =>
  audit("H: market-lag stats require timestamped book snapshots", m, (s) =>
    /absorption|book_lag|market_lag/.test(s.statKey) && !(s.factTypes.includes("odds_history") || (s.requiredInputs ?? []).includes("odds_history")),
  );

/** (I) Fantasy-lag stats require a fantasy-market snapshot (platform_projection / roster_pct). */
export const fantasyLagNeedsFantasySnapshot = (m = NFL_STAT_MANIFEST): AuditResult =>
  audit("I: fantasy-lag stats require a fantasy snapshot", m, (s) =>
    /fantasy_lag/.test(s.statKey) &&
    !(s.factTypes.some((t) => t === "platform_projection" || t === "roster_pct") || (s.requiredInputs ?? []).some((r) => r === "platform_projection" || r === "roster_pct")),
  );

/** Every category is represented at least once. */
export function everyCategoryRepresented(m = NFL_STAT_MANIFEST): AuditResult {
  const present = new Set(m.map((s) => s.category));
  const missing = ALL_STAT_CATEGORIES.filter((c) => !present.has(c));
  return { check: "every category represented", ok: missing.length === 0, offenders: missing };
}

/** Run the full A–I battery (J is the compiler test). */
export function runFullAudit(m = NFL_STAT_MANIFEST): readonly AuditResult[] {
  return [
    everyStatReachable(m),
    everyPathLegallyClassified(m),
    forbiddenCantSatisfyProduction(m),
    everyDerivedListsInputs(m),
    roleStatsNeedUsage(m),
    dfsActionNeedsLicensedSalary(m),
    marketLagNeedsTimestampedBooks(m),
    fantasyLagNeedsFantasySnapshot(m),
    everyCategoryRepresented(m),
  ];
}
