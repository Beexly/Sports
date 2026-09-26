#!/usr/bin/env node
// Cockpit visual-consistency audit — P4-5 (`.claude/commands/ui-audit.md`).
// READ-ONLY. Touches no product code; writes nothing.
//
//   node handoff/ui-audit-scan.mjs          cockpit only (app/cockpit + components/cockpit)
//   node handoff/ui-audit-scan.mjs --all    the whole apps/web tree
//
// Six rules, each a *scale-conformance* check against the tokens the repo already
// declares (apps/web/styles/design-tokens.css + apps/web/tailwind.config.ts):
//
//   U1 surface ladder   card/panel background families + alpha steps
//   U2 radius ladder    border-radius steps actually in use
//   U3 type ladder      font-size steps actually in use
//   U4 heading ladder   h1/h2/h3 className shapes (hierarchy + drift)
//   U5 accent ledger    which accent families carry meaning, and where
//   U6 spacing ladder   padding / gap / margin steps
//
// The scanner is EXHAUSTIVE, not correct: it over-reports on purpose and every
// finding is verified by hand before it goes in the report. Exit code is always 0.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const ALL = process.argv.includes("--all");
const SCAN_ROOTS = ALL
  ? [join(ROOT, "apps/web/app"), join(ROOT, "apps/web/components")]
  : [join(ROOT, "apps/web/app/cockpit"), join(ROOT, "apps/web/components/cockpit")];

const SKIP = new Set(["node_modules", ".next", ".git", "__tests__", "fixtures"]);

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const e of entries) {
    if (SKIP.has(e)) continue;
    const p = join(dir, e);
    let s;
    try {
      s = statSync(p);
    } catch {
      continue;
    }
    if (s.isDirectory()) walk(p, out);
    else if (e.endsWith(".tsx")) out.push(p);
  }
  return out;
}

const files = SCAN_ROOTS.flatMap((r) => walk(r));
const rows = [];
for (const f of files) {
  const src = readFileSync(f, "utf8");
  const lines = src.split(/\r?\n/);
  lines.forEach((line, i) => {
    if (!/className=/.test(line)) return;
    rows.push({ file: relative(ROOT, f).replace(/\\/g, "/"), line: i + 1, text: line });
  });
}

const tally = (map, key) => {
  map[key] = (map[key] ?? 0) + 1;
  return map;
};
const rank = (map) => Object.entries(map).sort((a, b) => b[1] - a[1]);
const pct = (n) => ((n / rows.length) * 100).toFixed(1) + "%";

const section = (t) => console.log("\n" + t + "\n" + "-".repeat(t.length));
const show = (map, limit = 18) => {
  const r = rank(map);
  const shown = r.slice(0, limit);
  const rest = r.length - shown.length;
  for (const [k, v] of shown) console.log(`  ${String(v).padStart(5)}  ${k}`);
  if (rest > 0) console.log(`  ${String(rest).padStart(5)}  … ${rest} further distinct values`);
  return r;
};

console.log(`scan roots : ${SCAN_ROOTS.map((r) => relative(ROOT, r)).join(", ")}`);
console.log(`tsx files  : ${files.length}`);
console.log(`className lines: ${rows.length}`);

// ── U1 surface ladder ────────────────────────────────────────────────────────
section("U1  surface ladder  (bg-<family>/<alpha>)");
const surfaces = {};
for (const r of rows) {
  for (const m of r.text.matchAll(/\bbg-(obsidian|carbon|eclipse|titanium|slate|void)\/(\d{1,3})\b/g)) {
    tally(surfaces, `${m[1]}/${m[2]}`);
  }
}
show(surfaces);
const families = new Set(Object.keys(surfaces).map((k) => k.split("/")[0]));
const alphas = new Set(Object.keys(surfaces).map((k) => k.split("/")[1]));
console.log(`  → ${families.size} surface families, ${alphas.size} distinct alpha steps`);
console.log("  NOTE: design-tokens.css gives obsidian/carbon/void ONE value (#08090C) and");
console.log("        titanium/slate ONE value (#191C23). So bg-obsidian/50 and bg-carbon/80");
// composite both over the cockpit page ground, which is itself obsidian at 60%.

