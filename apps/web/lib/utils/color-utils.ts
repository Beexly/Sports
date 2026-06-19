/**
 * color-utils.ts — Pure TypeScript color manipulation utilities.
 * No npm dependencies. No DOM access.
 *
 * Exports: parsing, serialization, conversion, WCAG contrast,
 * color manipulation, mixing, palette generation, and CSS helpers.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number; // 0-1
}

export interface Hsl {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

export interface Hsla {
  h: number;
  s: number;
  l: number;
  a: number; // 0-1
}

export interface Hsv {
  h: number; // 0-360
  s: number; // 0-100
  v: number; // 0-100
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

function toHexByte(n: number): string {
  return Math.round(clamp(n, 0, 255))
    .toString(16)
    .padStart(2, "0");
}

function hueToRgb(p: number, q: number, t: number): number {
  let tVal = t;
  if (tVal < 0) tVal += 1;
  if (tVal > 1) tVal -= 1;
  if (tVal < 1 / 6) return p + (q - p) * 6 * tVal;
  if (tVal < 1 / 2) return q;
  if (tVal < 2 / 3) return p + (q - p) * (2 / 3 - tVal) * 6;
  return p;
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/**
 * Accepts #RGB, #RRGGBB, #RGBA, #RRGGBBAA.
 * Throws on invalid hex string.
 * Returns Rgb (alpha ignored).
 */
export function parseHex(hex: string): Rgb {
  if (typeof hex !== "string" || !hex.startsWith("#")) {
    throw new Error(`Invalid hex color: ${String(hex)}`);
  }
  const cleaned = hex.slice(1);
  if (!/^[0-9a-fA-F]+$/.test(cleaned) || ![3, 4, 6, 8].includes(cleaned.length)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  if (cleaned.length === 3 || cleaned.length === 4) {
    const r = parseInt(cleaned[0] + cleaned[0], 16);
    const g = parseInt(cleaned[1] + cleaned[1], 16);
    const b = parseInt(cleaned[2] + cleaned[2], 16);
    return { r, g, b };
  }

  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  return { r, g, b };
}

/**
 * Same as parseHex but returns alpha channel (defaults to 1.0 if not present).
 */
export function parseHexRgba(hex: string): Rgba {
  if (typeof hex !== "string" || !hex.startsWith("#")) {
    throw new Error(`Invalid hex color: ${String(hex)}`);
  }
  const cleaned = hex.slice(1);
  if (!/^[0-9a-fA-F]+$/.test(cleaned) || ![3, 4, 6, 8].includes(cleaned.length)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  if (cleaned.length === 3) {
    const r = parseInt(cleaned[0] + cleaned[0], 16);
    const g = parseInt(cleaned[1] + cleaned[1], 16);
    const b = parseInt(cleaned[2] + cleaned[2], 16);
    return { r, g, b, a: 1 };
  }

  if (cleaned.length === 4) {
    const r = parseInt(cleaned[0] + cleaned[0], 16);
    const g = parseInt(cleaned[1] + cleaned[1], 16);
    const b = parseInt(cleaned[2] + cleaned[2], 16);
    const a = parseInt(cleaned[3] + cleaned[3], 16) / 255;
    return { r, g, b, a };
  }

  if (cleaned.length === 6) {
    const r = parseInt(cleaned.slice(0, 2), 16);
    const g = parseInt(cleaned.slice(2, 4), 16);
    const b = parseInt(cleaned.slice(4, 6), 16);
    return { r, g, b, a: 1 };
  }

  // 8 chars: #RRGGBBAA
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  const a = parseInt(cleaned.slice(6, 8), 16) / 255;
  return { r, g, b, a };
}

/**
 * Parses "rgb(r, g, b)" or "rgba(r, g, b, a)". Returns Rgb (alpha ignored).
 * Throws on invalid string.
 */
export function parseRgbString(cssRgb: string): Rgb {
  const match = cssRgb
    .trim()
    .match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d.]+)?\s*\)$/);
  if (!match) {
    throw new Error(`Invalid rgb/rgba string: ${cssRgb}`);
  }
  return {
    r: parseInt(match[1], 10),
    g: parseInt(match[2], 10),
    b: parseInt(match[3], 10),
  };
}

/**
 * Accepts hex (#RGB, #RRGGBB) or rgb/rgba() strings; dispatches to correct parser.
 */
