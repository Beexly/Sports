import { describe, expect, it } from "vitest";
import {
  computeQbOpponentTierEfficiencySplit,
  QB_OPPONENT_TIER_EFFICIENCY_SPLIT_VERSION,
  QB_OPPONENT_TIER_FEATURE_KEYS,
  type QbOpponentTierDropbackPlay,
} from "../qb-opponent-tier-efficiency-split.js";
import { attachOwnEpa, mapNflversePbpToExpectedMetrics, type PbpRow } from "../nflverse-pbp-mapper.js";
import { computeFeatureSchemaHash } from "../types.js";
import { requireMetricBirthCertificate } from "../../metrics/core/metric-birth-certificate.js";

function makeDropback(overrides: Partial<QbOpponentTierDropbackPlay> = {}): QbOpponentTierDropbackPlay {
  return {
    playId: "2026_01_NE_BUF-1",
    season: 2026,
    week: 1,
    passerPlayerId: "00-MAYE",
    posteam: "NE",
    defteam: "DEF_01",
    playType: "pass",
    qbSpike: 0,
    epa: 0.1,
    ...overrides,
  };
}

/**
 * Helper: seed 12 defenses (`DEF_01`..`DEF_12`) in Weeks 1 and 2 with 100 ratable
 * dropbacks each (50 in Week 1, 50 in Week 2) so that entering Week 3 all 12
 * defenses have >= 100 prior ratable dropbacks faced.
 * `DEF_01`..`DEF_10` have lower EPA allowed (-0.30..-0.21) -> TOP-10.
 * `DEF_11`..`DEF_12` have higher EPA allowed (+0.20, +0.25) -> REST.
 */
function buildSeeded12DefensesWeeks1And2(): QbOpponentTierDropbackPlay[] {
  const plays: QbOpponentTierDropbackPlay[] = [];
  for (let d = 1; d <= 12; d++) {
    const defteam = `DEF_${String(d).padStart(2, "0")}`;
    const defEpa = d <= 10 ? -0.31 + d * 0.01 : 0.1 + d * 0.01;
    for (const w of [1, 2]) {
      for (let i = 0; i < 50; i++) {
        plays.push(
          makeDropback({
            playId: `seed-w${w}-${defteam}-${i}`,
            week: w,
            passerPlayerId: "00-SEED-QB",
            posteam: "SEED",
            defteam,
            epa: defEpa,
          }),
        );
      }
    }
  }
  return plays;
}

