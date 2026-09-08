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
 *   - `settledAt` is refreshed so the audit trail shows when it was corrected.
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

    let gamesWritten = 0;
    let picksWritten = 0;
    for (const g of plan.plans) {
      const changed = g.picks.filter((p) => p.changed);
      // One transaction per game: the score and the grades it implies land
      // together or not at all. A half-applied game is exactly the state this
      // whole exercise exists to remove.
      await prisma.$transaction([
        prisma.game.update({
          where: { id: g.gameId },
          data: { homeScore: g.sourceScore.home, awayScore: g.sourceScore.away },
        }),
        ...changed.map((p) =>
          prisma.pick.update({
            where: { id: p.pickId },
            data: { result: p.to as "WIN" | "LOSS" | "PUSH", settledAt: new Date() },
          }),
        ),
      ]);
      gamesWritten += 1;
      picksWritten += changed.length;
      if (!JSON_OUT) console.log(`  applied ${g.matchup}: score corrected, ${changed.length} pick(s) re-graded`);
    }
    if (!JSON_OUT) {
      console.log("");
      console.log(
        `Applied: ${gamesWritten} game(s), ${picksWritten} pick result(s). ` +
          `Re-run npm run ops:verify-scores to confirm the mismatch count is now 0.`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error("repair-stored-scores failed:", err);
  process.exit(2);
});
