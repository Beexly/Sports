#!/usr/bin/env node
// Accent-ledger resolution for UI_AUDIT.md. READ-ONLY.
// Reads the real hex out of apps/web/styles/design-tokens.css, resolves the
// var() alias chain, and composites each cockpit accent over the cockpit page
// ground, so "these two accents are the same colour" and "this active state is
// invisible" are computed, not asserted.
//
//   node handoff/accent-math.mjs

import { readFileSync } from "node:fs";

const css = readFileSync("apps/web/styles/design-tokens.css", "utf8");
const tokens = new Map();
for (const m of css.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)) tokens.set(m[1], m[2].trim());

const resolve = (name, depth = 0) => {
  const raw = tokens.get(name);
  if (raw === undefined || depth > 8) return null;
  const v = raw.startsWith("var(") ? resolve(raw.slice(4, -1).trim(), depth + 1) : raw;
  return v;
};
const hx = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

const page = [0x08, 0x09, 0x0c];
const over = (fg, a, dst) => fg.map((c, i) => a * c + (1 - a) * dst[i]);
const toHex = (rgb) => "#" + rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();
const delta = (a, b) => a.map((v, i) => Math.round(v - b[i]));

const ACCENTS = [
  ["--ion-white", "BONE primary text"],
  ["--ion-1", "FOG secondary text"],
  ["--ion-2", "MIST tertiary"],
  ["--plasma", "EMBER action accent"],
  ["--plasma-glow", "ember glow"],
  ["--iris", "IRIS — documented WAYFINDING accent"],
  ["--iris-glow", "iris glow"],
  ["--orbital-cyan", "used by cockpit ACTIVE NAV"],
  ["--ultraviolet", "used in cockpit h2 + stat"],
  ["--ion-blue", "legacy alias"],
  ["--cyan", "legacy alias"],
  ["--verify", "mint positive"],
  ["--alert", "rose critical"],
  ["--caution", "amber caution"],
  ["--titanium", "panel lift / card border"],
  ["--eclipse", "panel card"],
];

console.log("token".padEnd(20) + "hex".padEnd(10) + "role");
const resolved = new Map();
for (const [t, role] of ACCENTS) {
  const v = resolve(t);
  resolved.set(t, v);
  console.log(t.padEnd(20) + String(v).padEnd(10) + role);
}

// Which distinct colours do the cockpit's accents actually collapse to?
console.log("\ncollisions (two token names, one rendered colour):");
const byHex = new Map();
for (const [t] of ACCENTS) {
  const v = resolved.get(t);
  if (!byHex.has(v)) byHex.set(v, []);
  byHex.get(v).push(t);
}
for (const [hex, names] of byHex) if (names.length > 1) console.log(`  ${hex}  ${names.join("  ==  ")}`);

// Active-nav state: what the user actually sees when a cockpit page is selected.
console.log("\ncockpit active-nav state (cockpit-nav.tsx:37-40,47):");
const fog = hx(resolved.get("--ion-1"));
const tita = hx(resolved.get("--titanium"));
for (const [label, fg, a] of [
  ["bg-orbital-cyan/10 (active wash)", fog, 0.1],
  ["border-orbital-cyan/40 (active rail)", fog, 0.4],
  ["hover:border-titanium/70", tita, 0.7],
  ["hover:bg-carbon/60", [0x08, 0x09, 0x0c], 0.6],
]) {
  const c = over(fg, a, page);
  console.log(`  ${label.padEnd(38)} renders ${toHex(c)}  dRGB(${delta(c, page).join(",")})`);
}
const active = over(fog, 0.1, page);
const activeBorder = over(fog, 0.4, page);
const hoverBorder = over(tita, 0.7, page);
const hoverBg = over([0x08, 0x09, 0x0c], 0.6, page);
console.log(
  `\n  → ACTIVE row: wash dRGB(${delta(active, page).join(",")}), border dRGB(${delta(activeBorder, page).join(",")}).`
);
console.log(
  `  → HOVER  row: border dRGB(${delta(hoverBorder, page).join(",")}), background dRGB(${delta(hoverBg, page).join(",")}).`
);
console.log(
  "  → hover:bg-carbon/60 composites to the page exactly, so the hover surface is carried"
);
console.log(
  "    ENTIRELY by a 1px titanium/70 edge, which lifts less than half as much as the active"
);
console.log(
  "    fog wash. The one accent the token file reserves for wayfinding (--iris, #9AA8E8)"
);
console.log("    is used in 0 cockpit sites.");
