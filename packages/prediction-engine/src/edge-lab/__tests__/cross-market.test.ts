/** SYNTHETIC tests — Lane C2 cross-market consistency. No real data; pure arithmetic. */
import { describe, it, expect } from "vitest";
import {
  impliedTeamVolume,
  consistencyFlag,
  PASS_LEAN_PER_SPREAD_DOG,
  PASS_LEAN_PER_SPREAD_FAVORITE,
  LEAGUE_AVG_PASS_RATE,
} from "../cross-market.js";

describe("swarm-C2 synthetic cross-market", () => {
  // 1. Big favorite (spread = -7 => favored) => higher impliedPassRate than dog at same total.
  it("favorite pass-lean > dog same total", () => {
    const fav = impliedTeamVolume(-7, 48.5);
    const dog = impliedTeamVolume(7, 48.5);
    expect(fav).not.toBeNull();
    expect(dog).not.toBeNull();
    expect(fav!.impliedPassRate).toBeGreaterThan(dog!.impliedPassRate);
  });

  // 2. Determinism: same inputs => same outputs.
  it("deterministic", () => {
    const a = impliedTeamVolume(-3, 47.0);
    const b = impliedTeamVolume(-3, 47.0);
    expect(a!.impliedPassRate).toBe(b!.impliedPassRate);
    expect(a!.impliedPlays).toBe(b!.impliedPlays);
  });

  // 3. Extreme inputs fail closed (return null, not garbage).
  it("extreme input fail-closed", () => {
    expect(impliedTeamVolume(null, 47)).toBeNull();
    expect(impliedTeamVolume(-3, null)).toBeNull();
    expect(impliedTeamVolume(-3, -5)).toBeNull();
    expect(impliedTeamVolume(NaN, 47)).toBeNull();
  });

  // 4. Flag magnitude monotone in inconsistency.
  it("monotonic z-distance", () => {
    const vol = impliedTeamVolume(-4, 46);
    expect(vol).not.toBeNull();
    const lowZ = consistencyFlag(30, vol, 0.2)!.zDistance;
    const highZ = consistencyFlag(300, vol, 0.2)!.zDistance;
    expect(highZ).toBeGreaterThan(lowZ);
  });

  // 5. Named constants visible in result shape.
  it("coefficients named + present", () => {
    expect(PASS_LEAN_PER_SPREAD_FAVORITE).toBeGreaterThan(0);
    expect(PASS_LEAN_PER_SPREAD_DOG).toBeLessThan(0);
    expect(LEAGUE_AVG_PASS_RATE).toBeGreaterThan(0);
  });

  // 6. Prop flag consistent returns true when close.
  it("consistent near expectation", () => {
    const vol = impliedTeamVolume(-3, 47);
    // Set line near expected => consistent.
    expect(consistencyFlag(20, vol, 0.2)!.consistent).toBe(true);
  });

  // 7. Prop flag inconsistent returns false when far.
  it("inconsistent far from expectation", () => {
    const vol = impliedTeamVolume(-3, 47);
    expect(consistencyFlag(900, vol, 0.05)!.consistent).toBe(false);
  });
});
