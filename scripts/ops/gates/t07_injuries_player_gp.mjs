#!/usr/bin/env node
/**
 * T-07 — 32-team 800-row Week 10 injuries & player_gp denominators (WP-7).
 * Contract (WP-3/4):
 *   - Neon injuries week=10 season=2026: >= 800 rows, 32 distinct teams.
 *   - neon-injury-roster-loader.ts exists with unit tests that pass, and the
 *     per-game rate code divides by PLAYER games played (player_gp), never
 *     team GP (source must reference player_gp / playerGamesPlayed).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import pg from "pg";
import { execSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const failures = [];

let url = (process.env.DATABASE_URL ?? "").trim();
if (!url) {
  url = execSync("neonctl connection-string main --project-id summer-brook-99380762 --role-name hermes_ro", { encoding: "utf8" }).trim();
}
const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  const r = await client.query(
    `SELECT count(*)::int AS n, count(DISTINCT team)::int AS teams, max("fetchedAt") AS latest
       FROM injuries WHERE season = 2026 AND week = 10`);
  const { n, teams, latest } = r.rows[0];
  console.log(`  injuries wk10: rows=${n} teams=${teams} latest=${latest}`);
  if (n < 800) failures.push(`only ${n} injury rows (<800)`);
  if (teams !== 32) failures.push(`${teams} teams (!=32)`);
} catch (err) {
  failures.push(`injury census: ${err.message}`);
} finally {
  await client.end();
}

// locate the loader + its tests
const candidates = [
  "apps/web/lib/data-sources/neon-injury-roster-loader.ts",
  "packages/ingestion-pipeline/src/neon-injury-roster-loader.ts",
];
const loader = candidates.find((f) => fs.existsSync(path.join(ROOT, f)));
if (!loader) {
  failures.push("neon-injury-roster-loader.ts not found (NOT IMPLEMENTED)");
} else {
  const src = fs.readFileSync(path.join(ROOT, loader), "utf8");
  if (!/player_gp|playerGamesPlayed|gamesPlayed/i.test(src)) {
    failures.push("loader has no player-games-played denominator reference");
  }
  const testGlob = loader.replace(/\.ts$/, ".test.ts");
  const testDirs = [
    path.join(ROOT, path.dirname(testGlob)),
    path.join(ROOT, path.dirname(loader), "__tests__"),
    path.join(ROOT, "apps/web/__tests__"),
  ];
  let tests = [];
  for (const d of testDirs) {
    if (!fs.existsSync(d)) continue;
    tests.push(...fs.readdirSync(d).filter((f) => /injury|roster/.test(f) && /\.test\.ts$/.test(f)).map((f) => path.join(d, f)));
  }
  if (tests.length === 0) {
    failures.push("no injury/roster loader unit tests found");
  } else {
    const pkgDir = loader.startsWith("apps/web") ? path.join(ROOT, "apps/web") : path.join(ROOT, "packages/ingestion-pipeline");
    const rel = tests.map((t) => path.relative(pkgDir, t));
    const v = spawnSync(process.execPath,
      ["../../node_modules/vitest/vitest.mjs", "run", ...rel, "--environment=node"],
      { cwd: pkgDir, encoding: "utf8", timeout: 600000 });
    const tail = ((v.stdout ?? "") + (v.stderr ?? "")).split("\n").filter((l) => /Test Files|Tests /.test(l)).slice(-2).join(" | ");
    console.log(`  loader tests exit=${v.status} ${tail}`);
    if (v.status !== 0) failures.push("injury/roster loader tests failed");
  }
}

if (failures.length) {
  console.error("T-07 FAIL: " + failures.join("; "));
  process.exit(1);
}
console.log("T-07 PASS");