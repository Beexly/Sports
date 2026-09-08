#!/usr/bin/env npx tsx
/**
 * Read-only reconciliation of the final scores we STORED against the finals the
 * source we ingest from is serving right now.
 *
 * C-247, 2026-09-08. Measured on production: 25 of 169 MLB `games` rows marked
 * FINAL held a score ESPN's own API contradicted, 54 settled published picks
 * sat on them, and 8 published moneyline results were the opposite of what
 * happened. Nothing in the platform was checking. This is that check, in a form
 * the owner can run on demand and a form that can later be pointed at a cron.
 *
 * Modeled on scripts/ops/list-stale-pending-picks.ts: DATABASE_URL-guarded and
 * SELECT-only. No create/update/delete/upsert/$executeRaw call exists in this
 * file. The comparison itself is pure and lives in
 * scripts/ops/lib/score-reconciliation.ts so it can be unit-tested without a
 * network or a database.
 *
 * It REPAIRS NOTHING. Re-fetching a correct score and re-grading the affected
 * picks are writes, and writes on this data are an owner decision: see
 * docs/ops/SCORE_INTEGRITY_2026-09-08.md.
 *
 * Usage:
 *   npm run ops:verify-scores
 *   npm run ops:verify-scores -- --sport=nfl --days=21 --json
 *
 * Exit codes: 0 clean, 1 mismatches found, 2 refused to run.
 */
import { PrismaClient } from "@prisma/client";
import {
  formatReconciliation,
  reconcileScores,
  type SourceFinal,
  type StoredGame,
} from "./lib/score-reconciliation";

/**
 * ESPN scoreboard paths. Explicit rather than derived: an unknown sport must
 * refuse, not guess a URL and report "0 mismatches" from an empty board.
 */
const ESPN_PATHS: Readonly<Record<string, string>> = {
  mlb: "baseball/mlb",
  nfl: "football/nfl",
  ncaaf: "football/college-football",
  nba: "basketball/nba",
  ncaab: "basketball/mens-college-basketball",
  nhl: "hockey/nhl",
};

/** Sport key prefixes in `games.externalId` / the sports table, per sport flag. */
const SPORT_KEYS: Readonly<Record<string, readonly string[]>> = {
  mlb: ["baseball_mlb"],
  nfl: ["americanfootball_nfl"],
  ncaaf: ["americanfootball_ncaaf"],
  nba: ["basketball_nba"],
  ncaab: ["basketball_ncaab"],
  nhl: ["icehockey_nhl"],
};

const url = process.env["DATABASE_URL"]?.trim();
if (!url || url === "stub" || url.startsWith("changeme")) {
  console.error("verify-stored-scores: DATABASE_URL missing or stub - abort (no secrets invented)");
  process.exit(2);
}

function arg(name: string, fallback: string): string {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

const SPORT = arg("sport", "mlb").toLowerCase();
const DAYS = Math.max(1, Math.min(60, Number(arg("days", "10")) || 10));
const JSON_OUT = process.argv.includes("--json");

const espnPath = ESPN_PATHS[SPORT];
const sportKeys = SPORT_KEYS[SPORT];
if (!espnPath || !sportKeys) {
  console.error(
    `verify-stored-scores: no scoreboard path for sport "${SPORT}" - abort rather than guess a URL. ` +
      `Known: ${Object.keys(ESPN_PATHS).join(", ")}`,
  );
  process.exit(2);
}

/** One scoreboard day. A failed fetch throws: a silent empty day would read as "no mismatches". */
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
      },
      select: {
        id: true,
        externalId: true,
        commenceTime: true,
        homeTeamName: true,
        awayTeamName: true,
        homeScore: true,
        awayScore: true,
        _count: { select: { picks: { where: { result: { in: ["WIN", "LOSS", "PUSH"] } } } } },
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

    // One call per UTC day across the window, plus a day either side so a late
    // game that crosses midnight UTC is still on a board we fetched.
    const finals: SourceFinal[] = [];
    for (let i = -1; i <= DAYS + 1; i++) {
      const day = new Date(since.getTime() + i * 24 * 60 * 60 * 1000);
      finals.push(...(await fetchDay(day)));
    }

    const report = reconcileScores(stored, finals);

    if (JSON_OUT) {
      console.log(JSON.stringify({ sport: SPORT, days: DAYS, ...report }, null, 2));
    } else {
      console.log(`[verify-stored-scores] sport=${SPORT} window=${DAYS}d`);
      for (const line of formatReconciliation(report)) console.log(line);
      if (report.mismatches.length > 0) {
        console.log("");
        console.log(
          "This tool repairs nothing. Re-fetching the correct score and re-grading the affected " +
            "picks are writes and an owner decision: docs/ops/SCORE_INTEGRITY_2026-09-08.md",
        );
      }
    }

    if (report.mismatches.length > 0) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error("verify-stored-scores failed:", err);
  process.exit(2);
});
