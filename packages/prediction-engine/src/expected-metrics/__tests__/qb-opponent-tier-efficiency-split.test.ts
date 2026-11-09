import { describe, expect, test } from "vitest";
import { computeQbOpponentTierEfficiencySplit, type QbOpponentTierPlay } from "../qb-opponent-tier-efficiency-split.js";

describe("QB Opponent Tier Efficiency Split", () => {
  test("Hand-computed fixture, tier boundaries, unranked floors, and own-EPA logic", () => {
    const plays: QbOpponentTierPlay[] = [];

    // We need 11 defenses.
    // D1 - D10 will face 100 dropbacks each in Week 1, and get ranked entering Week 2.
    // D11 will also face 100 dropbacks in Week 1.

    const defs = ["D01", "D02", "D03", "D04", "D05", "D06", "D07", "D08", "D09", "D10", "D11", "D12"];

    // Week 1 plays to set up tiers
    let playIdCounter = 1;
    for (let i = 0; i < 11; i++) {
        // D1 to D11.
        const def = defs[i]!;
        // Make sure D1 has lowest allowed EPA, ..., D11 has highest.
        const epaPerPlay = -0.5 + (i * 0.1);
        for (let j = 0; j < 110; j++) {
            plays.push({
                playId: `p${playIdCounter++}`,
                gameId: "g1",
                week: 1,
                passerPlayerId: "QB_OTHER",
                defteam: def,
                playType: "pass",
                qbSpike: 0,
                epa: epaPerPlay
            });
        }
    }

    // D12 will face 99 dropbacks (Unranked floor test)
    for (let j = 0; j < 99; j++) {
        plays.push({
            playId: `p${playIdCounter++}`,
            gameId: "g1",
            week: 1,
            passerPlayerId: "QB_OTHER",
            defteam: "D12",
            playType: "pass",
            qbSpike: 0,
            epa: 0.1
        });
    }

    // Week 2 plays for QB_A and QB_B
    // Top 10 will be D01..D10. Rest will be D11. Unranked will be D12.
    // QB_A vs Top 10 (D01), vs Rest (D11), vs Unranked (D12)
    // To meet floor, QB_A needs 30 vs Top 10, 30 vs Rest.

    // QB_A vs Top-10 (D01) - 30 dropbacks, raw EPA = -0.1
    for (let i = 0; i < 30; i++) {
        plays.push({
            playId: `p${playIdCounter++}`,
            gameId: "g2",
            week: 2,
            passerPlayerId: "QB_A",
            defteam: "D01", // Top 10
            playType: "pass",
            qbSpike: 0,
            epa: -0.1
        });
    }

    // QB_A vs Rest (D11) - 30 dropbacks, raw EPA = 0.5
    for (let i = 0; i < 30; i++) {
        plays.push({
            playId: `p${playIdCounter++}`,
            gameId: "g2",
            week: 2,
            passerPlayerId: "QB_A",
            defteam: "D11", // Rest
            playType: "pass",
            qbSpike: 0,
            epa: 0.5
        });
    }

    // QB_B vs Top-10 (D02) - 40 dropbacks, raw EPA = 0.0
    for (let i = 0; i < 40; i++) {
        plays.push({
            playId: `p${playIdCounter++}`,
            gameId: "g2",
            week: 2,
            passerPlayerId: "QB_B",
            defteam: "D02", // Top 10
            playType: "pass",
            qbSpike: 0,
            epa: 0.0
        });
    }

    // QB_B vs Rest (D11) - 50 dropbacks, raw EPA = 0.2
    for (let i = 0; i < 50; i++) {
        plays.push({
            playId: `p${playIdCounter++}`,
            gameId: "g2",
            week: 2,
            passerPlayerId: "QB_B",
            defteam: "D11", // Rest
            playType: "pass",
            qbSpike: 0,
            epa: 0.2
        });
    }

    // QB_A vs Unranked (D12) - should not count in arms
    plays.push({
        playId: `p${playIdCounter++}`, gameId: "g2", week: 2, passerPlayerId: "QB_A", defteam: "D12", playType: "pass", qbSpike: 0, epa: 1.0
    });

    // Spike exclusions
    plays.push({
        playId: `p${playIdCounter++}`, gameId: "g2", week: 2, passerPlayerId: "QB_A", defteam: "D01", playType: "pass", qbSpike: 1, epa: -1.0
    });

    // Run exclusions (playType "run")
    plays.push({
        playId: `p${playIdCounter++}`, gameId: "g2", week: 2, passerPlayerId: "QB_A", defteam: "D01", playType: "run", qbSpike: 0, epa: 0.5
    });

    // Null EPA usage
    plays.push({
        playId: `p${playIdCounter++}`, gameId: "g2", week: 2, passerPlayerId: "QB_A", defteam: "D01", playType: "pass", qbSpike: 0, epa: null
    });

    // Empty passer id
    plays.push({
        playId: `p${playIdCounter++}`, gameId: "g2", week: 2, passerPlayerId: "", defteam: "D01", playType: "pass", qbSpike: 0, epa: 0.1
    });

    // Run the computation for Week 3
    const output = computeQbOpponentTierEfficiencySplit(plays, 3, [{ name: "season", distinctWeeks: 0 }]);

    const top10LeagueMean = -3 / 70;
    const restLeagueMean = 25 / 80;

    const qbATop10Shrunk = top10LeagueMean + (30 / 50) * (-0.1 - top10LeagueMean);
    const qbARestShrunk = restLeagueMean + (30 / 50) * (0.5 - restLeagueMean);

    const qbA = output.results.find(r => r.playerId === "QB_A")!;
    expect(qbA).toBeDefined();
    expect(qbA.top10.dropbacks).toBe(31);
    expect(qbA.top10.ratableDropbacks).toBe(30);
    expect(qbA.top10.rawEpaPerDropback).toBeCloseTo(-0.1, 4);
    expect(qbA.top10.shrunkEpaPerDropback).toBeCloseTo(qbATop10Shrunk, 4);

    expect(qbA.rest.dropbacks).toBe(30);
    expect(qbA.rest.ratableDropbacks).toBe(30);
    expect(qbA.rest.rawEpaPerDropback).toBeCloseTo(0.5, 4);
    expect(qbA.rest.shrunkEpaPerDropback).toBeCloseTo(qbARestShrunk, 4);

    expect(qbA.sensitivityDelta).toBeCloseTo(qbATop10Shrunk - qbARestShrunk, 4);
    expect(qbA.sensitivityDelta).toBeLessThan(0);

    // Floors: Below floor test
    // QB_C with 29 ratable dropbacks vs Top-10
    const qbCPlays = [];
    for (let i = 0; i < 29; i++) {
        qbCPlays.push({
            playId: `p${playIdCounter++}`, gameId: "g2", week: 2, passerPlayerId: "QB_C", defteam: "D01", playType: "pass", qbSpike: 0, epa: 0.1
        });
    }
    const playsWithQbc = [...plays, ...qbCPlays];
    const outputWithQbc = computeQbOpponentTierEfficiencySplit(playsWithQbc, 3, [{ name: "season", distinctWeeks: 0 }]);

    expect(outputWithQbc.results.find(r => r.playerId === "QB_C")).toBeUndefined();
    expect(outputWithQbc.diagnostics.belowFloorArmsAbsent).toBeGreaterThan(0);

    // Diagnostics checks
    expect(output.diagnostics.unrankedPlaysExcluded).toBeGreaterThanOrEqual(1200);
    expect(output.diagnostics.spikesExcluded).toBe(1);
    expect(output.diagnostics.emptyPasserIdExcluded).toBe(1);
    expect(output.diagnostics.nullEpaExcludedFromMean).toBe(1);
  });

  test("Point-in-time discipline & Windows", () => {
    const plays: QbOpponentTierPlay[] = [];
    let pid = 1;
    // D01 faces 100 dropbacks in W1 (epa 1.0 - BAD)
    // D01 faces 100 dropbacks in W2 (epa -1.0 - GOOD)
    // D02 faces 100 dropbacks in W1 (epa 0.0)
    // D02 faces 100 dropbacks in W2 (epa 0.0)
    // etc to get 11 defenses.
    for (let i = 1; i <= 11; i++) {
        for (let j = 0; j < 110; j++) {
            plays.push({ playId: `p${pid++}`, gameId: "g", week: 1, passerPlayerId: "Q", defteam: `D${i.toString().padStart(2, "0")}`, playType: "pass", qbSpike: 0, epa: i === 1 ? 1.0 : 0.0 });
            plays.push({ playId: `p${pid++}`, gameId: "g", week: 2, passerPlayerId: "Q", defteam: `D${i.toString().padStart(2, "0")}`, playType: "pass", qbSpike: 0, epa: i === 1 ? -1.0 : 0.0 });
        }
    }

    // Fix: the missing arm was because TEST faced D01 (REST entering W2) and D02 (TOP-10 entering W2)
    // BUT we need 30 ratable vs EACH tier in Week 2 alone to emit season!
    // Wait, D1 was 1.0 (REST) entering W2.
    // D2 was 0.0 (TOP-10) entering W2.
    // So 30 ratable vs D01 and 30 ratable vs D02 gives TEST 30 vs REST and 30 vs TOP-10.
    for(let j=0; j<30; j++) {
        plays.push({ playId: `p${pid++}`, gameId: "g", week: 2, passerPlayerId: "TEST", defteam: "D01", playType: "pass", qbSpike: 0, epa: 0.1 });
        plays.push({ playId: `p${pid++}`, gameId: "g", week: 2, passerPlayerId: "TEST", defteam: "D02", playType: "pass", qbSpike: 0, epa: 0.1 });
    }

    // Give some plays in W3 just so we can test W3's targetWeek logic
    for(let j=0; j<30; j++) {
        plays.push({ playId: `p${pid++}`, gameId: "g", week: 3, passerPlayerId: "TEST_W3", defteam: "D01", playType: "pass", qbSpike: 0, epa: 0.1 });
        plays.push({ playId: `p${pid++}`, gameId: "g", week: 3, passerPlayerId: "TEST_W3", defteam: "D02", playType: "pass", qbSpike: 0, epa: 0.1 });
    }

    const out = computeQbOpponentTierEfficiencySplit(plays, 4, [
      { name: "season", distinctWeeks: 0 },
      { name: "last-1", distinctWeeks: 1 } // Only looks at week 3
    ]);

    const res = out.results.find(r => r.playerId === "TEST" && r.window === "season");
    expect(res).toBeDefined();

    expect(res!.rest.dropbacks).toBeGreaterThanOrEqual(30);
    expect(res!.top10.dropbacks).toBeGreaterThanOrEqual(30);

    const resLast1 = out.results.find(r => r.playerId === "TEST_W3" && r.window === "last-1");
    expect(resLast1).toBeDefined();
    expect(resLast1!.rest.dropbacks).toBeGreaterThanOrEqual(30);
  });
});
