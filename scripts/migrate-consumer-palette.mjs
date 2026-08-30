#!/usr/bin/env node
/**
 * Consumer-surface palette migration: the flagship app pages (picks, dashboard,
 * board, room, promotions, pricing, etc.) and their components were the legacy
 * holdouts on Tailwind gray and slate while the rest of the consumer site uses
 * the Galaxy design tokens. This unifies them — lightness-matched, violet-tinted:
 *   gray-900 then carbon, gray-950 and slate-950 then obsidian,
 *   gray-800 and gray-700 then titanium, gray text then the ion silver scale,
 *   near-black text then eclipse (dark text that rides on bright chips).
 *
 * Opacity suffixes (/40, /80, ...) and modifiers (hover:, sm:, group-hover:) are
 * preserved. All targets verified dark-themed (no paper/light surfaces). Also
 * covers the internal admin operator pages (same dark theme). Cockpit (its own
 * migration), lib, and API are out of scope.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const candidates = execSync(
  "find apps/web/app apps/web/components -name '*.tsx'",
  { encoding: "utf8" }
)
  .trim()
  .split("\n")
  .filter((f) => f && !f.includes("/cockpit/"));

// [regex, replacement] — $1 re-attaches a captured /opacity suffix.
const op = "(\\/\\d+)?";
const b = "\\b";
const rule = (token, target) => [new RegExp(`${b}${token}${op}${b}`, "g"), `${target}$1`];

const RULES = [
  // backgrounds (deepest -> raised, matched by lightness)
  rule("bg-gray-950", "bg-obsidian"),
  rule("bg-slate-950", "bg-obsidian"),
  rule("bg-gray-900", "bg-carbon"),
  rule("bg-slate-900", "bg-carbon"),
  rule("bg-gray-800", "bg-titanium"),
  rule("bg-slate-800", "bg-titanium"),
  rule("bg-gray-700", "bg-titanium"),
  // borders
  rule("border-gray-950", "border-titanium"),
  rule("border-gray-900", "border-titanium"),
  rule("border-gray-800", "border-titanium"),
  rule("border-gray-700", "border-titanium"),
  rule("border-gray-600", "border-titanium"),
  rule("border-slate-950", "border-titanium"),
  rule("border-slate-900", "border-titanium"),
  rule("border-slate-800", "border-titanium"),
  rule("border-slate-700", "border-titanium"),
  rule("border-slate-500", "border-titanium"),
  rule("border-gray-500", "border-titanium"),
  // dividers / rings
  rule("divide-gray-800", "divide-titanium"),
  rule("divide-gray-900", "divide-titanium"),
  rule("ring-gray-700", "ring-titanium"),
  rule("ring-gray-800", "ring-titanium"),
  // near-black text (rides on bright chips/buttons)
  rule("text-gray-950", "text-eclipse"),
  rule("text-slate-950", "text-eclipse"),
  rule("text-gray-900", "text-eclipse"),
  // light text -> ion silver scale (gray-400 ~ ion-3 by value)
  rule("text-gray-100", "text-ion-white"),
  rule("text-gray-200", "text-ion-1"),
  rule("text-gray-300", "text-ion-1"),
  rule("text-slate-300", "text-ion-1"),
  rule("text-gray-400", "text-ion-2"),
  rule("text-gray-500", "text-ion-3"),
  rule("text-gray-600", "text-ion-3"),
  rule("text-gray-700", "text-ion-3"),
  rule("text-gray-800", "text-ion-3"),
];

let totalFiles = 0;
let totalSubs = 0;
for (const file of candidates) {
  const before = readFileSync(file, "utf8");
  let src = before;
  let subs = 0;
  for (const [re, rep] of RULES) {
    src = src.replace(re, (...m) => {
      subs += 1;
      return rep.replace("$1", m[1] ?? "");
    });
  }
  if (src !== before) {
    writeFileSync(file, src);
    totalFiles += 1;
    totalSubs += subs;
    process.stdout.write(`  ${subs.toString().padStart(4)}  ${file}\n`);
  }
}
process.stdout.write(`\nmigrated ${totalSubs} tokens across ${totalFiles} files\n`);
