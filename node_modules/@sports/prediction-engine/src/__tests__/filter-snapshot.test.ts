import { describe, it, expect } from "vitest";
import {
  TeamStrengthFilter,
  FILTER_SNAPSHOT_VERSION,
  type FilterStateSnapshot,
} from "../team-strength-filter.js";

function drive(f: TeamStrengthFilter, n: number, from = 0): number[] {
  const out: number[] = [];
  for (let i = from; i < from + n; i++) {
    f.predictStates();
    const r = f.update(i % 3, (i % 3) + 1, i % 2 === 0 ? 1 : 0);
    out.push(r.predictedHomeWinProb);
  }
  return out;
}

describe("TeamStrengthFilter snapshot/restore", () => {
  it("a restored filter continues the IDENTICAL trajectory (the whole point)", () => {
    const a = new TeamStrengthFilter({ nTeams: 5, seed: 42, nParticles: 200 });
    drive(a, 10);
    const snap = a.snapshot();

    // Continue the original, and continue a restored copy, from the same point.
    const continuedOriginal = drive(a, 15, 10);
    const b = TeamStrengthFilter.restore(snap);
    const continuedRestored = drive(b, 15, 10);

    expect(continuedRestored).toEqual(continuedOriginal);
  });

  it("survives a JSON round trip (it must cross a database boundary)", () => {
    const a = new TeamStrengthFilter({ nTeams: 4, seed: 7, nParticles: 128 });
    drive(a, 8);
    const snap = a.snapshot();
    const viaJson = JSON.parse(JSON.stringify(snap)) as FilterStateSnapshot;

    const fromMemory = drive(TeamStrengthFilter.restore(snap), 10, 8);
    const fromJson = drive(TeamStrengthFilter.restore(viaJson), 10, 8);
    expect(fromJson).toEqual(fromMemory);
  });

  it("preserves accumulated evidence — the cold-start problem this exists to solve", () => {
    const warm = new TeamStrengthFilter({ nTeams: 3, seed: 3, nParticles: 200 });
    for (let i = 0; i < 30; i++) {
      warm.predictStates();
      warm.update(0, 1, 1); // team 0 always wins
    }
    const warmProb = warm.predictHomeWinProbability(0, 1);
    const restored = TeamStrengthFilter.restore(warm.snapshot());

    expect(restored.diagnostics().observations).toBe(30);
    expect(restored.predictHomeWinProbability(0, 1)).toBe(warmProb);
    // A cold filter would be at ~0.5; the restored one must NOT be.
    expect(warmProb).toBeGreaterThan(0.5);
  });

  it("restores the RNG position, not just the particles", () => {
    const f = new TeamStrengthFilter({ nTeams: 5, seed: 11, nParticles: 64 });
    drive(f, 5);
    const snap = f.snapshot();
    const tampered: FilterStateSnapshot = { ...snap, rngState: (snap.rngState + 1) >>> 0 };

    const faithful = drive(TeamStrengthFilter.restore(snap), 6, 5);
    const shifted = drive(TeamStrengthFilter.restore(tampered), 6, 5);
    // If rngState were ignored, these would match. They must not.
    expect(shifted).not.toEqual(faithful);
  });

  it("refuses a version mismatch rather than guessing at the layout", () => {
    const snap = new TeamStrengthFilter({ nTeams: 3, seed: 1, nParticles: 32 }).snapshot();
    expect(() =>
      TeamStrengthFilter.restore({ ...snap, version: FILTER_SNAPSHOT_VERSION + 1 }),
    ).toThrow(/version/);
  });

  it("refuses a geometry mismatch rather than reinterpreting the flat array", () => {
    const snap = new TeamStrengthFilter({ nTeams: 3, seed: 1, nParticles: 32 }).snapshot();
    expect(() => TeamStrengthFilter.restore({ ...snap, nTeams: 4 })).toThrow(/states has/);
    expect(() => TeamStrengthFilter.restore({ ...snap, logWeights: [0, 0] })).toThrow(
      /logWeights has/,
    );
  });

  it("round-trips the config so a restored filter is not silently re-defaulted", () => {
    const f = new TeamStrengthFilter({
      nTeams: 6,
      seed: 99,
      dim: 2,
      nParticles: 100,
      a: 0.9,
      processNoise: 0.05,
      sigma: 1.5,
      homeAdvantage: 0.4,
      essThreshold: 0.25,
      resampling: "multinomial",
    });
    const r = TeamStrengthFilter.restore(f.snapshot());
    expect(r.dim).toBe(2);
    expect(r.a).toBe(0.9);
    expect(r.sigma).toBe(1.5);
    expect(r.homeAdvantage).toBe(0.4);
    expect(r.essThreshold).toBe(0.25);
    expect(r.resampling).toBe("multinomial");
  });
});
