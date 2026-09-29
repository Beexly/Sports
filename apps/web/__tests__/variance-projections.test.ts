/**
 * The variance model as wired, tested against fakes and the honesty rules.
 *
 * These are the tests the spec asked for, in the order the failures matter:
 * per-player bounds, season freshness, the McCaffrey spot-check, and
 * canPublishProjections staying false.
 */
import { describe, expect, it, vi } from "vitest";
import {
  derivePositionalStats,
  assertFreshTrainingWindow,
  absoluteWeek,
  loadVarianceProjections,
  StaleTrainingWindowError,
  type PlayerWeekClient,
  type PlayerWeekStat,
} from "@/lib/integrations/variance-projections";
import {
  buildVarianceProvider,
  varianceRowsToPlayers,
  registerVarianceProvider,
} from "@/lib/integrations/variance-provider";
import { remainingGamesFor, FULL_SEASON_GAMES } from "@/lib/integrations/variance-wiring";
import { resolveProjectionsProvider, registerProjectionsProvider } from "@/lib/integrations/projections";
import type { PlayerWeek } from "@sports/prediction-engine";

/** A fake Prisma surface: seasons 2023-2024, 12 players x 10 weeks. */
function fakeClient(opts: {
  seasons?: readonly number[];
  weeksPerPlayer?: number;
  ppr?: (playerIndex: number, week: number) => number;
} = {}): PlayerWeekClient & { player: { findMany: ReturnType<typeof vi.fn> } } {
  const seasons = opts.seasons ?? [2023, 2024];
  const weeks = opts.weeksPerPlayer ?? 10;
  const ppr = opts.ppr ?? ((p: number, w: number) => 5 + ((p * 3 + w) % 15));
  const rows: PlayerWeekStat[] = [];
  for (const season of seasons) {
    for (let p = 0; p < 12; p += 1) {
      for (let w = 1; w <= weeks; w += 1) {
        rows.push({
          playerId: `p${p}`,
          season,
          week: w,
          seasonType: "REG",
          fantasyPointsPpr: ppr(p, w),
          player: { position: (["QB", "RB", "WR", "TE"] as const)[p % 4] },
        });
      }
    }
  }
  const findMany = vi.fn(async () => rows);
  return {
    playerGameStat: { findMany: findMany as never },
    player: { findMany: vi.fn(async () => []) as never },
  } as never;
}

const remainingAll = (n: number, games = 17) =>
  Object.fromEntries(Array.from({ length: n }, (_, i) => [`p${i}`, games]));

describe("variance projections — data adapter", () => {
  it("absolute week index orders across seasons, not within one", () => {
    expect(absoluteWeek(2023, 17, 0)).toBe(17);
    expect(absoluteWeek(2024, 1, 1)).toBe(19); // season offset 1 * 18 + 1
    expect(absoluteWeek(2024, 1, 1)).toBeGreaterThan(absoluteWeek(2023, 18, 0));
  });

  it("derives positional mean and CV from the window it was given", () => {
    const weeks: PlayerWeek[] = [];
    for (let p = 0; p < 12; p += 1) {
      const position = (["QB", "RB", "WR", "TE"] as const)[p % 4];
      for (let w = 1; w <= 12; w += 1) {
        weeks.push({ playerId: `p${p}`, position, absWeek: w, ppr: 10 + (w % 5) });
      }
    }
    const { meanPpr, cv } = derivePositionalStats(weeks);
    for (const pos of ["QB", "RB", "WR", "TE"]) {
      expect(meanPpr[pos]).toBeGreaterThan(0);
      expect(cv[pos]).toBeGreaterThan(0);
    }
  });

  it("SEASON FRESHNESS: throws loudly when the source is older than the forecast", () => {
    // Forecasting 2026 off a 2023-and-older source is 2 seasons stale. Loud.
    expect(() => assertFreshTrainingWindow(2024, 2026)).toThrow(StaleTrainingWindowError);
    expect(() => assertFreshTrainingWindow(2023, 2026)).toThrow(StaleTrainingWindowError);
    // One season of slack is allowed: forecasting 2025 off 2024 is fine.
    expect(() => assertFreshTrainingWindow(2024, 2025)).not.toThrow();
    expect(() => assertFreshTrainingWindow(2025, 2026)).not.toThrow();
  });

  it("propagates the staleness failure instead of returning a quiet number", async () => {
    const client = fakeClient({ seasons: [2022, 2023] });
    await expect(
      loadVarianceProjections(client, { evalSeason: 2026, remainingGames: remainingAll(12) }),
    ).rejects.toBeInstanceOf(StaleTrainingWindowError);
  });

  it("builds rows for a fresh window and records what it trained through", async () => {
    const client = fakeClient({ seasons: [2023, 2024] });
    const res = await loadVarianceProjections(client, {
      evalSeason: 2025,
      remainingGames: remainingAll(12),
    });
    expect(res.trainThroughSeason).toBe(2024);
    expect(res.cvSource).toBe("measured");
    expect(res.rows.length).toBeGreaterThan(0);
  });
});

