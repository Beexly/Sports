/**
 * color-utils.ts — Pure TypeScript color manipulation utilities.
 * No npm dependencies. No DOM access.
 *
 * Exports: types, parsing, serialization, conversion, WCAG contrast,
 * color manipulation, mixing, palette generation, distance, sports palette.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RGB = { r: number; g: number; b: number };
export type HSL = { h: number; s: number; l: number };
export type HSV = { h: number; s: number; v: number };
export type RGBA = { r: number; g: number; b: number; a: number };
export type Lab = { l: number; a: number; b: number };
export type XYZ = { x: number; y: number; z: number };

// Legacy interface aliases (backward compat)
export interface Rgb extends RGB {}
export interface Rgba extends RGBA {}
export interface Hsl extends HSL {}
export interface Hsv extends HSV {}

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

function hueToRgbChannel(p: number, q: number, t: number): number {
  let tVal = t;
  if (tVal < 0) tVal += 1;
  if (tVal > 1) tVal -= 1;
  if (tVal < 1 / 6) return p + (q - p) * 6 * tVal;
  if (tVal < 1 / 2) return q;
  if (tVal < 2 / 3) return p + (q - p) * (2 / 3 - tVal) * 6;
  return p;
}

// ---------------------------------------------------------------------------
// sRGB gamma encoding/decoding
// ---------------------------------------------------------------------------

/** sRGB to linear (inverse gamma). */
export function rgbToLinear(value: number): number {
  const srgb = clamp(value, 0, 255) / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
}

/** Linear to sRGB (gamma). */
export function linearToRgb(value: number): number {
  const linear = clamp(value, 0, 1);
  const srgb = linear <= 0.0031308
    ? 12.92 * linear
    : 1.055 * Math.pow(linear, 1 / 2.4) - 0.055;
  return Math.round(clamp(srgb, 0, 1) * 255);
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/**
 * Accepts #RGB, #RRGGBB, #RGBA, #RRGGBBAA.
 * Throws on invalid hex string.
 * Returns RGB (alpha ignored).
 */
export function parseHex(hex: string): RGB {
  if (typeof hex !== "string" || !hex.startsWith("#")) {
    throw new Error(`Invalid hex color: ${String(hex)}`);
  }
  const cleaned = hex.slice(1);
  if (!/^[0-9a-fA-F]+$/.test(cleaned) || ![3, 4, 6, 8].includes(cleaned.length)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  if (cleaned.length === 3 || cleaned.length === 4) {
    const r = parseInt((cleaned[0] ?? "0") + (cleaned[0] ?? "0"), 16);
    const g = parseInt((cleaned[1] ?? "0") + (cleaned[1] ?? "0"), 16);
    const b = parseInt((cleaned[2] ?? "0") + (cleaned[2] ?? "0"), 16);
    return { r, g, b };
  }

  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  return { r, g, b };
}

/** Returns "#rrggbb" lowercase hex. */
export function toHex(rgb: RGB): string {
  return `#${toHexByte(rgb.r)}${toHexByte(rgb.g)}${toHexByte(rgb.b)}`;
}

/**
 * Parses "rgb(255, 0, 0)" or "rgba(255, 0, 0, 1)". Returns RGB (alpha ignored).
 * Throws on invalid string.
 */
export function parseRgbString(s: string): RGB {
  const match = s
    .trim()
    .match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d.]+)?\s*\)$/);
  if (!match) {
    throw new Error(`Invalid rgb/rgba string: ${s}`);
  }
  return {
    r: parseInt(match[1] ?? "0", 10),
    g: parseInt(match[2] ?? "0", 10),
    b: parseInt(match[3] ?? "0", 10),
  };
}

/** Returns "rgb(r, g, b)" or "rgba(r, g, b, a)" if alpha provided. */
export function toRgbString(rgb: RGB, alpha?: number): string {
  if (alpha !== undefined) {
    return `rgba(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)}, ${alpha})`;
  }
  return `rgb(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)})`;
}

// ---------------------------------------------------------------------------
// Color space conversions
// ---------------------------------------------------------------------------

