#!/usr/bin/env node
// visual-qa-scan.mjs — read-only cockpit visual QA for handoff/VISUAL_QA.md.
// Companion to ui-audit-scan.mjs (P4-5, which counted ladders) and
// contrast-scan.mjs (P4-3, which measured text contrast). This one asks the
// questions the .claude/commands/visual-qa.md file actually asks:
//
//   1. consistent card padding      -> PADDING LADDER + the modal class
//   2. aligned grids                -> GRID/GAP ladder per file
//   3. orphaned / broken elements   -> TRUNCATION WITHOUT A WIDTH BOUND
//   4. dark-mode artifacts          -> INVISIBLE BORDER (composited dRGB)
//   5. consistent label casing      -> CASING per label slot
//   6. every accent is on-role      -> ACCENT ROLE CENSUS
//
// READ-ONLY. Reads the tree, writes nothing, touches no product code.
//
//   node handoff/visual-qa-scan.mjs              # cockpit only
//   node handoff/visual-qa-scan.mjs --all        # whole apps/web
//   node handoff/visual-qa-scan.mjs --selftest   # prove every rule can fire
//
// WHY A SELFTEST: a scanner that reports "0 findings" is worthless unless you
// have shown it CAN report a finding. P4-8 and P4-9 both caught a real scanner
// bug via exactly this mechanism. Every rule below has a specimen.

import { execFileSync } from "node:child_process";
import path from "node:path";

const REPO = process.cwd();
const argv = process.argv.slice(2);
const SELFTEST = argv.includes("--selftest");
const ALL = argv.includes("--all") || SELFTEST;
const COCKPIT = "apps/web/app/cockpit/";
const COCKPIT_COMPONENTS = "apps/web/components/cockpit/";
const ALPHA = /\/(10|20|30|40|50|60|70|80|90|95)$/;

