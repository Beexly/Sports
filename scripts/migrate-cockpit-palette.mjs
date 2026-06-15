#!/usr/bin/env node
/**
 * One-time cockpit palette migration: legacy gray and slate neutrals become the
 * ion/titanium/obsidian/eclipse/carbon design tokens, so every /cockpit/ page
 * matches the redesigned shell. Token-only; semantic colors (emerald/amber/
 * rose/accent/plasma/ultraviolet/green/yellow/red) are deliberately untouched.
 *
 * Ordered specific-before-general so opacity/hover variants resolve first.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const files = execSync("find apps/web/app/cockpit -name '*.tsx'", { encoding: "utf8" })
  .trim()
  .split("\n")
  .filter(Boolean);

// [from, to] applied in order. Hover + opacity variants come before bare tokens.
const MAP = [
  // hover backgrounds (lighter "carbon" hover, distinct from base fills)
  ["hover:bg-gray-900/60", "hover:bg-carbon/60"],
  ["hover:bg-gray-900/30", "hover:bg-carbon/50"],
  ["hover:bg-gray-900", "hover:bg-carbon/60"],
  ["hover:bg-gray-700", "hover:bg-titanium/40"],
  // hover borders
  ["hover:border-gray-800", "hover:border-titanium/70"],
  // backgrounds — gray-950 family (deepest -> obsidian)
  ["bg-gray-950/95", "bg-obsidian/90"],
  ["bg-gray-950/70", "bg-obsidian/70"],
  ["bg-gray-950/60", "bg-obsidian/60"],
  ["bg-gray-950/50", "bg-obsidian/50"],
  ["bg-gray-950/40", "bg-obsidian/50"],
  ["bg-gray-950/30", "bg-obsidian/40"],
  ["bg-gray-950", "bg-obsidian/60"],
  // backgrounds — gray-900 family (-> eclipse)
  ["bg-gray-900/70", "bg-eclipse/60"],
  ["bg-gray-900/60", "bg-eclipse/50"],
  ["bg-gray-900/50", "bg-eclipse/40"],
  ["bg-gray-900/40", "bg-eclipse/40"],
  ["bg-gray-900", "bg-eclipse/70"],
  // backgrounds — gray-800/700 + slate/gray tints
  ["bg-gray-800/60", "bg-obsidian/70"],
  ["bg-gray-800", "bg-obsidian/70"],
  ["bg-gray-700", "bg-titanium/40"],
  ["bg-slate-500/10", "bg-obsidian/40"],
  ["bg-gray-500/10", "bg-obsidian/40"],
  // borders (opacity-specific first)
  ["border-gray-800/60", "border-titanium/40"],
  ["border-gray-900/80", "border-titanium/40"],
  ["border-gray-500/40", "border-titanium/50"],
  ["border-slate-500/40", "border-titanium/50"],
  ["border-gray-800", "border-titanium/40"],
  ["border-gray-700", "border-titanium/40"],
  // dividers
  ["divide-gray-800/60", "divide-titanium/30"],
  ["divide-gray-800", "divide-titanium/30"],
  ["divide-gray-900", "divide-titanium/30"],
  // text (specific shades; hover:text-* inherits the same target via substring)
  ["text-gray-950", "text-eclipse"],
  ["text-gray-100", "text-ion-white"],
  ["text-gray-200", "text-ion-1"],
  ["text-gray-300", "text-ion-1"],
  ["text-gray-400", "text-ion-2"],
  ["text-gray-500", "text-ion-3"],
  ["text-gray-600", "text-ion-3"],
  ["text-gray-700", "text-ion-3"],
  ["text-slate-300", "text-ion-1"],
  // pure white -> canonical soft ion-white (#F6F7FA) used by the redesign
  ["text-white", "text-ion-white"],
];

let totalFiles = 0;
let totalSubs = 0;
for (const file of files) {
  let src = readFileSync(file, "utf8");
  const before = src;
  let fileSubs = 0;
  for (const [from, to] of MAP) {
    const parts = src.split(from);
    if (parts.length > 1) {
      fileSubs += parts.length - 1;
      src = parts.join(to);
    }
  }
  if (src !== before) {
    writeFileSync(file, src);
    totalFiles += 1;
    totalSubs += fileSubs;
    process.stdout.write(`  ${fileSubs.toString().padStart(4)}  ${file}\n`);
  }
}
process.stdout.write(`\nmigrated ${totalSubs} tokens across ${totalFiles} files\n`);
