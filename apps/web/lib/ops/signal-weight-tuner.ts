/**
 * Signal weight tuner — the PRODUCTION caller of `tuneSignalWeights`.
 *
 * WHY THIS FILE EXISTS. `docs/ops/wiring-backlog-2026-10-01.md` Tier 1 item 4
 * measured the defect precisely: "`tuneSignalWeights` + team crosswalk — the
 * 'weight' step. Zero non-test callers (barrel export only)." #924 shipped
 * `tune-signal-weights.ts`, exported it, tested it — and nothing in the product
 * ever called it. The consequence is not an untested function, it is a FALSE
 * NUMBER in the ledger: `signal-scale-fit.ts` recorded that on every one of
 * 118,462 persisted `signals` rows, `weight = 1` and `confidence = 1`, a uniform
 * 1 asserted across ten keys whose raw readings span a 103x range of standard
 * deviations. A signal with weight 1 because nothing ever measured it is
 * indistinguishable, in the row, from a signal with weight 1 because it is the
 * strongest thing in the table.
 *
 * WHAT IT DOES. It reads the persisted `signals` rows, joins each to a SETTLED
 * outcome, and hands the resulting sample to `measureSignalWeights` (which
 * calls `tuneSignalWeights`). The output is a `SignalWeightTable` the composer
 * can read per key.
 *
 * THE SETTLED OUTCOME. A reading with no outcome behind it is not evidence, so
 * every observation is one signal reading plus the next week's settled result
 * for the SAME player. The outcome is `player_game_stats.fantasyPointsPpr` above
 * the population median — identical to the target `fit-signal-scales.mjs` fits
 * against, chosen deliberately so the two fits are comparable rather than
 * competing. It is a defensible proxy and NOT a truth: it says "did this player
 * beat the median next week", not "did this reading win the game". A team-level
 * key has no player-side analogue and is therefore refused rather than joined to
 * something adjacent.
 *
 * NO TEAM CROSSWALK IS NEEDED HERE, and that is a design choice rather than luck.
 * `docs/ops/AGENT_LEDGER.md` row TUNE-BLOCK-1 marked this tuner BLOCKED on a
 * player-to-game crosswalk that does not exist in this repo, measured at ZERO
 * joinable rows across all 3,451 settled picks: `depth_chart_entries.team` is an
 * abbreviation while `games.homeTeamName` is a full name, no table joins them,
 * and every depth-chart row is season-week 0 so a week-join cannot match by
 * construction. This module never uses settled PICKS, so it never touches that
 * broken join. It joins `signals` to `player_game_stats` on `playerId` + season +
 * week — one player in, that same player's next-week score out. Both sides are
 * already keyed by playerId, so the join is exact and needs no bridge.
 *
 * CONSEQUENCE, STATED PLAINLY SO IT IS NOT OVERSTATED LATER. The outcome is a
 * PLAYER outcome, so this measures whether a reading predicted that player's
 * next game — not whether it predicted a bet or a game result. It is not a
 * pick-level claim and must never be quoted as one. Team-keyed signals have no
 * player-side analogue here and are refused and counted (`droppedTeamLevel`)
 * rather than bridged through a name map that does not exist.
 *
 * THE FIXTURE KEY IS `${season}w${week}`, REQUIRED AND NEVER GUESSED. #924's
 * grouped module (`tune-signal-weights-grouped.ts`) is explicit that `clusterKey`
 * cannot be defaulted to a row id, because a wrong group key silently
 * reintroduces the inflation the module exists to remove. Season x week is the
 * finest fixture identity this schema carries, and it is stated in the report so
 * a reader can dispute it on the evidence instead of guessing.
 *
 * SEASON ROLLOVER IS A REAL EDGE. NFL week 18 is followed by a DIFFERENT season's
 * week 1, so `week + 1` is not a valid successor across a season boundary. Those
 * rows are DROPPED and counted (`droppedSeasonRollover`) rather than joined to
 * season N+1 week 2, which would silently pair a reading with a game that never
 * followed it.
 *
 * LAWS OBSERVED:
 * - READ-ONLY. It selects from `signals` and `player_game_stats` and writes
 *   NOTHING — not to `signals`, not to any table, not to disk. Persisting a
 *   measured weight into the ledger is a separate, founder-gated step; see
 *   "WHY IT DOES NOT WRITE" below.
 * - No gate, no env flag, no schema change, no MODEL_VERSION change, no
 *   `Math.random`, no wall clock. Same data in, same table out.
 * - PUSH/VOID are never coerced: a next-week row with a NULL `fantasyPointsPpr`
 *   is not a settled outcome, so it is skipped and counted, not read as a 0.
 * - The Prisma client is INJECTED, never imported, so this module is unit-tested
 *   with no DATABASE_URL.
 *
 * WHY IT DOES NOT WRITE `signals`. The write is a real commitment with its own
 * review, and three reasons in order of force: (1) the repo's own lesson —
 * `gate_decisions` had three readers and no writer for 94 days, and code that
 * reads a source nothing writes is worse than no code; (2) the weight is a
 * function of a population that moves daily, so persisting today's fit makes a
 * moving quantity look like a constant; (3) the publish path is a separate
 * surface with its own gate. The TABLE is the deliverable. Making the ledger
 * read its weights from a fitted table is a small follow-up with the evidence
 * already banked.
 */