// ---------------------------------------------------------------- file list
function listFiles() {
  if (ALL) {
    const out = execFileSync(
      "git",
      ["ls-files", "apps/web/app", "apps/web/components"],
      { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
    );
    return out.split("\n").filter((f) => /\.tsx$/.test(f));
  }
  const out = execFileSync("git", ["ls-files", COCKPIT, COCKPIT_COMPONENTS], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return out.split("\n").filter((f) => /\.tsx$/.test(f) && f);
}

const files = listFiles();

// ---------------------------------------------------------------- token math
// Copied from design-tokens.css verbatim values. Deliberately NOT a dependency
// on the CSS file: the scanner must be runnable without a build step, and a
// token change should be a visible diff here, not a silent one.
const T = {
  void: "#08090C",
  obsidian: "#08090C",
  carbon: "#08090C",
  void_: "#08090C",
  eclipse: "#12141A",
  titanium: "#191C23",
  slate: "#191C23",
};
const hx = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (rgb) =>
  "#" + rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("").toUpperCase();
const over = (fg, a, dst) => fg.map((c, i) => a * c + (1 - a) * dst[i]);
const lum = (rgb) => {
  const f = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = rgb.map(f);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const html = hx(T.void);
// apps/web/app/cockpit/layout.tsx:122  bg-obsidian/60 — the real page ground.
const page = over(hx(T.obsidian), 0.6, html);

// ---------------------------------------------------------------- scanners
// A "card" here means: an element carrying a rounded-* class. That is the
// repo's own card idiom (ui-audit-scan.mjs counted 323 of them in the cockpit)
// and it is the only definition available without rendering.
const CARD = /rounded-(?:sm|md|lg|xl|2xl|3xl|full|none)\b/;

/** R1 — card padding ladder. */
function scanPadding(sources) {
  const ladder = new Map(); // "p-4" -> count
  const perFile = []; // {file, lines: Map("p-4" -> [lineNo])}
  for (const { file, text } of sources) {
    const mine = new Map();
    // Only padding on a class string that also declares a card idiom, so a
    // `p-4` on a table cell is not counted as card padding.
    const re = /className=(?:"([^"]*)"|\{`([^`]*)`\}|\{"([^"]*)"\})/g;
    let m;
    while ((m = re.exec(text))) {
      const cls = m[1] || m[2] || m[3] || "";
      if (!CARD.test(cls)) continue;
      for (const p of cls.match(/\bp-[\d.]+/g) || []) {
        ladder.set(p, (ladder.get(p) || 0) + 1);
        if (!mine.has(p)) mine.set(p, []);
        mine.get(p).push(text.slice(0, m.index).split("\n").length);
      }
    }
    if (mine.size) perFile.push({ file, mine });
  }
  return { ladder, perFile };
}

/** R2 — grid + gap ladder per file, to find files that mix rhythms. */
function scanGrid(sources) {
  const rows = [];
  for (const { file, text } of sources) {
    const cols = text.match(/\bgrid-cols-(\d+)\b/g) || [];
    const gaps = text.match(/\bgap-(\d+)\b/g) || [];
    if (!cols.length) continue;
    const tally = (arr) => {
      const m = new Map();
      for (const a of arr) m.set(a, (m.get(a) || 0) + 1);
      return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}×${n}`);
    };
    rows.push({ file, cols: tally(cols), gaps: tally(gaps) });
  }
  return rows;
}

/**
 * R3 — orphaned / broken-looking elements.
 * The mechanical form: `truncate` (or a line-clamp) on an element with no
 * inline-size bound on it or on a nearby ancestor. Unbounded flex and grid
 * children size to content, so the ellipsis never engages and the row pushes
 * its container wider instead. P4-4 measured this exact failure on the cockpit
 * header (layout.tsx:123-146, 134px overflow at 61 chars), so the rule is
 * grounded in a real observed defect, not a hypothetical.
 *
 * WHAT COUNTS AS A BOUND, and why the set is narrow. A bound must establish a
 * DEFINITE inline size for the truncating element: its own w- or max-w- class,
 * a `min-w-0` or `flex-1` on a flex ancestor, or `overflow-hidden` (which makes
 * the automatic minimum size zero and so permits shrinking below content).
 * `grid-cols-*` is deliberately EXCLUDED from the ancestor set: a grid track is
 * a FRACTION of an already-indefinite container, so a flex row nested inside
 * one still sizes to its content. That is precisely the P4-4 F2 shape, and
 * treating `grid-cols-*` as a bound is a false negative — the selftest caught
 * exactly that on the first run. `truncate` is also excluded from the bound set
 * because the thing under test must not be its own proof.
 */
function scanOrphan(sources) {
  const BOUND = /\b(?:min-w-0|max-w-[a-z0-9\[\].]+|w-\[[^\]]+\]|w-(?:0|1\/2|1\/3|1\/4|1\/5|1\/6|2\/3|3\/4|full|auto|px|min|max|fit)\b|flex-1\b|overflow-hidden\b)/;
  // A block-level box fills its parent's inline size, so `truncate` on one
  // engages by design and the ellipsis always appears. The failure mode is
  // confined to FLEX and GRID items, which size to content by default. The
  // first version of this rule ignored that and flagged 6 sites, of which 3
  // were block-level <p>/<li> — provably false positives.
  const IS_FLEX_GRID = /\b(?:flex|grid|inline-flex|inline-grid)\b/;
  // Default display for these tags is block, so they are not items by default.
  const BLOCK_TAGS = ["p", "li", "dd", "dt", "h1", "h2", "h3", "h4", "h5", "h6", "section", "article", "header", "footer", "blockquote", "div"];
  const out = [];
  for (const { file, text } of sources) {
    const lines = text.split("\n");
    lines.forEach((line, i) => {
      if (!/\btruncate\b|\bline-clamp-\d\b/.test(line)) return;
      // A prose comment can contain the word "truncate" with no className at
      // all. `return` here would exit the WHOLE line callback, so a comment
      // directly above a real hit would consume its turn and the real element
      // below it would still be visited — but if the comment is the LAST such
      // line, the rule silently under-reports. Skip comments explicitly.
      if (/\{\/\*/.test(line)) return;
      const cls = line.match(/className=(?:"([^"]*)"|\{`([^`]*)`\}|\{"([^"]*)"\})/);
      if (!cls) return;
      const own = cls[1] || cls[2] || cls[3] || "";
      // Is this element a flex/grid item? It must sit in a flex/grid context.
      // Scan upward for the NEAREST container — and STOP at the first container
      // whose tag is a block wrapper, so the walk cannot escape past the local
      // parent and find a grandparent that happens to carry a bound. The first
      // version of this rule searched 12 lines unconditionally and, in the
      // selftest specimen, climbed out of the local flex row into the outer
      // grid-cols-2, which then read as a width bound and hid the orphan.
      let inFlexGrid = false;
      for (let j = i - 1; j >= 0 && i - j <= 12; j--) {
        const cm = lines[j].match(/className=(?:"([^"]*)"|\{`([^`]*)`\}|\{"([^"]*)"\})/);
        if (!cm) continue;
        const c = cm[1] || cm[2] || cm[3] || "";
        inFlexGrid = IS_FLEX_GRID.test(c.replace(/\btruncate\b/g, ""));
        break; // nearest container wins, always
      }
      if (!inFlexGrid) return;
      // Inline-ish tags are flex items by default (span, a, img, button).
      const tagM = line.match(/<([a-zA-Z][a-zA-Z0-9]*)/g) || [];
      const tag = (tagM[tagM.length - 1] || "").replace(/[<>]/g, "");
      if (BLOCK_TAGS.includes(tag) && !/inline/.test(own)) return;

      let bounded = BOUND.test(own.replace(/\btruncate\b/g, ""));
      if (!bounded) {
        // Walk up to the NEAREST container only — the same line that decided
        // inFlexGrid. Searching further lets an unrelated ancestor elsewhere in
        // the file vouch for an element it does not contain, which silently
        // clears real orphans.
        for (let j = i - 1; j >= 0 && i - j <= 12; j--) {
          const cm = lines[j].match(/className=(?:"([^"]*)"|\{`([^`]*)`\}|\{"([^"]*)"\})/);
          if (!cm) continue;
          const c = cm[1] || cm[2] || cm[3] || "";
          bounded = BOUND.test(c.replace(/\btruncate\b/g, ""));
          break; // nearest container decides
        }
      }
      if (!bounded) out.push({ file, line: i + 1, text: line.trim().slice(0, 150) });
    });
  }
  return out;
}

