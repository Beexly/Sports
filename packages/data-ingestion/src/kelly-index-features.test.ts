/**
 * Tests for ./kelly-index-features (arXiv:2211.15734v1, lane=markets).
 *
 * ACCEPTANCE GATE: Adopt the difficulty classifier iff the backtest shows gated picks beat ungated on ROI by >=3
 * percentage points with CLV>0 over 2020-2024; keep as monitoring metric only otherwise.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./kelly-index-features";

describe("Kelly index features (arXiv:2211.15734v1)", () => {
  const books = [
    { book: "a", home: 2.0, draw: 3.5, away: 4.0 },
    { book: "b", home: 1.9, draw: 3.6, away: 4.2 },
  ];
  it("devigged sums to 1", () => {
    const p = mod.devigged(books[0]!)!;
    expect(p.home + p.draw + p.away).toBeCloseTo(1, 10);
    expect(mod.devigged({ book: "x", home: 0.5, draw: 3, away: 4 } as never)).toBeNull();
  });
  it("kelly index centers on 1", () => {
    const ki = mod.kellyIndex(books)!;
    const meanK = ki.reduce((s, k) => s + k.kHome, 0) / ki.length;
    expect(meanK).toBeCloseTo(1, 10);
    expect(mod.kellyIndex([])).toBeNull();
  });
  it("consensus", () => {
    const c = mod.consensusProb(books)!;
    expect(c.home + c.draw + c.away).toBeCloseTo(1, 8);
  });
  it("dispersion", () => {
    expect(mod.kellyDispersion(books)!).toBeGreaterThanOrEqual(0);
    expect(mod.kellyDispersion([books[0]])).toBeNull();
  });
});
