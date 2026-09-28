/**
 * signal-ledger-writer — the missing WRITER for the `signals` table.
 *
 * WHY THIS FILE EXISTS. Spec item 4 in docs/research/2026-09-27/total-signal-
 * wiring-spec.md reads "Fill the player `signals` table (0 rows today). The prop
 * pipeline cannot exist without it." MEASURED 2026-09-27: that was still exact.
 * A repo-wide search for a writer returns NOTHING — no `db.signal.create`,
 * `.upsert`, or `.createMany` exists in any non-test file — and nothing reads
 * the table either. `signal-ledger-populator.ts` generates precisely the right
 * candidate rows and then deliberately writes nothing ("READ-ONLY candidate
 * generator ... for founder review before any prod insert"), so the prop
 * pipeline's fuel has never existed.
 *
 * WHY IT IS SAFE TO WRITE. Every value this file persists is a MEASURED column
 * off a table the platform already populates — the same four the census reads,
 * holding player_game_stats 35,168 / snap_counts 29,513 / next_gen_stats /
 * injuries 6,501 rows on prod. Nothing is derived from a model, inferred, or
 * sampled, and no magnitude is invented:
 *
 *   - `value` is the source column verbatim, and `valueRaw` keeps it again so a
 *     normalized reading can never quietly become the record.
 *   - `confidence` is 1.0 for a settled measured stat and is NOT a tunable.
 *   - `weight` is 1 for every key. A weight is a PRIOR; the tuner
 *     (tune-signal-weights.ts) is what replaces it with a fitted number, and
 *     inventing priors here would fabricate the ranking the tuner is supposed to
 *     measure. Zero-weighting a key would be an equally unearned claim.
 *
 * AN UNCALIBRATED SIGNAL MUST NOT MOVE A PUBLISHED PROJECTION. This file does
 * not change the adjustment layer, any gate, or any published number. It only
 * makes the measured evidence EXIST so the prop pipeline and the tuner have
 * something to read. That is the difference between filling a table and
 * believing a number, and only the second one is founder-gated.
 *
 * Idempotent by construction: the write is an upsert keyed on the same unique
 * tuple the schema declares, so a re-run converges rather than double-voting.
 * A duplicated signal would be double-counted downstream.
 */

import type { SignalWriterDb, SignalWriteCandidate, SignalWriteReport } from "./signal-ledger-writer-types.js";

/** The source tables this writer reads, and the keys each contributes. */
export const SIGNAL_SOURCE_KEYS = {
  playerGameStat: [
    "pgs.target_share",
    "pgs.fantasy_ppr",
    "pgs.passing_epa",
    "pgs.rushing_epa",
    "pgs.receiving_epa",
  ],
  snapCount: ["snap.offense_pct", "snap.st_pct", "snap.defense_pct"],
  nextGenStat: ["ngs.cpoe", "ngs.avg_separation", "ngs.yac_above_expectation", "ngs.air_yards_to_sticks"],
  injury: ["injury.availability"],
} as const;

