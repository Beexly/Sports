/**
 * GSE — Historical Backfill Settlement Engine (driver).
 *
 * WHAT THIS IS
 * The seed that lets GSE build a REAL settled-outcome learning corpus from PAST
 * seasons using free nflverse data, instead of waiting for live NFL games. For each
 * past game it re-runs the FROZEN model on ONLY pre-game information (the closing
 * lines, schedule, rest), commits a pick + proof receipt + signal snapshot, then
 * settles WIN/LOSS/PUSH against the known final score. The result is used at exactly
 * ONE place — settlement — and never leaks into scoring (the no-lookahead invariant,
 * enforced and proven in packages/prediction-engine/src/historical-replay.ts).
 *
 * THE FROZEN MODEL IS REUSED, NOT REIMPLEMENTED
 * Scoring goes through `scoreGame` via `replayAndSettleGame`; settlement through the
 * same `calculatePickResult`; CLV through the same clv.ts primitives. This driver
 * only orchestrates fetch → map → replay → (optionally) persist, exactly mirroring
 * the live `processSport` + `settleSport` discipline on historical data.
 *
 * SAFETY (read this):
 *   - DRY-RUN BY DEFAULT. The full pipeline runs and prints a summary with ZERO DB
 *     writes. Real writes happen ONLY when BACKFILL_WRITE=1 is set explicitly.
 *   - Backfilled picks are isBootstrap=true — they NEVER contaminate canonical/live
 *     history unless an owner later promotes them.
 *   - IDEMPOTENT: keyed on the live unique constraint [gameId, pickType]; re-running
 *     upserts and never duplicates.
 *   - Legality is gated via the source registry (nflverse = CC-BY-4.0,
 *     cleared-with-attribution). Free data only.
 *   - No schema change, no migrate, no MODEL_VERSION bump.
 *
 * RUN (DRY-RUN — safe, no writes):
 *   NODE_OPTIONS=--use-system-ca npx tsx scripts/backfill/historical-settlement-backfill.ts --from=2023 --to=2023 --weeks=1-4
 *
 * RUN (REAL WRITE — owner-gated, requires a live DATABASE_URL; DO NOT run casually):
 *   BACKFILL_WRITE=1 NODE_OPTIONS=--use-system-ca npx tsx scripts/backfill/historical-settlement-backfill.ts --from=2023 --to=2023
 *
 * Args:
 *   --from=<season>   first season (inclusive). Default: 2023.
 *   --to=<season>     last season (inclusive). Default: same as --from.
 *   --weeks=A-B|A     restrict to a week range (e.g. 1-4) or a single week. Optional.
 *   --type=REG|POST|ALL   game type filter. Default: REG.
 *   --limit=<n>       cap the number of games processed (handy for a tiny dry run).
 */

import {
  assertIngestible,
  fetchNflverse,
} from "../../packages/data-ingestion/src/index.js";
import {
  replayAndSettleGame,
  buildPickProofReceipt,
  type RawScheduleRow,
  type SettledHistoricalPick,
} from "../../packages/prediction-engine/src/index.js";
import { createHash } from "node:crypto";

// ── Production SHA-256 for the proof spine (same hash the live pipeline uses). ──
function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

// ─────────────────────────── arg parsing ────────────────────────────
interface Args {
  fromSeason: number;
  toSeason: number;
  weekFrom: number | null;
  weekTo: number | null;
  gameType: "REG" | "POST" | "ALL";
  limit: number | null;
}

function parseArgs(argv: string[]): Args {
  const get = (name: string): string | undefined => {
    const hit = argv.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : undefined;
  };
  const fromSeason = Number(get("from") ?? 2023);
  const toSeason = Number(get("to") ?? fromSeason);
  let weekFrom: number | null = null;
  let weekTo: number | null = null;
  const weeks = get("weeks");
  if (weeks) {
    const [a, b] = weeks.split("-").map((s) => Number(s.trim()));
    weekFrom = Number.isFinite(a) ? (a as number) : null;
    weekTo = Number.isFinite(b) ? (b as number) : weekFrom;
  }
  const typeRaw = (get("type") ?? "REG").toUpperCase();
  const gameType: Args["gameType"] = typeRaw === "POST" ? "POST" : typeRaw === "ALL" ? "ALL" : "REG";
  const limitRaw = get("limit");
  const limit = limitRaw && Number.isFinite(Number(limitRaw)) ? Number(limitRaw) : null;
  return { fromSeason, toSeason, weekFrom, weekTo, gameType, limit };
}

