/**
 * Backtest harness — aggregate replayed records into a summary with
 * per-confidence-bucket calibration and a Brier score.
 *
 * Brier score per pick (binary outcome): (forecast − outcome)^2 where
 * forecast = confidence / 100 and outcome is 1 (win) or 0 (loss).
 * Pushes are excluded from Brier because they have no binary outcome.
 */

import { replayGames } from "./replay.js";
import { assertSummaryInvariants, BUCKET_ORDER } from "./assertions.js";
import type {
  BacktestBucket,
  BacktestGame,
  BacktestPickRecord,
  BacktestSummary,
} from "./types.js";

function bucketFor(confidence: number): BacktestBucket["bucket"] {
  if (confidence < 50) return "<50";
  if (confidence < 60) return "50-59";
  if (confidence < 70) return "60-69";
  if (confidence < 80) return "70-79";
  if (confidence < 90) return "80-89";
  return "90-100";
}

function summarize(records: ReadonlyArray<BacktestPickRecord>): BacktestSummary {
  let wins = 0;
  let losses = 0;
  let pushes = 0;
  let brierSum = 0;
  let brierCount = 0;

  const byBucket = new Map<BacktestBucket["bucket"], {
    wins: number;
    losses: number;
    pushes: number;
    brierSum: number;
    brierCount: number;
  }>();
  for (const key of BUCKET_ORDER) {
    byBucket.set(key, { wins: 0, losses: 0, pushes: 0, brierSum: 0, brierCount: 0 });
  }

  for (const record of records) {
    const bucket = bucketFor(record.confidence);
    const entry = byBucket.get(bucket)!;

    if (record.result === "WIN") {
      wins++;
      entry.wins++;
      const forecast = record.confidence / 100;
      const brier = (forecast - 1) * (forecast - 1);
      brierSum += brier;
      brierCount++;
      entry.brierSum += brier;
      entry.brierCount++;
    } else if (record.result === "LOSS") {
      losses++;
      entry.losses++;
      const forecast = record.confidence / 100;
      const brier = forecast * forecast;
      brierSum += brier;
      brierCount++;
      entry.brierSum += brier;
      entry.brierCount++;
    } else {
      pushes++;
      entry.pushes++;
    }
  }

  const settled = wins + losses + pushes;
  const winRate = wins + losses > 0 ? wins / (wins + losses) : null;
  const brier = brierCount > 0 ? brierSum / brierCount : null;

  const buckets: BacktestBucket[] = BUCKET_ORDER.map((key) => {
    const entry = byBucket.get(key)!;
    const bucketSettled = entry.wins + entry.losses + entry.pushes;
    const bucketWinRate =
      entry.wins + entry.losses > 0 ? entry.wins / (entry.wins + entry.losses) : null;
    const bucketBrier = entry.brierCount > 0 ? entry.brierSum / entry.brierCount : null;
    return {
      bucket: key,
      settled: bucketSettled,
      wins: entry.wins,
      losses: entry.losses,
      pushes: entry.pushes,
      winRate: bucketWinRate,
      brierComponent: bucketBrier,
    };
  });

  return {
    games: 0, // filled in by caller
    picks: records.length,
    settled,
    pushes,
    wins,
    losses,
    winRate,
    brier,
    buckets,
    records,
  };
}

/**
 * Run a full backtest: replay games → settle → summarize → assert invariants.
 *
 * The summary returned is operator-only output. It is not yet wired into
 * any public surface; C62 defines the accumulation plan before any of
 * this becomes a public claim.
 */
export function runBacktest(
  games: ReadonlyArray<BacktestGame>,
  fetchedAt?: Date,
): BacktestSummary {
  const records = replayGames(games, fetchedAt);
  const summary = summarize(records);
  const withGameCount: BacktestSummary = { ...summary, games: games.length };
  assertSummaryInvariants(withGameCount);
  return withGameCount;
}
