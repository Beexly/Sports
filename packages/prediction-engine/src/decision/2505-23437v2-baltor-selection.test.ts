// Tests for decision/2505-23437v2-baltor-selection.ts (vitest).
import { describe, it, expect } from "vitest";
import {
  conformalQuantile,
  mondrianThreshold,
  baltorSelect,
  hitRate,
  baltorGate,
  type CalibPick,
  type CandidatePick,
} from "./2505-23437v2-baltor-selection.js";

const CALIB: CalibPick[] = [
  // plus class: hits concentrate at high confidence
  { confidence: 0.9, hit: 1, cls: "plus" },
  { confidence: 0.85, hit: 1, cls: "plus" },
  { confidence: 0.8, hit: 1, cls: "plus" },
  { confidence: 0.75, hit: 0, cls: "plus" },
  { confidence: 0.7, hit: 1, cls: "plus" },
  { confidence: 0.6, hit: 0, cls: "plus" },
  { confidence: 0.55, hit: 0, cls: "plus" },
  // minus class: weaker
  { confidence: 0.9, hit: 1, cls: "minus" },
  { confidence: 0.8, hit: 0, cls: "minus" },
  { confidence: 0.7, hit: 0, cls: "minus" },
  { confidence: 0.6, hit: 1, cls: "minus" },
  { confidence: 0.5, hit: 0, cls: "minus" },
];

describe("conformalQuantile", () => {
  it("uses the finite-sample ceil((n+1)(1-a))/n rule", () => {
    expect(conformalQuantile([1, 2, 3, 4, 5], 0.2)).toBe(5); // ceil(6*0.8)=5 -> 5th
    expect(conformalQuantile([], 0.1)).toBe(Infinity);
  });
});

describe("mondrianThreshold", () => {
  it("controls conditional risk per class at alpha", () => {
    const tPlus = mondrianThreshold(CALIB, "plus", 0.3);
    const above = CALIB.filter((p) => p.cls === "plus" && p.confidence >= tPlus);
    const risk = 1 - above.reduce((a, p) => a + p.hit, 0) / above.length;
    expect(risk).toBeLessThanOrEqual(0.3 + 1e-9);
    expect(tPlus).toBeLessThan(1);
  });
  it("is stricter for the weaker class", () => {
    const tPlus = mondrianThreshold(CALIB, "plus", 0.3);
    const tMinus = mondrianThreshold(CALIB, "minus", 0.3);
    expect(tMinus).toBeGreaterThanOrEqual(tPlus);
  });
  it("returns 1 (select nothing) when no threshold controls risk", () => {
    const bad: CalibPick[] = [
      { confidence: 0.9, hit: 0, cls: "plus" },
      { confidence: 0.8, hit: 0, cls: "plus" },
    ];
    expect(mondrianThreshold(bad, "plus", 0.1)).toBe(1);
  });
});

describe("baltorSelect + baltorGate", () => {
  const picks: CandidatePick[] = [
    { id: "a", confidence: 0.9, cls: "plus" },
    { id: "b", confidence: 0.72, cls: "plus" },
    { id: "c", confidence: 0.65, cls: "plus" },
    { id: "d", confidence: 0.95, cls: "minus" },
    { id: "e", confidence: 0.5, cls: "minus" },
  ];
  it("selects only picks clearing their class threshold", () => {
    const thresholds = { plus: mondrianThreshold(CALIB, "plus", 0.3), minus: mondrianThreshold(CALIB, "minus", 0.3) };
    const sel = baltorSelect(picks, thresholds);
    for (const p of sel) expect(p.confidence).toBeGreaterThanOrEqual(thresholds[p.cls]);
    expect(sel.length).toBeGreaterThan(0);
    expect(sel.length).toBeLessThan(picks.length); // bounded abstention bites
  });
  it("gate passes on a good window, fails on a bad one", () => {
    const sel: CandidatePick[] = [
      { id: "a", confidence: 0.9, cls: "plus" },
      { id: "b", confidence: 0.85, cls: "plus" },
    ];
    // 70% hit rate: 7 hits / 10 selected
    const many: CandidatePick[] = Array.from({ length: 10 }, (_, i) => ({ id: `p${i}`, confidence: 0.9, cls: "plus" as const }));
    const outcomes: Record<string, number> = {};
    many.forEach((p, i) => (outcomes[p.id] = i < 7 ? 1 : 0));
    const good = baltorGate(many, outcomes, 0.5, 0.7);
    expect(good.hitRate).toBeCloseTo(0.7, 10);
    expect(good.passes).toBe(true);
    expect(hitRate(sel, { a: 1, b: 0 })).toBeCloseTo(0.5, 10);
    const bad = baltorGate(many, Object.fromEntries(many.map((p) => [p.id, 0])), 0.5, 0.7);
    expect(bad.passes).toBe(false);
  });
});
