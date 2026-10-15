/**
 * Characterization pins for the model promotion gate (G-08) — gate-wiring
 * batch 2.
 *
 * Decision-table completion for evaluatePromotion: the sibling suite
 * (evaluate.test.ts) pins the identity/oracle/replay/Bonferroni/coverage
 * cells; these pins add the cells it does not reach — the m-validation
 * throw, the Leg-1 reason precedence chain, Leg 2 failing ALONE (both the
 * insufficient-rows and the decisive-inferiority variants), the
 * zero-variance CLV path at the evaluate level, and the decision metadata
 * echo. The module is DARK by contract (founder-applied promotion); these
 * pins change nothing about that.
 */
import { describe, expect, it } from "vitest";
import { evaluatePromotion } from "../evaluate.js";
import type { PromotionInput } from "../types.js";
import { baseWindow, deterministicOutcome, eventUniverse, makeBrierRows, makeClvRows } from "./fixtures.js";

const NOW = "2026-04-02T00:00:00.000Z";

const alternatingOutcome = (i: number): 0 | 1 => (i % 2 === 0 ? 1 : 0);

/** Oracle challenger rows: Leg 1 passes decisively (every d_i = 0.25). */
const oracleBrierRows = () => makeBrierRows(600, () => 0.5, alternatingOutcome, alternatingOutcome);

const inputWith = (overrides: Partial<PromotionInput>): PromotionInput => ({
  window: baseWindow(),
  championId: "champion-v1",
  challengerId: "challenger-v1",
  codeRevision: "rev-1",
  brierRows: oracleBrierRows(),
  clvRows: [],
  ...overrides,
});

describe("evaluatePromotion characterization — window m validation", () => {
  it("concurrentChallengers must be a positive integer: 0, 1.5, and -2 all throw RangeError", () => {
    for (const m of [0, 1.5, -2]) {
      expect(() => evaluatePromotion(inputWith({ window: baseWindow({ concurrentChallengers: m }) }), NOW)).toThrow(
        RangeError,
      );
      expect(() => evaluatePromotion(inputWith({ window: baseWindow({ concurrentChallengers: m }) }), NOW)).toThrow(
        /positive integer/,
      );
    }
  });
});

describe("evaluatePromotion characterization — Leg 1 reason precedence", () => {
  it("n below N_min is the reported blocker even when the LCB would also fail", () => {
    const decision = evaluatePromotion(
      inputWith({
        window: baseWindow({ registeredEventIds: eventUniverse(10), nMin: 500 }),
        brierRows: makeBrierRows(10, () => 0.5, alternatingOutcome, alternatingOutcome),
      }),
      NOW,
    );
    expect(decision.leg1.n).toBe(10);
    expect(decision.leg1.coverage).toBe(1); // full coverage of the small universe
    expect(decision.leg1.pass).toBe(false);
    expect(decision.leg1.reason).toBe("n=10 < N_min=500");
    expect(decision.verdict).toBe("NOT_ELIGIBLE");
  });

  it("coverage is reported before the LCB when both fail", () => {
    const championProb = (i: number) => 0.3 + 0.4 * ((i % 5) / 5);
    const decision = evaluatePromotion(
      inputWith({
        // Identical challenger: LCB < deltaPrac (Leg 1's third check) AND
        // 520/600 = 86.7% coverage < 0.95 floor (the second check).
        brierRows: makeBrierRows(520, championProb, championProb, deterministicOutcome(championProb)),
      }),
      NOW,
    );
    expect(decision.leg1.pass).toBe(false);
    expect(decision.leg1.coverage).toBeCloseTo(520 / 600, 10);
    expect(decision.leg1.reason).toMatch(/^coverage=0\.8667 < coverageFloor=0\.95/);
  });
});

describe("evaluatePromotion characterization — Leg 2 failing alone", () => {
  it("a decisively CLV-inferior challenger fails Leg 2 while Leg 1 passes", () => {
    const decision = evaluatePromotion(
      inputWith({
        clvRows: makeClvRows(
          150,
          (i) => 0.02 + 0.0001 * Math.sin(i * 1.7),
          (i) => -0.02 + 0.0001 * Math.sin(i * 2.3),
        ),
      }),
      NOW,
    );
    expect(decision.leg1.pass).toBe(true);
    expect(decision.leg2.pass).toBe(false);
    expect(decision.leg2.reason).toMatch(/^one-sided p=/);
    expect(decision.verdict).toBe("NOT_ELIGIBLE");
  });

  it("no CLV rows at all: Leg 2 fails on insufficient rows with NaN z, even when Leg 1 passes", () => {
    const decision = evaluatePromotion(inputWith({ clvRows: [] }), NOW);
    expect(decision.leg1.pass).toBe(true);
    expect(decision.leg2.nChampion).toBe(0);
    expect(decision.leg2.nChallenger).toBe(0);
    expect(Number.isNaN(decision.leg2.z)).toBe(true);
    expect(decision.leg2.oneSidedP).toBe(1);
    expect(decision.leg2.pass).toBe(false);
    expect(decision.leg2.reason).toMatch(/insufficient graded CLV rows/);
    expect(decision.verdict).toBe("NOT_ELIGIBLE");
  });
});

describe("evaluatePromotion characterization — zero-variance CLV at the gate level", () => {
  it("constant CLV samples decide deterministically: superior constants pass with z = +Infinity", () => {
    const decision = evaluatePromotion(
      inputWith({ clvRows: makeClvRows(120, () => 0.005, () => 0.02) }),
      NOW,
    );
    expect(decision.leg2.pass).toBe(true);
    expect(decision.leg2.z).toBe(Number.POSITIVE_INFINITY);
    expect(decision.leg2.oneSidedP).toBe(0);
    expect(decision.verdict).toBe("ELIGIBLE");
  });

  it("constant CLV samples decide deterministically: inferior constants fail with z = -Infinity", () => {
    const decision = evaluatePromotion(
      inputWith({ clvRows: makeClvRows(120, () => 0.02, () => 0.001) }),
      NOW,
    );
    expect(decision.leg2.pass).toBe(false);
    expect(decision.leg2.z).toBe(Number.NEGATIVE_INFINITY);
    expect(decision.leg2.oneSidedP).toBe(1);
    expect(decision.leg2.reason).toMatch(/zero-variance samples/);
    expect(decision.verdict).toBe("NOT_ELIGIBLE");
  });
});

describe("evaluatePromotion characterization — decision metadata", () => {
  it("echoes ids, window fields, and the injected now verbatim; alphaAdj = alpha / m; hash is sha256:<64 hex>", () => {
    const decision = evaluatePromotion(
      inputWith({ window: baseWindow({ concurrentChallengers: 4 }), codeRevision: "rev-xyz" }),
      NOW,
    );
    expect(decision.windowId).toBe("w-test");
    expect(decision.marketFamily).toBe("nfl-spreads");
    expect(decision.championId).toBe("champion-v1");
    expect(decision.challengerId).toBe("challenger-v1");
    expect(decision.codeRevision).toBe("rev-xyz");
    expect(decision.decidedAt).toBe(NOW);
    expect(decision.alpha).toBe(0.05);
    expect(decision.alphaAdj).toBeCloseTo(0.0125, 12);
    expect(decision.concurrentChallengers).toBe(4);
    expect(decision.windowHash).toMatch(/^sha256:[0-9a-f]{64}$/);
  });
});
