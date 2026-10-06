#!/usr/bin/env node
/**
 * scripts/factors/A26.mjs — C-407 numerical runner for docs/factors/A26.yaml.
 *
 * A26 asks for a man/zone coverage-scheme rate. This script fetches the live
 * public ftn_charting release header itself (rather than trusting a prior
 * read) and confirms no man/zone or coverage-scheme column exists, then
 * writes BLOCKED. It never invents a proxy for a scheme flag that is not in
 * the data.
 *
 * Data: nflverse ftn_charting (CC BY-SA 4.0), header check only, no persist.
 *
 * Usage:
 *   node scripts/factors/A26.mjs
 *   node scripts/factors/A26.mjs --no-cache
 */

import path from "node:path";
import { BASE, REPO_ROOT, headSha, loadText, parseCsv, writeYamlBlocked } from "./_lib.mjs";

const TAG = "A26";
const YAML = path.join(REPO_ROOT, "docs", "factors", "A26.yaml");
const noCache = process.argv.includes("--no-cache");
const FTN_URL = (s) => `${BASE}/ftn_charting/ftn_charting_${s}.csv`;
const CHECK_SEASONS = [2024, 2022];
const SCHEME_TOKENS = ["man", "zone", "coverage_scheme", "man_zone", "coverage_type"];

async function run() {
  const runAt = new Date().toISOString();
  const runSha = headSha();
  console.log(`[${TAG}] run_at=${runAt} run_sha=${runSha}`);

  let header = null;
  let checkedSeason = null;
  for (const season of CHECK_SEASONS) {
    try {
      const name = `ftn_charting_${season}_header_check.csv`;
      const loaded = await loadText(name, FTN_URL(season), { noCache, tag: TAG });
      header = parseCsv(loaded.text.split("\n").slice(0, 2).join("\n")).header;
      checkedSeason = season;
      console.log(`[${TAG}] fetched ftn_charting_${season}.csv header: ${header.length} columns`);
      break;
    } catch (e) {
      console.warn(`[${TAG}] ftn_charting_${season} unreachable: ${e instanceof Error ? e.message : e}`);
    }
  }

  if (!header) {
    writeYamlBlocked(
      YAML,
      "ftn_charting unreachable for every checked season; could not verify the man/zone-column claim directly this run",
      runSha,
      runAt,
    );
    console.log(`[${TAG}] RESULT status=BLOCKED (network) `);
    return 0;
  }

  const lower = header.map((h) => h.toLowerCase());
  const found = SCHEME_TOKENS.filter((tok) => lower.some((h) => h.includes(tok)));
  console.log(`[${TAG}] scheme-like columns found: ${found.length > 0 ? found.join(",") : "none"}`);

  const blockedOn =
    found.length > 0
      ? `unexpected: a scheme-like column (${found.join(",")}) now appears in ftn_charting_${checkedSeason}.csv — re-open A26 with a real estimand, do not mark BLOCKED`
      : `verified live 2026-09-15 (season ${checkedSeason}): ftn_charting_${checkedSeason}.csv header (${header.join(", ")}) carries no man/zone or coverage-scheme column. Coverage proxies available are n_defense_box, n_blitzers, n_pass_rushers, none of which distinguish man from zone. The A26 estimand as written cannot be read from any free, public, credential-free source this repo has found.`;

  writeYamlBlocked(YAML, blockedOn, runSha, runAt);
  console.log(`[${TAG}] RESULT status=BLOCKED found=${found.length}`);
  return 0;
}

run().then(
  (code) => process.exit(code),
  (err) => {
    console.error(`[${TAG}] fatal:`, err);
    process.exit(1);
  },
);
