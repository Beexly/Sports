/**
 * THE UNIVERSAL EVENT GENOME — GSE's rights-safe answer to the match page (multi-sport).
 *
 * Scores24 shows a betting page; GSE shows the living anatomy of an event — where every number can
 * explain its source, its time, its authority, its weakness, and its decision-use. This is the data
 * spine: one genome that renders soccer, baseball, and gridiron (CFL/American), with adapters for the
 * period structure of each sport and a generic fallback. Every genome is `fixtureWatermarked` — no live
 * data, no network, no scraped or third-party-page-derived content (Scores24 is competitive-research
 * inspiration only, never a data source).
 *
 * Reuse, not parallel systems: stat/trend passports reuse `stat-foundry`'s lifecycle discipline;
 * authority reuses `composeAuthority`; decisions map onto the canonical `DecisionState` grammar.
 *
 * Pure + deterministic. No I/O, no clock, no network. Spec: docs/product/MATCH_GENOME_SYSTEM.md.
 */

export type Sport = "soccer" | "baseball" | "football" | "basketball" | "hockey" | "tennis" | "esports" | "generic";
export type EventStatus = "UPCOMING" | "LIVE" | "ENDED" | "POSTPONED" | "CANCELLED";

/** How a sport is segmented in time — the adapter's core knowledge. */
export interface PeriodSchema {
  readonly kind: "CONTINUOUS_HALVES" | "INNINGS" | "QUARTERS" | "PERIODS" | "SETS" | "MAPS" | "GENERIC";
  /** Ordered segment labels, e.g. ["1H","2H"] · ["1".."9"] · ["Q1".."Q4"]. */
  readonly segments: readonly string[];
  readonly clockType: "RUNNING_UP" | "RUNNING_DOWN" | "DISCRETE";
  readonly regulationSegments: number;
}

export interface Participant {
  readonly id: string;
  readonly name: string;
  readonly side: "HOME" | "AWAY";
  readonly abbrev?: string;
}

export interface PeriodScore {
  readonly period: string;
  readonly home: number;
  readonly away: number;
}

export interface ScoreState {
  readonly home: number;
  readonly away: number;
  readonly periodScores: readonly PeriodScore[];
  readonly final: boolean;
}

export interface TimelineEvent {
  /** Minute (soccer), inning (baseball), or clock marker (gridiron). */
  readonly marker: string;
  readonly type: "GOAL" | "RUN" | "TOUCHDOWN" | "FIELD_GOAL" | "CARD" | "SUB" | "PENALTY" | "VAR" | "NOTE";
  readonly side: "HOME" | "AWAY" | "NEUTRAL";
  readonly subject: string;
  readonly detail?: string;
  /** Was this knowable at the point-in-time it claims? (light-cone honesty.) */
  readonly knownAtMarker: boolean;
}

export interface OddsExample {
  readonly market: string;
  readonly selection: string;
  readonly price: number; // decimal odds
  readonly bookCount: number;
  readonly observedAtLabel: string;
}

export interface PredictionExample {
  readonly market: string;
  readonly selection: string;
  readonly narrative: string;
}

export interface StandingsRow {
  readonly team: string;
  readonly rank: number;
  readonly record: string;
}

/** The genome. Sport-specific numbers live in `stats` (a flat bag the adapter knows how to read). */
export interface UniversalEventGenome {
  readonly eventId: string;
  readonly sport: Sport;
  readonly league: string;
  readonly tournament?: string;
  readonly region?: string;
  readonly season?: string;
  readonly stage?: string;
  readonly participants: readonly [Participant, Participant];
  readonly venue?: string;
  readonly weather?: string;
  readonly officials?: string;
  readonly startTimeLabel: string;
  readonly status: EventStatus;
  readonly periodSchema: PeriodSchema;
  readonly scoreState: ScoreState;
  readonly timeline: readonly TimelineEvent[];
  /** Flat, sport-specific stat bag (e.g. { possessionHome: 39, xgHome: 1.99, ... }). */
  readonly stats: Readonly<Record<string, number | string>>;
  readonly standingsContext?: readonly StandingsRow[];
  readonly h2hContext?: string;
  readonly recentForm?: string;
  readonly odds: readonly OddsExample[];
  readonly predictions: readonly PredictionExample[];
  /** Non-negotiable: every genome here is a fixture. */
  readonly fixtureWatermarked: true;
}

// ───────────────────────── Sport adapters ─────────────────────────
export interface SportAdapter {
  readonly sport: Sport;
  readonly periodSchema: PeriodSchema;
  /** One-line score summary, sport-aware. */
  scoreSummary(g: UniversalEventGenome): string;
  /** The headline stats a reader expects for this sport (key → label), missing-safe. */
  keyStatKeys(): ReadonlyArray<{ key: string; label: string }>;
}

