/**
 * GET /api/cron/signal-ledger-write
 *
 * THE WRITER SPEC ITEM 4 ASKED FOR. The census route
 * (`/api/cron/signal-ledger-census`) is deliberately read-only and its own
 * note names this as the follow-up: "`signals` has held 0 rows since it was
 * created", it is "the prop pipeline's fuel", and "the write step is a small,
 * obvious follow-up with the evidence already banked". MEASURED 2026-09-28
 * before writing this: a repo-wide search for `db.signal.create`, `.upsert` or
 * `.createMany` returns NOTHING outside tests, and nothing reads the table
 * either. The prop pipeline therefore has no fuel and cannot exist.
 *
 * WHAT IT WRITES, EXACTLY. Every row is a MEASURED column off one of the four
 * tables the platform already populates — the same four the census reads:
 * player_game_stats 35,168 / snap_counts 29,513 / next_gen_stats / injuries
 * 6,501 rows on prod. `value` is the source column verbatim and `valueRaw`
 * keeps it again, so no normalization can quietly become the record.
 *
 * WHAT IT DELIBERATELY DOES NOT DO. It does not weight, rank, scale, or gate.
 * `weight` is 1 for every key because a weight is a PRIOR and inventing priors
 * here would fabricate the ranking `tune-signal-weights.ts` is supposed to
 * measure. `confidence` is 1.0 because the reading is REAL — not because the
 * signal is proven predictive, which is a different claim the tuner makes. No
 * published projection, gate, floor, or MODEL_VERSION is touched. This fills a
 * table; it does not believe a number.
 *
 * LAWS OBSERVED:
 * - CRON_SECRET bearer auth, same strict mode as the census route.
 * - Idempotent: upsert on the schema's `@@unique([entityType, entityId, key,
 *   season, week])`, so a re-run converges instead of double-voting. A
 *   duplicated signal would be double-counted downstream.
 * - A partial write is REPORTED (written/skipped/errors), never truncated
 *   silently, because the prop pipeline reads a populated table as fuel.
 * - No env flag, no gate, no schema change, no migration.
 */

import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { db } from "@sports/db";
import { projectSignalCandidates, writeSignalCandidates } from "@/lib/ops/signal-ledger-writer";
import { captureError } from "@/lib/observability/sentry";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Headroom for serializing the response before the function is killed. */
const TAIL_RESERVE_MS = 20;

export async function GET(req: Request): Promise<NextResponse> {
  const startedAtMs = Date.now();
  const denied = await cronAuthError(req);
  if (denied) return denied;

  // Read the same four sources the census reads, through the same injected
  // client shape, so the write and the report can never disagree about what
  // exists.
  let candidates;
  try {
    const [pgs, snaps, ngs, injuries] = await Promise.all([
      db.playerGameStat.findMany({ orderBy: { fetchedAt: "desc" } }),
      db.snapCount.findMany({ orderBy: { fetchedAt: "desc" } }),
      db.nextGenStat.findMany({ orderBy: { fetchedAt: "desc" } }),
      db.injury.findMany({ orderBy: { fetchedAt: "desc" } }),
    ]);
    candidates = projectSignalCandidates({
      playerGameStats: pgs.map((r) => ({
        playerId: r.playerId,
        season: r.season,
        week: r.week,
        targetShare: r.targetShare,
        fantasyPointsPpr: r.fantasyPointsPpr,
        passingEpa: r.passingEpa,
        rushingEpa: r.rushingEpa,
        receivingEpa: r.receivingEpa,
        fetchedAt: r.fetchedAt,
      })),
      snapCounts: snaps.map((r) => ({
        playerId: r.playerId,
        season: r.season,
        week: r.week,
        offensePct: r.offensePct,
        stPct: r.stPct,
        defensePct: r.defensePct,
        fetchedAt: r.fetchedAt,
      })),
      nextGenStats: ngs.map((r) => ({
        gsisId: r.gsisId,
        season: r.season,
        week: r.week,
        statType: r.statType,
        cpoe: r.cpoe,
        avgSeparation: r.avgSeparation,
        avgYacAboveExpectation: r.avgYacAboveExpectation,
        avgAirYardsToSticks: r.avgAirYardsToSticks,
        fetchedAt: r.fetchedAt,
      })),
      injuries: injuries.map((r) => ({
        playerId: r.playerId,
        gsisId: r.gsisId,
        season: r.season,
        week: r.week,
        // Column names read from the Injury model, not guessed: `reportStatus`
        // carries the Out/Doubtful/Questionable text and `practiceStatus` the
        // participation. Both are free text from the source, so the encoder
        // below is an explicit mapping and never a default.
        reportStatus: r.reportStatus,
        practiceStatus: r.practiceStatus,
        fetchedAt: r.fetchedAt,
      })),
    });
  } catch (error) {
    captureError(error, { tags: { surface: "signal-ledger-write" } });
    return NextResponse.json(
      {
        success: false,
        error: "read failed",
        detail: error instanceof Error ? error.message : "unknown",
        note: "No signal was written. A failed read is silence, not a default.",
      },
      { status: 500 },
    );
  }

  let report;
  try {
    // Stop early rather than 504. Measured 2026-09-28: the first live tick
    // returned 504 because this writes one row at a time over the full
    // candidate set. The deadline is absolute (from THIS route's start) and
    // leaves a tail reserve for serializing the response, because a run that
    // spends the whole budget in upserts never gets to report what it did —
    // and a write that cannot report is indistinguishable from a write that
    // did nothing. Unreached candidates are picked up by the next hourly tick:
    // every write is an upsert on the unique tuple, so re-running converges.
    const deadline = new Date(startedAtMs + (maxDuration - TAIL_RESERVE_MS) * 1000);
    report = await writeSignalCandidates(db, candidates, { deadline });
  } catch (error) {
    captureError(error, { tags: { surface: "signal-ledger-write" } });
    return NextResponse.json(
      {
        success: false,
        error: "write failed",
        detail: error instanceof Error ? error.message : "unknown",
        note: "A failed write is reported, never partially reported as success.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: report.skipped === 0,
    data: {
      candidates: report.candidates,
      written: report.written,
      skipped: report.skipped,
      batches: report.batches,
      errors: report.errors.slice(0, 20),
      // Restated in the response so nobody can read this endpoint as a claim
      // that the signals are predictive.
      weights: "all 1 (priors are the tuner's job, not the writer's)",
      confidence: "1.0 = the reading is measured, NOT that it is predictive",
    },
    note:
      "Wrote MEASURED columns only. No published projection, gate, floor or MODEL_VERSION was touched, " +
      "and no magnitude was fitted here. `signals` now holds real evidence; whether that evidence predicts " +
      "anything is the tuner's question, and is not answered by this endpoint.",
  });
}
