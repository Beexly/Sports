import { describe, expect, it } from "vitest";
import {
  calculatePickResult,
  selectionIsHomeSide,
  type SettlementResult,
} from "../settlement.js";
import {
  americanToImpliedProbability,
  averageAmericanPrices,
} from "../scoring.js";

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function opposite(result: SettlementResult): SettlementResult {
  if (result === "WIN") return "LOSS";
  if (result === "LOSS") return "WIN";
  return "PUSH";
}

describe("money-truth properties", () => {
  it("keeps opposing selections zero-sum when team identifiers overlap", () => {
    const random = seededRandom(0x475345);

    for (let i = 0; i < 1_000; i += 1) {
      const shorter = `Team ${i}`;
      const longer = `${shorter} Metro`;
      const homeTeam = i % 2 === 0 ? shorter : longer;
      const awayTeam = i % 2 === 0 ? longer : shorter;
      let homeScore = Math.floor(random() * 50);
      let awayScore = Math.floor(random() * 50);
      if (homeScore === awayScore) awayScore += 1;

      expect(selectionIsHomeSide(homeTeam, homeTeam, awayTeam)).toBe(true);
      expect(selectionIsHomeSide(awayTeam, homeTeam, awayTeam)).toBe(false);

      const homeMoneyline = calculatePickResult(
        "MONEYLINE",
        `${homeTeam} ML`,
        0,
        homeTeam,
        homeScore,
        awayScore,
        "basketball_nba",
        awayTeam,
      );
      const awayMoneyline = calculatePickResult(
        "MONEYLINE",
        `${awayTeam} ML`,
        0,
        homeTeam,
        homeScore,
        awayScore,
        "basketball_nba",
        awayTeam,
      );
      expect(awayMoneyline).toBe(opposite(homeMoneyline));

      const line = Math.floor(random() * 21) - 10 + 0.5;
      const homeSpread = calculatePickResult(
        "SPREAD",
        `${homeTeam} ${line}`,
        line,
        homeTeam,
        homeScore,
        awayScore,
        "basketball_nba",
        awayTeam,
      );
      const awaySpread = calculatePickResult(
        "SPREAD",
        `${awayTeam} ${-line}`,
        line,
        homeTeam,
        homeScore,
        awayScore,
        "basketball_nba",
        awayTeam,
      );
      expect(awaySpread).toBe(opposite(homeSpread));
    }
  });

  it("averages American prices inside implied-probability bounds", () => {
    const random = seededRandom(0x4d415448);

    for (let i = 0; i < 1_000; i += 1) {
      const count = 2 + Math.floor(random() * 7);
      const prices = Array.from({ length: count }, () => {
        const magnitude = 100 + Math.floor(random() * 401);
        return random() < 0.5 ? magnitude : -magnitude;
      });
      const probabilities = prices.map(americanToImpliedProbability);
      const expectedMean =
        probabilities.reduce((sum, probability) => sum + probability, 0) /
        probabilities.length;
      const average = averageAmericanPrices(prices);

      expect(average).not.toBeNull();
      const actualMean = americanToImpliedProbability(average!);
      expect(actualMean).toBeGreaterThanOrEqual(Math.min(...probabilities) - 0.002);
      expect(actualMean).toBeLessThanOrEqual(Math.max(...probabilities) + 0.002);
      expect(Math.abs(actualMean - expectedMean)).toBeLessThanOrEqual(0.002);
    }
  });
});
