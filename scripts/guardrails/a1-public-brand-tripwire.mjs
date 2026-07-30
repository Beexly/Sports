#!/usr/bin/env node
/**
 * A-1 public brand tripwire.
 *
 * Public /stats rendered surfaces must ship as Galaxy Sports Edge / Galaxy Stats,
 * never under the legacy StatKing customer-facing brand. Internal module paths
 * (lib/statking) and type identifiers (StatKingPlayer, askStatKing) may remain
 * until a separate code rename; this guard only fails on customer-visible copy.
 *
 * Done means (APEX §VI #1): public surface cannot ship under old name path.
 */
import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

const ROOT = resolve(process.cwd());
const TARGET = join(ROOT, "apps/web/app/stats");
const SOURCE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const SKIP = new Set(["__tests__", "node_modules", ".next"]);

/** Customer-visible patterns — not type names or import paths. */
const BANNED = [
  { re: /["'`][^"'`]*StatKing[^"'`]*["'`]/g, why: "string literal containing StatKing" },
  { re: />\s*StatKing\s*</g, why: "JSX text StatKing" },
  { re: /title=\{?["'`][^"'`]*StatKing/g, why: "title prop StatKing" },
  { re: /eyebrow=\{?["'`][^"'`]*StatKing/g, why: "eyebrow prop StatKing" },
  { re: /description:\s*["'`][^"'`]*StatKing/g, why: "metadata description StatKing" },
  { re: /title:\s*["'`][^"'`]*StatKing/g, why: "metadata title StatKing" },
  { re: /aria-label=\{?["'`][^"'`]*StatKing/g, why: "aria-label StatKing" },
  { re: /caption=\{?["'`][^"'`]*StatKing/g, why: "caption StatKing" },
];

/** Allow internal identifiers that are not customer copy. */
function stripCodeNoise(src) {
  return src
    .replace(/import\s+[\s\S]*?from\s+["'][^"']+["'];?/g, "")
    .replace(/import\s+type\s+[\s\S]*?from\s+["'][^"']+["'];?/g, "")
    .replace(/\btype\s+StatKing\w*\b/g, "")
    .replace(/\binterface\s+StatKing\w*\b/g, "")
    .replace(/\bStatKingPlayer\b/g, "")
    .replace(/\baskStatKing\b/g, "")
    .replace(/@\/lib\/statking\/[^\s"']+/g, "")
    .replace(/\/\/[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
}

async function walk(dir, out = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (SKIP.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) await walk(p, out);
    else if (SOURCE_EXTS.has(extname(e.name))) out.push(p);
  }
  return out;
}

const files = await walk(TARGET);
const hits = [];
for (const file of files) {
  const raw = await readFile(file, "utf8");
  const src = stripCodeNoise(raw);
  for (const { re, why } of BANNED) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src))) {
      hits.push({
        file: relative(ROOT, file),
        why,
        sample: m[0].slice(0, 120),
      });
    }
  }
}

if (hits.length) {
  console.error("A-1 FAIL: public /stats still ships under StatKing brand:\n");
  for (const h of hits) {
    console.error(`  ${h.file}: ${h.why}`);
    console.error(`    ${h.sample}`);
  }
  console.error("\nRename customer-facing copy to Galaxy Stats / Galaxy Sports Edge.");
  process.exit(1);
}

console.log(`A-1 PASS: ${files.length} /stats files clean of customer-facing StatKing brand.`);
