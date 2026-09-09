#!/usr/bin/env npx tsx
/**
 * C-254 — repair the stored finals our own source contradicts, and re-grade the
 * settled picks sitting on them.
 *
 * C-247 measured the damage: stored FINAL scores that the ESPN feed we ingest
 * them FROM contradicts, with settled published picks on top of them and some
 * moneyline results recorded as the opposite of what happened. C-248 shipped
 * the detector. Neither could fix anything, so the item sat founder-owned with
 * no lever attached. This is the lever.
 *
 * DRY RUN BY DEFAULT. It prints every field it would change and every pick
 * whose result would flip, and writes nothing. `--execute` applies the plan,
 * one transaction per game, following the precedent of
 * scripts/ops/adjudicate-stale-picks.ts.
 *
 * THE WRITE, stated exactly, so nobody has to read the code to know what it
 * does:
 *   - `games.homeScore` / `games.awayScore` are set to the source's values.
 *   - each settled pick on that game gets the result the ENGINE'S OWN GRADER
 *     returns for the corrected score, via calculatePickResult and
 *     selectGradingLine, the same two functions that graded it originally.
 *   - `settledAt` is DELIBERATELY NOT touched: it is the settlement event time
 *     that daily-truth windows, calibration ranges and ordered histories slice
 *     on, so re-stamping it would move a corrected pick into today's counts.
 *   - nothing else. No publish flag moves, no pick is created or deleted, and
 *     PENDING and VOID rows are left to the settlement lane that owns them.
 *
 * IT REFUSES, RATHER THAN GUESSES:
 *   - a game whose ESPN event id cannot be derived from its externalId,
 *   - a game the scoreboard does not currently report as STATUS_FINAL,
 *   - a pick whose grading line or selection the engine will not grade, which
 *     is reported UNGRADEABLE and left untouched.
 *
 * Usage:
 *   npm run ops:repair-scores                              # dry run, mlb, 10d
 *   npm run ops:repair-scores -- --sport=mls --days=21     # dry run, wider
 *   npm run ops:repair-scores -- --sport=mlb --execute     # APPLY
 *   npm run ops:repair-scores -- --game=<id> --execute     # one game only
 *
 * Exit codes: 0 nothing to repair (or repaired cleanly), 1 repairs pending in
 * dry run, 2 refused to run.
 */
import { PrismaClient } from "@prisma/client";
import { reconcileScores, type SourceFinal, type StoredGame } from "./lib/score-reconciliation";
import {
  formatRepairPlan,
  planGameRepair,
  summarizeRepairPlan,
  type GameRepairPlan,
  type PickForRepair,
} from "./lib/score-repair";

const ESPN_PATHS: Readonly<Record<string, string>> = {
  mlb: "baseball/mlb",
  nfl: "football/nfl",
  ncaaf: "football/college-football",
  nba: "basketball/nba",
  ncaab: "basketball/mens-college-basketball",
  nhl: "hockey/nhl",
  mls: "soccer/usa.1",
};

const SPORT_KEYS: Readonly<Record<string, readonly string[]>> = {
  mlb: ["baseball_mlb"],
  nfl: ["americanfootball_nfl"],
  ncaaf: ["americanfootball_ncaaf"],
  nba: ["basketball_nba"],
  ncaab: ["basketball_ncaab"],
  nhl: ["icehockey_nhl"],
  mls: ["soccer_usa_mls"],
};

const url = process.env["DATABASE_URL"]?.trim();
if (!url || url === "stub" || url.startsWith("changeme")) {
  console.error("repair-stored-scores: DATABASE_URL missing or stub - abort (no secrets invented)");
  process.exit(2);
}