export function parseColor(input: string): Rgb {
  const trimmed = input.trim();
  if (trimmed.startsWith("#")) {
    return parseHex(trimmed);
  }
  if (trimmed.startsWith("rgb")) {
    return parseRgbString(trimmed);
  }
  throw new Error(`Unrecognized color format: ${input}`);
}

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

/** Returns "#RRGGBB" lowercase hex. */
export function toHex(rgb: Rgb): string {
  return `#${toHexByte(rgb.r)}${toHexByte(rgb.g)}${toHexByte(rgb.b)}`;
}

/** Returns "#RRGGBBAA" lowercase hex. */
export function toHexFull(rgba: Rgba): string {
  return `${toHex({ r: rgba.r, g: rgba.g, b: rgba.b })}${toHexByte(rgba.a * 255)}`;
}

/** Returns "rgb(r, g, b)". */
export function toRgbString(rgb: Rgb): string {
  return `rgb(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)})`;
}

/** Returns "rgba(r, g, b, a)". */
export function toRgbaString(rgba: Rgba): string {
  return `rgba(${Math.round(rgba.r)}, ${Math.round(rgba.g)}, ${Math.round(rgba.b)}, ${rgba.a})`;
}

/** Returns "hsl(h, s%, l%)". */
export function toHslString(hsl: Hsl): string {
  return `hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%)`;
}

// ---------------------------------------------------------------------------
// Conversion
// ---------------------------------------------------------------------------

/**
 * Converts RGB (0-255 each) to HSL.
 * Returns h: 0-360, s: 0-100, l: 0-100.
 */