import {
  measureSignalWeights,
  MIN_FIXTURES,
  type FixtureKeyOutcome,
  type MeasuredKeyWeight,
  type SignalWeightTable,
} from "@sports/prediction-engine";

/** The subset of the Prisma client this module needs. Injected, never imported. */
export interface SignalWeightTunerDb {
  signal: {
    findMany(args: unknown): Promise<
      ReadonlyArray<{
        key: string;
        entityType: string;
        entityId: string;
        value: number;
        season: number;
        week: number;
      }>
    >;
  };
  playerGameStat: {
    findMany(args: unknown): Promise<
      ReadonlyArray<{
        playerId: string;
        season: number;
        week: number;
        seasonType?: string | null;
        fantasyPointsPpr: number | null;
      }>
    >;
  };
}

export interface TuneSignalWeightsOptions {
  /** Cap on `signals` rows read. Bounds cron runtime on a growing ledger. */
  readonly maxSignals?: number;
  /** Cap on `player_game_stats` rows read for the outcome join. */
  readonly maxOutcomes?: number;
  /** Row floor handed to the tuner. Defaults to the engine's `MIN_SAMPLES`. */
  readonly minSamples?: number;
  /** Distinct-fixture floor. Defaults to the engine's `MIN_FIXTURES`. */
  readonly minFixtures?: number;
  /** Version string recorded on the table. */
  readonly version?: string;
  /** Population description recorded on the table. */
  readonly source?: string;
}

const DEFAULT_MAX_SIGNALS = 50_000;
const DEFAULT_MAX_OUTCOMES = 50_000;

/** A `season`/`week` pair is the fixture identity this schema carries. */
function fixtureKey(season: number, week: number): string {
  return `${season}w${week}`;
}

export interface SignalWeightTuningReport extends SignalWeightTable {
  /** `signals` rows read, before the join drops any. */
  readonly signalsRead: number;
  /** `player_game_stats` rows read for the outcome join. */
  readonly outcomesRead: number;
  /** Observations handed to the tuner. */
  readonly sampleSize: number;
  /** Settled threshold: the population median next-week PPR. */
  readonly outcomeThreshold: number;
  /** Base rate of the outcome, so a lopsided target is visible in the report. */
  readonly outcomeBaseRate: number;
  /** Rows dropped because the key is team-level and has no player-side outcome. */
  readonly droppedTeamLevel: number;
  /** Rows dropped because `week + 1` crosses a season boundary. */
  readonly droppedSeasonRollover: number;
  /** Rows dropped because no next-week settled outcome joined. */
  readonly droppedNoOutcome: number;
  /** Rows dropped because the entity has no stats at all. */
  readonly droppedNoEntityStats: number;
  /**
   * Outcome rows excluded because their `seasonType` is not REG. Reported so a
   * casing or vocabulary mismatch reads as "this filter did not recognise these
   * rows" rather than as "there is no evidence".
   */
  readonly excludedNonRegOutcomes: number;
  /** Keys with at least one reading, whether or not any outcome joined. */
  readonly keysPresent: readonly string[];
  /**
   * Keys present in the `signals` read that never produced a joined sample, so
   * they have no measured entry. A key here is not a dead producer and it is
   * not a key the tuner weighed and set to 0: it was dropped before the fit
   * (team-level, no stats, season rollover, or no next-week outcome). Those
   * drops and a measured weight of 0 have opposite fixes, so they are not the
   * same list.
   */
  readonly unjoinableKeys: readonly string[];
}

/** Median of a numeric population. Even counts average the two middle values. */
export function medianOf(values: readonly number[]): number {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 1 ? (sorted[mid] as number) : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
}

/**
 * Read `signals`, join each reading to its next settled outcome, and fit a
 * weight per key.
 *
 * Reads only. Returns the table plus every drop count, so a key at weight 0 can
 * be traced to a missing producer, a missing outcome, or an insufficient fixture
 * count — three problems with three different fixes, which a bare weight table
 * would collapse into one.
 */
