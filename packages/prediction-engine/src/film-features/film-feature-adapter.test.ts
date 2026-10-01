import { describe, expect, it } from "vitest";
import type { RollingRoleFeatures } from "../props/anytime-td-mit.js";
import type { GScoreInputs } from "../fantasy/g-score.js";
import {
  toPropsInputs,
  toFantasyInputs,
  applyFantasyAdjustment,
  toPickInputs,
} from "./film-feature-adapter.js";
import { extractPlayerFilmFeatures } from "./player-film-features.js";
import { extractTeamFilmFeatures } from "./team-film-features.js";
import { makeCorpus } from "./film-fixtures.js";

const BASE_ROLLING: RollingRoleFeatures = {
  windowGames: 4,
  snapShare: 0.7,
  redZoneShare: 0.2,
  usageShare: 0.22,
  teamPlaysPerGame: 65,
  oppTdRateAllowed: 0.24,
};

describe("toPropsInputs", () => {
  it("returns control/treatment RollingRoleFeatures in the lane's shape", () => {
    const pf = extractPlayerFilmFeatures(makeCorpus(), "KC-WR1")!;
    const out = toPropsInputs(pf, BASE_ROLLING);
    // control is the base inputs untouched
    expect(out.pair.control).toEqual(BASE_ROLLING);
    // treatment overrides film-measured fields only
    expect(out.pair.treatment.snapShare).toBe(BASE_ROLLING.snapShare);
    expect(out.pair.treatment.teamPlaysPerGame).toBe(65);
    expect(out.pair.treatment.usageShare).not.toBeNull();
    expect(out.pair.treatment.redZoneShare).not.toBeNull();
    // priors wired for both prop markets, weight 0
    expect(out.priors.map((p) => p.market).sort()).toEqual([
      "anytime_td",
      "receiving_yards_over",
    ]);
    for (const p of out.priors) expect(p.weight).toBe(0);
    expect(out.featuresUsed).toContain("film:targetShareByFormation");
    expect(out.pair.provenance.calibration).toBe("UNCALIBRATED");
  });

  it("degrades to control-only when film features are absent", () => {
    const out = toPropsInputs(null, BASE_ROLLING);
    expect(out.pair.control).toEqual(BASE_ROLLING);
    expect(out.pair.treatment).toEqual(BASE_ROLLING);
    expect(out.priors).toEqual([]);
  });
});

describe("toFantasyInputs", () => {
  it("produces mu/tau adjustments that compose with GScoreInputs", () => {
    const pf = extractPlayerFilmFeatures(makeCorpus(), "KC-WR1")!;
    const adj = toFantasyInputs(pf);
    expect(adj.provenance.source).toBe("film");
    const base: GScoreInputs = {
      mu: 12,
      tau: 6,
      sigma: 4,
      replacement: 8,
      kappa: 0.5,
    };
    const { control, treatment } = applyFantasyAdjustment(base, adj);
    expect(control).toEqual(base);
    expect(treatment.mu).toBeCloseTo(base.mu + adj.muAdjust, 10);
    expect(treatment.tau).toBeGreaterThan(0);
  });

  it("zeroes out without film features", () => {
    const adj = toFantasyInputs(null);
    expect(adj.muAdjust).toBe(0);
    expect(adj.tauAdjust).toBe(0);
  });
});

describe("toPickInputs", () => {
  it("adapts team features for the pick lanes", () => {
    const tf = extractTeamFilmFeatures(makeCorpus(), "KC", 2)!;
    const picks = toPickInputs(tf);
    expect(picks).not.toBeNull();
    expect(picks!.team).toBe("KC");
    expect(Object.keys(picks!.passLeanBySituation).length).toBeGreaterThan(0);
    expect(picks!.provenance.weight).toBe(0);
  });

  it("returns null without team features", () => {
    expect(toPickInputs(null)).toBeNull();
  });
});
