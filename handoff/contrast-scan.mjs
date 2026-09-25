/**
 * WCAG 2.1 contrast audit for the Field dark theme.
 * READ-ONLY. Changes nothing. Prints a report to stdout.
 *
 * Companion to handoff/CONTRAST_AUDIT.md. Written as .mjs rather than .py because
 * .gitignore excludes handoff/*.py — a .py helper would not ship with the report
 * and the audit would not be reproducible from the repo.
 *
 *   node handoff/_contrast_scan.mjs
 *
 * Method:
 *   1. Parse apps/web/styles/design-tokens.css, resolve var() alias chains to hex.
 *   2. Compute WCAG relative-luminance contrast for every text-role token against
 *      the documented Field surface stack (ground / panel / panel-2) plus the
 *      light-scale surfaces (paper / paper-raised / paper-sunken).
 *   3. Scan apps/web/{app,components,styles} for hardcoded 6-digit hex on lines
 *      that look like text roles, and evaluate each against the dark surface.
 *   4. Separately report the Tailwind legacy-dark `ink` ramp, which is the
 *      headline finding in CONTRAST_AUDIT.md section 2a.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const TOKENS = join(ROOT, 'apps/web/styles/design-tokens.css');

// ---------- WCAG math ----------
const hexToRgb = (h) => {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const relLuminance = ([r, g, b]) => {
  const ch = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
};
const contrast = (a, b) => {
  const l1 = relLuminance(hexToRgb(a));
  const l2 = relLuminance(hexToRgb(b));
  const hi = Math.max(l1, l2), lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
};

// ---------- token graph ----------
function parseTokens(path) {
  const raw = readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const table = {};
  for (const m of raw.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    table[m[1]] = m[2].trim();
  }
  const resolve = (name, seen = new Set()) => {
    if (seen.has(name)) return null;           // cycle guard
    seen.add(name);
    const v = table[name];
    if (v === undefined) return null;
    const ref = v.match(/^var\(\s*(--[a-z0-9-]+)\s*\)$/);
    if (ref) return resolve(ref[1], seen);
    const hex = v.match(/^(#[0-9A-Fa-f]{3,6})$/);
    return hex ? hex[1] : null;
  };
  const out = {};
  for (const k of Object.keys(table)) out[k] = resolve(k);
  return out;
}

// ---------- config ----------
const SURFACES = {
  'ground #08090C': '#08090C',
  'panel #12141A': '#12141A',
  'panel-2 #191C23': '#191C23',
  'paper #F7F8FB': '#F7F8FB',
  'paper-raised #FFFFFF': '#FFFFFF',
  'paper-sunken #F0F2F6': '#F0F2F6',
};

const TEXT_ROLES = [
  '--ion-white', '--ion', '--ion-1', '--ion-2', '--ion-3',
  '--fg', '--fg-1', '--fg-meta', '--fg-muted', '--fg-disabled',
  '--ink', '--ink-1', '--ink-2',
  '--plasma', '--plasma-glow', '--plasma-deep',
  '--iris', '--iris-glow', '--iris-deep',
  '--verify', '--verify-deep', '--verify-on-light',
  '--alert', '--alert-deep', '--alert-on-light',
  '--caution', '--caution-deep', '--caution-on-light',
  '--plasma-on-light', '--orbital-cyan-on-light', '--ultraviolet-on-light',
  '--mineral', '--mineral-hi',
];

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next' || name === 'dist') continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (/\.(tsx|ts|css)$/.test(name)) acc.push(p);
  }
  return acc;
}

const resolved = Object.fromEntries(
  Object.entries(parseTokens(TOKENS)).filter(([, v]) => v && v.startsWith('#'))
);

// ---------- A. token x surface matrix ----------
console.log('='.repeat(104));
console.log('A. TOKEN-ROLE x SURFACE CONTRAST MATRIX (WCAG 2.1)');
console.log('='.repeat(104));
console.log('AA text = 4.5   AA large (>=24px, or >=19px bold) = 3.0   non-text = 3.0\n');
const surfaceNames = Object.keys(SURFACES);
console.log('token'.padEnd(26) + 'hex'.padEnd(10) + surfaceNames.map((s) => s.split(' ')[0].slice(0, 9).padStart(11)).join(''));
console.log('-'.repeat(104));
for (const role of TEXT_ROLES) {
  const hexv = resolved[role];
  if (!hexv) { console.log(role.padEnd(26) + 'UNRESOLVED'); continue; }
  const cells = surfaceNames.map((s) => {
    const c = contrast(hexv, SURFACES[s]);
    return c.toFixed(2).padStart(10) + (c < 3.0 ? '*' : c < 4.5 ? '!' : ' ');
  });
  console.log(role.padEnd(26) + hexv.padEnd(10) + cells.join(''));
}
console.log('\n* < 3.0 (fails even large-text AA)   ! < 4.5 (fails normal-text AA)');

// ---------- B. Tailwind legacy dark ink ramp (the headline finding) ----------
console.log('\n' + '='.repeat(104));
console.log("B. TAILWIND LEGACY DARK `ink` RAMP on Field dark surfaces");
console.log('='.repeat(104));
const cfg = readFileSync(join(ROOT, 'apps/web/tailwind.config.ts'), 'utf8');
// The `ink` block is a colors: { ... } entry with nested numeric keys. Match from
// `ink: {` to the first `},` at the same nesting level. Keys are indented 10
// spaces, so anchor on that rather than on a bare `}`.
const inkBlock = cfg.match(/\n\s{8}ink:\s*\{([\s\S]*?)\n\s{8}\},/);
if (!inkBlock) {
  console.error('FATAL: could not locate the `ink` color block in tailwind.config.ts.');
  console.error('If the config was restructured, fix the regex in this script before trusting section B.');
  process.exit(1);
}
const inkRamp = {};
if (inkBlock) {
  for (const m of inkBlock[1].matchAll(/(\d+)\s*:\s*["'](#[0-9A-Fa-f]{3,8})["']/g)) {
    inkRamp[m[1]] = m[2].toUpperCase();
  }
}
const srcFiles = [
  ...walk(join(ROOT, 'apps/web/app')),
  ...walk(join(ROOT, 'apps/web/components')),
];
const usage = {};
for (const f of srcFiles) {
  const txt = readFileSync(f, 'utf8');
  for (const m of txt.matchAll(/\btext-ink-(\d+)\b/g)) {
    const k = m[1];
    usage[k] = usage[k] || [];
    usage[k].push(relative(ROOT, f));
  }
}
console.log('key   hex      ground   panel  panel-2   sites  verdict');
console.log('-'.repeat(104));
for (const key of Object.keys(inkRamp).sort((a, b) => Number(a) - Number(b))) {
  const hexv = inkRamp[key];
  const n = (usage[key] || []).length;
  const g = contrast(hexv, '#08090C');
  const p = contrast(hexv, '#12141A');
  const p2 = contrast(hexv, '#191C23');
  const verdict = p2 >= 4.5 ? 'ok' : p2 >= 3.0 ? 'FAILS AA (body)' : 'FAILS ALL (body+large)';
  console.log(
    String(key).padEnd(6) + hexv.padEnd(9) +
    g.toFixed(2).padStart(6) + p.toFixed(2).padStart(8) + p2.toFixed(2).padStart(9) +
    String(n).padStart(7) + '  ' + verdict
  );
}
console.log('\nAny key with sites and p2 < 4.5 is a live defect on a dark Field surface.');

// ---------- C. hardcoded hex in text-ish roles ----------
console.log('\n' + '='.repeat(104));
console.log('C. HARDCODED HEX IN SOURCE — off-ramp, text-ish lines');
console.log('='.repeat(104));
const found = new Map();
for (const p of [...srcFiles, ...walk(join(ROOT, 'apps/web/styles'))]) {
  const txt = readFileSync(p, 'utf8');
  txt.split('\n').forEach((line, i) => {
    if (!/(color|foreground|\bfg\b|ink|text|fill=|border)/i.test(line)) return;
    for (const m of line.matchAll(/#([0-9A-Fa-f]{6})\b/g)) {
      const h = '#' + m[1].toUpperCase();
      if (!found.has(h)) found.set(h, []);
      found.get(h).push(`${relative(ROOT, p)}:${i + 1}`);
    }
  });
}
const ramp = new Set(Object.values(resolved).map((v) => v.toUpperCase()));
const offRamp = [...found.entries()].filter(([h]) => !ramp.has(h));
console.log(`${offRamp.length} off-ramp hex values in text-ish roles\n`);
for (const [h, locs] of offRamp.sort((a, b) => b[1].length - a[1].length)) {
  const g = contrast(h, '#08090C');
  const pn = contrast(h, '#12141A');
  const flags = [];
  if (g < 4.5) flags.push('DARK-FAIL');
  if (pn < 4.5) flags.push('PANEL-FAIL');
  console.log(
    `${h}  n=${String(locs.length).padEnd(4)} on ground ${g.toFixed(2).padStart(5)} | ` +
    `panel ${pn.toFixed(2).padStart(5)}  ${flags.join(' ')}`
  );
  locs.slice(0, 3).forEach((l) => console.log(`      ${l}`));
  if (locs.length > 3) console.log(`      ... +${locs.length - 3} more`);
}
console.log('\nNOTE: near-white off-ramp values flagged here are dark-theme components.');
console.log('A 9:1-on-dark color does not need to pass on paper, and none of these sit on');
console.log('a paper surface. Cross-check the surface before acting on any DARK/PANEL-FAIL.');
console.log('\nSee handoff/CONTRAST_AUDIT.md for which of these are real findings.');
