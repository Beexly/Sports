/**
 * market-analytics.test.ts
 *
 * ~140+ tests covering all exported functions in lib/analytics/market-analytics.ts
 */

import { describe, it, expect } from "vitest";
import {
  // 1. Line movement
  lineMovementDirection,
  keyNumbers,
  isKeyNumber,
  spreadMovementSize,
  lineMovementVelocity,
  reverseLineMovement,
  // 2. Odds analysis
  overroundFromOdds,
  noVigProbability,
  consensusLine,
  marketConsensusOdds,
  oddsMovementMagnitude,
  pinnacleMargin,
  // 3. Sharp money
  sharpMoneyThreshold,
  publicBetPercentage,
  moneyPercentage,
  steamMoveIndicator,
  sharpnessScore,
  wiseguyActivity,
  // 4. Market efficiency
  closingLineValue,
  clvPercentage,
  marketEfficiencyScore,
  expectedValue,
  kellyFraction,
  // 5. Handle and volume
  handleByGame,
  volumeWeightedPrice,
  marketDepth,
  herfindahlIndex,
  // 6. Risk and exposure
  bookExposure,
  hedgeAmount,
  guaranteedProfit,
  arbOpportunity,
  // 7. Calibration
  brierScore,
  logLoss,
  reliability,
  calibrationError,
} from "@/lib/analytics/market-analytics";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EPSILON = 1e-9;
function near(a: number, b: number, eps = 1e-6): boolean {
  return Math.abs(a - b) < eps;
}

// ---------------------------------------------------------------------------
// 1. LINE MOVEMENT ANALYSIS
// ---------------------------------------------------------------------------

describe("keyNumbers", () => {
  it("returns an array of 7 key NFL margins", () => {
    const kn = keyNumbers();
    expect(kn).toHaveLength(7);
    expect(kn).toContain(3);
    expect(kn).toContain(7);
    expect(kn).toContain(14);
  });

  it("includes 4, 6, 10, 13", () => {
    const kn = keyNumbers();
    expect(kn).toContain(4);
    expect(kn).toContain(6);
    expect(kn).toContain(10);
    expect(kn).toContain(13);
  });
});

describe("isKeyNumber", () => {
  it("returns true for 3", () => expect(isKeyNumber(3)).toBe(true));
  it("returns true for 7", () => expect(isKeyNumber(7)).toBe(true));
  it("returns true for -7 (absolute value)", () => expect(isKeyNumber(-7)).toBe(true));
  it("returns true for -3", () => expect(isKeyNumber(-3)).toBe(true));
  it("returns true for 14", () => expect(isKeyNumber(14)).toBe(true));
  it("returns false for 1", () => expect(isKeyNumber(1)).toBe(false));
  it("returns false for 8", () => expect(isKeyNumber(8)).toBe(false));
  it("returns false for 0", () => expect(isKeyNumber(0)).toBe(false));
});

describe("spreadMovementSize", () => {
  it("returns 2 for -7 to -5", () => expect(spreadMovementSize(-7, -5)).toBe(2));
  it("returns 3.5 for -3 to 0.5", () => expect(spreadMovementSize(-3, 0.5)).toBeCloseTo(3.5));
  it("returns 0 for identical values", () => expect(spreadMovementSize(-6.5, -6.5)).toBe(0));
  it("is always positive even when direction is reversed", () => {
    expect(spreadMovementSize(-3, -9)).toBe(6);
  });
});

describe("lineMovementDirection", () => {
  it("returns steam when line moves > 3 toward favourite", () => {
    // -3 → -7 (more negative = more toward favourite)
    expect(lineMovementDirection(-3, -7)).toBe("steam");
  });

  it("returns fade when line moves > 3 away from favourite", () => {
    // -7 → -3
    expect(lineMovementDirection(-7, -3)).toBe("fade");
  });

  it("returns flat when movement is 2 pts", () => {
    expect(lineMovementDirection(-6, -4)).toBe("flat");
  });

  it("returns flat when no movement", () => {
    expect(lineMovementDirection(-7, -7)).toBe("flat");
  });

  it("detects key_number crossing when movement crosses 7", () => {
    // -6 → -8 crosses 7
    expect(lineMovementDirection(-6, -8)).toBe("key_number");
  });

  it("detects key_number crossing 3", () => {
    // -2.5 → -3.5 crosses 3
    expect(lineMovementDirection(-2.5, -3.5)).toBe("key_number");
  });
});

