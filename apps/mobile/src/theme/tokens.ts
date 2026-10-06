/**
 * GSE FIELD design tokens — native port.
 *
 * AUTHORITY: `apps/web/styles/design-tokens.css` in Beexly/Sports. That file
 * declares itself the sole authority ("Canonical values: FIELD (approved
 * 2026-09-10)"), and `BRAND_AND_DESIGN_SYSTEM.md` §2 identifies `DESIGN.md`'s
 * YAML front matter and `design-system/colors_and_type.css` as STALE mirrors
 * that still document the retired pre-FIELD palette (plasma #FF2DD6, orbital
 * cyan #00E5FF, ultraviolet #7A5CFF).
 *
 * Do not port from DESIGN.md. Port from the CSS. Where the two disagree, the
 * CSS wins — that rule is written into DESIGN.md itself.
 *
 * Every value below is transcribed verbatim. The only additions are
 * (a) alpha helpers and (b) the documented retirement map, both of which make
 * the port auditable rather than interpretive.
 */

/* ── ENVIRONMENT — Field dark scale ─────────────────────────────────────── */
export const environment = {
  void: "#08090C",
  obsidian: "#08090C",
  carbon: "#08090C",
  eclipse: "#12141A",
  titanium: "#191C23",
  slate: "#191C23",
  mineral: "#23262E",
  mineralHi: "#31353F",
} as const;

/* ── BONE — warm chalky text on nebula ground ───────────────────────────── */
/* Contrast on ground #08090C: bone 15.91, fog 12.74, mist 9.37 — all AA/AAA.
   On panel #12141A: 15.31 / 12.26 / 9.02. */
export const ink = {
  bone: "#EDE8E0", // --ion-white / --ion
  fog: "#C4BFB6", // --ion-1
  mist: "#8F8A82", // --ion-2 / --ion-3
} as const;

/* ── PAPER — light data-surface scale (ADDITIVE) ───────────────────────── */
/* Per the token file: "LIGHT SCALE = data surfaces (tables, tools, boards)
   where dense numbers must read like a spreadsheet. Never used on
   marketing/cinematic pages." The app honours that scope: paper is offered
   only for the dense board/picks/calibration reading surfaces, never for
   onboarding, the paywall, or the narrative brief. */
export const paper = {
  base: "#F7F8FB",
  raised: "#FFFFFF",
  sunken: "#F0F2F6",
  border: "#D9DEE7",
  ink: "#0E1320", // 17.46:1 on paper — PASS
  ink1: "#3A4356", // 9.34:1 — PASS
  ink2: "#5B6678", // 5.47:1 — PASS
  accent: "#B0118C",
  wayfind: "#5B43C9",
  verify: "#0B6B46", // 6.17:1 — PASS
  alert: "#C0122F", // 5.87:1 — PASS
  caution: "#9A4D00", // 5.76:1 — PASS
} as const;

/* ── EMBER — the single action accent ──────────────────────────────────── */
/* FIELD: magenta retired → ember #FF4D2E. AA on ground 5.87 — action/large/
   bold only, never body prose. */
export const ember = {
  base: "#FF4D2E",
  glow: "#FF7A5C",
  deep: "#C22E1A",
  onBase: "#1A0703", // --plasma-ink
} as const;

/* ── IRIS — the wayfinding accent ──────────────────────────────────────── */
/* Active nav and current-section markers ONLY. Never CTAs, never body,
   never data. Ratios: 8.44 on ground, 8.13 on panel. */
export const iris = {
  base: "#9AA8E8",
  glow: "#C3CDEF",
  deep: "#6E7BB8",
} as const;

/* ── SEMANTIC ──────────────────────────────────────────────────────────── */
export const semantic = {
  verify: "#5FD9A3",
  verifyDeep: "#2D9870",
  alert: "#FF6470",
  alertDeep: "#B53C45",
  caution: "#FFB454",
  cautionDeep: "#B5781F",
} as const;

/* ── RETIRED FAMILIES — kept as names, resolved to their FIELD values ───── */
/* The token file keeps these NAMES so ~245 call sites keep compiling, but
   every one now resolves to fog or a panel colour. Reproduced here so a
   reviewer can see at a glance that the app did not invent its own palette. */
