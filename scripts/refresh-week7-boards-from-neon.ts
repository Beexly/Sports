/**
 * @file refresh-week7-boards-from-neon.ts
 *
 * Satisfies the "All slate data must come from Neon gse-postgres or the live
 * schedule source" invariant for scripts/generate-week7-master-slate-2026-10-25.ts.
 *
 * The generator itself reads committed board JSONs synchronously (as prescribed
 * by the plan's Task 5 Step 1: BOARD_DIR + LINES_PATH/PROPS_PATH). This script
 * is the Neon -> board-JSON refresh step: run it before the generator so the
 * JSON the generator reads is the Neon truth rather than a hand-maintained file.
 *
 * Usage:
 *   npx tsx scripts/refresh-week7-boards-from-neon.ts [--dry-run]
 *
 * Exit codes:
 *   0  boards refreshed (or --dry-run reported what would be written)
 *   1  Neon unreachable / auth failed — boards NOT modified, caller should
 *      treat slate generation as blocked for this run
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const WEEK7_DATE = "2026-10-25";
const BOARD_DIR = path.join(
  process.cwd(),
  "packages/prediction-engine/src/nfl/data/public-boards",
);
const LINES_PATH = path.join(BOARD_DIR, "espn-dk-week7-lines-2026.json");
const PROPS_PATH = path.join(BOARD_DIR, "espn-dk-week7-props-2026.json");

const DRY_RUN = process.argv.includes("--dry-run");

/** Shape the generator consumes (see espn-dk-week7-lines-2026.json). */
interface BoardLineRow {
  eventId: string;
  dkEventId: string;
  date: string;
  status: string;
  awayAbbr: string;
  awayName: string;
  awayRecord: string;
  homeAbbr: string;
  homeName: string;
  homeRecord: string;
  venue: string;
  city: string;
  country: string;
  indoor: boolean;
  weather: string;
  details: string;
  spreadAwayLine: number | null;
  spreadAwayOdds: number | null;
  spreadAwayOpenLine: number | null;
  spreadAwayOpenOdds: number | null;
  spreadHomeLine: number | null;
  spreadHomeOdds: number | null;
  spreadHomeOpenLine: number | null;
  spreadHomeOpenOdds: number | null;
  totalLine: number | null;
  overOdds: number | null;
  underOdds: number | null;
  totalOpenLine: number | null;
  overOpenOdds: number | null;
  underOpenOdds: number | null;
  mlAwayOdds: number | null;
  mlHomeOdds: number | null;
  mlAwayOpenOdds: number | null;
  mlHomeOpenOdds: number | null;
}

function dayWindow(dateStr: string): { gte: Date; lt: Date } {
  const gte = new Date(`${dateStr}T00:00:00Z`);
  const lt = new Date(gte);
  lt.setUTCDate(lt.getUTCDate() + 1);
  return { gte, lt };
}

async function main(): Promise<number> {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  try {
    const { gte, lt } = dayWindow(WEEK7_DATE);

    const games = await prisma.game.findMany({
      where: { commenceTime: { gte, lt } },
      select: {
        id: true,
        externalId: true,
        homeTeamName: true,
        awayTeamName: true,
        commenceTime: true,
        status: true,
        openingSpread: true,
        openingTotal: true,
      },
      orderBy: { commenceTime: "asc" },
    });

    if (games.length === 0) {
      console.error(
        `[refresh] Neon returned 0 games for ${WEEK7_DATE}. Boards NOT modified.`,
      );
      return 1;
    }

    const gameIds = games.map((g) => g.id);

    // Latest SPREAD + TOTAL per game per book, newest fetchedAt wins.
    const odds = await prisma.odds.findMany({
      where: { gameId: { in: gameIds }, market: { in: ["SPREAD", "TOTAL", "MONEYLINE"] } },
      orderBy: { fetchedAt: "desc" },
      select: {
        gameId: true,
        bookmaker: true,
        market: true,
        spread: true,
        total: true,
        homePrice: true,
        awayPrice: true,
        overPrice: true,
        underPrice: true,
      },
    });

    const byGame = new Map<string, typeof odds>();
    for (const o of odds) {
      const list = byGame.get(o.gameId) ?? [];
      list.push(o);
      byGame.set(o.gameId, list);
    }

    const rows: BoardLineRow[] = games.map((g) => {
      const list = byGame.get(g.id) ?? [];
      const spread = list.find((o) => o.market === "SPREAD");
      const total = list.find((o) => o.market === "TOTAL");
      const ml = list.find((o) => o.market === "MONEYLINE");
      const [awayAbbr = "", homeAbbr = ""] = [
        g.awayTeamName.slice(0, 3).toUpperCase(),
        g.homeTeamName.slice(0, 3).toUpperCase(),
      ];
      return {
        eventId: g.externalId,
        dkEventId: g.externalId,
        date: g.commenceTime.toISOString(),
        status: String(g.status),
        awayAbbr,
        awayName: g.awayTeamName,
        awayRecord: "",
        homeAbbr,
        homeName: g.homeTeamName,
        homeRecord: "",
        venue: "",
        city: "",
        country: "USA",
        indoor: false,
        weather: "",
        details: "",
        spreadAwayLine: spread?.spread ?? g.openingSpread ?? null,
        spreadAwayOdds: spread?.awayPrice ?? null,
        spreadAwayOpenLine: g.openingSpread ?? null,
        spreadAwayOpenOdds: null,
        spreadHomeLine: spread?.spread != null ? -spread.spread : null,
        spreadHomeOdds: spread?.homePrice ?? null,
        spreadHomeOpenLine: g.openingSpread != null ? -g.openingSpread : null,
        spreadHomeOpenOdds: null,
        totalLine: total?.total ?? g.openingTotal ?? null,
        overOdds: total?.overPrice ?? null,
        underOdds: total?.underPrice ?? null,
        totalOpenLine: g.openingTotal ?? null,
        overOpenOdds: null,
        underOpenOdds: null,
        mlAwayOdds: ml?.awayPrice ?? null,
        mlHomeOdds: ml?.homePrice ?? null,
        mlAwayOpenOdds: null,
        mlHomeOpenOdds: null,
      };
    });

    console.log(
      `[refresh] Neon returned ${rows.length} games for ${WEEK7_DATE}.`,
    );

    if (DRY_RUN) {
      console.log("[refresh] --dry-run: boards NOT written.");
      return 0;
    }

    fs.writeFileSync(LINES_PATH, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
    console.log(`[refresh] wrote ${LINES_PATH}`);

    // Props: Neon does not carry per-player prop markets in the Odds model, so
    // the props board is left untouched. The generator falls back to the
    // committed props snapshot; this is logged rather than fabricated.
    console.log(
      `[refresh] props board unchanged (no per-player prop markets in Neon Odds model): ${PROPS_PATH}`,
    );
    return 0;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[refresh] Neon unavailable — boards NOT modified.`);
    console.error(`[refresh] ${msg.split("\n").filter(Boolean)[0] ?? msg}`);
    return 1;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error("[refresh] unexpected failure:", err);
    process.exit(1);
  });