/**
 * R4 — dark-mode artifacts: a border that does not read as a hairline.
 *
 * WHAT TAILWAIGHT ACTUALLY DOES (measured, not assumed — this rule was WRONG
 * on its first run and the correction is the interesting part). tailwindcss
 * 3.4.19 preflight.css:10-12 sets
 *     border-color: theme('borderColor.DEFAULT', currentColor)
 * and this repo declares NO `borderColor` key in tailwind.config.ts and no
 * global `* { border-color }` in app/globals.css. So the theme lookup yields
 * nothing and a bare `border` INHERITS currentColor — the element's own text
 * colour. It does not render invisible; it renders in the text ramp.
 *
 * The first version of this rule reported 258 "invisible borders" and the
 * claim was exactly backwards. Measured: 46 of the affected class strings set
 * text-ion-1 (#C4BFB6) on the same element, 32 set text-ion-3, 13 text-caution.
 * Those are bone/amber edges at roughly 10:1 and 8:1 against the page — the
 * LOUDEST border in the tree, on 258 of 323 card shells. The real defect is
 * the opposite one: a hairline that renders as a bright bone rule competing
 * with its own content. That is a visual-weight defect, not a dark-mode one.
 *
 * We therefore report the RESOLVED edge colour, and only call it a defect when
 * the resolved colour is (a) missing a token, i.e. inherited and therefore
 * coupled to text colour, or (b) a state colour used as a structural hairline.
 */
