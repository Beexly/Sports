import { describe, it, expect } from "vitest";
import { buildCohortCurve, playerPathOverlay, RBSeason } from "../bio/rb-aging-curve";

describe("rb-aging-curve", () => {
  it("builds a synthetic fixture shaping a peak at 23 and ~0.62x multiplier at age 30", () => {
    // Generate enough data to bypass heavy shrinkage pulling things to a flat global mean
    const seasons: RBSeason[] = [];

    // We want the peak to be around 23 and 30 to be ~0.62 of the peak.
    // Let's create a large cohort. Say peak is 300 points, 30 is ~186 points.
    // Making it large reduces the effect of shrinkage pushing it toward the global mean.
    for (let p = 1; p <= 200; p++) {
      const playerId = `player_${p}`;
      seasons.push({ playerId, season: 2020, ageAtSeasonStart: 23, fpts: 300 }); // Top 36 for sure
      seasons.push({ playerId, season: 2021, ageAtSeasonStart: 24, fpts: 290 }); // Top 36

      // Fill out other ages
      seasons.push({ playerId, season: 2022, ageAtSeasonStart: 28, fpts: 240 });
      seasons.push({ playerId, season: 2023, ageAtSeasonStart: 29, fpts: 210 });
      seasons.push({ playerId, season: 2024, ageAtSeasonStart: 30, fpts: 186 }); // 186/300 = 0.62
    }

    // Pass shrinkagePseudoCount 0 to check the raw exact output
    const curve = buildCohortCurve(seasons, { shrinkagePseudoCount: 0 });
    expect(curve.peakAge).toBe(23);

    const peakRow = curve.table.find((r) => r.age === 23);
    const age30Row = curve.table.find((r) => r.age === 30);

    expect(peakRow).toBeDefined();
    expect(age30Row).toBeDefined();

    expect(peakRow!.multiplier).toBeCloseTo(1.0, 2);
    expect(age30Row!.multiplier).toBeCloseTo(0.62, 2); // 186/300 = 0.62
  });

  it("filters cohort correctly: excludes players with < 2 top-36 seasons", () => {
    const seasons: RBSeason[] = [
      // Player A: 3 top-36 seasons
      { playerId: "A", season: 2020, ageAtSeasonStart: 22, fpts: 300 },
      { playerId: "A", season: 2021, ageAtSeasonStart: 23, fpts: 290 },
      { playerId: "A", season: 2022, ageAtSeasonStart: 24, fpts: 280 },

      // Player B: 1 top-36 season
      { playerId: "B", season: 2020, ageAtSeasonStart: 22, fpts: 250 },
      { playerId: "B", season: 2021, ageAtSeasonStart: 23, fpts: 50 }, // Not top 36

      // Fill out remaining slots for 2020 and 2021 to ensure A and B (partially) are top 36
    ];

    for (let i = 1; i <= 40; i++) {
      seasons.push({ playerId: `Filler_${i}`, season: 2020, ageAtSeasonStart: 25, fpts: 100 });
      seasons.push({ playerId: `Filler_${i}`, season: 2021, ageAtSeasonStart: 26, fpts: 100 });
      seasons.push({ playerId: `Filler_${i}`, season: 2022, ageAtSeasonStart: 27, fpts: 100 });
    }

    // In 2020, top fpts: A (300), B (250), Fillers (100). Both A and B get a top-36 season.
    // In 2021, top fpts: A (290), Fillers (100), B (50). B misses top-36.
    // In 2022, top fpts: A (280), Fillers (100).

    const curve = buildCohortCurve(seasons);

    // Fillers have 3 top-36 seasons because they're the only ones left (and we only generated 40, so 36 of them get it)
    // The key is that B is NOT in the cohort, and A IS in the cohort.

    // We can check season count for B in ageMap (B would contribute at age 22 and 23)
    // Actually, let's just make the test focus on A being included and B being excluded.
    // We can do this by checking the total fpts sum for age 22.
    // Fillers are age 25+.
    // A at 22 = 300. B at 22 = 250.
    // If B is excluded, the raw sum for age 22 should be 300 (only A).
    // Let's reconstruct the raw sum by undoing shrinkage or just looking at n.
    const age22Row = curve.table.find((r) => r.age === 22);
    expect(age22Row).toBeDefined();
    expect(age22Row!.n).toBe(1); // Only Player A! B was excluded.
  });

  it("applies shrinkage correctly: n=2 moves toward global mean relative to its raw value", () => {
    const seasons: RBSeason[] = [];

    // Create a large, stable cohort around age 23 with fpts=200
    for (let p = 1; p <= 50; p++) {
      seasons.push({ playerId: `Stable_${p}`, season: 2020, ageAtSeasonStart: 23, fpts: 200 });
      seasons.push({ playerId: `Stable_${p}`, season: 2021, ageAtSeasonStart: 24, fpts: 200 });
    }

    // Create a very small, wildly swinging cell for age 35 with fpts=500
    seasons.push({ playerId: `Swinger_1`, season: 2020, ageAtSeasonStart: 35, fpts: 500 });
    seasons.push({ playerId: `Swinger_1`, season: 2021, ageAtSeasonStart: 36, fpts: 500 }); // Needed to be in cohort
    seasons.push({ playerId: `Swinger_2`, season: 2020, ageAtSeasonStart: 35, fpts: 500 });
    seasons.push({ playerId: `Swinger_2`, season: 2021, ageAtSeasonStart: 36, fpts: 500 });

    const curve = buildCohortCurve(seasons, { shrinkagePseudoCount: 5 });

    const age35Row = curve.table.find((r) => r.age === 35);
    expect(age35Row).toBeDefined();

    const rawMean = 500;
    // Shrinkage should pull this mean down towards the global mean (which is ~200)
    expect(age35Row!.shrunkMean).toBeLessThan(rawMean);
  });

  it("enforces point-in-time discipline", () => {
    const seasons: RBSeason[] = [];
    for (let p = 1; p <= 10; p++) {
      seasons.push({ playerId: `P${p}`, season: 2019, ageAtSeasonStart: 22, fpts: 150 });
      seasons.push({ playerId: `P${p}`, season: 2020, ageAtSeasonStart: 23, fpts: 200 }); // cutoff
      seasons.push({ playerId: `P${p}`, season: 2021, ageAtSeasonStart: 24, fpts: 250 });
      seasons.push({ playerId: `P${p}`, season: 2026, ageAtSeasonStart: 29, fpts: 100 });
    }

    const curvePit = buildCohortCurve(seasons, { asOfSeason: 2020 });
    const truncatedSeasons = seasons.filter(s => s.season <= 2020);
    const curveTruncated = buildCohortCurve(truncatedSeasons);

    expect(curvePit.table).toEqual(curveTruncated.table);
    expect(curvePit.cohortSize).toEqual(curveTruncated.cohortSize);
    expect(curvePit.peakAge).toEqual(curveTruncated.peakAge);
  });

  it("calculates player-path overlay correctly", () => {
    const seasons: RBSeason[] = [];
    for (let p = 1; p <= 50; p++) {
      seasons.push({ playerId: `Cohort_${p}`, season: 2020, ageAtSeasonStart: 23, fpts: 200 });
      seasons.push({ playerId: `Cohort_${p}`, season: 2021, ageAtSeasonStart: 24, fpts: 200 });
      seasons.push({ playerId: `Cohort_${p}`, season: 2025, ageAtSeasonStart: 28, fpts: 150 });
      seasons.push({ playerId: `Cohort_${p}`, season: 2026, ageAtSeasonStart: 29, fpts: 130 });
      seasons.push({ playerId: `Cohort_${p}`, season: 2027, ageAtSeasonStart: 30, fpts: 124 }); // ~0.62 * 200
    }
    const curve = buildCohortCurve(seasons);

    const playerSeasons: RBSeason[] = [
      { playerId: "Bust", season: 2020, ageAtSeasonStart: 23, fpts: 250 }, // Peak
      { playerId: "Bust", season: 2021, ageAtSeasonStart: 24, fpts: 200 }, // Decline
      { playerId: "Bust", season: 2025, ageAtSeasonStart: 28, fpts: 100 }, // Sharp decline
      { playerId: "Bust", season: 2026, ageAtSeasonStart: 29, fpts: 80 },
      { playerId: "Bust", season: 2027, ageAtSeasonStart: 30, fpts: 50 },  // Very sharp decline
    ];

    const overlay = playerPathOverlay(playerSeasons, curve);

    expect(overlay.length).toBe(5);

    const age30Row = overlay.find(r => Math.floor(r.age) === 30);
    expect(age30Row).toBeDefined();

    // Bust multiplier at 30 = 50 / 250 = 0.20
    // Cohort multiplier at 30 = 124 / 200 = 0.62 (approx depending on shrinkage)
    expect(age30Row!.playerMultiplier).toBe(0.20);
    expect(age30Row!.cohortMultiplier).toBeGreaterThan(0.5); // Cohort is around ~0.62

    // Bust declines faster than cohort
    expect(age30Row!.playerMultiplier).toBeLessThan(age30Row!.cohortMultiplier);
  });

  it("is vintage-safe: only reads ageAtSeasonStart", () => {
    const seasons: RBSeason[] = [];
    for (let p = 1; p <= 50; p++) {
      // Intentionally provide a different current age or season end age as a getter or extra prop
      // to ensure it's not being used, but typescript interface only allows ageAtSeasonStart anyway.
      // We will prove it by only providing ageAtSeasonStart and checking if it runs successfully and keys on it.
      seasons.push({ playerId: `Vintage_${p}`, season: 2020, ageAtSeasonStart: 23, fpts: 200 });
      seasons.push({ playerId: `Vintage_${p}`, season: 2021, ageAtSeasonStart: 24, fpts: 200 });
    }

    // Since TS interface enforces `ageAtSeasonStart` is the only age property available,
    // it's structurally guaranteed, but we can verify it processes it as expected.
    const curve = buildCohortCurve(seasons);
    expect(curve.table.find(r => r.age === 23)).toBeDefined();
    expect(curve.table.find(r => r.age === 24)).toBeDefined();
    // Verify there are no NaN or undefined ages
    expect(curve.table.every(r => !isNaN(r.age) && r.age > 0)).toBe(true);
  });
});