// ── U2 radius ladder ─────────────────────────────────────────────────────────
section("U2  radius ladder");
const radii = {};
for (const r of rows) {
  for (const m of r.text.matchAll(/\brounded(-[a-z0-9-]+)?\b/g)) tally(radii, m[1] ? `rounded${m[1]}` : "rounded  (bare = 0.25rem)");
}
show(radii);

// ── U3 type ladder ───────────────────────────────────────────────────────────
section("U3  type ladder  (font-size steps)");
const sizes = {};
for (const r of rows) {
  for (const m of r.text.matchAll(/\btext-\[(\d{1,3})px\]/g)) tally(sizes, `text-[${m[1]}px]  (arbitrary)`);
  for (const m of r.text.matchAll(/\btext-(xs|sm|base|lg|xl|2xl|3xl|4xl)\b/g)) tally(sizes, `text-${m[1]}  (scale)`);
}
const sizeRank = show(sizes);
const under9 = sizeRank.filter(([k]) => /\[[0-8]px\]/.test(k));
const under10 = sizeRank.filter(([k]) => /\btext-\[(9|8|7)px\]/.test(k));
const sub11 = rows.filter((r) => /\btext-\[(7|8|9|10)px\]/.test(r.text));
console.log(`  → ${sub11.length} className lines carry < 11px text (${pct(sub11.length)} of lines)`);
console.log("  NOTE: --t-eyebrow declares a 12px floor (design-tokens.css:286-288).");

// ── U4 heading ladder ────────────────────────────────────────────────────────
section("U4  heading ladder  (<h1>/<h2>/<h3> className shapes)");
for (const tag of ["h1", "h2", "h3"]) {
  const shapes = {};
  for (const r of rows) {
    const m = r.text.match(new RegExp(`<${tag}[^>]*className="([^"]*)"`));
    if (m) tally(shapes, m[1]);
  }
  const list = rank(shapes);
  console.log(`  <${tag}> ${list.reduce((a, [, v]) => a + v, 0)} sites, ${list.length} distinct shapes`);
  for (const [k, v] of list.slice(0, 6)) console.log(`      ${String(v).padStart(4)}  ${k}`);
  if (list.length > 6) console.log(`      ${list.length - 6} more…`);
}

// ── U5 accent ledger ─────────────────────────────────────────────────────────
section("U5  accent ledger  (text-<family>)");
const accents = {};
for (const r of rows) {
  for (const m of r.text.matchAll(/\btext-(plasma|ion-blue|orbital-cyan|ultraviolet|iris|violet|purple|cyan|lime|magenta|accent-\d+)\b/g)) {
    tally(accents, m[1]);
  }
}
show(accents);
console.log("  NOTE: design-tokens.css repoints ion-blue / orbital-cyan / ultraviolet /");
console.log("        cyan all to fog #C4BFB6 — identical to --ion-1. plasma is the only");
console.log("        accent with a distinct hue (#FF4D2E).");

// ── U6 spacing ladder ────────────────────────────────────────────────────────
section("U6  spacing ladder  (padding / gap / margin)");
const pad = {};
const gap = {};
for (const r of rows) {
  for (const m of r.text.matchAll(/\b(p|px|py|pt|pb|pl|pr)-(\d{1,2}(?:\.5)?)\b/g)) tally(pad, m[0]);
  for (const m of r.text.matchAll(/\b(gap|gap-x|gap-y)-(\d{1,2}(?:\.5)?)\b/g)) tally(gap, m[0]);
}
console.log("  padding:"); show(pad, 12);
console.log("  gap:"); show(gap, 12);

section("notes");
console.log("  U1: the cockpit page ground is `bg-obsidian/60` (layout.tsx:122), i.e. #08090C");
console.log("      at 60% over html{background:#08090C} — so the PAGE IS #08090C and a card at");
console.log("      bg-obsidian/40..95 composites to a near-invisible #08090C. Only");
console.log("      bg-eclipse/* and bg-titanium/* actually lift a surface.");
console.log("  U3: sizes below the 12px eyebrow floor are counted, not judged — see report.");
console.log("  Everything here is a MEASUREMENT. The verdict for each is in UI_AUDIT.md.");

console.log("\ndone (read-only).");
