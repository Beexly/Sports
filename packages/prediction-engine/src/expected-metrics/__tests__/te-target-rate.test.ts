import { describe, expect, it } from "vitest";
import {
  computeTeTargetRate,
  MIN_CAREER_DROPBACKS,
  MIN_ROLLING_DROPBACKS,
  CAREER_SHRINKAGE_WEIGHT,
  ROLLING_SHRINKAGE_WEIGHT,
  type TeTargetRatePlay,
} from "../te-target-rate.js";

function makePlays(
  qb: string,
  gameBase: number, // controls season/week ordering
  count: number,
  targetRatio: number
): TeTargetRatePlay[] {
  const plays: TeTargetRatePlay[] = [];
  const targets = Math.round(count * targetRatio);

  for (let i = 0; i < count; i++) {
    // Generate distinct games if we need many games, or chunk them
    // We'll put 10 dropbacks per game to easily manage rolling windows
    const gameIndex = gameBase + Math.floor(i / 10);
    const season = 2020 + Math.floor(gameIndex / 17);
    const week = (gameIndex % 17) + 1;
    const gameId = `${season}_${week.toString().padStart(2, "0")}_AWAY_HOME`;

    plays.push({
      passerId: qb,
      gameId,
      isTeTarget: i < targets,
    });
  }
  return plays;
}

