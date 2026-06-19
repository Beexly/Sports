/**
 * Color utility functions — pure math, zero DOM dependencies.
 *
 * RGB↔HSL↔HEX conversion, luminance, contrast ratio (WCAG 2.1),
 * color mixing, and CSS variable helpers.
 * All values are pure numbers; no DOM access.
 */

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export interface HSLColor {
  h: number;
  s: number;
  l: number;
}

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

/**
 * Parses "#RGB", "#RRGGBB", "#RGBA", "#RRGGBBAA" hex strings.
 * Returns null on invalid input.
 */
export function hexToRgb(hex: string): RGBColor | null {
  if (typeof hex !== "string") return null;
  // Must start with # to be treated as a hex color
  if (!hex.startsWith("#")) return null;
  const cleaned = hex.slice(1);

  // Validate that all characters are valid hex digits
  if (!/^[0-9a-fA-F]+$/.test(cleaned)) return null;

  if (cleaned.length === 3 || cleaned.length === 4) {
    // Expand short form: #RGB → #RRGGBB
    const r = parseInt(cleaned[0] + cleaned[0], 16);
    const g = parseInt(cleaned[1] + cleaned[1], 16);
    const b = parseInt(cleaned[2] + cleaned[2], 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
    return { r, g, b };
  }

  if (cleaned.length === 6 || cleaned.length === 8) {
    const r = parseInt(cleaned.slice(0, 2), 16);
    const g = parseInt(cleaned.slice(2, 4), 16);
    const b = parseInt(cleaned.slice(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
    return { r, g, b };
  }

  return null;
}

/**
 * Converts RGB values (0-255) to a lowercase "#rrggbb" hex string.
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number): string =>
    Math.round(Math.max(0, Math.min(255, n)))
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// ---------------------------------------------------------------------------
// RGB ↔ HSL conversion
// ---------------------------------------------------------------------------

/**
 * Converts RGB (0-255 each) to HSL.
 * Returns h: 0-360, s: 0-100, l: 0-100.
 */
export function rgbToHsl(r: number, g: number, b: number): HSLColor {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  const l = (max + min) / 2;
  let s = 0;
  let h = 0;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));

    if (max === rn) {
      h = ((gn - bn) / delta) % 6;
    } else if (max === gn) {
      h = (bn - rn) / delta + 2;
    } else {
      h = (rn - gn) / delta + 4;
    }

    h = h * 60;
    if (h < 0) h += 360;
  }

  return {
    h: Math.round(h * 1000) / 1000,
    s: Math.round(s * 100 * 1000) / 1000,
    l: Math.round(l * 100 * 1000) / 1000,
  };
}

/**
 * Converts HSL (h: 0-360, s: 0-100, l: 0-100) to RGB (0-255 each).
 */
export function hslToRgb(h: number, s: number, l: number): RGBColor {
  const sn = s / 100;
  const ln = l / 100;

  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) {
    r = c; g = x; b = 0;
  } else if (h < 120) {
    r = x; g = c; b = 0;
  } else if (h < 180) {
    r = 0; g = c; b = x;
  } else if (h < 240) {
    r = 0; g = x; b = c;
  } else if (h < 300) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

// ---------------------------------------------------------------------------
// Convenience converters
// ---------------------------------------------------------------------------

/** hex → HSL, returns null on invalid input. */
export function hexToHsl(hex: string): HSLColor | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return rgbToHsl(rgb.r, rgb.g, rgb.b);
}

/** HSL → "#rrggbb" hex string. */
export function hslToHex(h: number, s: number, l: number): string {
  const { r, g, b } = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}

// ---------------------------------------------------------------------------
// Luminance and contrast (WCAG 2.1)
// ---------------------------------------------------------------------------

/**
 * WCAG 2.1 relative luminance in [0, 1].
 * Applies sRGB linearization and the standard weighting coefficients.
 */
export function relativeLuminance(r: number, g: number, b: number): number {
  const linearize = (c: number): number => {
    const srgb = c / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  };
  const R = linearize(r);
  const G = linearize(g);
  const B = linearize(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * WCAG 2.1 contrast ratio between two hex colors.
 * Returns null if either hex is invalid.
 */
export function contrastRatio(hex1: string, hex2: string): number | null {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return null;

  const l1 = relativeLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = relativeLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * WCAG 2.1 grade for a contrast ratio.
 * AAA ≥ 7.0, AA ≥ 4.5, AA-Large ≥ 3.0, else Fail.
 */
export function wcagGrade(ratio: number): "AAA" | "AA" | "AA-Large" | "Fail" {
  if (ratio >= 7.0) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3.0) return "AA-Large";
  return "Fail";
}

/**
 * Returns true when two hex colors meet WCAG AA contrast.
 * For normal text: ratio ≥ 4.5; for large text: ratio ≥ 3.0.
 */
export function meetsWcagAa(
  hex1: string,
  hex2: string,
  isLargeText = false
): boolean {
  const ratio = contrastRatio(hex1, hex2);
  if (ratio === null) return false;
  return ratio >= (isLargeText ? 3.0 : 4.5);
}

// ---------------------------------------------------------------------------
// HSL-based color manipulation
// ---------------------------------------------------------------------------

function adjustHsl(
  hex: string,
  mutate: (hsl: HSLColor) => HSLColor
): string {
  const hsl = hexToHsl(hex);
  if (!hsl) return hex;
  const adjusted = mutate(hsl);
  return hslToHex(adjusted.h, adjusted.s, adjusted.l);
}

const clamp = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, v));

/** Lighten a hex color by `amount` units (0-100) in HSL lightness. */
export function lighten(hex: string, amount: number): string {
  return adjustHsl(hex, (hsl) => ({
    ...hsl,
    l: clamp(hsl.l + amount, 0, 100),
  }));
}

