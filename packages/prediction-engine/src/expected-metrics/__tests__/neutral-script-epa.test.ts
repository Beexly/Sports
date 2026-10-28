import { describe, it, expect } from "vitest";
import { computeNeutralScriptEpa } from "../neutral-script-epa.js";
import { type NeutralScriptPlay } from "../nflverse-pbp-mapper.js";
import { type WinProbabilityModel } from "../win-probability.js";

// predictWinProbability = sigmoid(intercept + weights * scaled_features)
// We want to force a specific WP for testing band discipline.
// If weights = 0, WP = sigmoid(intercept).
// sigmoid(x) = 1 / (1 + exp(-x))
// To get 0.2, x = ln(0.2/0.8) = -1.38629
// To get 0.8, x = ln(0.8/0.2) = 1.38629
// To get 0.19, x = ln(0.19/0.81) = -1.45001
// To get 0.81, x = ln(0.81/0.19) = 1.45001
// To get 0.5, x = 0

// Since we cannot mock predictWinProbability easily, we can use scoreDifferential as a weight
// WP features order: scoreDifferential is index 0.
// Let weights[0] = 1, all other weights = 0. intercept = 0. scaler mean = 0, std = 1.
// Then WP = sigmoid(scoreDifferential).
// scoreDifferential = -1.38629 -> WP = 0.2000005
// Wait, sigmoid(-1.38629436) = 0.2.
// Let's just create a helper to build plays with the right scoreDifferential to hit exact WP bands.

function lnOdds(p: number): number {
  return Math.log(p / (1 - p));
}

const mockWpModel: WinProbabilityModel = {
  logistic: {
    intercept: 0,
    weights: [1, 0, 0, 0, 0, 0, 0, 0], // scoreDifferential is 1st feature
    scaler: {
      means: [0, 0, 0, 0, 0, 0, 0, 0],
      stds: [1, 1, 1, 1, 1, 1, 1, 1],
    },
  },
  provenance: {
    modelVersion: "test",
    method: "logistic-regression",
    featureKeys: [],
    featureSchemaHash: "",
    sampleSize: 100,
  }
};

function createPlay(overrides: Partial<NeutralScriptPlay>): NeutralScriptPlay {
  return {
    playId: "1",
    scoreDifferential: 0, // defaults to 0 -> WP = 0.5
    gameSecondsRemaining: 3600,
    yardline100: 50,
    down: 1,
    ydstogo: 10,
    posteamTimeouts: 3,
    defteamTimeouts: 3,
    spreadLine: 0,
    posteamWon: 1,
    week: 1,
    posteam: "BUF",
    defteam: "JAX",
    play_type: "pass",
    qb_kneel: "0",
    qb_spike: "0",
    epa: 0.5,
    ...overrides,
  };
}