describe("TE Target Rate Metric (SHADOW)", () => {
  it("computes raw career rates correctly (Fixture base)", () => {
    // 400 dropbacks, 160 TE targets -> 0.40 raw rate
    const plays = makePlays("QB_RAW", 0, 400, 0.4);

    const results = computeTeTargetRate(plays, "2025_01_AWAY_HOME"); // well after the plays
    const res = results.get("QB_RAW")!;

    expect(res).toBeDefined();
    expect(res.career).toBe(0.40);
    expect(res.careerN).toBe(400);
  });

  it("excludes games outside the rolling-16 window", () => {
    // 20 games * 10 dropbacks = 200 dropbacks.
    const plays = makePlays("QB_ROLLING", 0, 200, 0.5);
    // Oldest 4 games (40 dropbacks) will be excluded from rolling16

    const results = computeTeTargetRate(plays, "2025_01_AWAY_HOME");
    const res = results.get("QB_ROLLING")!;

    expect(res.careerN).toBe(200);
    // rolling16 window should be exactly 16 games * 10 dropbacks = 160 dropbacks
    expect(res.rolling16N).toBe(160);
  });

  it("applies floors strictly (returns null for insufficient sample)", () => {
    // Test 1: Both under floor
    // 79 total career dropbacks -> Rolling is also 79.
    const playsBothUnder = makePlays("QB_BOTH_THIN", 0, 79, 0.5);
    const resBothUnder = computeTeTargetRate(playsBothUnder, "2025_01_AWAY_HOME").get("QB_BOTH_THIN")!;
    expect(resBothUnder.sufficientSample).toBe(false);
    expect(resBothUnder.career).toBeNull();
    expect(resBothUnder.rolling16).toBeNull();

    // Test 2: Meets rolling but not career
    // e.g. 150 total career dropbacks. 15 games. Rolling is 150.
    const playsRollingOnly = makePlays("QB_ROLLING_ONLY", 0, 150, 0.5);
    const resRollingOnly = computeTeTargetRate(playsRollingOnly, "2025_01_AWAY_HOME").get("QB_ROLLING_ONLY")!;
    expect(resRollingOnly.sufficientSample).toBe(true);
    expect(resRollingOnly.career).toBeNull();
    expect(resRollingOnly.rolling16).not.toBeNull();

    // Test 3: Meets career but not rolling
    // 17 distinct games. Oldest has 200 dropbacks. The 16 newer games have 4 dropbacks each.
    // So career total = 200 + 16*4 = 264. Rolling16 = 16*4 = 64 < 80.
    const playsCareerOnly: TeTargetRatePlay[] = [];
    for(let i=0; i<200; i++) {
        playsCareerOnly.push({passerId: "QB_CAREER_ONLY", isTeTarget: true, gameId: "2019_01_AWAY_HOME"}); // outside rolling window
    }

    for (let gameIdx=1; gameIdx<=16; gameIdx++) {
        for(let i=0; i<4; i++) {
            playsCareerOnly.push({passerId: "QB_CAREER_ONLY", isTeTarget: true, gameId: `2024_${gameIdx.toString().padStart(2, "0")}_AWAY_HOME`});
        }
    }
    const resCareerOnly = computeTeTargetRate(playsCareerOnly, "2025_01_AWAY_HOME").get("QB_CAREER_ONLY")!;
    expect(resCareerOnly.sufficientSample).toBe(true);
    expect(resCareerOnly.career).not.toBeNull();
    expect(resCareerOnly.rolling16).toBeNull();

    // Test 4: Both pass
    const playsBothAt = makePlays("QB_BOTH_AT", 0, 200, 0.5);
    const resBothAt = computeTeTargetRate(playsBothAt, "2025_01_AWAY_HOME").get("QB_BOTH_AT")!;
    expect(resBothAt.sufficientSample).toBe(true);
    expect(resBothAt.career).not.toBeNull();
    expect(resBothAt.rolling16).not.toBeNull();
  });

  it("applies empirical Bayes shrinkage correctly", () => {
    // Create QB_LEAGUE using plays in an old year to set the league mean
    const playsLeague: TeTargetRatePlay[] = [];
    for(let i=0; i<10000; i++) {
        playsLeague.push({
            passerId: "QB_LEAGUE",
            gameId: `2010_01_AWAY_HOME`,
            isTeTarget: i < 2000
        });
    }

    // QB2: Small sample (e.g., 200 dropbacks so it qualifies, but target rate is extreme 0.50)
    const playsSmall: TeTargetRatePlay[] = [];
    for(let i=0; i<200; i++) {
      playsSmall.push({
        passerId: "QB_SMALL",
        gameId: `2024_01_AWAY_HOME`, // All in one game, so it's in the rolling window
        isTeTarget: i < 100
      });
    }

    const allPlays = [...playsLeague, ...playsSmall];
    const results = computeTeTargetRate(allPlays, "2050_01_AWAY_HOME");

    const res = results.get("QB_SMALL")!;
    const rawRate = 0.50; // 100 / 200
    const mean = res.leagueMean; // ~0.20588

    // mean < shrunkCareer < rawRate
    expect(res.shrunkCareer).toBeGreaterThan(mean);
    expect(res.shrunkCareer).toBeLessThan(rawRate);

    // Exact check
    const expectedShrunk = (100 + CAREER_SHRINKAGE_WEIGHT * mean) / (200 + CAREER_SHRINKAGE_WEIGHT);
    expect(res.shrunkCareer).toBeCloseTo(expectedShrunk, 5);
  });

  it("enforces strict point-in-time discipline", () => {
    // Mix plays before and AFTER the target date
    const playsBefore = [
      { passerId: "QB_PIT", isTeTarget: true, gameId: "2023_10_AWAY_HOME" },
      { passerId: "QB_PIT", isTeTarget: false, gameId: "2023_11_AWAY_HOME" },
    ];
    const playsAfter = [
      { passerId: "QB_PIT", isTeTarget: true, gameId: "2023_12_AWAY_HOME" },
      { passerId: "QB_PIT", isTeTarget: true, gameId: "2023_13_AWAY_HOME" }, // Target game is week 12!
    ];

    // Adding 200 dummy plays before so we pass the floor
    const dummyBefore = makePlays("QB_PIT", 0, 200, 0.5);
    // Make sure they are before 2023_12
    for(const d of dummyBefore) {
        (d as any).gameId = "2021_01_AWAY_HOME";
    }

    const withoutFuture = computeTeTargetRate([...dummyBefore, ...playsBefore], "2023_12_AWAY_HOME");
    const withFuture = computeTeTargetRate([...dummyBefore, ...playsBefore, ...playsAfter], "2023_12_AWAY_HOME");

    expect(withoutFuture.get("QB_PIT")).toEqual(withFuture.get("QB_PIT"));
  });

  it("computes the league mean dynamically from the dataset", () => {
    const plays1 = makePlays("QB1", 0, 500, 0.3); // 150 targets
    const plays2 = makePlays("QB2", 0, 500, 0.1); // 50 targets
    // Total: 1000 dropbacks, 200 targets => 0.20 mean

    const results = computeTeTargetRate([...plays1, ...plays2], "2025_01_AWAY_HOME");
    const anyRes = results.get("QB1")!;

    expect(anyRes.leagueMean).toBeCloseTo(0.20, 5);
    expect(anyRes.leagueMean).not.toBe(0.219); // Ensure it's not hardcoded to the FantasyPts number
  });
});
