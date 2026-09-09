#!/usr/bin/env node
/**
 * WCAG 2.x contrast checker, no dependencies.
 *
 * Implements the relative luminance and contrast ratio formulas from
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance and
 * https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio.
 *
 * Two run modes:
 *   node contrast-check.mjs current   -> measures apps/web's real fg/bg pairs
 *   node contrast-check.mjs proposed  -> measures the new semantic token set
 *   node contrast-check.mjs           -> runs both (default)
 *
 * Every ratio printed by this script backs a row in tokens-and-contrast.md.
 * Do not hand-type a ratio into that document; run this script and paste
 * its output.
 */

// ---------------------------------------------------------------------------
// WCAG math
// ---------------------------------------------------------------------------

/** Parse a #rgb, #rrggbb hex string (with or without leading #) to [r,g,b] 0-255. */
function hexToRgb(hex) {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (h.length !== 6) {
    throw new Error(`Bad hex color: ${hex}`);
  }
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) {
    throw new Error(`Bad hex color: ${hex}`);
  }
  return [r, g, b];
}

/** sRGB channel (0-255) -> linear channel, per WCAG. */
function srgbToLinear(channel8) {
  const c = channel8 / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance of a hex color, 0 (black) to 1 (white). */
export function relativeLuminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(srgbToLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colors, 1 (no contrast) to 21 (black/white). */
export function contrastRatio(hexA, hexB) {
  const lA = relativeLuminance(hexA);
  const lB = relativeLuminance(hexB);
  const lighter = Math.max(lA, lB);
  const darker = Math.min(lA, lB);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Alpha-composite a foreground color (with alpha 0-1) over an opaque
 * background color. Used for Tailwind's `bg-x/NN` opacity utilities, which
 * do not have a flat hex on their own -- their effective color depends on
 * what sits behind them. Returns a hex string.
 */
export function compositeOver(fgHex, alpha, bgHex) {
  const [fr, fg, fb] = hexToRgb(fgHex);
  const [br, bg, bb] = hexToRgb(bgHex);
  const mix = (f, b) => Math.round(f * alpha + b * (1 - alpha));
  const toHex = (v) => v.toString(16).padStart(2, "0");
  return `#${toHex(mix(fr, br))}${toHex(mix(fg, bg))}${toHex(mix(fb, bb))}`;
}

const AA_TEXT = 4.5;
const AA_LARGE_OR_UI = 3.0;

/**
 * @param {string} name
 * @param {string} fgHex
 * @param {string} bgHex
 * @param {"text"|"large"|"ui"} kind - text needs 4.5:1, large text and UI/graphics need 3:1
 */
function check(name, fgHex, bgHex, kind = "text") {
  const ratio = contrastRatio(fgHex, bgHex);
  const threshold = kind === "text" ? AA_TEXT : AA_LARGE_OR_UI;
  const pass = ratio >= threshold;
  return { name, fgHex: fgHex.toUpperCase(), bgHex: bgHex.toUpperCase(), kind, ratio, threshold, pass };
}

function printTable(rows) {
  const fmt = (r) => r.ratio.toFixed(2) + ":1";
  const nameW = Math.max(4, ...rows.map((r) => r.name.length));
  const header = `${"name".padEnd(nameW)}  fg       bg       kind   ratio     AA(>=${AA_TEXT}/${AA_LARGE_OR_UI})`;
  console.log(header);
  console.log("-".repeat(header.length));
  let fails = 0;
  for (const r of rows) {
    if (!r.pass) fails += 1;
    console.log(
      `${r.name.padEnd(nameW)}  ${r.fgHex.padEnd(7)}  ${r.bgHex.padEnd(7)}  ${r.kind.padEnd(5)}  ${fmt(r).padEnd(8)}  ${r.pass ? "PASS" : "FAIL"}`,
    );
  }
  console.log("-".repeat(header.length));
  console.log(`${rows.length} pairs, ${rows.length - fails} pass, ${fails} fail`);
  return fails;
}

// ---------------------------------------------------------------------------
// Hex constants, read from apps/web/styles/design-tokens.css and
// apps/web/tailwind.config.ts (the files the app actually imports/builds
// against -- see tokens-and-contrast.md "Current inventory" for the drift
// against design-system/colors_and_type.css and DESIGN.md, which are NOT
// what apps/web loads).
// ---------------------------------------------------------------------------

const HEX = {
  // dark scale
  void: "#05070B",
  obsidian: "#05070B",
  carbon: "#0D1117",
  eclipse: "#171228",
  titanium: "#211A33",
  slate: "#20283A",
  mineral: "#3B3158",
  mineralHi: "#4D4175",
  // ion (dark text)
  ionWhite: "#F5F7FF",
  ion: "#D5DDE9",
  ion1: "#AEB7D2",
  ion2: "#B1BAD5",
  ion3: "#8B97AB",
  // paper (light scale)
  paper: "#F7F8FB",
  paperRaised: "#FFFFFF",
  paperSunken: "#F0F2F6",
  paperBorder: "#D9DEE7",
  ink: "#0E1320",
  ink1: "#3A4356",
  ink2: "#5B6678",
  // accents on light
  plasmaOnLight: "#B0118C",
  orbitalCyanOnLight: "#06748A",
  ultravioletOnLight: "#5B43C9",
  verifyOnLight: "#0B6B46",
  alertOnLight: "#C0122F",
  cautionOnLight: "#9A4D00",
  // brand accents (dark scale)
  plasma: "#FF38C7",
  plasmaInk: "#1A0014",
  ionBlue: "#00E5FF",
  orbitalCyan: "#00E5FF",
  ultraviolet: "#7B61FF",
  ultravioletGlow: "#9F87FF",
  nebulaPurple: "#A855F7",
  electricBlue: "#2A6BFF",
  // semantic (dark scale)
  verify: "#5FD9A3",
  alert: "#FF6470",
  caution: "#FFB454",
  // plain white/black used as literal Tailwind classes in components
  white: "#FFFFFF",
  // Tailwind default palette colors used (not redefined in tailwind.config.ts)
  emerald700: "#047857",
  rose700: "#BE123C",
};

// ---------------------------------------------------------------------------
// CURRENT pairs -- every one grepped from a real component or globals.css.
// See tokens-and-contrast.md for the file:line citation of each.
// ---------------------------------------------------------------------------

function currentPairs() {
  const rows = [];

  // --- globals.css / design-tokens.css body defaults (dark cosmic canvas) ---
  rows.push(check("body: ion on carbon", HEX.ion, HEX.carbon, "text"));
  rows.push(check("body: ion-white heading on carbon", HEX.ionWhite, HEX.carbon, "text"));
  rows.push(check("eyebrow/.crumb: fg-meta (ion-1) on carbon", HEX.ion1, HEX.carbon, "text"));

  // --- PageHero (dark variant), no own bg -> sits on carbon page bg ---
  rows.push(check("PageHero dark: eyebrow text-orbital-cyan on carbon", HEX.orbitalCyan, HEX.carbon, "text"));
  rows.push(check("PageHero dark: title text-ion-white on carbon", HEX.ionWhite, HEX.carbon, "text"));
  rows.push(check("PageHero dark: desc text-ion-1 on carbon", HEX.ion1, HEX.carbon, "text"));

  // --- PageHero (paper variant), no own bg -> sits on paper page bg ---
  rows.push(check("PageHero paper: eyebrow text-orbital-cyan-on-light on paper", HEX.orbitalCyanOnLight, HEX.paper, "text"));
  rows.push(check("PageHero paper: title text-ink on paper", HEX.ink, HEX.paper, "text"));
  rows.push(check("PageHero paper: desc text-ink-1 on paper", HEX.ink1, HEX.paper, "text"));

  // --- KpiCard ---
  rows.push(check("KpiCard dark: label text-ion-1 on bg-eclipse", HEX.ion1, HEX.eclipse, "text"));
  rows.push(check("KpiCard dark: value text-ion-white on bg-eclipse", HEX.ionWhite, HEX.eclipse, "text"));
  rows.push(check("KpiCard dark: sub text-ion-1 on bg-eclipse", HEX.ion1, HEX.eclipse, "text"));
  rows.push(check("KpiCard paper: label text-ink-2 on bg-paper-raised", HEX.ink2, HEX.paperRaised, "text"));
  rows.push(check("KpiCard paper: value text-ink on bg-paper-raised", HEX.ink, HEX.paperRaised, "text"));
  rows.push(check("KpiCard paper: sub text-ink-2 on bg-paper-raised", HEX.ink2, HEX.paperRaised, "text"));

  // --- MetricExplainer ---
  rows.push(check("MetricExplainer dark: title text-orbital-cyan on bg-eclipse", HEX.orbitalCyan, HEX.eclipse, "text"));
  rows.push(check("MetricExplainer dark: term text-ion-white on bg-eclipse", HEX.ionWhite, HEX.eclipse, "text"));
  rows.push(check("MetricExplainer dark: def text-ion-1 on bg-eclipse", HEX.ion1, HEX.eclipse, "text"));
  rows.push(check("MetricExplainer paper: title text-orbital-cyan-on-light on bg-paper-raised", HEX.orbitalCyanOnLight, HEX.paperRaised, "text"));
  rows.push(check("MetricExplainer paper: term text-ink on bg-paper-raised", HEX.ink, HEX.paperRaised, "text"));
  rows.push(check("MetricExplainer paper: def text-ink-1 on bg-paper-raised", HEX.ink1, HEX.paperRaised, "text"));

  // --- DataTable ---
  rows.push(check("DataTable dark: headText text-ion-2 on bg-carbon (panel/headBg)", HEX.ion2, HEX.carbon, "text"));
  rows.push(check("DataTable dark: headStrong text-ion-1 on bg-carbon", HEX.ion1, HEX.carbon, "text"));
  rows.push(check("DataTable dark: cell text on bg-eclipse (raised row)", HEX.ionWhite, HEX.eclipse, "text"));
  rows.push(check("DataTable dark: muted text-ion-2 on bg-eclipse", HEX.ion2, HEX.eclipse, "text"));
  rows.push(check("DataTable dark: active/sorted text-orbital-cyan on bg-eclipse", HEX.orbitalCyan, HEX.eclipse, "text"));
  rows.push(check("DataTable dark: input placeholder text-ion-2 on bg-eclipse", HEX.ion2, HEX.eclipse, "text"));
  const darkZebra = compositeOver(HEX.carbon, 0.4, HEX.eclipse); // bg-carbon/40 over shell bg-eclipse
  rows.push(check("DataTable dark: cell text on zebra bg-carbon/40-over-eclipse", HEX.ionWhite, darkZebra, "text"));

  rows.push(check("DataTable paper: headText text-ink-2 on bg-paper-sunken", HEX.ink2, HEX.paperSunken, "text"));
  rows.push(check("DataTable paper: headStrong text-ink-1 on bg-paper-sunken", HEX.ink1, HEX.paperSunken, "text"));
  rows.push(check("DataTable paper: cell text on bg-paper-raised (raised row)", HEX.ink, HEX.paperRaised, "text"));
  rows.push(check("DataTable paper: muted text-ink-2 on bg-paper-raised", HEX.ink2, HEX.paperRaised, "text"));
  rows.push(check("DataTable paper: active/sorted text-orbital-cyan-on-light on bg-paper-raised", HEX.orbitalCyanOnLight, HEX.paperRaised, "text"));
  const paperZebra = compositeOver(HEX.paperSunken, 0.6, HEX.paperRaised); // bg-paper-sunken/60 over shell bg-paper-raised
  rows.push(check("DataTable paper: cell text on zebra bg-paper-sunken/60-over-paper-raised", HEX.ink, paperZebra, "text"));

  // --- lib/intelligence/colors.ts signal tones ---
  rows.push(check("toneClass paper good: text-emerald-700 on paper", HEX.emerald700, HEX.paper, "text"));
  rows.push(check("toneClass paper good: text-emerald-700 on paper-sunken", HEX.emerald700, HEX.paperSunken, "text"));
  rows.push(check("toneClass paper bad: text-rose-700 on paper", HEX.rose700, HEX.paper, "text"));
  rows.push(check("toneClass paper bad: text-rose-700 on paper-sunken", HEX.rose700, HEX.paperSunken, "text"));
  rows.push(check("toneClass paper neutral: text-ink-1 on paper", HEX.ink1, HEX.paper, "text"));
  rows.push(check("toneClass dark good: text-verify on carbon", HEX.verify, HEX.carbon, "text"));
  rows.push(check("toneClass dark bad: text-alert on carbon", HEX.alert, HEX.carbon, "text"));
  rows.push(check("toneClass dark neutral: text-ion-1 on carbon", HEX.ion1, HEX.carbon, "text"));

  // --- PickCard (base bg-carbon) ---
  rows.push(check("PickCard: game time text-ion-1 on bg-carbon", HEX.ion1, HEX.carbon, "text"));
  rows.push(check("PickCard: team name text-white on bg-carbon", HEX.white, HEX.carbon, "text"));
  rows.push(check("PickCard: selection text-white on bg-carbon", HEX.white, HEX.carbon, "text"));
  rows.push(check("PickCard: sport chip text-ion-1 on bg-titanium", HEX.ion1, HEX.titanium, "text"));
  rows.push(check("PickCard: field labels text-ion-1 on bg-carbon", HEX.ion1, HEX.carbon, "text"));
  rows.push(check("PickCard: 'how we grade' link text-ion-2 on bg-carbon", HEX.ion2, HEX.carbon, "text"));
  const orbitalInfoBox = compositeOver(HEX.orbitalCyan, 0.05, HEX.carbon); // bg-orbital-cyan/5 over carbon
  rows.push(check("PickCard: info box text-ion-1 on bg-orbital-cyan/5-over-carbon", HEX.ion1, orbitalInfoBox, "text"));
  rows.push(check("PickCard: 'LIVE' badge text-plasma-ink on bg-plasma", HEX.plasmaInk, HEX.plasma, "ui"));

  // Risk level styles (RISK_LEVEL_STYLES), text-only span, sits on bg-carbon
  rows.push(check("PickCard: risk LOW_RISK text-verify on bg-carbon", HEX.verify, HEX.carbon, "text"));
  rows.push(check("PickCard: risk MODERATE text-plasma on bg-carbon", HEX.plasma, HEX.carbon, "text"));
  rows.push(check("PickCard: risk HIGH_VARIANCE/LINE_STEAM text-ultraviolet-glow on bg-carbon", HEX.ultravioletGlow, HEX.carbon, "text"));
  rows.push(check("PickCard: risk INJURY_RISK text-alert on bg-carbon", HEX.alert, HEX.carbon, "text"));

  // Badges: bg-X/10 composited over the card's bg-carbon
  const plasma10 = compositeOver(HEX.plasma, 0.1, HEX.carbon);
  const verify10 = compositeOver(HEX.verify, 0.1, HEX.carbon);
  const ionBlue10 = compositeOver(HEX.ionBlue, 0.1, HEX.carbon);
  const alert10 = compositeOver(HEX.alert, 0.1, HEX.carbon);
  const ultraviolet10 = compositeOver(HEX.ultraviolet, 0.1, HEX.carbon);
  const titanium40 = compositeOver(HEX.titanium, 0.4, HEX.carbon);

  rows.push(check("Badge: GradeBadge ELITE_PLAY text-plasma on bg-plasma/10", HEX.plasma, plasma10, "ui"));
  rows.push(check("Badge: GradeBadge STRONG_PLAY text-verify on bg-verify/10", HEX.verify, verify10, "ui"));
  rows.push(check("Badge: GradeBadge SOLID_PLAY text-ion-blue on bg-ion-blue/10", HEX.ionBlue, ionBlue10, "ui"));
  rows.push(check("Badge: GradeBadge LEAN text-ion-2 on bg-titanium/40", HEX.ion2, titanium40, "ui"));
  rows.push(check("Badge: TierBadge FREE text-verify on bg-verify/10", HEX.verify, verify10, "ui"));
  rows.push(check("Badge: TierBadge PREMIUM text-plasma on bg-plasma/10", HEX.plasma, plasma10, "ui"));
  rows.push(check("Badge: ResultBadge WIN text-verify on bg-verify/10", HEX.verify, verify10, "ui"));
  rows.push(check("Badge: ResultBadge LOSS text-alert on bg-alert/10", HEX.alert, alert10, "ui"));
  rows.push(check("Badge: ResultBadge PUSH text-ion-2 on bg-titanium", HEX.ion2, HEX.titanium, "ui"));
  rows.push(check("Badge: ResultBadge VOID text-ion-1 on bg-titanium", HEX.ion1, HEX.titanium, "ui"));
  rows.push(check("Badge: PickTypeBadge SPREAD text-ion-blue on bg-ion-blue/10", HEX.ionBlue, ionBlue10, "ui"));
  rows.push(check("Badge: PickTypeBadge MONEYLINE/TOTAL text-ultraviolet-glow on bg-ultraviolet/10", HEX.ultravioletGlow, ultraviolet10, "ui"));
  rows.push(check("Badge: ConfidenceBadge >=80 text-verify on bg-verify/10", HEX.verify, verify10, "ui"));
  rows.push(check("Badge: ConfidenceBadge >=70 text-ion-blue on bg-ion-blue/10", HEX.ionBlue, ionBlue10, "ui"));
  rows.push(check("Badge: ConfidenceBadge >=60 text-plasma on bg-plasma/10", HEX.plasma, plasma10, "ui"));
  rows.push(check("Badge: ConfidenceBadge <60 text-ion-2 on bg-titanium", HEX.ion2, HEX.titanium, "ui"));

  // --- bare text-ultraviolet (base #7B61FF, NOT -glow) used as small text ---
  // e.g. methodology-section.tsx tone class, fantasy-shell.tsx eyebrow,
  // fantasy/bestball-board.tsx "Stack score" stat (18px regular, on
  // .surface-card = eclipse at 80% opacity -- globals.css .surface-card).
  // pick-card.tsx itself never does this (it always reaches for
  // -glow for text and reserves base ultraviolet for bg/border), which is
  // the tell that whoever wrote it already knew base ultraviolet is too dark
  // for text on these surfaces.
  rows.push(check("Bare text-ultraviolet (base, not -glow) on bg-carbon", HEX.ultraviolet, HEX.carbon, "text"));
  const surfaceCard = compositeOver(HEX.eclipse, 0.8, HEX.carbon); // .surface-card
  rows.push(check("Bare text-ultraviolet (base, not -glow) on .surface-card (~eclipse/80%)", HEX.ultraviolet, surfaceCard, "text"));

  return rows;
}

// ---------------------------------------------------------------------------
// PROPOSED semantic token set (see tokens-and-contrast.md for the full
// rationale). Values are duplicated here, not imported, so this script has
// no dependency on the CSS file and stays a single, runnable source of truth
// for every ratio quoted in the doc.
// ---------------------------------------------------------------------------

export const PROPOSED = {
  // Light values are the CURRENT --paper*/--ink*/--*-on-light hexes, carried
  // forward unchanged (they already measured AA in design-tokens.css). Only
  // the role NAMES change. --info is the one genuinely new color; nothing
  // named "info" exists in the current system.
  light: {
    surface: "#F7F8FB", // == --paper
    surfaceRaised: "#FFFFFF", // == --paper-raised
    surfaceSunken: "#F0F2F6", // == --paper-sunken
    hairline: "#D9DEE7", // == --paper-border (decorative, not AA-gated)
    text: "#0E1320", // == --ink
    textMuted: "#3A4356", // == --ink-1
    accent: "#06748A", // == --orbital-cyan-on-light (the ONE brand hue)
    positive: "#0B6B46", // == --verify-on-light
    negative: "#C0122F", // == --alert-on-light
    caution: "#9A4D00", // == --caution-on-light
    info: "#1D4E9B", // NEW -- no prior "info" role existed
    focusRing: "#06748A", // == accent
  },
  // Dark values are the CURRENT --carbon/--eclipse/--void/--ion*/--verify/
  // --alert/--caution hexes. --accent collapses the old three-hue signal set
  // (plasma/ion-blue/ultraviolet) down to the ONE already-brightest,
  // already-most-used hue (orbital cyan) per the brief's "one accent hue,
  // not three." --info is the one genuinely new color.
  dark: {
    surface: "#0D1117", // == --carbon
    surfaceRaised: "#171228", // == --eclipse
    surfaceSunken: "#05070B", // == --void / --obsidian
    hairline: "#3B3158", // == --mineral (decorative, not AA-gated)
    text: "#D5DDE9", // == --ion (the body default today)
    textMuted: "#AEB7D2", // == --ion-1
    accent: "#00E5FF", // == --orbital-cyan (the ONE brand hue)
    positive: "#5FD9A3", // == --verify
    negative: "#FF6470", // == --alert
    caution: "#FFB454", // == --caution
    info: "#8FB8F5", // NEW -- no prior "info" role existed
    focusRing: "#00E5FF", // == accent
  },
};

function proposedPairs() {
  const rows = [];
  for (const themeName of ["light", "dark"]) {
    const t = PROPOSED[themeName];
    const surfaces = [
      ["surface", t.surface],
      ["surface-raised", t.surfaceRaised],
      ["surface-sunken", t.surfaceSunken],
    ];
    for (const [surfName, surfHex] of surfaces) {
      rows.push(check(`${themeName}: text on ${surfName}`, t.text, surfHex, "text"));
      rows.push(check(`${themeName}: text-muted on ${surfName}`, t.textMuted, surfHex, "text"));
      rows.push(check(`${themeName}: accent on ${surfName} (text use)`, t.accent, surfHex, "text"));
      rows.push(check(`${themeName}: accent on ${surfName} (UI use)`, t.accent, surfHex, "ui"));
      rows.push(check(`${themeName}: positive on ${surfName}`, t.positive, surfHex, "text"));
      rows.push(check(`${themeName}: negative on ${surfName}`, t.negative, surfHex, "text"));
      rows.push(check(`${themeName}: caution on ${surfName}`, t.caution, surfHex, "text"));
      rows.push(check(`${themeName}: info on ${surfName}`, t.info, surfHex, "text"));
      rows.push(check(`${themeName}: focus-ring on ${surfName} (3:1 UI)`, t.focusRing, surfHex, "ui"));
    }
  }
  return rows;
}

/**
 * Hairline is a decorative divider (row separators, card edges), not a text
 * color or a UI component whose state must be told apart by color alone
 * (WCAG 1.4.11 Non-text Contrast applies to UI *components* and meaningful
 * graphical objects, not plain dividers) -- so it is deliberately excluded
 * from the pass/fail gate above. It's reported here for the record, not
 * graded, matching how apps/web's own --border / --paper-border tokens are
 * currently used (sub-3:1 dividers throughout both themes today).
 */
function informationalPairs() {
  return [
    check("light: hairline on surface (decorative divider, not gated)", PROPOSED.light.hairline, PROPOSED.light.surface, "ui"),
    check("dark: hairline on surface (decorative divider, not gated)", PROPOSED.dark.hairline, PROPOSED.dark.surface, "ui"),
  ];
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const mode = process.argv[2] || "all";
let totalFails = 0;

if (mode === "current" || mode === "all") {
  console.log("\n=== CURRENT pairs (apps/web today) ===\n");
  totalFails += printTable(currentPairs());
}

if (mode === "proposed" || mode === "all") {
  console.log("\n=== PROPOSED pairs (new semantic token set) ===\n");
  totalFails += printTable(proposedPairs());
  console.log("\n=== INFORMATIONAL (not gated -- see comment in source) ===\n");
  printTable(informationalPairs());
}

process.exitCode = totalFails > 0 ? 1 : 0;
