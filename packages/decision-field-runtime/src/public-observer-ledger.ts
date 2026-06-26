/**
 * THE PUBLIC OBSERVER LEDGER — the sixth ledger (Addendum III).
 *
 * Next to Reality, Belief, Decision, Authority, and Learning, GSE records what the public internet is
 * being SHOWN by dominant discovery systems: Google Sports, SERP snippets, score widgets, standings
 * one-boxes, athlete stat widgets, highlight carousels, knowledge-graph entities. This is not official
 * truth — it is PUBLIC DISPLAY TRUTH. It tells GSE what the public sees, when they see it, which
 * entities Google recognizes, and where public perception may lag official reality or the market.
 *
 * A PublicObserverRecord can support discovery, identity resolution, public-visibility, and latency
 * analysis. It can NEVER settle an event, create a public action, or become production fact without
 * cross-verification by an official/licensed source. Highlights are link/reference only (HighlightPassport).
 *
 * Pure + deterministic; fixture-only. Spec: docs/product/PUBLIC_OBSERVER_LEDGER.md.
 */

import type { MaxPermittedStrength } from "./decision-state-stat-contract.js";
import type { RightsEnvelope } from "./meaning/claim-object.js";
import { buildHighlightPassport, type HighlightInput, type HighlightPassport } from "./highlight-passport.js";
import type { SerpApiSportsResult } from "@sports/data-intelligence";

export type PublicObserverResultType =
  | "TEAM_RESULTS"
  | "GAME_SPOTLIGHT"
  | "VIDEO_HIGHLIGHT_CAROUSEL"
  | "ATHLETE_STATS"
  | "STANDINGS"
  | "LIVE_GAME"
  | "RACING_RESULTS"
  | "TENNIS_RESULTS"
  | "OTHER";

/** A knowledge-graph id anchor (entity → Google KGMID), used for entity resolution, never roster truth. */
export interface KgmidAnchor {
  readonly entity: string;
  readonly entityType: "TEAM" | "PLAYER" | "VENUE" | "LEAGUE" | "TOURNAMENT";
  readonly kgmid: string;
}

export interface PublicObserverInput {
  readonly observerId: string;
  readonly sourceId: string; // e.g. "serpapi-google-sports"
  readonly providerName: string;
  readonly query: string;
  readonly engine: string; // e.g. "google"
  readonly location?: string | null;
  readonly capturedAtLabel: string; // REQUIRED — when GSE captured the public display
  readonly observedAtLabel?: string | null; // when the public display claims the event was observed
  readonly subject: string;
  readonly sport?: string | null;
  readonly eventId?: string | null;
  readonly resultType: PublicObserverResultType;
  readonly publicTitle?: string | null;
  readonly publicStatus?: string | null; // e.g. "Live", "FT", "59'"
  readonly publicScore?: string | null;
  readonly publicTime?: string | null; // in_game_time — STILL public observer state, not official clock
  readonly publicRanking?: string | null;
  readonly publicStandings?: readonly { team: string; rank: number; record: string }[];
  readonly teams?: readonly string[];
  readonly athletes?: readonly string[];
  readonly venue?: string | null;
  readonly kgmids?: readonly KgmidAnchor[];
  readonly highlights?: readonly HighlightInput[];
  readonly sourcePayloadHash?: string | null;
  readonly rightsEnvelope: RightsEnvelope;
  readonly linkedClaimObjectIds?: readonly string[];
}

export interface PublicObserverRecord {
  readonly observerId: string;
  readonly sourceId: string;
  readonly providerName: string;
  readonly query: string;
  readonly engine: string;
  readonly location: string | null;
  readonly capturedAtLabel: string;
  readonly observedAtLabel: string | null;
  readonly subject: string;
  readonly sport: string | null;
  readonly eventId: string | null;
  readonly resultType: PublicObserverResultType;
  readonly publicTitle: string | null;
  readonly publicStatus: string | null;
  readonly publicScore: string | null;
  readonly publicTime: string | null;
  readonly publicRanking: string | null;
  readonly publicStandings: readonly { team: string; rank: number; record: string }[];
  readonly teams: readonly string[];
  readonly athletes: readonly string[];
  readonly venue: string | null;
  readonly kgmids: readonly KgmidAnchor[];
  readonly highlights: readonly HighlightPassport[];
  readonly sourcePayloadHash: string | null;
  readonly rightsEnvelope: RightsEnvelope;
  /** What authority this record may touch. Always PUBLIC_OBSERVER_ONLY — it cannot settle or price. */
  readonly authorityImpact: "PUBLIC_OBSERVER_ONLY";
  /** A public observer can never settle an event by itself. */
  readonly canSettle: false;
  /** Intrinsic ceiling: a public display can inform a WATCH at most; never a public action. */
  readonly authorityCeiling: MaxPermittedStrength;
  readonly linkedClaimObjectIds: readonly string[];
  readonly fixtureWatermarked: true;
}