export async function tuneSignalWeightsFromLedger(
  db: SignalWeightTunerDb,
  options: TuneSignalWeightsOptions = {},
): Promise<SignalWeightTuningReport> {
  const maxSignals = options.maxSignals ?? DEFAULT_MAX_SIGNALS;
  const maxOutcomes = options.maxOutcomes ?? DEFAULT_MAX_OUTCOMES;

  const [signals, stats] = await Promise.all([
    db.signal.findMany({
      take: maxSignals,
      orderBy: [{ season: "desc" }, { week: "desc" }],
      select: { key: true, entityType: true, entityId: true, value: true, season: true, week: true },
    }),
    db.playerGameStat.findMany({
      take: maxOutcomes,
      orderBy: [{ season: "desc" }, { week: "desc" }],
      select: { playerId: true, season: true, week: true, seasonType: true, fantasyPointsPpr: true },
    }),
  ]);

  // Outcome index: player x (season, week) -> PPR. POST rows are EXCLUDED from
  // the threshold population, not silently mixed into it — a playoff game is a
  // different competition from a regular-season one, and averaging the two makes
  // the median mean neither. REG is the population the median describes.
  //
  // The comparison is CASE-INSENSITIVE and the excluded count is REPORTED. A
  // strict `=== "REG"` looked harmless because the Prisma schema types the
  // column non-null with a default of "REG" — but a casing variant (`reg`,
  // `Reg`) would then drop EVERY row, and the tuner would report "no key has a
  // joinable outcome" when the truth is "no key has a season this filter
  // recognises". That is an unjoinable producer masquerading as a real answer,
  // so the count exists to make the two distinguishable.
  const outcomeByFixture = new Map<string, number>();
  const regPpr: number[] = [];
  let excludedNonReg = 0;
  for (const r of stats) {
    if (String(r.seasonType ?? "REG").trim().toUpperCase() !== "REG") {
      excludedNonReg += 1;
      continue;
    }
    if (typeof r.fantasyPointsPpr !== "number" || !Number.isFinite(r.fantasyPointsPpr)) continue;
    outcomeByFixture.set(`${r.playerId}|${fixtureKey(r.season, r.week)}`, r.fantasyPointsPpr);
    regPpr.push(r.fantasyPointsPpr);
  }

  const threshold = medianOf(regPpr);
  const aboveThreshold = regPpr.filter((v) => v > threshold).length;

  let droppedTeamLevel = 0;
  let droppedSeasonRollover = 0;
  let droppedNoOutcome = 0;
  let droppedNoEntityStats = 0;

  const sample: FixtureKeyOutcome[] = [];
  const keysPresent = new Set<string>();
  const entitiesWithStats = new Set<string>();
  for (const r of stats) entitiesWithStats.add(r.playerId);

  for (const s of signals) {
    keysPresent.add(s.key);
    // A team key cannot join to a per-player fantasy outcome. Refused, counted.
    if (s.entityType !== "player") {
      droppedTeamLevel += 1;
      continue;
    }
    if (!entitiesWithStats.has(s.entityId)) {
      droppedNoEntityStats += 1;
      continue;
    }
    // Week 18's successor is the next season's week 1, so `week + 1` is not a
    // valid successor here. Dropped and counted rather than mis-joined.
    if (s.week >= 18) {
      droppedSeasonRollover += 1;
      continue;
    }
    const nextPpr = outcomeByFixture.get(`${s.entityId}|${fixtureKey(s.season, s.week + 1)}`);
    // A NULL next-week PPR is NOT a settled outcome. Reading it as 0 would
    // manufacture a loss from missing data, which is the inversion the whole
    // populator's drop-rather-than-default rule exists to prevent.
    if (nextPpr === undefined) {
      droppedNoOutcome += 1;
      continue;
    }
    sample.push({
      key: s.key,
      value: s.value,
      outcome: nextPpr > threshold ? 1 : 0,
      fixtureKey: fixtureKey(s.season, s.week),
    });
  }

  const table = measureSignalWeights(sample, {
    ...(options.minSamples !== undefined ? { minSamples: options.minSamples } : {}),
    ...(options.minFixtures !== undefined ? { minFixtures: options.minFixtures } : {}),
    ...(options.version !== undefined ? { version: options.version } : {}),
    ...(options.source !== undefined ? { source: options.source } : {}),
  });

  const measuredKeys = new Set(table.entries.map((e) => e.key));
  // `table.entries` only contains keys that reached the tuner, and every such
  // key has at least one usable sample, so `fixtures === 0` never matches.
  // An unjoinable key is one we saw and then dropped before the fit.
  const unjoinableKeys = [...keysPresent].filter((k) => !measuredKeys.has(k)).sort();

  return {
    ...table,
    signalsRead: signals.length,
    outcomesRead: stats.length,
    sampleSize: sample.length,
    outcomeThreshold: threshold,
    outcomeBaseRate: regPpr.length > 0 ? aboveThreshold / regPpr.length : Number.NaN,
    droppedTeamLevel,
    droppedSeasonRollover,
    droppedNoOutcome,
    droppedNoEntityStats,
    excludedNonRegOutcomes: excludedNonReg,
    keysPresent: [...keysPresent].sort(),
    unjoinableKeys,
  };
}

/** JSON-safe view of an entry. Omits nothing — the numbers ARE the report. */
export function toJsonEntry(e: MeasuredKeyWeight): Record<string, unknown> {
  return {
    key: e.key,
    rows: e.rows,
    fixtures: e.fixtures,
    correlation: Number(e.correlation.toFixed(6)),
    rowMultiplier: Number(e.rowMultiplier.toFixed(6)),
    inflation: Number(e.inflation.toFixed(4)),
    weight: Number(e.weight.toFixed(6)),
    verdict: e.verdict,
    reason: e.reason,
    readings: {
      min: Number(e.readings.min.toFixed(6)),
      max: Number(e.readings.max.toFixed(6)),
      spread: Number(e.readings.spread.toFixed(6)),
    },
  };
}

export { MIN_FIXTURES };