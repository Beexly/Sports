/**
 * The Odds API credit economics — the accountant, tested. Pure arithmetic over the published quota
 * model; no key, no network, no spend. The bar: the burn math matches the documented model, historical
 * is 10×, props are per-event, the tier recommendation is the SMALLEST that fits, and a runaway
 * historical pull is CAPPED and announced (never silently planned).
 */

import { describe, it, expect } from "vitest";
import {
  creditCostOfCall,
  planOddsApiUsage,
  recommendTier,
  ODDS_API_TIERS,
  ODDS_API_SPORT_GROUPS,
  HISTORICAL_MULTIPLIER,
  HISTORICAL_SNAPSHOT_CAP,
  type OddsApiPlanInput,
} from "../odds-api-economics.js";

describe("creditCostOfCall — the published model", () => {
  it("the sports catalogue is free", () => {
    expect(creditCostOfCall({ endpoint: "SPORTS", markets: 9, regions: 9 })).toBe(0);
  });
  it("featured odds cost markets × regions", () => {
    expect(creditCostOfCall({ endpoint: "ODDS", markets: 3, regions: 2 })).toBe(6);
    expect(creditCostOfCall({ endpoint: "ODDS", markets: 1, regions: 1 })).toBe(1);
  });
  it("a markets/regions floor of 1 each (a call always costs ≥1)", () => {
    expect(creditCostOfCall({ endpoint: "ODDS", markets: 0, regions: 0 })).toBe(1);
  });
  it("scores cost 1, or 2 with history", () => {
    expect(creditCostOfCall({ endpoint: "SCORES", markets: 0, regions: 0 })).toBe(1);
    expect(creditCostOfCall({ endpoint: "SCORES", markets: 0, regions: 0, scoresWithHistory: true })).toBe(2);
  });
  it("event-odds (player props) cost markets × regions per event", () => {
    expect(creditCostOfCall({ endpoint: "EVENT_ODDS", markets: 5, regions: 1 })).toBe(5);
  });
  it("historical multiplies the equivalent live cost by 10", () => {
    const live = creditCostOfCall({ endpoint: "ODDS", markets: 3, regions: 2 });
    const hist = creditCostOfCall({ endpoint: "ODDS", markets: 3, regions: 2, historical: true });
    expect(hist).toBe(live * HISTORICAL_MULTIPLIER);
  });
});

describe("recommendTier — smallest that fits", () => {
  it("picks the smallest tier whose allotment covers the burn", () => {
    expect(recommendTier(300)?.id).toBe("free"); // 500 covers 300
    expect(recommendTier(600)?.id).toBe("20k");
    expect(recommendTier(50_000)?.id).toBe("100k");
  });
  it("returns null when the burn exceeds every tier", () => {
    const max = Math.max(...ODDS_API_TIERS.map((t) => t.monthlyCredits));
    expect(recommendTier(max + 1)).toBeNull();
  });
  it("encodes credit allotments but NO dollar price (verify-at-purchase posture)", () => {
    for (const t of ODDS_API_TIERS) {
      expect(t.monthlyCredits).toBeGreaterThan(0);
      expect(JSON.stringify(t)).not.toMatch(/\$|usd|price/i);
    }
  });
});

describe("planOddsApiUsage — a month of coverage → a credit burn", () => {
  const base: OddsApiPlanInput = {
    sports: 1,
    markets: 3,
    regions: 1,
    refreshIntervalMinutes: 60,
    activeHoursPerDay: 12,
    includeScores: false,
    playerPropEventsPerDay: 0,
    playerPropMarkets: 0,
    historicalSnapshots: 0,
    daysPerMonth: 30,
  };

  it("computes featured-odds burn = sports × refreshes/day × days × (markets × regions)", () => {
    const plan = planOddsApiUsage(base);
    // refreshes/day = floor(12*60/60) = 12; calls = 1*12*30 = 360; per call = 3*1 = 3; total = 1080
    expect(plan.monthlyCredits).toBe(1080);
    expect(plan.mode).toBe("PLAN_ONLY");
    expect(plan.spendUsd).toBe(0);
    expect(plan.recommendedTier?.id).toBe("20k"); // 1080 > 500
  });

  it("adds scores at 1 credit per sport per refresh when enabled", () => {
    const plan = planOddsApiUsage({ ...base, includeScores: true });
    // + 1*12*30 * 1 = 360 → 1440
    expect(plan.monthlyCredits).toBe(1440);
    expect(plan.lines.some((l) => l.label === "Scores")).toBe(true);
  });

  it("prices player props per-event and warns when they are expensive", () => {
    const plan = planOddsApiUsage({ ...base, playerPropEventsPerDay: 10, playerPropMarkets: 25, regions: 1 });
    expect(plan.lines.some((l) => l.label === "Player props (per event)")).toBe(true);
    expect(plan.warnings.join(" ")).toMatch(/player-prop calls are expensive/i);
  });

  it("CAPS a runaway historical backfill and announces it (never silent)", () => {
    const plan = planOddsApiUsage({ ...base, historicalSnapshots: 5000 });
    expect(plan.capsApplied.join(" ")).toMatch(new RegExp(`→ ${HISTORICAL_SNAPSHOT_CAP}`));
    const histLine = plan.lines.find((l) => l.label.startsWith("Historical"))!;
    expect(histLine.callsPerMonth).toBe(HISTORICAL_SNAPSHOT_CAP);
    expect(histLine.creditsPerCall).toBe(3 * 1 * HISTORICAL_MULTIPLIER); // 10× the live cost
  });

  it("is deterministic (same input → same burn)", () => {
    expect(planOddsApiUsage(base).monthlyCredits).toBe(planOddsApiUsage(base).monthlyCredits);
  });

  it("warns when cadence yields zero refreshes", () => {
    const plan = planOddsApiUsage({ ...base, activeHoursPerDay: 0 });
    expect(plan.monthlyCredits).toBe(0);
    expect(plan.warnings.join(" ")).toMatch(/no live odds/i);
  });
});

describe("ODDS_API_SPORT_GROUPS — coverage map, not a price list", () => {
  it("covers the three proof sports and marks prop availability", () => {
    const keys = ODDS_API_SPORT_GROUPS.map((s) => s.key);
    expect(keys).toContain("baseball_mlb");
    expect(keys).toContain("americanfootball_cfl");
    expect(keys.some((k) => k.startsWith("soccer"))).toBe(true);
    // CFL has no player props in the catalogue — the map must not over-claim depth.
    expect(ODDS_API_SPORT_GROUPS.find((s) => s.key === "americanfootball_cfl")!.hasPlayerProps).toBe(false);
  });
});