// ── CSV row → RawScheduleRow (post-game fields included; the replay quarantines them). ──
function num(v: string | undefined): number | null {
  if (v === undefined || v === "" || v === "NA") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function int(v: string | undefined): number | null {
  const n = num(v);
  return n === null ? null : Math.round(n);
}

function toRawRow(r: Readonly<Record<string, string>>): RawScheduleRow | null {
  const season = int(r["season"]);
  const week = int(r["week"]);
  const homeTeam = r["home_team"];
  const awayTeam = r["away_team"];
  if (season === null || week === null || !homeTeam || !awayTeam) return null;
  const gameday = r["gameday"]; // YYYY-MM-DD
  const gametime = r["gametime"]; // HH:MM (local-ish); good enough for an as-of ordering
  const commenceTime =
    gameday && gameday.trim() !== ""
      ? `${gameday}T${gametime && gametime.trim() !== "" ? gametime : "17:00"}:00Z`
      : null;
  return {
    gameKey: r["game_id"] || `${season}_${String(week).padStart(2, "0")}_${awayTeam}_${homeTeam}`,
    season,
    week,
    gameType: r["game_type"] || "REG",
    homeTeam,
    awayTeam,
    commenceTime,
    spreadLine: num(r["spread_line"]),
    totalLine: num(r["total_line"]),
    homeMoneyline: int(r["home_moneyline"]),
    awayMoneyline: int(r["away_moneyline"]),
    restHome: num(r["home_rest"]),
    restAway: num(r["away_rest"]),
    // Post-game — present here, but `replayAndSettleGame` reads them ONLY at settlement.
    homeScore: int(r["home_score"]),
    awayScore: int(r["away_score"]),
    result: num(r["result"]),
  };
}

function inRange(row: RawScheduleRow, args: Args): boolean {
  if (row.season < args.fromSeason || row.season > args.toSeason) return false;
  if (args.weekFrom !== null && row.week < args.weekFrom) return false;
  if (args.weekTo !== null && row.week > args.weekTo) return false;
  if (args.gameType !== "ALL") {
    const t = (row.gameType ?? "REG").toUpperCase();
    if (args.gameType === "REG" && t !== "REG") return false;
    if (args.gameType === "POST" && t === "REG") return false;
  }
  return true;
}

// ─────────────────────────── main ────────────────────────────
async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const WRITE = process.env["BACKFILL_WRITE"] === "1";

  console.log("\n=== GSE Historical Backfill Settlement Engine ===");
  console.log(
    `seasons ${args.fromSeason}-${args.toSeason}` +
      (args.weekFrom !== null ? `, weeks ${args.weekFrom}-${args.weekTo}` : "") +
      `, type ${args.gameType}` +
      (args.limit !== null ? `, limit ${args.limit}` : ""),
  );
  console.log(`mode: ${WRITE ? "WRITE (BACKFILL_WRITE=1) — DB writes ENABLED" : "DRY-RUN (default) — ZERO DB writes"}`);

  // 1) Legality gate — registry verdict must permit ingestion (nflverse CC-BY-4.0).
  let source;
  try {
    source = assertIngestible("nflverse");
  } catch (e) {
    console.error(`\nLegality gate FAILED: ${e instanceof Error ? e.message : e}`);
    process.exit(2);
    return;
  }
  console.log(`legality: nflverse OK (${source.verdict}). Attribution: ${source.attributionText}`);

  // 2) Fetch the single all-seasons `schedules` asset (free, one file since 1999).
  let records: ReadonlyArray<Readonly<Record<string, string>>>;
  try {
    const table = await fetchNflverse("schedules", 0);
    records = table.records;
    console.log(`fetched schedules: ${records.length} rows (all seasons).`);
  } catch (e) {
    console.error(`\nnflverse fetch FAILED: ${e instanceof Error ? e.message : e}`);
    console.error("(network / NODE_OPTIONS=--use-system-ca may be required in this environment.)");
    process.exit(2);
    return;
  }

  // 3) Map + filter to the requested range.
  let rows: RawScheduleRow[] = [];
  for (const r of records) {
    const row = toRawRow(r);
    if (row && inRange(row, args)) rows.push(row);
  }
  if (args.limit !== null) rows = rows.slice(0, args.limit);
  console.log(`in-range games: ${rows.length}`);

  // 4) Replay + settle (PURE, no-lookahead) every game; collect settled picks.
  const settled: SettledHistoricalPick[] = [];
  let gamesPlayed = 0;
  let gamesSkippedUnplayed = 0;
  let lookaheadErrors = 0;
  for (const row of rows) {
    try {
      const picks = replayAndSettleGame(row);
      if (picks.length === 0) {
        // Either unplayed (no final score) or the frozen model produced no publishable pick.
        if (row.homeScore === null || row.awayScore === null) gamesSkippedUnplayed++;
        continue;
      }
      gamesPlayed++;
      settled.push(...picks);
    } catch (e) {
      // A LookaheadLeakError here would be a real defect — surface it loudly.
      lookaheadErrors++;
      console.error(`replay error on ${row.gameKey}: ${e instanceof Error ? e.message : e}`);
    }
  }

  // 5) Build the proof receipts (the same pre-result commitment the live path mints).
  //    Done here so the DRY-RUN exercises the FULL pipeline, not just scoring.
  let receiptsMinted = 0;
  let receiptsSkipped = 0;
  for (const pick of settled) {
    if (
      pick.marketFairProb !== null &&
      pick.marketFairProb > 0 &&
      pick.marketFairProb < 1 &&
      pick.entryOdds !== null &&
      pick.entryOdds !== 0
    ) {
      try {
        buildPickProofReceipt(
          {
            pickId: pick.idempotencyKey, // stable backfill id (game+pickType)
            gameId: pick.gameKey,
            selection: pick.selection,
            pickType: pick.pickType,
            line: pick.line,
            entryOdds: pick.entryOdds,
            marketFairProb: pick.marketFairProb,
            confidence: pick.confidence,
            edgeScore: pick.edgeScore,
            modelProb: null, // honest: no calibrated prob exists; never confidence/100
            modelVersion: pick.modelVersion,
            asOf: pick.asOf,
          },
          sha256Hex,
        );
        receiptsMinted++;
      } catch {
        receiptsSkipped++;
      }
    } else {
      receiptsSkipped++;
    }
  }

  // 6) Summary (always printed). Honest record-level accounting.
  const wins = settled.filter((p) => p.result === "WIN").length;
  const losses = settled.filter((p) => p.result === "LOSS").length;
  const pushes = settled.filter((p) => p.result === "PUSH").length;
  const graded = wins + losses; // pushes excluded from win-rate denominator
  const winRate = graded > 0 ? (wins / graded) * 100 : null;
  const byType = (t: string) => settled.filter((p) => p.pickType === t).length;

  console.log("\n---------------- BACKFILL SUMMARY ----------------");
  console.log(`games with a publishable pick: ${gamesPlayed}`);
  console.log(`games skipped (unplayed/no score): ${gamesSkippedUnplayed}`);
  console.log(`settled picks: ${settled.length}  (SPREAD ${byType("SPREAD")}, TOTAL ${byType("TOTAL")}, MONEYLINE ${byType("MONEYLINE")})`);
  console.log(`results: ${wins} W / ${losses} L / ${pushes} P`);
  console.log(`win rate (excl. pushes): ${winRate === null ? "n/a" : winRate.toFixed(1) + "%"}  — HONEST, settled vs frozen-model picks`);
  console.log(`proof receipts minted: ${receiptsMinted} (skipped ${receiptsSkipped})`);
  console.log(`unique idempotency keys: ${new Set(settled.map((p) => p.idempotencyKey)).size} / ${settled.length}`);
  console.log(`lookahead errors: ${lookaheadErrors}  (MUST be 0)`);
  // CLV: entry == nflverse close → spread/total MATCHED by construction; surfaced honestly.
  const clvMatched = settled.filter((p) => p.clvVerdict === "MATCHED_CLOSE").length;
  console.log(`CLV: ${clvMatched} MATCHED_CLOSE (entry line == nflverse close; no separate close available)`);
  console.log("--------------------------------------------------");

  if (!WRITE) {
    console.log("\nDRY-RUN complete. NO database writes were performed.");
    console.log("To persist (owner-gated, needs a live DATABASE_URL), set BACKFILL_WRITE=1 and re-run.");
    console.log("Backfilled picks are isBootstrap=true and excluded from canonical history until promoted.\n");
    process.exit(lookaheadErrors === 0 ? 0 : 1);
    return;
  }

  // 7) WRITE MODE — owner-gated. Persists to the live DB, idempotently.
  //    This block is intentionally NOT exercised in dry-run and was NOT run during
  //    development. It mirrors processSport/settleSport: upsert by [gameId, pickType],
  //    isBootstrap=true, immutable snapshot + receipt. Requires a reachable DATABASE_URL.
  await writeBackfill(settled);
}

