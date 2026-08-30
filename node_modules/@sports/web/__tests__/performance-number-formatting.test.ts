import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BREAKEVEN_WIN_PCT,
  NUMERIC_TEXT_CLASS,
  STAT_PLACEHOLDER,
  formatBrier,
  formatCount,
  formatPercent,
  formatRatioAsPercent,
  formatScalar,
  winRatePct,
  winRateToneClass,
} from "@/lib/format/stat";

/**
 * Owner standard (docs/POLISH_BACKLOG.md #4): performance/calibration surfaces
 * use ONE formatting policy — tabular numerals everywhere, one-decimal rates,
 * three-decimal Brier, grouped counts, em-dash for missing data — and world
 * tokens, never raw Tailwind palette classes. These tests pin both halves so
 * the trust surfaces can't drift back to ad-hoc toFixed calls or SaaS gray.
 */

const ROOT = join(__dirname, "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

const PERFORMANCE_SURFACES = [
  "app/performance/page.tsx",
  "app/performance/losses/page.tsx",
  "app/performance/losses/[id]/page.tsx",
  "components/performance/bootstrap-state.tsx",
  "components/performance/calibration-panel.tsx",
];

describe("stat formatter — one policy for public numbers", () => {
  it("formats rates to one decimal", () => {
    expect(formatPercent(57.345)).toBe("57.3%");
    expect(formatPercent(60)).toBe("60.0%");
    expect(formatRatioAsPercent(0.524)).toBe("52.4%");
  });

  it("formats Brier to three decimals (the sanctioned exception)", () => {
    expect(formatBrier(0.2)).toBe("0.200");
    expect(formatBrier(0.2134)).toBe("0.213");
  });

  it("formats counts with grouping", () => {
    expect(formatCount(1204)).toBe("1,204");
    expect(formatCount(7)).toBe("7");
  });

  it("formats scalars (edge scores) to one decimal", () => {
    expect(formatScalar(7.25)).toBe("7.3");
  });

  it("renders the em-dash placeholder for missing data — never zero", () => {
    for (const fn of [formatPercent, formatRatioAsPercent, formatBrier, formatCount, formatScalar]) {
      expect(fn(null)).toBe(STAT_PLACEHOLDER);
      expect(fn(undefined)).toBe(STAT_PLACEHOLDER);
      expect(fn(Number.NaN)).toBe(STAT_PLACEHOLDER);
    }
  });

  it("win rate excludes pushes and is null (not 0) before any decided pick", () => {
    expect(winRatePct(0, 0)).toBeNull();
    expect(winRatePct(6, 4)).toBe(60);
  });

  it("tones anchor on the -110 breakeven, never a casino green/red ramp", () => {
    expect(BREAKEVEN_WIN_PCT).toBeCloseTo(52.4);
    expect(winRateToneClass(57)).toBe("text-orbital-cyan");
    expect(winRateToneClass(53)).toBe("text-ion-white");
    expect(winRateToneClass(51)).toBe("text-caution");
    expect(winRateToneClass(48)).toBe("text-alert");
    expect(winRateToneClass(null)).toBe("text-ion-2");
  });
});

describe("performance surfaces — tabular numerals + world tokens", () => {
  it("NUMERIC_TEXT_CLASS carries tabular figures", () => {
    expect(NUMERIC_TEXT_CLASS).toContain("font-numerals");
    expect(NUMERIC_TEXT_CLASS).toContain("tabular-nums");
  });

  it.each(PERFORMANCE_SURFACES)("%s uses no raw Tailwind palette classes", (file) => {
    const src = read(file);
    const raw = src.match(
      /(?:text|bg|border|divide|from|to|fill|stroke)-(?:gray|green|red|yellow|amber|emerald|cyan|pink|orange|blue|purple|slate|zinc|neutral|stone)-\d+/g
    );
    expect(raw ?? []).toEqual([]);
  });

  it.each([
    "app/performance/page.tsx",
    "components/performance/calibration-panel.tsx",
  ])("%s renders numerals through the shared stat formatter", (file) => {
    const src = read(file);
    expect(src).toMatch(/from "@\/lib\/format\/stat"/);
    expect(src).toMatch(/NUMERIC_TEXT_CLASS/);
  });

  it("the calibration report page never calls toFixed directly", () => {
    // All number→string conversion goes through lib/format/stat so the
    // decimal policy lives in exactly one place.
    expect(read("app/performance/page.tsx")).not.toMatch(/\.toFixed\(/);
    expect(read("components/performance/calibration-panel.tsx")).not.toMatch(
      /\.toFixed\(/
    );
  });
});
