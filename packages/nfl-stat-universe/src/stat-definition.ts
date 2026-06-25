/**
 * NFL STAT UNIVERSE — Stat Definition + Source Paths + Legal Acquisition Policy.
 *
 * Every NFL number is either ingested, derived, disputed, priced, or marked missing — nothing floats.
 * A stat declares HOW it can be known legally (its source paths), whether GSE can derive it, the
 * STRONGEST public action it can ever support (its authority ceiling), and which surfaces go dark if
 * it's missing. The legal gate aligns with the canonical clearance engine — a forbidden source can
 * never satisfy a production stat. Pure; no I/O.
 */

import type { FactType, LegalVerdict } from "@sports/data-intelligence";
import type { DecisionState, MaxPermittedStrength } from "@sports/decision-field-runtime";
import type { StatCategory } from "./stat-category.js";

export type AcquisitionMethod =
  | "official_api"
  | "open_release"
  | "user_oauth"
  | "user_upload"
  | "licensed_feed"
  | "official_rss"
  | "manual_admin"
  | "scrape_review";

/** The strongest public expression a stat is allowed to support, regardless of how interesting it is. */
export type StatAuthorityLevel =
  | "OBSERVE_ONLY"
  | "INTERNAL_SIGNAL"
  | "WATCHLIST_CARD"
  | "PERSONALIZED_CARD"
  | "PUBLIC_CARD"
  | "ACTION_RECOMMENDATION";

export interface SourcePath {
  readonly sourceId: string;
  readonly method: AcquisitionMethod;
  readonly legalStatus: LegalVerdict;
  readonly isOfficial: boolean;
  readonly attributionRequired: boolean;
  readonly note: string;
}

export type LatencyNeed = "real_time" | "intraday" | "daily" | "weekly" | "historical";

export interface NflStatDefinition {
  readonly statKey: string;
  readonly displayName: string;
  readonly category: StatCategory;
  readonly factTypes: readonly FactType[];
  readonly grain: string;
  readonly legalSourceOptions: readonly SourcePath[];
  readonly derivableByGSE: boolean;
  readonly derivedFrom?: readonly string[];
  readonly requiredInputs?: readonly string[];
  readonly latencyNeed: LatencyNeed;
  readonly decisionStatesSupported: readonly DecisionState[];
  /** The ceiling this stat's evidence can ever license. */
  readonly maxAuthority: StatAuthorityLevel;
  readonly blockedSurfacesIfMissing: readonly string[];
  readonly proofRisk: number; // 0..1
}

// ── The source registry (a few representative observers per legal lane). ──────
export const SOURCES: Readonly<Record<string, SourcePath>> = {
  nflverse: { sourceId: "nflverse", method: "open_release", legalStatus: "FREE_OPEN", isOfficial: false, attributionRequired: true, note: "Open NFL data release — the free historical base." },
  nws: { sourceId: "nws", method: "official_api", legalStatus: "FREE_OPEN", isOfficial: true, attributionRequired: false, note: "US National Weather Service — public domain." },
  sleeper: { sourceId: "sleeper", method: "official_api", legalStatus: "FREE_CAUTION", isOfficial: true, attributionRequired: true, note: "Sleeper read-only API — free, no token, attribution requested." },
  yahoo_oauth: { sourceId: "yahoo_oauth", method: "user_oauth", legalStatus: "FREE_CAUTION", isOfficial: true, attributionRequired: true, note: "Yahoo Fantasy OAuth — consented user data only." },
  the_odds_api: { sourceId: "the_odds_api", method: "licensed_feed", legalStatus: "LICENSED", isOfficial: false, attributionRequired: true, note: "The Odds API — licensed odds/props (market observer #1)." },
  sportsgameodds: { sourceId: "sportsgameodds", method: "licensed_feed", legalStatus: "LICENSED", isOfficial: false, attributionRequired: true, note: "SportsGameOdds — second market observer for real book-lag." },
  fantasydata: { sourceId: "fantasydata", method: "licensed_feed", legalStatus: "PAID_REQUIRED", isOfficial: false, attributionRequired: true, note: "FantasyData — licensed projections/ADP/DFS salary+ownership (evaluate)." },
  sportsdataio: { sourceId: "sportsdataio", method: "licensed_feed", legalStatus: "PAID_REQUIRED", isOfficial: false, attributionRequired: true, note: "SportsDataIO — licensed fantasy/DFS feed (evaluate)." },
  sportradar: { sourceId: "sportradar", method: "licensed_feed", legalStatus: "PAID_REQUIRED", isOfficial: true, attributionRequired: true, note: "Sportradar — enterprise official feed (dossier, not a dependency)." },
  // Forbidden lanes — aligned with apps/web/lib/scraping/source-rights-registry.ts.
  draftkings_unofficial: { sourceId: "draftkings_unofficial", method: "scrape_review", legalStatus: "DO_NOT_USE", isOfficial: false, attributionRequired: false, note: "Unofficial DK endpoint — circumvents access controls. DO_NOT_USE." },
  pfr_scrape: { sourceId: "pfr_scrape", method: "scrape_review", legalStatus: "RIGHTS_REVIEW", isOfficial: false, attributionRequired: false, note: "Pro-Football-Reference scraping — rights review required before any use." },
  oddsportal_scrape: { sourceId: "oddsportal_scrape", method: "scrape_review", legalStatus: "RIGHTS_REVIEW", isOfficial: false, attributionRequired: false, note: "OddsPortal scraping — rights review required." },
};

const FORBIDDEN: ReadonlySet<LegalVerdict> = new Set<LegalVerdict>(["DO_NOT_USE", "RIGHTS_REVIEW"]);
const PAID: ReadonlySet<LegalVerdict> = new Set<LegalVerdict>(["PAID_REQUIRED"]);

/** A source path that may not back a production (surfaced) stat. */
export function isForbiddenForProduction(p: SourcePath): boolean {
  return FORBIDDEN.has(p.legalStatus);
}

/** A source that requires a paid acquisition (cannot run free-live). */
export function isPaidRequired(p: SourcePath): boolean {
  return PAID.has(p.legalStatus);
}

/** A clean, free or licensed lane usable in production now. */
export function isProductionUsable(p: SourcePath): boolean {
  return !FORBIDDEN.has(p.legalStatus) && !PAID.has(p.legalStatus);
}

export const AUTHORITY_ORDER: Readonly<Record<StatAuthorityLevel, number>> = {
  OBSERVE_ONLY: 0,
  INTERNAL_SIGNAL: 1,
  WATCHLIST_CARD: 2,
  PERSONALIZED_CARD: 3,
  PUBLIC_CARD: 4,
  ACTION_RECOMMENDATION: 5,
};

/** Map a stat authority ceiling to the runtime's card strength ceiling. */
export function authorityToStrength(a: StatAuthorityLevel): MaxPermittedStrength {
  switch (a) {
    case "OBSERVE_ONLY":
    case "INTERNAL_SIGNAL":
      return "INFO_ONLY";
    case "WATCHLIST_CARD":
      return "WATCH";
    case "PERSONALIZED_CARD":
      return "PERSONALIZED";
    case "PUBLIC_CARD":
      return "ACTION";
    case "ACTION_RECOMMENDATION":
      return "PUBLIC_ACTION";
  }
}