/**
 * Build a public observer record. `capturedAtLabel` is required (a public capture without a capture time
 * is meaningless for latency). Highlights are lifted into rights-gated HighlightPassports — never raw urls.
 */
export function buildPublicObserverRecord(i: PublicObserverInput): PublicObserverRecord {
  if (!i.capturedAtLabel || !i.capturedAtLabel.trim()) {
    throw new Error("PublicObserverRecord requires capturedAtLabel — a public capture must have a capture time");
  }
  return {
    observerId: i.observerId,
    sourceId: i.sourceId,
    providerName: i.providerName,
    query: i.query,
    engine: i.engine,
    location: i.location ?? null,
    capturedAtLabel: i.capturedAtLabel,
    observedAtLabel: i.observedAtLabel ?? null,
    subject: i.subject,
    sport: i.sport ?? null,
    eventId: i.eventId ?? null,
    resultType: i.resultType,
    publicTitle: i.publicTitle ?? null,
    publicStatus: i.publicStatus ?? null,
    publicScore: i.publicScore ?? null,
    publicTime: i.publicTime ?? null,
    publicRanking: i.publicRanking ?? null,
    publicStandings: i.publicStandings ?? [],
    teams: i.teams ?? [],
    athletes: i.athletes ?? [],
    venue: i.venue ?? null,
    kgmids: i.kgmids ?? [],
    highlights: (i.highlights ?? []).map(buildHighlightPassport),
    sourcePayloadHash: i.sourcePayloadHash ?? null,
    rightsEnvelope: i.rightsEnvelope,
    authorityImpact: "PUBLIC_OBSERVER_ONLY",
    canSettle: false,
    authorityCeiling: "WATCH",
    linkedClaimObjectIds: i.linkedClaimObjectIds ?? [],
    fixtureWatermarked: true,
  };
}

/** A public observer can never settle — this is a constant guarantee, exposed for callers/tests. */
export function publicObserverCanSettle(_record: PublicObserverRecord): false {
  return false;
}

// ───────────────────────── the "review required" rights envelope ─────────────────────────
/** Public-observer captures default to permission_required / RIGHTS_REVIEW — display needs a review. */
export const PUBLIC_OBSERVER_RIGHTS: RightsEnvelope = {
  status: "permission_required",
  legalVerdict: "RIGHTS_REVIEW",
  commercialDisplayAllowed: false,
  publicDisplayAllowed: false,
  storageAllowed: false,
  derivedUseAllowed: true, // we may derive latency/visibility signals from the OBSERVATION of the display
  modelTrainingAllowed: false,
  redistributionAllowed: false,
  attributionRequired: true,
  attributionText: "public display observation",
  ownerApprovalRequired: true,
  reviewStatus: "UNKNOWN",
  reviewedAtLabel: null,
};

