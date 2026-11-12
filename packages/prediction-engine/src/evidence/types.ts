/**
 * The evidence contract.
 *
 * Every probability-affecting number the pregame engine consumes must arrive as
 * an `Evidence<T>`. There is no other legal source. A loader that cannot reach
 * its source returns `MISSING` with a reason; it never returns a default, an
 * empty map, a last-known value, or a hand-typed constant.
 *
 * Why this file exists: the slate pipeline asked its data files for field names
 * that do not exist (`sack_rate_allowed` vs `sack_rate_allowed_pct`,
 * `epa_per_play` vs `off_epa_per_play`), so `??` defaults fired for every game
 * and the trench advantage came out identical across the slate. A missing key
 * that reads as a number is indistinguishable from a measured one. Here it is
 * distinguishable, and it is fatal to the run.
 */

/** Where a value came from, and whether it was measured or computed. */
export type EvidenceStatus = "REAL" | "DERIVED" | "MISSING";

/** A value that was actually obtained. */
export interface EvidencePresent<T> {
  readonly status: "REAL" | "DERIVED";
  readonly value: T;
  /** Stable source id, e.g. "the-odds-api", "espn:injuries", "nflverse:pbp". */
  readonly source: string;
  /** ISO-8601 UTC instant the value describes (not when we read it). */
  readonly asOf: string;
  /** Optional human note: units, method, caveat. Never a number. */
  readonly note?: string;
}

/** A value that was not obtained. Carries why, never a substitute. */
export interface EvidenceAbsent {
  readonly status: "MISSING";
  readonly reason: string;
  readonly source?: string;
  readonly asOf?: string;
}

export type Evidence<T> = EvidencePresent<T> | EvidenceAbsent;

// ---------------------------------------------------------------------------
// Constructors and guards
// ---------------------------------------------------------------------------

export function real<T>(value: T, source: string, asOf: string, note?: string): EvidencePresent<T> {
  return note === undefined
    ? { status: "REAL", value, source, asOf }
    : { status: "REAL", value, source, asOf, note };
}

export function derived<T>(value: T, source: string, asOf: string, note?: string): EvidencePresent<T> {
  return note === undefined
    ? { status: "DERIVED", value, source, asOf }
    : { status: "DERIVED", value, source, asOf, note };
}

export function missing<T = never>(reason: string, source?: string, asOf?: string): EvidenceAbsent {
  const out: { status: "MISSING"; reason: string; source?: string; asOf?: string } = {
    status: "MISSING",
    reason,
  };
  if (source !== undefined) out.source = source;
  if (asOf !== undefined) out.asOf = asOf;
  return out;
}

export function isPresent<T>(e: Evidence<T>): e is EvidencePresent<T> {
  return e.status === "REAL" || e.status === "DERIVED";
}

export function isMissing<T>(e: Evidence<T>): e is EvidenceAbsent {
  return e.status === "MISSING";
}

/**
 * Read a value or throw. Use inside the probability path: a MISSING field that
 * reaches arithmetic is a bug, and it must be loud rather than NaN.
 */
export function requireValue<T>(e: Evidence<T>, field: string): T {
  if (isPresent(e)) return e.value;
  throw new MissingEvidenceError(field, e.reason);
}

export class MissingEvidenceError extends Error {
  readonly field: string;
  readonly reason: string;
  constructor(field: string, reason: string) {
    super(`MISSING_DATA: ${field} (${reason})`);
    this.name = "MissingEvidenceError";
    this.field = field;
    this.reason = reason;
  }
}

// ---------------------------------------------------------------------------
// Domain records carried inside Evidence<T>
// ---------------------------------------------------------------------------

export interface InjuryRecord {
  readonly playerName: string;
  readonly team: string;
  readonly position: string;
  readonly reportStatus: string;
  readonly practiceStatus: string | null;
  readonly primaryInjury: string | null;
}

export interface WeatherRecord {
  readonly temperatureF: number;
  readonly windMph: number;
  readonly windDirectionDeg: number | null;
  readonly precipitationChance: number | null;
  readonly condition: string;
  readonly isDome: boolean;
}

export interface RestRecord {
  readonly homeRestDays: number;
  readonly awayRestDays: number;
  readonly homeBackToBack: boolean;
  readonly awayBackToBack: boolean;
}