export function rgbToHsl(rgb: Rgb): Hsl {
  const rn = rgb.r / 255;
  const gn = rgb.g / 255;
  const bn = rgb.b / 255;

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
 * Converts HSL (h: 0-360, s: 0-100, l: 0-100) to RGB.
 * r/g/b rounded to integer.
 */
export function hslToRgb(hsl: Hsl): Rgb {
  const sn = hsl.s / 100;
  const ln = hsl.l / 100;

  if (sn === 0) {
    const val = Math.round(ln * 255);
    return { r: val, g: val, b: val };
  }

  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;
  const h = hsl.h / 360;

  return {
    r: Math.round(hueToRgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hueToRgb(p, q, h) * 255),
    b: Math.round(hueToRgb(p, q, h - 1 / 3) * 255),
  };
}

/** Converts RGB to HSV. h: 0-360, s/v: 0-100. */
export function rgbToHsv(rgb: Rgb): Hsv {
  const rn = rgb.r / 255;
  const gn = rgb.g / 255;
  const bn = rgb.b / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  const v = max * 100;
  const s = max === 0 ? 0 : (delta / max) * 100;

  let h = 0;
  if (delta !== 0) {
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
    s: Math.round(s * 1000) / 1000,
    v: Math.round(v * 1000) / 1000,
  };
}

/** Converts HSV to RGB. */
export function hsvToRgb(hsv: Hsv): Rgb {
  const s = hsv.s / 100;
  const v = hsv.v / 100;
  const h = hsv.h;

  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

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
// Relative luminance (WCAG)
// ---------------------------------------------------------------------------

/**
 * WCAG 2.1 relative luminance in [0, 1].
 * L = 0.2126*R + 0.7152*G + 0.0722*B (linearized sRGB).
 */
export function relativeLuminance(rgb: Rgb): number {
  const linearize = (c: number): number => {
    const srgb = c / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * linearize(rgb.r) + 0.7152 * linearize(rgb.g) + 0.0722 * linearize(rgb.b);
}

// ---------------------------------------------------------------------------
// Contrast ratio (WCAG 2.1)
// ---------------------------------------------------------------------------

/**
 * WCAG 2.1 contrast ratio: (L1 + 0.05) / (L2 + 0.05)
 * where L1 is the lighter of the two luminances.
 */
export function contrastRatio(foreground: Rgb, background: Rgb): number {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** AAA: >= 7:1; AA: >= 4.5:1; AA Large: >= 3:1; Fail: < 3:1. */
export function wcagLevel(ratio: number): "AAA" | "AA" | "AA Large" | "Fail" {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA Large";
  return "Fail";
}

/**
 * Returns true when foreground/background meet the requested WCAG level.
 * AA normal: >= 4.5; AA large: >= 3; AAA: >= 7; AAA large: >= 4.5.
 */
export function isAccessible(
  foreground: Rgb,
  background: Rgb,
  level: "AA" | "AAA" = "AA",
  largeText = false
): boolean {
  const ratio = contrastRatio(foreground, background);
  if (level === "AAA") {
    return ratio >= (largeText ? 4.5 : 7);
  }
  // AA
  return ratio >= (largeText ? 3 : 4.5);
}

// ---------------------------------------------------------------------------
// Color manipulation (HSL-based)
// ---------------------------------------------------------------------------

function withHsl(rgb: Rgb, mutate: (hsl: Hsl) => Hsl): Rgb {
  const hsl = rgbToHsl(rgb);
  return hslToRgb(mutate(hsl));
}

/** Increase L in HSL by amount, clamp to 100. */
export function lighten(rgb: Rgb, amount: number): Rgb {
  return withHsl(rgb, (hsl) => ({ ...hsl, l: clamp(hsl.l + amount, 0, 100) }));
}

/** Decrease L in HSL by amount, clamp to 0. */
export function darken(rgb: Rgb, amount: number): Rgb {
  return withHsl(rgb, (hsl) => ({ ...hsl, l: clamp(hsl.l - amount, 0, 100) }));
}

/** Increase S in HSL by amount. */
export function saturate(rgb: Rgb, amount: number): Rgb {
  return withHsl(rgb, (hsl) => ({ ...hsl, s: clamp(hsl.s + amount, 0, 100) }));
}

/** Decrease S in HSL by amount. */
export function desaturate(rgb: Rgb, amount: number): Rgb {
  return withHsl(rgb, (hsl) => ({ ...hsl, s: clamp(hsl.s - amount, 0, 100) }));
}

/** Rotate hue by degrees (mod 360). */
export function rotate(rgb: Rgb, degrees: number): Rgb {
  return withHsl(rgb, (hsl) => ({
    ...hsl,
    h: ((hsl.h + degrees) % 360 + 360) % 360,
  }));
}

/** Hue + 180. */
export function complement(rgb: Rgb): Rgb {
  return rotate(rgb, 180);
}

/** Invert: 255 - each component. */
export function invert(rgb: Rgb): Rgb {
  return { r: 255 - rgb.r, g: 255 - rgb.g, b: 255 - rgb.b };
}

/** Grayscale via HSL desaturation to 0. */
export function grayscale(rgb: Rgb): Rgb {
  return desaturate(rgb, 100);
}

// ---------------------------------------------------------------------------
// Color mixing
// ---------------------------------------------------------------------------

/**
 * Linear interpolation of each channel.
 * ratio=0 → all a, ratio=1 → all b, default 0.5.
 */
export function mix(a: Rgb, b: Rgb, ratio = 0.5): Rgb {
  const r = clamp(ratio, 0, 1);
  return {
    r: Math.round(a.r * (1 - r) + b.r * r),
    g: Math.round(a.g * (1 - r) + b.g * r),
    b: Math.round(a.b * (1 - r) + b.b * r),
  };
}

/**
 * Alpha compositing: result = foreground.rgb * foreground.a + background * (1 - foreground.a).
 */
export function alphaBlend(foreground: Rgba, background: Rgb): Rgb {
  const a = clamp(foreground.a, 0, 1);
  return {
    r: Math.round(foreground.r * a + background.r * (1 - a)),
    g: Math.round(foreground.g * a + background.g * (1 - a)),
    b: Math.round(foreground.b * a + background.b * (1 - a)),
  };
}

// ---------------------------------------------------------------------------
// Palette generation
// ---------------------------------------------------------------------------

/** Returns [original, hue+150, hue+210]. */
export function splitComplementary(rgb: Rgb): [Rgb, Rgb, Rgb] {
  return [rgb, rotate(rgb, 150), rotate(rgb, 210)];
}

/** Returns [original, hue+120, hue+240]. */
export function triadic(rgb: Rgb): [Rgb, Rgb, Rgb] {
  return [rgb, rotate(rgb, 120), rotate(rgb, 240)];
}

/** Returns [original, hue-spread, hue+spread]. spread default 30 degrees. */
export function analogous(rgb: Rgb, spread = 30): [Rgb, Rgb, Rgb] {
  return [rgb, rotate(rgb, -spread), rotate(rgb, spread)];
}

/** Returns [original, hue+90, hue+180, hue+270]. */
export function tetradic(rgb: Rgb): [Rgb, Rgb, Rgb, Rgb] {
  return [rgb, rotate(rgb, 90), rotate(rgb, 180), rotate(rgb, 270)];
}

/**
 * count evenly spaced tints from original to near-white (L up to 95).
 */
export function generateTints(rgb: Rgb, count: number): Rgb[] {
  const hsl = rgbToHsl(rgb);
  const result: Rgb[] = [];
  const step = (95 - hsl.l) / Math.max(count - 1, 1);
  for (let i = 0; i < count; i++) {
    result.push(hslToRgb({ ...hsl, l: clamp(hsl.l + step * i, 0, 100) }));
  }
  return result;
}

/**
 * count evenly spaced shades from original to near-black (L down to 5).
 */
export function generateShades(rgb: Rgb, count: number): Rgb[] {
  const hsl = rgbToHsl(rgb);
  const result: Rgb[] = [];
  const step = (hsl.l - 5) / Math.max(count - 1, 1);
  for (let i = 0; i < count; i++) {
    result.push(hslToRgb({ ...hsl, l: clamp(hsl.l - step * i, 0, 100) }));
  }
  return result;
}

/**
 * Tailwind-style scale: 100=lightest, mid=original, 900=darkest.
 * steps default 9; returns { 100: '#hex', 200: '#hex', ..., steps*100: '#hex' }.
 */
export function generatePalette(rgb: Rgb, steps = 9): Record<number, string> {
  const hsl = rgbToHsl(rgb);
  const lightStart = 95;
  const lightEnd = 5;
  const range = lightStart - lightEnd;
  const result: Record<number, string> = {};

  for (let i = 0; i < steps; i++) {
    const l = lightStart - (range * i) / Math.max(steps - 1, 1);
    const key = (i + 1) * 100;
    result[key] = toHex(hslToRgb({ ...hsl, l: clamp(l, 0, 100) }));
  }

  return result;
}

// ---------------------------------------------------------------------------
// Accessibility helpers
// ---------------------------------------------------------------------------

/**
 * Adjust L of baseColor (in HSL) iteratively until contrast meets level.
 * Try lightening first; if can't reach target, try darkening.
 */
export function findAccessibleColor(
  baseColor: Rgb,
  background: Rgb,
  level: "AA" | "AAA" = "AA"
): Rgb {
  const targetRatio = level === "AAA" ? 7 : 4.5;
  const hsl = rgbToHsl(baseColor);

  // Try lightening
  for (let l = hsl.l; l <= 100; l += 1) {
    const candidate = hslToRgb({ ...hsl, l });
    if (contrastRatio(candidate, background) >= targetRatio) {
      return candidate;
    }
  }

  // Try darkening
  for (let l = hsl.l; l >= 0; l -= 1) {
    const candidate = hslToRgb({ ...hsl, l });
    if (contrastRatio(candidate, background) >= targetRatio) {
      return candidate;
    }
  }

  // Best effort: return white or black
  const white: Rgb = { r: 255, g: 255, b: 255 };
  const black: Rgb = { r: 0, g: 0, b: 0 };
  return contrastRatio(white, background) >= contrastRatio(black, background) ? white : black;
}

/**
 * Returns black or white, whichever has higher contrast ratio with background.
 */
export function bestTextColor(background: Rgb): Rgb {
  const white: Rgb = { r: 255, g: 255, b: 255 };
  const black: Rgb = { r: 0, g: 0, b: 0 };
  const contrastWithWhite = contrastRatio(white, background);
  const contrastWithBlack = contrastRatio(black, background);
  return contrastWithWhite >= contrastWithBlack ? white : black;
}

// ---------------------------------------------------------------------------
// Named colors (subset of CSS named colors)
// ---------------------------------------------------------------------------

export const namedColors: Record<string, Rgb> = {
  black: { r: 0, g: 0, b: 0 },
  white: { r: 255, g: 255, b: 255 },
  red: { r: 255, g: 0, b: 0 },
  green: { r: 0, g: 128, b: 0 },
  blue: { r: 0, g: 0, b: 255 },
  yellow: { r: 255, g: 255, b: 0 },
  orange: { r: 255, g: 165, b: 0 },
  purple: { r: 128, g: 0, b: 128 },
  gray: { r: 128, g: 128, b: 128 },
  navy: { r: 0, g: 0, b: 128 },
  teal: { r: 0, g: 128, b: 128 },
  maroon: { r: 128, g: 0, b: 0 },
  pink: { r: 255, g: 192, b: 203 },
};

/**
 * Find closest named color by euclidean distance in RGB space.
 * Returns name if within distance 20, else null.
 */
export function colorName(rgb: Rgb): string | null {
  let closestName: string | null = null;
  let closestDist = Infinity;

  for (const [name, namedRgb] of Object.entries(namedColors)) {
    const dist = colorDistance(rgb, namedRgb);
    if (dist < closestDist) {
      closestDist = dist;
      closestName = name;
    }
  }

  return closestDist <= 20 ? closestName : null;
}

// ---------------------------------------------------------------------------
// Distance / similarity
// ---------------------------------------------------------------------------

/** Euclidean distance in RGB space. */
export function colorDistance(a: Rgb, b: Rgb): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Weighted Euclidean (human eye more sensitive to green):
 * sqrt(2*dR^2 + 4*dG^2 + 3*dB^2) — simplified perceptual metric.
 */
export function perceptualDistance(a: Rgb, b: Rgb): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db);
}

// ---------------------------------------------------------------------------
// Color temperature
// ---------------------------------------------------------------------------

/**
 * warm: hue 0-60 or 300-360 (reds, oranges, yellows)
 * cool: hue 150-270 (greens, blues)
 * neutral: else; also neutral if saturation < 15
 */
export function colorTemperature(rgb: Rgb): "warm" | "cool" | "neutral" {
  const { h, s } = rgbToHsl(rgb);
  if (s < 15) return "neutral";
  if (h <= 60 || h >= 300) return "warm";
  if (h >= 150 && h <= 270) return "cool";
  return "neutral";
}

// ---------------------------------------------------------------------------
// Format conversion from brand tokens
// ---------------------------------------------------------------------------

/**
 * Converts #RRGGBB to "R G B" space-separated (for Tailwind CSS custom colors).
 * e.g. "#1a2b3c" → "26 43 60"
 */
export function hexToTailwindRgb(hex: string): string {
  const { r, g, b } = parseHex(hex);
  return `${r} ${g} ${b}`;
}

/**
 * Returns CSS custom property declaration: "--{varName}: R G B;"
 */
export function cssVarColor(hex: string, varName: string): string {
  return `--${varName}: ${hexToTailwindRgb(hex)};`;
}

// ---------------------------------------------------------------------------
// Legacy exports (preserved for backward compatibility with existing consumers)
// ---------------------------------------------------------------------------

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

/** @deprecated Use parseHex instead. Returns null instead of throwing. */
export function hexToRgb(hex: string): RGBColor | null {
  try {
    return parseHex(hex);
  } catch {
    return null;
  }
}

/** @deprecated Use toHex instead. */
export function rgbToHex(r: number, g: number, b: number): string {
  return toHex({ r, g, b });
}

/** @deprecated Use rgbToHsl({ r, g, b }) instead. */
export function rgbToHslLegacy(r: number, g: number, b: number): HSLColor {
  return rgbToHsl({ r, g, b });
}

/** @deprecated Use hslToRgb({ h, s, l }) instead. */
export function hslToRgbLegacy(h: number, s: number, l: number): RGBColor {
  return hslToRgb({ h, s, l });
}

/** @deprecated Use parseHex + rgbToHsl instead. */
export function hexToHsl(hex: string): HSLColor | null {
  try {
    return rgbToHsl(parseHex(hex));
  } catch {
    return null;
  }
}

/** @deprecated Use hslToRgb + toHex instead. */
export function hslToHex(h: number, s: number, l: number): string {
  return toHex(hslToRgb({ h, s, l }));
}

/** @deprecated Use relativeLuminance({ r, g, b }) instead. */
export function relativeLuminanceLegacy(r: number, g: number, b: number): number {
  return relativeLuminance({ r, g, b });
}

/** @deprecated Use contrastRatio(fg, bg) with Rgb objects. */
export function contrastRatioHex(hex1: string, hex2: string): number | null {
  try {
    return contrastRatio(parseHex(hex1), parseHex(hex2));
  } catch {
    return null;
  }
}

/** @deprecated Use wcagLevel instead. */
export function wcagGrade(ratio: number): "AAA" | "AA" | "AA-Large" | "Fail" {
  if (ratio >= 7.0) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3.0) return "AA-Large";
  return "Fail";
}

/** @deprecated Use isAccessible instead. */
export function meetsWcagAa(
  hex1: string,
  hex2: string,
  isLargeText = false
): boolean {
  try {
    const fg = parseHex(hex1);
    const bg = parseHex(hex2);
    return isAccessible(fg, bg, "AA", isLargeText);
  } catch {
    return false;
  }
}

/** @deprecated Use lighten(rgb, amount) with Rgb objects. */
export function lightenHex(hex: string, amount: number): string {
  try {
    return toHex(lighten(parseHex(hex), amount));
  } catch {
    return hex;
  }
}

/** @deprecated Use darken(rgb, amount) with Rgb objects. */
export function darkenHex(hex: string, amount: number): string {
  try {
    return toHex(darken(parseHex(hex), amount));
  } catch {
    return hex;
  }
}

/** @deprecated Use saturate(rgb, amount) with Rgb objects. */
export function saturateHex(hex: string, amount: number): string {
  try {
    return toHex(saturate(parseHex(hex), amount));
  } catch {
    return hex;
  }
}

/** @deprecated Use desaturate(rgb, amount) with Rgb objects. */
export function desaturateHex(hex: string, amount: number): string {
  try {
    return toHex(desaturate(parseHex(hex), amount));
  } catch {
    return hex;
  }
}

/** @deprecated Use mix({ r, g, b }, { r, g, b }, ratio) + toHex. */
export function mixColors(
  hex1: string,
  hex2: string,
  ratio = 0.5
): string | null {
  try {
    return toHex(mix(parseHex(hex1), parseHex(hex2), ratio));
  } catch {
    return null;
  }
}

/** @deprecated Use alphaBlend(foregroundRgba, backgroundRgb) with typed objects. */
export function alphaBlendHex(
  hex: string,
  alpha: number,
  backgroundHex = "#FFFFFF"
): string {
  try {
    const fg = parseHex(hex);
    const bg = parseHex(backgroundHex);
    return toHex(alphaBlend({ ...fg, a: clamp(alpha, 0, 1) }, bg));
  } catch {
    return hex;
  }
}

/** @deprecated Use bestTextColor instead. */
export function getTextColor(backgroundHex: string): "#000000" | "#FFFFFF" {
  try {
    const bg = parseHex(backgroundHex);
    const best = bestTextColor(bg);
    return best.r === 0 ? "#000000" : "#FFFFFF";
  } catch {
    return "#000000";
  }
}

/** @deprecated Use generatePalette(rgb, steps) and map to array. */
export function generatePaletteArray(baseHex: string, steps = 9): string[] {
  try {
    const rgb = parseHex(baseHex);
    const hsl = rgbToHsl(rgb);
    const palette: string[] = [];
    const lightStart = 95;
    const lightEnd = 10;
    const range = lightStart - lightEnd;
    for (let i = 0; i < steps; i++) {
      const l = lightStart - (range * i) / (steps - 1);
      palette.push(toHex(hslToRgb({ ...hsl, l })));
    }
    return palette;
  } catch {
    return [];
  }
}

/** @deprecated Kept for backward compat. */
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

  while (result.length < count) {
    const idx = result.length - half;
    const h = ((hsl.h + idx * spread) % 360 + 360) % 360;
    result.push({ h, s: hsl.s, l: hsl.l });
  }

  return result;
}

/** @deprecated Use cssVarColor instead. */
export function cssVarValue(varName: string, fallback?: string): string {
  if (fallback !== undefined) {
    return `var(--${varName}, ${fallback})`;
  }
  return `var(--${varName})`;
}

/** @deprecated CSS4 HSL syntax helper. */
export function hslCss(h: number, s: number, l: number, alpha?: number): string {
  const base = `hsl(${h} ${s}% ${l}%`;
  if (alpha !== undefined) {
    return `${base} / ${alpha})`;
  }
  return `${base})`;
}

/** @deprecated Use parseColor instead. Returns null instead of throwing. */
export function parseColorToRgb(color: string): RGBColor | null {
  try {
    return parseHex(color);
  } catch {
    return null;
  }
}