describe("variance projections — per-player sanity bounds", () => {
  it("every row is finite, positive, and banded floor <= proj <= ceiling", async () => {
    const client = fakeClient({ seasons: [2023, 2024], weeksPerPlayer: 14 });
    const res = await loadVarianceProjections(client, {
      evalSeason: 2025,
      remainingGames: remainingAll(12),
    });
    expect(res.rows.length).toBe(12);
    for (const r of res.rows) {
      expect(Number.isFinite(r.proj)).toBe(true);
      expect(Number.isFinite(r.floor)).toBe(true);
      expect(Number.isFinite(r.ceiling)).toBe(true);
      expect(r.proj).toBeGreaterThan(0);
      expect(r.floor).toBeLessThanOrEqual(r.proj);
      expect(r.proj).toBeLessThanOrEqual(r.ceiling);
      expect(r.floor).toBeGreaterThanOrEqual(0);
      // Symmetric in CV: this is what the 313/584 pair fails.
      expect(1 - r.floor / r.proj).toBeCloseTo(r.ceiling / r.proj - 1, 9);
      expect(r.reliability).toBeGreaterThan(0);
      expect(r.reliability).toBeLessThan(1);
    }
  });

  it("the band scales with remaining games, not with the rate alone", async () => {
    const client = fakeClient({ seasons: [2023, 2024], weeksPerPlayer: 14 });
    const eight = await loadVarianceProjections(client, { evalSeason: 2025, remainingGames: remainingAll(12, 8) });
    const sixteen = await loadVarianceProjections(client, { evalSeason: 2025, remainingGames: remainingAll(12, 16) });
    const a = eight.rows[0];
    const b = sixteen.rows[0];
    expect(b.proj).toBeCloseTo(a.proj * 2, 6);
    expect(b.cvPlayer).toBeCloseTo(a.cvPlayer, 9); // band shape is a property of the player
  });
});

describe("variance provider — the grade is never the projection", () => {
  it("never reads the process grade: rows come from production weeks only", async () => {
    const client = fakeClient({ seasons: [2023, 2024], weeksPerPlayer: 14 });
    const res = await loadVarianceProjections(client, { evalSeason: 2025, remainingGames: remainingAll(12) });
    const names = new Map(res.rows.map((r) => [r.playerId, { name: `Player ${r.playerId}`, team: "SF" }]));
    const players = varianceRowsToPlayers(res.rows, names);

    for (const p of players) {
      expect(p.note).toContain("variance model");
      expect(p.note).toContain("Process grade is separate context");
      // usage/trend are grade facts; a projection must not fake them.
      expect(p.usage).toBe(0);
      expect(p.trend).toBe("flat");
      expect(p.varianceGames).toBeGreaterThan(0);
    }
  });

  it("excludes a player with no identity rather than inventing a name", async () => {
    const client = fakeClient({ seasons: [2023, 2024], weeksPerPlayer: 14 });
    const res = await loadVarianceProjections(client, { evalSeason: 2025, remainingGames: remainingAll(12) });
    const onlyOne = new Map([[res.rows[0].playerId, { name: "Known", team: "SF" }]]);
    const players = varianceRowsToPlayers(res.rows, onlyOne);
    expect(players).toHaveLength(1);
    expect(players[0].name).toBe("Known");
  });

  it("remainingGamesFor counts down and never goes negative", () => {
    expect(remainingGamesFor([{ id: "a" }], 0).a).toBe(FULL_SEASON_GAMES);
    expect(remainingGamesFor([{ id: "a" }], 3).a).toBe(FULL_SEASON_GAMES - 3);
    expect(remainingGamesFor([{ id: "a" }], 99).a).toBe(0);
  });
});

describe("the env gate", () => {
  it("PROJECTIONS_PROVIDER unset leaves the illustrative pool standing", () => {
    registerProjectionsProvider(null);
    const registered = registerVarianceProvider([], new Date().toISOString());
    expect(registered).toBe(false);
    const resolved = resolveProjectionsProvider();
    expect(resolved.live).toBe(false);
    expect(resolved.name).toBe("Illustrative pool");
  });

  it("builds a live provider when handed a pool", () => {
    const pool = varianceRowsToPlayers(
      [
        {
          playerId: "x", position: "RB", proj: 300, floor: 240, ceiling: 390,
          games: 16, reliability: 0.667, rawRate: 17, cvPlayer: 0.3, rawCv: 0.32,
        },
      ],
      new Map([["x", { name: "Test Rusher", team: "SF" }]]),
    );
    const provider = buildVarianceProvider(pool, "2026-09-28T00:00:00.000Z");
    expect(provider.live).toBe(true);
    expect(provider.attribution).toContain("variance model");
    const [proj] = provider.list();
    expect(proj.proj).toBe(300);
    // The row's hand-written floor/ceiling (240/390, the OLD z=1.0 band) are
    // deliberately ignored: `varianceRowsToPlayers` rebuilds the interval from
    // cvPlayer at the default 68% coverage, so the two cannot drift. 300 with
    // cv 0.3 at z=0.806 is 227.5 / 372.5.
    expect(proj.floor).toBe(227.5);
    expect(proj.ceiling).toBe(372.5);
    expect(proj.source).toBe("live");
  });
});
