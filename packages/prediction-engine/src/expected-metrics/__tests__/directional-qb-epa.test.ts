import { describe, it, expect } from "vitest";
import { computeDirectionalQbEpa } from "../directional-qb-epa.js";
import type { DirectionalAttemptPlay } from "../nflverse-pbp-mapper.js";

const basePlay: DirectionalAttemptPlay = {
  playId: "1",
  week: 1,
  playType: "pass",
  passerPlayerId: "QB1",
  passLocation: "left",
  passLength: "short",
  airYards: 5,
  qbSpike: 0,
  epa: 0.5,
};

describe("directional-qb-epa", () => {
  it("calculates exact bucket arithmetic (mean, diff, shrinkage, tilt)", () => {
    // Generate a fixture that guarantees floor is met for QB1 and QB2
    const plays: DirectionalAttemptPlay[] = [];

    // QB1: 80 attempts (season floor). Let's put 10 in left-short, 10 in middle-short, 60 elsewhere.
    for (let i = 0; i < 10; i++) {
      plays.push({ ...basePlay, playId: `q1_ls_${i}`, passerPlayerId: "QB1", passLocation: "left", passLength: "short", epa: 1.0 });
    }
    for (let i = 0; i < 10; i++) {
      plays.push({ ...basePlay, playId: `q1_ms_${i}`, passerPlayerId: "QB1", passLocation: "middle", passLength: "short", epa: 2.0 });
    }
    for (let i = 0; i < 60; i++) {
      plays.push({ ...basePlay, playId: `q1_o_${i}`, passerPlayerId: "QB1", passLocation: "right", passLength: "deep", epa: 0.0 });
    }

    // QB2: 80 attempts to set league baseline for left-short and middle-short
    for (let i = 0; i < 10; i++) {
      plays.push({ ...basePlay, playId: `q2_ls_${i}`, passerPlayerId: "QB2", passLocation: "left", passLength: "short", epa: 0.0 });
    }
    for (let i = 0; i < 10; i++) {
      plays.push({ ...basePlay, playId: `q2_ms_${i}`, passerPlayerId: "QB2", passLocation: "middle", passLength: "short", epa: 1.0 });
    }
    for (let i = 0; i < 60; i++) {
      plays.push({ ...basePlay, playId: `q2_o_${i}`, passerPlayerId: "QB2", passLocation: "left", passLength: "deep", epa: -1.0 });
    }

    const results = computeDirectionalQbEpa(plays, 2026, 2, "season-to-date");
    expect(results).toHaveLength(2);

    const qb1 = results.find(r => r.playerId === "QB1")!;

    // League left-short: 10 * 1.0 + 10 * 0.0 = 10 / 20 = 0.5
    // QB1 left-short: mean = 1.0, diff = 1.0 - 0.5 = 0.5, shrunk = 0.5 + (10/30) * 0.5 = 0.5 + 0.1666... = 0.6666...
    expect(qb1.bucketLeftShort.ownEpaMean).toBeCloseTo(1.0);
    expect(qb1.bucketLeftShort.leagueMean).toBeCloseTo(0.5);
    expect(qb1.bucketLeftShort.diffVsLeague).toBeCloseTo(0.5);
    expect(qb1.bucketLeftShort.shrunkEpaPerAttempt).toBeCloseTo(0.5 + (10/30) * 0.5);

    expect(qb1.compositeMiddleEpaPerAttempt).not.toBeNull();
    expect(qb1.compositeOutsideEpaPerAttempt).not.toBeNull();
    expect(qb1.tiltMiddleVsOutside).toBeCloseTo(qb1.compositeMiddleEpaPerAttempt! - qb1.compositeOutsideEpaPerAttempt!);
  });

  it("handles diagnostic counts per-QB, null EPA dropping, spikes, charting boundaries, and point-in-time", () => {
    const plays: DirectionalAttemptPlay[] = [];

    // 80 base plays
    for (let i = 0; i < 80; i++) {
      plays.push({ ...basePlay, playId: `q1_b_${i}`, passerPlayerId: "QB1" });
    }
    // 1 spike
    plays.push({ ...basePlay, playId: "q1_s1", passerPlayerId: "QB1", qbSpike: 1 });
    // 2 null EPAs
    plays.push({ ...basePlay, playId: "q1_n1", passerPlayerId: "QB1", epa: null });
    plays.push({ ...basePlay, playId: "q1_n2", passerPlayerId: "QB1", epa: null });
    // 3 uncharted locations
    plays.push({ ...basePlay, playId: "q1_u1", passerPlayerId: "QB1", passLocation: "unknown" });
    plays.push({ ...basePlay, playId: "q1_u2", passerPlayerId: "QB1", passLocation: "" });
    plays.push({ ...basePlay, playId: "q1_u3", passerPlayerId: "QB1", passLength: "unknown" });
    // 1 non-finite air yard
    plays.push({ ...basePlay, playId: "q1_a1", passerPlayerId: "QB1", airYards: NaN });
    // 1 future week (should be ignored by point-in-time)
    plays.push({ ...basePlay, playId: "q1_f1", passerPlayerId: "QB1", week: 5, qbSpike: 1 });

    // QB2: Different counts to prove per-row diagnostics
    for (let i = 0; i < 80; i++) {
      plays.push({ ...basePlay, playId: `q2_b_${i}`, passerPlayerId: "QB2" });
    }
    // 5 spikes
    for (let i=0; i<5; i++) plays.push({ ...basePlay, playId: `q2_s${i}`, passerPlayerId: "QB2", qbSpike: 1 });

    // Depth boundary assertions (will attach to QB1 for counting)
    plays.push({ ...basePlay, playId: "q1_db1", passerPlayerId: "QB1", airYards: -3 }); // behind
    plays.push({ ...basePlay, playId: "q1_db2", passerPlayerId: "QB1", airYards: 0 }); // 0to9
    plays.push({ ...basePlay, playId: "q1_db3", passerPlayerId: "QB1", airYards: 9 }); // 0to9
    plays.push({ ...basePlay, playId: "q1_db4", passerPlayerId: "QB1", airYards: 10 }); // 10to19
    plays.push({ ...basePlay, playId: "q1_db5", passerPlayerId: "QB1", airYards: 19 }); // 10to19
    plays.push({ ...basePlay, playId: "q1_db6", passerPlayerId: "QB1", airYards: 20 }); // 20plus

    const results = computeDirectionalQbEpa(plays, 2026, 3, "season-to-date"); // target week 3
    expect(results).toHaveLength(2);

    const qb1 = results.find(r => r.playerId === "QB1")!;
    const qb2 = results.find(r => r.playerId === "QB2")!;

    // Diagnostics assertions for QB1
    expect(qb1.diagnostics.excludedSpikes).toBe(1); // Future spike ignored
    expect(qb1.diagnostics.excludedNullEpa).toBe(2);
    expect(qb1.diagnostics.unchartedLocations).toBe(3);
    expect(qb1.diagnostics.excludedNonFiniteAirYards).toBe(1);

    // Diagnostics assertions for QB2
    expect(qb2.diagnostics.excludedSpikes).toBe(5);
    expect(qb2.diagnostics.excludedNullEpa).toBe(0);

    // QB1 overall attempts should NOT include spikes, but SHOULD include null EPA, uncharted, non-finite
    expect(qb1.overallAttempts).toBe(92);

    // Depth bucket routing
    expect(qb1.depthBehind.attempts).toBe(1);
    expect(qb1.depth0to9.attempts).toBe(85);
    expect(qb1.depth10to19.attempts).toBe(2);
    expect(qb1.depth20Plus.attempts).toBe(1);

    // Ensure a sub-10 bucket is null for stats but retains attempts
    expect(qb1.depthBehind.ownEpaMean).toBeNull();
    expect(qb1.depthBehind.shrunkEpaPerAttempt).toBeNull();
  });

  it("handles absence of QB if below floor", () => {
    const plays: DirectionalAttemptPlay[] = [];
    for (let i = 0; i < 79; i++) {
      plays.push({ ...basePlay, playId: `q1_b_${i}`, passerPlayerId: "QB1" });
    }
    const results = computeDirectionalQbEpa(plays, 2026, 3, "season-to-date");
    expect(results).toHaveLength(0);
  });

  it("handles tilt nullification if either side is below bucket floor", () => {
    const plays: DirectionalAttemptPlay[] = [];

    // QB1 gets 80 attempts (floor). 75 middle, 5 outside.
    for (let i = 0; i < 75; i++) {
      plays.push({ ...basePlay, playId: `q1_m_${i}`, passerPlayerId: "QB1", passLocation: "middle" });
    }
    for (let i = 0; i < 5; i++) {
      plays.push({ ...basePlay, playId: `q1_o_${i}`, passerPlayerId: "QB1", passLocation: "left" });
    }

    const results = computeDirectionalQbEpa(plays, 2026, 3, "season-to-date");
    expect(results).toHaveLength(1);

    const qb1 = results[0]!;
    expect(qb1.compositeMiddleEpaPerAttempt).not.toBeNull();
    expect(qb1.compositeOutsideEpaPerAttempt).toBeNull();
    expect(qb1.tiltMiddleVsOutside).toBeNull();
  });
  it("produces output from own EPA only (ignoring referee EPA)", () => {
    // The module takes mapped plays directly, so we just prove it uses the play.epa property
    // (which represents attachOwnEpa's result in the pipeline)
    const plays: DirectionalAttemptPlay[] = [];

    // QB1 gets 80 attempts (floor) with a known own EPA, we assert it computes based on that.
    for (let i = 0; i < 80; i++) {
      // The referee epa column is absent from DirectionalAttemptPlay (it's not even mapped)
      plays.push({ ...basePlay, playId: `q1_m_${i}`, passerPlayerId: "QB1", passLocation: "middle", passLength: "short", epa: 3.0 });
    }

    const results = computeDirectionalQbEpa(plays, 2026, 3, "season-to-date");
    expect(results).toHaveLength(1);
    const qb1 = results[0]!;

    // The mean should strictly be 3.0 (from own EPA)
    expect(qb1.bucketMiddleShort.ownEpaMean).toBeCloseTo(3.0);
  });
});
