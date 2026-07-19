import { describe, expect, it } from "vitest";
import { evaluatePromotion, recomputePromotionDecision } from "../evaluate.js";
import { PromotionIntegrityError } from "../integrity.js";
import type { PromotionInput } from "../types.js";
import { baseWindow, deterministicOutcome, makeBrierRows, makeClvRows } from "./fixtures.js";

const NOW = "2026-04-02T00:00:00.000Z";

describe("evaluatePromotion — contract invariant 1: identity fixed point", () => {
  it("challenger === champion ⇒ every d_i = 0, LCB < deltaPrac, NOT_ELIGIBLE", () => {
    const championProb = (i: number) => 0.3 + 0.4 * ((i % 5) / 5);
    const outcome = deterministicOutcome(championProb);
    const brierRows = makeBrierRows(600, championProb, championProb, outcome); // K ≡ C

    const input: PromotionInput = {
      window: baseWindow(),
      championId: "champion-v1",
      challengerId: "challenger-identical",
      codeRevision: "rev-1",
      brierRows,
      clvRows: [],
    };

    const decision = evaluatePromotion(input, NOW);

    expect(decision.leg1.meanD).toBeCloseTo(0, 12);
    expect(decision.leg1.lcb).toBeLessThan(decision.leg1.deltaPrac);
    expect(decision.leg1.lcb).toBeLessThan(0.002);
    expect(decision.leg1.pass).toBe(false);
    expect(decision.verdict).toBe("NOT_ELIGIBLE");
  });
});

describe("evaluatePromotion — contract invariant 2: oracle promotes", () => {
  it("challenger = outcome oracle ⇒ Leg 1 passes with a strongly positive LCB", () => {
    const championProb = () => 0.5; // uninformative champion
    const outcome = (i: number): 0 | 1 => (i % 2 === 0 ? 1 : 0);
    const challengerProb = (i: number): number => outcome(i); // p_K = y exactly
    const brierRows = makeBrierRows(600, championProb, challengerProb, outcome);

    const input: PromotionInput = {
      window: baseWindow(),
      championId: "champion-v1",
      challengerId: "challenger-oracle",
      codeRevision: "rev-1",
      brierRows,
      clvRows: [],
    };

    const decision = evaluatePromotion(input, NOW);

    // d_i = (0.5 - y)^2 - (y - y)^2 = 0.25 for every row.
    expect(decision.leg1.meanD).toBeCloseTo(0.25, 9);
    expect(decision.leg1.lcb).toBeGreaterThan(0.2); // strongly positive, well above deltaPrac=0.002
    expect(decision.leg1.pass).toBe(true);
  });

  it("challenger = outcome oracle + passing CLV rows ⇒ full ELIGIBLE", () => {
    const championProb = () => 0.5;
    const outcome = (i: number): 0 | 1 => (i % 2 === 0 ? 1 : 0);
    const challengerProb = (i: number): number => outcome(i);
    const brierRows = makeBrierRows(600, championProb, challengerProb, outcome);

    // Challenger CLV clearly above champion CLV + epsilon, with enough rows
    // per side and nonzero variance so Welch's SE is well-defined.
    const clvRows = makeClvRows(
      150,
      (i) => 0.005 + 0.0001 * Math.sin(i * 1.7),
      (i) => 0.02 + 0.0001 * Math.sin(i * 2.3),
    );

    const input: PromotionInput = {
      window: baseWindow(),
      championId: "champion-v1",
      challengerId: "challenger-oracle",
      codeRevision: "rev-1",
      brierRows,
      clvRows,
    };

    const decision = evaluatePromotion(input, NOW);

    expect(decision.leg1.pass).toBe(true);
    expect(decision.leg2.pass).toBe(true);
    expect(decision.verdict).toBe("ELIGIBLE");
  });
});