/** Darken a hex color by `amount` units (0-100) in HSL lightness. */
export function darken(hex: string, amount: number): string {
  return adjustHsl(hex, (hsl) => ({
    ...hsl,
    l: clamp(hsl.l - amount, 0, 100),
  }));
}

/** Increase saturation of a hex color by `amount` (0-100). */
export function saturate(hex: string, amount: number): string {
  return adjustHsl(hex, (hsl) => ({
    ...hsl,
    s: clamp(hsl.s + amount, 0, 100),
  }));
}

/** Decrease saturation of a hex color by `amount` (0-100). */
export function desaturate(hex: string, amount: number): string {
  return adjustHsl(hex, (hsl) => ({
    ...hsl,
    s: clamp(hsl.s - amount, 0, 100),
  }));
}

// ---------------------------------------------------------------------------
// Color mixing
// ---------------------------------------------------------------------------

/**
 * Mix two hex colors in RGB space.
 * ratio=0 → all hex1, ratio=1 → all hex2, ratio=0.5 → equal blend.
 * Returns null if either hex is invalid.
 */
export function mixColors(
  hex1: string,
  hex2: string,
  ratio = 0.5
): string | null {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return null;

  const r = Math.round(rgb1.r * (1 - ratio) + rgb2.r * ratio);
  const g = Math.round(rgb1.g * (1 - ratio) + rgb2.g * ratio);
  const b = Math.round(rgb1.b * (1 - ratio) + rgb2.b * ratio);

  return rgbToHex(r, g, b);
}

/**
 * Alpha-blend a hex color over a background (default #FFFFFF) at alpha [0,1].
 * Returns the resulting solid hex color.
 */
export function alphaBlend(
  hex: string,
  alpha: number,
  backgroundHex = "#FFFFFF"
): string {
  const fg = hexToRgb(hex);
  const bg = hexToRgb(backgroundHex);
  if (!fg || !bg) return hex;

  const a = clamp(alpha, 0, 1);
  const r = Math.round(fg.r * a + bg.r * (1 - a));
  const g = Math.round(fg.g * a + bg.g * (1 - a));
  const b = Math.round(fg.b * a + bg.b * (1 - a));

  return rgbToHex(r, g, b);
}

// ---------------------------------------------------------------------------
// Accessibility helpers
// ---------------------------------------------------------------------------

/**
 * Returns "#000000" or "#FFFFFF" — whichever gives better contrast
 * against the given background hex.
 */
export function getTextColor(backgroundHex: string): "#000000" | "#FFFFFF" {
  const rgb = hexToRgb(backgroundHex);
  if (!rgb) return "#000000";

  const l = relativeLuminance(rgb.r, rgb.g, rgb.b);
  // White has luminance 1.0; black has 0.0
  const contrastWithWhite = (1 + 0.05) / (l + 0.05);
  const contrastWithBlack = (l + 0.05) / (0 + 0.05);

  return contrastWithWhite >= contrastWithBlack ? "#FFFFFF" : "#000000";
}

// ---------------------------------------------------------------------------
// Palette generation
// ---------------------------------------------------------------------------

/**
 * Generate a lightness scale from the base hue/saturation.
 * steps=9 → 9 hex colors from very light (l=95) to very dark (l=10).
 */
export function generatePalette(baseHex: string, steps = 9): string[] {
  const hsl = hexToHsl(baseHex);
  if (!hsl) return [];

  const palette: string[] = [];
  const lightStart = 95;
  const lightEnd = 10;
  const range = lightStart - lightEnd;

  for (let i = 0; i < steps; i++) {
    const l = lightStart - (range * i) / (steps - 1);
    palette.push(hslToHex(hsl.h, hsl.s, l));
  }

  return palette;
}

/**
 * Generate analogous colors by rotating hue ±spread degrees.
 * Default spread=30, count=3 (base + 1 on each side).
 * Returns HSL objects.
 */
export function analogousColors(
  hsl: HSLColor,
  spread = 30,
  count = 3
): HSLColor[] {
  const result: HSLColor[] = [];
  const half = Math.floor(count / 2);

  for (let i = -half; i <= half; i++) {
    if (result.length >= count) break;
    const h = ((hsl.h + i * spread) % 360 + 360) % 360;
    result.push({ h, s: hsl.s, l: hsl.l });
  }

  // If count is even, include one extra on the positive side
  while (result.length < count) {
    const idx = result.length - half;
    const h = ((hsl.h + idx * spread) % 360 + 360) % 360;
    result.push({ h, s: hsl.s, l: hsl.l });
  }

  return result;
}

// ---------------------------------------------------------------------------
// CSS helpers (no DOM access — pure string building)
// ---------------------------------------------------------------------------

/**
 * Returns a CSS `var()` expression.
 * varName must NOT include the `--` prefix.
 */
export function cssVarValue(varName: string, fallback?: string): string {
  if (fallback !== undefined) {
    return `var(--${varName}, ${fallback})`;
  }
  return `var(--${varName})`;
}

/**
 * Returns a CSS4 space-separated hsl() or hsl() with alpha.
 * e.g. "hsl(240 100% 50%)" or "hsl(240 100% 50% / 0.5)"
 */
export function hslCss(
  h: number,
  s: number,
  l: number,
  alpha?: number
): string {
  const base = `hsl(${h} ${s}% ${l}%`;
  if (alpha !== undefined) {
    return `${base} / ${alpha})`;
  }
  return `${base})`;
}

// ---------------------------------------------------------------------------
// Generic parser (extensible)
// ---------------------------------------------------------------------------

/**
 * Tries to parse a color string into RGB.
 * Currently supports hex format only; returns null otherwise.
 */
export function parseColorToRgb(color: string): RGBColor | null {
  return hexToRgb(color);
}