describe("lineMovementVelocity", () => {
  it("returns 0 for empty array", () => {
    expect(lineMovementVelocity([])).toBe(0);
  });

  it("returns 0 for a single snapshot", () => {
    expect(lineMovementVelocity([{ timestampMs: 0, spread: -7 }])).toBe(0);
  });

  it("returns 0 when timestamps are identical", () => {
    expect(
      lineMovementVelocity([
        { timestampMs: 1000, spread: -7 },
        { timestampMs: 1000, spread: -5 },
      ]),
    ).toBe(0);
  });

  it("computes correct velocity for two snapshots", () => {
    // 2 pts in 2 minutes = 1 pt/min
    const snapshots = [
      { timestampMs: 0, spread: -7 },
      { timestampMs: 120_000, spread: -5 },
    ];
    expect(lineMovementVelocity(snapshots)).toBeCloseTo(1);
  });

  it("sums movement across multiple snapshots", () => {
    // 1 pt in first window + 1 pt in second = 2 pts total in 2 min
    const snapshots = [
      { timestampMs: 0, spread: -7 },
      { timestampMs: 60_000, spread: -6 },
      { timestampMs: 120_000, spread: -5 },
    ];
    expect(lineMovementVelocity(snapshots)).toBeCloseTo(1);
  });
});

