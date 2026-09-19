#!/usr/bin/env node
/**
 * Complete board export for STATISTICS lane (MIMO-1/2/3).
 *
 * Supersedes the domination-plan snippet: adds sport key, bookmakerCount from
 * the pick column (not only factorBreakdown), margin columns, and ESPN ids.
 *
 * LAW 7: agents do NOT run this with invented DATABASE_URL. Founder/ops/Gemini
 * with real credentials:
 *   DATABASE_URL=... node scripts/ops/board-export.mjs [--out docs/ops/stats-lane/incoming/board-export.jsonl] [--limit 50000]
 *
 * Output is JSONL — one pick per line. Never prints secrets.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const url = process.env.DATABASE_URL?.trim();
if (!url || url === "stub" || url.startsWith("changeme")) {
  console.error("board-export: DATABASE_URL missing or stub — abort (no secrets invented)");
  process.exit(2);
}

const limit = Math.min(50000, Math.max(1, Number(arg("--limit", "50000")) || 50000));
const outPath = resolve(arg("--out", "docs/ops/stats-lane/incoming/board-export.jsonl"));
const prisma = new PrismaClient({ datasources: { db: { url } } });

function fbNum(fb, key) {
  const v = fb?.[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function fbStr(fb, key) {
  const v = fb?.[key];
  return typeof v === "string" && v ? v : null;
}

try {
  // Prefer settled published non-bootstrap; include PUSH/VOID so lane can filter.
  const rows = await prisma.pick.findMany({
    where: {
      isPublished: true,
      isBootstrap: false,
      result: { in: ["WIN", "LOSS", "PUSH", "VOID"] },
    },
    orderBy: { generatedAt: "desc" },
    take: limit,
    select: {
      id: true,
      gameId: true,
      pickType: true,
      selection: true,
      line: true,
      confidence: true,
      bookmakerCount: true,
      modelVersion: true,
      generatedAt: true,
      settledAt: true,
      result: true,
      isPublished: true,
      isBootstrap: true,
      tier: true,
      pickGrade: true,
      factorBreakdown: true,
      game: {
        select: {
          id: true,
          sport: true,
          sportId: true,
          commenceTime: true,
          startTime: true,
          homeScore: true,
          awayScore: true,
          homeTeam: true,
          awayTeam: true,
          homeTeamName: true,
          awayTeamName: true,
          espnEventId: true,
        },
      },
    },
  });

  mkdirSync(dirname(outPath), { recursive: true });
  const lines = [];
  for (const r of rows) {
    const fb = r.factorBreakdown && typeof r.factorBreakdown === "object" ? r.factorBreakdown : null;
    const g = r.game || {};
    const sportKey =
      g.sport ||
      g.sportId ||
      (typeof g.sport === "string" ? g.sport : null) ||
      null;
    const homeScore = typeof g.homeScore === "number" ? g.homeScore : null;
    const awayScore = typeof g.awayScore === "number" ? g.awayScore : null;
    const actualMargin =
      homeScore != null && awayScore != null ? homeScore - awayScore : null;
    const commenceTime = g.commenceTime || g.startTime || null;
    // predictedMeanMargin: prefer explicit fb field; else SPREAD → -line (home margin convention)
    let predictedMeanMargin = fbNum(fb, "predictedMeanMargin");
    const pickType = r.pickType || "";
    if (predictedMeanMargin == null && pickType === "SPREAD" && typeof r.line === "number") {
      predictedMeanMargin = -r.line;
    }
    const bookmakerCount =
      typeof r.bookmakerCount === "number" && Number.isFinite(r.bookmakerCount)
        ? r.bookmakerCount
        : fbNum(fb, "bookmakerCount");

    const rec = {
      pickId: r.id,
      gameId: r.gameId,
      sport: sportKey,
      pickType,
      selection: r.selection,
      line: typeof r.line === "number" ? r.line : null,
      result: r.result,
      modelVersion: r.modelVersion,
      generatedAt: r.generatedAt ? r.generatedAt.toISOString() : null,
      commenceTime: commenceTime ? new Date(commenceTime).toISOString() : null,
      settledAt: r.settledAt ? r.settledAt.toISOString() : null,
      confidence: typeof r.confidence === "number" ? r.confidence : null,
      rankingP: fbNum(fb, "rankingP"),
      rankingSource: fbStr(fb, "rankingSource"),
      marketFairProb: fbNum(fb, "marketFairProb"),
      independentTrueProb:
        fbNum(fb?.independentEdge, "trueProb") ?? fbNum(fb, "trueProb"),
      bookmakerCount,
      isBootstrap: r.isBootstrap === true,
      isPublished: r.isPublished === true,
      isFounder: false,
      tier: r.tier ?? null,
      pickGrade: r.pickGrade ?? null,
      homeScore,
      awayScore,
      actualMargin,
      predictedMeanMargin,
      homeTeamName: g.homeTeamName || g.homeTeam?.name || g.homeTeam || null,
      awayTeamName: g.awayTeamName || g.awayTeam?.name || g.awayTeam || null,
      espnEventId: g.espnEventId ?? null,
      marginKind: pickType === "SPREAD" ? "HOME_MARGIN" : pickType === "TOTAL" ? "TOTAL_POINTS" : null,
      publicMlImpliedProb: null, // optional join later for NCAAF K1
      exportedAt: new Date().toISOString(),
      purpose: "mimo_stats_lane_books_ordering_jackknife",
    };
    lines.push(JSON.stringify(rec));
  }
  writeFileSync(outPath, lines.join("\n") + (lines.length ? "\n" : ""), "utf8");
  console.log(
    JSON.stringify({
      ok: true,
      count: lines.length,
      out: outPath,
      filter: "isPublished && !isBootstrap && result in WIN/LOSS/PUSH/VOID",
      includes: [
        "bookmakerCount",
        "rankingP",
        "marketFairProb",
        "actualMargin|homeScore+awayScore",
        "predictedMeanMargin",
        "sport",
        "espnEventId",
      ],
    }),
  );
} catch (e) {
  console.error("board-export: fail", e instanceof Error ? e.message : e);
  process.exit(1);
} finally {
  await prisma.$disconnect().catch(() => {});
}