/** Converts RGB (0-255 each) to HSL (h: 0-360, s: 0-100, l: 0-100). */
export function rgbToHsl(rgb: RGB): HSL {
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

/** Converts HSL (h: 0-360, s: 0-100, l: 0-100) to RGB. */
export function hslToRgb(hsl: HSL): RGB {
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
    r: Math.round(hueToRgbChannel(p, q, h + 1 / 3) * 255),
    g: Math.round(hueToRgbChannel(p, q, h) * 255),
    b: Math.round(hueToRgbChannel(p, q, h - 1 / 3) * 255),
  };
}

/** Converts RGB to HSV (h: 0-360, s/v: 0-100). */
export function rgbToHsv(rgb: RGB): HSV {
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
export function hsvToRgb(hsv: HSV): RGB {
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

/** sRGB to CIE XYZ (D65 illuminant). */
export function rgbToXyz(rgb: RGB): XYZ {
  const r = rgbToLinear(rgb.r);
  const g = rgbToLinear(rgb.g);
  const b = rgbToLinear(rgb.b);

  // sRGB to XYZ (D65) matrix
  return {
    x: r * 0.4124564 + g * 0.3575761 + b * 0.1804375,
    y: r * 0.2126729 + g * 0.7151522 + b * 0.0721750,
    z: r * 0.0193339 + g * 0.1191920 + b * 0.9503041,
  };
}

/** CIE XYZ to sRGB. */
export function xyzToRgb(xyz: XYZ): RGB {
  // XYZ to sRGB (D65) matrix
  const rLin = xyz.x *  3.2404542 + xyz.y * -1.5371385 + xyz.z * -0.4985314;
  const gLin = xyz.x * -0.9692660 + xyz.y *  1.8760108 + xyz.z *  0.0415560;
  const bLin = xyz.x *  0.0556434 + xyz.y * -0.2040259 + xyz.z *  1.0572252;

  return {
    r: linearToRgb(rLin),
    g: linearToRgb(gLin),
    b: linearToRgb(bLin),
  };
}

// D65 reference white
const D65 = { x: 0.95047, y: 1.0, z: 1.08883 };

function xyzToLabF(t: number): number {
  const delta = 6 / 29;
  if (t > delta * delta * delta) {
    return Math.cbrt(t);
  }
  return t / (3 * delta * delta) + 4 / 29;
}

function labToXyzF(t: number): number {
  const delta = 6 / 29;
  if (t > delta) {
    return t * t * t;
  }
  return 3 * delta * delta * (t - 4 / 29);
}

/** sRGB to CIE Lab (D65 illuminant). */
export function rgbToLab(rgb: RGB): Lab {
  const xyz = rgbToXyz(rgb);
  const fx = xyzToLabF(xyz.x / D65.x);
  const fy = xyzToLabF(xyz.y / D65.y);
  const fz = xyzToLabF(xyz.z / D65.z);

  return {
    l: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

/** CIE Lab to sRGB. */
export function labToRgb(lab: Lab): RGB {
  const fy = (lab.l + 16) / 116;
  const fx = lab.a / 500 + fy;
  const fz = fy - lab.b / 200;

  const xyz: XYZ = {
    x: D65.x * labToXyzF(fx),
    y: D65.y * labToXyzF(fy),
    z: D65.z * labToXyzF(fz),
  };

  return xyzToRgb(xyz);
}

// ---------------------------------------------------------------------------
// Contrast and accessibility (WCAG)
// ---------------------------------------------------------------------------

/**
 * WCAG 2.1 relative luminance in [0, 1].
 */
export function relativeLuminance(rgb: RGB): number {
  return (
    0.2126 * rgbToLinear(rgb.r) +
    0.7152 * rgbToLinear(rgb.g) +
    0.0722 * rgbToLinear(rgb.b)
  );
}

/**
 * WCAG 2.1 contrast ratio: (L1 + 0.05) / (L2 + 0.05)
 * where L1 is the lighter of the two luminances.
 */
export function contrastRatio(rgb1: RGB, rgb2: RGB): number {
  const l1 = relativeLuminance(rgb1);
  const l2 = relativeLuminance(rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * WCAG AA: 4.5:1 for normal text, 3:1 for large text.
 */
export function wcagAA(rgb1: RGB, rgb2: RGB, isLargeText = false): boolean {
  return contrastRatio(rgb1, rgb2) >= (isLargeText ? 3 : 4.5);
}

/**
 * WCAG AAA: 7:1 for normal text, 4.5:1 for large text.
 */
export function wcagAAA(rgb1: RGB, rgb2: RGB, isLargeText = false): boolean {
  return contrastRatio(rgb1, rgb2) >= (isLargeText ? 4.5 : 7);
}

/**
 * Returns black or white, whichever has higher contrast ratio with background.
 */
export function bestTextColor(background: RGB): RGB {
  const white: RGB = { r: 255, g: 255, b: 255 };
  const black: RGB = { r: 0, g: 0, b: 0 };
  return contrastRatio(white, background) >= contrastRatio(black, background) ? white : black;
}

/**
 * Lighten or darken foreground until it meets targetRatio against background.
 * Max 20 iterations; returns best found.
 */
export function suggestAccessibleColor(
  foreground: RGB,
  background: RGB,
  targetRatio = 4.5
): RGB {
  if (contrastRatio(foreground, background) >= targetRatio) return foreground;

  const hsl = rgbToHsl(foreground);
  let best = foreground;
  let bestRatio = contrastRatio(foreground, background);

  // Try lightening
  for (let i = 1; i <= 20; i++) {
    const candidate = hslToRgb({ ...hsl, l: clamp(hsl.l + i * 5, 0, 100) });
    const ratio = contrastRatio(candidate, background);
    if (ratio >= targetRatio) return candidate;
    if (ratio > bestRatio) {
      bestRatio = ratio;
      best = candidate;
    }
  }

  // Try darkening
  for (let i = 1; i <= 20; i++) {
    const candidate = hslToRgb({ ...hsl, l: clamp(hsl.l - i * 5, 0, 100) });
    const ratio = contrastRatio(candidate, background);
    if (ratio >= targetRatio) return candidate;
    if (ratio > bestRatio) {
      bestRatio = ratio;
      best = candidate;
    }
  }

  return best;
}

// ---------------------------------------------------------------------------
// Color manipulation
// ---------------------------------------------------------------------------

function withHsl(rgb: RGB, mutate: (hsl: HSL) => HSL): RGB {
  return hslToRgb(mutate(rgbToHsl(rgb)));
}

/** Increase L in HSL by amount, clamp to 100. */
export function lighten(rgb: RGB, amount: number): RGB {
  return withHsl(rgb, (hsl) => ({ ...hsl, l: clamp(hsl.l + amount, 0, 100) }));
}

/** Decrease L in HSL by amount, clamp to 0. */
export function darken(rgb: RGB, amount: number): RGB {
  return withHsl(rgb, (hsl) => ({ ...hsl, l: clamp(hsl.l - amount, 0, 100) }));
}

/** Increase S in HSL by amount. */
export function saturate(rgb: RGB, amount: number): RGB {
  return withHsl(rgb, (hsl) => ({ ...hsl, s: clamp(hsl.s + amount, 0, 100) }));
}

/** Decrease S in HSL by amount. */
export function desaturate(rgb: RGB, amount: number): RGB {
  return withHsl(rgb, (hsl) => ({ ...hsl, s: clamp(hsl.s - amount, 0, 100) }));
}

/** Rotate hue by degrees (mod 360). */
export function rotate(rgb: RGB, degrees: number): RGB {
  return withHsl(rgb, (hsl) => ({
    ...hsl,
    h: ((hsl.h + degrees) % 360 + 360) % 360,
  }));
}

/** 255 - each channel. */
export function invert(rgb: RGB): RGB {
  return { r: 255 - rgb.r, g: 255 - rgb.g, b: 255 - rgb.b };
}

/** Grayscale via luminance formula: 0.299*R + 0.587*G + 0.114*B. */
export function grayscale(rgb: RGB): RGB {
  const g = Math.round(0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b);
  return { r: g, g, b: g };
}

/**
 * Linear mix in RGB; weight toward rgb1.
 * weight=0.5 is 50/50; weight=0 is all rgb2, weight=1 is all rgb1.
 */
export function mix(rgb1: RGB, rgb2: RGB, weight = 0.5): RGB {
  const w = clamp(weight, 0, 1);
  return {
    r: Math.round(rgb1.r * w + rgb2.r * (1 - w)),
    g: Math.round(rgb1.g * w + rgb2.g * (1 - w)),
    b: Math.round(rgb1.b * w + rgb2.b * (1 - w)),
  };
}

/**
 * Alpha composite (Porter-Duff over):
 * result = foreground.rgb * foreground.a + background * (1 - foreground.a).
 */
export function alphaBlend(foreground: RGBA, background: RGB): RGB {
  const a = clamp(foreground.a, 0, 1);
  return {
    r: Math.round(foreground.r * a + background.r * (1 - a)),
    g: Math.round(foreground.g * a + background.g * (1 - a)),
    b: Math.round(foreground.b * a + background.b * (1 - a)),
  };
}

/**
 * Color temperature 1000K–40000K to approximate RGB.
 * Uses Tanner Helland's algorithm.
 */
export function temperature(kelvin: number): RGB {
  const temp = clamp(kelvin, 1000, 40000) / 100;
  let r: number;
  let g: number;
  let b: number;

  // Red
  if (temp <= 66) {
    r = 255;
  } else {
    r = 329.698727446 * Math.pow(temp - 60, -0.1332047592);
    r = clamp(r, 0, 255);
  }

  // Green
  if (temp <= 66) {
    g = 99.4708025861 * Math.log(temp) - 161.1195681661;
    g = clamp(g, 0, 255);
  } else {
    g = 288.1221695283 * Math.pow(temp - 60, -0.0755148492);
    g = clamp(g, 0, 255);
  }

  // Blue
  if (temp >= 66) {
    b = 255;
  } else if (temp <= 19) {
    b = 0;
  } else {
    b = 138.5177312231 * Math.log(temp - 10) - 305.0447927307;
    b = clamp(b, 0, 255);
  }

  return { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
}

// ---------------------------------------------------------------------------
// Palette generation
// ---------------------------------------------------------------------------

/** Rotate hue 180°. */
export function complementary(rgb: RGB): RGB {
  return rotate(rgb, 180);
}

/** hue ±150°. Returns [rgb-150, rgb+150]. */
export function splitComplementary(rgb: RGB): [RGB, RGB] {
  return [rotate(rgb, -150), rotate(rgb, 150)];
}

/** hue ±120°. Returns [rgb+120, rgb+240]. */
export function triadic(rgb: RGB): [RGB, RGB] {
  return [rotate(rgb, 120), rotate(rgb, 240)];
}

/** hue ±angle (default 30°). Returns [rgb-angle, rgb+angle]. */
export function analogous(rgb: RGB, angle = 30): [RGB, RGB] {
  return [rotate(rgb, -angle), rotate(rgb, angle)];
}

/** hue +90, +180, +270. Returns 3 colors. */
export function tetradic(rgb: RGB): [RGB, RGB, RGB] {
  return [rotate(rgb, 90), rotate(rgb, 180), rotate(rgb, 270)];
}

/** Shades varying lightness by steps (default 5), evenly spaced. */
export function monochromatic(rgb: RGB, steps = 5): RGB[] {
  const hsl = rgbToHsl(rgb);
  const result: RGB[] = [];
  for (let i = 0; i < steps; i++) {
    const l = (i / (steps - 1)) * 100;
    result.push(hslToRgb({ ...hsl, l }));
  }
  return result;
}

/**
 * Linear gradient from start to end; includes endpoints.
 * Min 2 steps.
 */
export function gradient(start: RGB, end: RGB, steps: number): RGB[] {
  const n = Math.max(2, steps);
  const result: RGB[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    result.push({
      r: Math.round(start.r + (end.r - start.r) * t),
      g: Math.round(start.g + (end.g - start.g) * t),
      b: Math.round(start.b + (end.b - start.b) * t),
    });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Color distance and perception
// ---------------------------------------------------------------------------

/** CIE76 distance. */
export function deltaE76(lab1: Lab, lab2: Lab): number {
  const dl = lab1.l - lab2.l;
  const da = lab1.a - lab2.a;
  const db = lab1.b - lab2.b;
  return Math.sqrt(dl * dl + da * da + db * db);
}

/** CIEDE2000 (with kL=kC=kH=1). */
export function deltaE2000(lab1: Lab, lab2: Lab): number {
  const kL = 1;
  const kC = 1;
  const kH = 1;

  const L1 = lab1.l;
  const a1 = lab1.a;
  const b1 = lab1.b;
  const L2 = lab2.l;
  const a2 = lab2.a;
  const b2 = lab2.b;

  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const CAvg = (C1 + C2) / 2;

  const CAvg7 = Math.pow(CAvg, 7);
  const term25_7 = Math.pow(25, 7);
  const g = 0.5 * (1 - Math.sqrt(CAvg7 / (CAvg7 + term25_7)));

  const a1p = a1 * (1 + g);
  const a2p = a2 * (1 + g);

  const C1p = Math.sqrt(a1p * a1p + b1 * b1);
  const C2p = Math.sqrt(a2p * a2p + b2 * b2);

  const h1p = a1p === 0 && b1 === 0 ? 0 : ((Math.atan2(b1, a1p) * 180) / Math.PI + 360) % 360;
  const h2p = a2p === 0 && b2 === 0 ? 0 : ((Math.atan2(b2, a2p) * 180) / Math.PI + 360) % 360;

  const dLp = L2 - L1;
  const dCp = C2p - C1p;

  let dhp: number;
  if (C1p * C2p === 0) {
    dhp = 0;
  } else if (Math.abs(h2p - h1p) <= 180) {
    dhp = h2p - h1p;
  } else if (h2p - h1p > 180) {
    dhp = h2p - h1p - 360;
  } else {
    dhp = h2p - h1p + 360;
  }

  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp * Math.PI) / 360);

  const LpAvg = (L1 + L2) / 2;
  const CpAvg = (C1p + C2p) / 2;

  let hpAvg: number;
  if (C1p * C2p === 0) {
    hpAvg = h1p + h2p;
  } else if (Math.abs(h1p - h2p) <= 180) {
    hpAvg = (h1p + h2p) / 2;
  } else if (h1p + h2p < 360) {
    hpAvg = (h1p + h2p + 360) / 2;
  } else {
    hpAvg = (h1p + h2p - 360) / 2;
  }

  const T =
    1 -
    0.17 * Math.cos(((hpAvg - 30) * Math.PI) / 180) +
    0.24 * Math.cos((2 * hpAvg * Math.PI) / 180) +
    0.32 * Math.cos(((3 * hpAvg + 6) * Math.PI) / 180) -
    0.20 * Math.cos(((4 * hpAvg - 63) * Math.PI) / 180);

  const SL = 1 + 0.015 * Math.pow(LpAvg - 50, 2) / Math.sqrt(20 + Math.pow(LpAvg - 50, 2));
  const SC = 1 + 0.045 * CpAvg;
  const SH = 1 + 0.015 * CpAvg * T;

  const CpAvg7 = Math.pow(CpAvg, 7);
  const RC = 2 * Math.sqrt(CpAvg7 / (CpAvg7 + term25_7));
  const dTheta = 30 * Math.exp(-Math.pow((hpAvg - 275) / 25, 2));
  const RT = -Math.sin((2 * dTheta * Math.PI) / 180) * RC;

  return Math.sqrt(
    Math.pow(dLp / (kL * SL), 2) +
      Math.pow(dCp / (kC * SC), 2) +
      Math.pow(dHp / (kH * SH), 2) +
      RT * (dCp / (kC * SC)) * (dHp / (kH * SH))
  );
}

/** Euclidean distance in RGB space. */
export function colorDistance(rgb1: RGB, rgb2: RGB): number {
  const dr = rgb1.r - rgb2.r;
  const dg = rgb1.g - rgb2.g;
  const db = rgb1.b - rgb2.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/** Closest color in palette by colorDistance; throws if palette is empty. */
export function closestColor(target: RGB, palette: RGB[]): RGB {
  if (palette.length === 0) throw new Error("Palette must not be empty");
  const first = palette[0];
  if (!first) throw new Error("Palette must not be empty");
  let best: RGB = first;
  let bestDist = colorDistance(target, first);
  for (let i = 1; i < palette.length; i++) {
    const candidate = palette[i];
    if (!candidate) continue;
    const dist = colorDistance(target, candidate);
    if (dist < bestDist) {
      bestDist = dist;
      best = candidate;
    }
  }
  return best;
}

/** Sort colors by HSL hue (ascending). */
export function sortByHue(colors: RGB[]): RGB[] {
  return [...colors].sort((a, b) => rgbToHsl(a).h - rgbToHsl(b).h);
}

/** Sort colors by relative luminance (darkest to lightest). */
export function sortByLuminance(colors: RGB[]): RGB[] {
  return [...colors].sort((a, b) => relativeLuminance(a) - relativeLuminance(b));
}

// ---------------------------------------------------------------------------
// Sports team color utilities
// ---------------------------------------------------------------------------

/** True if relative luminance < 0.179. */
export function isColorDark(rgb: RGB): boolean {
  return relativeLuminance(rgb) < 0.179;
}

/**
 * True if rgb is closer to itself than threshold avg distance from palette.
 * threshold default 30.
 */
export function isDominantColor(rgb: RGB, palette: RGB[], threshold = 30): boolean {
  if (palette.length === 0) return false;
  const avgDist =
    palette.reduce((sum, c) => sum + colorDistance(rgb, c), 0) / palette.length;
  return avgDist < threshold;
}

/**
 * Generate a sports team palette from primary and secondary colors.
 */
export function generateTeamPalette(
  primary: RGB,
  secondary: RGB
): { primary: RGB; secondary: RGB; accent: RGB; background: RGB; text: RGB } {
  const accent = complementary(primary);
  const background = darken(primary, 40);
  const text = bestTextColor(background);
  return { primary, secondary, accent, background, text };
}

/**
 * home uses team color; away uses a contrasting variant.
 * If bestTextColor(teamColor) is white, away = lighten(team, 40); else darken(team, 40).
 */
export function uniformContrast(teamColor: RGB): { home: RGB; away: RGB } {
  const best = bestTextColor(teamColor);
  const isWhite = best.r === 255 && best.g === 255 && best.b === 255;
  const away = isWhite ? lighten(teamColor, 40) : darken(teamColor, 40);
  return { home: teamColor, away };
}

/**
 * Find closest team by hex color; return team name or null if all distances > 50.
 */
export function hexToTeamName(
  hex: string,
  teamColors: Record<string, string>
): string | null {
  let target: RGB;
  try {
    target = parseHex(hex);
  } catch {
    return null;
  }

  let bestName: string | null = null;
  let bestDist = Infinity;

  for (const [name, teamHex] of Object.entries(teamColors)) {
    try {
      const teamRgb = parseHex(teamHex);
      const dist = colorDistance(target, teamRgb);
      if (dist < bestDist) {
        bestDist = dist;
        bestName = name;
      }
    } catch {
      // skip invalid colors
    }
  }

  return bestDist <= 50 ? bestName : null;
}

/** True if contrast ratio > 3:1 (minimum for most colorblind users). */
export function colorblindSafe(rgb1: RGB, rgb2: RGB): boolean {
  return contrastRatio(rgb1, rgb2) > 3;
}

// ---------------------------------------------------------------------------
// Legacy types and exports (backward compat)
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

export interface Hsla {
  h: number;
  s: number;
  l: number;
  a: number;
}

// Hue rotate helper exposed as 'complement' for legacy tests
export function complement(rgb: RGB): RGB {
  return complementary(rgb);
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

/** AAA: >= 7:1; AA: >= 4.5:1; AA Large: >= 3:1; Fail: < 3:1. */
export function wcagLevel(ratio: number): "AAA" | "AA" | "AA Large" | "Fail" {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA Large";
  return "Fail";
}

/** @deprecated Use wcagLevel instead. */
export function wcagGrade(ratio: number): "AAA" | "AA" | "AA-Large" | "Fail" {
  if (ratio >= 7.0) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3.0) return "AA-Large";
  return "Fail";
}

/** @deprecated Use wcagAA instead. */
export function meetsWcagAa(
  hex1: string,
  hex2: string,
  isLargeText = false
): boolean {
  try {
    return wcagAA(parseHex(hex1), parseHex(hex2), isLargeText);
  } catch {
    return false;
  }
}

/** @deprecated Use isAccessible / wcagAA. */
export function isAccessible(
  foreground: RGB,
  background: RGB,
  level: "AA" | "AAA" = "AA",
  largeText = false
): boolean {
  const ratio = contrastRatio(foreground, background);
  if (level === "AAA") return ratio >= (largeText ? 4.5 : 7);
  return ratio >= (largeText ? 3 : 4.5);
}

/** @deprecated Use mix instead. */
export function mixColors(
  hex1: string,
  hex2: string,
  ratio = 0.5
): string | null {
  try {
    // weight toward hex1 at ratio=0, hex2 at ratio=1
    return toHex(mix(parseHex(hex1), parseHex(hex2), 1 - ratio));
  } catch {
    return null;
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

/** @deprecated Kept for backward compat. */
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

/** @deprecated Use parseHex + rgbToHsl instead. Returns null instead of throwing. */
export function parseColorToRgb(color: string): RGBColor | null {
  try {
    return parseHex(color);
  } catch {
    return null;
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

/** Accepts #RRGGBB and returns "R G B" space-separated (for Tailwind CSS). */
export function hexToTailwindRgb(hex: string): string {
  const { r, g, b } = parseHex(hex);
  return `${r} ${g} ${b}`;
}

/** Returns CSS custom property declaration: "--{varName}: R G B;" */
export function cssVarColor(hex: string, varName: string): string {
  return `--${varName}: ${hexToTailwindRgb(hex)};`;
}

/** Parses hex or rgb/rgba strings. */
export function parseColor(input: string): RGB {
  const trimmed = input.trim();
  if (trimmed.startsWith("#")) return parseHex(trimmed);
  if (trimmed.startsWith("rgb")) return parseRgbString(trimmed);
  throw new Error(`Unrecognized color format: ${input}`);
}

/** Same as parseHex but returns alpha channel (defaults to 1.0 if not present). */
export function parseHexRgba(hex: string): RGBA {
  if (typeof hex !== "string" || !hex.startsWith("#")) {
    throw new Error(`Invalid hex color: ${String(hex)}`);
  }
  const cleaned = hex.slice(1);
  if (!/^[0-9a-fA-F]+$/.test(cleaned) || ![3, 4, 6, 8].includes(cleaned.length)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  if (cleaned.length === 3) {
    return {
      r: parseInt((cleaned[0] ?? "0") + (cleaned[0] ?? "0"), 16),
      g: parseInt((cleaned[1] ?? "0") + (cleaned[1] ?? "0"), 16),
      b: parseInt((cleaned[2] ?? "0") + (cleaned[2] ?? "0"), 16),
      a: 1,
    };
  }
  if (cleaned.length === 4) {
    return {
      r: parseInt((cleaned[0] ?? "0") + (cleaned[0] ?? "0"), 16),
      g: parseInt((cleaned[1] ?? "0") + (cleaned[1] ?? "0"), 16),
      b: parseInt((cleaned[2] ?? "0") + (cleaned[2] ?? "0"), 16),
      a: parseInt((cleaned[3] ?? "0") + (cleaned[3] ?? "0"), 16) / 255,
    };
  }
  if (cleaned.length === 6) {
    return { r: parseInt(cleaned.slice(0, 2), 16), g: parseInt(cleaned.slice(2, 4), 16), b: parseInt(cleaned.slice(4, 6), 16), a: 1 };
  }
  return {
    r: parseInt(cleaned.slice(0, 2), 16),
    g: parseInt(cleaned.slice(2, 4), 16),
    b: parseInt(cleaned.slice(4, 6), 16),
    a: parseInt(cleaned.slice(6, 8), 16) / 255,
  };
}

/** Returns "#RRGGBBAA" lowercase hex. */
export function toHexFull(rgba: RGBA): string {
  return `${toHex({ r: rgba.r, g: rgba.g, b: rgba.b })}${toHexByte(rgba.a * 255)}`;
}

/** Returns "rgba(r, g, b, a)". */
export function toRgbaString(rgba: RGBA): string {
  return `rgba(${Math.round(rgba.r)}, ${Math.round(rgba.g)}, ${Math.round(rgba.b)}, ${rgba.a})`;
}

/** Returns "hsl(h, s%, l%)". */
export function toHslString(hsl: HSL): string {
  return `hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%)`;
}

/** Named colors (subset of CSS named colors). */
export const namedColors: Record<string, RGB> = {
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

/** Find closest named color by euclidean distance. Returns name if within 20, else null. */
export function colorName(rgb: RGB): string | null {
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

/**
 * Weighted Euclidean (perceptual) distance.
 * sqrt(2*dR^2 + 4*dG^2 + 3*dB^2)
 */
export function perceptualDistance(a: RGB, b: RGB): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db);
}

/**
 * warm: hue 0-60 or 300-360; cool: hue 150-270; neutral: else or S<15.
 */
export function colorTemperature(rgb: RGB): "warm" | "cool" | "neutral" {
  const { h, s } = rgbToHsl(rgb);
  if (s < 15) return "neutral";
  if (h <= 60 || h >= 300) return "warm";
  if (h >= 150 && h <= 270) return "cool";
  return "neutral";
}

/** @deprecated Use findAccessibleColor / suggestAccessibleColor. */
export function findAccessibleColor(
  baseColor: RGB,
  background: RGB,
  level: "AA" | "AAA" = "AA"
): RGB {
  const targetRatio = level === "AAA" ? 7 : 4.5;
  const hsl = rgbToHsl(baseColor);

  for (let l = hsl.l; l <= 100; l += 1) {
    const candidate = hslToRgb({ ...hsl, l });
    if (contrastRatio(candidate, background) >= targetRatio) return candidate;
  }

  for (let l = hsl.l; l >= 0; l -= 1) {
    const candidate = hslToRgb({ ...hsl, l });
    if (contrastRatio(candidate, background) >= targetRatio) return candidate;
  }

  const white: RGB = { r: 255, g: 255, b: 255 };
  const black: RGB = { r: 0, g: 0, b: 0 };
  return contrastRatio(white, background) >= contrastRatio(black, background) ? white : black;
}

/** @deprecated Use generateTints. */
export function generateTints(rgb: RGB, count: number): RGB[] {
  const hsl = rgbToHsl(rgb);
  const result: RGB[] = [];
  const step = (95 - hsl.l) / Math.max(count - 1, 1);
  for (let i = 0; i < count; i++) {
    result.push(hslToRgb({ ...hsl, l: clamp(hsl.l + step * i, 0, 100) }));
  }
  return result;
}

/** @deprecated Use generateShades. */
export function generateShades(rgb: RGB, count: number): RGB[] {
  const hsl = rgbToHsl(rgb);
  const result: RGB[] = [];
  const step = (hsl.l - 5) / Math.max(count - 1, 1);
  for (let i = 0; i < count; i++) {
    result.push(hslToRgb({ ...hsl, l: clamp(hsl.l - step * i, 0, 100) }));
  }
  return result;
}

/**
 * Tailwind-style scale: 100=lightest, 900=darkest.
 * steps default 9; returns { 100: '#hex', 200: '#hex', ..., steps*100: '#hex' }.
 */
export function generatePalette(rgb: RGB, steps = 9): Record<number, string> {
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

/** splitComplementary for legacy: [original, hue+150, hue+210] */
export function splitComplementaryLegacy(rgb: RGB): [RGB, RGB, RGB] {
  return [rgb, rotate(rgb, 150), rotate(rgb, 210)];
}

/** triadic for legacy: [original, hue+120, hue+240] */
export function triadicLegacy(rgb: RGB): [RGB, RGB, RGB] {
  return [rgb, rotate(rgb, 120), rotate(rgb, 240)];
}

/** analogous for legacy: [original, hue-spread, hue+spread] */
export function analogousLegacy(rgb: RGB, spread = 30): [RGB, RGB, RGB] {
  return [rgb, rotate(rgb, -spread), rotate(rgb, spread)];
}

/** tetradic for legacy: [original, hue+90, hue+180, hue+270] */
export function tetradicLegacy(rgb: RGB): [RGB, RGB, RGB, RGB] {
  return [rgb, rotate(rgb, 90), rotate(rgb, 180), rotate(rgb, 270)];
}
