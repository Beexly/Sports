import { describe, it, expect } from "vitest";
import {
  quantileBins,
  matchesPattern,
  patternSupport,
  descriptionLengthGain,
  meanEpa,
  supervisedMdlScore,
  topPatternsByScore,
  type Drive,
} from "./beep-pattern-mining.js";

// ============================================================
// arXiv 2307.11780v2 — Beep pattern mining. Additive invention.
// ============================================================

const drive = (id: string, attributes: Record<string, string>, epa: number): Drive => ({
  driveId: id,
  attributes,
  epa,
});

describe("beep pattern mining — 2307.11780v2", () => {
  it("quantileBins assigns k ordered bins", () => {
    const bins = quantileBins([10, 20, 30, 40], 2);
    expect(bins).toEqual([0, 0, 1, 1]);
    expect(quantileBins([], 3)).toEqual([]);
    expect(quantileBins([1, 2], 0)).toEqual([]);
  });

  it("matchesPattern checks all constraints", () => {
    const d = drive("d1", { personnel: "11", down: "2" }, 0.5);
    expect(matchesPattern(d, { constraints: { personnel: "11" } })).toBe(true);
    expect(matchesPattern(d, { constraints: { personnel: "12" } })).toBe(false);
    expect(
      matchesPattern(d, { constraints: { personnel: "11", down: "3" } }),
    ).toBe(false);
  });

  it("patternSupport counts matching drives", () => {
    const drives = [
      drive("d1", { personnel: "11" }, 0.5),
      drive("d2", { personnel: "12" }, -0.2),
      drive("d3", { personnel: "11" }, 0.8),
    ];
    expect(patternSupport({ constraints: { personnel: "11" } }, drives)).toBe(2);
  });

  it("descriptionLengthGain is the relative DL reduction", () => {
    expect(descriptionLengthGain(85, 100)).toBeCloseTo(0.15, 10);
    expect(descriptionLengthGain(100, 0)).toBe(0);
  });

  it("meanEpa averages", () => {
    expect(meanEpa([drive("a", {}, 1), drive("b", {}, 3)])).toBe(2);
    expect(meanEpa([])).toBe(0);
  });

  it("supervisedMdlScore adds the outcome-association bonus", () => {
    const base = supervisedMdlScore(0.15, 0.5, 0.5, 1);
    const bonus = supervisedMdlScore(0.15, 1.5, 0.5, 1);
    expect(bonus).toBeGreaterThan(base);
    expect(base).toBeCloseTo(0.15, 10);
  });

  it("topPatternsByScore ranks and caps at maxPatterns", () => {
    const drives = [
      drive("d1", { personnel: "11" }, 1.0),
      drive("d2", { personnel: "11" }, 1.2),
      drive("d3", { personnel: "12" }, -0.5),
    ];
    const cands = [
      { constraints: { personnel: "11" }, support: 2, descriptionLength: 10 },
      { constraints: { personnel: "12" }, support: 1, descriptionLength: 10 },
    ];
    const top = topPatternsByScore(cands, drives, 100, 1, 60);
    expect(top.length).toBe(2);
    // "11" has higher |E[EPA|p] - E[EPA]| than "12"... check ordering:
    // overall = 0.5667; E[11] = 1.1 -> |diff| = 0.5333; E[12] = -0.5 -> 1.0667.
    // "12" wins on the outcome bonus.
    expect(top[0]!.constraints.personnel).toBe("12");
    const capped = topPatternsByScore(cands, drives, 100, 1, 1);
    expect(capped.length).toBe(1);
  });
});