export const retired = {
  ionBlue: "#C4BFB6",
  orbitalCyan: "#C4BFB6",
  ultraviolet: "#C4BFB6",
  nebulaPurple: "#191C23",
  electricBlue: "#12141A",
  lime: "#FF4D2E", // live tick → ember dot
  cyan: "#C4BFB6",
  amber: "#C4BFB6", // deprecated alias → ion-blue → fog
  gold: "#C4BFB6",
  cobalt: "#C4BFB6",
  magenta: "#FF4D2E",
  mint: "#5FD9A3",
  vermilion: "#FF6470",
  signalFade: "#C4BFB6", // was a 3-stop gradient; retired to flat
} as const;

/* ── SPACING — 4px grid ─────────────────────────────────────────────────── */
export const space = {
  s1: 4,
  s2: 8,
  s3: 12,
  s4: 16,
  s5: 20,
  s6: 24,
  s8: 32,
  s10: 40,
  s12: 48,
  s16: 64,
  s20: 80,
  s24: 96,
  s30: 120,
  s40: 160,
} as const;

/* ── RADII ──────────────────────────────────────────────────────────────── */
export const radius = {
  xs: 3,
  sm: 6,
  md: 10,
  lg: 14,
  pill: 999,
} as const;

/* ── MOTION ─────────────────────────────────────────────────────────────── */
/* Durations in ms, matching --dur-*. Reanimated's spring/timing configs read
   these directly. `reduced` is the value the app substitutes when the OS
   reports Reduce Motion — the design contract's global zeroing, ported. */
export const motion = {
  dur: { fast: 150, base: 280, slow: 520, cinematic: 880, reduced: 0.001 },
  easing: {
    // Bezier control points — Reanimated's Easing.bezier takes numbers,
    // so the CSS cubic-bezier strings are pre-parsed here.
    out: [0.2, 0, 0, 1] as const,
    inOut: [0.5, 0, 0.2, 1] as const,
  },
  /** Plasma dots pulse at 2.4s. Used for live indicators only. */
  livePulseMs: 2400,
} as const;

/* ── GLOWS ──────────────────────────────────────────────────────────────── */
/* FIELD keeps only the ember core. Every other glow resolves to `none` —
   "a blurred halo makes a colour read as an emitting sign rather than as
   ink. Hairline borders separate; shadows do not." */
export const glow = {
  ember: { radius: 48, offsetY: -8, opacity: 0.55 },
  emberSoft: { radius: 80, offsetY: -20, opacity: 0.2 },
} as const;

/* ── APPROVED GLYPHS ────────────────────────────────────────────────────── */
/* The design contract: "The only glyphs are data glyphs (↑ ↓ − · →)". Emoji
   are banned outright by the brand voice, and the app's voice linter enforces
   it. These are the sanctioned arrow/minus forms — note the real Unicode
   minus U+2212, never the ASCII hyphen, in numeric output. */
export const glyph = {
  up: "↑",
  down: "↓",
  minus: "\u2212", // −
  dot: "·",
  arrow: "→",
  /** Settlement monograms per DESIGN.md § Settlement Badge. Never ✓/✗ alone. */
  win: "W",
  loss: "L",
  push: "P",
  void: "V",
} as const;

/* ── ALPHA HELPER ───────────────────────────────────────────────────────── */
/**
 * Convert a #RRGGBB token to an rgba() string.
 *
 * Deliberately strict: it throws on a malformed hex rather than silently
 * returning something that renders as transparent. A silent transparent
 * surface is how a card looks "missing" in a screenshot and nobody notices
 * until a customer does.
 */
export function withAlpha(hex: string, alpha: number): string {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
    throw new Error(`withAlpha: expected #RRGGBB, received "${hex}"`);
  }
  if (alpha < 0 || alpha > 1 || Number.isNaN(alpha)) {
    throw new Error(`withAlpha: alpha must be within [0,1], received ${alpha}`);
  }
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * WCAG 2.1 relative luminance + contrast ratio.
 *
 * Shipped in the app rather than only in CI because the design contract sets
 * AA as a *minimum* and this app introduces surfaces (native modals, blur
 * bars, the paper reading mode) that do not exist on the web. Being able to
 * assert contrast at runtime — and in tests — is the difference between
 * "we followed the spec" and "we can prove the spec holds here too".
 */
export function relativeLuminance(hex: string): number {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
    throw new Error(`relativeLuminance: expected #RRGGBB, received "${hex}"`);
  }
  const channel = (c: number): number => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const r = channel(parseInt(hex.slice(1, 3), 16));
  const g = channel(parseInt(hex.slice(3, 5), 16));
  const b = channel(parseInt(hex.slice(5, 7), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}