/**
 * Persist settled backfill picks to the live DB. Owner-gated (BACKFILL_WRITE=1) and
 * idempotent. Mirrors the live discipline:
 *   - upsert Pick by the [gameId, pickType] unique constraint (isBootstrap=true)
 *   - never overwrite a settled pick (result frozen)
 *   - immutable PickSignalSnapshot + PickProofReceipt (create-once)
 *
 * The backfill maps the nflverse game_id to a Game row via externalId. A Game must
 * already exist (or be created) for the FK; this requires the live DB + the historical
 * games archive. Kept as a clearly-gated shell that fails loudly if a prerequisite is
 * missing, rather than faking success.
 */
async function writeBackfill(settled: SettledHistoricalPick[]): Promise<void> {
  // Import lazily so a DRY-RUN never even loads the DB client / Prisma engine.
  const { db } = await import("../../packages/db/src/index.js");

  let written = 0;
  let skippedNoGame = 0;
  for (const pick of settled) {
    // The backfill keys on the nflverse game_id. The live Pick.gameId is a Game.id
    // (FK). We resolve via Game.externalId == nflverse game_id; the Game row must
    // exist. We do NOT fabricate games here — that is a separate, owner-reviewed
    // ingestion step (apps/web/lib/ingestion/historical-games.ts populates the
    // HistoricalGame archive; promoting those to Game rows is a deliberate action).
    const game = await db.game.findUnique({ where: { externalId: pick.gameKey }, select: { id: true } });
    if (!game) {
      skippedNoGame++;
      continue;
    }

    const existing = await db.pick.findUnique({
      where: { gameId_pickType: { gameId: game.id, pickType: pick.pickType } },
      select: { id: true, result: true },
    });
    // Frozen if already settled — never rewrite.
    if (existing && existing.result !== "PENDING") continue;

    const upserted = await db.pick.upsert({
      where: { gameId_pickType: { gameId: game.id, pickType: pick.pickType } },
      create: {
        gameId: game.id,
        pickType: pick.pickType,
        selection: pick.selection,
        line: pick.line,
        confidence: pick.confidence,
        edgeScore: pick.edgeScore,
        consensusPct: 1,
        bookmakerCount: pick.bookmakerCount,
        reasoning: `Historical backfill: ${pick.selection} (frozen ${pick.modelVersion}).`,
        modelVersion: pick.modelVersion,
        isBootstrap: true, // NEVER canonical until an owner promotes
        isFeatured: false,
        result: pick.result, // settled immediately — historical outcome is known
        settledAt: new Date(),
        clvLockLine: pick.pickType === "MONEYLINE" ? null : pick.line,
        clvLockPrice: pick.pickType === "MONEYLINE" ? pick.entryOdds : null,
        clvKind: pick.clvValue === null ? null : pick.pickType === "MONEYLINE" ? "PROBABILITY" : "POINTS",
        clvValue: pick.clvValue,
        clvVerdict: pick.clvVerdict,
      },
      update: {}, // immutable on re-run — idempotent
    });

    // Immutable proof receipt (create-once).
    if (pick.marketFairProb !== null && pick.entryOdds !== null) {
      const receipt = buildPickProofReceipt(
        {
          pickId: upserted.id,
          gameId: game.id,
          selection: pick.selection,
          pickType: pick.pickType,
          line: pick.line,
          entryOdds: pick.entryOdds,
          marketFairProb: pick.marketFairProb,
          confidence: pick.confidence,
          edgeScore: pick.edgeScore,
          modelProb: null,
          modelVersion: pick.modelVersion,
          asOf: pick.asOf,
        },
        sha256Hex,
      );
      await db.pickProofReceipt.upsert({
        where: { pickId: upserted.id },
        create: {
          pickId: receipt.pickId,
          payload: receipt.payload,
          contentHash: receipt.contentHash,
          marketFairProb: receipt.fields.marketFairProb,
          confidence: receipt.fields.confidence,
          edgeScore: receipt.fields.edgeScore,
          modelProb: receipt.fields.modelProb ?? null,
          entryOdds: receipt.fields.entryOdds,
          line: receipt.fields.line,
          modelVersion: receipt.fields.modelVersion,
          asOf: new Date(receipt.fields.asOf),
        },
        update: {},
      });
    }
    written++;
  }

  console.log(`\nWRITE complete: ${written} picks persisted (isBootstrap=true), ${skippedNoGame} skipped (no matching Game row).`);
  if (skippedNoGame > 0) {
    console.log(
      "Skipped games have no Game.externalId == nflverse game_id. Promote the HistoricalGame archive " +
        "to Game rows first (owner-reviewed), then re-run — this script will idempotently fill them in.",
    );
  }
}

main().catch((err) => {
  console.error("\nbackfill fatal:", err);
  process.exit(1);
});
