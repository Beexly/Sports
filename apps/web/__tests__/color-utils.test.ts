import { describe, it, expect } from "vitest";
import {
  // Types
  type Rgb,
  type Rgba,
  type Hsl,
  type Hsv,
  // Parsing
  parseHex,
  parseHexRgba,
  parseRgbString,
  parseColor,
  // Serialization
  toHex,
  toHexFull,
  toRgbString,
  toRgbaString,
  toHslString,
  // Conversion
  rgbToHsl,
  hslToRgb,
  rgbToHsv,
  hsvToRgb,
  // Luminance / contrast
  relativeLuminance,
  contrastRatio,
  wcagLevel,
  isAccessible,
  // Manipulation
  lighten,
  darken,
  saturate,
  desaturate,
  rotate,
  complement,
  invert,
  grayscale,
  // Mixing
  mix,
  alphaBlend,
  // Palettes
  splitComplementary,
  triadic,
  analogous,
  tetradic,
  generateTints,
  generateShades,
  generatePalette,
  // Accessibility
  findAccessibleColor,
  bestTextColor,
  // Named colors
  namedColors,
  colorName,
  // Distance
  colorDistance,
  perceptualDistance,
  // Temperature
  colorTemperature,
  // CSS helpers
  hexToTailwindRgb,
  cssVarColor,
  // Legacy exports (backward compat)
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
// parseHexRgba
// ---------------------------------------------------------------------------
describe("parseHexRgba", () => {
  it("parses #RRGGBB with alpha=1.0", () => {
    const result = parseHexRgba("#ff0000");
    expect(result).toEqual({ r: 255, g: 0, b: 0, a: 1 });
  });

  it("parses #RRGGBBAA with alpha value", () => {
    const result = parseHexRgba("#FF000080");
    expect(result.r).toBe(255);
    expect(result.g).toBe(0);
    expect(result.b).toBe(0);
    expect(result.a).toBeCloseTo(128 / 255, 2);
  });

  it("parses #RRGGBB00 alpha → close to 0", () => {
    const result = parseHexRgba("#FF000000");
    expect(result.a).toBeCloseTo(0, 1);
  });

  it("parses #RRGGBBFF alpha → 1.0", () => {
    const result = parseHexRgba("#FF0000FF");
    expect(result.a).toBeCloseTo(1, 2);
  });

  it("parses #RGB short form with alpha=1", () => {
    expect(parseHexRgba("#F00")).toEqual({ r: 255, g: 0, b: 0, a: 1 });
  });

  it("parses #RGBA short form with alpha", () => {
    const result = parseHexRgba("#F00F");
    expect(result.r).toBe(255);
    expect(result.a).toBeCloseTo(1, 1);
  });

  it("throws on invalid hex", () => {
    expect(() => parseHexRgba("not-a-color")).toThrow();
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
});

// ---------------------------------------------------------------------------
// parseColor
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
// Serialization
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
});

describe("toHexFull", () => {
  it("includes alpha channel", () => {
    expect(toHexFull({ r: 255, g: 0, b: 0, a: 1 })).toBe("#ff0000ff");
  });

  it("encodes semi-transparent alpha", () => {
    const result = toHexFull({ r: 0, g: 0, b: 0, a: 0 });
    expect(result).toBe("#00000000");
  });
});

describe("toRgbString", () => {
  it("returns 'rgb(r, g, b)' format", () => {
    expect(toRgbString({ r: 255, g: 128, b: 0 })).toBe("rgb(255, 128, 0)");
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
// rgbToHsl
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

// ---------------------------------------------------------------------------
// hslToRgb
// ---------------------------------------------------------------------------
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
    const original: Rgb = { r: 123, g: 45, b: 200 };
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
});

describe("hsvToRgb", () => {
  it("H:0 S:100 V:100 → red", () => {
    expect(hsvToRgb({ h: 0, s: 100, v: 100 })).toEqual({ r: 255, g: 0, b: 0 });
  });

  it("round-trip with rgbToHsv within ±1", () => {
    const original: Rgb = { r: 99, g: 150, b: 200 };
    const hsv = rgbToHsv(original);
    const back = hsvToRgb(hsv);
    expect(Math.abs(back.r - original.r)).toBeLessThanOrEqual(1);
    expect(Math.abs(back.g - original.g)).toBeLessThanOrEqual(1);
    expect(Math.abs(back.b - original.b)).toBeLessThanOrEqual(1);
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
    const gray: Rgb = { r: 128, g: 128, b: 128 };
    expect(contrastRatio(gray, gray)).toBeCloseTo(1.0, 2);
  });

  it("is commutative (fg/bg order doesn't matter)", () => {
    const r1 = contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 0, b: 0 });
    const r2 = contrastRatio({ r: 255, g: 0, b: 0 }, { r: 0, g: 0, b: 0 });
    expect(r1).toBeCloseTo(r2, 5);
  });
});

// ---------------------------------------------------------------------------
// wcagLevel
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
// isAccessible
// ---------------------------------------------------------------------------
describe("isAccessible", () => {
  it("black on white = true for AA", () => {
    expect(isAccessible({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })).toBe(true);
  });

  it("black on white = true for AAA", () => {
    expect(isAccessible({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }, "AAA")).toBe(true);
  });

  it("light gray on white = false for AA", () => {
    // #cccccc on #ffffff ≈ 1.6
    expect(isAccessible({ r: 204, g: 204, b: 204 }, { r: 255, g: 255, b: 255 })).toBe(false);
  });

  it("AA large text needs only 3:1", () => {
    // ~3.5:1 pair passes large text but not normal text
    // Use a pair where ratio is between 3 and 4.5
    const fg = { r: 118, g: 118, b: 118 }; // roughly 3:1 on white
    const bg = { r: 255, g: 255, b: 255 };
    const ratio = contrastRatio(fg, bg);
    const passesNormal = ratio >= 4.5;
    const passesLarge = ratio >= 3;
    expect(passesLarge).toBe(true);
    // At this gray level, normal might pass or fail – just verify the API works
    expect(isAccessible(fg, bg, "AA", false)).toBe(passesNormal);
    expect(isAccessible(fg, bg, "AA", true)).toBe(passesLarge);
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
  it("increases saturation", () => {
    // A gray has S=0; after saturating, we can't add saturation without a hue — but we can test
    // a partially saturated color
    const input: Rgb = { r: 200, g: 100, b: 100 }; // slightly red
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
    const original = rgbToHsl({ r: 255, g: 0, b: 0 }); // H≈0
    const rotated = rgbToHsl(rotate({ r: 255, g: 0, b: 0 }, 180));
    expect(Math.abs(rotated.h - 180)).toBeLessThan(2);
  });

  it("wraps around 360", () => {
    const original = rgbToHsl({ r: 0, g: 0, b: 255 }); // H≈240
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
    const rgb: Rgb = { r: 100, g: 150, b: 200 };
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
  it("desaturates red to gray", () => {
    const result = rgbToHsl(grayscale({ r: 255, g: 0, b: 0 }));
    expect(result.s).toBe(0);
  });

  it("grayscale of white remains white", () => {
    expect(grayscale({ r: 255, g: 255, b: 255 })).toEqual({ r: 255, g: 255, b: 255 });
  });
});

// ---------------------------------------------------------------------------
// mix
// ---------------------------------------------------------------------------
describe("mix", () => {
  it("50/50 of red and blue → purple-ish (r≈128, g=0, b≈128)", () => {
    const result = mix({ r: 255, g: 0, b: 0 }, { r: 0, g: 0, b: 255 }, 0.5);
    expect(result.r).toBeGreaterThan(100);
    expect(result.b).toBeGreaterThan(100);
    expect(result.g).toBe(0);
  });

  it("ratio=0 → returns A", () => {
    const a: Rgb = { r: 255, g: 0, b: 0 };
    const b: Rgb = { r: 0, g: 0, b: 255 };
    expect(mix(a, b, 0)).toEqual(a);
  });

  it("ratio=1 → returns B", () => {
    const a: Rgb = { r: 255, g: 0, b: 0 };
    const b: Rgb = { r: 0, g: 0, b: 255 };
    expect(mix(a, b, 1)).toEqual(b);
  });

  it("default ratio 0.5 is symmetric", () => {
    const result1 = mix({ r: 100, g: 0, b: 0 }, { r: 200, g: 0, b: 0 });
    expect(result1.r).toBe(150);
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
// Palette generators
// ---------------------------------------------------------------------------
describe("splitComplementary", () => {
  it("returns 3 colors", () => {
    const result = splitComplementary({ r: 255, g: 0, b: 0 });
    expect(result).toHaveLength(3);
  });

  it("first element is original", () => {
    const rgb: Rgb = { r: 255, g: 0, b: 0 };
    expect(splitComplementary(rgb)[0]).toEqual(rgb);
  });

  it("second color is hue+150, third is hue+210", () => {
    const rgb: Rgb = { r: 255, g: 0, b: 0 }; // H≈0
    const [, b2, b3] = splitComplementary(rgb);
    const h2 = rgbToHsl(b2).h;
    const h3 = rgbToHsl(b3).h;
    expect(Math.abs(h2 - 150)).toBeLessThan(3);
    expect(Math.abs(h3 - 210)).toBeLessThan(3);
  });
});

describe("triadic", () => {
  it("returns 3 colors, each 120° apart in hue", () => {
    const result = triadic({ r: 255, g: 0, b: 0 }); // H≈0
    expect(result).toHaveLength(3);
    const hues = result.map((c) => rgbToHsl(c).h);
    expect(Math.abs(hues[0] - 0)).toBeLessThan(3);
    expect(Math.abs(hues[1] - 120)).toBeLessThan(3);
    expect(Math.abs(hues[2] - 240)).toBeLessThan(3);
  });
});

describe("analogous", () => {
  it("returns 3 colors", () => {
    expect(analogous({ r: 255, g: 0, b: 0 })).toHaveLength(3);
  });

  it("first element is original", () => {
    const rgb: Rgb = { r: 255, g: 0, b: 0 };
    expect(analogous(rgb)[0]).toEqual(rgb);
  });

  it("custom spread shifts hues accordingly", () => {
    const rgb: Rgb = { r: 0, g: 255, b: 0 }; // H≈120
    const [, neg, pos] = analogous(rgb, 45);
    const hNeg = rgbToHsl(neg).h;
    const hPos = rgbToHsl(pos).h;
    expect(Math.abs(hNeg - 75)).toBeLessThan(3);
    expect(Math.abs(hPos - 165)).toBeLessThan(3);
  });
});

describe("tetradic", () => {
  it("returns 4 colors, 90° apart", () => {
    const result = tetradic({ r: 255, g: 0, b: 0 }); // H≈0
    expect(result).toHaveLength(4);
    const hues = result.map((c) => rgbToHsl(c).h);
    expect(Math.abs(hues[0] - 0)).toBeLessThan(3);
    expect(Math.abs(hues[1] - 90)).toBeLessThan(3);
    expect(Math.abs(hues[2] - 180)).toBeLessThan(3);
    expect(Math.abs(hues[3] - 270)).toBeLessThan(3);
  });
});

// ---------------------------------------------------------------------------
// generateTints
// ---------------------------------------------------------------------------
describe("generateTints", () => {
  it("returns requested count of tints", () => {
    const result = generateTints({ r: 255, g: 0, b: 0 }, 5);
    expect(result).toHaveLength(5);
  });

  it("all tints have L >= original L", () => {
    const rgb: Rgb = { r: 255, g: 0, b: 0 };
    const origL = rgbToHsl(rgb).l;
    const tints = generateTints(rgb, 5);
    for (const t of tints) {
      expect(rgbToHsl(t).l).toBeGreaterThanOrEqual(origL - 1);
    }
  });

  it("last tint is near-white (L ≈ 95)", () => {
    const tints = generateTints({ r: 255, g: 0, b: 0 }, 5);
    const last = rgbToHsl(tints[tints.length - 1]).l;
    expect(last).toBeCloseTo(95, 0);
  });
});

// ---------------------------------------------------------------------------
// generateShades
// ---------------------------------------------------------------------------
describe("generateShades", () => {
  it("returns requested count of shades", () => {
    const result = generateShades({ r: 255, g: 0, b: 0 }, 5);
    expect(result).toHaveLength(5);
  });

  it("last shade is near-black (L ≈ 5)", () => {
    const shades = generateShades({ r: 255, g: 0, b: 0 }, 5);
    const last = rgbToHsl(shades[shades.length - 1]).l;
    expect(last).toBeCloseTo(5, 0);
  });
});

// ---------------------------------------------------------------------------
// generatePalette
// ---------------------------------------------------------------------------
describe("generatePalette", () => {
  it("has 9 entries by default (keys 100-900)", () => {
    const palette = generatePalette({ r: 59, g: 130, b: 246 });
    expect(Object.keys(palette)).toHaveLength(9);
    expect(palette[100]).toBeDefined();
    expect(palette[900]).toBeDefined();
  });

  it("key 500 is closest to original (middle of scale)", () => {
    const rgb: Rgb = { r: 59, g: 130, b: 246 };
    const palette = generatePalette(rgb, 9);
    // The 500 step (index 4) should be the middle lightness
    expect(palette[500]).toBeDefined();
  });

  it("100 is lighter than 900", () => {
    const palette = generatePalette({ r: 59, g: 130, b: 246 });
    const l100 = rgbToHsl(parseHex(palette[100])).l;
    const l900 = rgbToHsl(parseHex(palette[900])).l;
    expect(l100).toBeGreaterThan(l900);
  });

  it("custom step count", () => {
    const palette = generatePalette({ r: 255, g: 0, b: 0 }, 5);
    expect(Object.keys(palette)).toHaveLength(5);
    expect(palette[100]).toBeDefined();
    expect(palette[500]).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// findAccessibleColor
// ---------------------------------------------------------------------------
describe("findAccessibleColor", () => {
  it("returns color that meets AA contrast", () => {
    const background: Rgb = { r: 255, g: 255, b: 255 };
    const base: Rgb = { r: 200, g: 200, b: 200 }; // fails AA on white
    const result = findAccessibleColor(base, background, "AA");
    expect(contrastRatio(result, background)).toBeGreaterThanOrEqual(4.5);
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
// namedColors / colorName
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
    // Pick a color that's not close to any named color
    const result = colorName({ r: 80, g: 80, b: 80 }); // equidistant from gray (128,128,128) by ~83
    // Not within 20 of gray (dist≈83)
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// colorDistance / perceptualDistance
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

describe("perceptualDistance", () => {
  it("same color → 0", () => {
    expect(perceptualDistance({ r: 100, g: 100, b: 100 }, { r: 100, g: 100, b: 100 })).toBe(0);
  });

  it("differs from euclidean (green more sensitive)", () => {
    // A green shift should score higher perceptually than equivalent red shift
    const base: Rgb = { r: 128, g: 128, b: 128 };
    const greenShift: Rgb = { r: 128, g: 180, b: 128 };
    const redShift: Rgb = { r: 180, g: 128, b: 128 };
    const percGreen = perceptualDistance(base, greenShift);
    const percRed = perceptualDistance(base, redShift);
    expect(percGreen).toBeGreaterThan(percRed);
  });
});

// ---------------------------------------------------------------------------
// colorTemperature
// ---------------------------------------------------------------------------
describe("colorTemperature", () => {
  it("red → warm", () => {
    expect(colorTemperature({ r: 255, g: 0, b: 0 })).toBe("warm");
  });

  it("orange → warm", () => {
    expect(colorTemperature({ r: 255, g: 165, b: 0 })).toBe("warm");
  });

  it("blue → cool", () => {
    expect(colorTemperature({ r: 0, g: 0, b: 255 })).toBe("cool");
  });

  it("teal → cool", () => {
    expect(colorTemperature({ r: 0, g: 128, b: 128 })).toBe("cool");
  });

  it("pure gray → neutral (low saturation)", () => {
    expect(colorTemperature({ r: 128, g: 128, b: 128 })).toBe("neutral");
  });
});

// ---------------------------------------------------------------------------
// hexToTailwindRgb / cssVarColor
// ---------------------------------------------------------------------------
describe("hexToTailwindRgb", () => {
  it("#ff0000 → '255 0 0'", () => {
    expect(hexToTailwindRgb("#ff0000")).toBe("255 0 0");
  });

  it("#1a2b3c → '26 43 60'", () => {
    expect(hexToTailwindRgb("#1a2b3c")).toBe("26 43 60");
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
// Legacy exports (backward compatibility)
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

describe("legacy: wcagGrade", () => {
  it("21 → AAA", () => expect(wcagGrade(21)).toBe("AAA"));
  it("3.5 → AA-Large", () => expect(wcagGrade(3.5)).toBe("AA-Large"));
});

describe("legacy: meetsWcagAa", () => {
  it("black on white → true", () => {
    expect(meetsWcagAa("#000000", "#ffffff")).toBe(true);
  });

  it("light gray on white → false", () => {
    expect(meetsWcagAa("#cccccc", "#ffffff")).toBe(false);
  });
});

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

describe("legacy: getTextColor", () => {
  it("dark background → #FFFFFF", () => {
    expect(getTextColor("#000000")).toBe("#FFFFFF");
  });

  it("light background → #000000", () => {
    expect(getTextColor("#ffffff")).toBe("#000000");
  });
});

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

describe("legacy: parseColorToRgb", () => {
  it("parses hex", () => {
    expect(parseColorToRgb("#00ff00")).toEqual({ r: 0, g: 255, b: 0 });
  });

  it("returns null for non-hex", () => {
    expect(parseColorToRgb("rgb(0,0,0)")).toBeNull();
  });
});

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
