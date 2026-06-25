/**
 * DATA INTELLIGENCE MESH — Source Genome.
 *
 * Each source is an observer with its own latency, rights, quality, coverage, bias, blind spots,
 * cost, and decision leverage. The genome is the source-level intelligence record — how good it is,
 * what it sees, how fast, where it is blind, what it costs, and what it uniquely unlocks. The legal
 * verdict is the FIRST gate: a forbidden source can never go live regardless of yield. Pure types +
 * a small legal-gate helper. No I/O.
 */

export type LegalVerdict = "LICENSED" | "FREE_OPEN" | "FREE_CAUTION" | "PAID_REQUIRED" | "RIGHTS_REVIEW" | "DO_NOT_USE";

export type SportCoverage = "nfl" | "nba" | "mlb" | "nhl" | "ncaaf" | "ncaab" | "soccer" | "multi";
export type MarketCoverage = "moneyline" | "spread" | "total" | "props" | "alt_lines" | "futures" | "live" | "history";
export type FantasyCoverage = "projections" | "ranks" | "adp" | "roster_pct" | "start_pct" | "league_sync" | "news";
export type DfsCoverage = "salary" | "slate" | "ownership" | "contest" | "late_swap";
export type HistoryDepth = "none" | "season" | "multi_season" | "decade_plus";
export type Cadence = "real_time" | "intraday" | "daily" | "weekly" | "bulk_release" | "static";

export interface SourceGenome {
  readonly sourceId: string;
  readonly provider: string;
  readonly legalVerdict: LegalVerdict;
  readonly attributionRequired: boolean;
  readonly rightsRisk: number; // 0..1
  readonly sportCoverage: readonly SportCoverage[];
  readonly marketCoverage: readonly MarketCoverage[];
  readonly fantasyCoverage: readonly FantasyCoverage[];
  readonly dfsCoverage: readonly DfsCoverage[];
  readonly historyDepth: HistoryDepth;
  readonly updateLatencyMs: number | null;
  readonly snapshotCadence: Cadence;
  readonly endpointReliability: number; // 0..1
  readonly schemaStability: number;     // 0..1
  readonly entityKeyQuality: number;    // 0..1
  readonly timestampQuality: number;    // 0..1
  readonly costPerMonth: number;        // USD
  readonly costPerUsefulFact: number;   // normalized 0..1 (lower is better)
  readonly uniqueFacts: readonly string[];
  readonly duplicateFacts: readonly string[];
  readonly knownBlindSpots: readonly string[];
  readonly knownBiases: readonly string[];
  readonly decisionLeverage: number;    // 0..1
  readonly proofValue: number;          // 0..1
  readonly calibrationValue: number;    // 0..1
  readonly productValue: number;        // 0..1
}

/** Which verdicts permit going LIVE without further review. The legal gate is non-negotiable. */
const LIVE_OK: ReadonlySet<LegalVerdict> = new Set<LegalVerdict>(["LICENSED", "FREE_OPEN"]);

/** Can this source be used live right now? FREE_CAUTION needs care; paid/review/forbidden cannot. */
export function legalAllowsLive(verdict: LegalVerdict): boolean {
  return LIVE_OK.has(verdict);
}

/** Is this source permanently excluded from any use? */
export function isForbidden(verdict: LegalVerdict): boolean {
  return verdict === "DO_NOT_USE";
}
