/**
 * totals-tiebreak-replay.ts — Wave 5 BEFORE/AFTER evidence.
 *
 * Replays the SAME nflverse season slice through the UNCHANGED replay pipeline
 * (replayAndSettleGame) under two totals side-selection modes, toggled via
 * TOTALS_TIEBREAK_MODE:
 *   "legacy" — current behaviour: equal-juice books count as OVER votes
 *              (scoring.ts:655-659, `overPrice <= underPrice`).
 *   "strict" — proposed: only books whose prices DISCRIMINATE
 *              (overPrice !== underPrice) vote; equal-juice books abstain.
 *              An exact tie of discriminating votes → NO pick (a coin flip
 *              must not become a published pick).
 *
 * The pipeline, feature assembly, settlement and confidence gates are identical
 * in both modes — the ONLY difference is the tie-break, so any delta in
 * published picks is attributable to the tie-break alone. On this corpus every
 * synthetic book quotes -110/-110 (nflverse has no per-side prices), so the
 * legacy mode resolves EVERY total by the tie-break; the strict mode must show
 * exactly what that rule was manufacturing.
 *
 *   NODE_OPTIONS=--use-system-ca TOTALS_TIEBREAK_MODE=legacy npx tsx scripts/analytics/totals-tiebreak-replay.ts
 *
 * Output is a JSON blob on stdout; human progress on stderr. NOT live-path.
 */

import { assertIngestible, fetchNflverse } from "../../packages/data-ingestion/src/index.js";
import { replayAndSettleGame, type RawScheduleRow } from "../../packages/prediction-engine/src/historical-replay.js";
import { toRawRow } from "../backfill/historical-settlement-backfill.js";

const SEASON_CAP = 3; // newest 3 seasons — matches the Wave 3/4 corpus discipline

interface Agg {
  games: number;
  totalPicks: number;
  overPicks: number;
  underPicks: number;
  wins: number;
  losses: number;
  pushes: number;
  confidenceSum: number;
}

function emptyAgg(): Agg {
  return { games: 0, totalPicks: 0, overPicks: 0, underPicks: 0, wins: 0, losses: 0, pushes: 0, confidenceSum: 0 };
}

async function main(): Promise<void> {
  const mode = (process.env.TOTALS_TIEBREAK_MODE ?? "legacy").trim().toLowerCase();
  if (mode !== "legacy" && mode !== "strict") {
    throw new Error(`TOTALS_TIEBREAK_MODE must be "legacy" or "strict", got "${mode}"`);
  }

  const source = assertIngestible("nflverse");
  console.error(`legality: nflverse OK (${source.verdict}). ${source.attributionText}`);
  console.error(`mode: ${mode}`);

  const { records } = await fetchNflverse("schedules", 0);

  // Pass 1: distinct seasons (encounter order is NOT guaranteed — this archive
  // pull is oldest-first). The NEWEST season may be INCOMPLETE (in progress),
  // so drop the max and take the SEASON_CAP next-most-recent.
  const seasonsSeen = new Set<number>();
  for (const r of records) {
    const raw = toRawRow(r);
    if (!raw || (raw.gameType ?? "REG") !== "REG") continue;
    seasonsSeen.add(raw.season);
  }
  const newestFirst = Array.from(seasonsSeen).sort((a, b) => b - a);
  const target = new Set(newestFirst.slice(1, 1 + SEASON_CAP));
  if (target.size < SEASON_CAP) {
    throw new Error(`only ${target.size} complete-ish seasons available, need ${SEASON_CAP}`);
  }

  // Pass 2: process exactly the chosen seasons.
  const agg = emptyAgg();

  for (const r of records) {
    const raw = toRawRow(r);
    if (!raw || (raw.gameType ?? "REG") !== "REG") continue;
    if (!target.has(raw.season)) continue;
    if (raw.spreadLine == null && raw.totalLine == null) continue;

    agg.games++;
    for (const settled of replayAndSettleGame(raw, { totalsTiebreak: mode })) {
      if (settled.pickType !== "TOTAL") continue;
      agg.totalPicks++;
      if (settled.selection.startsWith("OVER")) agg.overPicks++;
      else if (settled.selection.startsWith("UNDER")) agg.underPicks++;
      if (settled.result === "WIN") agg.wins++;
      else if (settled.result === "LOSS") agg.losses++;
      else agg.pushes++;
      agg.confidenceSum += settled.confidence;
    }
  }

  if (agg.games < 500) throw new Error(`corpus suspiciously small (${agg.games} games) — aborting rather than reporting thin numbers`);

  const decided = agg.wins + agg.losses;
  console.log(
    JSON.stringify(
      {
        mode,
        seasons: Array.from(target).sort((a, b) => b - a), // the seasons actually processed
        gamesProcessed: agg.games,
        totalPicks: agg.totalPicks,
        overPicks: agg.overPicks,
        underPicks: agg.underPicks,
        wins: agg.wins,
        losses: agg.losses,
        pushes: agg.pushes,
        winRateDecided: decided > 0 ? Number((agg.wins / decided).toFixed(4)) : null,
        meanConfidence: agg.totalPicks > 0 ? Number((agg.confidenceSum / agg.totalPicks).toFixed(2)) : null,
        note:
          mode === "legacy"
            ? "BEFORE: equal-juice books count as OVER votes (overPrice <= underPrice)."
            : "AFTER (proposed, not live): only discriminating books vote; exact tie => no pick.",
        disclaimer: "Replay evidence on synthetic equal-vig books; not a live-path change.",
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error("\ntotals-tiebreak-replay fatal:", err);
  process.exit(1);
});
