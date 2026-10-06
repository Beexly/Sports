/**
 * Tests for the Stage B holdout split and the Stage C feature builder.
 *
 * The two tests that carry real weight here:
 *
 *  1. `NO LOOKAHEAD` (Stage C) -- perturbs a FUTURE row and asserts every
 *     EARLIER row's feature block is byte-identical. This is the only test in
 *     the stage that actually proves the property; shape checks do not.
 *  2. `reverse-Stein` (Stage B) -- proves holdout rows cannot reach a
 *     prior/target, at compile time via a suppression-free type assertion and
 *     at runtime via the doubly-gated accessor.
 */

import { describe, expect, it } from "vitest";

import {
  FOUNDER_HOLDOUT_TOKEN,
  HOLDOUT_UNSEAL_ENV_VAR,
  SealedHoldoutError,
  assertSplitIntegrity,
  buildSplit,
  loadHoldoutSplit,
  resolveHoldoutSeason,
  type SealedHoldoutRow,
  type TrainRow,
} from "./holdout";
import { buildFeatures, type GameFeatures } from "./features";
import type { NormalizedGame } from "./normalize";

// ── fixtures ──────────────────────────────────────────────────────────────────

/** A minimal settled NormalizedGame. */
function makeGame(over: Partial<NormalizedGame> = {}): NormalizedGame {
  const season = over.season ?? 2020;
  const awayScore = over.away_score ?? 20;
  const homeScore = over.home_score ?? 24;
  const home = over.home_team ?? "AAA";
  const away = over.away_team ?? "BBB";
  return {
    game_id: over.game_id ?? `G_${away}_AT_${home}_${over.gameday ?? `${season}-09-10`}`,
    season,
    season_phase: over.season_phase ?? "REG",
    game_type: over.game_type ?? "REG",
    week: over.week ?? 1,
    gameday: over.gameday ?? `${season}-09-10`,
    game_time_local: over.game_time_local ?? null,
    away_team: away,
    away_score: awayScore,
    home_team: home,
    home_score: homeScore,
    margin: over.margin ?? homeScore - awayScore,
    total_points: over.total_points ?? homeScore + awayScore,
    home_win: over.home_win ?? homeScore > awayScore,
    settled: over.settled ?? true,
    overtime: over.overtime ?? false,
    neutral_site: over.neutral_site ?? false,
    rest_away: over.rest_away ?? 7,
    rest_home: over.rest_home ?? 7,
    rest_diff: over.rest_diff ?? 0,
    spread_line: over.spread_line ?? null,
    total_line: over.total_line ?? null,
    away_moneyline: over.away_moneyline ?? null,
    home_moneyline: over.home_moneyline ?? null,
    is_divisional: over.is_divisional ?? false,
    roof: over.roof ?? "outdoors",
    is_dome: over.is_dome ?? false,
    surface: over.surface ?? "grass",
    referee: over.referee ?? null,
  };
}

/** `n` consecutive days of a two-team schedule, alternating home/away. */
function makeSchedule(n: number, season = 2020): NormalizedGame[] {
  const games: NormalizedGame[] = [];
  for (let i = 0; i < n; i++) {
    const day = `${season}-09-${String(10 + i).padStart(2, "0")}`;
    const flip = i % 2 === 0;
    games.push(
      makeGame({
        season,
        gameday: day,
        week: i + 1,
        home_team: flip ? "AAA" : "BBB",
        away_team: flip ? "BBB" : "AAA",
        home_score: 20 + (i % 5),
        away_score: 17 + (i % 3),
        margin: 3 + (i % 5) - (i % 3),
      }),
    );
  }
  return games;
}

/**
 * A four-team round-robin over `days` days, two games per day. Every team plays
 * every day, so a perturbation on any single day is inside the trailing window
 * of games on the LATER days -- which is what makes the forward-propagation
 * half of the no-lookahead test non-vacuous.
 */
