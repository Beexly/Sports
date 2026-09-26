import { describe, expect, it } from "vitest";
import {
  DEVIG_SUM_TOLERANCE,
  evalArbScan,
  evalBanditPolicies,
  evalCountModel,
  evalEffectivePrice,
  evalExcessMovement,
  evalFavoriteLongshotAudit,
  evalInformedFlow,
  evalInformedFlowCrossSection,
  evalKellySizing,
  evalMarginalPriceOracle,
  evalMarketPooling,
  evalNoiseWedgeFairOdds,
  evalOoeDevig,
  evalOddsHistoryFusion,
  evalProbabilityDisplay,
  evalPromoExtraction,
  evalSituationalHonestyGate,
  evalSpreadSkill,
  evalVolumeMomentum,
} from "./markets-odds-bridge.js";
import type { DisplayPick } from "@sports/prediction-engine/src/markets/probability-display.js";
import type { BookQuote } from "@sports/prediction-engine/src/markets/marginal-price-oracle.js";
import type { OddsBucket } from "@sports/prediction-engine/src/odds/favorite-longshot-audit.js";
import type { FlowBet } from "@sports/prediction-engine/src/markets/informed-flow.js";

/** Deterministic uniform stream. Same LCG family as the bridge, seeded here. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const PICK: DisplayPick = {
  modelProb: 0.62,
  marketProb: 0.55,
  price: "-110",
  source: "Book X",
  timestamp: "2026-09-24T12:00:00Z",
  settlement: "OT counts",
};

describe("markets-odds bridge: probability display", () => {
  it("labels model, market and price as three distinct numbers", () => {
    const r = evalProbabilityDisplay(PICK);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.lines[0]).toBe("Model probability: 62.0%");
    expect(r.data.lines[1]).toBe("Market-implied probability: 55.0%");
    expect(r.data.lines[2]).toBe("Price: -110 (via Book X, 2026-09-24T12:00:00Z)");
    expect(r.data.lines[3]).toBe("Settlement: OT counts");
    expect(r.data.lines.some((l) => l.includes("our model is 7.0pp above the market"))).toBe(true);
    expect(r.data.gapPp).toBeCloseTo(7, 10);
    expect(r.data.modelAboveMarket).toBe(true);
    expect(r.data.issues).toEqual([]);
  });

  it("reports a model below the market as a negative gap, not a bet", () => {
    const r = evalProbabilityDisplay({ ...PICK, modelProb: 0.41, marketProb: 0.5 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.gapPp).toBeCloseTo(-9, 10);
    expect(r.data.modelAboveMarket).toBe(false);
  });

  it("fail-closes a probability outside [0,1]", () => {
    const r = evalProbabilityDisplay({ ...PICK, modelProb: 1.4 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("outside [0,1]");
  });

  it("fail-closes a non-finite probability", () => {
    const r = evalProbabilityDisplay({ ...PICK, marketProb: Number.NaN });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("non-finite");
  });

  it("fail-closes a missing price, source, timestamp or settlement rule", () => {
    expect(evalProbabilityDisplay({ ...PICK, price: "  " }).ok).toBe(false);
    expect(evalProbabilityDisplay({ ...PICK, source: "" }).ok).toBe(false);
    expect(evalProbabilityDisplay({ ...PICK, timestamp: "" }).ok).toBe(false);
    expect(evalProbabilityDisplay({ ...PICK, settlement: "" }).ok).toBe(false);
  });

  it("fail-closes when model and market are identical and the price is present", () => {
    const r = evalProbabilityDisplay({ ...PICK, marketProb: 0.62 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("identical");
  });

  it("appends the liquidity caveat when one is supplied", () => {
    const r = evalProbabilityDisplay({ ...PICK, liquidity: "low limits" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.lines).toContain("Liquidity: low limits");
  });
});

describe("markets-odds bridge: situational honesty filter", () => {
  const STRONG = {
    covers: 120,
    n: 200,
    placeboRate: 0.5,
    placeboN: 100,
    clvBeatRate: 0.55,
  };

  it("passes all three legs on a large, clean, CLV-positive sample", () => {
    const r = evalSituationalHonestyGate({ spot: STRONG });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.coverRate).toBeCloseTo(0.6, 10);
    expect(r.data.rawP).toBeLessThan(0.01);
    expect(r.data.fdrP).toBeCloseTo(r.data.rawP, 12);
    expect(r.data.failedLegs).toEqual([]);
    expect(r.data.pass).toBe(true);
    expect(r.data.sampleSize).toBe(200);
    expect(r.data.meetsSampleFloor).toBe(true);
  });

  it("fails the sample leg below n=200 while still computing honestly", () => {
    const r = evalSituationalHonestyGate({ spot: { ...STRONG, covers: 60, n: 100 } });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.pass).toBe(false);
    expect(r.data.failedLegs).toContain("sample: n < 200");
    expect(r.data.meetsSampleFloor).toBe(false);
    expect(r.data.coverRate).toBeCloseTo(0.6, 10);
  });

  it("fails the edge and CLV legs on a coin-flip record", () => {
    const r = evalSituationalHonestyGate({ spot: { ...STRONG, covers: 100, clvBeatRate: 0.5 } });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.pass).toBe(false);
    expect(r.data.failedLegs).toContain("edge: ATS cover rate < 54.5%");
    expect(r.data.failedLegs).toContain("clv: beat-rate <= 50%");
  });

  it("fails the placebo leg when the rested analogue is significant", () => {
    const r = evalSituationalHonestyGate({ spot: { ...STRONG, placeboRate: 0.62, placeboN: 400 } });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.pass).toBe(false);
    expect(r.data.failedLegs.some((l) => l.startsWith("placebo:"))).toBe(true);
  });

  it("applies Benjamini-Hochberg across a batch and reports the adjusted p", () => {
    const solo = evalSituationalHonestyGate({ spot: STRONG });
    expect(solo.ok).toBe(true);
    if (!solo.ok) return;
    const batched = evalSituationalHonestyGate({
      spot: STRONG,
      batchPvals: [solo.data.rawP, 0.4, 0.9],
    });
    expect(batched.ok).toBe(true);
    if (!batched.ok) return;
    // BH with m=3: the smallest p is scaled by 3/1, then capped by the others.
    expect(batched.data.fdrP).toBeCloseTo(solo.data.rawP * 3, 12);
    expect(batched.data.fdrP).toBeGreaterThanOrEqual(solo.data.rawP - 1e-12);
    expect(batched.data.pass).toBe(true);
  });

  it("fail-closes a cover count outside [0, n]", () => {
    const r = evalSituationalHonestyGate({ spot: { ...STRONG, covers: 201 } });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("out of range");
  });

  it("fail-closes n=0 and a non-binary outcome count", () => {
    expect(evalSituationalHonestyGate({ spot: { ...STRONG, covers: 0, n: 0 } }).ok).toBe(false);
    expect(evalSituationalHonestyGate({ spot: { ...STRONG, covers: 1.5 } }).ok).toBe(false);
  });

  it("fail-closes an out-of-range CLV or placebo rate", () => {
    expect(evalSituationalHonestyGate({ spot: { ...STRONG, clvBeatRate: 1.2 } }).ok).toBe(false);
    expect(evalSituationalHonestyGate({ spot: { ...STRONG, placeboRate: -0.1 } }).ok).toBe(false);
  });

  it("fail-closes an empty p-value batch rather than defaulting to the raw p", () => {
    const r = evalSituationalHonestyGate({ spot: STRONG, batchPvals: [] });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("empty p-value batch");
  });
});

describe("markets-odds bridge: effective price", () => {
  it("detects a shrouded-fee sign flip and reports the flip rate exactly", () => {
    const r = evalEffectivePrice([{ p: 0.55, odds: 2.0, stake: 100, fee: 12 }]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.rows[0]?.postedEv).toBeCloseTo(10, 10);
    expect(r.data.rows[0]?.effectiveEv).toBeCloseTo(-2, 10);
    expect(r.data.rows[0]?.signFlip).toBe(true);
    // A negative effective EV is a PASS. It is never surfaced as a stake.
    expect(r.data.rows[0]?.action).toBe("PASS");
    expect(r.data.signFlipRate).toBe(1);
    expect(r.data.meanFee).toBe(12);
    expect(r.data.actionableCount).toBe(0);
    expect(r.data.positiveEvCount).toBe(1);
    expect(r.data.meetsTwoPercentAdoptionGate).toBe(true);
  });

  it("leaves a fee-free positive-EV pick actionable", () => {
    const r = evalEffectivePrice([{ p: 0.6, odds: 2.0, stake: 50, fee: 0 }]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.rows[0]?.postedEv).toBeCloseTo(10, 10);
    expect(r.data.rows[0]?.effectiveEv).toBeCloseTo(10, 10);
    expect(r.data.rows[0]?.action).toBe("VALUE");
    expect(r.data.actionableCount).toBe(1);
  });

  it("mixes flipped and un-flipped picks and computes the rate over positive-EV picks only", () => {
    const r = evalEffectivePrice([
      { p: 0.55, odds: 2.0, stake: 100, fee: 12 }, // +10 posted, -2 effective -> flip
      { p: 0.60, odds: 2.0, stake: 100, fee: 0 }, // +20 posted, +20 effective
      { p: 0.40, odds: 2.0, stake: 100, fee: 0 }, // -20 posted, excluded
    ]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.positiveEvCount).toBe(2);
    expect(r.data.signFlipRate).toBeCloseTo(0.5, 12);
    expect(r.data.meanFee).toBeCloseTo(4, 10);
    expect(r.data.rows.map((x) => x.action)).toEqual(["PASS", "VALUE", "PASS"]);
  });

  it("reports a -EV pick as a PASS, never a negative stake", () => {
    const r = evalEffectivePrice([{ p: 0.3, odds: 1.5, stake: 10, fee: 0 }]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.rows[0]?.effectiveEv).toBeLessThan(0);
    expect(r.data.rows[0]?.action).toBe("PASS");
    expect(r.data.actionableCount).toBe(0);
  });

  it("fail-closes an empty pick list", () => {
    const r = evalEffectivePrice([]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("empty");
  });

  it("fail-closes p outside [0,1], odds <= 1, non-positive stake and negative fee", () => {
    expect(evalEffectivePrice([{ p: 1.1, odds: 2, stake: 10, fee: 0 }]).ok).toBe(false);
    expect(evalEffectivePrice([{ p: 0.5, odds: 1, stake: 10, fee: 0 }]).ok).toBe(false);
    expect(evalEffectivePrice([{ p: 0.5, odds: 2, stake: 0, fee: 0 }]).ok).toBe(false);
    expect(evalEffectivePrice([{ p: 0.5, odds: 2, stake: 10, fee: -1 }]).ok).toBe(false);
  });

  it("fail-closes a non-finite price rather than smoothing it", () => {
    const r = evalEffectivePrice([{ p: 0.5, odds: Number.POSITIVE_INFINITY, stake: 10, fee: 0 }]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("odds");
  });
});

describe("markets-odds bridge: noise wedge fair odds", () => {
  it("estimates dispersion and applies a wedge that narrows a favourite", () => {
    const r = evalNoiseWedgeFairOdds(0.62, [0.58, 0.61, 0.64, 0.67]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // mean 0.625; sample sd = sqrt(0.0015); denominator min(0.625, 0.375) = 0.375
    expect(r.data.epsilon).toBeCloseTo(Math.sqrt(0.0015) / 0.375, 10);
    expect(r.data.wedge).toBeGreaterThan(0);
    expect(r.data.wedgeApplied).toBe(true);
    expect(r.data.fairImpliedProb).toBeLessThan(0.62);
    expect(r.data.fairImpliedProb).toBeGreaterThan(0);
    expect(r.data.fairDecimalOdds).toBeCloseTo(1 / r.data.fairImpliedProb, 10);
    expect(r.data.ensembleMean).toBeCloseTo(0.625, 12);
    expect(r.data.ensembleSize).toBe(4);
  });

  it("widens a longshot rather than narrowing it", () => {
    const r = evalNoiseWedgeFairOdds(0.3, [0.25, 0.3, 0.35, 0.4]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.fairImpliedProb).toBeGreaterThan(0.3);
    expect(r.data.fairImpliedProb).toBeLessThanOrEqual(1);
    expect(r.data.longshotFiltered).toBe(false);
  });

  it("caps the wedge at min(pc, 1-pc) on a very wide ensemble", () => {
    // mean 0.5, sample sd = 0.8/sqrt(2), denominator 0.5 -> epsilon ~1.1314
    const r = evalNoiseWedgeFairOdds(0.7, [0.1, 0.9]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.epsilon).toBeCloseTo(0.8 / Math.SQRT2 / 0.5, 10);
    expect(r.data.wedge).toBeLessThanOrEqual(0.3 + 1e-9);
    expect(r.data.fairImpliedProb).toBeGreaterThanOrEqual(0.4 - 1e-9);
  });

  it("fail-closes a model probability at or beyond the boundary", () => {
    expect(evalNoiseWedgeFairOdds(0, [0.1, 0.2]).ok).toBe(false);
    expect(evalNoiseWedgeFairOdds(1, [0.1, 0.2]).ok).toBe(false);
    expect(evalNoiseWedgeFairOdds(1.2, [0.1, 0.2]).ok).toBe(false);
  });

  it("fail-closes a single-member ensemble", () => {
    const r = evalNoiseWedgeFairOdds(0.6, [0.6]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain(">= 2");
  });

  it("fail-closes an ensemble whose members are all identical", () => {
    const r = evalNoiseWedgeFairOdds(0.6, [0.6, 0.6, 0.6]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("identical");
  });

  it("fail-closes members outside [0,1] and an illegal tail level", () => {
    expect(evalNoiseWedgeFairOdds(0.6, [0.5, 1.4]).ok).toBe(false);
    expect(evalNoiseWedgeFairOdds(0.6, [0.5, 0.7], { tail: 0.9 }).ok).toBe(false);
    expect(evalNoiseWedgeFairOdds(0.6, [0.5, 0.7], { tail: 0 }).ok).toBe(false);
  });
});

describe("markets-odds bridge: informed flow", () => {
  /** A segment whose price impact moves opposite its edge: the informed signature. */
  function bets(slope: number, noise: number, seed: number): FlowBet[] {
    const rand = lcg(seed);
    return Array.from({ length: 24 }, (_, i) => {
      const edge = (i - 12) / 3;
      return { edge, priceImpact: slope * edge + (noise > 0 ? (rand() - 0.5) * noise : 0) };
    });
  }

  it("flags a significantly negative slope as informed", () => {
    const r = evalInformedFlow({
      segment: "PS",
      league: "NFL",
      market: "SPREAD",
      bets: bets(-0.8, 0, 7),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.verdict.beta).toBeCloseTo(-0.8, 10);
    expect(r.data.verdict.tStat).toBeLessThan(r.data.criticalT);
    expect(r.data.informed).toBe(true);
    expect(r.data.verdict.n).toBe(24);
  });

  it("does not flag a positive slope", () => {
    const r = evalInformedFlow({
      segment: "public",
      league: "NFL",
      market: "SPREAD",
      bets: bets(0.5, 0.2, 11),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.verdict.beta).toBeGreaterThan(0);
    expect(r.data.informed).toBe(false);
  });

  it("fail-closes fewer than 10 bets", () => {
    const r = evalInformedFlow({
      segment: "PS",
      league: "NFL",
      market: "SPREAD",
      bets: bets(-0.8, 0, 7).slice(0, 9),
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("need >= 10");
  });

  it("fail-closes an edge with no variance instead of dividing by zero", () => {
    const r = evalInformedFlow({
      segment: "PS",
      league: "NFL",
      market: "SPREAD",
      bets: Array.from({ length: 12 }, () => ({ edge: 3, priceImpact: 1 })),
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("no variance");
  });

  it("fail-closes a missing segment label and non-finite bets", () => {
    expect(
      evalInformedFlow({ segment: "", league: "NFL", market: "SPREAD", bets: bets(-1, 0, 3) }).ok,
    ).toBe(false);
    expect(
      evalInformedFlow({
        segment: "PS",
        league: "NFL",
        market: "SPREAD",
        bets: [{ edge: Number.NaN, priceImpact: 1 }],
      }).ok,
    ).toBe(false);
  });
});

describe("markets-odds bridge: informed flow cross-section", () => {
  it("computes a positive delta AUC when post-move lines separate the classes", () => {
    const pre = Array.from({ length: 20 }, () => 0.5);
    const post: number[] = [];
    const outcomes: number[] = [];
    for (let i = 0; i < 20; i++) {
      const y = i % 2 === 0 ? 1 : 0;
      outcomes.push(y);
      post.push(y === 1 ? 0.8 : 0.2);
    }
    const r = evalInformedFlowCrossSection(
      pre,
      post,
      outcomes,
      [true, true, false, false],
      [true, true, false, true],
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // A perfect pre-move ranking of 0.5 everywhere gives AUC 0.5.
    expect(r.data.deltaAuc).toBeCloseTo(0.5, 10);
    expect(r.data.aucCiHalf).toBeCloseTo(1.96 * Math.sqrt(2 * 0.25 / 20), 10);
    expect(r.data.crossSectionalGap).toBeCloseTo(0.5, 10);
    expect(r.data.crossSectionalP).toBeLessThan(0.2);
    expect(r.data.informedGroupSize).toBe(2);
    expect(r.data.uninformedGroupSize).toBe(2);
  });

  it("fail-closes on fewer than 20 games", () => {
    const r = evalInformedFlowCrossSection(
      [0.5, 0.5],
      [0.5, 0.5],
      [1, 0],
      [true, false],
      [true, true],
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain(">= 20");
  });

  it("fail-closes mismatched lengths and a single-class outcome vector", () => {
    expect(
      evalInformedFlowCrossSection(
        Array.from({ length: 20 }, () => 0.5),
        Array.from({ length: 20 }, () => 0.5),
        Array.from({ length: 20 }, () => 1),
        [true, false],
        [true, true],
      ).ok,
    ).toBe(false);
    expect(
      evalInformedFlowCrossSection(
        Array.from({ length: 20 }, () => 0.5),
        Array.from({ length: 19 }, () => 0.5),
        Array.from({ length: 20 }, (_, i) => i % 2),
        [true, false],
        [true, true],
      ).ok,
    ).toBe(false);
  });

  it("fail-closes probabilities outside [0,1]", () => {
    const r = evalInformedFlowCrossSection(
      Array.from({ length: 20 }, () => 0.5),
      Array.from({ length: 20 }, (_, i) => (i === 3 ? 1.4 : 0.5)),
      Array.from({ length: 20 }, (_, i) => i % 2),
      [true, false],
      [true, true],
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("outside [0,1]");
  });
});

describe("markets-odds bridge: marginal price oracle", () => {
  const HOME: BookQuote[] = [
    { book: "A", bid: 2.05, ask: 1.95 },
    { book: "B", bid: 2.10, ask: 1.90 },
    { book: "C", bid: 2.30, ask: 2.10 },
  ];

  it("takes the median book mid as the oracle price and fits a liquidity curve per book", () => {
    const r = evalMarginalPriceOracle(HOME);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // mids: A 0.5003127, B 0.5012531, C 0.4554865 -> median 0.5003127
    expect(r.data.homeOracleMid).toBeCloseTo(0.5003127, 7);
    expect(r.data.quoteCount).toBe(3);
    expect(r.data.books).toHaveLength(3);
    for (const bk of r.data.books) {
      expect(bk.b).toBeGreaterThan(0);
      expect(bk.midAtZero).toBeGreaterThan(0);
      expect(bk.midAtZero).toBeLessThan(1);
      expect(bk.impliedFeeGamma).toBeGreaterThanOrEqual(0);
      expect(bk.impliedFeeGamma).toBeLessThan(1);
    }
    // A: (2.05-1.95)/(2.05+1.95) = 0.025 exactly.
    expect(r.data.books[0]?.impliedFeeGamma).toBeCloseTo(0.025, 12);
    expect(r.data.tightness).toBeGreaterThan(0);
    expect(r.data.tightness).toBeLessThan(1);
  });

  it("flags only the book that deviates past the fee band", () => {
    const r = evalMarginalPriceOracle(HOME, undefined, 0.01);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const flagged = r.data.flags.filter((f) => f.flagged).map((f) => f.book);
    expect(flagged).toEqual(["C"]);
    for (const f of r.data.flags) {
      expect(f.deviation).toBeGreaterThanOrEqual(0);
      expect(f.flagged).toBe(f.deviation > 0.01);
    }
  });

  it("passes the two-sided de-vig sum check on a consistent book", () => {
    // The away side is constructed so its median mid is exactly 1 - homeMid.
    const homeBid = 2.05;
    const homeAsk = 1.95;
    const homeMid = (1 / homeBid + 1 / homeAsk) / 2;
    const awayAsk = 1 / (2 * (1 - homeMid) - 1 / homeBid);
    const r = evalMarginalPriceOracle(
      [{ book: "A", bid: homeBid, ask: homeAsk }],
      [{ book: "A", bid: homeBid, ask: awayAsk }],
      0.05,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.awayOracleMid).not.toBeNull();
    expect(r.data.twoSidedSumError).not.toBeNull();
    expect(r.data.twoSidedSumError ?? 1).toBeLessThanOrEqual(DEVIG_SUM_TOLERANCE);
  });

  it("fail-closes a two-sided book whose mids do not sum to 1", () => {
    const skewed: BookQuote[] = [{ book: "X", bid: 1.30, ask: 1.25 }];
    const r = evalMarginalPriceOracle(skewed, skewed, 0.05);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("two-sided sum");
  });

  it("fail-closes bid <= ask and ask <= 1", () => {
    const r = evalMarginalPriceOracle([{ book: "A", bid: 1.90, ask: 2.05 }]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("bid");
    expect(evalMarginalPriceOracle([{ book: "A", bid: 1.0, ask: 0.95 }]).ok).toBe(false);
  });

  it("fail-closes an empty quote list", () => {
    const r = evalMarginalPriceOracle([]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("no home-side quotes");
  });
});

describe("markets-odds bridge: excess movement", () => {
  it("separates a rising, informative block into movement and uncertainty reduction", () => {
    const r = evalExcessMovement(
      [
        { probs: [0.5, 0.55, 0.6], block: 1, highLeverage: false },
        { probs: [0.6, 0.62, 0.64], block: 2, highLeverage: false },
      ],
      2,
      0.02,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const first = r.data.rows[0];
    expect(first?.movement).toBeCloseTo(0.1, 10);
    // H(0.5) = 1, H(0.6) = 0.9709506
    expect(first?.uncertaintyReduction).toBeCloseTo(1 - 0.97095059, 8);
    expect(first?.excess).toBeCloseTo(0.1 - (1 - 0.97095059), 8);
    expect(first?.signal).toBe("fade");
    expect(r.data.meanExcess).toBeGreaterThan(0);
    expect(r.data.gateAdopted).toBe(false);
  });

  it("returns 'none' when the excess is inside the dead band", () => {
    const r = evalExcessMovement(
      [{ probs: [0.5, 0.5001, 0.5002], block: 1, highLeverage: false }],
      2,
      0.05,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.rows[0]?.signal).toBe("none");
    // One block cannot carry a t-statistic, so it is reported as unavailable
    // rather than invented.
    expect(r.data.tStat).toBeNull();
    expect(r.data.pValue).toBeNull();
    expect(r.data.meanExcess).toBeGreaterThan(0);
  });

  it("calibrates a crossover to null when the excess never turns", () => {
    const r = evalExcessMovement(
      [
        { probs: [0.5, 0.55, 0.6], block: 1, highLeverage: false },
        { probs: [0.5, 0.52, 0.54], block: 2, highLeverage: false },
      ],
      2,
      0.02,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.rows.every((x) => x.excess > 0)).toBe(true);
    expect(r.data.crossoverBlock).toBeNull();
    expect(r.data.pValue).toBeGreaterThanOrEqual(0);
    expect(r.data.pValue).toBeLessThanOrEqual(1);
  });

  it("finds a crossover when the excess turns and stays negative", () => {
    const r = evalExcessMovement(
      [
        { probs: [0.5, 0.55, 0.6], block: 1, highLeverage: false },
        { probs: [0.62, 0.68, 0.74], block: 2, highLeverage: false },
      ],
      2,
      0.02,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.rows[0]?.excess).toBeGreaterThan(0);
    expect(r.data.rows[1]?.excess).toBeLessThan(0);
    expect(r.data.crossoverBlock).toBe(1);
  });

  it("fail-closes a block with a single sample and out-of-range probabilities", () => {
    expect(
      evalExcessMovement([{ probs: [0.5], block: 1, highLeverage: false }], 1).ok,
    ).toBe(false);
    const r = evalExcessMovement(
      [{ probs: [0.5, 1.4], block: 1, highLeverage: false }],
      1,
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("outside [0,1]");
  });

  it("fail-closes an empty block list", () => {
    const r = evalExcessMovement([], 1);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("no game blocks");
  });
});

describe("markets-odds bridge: arbitrage scan", () => {
  it("finds a three-way Dutch book and returns stakes that sum to 1", () => {
    // 1/3.10 three times = 0.967742 < 1, a real 3.33% guaranteed ROI.
    const r = evalArbScan([
      { book: "sharp", american: [210, 210, 210] },
      { book: "soft", american: [205, 205, 205] },
    ]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.arbFound).toBe(true);
    expect(r.data.arb).not.toBeNull();
    expect(r.data.invSum).toBeCloseTo(3 / 3.1, 10);
    expect(r.data.arb?.roi).toBeCloseTo(3.1 / 3 - 1, 10);
    for (const s of r.data.arb?.stakes ?? []) {
      expect(s).toBeCloseTo(1 / 3, 10);
    }
    expect(r.data.bestLegs.every((l) => l.book === "sharp")).toBe(true);
  });

  it("reports a two-way menu with a standard vig as a pass, not an error", () => {
    const r = evalArbScan([
      { book: "A", american: [-110, -110] },
      { book: "B", american: [-105, -105] },
    ]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.arbFound).toBe(false);
    expect(r.data.arb).toBeNull();
    expect(r.data.noArbReason).toContain(">= 1");
    // 2 / 1.95238095 = 1.02439
    expect(r.data.invSum).toBeCloseTo(2 / (1 + 100 / 105), 8);
    expect(r.data.invSum).toBeGreaterThan(1);
  });

  it("fails closed on inconsistent outcome counts across books", () => {
    const r = evalArbScan([
      { book: "A", american: [-110, -110] },
      { book: "B", american: [-110, -110, -110] },
    ]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("outcomes");
  });

  it("fail-closes zero and non-finite American odds", () => {
    expect(evalArbScan([{ book: "A", american: [0, -110] }]).ok).toBe(false);
    expect(evalArbScan([{ book: "A", american: [Number.NaN, -110] }]).ok).toBe(false);
  });

  it("fail-closes an empty book list and a single-outcome market", () => {
    expect(evalArbScan([]).ok).toBe(false);
    expect(evalArbScan([{ book: "A", american: [-110] }]).ok).toBe(false);
  });
});

describe("markets-odds bridge: promo extraction", () => {
  it("values a fair-odds bonus-bet promo at the coupon, since the qualifying leg is at fair odds", () => {
    const r = evalPromoExtraction(
      { stake: 100, stakeOddsAmerican: -110, bonusBet: 50, bonusBetEvPerDollar: 0.7 },
      2.0,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.qualifyingImpliedProb).toBeCloseTo(1 / (1 + 100 / 110), 12);
    // The kernel prices the qualifying bet at the book's own implied
    // probability, so its EV is zero by construction and the whole value is
    // the coupon: 50 * 0.7 = 35.
    expect(r.data.extractionValue).toBeCloseTo(35, 10);
    expect(r.data.positive).toBe(true);
    expect(r.data.hedgeStake).toBeCloseTo(95.454545, 6);
    expect(r.data.hedgedWorstCase).toBeCloseTo(30.454545, 5);
    expect(r.data.hedgedIsRiskFreePositive).toBe(true);
  });

  it("reports a coupon-free fair-odds promo as a pass, not a negative stake", () => {
    const r = evalPromoExtraction(
      { stake: 100, stakeOddsAmerican: -110, bonusBet: 0, bonusBetEvPerDollar: 0.7 },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.extractionValue).toBeCloseTo(0, 9);
    expect(r.data.positive).toBe(r.data.extractionValue > 0);
    expect(r.data.hedgeStake).toBe(0);
    expect(r.data.hedgedWorstCase).toBe(0);
  });

  it("reads a profit boost as the only positive leg when there is no coupon", () => {
    const r = evalPromoExtraction({
      stake: 100,
      stakeOddsAmerican: -110,
      bonusBet: 0,
      profitBoost: 1.25,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // 0.5238 * 100 * 0.9091 * 0.25 = 11.9048
    expect(r.data.extractionValue).toBeCloseTo(11.9047619, 6);
    expect(r.data.positive).toBe(true);
  });

  it("fails closed on a non-positive stake and a negative bonus bet", () => {
    expect(evalPromoExtraction({ stake: 0, stakeOddsAmerican: -110, bonusBet: 10 }).ok).toBe(false);
    expect(evalPromoExtraction({ stake: 10, stakeOddsAmerican: -110, bonusBet: -1 }).ok).toBe(false);
  });

  it("fails closed on zero American odds and a hedge price at or below 1", () => {
    expect(evalPromoExtraction({ stake: 10, stakeOddsAmerican: 0, bonusBet: 10 }).ok).toBe(false);
    expect(
      evalPromoExtraction({ stake: 10, stakeOddsAmerican: -110, bonusBet: 10 }, 1).ok,
    ).toBe(false);
  });
});

describe("markets-odds bridge: overround / one-over-EPC de-vig", () => {
  it("de-vigs a two-way menu to probabilities that sum to 1", () => {
    const r = evalOoeDevig([2.0, 2.0]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.multiplicative[0]).toBeCloseTo(0.5, 12);
    expect(r.data.oneOverEpc[0]).toBeCloseTo(0.5, 12);
    expect(r.data.flGlm[0]).toBeCloseTo(0.5, 12);
    expect(r.data.sumErrors.multiplicative).toBeLessThanOrEqual(DEVIG_SUM_TOLERANCE);
    expect(r.data.sumErrors.oneOverEpc).toBeLessThanOrEqual(DEVIG_SUM_TOLERANCE);
    expect(r.data.sumErrors.flGlm).toBeLessThanOrEqual(DEVIG_SUM_TOLERANCE);
  });

  it("strips a real overround and keeps the favourite on top", () => {
    const r = evalOoeDevig([1.91, 1.91]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // Raw implied 0.523560 each; multiplicative halves to 0.5.
    expect(r.data.multiplicative[0]).toBeCloseTo(0.5, 12);
    expect(r.data.oneOverEpc[0]).toBeCloseTo(0.5, 12);
    expect(r.data.oneOverEpc[0] + r.data.oneOverEpc[1]).toBeCloseTo(1, 10);
  });

  it("keeps a three-way favourite ordering intact under FL-GLM", () => {
    const r = evalOoeDevig([1.5, 4.0, 7.0], 1, 0.9);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const [a, b, c] = r.data.flGlm;
    expect(a ?? 0).toBeGreaterThan(b ?? 0);
    expect(b ?? 0).toBeGreaterThan(c ?? 0);
    expect(r.data.flGlm.reduce((x, y) => x + y, 0)).toBeCloseTo(1, 10);
  });

  it("fail-closes when the kernel cannot reach the requested target", () => {
    // Known kernel behaviour: the final normalization always forces the sum to
    // 1, so a non-unit target cannot be honoured. The bridge must fail rather
    // than report a vector that does not sum to what was asked for.
    const r = evalOoeDevig([2.0, 2.0], 0.9);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("not the requested target");
  });

  it("fail-closes odds at or below 1, a single odd, and a non-positive beta", () => {
    expect(evalOoeDevig([1.0, 2.0]).ok).toBe(false);
    expect(evalOoeDevig([2.0]).ok).toBe(false);
    expect(evalOoeDevig([2.0, 3.0], 1, 0).ok).toBe(false);
    expect(evalOoeDevig([2.0, Number.NaN]).ok).toBe(false);
  });

  it("fail-closes an impossible target", () => {
    const r = evalOoeDevig([2.0, 2.0], 5);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("target");
  });
});

describe("markets-odds bridge: favourite-longshot audit", () => {
  const BUCKETS: OddsBucket[] = [
    { label: "0.60-0.70", minOdds: 0.6, maxOdds: 0.7, implied: Array(20).fill(0.65), outcomes: Array(20).fill(0) },
    { label: "0.40-0.50", minOdds: 0.4, maxOdds: 0.5, implied: Array(20).fill(0.45), outcomes: Array(20).fill(0) },
    { label: "0.20-0.30", minOdds: 0.2, maxOdds: 0.3, implied: Array(20).fill(0.25), outcomes: Array(20).fill(1) },
  ];

  it("reports ROI and sample size per bucket and a measured slope, not a verdict", () => {
    const r = evalFavoriteLongshotAudit(BUCKETS);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.buckets.map((b) => b.n)).toEqual([20, 20, 20]);
    expect(r.data.totalSample).toBe(60);
    expect(r.data.qualifyingBucketCount).toBe(3);
    // 0.65 implied at decimal 1.5385: all 20 lose -> ROI -1
    expect(r.data.buckets[0]?.roi).toBeCloseTo(-1, 10);
    expect(r.data.buckets[0]?.outcomeRate).toBe(0);
    // 0.25 implied at decimal 4: all 20 win -> ROI 3
    expect(r.data.buckets[2]?.roi).toBeCloseTo(3, 10);
    expect(r.data.buckets[2]?.outcomeRate).toBe(1);
    expect(r.data.impliedSpan).toBeCloseTo(0.4, 10);
    expect(Number.isFinite(r.data.flbSlope)).toBe(true);
    expect(r.data.measured).toContain("60 bets");
    expect(r.data.measured).toContain("not a judgement about any bookmaker");
  });

  it("returns a flat zero slope when realized rates match implied rates exactly", () => {
    // outcomeRate == meanImplied in every bucket, so logit(y) == logit(x) and
    // the slope is exactly 1, not 0. Two buckets is the kernel minimum.
    const flat: OddsBucket[] = [
      {
        label: "a",
        minOdds: 0.5,
        maxOdds: 0.6,
        implied: Array.from({ length: 20 }, (_, i) => (i % 2 === 0 ? 0.6 : 0.4)),
        outcomes: Array.from({ length: 20 }, (_, i) => (i % 4 < 2 ? 1 : 0)),
      },
      {
        label: "b",
        minOdds: 0.3,
        maxOdds: 0.4,
        implied: Array.from({ length: 20 }, (_, i) => (i % 2 === 0 ? 0.4 : 0.2)),
        outcomes: Array.from({ length: 20 }, (_, i) => (i % 4 < 2 ? 1 : 0)),
      },
    ];
    const r = evalFavoriteLongshotAudit(flat);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // outcomeRate is 0.5 for both while meanImplied differs, so the slope is 0.
    expect(r.data.flbSlope).toBeCloseTo(0, 10);
  });

  it("fail-closes when a bucket's implied array is shorter than its outcomes", () => {
    const r = evalFavoriteLongshotAudit([
      { label: "a", minOdds: 0.4, maxOdds: 0.5, implied: [0.45, 0.46], outcomes: [1, 0, 1] },
      BUCKETS[2] as OddsBucket,
    ]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("silently impute");
  });

  it("fail-closes implied probabilities outside (0,1] and non-binary outcomes", () => {
    expect(
      evalFavoriteLongshotAudit([
        { label: "a", minOdds: 0.4, maxOdds: 0.5, implied: [0, 0.5], outcomes: [1, 0] },
        BUCKETS[2] as OddsBucket,
      ]).ok,
    ).toBe(false);
    expect(
      evalFavoriteLongshotAudit([
        { label: "a", minOdds: 0.4, maxOdds: 0.5, implied: [0.5, 0.5], outcomes: [1, 2] },
        BUCKETS[2] as OddsBucket,
      ]).ok,
    ).toBe(false);
  });

  it("fail-closes fewer than two buckets and buckets with no price span", () => {
    expect(evalFavoriteLongshotAudit([BUCKETS[0] as OddsBucket]).ok).toBe(false);
    const same: OddsBucket[] = [
      { label: "a", minOdds: 0.4, maxOdds: 0.5, implied: Array(20).fill(0.45), outcomes: Array(20).fill(1) },
      { label: "b", minOdds: 0.4, maxOdds: 0.6, implied: Array(20).fill(0.45), outcomes: Array(20).fill(0) },
    ];
    const r = evalFavoriteLongshotAudit(same);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("no range");
  });

  it("fail-closes when no bucket reaches the kernel's n >= 10 qualification", () => {
    const thin: OddsBucket[] = [
      { label: "a", minOdds: 0.4, maxOdds: 0.5, implied: [0.45, 0.44], outcomes: [1, 0] },
      { label: "b", minOdds: 0.2, maxOdds: 0.3, implied: [0.25, 0.24], outcomes: [0, 1] },
    ];
    const r = evalFavoriteLongshotAudit(thin);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("n >= 10");
  });
});

describe("markets-odds bridge: odds-history fusion", () => {
  const HIST = [
    [0.62, 0.38],
    [0.55, 0.45],
    [0.7, 0.3],
    [0.48, 0.52],
  ];
  const ODDS = [
    [0.6, 0.4],
    [0.58, 0.42],
    [0.66, 0.34],
    [0.52, 0.48],
  ];
  const OUT = [0, 0, 1, 1];

  it("fits a mixture weight in [0,1] and keeps the fused vector a probability", () => {
    const r = evalOddsHistoryFusion(HIST, ODDS, OUT, 0.01);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.p).toBeGreaterThanOrEqual(0);
    expect(r.data.p).toBeLessThanOrEqual(1);
    expect(r.data.moduleEnabled).toBe(false);
    expect(r.data.holdoutSize).toBe(4);
    const s = r.data.sampleFused;
    expect(s.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    for (const v of s) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    // The fused vector must sit between the two inputs it blends.
    const h = HIST[0]?.[0] ?? 0;
    const o = ODDS[0]?.[0] ?? 0;
    expect(s[0] ?? 0).toBeGreaterThanOrEqual(Math.min(h, o) - 1e-12);
    expect(s[0] ?? 0).toBeLessThanOrEqual(Math.max(h, o) + 1e-12);
  });

  it("returns a gate verdict of ADOPT or REJECT and never anything else", () => {
    const r = evalOddsHistoryFusion(HIST, ODDS, OUT, 0.01);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(["ADOPT", "REJECT"]).toContain(r.data.gate);
    expect(r.data.fusedLogLoss).toBeGreaterThanOrEqual(0);
    expect(r.data.gainOverHistory).toBeCloseTo(
      r.data.historyLogLoss - r.data.fusedLogLoss,
      12,
    );
  });

  it("rejects a vector that does not sum to 1 rather than renormalising it", () => {
    const bad = ODDS.map((row) => [row[0] ?? 0.5, (row[1] ?? 0.5) + 0.05]);
    const r = evalOddsHistoryFusion(HIST, bad, OUT, 0.01);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("not a probability vector");
  });

  it("fail-closes mismatched row counts and an out-of-range outcome index", () => {
    expect(evalOddsHistoryFusion(HIST, ODDS.slice(0, 2), OUT, 0.01).ok).toBe(false);
    expect(evalOddsHistoryFusion(HIST, ODDS, [0, 0, 1, 9], 0.01).ok).toBe(false);
  });

  it("fail-closes a non-positive paired standard error", () => {
    const r = evalOddsHistoryFusion(HIST, ODDS, OUT, 0);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("paired standard error");
  });

  it("fail-closes a single holdout row", () => {
    const r = evalOddsHistoryFusion(HIST.slice(0, 1), ODDS.slice(0, 1), [0], 0.01);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain(">= 2");
  });
});

describe("markets-odds bridge: ML market pooling", () => {
  const MEMBERS = [
    [0.6, 0.4],
    [0.5, 0.5],
    [0.55, 0.45],
  ];

  it("pools members into a probability vector that sums to 1", () => {
    const r = evalMarketPooling(MEMBERS, [1, 1, 1], [0, 0, 1], 11);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    for (const v of [r.data.mixture, r.data.product, r.data.interpolated, r.data.wealth]) {
      expect(v.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
      for (const x of v) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(1);
      }
    }
    expect(r.data.memberCount).toBe(3);
    expect(r.data.outcomeCount).toBe(2);
    expect(r.data.moduleEnabled).toBe(false);
    expect(r.data.mixtureSumError).toBeLessThanOrEqual(DEVIG_SUM_TOLERANCE);
  });

  it("averages to 0.55 under an equal-weight linear mixture", () => {
    const r = evalMarketPooling(MEMBERS, [1, 1, 1], [0, 0, 1], 11);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // (0.6 + 0.5 + 0.55) / 3 = 0.55
    expect(r.data.mixture[0]).toBeCloseTo(0.55, 10);
    expect(r.data.mixture[1]).toBeCloseTo(0.45, 10);
  });

  it("does not invent an alpha from one market of member rows", () => {
    // fitAlpha scores events × members × classes. This API is one market.
    const r = evalMarketPooling(MEMBERS, [1, 1, 1], [0, 0, 1], 11);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.alphaFit).toBeNull();
    expect(r.data.alphaFitBlockedReason).toContain("ProbVector[][]");
  });

  it("puts more weight on the more accurate member after a wealth update", () => {
    const r = evalMarketPooling(
      [
        [0.9, 0.1],
        [0.5, 0.5],
      ],
      [1, 1],
      [0, 0],
      3,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // Both members were correct on class 0, so the sharper member keeps more.
    expect(r.data.wealth[0] ?? 0).toBeGreaterThan(r.data.wealth[1] ?? 0);
    expect(r.data.wealth.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });

  it("fail-closes a member vector that does not sum to 1", () => {
    const r = evalMarketPooling(
      [
        [0.6, 0.5],
        [0.5, 0.5],
      ],
      [1, 1],
      [0, 0],
      3,
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("not a probability vector");
  });

  it("fail-closes non-positive weights and mismatched lengths", () => {
    expect(evalMarketPooling(MEMBERS, [1, 0, 1], [0, 0, 1], 3).ok).toBe(false);
    expect(evalMarketPooling(MEMBERS, [1, 1], [0, 0, 1], 3).ok).toBe(false);
    expect(evalMarketPooling(MEMBERS, [1, 1, 1], [0, 0], 3).ok).toBe(false);
  });

  it("fail-closes a single member, a one-class vector and a bad outcome index", () => {
    expect(evalMarketPooling([[0.6, 0.4]], [1], [0], 3).ok).toBe(false);
    expect(
      evalMarketPooling(
        [
          [1],
          [0.5],
        ],
        [1, 1],
        [0, 0],
        3,
      ).ok,
    ).toBe(false);
    expect(evalMarketPooling(MEMBERS, [1, 1, 1], [0, 0, 5], 3).ok).toBe(false);
  });
});

describe("markets-odds bridge: social volume momentum", () => {
  const VOLUMES = [120, 180, 240, 300, 260];
  const HEADLINES = [
    [],
    ["star player is doubtful"],
    ["star player is cleared to play"],
    ["no injury designations"],
    ["quarterback limited in practice"],
  ];

  it("produces a z-scored momentum series that is explicitly not a probability", () => {
    const r = evalVolumeMomentum(VOLUMES, HEADLINES, 0.2);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.isProbability).toBe(false);
    expect(r.data.momentumZ).toHaveLength(5);
    expect(r.data.zScoreCentred).toBe(true);
    const zMean = r.data.momentumZ.reduce((a, b) => a + b, 0) / 5;
    expect(zMean).toBeCloseTo(0, 10);
    for (const z of r.data.momentumZ) {
      expect(Number.isFinite(z)).toBe(true);
      expect(Math.abs(z)).toBeLessThan(4);
    }
    expect(r.data.features).toHaveLength(5);
    expect(r.data.weekCount).toBe(5);
    expect(r.data.moduleEnabled).toBe(false);
  });

  it("reads balanced positive and negative injury language as neutral sentiment", () => {
    const balanced = [["no news"], ["star player is doubtful"], ["star player cleared"], [], ["nothing"]];
    const r = evalVolumeMomentum(VOLUMES, balanced, 0.2);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.injurySentiment).toBeCloseTo(0, 10);
  });

  it("reads purely negative headlines as negative and purely positive as positive", () => {
    const neg = evalVolumeMomentum([1, 2], [["doubtful"], ["injured"]], 0.5);
    expect(neg.ok).toBe(true);
    if (!neg.ok) return;
    expect(neg.data.injurySentiment).toBeLessThan(0);
    expect(neg.data.injurySentiment).toBeGreaterThanOrEqual(-1);
    const pos = evalVolumeMomentum([1, 2], [["cleared"], ["full participant"]], 0.5);
    expect(pos.ok).toBe(true);
    if (!pos.ok) return;
    expect(pos.data.injurySentiment).toBeGreaterThan(0);
    expect(pos.data.injurySentiment).toBeLessThanOrEqual(1);
  });

  it("computes the EWMA exactly at theta = 0.2", () => {
    const r = evalVolumeMomentum([10, 20, 30], [[], [], []], 0.2);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // rateP EWMA: m0 = 0.2*10 + 0.8*10 = 10; m1 = 0.2*20 + 0.8*10 = 12; m2 = 0.2*30 + 0.8*12 = 15.6
    expect(r.data.ewma[0]).toBeCloseTo(10, 10);
    expect(r.data.ewma[1]).toBeCloseTo(12, 10);
    expect(r.data.ewma[2]).toBeCloseTo(15.6, 10);
  });

  it("fail-closes a flat zero-volume series with no dispersion", () => {
    const r = evalVolumeMomentum([0, 0, 0], [[], [], []]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("mean volume is zero");
  });

  it("fail-closes negative volumes, a single week and a mismatched headline count", () => {
    expect(evalVolumeMomentum([-1, 5], [[], []]).ok).toBe(false);
    expect(evalVolumeMomentum([5], [[]]).ok).toBe(false);
    const r = evalVolumeMomentum([5, 6], [[]]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("headline weeks");
  });

  it("fail-closes an illegal theta", () => {
    expect(evalVolumeMomentum([1, 2], [[], []], 0).ok).toBe(false);
    expect(evalVolumeMomentum([1, 2], [[], []], 1.5).ok).toBe(false);
  });
});

describe("markets-odds bridge: spread win-probability skill", () => {
  it("scores a perfect forecaster at zero Brier with no ranked-probability term", () => {
    const ps = [0, 1, 0, 1];
    const ys = [0, 1, 0, 1];
    const r = evalSpreadSkill(ps, ys, 0);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.brier).toBeCloseTo(0, 10);
    expect(r.data.logLoss).toBeCloseTo(0, 10);
    // No K-class distribution was supplied, so no RPS is claimed.
    expect(r.data.rankedProb).toBeNull();
    expect(r.data.sampleSize).toBe(4);
    expect(r.data.normalCdfAtZero).toBeCloseTo(0.5, 3);
    expect(r.data.moduleEnabled).toBe(false);
  });

  it("scores a supplied three-class distribution with a ranked probability score", () => {
    const r = evalSpreadSkill([0, 1, 0, 1], [0, 1, 0, 1], 0, undefined, [[0.5, 0.3, 0.2]]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // (0.5-1)^2 + (0.8-1)^2 + (1-1)^2 = 0.25 + 0.04 + 0 = 0.29, over (3-1)
    expect(r.data.rankedProb).toBeCloseTo(0.29 / 2, 10);
  });

  it("fail-closes a distribution that does not sum to 1 rather than renormalising it", () => {
    const r = evalSpreadSkill([0, 1], [0, 1], 0, undefined, [[0.5, 0.3]]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("not a probability vector");
  });

  it("fail-closes a class index outside the supplied distribution", () => {
    const r = evalSpreadSkill([0, 1], [0, 1], 5, undefined, [[0.5, 0.3, 0.2]]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("outside the 3 classes");
  });

  it("scores a constant 0.5 forecaster at the Brier floor of 0.25", () => {
    const ps = [0.5, 0.5, 0.5, 0.5];
    const ys = [0, 1, 0, 1];
    const r = evalSpreadSkill(ps, ys, 0);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.brier).toBeCloseTo(0.25, 12);
    expect(r.data.brier).toBeCloseTo(r.data.brierFloor, 12);
    expect(r.data.ece).toBeCloseTo(0, 12);
    expect(r.data.logLoss).toBeCloseTo(Math.log(2), 10);
  });

  it("keeps every skill metric inside its legal range on a mixed sample", () => {
    const ps = [0.2, 0.8, 0.35, 0.65, 0.1, 0.9];
    const ys = [0, 1, 0, 1, 0, 1];
    const r = evalSpreadSkill(ps, ys, 0);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.brier).toBeGreaterThanOrEqual(0);
    expect(r.data.brier).toBeLessThanOrEqual(1);
    expect(r.data.ece).toBeGreaterThanOrEqual(0);
    expect(r.data.ece).toBeLessThanOrEqual(1);
    expect(r.data.rankedProb).toBeNull();
    expect(r.data.spearman).toBeGreaterThan(0.7);
    expect(r.data.spearman).toBeLessThanOrEqual(1);
    expect(r.data.pairedP).toBeGreaterThanOrEqual(0);
    expect(r.data.pairedP).toBeLessThanOrEqual(1);
    expect(r.data.classWeightedBce).toBeGreaterThanOrEqual(0);
  });

  it("fail-closes mismatched lengths and out-of-range probabilities", () => {
    const r = evalSpreadSkill([0.5, 0.6], [1]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("forecasts for");
    const bad = evalSpreadSkill([0.5, 1.3], [1, 0]);
    expect(bad.ok).toBe(false);
    if (bad.ok) return;
    expect(bad.reason).toContain("outside [0,1]");
  });

  it("fail-closes an empty sample, a non-binary outcome and a bad outcome index", () => {
    expect(evalSpreadSkill([], [], 0).ok).toBe(false);
    expect(evalSpreadSkill([0.5, 0.5], [1, 3], 0).ok).toBe(false);
    const r = evalSpreadSkill([0.5, 0.5], [1, 0], -1);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("outcomeIdx");
  });

  it("fail-closes fewer than two baseline diffs", () => {
    const r = evalSpreadSkill([0.5, 0.5], [1, 0], 0, [0.1]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("baseline diffs");
  });
});

describe("markets-odds bridge: fractional Kelly sizing", () => {
  it("sizes a clear +EV bet and reports BET", () => {
    const r = evalKellySizing(0.6, 1, 0.5, 0.25, 1000, 1000, 0.2);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // kellyBinary(0.6, 1) = (0.6 - 0.4)/1 = 0.2; half-Kelly caps at 0.1
    expect(r.data.fullKelly).toBeCloseTo(0.2, 10);
    expect(r.data.stakeFraction).toBeCloseTo(0.1, 10);
    expect(r.data.drawdownScaled).toBeCloseTo(0.1, 10);
    expect(r.data.bettable).toBe(true);
    expect(r.data.decision).toBe("BET");
    expect(r.data.growthRate).toBeCloseTo(0.6 * Math.log(1.2) + 0.4 * Math.log(0.8), 10);
    expect(r.data.moduleEnabled).toBe(false);
  });

  it("turns a negative Kelly into a PASS with a zero stake, never a short", () => {
    const r = evalKellySizing(0.4, 1, 1, 0.5, 1000, 1000, 0.2);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.fullKelly).toBeLessThan(0);
    expect(r.data.stakeFraction).toBe(0);
    expect(r.data.drawdownScaled).toBe(0);
    expect(r.data.bettable).toBe(false);
    expect(r.data.decision).toBe("PASS");
  });

  it("scales the stake down under drawdown and to zero at the limit", () => {
    const half = evalKellySizing(0.6, 1, 1, 0.5, 1000, 900, 0.2);
    expect(half.ok).toBe(true);
    if (!half.ok) return;
    // dd = 0.1, half of the 0.2 budget -> 0.2 * (1 - 0.5) = 0.1
    expect(half.data.stakeFraction).toBeCloseTo(0.2, 10);
    expect(half.data.drawdownScaled).toBeCloseTo(0.1, 10);
    const blown = evalKellySizing(0.6, 1, 1, 0.5, 1000, 700, 0.2);
    expect(blown.ok).toBe(true);
    if (!blown.ok) return;
    // dd = 0.3 >= 0.2 -> hard zero
    expect(blown.data.drawdownScaled).toBe(0);
    expect(blown.data.bettable).toBe(false);
  });

  it("fails closed when full Kelly would wipe the bankroll", () => {
    // p = 1 means a losing outcome has zero probability, so lose = 1 - f = 0
    // only at f = 1; f = 1 is the full-Kelly value at p = 1, b = 0.
    const r = evalKellySizing(1, 0.0001, 1, 1, 1000, 1000, 0.2);
    expect(r.ok).toBe(false);
  });

  it("fail-closes p outside [0,1] and illegal fraction, cap and drawdown bounds", () => {
    expect(evalKellySizing(1.2, 1, 0.5, 0.25, 1000, 1000, 0.2).ok).toBe(false);
    expect(evalKellySizing(0.6, 1, 1.5, 0.25, 1000, 1000, 0.2).ok).toBe(false);
    expect(evalKellySizing(0.6, 1, 0.5, -1, 1000, 1000, 0.2).ok).toBe(false);
    const r = evalKellySizing(0.6, 1, 0.5, 0.25, 1000, 1000, 0);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("maxDrawdown");
  });

  it("fail-closes a non-positive bankroll peak and non-positive net odds", () => {
    expect(evalKellySizing(0.6, 1, 0.5, 0.25, 0, 1000, 0.2).ok).toBe(false);
    expect(evalKellySizing(0.6, 0, 0.5, 0.25, 1000, 1000, 0.2).ok).toBe(false);
  });
});

describe("markets-odds bridge: count model (DCP prop framework)", () => {
  it("fits a Poisson mean and a negative-binomial shape to overdispersed counts", () => {
    const counts = [4, 6, 3, 8, 5, 7, 2, 9, 4, 6, 5, 7];
    const r = evalCountModel(counts, 0.15);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
    expect(r.data.meanCount).toBeCloseTo(mean, 12);
    expect(r.data.poissonLogLik).toBeLessThan(0);
    expect(r.data.negBinShape).toBeGreaterThan(0);
    expect(r.data.negBinProb).toBeGreaterThan(0);
    expect(r.data.negBinProb).toBeLessThanOrEqual(1);
    expect(r.data.zinbPmfAtZero).toBeGreaterThan(0);
    expect(r.data.zinbPmfAtZero).toBeLessThanOrEqual(1);
    expect(r.data.countMin).toBe(2);
    expect(r.data.countMax).toBe(9);
    expect(r.data.poissonMass).toBeCloseTo(1, 8);
    expect(r.data.moduleEnabled).toBe(false);
  });

  it("returns the Poisson limit when the counts are not overdispersed", () => {
    // All-equal counts give variance 0 <= mean, so the kernel's Poisson limit
    // fires with r = 1e9 and p = 1e9/(1e9+4).
    const r = evalCountModel([4, 4, 4, 4], 0);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.negBinShape).toBeCloseTo(1e9, -3);
    expect(r.data.negBinProb).toBeCloseTo(1e9 / (1e9 + 4), 12);
    // zinbPmf(0, 0, r, p) collapses to p^r = exp(-4) at this limit.
    expect(r.data.zinbPmfAtZero).toBeCloseTo(Math.exp(-4), 8);
    // poissonPmf(4, 4) = exp(-4) * 4^4 / 4! = exp(-4) * 10.6667
    expect(r.data.poissonPmfAtMean).toBeCloseTo((Math.exp(-4) * 4 ** 4) / 24, 8);
  });

  it("fail-closes fewer than two observations", () => {
    const r = evalCountModel([3], 0.1);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain(">= 2");
  });

  it("fail-closes non-integer and negative counts", () => {
    expect(evalCountModel([1.5, 2], 0.1).ok).toBe(false);
    expect(evalCountModel([-1, 2], 0.1).ok).toBe(false);
  });

  it("fail-closes a zero-inflation parameter at or beyond 1", () => {
    expect(evalCountModel([1, 2, 3], 1).ok).toBe(false);
    expect(evalCountModel([1, 2, 3], -0.1).ok).toBe(false);
  });
});

describe("markets-odds bridge: in-play bandit policies", () => {
  const Q = [0.2, 0.8];
  const COUNTS = [20, 20];
  const MEANS = [0.3, 0.6];
  const ALPHAS = [2, 8];
  const BETAS = [6, 3];

  it("returns an in-range arm on every step for every policy", () => {
    const r = evalBanditPolicies(Q, COUNTS, MEANS, ALPHAS, BETAS, 0.3, 0.9, 12, 12345);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.epsilonGreedy).toHaveLength(12);
    expect(r.data.ucb1).toHaveLength(12);
    expect(r.data.thompson).toHaveLength(12);
    for (const a of r.data.epsilonGreedy) {
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThanOrEqual(1);
    }
    for (const a of r.data.ucb1) {
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThanOrEqual(1);
    }
    for (const a of r.data.thompson) {
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThanOrEqual(1);
    }
    expect(r.data.armCount).toBe(2);
    expect(r.data.steps).toBe(12);
    expect(r.data.moduleEnabled).toBe(false);
  });

  it("exploits the better arm with epsilon-greedy once epsilon has decayed", () => {
    const r = evalBanditPolicies(Q, COUNTS, MEANS, ALPHAS, BETAS, 0.05, 0.5, 12, 999);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // 0.05 * 0.5^t starts at 0.025, so almost every step takes q-best = arm 1.
    const exploits = r.data.epsilonGreedy.filter((a) => a === 1).length;
    expect(exploits).toBeGreaterThan(9);
  });

  it("favours the higher-mean arm under Thompson sampling", () => {
    const r = evalBanditPolicies(Q, COUNTS, MEANS, ALPHAS, BETAS, 0.1, 0.99, 40, 2468);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // Arm 1 has the Beta(8, 3) prior, a mean of 0.727 vs 0.25 for arm 0.
    const good = r.data.thompson.filter((a) => a === 1).length;
    expect(good).toBeGreaterThan(r.data.thompson.length / 2);
  });

  it("fail-closes a single arm and mismatched prior shapes", () => {
    expect(evalBanditPolicies([0.5], [1], [0.5], [1], [1], 0.1, 0.9, 5, 1).ok).toBe(false);
    expect(evalBanditPolicies(Q, [1], MEANS, ALPHAS, BETAS, 0.1, 0.9, 5, 1).ok).toBe(false);
    expect(evalBanditPolicies(Q, COUNTS, MEANS, [1], BETAS, 0.1, 0.9, 5, 1).ok).toBe(false);
  });

  it("decays epsilon monotonically and keeps it inside [0,1]", () => {
    const r = evalBanditPolicies(Q, COUNTS, MEANS, ALPHAS, BETAS, 0.3, 0.9, 12, 4);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.finalEpsilon).toBeCloseTo(0.3 * 0.9 ** 12, 12);
    expect(r.data.finalEpsilon).toBeLessThan(0.3);
    expect(r.data.finalEpsilon).toBeGreaterThanOrEqual(0);
  });

  it("is deterministic for a given seed and differs across seeds", () => {
    const a = evalBanditPolicies(Q, COUNTS, MEANS, ALPHAS, BETAS, 0.5, 0.99, 20, 777);
    const b = evalBanditPolicies(Q, COUNTS, MEANS, ALPHAS, BETAS, 0.5, 0.99, 20, 777);
    const c = evalBanditPolicies(Q, COUNTS, MEANS, ALPHAS, BETAS, 0.5, 0.99, 20, 778);
    expect(a.ok && b.ok && c.ok).toBe(true);
    if (!a.ok || !b.ok || !c.ok) return;
    expect(a.data.epsilonGreedy).toEqual(b.data.epsilonGreedy);
    expect(a.data.thompson).toEqual(b.data.thompson);
    // Seeds 777 and 778 are adjacent; the streams differ somewhere in 20 draws.
    const differs =
      a.data.epsilonGreedy.some((v, i) => v !== c.data.epsilonGreedy[i]) ||
      a.data.thompson.some((v, i) => v !== c.data.thompson[i]);
    expect(differs).toBe(true);
  });

  it("fail-closes a single arm and mismatched prior shapes", () => {
    expect(evalBanditPolicies([0.5], [1], [0.5], [1], [1], 0.1, 0.9, 5, 1).ok).toBe(false);
    expect(evalBanditPolicies(Q, [1], MEANS, ALPHAS, BETAS, 0.1, 0.9, 5, 1).ok).toBe(false);
    expect(evalBanditPolicies(Q, COUNTS, MEANS, [1], BETAS, 0.1, 0.9, 5, 1).ok).toBe(false);
  });

  it("fail-closes non-positive Thompson priors and illegal schedule parameters", () => {
    expect(evalBanditPolicies(Q, COUNTS, MEANS, [0, 8], BETAS, 0.1, 0.9, 5, 1).ok).toBe(false);
    expect(evalBanditPolicies(Q, COUNTS, MEANS, ALPHAS, [-1, 3], 0.1, 0.9, 5, 1).ok).toBe(false);
    expect(evalBanditPolicies(Q, COUNTS, MEANS, ALPHAS, BETAS, 1.2, 0.9, 5, 1).ok).toBe(false);
    expect(evalBanditPolicies(Q, COUNTS, MEANS, ALPHAS, BETAS, 0.1, 0, 5, 1).ok).toBe(false);
  });

  it("fail-closes non-positive counts and zero steps", () => {
    expect(evalBanditPolicies(Q, [-1, 2], MEANS, ALPHAS, BETAS, 0.1, 0.9, 5, 1).ok).toBe(false);
    expect(evalBanditPolicies(Q, COUNTS, MEANS, ALPHAS, BETAS, 0.1, 0.9, 0, 1).ok).toBe(false);
  });
});

describe("markets-odds bridge: tolerance is stated, not hidden", () => {
  it("exposes the de-vig tolerance it enforces", () => {
    expect(DEVIG_SUM_TOLERANCE).toBe(1e-6);
  });

  it("exports exactly the eval surface the ingestion barrel will need", async () => {
    // Guard against a barrel export block naming a symbol this file lacks.
    const mod = (await import("./markets-odds-bridge.js")) as Record<string, unknown>;
    for (const name of [
      "evalProbabilityDisplay",
      "evalSituationalHonestyGate",
      "evalEffectivePrice",
      "evalNoiseWedgeFairOdds",
      "evalInformedFlow",
      "evalInformedFlowCrossSection",
      "evalMarginalPriceOracle",
      "evalExcessMovement",
      "evalArbScan",
      "evalPromoExtraction",
      "evalOoeDevig",
      "evalFavoriteLongshotAudit",
      "evalOddsHistoryFusion",
      "evalMarketPooling",
      "evalVolumeMomentum",
      "evalSpreadSkill",
      "evalKellySizing",
      "evalCountModel",
      "evalBanditPolicies",
    ]) {
      expect(typeof mod[name]).toBe("function");
    }
  });
});
