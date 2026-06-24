import { describe, expect, it } from "vitest";
import { buildVegasWinProbabilityPath, projectGameScript } from "../game-script.js";

describe("buildVegasWinProbabilityPath", () => {
  it("turns a home favorite spread into an increasing home win-probability path", () => {
    const path = buildVegasWinProbabilityPath(47.5, -7);

    expect(path[0]!.checkpoint).toBe("pregame");
    expect(path[0]!.homeWinProbability).toBeGreaterThan(0.5);
    expect(path[path.length - 1]!.homeWinProbability).toBeGreaterThan(path[0]!.homeWinProbability);
    expect(path.every((point) => point.homeWinProbability + point.awayWinProbability > 0.99)).toBe(true);
    expect(path.every((point) => point.homeWinProbability + point.awayWinProbability < 1.01)).toBe(true);
  });

  it("keeps a pickem close to balanced through the path", () => {
    const path = buildVegasWinProbabilityPath(44, 0);

    expect(path.every((point) => Math.abs(point.homeWinProbability - 0.5) < 0.001)).toBe(true);
  });
});

describe("projectGameScript", () => {
  it("maps favorite/trailer game script into pass and run rates", () => {
    const projection = projectGameScript({
      gameId: "kc-den",
      totalPoints: 48,
      homeSpread: -6.5,
      home: { teamId: "KC", neutralPassRate: 0.57 },
      away: { teamId: "DEN", neutralPassRate: 0.55 },
    });

    expect(projection.home.scriptLabel).toBe("leading");
    expect(projection.away.scriptLabel).toBe("trailing");
    expect(projection.home.expectedPassRate).toBeLessThan(projection.away.expectedPassRate);
    expect(projection.home.expectedRunRate).toBeGreaterThan(projection.away.expectedRunRate);
    expect(projection.home.expectedPassRate + projection.home.expectedRunRate).toBeCloseTo(1, 3);
    expect(projection.away.expectedPassRate + projection.away.expectedRunRate).toBeCloseTo(1, 3);
  });

  it("raises plays and pace in a higher-total environment", () => {
    const low = projectGameScript({ gameId: "low", totalPoints: 37, homeSpread: -1 });
    const high = projectGameScript({ gameId: "high", totalPoints: 54, homeSpread: -1 });

    expect(high.totalProjectedPlays).toBeGreaterThan(low.totalProjectedPlays);
    expect(high.home.secondsPerPlay).toBeLessThan(low.home.secondsPerPlay);
  });

  it("ships as shadow and priced false", () => {
    const projection = projectGameScript({ gameId: "shadow", totalPoints: 45, homeSpread: 3 });

    expect(projection.status).toBe("shadow");
    expect(projection.priced).toBe(false);
    expect(projection.winProbabilityPath).toHaveLength(5);
  });
});
