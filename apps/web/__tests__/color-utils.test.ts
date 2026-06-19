import { describe, it, expect } from "vitest";
import {
  // New spec types
  type RGB,
  type HSL,
  type HSV,
  type RGBA,
  // Legacy types
  type Rgb,
  type Rgba,
  type Hsl,
  type Hsv,
  // Parsing
  parseHex,
  parseHexRgba,
  parseRgbString,
  parseColor,
  toHex,
  toHexFull,
  toRgbString,
  toRgbaString,
  toHslString,
  // Conversions
  rgbToHsl,
  hslToRgb,
  rgbToHsv,
  hsvToRgb,
  rgbToLab,
  labToRgb,
  rgbToXyz,
  xyzToRgb,
  rgbToLinear,
  linearToRgb,
  // Contrast / accessibility
  relativeLuminance,
  contrastRatio,
  wcagAA,
  wcagAAA,
  bestTextColor,
  suggestAccessibleColor,
  wcagLevel,
  isAccessible,
  // Manipulation
  lighten,
  darken,
  saturate,
  desaturate,
  rotate,
  invert,
  grayscale,
  mix,
  alphaBlend,
  temperature,
  complement,
  // Palette generation — new spec
  complementary,
  splitComplementary,
  triadic,
  analogous,
  tetradic,
  monochromatic,
  gradient,
  // Distance and perception
  deltaE76,
  deltaE2000,
  colorDistance,
  closestColor,
  sortByHue,
  sortByLuminance,
  // Sports team utilities
  isColorDark,
  isDominantColor,
  generateTeamPalette,
  uniformContrast,
  hexToTeamName,
  colorblindSafe,
  // Legacy palette aliases
  splitComplementaryLegacy,
  triadicLegacy,
  analogousLegacy,
  tetradicLegacy,
  // Legacy palette generation
  generateTints,
  generateShades,
  generatePalette,
  findAccessibleColor,
  // Named colors
  namedColors,
  colorName,
  // Distance
  perceptualDistance,
  // Temperature
  colorTemperature,
  // CSS helpers
  hexToTailwindRgb,
  cssVarColor,
  // Legacy exports
  hexToRgb,
  rgbToHex,
  hexToHsl,
  hslToHex,
  wcagGrade,
  meetsWcagAa,
  mixColors,
  getTextColor,
  cssVarValue,
  hslCss,
  parseColorToRgb,
  analogousColors,
} from "@/lib/utils/color-utils";

