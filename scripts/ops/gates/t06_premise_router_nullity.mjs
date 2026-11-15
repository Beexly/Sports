#!/usr/bin/env node
/**
 * T-06 — Live lit.premise router & {} -> 0 fallback nullity (WP-7, fail-closed).
 * Contract (WP-2):
 *   - mcp-equations-server vitest suite passes (includes nullity tests).
 *   - Hardcoded fallbacks purged: no `?? 0.58`, `?? -0.26`, `?? -0.35`,
 *     `?? 0.72`, no fake `n: 65..140` sample sizes in router/registry.
 *   - lit.retrieval_event and lit.activation have rows (router persists).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import pg from "pg";
import { execSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const failures = [];

const files = [
  "packages/mcp-equations-server/src/mcp-cognitive-router.ts",
  "packages/mcp-equations-server/src/thousand-equation-registry.ts",
];
const banned = [/\?\?\s*0\.58\b/, /\?\?\s*-0\.26\b/, /\?\?\s*-0\.35\b/, /\?\?\s*0\.72\b/, /\bn:\s*(6[5-9]|[7-9]\d|1[0-3]\d|140)\b/];
for (const f of files) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) { failures.push(`${f} missing`); continue; }
  const src = fs.readFileSync(p, "utf8");
  for (const re of banned) {
    const mm = src.match(re);
    if (mm) failures.push(`${f} still contains fallback ${mm[0]}`);
  }
}

const vitest = spawnSync(process.execPath,
  [path.join(ROOT, "node_modules/vitest/vitest.mjs"), "run", "--environment=node"],
  { cwd: path.join(ROOT, "packages/mcp-equations-server"), encoding: "utf8", timeout: 600000 });
const vout = (vitest.stdout ?? "") + (vitest.stderr ?? "");
const vtail = vout.split("\n").filter((l) => /Test Files|Tests |FAIL/.test(l)).slice(-4).join(" | ");
console.log(`  vitest mcp-equations-server exit=${vitest.status} ${vtail}`);
if (vitest.status !== 0) failures.push("mcp-equations-server vitest failed");

let url = (process.env.DATABASE_URL ?? "").trim();
if (!url) {
  url = execSync("neonctl connection-string main --project-id summer-brook-99380762 --role-name hermes_ro", { encoding: "utf8" }).trim();
}
const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  const ev = await client.query("SELECT count(*)::int AS n FROM lit.retrieval_event");
  const ac = await client.query("SELECT count(*)::int AS n FROM lit.activation");
  console.log(`  lit.retrieval_event=${ev.rows[0].n} lit.activation=${ac.rows[0].n}`);
  if (ev.rows[0].n === 0) failures.push("lit.retrieval_event empty — router not persisting");
  if (ac.rows[0].n === 0) failures.push("lit.activation empty — router not persisting");
} catch (err) {
  failures.push(`lit persistence check: ${err.message}`);
} finally {
  await client.end();
}

if (failures.length) {
  console.error("T-06 FAIL: " + failures.join("; "));
  process.exit(1);
}
console.log("T-06 PASS");