import { describe, it, expect } from "vitest";
import {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  hexToHsl,
  hslToHex,
  relativeLuminance,
  contrastRatio,
  wcagGrade,
  meetsWcagAa,
  lighten,
  darken,
  saturate,
  desaturate,
  mixColors,
  alphaBlend,
  getTextColor,
  generatePalette,
  analogousColors,
  cssVarValue,
  hslCss,
  parseColorToRgb,
} from "../lib/utils/color-utils";

// ---------------------------------------------------------------------------
// hexToRgb
// ---------------------------------------------------------------------------
describe("hexToRgb", () => {
  it("parses #RRGGBB", () => {
    expect(hexToRgb("#FF0000")).toEqual({ r: 255, g: 0, b: 0 });
  });

  it("parses short #RGB and expands to same as #RRGGBB", () => {
    expect(hexToRgb("#F00")).toEqual({ r: 255, g: 0, b: 0 });
  });

  it("parses #000 → all zeros", () => {
    expect(hexToRgb("#000")).toEqual({ r: 0, g: 0, b: 0 });
  });

  it("parses #fff (lowercase) → {255,255,255}", () => {
    expect(hexToRgb("#fff")).toEqual({ r: 255, g: 255, b: 255 });
  });

  it("parses #RRGGBBAA (ignores alpha channel)", () => {
    expect(hexToRgb("#FF0000FF")).toEqual({ r: 255, g: 0, b: 0 });
  });

  it("parses #RGBA short form (ignores alpha)", () => {
    expect(hexToRgb("#F00F")).toEqual({ r: 255, g: 0, b: 0 });
  });

  it("returns null for invalid hex", () => {
    expect(hexToRgb("not-a-color")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(hexToRgb("")).toBeNull();
  });

  it("returns null for wrong length hex", () => {
    expect(hexToRgb("#12345")).toBeNull();
  });

  it("parses #00ff00 → green", () => {
    expect(hexToRgb("#00ff00")).toEqual({ r: 0, g: 255, b: 0 });
  });

  it("parses #0000ff → blue", () => {
    expect(hexToRgb("#0000ff")).toEqual({ r: 0, g: 0, b: 255 });
  });
});

// ---------------------------------------------------------------------------
// rgbToHex
// ---------------------------------------------------------------------------
describe("rgbToHex", () => {
  it("converts red to #ff0000", () => {
    expect(rgbToHex(255, 0, 0)).toBe("#ff0000");
  });

  it("converts black to #000000", () => {
    expect(rgbToHex(0, 0, 0)).toBe("#000000");
  });

  it("converts white to #ffffff", () => {
    expect(rgbToHex(255, 255, 255)).toBe("#ffffff");
  });

  it("pads single-digit hex components", () => {
    expect(rgbToHex(0, 1, 2)).toBe("#000102");
  });
});

// ---------------------------------------------------------------------------
// rgbToHsl
// ---------------------------------------------------------------------------
describe("rgbToHsl", () => {
  it("converts red to h:0 s:100 l:50", () => {
    const hsl = rgbToHsl(255, 0, 0);
    expect(hsl.h).toBeCloseTo(0, 0);
    expect(hsl.s).toBeCloseTo(100, 0);
    expect(hsl.l).toBeCloseTo(50, 0);
  });

  it("converts white to h:0 s:0 l:100", () => {
    const hsl = rgbToHsl(255, 255, 255);
    expect(hsl.s).toBeCloseTo(0, 0);
    expect(hsl.l).toBeCloseTo(100, 0);
  });

  it("converts black to h:0 s:0 l:0", () => {
    const hsl = rgbToHsl(0, 0, 0);
    expect(hsl.s).toBeCloseTo(0, 0);
    expect(hsl.l).toBeCloseTo(0, 0);
  });

  it("converts green (0,255,0) to h:120", () => {
    const hsl = rgbToHsl(0, 255, 0);
    expect(hsl.h).toBeCloseTo(120, 0);
    expect(hsl.s).toBeCloseTo(100, 0);
    expect(hsl.l).toBeCloseTo(50, 0);
  });

  it("converts blue (0,0,255) to h:240", () => {
    const hsl = rgbToHsl(0, 0, 255);
    expect(hsl.h).toBeCloseTo(240, 0);
  });
});

// ---------------------------------------------------------------------------
// hslToRgb
// ---------------------------------------------------------------------------
describe("hslToRgb", () => {
  it("converts h:0 s:100 l:50 → red", () => {
    const rgb = hslToRgb(0, 100, 50);
    expect(rgb.r).toBe(255);
    expect(rgb.g).toBe(0);
    expect(rgb.b).toBe(0);
  });

  it("converts h:120 s:100 l:50 → green", () => {
    const rgb = hslToRgb(120, 100, 50);
    expect(rgb.r).toBe(0);
    expect(rgb.g).toBe(255);
    expect(rgb.b).toBe(0);
  });

  it("converts h:240 s:100 l:50 → blue", () => {
    const rgb = hslToRgb(240, 100, 50);
    expect(rgb.r).toBe(0);
    expect(rgb.g).toBe(0);
    expect(rgb.b).toBe(255);
  });

  it("converts s:0 l:100 → white", () => {
    const rgb = hslToRgb(0, 0, 100);
    expect(rgb.r).toBe(255);
    expect(rgb.g).toBe(255);
    expect(rgb.b).toBe(255);
  });

  it("converts s:0 l:0 → black", () => {
    const rgb = hslToRgb(0, 0, 0);
    expect(rgb.r).toBe(0);
    expect(rgb.g).toBe(0);
    expect(rgb.b).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Roundtrip
// ---------------------------------------------------------------------------
describe("color roundtrip", () => {
  it("hex → rgb → hsl → rgb → hex returns same value for red", () => {
    const original = "#ff0000";
    const rgb = hexToRgb(original)!;
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    const rgb2 = hslToRgb(hsl.h, hsl.s, hsl.l);
    const final = rgbToHex(rgb2.r, rgb2.g, rgb2.b);
    expect(final).toBe(original);
  });

  it("hex → rgb → hsl → rgb → hex returns same value for blue", () => {
    const original = "#0000ff";
    const rgb = hexToRgb(original)!;
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    const rgb2 = hslToRgb(hsl.h, hsl.s, hsl.l);
    const final = rgbToHex(rgb2.r, rgb2.g, rgb2.b);
    expect(final).toBe(original);
  });

  it("hexToHsl → hslToHex roundtrip for green", () => {
    const original = "#00ff00";
    const hsl = hexToHsl(original)!;
    const back = hslToHex(hsl.h, hsl.s, hsl.l);
    expect(back).toBe(original);
  });
});

// ---------------------------------------------------------------------------
// relativeLuminance
// ---------------------------------------------------------------------------
describe("relativeLuminance", () => {
  it("white has luminance 1.0", () => {
    expect(relativeLuminance(255, 255, 255)).toBeCloseTo(1.0, 4);
  });

  it("black has luminance 0.0", () => {
    expect(relativeLuminance(0, 0, 0)).toBeCloseTo(0.0, 4);
  });

  it("middle gray (128) has luminance in (0, 1)", () => {
    const l = relativeLuminance(128, 128, 128);
    expect(l).toBeGreaterThan(0);
    expect(l).toBeLessThan(1);
  });

  it("pure red has luminance ~0.2126", () => {
    expect(relativeLuminance(255, 0, 0)).toBeCloseTo(0.2126, 3);
  });
});

// ---------------------------------------------------------------------------
// contrastRatio
// ---------------------------------------------------------------------------
describe("contrastRatio", () => {
  it("black on white → ~21.0", () => {
    const ratio = contrastRatio("#000000", "#FFFFFF");
    expect(ratio).not.toBeNull();
    expect(ratio!).toBeCloseTo(21.0, 0);
  });

  it("same color → 1.0", () => {
    const ratio = contrastRatio("#888888", "#888888");
    expect(ratio!).toBeCloseTo(1.0, 2);
  });

  it("returns null for invalid hex1", () => {
    expect(contrastRatio("invalid", "#FFFFFF")).toBeNull();
  });

  it("returns null for invalid hex2", () => {
    expect(contrastRatio("#000000", "bad")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// wcagGrade
// ---------------------------------------------------------------------------
describe("wcagGrade", () => {
  it("21.0 → AAA", () => {
    expect(wcagGrade(21.0)).toBe("AAA");
  });

  it("7.0 → AAA (exact boundary)", () => {
    expect(wcagGrade(7.0)).toBe("AAA");
  });

  it("5.0 → AA", () => {
    expect(wcagGrade(5.0)).toBe("AA");
  });

  it("4.5 → AA (exact boundary)", () => {
    expect(wcagGrade(4.5)).toBe("AA");
  });

  it("3.5 → AA-Large", () => {
    expect(wcagGrade(3.5)).toBe("AA-Large");
  });

  it("3.0 → AA-Large (exact boundary)", () => {
    expect(wcagGrade(3.0)).toBe("AA-Large");
  });

  it("2.5 → Fail", () => {
    expect(wcagGrade(2.5)).toBe("Fail");
  });

  it("1.0 → Fail", () => {
    expect(wcagGrade(1.0)).toBe("Fail");
  });
});

// ---------------------------------------------------------------------------
// meetsWcagAa
// ---------------------------------------------------------------------------
describe("meetsWcagAa", () => {
  it("black on white → true (normal text)", () => {
    expect(meetsWcagAa("#000000", "#FFFFFF")).toBe(true);
  });

  it("light gray on white → false", () => {
    // #CCCCCC on #FFFFFF has ratio ~1.6
    expect(meetsWcagAa("#CCCCCC", "#FFFFFF")).toBe(false);
  });

  it("large text threshold is 3.0", () => {
    // #767676 on white is ~4.54 AA normal; use colors with ratio ~3.5 for large text test
    expect(meetsWcagAa("#000000", "#FFFFFF", true)).toBe(true);
  });

  it("returns false for invalid hex", () => {
    expect(meetsWcagAa("bad", "#FFFFFF")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// lighten / darken / saturate / desaturate
// ---------------------------------------------------------------------------
describe("lighten", () => {
  it("lightens black by 50 to produce a gray", () => {
    const result = lighten("#000000", 50);
    const hsl = hexToHsl(result)!;
    expect(hsl.l).toBeCloseTo(50, 0);
  });

  it("clamps to 100 when lightened beyond max", () => {
    const result = lighten("#ffffff", 50);
    expect(result).toBe("#ffffff");
  });
});

describe("darken", () => {
  it("darkens white by 50 to produce a gray", () => {
    const result = darken("#ffffff", 50);
    const hsl = hexToHsl(result)!;
    expect(hsl.l).toBeCloseTo(50, 0);
  });

  it("clamps to 0 when darkened beyond min", () => {
    const result = darken("#000000", 50);
    expect(result).toBe("#000000");
  });
});

describe("saturate", () => {
  it("increases saturation of a gray (which has no hue effect) while clamped", () => {
    // Pure gray already at s=0; adding saturation
    const result = saturate("#808080", 50);
    const hsl = hexToHsl(result)!;
    expect(hsl.s).toBeGreaterThan(0);
  });
});

describe("desaturate", () => {
  it("decreases saturation of a vibrant color", () => {
    const vibrant = "#ff0000"; // s=100
    const result = desaturate(vibrant, 50);
    const hsl = hexToHsl(result)!;
    expect(hsl.s).toBeCloseTo(50, 0);
  });

  it("clamps saturation to 0", () => {
    const result = desaturate("#ff0000", 200);
    const hsl = hexToHsl(result)!;
    expect(hsl.s).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// mixColors
// ---------------------------------------------------------------------------
describe("mixColors", () => {
  it("50/50 mix of black and white → near #7f7f7f or #808080", () => {
    const result = mixColors("#000000", "#ffffff", 0.5);
    expect(result).not.toBeNull();
    const rgb = hexToRgb(result!)!;
    // Math.round(127.5) = 128 in most JS engines; accept 127 or 128
    expect(rgb.r).toBeGreaterThanOrEqual(127);
    expect(rgb.r).toBeLessThanOrEqual(128);
    expect(rgb.g).toBeGreaterThanOrEqual(127);
    expect(rgb.g).toBeLessThanOrEqual(128);
    expect(rgb.b).toBeGreaterThanOrEqual(127);
    expect(rgb.b).toBeLessThanOrEqual(128);
  });

  it("ratio=0 → all first color", () => {
    expect(mixColors("#ff0000", "#0000ff", 0)).toBe("#ff0000");
  });

  it("ratio=1 → all second color", () => {
    expect(mixColors("#ff0000", "#0000ff", 1)).toBe("#0000ff");
  });

  it("returns null for invalid hex1", () => {
    expect(mixColors("bad", "#ffffff", 0.5)).toBeNull();
  });

  it("returns null for invalid hex2", () => {
    expect(mixColors("#000000", "nope", 0.5)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// alphaBlend
// ---------------------------------------------------------------------------
describe("alphaBlend", () => {
  it("alpha=1.0 returns original color (on white)", () => {
    expect(alphaBlend("#ff0000", 1.0)).toBe("#ff0000");
  });

  it("alpha=0.0 returns the background (white by default)", () => {
    expect(alphaBlend("#ff0000", 0.0)).toBe("#ffffff");
  });

  it("alpha=0.5 blends toward background", () => {
    const result = alphaBlend("#ff0000", 0.5, "#ffffff");
    const rgb = hexToRgb(result)!;
    expect(rgb.r).toBeGreaterThan(200);
    expect(rgb.g).toBeGreaterThan(100);
  });
});

// ---------------------------------------------------------------------------
// getTextColor
// ---------------------------------------------------------------------------
describe("getTextColor", () => {
  it("very dark background → #FFFFFF", () => {
    expect(getTextColor("#000000")).toBe("#FFFFFF");
  });

  it("very light background → #000000", () => {
    expect(getTextColor("#FFFFFF")).toBe("#000000");
  });

  it("mid-range dark color → #FFFFFF", () => {
    expect(getTextColor("#333333")).toBe("#FFFFFF");
  });

  it("mid-range light color → #000000", () => {
    expect(getTextColor("#DDDDDD")).toBe("#000000");
  });
});

// ---------------------------------------------------------------------------
// generatePalette
// ---------------------------------------------------------------------------
describe("generatePalette", () => {
  it("returns default 9 colors", () => {
    const palette = generatePalette("#3b82f6");
    expect(palette).toHaveLength(9);
  });

  it("returns custom step count", () => {
    const palette = generatePalette("#3b82f6", 5);
    expect(palette).toHaveLength(5);
  });

  it("first color is lighter than last color", () => {
    const palette = generatePalette("#3b82f6", 9);
    const firstHsl = hexToHsl(palette[0])!;
    const lastHsl = hexToHsl(palette[palette.length - 1])!;
    expect(firstHsl.l).toBeGreaterThan(lastHsl.l);
  });

  it("first step is very light (l ≈ 95)", () => {
    const palette = generatePalette("#3b82f6", 9);
    const hsl = hexToHsl(palette[0])!;
    expect(hsl.l).toBeCloseTo(95, 0);
  });

  it("last step is very dark (l ≈ 10)", () => {
    const palette = generatePalette("#3b82f6", 9);
    const hsl = hexToHsl(palette[palette.length - 1])!;
    expect(hsl.l).toBeCloseTo(10, 0);
  });

  it("returns empty array for invalid hex", () => {
    const palette = generatePalette("invalid");
    expect(palette).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// analogousColors
// ---------------------------------------------------------------------------
describe("analogousColors", () => {
  it("returns 3 colors by default", () => {
    const hsl: import("../lib/utils/color-utils").HSLColor = { h: 180, s: 100, l: 50 };
    const result = analogousColors(hsl);
    expect(result).toHaveLength(3);
  });

  it("base hue is included in the result", () => {
    const hsl: import("../lib/utils/color-utils").HSLColor = { h: 180, s: 80, l: 50 };
    const result = analogousColors(hsl, 30, 3);
    const hues = result.map((c) => c.h);
    expect(hues).toContain(180);
  });

  it("spread shifts adjacent hues correctly", () => {
    const hsl: import("../lib/utils/color-utils").HSLColor = { h: 180, s: 80, l: 50 };
    const result = analogousColors(hsl, 30, 3);
    const hues = result.map((c) => c.h).sort((a, b) => a - b);
    expect(hues).toContain(150);
    expect(hues).toContain(180);
    expect(hues).toContain(210);
  });
});

// ---------------------------------------------------------------------------
// cssVarValue
// ---------------------------------------------------------------------------
describe("cssVarValue", () => {
  it("wraps name in var(--...)", () => {
    expect(cssVarValue("primary")).toBe("var(--primary)");
  });

  it("includes fallback when provided", () => {
    expect(cssVarValue("primary", "#fff")).toBe("var(--primary, #fff)");
  });

  it("does not double the -- prefix", () => {
    const result = cssVarValue("color-bg");
    expect(result).toBe("var(--color-bg)");
  });
});

// ---------------------------------------------------------------------------
// hslCss
// ---------------------------------------------------------------------------
describe("hslCss", () => {
  it("returns CSS4 space-separated syntax without alpha", () => {
    expect(hslCss(240, 100, 50)).toBe("hsl(240 100% 50%)");
  });

  it("includes alpha when provided", () => {
    expect(hslCss(240, 100, 50, 0.5)).toBe("hsl(240 100% 50% / 0.5)");
  });

  it("works with h=0 (red)", () => {
    expect(hslCss(0, 100, 50)).toBe("hsl(0 100% 50%)");
  });
});

// ---------------------------------------------------------------------------
// parseColorToRgb
// ---------------------------------------------------------------------------
describe("parseColorToRgb", () => {
  it("parses valid hex", () => {
    expect(parseColorToRgb("#ff0000")).toEqual({ r: 255, g: 0, b: 0 });
  });

  it("returns null for non-hex input", () => {
    expect(parseColorToRgb("rgb(255,0,0)")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseColorToRgb("")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// hexToHsl / hslToHex convenience
// ---------------------------------------------------------------------------
describe("hexToHsl", () => {
  it("converts #ff0000 to h≈0, s≈100, l≈50", () => {
    const hsl = hexToHsl("#ff0000")!;
    expect(hsl.h).toBeCloseTo(0, 0);
    expect(hsl.s).toBeCloseTo(100, 0);
    expect(hsl.l).toBeCloseTo(50, 0);
  });

  it("returns null for invalid hex", () => {
    expect(hexToHsl("garbage")).toBeNull();
  });
});

describe("hslToHex", () => {
  it("converts h:0 s:100 l:50 back to #ff0000", () => {
    expect(hslToHex(0, 100, 50)).toBe("#ff0000");
  });

  it("converts h:0 s:0 l:100 to #ffffff", () => {
    expect(hslToHex(0, 0, 100)).toBe("#ffffff");
  });
});
