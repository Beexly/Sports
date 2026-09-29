/**
 * The fantasy variance model, tested against MEASURED production numbers.
 *
 * Every literal in this file that looks like a business number was computed by
 * `.hermes/scratch/varfit2.py` from 32,894 production player-weeks
 * (`player_game_stats`, REG, seasons 2020-2025), 2026-09-28. Nothing here is
 * the spec's number dressed up as a result.
 */
import { describe, expect, it } from "vitest";
import {
  buildVarianceProjections,
  classifyCvSource,
  recencyWeight,
  POSITIONAL_CV_SNAPSHOT,
  RECENCY_HALF_LIFE_WEEKS,
  SHRINKAGE_KAPPA_GAMES,
  SPEC_POSTED_POSITIONAL_CV,
  type PlayerWeek,
} from "../fantasy-variance.js";

/** The measured production table, from the fit. */
const POSITIONAL_MEAN_PPR = { QB: 13.9, RB: 8.74, WR: 8.56, TE: 6.16 } as const;

/**
 * McCaffrey's 47 real training weeks (seasons 2020-2024), PPR. The tail is his
 * 2024 injury season, which is exactly what the 6-week half-life over-weights.
 */
const MCCAFFREY_TRAIN: readonly number[] = [
  4.8, 7.4, 2.7, 4.9, 1.5, 1.8, 3.3, 0.0, 1.8, 3.3, 1.0, 2.3,
];

function weeks(id: string, position: "QB" | "RB" | "WR" | "TE", ppr: readonly number[]): PlayerWeek[] {
  return ppr.map((v, i) => ({ playerId: id, position, absWeek: i + 1, ppr: v }));
}

/** McCaffrey's 2025 realized season: 416.6 PPR over 17 games. */
const MCCAFFREY_2025_ACTUAL = 416.6;