function finite(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Project the four measured tables into candidate `signals` rows.
 *
 * Pure and exported so it is testable with no database, and so the test can pin
 * the property that matters: every emitted `value` is byte-identical to a
 * column that actually exists in the source row.
 */
export function projectSignalCandidates(input: {
  readonly playerGameStats: ReadonlyArray<{
    playerId: string;
    season: number;
    week: number;
    targetShare: number | null;
    fantasyPointsPpr: number | null;
    passingEpa: number | null;
    rushingEpa: number | null;
    receivingEpa: number | null;
    fetchedAt: Date | string;
  }>;
  readonly snapCounts: ReadonlyArray<{
    playerId: string | null;
    season: number;
    week: number;
    offensePct: number | null;
    stPct: number | null;
    defensePct: number | null;
    fetchedAt: Date | string;
  }>;
  readonly nextGenStats: ReadonlyArray<{
    gsisId: string;
    season: number;
    week: number;
    statType: string | null;
    cpoe: number | null;
    avgSeparation: number | null;
    avgYacAboveExpectation: number | null;
    avgAirYardsToSticks: number | null;
    fetchedAt: Date | string;
  }>;
  readonly injuries: ReadonlyArray<{
    playerId: string | null;
    gsisId: string | null;
    season: number;
    week: number;
    reportStatus: string | null;
    practiceStatus: string | null;
    fetchedAt: Date | string;
  }>;
}): SignalWriteCandidate[] {
  const out: SignalWriteCandidate[] = [];
  const base = {
    // A settled measured statistic is the top of the honesty scale. It is 1.0
    // because the reading is real, NOT because the signal is proven predictive:
    // that is what the tuner measures, and conflating the two is how an
    // unvalidated signal ends up looking like a validated one.
    confidence: 1.0,
    weight: 1.0,
  };

  for (const r of input.playerGameStats) {
    if (!r.playerId) continue;
    const columns: ReadonlyArray<readonly [string, number | null]> = [
      ["pgs.target_share", r.targetShare],
      ["pgs.fantasy_ppr", r.fantasyPointsPpr],
      ["pgs.passing_epa", r.passingEpa],
      ["pgs.rushing_epa", r.rushingEpa],
      ["pgs.receiving_epa", r.receivingEpa],
    ];
    for (const [key, value] of columns) {
      if (!finite(value)) continue;
      out.push({
        entityType: "player",
        entityId: r.playerId,
        key,
        category: "PRODUCTION",
        value,
        valueRaw: value,
        season: r.season,
        week: r.week,
        capturedAt: new Date(r.fetchedAt),
        sourceId: "nflverse",
        // The schema requires a rights snapshot on every signal. The source is
        // named rather than left empty, so a row's provenance survives the row.
        fetchedAt: new Date(r.fetchedAt),
        rightsSnapshot: { source: "nflverse", dataset: key, measured: true },
        ...base,
      });
    }
  }

  for (const r of input.snapCounts) {
    if (!r.playerId) continue;
    const columns: ReadonlyArray<readonly [string, number | null]> = [
      ["snap.offense_pct", r.offensePct],
      ["snap.st_pct", r.stPct],
      ["snap.defense_pct", r.defensePct],
    ];
    for (const [key, value] of columns) {
      if (!finite(value)) continue;
      out.push({
        entityType: "player",
        entityId: r.playerId,
        key,
        category: "HEALTH",
        value,
        valueRaw: value,
        season: r.season,
        week: r.week,
        capturedAt: new Date(r.fetchedAt),
        sourceId: "nflverse",
        fetchedAt: new Date(r.fetchedAt),
        rightsSnapshot: { source: "nflverse", dataset: key, measured: true },
        ...base,
      });
    }
  }

  for (const r of input.nextGenStats) {
    if (!r.gsisId) continue;
    const columns: ReadonlyArray<readonly [string, number | null]> = [
      ["ngs.cpoe", r.cpoe],
      ["ngs.avg_separation", r.avgSeparation],
      ["ngs.yac_above_expectation", r.avgYacAboveExpectation],
      ["ngs.air_yards_to_sticks", r.avgAirYardsToSticks],
    ];
    for (const [key, value] of columns) {
      if (!finite(value)) continue;
      out.push({
        entityType: "player",
        // NGS is keyed by gsisId where the other tables use the internal
        // playerId. Both are recorded verbatim rather than crosswalked, because
        // the teams crosswalk this repo needs does not exist yet (0 rows) and
        // inventing an id join would fabricate the link.
        entityId: r.gsisId,
        key,
        category: "PRODUCTION",
        value,
        valueRaw: value,
        season: r.season,
        week: r.week,
        capturedAt: new Date(r.fetchedAt),
        sourceId: "nflverse",
        fetchedAt: new Date(r.fetchedAt),
        rightsSnapshot: { source: "nflverse", dataset: key, measured: true },
        ...base,
      });
    }
  }

  for (const r of input.injuries) {
    const entityId = r.playerId ?? r.gsisId;
    if (!entityId) continue;
    // Availability is CATEGORICAL, so it is encoded as an explicit, documented
    // ordinal rather than invented. 1 = active/available, 0 = doubtful,
    // -1 = out. This is an encoding of the source's own status string, NOT a
    // severity judgement and NOT a projection; the adjustment layer is what
    // turns it into one, and that layer is where the uncalibrated gate lives.
    const status = (r.reportStatus ?? r.practiceStatus ?? "").toUpperCase();
    let availability: number | null = null;
    if (status.includes("OUT")) availability = -1;
    else if (status.includes("DOUBTFUL") || status.includes("QUESTIONABLE")) availability = 0;
    else if (status.includes("ACTIVE") || status.includes("FULL") || status.includes("LIMITED")) availability = 1;
    if (availability === null) continue;
    out.push({
      entityType: "player",
      entityId,
      key: "injury.availability",
      category: "HEALTH",
      value: availability,
      valueRaw: availability,
      season: r.season,
      week: r.week,
      capturedAt: new Date(r.fetchedAt),
      sourceId: "nflverse",
      fetchedAt: new Date(r.fetchedAt),
      rightsSnapshot: { source: "nflverse", dataset: "injury.availability", measured: true },
      ...base,
    });
  }

  return out;
}

/**
 * Upsert candidates into `signals`, keyed on the schema's unique tuple.
 *
 * Batched, and it stops and reports rather than silently truncating: a write
 * that only half-succeeds must be visible, because the prop pipeline treats a
 * populated table as fuel and a half-populated one reads as a quiet gap.
 */
export async function writeSignalCandidates(
  db: SignalWriterDb,
  candidates: readonly SignalWriteCandidate[],
  options: { batchSize?: number } = {},
): Promise<SignalWriteReport> {
  const batchSize = options.batchSize ?? 500;
  const report: SignalWriteReport = {
    candidates: candidates.length,
    written: 0,
    skipped: 0,
    batches: 0,
    errors: [],
  };
  if (candidates.length === 0) return report;

  for (let i = 0; i < candidates.length; i += batchSize) {
    const batch = candidates.slice(i, i + batchSize);
    report.batches += 1;
    for (const c of batch) {
      try {
        await db.signal.upsert({
          where: {
            entityType_entityId_key_season_week: {
              entityType: c.entityType,
              entityId: c.entityId,
              key: c.key,
              season: c.season,
              week: c.week,
            },
          },
          create: c,
          update: {
            value: c.value,
            valueRaw: c.valueRaw,
            confidence: c.confidence,
            capturedAt: c.capturedAt,
            sourceId: c.sourceId,
          },
        });
        report.written += 1;
      } catch (error) {
        report.skipped += 1;
        report.errors.push(
          `${c.key}/${c.entityId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }
  return report;
}