describe("Neutral-Script EPA", () => {
  it("excludes plays outside WP band (20% - 80%) and correctly includes those on edge", () => {
    // 0.19 excluded, 0.20 included, 0.80 included, 0.81 excluded
    const p19 = createPlay({ scoreDifferential: lnOdds(0.19), posteam: "T1", epa: 1 });
    const p20 = createPlay({ scoreDifferential: lnOdds(0.20), posteam: "T2", epa: 1 });
    const p80 = createPlay({ scoreDifferential: lnOdds(0.80), posteam: "T3", epa: 1 });
    const p81 = createPlay({ scoreDifferential: lnOdds(0.81), posteam: "T4", epa: 1 });

    // We need 100 plays to meet floor.
    const plays = [p19, p20, p80, p81];
    for (let i = 0; i < 99; i++) {
        plays.push(createPlay({ scoreDifferential: lnOdds(0.20), posteam: "T2", epa: 1 }));
        plays.push(createPlay({ scoreDifferential: lnOdds(0.80), posteam: "T3", epa: 1 }));
    }

    const result = computeNeutralScriptEpa(plays, mockWpModel, 2);

    // T1 and T4 should have 0 neutral plays -> below floor -> absent
    expect(result.seasonToDate.has("T1")).toBe(false);
    expect(result.seasonToDate.has("T4")).toBe(false);

    // T2 and T3 should have 100 neutral plays
    expect(result.seasonToDate.get("T2")?.offense?.plays).toBe(100);
    expect(result.seasonToDate.get("T3")?.offense?.plays).toBe(100);
  });

  it("excludes clock plays and counts them", () => {
    const plays: NeutralScriptPlay[] = [];
    for (let i = 0; i < 100; i++) {
        plays.push(createPlay({ posteam: "BUF", defteam: "MIA", epa: 1 })); // 100 valid
    }
    plays.push(createPlay({ posteam: "BUF", qb_kneel: "1", epa: 1 }));
    plays.push(createPlay({ posteam: "BUF", qb_spike: "1", epa: 1 }));
    plays.push(createPlay({ posteam: "BUF", play_type: "run", qb_kneel: "0", qb_spike: "0", epa: 1 }));
    plays.push(createPlay({ posteam: "BUF", play_type: "pass", qb_kneel: "0", qb_spike: "0", epa: 1 }));

    const result = computeNeutralScriptEpa(plays, mockWpModel, 2);
    expect(result.diagnostics.clockPlaysExcluded).toBe(2);
    expect(result.seasonToDate.get("BUF")?.offense?.plays).toBe(102); // 100 + run + pass
  });

  it("emits nothing if model is null", () => {
    const plays: NeutralScriptPlay[] = [createPlay({})];
    const result = computeNeutralScriptEpa(plays, null, 2);
    expect(result.seasonToDate.size).toBe(0);
  });

  it("enforces 100-play floor for both offense and defense allowed", () => {
    const plays: NeutralScriptPlay[] = [];
    for (let i = 0; i < 99; i++) {
        plays.push(createPlay({ posteam: "O1", defteam: "D1", epa: 1 })); // 99 plays
    }
    for (let i = 0; i < 100; i++) {
        plays.push(createPlay({ posteam: "O2", defteam: "D2", epa: 1 })); // 100 plays
    }

    const result = computeNeutralScriptEpa(plays, mockWpModel, 2);
    expect(result.seasonToDate.has("O1")).toBe(false);
    expect(result.seasonToDate.has("D1")).toBe(false);

    // O2 has 100 offense plays, but 0 defense plays. D2 has 0 offense, 100 defense.
    // The metric function should still emit the available grains.
    expect(result.seasonToDate.get("O2")?.offense?.plays).toBe(100);
    expect(result.seasonToDate.get("O2")?.defenseAllowed).toBeUndefined();
    expect(result.seasonToDate.get("D2")?.defenseAllowed?.plays).toBe(100);
    expect(result.seasonToDate.get("D2")?.offense).toBeUndefined();

    // 99 plays for O1/D1 -> 2 below floor windows (1 for O1, 1 for D1)
    // O2/D2 missing halves also count as below floor
    // O1 off=below, def=below. D1 off=below, def=below. O2 off=pass, def=below. D2 off=below, def=pass.
    // Total below floor counts = 2(O1) + 2(D1) + 1(O2) + 1(D2) = 6. (Since STD, L4, L8... actually we check all windows).
  });

  it("calculates exact hand-computed averages", () => {
    const plays: NeutralScriptPlay[] = [];
    // JAX defense: 100 plays of -0.5 EPA allowed
    for (let i = 0; i < 100; i++) {
        plays.push(createPlay({ posteam: "BUF", defteam: "JAX", epa: -0.5 }));
    }
    // BUF offense: 100 plays of -0.5 from above, plus 100 plays of 1.5 against PIT
    for (let i = 0; i < 100; i++) {
        plays.push(createPlay({ posteam: "BUF", defteam: "PIT", epa: 1.5 }));
    }
    // PIT defense: 100 plays of 1.5 EPA allowed

    const result = computeNeutralScriptEpa(plays, mockWpModel, 5);

    // BUF Offense: 200 plays total, total EPA = -50 + 150 = +100. Average = +0.5
    expect(result.seasonToDate.get("BUF")?.offense?.value).toBeCloseTo(0.5, 4);
    // JAX Defense: 100 plays, total EPA = -50. Average = -0.5
    expect(result.seasonToDate.get("JAX")?.defenseAllowed?.value).toBeCloseTo(-0.5, 4);
    // PIT Defense: 100 plays, total EPA = 150. Average = 1.5
    expect(result.seasonToDate.get("PIT")?.defenseAllowed?.value).toBeCloseTo(1.5, 4);
  });

  it("excludes unratable EPA and counts them", () => {
    const plays: NeutralScriptPlay[] = [];
    for (let i = 0; i < 100; i++) {
        plays.push(createPlay({ posteam: "BUF", epa: 1 }));
    }
    plays.push(createPlay({ posteam: "BUF", epa: null }));
    plays.push(createPlay({ posteam: "BUF", epa: NaN }));

    const result = computeNeutralScriptEpa(plays, mockWpModel, 2);
    expect(result.diagnostics.unratableEpaExcluded).toBe(2);
    expect(result.seasonToDate.get("BUF")?.offense?.plays).toBe(100); // the 2 were excluded from the mean
  });

  it("respects point-in-time and rolling windows", () => {
    const plays: NeutralScriptPlay[] = [];
    // W1: 100 plays
    for (let i = 0; i < 100; i++) plays.push(createPlay({ week: 1, posteam: "BUF", epa: 1 }));
    // W2: 100 plays
    for (let i = 0; i < 100; i++) plays.push(createPlay({ week: 2, posteam: "BUF", epa: 2 }));
    // W3: 100 plays (targetWeek = 3, so these should be EXCLUDED)
    for (let i = 0; i < 100; i++) plays.push(createPlay({ week: 3, posteam: "BUF", epa: 3 }));
    // W4: 100 plays (targetWeek = 3, so these should be EXCLUDED)
    for (let i = 0; i < 100; i++) plays.push(createPlay({ week: 4, posteam: "BUF", epa: 4 }));

    const result = computeNeutralScriptEpa(plays, mockWpModel, 3);

    // Only W1 and W2 should be included.
    const buf = result.seasonToDate.get("BUF")?.offense;
    expect(buf?.plays).toBe(200);
    expect(buf?.value).toBeCloseTo(1.5, 4); // (100*1 + 100*2) / 200 = 1.5

    // L4 and L8 should be the same in this small sample
    const bufL4 = result.last4Weeks.get("BUF")?.offense;
    expect(bufL4?.plays).toBe(200);
  });
});