function scanInvisibleBorder(sources) {
  const SURFACE = /\bbg-([a-z-]+)(?:\/(\d+))?\b/;
  const BORDER = /\bborder(?:-([a-z-]+))?(?:-([0-9]))?(?:\/(\d+))?\b/;
  // Text ramp values, used to resolve the currentColor a bare border inherits.
  const TEXT_RAMP = {
    "ion-white": "#EDE8E0",
    "ion-1": "#C4BFB6",
    "ion-2": "#8F8A82",
    "ion-3": "#8F8A82",
    plasma: "#FF4D2E",
    caution: "#FFB454",
    alert: "#C0122F",
    verify: "#0B6B46",
  };
  const out = [];
  for (const { file, text } of sources) {
    const lines = text.split("\n");
    lines.forEach((line, i) => {
      const clsM = line.match(/className=(?:"([^"]*)"|\{`([^`]*)`\}|\{"([^"]*)"\})/);
      if (!clsM) return;
      const cls = clsM[1] || clsM[2] || clsM[3] || "";
      if (!CARD.test(cls)) return;
      const sm = cls.match(SURFACE);
      if (!sm) return;
      const surfaceFamily = sm[1];
      const surfaceAlpha = sm[2] ? parseInt(sm[2], 10) / 100 : 1;
      const cardBg = T[surfaceFamily] ? over(hx(T[surfaceFamily]), surfaceAlpha, page) : null;
      if (!cardBg) return;
      // A class string can carry BOTH a bare `border` (width) and a separate
      // `border-<colour>` (the actual paint). The first regex match is the bare
      // one, so taking match[0] mislabelled `border border-titanium/40` as
      // having no colour token. That inflated the first run's 258 count with
      // elements that are correctly tokenised. Take the LAST match, and prefer
      // any match that actually names a colour family.
      const allBorders = [...cls.matchAll(/\bborder(?:-([a-z-]+))?(?:-([0-9]))?(?:\/(\d+))?\b/g)];
      if (!allBorders.length) return;
      const coloured = allBorders.filter((m) => m[1] && m[1] !== "0");
      const bm = coloured.length ? coloured[0] : allBorders[allBorders.length - 1];
      const borderFamily = bm[1];
      const borderAlpha = bm[3] ? parseInt(bm[3], 10) / 100 : 1;

      if (!borderFamily) {
        // Bare `border` → currentColor → the element's own text token.
        const tm = cls.match(/\btext-([a-z0-9-]+)\b/);
        const resolved = tm && TEXT_RAMP[tm[1]] ? TEXT_RAMP[tm[1]] : "currentColor (no text- token on this element)";
        const loud = tm && TEXT_RAMP[tm[1]] ? contrast(hx(TEXT_RAMP[tm[1]]), cardBg) : null;
        out.push({
          file,
          line: i + 1,
          kind: "INHERITED_EDGE",
          detail: `bare border → ${resolved}${loud ? ` = ${loud.toFixed(2)}:1 vs its own card` : ""}`,
        });
        return;
      }
      if (!T[borderFamily]) return;
      const painted = over(hx(T[borderFamily]), borderAlpha, cardBg);
      const delta = painted.map((v, k) => Math.round(v - cardBg[k]));
      if (delta.every((d) => d === 0)) {
        out.push({
          file,
          line: i + 1,
          kind: "ZERO_DELTA",
          detail: `border-${borderFamily}/${borderAlpha * 100} on bg-${surfaceFamily}${sm[2] ? "/" + sm[2] : ""} → ${toHex(painted)} (ΔRGB 0,0,0)`,
        });
      } else if (contrast(painted, cardBg) < 1.05) {
        out.push({
          file,
          line: i + 1,
          kind: "NEAR_ZERO",
          detail: `border-${borderFamily}/${borderAlpha * 100} on bg-${surfaceFamily} → ${contrast(painted, cardBg).toFixed(3)}:1 vs its own card`,
        });
      }
    });
  }
  return out;
}

/** R5 — label casing. */
function scanCasing(sources) {
  const rows = [];
  for (const { file, text } of sources) {
    const up = (text.match(/\buppercase\b/g) || []).length;
    const norm = (text.match(/\bnormal-case\b/g) || []).length;
    const cap = (text.match(/\bcapitalize\b/g) || []).length;
    if (!up && !norm && !cap) continue;
    rows.push({ file, up, norm, cap });
  }
  return rows;
}

/**
 * R6 — accent on-role. Per AGENTS.md the Field palette declares ONE action
 * colour (signal/plasma #FF4D2E) and state colours (caution, alert, verify).
 * An accent painted on a NON-INTERACTIVE, NON-STATE element is decoration, and
 * decoration in a state palette is a mislabel. We report the census; the call
 * on which are wrong is the audit's, not the scanner's.
 */
