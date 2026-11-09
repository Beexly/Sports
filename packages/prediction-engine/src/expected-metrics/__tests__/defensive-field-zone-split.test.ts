import { describe, expect, it } from "vitest";
import {
  computeDefensiveFieldZoneSplit,
  DEFENSIVE_FIELD_ZONE_SPLIT_FEATURE_KEYS,
  DEFENSIVE_FIELD_ZONE_SPLIT_VERSION,
  type DefensiveFieldZonePlay,
} from "../defensive-field-zone-split.js";
import { attachOwnEpa, mapNflversePbpToExpectedMetrics, type PbpRow } from "../nflverse-pbp-mapper.js";
import { computeFeatureSchemaHash } from "../types.js";
import { requireMetricBirthCertificate } from "../../metrics/core/metric-birth-certificate.js";

function makePlay(overrides: Partial<DefensiveFieldZonePlay> = {}): DefensiveFieldZonePlay {
  return {
    playId: "2026_01_OPP_SEA-10",
    season: 2026,
    week: 1,
    defteam: "SEA",
    posteam: "OPP",
    playType: "pass",
    qbKneel: 0,
    qbSpike: 0,
    yardline100: 50,
    down: 1,
    ydstogo: 10,
    yardsGained: 5,
    touchdown: 0,
    turnover: 0,
    epa: 0.1,
    ...overrides,
  };
}

