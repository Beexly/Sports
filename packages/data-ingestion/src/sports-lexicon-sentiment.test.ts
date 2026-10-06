/**
 * Tests for ./sports-lexicon-sentiment (arXiv:1610.06272v2, lane=nlp).
 *
 * ACCEPTANCE GATE: ADAPT if the sports-lexicon CNN matches the paper's stability pattern (run-to-run SD under 0.6)
 * and beats the plain CNN on sports text; REJECT if gains don't replicate on sports-domain text
 * (lexicon coverage problem dominates).
 */

import { describe, expect, it } from "vitest";
import * as mod from "./sports-lexicon-sentiment";

describe("sports lexicon sentiment (arXiv:1610.06272v2)", () => {
  it("scores injury language bearish", () => {
    expect(mod.lexiconSentiment("star WR doubtful with hamstring injury")).toBeLessThan(-0.15);
    expect(mod.classifySentiment("star WR doubtful with hamstring injury")).toBe("bearish");
  });
  it("scores breakout language bullish", () => {
    expect(mod.classifySentiment("rookie breakout, looked elite in camp")).toBe("bullish");
  });
  it("neutral on no hits", () => {
    expect(mod.lexiconSentiment("the game is on Sunday")).toBe(0);
    expect(mod.classifySentiment("the game is on Sunday")).toBe("neutral");
  });
  it("attention weights sum to 1", () => {
    const w = mod.attentionWeights([1, 2, 3]);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    expect(mod.attentionWeights([])).toEqual([]);
  });
  it("bounded in [-1,1]", () => {
    const s = mod.lexiconSentiment("injury injury injury doubtful out bust dnp");
    expect(s).toBeGreaterThanOrEqual(-1);
    expect(s).toBeLessThan(0);
  });
});