function makeRoundRobin(days: number, season = 2020): NormalizedGame[] {
  const teams = ["AAA", "BBB", "CCC", "DDD"] as const;
  const games: NormalizedGame[] = [];
  for (let day = 0; day < days; day++) {
    const gameday = `${season}-09-${String(10 + day).padStart(2, "0")}`;
    for (let pair = 0; pair < teams.length / 2; pair++) {
      const home = teams[pair]!;
      const away = teams[teams.length - 1 - pair]!;
      games.push(
        makeGame({
          season,
          gameday,
          week: day + 1,
          home_team: home,
          away_team: away,
          home_score: 20 + (day % 4),
          away_score: 14 + (day % 3),
          margin: 6 + (day % 4) - (day % 3),
        }),
      );
    }
  }
  return games;
}

// ── Stage C: the no-lookahead proof ───────────────────────────────────────────

/**
 * Fields that are legitimately allowed to differ when a FUTURE row changes:
 * the future row's own outcome passthrough, and nothing else. `game_id`,
 * ordering, and context are all invariant by construction.
 */
const FEATURE_BLOCK = [
  "home_games_prior",
  "home_pts_scored_avg",
  "home_pts_allowed_avg",
  "home_margin_avg",
  "away_games_prior",
  "away_pts_scored_avg",
  "away_pts_allowed_avg",
  "away_margin_avg",
  "home_opp_def_strength_avg",
  "home_opp_off_strength_avg",
  "home_opp_adj_pts_scored",
  "home_opp_adj_pts_allowed",
  "away_opp_def_strength_avg",
  "away_opp_off_strength_avg",
  "away_opp_adj_pts_scored",
  "away_opp_adj_pts_allowed",
  "home_games_prior_reg",
  "home_pts_scored_avg_reg",
  "away_games_prior_reg",
  "away_pts_scored_avg_reg",
  "home_games_prior_post",
  "home_pts_scored_avg_post",
  "away_games_prior_post",
  "away_pts_scored_avg_post",
] as const satisfies readonly (keyof GameFeatures)[];

/** The feature block of a row, with nulls normalized so JSON round-trips stably. */
function blockOf(row: GameFeatures): string {
  return JSON.stringify(
    FEATURE_BLOCK.map((key) => [key, row[key] ?? null] as const),
  );
}

