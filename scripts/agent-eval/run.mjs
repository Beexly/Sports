#!/usr/bin/env node
/**
 * Thin agent-eval: fixture predicates against repo files.
 * Exit 0 = pass, 1 = fail. No network, no LLM.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function listFilesRecursive(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) listFilesRecursive(p, acc);
    else acc.push(p);
  }
  return acc;
}

function extractCleared(sourceId) {
  const src = read("apps/web/lib/data-sources/source-router.ts");
  const re = new RegExp(
    `id:\\s*"${sourceId}"[\\s\\S]*?cleared:\\s*(true|false)`,
    "m",
  );
  const m = src.match(re);
  if (!m) return null;
  return m[1] === "true";
}

function runPredicate(p) {
  if (p.type === "file_contains") {
    if (p.mustIncludeAnyFile) {
      const dir = join(root, p.path);
      const files = listFilesRecursive(dir);
      const blob = files.map((f) => readFileSync(f, "utf8")).join("\n");
      for (const needle of p.mustInclude) {
        if (!blob.includes(needle)) {
          return { ok: false, detail: `missing "${needle}" under ${p.path}` };
        }
      }
      return { ok: true };
    }
    const text = read(p.path);
    for (const needle of p.mustInclude) {
      if (!text.includes(needle)) {
        return { ok: false, detail: `${p.path} missing "${needle}"` };
      }
    }
    return { ok: true };
  }
  if (p.type === "source_router_cleared") {
    const actual = extractCleared(p.sourceId);
    if (actual === null) {
      return { ok: false, detail: `source ${p.sourceId} not found in router` };
    }
    if (actual !== p.expectCleared) {
      return {
        ok: false,
        detail: `${p.sourceId} cleared=${actual}, expected ${p.expectCleared}`,
      };
    }
    return { ok: true };
  }
  return { ok: false, detail: `unknown predicate type ${p.type}` };
}

const fixtures = readdirSync(fixturesDir)
  .filter((f) => f.endsWith(".json"))
  .sort()
  .map((f) => ({
    file: f,
    ...JSON.parse(readFileSync(join(fixturesDir, f), "utf8")),
  }));

let failed = 0;
const results = [];

for (const fix of fixtures) {
  const fixId = fix.id || fix.file;
  for (const pred of fix.predicates) {
    let r;
    try {
      r = runPredicate(pred);
    } catch (e) {
      r = { ok: false, detail: e instanceof Error ? e.message : String(e) };
    }
    const row = {
      fixture: fixId,
      predicate: pred.id,
      ok: r.ok,
      detail: r.detail ?? null,
    };
    results.push(row);
    if (!r.ok) failed += 1;
    const mark = r.ok ? "PASS" : "FAIL";
    console.log(
      `${mark}  ${row.fixture}/${row.predicate}${r.detail ? ` — ${r.detail}` : ""}`,
    );
  }
}

const summary = {
  total: results.length,
  passed: results.filter((r) => r.ok).length,
  failed,
  costUsd: 0,
  costPerSuccess: failed === results.length ? null : 0,
};

console.log("\n" + JSON.stringify(summary, null, 2));
process.exit(failed > 0 ? 1 : 0);
