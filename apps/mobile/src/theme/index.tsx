import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useColorScheme } from "react-native";

import {
  contrastRatio,
  ember,
  environment,
  glyph,
  ink,
  iris,
  motion,
  paper,
  radius,
  semantic,
  space,
  withAlpha,
} from "./tokens";
import { family, tracking, type, weight } from "./typography";

/**
 * Theme resolution.
 *
 * The FIELD token file ships TWO scales and states the scope of each:
 *
 *   · the dark environment scale is "the default canvas" — the identity
 *   · the PAPER scale is "ADDITIVE … LIGHT data surfaces (tables, tools,
 *     boards) where dense numbers must read like a spreadsheet. Never used
 *     on marketing/cinematic pages."
 *
 * `DESIGN.md` §2 (via BRAND_AND_DESIGN_SYSTEM.md) flags that light mode does
 * not exist and that this "should be a *documented decision*, not an
 * omission". This is that documented decision, and it is deliberately narrow:
 *
 *   Field  — the identity. Every narrative surface. The default.
 *   Paper  — an opt-in reading mode, offered ONLY on the four dense surfaces
 *            named in the token comment (Board, Picks, Pick detail, the
 *            Calibration table). Never onboarding, never the paywall, never
 *            the Brief.
 *
 * The app does NOT follow the OS appearance setting for the identity surfaces.
 * A dark-native instrument that turns white because the phone is in light
 * mode is not the product. Paper is a user preference, chosen on purpose,
 * and it reverts the moment the user leaves a dense surface.
 */

export type ThemeMode = "field" | "paper";

export interface ThemeColors {
  /** Page canvas. */
  bg: string;
  /** Card. */
  raised: string;
  /** Nested / elevated card. */
  elevated: string;
  /** Interactive pressed/hover. */
  hover: string;
  /** 1px hairline border. */
  border: string;
  /** Border hover / strong divider. */
  borderStrong: string;
  /** Primary body text. */
  fg: string;
  /** Secondary text. */
  fgMeta: string;
  /** Tertiary / meta. AA-safe on the dark canvas (fog), AA-safe on paper. */
  fgMuted: string;
  /** Decorative strokes only. Never prose. */
  fgDisabled: string;
  /** The single action accent. */
  accent: string;
  accentGlow: string;
  accentDeep: string;
  /** Text that sits ON the accent fill. */
  onAccent: string;
  /** Wayfinding only — active nav, current section. Never CTAs, never data. */
  wayfind: string;
  /** Settlement WIN / positive confirmation. Never general "good" UI. */
  verify: string;
  /** Settlement LOSS / critical warning. Never general "bad" UI. */
  alert: string;
  /** Incomplete data / review needed. */
  caution: string;
  /** Live indicator dot. */
  live: string;
  /** Modal backdrop. */
  scrim: string;
  /** Translucent bar for blur headers. */
  barBlur: string;
  /** Chart grid. */
  grid: string;
}

export interface Theme {
  mode: ThemeMode;
  colors: ThemeColors;
  type: typeof type;
  weight: typeof weight;
  tracking: typeof tracking;
  family: typeof family;
  space: typeof space;
  radius: typeof radius;
  motion: typeof motion;
  glyph: typeof glyph;
  withAlpha: typeof withAlpha;
  /** True when this mode is a dense data surface (affects density only). */
  isPaper: boolean;
}

const fieldColors: ThemeColors = {
  bg: environment.carbon,
  raised: environment.eclipse,
  elevated: environment.titanium,
  hover: environment.slate,
  border: environment.mineral,
  borderStrong: environment.mineralHi,
  fg: ink.bone,
  fgMeta: ink.fog,
  fgMuted: ink.mist,
  fgDisabled: ink.mist,
  accent: ember.base,
  accentGlow: ember.glow,
  accentDeep: ember.deep,
  onAccent: ember.onBase,
  wayfind: iris.base,
  verify: semantic.verify,
  alert: semantic.alert,
  caution: semantic.caution,
  live: ember.base,
  scrim: withAlpha(environment.void, 0.85),
  barBlur: withAlpha(environment.carbon, 0.72),
  grid: withAlpha(environment.mineral, 0.2),
};