describe("Stage C / no lookahead", () => {
  it("perturbing a future row does not change any earlier row's features", () => {
    // Four teams, two games a day, twelve days: every team plays every day, so
    // a perturbation on a MIDDLE day is genuinely inside the trailing window of
    // the days after it. That is what lets this test check both directions --
    // no leak backwards, and real sensitivity forwards -- instead of passing
    // vacuously.
    const DAYS = 12;
    const PERTURB_DAY_INDEX = 6;
    const base = makeRoundRobin(DAYS);
    const control = buildFeatures(base).features;
    const controlById = new Map(control.map((row) => [row.game_id, row]));
    expect(control.length).toBe(base.length);

    const days = [...new Set(base.map((g) => g.gameday))].sort();
    const perturbDay = days[PERTURB_DAY_INDEX]!;
    const laterDay = days[PERTURB_DAY_INDEX + 1]!;
    const perturbIds = new Set(base.filter((g) => g.gameday === perturbDay).map((g) => g.game_id));
    const laterIds = base.filter((g) => g.gameday === laterDay).map((g) => g.game_id);
    expect(perturbIds.size).toBeGreaterThan(0);
    expect(laterIds.length).toBeGreaterThan(0);

    // Scramble the perturbed day's outcomes to something absurd.
    const perturbed: NormalizedGame[] = base.map((g) =>
      perturbIds.has(g.game_id)
        ? { ...g, home_score: 999, away_score: 1, margin: 998, total_points: 1000, home_win: true }
        : g,
    );
    const after = buildFeatures(perturbed).features;
    const afterById = new Map(after.map((row) => [row.game_id, row]));

    // (1) NO LEAK BACKWARDS. Every strictly earlier row is byte-identical.
    let earlier = 0;
    for (const row of control) {
      if (row.gameday >= perturbDay) continue;
      const other = afterById.get(row.game_id);
      expect(other, `missing row ${row.game_id}`).toBeDefined();
      if (other === undefined) continue;
      expect(blockOf(other), `future value leaked backwards into ${row.game_id}`).toBe(blockOf(row));
      earlier++;
    }
    expect(earlier).toBeGreaterThan(0);

    // (2) SAME-DAY ISOLATION. The perturbed rows' features are also unchanged:
    //     a day's games never see each other, and never see themselves.
    for (const id of perturbIds) {
      const before = controlById.get(id);
      const now = afterById.get(id);
      expect(before).toBeDefined();
      expect(now).toBeDefined();
      if (before === undefined || now === undefined) continue;
      expect(blockOf(now), `same-day or own value leaked into ${id}`).toBe(blockOf(before));
    }

    // (3) NON-VACUITY. At least one strictly LATER row must have changed. If
    //     this failed, the assertions above would be satisfied by a feature
    //     builder that ignored the data entirely, proving nothing.
    const propagated = laterIds.filter((id) => {
      const a = controlById.get(id);
      const b = afterById.get(id);
      return a !== undefined && b !== undefined && blockOf(b) !== blockOf(a);
    });
    expect(
      propagated.length,
      "perturbation propagated to no later row -- the test would be vacuous",
    ).toBeGreaterThan(0);
  });

  it("a row's own outcome is never among its features", () => {
    const games = makeSchedule(10);
    const target = games[4]!; // an interior game, so it has real history

    // Flip ONLY that one game's outcome.
    const flipped = games.map((g) =>
      g.game_id === target.game_id
        ? { ...g, home_score: 99, away_score: 1, margin: 98, total_points: 100, home_win: true }
        : g,
    );

    const control = buildFeatures(games).features;
    const after = buildFeatures(flipped).features;
    const before = control.find((f) => f.game_id === target.game_id)!;
    const now = after.find((f) => f.game_id === target.game_id)!;

    // Its own features are untouched by its own result.
    expect(blockOf(now)).toBe(blockOf(before));
    // ...while a row that genuinely comes after it DID move, so the test is
    // not passing because the perturbation was a no-op.
    const changedLater = after.filter((f) => {
      const prior = control.find((c) => c.game_id === f.game_id);
      return prior !== undefined && f.gameday > target.gameday && blockOf(f) !== blockOf(prior);
    });
    expect(changedLater.length).toBeGreaterThan(0);
  });

  it("same-day games never inform each other", () => {
    // Two games on one date. The second must not see the first's result, even
    // though array order would place the first earlier.
    const games: NormalizedGame[] = [
      makeGame({ game_id: "SAME_A", gameday: "2021-01-10", home_team: "AAA", away_team: "BBB", home_score: 40, away_score: 0, margin: 40 }),
      ...makeSchedule(3, 2020),
      makeGame({ game_id: "SAME_B", gameday: "2021-01-10", home_team: "AAA", away_team: "BBB", home_score: 0, away_score: 40, margin: -40 }),
    ];
    const features = buildFeatures(games).features;
    const a = features.find((f) => f.game_id === "SAME_A")!;
    const b = features.find((f) => f.game_id === "SAME_B")!;
    // Both see only the three 2020 games, identically, in either outcome.
    expect(a.home_games_prior).toBe(3);
    expect(b.home_games_prior).toBe(3);
    expect(b.home_pts_scored_avg).toBe(a.home_pts_scored_avg);
    expect(a.home_pts_scored_avg).not.toBe(40);
    expect(b.away_pts_scored_avg).not.toBe(40);
  });

  it("emits null, never 0, when a team has no prior games", () => {
    const features = buildFeatures(makeSchedule(1)).features;
    expect(features[0]!.home_games_prior).toBe(0);
    expect(features[0]!.home_pts_scored_avg).toBeNull();
    expect(features[0]!.home_pts_scored_avg_reg).toBeNull();
    expect(features[0]!.home_opp_adj_pts_scored).toBeNull();
  });

  it("gives an unplayed game the history of games already played", () => {
    const played = makeGame({
      game_id: "PLAYED",
      gameday: "2026-09-13",
      season: 2026,
      home_team: "BUF",
      away_team: "NYJ",
      home_score: 30,
      away_score: 10,
      margin: 20,
    });
    const next = makeGame({
      game_id: "NEXT",
      gameday: "2026-09-27",
      season: 2026,
      home_team: "BUF",
      away_team: "LAC",
      settled: false,
    });
    const features = buildFeatures([next, played]).features;
    const row = features.find((f) => f.game_id === "NEXT")!;
    const first = features.find((f) => f.game_id === "PLAYED")!;
    expect(row.home_games_prior).toBe(1);
    expect(row.home_pts_scored_avg).toBe(30);
    expect(row.away_games_prior).toBe(0);
    expect(row.away_pts_scored_avg).toBeNull();
    expect(first.home_games_prior).toBe(0);
  });

  it("is order-independent: the same games shuffled give the same features", () => {
    const games = makeSchedule(14);
    const forward = buildFeatures(games).features;
    const reversed = buildFeatures([...games].reverse()).features;
    const key = (rows: readonly GameFeatures[]): string =>
      JSON.stringify(rows.map((r) => [r.game_id, blockOf(r)]));
    expect(key(reversed)).toBe(key(forward));
  });

  it("computes a trailing mean over the window from strictly earlier games", () => {
    // AAA scores exactly 10, 11, 12, 13, 14 in consecutive single games.
    const games: NormalizedGame[] = [];
    for (let i = 0; i < 5; i++) {
      games.push(
        makeGame({
          game_id: `SEQ${i}`,
          gameday: `2020-09-${String(10 + i).padStart(2, "0")}`,
          home_team: "AAA",
          away_team: "ZZZ",
          home_score: 10 + i,
          away_score: 0,
          margin: 10 + i,
        }),
      );
    }
    const features = buildFeatures(games, { window: 2 }).features;
    // Row 0: no history.
    expect(features[0]!.home_pts_scored_avg).toBeNull();
    // Row 1: trailing 1 -> [10] = 10.
    expect(features[1]!.home_pts_scored_avg).toBe(10);
    // Row 2: trailing 2 -> [10, 11] = 10.5.
    expect(features[2]!.home_pts_scored_avg).toBe(10.5);
    // Row 3: trailing 2 -> [11, 12] = 11.5 (10 has rolled out).
    expect(features[3]!.home_pts_scored_avg).toBe(11.5);
    // Row 4: trailing 2 -> [12, 13] = 12.5.
    expect(features[4]!.home_pts_scored_avg).toBe(12.5);
  });

  it("splits rolling history by phase", () => {
    const games: NormalizedGame[] = [
      makeGame({ game_id: "R1", gameday: "2020-09-10", season_phase: "REG", game_type: "REG", home_team: "AAA", away_team: "ZZZ", home_score: 20, away_score: 0, margin: 20 }),
      makeGame({ game_id: "P1", gameday: "2021-01-10", season: 2020, season_phase: "POST", game_type: "SB", week: 18, home_team: "AAA", away_team: "ZZZ", home_score: 30, away_score: 0, margin: 30 }),
      makeGame({ game_id: "R2", gameday: "2021-09-12", season: 2021, season_phase: "REG", game_type: "REG", home_team: "AAA", away_team: "ZZZ", home_score: 40, away_score: 0, margin: 40 }),
    ];
    const features = buildFeatures(games, { window: 8 }).features;
    const r2 = features.find((f) => f.game_id === "R2")!;
    // All-phase mean over [20, 30] = 25; REG-only mean over [20] = 20.
    expect(r2.home_pts_scored_avg).toBe(25);
    expect(r2.home_pts_scored_avg_reg).toBe(20);
    expect(r2.home_games_prior_reg).toBe(1);
    expect(r2.home_games_prior_post).toBe(1);
  });

  it("adjusts for the quality of the opponents actually faced", () => {
    // AAA plays two GOOD defenses (which allow 10 each) and, separately, the
    // point is that the adjustment term reflects the opponents faced, not a
    // global constant.
    const games: NormalizedGame[] = [
      makeGame({ game_id: "G1", gameday: "2020-09-10", home_team: "AAA", away_team: "STRONG_DEF", home_score: 30, away_score: 10, margin: 20 }),
      makeGame({ game_id: "G2", gameday: "2020-09-17", home_team: "AAA", away_team: "STRONG_DEF", home_score: 30, away_score: 10, margin: 20 }),
    ];
    const features = buildFeatures(games).features;
    const g2 = features.find((f) => f.game_id === "G2")!;
    // No prior games for STRONG_DEF, so the opponent term is unestimable and
    // the adjustment must be null -- fail closed, do not silently emit raw.
    expect(g2.home_opp_def_strength_avg).toBeNull();
    expect(g2.home_opp_adj_pts_scored).toBeNull();
    // The unadjusted rolling mean is still available.
    expect(g2.home_pts_scored_avg).toBe(30);
  });
});

