#!/usr/bin/env node
/**
 * T-08 — Live public.games + public.odds Shin de-vig != 0.5238 (WP-7).
 * Contract (WP-3/4): apps/web/lib/data-sources/neon-odds-devig-loader.ts
 * exports shinDevig(prices: number[]) -> number[] (fair probs summing to 1)
 * and loadWeek10Devig() -> Array<{gameId, market, fairProbs}>.
 *
 * Gate: unit-style checks of shinDevig on known inputs + a LIVE tsx probe
 * that loads Week 10 de-vig and asserts no fair prob equals the retired
 * hardcoded 0.5238 anchor, all in (0,1), each market sums to ~1.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const LOADER = "apps/web/lib/data-sources/neon-odds-devig-loader.ts";
if (!fs.existsSync(path.join(ROOT, LOADER))) {
  console.error("T-08 FAIL: neon-odds-devig-loader.ts missing (NOT IMPLEMENTED)");
  process.exit(1);
}

const probe = `
import { shinDevig, loadWeek10Devig } from "./apps/web/lib/data-sources/neon-odds-devig-loader.js";
const even = shinDevig([-110, -110]);
if (Math.abs(even[0] - 0.5) > 0.001) throw new Error("even market should de-vig to 0.5/0.5, got " + even);
const jui = shinDevig([-150, 130]);
const s = jui.reduce((a, b) => a + b, 0);
if (Math.abs(s - 1) > 1e-6) throw new Error("fair probs must sum to 1, got " + s);
if (!(jui[0] > jui[1])) throw new Error("favorite must have higher fair prob");
const rows = await loadWeek10Devig();
if (!Array.isArray(rows) || rows.length === 0) throw new Error("loadWeek10Devig returned no rows");
let checked = 0;
for (const r of rows) {
  const fp = r.fairProbs;
  if (!Array.isArray(fp) || fp.length < 2) continue;
  const sum = fp.reduce((a: number, b: number) => a + b, 0);
  if (Math.abs(sum - 1) > 1e-4) throw new Error("market " + r.market + " sums to " + sum);
  for (const p of fp) {
    if (!(p > 0 && p < 1)) throw new Error("fair prob out of (0,1): " + p);
    if (Math.abs(p - 0.5238) < 1e-9) throw new Error("retired 0.5238 anchor still present");
    checked++;
  }
}
console.log(JSON.stringify({ status: "OK", markets: rows.length, fairProbsChecked: checked }));
`;
const probePath = path.join(ROOT, ".t08-probe.mts");
fs.writeFileSync(probePath, probe);
const r = spawnSync(process.execPath,
  ["node_modules/tsx/dist/cli.mjs", probePath],
  { cwd: ROOT, encoding: "utf8", timeout: 300000, env: { ...process.env, TSX_TSCONFIG_PATH: "apps/web/tsconfig.json" } });
fs.unlinkSync(probePath);
const out = (r.stdout ?? "") + (r.stderr ?? "");
console.log(out.split("\n").slice(-6).join("\n"));
if (r.status !== 0 || !/"status":\s*"OK"/.test(out)) {
  console.error("T-08 FAIL: live de-vig probe failed");
  process.exit(1);
}
console.log("T-08 PASS");