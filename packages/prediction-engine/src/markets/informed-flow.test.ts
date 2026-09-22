/**
 * Informed-flow detector — tests (arXiv 2209.07581).
 *
 * ACCEPTANCE GATE: a segment whose bets push the line toward the
 * efficient price (negative beta) is flagged informed; a noise segment
 * is not; post-move lines show positive DeltaAUC with 95% CI above
 * zero for informed flow; the cross-sectional bar detects the gap;
 * degenerate inputs throw.
 */
import { describe, expect, it } from "vitest";
import {
  crossSectionalBar,
  deltaAuc,
  detectInformedFlow,
  type FlowBet,
} from "./informed-flow";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("detectInformedFlow", () => {
  it("flags informed flow, clears noise", () => {
    const rand = mulberry32(241);
    // Informed: bets lean against stale lines; price impact corrects.
    const informedBets: FlowBet[] = [];
    for (let i = 0; i < 200; i++) {
      const edge = (rand() - 0.5) * 4;
      informedBets.push({
        edge,
        priceImpact: -0.6 * edge + (rand() - 0.5) * 0.5,
      });
    }
    const v = detectInformedFlow({
      segment: "sharps",
      league: "NFL",
      market: "spread",
      bets: informedBets,
    });
    expect(v.beta).toBeLessThan(0);
    expect(v.informed).toBe(true);

    // Noise: price impact unrelated to edge.
    const noiseBets: FlowBet[] = [];
    for (let i = 0; i < 200; i++) {
      noiseBets.push({ edge: (rand() - 0.5) * 4, priceImpact: (rand() - 0.5) * 0.5 });
    }
    const v2 = detectInformedFlow({
      segment: "public",
      league: "NFL",
      market: "spread",
      bets: noiseBets,
    });
    expect(v2.informed).toBe(false);
    expect(() => detectInformedFlow({ segment: "x", league: "NFL", market: "spread", bets: informedBets.slice(0, 5) })).toThrow();
  });
});

describe("deltaAuc", () => {
  it("detects positive DeltaAUC for informed moves", () => {
    const rand = mulberry32(243);
    const pre: number[] = [];
    const post: number[] = [];
    const outcomes: number[] = [];
    for (let i = 0; i < 400; i++) {
      const y = rand() < 0.5 ? 1 : 0;
      outcomes.push(y);
      // Weak pre-move signal (heavy overlap), strong post-move signal.
      pre.push(
        Math.min(0.95, Math.max(0.05, (y === 1 ? 0.55 : 0.45) + (rand() - 0.5) * 0.5)),
      );
      post.push(y === 1 ? 0.85 : 0.15);
    }
    const { delta, ciHalf } = deltaAuc(pre, post, outcomes);
    expect(delta).toBeGreaterThan(0.2);
    expect(delta - ciHalf).toBeGreaterThan(0); // 95% CI above zero
    expect(() => deltaAuc(pre.slice(0, 10), post.slice(0, 10), outcomes.slice(0, 10))).toThrow();
  });
});

describe("crossSectionalBar", () => {
  it("detects the informed-market gap", () => {
    const informed = [true, true, true, true, false, false, false, false];
    const profitable = [true, true, true, false, false, false, true, false];
    const { gap, pValue } = crossSectionalBar(informed, profitable);
    expect(gap).toBeGreaterThan(0);
    expect(pValue).toBeLessThan(0.5);
    expect(() => crossSectionalBar([], [])).toThrow();
  });
});