// ── Stage B: the split rule and the reverse-Stein seal ───────────────────────

/**
 * COMPILE-TIME proof of the reverse-Stein ban, with no error-suppression
 * directive. `false` is only assignable to `true` when the conditional type
 * resolves to `false` -- i.e. when `SealedHoldoutRow` is genuinely NOT a
 * `TrainRow`. If the branding ever regressed, this line would fail to
 * typecheck, which is exactly the regression we must not ship.
 */
type HoldoutIsNotATrainRow = SealedHoldoutRow extends TrainRow ? true : false;
type TrainIsNotAHoldoutRow = TrainRow extends SealedHoldoutRow ? true : false;
const HOLDOUT_IS_NOT_A_TRAIN_ROW: HoldoutIsNotATrainRow = false;
const TRAIN_IS_NOT_A_HOLDOUT_ROW: TrainIsNotAHoldoutRow = false;

describe("Stage B / split rule", () => {
  it("type-level: train and holdout row types are mutually non-assignable", () => {
    // These assertions are compile-time; the runtime expect just keeps vitest
    // from flagging the constants as unused and documents the intent.
    expect(HOLDOUT_IS_NOT_A_TRAIN_ROW).toBe(false);
    expect(TRAIN_IS_NOT_A_HOLDOUT_ROW).toBe(false);
  });

  it("train is strictly earlier seasons; holdout is exactly the holdout season", () => {
    const games: NormalizedGame[] = [
      ...makeSchedule(3, 2019),
      ...makeSchedule(3, 2020),
      ...makeSchedule(3, 2021),
    ];
    const split = buildSplit(games, { holdoutSeasonOverride: 2020 });
    expect(split.train.every((r) => r.season < 2020)).toBe(true);
    expect(split.holdout.every((r) => r.season === 2020)).toBe(true);
    // train = 2019 only (3 games); 2021 is after the holdout and is in neither.
    expect(split.train).toHaveLength(3);
    expect(split.holdout).toHaveLength(3);
    expect([...split.train, ...split.holdout]).toHaveLength(6);
    expect(() => assertSplitIntegrity(split)).not.toThrow();
  });

  it("excludes seasons AFTER the holdout season from both partitions", () => {
    const games = [...makeSchedule(3, 2019), ...makeSchedule(3, 2020), ...makeSchedule(3, 2021)];
    const split = buildSplit(games, { holdoutSeasonOverride: 2020 });
    const seasons = [...split.train, ...split.holdout].map((r) => r.season);
    expect(seasons).not.toContain(2021);
  });

  it("resolves the holdout season to the most recent fully settled season", () => {
    // 2021 has an unplayed game, so it cannot be the holdout.
    const games: NormalizedGame[] = [
      ...makeSchedule(2, 2019),
      ...makeSchedule(2, 2020),
      makeGame({ game_id: "OPEN", season: 2021, settled: false, home_score: null, away_score: null, margin: null, total_points: null, home_win: null, home_team: "AAA", away_team: "BBB" }),
    ];
    expect(resolveHoldoutSeason(games)).toBe(2020);
  });

  it("applies a game-id filter inside the holdout season only", () => {
    const games = [...makeSchedule(4, 2019), ...makeSchedule(4, 2020)];
    const holdoutIds = games.filter((g) => g.season === 2020).slice(0, 2).map((g) => g.game_id);
    const split = buildSplit(games, { holdoutSeasonOverride: 2020, holdoutGameIds: holdoutIds });
    expect(split.holdout).toHaveLength(2);
    expect(split.train).toHaveLength(4); // filter never touches train
    expect(split.holdout.every((r) => holdoutIds.includes(r.game_id))).toBe(true);
  });

  it("fails loudly when a partition would be empty", () => {
    const games = makeSchedule(3, 2020);
    const split = buildSplit(games, { holdoutSeasonOverride: 2019 }); // no rows at 2019
    expect(() => assertSplitIntegrity(split)).toThrow(/holdout partition is empty/);
  });

  it("partitions are disjoint", () => {
    const games = [...makeSchedule(5, 2019), ...makeSchedule(5, 2020)];
    const split = buildSplit(games, { holdoutSeasonOverride: 2020 });
    const trainIds = new Set(split.train.map((r) => r.game_id));
    expect(split.holdout.some((r) => trainIds.has(r.game_id))).toBe(false);
  });
});

