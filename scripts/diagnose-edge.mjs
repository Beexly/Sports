#!/usr/bin/env node
/**
 * Edge diagnostic CLI — "where is the edge, really?"
 *
 * The public surface shows ONE number (a blended win rate). That number cannot
 * tell edge from variance, and it conflates the FREE teaser picks with the
 * PREMIUM picks customers pay for. This script reads the same Postgres the app
 * uses and prints the segmented truth: record + Closing-Line Value (CLV) overall
 * and split by tier / conviction grade / sport / model version, plus the two
 * cuts that matter most — the PREMIUM subset and the high-confidence subset.
 *
 * CLV is the headline: a pick that beats the closing line is beating the
 * sharpest version of the market, which predicts long-run profit long before a
 * noisy win-rate sample can. If CLV is flat/negative, the model is tracking the
 * market, not beating it — exactly what an all-market-derived confidence score
 * produces.
 *
 * Read-only. No writes, ever. Loads .env.production.local → .env.production →
 * existing process.env. Decision logic lives in, and is unit-tested via,
 * ./lib/edge-diagnostic.mjs.
 *
 * Usage:
 *   node scripts/diagnose-edge.mjs            # settled, published, canonical (matches /api/performance)
 *   node scripts/diagnose-edge.mjs --all      # include unpublished settled canonical picks too
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildEdgeDiagnostic, pct, BREAK_EVEN_WIN_RATE } from "./lib/edge-diagnostic.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(__dirname, "..");

const C = process.stdout.isTTY
  ? { reset: "\x1b[0m", red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m", cyan: "\x1b[36m", dim: "\x1b[2m", bold: "\x1b[1m" }
  : { reset: "", red: "", green: "", yellow: "", cyan: "", dim: "", bold: "" };

function loadEnvFile(path) {
  if (!existsSync(path)) return false;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const key = t.slice(0, eq).trim();
    const val = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = val;
  }
  return true;
}
[join(repoRoot, ".env.production.local"), join(repoRoot, ".env.production")].forEach(loadEnvFile);

const includeUnpublished = process.argv.includes("--all");

/** Color a CLV beat-rate by whether it clears the "beating the close" bar. */
function clvColor(rate) {
  if (rate === null) return C.dim;
  if (rate > 0.55) return C.green;
  if (rate >= 0.5) return C.yellow;
  return C.red;
}
function winColor(rate) {
  if (rate === null) return C.dim;
  return rate >= BREAK_EVEN_WIN_RATE ? C.green : C.red;
}

function row(s) {
  const wr = s.winRate === null ? "—" : pct(s.winRate);
  const clv = s.clvBeatRate === null ? "—" : pct(s.clvBeatRate);
  const avg = s.avgClv === null ? "" : ` ${C.dim}(avg ${s.avgClv.toFixed(3)})${C.reset}`;
  return (
    `  ${s.label.padEnd(22).slice(0, 22)} ` +
    `${C.dim}n=${C.reset}${String(s.n).padStart(4)}  ` +
    `${C.dim}W-L-P${C.reset} ${`${s.wins}-${s.losses}-${s.pushes}`.padEnd(12)} ` +
    `${C.dim}win${C.reset} ${winColor(s.winRate)}${wr.padStart(6)}${C.reset}  ` +
    `${C.dim}CLV beat${C.reset} ${clvColor(s.clvBeatRate)}${clv.padStart(6)}${C.reset} ${C.dim}(${s.clvGraded} graded)${C.reset}${avg}`
  );
}

function section(title, segments) {
  console.log(`\n${C.cyan}${title}${C.reset}`);
  if (segments.length === 0) { console.log(`  ${C.dim}(none)${C.reset}`); return; }
  for (const s of segments) console.log(row(s));
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error(`\n${C.red}DATABASE_URL unset — set it or add .env.production.local.${C.reset}\n`);
    process.exit(2);
  }
  let pg;
  try { pg = await import("pg"); } catch {
    console.error(`\n${C.red}\`pg\` not installed; run \`npm install pg\`.${C.reset}\n`);
    process.exit(2);
  }
  const client = new pg.default.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const publishedClause = includeUnpublished ? "" : `AND p."isPublished" = true`;
    const res = await client.query(
      `SELECT p."result", p."tier", p."confidence", p."pickGrade", p."modelVersion",
              p."clvValue", p."clvVerdict", s."name" AS sport
         FROM picks p
         JOIN games g  ON g."id" = p."gameId"
         JOIN sports s ON s."id" = g."sportId"
        WHERE p."result" IN ('WIN','LOSS','PUSH')
          AND p."isBootstrap" = false
          AND p."modelVersion" <> 'v5.0.0-seed'
          ${publishedClause}`
    );
    const rows = res.rows.map((r) => ({
      result: r.result,
      tier: r.tier,
      confidence: r.confidence === null ? null : Number(r.confidence),
      pickGrade: r.pickGrade,
      modelVersion: r.modelVersion,
      sport: r.sport,
      clvValue: r.clvValue === null ? null : Number(r.clvValue),
      clvVerdict: r.clvVerdict,
    }));

    const d = buildEdgeDiagnostic(rows);

    console.log(`\n${C.bold}EDGE DIAGNOSTIC${C.reset} ${C.dim}(${includeUnpublished ? "all settled canonical" : "published settled canonical"} · ${rows.length} picks)${C.reset}`);
    section("Overall", [d.overall]);
    section("What customers pay for", [d.highlights.premium, d.highlights.highConfidence]);
    section("By tier", d.byTier);
    section("By conviction grade", d.byGrade);
    section("By sport", d.bySport);
    section("By model version", d.byModelVersion);

    console.log(`\n${C.bold}VERDICT${C.reset}`);
    console.log(`  ${d.verdict}`);
    console.log(
      `\n  ${C.dim}Win rate is judged against the ${pct(BREAK_EVEN_WIN_RATE)} -110 break-even. ` +
      `CLV beat-rate is the leading indicator — above ~55% over a real sample is a genuine edge signal; ` +
      `near 50% or below means the picks track (or trail) the market.${C.reset}\n`
    );
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(`\n${C.red}diagnose-edge failed:${C.reset} ${err instanceof Error ? err.message : err}\n`);
  process.exit(1);
});
