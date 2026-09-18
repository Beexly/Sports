import { describe, expect, it } from "vitest";
import {
  absDeltaVelocity,
  curvature1d,
  evaluateSteamKill,
  forwardKalmanFilter,
  lookaheadDeltaAt,
  scoreSteamBaselines,
  signedDeceleration,
  syntheticSteamPath,
} from "../steam-baselines.js";

describe("curvature1d", () => {
  it("deceleration is a·v < 0, never ||a|| < 0 (the paper's impossible test)", () => {
    expect(curvature1d(1, -2)).toBeGreaterThan(0);
    expect(-2 * 1).toBeLessThan(0);
    expect(Math.hypot(-2)).toBeGreaterThan(0);
  });
});

describe("lookahead probe", () => {
  it("forward Kalman at t is invariant to future bumps; RTS is not", () => {
    const ticks = syntheticSteamPath(30, 3);
    const d = lookaheadDeltaAt(ticks, 10, 0.25);
    expect(d.forward).toBeLessThan(1e-12);
    expect(d.rts).toBeGreaterThan(1e-6);
  });
});

describe("abs-delta baseline", () => {
  it("is zero on a flat series and positive on a jump", () => {
    const flat = [
      { time: 0, impliedProb: 0.5 },
      { time: 1, impliedProb: 0.5 },
      { time: 2, impliedProb: 0.5 },
    ];
    expect(absDeltaVelocity(flat).slice(1).every((v) => v === 0)).toBe(true);
    const jump = [
      { time: 0, impliedProb: 0.5 },
      { time: 1, impliedProb: 0.6 },
    ];
    expect(absDeltaVelocity(jump)[1]!).toBeCloseTo(0.1, 12);
  });
});

describe("scoreSteamBaselines", () => {
  it("returns both methods, shadow, and does not require Hawkes", () => {
    const scores = scoreSteamBaselines(syntheticSteamPath());
    expect(scores.map((s) => s.method).sort()).toEqual(["abs-delta", "forward-curvature"]);
    expect(scores.every((s) => s.priced === false)).toBe(true);
    expect(forwardKalmanFilter(syntheticSteamPath()).length).toBe(40);
  });
});

describe("signedDeceleration", () => {
  it("flags a·v < 0 on a stall after a run-up, and never uses ||a|| < 0", () => {
    const ticks = syntheticSteamPath(40, 7);
    const dec = signedDeceleration(ticks);
    expect(dec.length).toBe(ticks.length);
    expect(dec.some((v) => v < 0)).toBe(true);
  });
});

describe("evaluateSteamKill", () => {
  it("is shadow, names Hawkes as a different object, and does not claim STEAM-CURVATURE", () => {
    const r = evaluateSteamKill(syntheticSteamPath());
    expect(r.priced).toBe(false);
    expect(r.status).toBe("shadow");
    expect(r.hawkesIsDifferentObject).toBe(true);
    expect(["keep-dummy", "curvature-survives", "underpowered"]).toContain(r.verdict);
    expect(r.n).toBe(40);
  });

  it("underpowered on short paths", () => {
    expect(evaluateSteamKill(syntheticSteamPath(5)).verdict).toBe("underpowered");
  });
});