// ---------------------------------------------------------------------------
// parseHex
// ---------------------------------------------------------------------------
describe("parseHex", () => {
  it("parses #RRGGBB (red)", () => {
    expect(parseHex("#ff0000")).toEqual({ r: 255, g: 0, b: 0 });
  });

  it("parses #RRGGBB (white)", () => {
    expect(parseHex("#ffffff")).toEqual({ r: 255, g: 255, b: 255 });
  });

  it("parses #RRGGBB (black)", () => {
    expect(parseHex("#000000")).toEqual({ r: 0, g: 0, b: 0 });
  });

  it("parses #RGB shortform (expands #F00 → 255,0,0)", () => {
    expect(parseHex("#F00")).toEqual({ r: 255, g: 0, b: 0 });
  });

  it("parses #RGB shortform (expands #000 → 0,0,0)", () => {
    expect(parseHex("#000")).toEqual({ r: 0, g: 0, b: 0 });
  });

  it("parses #RGBA shortform (ignores alpha)", () => {
    expect(parseHex("#F00F")).toEqual({ r: 255, g: 0, b: 0 });
  });

  it("parses #RRGGBBAA (ignores alpha channel)", () => {
    expect(parseHex("#FF0000FF")).toEqual({ r: 255, g: 0, b: 0 });
  });

  it("parses #RRGGBBAA with 00 alpha (still returns rgb)", () => {
    expect(parseHex("#FF000000")).toEqual({ r: 255, g: 0, b: 0 });
  });

  it("parses mixed-case hex", () => {
    expect(parseHex("#aAbBcC")).toEqual({
      r: parseInt("aa", 16),
      g: parseInt("bb", 16),
      b: parseInt("cc", 16),
    });
  });

  it("throws on missing # prefix", () => {
    expect(() => parseHex("ff0000")).toThrow();
  });

  it("throws on empty string", () => {
    expect(() => parseHex("")).toThrow();
  });

  it("throws on wrong length (#12345)", () => {
    expect(() => parseHex("#12345")).toThrow();
  });

  it("throws on non-hex characters", () => {
    expect(() => parseHex("#GGGGGG")).toThrow();
  });

  it("throws on non-string input", () => {
    expect(() => parseHex(null as unknown as string)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// toHex
// ---------------------------------------------------------------------------
describe("toHex", () => {
  it("returns #RRGGBB lowercase", () => {
    expect(toHex({ r: 255, g: 0, b: 0 })).toBe("#ff0000");
  });

  it("pads single digit components", () => {
    expect(toHex({ r: 0, g: 1, b: 2 })).toBe("#000102");
  });

  it("converts white", () => {
    expect(toHex({ r: 255, g: 255, b: 255 })).toBe("#ffffff");
  });

  it("converts black", () => {
    expect(toHex({ r: 0, g: 0, b: 0 })).toBe("#000000");
  });
});

// ---------------------------------------------------------------------------
// parseRgbString
// ---------------------------------------------------------------------------
describe("parseRgbString", () => {
  it("parses 'rgb(255, 0, 0)'", () => {
    expect(parseRgbString("rgb(255, 0, 0)")).toEqual({ r: 255, g: 0, b: 0 });
  });

  it("parses 'rgba(0, 128, 255, 0.5)' (ignores alpha)", () => {
    expect(parseRgbString("rgba(0, 128, 255, 0.5)")).toEqual({ r: 0, g: 128, b: 255 });
  });

  it("throws on invalid format", () => {
    expect(() => parseRgbString("hsl(0, 100%, 50%)")).toThrow();
  });

  it("parses rgb with no spaces", () => {
    expect(parseRgbString("rgb(0,0,255)")).toEqual({ r: 0, g: 0, b: 255 });
  });
});

// ---------------------------------------------------------------------------
// toRgbString
// ---------------------------------------------------------------------------
describe("toRgbString", () => {
  it("returns 'rgb(r, g, b)' format without alpha", () => {
    expect(toRgbString({ r: 255, g: 128, b: 0 })).toBe("rgb(255, 128, 0)");
  });

  it("returns 'rgba(r, g, b, a)' when alpha provided", () => {
    expect(toRgbString({ r: 0, g: 0, b: 255 }, 0.5)).toBe("rgba(0, 0, 255, 0.5)");
  });

  it("returns 'rgba(r, g, b, 1)' when alpha=1", () => {
    expect(toRgbString({ r: 255, g: 0, b: 0 }, 1)).toBe("rgba(255, 0, 0, 1)");
  });
});

// ---------------------------------------------------------------------------
// rgbToLinear / linearToRgb
// ---------------------------------------------------------------------------
describe("rgbToLinear", () => {
  it("0 → 0", () => {
    expect(rgbToLinear(0)).toBeCloseTo(0, 5);
  });

  it("255 → 1", () => {
    expect(rgbToLinear(255)).toBeCloseTo(1, 5);
  });

  it("128 is between 0 and 1", () => {
    const v = rgbToLinear(128);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(1);
  });
});

describe("linearToRgb", () => {
  it("0 → 0", () => {
    expect(linearToRgb(0)).toBe(0);
  });

  it("1 → 255", () => {
    expect(linearToRgb(1)).toBe(255);
  });

  it("round-trip with rgbToLinear", () => {
    const v = 128;
    expect(linearToRgb(rgbToLinear(v))).toBeCloseTo(v, 0);
  });
});

// ---------------------------------------------------------------------------
// rgbToHsl / hslToRgb
// ---------------------------------------------------------------------------
describe("rgbToHsl", () => {
  it("#ff0000 → H:0 S:100 L:50", () => {
    const hsl = rgbToHsl({ r: 255, g: 0, b: 0 });
    expect(hsl.h).toBeCloseTo(0, 0);
    expect(hsl.s).toBeCloseTo(100, 0);
    expect(hsl.l).toBeCloseTo(50, 0);
  });

  it("#ffffff → S:0 L:100", () => {
    const hsl = rgbToHsl({ r: 255, g: 255, b: 255 });
    expect(hsl.s).toBeCloseTo(0, 0);
    expect(hsl.l).toBeCloseTo(100, 0);
  });

  it("#000000 → S:0 L:0", () => {
    const hsl = rgbToHsl({ r: 0, g: 0, b: 0 });
    expect(hsl.s).toBeCloseTo(0, 0);
    expect(hsl.l).toBeCloseTo(0, 0);
  });

  it("green (0,255,0) → H:120", () => {
    const hsl = rgbToHsl({ r: 0, g: 255, b: 0 });
    expect(hsl.h).toBeCloseTo(120, 0);
    expect(hsl.s).toBeCloseTo(100, 0);
    expect(hsl.l).toBeCloseTo(50, 0);
  });

  it("blue (0,0,255) → H:240", () => {
    const hsl = rgbToHsl({ r: 0, g: 0, b: 255 });
    expect(hsl.h).toBeCloseTo(240, 0);
  });
});

describe("hslToRgb", () => {
  it("H:0 S:100 L:50 → red (255,0,0)", () => {
    expect(hslToRgb({ h: 0, s: 100, l: 50 })).toEqual({ r: 255, g: 0, b: 0 });
  });

  it("H:120 S:100 L:50 → green (0,255,0)", () => {
    expect(hslToRgb({ h: 120, s: 100, l: 50 })).toEqual({ r: 0, g: 255, b: 0 });
  });

  it("H:240 S:100 L:50 → blue (0,0,255)", () => {
    expect(hslToRgb({ h: 240, s: 100, l: 50 })).toEqual({ r: 0, g: 0, b: 255 });
  });

  it("S:0 L:100 → white", () => {
    expect(hslToRgb({ h: 0, s: 0, l: 100 })).toEqual({ r: 255, g: 255, b: 255 });
  });

  it("S:0 L:0 → black", () => {
    expect(hslToRgb({ h: 0, s: 0, l: 0 })).toEqual({ r: 0, g: 0, b: 0 });
  });

  it("round-trip with rgbToHsl within ±1 due to rounding", () => {
    const original: RGB = { r: 123, g: 45, b: 200 };
    const hsl = rgbToHsl(original);
    const back = hslToRgb(hsl);
    expect(Math.abs(back.r - original.r)).toBeLessThanOrEqual(1);
    expect(Math.abs(back.g - original.g)).toBeLessThanOrEqual(1);
    expect(Math.abs(back.b - original.b)).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// rgbToHsv / hsvToRgb
// ---------------------------------------------------------------------------
describe("rgbToHsv", () => {
  it("red → H:0 S:100 V:100", () => {
    const hsv = rgbToHsv({ r: 255, g: 0, b: 0 });
    expect(hsv.h).toBeCloseTo(0, 0);
    expect(hsv.s).toBeCloseTo(100, 0);
    expect(hsv.v).toBeCloseTo(100, 0);
  });

  it("black → S:0 V:0", () => {
    const hsv = rgbToHsv({ r: 0, g: 0, b: 0 });
    expect(hsv.s).toBeCloseTo(0, 0);
    expect(hsv.v).toBeCloseTo(0, 0);
  });

  it("white → S:0 V:100", () => {
    const hsv = rgbToHsv({ r: 255, g: 255, b: 255 });
    expect(hsv.s).toBeCloseTo(0, 0);
    expect(hsv.v).toBeCloseTo(100, 0);
  });

  it("green → H:120 S:100 V:100", () => {
    const hsv = rgbToHsv({ r: 0, g: 255, b: 0 });
    expect(hsv.h).toBeCloseTo(120, 0);
    expect(hsv.s).toBeCloseTo(100, 0);
    expect(hsv.v).toBeCloseTo(100, 0);
  });
});

describe("hsvToRgb", () => {
  it("H:0 S:100 V:100 → red", () => {
    expect(hsvToRgb({ h: 0, s: 100, v: 100 })).toEqual({ r: 255, g: 0, b: 0 });
  });

  it("H:120 S:100 V:100 → green", () => {
    expect(hsvToRgb({ h: 120, s: 100, v: 100 })).toEqual({ r: 0, g: 255, b: 0 });
  });

  it("H:0 S:0 V:0 → black", () => {
    expect(hsvToRgb({ h: 0, s: 0, v: 0 })).toEqual({ r: 0, g: 0, b: 0 });
  });

  it("round-trip with rgbToHsv within ±1", () => {
    const original: RGB = { r: 99, g: 150, b: 200 };
    const hsv = rgbToHsv(original);
    const back = hsvToRgb(hsv);
    expect(Math.abs(back.r - original.r)).toBeLessThanOrEqual(1);
    expect(Math.abs(back.g - original.g)).toBeLessThanOrEqual(1);
    expect(Math.abs(back.b - original.b)).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// rgbToXyz / xyzToRgb
// ---------------------------------------------------------------------------
describe("rgbToXyz", () => {
  it("black → xyz all near 0", () => {
    const xyz = rgbToXyz({ r: 0, g: 0, b: 0 });
    expect(xyz.x).toBeCloseTo(0, 3);
    expect(xyz.y).toBeCloseTo(0, 3);
    expect(xyz.z).toBeCloseTo(0, 3);
  });

  it("white → xyz near D65", () => {
    const xyz = rgbToXyz({ r: 255, g: 255, b: 255 });
    expect(xyz.x).toBeCloseTo(0.9505, 2);
    expect(xyz.y).toBeCloseTo(1.0, 2);
    expect(xyz.z).toBeCloseTo(1.0888, 2);
  });

  it("round-trip xyz → rgb within ±2", () => {
    const original: RGB = { r: 100, g: 150, b: 200 };
    const xyz = rgbToXyz(original);
    const back = xyzToRgb(xyz);
    expect(Math.abs(back.r - original.r)).toBeLessThanOrEqual(2);
    expect(Math.abs(back.g - original.g)).toBeLessThanOrEqual(2);
    expect(Math.abs(back.b - original.b)).toBeLessThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// rgbToLab / labToRgb
// ---------------------------------------------------------------------------
describe("rgbToLab", () => {
  it("black → L≈0", () => {
    const lab = rgbToLab({ r: 0, g: 0, b: 0 });
    expect(lab.l).toBeCloseTo(0, 0);
  });

  it("white → L≈100", () => {
    const lab = rgbToLab({ r: 255, g: 255, b: 255 });
    expect(lab.l).toBeCloseTo(100, 0);
  });

  it("pure red → L>0 a>0", () => {
    const lab = rgbToLab({ r: 255, g: 0, b: 0 });
    expect(lab.l).toBeGreaterThan(0);
    expect(lab.a).toBeGreaterThan(0);
  });
});

describe("labToRgb", () => {
  it("L=0,a=0,b=0 → near black", () => {
    const rgb = labToRgb({ l: 0, a: 0, b: 0 });
    expect(rgb.r).toBeLessThanOrEqual(5);
    expect(rgb.g).toBeLessThanOrEqual(5);
    expect(rgb.b).toBeLessThanOrEqual(5);
  });

  it("round-trip rgb→lab→rgb within ±3", () => {
    const original: RGB = { r: 120, g: 80, b: 200 };
    const lab = rgbToLab(original);
    const back = labToRgb(lab);
    expect(Math.abs(back.r - original.r)).toBeLessThanOrEqual(3);
    expect(Math.abs(back.g - original.g)).toBeLessThanOrEqual(3);
    expect(Math.abs(back.b - original.b)).toBeLessThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// relativeLuminance
// ---------------------------------------------------------------------------
describe("relativeLuminance", () => {
  it("white → 1.0", () => {
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1.0, 4);
  });

  it("black → 0.0", () => {
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBeCloseTo(0.0, 4);
  });

  it("pure red → ~0.2126", () => {
    expect(relativeLuminance({ r: 255, g: 0, b: 0 })).toBeCloseTo(0.2126, 3);
  });

  it("middle gray is between 0 and 1", () => {
    const l = relativeLuminance({ r: 128, g: 128, b: 128 });
    expect(l).toBeGreaterThan(0);
    expect(l).toBeLessThan(1);
  });
});

// ---------------------------------------------------------------------------
// contrastRatio
// ---------------------------------------------------------------------------
describe("contrastRatio", () => {
  it("black vs white → ~21.0", () => {
    const ratio = contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 });
    expect(ratio).toBeCloseTo(21.0, 0);
  });

  it("same color → 1.0", () => {
    const gray: RGB = { r: 128, g: 128, b: 128 };
    expect(contrastRatio(gray, gray)).toBeCloseTo(1.0, 2);
  });

  it("is commutative (fg/bg order doesn't matter)", () => {
    const r1 = contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 0, b: 0 });
    const r2 = contrastRatio({ r: 255, g: 0, b: 0 }, { r: 0, g: 0, b: 0 });
    expect(r1).toBeCloseTo(r2, 5);
  });
});

// ---------------------------------------------------------------------------
// wcagAA / wcagAAA
// ---------------------------------------------------------------------------
describe("wcagAA", () => {
  it("black on white → true for normal text", () => {
    expect(wcagAA({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })).toBe(true);
  });

  it("light gray on white → false for normal text", () => {
    expect(wcagAA({ r: 204, g: 204, b: 204 }, { r: 255, g: 255, b: 255 })).toBe(false);
  });

  it("isLargeText=true needs only 3:1", () => {
    // A pair between 3:1 and 4.5:1 passes large text
    const fg = { r: 118, g: 118, b: 118 };
    const bg = { r: 255, g: 255, b: 255 };
    const ratio = contrastRatio(fg, bg);
    expect(ratio).toBeGreaterThanOrEqual(3);
    expect(wcagAA(fg, bg, true)).toBe(true);
  });
});

describe("wcagAAA", () => {
  it("black on white → true for AAA", () => {
    expect(wcagAAA({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })).toBe(true);
  });

  it("mid-gray on white → false for AAA normal text", () => {
    // ~4.48:1 — passes AA but not AAA
    expect(wcagAAA({ r: 118, g: 118, b: 118 }, { r: 255, g: 255, b: 255 })).toBe(false);
  });

  it("isLargeText=true needs only 4.5:1", () => {
    // black on white passes AAA large
    expect(wcagAAA({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }, true)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// bestTextColor
// ---------------------------------------------------------------------------
describe("bestTextColor", () => {
  it("black background → white text", () => {
    const result = bestTextColor({ r: 0, g: 0, b: 0 });
    expect(result).toEqual({ r: 255, g: 255, b: 255 });
  });

  it("white background → black text", () => {
    const result = bestTextColor({ r: 255, g: 255, b: 255 });
    expect(result).toEqual({ r: 0, g: 0, b: 0 });
  });

  it("dark navy → white text", () => {
    const result = bestTextColor({ r: 0, g: 0, b: 128 });
    expect(result).toEqual({ r: 255, g: 255, b: 255 });
  });
});

// ---------------------------------------------------------------------------
// suggestAccessibleColor
// ---------------------------------------------------------------------------
describe("suggestAccessibleColor", () => {
  it("already passing → returns same color", () => {
    const fg: RGB = { r: 0, g: 0, b: 0 };
    const bg: RGB = { r: 255, g: 255, b: 255 };
    const result = suggestAccessibleColor(fg, bg);
    expect(contrastRatio(result, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("light gray on white → suggests darker color", () => {
    const fg: RGB = { r: 200, g: 200, b: 200 };
    const bg: RGB = { r: 255, g: 255, b: 255 };
    const result = suggestAccessibleColor(fg, bg, 4.5);
    expect(contrastRatio(result, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("custom targetRatio=3 is easier to meet", () => {
    const fg: RGB = { r: 180, g: 180, b: 180 };
    const bg: RGB = { r: 255, g: 255, b: 255 };
    const result = suggestAccessibleColor(fg, bg, 3);
    expect(contrastRatio(result, bg)).toBeGreaterThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// lighten / darken
// ---------------------------------------------------------------------------
describe("lighten", () => {
  it("lightens red by 20 → L increases", () => {
    const original = rgbToHsl({ r: 255, g: 0, b: 0 });
    const result = rgbToHsl(lighten({ r: 255, g: 0, b: 0 }, 20));
    expect(result.l).toBeCloseTo(original.l + 20, 0);
  });

  it("clamps to L=100 when lightened beyond max", () => {
    const result = rgbToHsl(lighten({ r: 255, g: 255, b: 255 }, 50));
    expect(result.l).toBeCloseTo(100, 0);
  });

  it("lightening black by 50 → gray with L=50", () => {
    const result = rgbToHsl(lighten({ r: 0, g: 0, b: 0 }, 50));
    expect(result.l).toBeCloseTo(50, 0);
  });
});

describe("darken", () => {
  it("darkens white by 50 → gray with L=50", () => {
    const result = rgbToHsl(darken({ r: 255, g: 255, b: 255 }, 50));
    expect(result.l).toBeCloseTo(50, 0);
  });

  it("clamps to L=0 when darkened below min", () => {
    const result = rgbToHsl(darken({ r: 0, g: 0, b: 0 }, 50));
    expect(result.l).toBeCloseTo(0, 0);
  });
});

// ---------------------------------------------------------------------------
// saturate / desaturate
// ---------------------------------------------------------------------------
describe("saturate", () => {
  it("increases saturation of partially saturated color", () => {
    const input: RGB = { r: 200, g: 100, b: 100 };
    const result = rgbToHsl(saturate(input, 30));
    const original = rgbToHsl(input);
    expect(result.s).toBeGreaterThanOrEqual(original.s);
  });
});

describe("desaturate", () => {
  it("decreases saturation of red by 50", () => {
    const result = rgbToHsl(desaturate({ r: 255, g: 0, b: 0 }, 50));
    expect(result.s).toBeCloseTo(50, 0);
  });

  it("clamps saturation to 0", () => {
    const result = rgbToHsl(desaturate({ r: 255, g: 0, b: 0 }, 200));
    expect(result.s).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// rotate / complement
// ---------------------------------------------------------------------------
describe("rotate", () => {
  it("rotates hue by 180 degrees", () => {
    const rotated = rgbToHsl(rotate({ r: 255, g: 0, b: 0 }, 180));
    expect(Math.abs(rotated.h - 180)).toBeLessThan(2);
  });

  it("wraps around 360", () => {
    const rotated = rgbToHsl(rotate({ r: 0, g: 0, b: 255 }, 150));
    // 240+150=390 mod 360 = 30
    expect(rotated.h).toBeCloseTo(30, 0);
  });
});

describe("complement", () => {
  it("shifts H by 180 degrees from red", () => {
    const comp = rgbToHsl(complement({ r: 255, g: 0, b: 0 }));
    expect(Math.abs(comp.h - 180)).toBeLessThan(2);
  });

  it("double complement returns to original hue", () => {
    const rgb: RGB = { r: 100, g: 150, b: 200 };
    const doubleComp = rgbToHsl(complement(complement(rgb)));
    const original = rgbToHsl(rgb);
    expect(Math.abs(doubleComp.h - original.h)).toBeLessThan(2);
  });
});

// ---------------------------------------------------------------------------
// invert / grayscale
// ---------------------------------------------------------------------------
describe("invert", () => {
  it("inverts black to white", () => {
    expect(invert({ r: 0, g: 0, b: 0 })).toEqual({ r: 255, g: 255, b: 255 });
  });

  it("inverts white to black", () => {
    expect(invert({ r: 255, g: 255, b: 255 })).toEqual({ r: 0, g: 0, b: 0 });
  });

  it("inverts red to cyan", () => {
    expect(invert({ r: 255, g: 0, b: 0 })).toEqual({ r: 0, g: 255, b: 255 });
  });
});

describe("grayscale", () => {
  it("desaturates red — r,g,b all equal", () => {
    const result = grayscale({ r: 255, g: 0, b: 0 });
    expect(result.r).toBe(result.g);
    expect(result.g).toBe(result.b);
  });

  it("grayscale of white remains white", () => {
    expect(grayscale({ r: 255, g: 255, b: 255 })).toEqual({ r: 255, g: 255, b: 255 });
  });

  it("grayscale of black remains black", () => {
    expect(grayscale({ r: 0, g: 0, b: 0 })).toEqual({ r: 0, g: 0, b: 0 });
  });

  it("uses luminance weights (0.299R+0.587G+0.114B)", () => {
    const result = grayscale({ r: 255, g: 0, b: 0 });
    expect(result.r).toBeCloseTo(76, 0); // 0.299*255
  });
});

// ---------------------------------------------------------------------------
// mix
// ---------------------------------------------------------------------------
describe("mix", () => {
  it("weight=0.5 of red and blue → purple-ish", () => {
    const result = mix({ r: 255, g: 0, b: 0 }, { r: 0, g: 0, b: 255 }, 0.5);
    expect(result.r).toBeGreaterThan(100);
    expect(result.b).toBeGreaterThan(100);
  });

  it("weight=1 → returns rgb1", () => {
    const a: RGB = { r: 255, g: 0, b: 0 };
    const b: RGB = { r: 0, g: 0, b: 255 };
    expect(mix(a, b, 1)).toEqual(a);
  });

  it("weight=0 → returns rgb2", () => {
    const a: RGB = { r: 255, g: 0, b: 0 };
    const b: RGB = { r: 0, g: 0, b: 255 };
    expect(mix(a, b, 0)).toEqual(b);
  });

  it("default weight 0.5 is midpoint", () => {
    const result = mix({ r: 100, g: 0, b: 0 }, { r: 200, g: 0, b: 0 });
    expect(result.r).toBe(150);
  });
});

// ---------------------------------------------------------------------------
// alphaBlend
// ---------------------------------------------------------------------------
describe("alphaBlend", () => {
  it("alpha=1 → foreground color", () => {
    const result = alphaBlend({ r: 255, g: 0, b: 0, a: 1 }, { r: 255, g: 255, b: 255 });
    expect(result).toEqual({ r: 255, g: 0, b: 0 });
  });

  it("alpha=0 → background color", () => {
    const result = alphaBlend({ r: 255, g: 0, b: 0, a: 0 }, { r: 255, g: 255, b: 255 });
    expect(result).toEqual({ r: 255, g: 255, b: 255 });
  });

  it("alpha=0.5 blends toward background", () => {
    const result = alphaBlend({ r: 0, g: 0, b: 0, a: 0.5 }, { r: 200, g: 200, b: 200 });
    expect(result.r).toBeGreaterThan(80);
    expect(result.r).toBeLessThan(130);
  });
});

// ---------------------------------------------------------------------------
// temperature
// ---------------------------------------------------------------------------
describe("temperature", () => {
  it("1000K → warm red-orange", () => {
    const rgb = temperature(1000);
    expect(rgb.r).toBeGreaterThan(rgb.b);
  });

  it("6500K → close to white", () => {
    const rgb = temperature(6500);
    expect(rgb.r).toBeGreaterThan(200);
    expect(rgb.g).toBeGreaterThan(200);
  });

  it("40000K → blue-white", () => {
    const rgb = temperature(40000);
    expect(rgb.b).toBeGreaterThan(rgb.r);
  });

  it("returns integers", () => {
    const rgb = temperature(5000);
    expect(Number.isInteger(rgb.r)).toBe(true);
    expect(Number.isInteger(rgb.g)).toBe(true);
    expect(Number.isInteger(rgb.b)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// complementary
// ---------------------------------------------------------------------------
describe("complementary", () => {
  it("red complement → near H:180 (cyan)", () => {
    const comp = rgbToHsl(complementary({ r: 255, g: 0, b: 0 }));
    expect(Math.abs(comp.h - 180)).toBeLessThan(2);
  });

  it("double complement returns to original hue", () => {
    const rgb: RGB = { r: 50, g: 200, b: 100 };
    const original = rgbToHsl(rgb);
    const double = rgbToHsl(complementary(complementary(rgb)));
    expect(Math.abs(double.h - original.h)).toBeLessThan(2);
  });
});

// ---------------------------------------------------------------------------
// splitComplementary (new spec: returns [RGB, RGB])
// ---------------------------------------------------------------------------
describe("splitComplementary", () => {
  it("returns 2 colors", () => {
    const result = splitComplementary({ r: 255, g: 0, b: 0 });
    expect(result).toHaveLength(2);
  });

  it("colors are hue -150 and +150 from red", () => {
    const [c1, c2] = splitComplementary({ r: 255, g: 0, b: 0 });
    // Red is H≈0, so -150 = 210, +150 = 150
    expect(Math.abs(rgbToHsl(c1).h - 210)).toBeLessThan(3);
    expect(Math.abs(rgbToHsl(c2).h - 150)).toBeLessThan(3);
  });
});

// ---------------------------------------------------------------------------
// triadic (new spec: returns [RGB, RGB])
// ---------------------------------------------------------------------------
describe("triadic", () => {
  it("returns 2 colors", () => {
    const result = triadic({ r: 255, g: 0, b: 0 });
    expect(result).toHaveLength(2);
  });

  it("colors are hue +120 and +240 from red", () => {
    const [c1, c2] = triadic({ r: 255, g: 0, b: 0 });
    expect(Math.abs(rgbToHsl(c1).h - 120)).toBeLessThan(3);
    expect(Math.abs(rgbToHsl(c2).h - 240)).toBeLessThan(3);
  });
});

// ---------------------------------------------------------------------------
// analogous (new spec: returns [RGB, RGB])
// ---------------------------------------------------------------------------
describe("analogous", () => {
  it("returns 2 colors", () => {
    expect(analogous({ r: 255, g: 0, b: 0 })).toHaveLength(2);
  });

  it("colors are hue -30 and +30 from red (defaults)", () => {
    const [neg, pos] = analogous({ r: 255, g: 0, b: 0 });
    // Red H≈0 → neg = 330, pos = 30
    expect(rgbToHsl(neg).h).toBeCloseTo(330, 0);
    expect(rgbToHsl(pos).h).toBeCloseTo(30, 0);
  });

  it("custom angle shifts hues accordingly", () => {
    const [neg, pos] = analogous({ r: 0, g: 255, b: 0 }, 45); // H=120
    expect(Math.abs(rgbToHsl(neg).h - 75)).toBeLessThan(3);
    expect(Math.abs(rgbToHsl(pos).h - 165)).toBeLessThan(3);
  });
});

// ---------------------------------------------------------------------------
// tetradic (new spec: returns [RGB, RGB, RGB])
// ---------------------------------------------------------------------------
describe("tetradic", () => {
  it("returns 3 colors", () => {
    expect(tetradic({ r: 255, g: 0, b: 0 })).toHaveLength(3);
  });

  it("colors are hue +90, +180, +270 from red", () => {
    const [c1, c2, c3] = tetradic({ r: 255, g: 0, b: 0 });
    expect(Math.abs(rgbToHsl(c1).h - 90)).toBeLessThan(3);
    expect(Math.abs(rgbToHsl(c2).h - 180)).toBeLessThan(3);
    expect(Math.abs(rgbToHsl(c3).h - 270)).toBeLessThan(3);
  });
});

// ---------------------------------------------------------------------------
// monochromatic
// ---------------------------------------------------------------------------
describe("monochromatic", () => {
  it("returns 5 colors by default", () => {
    expect(monochromatic({ r: 255, g: 0, b: 0 })).toHaveLength(5);
  });

  it("first is near-black (L≈0)", () => {
    const colors = monochromatic({ r: 255, g: 0, b: 0 });
    const first = colors[0];
    expect(rgbToHsl(first!).l).toBeCloseTo(0, 0);
  });

  it("last is near-white (L≈100)", () => {
    const colors = monochromatic({ r: 255, g: 0, b: 0 });
    const last = colors[colors.length - 1];
    expect(rgbToHsl(last!).l).toBeCloseTo(100, 0);
  });

  it("custom step count", () => {
    expect(monochromatic({ r: 100, g: 100, b: 200 }, 7)).toHaveLength(7);
  });

  it("all colors share same hue and saturation", () => {
    const colors = monochromatic({ r: 200, g: 50, b: 50 }, 4);
    const hsls = colors.map(rgbToHsl);
    const firstHsl = hsls[0];
    for (const hsl of hsls) {
      expect(Math.abs(hsl.h - firstHsl!.h)).toBeLessThan(2);
    }
  });
});

// ---------------------------------------------------------------------------
// gradient
// ---------------------------------------------------------------------------
describe("gradient", () => {
  it("includes start and end", () => {
    const g = gradient({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }, 5);
    expect(g[0]).toEqual({ r: 0, g: 0, b: 0 });
    expect(g[4]).toEqual({ r: 255, g: 255, b: 255 });
  });

  it("returns exactly steps count", () => {
    expect(gradient({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }, 10)).toHaveLength(10);
  });

  it("min 2 steps enforced", () => {
    expect(gradient({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }, 1)).toHaveLength(2);
  });

  it("midpoint is midpoint of start and end", () => {
    const g = gradient({ r: 0, g: 0, b: 0 }, { r: 200, g: 100, b: 50 }, 3);
    const mid = g[1];
    expect(mid!.r).toBeCloseTo(100, 0);
    expect(mid!.g).toBeCloseTo(50, 0);
    expect(mid!.b).toBeCloseTo(25, 0);
  });
});

// ---------------------------------------------------------------------------
// deltaE76
// ---------------------------------------------------------------------------
describe("deltaE76", () => {
  it("same color → 0", () => {
    const lab = rgbToLab({ r: 100, g: 100, b: 100 });
    expect(deltaE76(lab, lab)).toBeCloseTo(0, 5);
  });

  it("black vs white → large distance", () => {
    const labBlack = rgbToLab({ r: 0, g: 0, b: 0 });
    const labWhite = rgbToLab({ r: 255, g: 255, b: 255 });
    expect(deltaE76(labBlack, labWhite)).toBeGreaterThan(50);
  });
});

// ---------------------------------------------------------------------------
// deltaE2000
// ---------------------------------------------------------------------------
describe("deltaE2000", () => {
  it("same color → 0", () => {
    const lab = rgbToLab({ r: 150, g: 100, b: 50 });
    expect(deltaE2000(lab, lab)).toBeCloseTo(0, 3);
  });

  it("black vs white → large distance", () => {
    const labBlack = rgbToLab({ r: 0, g: 0, b: 0 });
    const labWhite = rgbToLab({ r: 255, g: 255, b: 255 });
    expect(deltaE2000(labBlack, labWhite)).toBeGreaterThan(30);
  });

  it("similar colors → small distance", () => {
    const lab1 = rgbToLab({ r: 200, g: 50, b: 50 });
    const lab2 = rgbToLab({ r: 205, g: 50, b: 50 });
    expect(deltaE2000(lab1, lab2)).toBeLessThan(5);
  });
});

// ---------------------------------------------------------------------------
// colorDistance
// ---------------------------------------------------------------------------
describe("colorDistance", () => {
  it("same color → 0", () => {
    expect(colorDistance({ r: 100, g: 150, b: 200 }, { r: 100, g: 150, b: 200 })).toBe(0);
  });

  it("red vs blue → > 0", () => {
    expect(colorDistance({ r: 255, g: 0, b: 0 }, { r: 0, g: 0, b: 255 })).toBeGreaterThan(0);
  });

  it("black vs white → ~441", () => {
    expect(colorDistance({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })).toBeCloseTo(
      Math.sqrt(3 * 255 * 255),
      0
    );
  });
});

// ---------------------------------------------------------------------------
// closestColor
// ---------------------------------------------------------------------------
describe("closestColor", () => {
  it("finds exact match", () => {
    const palette: RGB[] = [
      { r: 255, g: 0, b: 0 },
      { r: 0, g: 255, b: 0 },
      { r: 0, g: 0, b: 255 },
    ];
    expect(closestColor({ r: 0, g: 255, b: 0 }, palette)).toEqual({ r: 0, g: 255, b: 0 });
  });

  it("throws on empty palette", () => {
    expect(() => closestColor({ r: 0, g: 0, b: 0 }, [])).toThrow();
  });

  it("finds nearest when not exact", () => {
    const palette: RGB[] = [{ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }];
    const result = closestColor({ r: 100, g: 100, b: 100 }, palette);
    // 100,100,100 is closer to 0,0,0 than to 255,255,255
    expect(result).toEqual({ r: 0, g: 0, b: 0 });
  });
});

// ---------------------------------------------------------------------------
// sortByHue
// ---------------------------------------------------------------------------
describe("sortByHue", () => {
  it("sorts ascending by hue", () => {
    const colors: RGB[] = [
      { r: 0, g: 0, b: 255 },   // H=240
      { r: 255, g: 0, b: 0 },   // H=0
      { r: 0, g: 255, b: 0 },   // H=120
    ];
    const sorted = sortByHue(colors);
    const hues = sorted.map(c => rgbToHsl(c).h);
    expect(hues[0]!).toBeLessThanOrEqual(hues[1]!);
    expect(hues[1]!).toBeLessThanOrEqual(hues[2]!);
  });

  it("does not mutate original array", () => {
    const colors: RGB[] = [{ r: 0, g: 0, b: 255 }, { r: 255, g: 0, b: 0 }];
    const original = [...colors];
    sortByHue(colors);
    expect(colors).toEqual(original);
  });
});

// ---------------------------------------------------------------------------
// sortByLuminance
// ---------------------------------------------------------------------------
describe("sortByLuminance", () => {
  it("sorts darkest to lightest", () => {
    const colors: RGB[] = [
      { r: 255, g: 255, b: 255 }, // lightest
      { r: 0, g: 0, b: 0 },       // darkest
      { r: 128, g: 128, b: 128 }, // mid
    ];
    const sorted = sortByLuminance(colors);
    const lums = sorted.map(relativeLuminance);
    expect(lums[0]!).toBeLessThanOrEqual(lums[1]!);
    expect(lums[1]!).toBeLessThanOrEqual(lums[2]!);
  });
});

// ---------------------------------------------------------------------------
// isColorDark
// ---------------------------------------------------------------------------
describe("isColorDark", () => {
  it("black → dark", () => {
    expect(isColorDark({ r: 0, g: 0, b: 0 })).toBe(true);
  });

  it("white → not dark", () => {
    expect(isColorDark({ r: 255, g: 255, b: 255 })).toBe(false);
  });

  it("dark navy → dark", () => {
    expect(isColorDark({ r: 0, g: 0, b: 100 })).toBe(true);
  });

  it("yellow → not dark", () => {
    expect(isColorDark({ r: 255, g: 255, b: 0 })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isDominantColor
// ---------------------------------------------------------------------------
describe("isDominantColor", () => {
  it("empty palette → false", () => {
    expect(isDominantColor({ r: 255, g: 0, b: 0 }, [])).toBe(false);
  });

  it("target is very similar to palette → true with small threshold", () => {
    const palette: RGB[] = [
      { r: 253, g: 1, b: 1 },
      { r: 255, g: 2, b: 0 },
    ];
    expect(isDominantColor({ r: 255, g: 0, b: 0 }, palette, 10)).toBe(true);
  });

  it("target is far from palette → false", () => {
    const palette: RGB[] = [{ r: 0, g: 0, b: 0 }];
    expect(isDominantColor({ r: 255, g: 255, b: 255 }, palette, 30)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// generateTeamPalette
// ---------------------------------------------------------------------------
describe("generateTeamPalette", () => {
  it("returns all required keys", () => {
    const palette = generateTeamPalette({ r: 0, g: 100, b: 200 }, { r: 200, g: 50, b: 0 });
    expect(palette).toHaveProperty("primary");
    expect(palette).toHaveProperty("secondary");
    expect(palette).toHaveProperty("accent");
    expect(palette).toHaveProperty("background");
    expect(palette).toHaveProperty("text");
  });

  it("primary is preserved", () => {
    const primary: RGB = { r: 0, g: 100, b: 200 };
    const palette = generateTeamPalette(primary, { r: 200, g: 50, b: 0 });
    expect(palette.primary).toEqual(primary);
  });

  it("secondary is preserved", () => {
    const secondary: RGB = { r: 200, g: 50, b: 0 };
    const palette = generateTeamPalette({ r: 0, g: 100, b: 200 }, secondary);
    expect(palette.secondary).toEqual(secondary);
  });

  it("text is either black or white", () => {
    const palette = generateTeamPalette({ r: 0, g: 0, b: 200 }, { r: 200, g: 50, b: 0 });
    const isBlack = palette.text.r === 0 && palette.text.g === 0 && palette.text.b === 0;
    const isWhite = palette.text.r === 255 && palette.text.g === 255 && palette.text.b === 255;
    expect(isBlack || isWhite).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// uniformContrast
// ---------------------------------------------------------------------------
describe("uniformContrast", () => {
  it("returns home and away keys", () => {
    const result = uniformContrast({ r: 0, g: 100, b: 200 });
    expect(result).toHaveProperty("home");
    expect(result).toHaveProperty("away");
  });

  it("home is the team color", () => {
    const team: RGB = { r: 0, g: 100, b: 200 };
    expect(uniformContrast(team).home).toEqual(team);
  });

  it("dark team → away is lightened", () => {
    const team: RGB = { r: 0, g: 0, b: 50 }; // dark, best text = white
    const result = uniformContrast(team);
    const awayL = rgbToHsl(result.away).l;
    const teamL = rgbToHsl(team).l;
    expect(awayL).toBeGreaterThan(teamL);
  });
});

// ---------------------------------------------------------------------------
// hexToTeamName
// ---------------------------------------------------------------------------
describe("hexToTeamName", () => {
  const teamColors: Record<string, string> = {
    Lakers: "#552583",
    Celtics: "#007A33",
    Heat: "#98002E",
  };

  it("finds closest team within threshold", () => {
    const result = hexToTeamName("#552583", teamColors);
    expect(result).toBe("Lakers");
  });

  it("returns null when no team within 50 distance", () => {
    const result = hexToTeamName("#ffffff", teamColors);
    expect(result).toBeNull();
  });

  it("returns null for invalid hex", () => {
    const result = hexToTeamName("not-a-color", teamColors);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// colorblindSafe
// ---------------------------------------------------------------------------
describe("colorblindSafe", () => {
  it("black on white → safe", () => {
    expect(colorblindSafe({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })).toBe(true);
  });

  it("light gray on white → not safe", () => {
    // Very low contrast colors
    expect(colorblindSafe({ r: 230, g: 230, b: 230 }, { r: 255, g: 255, b: 255 })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Legacy: parseHexRgba
// ---------------------------------------------------------------------------
describe("parseHexRgba", () => {
  it("parses #RRGGBB with alpha=1.0", () => {
    const result = parseHexRgba("#ff0000");
    expect(result).toEqual({ r: 255, g: 0, b: 0, a: 1 });
  });

  it("parses #RRGGBBAA with alpha value", () => {
    const result = parseHexRgba("#FF000080");
    expect(result.r).toBe(255);
    expect(result.a).toBeCloseTo(128 / 255, 2);
  });

  it("parses #RRGGBB00 alpha → close to 0", () => {
    const result = parseHexRgba("#FF000000");
    expect(result.a).toBeCloseTo(0, 1);
  });

  it("throws on invalid hex", () => {
    expect(() => parseHexRgba("not-a-color")).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Legacy: parseColor
// ---------------------------------------------------------------------------
describe("parseColor", () => {
  it("dispatches #hex strings to parseHex", () => {
    expect(parseColor("#00ff00")).toEqual({ r: 0, g: 255, b: 0 });
  });

  it("dispatches rgb() strings to parseRgbString", () => {
    expect(parseColor("rgb(0, 0, 255)")).toEqual({ r: 0, g: 0, b: 255 });
  });

  it("throws on unknown format", () => {
    expect(() => parseColor("blue")).toThrow();
  });
});

// ---------------------------------------------------------------------------
// toHexFull / toRgbaString / toHslString
// ---------------------------------------------------------------------------
describe("toHexFull", () => {
  it("includes alpha channel", () => {
    expect(toHexFull({ r: 255, g: 0, b: 0, a: 1 })).toBe("#ff0000ff");
  });

  it("encodes semi-transparent alpha", () => {
    expect(toHexFull({ r: 0, g: 0, b: 0, a: 0 })).toBe("#00000000");
  });
});

describe("toRgbaString", () => {
  it("returns 'rgba(r, g, b, a)' format", () => {
    expect(toRgbaString({ r: 0, g: 0, b: 255, a: 0.5 })).toBe("rgba(0, 0, 255, 0.5)");
  });
});

describe("toHslString", () => {
  it("returns 'hsl(h, s%, l%)' format", () => {
    expect(toHslString({ h: 0, s: 100, l: 50 })).toBe("hsl(0, 100%, 50%)");
  });
});

// ---------------------------------------------------------------------------
// Legacy: wcagLevel
// ---------------------------------------------------------------------------
describe("wcagLevel", () => {
  it("21 → AAA", () => expect(wcagLevel(21)).toBe("AAA"));
  it("7.0 → AAA (boundary)", () => expect(wcagLevel(7.0)).toBe("AAA"));
  it("5.0 → AA", () => expect(wcagLevel(5.0)).toBe("AA"));
  it("4.5 → AA (boundary)", () => expect(wcagLevel(4.5)).toBe("AA"));
  it("3.5 → AA Large", () => expect(wcagLevel(3.5)).toBe("AA Large"));
  it("3.0 → AA Large (boundary)", () => expect(wcagLevel(3.0)).toBe("AA Large"));
  it("2.9 → Fail", () => expect(wcagLevel(2.9)).toBe("Fail"));
  it("1.0 → Fail", () => expect(wcagLevel(1.0)).toBe("Fail"));
});

// ---------------------------------------------------------------------------
// Legacy: isAccessible
// ---------------------------------------------------------------------------
describe("isAccessible", () => {
  it("black on white = true for AA", () => {
    expect(isAccessible({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })).toBe(true);
  });

  it("black on white = true for AAA", () => {
    expect(isAccessible({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }, "AAA")).toBe(true);
  });

  it("light gray on white = false for AA", () => {
    expect(isAccessible({ r: 204, g: 204, b: 204 }, { r: 255, g: 255, b: 255 })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Legacy: namedColors / colorName
// ---------------------------------------------------------------------------
describe("namedColors", () => {
  it("has at least 13 entries", () => {
    expect(Object.keys(namedColors).length).toBeGreaterThanOrEqual(13);
  });

  it("black is {r:0,g:0,b:0}", () => {
    expect(namedColors.black).toEqual({ r: 0, g: 0, b: 0 });
  });

  it("white is {r:255,g:255,b:255}", () => {
    expect(namedColors.white).toEqual({ r: 255, g: 255, b: 255 });
  });
});

describe("colorName", () => {
  it("exact black → 'black'", () => {
    expect(colorName({ r: 0, g: 0, b: 0 })).toBe("black");
  });

  it("exact white → 'white'", () => {
    expect(colorName({ r: 255, g: 255, b: 255 })).toBe("white");
  });

  it("exact red → 'red'", () => {
    expect(colorName({ r: 255, g: 0, b: 0 })).toBe("red");
  });

  it("color far from all named colors → null", () => {
    const result = colorName({ r: 80, g: 80, b: 80 });
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Legacy: perceptualDistance
// ---------------------------------------------------------------------------
describe("perceptualDistance", () => {
  it("same color → 0", () => {
    expect(perceptualDistance({ r: 100, g: 100, b: 100 }, { r: 100, g: 100, b: 100 })).toBe(0);
  });

  it("differs from euclidean (green more sensitive)", () => {
    const base: RGB = { r: 128, g: 128, b: 128 };
    const greenShift: RGB = { r: 128, g: 180, b: 128 };
    const redShift: RGB = { r: 180, g: 128, b: 128 };
    const percGreen = perceptualDistance(base, greenShift);
    const percRed = perceptualDistance(base, redShift);
    expect(percGreen).toBeGreaterThan(percRed);
  });
});

// ---------------------------------------------------------------------------
// Legacy: colorTemperature
// ---------------------------------------------------------------------------
describe("colorTemperature", () => {
  it("red → warm", () => {
    expect(colorTemperature({ r: 255, g: 0, b: 0 })).toBe("warm");
  });

  it("blue → cool", () => {
    expect(colorTemperature({ r: 0, g: 0, b: 255 })).toBe("cool");
  });

  it("pure gray → neutral (low saturation)", () => {
    expect(colorTemperature({ r: 128, g: 128, b: 128 })).toBe("neutral");
  });
});

// ---------------------------------------------------------------------------
// Legacy: hexToTailwindRgb / cssVarColor
// ---------------------------------------------------------------------------
describe("hexToTailwindRgb", () => {
  it("#ff0000 → '255 0 0'", () => {
    expect(hexToTailwindRgb("#ff0000")).toBe("255 0 0");
  });

  it("#ffffff → '255 255 255'", () => {
    expect(hexToTailwindRgb("#ffffff")).toBe("255 255 255");
  });

  it("#000000 → '0 0 0'", () => {
    expect(hexToTailwindRgb("#000000")).toBe("0 0 0");
  });
});

describe("cssVarColor", () => {
  it("returns CSS custom property declaration", () => {
    expect(cssVarColor("#ff0000", "brand-red")).toBe("--brand-red: 255 0 0;");
  });
});

// ---------------------------------------------------------------------------
// Legacy: hexToRgb / rgbToHex
// ---------------------------------------------------------------------------
describe("legacy: hexToRgb", () => {
  it("parses valid hex", () => {
    expect(hexToRgb("#ff0000")).toEqual({ r: 255, g: 0, b: 0 });
  });

  it("returns null for invalid hex (backward compat)", () => {
    expect(hexToRgb("not-a-color")).toBeNull();
  });
});

describe("legacy: rgbToHex", () => {
  it("converts red to #ff0000", () => {
    expect(rgbToHex(255, 0, 0)).toBe("#ff0000");
  });
});

// ---------------------------------------------------------------------------
// Legacy: hexToHsl / hslToHex
// ---------------------------------------------------------------------------
describe("legacy: hexToHsl / hslToHex", () => {
  it("hexToHsl converts #ff0000 to hsl", () => {
    const hsl = hexToHsl("#ff0000");
    expect(hsl?.h).toBeCloseTo(0, 0);
    expect(hsl?.s).toBeCloseTo(100, 0);
    expect(hsl?.l).toBeCloseTo(50, 0);
  });

  it("hslToHex converts back to hex", () => {
    expect(hslToHex(0, 100, 50)).toBe("#ff0000");
  });
});

// ---------------------------------------------------------------------------
// Legacy: wcagGrade
// ---------------------------------------------------------------------------
describe("legacy: wcagGrade", () => {
  it("21 → AAA", () => expect(wcagGrade(21)).toBe("AAA"));
  it("3.5 → AA-Large", () => expect(wcagGrade(3.5)).toBe("AA-Large"));
});

// ---------------------------------------------------------------------------
// Legacy: meetsWcagAa
// ---------------------------------------------------------------------------
describe("legacy: meetsWcagAa", () => {
  it("black on white → true", () => {
    expect(meetsWcagAa("#000000", "#ffffff")).toBe(true);
  });

  it("light gray on white → false", () => {
    expect(meetsWcagAa("#cccccc", "#ffffff")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Legacy: mixColors
// ---------------------------------------------------------------------------
describe("legacy: mixColors", () => {
  it("ratio=0 → first color", () => {
    expect(mixColors("#ff0000", "#0000ff", 0)).toBe("#ff0000");
  });

  it("ratio=1 → second color", () => {
    expect(mixColors("#ff0000", "#0000ff", 1)).toBe("#0000ff");
  });

  it("returns null for invalid input", () => {
    expect(mixColors("bad", "#0000ff", 0.5)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Legacy: getTextColor
// ---------------------------------------------------------------------------
describe("legacy: getTextColor", () => {
  it("dark background → #FFFFFF", () => {
    expect(getTextColor("#000000")).toBe("#FFFFFF");
  });

  it("light background → #000000", () => {
    expect(getTextColor("#ffffff")).toBe("#000000");
  });
});

// ---------------------------------------------------------------------------
// Legacy: cssVarValue / hslCss
// ---------------------------------------------------------------------------
describe("legacy: cssVarValue / hslCss", () => {
  it("cssVarValue wraps in var(--...)", () => {
    expect(cssVarValue("primary")).toBe("var(--primary)");
  });

  it("cssVarValue includes fallback", () => {
    expect(cssVarValue("primary", "#fff")).toBe("var(--primary, #fff)");
  });

  it("hslCss produces CSS4 syntax", () => {
    expect(hslCss(240, 100, 50)).toBe("hsl(240 100% 50%)");
  });

  it("hslCss with alpha", () => {
    expect(hslCss(240, 100, 50, 0.5)).toBe("hsl(240 100% 50% / 0.5)");
  });
});

// ---------------------------------------------------------------------------
// Legacy: parseColorToRgb
// ---------------------------------------------------------------------------
describe("legacy: parseColorToRgb", () => {
  it("parses hex", () => {
    expect(parseColorToRgb("#00ff00")).toEqual({ r: 0, g: 255, b: 0 });
  });

  it("returns null for non-hex", () => {
    expect(parseColorToRgb("rgb(0,0,0)")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Legacy: analogousColors
// ---------------------------------------------------------------------------
describe("legacy: analogousColors", () => {
  it("returns 3 colors by default", () => {
    const result = analogousColors({ h: 180, s: 100, l: 50 });
    expect(result).toHaveLength(3);
  });

  it("base hue is in the result", () => {
    const result = analogousColors({ h: 180, s: 80, l: 50 }, 30, 3);
    expect(result.map((c) => c.h)).toContain(180);
  });
});

// ---------------------------------------------------------------------------
// Legacy palette functions
// ---------------------------------------------------------------------------
describe("splitComplementaryLegacy", () => {
  it("returns 3 colors", () => {
    expect(splitComplementaryLegacy({ r: 255, g: 0, b: 0 })).toHaveLength(3);
  });

  it("first element is original", () => {
    const rgb: RGB = { r: 255, g: 0, b: 0 };
    expect(splitComplementaryLegacy(rgb)[0]).toEqual(rgb);
  });

  it("second color is hue+150, third is hue+210", () => {
    const [, b2, b3] = splitComplementaryLegacy({ r: 255, g: 0, b: 0 });
    const h2 = rgbToHsl(b2).h;
    const h3 = rgbToHsl(b3).h;
    expect(Math.abs(h2 - 150)).toBeLessThan(3);
    expect(Math.abs(h3 - 210)).toBeLessThan(3);
  });
});

describe("triadicLegacy", () => {
  it("returns 3 colors, each 120° apart in hue", () => {
    const result = triadicLegacy({ r: 255, g: 0, b: 0 });
    expect(result).toHaveLength(3);
    const hues = result.map((c) => rgbToHsl(c).h);
    expect(Math.abs(hues[0]! - 0)).toBeLessThan(3);
    expect(Math.abs(hues[1]! - 120)).toBeLessThan(3);
    expect(Math.abs(hues[2]! - 240)).toBeLessThan(3);
  });
});

describe("analogousLegacy", () => {
  it("returns 3 colors", () => {
    expect(analogousLegacy({ r: 255, g: 0, b: 0 })).toHaveLength(3);
  });

  it("first element is original", () => {
    const rgb: RGB = { r: 255, g: 0, b: 0 };
    expect(analogousLegacy(rgb)[0]).toEqual(rgb);
  });
});

describe("tetradicLegacy", () => {
  it("returns 4 colors, 90° apart", () => {
    const result = tetradicLegacy({ r: 255, g: 0, b: 0 });
    expect(result).toHaveLength(4);
    const hues = result.map((c) => rgbToHsl(c).h);
    expect(Math.abs(hues[0]! - 0)).toBeLessThan(3);
    expect(Math.abs(hues[1]! - 90)).toBeLessThan(3);
    expect(Math.abs(hues[2]! - 180)).toBeLessThan(3);
    expect(Math.abs(hues[3]! - 270)).toBeLessThan(3);
  });
});

describe("generateTints", () => {
  it("returns requested count of tints", () => {
    expect(generateTints({ r: 255, g: 0, b: 0 }, 5)).toHaveLength(5);
  });

  it("last tint is near-white (L ≈ 95)", () => {
    const tints = generateTints({ r: 255, g: 0, b: 0 }, 5);
    const last = tints[tints.length - 1];
    expect(rgbToHsl(last!).l).toBeCloseTo(95, 0);
  });
});

describe("generateShades", () => {
  it("returns requested count of shades", () => {
    expect(generateShades({ r: 255, g: 0, b: 0 }, 5)).toHaveLength(5);
  });

  it("last shade is near-black (L ≈ 5)", () => {
    const shades = generateShades({ r: 255, g: 0, b: 0 }, 5);
    const last = shades[shades.length - 1];
    expect(rgbToHsl(last!).l).toBeCloseTo(5, 0);
  });
});

describe("generatePalette", () => {
  it("has 9 entries by default (keys 100-900)", () => {
    const palette = generatePalette({ r: 59, g: 130, b: 246 });
    expect(Object.keys(palette)).toHaveLength(9);
    expect(palette[100]).toBeDefined();
    expect(palette[900]).toBeDefined();
  });

  it("100 is lighter than 900", () => {
    const palette = generatePalette({ r: 59, g: 130, b: 246 });
    const l100 = rgbToHsl(parseHex(palette[100]!)).l;
    const l900 = rgbToHsl(parseHex(palette[900]!)).l;
    expect(l100).toBeGreaterThan(l900);
  });

  it("custom step count", () => {
    const palette = generatePalette({ r: 255, g: 0, b: 0 }, 5);
    expect(Object.keys(palette)).toHaveLength(5);
  });
});

describe("findAccessibleColor", () => {
  it("returns color that meets AA contrast", () => {
    const background: RGB = { r: 255, g: 255, b: 255 };
    const base: RGB = { r: 200, g: 200, b: 200 };
    const result = findAccessibleColor(base, background, "AA");
    expect(contrastRatio(result, background)).toBeGreaterThanOrEqual(4.5);
  });
});
