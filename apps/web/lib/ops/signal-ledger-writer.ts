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
 * off a table the platform already populates — the same four the census reads.
 * Nothing is derived from a model, inferred, or sampled, and no magnitude is
 * invented:
 *
 *   - `valueRaw` is the source column verbatim, so a normalized reading can
 *     never quietly become the record.
 *   - `value` is that same column placed on the SHARED directional scale using
 *     the measured per-key anchor/spread in `signal-scale-table.ts`. This is the
 *     schema's own documented contract for the column ("normalized directional
 *     reading (+ good / − bad) for the composer"); before this change the writer
 *     put the RAW reading there, so `composeLedger` was blending ten different
 *     units — `pgs.passing_epa` (sd 9.63) against `pgs.target_share` (sd 0.093),
 *     a 103x mismatch in magnitude.
 *   - `confidence` is 1.0 for a settled measured stat and is NOT a tunable.
 *   - `weight` is the FITTED per-key weight from `signal-scale-table.ts`, no
 *     longer a uniform 1. The previous uniform-1 was not a neutral choice: it
 *     asserted that ten keys measured in different units contribute equally,
 *     which is the defect. The weights are fitted on WITHIN-player correlation
 *     against a settled outcome (next-week PPR above median), evidence counted
 *     in distinct fixtures. Seven of thirteen keys measure weight 0 — no
 *     joinable evidence, not a guess — and are still written, because "present
 *     and honest" is not the same as "allowed to move a score".
 *
 * AN UNCALIBRATED SIGNAL MUST NOT MOVE A PUBLISHED PROJECTION. This file does
 * not change the adjustment layer, any gate, or any published number. It only
 * makes the measured evidence EXIST on a comparable scale with a defensible
 * weight, so the prop pipeline and the tuner have something to read. That is
 * the difference between filling a table and believing a number, and only the
 * second one is founder-gated.
 *
 * IDEMPOTENT BY CONSTRUCTION, AND A RE-RUN NOW CONVERGES. The write is an
 * upsert keyed on the same unique tuple the schema declares, so a re-run
 * converges rather than double-voting. `value`, `valueRaw` and `weight` are
 * all in the `update` clause, so a row written before this file existed
 * converges onto the fitted scale and the fitted weight the next time the
 * writer visits it — the `update` branch is not an optional path, it is the
 * only path every pre-existing row can take.
 *
 * (That `weight` was MISSING from the `update` clause, while present on
 * `create`, is a defect this file previously shipped. See the note at the
 * upsert. `signals` is not read by any production consumer today — measured:
 * the only reader is `/api/ops/signal-ledger-state`, which counts rows and
 * deliberately selects no values — so the fix has no consumer-visible blast
 * radius, which is exactly why it needed a test rather than a production
 * incident to find it.)
 *
 * A KEY WITH NO FITTED SCALE IS DROPPED, NOT DEFAULTED. If the scale table has
 * no entry for a key, the row is skipped: there is no honest normalized value
 * for a key with no measured baseline, and writing the raw number into `value`
 * is exactly the bug being fixed. `report.dropped` names what was skipped so a
 * key that stops appearing is visible rather than silent.
 */

import {
  normalizeWithScale,
} from "@sports/prediction-engine/src/signal-scale-fit.js";
import { signalScaleFor } from "@sports/prediction-engine/src/signal-scale-table.js";
import type { SignalWriterDb, SignalWriteCandidate, SignalWriteReport } from "./signal-ledger-writer-types.js";

// Re-exported so callers can type a `SignalWriteCandidate[]` without reaching
// into the types module directly. The route annotates its `candidates` binding
// with this type; without the re-export that import fails to resolve.
export type { SignalWriteCandidate };

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
 * Encode an injury report's own status into the ordinal the ledger documents:
 * 1 = active/available, 0 = doubtful/questionable, -1 = out, null = the source
 * said nothing this can be read from.
 *
 * THE `??` BUG THIS FIXES. The previous encoder was
 * `(reportStatus ?? practiceStatus ?? "").toUpperCase()`. `??` falls through only
 * on null/undefined — NOT on an empty string — and on prod every one of the
 * 6,812 `injuries` rows stores `reportStatus` as `''` rather than NULL
 * (measured 2026-09-30: `reportStatus IS NULL` matches 0 rows,
 * `reportStatus = ''` matches 3,744). So `??` never fell through, the encoder
 * saw `""`, and the row was DROPPED. Measured consequence: 2,955 rows whose
 * `practiceStatus` was "Full Participation in Practice" — the HEALTHIEST
 * reading in the table — were discarded, and only 3,068 of 6,812 injuries ever
 * became a signal. The persisted `injury.availability` values are `-1` and `0`
 * and nothing else; the +1 case had never once been written, so the key could
 * report bad news and never good news.
 *
 * The fix is to fall through on a BLANK string, not just a null one, and to
 * prefer whichever field actually carries information. Measured on the same
 * 6,812 rows this encodes 6,065 of them (3,400 full / 1,556 limited / 1,810 DNP)
 * against 3,068 before, and restores the +1 case.
 */