const paperColors: ThemeColors = {
  bg: paper.base,
  raised: paper.raised,
  elevated: paper.sunken,
  hover: paper.sunken,
  border: paper.border,
  borderStrong: paper.ink2,
  fg: paper.ink,
  fgMeta: paper.ink1,
  fgMuted: paper.ink2,
  fgDisabled: paper.ink2,
  accent: paper.accent,
  accentGlow: paper.accent,
  accentDeep: paper.accent,
  onAccent: paper.raised,
  wayfind: paper.wayfind,
  verify: paper.verify,
  alert: paper.alert,
  caution: paper.caution,
  live: paper.accent,
  scrim: "rgba(14, 19, 32, 0.55)",
  barBlur: withAlpha(paper.base, 0.82),
  grid: withAlpha(paper.border, 0.9),
};

/**
 * Build a Theme for a mode. Memoised at the call site, never per-render.
 */
export function buildTheme(mode: ThemeMode): Theme {
  const isPaper = mode === "paper";
  return {
    mode,
    colors: isPaper ? paperColors : fieldColors,
    type,
    weight,
    tracking,
    family,
    space,
    radius,
    motion,
    glyph,
    withAlpha,
    isPaper,
  };
}

/**
 * Surfaces where paper reading mode is permitted, per the token file's own
 * scope. Exported so a test can assert the list has not quietly grown, and so
 * navigation can force Field outside it.
 */
export const PAPER_ELIGIBLE_ROUTES: readonly string[] = [
  "/board",
  "/picks",
  "/pick",
  "/calibration",
] as const;

export function isPaperEligible(routePath: string): boolean {
  return PAPER_ELIGIBLE_ROUTES.some(
    (r) => routePath === r || routePath.startsWith(`${r}/`),
  );
}

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({
  mode,
  children,
}: {
  mode: ThemeMode;
  children: ReactNode;
}): React.ReactElement {
  const theme = useMemo(() => buildTheme(mode), [mode]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error(
      "useTheme() was called outside <ThemeProvider>. Mount the provider at the " +
        "root layout; a silent fallback here is how a screen renders in the wrong " +
        "mode and nobody notices until a screenshot review.",
    );
  }
  return ctx;
}

/**
 * Contrast budget used by tests and by the review harness.
 *
 * Mirrors DESIGN.md § Accessibility exactly: body text on the card surface
 * must clear 4.5:1; secondary text must clear 3:1; `fgMuted` is documented as
 * decorative-only on the dark canvas and AA-on-paper.
 */
export const CONTRAST_REQUIREMENTS = {
  fgOnRaised: 4.5,
  fgMetaOnRaised: 3.0,
} as const;

export function auditThemeContrast(mode: ThemeMode): {
  pair: string;
  ratio: number;
  required: number;
  pass: boolean;
}[] {
  const t = buildTheme(mode);
  const pairs: { pair: string; fg: string; bg: string; required: number }[] = [
    { pair: "fg on raised", fg: t.colors.fg, bg: t.colors.raised, required: 4.5 },
    { pair: "fg on bg", fg: t.colors.fg, bg: t.colors.bg, required: 4.5 },
    { pair: "fgMeta on raised", fg: t.colors.fgMeta, bg: t.colors.raised, required: 3.0 },
    { pair: "fgMuted on raised", fg: t.colors.fgMuted, bg: t.colors.raised, required: 3.0 },
    { pair: "accent on raised", fg: t.colors.accent, bg: t.colors.raised, required: 3.0 },
    { pair: "verify on raised", fg: t.colors.verify, bg: t.colors.raised, required: 3.0 },
    { pair: "alert on raised", fg: t.colors.alert, bg: t.colors.raised, required: 3.0 },
    { pair: "wayfind on raised", fg: t.colors.wayfind, bg: t.colors.raised, required: 3.0 },
    { pair: "onAccent on accent", fg: t.colors.onAccent, bg: t.colors.accent, required: 4.5 },
  ];
  return pairs.map(({ pair, fg, bg, required }) => {
    const ratio = contrastRatio(fg, bg);
    return { pair, ratio, required, pass: ratio >= required };
  });
}

/** Re-export so screens can branch on the OS setting where it is legitimate
 *  (e.g. choosing the splash glow), without ever driving the identity theme. */
export { useColorScheme };