describe("Q53 — QB Efficiency Split by Opponent Defensive Tier (SHADOW)", () => {
  it("1. enforces point-in-time tier ranking (no lookahead; Week 1 unclassified; 99 prior dropbacks unranked)", () => {
    const plays = buildSeeded12DefensesWeeks1And2();
    // Add a 13th defense DEF_99 with only 99 prior ratable dropbacks entering Week 3
    for (let i = 0; i < 99; i++) {
      plays.push(
        makeDropback({
          playId: `seed-def99-${i}`,
          week: i < 50 ? 1 : 2,
          passerPlayerId: "00-SEED-QB",
          defteam: "DEF_99",
          epa: -0.99, // even with best EPA, 99 < 100 -> UNRANKED
        }),
      );
    }
    // Week 3 play against DEF_99 must be excluded as unranked opponent
    plays.push(
      makeDropback({
        playId: "w3-vs-def99",
        week: 3,
        passerPlayerId: "00-MAYE",
        defteam: "DEF_99",
        epa: 0.5,
      }),
    );

    // Also add massive positive EPA to DEF_01 in Week 4 (AFTER Week 3) to verify no lookahead into Week 3's rank
    for (let i = 0; i < 100; i++) {
      plays.push(
        makeDropback({
          playId: `w4-blowup-${i}`,
          week: 4,
          passerPlayerId: "00-SEED-QB",
          defteam: "DEF_01",
          epa: 5.0,
        }),
      );
    }

    const out = computeQbOpponentTierEfficiencySplit(plays, 5);
    // Week 1 has 0 ranked defenses
    expect(out.defenseRanksByWeek[1]).toEqual([]);
    // Week 2 has 0 ranked defenses (each defense only had 50 dropbacks in Week 1 < 100)
    expect(out.defenseRanksByWeek[2]).toEqual([]);
    // Entering Week 3: DEF_01..DEF_12 are ranked (100 dropbacks); DEF_99 is NOT ranked (99 dropbacks)
    const w3Ranks = out.defenseRanksByWeek[3]!;
    expect(w3Ranks).toHaveLength(12);
    expect(w3Ranks[0]?.defteam).toBe("DEF_01");
    expect(w3Ranks[0]?.tier).toBe("TOP-10");
    expect(w3Ranks[9]?.defteam).toBe("DEF_10");
    expect(w3Ranks[9]?.tier).toBe("TOP-10");
    expect(w3Ranks[10]?.defteam).toBe("DEF_11");
    expect(w3Ranks[10]?.tier).toBe("REST");
    expect(w3Ranks.some((r) => r.defteam === "DEF_99")).toBe(false);

    // Entering Week 4: DEF_01's priorMeanEpaAllowed is still -0.30 (its Week 4 +5.0 blowup does NOT leak into Week 4's rank!)
    const def01W4 = out.defenseRanksByWeek[4]?.find((r) => r.defteam === "DEF_01");
    expect(def01W4?.priorMeanEpaAllowed).toBe(-0.3);
    expect(def01W4?.tier).toBe("TOP-10");
  });

  it("2. enforces deterministic tie-breaking at the rank-10 boundary (defteam ascending, exactly 10 TOP-10 teams)", () => {
    const plays: QbOpponentTierDropbackPlay[] = [];
    // 12 defenses all with identical prior EPA allowed (0.0) over 100 dropbacks in Week 1
    const teams = ["NYJ", "BUF", "MIA", "NE", "BAL", "CIN", "CLE", "PIT", "HOU", "IND", "JAX", "TEN"];
    for (const defteam of teams) {
      for (let i = 0; i < 100; i++) {
        plays.push(
          makeDropback({
            playId: `w1-${defteam}-${i}`,
            week: 1,
            passerPlayerId: "00-SEED",
            defteam,
            epa: 0.0,
          }),
        );
      }
    }
    // Add one Week 2 play so Week 2 ranks are computed
    plays.push(makeDropback({ playId: "w2-1", week: 2, passerPlayerId: "00-MAYE", defteam: "TEN", epa: 0.2 }));

    const out = computeQbOpponentTierEfficiencySplit(plays, 3);
    const w2Ranks = out.defenseRanksByWeek[2]!;
    expect(w2Ranks).toHaveLength(12);
    const top10 = w2Ranks.filter((r) => r.tier === "TOP-10").map((r) => r.defteam);
    const rest = w2Ranks.filter((r) => r.tier === "REST").map((r) => r.defteam);
    expect(top10).toHaveLength(10);
    // Alphabetical order: BAL, BUF, CIN, CLE, HOU, IND, JAX, MIA, NE, NYJ (ranks 1..10); PIT, TEN (ranks 11..12)
    expect(top10).toEqual(["BAL", "BUF", "CIN", "CLE", "HOU", "IND", "JAX", "MIA", "NE", "NYJ"]);
    expect(rest).toEqual(["PIT", "TEN"]);
  });

  it("3. reproduces Drake Maye negative sensitivityDelta direction and n/(n+20) shrinkage", () => {
    const plays = buildSeeded12DefensesWeeks1And2();

    // In Week 3:
    // Drake Maye: 30 dropbacks vs DEF_01 (TOP-10) at -0.12 EPA, 30 dropbacks vs DEF_11 (REST) at +0.30 EPA
    for (let i = 0; i < 30; i++) {
      plays.push(
        makeDropback({
          playId: `maye-top10-${i}`,
          week: 3,
          passerPlayerId: "00-MAYE",
          posteam: "NE",
          defteam: "DEF_01",
          epa: -0.12,
        }),
      );
      plays.push(
        makeDropback({
          playId: `maye-rest-${i}`,
          week: 3,
          passerPlayerId: "00-MAYE",
          posteam: "NE",
          defteam: "DEF_11",
          epa: 0.3,
        }),
      );
    }

    // Peer QB (Josh Allen): 30 dropbacks vs DEF_02 (TOP-10) at +0.12 EPA, 30 dropbacks vs DEF_12 (REST) at +0.10 EPA
    for (let i = 0; i < 30; i++) {
      plays.push(
        makeDropback({
          playId: `allen-top10-${i}`,
          week: 3,
          passerPlayerId: "00-ALLEN",
          posteam: "BUF",
          defteam: "DEF_02",
          epa: 0.12,
        }),
      );
      plays.push(
        makeDropback({
          playId: `allen-rest-${i}`,
          week: 3,
          passerPlayerId: "00-ALLEN",
          posteam: "BUF",
          defteam: "DEF_12",
          epa: 0.1,
        }),
      );
    }

    const out = computeQbOpponentTierEfficiencySplit(plays, 4);
    // League TOP-10 mean across Maye (-0.12 * 30) and Allen (+0.12 * 30) = 0.0
    // League REST mean across Maye (+0.30 * 30) and Allen (+0.10 * 30) = +0.20
    expect(out.seasonToDate.leagueTop10MeanEpa).toBe(0);
    expect(out.seasonToDate.leagueRestMeanEpa).toBe(0.2);

    const maye = out.seasonToDate.qbs.find((q) => q.passerPlayerId === "00-MAYE")!;
    expect(maye).toBeDefined();
    expect(maye.top10Arm?.rawEpaPerDropback).toBe(-0.12);
    // shrunk TOP-10: 0 + (30/50)*(-0.12 - 0) = -0.072
    expect(maye.top10Arm?.shrunkEpaPerDropback).toBe(-0.072);
    expect(maye.restArm?.rawEpaPerDropback).toBe(0.3);
    // shrunk REST: 0.20 + (30/50)*(0.30 - 0.20) = 0.26
    expect(maye.restArm?.shrunkEpaPerDropback).toBe(0.26);
    // sensitivityDelta = -0.072 - 0.26 = -0.332 (< 0, worse vs top-10)
    expect(maye.sensitivityDelta).toBe(-0.332);
    expect(maye.rawSensitivityDelta).toBe(-0.42);
  });

  it("4. enforces dropback population rules (spikes out, non-pass out, empty passer counts for defense tier only, null EPA in dropbacks only)", () => {
    const plays: QbOpponentTierDropbackPlay[] = [];
    // Week 1: DEF_01 faces 100 dropbacks WITH empty passerPlayerId -> still ranks DEF_01 for Week 2!
    for (let i = 0; i < 100; i++) {
      plays.push(
        makeDropback({
          playId: `w1-empty-passer-${i}`,
          week: 1,
          passerPlayerId: "",
          defteam: "DEF_01",
          epa: -0.2,
        }),
      );
    }
    // Week 2: QB1 has 30 ratable dropbacks + 2 null-EPA dropbacks + 1 spike + 1 run against DEF_01
    for (let i = 0; i < 32; i++) {
      plays.push(
        makeDropback({
          playId: `w2-qb1-${i}`,
          week: 2,
          passerPlayerId: "00-QB1",
          defteam: "DEF_01",
          epa: i < 30 ? 0.15 : null,
        }),
      );
    }
    plays.push(makeDropback({ playId: "w2-spike", week: 2, passerPlayerId: "00-QB1", defteam: "DEF_01", qbSpike: 1, epa: -0.5 }));
    plays.push(makeDropback({ playId: "w2-run", week: 2, passerPlayerId: "00-QB1", defteam: "DEF_01", playType: "run", epa: 0.8 }));

    const out = computeQbOpponentTierEfficiencySplit(plays, 3);
    expect(out.defenseRanksByWeek[2]).toHaveLength(1);
    expect(out.defenseRanksByWeek[2]?.[0]?.defteam).toBe("DEF_01");

    const qb1 = out.seasonToDate.qbs.find((q) => q.passerPlayerId === "00-QB1")!;
    expect(qb1.top10Arm?.dropbacks).toBe(32); // includes the 2 null-EPA dropbacks
    expect(qb1.top10Arm?.ratableDropbacks).toBe(30);
    expect(qb1.restArm).toBeNull(); // < 30 ratable dropbacks in REST
    expect(qb1.sensitivityDelta).toBeNull(); // one arm null -> delta null
    expect(out.seasonToDate.diagnostics.excludedQbSpikePlays).toBe(1);
    expect(out.seasonToDate.diagnostics.excludedNonPassPlays).toBe(1);
    expect(out.seasonToDate.diagnostics.excludedEmptyPasserIdPlays).toBe(100);
    expect(out.seasonToDate.diagnostics.excludedNullEpaDropbacks).toBe(2);
  });

  it("5. keeps tier classification invariant across season-to-date, last-4, and last-8 windows", () => {
    const plays = buildSeeded12DefensesWeeks1And2();
    // Add dummy plays in Weeks 3, 4, 5, 6 and 30 QB dropbacks in Week 6 against DEF_01
    for (const w of [3, 4, 5]) {
      plays.push(makeDropback({ playId: `dummy-w${w}`, week: w, passerPlayerId: "00-SEED-QB", defteam: "DEF_01", epa: -0.1 }));
    }
    for (let i = 0; i < 30; i++) {
      plays.push(
        makeDropback({
          playId: `w6-qb-${i}`,
          week: 6,
          passerPlayerId: "00-ALLEN",
          posteam: "BUF",
          defteam: "DEF_01",
          epa: 0.22,
        }),
      );
    }

    // In last-4 (weeks 3, 4, 5, 6), Weeks 1 and 2 are outside the 4-week window,
    // yet DEF_01's Week 6 tier MUST still be computed from all prior weeks (1..5) so DEF_01 stays TOP-10!
    const out = computeQbOpponentTierEfficiencySplit(plays, 7);
    expect(out.last4Weeks.includedWeeks).toEqual([3, 4, 5, 6]);
    const allenLast4 = out.last4Weeks.qbs.find((q) => q.passerPlayerId === "00-ALLEN")!;
    expect(allenLast4.top10Arm?.ratableDropbacks).toBe(30);
    expect(allenLast4.top10Arm?.rawEpaPerDropback).toBe(0.22);
  });

  it("6. stamps provenance and integrates with nflverse-pbp-mapper + birth certificate registry", () => {
    const pbpRows: PbpRow[] = [
      {
        game_id: "2026_01_BUF_MIN",
        play_id: "1",
        season: "2026",
        season_type: "REG",
        week: "1",
        home_team: "MIN",
        away_team: "BUF",
        posteam: "BUF",
        defteam: "MIN",
        play_type: "pass",
        passer_player_id: "00-ALLEN",
        qb_spike: "0",
      },
    ];
    const mapped = mapNflversePbpToExpectedMetrics(pbpRows);
    expect(mapped.qbOpponentTierPlays).toHaveLength(1);
    const attached = attachOwnEpa(mapped.qbOpponentTierPlays, new Map([["2026_01_BUF_MIN-1", 0.35]]));
    expect(attached[0]?.epa).toBe(0.35);

    expect(computeFeatureSchemaHash(QB_OPPONENT_TIER_FEATURE_KEYS)).toHaveLength(8);
    expect(QB_OPPONENT_TIER_EFFICIENCY_SPLIT_VERSION).toBe("gse-qb-opp-tier-epa-v1");

    const cert = requireMetricBirthCertificate("qb-opponent-tier-efficiency-split");
    expect(cert.status).toBe("SHADOW");
    expect(cert.internalName).toBe("qb_opponent_tier_efficiency_split_shadow");
  });
});