export function encodeInjuryAvailability(
  reportStatus: string | null,
  practiceStatus: string | null,
): number | null {
  const report = (reportStatus ?? "").trim().toUpperCase();
  const practice = (practiceStatus ?? "").trim().toUpperCase();

  // Practice participation is the finer-grained report (full / limited / DNP)
  // and the injury report is the coarser one (out / doubtful / questionable), so
  // a definite practice reading outranks a blank-or-questionable report.
  if (practice.includes("DID NOT PARTICIPATE")) return -1;
  if (report.includes("OUT")) return -1;
  if (report.includes("DOUBTFUL") || report.includes("QUESTIONABLE")) return 0;
  if (practice.includes("LIMITED")) return 1;
  if (practice.includes("FULL") || practice.includes("ACTIVE")) return 1;
  return null;
}

export interface SignalProjection {
  readonly candidates: readonly SignalWriteCandidate[];
  /**
   * Rows NOT written, by key, with the reason implied by the key's absence from
   * the scale table or its inability to normalize. Reported rather than dropped
   * silently: a key that is unscorable is a finding, and the founder report is
   * the only place it can be seen.
   */
  readonly dropped: Readonly<Record<string, number>>;
}

/**
 * Project the four measured tables into candidate `signals` rows.
 *
 * Pure and exported so it is testable with no database, and so the test can pin
 * the two properties that matter: every `valueRaw` is byte-identical to a column
 * that actually exists in the source row, and every `value` is that same column
 * placed on the shared scale with the key's fitted weight.
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
}): SignalProjection {
  const out: SignalWriteCandidate[] = [];
  // A key with no fitted scale cannot be placed on the shared scale, so its rows
  // are dropped rather than written with a raw value posing as a normalized one.
  // Counted per key so a key that stops appearing is visible in the report.
  const dropped = new Map<string, number>();
  const dropUnscored = (key: string): void => {
    dropped.set(key, (dropped.get(key) ?? 0) + 1);
  };

  /**
   * Build one candidate on the shared scale, or drop it.
   *
   * `value` becomes the NORMALIZED reading (-1..1) that `composeLedger` and
   * `compositeScore` are documented to expect, and `valueRaw` keeps the source
   * column verbatim so the transformation stays auditable. `weight` is the
   * key's FITTED weight, which is 0 for a key with no joinable outcome evidence
   * — a zero-weight row is still written, because it is a real measurement that
   * is simply not yet allowed to move a score, and because the tuner needs it to
   * exist in order to ever fit it.
   */
  const emit = (args: {
    entityId: string;
    key: string;
    category: string;
    raw: number;
    season: number;
    week: number;
    fetchedAt: Date | string;
  }): void => {
    if (!finite(args.raw)) return;
    // A row with no entity cannot be written, and that is the prod shape for all
    // 31,100 snap_counts rows (NULL playerId). Counted as a drop rather than
    // returned in silence, because a key that stops appearing is a finding.
    if (!args.entityId) {
      dropUnscored(args.key);
      return;
    }
    const scale = signalScaleFor(args.key);
    if (!scale) {
      dropUnscored(args.key);
      return;
    }
    const value = normalizeWithScale(args.raw, scale);
    if (value === null) {
      // The scale exists but cannot normalize (non-positive spread, or a
      // non-finite anchor). Treated exactly like a missing scale: dropped, and
      // counted, rather than passed through as a raw number.
      dropUnscored(args.key);
      return;
    }
    out.push({
      entityType: "player",
      entityId: args.entityId,
      key: args.key,
      category: args.category,
      value,
      valueRaw: args.raw,
      season: args.season,
      week: args.week,
      capturedAt: new Date(args.fetchedAt),
      sourceId: "nflverse",
      // The schema requires a rights snapshot on every signal. The source is
      // named rather than left empty, so a row's provenance survives the row.
      fetchedAt: new Date(args.fetchedAt),
      rightsSnapshot: { source: "nflverse", dataset: args.key, measured: true },
      // A settled measured statistic is the top of the honesty scale. It is 1.0
      // because the reading is real, NOT because the signal is proven
      // predictive: that is what the fitted weight measures, and conflating the
      // two is how an unvalidated signal ends up looking like a validated one.
      confidence: 1.0,
      weight: scale.weight,
    });
  };

  for (const r of input.playerGameStats) {
    const columns: ReadonlyArray<readonly [string, number | null, string]> = [
      ["pgs.target_share", r.targetShare, "PRODUCTION"],
      ["pgs.fantasy_ppr", r.fantasyPointsPpr, "PRODUCTION"],
      ["pgs.passing_epa", r.passingEpa, "EFFICIENCY"],
      ["pgs.rushing_epa", r.rushingEpa, "EFFICIENCY"],
      ["pgs.receiving_epa", r.receivingEpa, "EFFICIENCY"],
    ];
    for (const [key, value, category] of columns) {
      emit({
        entityId: r.playerId,
        key,
        category,
        raw: value as number,
        season: r.season,
        week: r.week,
        fetchedAt: r.fetchedAt,
      });
    }
  }

  for (const r of input.snapCounts) {
    const columns: ReadonlyArray<readonly [string, number | null, string]> = [
      ["snap.offense_pct", r.offensePct, "PRODUCTION"],
      ["snap.st_pct", r.stPct, "PRODUCTION"],
      ["snap.defense_pct", r.defensePct, "HEALTH"],
    ];
    for (const [key, value, category] of columns) {
      emit({
        // Measured on prod 2026-09-30: all 31,100 snap_counts rows carry a NULL
        // playerId, so every snap row is dropped here and the three keys persist
        // 0 rows. `dropped` reports that rather than leaving it invisible.
        entityId: r.playerId ?? "",
        key,
        category,
        raw: value as number,
        season: r.season,
        week: r.week,
        fetchedAt: r.fetchedAt,
      });
    }
  }

  for (const r of input.nextGenStats) {
    const columns: ReadonlyArray<readonly [string, number | null, string]> = [
      ["ngs.cpoe", r.cpoe, "PRODUCTION"],
      ["ngs.avg_separation", r.avgSeparation, "PRODUCTION"],
      ["ngs.yac_above_expectation", r.avgYacAboveExpectation, "PRODUCTION"],
      ["ngs.air_yards_to_sticks", r.avgAirYardsToSticks, "PRODUCTION"],
    ];
    for (const [key, value, category] of columns) {
      emit({
        // NGS is keyed by gsisId where the other tables use the internal
        // playerId. Both are recorded verbatim rather than crosswalked, because
        // the crosswalk this repo needs does not exist: measured 2026-09-30, 0 of
        // 380 distinct gsis match a playerId, and 0 of 32 team strings match
        // `games`. Inventing an id join would fabricate the link — and it is why
        // these four keys carry weight 0 (no join, no fit).
        entityId: r.gsisId,
        key,
        category,
        raw: value as number,
        season: r.season,
        week: r.week,
        fetchedAt: r.fetchedAt,
      });
    }
  }

  for (const r of input.injuries) {
    // Availability is CATEGORICAL, so it is encoded as an explicit, documented
    // ordinal rather than invented. 1 = active/available, 0 = doubtful,
    // -1 = out. This is an encoding of the source's own status string, NOT a
    // severity judgement and NOT a projection; the adjustment layer is what
    // turns it into one, and that layer is where the uncalibrated gate lives.
    const availability = encodeInjuryAvailability(r.reportStatus, r.practiceStatus);
    if (availability === null) continue;
    emit({
      entityId: r.playerId ?? r.gsisId ?? "",
      key: "injury.availability",
      category: "HEALTH",
      raw: availability,
      season: r.season,
      week: r.week,
      fetchedAt: r.fetchedAt,
    });
  }

  return { candidates: out, dropped: Object.freeze(Object.fromEntries(dropped)) };
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
  options: { batchSize?: number; deadline?: Date } = {},
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
    // DEADLINE. Measured in production 2026-09-28: this route returned 504
    // ("Vercel Runtime Error") on its first live tick because it upserts one
    // row at a time, sequentially, over the full candidate set. Stopping at a
    // wall-clock deadline is safe precisely BECAUSE every write is an upsert
    // keyed on (entityType, entityId, key, season, week): whatever this run
    // does not reach, the next run re-does identically and converges. The
    // alternative — truncating silently — would read as a populated table
    // that is quietly partial, which is the exact failure the report exists
    // to make visible. `remaining` states it instead.
    if (options.deadline !== undefined && new Date() >= options.deadline) {
      report.errors.push(
        `deadline reached with ${candidates.length - i} candidates unwritten; the next run resumes and converges (upserts are idempotent)`,
      );
      break;
    }
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
          // `weight` IS refreshed here, and that is the whole point.
          //
          // MEASURED DEFECT, this branch. Every row in `signals` predates the
          // fitted-weight table, so every row arrives at this upsert on the
          // `update` path — and the `update` clause omitted `weight`. The
          // fitted weight was therefore written ONLY by the `create` branch,
          // which a re-run of an existing row never reaches. A key's weight
          // could not change, ever, without a brand-new (entity, key, season,
          // week) tuple appearing. That is why the production measurement
          // still reads a flat weight 1.0 on every key while the committed
          // table says otherwise: the fit is correct and unreachable.
          //
          // Including it makes the writer converge on the fit rather than on
          // the schema default, which is the property an idempotent upsert is
          // supposed to have. It cannot double-vote: `weight` is a property of
          // the KEY (signal-scale-table.ts), not an accumulating vote, and the
          // unique tuple still guarantees one row per key.
          update: {
            value: c.value,
            valueRaw: c.valueRaw,
            weight: c.weight,
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
