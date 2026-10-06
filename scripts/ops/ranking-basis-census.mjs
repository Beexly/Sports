#!/usr/bin/env node
/**
 * Print the ranking-basis census for the published pick population.
 *
 * WHY. Closes the open question in `apps/web/lib/ranking/sort-key.ts`: the public
 * board sorts through a cascade that PREFERS `rankingP` (measured monotone) and
 * falls back to `confidence` (measured ANTI-predictive, n 2,385, z = -10.7), and
 * nothing has ever measured what share of real rows resolves to the good branch.
 * `/api/board/state` cannot answer it because it nulls `rankingP` for non-premium
 * viewers by design (GSE-SEC-026).
 *
 * This script is the one-shot form of the same query the census route runs, so
 * the number can be obtained without a deploy. It uses the SAME filter as
 * `apps/web/lib/calibration/ranking-basis-census.ts` and as `loadConfidenceTail`
 * (settled WIN/LOSS, published, non-bootstrap, not the seed model) so the result
 * is directly comparable to the confidence figures in AGENTS.md.
 *
 * READ-ONLY. A SELECT and nothing else.
 *
 * USAGE (from the repo root):
 *   DATABASE_URL="<read-only neon url>" node scripts/ops/ranking-basis-census.mjs
 *
 * or, to reuse an existing local env file:
 *   node --env-file=apps/web/.env.local scripts/ops/ranking-basis-census.mjs
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

/** Same constant as apps/web/lib/calibration/confidence-tail.ts. */
const SEED_MODEL_VERSION = "v5.0.0-seed";

function readRankingKey(pick) {
  const conf = Number.isFinite(pick.confidence) ? pick.confidence / 100 : 0;
  const fb = pick.factorBreakdown;
  if (!fb || typeof fb !== "object") return { basis: "confidence", key: conf };
  const rec = fb;
  const rankingP = rec["rankingP"];
  if (typeof rankingP === "number" && Number.isFinite(rankingP)) {
    return { basis: "rankingP", key: Math.min(1, Math.max(0, rankingP)) };
  }
  const rankingScore = rec["rankingScore"];
  if (typeof rankingScore === "number" && Number.isFinite(rankingScore)) {
    return { basis: "rankingScore", key: Math.min(1, Math.max(0, rankingScore / 100)) };
  }
  return { basis: "confidence", key: conf };
}

async function main() {
  const rows = await db.pick.findMany({
    where: {
      result: { in: ["WIN", "LOSS"] },
      isPublished: true,
      isBootstrap: false,
      NOT: { modelVersion: SEED_MODEL_VERSION },
    },
    select: { confidence: true, factorBreakdown: true, modelVersion: true },
  });

  let rankingP = 0;
  let rankingScore = 0;
  let confidence = 0;
  const versions = new Map();
  for (const r of rows) {
    const basis = readRankingKey(r).basis;
    if (basis === "rankingP") rankingP += 1;
    else if (basis === "rankingScore") rankingScore += 1;
    else confidence += 1;
    const v = r.modelVersion ?? "(null)";
    versions.set(v, (versions.get(v) ?? 0) + 1);
  }
  const total = rows.length;
  const share = total === 0 ? 0 : confidence / total;

  const line = (s) => process.stdout.write(`${s}\n`);
  line("[ranking-basis] population: settled (WIN/LOSS), published, non-bootstrap, non-seed picks");
  line(`[ranking-basis] n = ${total}`);
  line(`[ranking-basis] ordered by rankingP      (monotone,  the key we WANT) : ${rankingP}  (${pct(rankingP, total)})`);
  line(`[ranking-basis] ordered by rankingScore  (intermediate)                 : ${rankingScore}  (${pct(rankingScore, total)})`);
  line(`[ranking-basis] ordered by confidence    (ANTI-predictive, z = -10.7)  : ${confidence}  (${pct(confidence, total)})`);
  line("");
  line(`[ranking-basis] CONFIDENCE SHARE = ${share.toFixed(4)}`);
  line("");
  if (total === 0) {
    line("[ranking-basis] No rows. That is a real answer, not a fault: this script measures");
    line("               published settled picks, and an empty population cannot be divided.");
  } else if (confidence === 0) {
    line("[ranking-basis] READ: every row resolves to rankingP. The board is ordered on the");
    line("               monotone key and the anti-predictive branch is never used.");
  } else if (share >= 0.5) {
    line("[ranking-basis] FINDING: most rows fall through to `confidence`, which is the branch");
    line("               measured ANTI-predictive. The board LOOKS like it ranks on the");
    line("               monotone key and is not doing so for these rows.");
    line("               This is a measurement, not a gate: reordering the public board is a");
    line("               founder decision. Record it and decide; do not silently change it.");
  } else {
    line("[ranking-basis] MIXED: some rows use the anti-predictive branch. Worth a look before");
    line("               any ranking change, since the fallback is silent per-row.");
  }
  const versionLine = [...versions.entries()].sort((a, b) => b[1] - a[1]).map(([v, n]) => `${v}=${n}`);
  if (versionLine.length > 0) line(`[ranking-basis] by modelVersion: ${versionLine.join("  ")}`);
}

function pct(n, total) {
  if (total === 0) return "  n/a";
  return `${((n / total) * 100).toFixed(1)}%`;
}

main()
  .catch((error) => {
    process.stderr.write(`[ranking-basis] FAILED: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
