/**
 * Vitest suite for arXiv:2602.21307v2 (SymTorch: A Framework for Symbolic Distillation of Deep Neural Networks).
 * Gate: ADOPT if the distilled equation uses <=10 terms AND matches the neural head within 0.01 MAE on the held-out 2025 Weeks 1-4 window AND beats the linear baseline by >=20% MAE; REJECT on lookahead features or unreadable output.
 */
import { describe, it, expect } from "vitest";
import { termCountOk, fidelityOk, beatsBaseline, readabilityOk, glassBoxGate, GlassBox } from "./2602-21307v2-symtorch-a-framework-for-symbolic";

describe("2602-21307v2 glass-box distillation gate", () => {
  const good: GlassBox = {
    terms: [
      { text: "0.42 * epa_play", absCoef: 0.42 },
      { text: "-0.10 * spread", absCoef: 0.1 },
    ],
    maeVsHead: 0.008,
    baselineMae: 0.05,
  };
  it("passes all gates for a faithful simple equation", () => {
    expect(glassBoxGate(good, new Set(["final", "future"]))).toBe(true);
  });
  it("fails each gate independently", () => {
    expect(glassBoxGate({ ...good, terms: new Array(11).fill(good.terms[0]) }, new Set())).toBe(false);
    expect(glassBoxGate({ ...good, maeVsHead: 0.05 }, new Set())).toBe(false);
    expect(glassBoxGate({ ...good, baselineMae: 0.009 }, new Set())).toBe(false);
    const banned = { ...good, terms: [{ text: "0.9 * final_score", absCoef: 0.9 }] };
    expect(glassBoxGate(banned, new Set(["final_score"]))).toBe(false);
    expect(() => beatsBaseline({ ...good, baselineMae: 0 })).toThrow();
  });
});