// ───────────────────────── fixtures (illustrative — a captured Google Sports display) ─────────────────────────
export const PUBLIC_OBSERVER_FIXTURES: readonly PublicObserverInput[] = [
  {
    observerId: "po-soccer-ecu-ger-live",
    sourceId: "serpapi-google-sports",
    providerName: "Google Sports (via SerpApi)",
    query: "Ecuador vs Germany",
    engine: "google",
    location: "United States",
    capturedAtLabel: "fixture+55:10",
    observedAtLabel: "fixture+55:00",
    subject: "Ecuador vs Germany — public scoreboard",
    sport: "soccer",
    eventId: "fixture-soccer-ecu-ger-2026",
    resultType: "LIVE_GAME",
    publicTitle: "Ecuador 2 - 1 Germany",
    publicStatus: "77'",
    publicScore: "2 - 1",
    publicTime: "77'",
    teams: ["Ecuador", "Germany"],
    venue: "MetLife Stadium",
    kgmids: [
      { entity: "Germany", entityType: "TEAM", kgmid: "/m/0gfx9" },
      { entity: "MetLife Stadium", entityType: "VENUE", kgmid: "/m/0glh3" },
    ],
    highlights: [
      {
        highlightId: "hl-ecu-ger-plata",
        sourceUrl: "https://example.org/highlight/ecu-ger-plata",
        sourcePlatform: "google-sports",
        title: "Plata seals it for Ecuador (fixture)",
        durationLabel: "1:12",
        eventId: "fixture-soccer-ecu-ger-2026",
        teams: ["Ecuador", "Germany"],
        capturedAtLabel: "fixture+55:10",
        rightsStatus: "UNKNOWN",
      },
    ],
    sourcePayloadHash: "fixture-hash-ecu-ger",
    rightsEnvelope: PUBLIC_OBSERVER_RIGHTS,
  },
  {
    observerId: "po-mlb-tb-standings",
    sourceId: "serpapi-google-sports",
    providerName: "Google Sports (via SerpApi)",
    query: "Tampa Bay Rays standings",
    engine: "google",
    capturedAtLabel: "fixture",
    subject: "AL East — public standings one-box",
    sport: "baseball",
    resultType: "STANDINGS",
    publicStandings: [
      { team: "Tampa Bay Rays", rank: 1, record: "—" },
      { team: "Kansas City Royals", rank: 4, record: "—" },
    ],
    teams: ["Tampa Bay Rays", "Kansas City Royals"],
    rightsEnvelope: PUBLIC_OBSERVER_RIGHTS,
  },
];

export function buildAllPublicObserverRecords(): readonly PublicObserverRecord[] {
  return PUBLIC_OBSERVER_FIXTURES.map(buildPublicObserverRecord);
}

/**
 * Bridge a parsed SerpApi Google Sports result into a governed PublicObserverRecord. The SerpApi adapter
 * (data-intelligence) does the parsing; this applies the review-required rights envelope and the
 * public-observer authority. The dependency points the right way (runtime → data-intelligence).
 */
export function publicObserverFromSerpApi(result: SerpApiSportsResult, args: { observerId: string; subject: string; sport?: string | null; eventId?: string | null; capturedAtLabel: string; location?: string | null }): PublicObserverRecord {
  const sp = result.spotlight;
  return buildPublicObserverRecord({
    observerId: args.observerId,
    sourceId: "serpapi-google-sports",
    providerName: "Google Sports (via SerpApi)",
    query: result.query,
    engine: result.engine,
    location: args.location ?? null,
    capturedAtLabel: args.capturedAtLabel,
    observedAtLabel: sp?.inGameTime ?? null,
    subject: args.subject,
    sport: args.sport ?? null,
    eventId: args.eventId ?? null,
    resultType: result.resultType,
    publicTitle: sp?.title ?? result.title ?? null,
    publicStatus: sp?.status ?? null,
    publicScore: sp?.score ?? null,
    publicTime: sp?.inGameTime ?? null,
    publicStandings: result.standings?.rows ?? [],
    teams: sp?.teams ?? result.standings?.rows.map((r) => r.team) ?? [],
    athletes: result.athleteStats ? [result.athleteStats.athlete] : [],
    venue: sp?.venue ?? null,
    kgmids: result.kgEntities.map((k) => ({ entity: k.name, entityType: k.entityType === "PLAYER" ? "PLAYER" : k.entityType, kgmid: k.kgmid })),
    highlights: result.highlights.map((h) => ({
      highlightId: `hl-${args.observerId}-${h.title.replace(/\W+/g, "-").slice(0, 24)}`,
      sourceUrl: h.link,
      sourcePlatform: h.sourcePlatform,
      title: h.title,
      durationLabel: h.durationLabel,
      thumbnailUrl: h.thumbnailUrl,
      eventId: args.eventId ?? null,
      teams: sp?.teams ?? [],
      capturedAtLabel: args.capturedAtLabel,
      rightsStatus: "UNKNOWN" as const,
    })),
    sourcePayloadHash: null,
    rightsEnvelope: PUBLIC_OBSERVER_RIGHTS,
  });
}
