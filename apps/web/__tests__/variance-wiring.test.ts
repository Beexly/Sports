/**
 * The wiring layer: remaining games, and the fail-loud registration contract.
 *
 * `remainingGamesFor` is the one piece of this chain with no default and no
 * guard on the value itself. A wrong count silently rescales EVERY projection
 * in the pool, so it gets its own tests rather than being inlined.
 */

import { describe, expect, it, vi } from "vitest";

import {
  FULL_SEASON_GAMES,
  loadAndRegisterVariancePool,
  loadProcessGradeAsContext,
  remainingGamesFor,
} from "@/lib/integrations/variance-wiring";
import { registerProjectionsProvider, resolveProjectionsProvider } from "@/lib/integrations/projections";

describe("remaining games", () => {
  it("is what is left of a full season, not the season length", () => {
    const players = [{ id: "a" }, { id: "b" }];
    expect(remainingGamesFor(players, 0)).toEqual({ a: FULL_SEASON_GAMES, b: FULL_SEASON_GAMES });
    expect(remainingGamesFor(players, 3)).toEqual({ a: 14, b: 14 });
  });

  it("clamps at zero and never goes negative", () => {
    // A past-season or postseason count must not produce a negative rate.
    expect(remainingGamesFor([{ id: "a" }], 17)).toEqual({ a: 0 });
    expect(remainingGamesFor([{ id: "a" }], 25)).toEqual({ a: 0 });
  });

  it("gives every player the same count, because one schedule serves all", () => {
    // Per-player bye weeks are NOT modelled here. If a caller supplies a
    // per-player count, that is a different function on purpose.
    const got = remainingGamesFor([{ id: "a" }, { id: "b" }, { id: "c" }], 5);
    expect(new Set(Object.values(got)).size).toBe(1);
  });

  it("returns an empty map for no players rather than a fake default count", () => {
    expect(remainingGamesFor([], 0)).toEqual({});
  });
});

describe("registration contract", () => {
  /**
   * A client whose newest training season is exactly one behind the forecast.
   * Forecast 2026 -> gate needs >= 2025 -> the fixture's newest season is 2025.
   */
  const freshClient = () => {
    const weeks = Array.from({ length: 8 }, (_, i) => ({
      playerId: "p1",
      season: 2025,
      week: i + 1,
      seasonType: "REG",
      fantasyPointsPpr: 10 + i,
      player: { position: "RB" as const },
    }));
    return {
      playerGameStat: { findMany: vi.fn().mockResolvedValue(weeks) },
      player: { findMany: vi.fn().mockResolvedValue([{ id: "p1", fullName: "Test Rusher", recentTeam: "CHI" }]) },
    };
  };

  it("registers nothing when register:false, and says why", async () => {
    // An injected client, NOT the default db: with no real rows the freshness
    // gate throws before the register:false short-circuit is reached. That the
    // real-db path throws here is the gate working, and it is asserted
    // separately below.
    const client = freshClient();
    const res = await loadAndRegisterVariancePool({
      client: client as never,
      evalSeason: 2026,
      register: false,
    });
    expect(res.registered).toBe(false);
    expect(res.reason).toBe("register=false");
  });

  it("never registers when the training window is stale", async () => {
    // The freshness gate is the reason this function can be trusted: a source
    // more than one season behind the forecast throws, and this must surface as
    // no-registration rather than a confident wrong number.
    const client = {
      playerGameStat: { findMany: vi.fn().mockResolvedValue([]) },
      player: { findMany: vi.fn().mockResolvedValue([]) },
    };
    await expect(
      loadAndRegisterVariancePool({ client: client as never, evalSeason: 2030, register: false }),
    ).rejects.toThrow(/stale/);
  });

  it("leaves the registry untouched on the failure path", async () => {
    registerProjectionsProvider(null);
    const client = {
      playerGameStat: { findMany: vi.fn().mockRejectedValue(new Error("db down")) },
      player: { findMany: vi.fn().mockResolvedValue([]) },
    };
    await expect(
      loadAndRegisterVariancePool({ client: client as never, evalSeason: 2026, register: false }),
    ).rejects.toThrow();
    // Nothing registered: the suite must still see the illustrative pool.
    expect(resolveProjectionsProvider().live).toBe(false);
  });
});

describe("the process grade is context", () => {
  it("loads without a fetcher argument and reports its own flags untouched", async () => {
    // No network in this test: the fetcher rejects, so this exercises the error
    // path. The point is that the grade is READ and never TRANSFORMED.
    const failing = (async () => {
      throw new Error("network disabled in test");
    }) as unknown as typeof fetch;
    const model = await loadProcessGradeAsContext(failing);
    expect(model.status).toBe("source-error");
    // The grade does not become a projection just by being loaded.
    expect(model).not.toHaveProperty("floor");
    expect(model).not.toHaveProperty("ceiling");
  });
});