describe("evaluatePromotion — contract invariant 5: replayable decision", () => {
  it("same inputs ⇒ byte-identical PromotionDecision (including windowHash)", () => {
    const championProb = (i: number) => 0.4 + 0.1 * Math.sin(i);
    const challengerProb = (i: number) => 0.45 + 0.1 * Math.sin(i);
    const outcome = deterministicOutcome(() => 0.5);
    const brierRows = makeBrierRows(600, championProb, challengerProb, outcome);
    const clvRows = makeClvRows(
      150,
      (i) => 0.005 + 0.0001 * Math.sin(i),
      (i) => 0.015 + 0.0001 * Math.cos(i),
    );

    const input: PromotionInput = {
      window: baseWindow(),
      championId: "champion-v1",
      challengerId: "challenger-v7",
      codeRevision: "rev-abc",
      brierRows,
      clvRows,
    };

    const first = evaluatePromotion(input, NOW);
    const second = evaluatePromotion(input, NOW);
    const replayed = recomputePromotionDecision(input, NOW);

    expect(second).toStrictEqual(first);
    expect(replayed).toStrictEqual(first);
    expect(second.windowHash).toBe(first.windowHash);
  });

  it("windowHash changes when a registered window parameter changes, decidedAt does not affect it", () => {
    const championProb = (i: number) => 0.4 + 0.1 * Math.sin(i);
    const challengerProb = (i: number) => 0.45 + 0.1 * Math.sin(i);
    const outcome = deterministicOutcome(() => 0.5);
    const brierRows = makeBrierRows(600, championProb, challengerProb, outcome);

    const inputA: PromotionInput = {
      window: baseWindow(),
      championId: "champion-v1",
      challengerId: "challenger-v7",
      codeRevision: "rev-abc",
      brierRows,
      clvRows: [],
    };
    const inputB: PromotionInput = { ...inputA, window: baseWindow({ deltaPrac: 0.003 }) };

    const a = evaluatePromotion(inputA, NOW);
    const b = evaluatePromotion(inputB, NOW);
    expect(a.windowHash).not.toBe(b.windowHash);

    // decidedAt is injected and does not feed the hash.
    const aLater = evaluatePromotion(inputA, "2026-05-01T00:00:00.000Z");
    expect(aLater.windowHash).toBe(a.windowHash);
    expect(aLater.decidedAt).not.toBe(a.decidedAt);
  });
});

describe("evaluatePromotion — Bonferroni adjustment (contract §4)", () => {
  it("with concurrentChallengers=5, a challenger passing at alpha=0.05 unadjusted fails at alpha/5=0.01", () => {
    // championProb fixed at 0.5, outcome fixed at 1 ⇒ (p_C - y)^2 = 0.25 always.
    // challengerProb is back-solved so that d_i = 0.25 - (p_K - 1)^2 follows
    // d_i(i) = 0.02 + 0.03*sin(i * 2.399963), a fixture verified numerically
    // (see empirical-bernstein hand computation) to give:
    //   LCB(delta=0.05) ≈ +0.00326  (> deltaPrac = 0.002 ⇒ Leg 1 passes)
    //   LCB(delta=0.01) ≈ -0.00348  (<= deltaPrac ⇒ Leg 1 fails)
    const championProb = () => 0.5;
    const outcome = (): 0 | 1 => 1;
    const challengerProb = (i: number) => {
      const d = 0.02 + 0.03 * Math.sin(i * 2.399963);
      return 1 - Math.sqrt(Math.max(0, 0.25 - d));
    };
    const brierRows = makeBrierRows(600, championProb, challengerProb, outcome);

    // CLV passes overwhelmingly on both sides regardless of alpha, so the
    // Bonferroni effect below is attributable to Leg 1 alone.
    const clvRows = makeClvRows(
      150,
      (i) => 0.005 + 0.0001 * Math.sin(i * 1.7),
      (i) => 0.05 + 0.0001 * Math.sin(i * 2.3),
    );

    const unadjustedInput: PromotionInput = {
      window: baseWindow({ concurrentChallengers: 1 }),
      championId: "champion-v1",
      challengerId: "challenger-bonferroni",
      codeRevision: "rev-1",
      brierRows,
      clvRows,
    };
    const adjustedInput: PromotionInput = {
      ...unadjustedInput,
      window: baseWindow({ concurrentChallengers: 5 }),
    };

    const unadjusted = evaluatePromotion(unadjustedInput, NOW);
    const adjusted = evaluatePromotion(adjustedInput, NOW);

    expect(unadjusted.alphaAdj).toBeCloseTo(0.05, 9);
    expect(unadjusted.leg1.lcb).toBeGreaterThan(0.002);
    expect(unadjusted.leg1.pass).toBe(true);
    expect(unadjusted.verdict).toBe("ELIGIBLE");

    expect(adjusted.alphaAdj).toBeCloseTo(0.01, 9);
    expect(adjusted.leg1.lcb).toBeLessThanOrEqual(0.002);
    expect(adjusted.leg1.pass).toBe(false);
    expect(adjusted.verdict).toBe("NOT_ELIGIBLE");
  });
});

describe("evaluatePromotion — Leg 3 integrity is enforced before any statistic is computed", () => {
  it("throws PromotionIntegrityError instead of producing a decision on a badly registered window", () => {
    const championProb = (i: number) => 0.4 + 0.1 * Math.sin(i);
    const brierRows = makeBrierRows(600, championProb, championProb, deterministicOutcome(() => 0.5));
    const input: PromotionInput = {
      window: baseWindow({ registeredAt: baseWindow().start }), // registered AT start, not before
      championId: "champion-v1",
      challengerId: "challenger-v1",
      codeRevision: "rev-1",
      brierRows,
      clvRows: [],
    };
    expect(() => evaluatePromotion(input, NOW)).toThrow(PromotionIntegrityError);
  });
});
