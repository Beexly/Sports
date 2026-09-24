/**
 * Tests for ./dixon-coles-goals (arXiv:2307.02139v1, lane=tracking).
 *
 * ACCEPTANCE GATE: Adopt the Sarmanov/ANS challenger only if: (a) the reproduction confirms the paper's mechanism
 * (ANS AIC-best on women's data, correlation range reproduced); AND (b) on the NFL TD-count
 * transfer, Sarmanov beats independent NB on out-of-sample mean per-game log-likelihood over
 * 2023-2025 with p < 0.05 (paired test), AND (c) implied-total calibration shows no degradation vs
 * the current production baseline.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./dixon-coles-goals";

describe("Dixon-Coles goals (arXiv:2307.02139v1)", () => {
  it("tau correction at low scores", () => {
    expect(mod.dcTau(0, 0, 1.5, 1.2, -0.1)).toBeCloseTo(1 - 1.5 * 1.2 * -0.1, 10);
    expect(mod.dcTau(2, 2, 1.5, 1.2, -0.1)).toBe(1);
    expect(mod.dcTau(0, 0, 0, 1.2, -0.1)).toBeNull();
  });
  it("outcome probs sum to 1", () => {
    const o = mod.outcomeProbs(1.5, 1.2, -0.1)!;
    expect(o.home + o.draw + o.away).toBeCloseTo(1, 6);
    expect(o.home).toBeGreaterThan(o.away);
    expect(mod.outcomeProbs(0, 1.2, 0)).toBeNull();
  });
  it("attack/defence learns ordering", () => {
    const games = [
      ...Array.from({ length: 10 }, () => ({ home: "A", away: "B", homeGoals: 3, awayGoals: 0 })),
      ...Array.from({ length: 10 }, () => ({ home: "B", away: "A", homeGoals: 0, awayGoals: 2 })),
    ];
    const f = mod.attackDefence(games, ["A", "B"], 100)!;
    expect(f.attack["A"]).toBeGreaterThan(f.attack["B"]!);
    expect(mod.attackDefence([], ["A"])).toBeNull();
  });
  it("isGoalGame rejects malformed", () => {
    expect(mod.isGoalGame({ home: "A", away: "B", homeGoals: -1, awayGoals: 0 })).toBe(false);
  });
});
