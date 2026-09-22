/**
 * Tests for ./oddsmaker-entropy-filter (arXiv:1710.06551v2, lane=win_spread_total).
 *
 * ACCEPTANCE GATE: ADOPT the entropy filter as a GSE pick-selection input if, on the 2016-2024 walk-forward, the
 * k-lowest-entropy rule achieves positive ROI at -110 with >=200 wagers AND beats the wager-all
 * baseline by >=2 ROI points; REJECT otherwise.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./oddsmaker-entropy-filter";

describe("oddsmaker entropy filter (arXiv:1710.06551v2)", () => {
  const games = [
    { spread: -3, margin: 7 }, { spread: -3, margin: 10 }, { spread: -3, margin: 7 },
    { spread: -7, margin: 3 }, { spread: -7, margin: -3 }, { spread: -7, margin: 14 }, { spread: -7, margin: -10 },
    null,
  ];
  it("concentrated spread has lower entropy", () => {
    const rows = mod.conditionalEntropyBySpread(games);
    const h3 = rows.find((r) => r.spread === -3)!;
    const h7 = rows.find((r) => r.spread === -7)!;
    expect(h3.entropy).toBeLessThan(h7.entropy);
    expect(h3.pHomeCover).toBeCloseTo(1, 10);
  });
  it("lowEntropySpreads picks the tight one", () => {
    const rows = mod.conditionalEntropyBySpread(games);
    expect(mod.lowEntropySpreads(rows, 10, 1)).toEqual([-3]);
    expect(mod.lowEntropySpreads(rows, 0.0001, 5)).toEqual([]);
  });
  it("entropy of degenerate pmf is 0", () => {
    expect(mod.entropy(new Map([[7, 1]]))).toBeCloseTo(0, 10);
    expect(mod.entropy(new Map())).toBeNull();
  });
  it("argmaxSide", () => {
    expect(mod.argmaxSide(0.6)).toBe("home");
    expect(mod.argmaxSide(0.4)).toBe("away");
    expect(mod.argmaxSide(2)).toBeNull();
  });
  it("marginPMF null on empty", () => {
    expect(mod.marginPMF([])).toBeNull();
  });
});
