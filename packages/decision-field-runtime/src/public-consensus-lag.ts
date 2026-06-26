/**
 * PUBLIC CONSENSUS LAG — the Chronos timing object and the derived latency stats (Addendum III).
 *
 * If a goal happens at 55:00, the official source sees it at 55:02, the market moves at 55:04, Google
 * Sports displays it at 55:10, and GSE compiles meaning at 55:14, there is a real timing object:
 *
 *   event clock → source clock → market clock → public observer clock → GSE meaning clock
 *
 * From it GSE derives a family of proprietary stats: Public Consensus Lag, Public Scoreboard Delay,
 * Public-vs-Market Lag, Public-vs-Official Lag, Google Visibility Index, Knowledge Graph Coverage, and
 * Public Observer Disagreement. A missing clock yields `null` (unknown), and unknown lag can NEVER imply
 * an edge or create action authority — it is for research and observability only.
 *
 * Pure + deterministic; clocks are passed in as numeric offsets (no wall clock). Spec:
 * docs/product/PUBLIC_OBSERVER_LEDGER.md.
 */

import type { PublicObserverRecord } from "./public-observer-ledger.js";

/** The canonical timing record (the "Chronos" clock chain). Offsets are seconds from a shared origin. */
export interface ChronosRecord {
  readonly eventId: string;
  readonly eventClockSec: number | null; // when the event actually happened
  readonly sourceClockSec: number | null; // when the official/licensed source observed it
  readonly marketClockSec: number | null; // when the market moved
  readonly publicObserverClockSec: number | null; // when Google/public observer displayed it
  readonly gseClockSec: number | null; // when GSE compiled meaning
}

/** A lag is a number of seconds, or null when a required clock is missing. */
export type Lag = number | null;

export interface PublicConsensusLagReport {
  readonly eventId: string;
  /** Public observer shown minus official source — the headline "how late is the public" number. */
  readonly publicConsensusLag: Lag;
  readonly publicScoreboardDelay: Lag; // public observer minus the event itself
  readonly publicVsMarketLag: Lag; // public observer minus the market move
  readonly publicVsOfficialLag: Lag; // public observer minus official source
  readonly marketVsOfficialLag: Lag; // market move minus official source
  readonly gseVsPublicLag: Lag; // GSE compiled minus public observer
  /** Lag is observability only — it can never imply a betting edge or create an action. */
  readonly canImplyEdge: false;
  readonly canCreateAction: false;
}

function diff(a: number | null, b: number | null): Lag {
  return a == null || b == null ? null : a - b;
}

/** Compute the lag family from a Chronos record. Missing clocks → null (unknown), never zero. */
export function computeChronosLags(c: ChronosRecord): PublicConsensusLagReport {
  return {
    eventId: c.eventId,
    publicConsensusLag: diff(c.publicObserverClockSec, c.sourceClockSec),
    publicScoreboardDelay: diff(c.publicObserverClockSec, c.eventClockSec),
    publicVsMarketLag: diff(c.publicObserverClockSec, c.marketClockSec),
    publicVsOfficialLag: diff(c.publicObserverClockSec, c.sourceClockSec),
    marketVsOfficialLag: diff(c.marketClockSec, c.sourceClockSec),
    gseVsPublicLag: diff(c.gseClockSec, c.publicObserverClockSec),
    canImplyEdge: false,
    canCreateAction: false,
  };
}

// ───────────────────────── visibility + coverage stats (from a PublicObserverRecord) ─────────────────────────

/** Google Visibility Index (0..1): how rich the public result is (spotlight, kgmids, standings, highlights). */
export function googleVisibilityIndex(r: PublicObserverRecord): number {
  let score = 0;
  if (r.resultType === "GAME_SPOTLIGHT" || r.resultType === "LIVE_GAME") score += 0.35;
  if (r.publicScore || r.publicStatus) score += 0.2;
  if (r.kgmids.length > 0) score += 0.2;
  if (r.publicStandings.length > 0 || r.publicRanking) score += 0.15;
  if (r.highlights.length > 0) score += 0.1;
  return Math.round(Math.min(1, score) * 1000) / 1000;
}

/** Knowledge Graph Coverage (0..1): fraction of named entities that carry a kgmid anchor. */
export function knowledgeGraphCoverage(r: PublicObserverRecord): number {
  const entities = new Set<string>([...r.teams, ...r.athletes, ...(r.venue ? [r.venue] : [])]);
  if (entities.size === 0) return 0;
  const covered = new Set(r.kgmids.map((k) => k.entity));
  let hits = 0;
  for (const e of entities) if (covered.has(e)) hits++;
  return Math.round((hits / entities.size) * 1000) / 1000;
}

/** SERP Sports Confidence (0..1): a deterministic blend of visibility and KG coverage. */
export function serpSportsConfidence(r: PublicObserverRecord): number {
  return Math.round(((googleVisibilityIndex(r) * 0.6 + knowledgeGraphCoverage(r) * 0.4)) * 1000) / 1000;
}

/** Public Observer Disagreement: does the public display differ from a known official score? null = unknown. */
export function publicObserverDisagreement(r: PublicObserverRecord, officialScore: string | null): boolean | null {
  if (!officialScore || !r.publicScore) return null;
  return r.publicScore.replace(/\s/g, "") !== officialScore.replace(/\s/g, "");
}

// ───────────────────────── fixture (the 55:00 goal example) ─────────────────────────
export const CHRONOS_FIXTURE: ChronosRecord = {
  eventId: "fixture-soccer-ecu-ger-2026",
  eventClockSec: 3300, // 55:00
  sourceClockSec: 3302, // 55:02 official
  marketClockSec: 3304, // 55:04 market
  publicObserverClockSec: 3310, // 55:10 Google
  gseClockSec: 3314, // 55:14 GSE
};

export function fixtureLagReport(): PublicConsensusLagReport {
  return computeChronosLags(CHRONOS_FIXTURE);
}
