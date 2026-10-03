import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  dynamicFreshnessThresholdMs,
  freshnessMode,
  resolveFreshnessThresholdMs,
} from "../freshness-schedule.js";
import { FRESHNESS_THRESHOLD_MS } from "../config.js";
import { DataNormalizer } from "../normalizer.js";
import type { NormalizedOdds } from "@sports/types";

const HOUR = 60 * 60 * 1000;
const NOW = new Date("2026-07-02T16:00:00.000Z");

function at(hoursFromNow: number): Date {
  return new Date(NOW.getTime() + hoursFromNow * HOUR);
}

const originalMode = process.env["ODDS_FRESHNESS_MODE"];
afterEach(() => {
  if (originalMode === undefined) delete process.env["ODDS_FRESHNESS_MODE"];
  else process.env["ODDS_FRESHNESS_MODE"] = originalMode;
});

describe("dynamicFreshnessThresholdMs", () => {
  it("demands the freshest lines near first pitch and relaxes with distance", () => {
    // The schedule is clamped to the operator's fixed ceiling
    // (FRESHNESS_THRESHOLD_MS), so assert against the clamped values.
    const clamp = (h: number) => Math.min(h * HOUR, FRESHNESS_THRESHOLD_MS);
    expect(dynamicFreshnessThresholdMs(at(1), NOW)).toBe(clamp(2)); // starting soon
    expect(dynamicFreshnessThresholdMs(at(-1), NOW)).toBe(clamp(2)); // already started
    expect(dynamicFreshnessThresholdMs(at(5), NOW)).toBe(clamp(4));
    expect(dynamicFreshnessThresholdMs(at(12), NOW)).toBe(clamp(8));
    expect(dynamicFreshnessThresholdMs(at(30), NOW)).toBe(clamp(12));
  });

  it("is monotone: a nearer game never tolerates an older line than a farther one", () => {
    const horizons = [-2, 0.5, 3, 5, 8, 12, 24, 48];
    const thresholds = horizons.map((h) => dynamicFreshnessThresholdMs(at(h), NOW));
    for (let i = 1; i < thresholds.length; i++) {
      expect(thresholds[i]!).toBeGreaterThanOrEqual(thresholds[i - 1]!);
    }
  });
});

describe("resolveFreshnessThresholdMs (mode switch)", () => {
  it("uses the fixed threshold by default and without a commence time", () => {
    delete process.env["ODDS_FRESHNESS_MODE"];
    expect(freshnessMode()).toBe("fixed");
    const fixed = resolveFreshnessThresholdMs(at(1), NOW);
    expect(fixed).toBe(resolveFreshnessThresholdMs(at(48), NOW)); // flat everywhere

    process.env["ODDS_FRESHNESS_MODE"] = "dynamic";
    expect(resolveFreshnessThresholdMs(undefined, NOW)).toBe(fixed); // no guess
  });

  it("dynamic mode can only tighten, never loosen, the operator ceiling", () => {
    process.env["ODDS_FRESHNESS_MODE"] = "dynamic";
    delete process.env["ODDS_FRESHNESS_MODE"]; // fixed reference first
    const ceiling = resolveFreshnessThresholdMs(undefined, NOW);
    process.env["ODDS_FRESHNESS_MODE"] = "dynamic";
    for (const h of [-2, 1, 5, 12, 30, 100]) {
      expect(resolveFreshnessThresholdMs(at(h), NOW)).toBeLessThanOrEqual(ceiling);
    }
  });
});

describe("freshGameIds under dynamic mode", () => {
  function odd(gameId: string, lastUpdateHoursAgo: number): NormalizedOdds {
    return {
      gameExternalId: gameId,
      bookmaker: "fanduel",
      bookmakerLastUpdate: new Date(NOW.getTime() - lastUpdateHoursAgo * HOUR),
      market: "H2H",
      fetchedAt: NOW,
      homePrice: -110,
      awayPrice: -110,
    } as NormalizedOdds;
  }

  it("drops a near-start game with a 3h-old line but keeps a far game with the same age", () => {
    process.env["ODDS_FRESHNESS_MODE"] = "dynamic";
    const normalizer = new DataNormalizer();
    const commenceTimeByGame = new Map<string, Date>([
      ["soon", at(1)], // starts in 1h -> needs <=2h-old lines
      ["tomorrow", at(30)], // starts in 30h -> tolerates up to 12h
    ]);
    const odds = [odd("soon", 3), odd("tomorrow", 3)];
    const fresh = normalizer.freshGameIds(odds, { commenceTimeByGame, now: NOW });
    expect(fresh.has("soon")).toBe(false);
    expect(fresh.has("tomorrow")).toBe(true);
  });

  it("fixed mode treats both games identically (current production behavior)", () => {
    delete process.env["ODDS_FRESHNESS_MODE"];
    const normalizer = new DataNormalizer();
    const commenceTimeByGame = new Map<string, Date>([
      ["soon", at(1)],
      ["tomorrow", at(30)],
    ]);
    const odds = [odd("soon", 3), odd("tomorrow", 3)];
    const fresh = normalizer.freshGameIds(odds, { commenceTimeByGame, now: NOW });
    expect(fresh.has("soon")).toBe(fresh.has("tomorrow"));
  });
});
