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
 * WHAT IT DELIBERATELY DOES NOT DO. It does not rank, gate, or let an
 * uncalibrated signal move a published number. `weight` is the key's FITTED
 * weight from `signal-scale-table.ts` (0 where no settled outcome joins the
 * key — a finding, not a gap); `confidence` is 1.0 because the reading is
 * REAL — not because the signal is proven predictive, which is a different
 * claim the tuner makes. No published projection, gate, floor, or
 * MODEL_VERSION is touched. This fills a table; it does not believe a number.
 *
 * LAWS OBSERVED:
 * - CRON_SECRET bearer auth, same strict mode as the census route.
 * - Idempotent: upsert on the schema's `@@unique([entityType, entityId, key,
 *   season, week])`, so a re-run converges instead of double-voting. A
 *   duplicated signal would be double-counted downstream.
 * - A partial write is REPORTED (written/skipped/errors), never truncated
 *   silently, because the prop pipeline reads a populated table as fuel.
 *   Any skipped row or error makes the tick a 500, never a 200-shaped
 *   success — a monitor that only checks the status code must not read a
 *   broken tick as healthy.
 * - No env flag, no gate, no schema change, no migration.
 */

import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { db } from "@sports/db";
import { projectSignalCandidates, writeSignalCandidates, type SignalWriteCandidate } from "@/lib/ops/signal-ledger-writer";
import { captureError } from "@/lib/observability/sentry";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Headroom for serializing the response before the function is killed. */
const TAIL_RESERVE_MS = 20;

/**
 * How many shards the population is split into by default.
 *
 * MEASURED: one tick writes 80,000 rows inside its deadline against a
 * 118,402-row population, so a partition must be comfortably under that for
 * every shard to finish. Two shards of ~59,201 each do. Raising this without
 * re-measuring would put every shard over the deadline and reintroduce the
 * silent partial coverage this exists to prevent.
 */
const SHARD_COUNT = 2;

/**
 * The shard this run writes.
 *
 * An explicit `SIGNAL_LEDGER_SHARD` always wins. Absent one, the shard
 * alternates by HOUR so consecutive ticks cover the whole population: a fixed
 * 0/1 shard rewrites the same leading rows every hour and never reaches the
 * tail (MEASURED: 38,402 of 118,402 rows, 32.4%, never written).
 *
 * The hour is UTC because the schedule is a UTC cron expression, so the
 * rotation is stable regardless of where the function runs. Returns null for a
 * MALFORMED explicit value, which the caller refuses rather than guessing.
 */
function resolveShard(
  raw: string | undefined,
  startedAtMs: number,
): { readonly n: number; readonly total: number } | null {
  const value = (raw ?? "").trim();
  if (value.length === 0) {
    return { n: new Date(startedAtMs).getUTCHours() % SHARD_COUNT, total: SHARD_COUNT };
  }
  return parseShard(raw);
}

/**
 * `"<n>/<total>"` -> shard n of `total`, or 0/1 when unset, blank, or malformed.
 *
 * A MALFORMED value must not silently mean "no shard", because that would make
 * a typo write the FULL population from every shard and multiply the write load
 * by the shard count. A bad config therefore refuses loudly: this returns null
 * and the route reports the bad value instead of guessing.
 */
function parseShard(raw: string | undefined): { readonly n: number; readonly total: number } | null {
  const value = (raw ?? "").trim();
  if (value.length === 0) return { n: 0, total: 1 };
  const match = /^(\d+)\/(\d+)$/.exec(value);
  if (!match) return null;
  const n = Number(match[1]);
  const total = Number(match[2]);
  if (!Number.isInteger(n) || !Number.isInteger(total) || total < 1 || n < 0 || n >= total) return null;
  return { n, total };
}

/**
 * Stable bucket for a candidate, from its own identity. The SAME row always
 * lands in the SAME bucket, on every run and every deploy, with no stored state
 * — which is what lets N shards cover the population exactly once.
 */
function shardOf(entityId: string, key: string, shard: { readonly n: number; readonly total: number }): boolean {
  if (shard.total === 1) return true;
  let hash = 0;
  const id = `${entityId}|${key}`;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash % shard.total === shard.n;
}

export async function GET(req: Request): Promise<NextResponse> {
  const startedAtMs = Date.now();
  const denied = await cronAuthError(req);
  if (denied) return denied;

  // Read the same four sources the census reads, through the same injected
  // client shape, so the write and the report can never disagree about what
  // exists.
  //
  // CURSOR, and it is load-bearing. MEASURED on the first live tick
  // (2026-09-28, dpl_4YJcJTeTqJCwsB2eiNicFnH1jPDi):
  // `candidates=118083 written=84500 skipped=0 errors=1` — the deadline stopped
  // the run with 33,583 candidates (28.4%) unwritten. Because the read had no
  // cap and no cursor, the NEXT run re-reads the same 118,083 rows in the same
  // order and dies at the same place: an hourly job that converges on nothing.
  // "The next run resumes" is only true if the next run starts further along,
  // so this shards the work by a stable, content-derived bucket rather than
  // trusting wall-clock position. The cursor is derived from the row's own
  // identity, so it is the same every run and covers the whole population
  // exactly once across the shard set — no state, no checkpoint, no lost
  // position if a run dies mid-flight.
  //
  // SHARD is `process.env.SIGNAL_LEDGER_SHARD` ("<n>/<total>"); absent one,
  // the shard ROTATES BY HOUR (see resolveShard) so consecutive ticks cover
  // the whole population — a fixed 0/1 shard rewrites the same leading rows
  // every hour and never reaches the tail. Nothing is dropped: shard k of N
  // over a deterministic bucket is a partition, not a sample.
  let candidates: readonly SignalWriteCandidate[] = [];
  // Rows refused for want of a fitted scale, by key. Reported in the response so
  // an unscorable key is a visible finding rather than a silent disappearance.
  let dropped: Readonly<Record<string, number>> = {};
  // SHARD SELECTION. An explicit `SIGNAL_LEDGER_SHARD` always wins (that is
  // how an operator drives a specific partition on demand). Absent one, the
  // shard ROTATES WITH THE HOUR.
  //
  // WHY, and it is arithmetic rather than taste. MEASURED on the 05:23 CDT
  // tick (dpl_FPCcycQXzyucePsdn92tSqgLWDq2): `candidates=118402 written=80000`
  // at 160 batches. The deadline stops the run at 80,000 rows, so with a
  // constant 0/1 shard the same first 80,000 rows are rewritten every hour and
  // the remaining 38,402 (32.4%) are NEVER reached — a job that reports
  // `errors=1` forever while quietly covering two thirds of the population.
  //
  // Sharding alone did not fix that, because Vercel crons cannot carry a
  // per-entry env var, so a shard index nobody sets stays 0 forever. Deriving
  // it from the hour needs no configuration, alternates deterministically, and
  // covers the whole population within the shard count. A shard is a
  // PARTITION, so alternating costs no duplicated work beyond the upserts that
  // already existed, and every row is a plain upsert keyed on the unique tuple.
  const shard = resolveShard(process.env["SIGNAL_LEDGER_SHARD"], startedAtMs);
  try {
    const [pgs, snaps, ngs, injuries] = await Promise.all([
      db.playerGameStat.findMany({ orderBy: { fetchedAt: "desc" } }),
      db.snapCount.findMany({ orderBy: { fetchedAt: "desc" } }),
      db.nextGenStat.findMany({ orderBy: { fetchedAt: "desc" } }),
      db.injury.findMany({ orderBy: { fetchedAt: "desc" } }),
    ]);
    const projection = projectSignalCandidates({
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
    candidates = projection.candidates;
    dropped = projection.dropped;
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
    // A malformed shard config is REFUSED, never treated as 0/1. Guessing here
    // would let every shard write the whole population.
    if (shard === null) {
      return NextResponse.json(
        {
          success: false,
          error: "bad SIGNAL_LEDGER_SHARD",
          detail: 'expected "<n>/<total>" with 0 <= n < total; no signal was written',
        },
        { status: 500 },
      );
    }
    const scoped =
      shard.total === 1
        ? candidates
        : candidates.filter((c) => shardOf(c.entityId, c.key, shard));
    const deadline = new Date(startedAtMs + (maxDuration - TAIL_RESERVE_MS) * 1000);
    report = await writeSignalCandidates(db, scoped, { deadline });
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

  // One line per tick, on stderr. MEASURED 2026-09-28: the Vercel log viewer
  // truncates the response body, and a 200 is byte-identical whether this wrote
  // forty rows or forty thousand. That is the whole reason the table could sit
  // empty for the life of the project — a green cron that was writing nothing
  // looked exactly like a green cron that was writing. The count belongs in the
  // log where anyone can read it without an authenticated ops call.
  process.stderr.write(
    `[cron:signal-ledger-write] shard=${shard.n}/${shard.total} ` +
      `candidates=${report.candidates} written=${report.written} ` +
      `skipped=${report.skipped} batches=${report.batches} errors=${report.errors.length}\n`,
  );

  // LOUD, not green. MEASURED 2026-09-28 (dpl_8hKqsyXxb1KDLm4kgBw6ffEBEq9e): a
  // duplicated write made the second call see an already-past deadline and
  // write 0 rows, and the route returned 200 with `success: true` because
  // `skipped` was 0 — the "green cron that was writing nothing" incident.
  // `skipped === 0` is not the same as "the write worked": any fault the
  // report carries (skipped rows, a deadline stop, any error) is a 500 with
  // success:false, so a monitor that only checks the status code cannot read
  // a broken tick as healthy.
  const failed = report.skipped > 0 || report.errors.length > 0;
  return NextResponse.json(
    {
      success: !failed,
    data: {
      shard: `${shard.n}/${shard.total}`,
      candidates: report.candidates,
      written: report.written,
      skipped: report.skipped,
      batches: report.batches,
      errors: report.errors.slice(0, 20),
      // Rows refused for want of a fitted scale, by key. On prod this is the
      // three snap.* keys: all 31,100 snap_counts rows carry a NULL playerId,
      // so they have no entity and nothing to project. Visible on purpose.
      dropped,
      // Restated in the response so nobody can read this endpoint as a claim
      // that the signals are predictive.
      value: "NORMALIZED per key onto a shared -1..1 scale from a measured anchor/spread (valueRaw keeps the source column verbatim)",
      weights: "FITTED per key on within-player correlation vs a settled outcome; 0 where no outcome joins (not a guess)",
      confidence: "1.0 = the reading is measured, NOT that it is predictive",
    },
    note:
      "Wrote MEASURED columns only, normalized onto a shared per-key scale with a fitted weight. " +
      "No published projection, gate, floor or MODEL_VERSION was touched. The weights come from a fit " +
      "against next-week settled fantasy points with the player fixed effect removed (see " +
      "packages/prediction-engine/src/signal-scale-table.ts); eight of thirteen keys measure weight 0 " +
      "because no settled outcome joins them, which is a finding and not a gap in the write.",
    },
    { status: failed ? 500 : 200 },
  );
}