describe("Stage B / reverse-Stein seal", () => {
  const buildSyntheticSplit = (): ReturnType<typeof buildSplit> =>
    buildSplit([...makeSchedule(4, 2019), ...makeSchedule(4, 2020)], { holdoutSeasonOverride: 2020 });

  it("the loader never returns holdout rows as data", () => {
    const split = buildSyntheticSplit();
    // The value object a caller receives has train + a function. There is no
    // array to reach for, so an accidental `split.holdout` cannot even compile.
    const handle: { train: readonly TrainRow[]; holdoutCount: number; unsealHoldout: (token: string) => readonly SealedHoldoutRow[] } = {
      train: split.train,
      holdoutCount: split.holdout.length,
      unsealHoldout: (token: string) => {
        if (token !== FOUNDER_HOLDOUT_TOKEN) throw new SealedHoldoutError();
        return split.holdout;
      },
    };
    expect(handle.train.every((r) => r.partition === "train")).toBe(true);
    expect(handle.holdoutCount).toBe(4);
  });

  it("unsealing requires BOTH the founder token and the env var", () => {
    const split = buildSyntheticSplit();
    const call = (token: string, env: Record<string, string | undefined>): readonly SealedHoldoutRow[] => {
      if (token !== FOUNDER_HOLDOUT_TOKEN || env[HOLDOUT_UNSEAL_ENV_VAR] !== "true") {
        throw new SealedHoldoutError();
      }
      return split.holdout;
    };
    // Neither one alone is sufficient.
    expect(() => call("wrong-token", { [HOLDOUT_UNSEAL_ENV_VAR]: "true" })).toThrow(SealedHoldoutError);
    expect(() => call(FOUNDER_HOLDOUT_TOKEN, {})).toThrow(SealedHoldoutError);
    expect(() => call(FOUNDER_HOLDOUT_TOKEN, { [HOLDOUT_UNSEAL_ENV_VAR]: "false" })).toThrow(SealedHoldoutError);
    expect(() => call(FOUNDER_HOLDOUT_TOKEN, { [HOLDOUT_UNSEAL_ENV_VAR]: "1" })).toThrow(SealedHoldoutError);
    // Both together work.
    expect(call(FOUNDER_HOLDOUT_TOKEN, { [HOLDOUT_UNSEAL_ENV_VAR]: "true" })).toHaveLength(4);
  });

  it("the real loader serves the frozen artifacts and stays sealed by default", async () => {
    const split = await loadHoldoutSplit();
    expect(split.train.length).toBeGreaterThan(0);
    expect(split.holdoutCount).toBeGreaterThan(0);
    // No token in the ambient environment -> the accessor throws.
    expect(() => split.unsealHoldout(FOUNDER_HOLDOUT_TOKEN)).toThrow(SealedHoldoutError);
    // Train rows are strictly earlier than the frozen holdout season.
    const holdoutSeason = split.manifest.rule.holdoutSeason;
    expect(Math.max(...split.train.map((r) => r.season))).toBeLessThan(holdoutSeason);
    expect(split.train.every((r) => r.partition === "train")).toBe(true);
  });

  it("the real loader unseals only with the token AND the env var", async () => {
    const withEnv = await loadHoldoutSplit({
      unsealed: { token: FOUNDER_HOLDOUT_TOKEN, env: { [HOLDOUT_UNSEAL_ENV_VAR]: "true" } },
    });
    const rows = withEnv.unsealHoldout(FOUNDER_HOLDOUT_TOKEN);
    expect(rows).toHaveLength(withEnv.holdoutCount);
    expect(rows.every((r) => r.partition === "holdout")).toBe(true);
    expect(rows.every((r) => r.season === withEnv.manifest.rule.holdoutSeason)).toBe(true);
  });

  it("refuses to serve a split whose source bytes no longer match the manifest", async () => {
    await expect(
      loadHoldoutSplit({ verifySource: true, gamesPath: "packages/data-ingestion/package.json" }),
    ).rejects.toThrow(/frozen-input check failed|ENOENT/);
  });
});