describe("Q52 — Defensive Field-Zone Split (SHADOW)", () => {
  it("1. enforces zone boundary (yardline_100 == 20 is RED ZONE, 21 is OPEN FIELD, non-finite excluded & counted)", () => {
    const plays: DefensiveFieldZonePlay[] = [];
    // 30 RZ plays at yardline_100 === 20
    for (let i = 0; i < 30; i++) {
      plays.push(
        makePlay({
          playId: `rz-${i}`,
          week: 1,
          yardline100: 20,
          down: 1,
          ydstogo: 10,
          yardsGained: 5,
          epa: 0.4,
        }),
      );
    }
    // 100 open-field plays at yardline_100 === 21
    for (let i = 0; i < 100; i++) {
      plays.push(
        makePlay({
          playId: `of-${i}`,
          week: 1,
          yardline100: 21,
          down: 1,
          ydstogo: 10,
          yardsGained: 2,
          epa: -0.1,
        }),
      );
    }
    // 2 non-finite yardline_100 plays
    plays.push(makePlay({ playId: "nf-1", week: 1, yardline100: NaN, epa: 5.0 }));
    plays.push(makePlay({ playId: "nf-2", week: 1, yardline100: Infinity, epa: -5.0 }));

    const out = computeDefensiveFieldZoneSplit(plays, 2);
    expect(out.seasonToDate.diagnostics.excludedNonFiniteYardlinePlays).toBe(2);
    expect(out.seasonToDate.defenses).toHaveLength(1);
    const sea = out.seasonToDate.defenses[0]!;
    expect(sea.redZone.plays).toBe(30);
    expect(sea.openField.plays).toBe(100);
    expect(sea.redZone.meanEpaAllowed).toBe(0.4);
    expect(sea.openField.meanEpaAllowed).toBe(-0.1);
  });

  it("2. enforces Seattle-direction signs (open-field elite, red-zone fragile -> positive epaSplit & successSplit)", () => {
    const plays: DefensiveFieldZonePlay[] = [];
    // Red zone: 30 plays, positive EPA (+0.55), 80% success rate (24/30), 15 TDs (0.50 TD rate)
    for (let i = 0; i < 30; i++) {
      const isSucc = i < 24;
      const isTd = i < 15;
      plays.push(
        makePlay({
          playId: `sea-rz-${i}`,
          defteam: "SEA",
          week: 2,
          yardline100: 12,
          down: 1,
          ydstogo: 10,
          yardsGained: isSucc ? 6 : 1,
          touchdown: isTd ? 1 : 0,
          turnover: 0,
          epa: 0.55,
        }),
      );
    }
    // Open field: 100 plays, negative EPA (-0.25), 35% success rate (35/100)
    for (let i = 0; i < 100; i++) {
      const isSucc = i < 35;
      plays.push(
        makePlay({
          playId: `sea-of-${i}`,
          defteam: "SEA",
          week: 2,
          yardline100: 55,
          down: 1,
          ydstogo: 10,
          yardsGained: isSucc ? 5 : 1,
          touchdown: 0,
          turnover: 0,
          epa: -0.25,
        }),
      );
    }

    const out = computeDefensiveFieldZoneSplit(plays, { targetWeek: 5, targetSeason: 2026 });
    const sea = out.seasonToDate.defenses[0]!;
    expect(sea.redZone.meanEpaAllowed).toBe(0.55);
    expect(sea.openField.meanEpaAllowed).toBe(-0.25);
    expect(sea.epaSplit).toBe(0.8); // +0.55 - (-0.25) = +0.80 > 0
    expect(sea.redZone.successRateAllowed).toBe(0.8);
    expect(sea.openField.successRateAllowed).toBe(0.35);
    expect(sea.successSplit).toBe(0.45); // 0.80 - 0.35 = +0.45 > 0
    expect(sea.redZoneTdRateAllowed).toBe(0.5);
  });

  it("3. computes redZoneTdRateAllowed as per-play offensive TD rate (excluding pick-sixes where turnover === 1)", () => {
    const plays: DefensiveFieldZonePlay[] = [];
    for (let i = 0; i < 30; i++) {
      plays.push(
        makePlay({
          playId: `rz-${i}`,
          week: 1,
          yardline100: 10,
          // First 6 plays are offensive TDs; play 6 is a pick-six (touchdown=1, turnover=1)
          touchdown: i < 7 ? 1 : 0,
          turnover: i === 6 ? 1 : 0,
          yardsGained: i < 6 ? 10 : 0,
          epa: i === 6 ? -4.5 : 0.2,
        }),
      );
    }
    for (let i = 0; i < 100; i++) {
      plays.push(makePlay({ playId: `of-${i}`, week: 1, yardline100: 45, epa: 0.05 }));
    }

    const out = computeDefensiveFieldZoneSplit(plays, 2);
    const sea = out.seasonToDate.defenses[0]!;
    expect(sea.redZone.touchdownsAllowed).toBe(6); // pick-six excluded
    expect(sea.redZoneTdRateAllowed).toBe(0.2); // 6 / 30 = 0.2000
  });

  it("4. reuses isSuccessfulPlay semantics (turnover dominates TD; unratable down excluded from successPlays)", () => {
    const plays: DefensiveFieldZonePlay[] = [];
    // 30 RZ plays:
    //  - 10 plays with 1st & 10, gain 4 (40% = success)
    //  - 10 plays with 1st & 10, gain 10, touchdown=1, turnover=1 (turnover dominates TD -> failure)
    //  - 10 plays with down=0 (unratable for success, but valid for EPA and play count)
    for (let i = 0; i < 30; i++) {
      plays.push(
        makePlay({
          playId: `rz-${i}`,
          week: 1,
          yardline100: 15,
          down: i >= 20 ? 0 : 1,
          ydstogo: 10,
          yardsGained: i < 10 ? 4 : 10,
          touchdown: i >= 10 && i < 20 ? 1 : 0,
          turnover: i >= 10 && i < 20 ? 1 : 0,
          epa: 0.1,
        }),
      );
    }
    for (let i = 0; i < 100; i++) {
      plays.push(makePlay({ playId: `of-${i}`, week: 1, yardline100: 50, down: 1, ydstogo: 10, yardsGained: 4, epa: 0.1 }));
    }

    const out = computeDefensiveFieldZoneSplit(plays, 2);
    const sea = out.seasonToDate.defenses[0]!;
    expect(sea.redZone.plays).toBe(30);
    expect(sea.redZone.successPlays).toBe(20); // 10 unratable excluded
    expect(sea.redZone.successesAllowed).toBe(10); // 10 successes, 10 turnovers (failures)
    expect(sea.redZone.successRateAllowed).toBe(0.5); // 10 / 20
    expect(out.seasonToDate.diagnostics.redZoneExcludedUnratableSuccessPlays).toBe(10);
  });

  it("5. excludes null-own-EPA plays from EPA means while keeping them in plays and successPlays", () => {
    const plays: DefensiveFieldZonePlay[] = [];
    // 35 RZ plays: 30 have epa=0.3, 5 have epa=null (still >= 30 epaPlays floor)
    for (let i = 0; i < 35; i++) {
      plays.push(
        makePlay({
          playId: `rz-${i}`,
          week: 1,
          yardline100: 15,
          down: 1,
          ydstogo: 10,
          yardsGained: 5,
          epa: i < 30 ? 0.3 : null,
        }),
      );
    }
    for (let i = 0; i < 100; i++) {
      plays.push(makePlay({ playId: `of-${i}`, week: 1, yardline100: 50, epa: 0.1 }));
    }

    const out = computeDefensiveFieldZoneSplit(plays, 2);
    const sea = out.seasonToDate.defenses[0]!;
    expect(sea.redZone.plays).toBe(35);
    expect(sea.redZone.epaPlays).toBe(30);
    expect(sea.redZone.successPlays).toBe(35);
    expect(sea.redZone.meanEpaAllowed).toBe(0.3);
    expect(out.seasonToDate.diagnostics.redZoneExcludedNullEpaPlays).toBe(5);
  });

  it("6. enforces floors (29 RZ plays, 99 open-field plays, or 29 RZ epaPlays excluded & counted)", () => {
    const plays: DefensiveFieldZonePlay[] = [];
    // DEF_A: 29 RZ plays, 100 OF plays -> fails red_zone_plays_below_30 & red_zone_epa_plays_below_30
    for (let i = 0; i < 29; i++) plays.push(makePlay({ playId: `a-rz-${i}`, defteam: "DEF_A", yardline100: 10 }));
    for (let i = 0; i < 100; i++) plays.push(makePlay({ playId: `a-of-${i}`, defteam: "DEF_A", yardline100: 50 }));

    // DEF_B: 30 RZ plays, 99 OF plays -> fails open_field_plays_below_100
    for (let i = 0; i < 30; i++) plays.push(makePlay({ playId: `b-rz-${i}`, defteam: "DEF_B", yardline100: 10 }));
    for (let i = 0; i < 99; i++) plays.push(makePlay({ playId: `b-of-${i}`, defteam: "DEF_B", yardline100: 50 }));

    // DEF_C: 30 RZ plays (only 29 with non-null EPA), 100 OF plays -> fails red_zone_epa_plays_below_30
    for (let i = 0; i < 30; i++) {
      plays.push(
        makePlay({
          playId: `c-rz-${i}`,
          defteam: "DEF_C",
          yardline100: 10,
          epa: i === 29 ? null : 0.2,
        }),
      );
    }
    for (let i = 0; i < 100; i++) plays.push(makePlay({ playId: `c-of-${i}`, defteam: "DEF_C", yardline100: 50 }));

    const out = computeDefensiveFieldZoneSplit(plays, 2);
    expect(out.seasonToDate.defenses).toHaveLength(0);
    expect(out.seasonToDate.diagnostics.belowFloorDefensesCount).toBe(3);
    const byDef = new Map(out.seasonToDate.diagnostics.belowFloorDefenses.map((d) => [d.defteam, d.reasons]));
    expect(byDef.get("DEF_A")).toContain("red_zone_plays_below_30");
    expect(byDef.get("DEF_B")).toContain("open_field_plays_below_100");
    expect(byDef.get("DEF_C")).toContain("red_zone_epa_plays_below_30");
  });

  it("7. enforces point-in-time windows (week < targetWeek, last-4 / last-8 distinct weeks)", () => {
    const plays: DefensiveFieldZonePlay[] = [];
    // Weeks 1..5 each have 10 RZ plays and 25 OF plays (4 weeks = 40 RZ, 100 OF)
    for (let w = 1; w <= 6; w++) {
      const epaVal = w === 6 ? 9.9 : w * 0.1;
      for (let i = 0; i < 10; i++) {
        plays.push(makePlay({ playId: `w${w}-rz-${i}`, week: w, yardline100: 15, epa: epaVal }));
      }
      for (let i = 0; i < 25; i++) {
        plays.push(makePlay({ playId: `w${w}-of-${i}`, week: w, yardline100: 50, epa: 0.0 }));
      }
    }

    // Target week 6: week 6 plays (epa=9.9) must NOT leak; last-4 uses weeks 2, 3, 4, 5
    const out = computeDefensiveFieldZoneSplit(plays, 6);
    expect(out.seasonToDate.includedWeeks).toEqual([1, 2, 3, 4, 5]);
    expect(out.last4Weeks.includedWeeks).toEqual([2, 3, 4, 5]);

    const seaSeason = out.seasonToDate.defenses[0]!;
    const seaLast4 = out.last4Weeks.defenses[0]!;
    expect(seaSeason.redZone.plays).toBe(50);
    expect(seaLast4.redZone.plays).toBe(40);
    // Mean EPA in weeks 2,3,4,5 = (0.2 + 0.3 + 0.4 + 0.5) / 4 = 0.35
    expect(seaLast4.redZone.meanEpaAllowed).toBe(0.35);
  });

  it("8. excludes non-scrimmage, kneel, spike, and empty-team rows and counts them", () => {
    const plays: DefensiveFieldZonePlay[] = [
      makePlay({ playId: "punt-1", playType: "punt" }),
      makePlay({ playId: "fg-1", playType: "field_goal" }),
      makePlay({ playId: "kneel-1", playType: "run", qbKneel: 1 }),
      makePlay({ playId: "spike-1", playType: "pass", qbSpike: 1 }),
      makePlay({ playId: "empty-def", defteam: "" }),
      makePlay({ playId: "empty-pos", posteam: "" }),
    ];

    const out = computeDefensiveFieldZoneSplit(plays, 2);
    expect(out.seasonToDate.diagnostics.excludedNonScrimmagePlays).toBe(2);
    expect(out.seasonToDate.diagnostics.excludedKneelOrSpikePlays).toBe(2);
    expect(out.seasonToDate.diagnostics.excludedEmptyTeamPlays).toBe(2);
  });

  it("9. stamps provenance and integrates with nflverse-pbp-mapper + birth certificate registry", () => {
    const pbpRows: PbpRow[] = [];
    for (let i = 1; i <= 30; i++) {
      pbpRows.push({
        game_id: "2026_01_BUF_MIN",
        play_id: String(i),
        season: "2026",
        season_type: "REG",
        week: "1",
        home_team: "MIN",
        away_team: "BUF",
        posteam: "BUF",
        defteam: "MIN",
        play_type: "pass",
        down: "1",
        ydstogo: "10",
        yardline_100: "15",
        yards_gained: "6",
        touchdown: i <= 6 ? "1" : "0",
        interception: "0",
        fumble_lost: "0",
      });
    }
    for (let i = 31; i <= 130; i++) {
      pbpRows.push({
        game_id: "2026_01_BUF_MIN",
        play_id: String(i),
        season: "2026",
        season_type: "REG",
        week: "1",
        home_team: "MIN",
        away_team: "BUF",
        posteam: "BUF",
        defteam: "MIN",
        play_type: "run",
        down: "1",
        ydstogo: "10",
        yardline_100: "60",
        yards_gained: "3",
        touchdown: "0",
        interception: "0",
        fumble_lost: "0",
      });
    }

    const mapped = mapNflversePbpToExpectedMetrics(pbpRows);
    expect(mapped.defensiveFieldZonePlays).toHaveLength(130);

    const ownEpaMap = new Map<string, number>();
    for (const p of mapped.defensiveFieldZonePlays) {
      ownEpaMap.set(p.playId, p.yardline100 <= 20 ? 0.25 : -0.05);
    }
    const withOwnEpa = attachOwnEpa(mapped.defensiveFieldZonePlays, ownEpaMap);
    const out = computeDefensiveFieldZoneSplit(withOwnEpa, 2);
    const minRow = out.seasonToDate.defenses[0]!;
    expect(minRow.defteam).toBe("MIN");
    expect(minRow.provenance).toEqual({
      modelVersion: DEFENSIVE_FIELD_ZONE_SPLIT_VERSION,
      method: "deterministic-rule",
      featureKeys: [...DEFENSIVE_FIELD_ZONE_SPLIT_FEATURE_KEYS],
      featureSchemaHash: computeFeatureSchemaHash(DEFENSIVE_FIELD_ZONE_SPLIT_FEATURE_KEYS),
      sampleSize: 130,
    });

    const cert = requireMetricBirthCertificate("defensive-field-zone-split");
    expect(cert.status).toBe("SHADOW");
    expect(cert.internalName).toBe("defensive_field_zone_split_shadow");
  });
});
