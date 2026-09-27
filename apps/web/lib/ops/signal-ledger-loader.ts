/**
 * Signal-ledger production loader — the call site #924 never had.
 *
 * V3-350 (`signal-ledger-sources.ts`) projects entity rows into ledger
 * candidates and V3-351 (`signal-anchor-census.ts`) measures the anchors they
 * need, but until now nothing read the DATABASE: `signals` has held 0 rows
 * since it was created, and `composeLedger` had no production caller. This
 * module is that reader.
 *
 * It is deliberately NOT a writer. It returns a report; the cron route decides
 * what to do with it. Keeping the read and the write in separate modules is
 * what makes "this job writes nothing to the ledger" checkable by reading
 * rather than by trusting a comment.
 *
 * MEASURED on prod 2026-09-27 (read-only, hermes_ro): the four source tables
 * hold player_game_stats 35,168 / snap_counts 29,513 / injuries 6,501 /
 * next_gen_stats 2,718 rows, and `signals` holds 0. The census below is what
 * decides which of those rows can earn a normalized reading at all.
 */

import type { LedgerCandidate } from "@sports/prediction-engine";
import {
  censusAnchors,
  formatCensusReport,
  projectInjuries,
  projectNextGenStats,
  projectPlayerGameStats,
  projectSnapCounts,
  type AnchorTable,
  type CensusObservation,
  type CensusReport,
} from "@sports/prediction-engine";

/**
 * Prisma returns `DateTime` as a Date on a normal request, but a serialized /
 * worker / cached client can hand back the ISO string instead. The loader
 * accepts both rather than asserting one and crashing at runtime on a shape
 * the type system promised would not happen.
 */
export type DateLike = Date | string;

/** ISO-8601 for either representation. Never `new Date()` — that is a wall clock. */
function toIso(value: DateLike): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

/** The subset of the Prisma client this loader needs. Injected, never imported. */
export interface SignalLedgerDb {
  playerGameStat: {
    findMany(args: unknown): Promise<
      ReadonlyArray<{
        playerId: string;
        season: number;
        week: number;
        targetShare: number | null;
        fantasyPointsPpr: number | null;
        passingEpa: number | null;
        rushingEpa: number | null;
        receivingEpa: number | null;
        fetchedAt: DateLike;
      }>
    >;
  };
  snapCount: {
    findMany(args: unknown): Promise<
      ReadonlyArray<{
        playerId: string | null;
        pfrPlayerId: string | null;
        season: number;
        week: number;
        offensePct: number | null;
        stPct: number | null;
        defensePct: number | null;
        fetchedAt: DateLike;
      }>
    >;
  };
  nextGenStat: {
    findMany(args: unknown): Promise<
      ReadonlyArray<{
        gsisId: string;
        season: number;
        week: number;
        statType: string;
        cpoe: number | null;
        completionPct: number | null;
        expectedCompletionPct: number | null;
        avgAirYardsToSticks: number | null;
        avgSeparation: number | null;
        avgYacAboveExpectation: number | null;
        fetchedAt: DateLike;
      }>
    >;
  };
  injury: {
    findMany(args: unknown): Promise<
      ReadonlyArray<{
        playerId: string | null;
        gsisId: string | null;
        season: number;
        week: number;
        reportStatus: string | null;
        practiceStatus: string | null;
        fetchedAt: DateLike;
      }>
    >;
  };
}