function arg(name: string, fallback: string): string {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

const SPORT = arg("sport", "mlb").toLowerCase();
const DAYS = Math.max(1, Math.min(60, Number(arg("days", "10")) || 10));
const ONLY_GAME = arg("game", "");
const EXECUTE = process.argv.includes("--execute");
/**
 * C-256 (Devin). Repairing a pick whose write-once settlement snapshot or
 * settlement event already froze the OLD result leaves a record contradicting
 * the corrected one. Those records are immutable by design - an event a
 * correction quietly edits is no longer evidence - so this tool does not
 * rewrite them, and it refuses to execute while any would be left behind unless
 * the operator says, explicitly, that they accept it.
 */
const ACCEPT_STALE_DERIVATIVES = process.argv.includes("--accept-stale-derivatives");
const JSON_OUT = process.argv.includes("--json");

const espnPath = ESPN_PATHS[SPORT];
const sportKeys = SPORT_KEYS[SPORT];
if (!espnPath || !sportKeys) {
  console.error(
    `repair-stored-scores: no scoreboard path for sport "${SPORT}" - abort rather than guess a URL. ` +
      `Known: ${Object.keys(ESPN_PATHS).join(", ")}`,
  );
  process.exit(2);
}

/** One scoreboard day. A failed fetch throws: a silent empty day would read as "nothing to repair". */
async function fetchDay(day: Date): Promise<SourceFinal[]> {
  const stamp =
    `${day.getUTCFullYear()}` +
    `${String(day.getUTCMonth() + 1).padStart(2, "0")}` +
    `${String(day.getUTCDate()).padStart(2, "0")}`;
  const res = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/${espnPath}/scoreboard?dates=${stamp}`,
    { headers: { accept: "application/json" } },
  );
  if (!res.ok) throw new Error(`scoreboard ${stamp}: HTTP ${res.status}`);
  const body = (await res.json()) as {
    events?: {
      id?: string;
      competitions?: {
        status?: { type?: { name?: string } };
        competitors?: { homeAway?: string; score?: string }[];
      }[];
    }[];
  };
  const out: SourceFinal[] = [];
  for (const ev of body.events ?? []) {
    const comp = ev.competitions?.[0];
    // Only a FINAL is better evidence than what we stored. An in-progress or
    // postponed event is not a repair, it is a different number.
    if (comp?.status?.type?.name !== "STATUS_FINAL") continue;
    let home: number | null = null;
    let away: number | null = null;
    for (const c of comp.competitors ?? []) {
      const n = Number(c.score);
      if (!Number.isFinite(n)) continue;
      if (c.homeAway === "home") home = n;
      else if (c.homeAway === "away") away = n;
    }
    if (ev.id && home !== null && away !== null) {
      out.push({ eventId: ev.id, homeScore: home, awayScore: away });
    }
  }
  return out;
}

async function main(): Promise<void> {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);
  try {
    const rows = await prisma.game.findMany({
      where: {
        status: "FINAL",
        homeScore: { not: null },
        commenceTime: { gte: since },
        sport: { key: { in: [...sportKeys] } },
        ...(ONLY_GAME ? { id: ONLY_GAME } : {}),
      },
      select: {
        id: true,
        externalId: true,
        commenceTime: true,
        homeTeamName: true,
        awayTeamName: true,
        homeScore: true,
        awayScore: true,
        sport: { select: { key: true } },
        picks: {
          select: {
            id: true,
            pickType: true,
            selection: true,
            line: true,
            clvLockLine: true,
            isPublished: true,
            result: true,
            // C-256 (Devin). Both are write-once by their lanes and both mirror
            // or freeze a result, so both would contradict a corrected pick.
            // Read so the plan can name them; never written by this tool.
            signalSnapshot: { select: { settlementResult: true } },
            settlementEvent: { select: { result: true } },
          },
        },
        _count: {
          select: { picks: { where: { isPublished: true, result: { in: ["WIN", "LOSS", "PUSH"] } } } },
        },
      },
    });

    const stored: StoredGame[] = rows.map((r) => ({
      id: r.id,
      externalId: r.externalId,
      commenceTime: r.commenceTime,
      homeTeamName: r.homeTeamName,
      awayTeamName: r.awayTeamName,
      homeScore: r.homeScore,
      awayScore: r.awayScore,
      settledPicks: r._count.picks,
    }));

    const finals: SourceFinal[] = [];
    for (let i = -1; i <= DAYS + 1; i++) {
      const day = new Date(since.getTime() + i * 24 * 60 * 60 * 1000);
      finals.push(...(await fetchDay(day)));
    }

    const report = reconcileScores(stored, finals);
    const byId = new Map(rows.map((r) => [r.id, r]));

    const plans: GameRepairPlan[] = [];
    for (const mismatch of report.mismatches) {
      const row = byId.get(mismatch.gameId);
      if (!row) continue;
      const picks: PickForRepair[] = row.picks.map((p) => ({
        id: p.id,
        pickType: p.pickType as PickForRepair["pickType"],
        selection: p.selection,
        line: p.line,
        clvLockLine: p.clvLockLine,
        isPublished: p.isPublished,
        result: p.result,
        snapshotSettlementResult: p.signalSnapshot?.settlementResult ?? null,
        settlementEventResult: p.settlementEvent?.result ?? null,
      }));
      plans.push(
        planGameRepair(
          mismatch,
          {
            homeTeamName: row.homeTeamName,
            awayTeamName: row.awayTeamName,
            sportKey: row.sport?.key ?? "unknown",
          },
          picks,
        ),
      );
    }

    const plan = summarizeRepairPlan(plans);

    if (JSON_OUT) {
      console.log(JSON.stringify({ sport: SPORT, days: DAYS, executed: EXECUTE, ...plan }, null, 2));
    } else {
      console.log(
        `[repair-stored-scores] sport=${SPORT} window=${DAYS}d ` +
          `uncomparable=${report.uncomparable} ${EXECUTE ? "EXECUTE" : "DRY RUN"}`,
      );
      for (const line of formatRepairPlan(plan)) console.log(line);
    }

    if (plan.totals.games === 0) {
      if (!JSON_OUT) console.log("Nothing to repair.");
      return;
    }

    if (!EXECUTE) {
      if (!JSON_OUT) {
        console.log("");
        console.log(
          "DRY RUN: nothing was written. Re-run with --execute to apply exactly the plan above. " +
            "See docs/ops/SCORE_INTEGRITY_2026-09-08.md",
        );
      }
      process.exitCode = 1;
      return;
    }

    // C-256 (Devin). Refuse before writing anything, not per game mid-loop: an
    // operator must not discover halfway through that the run is partial.
    if (plan.totals.staleDerivatives > 0 && !ACCEPT_STALE_DERIVATIVES) {
      console.error("");
      console.error(
        `REFUSING TO EXECUTE: ${plan.totals.staleDerivatives} write-once record(s) listed above ` +
          `would keep the OLD result after this repair. PickSignalSnapshot.settlementResult and ` +
          `PickSettlementEvent.result are written once by their lanes and are not rewritten here, ` +
          `because an immutable event a correction edits is no longer evidence of anything. ` +
          `Re-run with --accept-stale-derivatives to proceed and leave them contradicting the ` +
          `corrected results, or repair those picks through a lane that owns those records.`,
      );
      process.exitCode = 1;
      return;
    }

    let gamesWritten = 0;
    let picksWritten = 0;
    let gamesRefused = 0;
    for (const g of plan.plans) {
      if (g.refused) {
        gamesRefused += 1;
        if (!JSON_OUT) console.log(`  refused ${g.matchup}: ${g.refusedReason ?? "unrepairable"}`);
        continue;
      }
      const changed = g.picks.filter((p) => p.changed);
      // One transaction per game: the score and the grades it implies land
      // together or not at all. A half-applied game is exactly the state this
      // whole exercise exists to remove.
      await prisma.$transaction([
        prisma.game.update({
          where: { id: g.gameId },
          data: { homeScore: g.sourceScore.home, awayScore: g.sourceScore.away },
        }),
        // C-258 (Devin). `settledAt` is NOT touched, and the first version of
        // this tool was wrong to stamp it with the correction time. It is read
        // everywhere as the settlement EVENT time: daily-truth windows,
        // calibration date ranges, journal ordering, proof ordering and
        // sequential ROI all slice on it. Re-stamping a pick settled on
        // 2026-09-01 would move it into today's counts and reorder every
        // history that reads it, which is a second falsification laid on top of
        // the one being repaired. When the correction happened belongs in the
        // operator's run output, not in a field that already means something
        // else.
        ...changed.map((p) =>
          prisma.pick.update({
            where: { id: p.pickId },
            data: { result: p.to as "WIN" | "LOSS" | "PUSH" },
          }),
        ),
        // C-274 (Devin). TeamGameLog stores teamScore, opponentScore, result
        // and atsResult DERIVED from this game's score, and it is not a dead
        // archive: build-independent-fair-values.ts reads it to produce the
        // independent factors behind trueProb, and context-enrichment /
        // team-rates-source read it for form and ATS. Correcting the score and
        // leaving those rows would feed the wrong outcome straight back into
        // the engine's own inputs while the tool reported success - the same
        // score-result contradiction this exists to remove, one table over.
        //
        // The rows are NOT rewritten here. settleGameLogs is the canonical
        // writer and it applies opening-spread ATS semantics plus the bootstrap
        // and data-quality gates; a second implementation inside a repair tool
        // is exactly the drift C-253 warned about. Instead the game's existing
        // TEAM_GAME_LOG row is reset to PENDING so the repair drain that
        // already runs every settlement cycle (drainPendingTeamGameLogs)
        // recomputes both team rows from the corrected score.
        //
        // UPSERT, and neither half is optional - each one alone is a silent
        // no-op on a real cohort (Devin, second pass).
        //
        // An `enqueue` alone fails on the PAID path: PostSettlementWork is
        // unique on (subjectId, kind), a game settled by settle-sport.ts
        // already holds a DONE row, and enqueuePostSettlementWork's
        // skipDuplicates turns the insert into a no-op.
        //
        // An `updateMany` alone fails on the FREE path, which is the primary
        // settlement lane here: free-settlement-runner.ts enqueues CLV_GRADE
        // and SNAPSHOT_OUTCOME and NOT TEAM_GAME_LOG, so those games have no
        // work row at all and an update matches zero rows. That is the larger
        // cohort, and it is the one most likely to need a repair.
        //
        // The upsert re-arms an existing row and creates one when none exists.
        // completedAt is cleared so a DONE timestamp never survives on a
        // PENDING row - a record contradicting its own status is the defect
        // class this whole branch keeps removing.
        prisma.postSettlementWork.upsert({
          where: { subjectId_kind: { subjectId: g.gameId, kind: "TEAM_GAME_LOG" } },
          update: { status: "PENDING", completedAt: null },
          create: { subjectId: g.gameId, kind: "TEAM_GAME_LOG", status: "PENDING" },
        }),
      ]);
      gamesWritten += 1;
      picksWritten += changed.length;
      if (!JSON_OUT)
        console.log(
          `  applied ${g.matchup}: score corrected, ${changed.length} pick(s) re-graded, ` +
            `team game logs re-queued (rebuilt by the drain, subject to its policy)`,
        );
    }
    if (!JSON_OUT) {
      console.log("");
      console.log(
        `Applied: ${gamesWritten} game(s), ${picksWritten} pick result(s).` +
          (gamesRefused > 0
            ? ` REFUSED ${gamesRefused} game(s) that carry an ungradeable settled pick.`
            : "") +
          (plan.totals.staleDerivatives > 0
            ? ` ${plan.totals.staleDerivatives} write-once record(s) still hold the old result.`
            : "") +
          (gamesWritten > 0
            ? ` Team game logs for ${gamesWritten} game(s) are RE-QUEUED, not rewritten by this` +
              ` tool. The TEAM_GAME_LOG drain rebuilds them on the next settlement cycle` +
              ` SUBJECT TO ITS OWN POLICY: settleGameLogs skips the write entirely when the` +
              ` game's dataQualityScore is below gates.minDataQualityForGameLog, and the drain` +
              ` marks the work DONE either way. Verify the team logs afterwards rather than` +
              ` assuming the re-queue rewrote them.`
            : "") +
          ` Re-run npm run ops:verify-scores to confirm the mismatch count.`,
      );
    }
    // A refused game is still a mismatch on the record. Exiting 0 here would
    // let an operator read a partial repair as a complete one.
    if (gamesRefused > 0) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error("repair-stored-scores failed:", err);
  process.exit(2);
});