const ROLES = {
  plasma: "ACTION (the only action colour)",
  signal: "ACTION (alias of plasma)",
  caution: "STATE",
  alert: "STATE",
  verify: "STATE",
  lime: "STATE",
  iris: "wayfinding (design-tokens.css:68)",
  "orbital-cyan": "retired alias → bone-1",
  ultraviolet: "retired alias → bone-1",
  "ds-cyan": "retired alias → bone-1 (tailwind.config.ts:104)",
};
function scanAccents(sources) {
  const census = new Map();
  for (const { file, text } of sources) {
    // `\\b` before the family is load-bearing. Without it, alternation matches
    // the `cyan` inside `orbital-cyan` and the `lime` inside any longer name,
    // which inflated the first run with a phantom "cyan" family of 77 that
    // does not exist as a Tailwind colour (the only cyan-ish hits in the
    // cockpit are 64x `orbital-cyan`, a retired alias).
    const re = new RegExp(
      "\\b(?:text|bg|border|ring|from|to|via)-(plasma|signal|caution|alert|verify|lime|iris|orbital-cyan|ultraviolet|ds-cyan)(?:-[0-9]+)?(?:/[0-9]+)?\\b",
      "g"
    );
    let m;
    while ((m = re.exec(text))) {
      // m[1] IS the family — the regex now captures it. The first version
      // re-derived it with a lazy /-(\w+?)…$/ against the whole match, which
      // split `orbital-cyan` into `cyan` and produced a phantom family of 77
      // that does not exist in the theme. Re-deriving a captured value is
      // always a chance to lose it.
      const fam = m[1];
      const prop = m[0].split("-")[0];
      if (!census.has(fam)) census.set(fam, { prop: new Map(), files: new Set() });
      census.get(fam).prop.set(prop, (census.get(fam).prop.get(prop) || 0) + 1);
      census.get(fam).files.add(file);
    }
  }
  return [...census.entries()].map(([fam, v]) => ({ fam, role: ROLES[fam] || "UNKNOWN", props: v.prop, files: v.files.size }));
}