/** Every signal key the four adapters can emit. The census is driven by this. */
export const LEDGER_KEYS: readonly string[] = [
  // These MUST match, character for character, the strings the adapters emit.
  // A census driven by a key nothing emits reports "insufficient-rows" forever,
  // which in the ops report is indistinguishable from a dead producer — that is
  // a silent failure, and it is exactly what happened the first time.
  // Read from signal-ledger-sources.ts: pgs/snap/injury are literals; ngs is
  // `ngs.${statType}.${metric}` over metric in
  // {cpoe, avg_separation, yac_above_expectation, air_yards_to_sticks}.
  "pgs.target_share",
  "pgs.fantasy_ppr",
  "pgs.passing_epa",
  "pgs.rushing_epa",
  "pgs.receiving_epa",
  "snap.offense_pct",
  "snap.st_pct",
  "snap.defense_pct",
  "ngs.passing.cpoe",
  "ngs.passing.avg_separation",
  "ngs.passing.yac_above_expectation",
  "ngs.passing.air_yards_to_sticks",
  "ngs.receiving.cpoe",
  "ngs.receiving.avg_separation",
  "ngs.receiving.yac_above_expectation",
  "ngs.receiving.air_yards_to_sticks",
  "ngs.rushing.cpoe",
  "ngs.rushing.avg_separation",
  "ngs.rushing.yac_above_expectation",
  "ngs.rushing.air_yards_to_sticks",
  // Emitted by projectInjuries. Listed here so the coverage invariant holds;
  // its anchor is DECLARED (ordinal scale), not fitted — see below.
  "injury.availability",
];

export interface LedgerLoadReport {
  /** Rows read per source table, BEFORE any projection drops. */
  readonly rowsRead: {
    readonly playerGameStats: number;
    readonly snapCounts: number;
    readonly nextGenStats: number;
    readonly injuries: number;
  };
  /** Non-null readings per key — the census INPUT, not the projection. */
  readonly observations: readonly CensusObservation[];
  readonly census: CensusReport;
  /** Candidates that survived anchor gating. Zero is a legitimate, reportable answer. */
  readonly candidates: readonly LedgerCandidate[];
  readonly anchors: AnchorTable;
  /** Plain-text census, for the ops artifact. */
  readonly censusText: string;
}

export interface LoadOptions {
  /** Cap per source table. Bounds cron runtime on a growing ledger. */
  readonly maxRowsPerTable?: number;
  /** Census row floor; defaults to the module's own MIN_CENSUS_ROWS. */
  readonly minCensusRows?: number;
}

const DEFAULT_MAX_ROWS = 20_000;

/**
 * Read the four populated entity tables, measure the anchor per signal key,
 * and project the rows the census can support.
 *
 * ORDER MATTERS and is load-bearing: the census must run over the FULL
 * non-null population BEFORE the projection, because projection drops any row
 * lacking an anchor. Measuring first and projecting second is what makes the
 * anchor a property of the population rather than of the sample that happened
 * to survive.
 */
