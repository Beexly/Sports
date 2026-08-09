#!/usr/bin/env node
/**
 * Read-only export of settled non-seed picks → JSONL for calibration/ranker work.
 * No training stack. Requires DATABASE_URL. Never prints secrets.
 *
 * Usage:
 *   DATABASE_URL=... node scripts/export-settled-picks-for-calibration.mjs
 *   DATABASE_URL=... node scripts/export-settled-picks-for-calibration.mjs --out reports/settled-picks.jsonl --limit 5000
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

const url = process.env.DATABASE_URL?.trim();
if (!url || url === "stub" || url.startsWith("changeme")) {
  console.error("export-settled-picks: DATABASE_URL missing or stub — abort (no secrets invented)");
  process.exit(2);
}

const limit = Math.min(50000, Math.max(1, Number(arg("--limit", "5000")) || 5000));
const outPath = resolve(arg("--out", "reports/settled-picks-for-calibration.jsonl"));

const prisma = new PrismaClient({ datasources: { db: { url } } });

try {
  const rows = await prisma.pick.findMany({
    where: {
      result: { not: "PENDING" },
      settledAt: { not: null },
      isBootstrap: false,
    },
    orderBy: { settledAt: "desc" },
    take: limit,
    select: {
      id: true,
      gameId: true,
      pickType: true,
      selection: true,
      line: true,
      confidence: true,
      edgeScore: true,
      consensusPct: true,
      bookmakerCount: true,
      tier: true,
      pickGrade: true,
      riskLevel: true,
      modelVersion: true,
      generatedAt: true,
      dataFreshnessAt: true,
      result: true,
      settledAt: true,
      isPublished: true,
      clvLockLine: true,
      clvLockPrice: true,
      factorBreakdown: true,
      clvCloseLine: true,
      clvClosePrice: true,
      clvKind: true,
      clvValue: true,
      clvVerdict: true,
      bookDisagreementAtLock: true,
      game: {
        select: {
          id: true,
          startTime: true,
          sportId: true,
          homeTeamId: true,
          awayTeamId: true,
          status: true,
        },
      },
    },
  });

  const lines = rows.map((r) => {
    const fb = r.factorBreakdown && typeof r.factorBreakdown === "object" ? r.factorBreakdown : null;
    const rankingP = fb && typeof fb.rankingP === "number" && Number.isFinite(fb.rankingP) ? fb.rankingP : null;
    const rankingSource = fb && typeof fb.rankingSource === "string" ? fb.rankingSource : null;
    const marketFairProb = fb && typeof fb.marketFairProb === "number" && Number.isFinite(fb.marketFairProb) ? fb.marketFairProb : null;
    const trueProb =
      fb && fb.independentEdge && typeof fb.independentEdge === "object" && typeof fb.independentEdge.trueProb === "number"
        ? fb.independentEdge.trueProb
        : fb && typeof fb.trueProb === "number"
          ? fb.trueProb
          : null;
    const { factorBreakdown: _drop, ...rest } = r;
    return JSON.stringify({
      ...rest,
      rankingP,
      rankingSource,
      marketFairProb,
      independentTrueProb: trueProb,
      generatedAt: r.generatedAt?.toISOString?.() ?? r.generatedAt,
      settledAt: r.settledAt?.toISOString?.() ?? r.settledAt,
      dataFreshnessAt: r.dataFreshnessAt?.toISOString?.() ?? r.dataFreshnessAt,
      game: r.game
        ? {
            ...r.game,
            startTime: r.game.startTime?.toISOString?.() ?? r.game.startTime,
          }
        : null,
      exportedAt: new Date().toISOString(),
      purpose: "calibration_ranker_labels_only",
    });
  });

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, lines.join("\n") + (lines.length ? "\n" : ""), "utf8");
  console.log(
    JSON.stringify({
      ok: true,
      count: lines.length,
      out: outPath,
      filter: "result!=PENDING,settledAt!=null,isBootstrap=false",
      limit,
    }),
  );
} catch (e) {
  console.error("export-settled-picks: fail", e instanceof Error ? e.message : e);
  process.exit(1);
} finally {
  await prisma.$disconnect().catch(() => {});
}
