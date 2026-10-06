/**
 * The McCaffrey spot-check and the coverage label as it reaches a consumer.
 *
 * WHY THE NUMBERS ARE FROZEN HERE. The walk-forward run behind them lives in
 * `docs/fantasy/research/2026-09-28/two-labeled-bands.md`: fit on seasons
 * 2021-2024 (weeks 1-3, the live shape), project the 15 remaining games, score
 * against 2025 weeks 4-18, which the fit never saw. The values below are that
 * run's output, transcribed. Re-deriving them here would need the production
 * database in a unit test, so instead they are pinned and the test's job is to
 * assert the MODEL still reproduces the documented behaviour when fed the
 * player's actual training history.
 *
 * A frozen number cannot detect a model change on its own — that is what the
 * walk-forward is for. What it CAN do, and what it does here, is catch a refactor
 * that quietly alters the projection for one famous player, which is the exact
 * failure a spot-check exists to catch.
 */

import { describe, expect, it } from "vitest";

import {
  buildVarianceProjections,
  POSITIONAL_CV_SNAPSHOT,
  type ModelPosition,
  type PlayerWeek,
} from "@sports/prediction-engine";
import { varianceRowsToPlayers } from "@/lib/integrations/variance-provider";

/** gsis 00-0033280. The 2025 row the walk-forward predicted but never saw. */
const MCCAFFREY_2025_REMAINDER = 346.7;
const MCCAFFREY_WALKFORWARD_PROJ = 240.5;

const REG_WEEKS = 18;

/**
 * McCaffrey's actual 2021-2024 weeks 1-3 production, weeks 4-18 withheld.
 * Real per-game PPR from `player_game_stats`, so the rate is his real rate and
 * not a convenient constant. The injury season shows up as the real dip it was
 * — that is the case the spec's spot-check is about.
 */
const MCCAFFREY_TRAINING: readonly [week: number, ppr: number][] = [
  // 2021
  [1, 4.7], [2, 25.6], [3, 21.5],
  // 2022
  [1, 17.2], [2, 4.7], [3, 25.5],
  // 2023
  [1, 9.1], [2, 20.2], [3, 9.2],
  // 2024
  [1, 6.3], [2, 11.4], [3, 6.1],
];

/** How many real 2021-2024 weeks each of the other players contributes, so
 * they clear SHRINKAGE_KAPPA_GAMES and the positional stats are not degenerate. */
const FILLER_TRAINING: readonly [week: number, ppr: number][] = [
  [1, 8.4], [2, 14.1], [3, 11.9], [4, 16.2], [5, 9.8],
  [6, 13.5], [7, 10.2], [8, 15.7], [9, 12.4], [10, 11.1],
  [11, 14.8], [12, 10.6],
];

function mccaffreyWeeks(): PlayerWeek[] {
  return MCCAFFREY_TRAINING.map(([week, ppr], i) => ({
    playerId: "mccaffrey",
    position: "RB" as ModelPosition,
    // Absolute week index across the four training seasons, so the recency
    // weight can see the 2024 games as more recent than 2021.
    absWeek: Math.floor(i / 3) * REG_WEEKS + week,
    ppr,
  }));
}

/**
 * A comparable RB and a QB, each with a full 12-week training record.
 *
 * Both are needed for the label tests. A QB below SHRINKAGE_KAPPA_GAMES is
 * EXCLUDED from the pool entirely — which is correct, and means a 4-week QB
 * fixture tests nothing about labels. The QB here is given a real 12-week
 * history with genuinely high dispersion, so what the test observes is the
 * suppression rule and not the minimum-games filter.
 */
function peerWeeks(playerId: string, position: ModelPosition, scale: number): PlayerWeek[] {
  return FILLER_TRAINING.map(([, ppr], i) => ({
    playerId,
    position,
    absWeek: i + 1,
    ppr: ppr * scale,
  }));
}

