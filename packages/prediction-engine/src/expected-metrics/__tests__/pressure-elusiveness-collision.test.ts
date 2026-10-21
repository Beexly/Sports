import { describe, expect, it } from "vitest";
import {
  buildQbElusivenessProxyRow,
  buildDefensePressureProxyRow,
  buildPressureElusivenessCollision,
  type PressureProxyDropbackPlay,
} from "../pressure-elusiveness-collision.js";

describe("pressure-elusiveness-collision", () => {
  it("counts proxy accurately (sack dominates, qbHit counts once)", () => {
    const qbPlays: PressureProxyDropbackPlay[] = Array.from({ length: 100 }).map((_, i) => {
      let sack: 0 | 1 = 0;
      let qbHit: 0 | 1 = 0;
      if (i < 20) { sack = 1; }
      else if (i < 50) { qbHit = 1; }
      else if (i < 75) { sack = 1; qbHit = 1; }
      return {
        gameId: "2026_01_AAA_BBB", week: 1, posteam: "BBB", defteam: "AAA", passerPlayerId: "QB1",
        sack, qbHit
      };
    });

    const defPlays: PressureProxyDropbackPlay[] = Array.from({ length: 200 }).map((_, i) => {
      let sack: 0 | 1 = 0;
      let qbHit: 0 | 1 = 0;
      if (i < 10) { sack = 1; }
      else if (i < 25) { qbHit = 1; }
      else if (i < 40) { sack = 1; qbHit = 1; }
      return {
        gameId: "2026_01_CCC_DDD", week: 1, posteam: "DDD", defteam: "CCC", passerPlayerId: "QB2",
        sack, qbHit
      };
    });

    const qbRow = buildQbElusivenessProxyRow(qbPlays, 2026, 2, "season-to-date", "BBB", "QB1");
    const defRow = buildDefensePressureProxyRow(defPlays, 2026, 2, "season-to-date", "CCC");

    expect(qbRow).not.toBeNull();
    expect(defRow).not.toBeNull();

    const result = buildPressureElusivenessCollision(qbRow, defRow);
    expect(result).not.toBeNull();

    // qb: 75 pressured proxies, 45 sacks -> sackConversion = 0.6
    expect(result?.sackConversionOnProxy).toBe(0.6);
    expect(result?.avoidanceOnProxy).toBe(0.4);

    // def: 200 dropbacks, 40 pressured proxies -> pressureProxyRate = 0.2
    expect(result?.pressureProxyRate).toBe(0.2);

    // expectedSackRate = 0.2 * 0.6 = 0.12
    expect(result?.expectedSackRatePerDropback).toBe(0.12);

    // Strict naming validation
    const keys = Object.keys(result!);
    expect(keys).toContain("sackConversionOnProxy");
    expect(keys).toContain("avoidanceOnProxy");
    expect(keys).toContain("pressureProxyRate");
    expect(keys).not.toContain("pressureRate");
    expect(keys).not.toContain("sackConversion");
  });

  it("handles population floors correctly", () => {
    const qbPlays: PressureProxyDropbackPlay[] = Array.from({ length: 74 }).map(() => ({
      gameId: "2026_01_AAA_BBB", week: 1, posteam: "BBB", defteam: "AAA", passerPlayerId: "QB1",
      sack: 1, qbHit: 0
    }));

    const defPlays: PressureProxyDropbackPlay[] = Array.from({ length: 149 }).map(() => ({
      gameId: "2026_01_CCC_DDD", week: 1, posteam: "DDD", defteam: "CCC", passerPlayerId: "QB2",
      sack: 1, qbHit: 0
    }));

    const qbRow = buildQbElusivenessProxyRow(qbPlays, 2026, 2, "season-to-date", "BBB", "QB1");
    expect(qbRow).toBeNull(); // < 75

    const defRow = buildDefensePressureProxyRow(defPlays, 2026, 2, "season-to-date", "CCC");
    expect(defRow).toBeNull(); // < 150

    expect(buildPressureElusivenessCollision(qbRow, defRow)).toBeNull();
  });

  it("enforces window discipline correctly (rolling-4)", () => {
    // We create 6 distinct games.
    const qbPlays: PressureProxyDropbackPlay[] = [];
    for (let w = 1; w <= 6; w++) {
      for (let i = 0; i < 20; i++) {
        qbPlays.push({
          gameId: `2026_0${w}_AAA_BBB`, week: w, posteam: "BBB", defteam: "AAA", passerPlayerId: "QB1",
          sack: 1, qbHit: 0 // 20 pressured proxies per game
        });
      }
    }

    // Target week 7. Rolling-4 should include weeks 3, 4, 5, 6. Total pressured proxies = 4 * 20 = 80 -> passes 75 floor.
    const qbRow4 = buildQbElusivenessProxyRow(qbPlays, 2026, 7, "rolling-4", "BBB", "QB1");
    expect(qbRow4).not.toBeNull();
    expect(qbRow4?.pressuredProxyDropbacks).toBe(80);

    // Target week 4. Rolling-4 includes weeks 1, 2, 3. Total pressured proxies = 3 * 20 = 60 -> fails floor.
    const qbRowFail = buildQbElusivenessProxyRow(qbPlays, 2026, 4, "rolling-4", "BBB", "QB1");
    expect(qbRowFail).toBeNull();

    // Target week 6. Season-to-date includes weeks 1, 2, 3, 4, 5. Total = 100.
    const qbRowSTD = buildQbElusivenessProxyRow(qbPlays, 2026, 6, "season-to-date", "BBB", "QB1");
    expect(qbRowSTD?.pressuredProxyDropbacks).toBe(100);
  });
});