// ---------------------------------------------------------------- selftest
if (SELFTEST) {
  const specimen = `import React from "react";
export default function Specimen() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {/* R1: card padding ladder has a minority p-5 next to p-4 */}
      <div className="rounded-xl border border-titanium/40 bg-eclipse p-5">PADDING</div>
      {/* R4: a bare border with no colour token */}
      <div className="rounded-lg border bg-titanium p-4">BARE</div>
      {/* R4: a coloured border that composites to its own card */}
      <div className="rounded-lg border-carbon/40 bg-carbon/40 p-4">ZERO</div>
      {/* R3: truncate as an UNBOUNDED flex item, no width bound above it */}
      <div className="flex items-center gap-2">
        <span className="truncate">ORPHAN</span>
      </div>
      {/* R3 NEGATIVE CONTROL 1: a truncate under a min-w-0 parent IS bounded */}
      <div className="min-w-0 flex-1">
        <span className="truncate">BOUNDED</span>
      </div>
      {/* R3 NEGATIVE CONTROL 2: truncate on a BLOCK-level p inside a flex
          container fills the block width, so it engages by design. Must NOT
          be flagged — the first version of this rule flagged it, which was
          wrong, so the specimen pins the correction. */}
      <div className="flex flex-col">
        <p className="truncate text-xs text-ion-2">BLOCKSAFE</p>
      </div>
      {/* R4 REGRESSION: a bare border AND a token on the same element. The
          token is the real paint; the bare border only sets width. */}
      <div className="rounded-lg border border-titanium/40 bg-eclipse p-4 text-ion-1">BOTH</div>
      {/* R6: an accent census specimen — the scanner must see all three roles */}
      <p className="text-caution">STATE</p>
      <p className="text-plasma">ACTION</p>
      <p className="text-verify">STATE2</p>
      {/* R6 REGRESSION: orbital-cyan must be counted as orbital-cyan, never
          split into a phantom "cyan" family. */}
      <p className="text-orbital-cyan">ALIAS</p>
    </div>
  );
}
`;
  const sources = [{ file: "SPECIMEN.tsx", text: specimen }];
  const pad = scanPadding(sources);
  const orph = scanOrphan(sources);
  const border = scanInvisibleBorder(sources);
  const accent = scanAccents(sources);
  const acc = Object.fromEntries(accent.map((a) => [a.fam, a]));

  const checks = [
    ["R1 padding finds p-4", pad.ladder.get("p-4") === 3],
    ["R1 padding finds p-5", pad.ladder.has("p-5") && pad.ladder.get("p-5") === 1],
    ["R1 ignores non-card padding", (pad.ladder.get("gap-3") || 0) === 0],
    ["R3 flags the unbounded truncate", orph.some((o) => o.text.includes("ORPHAN"))],
    ["R3 does NOT flag the bounded truncate", !orph.some((o) => o.text.includes("BOUNDED"))],
    ["R3 does NOT flag block-level truncate (fills width by design)", !orph.some((o) => o.text.includes("BLOCKSAFE"))],
    ["R4 flags the inherited-edge border", border.some((b) => b.kind === "INHERITED_EDGE")],
    ["R4 flags the zero-delta border", border.some((b) => b.kind === "ZERO_DELTA")],
    // HONEST INVERSION. The first version of this check asserted that
    // `border-titanium/40` on `bg-eclipse` is NOT flagged. Measuring it: that
    // pair lifts the card by dRGB (3,3,4) = 1.045:1, which is below the 1.05
    // near-zero floor, so the rule DOES flag it — correctly. It is the cockpit's
    // dominant hairline (294 uses), so the assertion was pinning a false
    // negative. The invariant is now the measured truth.
    ["R4 flags titanium/40 on eclipse as near-zero (dRGB 3,3,4 = 1.045:1)", border.some((b) => b.kind === "NEAR_ZERO" && b.detail.includes("titanium/40") && b.detail.includes("eclipse"))],
    ["R4 bare border + token reads the TOKEN (exactly 1 bare remains, the specimen's)", border.filter((b) => b.kind === "INHERITED_EDGE").length === 1],
    ["R5 casing reads uppercase", scanCasing([{ file: "s", text: '<p className="uppercase">X</p>' }])[0].up === 1],
    ["R5 casing reads normal-case", scanCasing([{ file: "s", text: '<p className="normal-case">x</p>' }])[0].norm === 1],
    ["R6 census finds caution", !!acc.caution],
    ["R6 census finds plasma", !!acc.plasma],
    ["R6 orbital-cyan is its own family, not a phantom cyan", !!acc["orbital-cyan"] && !acc.cyan],
    ["R2 grid reads a col ladder", scanGrid(sources)[0].cols.length === 1],
    ["R2 gap ladder is read (2 steps in specimen)", scanGrid(sources)[0].gaps.length === 2],
  ];
  let bad = 0;
  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
    if (!ok) bad++;
  }
  console.log(`\n${checks.length - bad}/${checks.length} selftest rules can fire.`);
  process.exit(bad ? 1 : 0);
}

// ---------------------------------------------------------------- report
const sources = files.map((file) => ({ file, text: execFileSync("git", ["show", `HEAD:${file}`], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }) }));

console.log(`visual-qa-scan — ${SELFTEST ? "selftest" : ALL ? "apps/web (all)" : "cockpit"} — ${files.length} files`);
console.log(`page ground ${toHex(page)} (bg-obsidian/60 over html ${T.void})\n`);

const pad = scanPadding(sources);
console.log("R1  CARD PADDING LADDER (class strings that also carry rounded-*)");
const padSorted = [...pad.ladder.entries()].sort((a, b) => b[1] - a[1]);
const padTotal = padSorted.reduce((n, [, c]) => n + c, 0);
for (const [cls, n] of padSorted) console.log(`    ${cls.padEnd(8)} ${String(n).padStart(4)}  ${((n / padTotal) * 100).toFixed(1)}%`);
console.log(`    total ${padTotal} card class strings`);
const multi = pad.perFile.filter((f) => f.mine.size > 2).length;
console.log(`    files mixing 3+ distinct card paddings: ${multi} / ${pad.perFile.length}\n`);

