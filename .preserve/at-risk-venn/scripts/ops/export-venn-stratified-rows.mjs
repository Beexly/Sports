#!/usr/bin/env node
/**
 * READ-ONLY export of settled picks for the VENN-DP-STRATIFIED census.
 *
 * SELECT only. Requires DATABASE_URL (from the Neon `hermes_ro` role; the
 * string is never printed or persisted by this script). Writes JSONL, one
 * row per settled non-bootstrap pick, with the probability candidates and
 * the game's sport key attached.
 *
 * Usage:
 *   DATABASE_URL=... node scripts/ops/export-venn-stratified-rows.mjs \
 *     --out reports/venn-stratified/settled-picks.jsonl --limit 20000
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
  console.error("export-venn-stratified-rows: DATABASE_URL missing — abort (no secrets invented)");
  process.exit(2);
}

const limit = Math.min(100000, Math.max(1, Number(arg("--limit", "20000")) || 20000));
const outPath = resolve(arg("--out", "reports/venn-stratified/settled-picks.jsonl"));

const prisma = new PrismaClient({ datasources: { db: { url } } });

try {
  const rows = await prisma.pick.findMany({
    where: {
      result: { not: "PENDING" },
      settledAt: { not: null },
      isBootstrap: false,
    },
    orderBy: { settledAt: "asc" },
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
      modelVersion: true,
      generatedAt: true,
      dataFreshnessAt: true,
      result: true,
      settledAt: true,
      isPublished: true,
      factorBreakdown: true,
      game: {
        select: {
          id: true,
          commenceTime: true,
          status: true,
          sportId: true,
          sport: { select: { key: true } },
        },
      },
    },
  });

  const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);

  const lines = rows.map((r) => {
    const fb = r.factorBreakdown && typeof r.factorBreakdown === "object" ? r.factorBreakdown : null;
    const indep =
      fb && fb.independentEdge && typeof fb.independentEdge === "object" ? fb.independentEdge : null;
    return JSON.stringify({
      rowId: r.id,
      gameId: r.gameId,
      sport: r.game?.sport?.key ?? null,
      sportId: r.game?.sportId ?? null,
      pickType: r.pickType,
      selection: r.selection,
      line: num(r.line),
      bookmakerCount: r.bookmakerCount,
      confidence: r.confidence,
      edgeScore: num(r.edgeScore),
      consensusPct: num(r.consensusPct),
      tier: r.tier,
      pickGrade: r.pickGrade,
      modelVersion: r.modelVersion,
      result: r.result,
      isPublished: r.isPublished,
      generatedAt: r.generatedAt?.toISOString?.() ?? r.generatedAt,
      settledAt: r.settledAt?.toISOString?.() ?? r.settledAt,
      commenceTime: r.game?.commenceTime?.toISOString?.() ?? r.game?.commenceTime ?? null,
      gameStatus: r.game?.status ?? null,
      // Probability candidates — the census takes an explicit field; nothing
      // here is silently preferred.
      rankingP: fb ? num(fb.rankingP) : null,
      rankingSource: fb && typeof fb.rankingSource === "string" ? fb.rankingSource : null,
      marketFairProb: fb ? num(fb.marketFairProb) : null,
      independentTrueProb: indep ? num(indep.trueProb) : fb ? num(fb.trueProb) : null,
      independentEdgeDecision: indep && typeof indep.decision === "string" ? indep.decision : null,
      expectedClv: indep ? num(indep.expectedClv) : null,
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
  console.error("export-venn-stratified-rows: fail", e instanceof Error ? e.message : e);
  process.exit(1);
} finally {
  await prisma.$disconnect().catch(() => {});
}