const SOCCER_SCHEMA: PeriodSchema = { kind: "CONTINUOUS_HALVES", segments: ["1H", "2H"], clockType: "RUNNING_UP", regulationSegments: 2 };
const BASEBALL_SCHEMA: PeriodSchema = { kind: "INNINGS", segments: ["1", "2", "3", "4", "5", "6", "7", "8", "9"], clockType: "DISCRETE", regulationSegments: 9 };
const GRIDIRON_SCHEMA: PeriodSchema = { kind: "QUARTERS", segments: ["Q1", "Q2", "Q3", "Q4"], clockType: "RUNNING_DOWN", regulationSegments: 4 };
const GENERIC_SCHEMA: PeriodSchema = { kind: "GENERIC", segments: ["FULL"], clockType: "DISCRETE", regulationSegments: 1 };

function homeAway(g: UniversalEventGenome): [Participant, Participant] {
  const home = g.participants.find((p) => p.side === "HOME") ?? g.participants[0];
  const away = g.participants.find((p) => p.side === "AWAY") ?? g.participants[1];
  return [home, away];
}

export const SoccerAdapter: SportAdapter = {
  sport: "soccer",
  periodSchema: SOCCER_SCHEMA,
  scoreSummary(g) {
    const [h, a] = homeAway(g);
    return `${h.name} ${g.scoreState.home}–${g.scoreState.away} ${a.name}`;
  },
  keyStatKeys: () => [
    { key: "possessionHome", label: "Possession (H)" },
    { key: "xgHome", label: "xG (H)" },
    { key: "xgAway", label: "xG (A)" },
    { key: "shotsHome", label: "Shots (H)" },
    { key: "shotsOnTargetHome", label: "On target (H)" },
    { key: "cornersHome", label: "Corners (H)" },
    { key: "foulsHome", label: "Fouls (H)" },
    { key: "yellowsHome", label: "Yellows (H)" },
  ],
};

export const BaseballAdapter: SportAdapter = {
  sport: "baseball",
  periodSchema: BASEBALL_SCHEMA,
  scoreSummary(g) {
    const [h, a] = homeAway(g);
    return `${a.name} ${g.scoreState.away} @ ${h.name} ${g.scoreState.home}`;
  },
  keyStatKeys: () => [
    { key: "starterHome", label: "Starter (H)" },
    { key: "starterAway", label: "Starter (A)" },
    { key: "hitsHome", label: "Hits (H)" },
    { key: "hitsAway", label: "Hits (A)" },
    { key: "errorsHome", label: "Errors (H)" },
    { key: "errorsAway", label: "Errors (A)" },
  ],
};

export const FootballCflAdapter: SportAdapter = {
  sport: "football",
  periodSchema: GRIDIRON_SCHEMA,
  scoreSummary(g) {
    const [h, a] = homeAway(g);
    return `${a.name} ${g.scoreState.away} @ ${h.name} ${g.scoreState.home}`;
  },
  keyStatKeys: () => [
    { key: "spread", label: "Spread" },
    { key: "total", label: "Total" },
    { key: "ppgHome", label: "PPG (H)" },
    { key: "ppgAway", label: "PPG (A)" },
    { key: "paHome", label: "Pts allowed (H)" },
    { key: "paAway", label: "Pts allowed (A)" },
  ],
};

const GenericAdapter: SportAdapter = {
  sport: "generic",
  periodSchema: GENERIC_SCHEMA,
  scoreSummary(g) {
    const [h, a] = homeAway(g);
    return `${h.name} ${g.scoreState.home}–${g.scoreState.away} ${a.name}`;
  },
  keyStatKeys: () => [],
};

const ADAPTERS: Readonly<Record<Sport, SportAdapter>> = {
  soccer: SoccerAdapter,
  baseball: BaseballAdapter,
  football: FootballCflAdapter,
  basketball: GenericAdapter,
  hockey: GenericAdapter,
  tennis: GenericAdapter,
  esports: GenericAdapter,
  generic: GenericAdapter,
};

/** Resolve the adapter for a genome (generic fallback for unmapped sports — degrades gracefully). */
export function adapterFor(sport: Sport): SportAdapter {
  return ADAPTERS[sport] ?? GenericAdapter;
}

/** Read a numeric stat safely (missing → 0); the genome's stat bag may omit any key. */
export function statNum(g: UniversalEventGenome, key: string): number {
  const v = g.stats[key];
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

/** Read a stat as text safely (missing → "—"). */
export function statStr(g: UniversalEventGenome, key: string): string {
  const v = g.stats[key];
  return v === undefined || v === null ? "—" : String(v);
}

/** Is this genome safe to treat as anything but a fixture? Always false here — by construction. */
export function isLive(_g: UniversalEventGenome): false {
  return false;
}