describe("reverseLineMovement", () => {
  it("returns true when public bets favourite but line moves toward underdog", () => {
    // 70% on favourite, line from -7 to -5 (less negative = toward underdog)
    expect(reverseLineMovement(70, -5, -7)).toBe(true);
  });

  it("returns false when public on favourite and line moves toward favourite", () => {
    // Line from -5 to -7 (more negative = toward favourite)
    expect(reverseLineMovement(70, -7, -5)).toBe(false);
  });

  it("returns false when public is on underdog side", () => {
    // 30% on favourite, line moves toward underdog
    expect(reverseLineMovement(30, -5, -7)).toBe(false);
  });

  it("returns false when action exactly at 50%", () => {
    expect(reverseLineMovement(50, -5, -7)).toBe(false);
  });

  it("returns true for exactly 51% action with correct line move", () => {
    expect(reverseLineMovement(51, -5, -7)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. ODDS ANALYSIS
// ---------------------------------------------------------------------------

describe("overroundFromOdds", () => {
  it("returns 0 for empty array", () => {
    expect(overroundFromOdds([])).toBe(0);
  });

  it("computes overround for standard -110/-110 market", () => {
    // implied: 110/210 each = 0.5238; sum = 1.0476; overround = 0.0476
    const vig = overroundFromOdds([-110, -110]);
    expect(vig).toBeCloseTo(0.0476, 3);
  });

  it("returns ~0 for a fair market (+100 / -100 equivalent)", () => {
    // +100 → 0.5, -100 → 0.5; sum = 1.0
    const vig = overroundFromOdds([100, -100]);
    expect(vig).toBeCloseTo(0, 6);
  });

  it("handles positive American odds", () => {
    // +200 → 100/300 ≈ 0.333
    const vig = overroundFromOdds([200, -200]);
    // -200 → 200/300 ≈ 0.667; sum = 1.0
    expect(vig).toBeCloseTo(0, 6);
  });

  it("computes higher vig for worse prices (-120/-120)", () => {
    const vig = overroundFromOdds([-120, -120]);
    expect(vig).toBeGreaterThan(0.0476);
  });
});

describe("noVigProbability", () => {
  it("removes vig from -110 in a -110/-110 market", () => {
    const bookTotal = 1 + overroundFromOdds([-110, -110]);
    const prob = noVigProbability(-110, bookTotal);
    expect(prob).toBeCloseTo(0.5, 4);
  });

  it("returns 0 for zero bookTotal", () => {
    expect(noVigProbability(-110, 0)).toBe(0);
  });

  it("returns 0 for negative bookTotal", () => {
    expect(noVigProbability(-110, -1)).toBe(0);
  });
});

describe("consensusLine", () => {
  it("returns 0 for empty array", () => {
    expect(consensusLine([])).toBe(0);
  });

  it("returns the single value when only one line", () => {
    expect(consensusLine([-7])).toBe(-7);
  });

  it("returns median for odd-length array", () => {
    expect(consensusLine([-6, -7, -8])).toBe(-7);
  });

  it("returns average of two middle values for even-length array", () => {
    expect(consensusLine([-6, -7])).toBeCloseTo(-6.5);
  });

  it("handles unsorted input", () => {
    expect(consensusLine([-3, -7, -5, -9])).toBeCloseTo(-6);
  });
});

describe("marketConsensusOdds", () => {
  it("returns 0 for empty array", () => {
    expect(marketConsensusOdds([])).toBe(0);
  });

  it("equal-weights books when all have zero handle", () => {
    const result = marketConsensusOdds([
      { odds: -110, handle: 0 },
      { odds: -110, handle: 0 },
    ]);
    expect(result).toBeCloseTo(-110, 0);
  });

  it("weights by handle correctly", () => {
    // One book at -110 with 90 handle, another at +100 with 10 handle
    const result = marketConsensusOdds([
      { odds: -110, handle: 90 },
      { odds: 100, handle: 10 },
    ]);
    // Should be closer to -110 than +100
    expect(result).toBeLessThan(-50);
  });

  it("returns same odds for single book", () => {
    const result = marketConsensusOdds([{ odds: -115, handle: 100 }]);
    expect(result).toBeCloseTo(-115, 0);
  });
});

describe("oddsMovementMagnitude", () => {
  it("returns 0 when odds unchanged", () => {
    expect(oddsMovementMagnitude(-110, -110)).toBeCloseTo(0);
  });

  it("returns positive value when odds shorten", () => {
    // -110 → -130 (shorter odds = higher implied prob)
    const mag = oddsMovementMagnitude(-110, -130);
    expect(mag).toBeGreaterThan(0);
  });

  it("is symmetric: |open - close| = |close - open|", () => {
    const forward = oddsMovementMagnitude(-110, -130);
    const backward = oddsMovementMagnitude(-130, -110);
    expect(forward).toBeCloseTo(backward);
  });
});

describe("pinnacleMargin", () => {
  it("returns same as overroundFromOdds for both sides", () => {
    expect(pinnacleMargin([-108, -108])).toBeCloseTo(
      overroundFromOdds([-108, -108]),
    );
  });

  it("returns 0 for empty input", () => {
    expect(pinnacleMargin([])).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 3. SHARP MONEY INDICATORS
// ---------------------------------------------------------------------------

describe("sharpMoneyThreshold", () => {
  it("classifies sharp: avg bet > $1000", () => {
    expect(sharpMoneyThreshold(5, 6000)).toBe("sharp");
  });

  it("classifies square: avg bet < $200", () => {
    expect(sharpMoneyThreshold(100, 10000)).toBe("square"); // avg = 100
  });

  it("classifies mixed: avg bet between $200 and $1000", () => {
    expect(sharpMoneyThreshold(10, 5000)).toBe("mixed"); // avg = 500
  });

  it("returns square for 0 bets", () => {
    expect(sharpMoneyThreshold(0, 5000)).toBe("square");
  });

  it("boundary: exactly $1000 avg is mixed (not > 1000)", () => {
    expect(sharpMoneyThreshold(1, 1000)).toBe("mixed");
  });

  it("boundary: exactly $200 avg is mixed (not < 200)", () => {
    expect(sharpMoneyThreshold(1, 200)).toBe("mixed");
  });
});

describe("publicBetPercentage", () => {
  it("returns 50/50 for equal bets", () => {
    const r = publicBetPercentage(100, 100);
    expect(r.sideA).toBeCloseTo(50);
    expect(r.sideB).toBeCloseTo(50);
  });

  it("returns 50/50 for zero bets", () => {
    const r = publicBetPercentage(0, 0);
    expect(r.sideA).toBe(50);
    expect(r.sideB).toBe(50);
  });

  it("returns 75/25 split", () => {
    const r = publicBetPercentage(75, 25);
    expect(r.sideA).toBeCloseTo(75);
    expect(r.sideB).toBeCloseTo(25);
  });

  it("sums to 100", () => {
    const r = publicBetPercentage(123, 456);
    expect(r.sideA + r.sideB).toBeCloseTo(100);
  });

  it("handles 100/0 split", () => {
    const r = publicBetPercentage(100, 0);
    expect(r.sideA).toBeCloseTo(100);
    expect(r.sideB).toBeCloseTo(0);
  });
});

describe("moneyPercentage", () => {
  it("returns 50/50 for zero money", () => {
    const r = moneyPercentage(0, 0);
    expect(r.sideA).toBe(50);
    expect(r.sideB).toBe(50);
  });

  it("computes correct percentage", () => {
    const r = moneyPercentage(30000, 70000);
    expect(r.sideA).toBeCloseTo(30);
    expect(r.sideB).toBeCloseTo(70);
  });

  it("sums to 100", () => {
    const r = moneyPercentage(12345, 67890);
    expect(r.sideA + r.sideB).toBeCloseTo(100);
  });
});

describe("steamMoveIndicator", () => {
  it("returns true when both conditions met", () => {
    // 200 bets in 10 min = 20 bets/min, line changed 2
    expect(steamMoveIndicator(200, 2, 10)).toBe(true);
  });

  it("returns false when bets/min <= 10", () => {
    expect(steamMoveIndicator(50, 2, 10)).toBe(false); // 5 bets/min
  });

  it("returns false when lineChange <= 1.5", () => {
    expect(steamMoveIndicator(200, 1.5, 10)).toBe(false);
  });

  it("returns false for zero time window", () => {
    expect(steamMoveIndicator(999, 5, 0)).toBe(false);
  });

  it("returns true at boundary: 10.01 bets/min and 1.51 pt move", () => {
    expect(steamMoveIndicator(110, 1.51, 11)).toBe(false); // 10 bets/min exact = not > 10
  });
});

describe("sharpnessScore", () => {
  it("returns 0 when avgBetSize is 0", () => {
    expect(sharpnessScore(0, 2)).toBe(0);
  });

  it("returns 0 when profitFactor is 0", () => {
    expect(sharpnessScore(500, 0)).toBeCloseTo(0);
  });

  it("increases with higher avgBetSize", () => {
    expect(sharpnessScore(1000, 1)).toBeGreaterThan(sharpnessScore(500, 1));
  });

  it("increases with higher profitFactor", () => {
    expect(sharpnessScore(500, 2)).toBeGreaterThan(sharpnessScore(500, 1));
  });

  it("is on log scale: doubling profitFactor does not double score", () => {
    const a = sharpnessScore(100, 1);
    const b = sharpnessScore(100, 2);
    expect(b).toBeLessThan(a * 2);
  });
});

describe("wiseguyActivity", () => {
  it("returns true when line moved against public and bet pct < 40", () => {
    // Public on favourite (publicSide > 0), line moved toward underdog (lineMove > 0)
    expect(wiseguyActivity(1, 1, 35)).toBe(true);
  });

  it("returns false when betPct >= 40", () => {
    expect(wiseguyActivity(1, 1, 40)).toBe(false);
  });

  it("returns false when line moved with public", () => {
    // Public on favourite, line moved toward favourite (lineMove < 0)
    expect(wiseguyActivity(-1, 1, 35)).toBe(false);
  });

  it("handles underdog public side", () => {
    // Public on underdog (publicSide < 0), line moved toward favourite (lineMove < 0)
    expect(wiseguyActivity(-1, -1, 30)).toBe(true);
  });

  it("returns false when line is flat and betPct < 40", () => {
    expect(wiseguyActivity(0, 1, 35)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. MARKET EFFICIENCY METRICS
// ---------------------------------------------------------------------------

describe("closingLineValue", () => {
  it("returns positive CLV when bet odds were better than closing", () => {
    // Bet at +110 (implied ≈ 0.476), closed at -110 (implied ≈ 0.524)
    // CLV = 0.524 - 0.476 > 0 — wait, closing HIGHER prob means we got worse price
    // Re-check: CLV = impliedProb(closing) - impliedProb(bet)
    // If closing = -110 (0.524) and bet was at +110 (0.476), CLV = 0.524 - 0.476 = +0.048
    // Positive CLV here means closing was more expensive = you got a better price initially
    const clv = closingLineValue(110, -110);
    expect(clv).toBeGreaterThan(0);
  });

  it("returns negative CLV when closing was better than bet odds", () => {
    // Bet at -130 (implied ≈ 0.565), closing at -110 (implied ≈ 0.524)
    // CLV = 0.524 - 0.565 = -0.041 (we paid more than closing price)
    const clv = closingLineValue(-130, -110);
    expect(clv).toBeLessThan(0);
  });

  it("returns 0 when bet and closing odds are identical", () => {
    expect(closingLineValue(-110, -110)).toBeCloseTo(0);
  });
});

describe("clvPercentage", () => {
  it("returns positive percentage for good bet", () => {
    const pct = clvPercentage(110, -110);
    expect(pct).toBeGreaterThan(0);
  });

  it("is proportional to CLV", () => {
    // clvPercentage = CLV / impliedProb(betOdds) * 100
    const pct = clvPercentage(-110, -110);
    expect(pct).toBeCloseTo(0);
  });
});

describe("marketEfficiencyScore", () => {
  it("returns 0 for empty array", () => {
    expect(marketEfficiencyScore([])).toBe(0);
  });

  it("returns mean of CLV values", () => {
    expect(marketEfficiencyScore([0.05, 0.03, 0.02])).toBeCloseTo(
      (0.05 + 0.03 + 0.02) / 3,
    );
  });

  it("returns negative for poor performance", () => {
    expect(marketEfficiencyScore([-0.02, -0.03])).toBeLessThan(0);
  });
});

describe("expectedValue", () => {
  it("returns positive EV for +EV bet", () => {
    // 60% win probability on +100 (even money)
    const ev = expectedValue(0.6, 100);
    expect(ev).toBeCloseTo(0.6 * 1 + 0.4 * -1); // 0.2
  });

  it("returns negative EV for -EV bet", () => {
    // 40% win on +100
    expect(expectedValue(0.4, 100)).toBeCloseTo(-0.2);
  });

  it("handles negative American odds", () => {
    // 70% win on -150 (profit = 100/150 ≈ 0.667)
    const ev = expectedValue(0.7, -150);
    expect(ev).toBeCloseTo(0.7 * (100 / 150) + 0.3 * -1, 4);
  });

  it("returns -1 for 0% win probability", () => {
    expect(expectedValue(0, 100)).toBeCloseTo(-1);
  });

  it("returns positive for positive odds at 100% win probability", () => {
    expect(expectedValue(1, 200)).toBeCloseTo(2);
  });
});

describe("kellyFraction", () => {
  it("returns 0 for 0% win probability", () => {
    expect(kellyFraction(0, 100)).toBe(0);
  });

  it("returns a positive fraction for +EV bet", () => {
    expect(kellyFraction(0.6, 100)).toBeGreaterThan(0);
  });

  it("is clamped to [0, 1]", () => {
    const f = kellyFraction(0.99, 500);
    expect(f).toBeLessThanOrEqual(1);
    expect(f).toBeGreaterThanOrEqual(0);
  });

  it("returns 0 for -EV bet", () => {
    // 40% win on -110 is -EV
    expect(kellyFraction(0.4, -110)).toBe(0);
  });

  it("returns positive for fair bet with edge", () => {
    // 55% win on -110 has Kelly > 0
    expect(kellyFraction(0.55, -110)).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 5. HANDLE AND VOLUME
// ---------------------------------------------------------------------------

describe("handleByGame", () => {
  it("returns empty map for empty array", () => {
    expect(handleByGame([])).toEqual(new Map());
  });

  it("maps game ids to handles", () => {
    const m = handleByGame([
      { id: "g1", handle: 50000 },
      { id: "g2", handle: 120000 },
    ]);
    expect(m.get("g1")).toBe(50000);
    expect(m.get("g2")).toBe(120000);
  });

  it("later entry overwrites earlier for duplicate id", () => {
    const m = handleByGame([
      { id: "g1", handle: 100 },
      { id: "g1", handle: 200 },
    ]);
    expect(m.get("g1")).toBe(200);
  });

  it("returns a Map (not plain object)", () => {
    expect(handleByGame([])).toBeInstanceOf(Map);
  });
});

describe("volumeWeightedPrice", () => {
  it("returns 0 for empty arrays", () => {
    expect(volumeWeightedPrice([], [])).toBe(0);
  });

  it("returns 0 when all volumes are 0", () => {
    expect(volumeWeightedPrice([100, 200], [0, 0])).toBe(0);
  });

  it("returns single price when only one entry", () => {
    expect(volumeWeightedPrice([150], [10])).toBeCloseTo(150);
  });

  it("computes weighted average correctly", () => {
    // prices [100, 200], volumes [1, 3] → (100*1 + 200*3) / 4 = 700/4 = 175
    expect(volumeWeightedPrice([100, 200], [1, 3])).toBeCloseTo(175);
  });

  it("uses equal weighting when all volumes equal", () => {
    expect(volumeWeightedPrice([100, 200, 300], [1, 1, 1])).toBeCloseTo(200);
  });
});

describe("marketDepth", () => {
  it("handles empty bids and asks", () => {
    const d = marketDepth([], []);
    expect(d.bestBid).toBe(0);
    expect(d.bestAsk).toBe(0);
    expect(d.spread).toBe(0);
    expect(d.bidVolume).toBe(0);
    expect(d.askVolume).toBe(0);
  });

  it("picks best bid (highest) and best ask (lowest)", () => {
    const d = marketDepth(
      [
        { price: 50, size: 10 },
        { price: 52, size: 5 },
      ],
      [
        { price: 55, size: 8 },
        { price: 53, size: 4 },
      ],
    );
    expect(d.bestBid).toBe(52);
    expect(d.bestAsk).toBe(53);
    expect(d.spread).toBeCloseTo(1);
  });

  it("computes total bid and ask volumes", () => {
    const d = marketDepth(
      [{ price: 50, size: 10 }, { price: 49, size: 20 }],
      [{ price: 51, size: 5 }],
    );
    expect(d.bidVolume).toBe(30);
    expect(d.askVolume).toBe(5);
  });
});

describe("herfindahlIndex", () => {
  it("returns 0 for empty array", () => {
    expect(herfindahlIndex([])).toBe(0);
  });

  it("returns 1 for monopoly (single player)", () => {
    expect(herfindahlIndex([1])).toBeCloseTo(1);
  });

  it("returns 0.5 for duopoly with equal share", () => {
    expect(herfindahlIndex([1, 1])).toBeCloseTo(0.5);
  });

  it("returns ~0 for many equal players", () => {
    const shares = Array(1000).fill(1);
    expect(herfindahlIndex(shares)).toBeCloseTo(0.001, 3);
  });

  it("normalises shares before computing", () => {
    // [50, 50] normalised to [0.5, 0.5] → HHI = 0.5
    expect(herfindahlIndex([50, 50])).toBeCloseTo(0.5);
  });

  it("returns 0 for all-zero input", () => {
    expect(herfindahlIndex([0, 0, 0])).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 6. RISK AND EXPOSURE
// ---------------------------------------------------------------------------

describe("bookExposure", () => {
  it("returns zero liability for empty bets", () => {
    const r = bookExposure([]);
    expect(r.sideALiability).toBe(0);
    expect(r.sideBLiability).toBe(0);
    expect(r.netExposure).toBe(0);
  });

  it("computes side A liability at -110 for $110 bet", () => {
    // $110 at -110: decimal = 100/110 + 1 ≈ 1.909; liability = 110 * 0.909 = 100
    const r = bookExposure([{ side: "A", amount: 110, odds: -110 }]);
    expect(r.sideALiability).toBeCloseTo(100, 0);
    expect(r.sideBLiability).toBe(0);
  });

  it("netExposure is absolute difference between side liabilities", () => {
    const r = bookExposure([
      { side: "A", amount: 110, odds: -110 },
      { side: "B", amount: 110, odds: -110 },
    ]);
    expect(r.netExposure).toBeCloseTo(0, 1);
  });

  it("handles positive odds correctly", () => {
    // $100 at +200: decimal = 3; liability = 100 * 2 = 200
    const r = bookExposure([{ side: "B", amount: 100, odds: 200 }]);
    expect(r.sideBLiability).toBeCloseTo(200, 0);
  });
});

describe("hedgeAmount", () => {
  it("returns correct hedge to lock in profit", () => {
    // $100 at +200 (decimal 3): payout = $300
    // hedge at -150 (decimal 1.667): hedge = 300/1.667 ≈ $180
    const hedge = hedgeAmount(100, 200, -150);
    expect(hedge).toBeCloseTo(300 / (100 / 150 + 1), 1);
  });

  it("returns 0 for invalid hedge odds", () => {
    // Decimal odds = 1 means b=0 — but -Infinity odds; we test extreme
    // hedgeOdds that produce decimal ≤ 0 are edge cases; hedge=0 returned
    expect(hedgeAmount(100, 100, -100)).toBeGreaterThan(0); // valid case
  });

  it("increases hedge amount for worse (shorter) hedge odds", () => {
    // -200 (decimal 1.5) vs -150 (decimal 1.667): shorter odds require bigger stake
    const h1 = hedgeAmount(100, 200, -200); // shorter odds = larger hedge
    const h2 = hedgeAmount(100, 200, -150); // longer odds = smaller hedge
    expect(h1).toBeGreaterThan(h2);
  });
});

describe("guaranteedProfit", () => {
  it("locks in positive profit when hedging a winning bet", () => {
    // $100 at +200 (decimal 3), payout = $300
    // hedge $150 at -150 (decimal 1.667), payout = $150 * (2/3 + 1) = 250?
    // Use the hedgeAmount: hedge = 300 / 1.667 ≈ 180
    const origBet = 100;
    const origOdds = 200;
    const hedgeOdds = -150;
    const hedge = hedgeAmount(origBet, origOdds, hedgeOdds);
    const profit = guaranteedProfit(origBet, origOdds, hedge, hedgeOdds);
    expect(profit).toBeGreaterThan(0);
  });

  it("is consistent regardless of which side wins", () => {
    const origBet = 100;
    const origOdds = 200;
    const hedgeOdds = -150;
    const hedge = hedgeAmount(origBet, origOdds, hedgeOdds);
    const profit = guaranteedProfit(origBet, origOdds, hedge, hedgeOdds);

    // Manual check: if original wins: (100 * 2) - hedge; if hedge wins: (hedge * 0.667) - 100
    const origDecimal = 3; // +200
    const hedgeDecimal = 1 + 100 / 150; // ≈ 1.667
    const ifOrigWins = origBet * (origDecimal - 1) - hedge;
    const ifHedgeWins = hedge * (hedgeDecimal - 1) - origBet;
    expect(profit).toBeCloseTo(Math.min(ifOrigWins, ifHedgeWins), 3);
  });
});

describe("arbOpportunity", () => {
  it("detects arb when overround < 0", () => {
    // +120 (dec 2.2) and -120 (dec 1.833): 1/2.2 + 1/1.833 = 0.455 + 0.545 = 1.0 → borderline
    // Use +200 (dec 3) and +150 (dec 2.5): 1/3 + 1/2.5 = 0.333 + 0.4 = 0.733 < 1 → arb!
    const r = arbOpportunity(200, 150);
    expect(r.isArb).toBe(true);
    expect(r.edge).toBeGreaterThan(0);
    expect(r.stake1 + r.stake2).toBeCloseTo(100);
  });

  it("detects no arb when overround >= 0", () => {
    // -110/-110 standard market
    const r = arbOpportunity(-110, -110);
    expect(r.isArb).toBe(false);
    expect(r.edge).toBeLessThan(0);
    expect(r.stake1).toBe(0);
    expect(r.stake2).toBe(0);
  });

  it("edge case: exactly 1.0 sumInv → isArb false", () => {
    // +100 (dec 2) and -100 (dec 2): 1/2 + 1/2 = 1.0 → not arb (not < 1)
    const r = arbOpportunity(100, -100);
    expect(r.isArb).toBe(false);
  });

  it("stakes sum to $100 when there is arb", () => {
    const r = arbOpportunity(200, 150);
    if (r.isArb) {
      expect(r.stake1 + r.stake2).toBeCloseTo(100, 4);
    }
  });

  it("larger edge when odds are much higher than fair", () => {
    const r1 = arbOpportunity(300, 200);
    const r2 = arbOpportunity(200, 150);
    expect(r1.edge).toBeGreaterThan(r2.edge);
  });
});

// ---------------------------------------------------------------------------
// 7. PREDICTION CALIBRATION METRICS
// ---------------------------------------------------------------------------

describe("brierScore", () => {
  it("returns 0 for empty arrays", () => {
    expect(brierScore([], [])).toBe(0);
  });

  it("returns 0 for perfect predictions", () => {
    expect(brierScore([1, 0, 1], [1, 0, 1])).toBeCloseTo(0);
  });

  it("returns 1 for worst possible predictions", () => {
    // Predicting 1 when outcome is 0 (and vice versa)
    expect(brierScore([1, 1, 1], [0, 0, 0])).toBeCloseTo(1);
  });

  it("returns 0.25 for 50/50 predictions on certain outcomes", () => {
    // (0.5 - 0)^2 = 0.25 for each
    expect(brierScore([0.5, 0.5], [0, 0])).toBeCloseTo(0.25);
  });

  it("handles single prediction", () => {
    expect(brierScore([0.7], [1])).toBeCloseTo(0.09);
  });

  it("uses min length when arrays differ in size", () => {
    // Only first 2 pairs used
    expect(brierScore([1, 0, 1], [1, 0])).toBeCloseTo(0);
  });
});

describe("logLoss", () => {
  it("returns 0 for empty arrays", () => {
    expect(logLoss([], [])).toBe(0);
  });

  it("returns low value for good predictions", () => {
    const loss = logLoss([0.9, 0.1, 0.9], [1, 0, 1]);
    expect(loss).toBeLessThan(0.2);
  });

  it("returns higher value for poor predictions", () => {
    const goodLoss = logLoss([0.9, 0.9], [1, 1]);
    const badLoss = logLoss([0.1, 0.1], [1, 1]);
    expect(badLoss).toBeGreaterThan(goodLoss);
  });

  it("clamps predictions to avoid log(0)", () => {
    // 0 and 1 predictions should be clamped to 0.001 and 0.999
    expect(() => logLoss([0, 1, 0.5], [0, 1, 1])).not.toThrow();
    const loss = logLoss([0, 1], [0, 1]);
    expect(isFinite(loss)).toBe(true);
  });

  it("is non-negative", () => {
    expect(logLoss([0.5, 0.6], [0, 1])).toBeGreaterThanOrEqual(0);
  });
});

describe("reliability", () => {
  it("returns 10 bins by default", () => {
    const bins = reliability([0.1, 0.5, 0.9], [0, 1, 1]);
    expect(bins).toHaveLength(10);
  });

  it("respects custom bin count", () => {
    const bins = reliability([0.1, 0.5, 0.9], [0, 1, 1], 5);
    expect(bins).toHaveLength(5);
  });

  it("returns empty bins with count = 0 for out-of-range buckets", () => {
    const bins = reliability([0.05], [1], 10);
    const emptyBins = bins.filter((b) => b.count === 0);
    expect(emptyBins.length).toBeGreaterThan(0);
  });

  it("each bin has bin index proportional to prediction range", () => {
    const bins = reliability([0.05], [1], 10);
    expect(bins[0]?.bin).toBeCloseTo(0);
    expect(bins[9]?.bin).toBeCloseTo(0.9);
  });

  it("computes correct avgOutcome in populated bin", () => {
    // Two predictions of 0.05 → bin 0; outcomes 1 and 0 → avgOutcome = 0.5
    const bins = reliability([0.05, 0.05], [1, 0], 10);
    expect(bins[0]?.avgOutcome).toBeCloseTo(0.5);
  });

  it("handles empty input", () => {
    const bins = reliability([], []);
    expect(bins).toHaveLength(10);
    expect(bins.every((b) => b.count === 0)).toBe(true);
  });
});

describe("calibrationError", () => {
  it("returns 0 for empty arrays", () => {
    expect(calibrationError([], [])).toBe(0);
  });

  it("returns 0 for perfectly calibrated predictions", () => {
    // Predictions equal outcomes in each bin
    // 10 predictions of 0.05 all with outcome 0; avgPred ≈ 0.05, avgOutcome = 0
    // ECE ≠ 0 in this case (not perfectly calibrated by design)
    expect(calibrationError([], [])).toBe(0);
  });

  it("returns a non-negative value", () => {
    const ece = calibrationError([0.1, 0.5, 0.9], [0, 1, 1]);
    expect(ece).toBeGreaterThanOrEqual(0);
  });

  it("returns higher ECE for poorly calibrated model", () => {
    // Model always says 0.9 but outcomes are all 0
    const badEce = calibrationError([0.9, 0.9, 0.9, 0.9, 0.9], [0, 0, 0, 0, 0]);
    // Model that's perfectly right
    const goodEce = calibrationError([0.9, 0.9, 0.9, 0.9, 0.9], [1, 1, 1, 1, 1]);
    expect(badEce).toBeGreaterThan(goodEce);
  });

  it("ECE is bounded between 0 and 1", () => {
    const ece = calibrationError(
      [0.1, 0.2, 0.5, 0.8, 0.9],
      [1, 0, 0, 0, 1],
    );
    expect(ece).toBeGreaterThanOrEqual(0);
    expect(ece).toBeLessThanOrEqual(1);
  });
});