export interface TeamFormRecord {
  readonly team: string;
  readonly gamesPlayed: number;
  readonly offEpaPerPlay: number;
  readonly defEpaPerPlay: number;
  readonly passEpaPerPlay: number;
  readonly rushEpaPerPlay: number;
  /** Null when the source does not carry it. Never a substituted zero. */
  readonly successRate: number | null;
  /** Null when the source does not carry it. Never a substituted zero. */
  readonly pointsPerGame: number | null;
  /** Null when the source does not carry it. Never a substituted zero. */
  readonly pointsAllowedPerGame: number | null;
  /** Weeks actually covered by the source, e.g. [1, 7]. */
  readonly weeksCovered: readonly [number, number];
}

export interface ChartingRecord {
  readonly team: string;
  readonly sackRateAllowedPct: number;
  readonly pressureRateAllowedPct: number;
  readonly passBlockWinRate: number;
  readonly runBlockWinRate: number;
  readonly weeksCovered: readonly [number, number];
}

export interface CoachingRecord {
  readonly team: string;
  readonly headCoach: string;
  readonly offensiveCoordinator: string | null;
  readonly defensiveCoordinator: string | null;
  readonly fourthDownAggression: number | null;
}

export interface CorpusCitation {
  readonly uri: string;
  readonly title: string;
  readonly score: number;
}

export interface CorpusGroundingRecord {
  readonly facet: string;
  readonly support: number;
  readonly citations: readonly CorpusCitation[];
}

export interface JevSpineRecord {
  readonly gameId: string;
  readonly generatedAt: string;
  readonly contentHash: string;
  readonly snapCount: number;
  /** e.g. "UNVALIDATED_CLASSIFIER_SHADOW". Never presented as measured data. */
  readonly label: string;
  /** Always 0 until the spine is validated against settled outcomes. */
  readonly emissionWeight: number;
  /** The delta the spine would have contributed. Logged, never applied. */
  readonly diagnosticDelta: number;
}

// ---------------------------------------------------------------------------
// The bundle
// ---------------------------------------------------------------------------

export interface GameIdentity {
  readonly gameId: string;
  readonly sport: string;
  readonly league: string;
  readonly season: number;
  readonly week: number;
  /** Canonical team code, e.g. "LAR" — never "LA". */
  readonly homeTeam: string;
  readonly awayTeam: string;
  /** ISO-8601 UTC kickoff. */
  readonly commenceTime: string;
  readonly venue: Evidence<string>;
}

export interface MarketEvidence {
  /** Home-perspective spread. Negative = home favoured. */
  readonly spread: Evidence<number>;
  readonly total: Evidence<number>;
  readonly homeMoneyline: Evidence<number>;
  readonly awayMoneyline: Evidence<number>;
  /** De-vigged consensus home win probability. The prior. */
  readonly consensusNoVigHome: Evidence<number>;
  readonly bookmakerCount: Evidence<number>;
  /** Best available price for the home side, American. */
  readonly bestHomePrice: Evidence<number>;
  readonly bestAwayPrice: Evidence<number>;
}

export interface GameEvidenceBundle {
  readonly identity: GameIdentity;
  readonly market: MarketEvidence;
  readonly injuries: Evidence<readonly InjuryRecord[]>;
  readonly weather: Evidence<WeatherRecord>;
  readonly rest: Evidence<RestRecord>;
  readonly homeForm: Evidence<TeamFormRecord>;
  readonly awayForm: Evidence<TeamFormRecord>;
  readonly homeCharting: Evidence<ChartingRecord>;
  readonly awayCharting: Evidence<ChartingRecord>;
  readonly homeCoaching: Evidence<CoachingRecord>;
  readonly awayCoaching: Evidence<CoachingRecord>;
  readonly corpus: Evidence<readonly CorpusGroundingRecord[]>;
  readonly jev: Evidence<JevSpineRecord>;
  /** ISO-8601 UTC instant the bundle was assembled. */
  readonly builtAt: string;
  /** Code identity, e.g. "v5.3.1+evidence-spine.1". */
  readonly codeVersion: string;
}

// ---------------------------------------------------------------------------
// Verdicts
// ---------------------------------------------------------------------------

/**
 * The only outcomes a pregame run may report.
 *
 * MISSING_DATA — required evidence absent or stale; nothing downstream ran.
 * PASS         — evidence complete, the decision gate refused.
 * NO_BET       — evidence complete, edge below the threshold.
 * SHADOW       — computed and sealed, weight zero, not publishable.
 */
export type PregameVerdict = "MISSING_DATA" | "PASS" | "NO_BET" | "SHADOW";

/** Publication is a separate authority from the verdict. Always false today. */
export interface PublicationAuthority {
  readonly publishable: boolean;
  readonly blockedBy: readonly string[];
}