const grid = scanGrid(sources);
console.log(`R2  GRID LAYDER  (${grid.length} files use grid-cols-*)`);
const allCols = new Map();
const allGaps = new Map();
for (const r of grid) {
  for (const t of r.cols) { const [k, n] = t.split("×"); allCols.set(k, (allCols.get(k) || 0) + +n); }
  for (const t of r.gaps) { const [k, n] = t.split("×"); allGaps.set(k, (allGaps.get(k) || 0) + +n); }
}
console.log("    cols " + [...allCols.entries()].sort((a,b)=>+b[1]-+a[1]).map(([k,n])=>`${k}:${n}`).join("  "));
console.log("    gaps " + [...allGaps.entries()].sort((a,b)=>+b[1]-+a[1]).map(([k,n])=>`${k}:${n}`).join("  "));
const multiGap = grid.filter((r) => r.gaps.length > 1);
console.log(`    files using >1 gap step: ${multiGap.length} / ${grid.length}\n`);

const orph = scanOrphan(sources);
console.log(`R3  UNBOUNDED TRUNCATE  ${orph.length} hit(s)`);
for (const o of orph.slice(0, 25)) console.log(`    ${o.file}:${o.line}  ${o.text}`);
if (orph.length > 25) console.log(`    ... +${orph.length - 25} more\n`);

const border = scanInvisibleBorder(sources);
const inherited = border.filter((b) => b.kind === "INHERITED_EDGE");
const zero = border.filter((b) => b.kind === "ZERO_DELTA");
const near = border.filter((b) => b.kind === "NEAR_ZERO");
console.log(`R4  BORDER EDGE  inherited-currentColor=${inherited.length}  zero-delta=${zero.length}  near-zero=${near.length}`);
console.log("    NOTE: tailwind 3.4.19 preflight resolves a bare `border` to currentColor,");
console.log("    not to nothing. These render in the TEXT ramp, so they are LOUD, not invisible.");
const resolvedTally = new Map();
for (const b of inherited) {
  const m = b.detail.match(/→ (currentColor[^=]*|#[0-9A-F]{6})/);
  const k = m ? m[1].trim() : "unparsed";
  resolvedTally.set(k, (resolvedTally.get(k) || 0) + 1);
}
for (const [k, n] of [...resolvedTally.entries()].sort((a, b) => b[1] - a[1])) console.log(`      resolves to ${k.padEnd(46)} ${n}`);
for (const b of inherited.slice(0, 8)) console.log(`    INHERIT  ${b.file}:${b.line}  ${b.detail}`);
for (const b of zero.slice(0, 8)) console.log(`    ZERO      ${b.file}:${b.line}  ${b.detail}`);
for (const b of near.slice(0, 8)) console.log(`    NEAR      ${b.file}:${b.line}  ${b.detail}`);
console.log("");

const casing = scanCasing(sources);
const up = casing.reduce((n, c) => n + c.up, 0);
const nm = casing.reduce((n, c) => n + c.norm, 0);
const cp = casing.reduce((n, c) => n + c.cap, 0);
console.log(`R5  LABEL CASING  uppercase=${up}  normal-case=${nm}  capitalize=${cp}  (.eyebrow class usage below)`);
for (const c of casing.filter((c) => c.norm || c.cap)) console.log(`    ${c.file}  upper:${c.up} normal:${c.norm} capitalize:${c.cap}`);
console.log(`    .eyebrow class used: ${sources.reduce((n, s) => n + (s.text.match(/className="[^"]*\beyebrow\b/g) || []).length, 0)}x\n`);

console.log("R6  ACCENT ROLE CENSUS");
for (const a of scanAccents(sources).sort((a, b) => [...b.props.values()].reduce((x, y) => x + y, 0) - [...a.props.values()].reduce((x, y) => x + y, 0))) {
  const total = [...a.props.values()].reduce((x, y) => x + y, 0);
  console.log(`    ${a.fam.padEnd(14)} ${String(total).padStart(4)}  ${[...a.props.entries()].map(([k, v]) => `${k}:${v}`).join(" ")}   [${a.role}] in ${a.files} files`);
}
