/**
 * Lane B/C — engine constants + line-archive cursor + B2B scope + copy bans.
 * Worktree: hermes/lane-bc-20260920
 *
 * Imports are RELATIVE on purpose: this worktree's node_modules junctions to
 * the main checkout, so `@sports/*` would resolve to main's packages rather
 * than the files under test here.
 */
import { describe, it, expect } from "vitest";
import {
  SCALE_CONSTANT,
  HFA_POINTS,
  NFL_EPA_MIN_GAMES as ENGINE_NFL_EPA_MIN_GAMES,
} from "../../../packages/prediction-engine/src/engine-constants.js";
import { POWERINDEX_HFA } from "../../../packages/prediction-engine/src/espn-powerindex.js";
import { NFL_EPA_MIN_GAMES } from "../../../packages/prediction-engine/src/nfl-epa-fair-value.js";
import { isFixedLadderSpreadMarket } from "../../../packages/prediction-engine/src/scoring.js";
import {
  WIND_YDS_PER_MPH_PASSING_PROPS,
  applyWindToPassingPropYards,
} from "../../../packages/prediction-engine/src/edge-lab/features/nfl-weather.js";
import {
  LINE_ARCHIVE_PAGE_TAKE,
  LINE_ARCHIVE_PAGE_MAX,
  markClosingSnapshots,
} from "../../../packages/ingestion-pipeline/src/line-archive.js";
import { resolveB2bKeyScope } from "@/lib/b2b/api-key-auth";

describe("Lane B engine constants (PR #867)", () => {
  it("pins SCALE_CONSTANT, HFA_POINTS, NFL_EPA_MIN_GAMES", () => {
    expect(SCALE_CONSTANT).toBe(45.42);
    expect(HFA_POINTS).toBe(2.1);
    expect(ENGINE_NFL_EPA_MIN_GAMES).toBe(4);
    expect(NFL_EPA_MIN_GAMES).toBe(4);
  });

  it("wires NFL PowerIndex HFA to HFA_POINTS", () => {
    expect(POWERINDEX_HFA.americanfootball_nfl).toBe(HFA_POINTS);
    expect(POWERINDEX_HFA.americanfootball_nfl).toBe(2.1);
  });
});

describe("Lane B line-archive cursor (PR #868)", () => {
  it("bounds pages at take=5000 / max=50000", () => {
    expect(LINE_ARCHIVE_PAGE_TAKE).toBe(5000);
    expect(LINE_ARCHIVE_PAGE_MAX).toBe(50000);
  });

  it("markClosingSnapshots pages with take and orderBy, never unbounded", async () => {
    const calls: unknown[] = [];
    const db = {
      oddsLineSnapshot: {
        findMany: async (args: unknown) => {
          calls.push(args);
          return [];
        },
        update: async () => ({}),
      },
    };
    await markClosingSnapshots(db, "g1", new Date("2026-09-20T18:00:00Z"));
    expect(calls).toHaveLength(1);
    const arg = calls[0] as { take?: number; orderBy?: unknown };
    expect(arg.take).toBe(5000);
    expect(arg.orderBy).toEqual({ capturedAt: "asc" });
  });
});

describe("Lane C B2B resolveB2bKeyScope", () => {
  const req = (key: string | null) =>
    new Request("https://x.test", {
      headers: key ? { "x-api-key": key } : {},
    });

  it("fail-closed: unknown key → null; bare key → free only", () => {
    expect(resolveB2bKeyScope(req("nope"), { GSE_B2B_API_KEYS: "abc" })).toBeNull();
    expect(resolveB2bKeyScope(req("abc"), { GSE_B2B_API_KEYS: "abc" })).toBe("free");
  });

  it(":premium is case-insensitive; presented key never carries the suffix", () => {
    const env = { GSE_B2B_API_KEYS: "partner:PREMIUM,ro:premium,readonly" };
    expect(resolveB2bKeyScope(req("partner"), env)).toBe("premium");
    expect(resolveB2bKeyScope(req("ro"), env)).toBe("premium");
    expect(resolveB2bKeyScope(req("readonly"), env)).toBe("free");
    expect(resolveB2bKeyScope(req("partner:premium"), env)).toBeNull();
    expect(resolveB2bKeyScope(req("PREMIUM"), env)).toBeNull();
  });

  it("empty env / empty key fail closed", () => {
    expect(resolveB2bKeyScope(req("abc"), {})).toBeNull();
    expect(resolveB2bKeyScope(req("abc"), { GSE_B2B_API_KEYS: "  " })).toBeNull();
  });
});

describe("Lane C MLB fixed-ladder consensus + weather isolation", () => {
  it("baseball spread market is a fixed-ladder consensus tautology", () => {
    expect(isFixedLadderSpreadMarket("baseball_mlb")).toBe(true);
    expect(isFixedLadderSpreadMarket("americanfootball_nfl")).toBe(false);
  });

  it("wind −3.007 yds/mph applies to passing props only, null when unknown", () => {
    expect(WIND_YDS_PER_MPH_PASSING_PROPS).toBe(-3.007);
    expect(applyWindToPassingPropYards(280, 0)).toBe(280);
    expect(applyWindToPassingPropYards(280, 10)).toBeCloseTo(280 - 30.07, 5);
    expect(applyWindToPassingPropYards(280, null)).toBeNull();
  });
});