export async function loadSignalLedger(
  db: SignalLedgerDb,
  options: LoadOptions = {},
): Promise<LedgerLoadReport> {
  const maxRows = options.maxRowsPerTable ?? DEFAULT_MAX_ROWS;
  const rowsRead = { playerGameStats: 0, snapCounts: 0, nextGenStats: 0, injuries: 0 };

  const observations: CensusObservation[] = [];
  const push = (key: string, value: number | null): void => {
    // A NULL reading is counted as PRESENTED but contributes no value, so the
    // census can report coverage honestly instead of calling it "no rows".
    if (typeof value === "number" && Number.isFinite(value)) {
      observations.push({ key, value });
    }
  };

  const [pgs, snaps, ngs, injuries] = await Promise.all([
    db.playerGameStat.findMany({ take: maxRows, orderBy: { fetchedAt: "desc" } }),
    db.snapCount.findMany({ take: maxRows, orderBy: { fetchedAt: "desc" } }),
    db.nextGenStat.findMany({ take: maxRows, orderBy: { fetchedAt: "desc" } }),
    db.injury.findMany({ take: maxRows, orderBy: { fetchedAt: "desc" } }),
  ]);

  rowsRead.playerGameStats = pgs.length;
  rowsRead.snapCounts = snaps.length;
  rowsRead.nextGenStats = ngs.length;
  rowsRead.injuries = injuries.length;

  for (const r of pgs) {
    push("pgs.target_share", r.targetShare);
    push("pgs.fantasy_ppr", r.fantasyPointsPpr);
    push("pgs.passing_epa", r.passingEpa);
    push("pgs.rushing_epa", r.rushingEpa);
    push("pgs.receiving_epa", r.receivingEpa);
  }
  for (const r of snaps) {
    push("snap.offense_pct", r.offensePct);
    push("snap.st_pct", r.stPct);
    push("snap.defense_pct", r.defensePct);
  }
  for (const r of ngs) {
    // Key shape mirrors the adapter exactly: `ngs.${statType}.${metric}` over
    // the SAME four metrics. A null for this row is skipped, which the census
    // records as presented-but-unmeasured rather than as a missing row.
    const st = r.statType;
    if (!st) continue;
    push(`ngs.${st}.cpoe`, r.cpoe);
    push(`ngs.${st}.avg_separation`, r.avgSeparation);
    push(`ngs.${st}.yac_above_expectation`, r.avgYacAboveExpectation);
    push(`ngs.${st}.air_yards_to_sticks`, r.avgAirYardsToSticks);
  }

  // Injury is DELIBERATELY absent from the census: its availability reading is
  // an ordinal mapping (-1 Out .. +1 Active), not a measurement, so every row
  // presents the same kind of value and a fitted spread would be meaningless. It
  // gets a DECLARED scale below instead. Censusing it would produce a zero-variance
  // entry that reads as a broken producer.

  const census = censusAnchors(LEDGER_KEYS, observations, {
    ...(options.minCensusRows !== undefined ? { minRows: options.minCensusRows } : {}),
  });

  // AnchorTable is Readonly by contract, but we add the declared injury scale
  // below. Build mutable, hand out a frozen view.
  const anchors: Record<string, { anchor: number; spread: number }> = { ...census.anchors };

  // Injury availability is ordinal by construction: -1 Out .. +1 Active. Its
  // "anchor" is the neutral point (0 = at full availability) and its "spread" is
  // the full range (1), so normalizeReading is the identity on this scale. This
  // is a DECLARED scale, not a fitted one, and is labelled as such in the report
  // so nobody later mistakes it for a measurement.
  anchors["injury.availability"] = { anchor: 0, spread: 1 };

  const candidates: LedgerCandidate[] = [
    ...projectPlayerGameStats(
      pgs.map((r) => ({
        playerId: r.playerId,
        season: r.season,
        week: r.week,
        targetShare: r.targetShare,
        fantasyPointsPpr: r.fantasyPointsPpr,
        passingEpa: r.passingEpa,
        rushingEpa: r.rushingEpa,
        receivingEpa: r.receivingEpa,
        fetchedAt: toIso(r.fetchedAt),
      })),
      anchors,
    ),
    ...projectSnapCounts(
      snaps.map((r) => ({
        playerId: r.playerId,
        pfrPlayerId: r.pfrPlayerId,
        season: r.season,
        week: r.week,
        offensePct: r.offensePct,
        stPct: r.stPct,
        defensePct: r.defensePct,
        fetchedAt: toIso(r.fetchedAt),
      })),
      anchors,
    ),
    ...projectNextGenStats(
      ngs.map((r) => ({
        gsisId: r.gsisId,
        season: r.season,
        week: r.week,
        statType: r.statType,
        cpoe: r.cpoe,
        // Required by NextGenStatRow. NOT censused: the adapter emits no key for
        // them, so measuring them would create anchors nothing consumes.
        completionPct: r.completionPct,
        expectedCompletionPct: r.expectedCompletionPct,
        avgAirYardsToSticks: r.avgAirYardsToSticks,
        avgSeparation: r.avgSeparation,
        avgYacAboveExpectation: r.avgYacAboveExpectation,
        fetchedAt: toIso(r.fetchedAt),
      })),
      anchors,
    ),
    ...projectInjuries(
      injuries.map((r) => ({
        playerId: r.playerId,
        gsisId: r.gsisId,
        season: r.season,
        week: r.week,
        reportStatus: r.reportStatus,
        practiceStatus: r.practiceStatus,
        fetchedAt: toIso(r.fetchedAt),
      })),
      anchors,
    ),
  ];

  return {
    rowsRead,
    observations,
    census,
    candidates,
    anchors: Object.freeze(anchors),
    censusText: formatCensusReport(census),
  };
}