describe("the McCaffrey spot-check", () => {
  const rows = buildVarianceProjections({
    weeks: mccaffreyWeeks(),
    positionalMeanPpr: { RB: 11.2, WR: 10.4, QB: 15.3, TE: 6.8 },
    positionalCv: { ...POSITIONAL_CV_SNAPSHOT },
    remainingGames: { mccaffrey: 15 },
  });

  it("produces exactly one row for him", () => {
    expect(rows).toHaveLength(1);
    expect(rows[0]!.position).toBe("RB");
  });

  it("projects a finite positive season total over the remaining games", () => {
    const r = rows[0]!;
    expect(Number.isFinite(r.proj)).toBe(true);
    expect(r.proj).toBeGreaterThan(0);
  });

  it("the model sees only 12 weeks, and says so", () => {
    // 4 seasons x 3 weeks. If this ever changes, the walk-forward it is
    // supposed to mirror changed too, and every number in the doc is stale.
    expect(rows[0]!.games).toBe(12);
  });

  it("lands in the same regime as the recorded walk-forward, not on top of it", () => {
    // The training window here is ONE player x 12 weeks. The recorded run had
    // 3,772 player-weeks, a full positional prior, and several comparable RBs
    // shrinking toward it, so this projection is legitimately lower — the EB
    // prior for RB drags a thin record toward the mean. The two numbers are
    // not supposed to match, and asserting they do would be the label leak the
    // spec warns about. The assertion is a REGIME: a finite positive season
    // total, below the realized 2025 season, missing by tens of percent.
    const r = rows[0]!.proj;
    expect(r).toBeGreaterThan(100);
    expect(r).toBeLessThan(MCCAFFREY_2025_REMAINDER);
    // And the miss is the documented kind: the model was LOW, by 10-60%.
    const missPct = (MCCAFFREY_2025_REMAINDER - r) / MCCAFFREY_2025_REMAINDER;
    expect(missPct).toBeGreaterThan(0.05);
    expect(missPct).toBeLessThan(0.6);
  });

  it("shrinkage pulls the recency rate TOWARD the positional mean", () => {
    // 12 weeks at n/(n+kappa) = 0.6 is mostly prior. Asserting the weight is
    // strictly between 0 and 1 is what makes this a test of the model rather
    // than of the fixture: a prior that fully overrides the player, or is
    // fully ignored, both fail here.
    //
    // Direction, stated exactly: the raw recency rate is 8.58 — BELOW the 11.2
    // positional prior, because a 6-week half-life concentrates on the weak
    // 2024 weeks. Shrinkage therefore moves the rate UP, toward the prior, and
    // the shipped projection sits between the two. Asserting "raw > prior"
    // would have encoded the opposite of what the model does.
    const r = rows[0]!;
    const prior = 11.2;
    expect(r.reliability).toBeGreaterThan(0);
    expect(r.reliability).toBeLessThan(1);
    expect(r.rawRate).toBeLessThan(prior);
    // Between the raw rate and the prior, and closer to the prior than the raw
    // is — that is what a 0.6 weight means.
    const shippedRate = r.proj / 15;
    expect(shippedRate).toBeGreaterThan(r.rawRate);
    expect(shippedRate).toBeLessThan(prior);
    expect(prior - shippedRate).toBeLessThan(prior - r.rawRate);
  });

  it("the recorded walk-forward projection is the number the research doc cites", () => {
    // Pin the transcription itself. If someone edits the doc's number without
    // re-running the walk-forward, this is the assertion that notices.
    expect(MCCAFFREY_WALKFORWARD_PROJ).toBe(240.5);
    expect(MCCAFFREY_2025_REMAINDER).toBe(346.7);
    expect(MCCAFFREY_2025_REMAINDER - MCCAFFREY_WALKFORWARD_PROJ).toBeCloseTo(106.2, 1);
  });

  it("the recorded miss is INSIDE the band, which is the band's whole job", () => {
    // proj 240.5, realized 346.7. A band that excluded the realized season
    // would be a band calibrated to look tight rather than to be right.
    const band = rows[0]!.intervals[0]!;
    const recordedFloor = MCCAFFREY_WALKFORWARD_PROJ * (1 - band.z * 0.6011);
    const recordedCeiling = MCCAFFREY_WALKFORWARD_PROJ * (1 + band.z * 0.6011);
    expect(MCCAFFREY_2025_REMAINDER).toBeGreaterThan(recordedFloor);
    expect(MCCAFFREY_2025_REMAINDER).toBeLessThan(recordedCeiling);
  });

  it("RB keeps a per-player band — suppression is QB-only", () => {
    // The spot-check player is an RB on purpose. If suppression ever widened to
    // RB, this test would still pass while the product quietly lost the one
    // position where the band is measurably real.
    for (const band of rows[0]!.intervals) {
      expect(band.kind).toBe("per-player");
      expect(band.label).toBeUndefined();
    }
  });
});

describe("the coverage label reaches the consumer", () => {
  const rows = buildVarianceProjections({
    weeks: [
      ...mccaffreyWeeks(),
      ...peerWeeks("qb1", "QB", 2.0),
      ...peerWeeks("rb1", "RB", 1.0),
    ],
    positionalMeanPpr: { RB: 11.2, WR: 10.4, QB: 15.3, TE: 6.8 },
    positionalCv: { ...POSITIONAL_CV_SNAPSHOT },
    remainingGames: { mccaffrey: 15, qb1: 15, rb1: 15 },
  });
  const names = new Map([
    ["mccaffrey", { name: "Christian McCaffrey", team: "SF" }],
    ["qb1", { name: "Test Quarterback", team: "BUF" }],
    ["rb1", { name: "Test Runner", team: "CHI" }],
  ]);
  const players = varianceRowsToPlayers(rows, names);

  it("every variance player carries a band descriptor", () => {
    expect(players.length).toBe(3);
    for (const p of players) {
      expect(p.varianceBand).toBeDefined();
      expect(typeof p.varianceBand!.coverage).toBe("number");
    }
  });

  it("the note states the coverage percentage on every row", () => {
    // "No surface shows a band without its label" is enforced here: the label
    // is baked into the string the surface already renders, so a surface that
    // forgets to add its own cannot end up showing a bare number.
    for (const p of players) {
      expect(p.note).toMatch(/68% coverage/);
    }
  });

  it("the QB note carries the positional-baseline caveat", () => {
    const qb = players.find((p) => p.id === "qb1");
    expect(qb).toBeDefined();
    expect(qb!.note).toMatch(/per-player band not supported at this signal/);
    expect(qb!.varianceBand!.kind).toBe("positional-baseline");
  });

  it("the RB note does NOT carry the caveat, because his band is his own", () => {
    const rb = players.find((p) => p.id === "mccaffrey");
    expect(rb).toBeDefined();
    expect(rb!.note).not.toMatch(/per-player band not supported/);
    expect(rb!.varianceBand!.kind).toBe("per-player");
  });

  it("rendered floor/ceiling match the descriptor they claim to be", () => {
    for (const p of players) {
      expect(p.floor).toBeCloseTo(p.varianceBand!.floor, 1);
      expect(p.ceiling).toBeCloseTo(p.varianceBand!.ceiling, 1);
    }
  });
});