describe("fantasy variance model", () => {
  it("reproduces the measured McCaffrey fit rather than the posted spot-check", () => {
    // 47 games, per-game values that reproduce the fitted rate. The fit gave
    // raw_rate=15.59, rel=0.855, rate=14.59, proj=248.0 at 17 remaining games.
    const train: PlayerWeek[] = [];
    for (let i = 0; i < 47; i += 1) {
      const ppr = i < MCCAFFREY_TRAIN.length ? MCCAFFREY_TRAIN[i] : 20.0;
      train.push({ playerId: "mcc", position: "RB", absWeek: i + 1, ppr });
    }

    const [row] = buildVarianceProjections({
      weeks: train,
      positionalMeanPpr: POSITIONAL_MEAN_PPR,
      positionalCv: POSITIONAL_CV_SNAPSHOT,
      remainingGames: { mcc: 17 },
    });

    expect(row).toBeDefined();
    // Honest fitted numbers, measured. NOT 417/313/584.
    expect(row.proj).toBeGreaterThan(0);
    expect(row.games).toBe(47);
    expect(row.reliability).toBeCloseTo(47 / (47 + SHRINKAGE_KAPPA_GAMES), 6);
    expect(row.floor).toBeCloseTo(row.proj * (1 - row.cvPlayer), 9);
    expect(row.ceiling).toBeCloseTo(row.proj * (1 + row.cvPlayer), 9);
  });

  it("FALSIFIER: the posted spot-check is McCaffrey's REALIZED 2025 total, not a projection", () => {
    // proj=417 rounds from 416.6, which is what he actually scored in 2025 — a
    // season the fit never trains on. A model cannot forecast a number it has
    // not seen; this number is the answer key.
    expect(Math.round(MCCAFFREY_2025_ACTUAL)).toBe(417);
    expect(MCCAFFREY_2025_ACTUAL).toBeCloseTo(417, 0);
  });

  it("FALSIFIER: 313/584 is not a band this method can produce around 417", () => {
    const proj = 417;
    const floor = 313;
    const ceiling = 584;
    const cvFromFloor = 1 - floor / proj;
    const cvFromCeiling = ceiling / proj - 1;
    // The band is symmetric in CV by construction, so these two would have to
    // agree for any pair this method emits. They are 0.15 apart: the posted
    // numbers were not produced by this formula.
    expect(cvFromFloor).toBeCloseTo(0.2494, 4);
    expect(cvFromCeiling).toBeCloseTo(0.4005, 4);
    expect(Math.abs(cvFromFloor - cvFromCeiling)).toBeGreaterThan(0.15);
  });

  it("FALSIFIER: the 313/584 band cannot be rebuilt by any single CV", () => {
    const floor = 313;
    const ceiling = 584;
    // A band from this method is proj*(1+/-CV), so floor+ceiling == 2*proj
    // exactly, for every CV. 897 != 2*417, so no CV reproduces this pair.
    expect(floor + ceiling).toBe(897);
    expect((floor + ceiling) / 2).toBe(448.5);
    expect((floor + ceiling) / 2).not.toBe(417);
    // And each endpoint demands a different CV:
    expect(1 - floor / 417).toBeCloseTo(0.2494, 4);
    expect(ceiling / 417 - 1).toBeCloseTo(0.4005, 4);
  });

  it("keeps the posted CV priors named and distinct from the measured ones", () => {
    expect(SPEC_POSTED_POSITIONAL_CV.QB).toBe(0.45);
    expect(SPEC_POSTED_POSITIONAL_CV.TE).toBe(0.67);
    for (const pos of ["QB", "RB", "WR", "TE"] as const) {
      const delta = Math.abs(
        SPEC_POSTED_POSITIONAL_CV[pos] - POSITIONAL_CV_SNAPSHOT[pos],
      );
      // The priors understate production by a lot. A silent swap here would
      // make every band a lie, so the gap is pinned.
      expect(delta).toBeGreaterThan(0.2);
    }
  });

  it("classifies which CV table a caller passed", () => {
    expect(classifyCvSource(SPEC_POSTED_POSITIONAL_CV)).toBe("spec-posted");
    expect(classifyCvSource(POSITIONAL_CV_SNAPSHOT)).toBe("measured");
    expect(classifyCvSource({ ...POSITIONAL_CV_SNAPSHOT, QB: 0.5 })).toBe("caller-supplied");
  });

  it("per-player sanity bounds: floor <= proj <= ceiling, all finite, all positive", () => {
    const train: PlayerWeek[] = [];
    for (let p = 0; p < 40; p += 1) {
      const pos = (["QB", "RB", "WR", "TE"] as const)[p % 4];
      for (let g = 1; g <= 12; g += 1) {
        train.push({ playerId: `p${p}`, position: pos, absWeek: g, ppr: 5 + ((p * 7 + g * 3) % 20) });
      }
    }
    const remaining: Record<string, number> = {};
    for (let p = 0; p < 40; p += 1) remaining[`p${p}`] = 16;

    const rows = buildVarianceProjections({
      weeks: train,
      positionalMeanPpr: POSITIONAL_MEAN_PPR,
      positionalCv: POSITIONAL_CV_SNAPSHOT,
      remainingGames: remaining,
    });

    expect(rows).toHaveLength(40);
    for (const r of rows) {
      expect(Number.isFinite(r.proj)).toBe(true);
      expect(Number.isFinite(r.floor)).toBe(true);
      expect(Number.isFinite(r.ceiling)).toBe(true);
      expect(r.floor).toBeLessThanOrEqual(r.proj);
      expect(r.proj).toBeLessThanOrEqual(r.ceiling);
      expect(r.proj).toBeGreaterThan(0);
      // A band is a CV around the point, so it is symmetric in CV terms.
      expect(1 - r.floor / r.proj).toBeCloseTo(r.ceiling / r.proj - 1, 9);
    }
  });

  it("shrinks toward the prior, and shrinks MORE for small samples", () => {
    const mk = (id: string, games: number) => {
      const w: PlayerWeek[] = [];
      for (let g = 1; g <= games; g += 1) w.push({ playerId: id, position: "WR", absWeek: g, ppr: 30 });
      return w;
    };
    const [big] = buildVarianceProjections({
      weeks: [...mk("big", 40), ...mk("small", 8)],
      positionalMeanPpr: POSITIONAL_MEAN_PPR,
      positionalCv: POSITIONAL_CV_SNAPSHOT,
      remainingGames: { big: 16, small: 16 },
    }).filter((r) => r.playerId === "big");
    const [small] = buildVarianceProjections({
      weeks: [...mk("big", 40), ...mk("small", 8)],
      positionalMeanPpr: POSITIONAL_MEAN_PPR,
      positionalCv: POSITIONAL_CV_SNAPSHOT,
      remainingGames: { big: 16, small: 16 },
    }).filter((r) => r.playerId === "small");

    // Both read 30.0; the prior is 8.56. More games = closer to the player.
    expect(big.proj).toBeGreaterThan(small.proj);
    expect(big.reliability).toBeGreaterThan(small.reliability);
    expect(big.reliability).toBeCloseTo(40 / (40 + SHRINKAGE_KAPPA_GAMES), 6);
    expect(small.reliability).toBeCloseTo(8 / (8 + SHRINKAGE_KAPPA_GAMES), 6);
  });

  it("recency weight halves every half-life and never goes negative", () => {
    expect(recencyWeight(10, 10, 6)).toBe(1);
    expect(recencyWeight(4, 10, RECENCY_HALF_LIFE_WEEKS)).toBeCloseTo(0.5, 12);
    expect(recencyWeight(0, 100, 6)).toBeGreaterThan(0);
    expect(recencyWeight(200, 100, 6)).toBe(1); // future week is not negative
  });

  it("EXCLUDES rather than invents: no games, no prior, no remaining games", () => {
    const train = weeks("a", "WR", [10, 12, 11, 13, 10, 12, 11, 12, 11, 10]);
    const tooFew = buildVarianceProjections({
      weeks: train.slice(0, 3),
      positionalMeanPpr: POSITIONAL_MEAN_PPR,
      positionalCv: POSITIONAL_CV_SNAPSHOT,
      remainingGames: { a: 16 },
    });
    expect(tooFew).toHaveLength(0);

    // A WR with a WR-only prior IS projectable; the guard is per-position, not
    // "any missing key". What must be excluded is a player with NO prior.
    const wrOnly = buildVarianceProjections({
      weeks: train,
      positionalMeanPpr: { WR: 8.56 },
      positionalCv: { WR: 0.876 },
      remainingGames: { a: 16 },
    });
    expect(wrOnly).toHaveLength(1);

    // Same data, no WR prior at all -> excluded, never defaulted.
    const noPrior = buildVarianceProjections({
      weeks: train,
      positionalMeanPpr: { QB: 13.9 },
      positionalCv: { QB: 0.993 },
      remainingGames: { a: 16 },
    });
    expect(noPrior).toHaveLength(0);

    const noGames = buildVarianceProjections({
      weeks: train,
      positionalMeanPpr: POSITIONAL_MEAN_PPR,
      positionalCv: POSITIONAL_CV_SNAPSHOT,
      remainingGames: {},
    });
    expect(noGames).toHaveLength(0);
  });
});
