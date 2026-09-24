/**
 * Tests for ./sentiment-line-movement (arXiv:1610.09225v1, lane=markets).
 *
 * ACCEPTANCE GATE: ADOPT if time-ordered AUC gain >= 0.02 over the no-sentiment baseline; REJECT if the gain
 * vanishes once injury-report dummies are included (likely confound -- sentiment may just proxy
 * news).
 */

import { describe, expect, it } from "vitest";
import * as mod from "./sentiment-line-movement";

describe("sentiment line movement (arXiv:1610.09225v1)", () => {
  it("validates windows", () => {
    expect(mod.isSentimentWindow({ gameId: "g", pos: 3, neg: 1, neu: 2, baseline: [0.5] })).toBe(true);
    expect(mod.isSentimentWindow({ gameId: "g", pos: -1, neg: 1, neu: 2, baseline: [] })).toBe(false);
    expect(mod.isSentimentWindow(null)).toBe(false);
  });
  it("steam features", () => {
    const f = mod.steamFeatures({ gameId: "g", pos: 6, neg: 2, neu: 2, baseline: [0.1] });
    expect(f[0]).toBeCloseTo(0.4, 10);
    expect(f).toHaveLength(5);
  });
  it("logistic predict", () => {
    expect(mod.logisticPredict([1, 0], [2, 1], 0)).toBeCloseTo(1 / (1 + Math.exp(-2)), 10);
    expect(mod.logisticPredict([1], [1, 2], 0)).toBeNull();
  });
  it("move direction label", () => {
    expect(mod.moveDirectionLabel(-3, -1, 0.5)).toBe(1);
    expect(mod.moveDirectionLabel(-3, -5, 0.5)).toBe(0);
    expect(mod.moveDirectionLabel(-3, -3, 0.5)).toBeNull();
  });
  it("auc", () => {
    expect(mod.auc([0.9, 0.8, 0.2, 0.1], [1, 1, 0, 0])).toBeCloseTo(1, 10);
    expect(mod.auc([0.5], [1])).toBeNull();
  });
});
