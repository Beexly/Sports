import { describe, it, expect } from "vitest";
import {
  resolveCaptureMode,
  computeBudget,
  daysRemainingInMonth,
  planOddsCapture,
  CREDITS_PER_SNAPSHOT,
  DEFAULT_MONTHLY_CREDIT_CAP,
  SAFETY_FRACTION,
  CAPTURE_MARKETS,
  CAPTURE_REGION,
  type Env,
} from "@/lib/spend/odds-capture-governor";

const NFL = "americanfootball_nfl";

describe("odds-capture-governor — mode resolution", () => {
  it("is OFF when the key is absent", () => {
    expect(resolveCaptureMode({})).toBe("OFF");
    expect(resolveCaptureMode({ THE_ODDS_API_KEY: "  " })).toBe("OFF");
  });

  it("defaults to HEALTH_ONLY when the key is present and no mode set", () => {
    expect(resolveCaptureMode({ THE_ODDS_API_KEY: "present" })).toBe("HEALTH_ONLY");
  });

  it("honors an explicit valid mode (case-insensitive)", () => {
    const env: Env = { THE_ODDS_API_KEY: "present", ODDS_API_CAPTURE_MODE: "capture_active" };
    expect(resolveCaptureMode(env)).toBe("CAPTURE_ACTIVE");
  });

  it("a cap flag overrides the configured mode", () => {
    const env: Env = {
      THE_ODDS_API_KEY: "present",
      ODDS_API_CAPTURE_MODE: "CAPTURE_ACTIVE",
      ODDS_API_CAP_REACHED: "true",
    };
    expect(resolveCaptureMode(env)).toBe("CAP_REACHED");
  });

  it("falls back to HEALTH_ONLY on an unknown mode string", () => {
    expect(resolveCaptureMode({ THE_ODDS_API_KEY: "x", ODDS_API_CAPTURE_MODE: "FIREHOSE" })).toBe(
      "HEALTH_ONLY",
    );
  });

  it("never exposes the key value", () => {
    const env: Env = { THE_ODDS_API_KEY: "super-secret-key" };
    const mode = resolveCaptureMode(env);
    expect(JSON.stringify({ mode })).not.toContain("super-secret-key");
  });
});

describe("odds-capture-governor — budget math", () => {
  it("plans against only the safety slice of the cap", () => {
    const b = computeBudget({ usedCredits: 0, now: new Date(Date.UTC(2026, 0, 1)) });
    expect(b.plannableCredits).toBe(Math.floor(DEFAULT_MONTHLY_CREDIT_CAP * SAFETY_FRACTION));
  });

  it("daysRemainingInMonth counts inclusively to month end", () => {
    expect(daysRemainingInMonth(new Date(Date.UTC(2026, 0, 31)))).toBe(1); // Jan 31 → 1 day
    expect(daysRemainingInMonth(new Date(Date.UTC(2026, 0, 1)))).toBe(31); // Jan 1 → 31 days
  });

  it("remaining credits never go negative when over-used", () => {
    const b = computeBudget({ usedCredits: 100000, now: new Date(Date.UTC(2026, 0, 15)) });
    expect(b.remainingCredits).toBe(0);
    expect(b.dailyCreditAllowance).toBe(0);
  });
});

describe("odds-capture-governor — capture planning", () => {
  const now = new Date(Date.UTC(2026, 0, 1)); // start of month → full glide

  it("OFF authorizes nothing", () => {
    const plan = planOddsCapture({ primarySportKey: NFL, env: {}, now });
    expect(plan.mode).toBe("OFF");
    expect(plan.allowed).toBe(false);
    expect(plan.snapshotsThisCycle).toBe(0);
    expect(plan.runHealthPing).toBe(false);
  });

  it("HEALTH_ONLY runs only the credit-free ping", () => {
    const plan = planOddsCapture({
      primarySportKey: NFL,
      env: { THE_ODDS_API_KEY: "x" },
      now,
    });
    expect(plan.mode).toBe("HEALTH_ONLY");
    expect(plan.allowed).toBe(false);
    expect(plan.estimatedCredits).toBe(0);
    expect(plan.runHealthPing).toBe(true);
  });

  it("WATCHLIST_ONLY captures one sport within budget", () => {
    const plan = planOddsCapture({
      primarySportKey: NFL,
      env: { THE_ODDS_API_KEY: "x", ODDS_API_CAPTURE_MODE: "WATCHLIST_ONLY" },
      now,
    });
    expect(plan.mode).toBe("WATCHLIST_ONLY");
    expect(plan.allowed).toBe(true);
    expect(plan.sportKey).toBe(NFL);
    expect(plan.markets).toEqual([...CAPTURE_MARKETS]);
    expect(plan.region).toBe(CAPTURE_REGION);
    expect(plan.snapshotsThisCycle).toBeGreaterThanOrEqual(1);
    expect(plan.estimatedCredits).toBe(plan.snapshotsThisCycle * CREDITS_PER_SNAPSHOT);
  });

  it("never captures more than one sport (sportKey is a single key)", () => {
    const plan = planOddsCapture({
      primarySportKey: NFL,
      env: { THE_ODDS_API_KEY: "x", ODDS_API_CAPTURE_MODE: "CAPTURE_ACTIVE" },
      now,
    });
    expect(typeof plan.sportKey).toBe("string");
    expect(plan.markets.length).toBe(3);
  });

  it("holds when there is no in-season primary sport", () => {
    const plan = planOddsCapture({
      primarySportKey: null,
      env: { THE_ODDS_API_KEY: "x", ODDS_API_CAPTURE_MODE: "WATCHLIST_ONLY" },
      now,
    });
    expect(plan.allowed).toBe(false);
    expect(plan.snapshotsThisCycle).toBe(0);
  });

  it("holds when the period budget is exhausted", () => {
    const plan = planOddsCapture({
      primarySportKey: NFL,
      env: { THE_ODDS_API_KEY: "x", ODDS_API_CAPTURE_MODE: "CAPTURE_ACTIVE" },
      usedCredits: 100000,
      now,
    });
    expect(plan.allowed).toBe(false);
    expect(plan.estimatedCredits).toBe(0);
    expect(plan.reason).toMatch(/budget/i);
  });

  it("CAP_REACHED authorizes nothing, not even the ping", () => {
    const plan = planOddsCapture({
      primarySportKey: NFL,
      env: { THE_ODDS_API_KEY: "x", ODDS_API_CAP_REACHED: "true" },
      now,
    });
    expect(plan.mode).toBe("CAP_REACHED");
    expect(plan.allowed).toBe(false);
    expect(plan.runHealthPing).toBe(false);
  });

  it("estimated credits never exceed the remaining budget", () => {
    // Near month-end with little budget left → at most what's affordable.
    const plan = planOddsCapture({
      primarySportKey: NFL,
      env: { THE_ODDS_API_KEY: "x", ODDS_API_CAPTURE_MODE: "CAPTURE_ACTIVE" },
      usedCredits: 398, // plannable=400 → 2 credits left, < one 3-credit snapshot
      now: new Date(Date.UTC(2026, 0, 31)),
    });
    expect(plan.estimatedCredits).toBeLessThanOrEqual(plan.budget.remainingCredits);
  });
});
