import { describe, expect, it } from "vitest";
import {
  computeQbPostFirstIntEfficiencySplit,
  QB_POST_FIRST_INT_EFFICIENCY_SPLIT_VERSION,
  QB_POST_FIRST_INT_FEATURE_KEYS,
  type QbPostFirstIntDropbackPlay,
} from "../qb-post-first-int-efficiency-split.js";
import { attachOwnEpa, mapNflversePbpToExpectedMetrics, type PbpRow } from "../nflverse-pbp-mapper.js";
import { computeFeatureSchemaHash } from "../types.js";
import { requireMetricBirthCertificate } from "../../metrics/core/metric-birth-certificate.js";

function makeIntPlay(overrides: Partial<QbPostFirstIntDropbackPlay> = {}): QbPostFirstIntDropbackPlay {
  return {
    playId: "2026_01_BUF_MIN-10",
    gameId: "2026_01_BUF_MIN",
    numericPlayId: 10,
    season: 2026,
    week: 1,
    passerPlayerId: "00-ALLEN",
    posteam: "BUF",
    playType: "pass",
    qbSpike: 0,
    interception: 0,
    epa: 0.15,
    ...overrides,
  };
}

describe("Q54 — QB Efficiency Split Before vs After First Interception (SHADOW)", () => {
  it("1. partitions dropbacks strictly before vs strictly after first INT, excludes the first INT play itself, and keeps 2nd+ INTs in after arm", () => {
    const plays: QbPostFirstIntDropbackPlay[] = [];
    // Game 1 (Week 1): 25 dropbacks before first INT (epa = +0.10), then first INT at play 100 (epa = -4.5),
    // then 25 dropbacks after first INT (24 at +0.30, and 1 second INT at -1.70 -> mean = (7.2 - 1.7)/25 = +0.22)
    for (let i = 1; i <= 25; i++) {
      plays.push(
        makeIntPlay({
          playId: `g1-${i}`,
          gameId: "2026_01_BUF_MIN",
          numericPlayId: i,
          week: 1,
          passerPlayerId: "00-ALLEN",
          interception: 0,
          epa: 0.1,
        }),
      );
    }
    // First INT boundary play (must be excluded from both arms)
    plays.push(
      makeIntPlay({
        playId: "g1-100",
        gameId: "2026_01_BUF_MIN",
        numericPlayId: 100,
        week: 1,
        passerPlayerId: "00-ALLEN",
        interception: 1,
        epa: -4.5,
      }),
    );
    // 25 plays after first INT, including a 2nd INT at play 110
    for (let i = 101; i <= 125; i++) {
      const isSecondInt = i === 110;
      plays.push(
        makeIntPlay({
          playId: `g1-${i}`,
          gameId: "2026_01_BUF_MIN",
          numericPlayId: i,
          week: 1,
          passerPlayerId: "00-ALLEN",
          interception: isSecondInt ? 1 : 0,
          epa: isSecondInt ? -1.7 : 0.3,
        }),
      );
    }

    const out = computeQbPostFirstIntEfficiencySplit(plays, 2);
    expect(out.seasonToDate.diagnostics.excludedFirstIntBoundaryPlays).toBe(1);
    const allen = out.seasonToDate.qbs.find((q) => q.passerPlayerId === "00-ALLEN")!;
    expect(allen).toBeDefined();
    expect(allen.intGamesCount).toBe(1);
    expect(allen.beforeFirstIntArm?.ratableDropbacks).toBe(25);
    expect(allen.beforeFirstIntArm?.rawEpaPerDropback).toBe(0.1);
    expect(allen.afterFirstIntArm?.ratableDropbacks).toBe(25);
    expect(allen.afterFirstIntArm?.subsequentInterceptions).toBe(1);
    expect(allen.afterFirstIntArm?.rawEpaPerDropback).toBe(0.22);
    expect(allen.postIntTiltDelta).toBe(0.12); // bounce-back (> 0)
    expect(allen.quadrant).toBe("bounce-back");
  });

  it("2. excludes INT-less games completely from both arms and counts them in diagnostics", () => {
    const plays: QbPostFirstIntDropbackPlay[] = [];
    // Game 1 (Week 1): INT-less game with 40 dropbacks at +0.99 EPA -> must be excluded completely
    for (let i = 1; i <= 40; i++) {
      plays.push(
        makeIntPlay({
          playId: `g1-${i}`,
          gameId: "2026_01_BUF_MIA",
          numericPlayId: i,
          week: 1,
          passerPlayerId: "00-ALLEN",
          interception: 0,
          epa: 0.99,
        }),
      );
    }
    // Game 2 (Week 2): INT game with 25 before (0.20) and 25 after (-0.10)
    for (let i = 1; i <= 25; i++) {
      plays.push(
        makeIntPlay({
          playId: `g2-pre-${i}`,
          gameId: "2026_02_BUF_NYJ",
          numericPlayId: i,
          week: 2,
          passerPlayerId: "00-ALLEN",
          interception: 0,
          epa: 0.2,
        }),
      );
    }
    plays.push(
      makeIntPlay({
        playId: "g2-int",
        gameId: "2026_02_BUF_NYJ",
        numericPlayId: 50,
        week: 2,
        passerPlayerId: "00-ALLEN",
        interception: 1,
        epa: -3.5,
      }),
    );
    for (let i = 51; i <= 75; i++) {
      plays.push(
        makeIntPlay({
          playId: `g2-post-${i}`,
          gameId: "2026_02_BUF_NYJ",
          numericPlayId: i,
          week: 2,
          passerPlayerId: "00-ALLEN",
          interception: 0,
          epa: -0.1,
        }),
      );
    }

    const out = computeQbPostFirstIntEfficiencySplit(plays, 3);
    expect(out.seasonToDate.diagnostics.excludedIntLessQbGames).toBe(1);
    expect(out.seasonToDate.diagnostics.excludedIntLessGameDropbacks).toBe(40);
    const allen = out.seasonToDate.qbs[0]!;
    expect(allen.intGamesCount).toBe(1);
    expect(allen.intLessGamesExcludedCount).toBe(1);
    expect(allen.beforeFirstIntArm?.rawEpaPerDropback).toBe(0.2);
    expect(allen.afterFirstIntArm?.rawEpaPerDropback).toBe(-0.1);
    expect(allen.quadrant).toBe("downward-spiral");
  });

  it("3. isolates multi-QB games per (gameId, passerPlayerId) so each QB uses his own first INT", () => {
    const plays: QbPostFirstIntDropbackPlay[] = [];
    // Starter QB1 throws an INT on play 1, then has 25 post-INT plays.
    // Relief QB2 enters on play 30, throws 25 pre-INT dropbacks (even though QB1 already threw an INT!),
    // then throws his own first INT on play 60, then 25 post-INT dropbacks.
    plays.push(
      makeIntPlay({
        playId: "g1-1",
        gameId: "G1",
        numericPlayId: 1,
        week: 1,
        passerPlayerId: "00-QB1",
        interception: 1,
        epa: -3.0,
      }),
    );
    for (let i = 2; i <= 26; i++) {
      plays.push(
        makeIntPlay({
          playId: `g1-qb1-${i}`,
          gameId: "G1",
          numericPlayId: i,
          week: 1,
          passerPlayerId: "00-QB1",
          interception: 0,
          epa: -0.2,
        }),
      );
    }

    for (let i = 30; i <= 54; i++) {
      plays.push(
        makeIntPlay({
          playId: `g1-qb2-pre-${i}`,
          gameId: "G1",
          numericPlayId: i,
          week: 1,
          passerPlayerId: "00-QB2",
          interception: 0,
          epa: 0.25,
        }),
      );
    }
    plays.push(
      makeIntPlay({
        playId: "g1-qb2-int",
        gameId: "G1",
        numericPlayId: 60,
        week: 1,
        passerPlayerId: "00-QB2",
        interception: 1,
        epa: -4.0,
      }),
    );
    for (let i = 61; i <= 85; i++) {
      plays.push(
        makeIntPlay({
          playId: `g1-qb2-post-${i}`,
          gameId: "G1",
          numericPlayId: i,
          week: 1,
          passerPlayerId: "00-QB2",
          interception: 0,
          epa: 0.05,
        }),
      );
    }

    const out = computeQbPostFirstIntEfficiencySplit(plays, 2);
    const qb1 = out.seasonToDate.qbs.find((q) => q.passerPlayerId === "00-QB1")!;
    const qb2 = out.seasonToDate.qbs.find((q) => q.passerPlayerId === "00-QB2")!;

    // QB1 had 0 pre-INT plays (< 25 floor -> null) and 25 post-INT plays (emitted)
    expect(qb1.beforeFirstIntArm).toBeNull();
    expect(qb1.afterFirstIntArm?.ratableDropbacks).toBe(25);
    expect(qb1.postIntTiltDelta).toBeNull();

    // QB2 had 25 pre-INT plays and 25 post-INT plays around his OWN first INT at play 60
    expect(qb2.beforeFirstIntArm?.ratableDropbacks).toBe(25);
    expect(qb2.afterFirstIntArm?.ratableDropbacks).toBe(25);
    expect(qb2.postIntTiltDelta).not.toBeNull();
  });

  it("4. enforces the 25-dropback aggregate floor across multiple games and applies n/(n+20) shrinkage", () => {
    const plays: QbPostFirstIntDropbackPlay[] = [];
    // Two games for QB_A: each game has 15 before and 15 after (per-game < 25, but aggregate = 30 >= 25!)
    for (const [w, gId] of [
      [1, "G1"],
      [2, "G2"],
    ] as const) {
      for (let i = 1; i <= 15; i++) {
        plays.push(
          makeIntPlay({
            playId: `${gId}-pre-${i}`,
            gameId: gId,
            numericPlayId: i,
            week: w,
            passerPlayerId: "00-QBA",
            epa: 0.1,
          }),
        );
      }
      plays.push(
        makeIntPlay({
          playId: `${gId}-int`,
          gameId: gId,
          numericPlayId: 20,
          week: w,
          passerPlayerId: "00-QBA",
          interception: 1,
          epa: -3.0,
        }),
      );
      for (let i = 21; i <= 35; i++) {
        plays.push(
          makeIntPlay({
            playId: `${gId}-post-${i}`,
            gameId: gId,
            numericPlayId: i,
            week: w,
            passerPlayerId: "00-QBA",
            epa: 0.3,
          }),
        );
      }
    }

    // QB_B has only 24 before and 24 after -> both arms below 25 floor -> not emitted
    for (let i = 1; i <= 24; i++) {
      plays.push(makeIntPlay({ playId: `g3-pre-${i}`, gameId: "G3", numericPlayId: i, week: 1, passerPlayerId: "00-QBB", epa: 0.5 }));
    }
    plays.push(makeIntPlay({ playId: "g3-int", gameId: "G3", numericPlayId: 30, week: 1, passerPlayerId: "00-QBB", interception: 1, epa: -3.0 }));
    for (let i = 31; i <= 54; i++) {
      plays.push(makeIntPlay({ playId: `g3-post-${i}`, gameId: "G3", numericPlayId: i, week: 1, passerPlayerId: "00-QBB", epa: -0.5 }));
    }

    const out = computeQbPostFirstIntEfficiencySplit(plays, 3);
    expect(out.seasonToDate.qbs).toHaveLength(1);
    const qba = out.seasonToDate.qbs[0]!;
    expect(qba.passerPlayerId).toBe("00-QBA");
    expect(qba.beforeFirstIntArm?.ratableDropbacks).toBe(30);
    expect(qba.afterFirstIntArm?.ratableDropbacks).toBe(30);
    expect(out.seasonToDate.diagnostics.belowFloorBeforeArmsCount).toBe(1);
    expect(out.seasonToDate.diagnostics.belowFloorAfterArmsCount).toBe(1);
  });

  it("5. stamps provenance and integrates with nflverse-pbp-mapper + birth certificate registry", () => {
    const pbpRows: PbpRow[] = [
      {
        game_id: "2026_01_BUF_MIN",
        play_id: "15",
        season: "2026",
        season_type: "REG",
        week: "1",
        home_team: "MIN",
        away_team: "BUF",
        posteam: "MIN",
        defteam: "BUF",
        play_type: "pass",
        passer_player_id: "00-WENTZ",
        qb_spike: "0",
        interception: "1",
      },
    ];
    const mapped = mapNflversePbpToExpectedMetrics(pbpRows);
    expect(mapped.qbPostFirstIntPlays).toHaveLength(1);
    expect(mapped.qbPostFirstIntPlays[0]?.interception).toBe(1);
    const attached = attachOwnEpa(mapped.qbPostFirstIntPlays, new Map([["2026_01_BUF_MIN-15", -3.8]]));
    expect(attached[0]?.epa).toBe(-3.8);

    expect(computeFeatureSchemaHash(QB_POST_FIRST_INT_FEATURE_KEYS)).toHaveLength(8);
    expect(QB_POST_FIRST_INT_EFFICIENCY_SPLIT_VERSION).toBe("gse-qb-post-first-int-epa-v1");

    const cert = requireMetricBirthCertificate("qb-post-first-int-efficiency-split");
    expect(cert.status).toBe("SHADOW");
    expect(cert.internalName).toBe("qb_post_first_int_efficiency_split_shadow");
  });
});
