import { describe, it, expect } from "vitest";
import { computeQbPressureChange, type PressuredProxyDropback } from "../qb-pressure-change.js";

describe("QB Pressure-Behavior Change Detection", () => {
  function makePlay(
    passerId: string,
    gameId: string,
    season: number,
    week: number,
    isDropback: boolean,
    isPressuredProxy: boolean,
    epa: number | null
  ): PressuredProxyDropback {
    return {
      passerId,
      gameId,
      season,
      week,
      isDropback,
      isPressuredProxy,
      epa,
    };
  }

  it("proxy classification is handled correctly (dropback=true when sack or qb_hit)", () => {
    const plays: PressuredProxyDropback[] = [];
    for (let i = 1; i <= 24; i++) {
      for (let j = 0; j < 10; j++) {
        plays.push(makePlay("qb1", `g${i}`, 2025, i, true, true, 0.5));
      }
    }
    const res = computeQbPressureChange(plays, 2026, 1);
    expect(res.length).toBe(1);
    expect(res[0]!.prior16PressuredProxyDropbacks).toBe(160);
    expect(res[0]!.roll8PressuredProxyDropbacks).toBe(80);
  });

  it("calculates engine EPA instead of nflverse referee column", () => {
    const plays: PressuredProxyDropback[] = [];
    for (let i = 1; i <= 24; i++) {
      for (let j = 0; j < 10; j++) {
        plays.push(makePlay("qb1", `g${i}`, 2025, i, true, true, 2.0));
      }
    }
    const res = computeQbPressureChange(plays, 2026, 1);
    expect(res[0]!.prior16EpaPerPressuredProxy).toBe(2.0);
    expect(res[0]!.roll8EpaPerPressuredProxy).toBe(2.0);
  });

  it("break rule: flag true only when > 1.5x pooled SE and both floors met", () => {
    const plays: PressuredProxyDropback[] = [];
    for (let i = 1; i <= 16; i++) {
      for (let j = 0; j < 10; j++) {
        plays.push(makePlay("qb1", `g${i}`, 2025, i, true, true, 0));
      }
    }
    for (let i = 17; i <= 24; i++) {
      for (let j = 0; j < 10; j++) {
        plays.push(makePlay("qb1", `g${i}`, 2025, i, true, true, 5));
      }
    }
    const res = computeQbPressureChange(plays, 2026, 1);
    expect(res[0]!.breakFlag).toBe(true);

    const playsNoBreak: PressuredProxyDropback[] = [];
    for (let i = 1; i <= 24; i++) {
      for (let j = 0; j < 10; j++) {
        playsNoBreak.push(makePlay("qb1", `g${i}`, 2025, i, true, true, (j % 2 === 0 ? 1 : -1) + (i <= 16 ? 0 : 0.01)));
      }
    }
    const resNoBreak = computeQbPressureChange(playsNoBreak, 2026, 1);
    expect(resNoBreak[0]!.breakFlag).toBe(false);
  });

  it("floors: either window under 75 pressured-proxy dropbacks -> null result, no flag", () => {
    const plays: PressuredProxyDropback[] = [];
    for (let i = 1; i <= 16; i++) {
      for (let j = 0; j < 10; j++) {
        plays.push(makePlay("qb1", `g${i}`, 2025, i, true, true, 0));
      }
    }
    for (let i = 17; i <= 24; i++) {
      for (let j = 0; j < 5; j++) {
        plays.push(makePlay("qb1", `g${i}`, 2025, i, true, true, 5));
      }
    }
    const res = computeQbPressureChange(plays, 2026, 1);
    expect(res.length).toBe(0);
  });

  it("no single-game flags: one game spike inside flat fixture does not produce break", () => {
    const plays: PressuredProxyDropback[] = [];
    for (let i = 1; i <= 24; i++) {
      for (let j = 0; j < 10; j++) {
        const epa = i === 24 ? 20 : (j % 2 === 0 ? 20 : -20);
        plays.push(makePlay("qb1", `g${i}`, 2025, i, true, true, epa));
      }
    }
    const res = computeQbPressureChange(plays, 2026, 1);
    expect(res[0]!.breakFlag).toBe(false);
  });

  it("point-in-time: target week never enters either window; correctly ordered", () => {
    const plays: PressuredProxyDropback[] = [];
    for (let i = 1; i <= 24; i++) {
      for (let j = 0; j < 10; j++) {
        plays.push(makePlay("qb1", `g${i}`, 2025, i, true, true, 0));
      }
    }
    for (let j = 0; j < 10; j++) {
      plays.push(makePlay("qb1", `g25`, 2026, 1, true, true, 100));
    }
    const res = computeQbPressureChange(plays, 2026, 1);
    expect(res[0]!.roll8EpaPerPressuredProxy).toBe(0);
  });

  it("CUSUM diagnostic is finite and moves in expected direction", () => {
    const plays: PressuredProxyDropback[] = [];
    for (let i = 1; i <= 16; i++) {
      for (let j = 0; j < 10; j++) {
        plays.push(makePlay("qb1", `g${i}`, 2025, i, true, true, 0));
      }
    }
    for (let i = 17; i <= 24; i++) {
      for (let j = 0; j < 10; j++) {
        plays.push(makePlay("qb1", `g${i}`, 2025, i, true, true, 2));
      }
    }
    const res = computeQbPressureChange(plays, 2026, 1);
    expect(Number.isFinite(res[0]!.cusumDiagnostic)).toBe(true);
    expect(res[0]!.cusumDiagnostic).toBeGreaterThan(0);
  });

  it("shrinkage moves small-sample EPA towards league mean", () => {
    const plays: PressuredProxyDropback[] = [];
    for (let i = 1; i <= 24; i++) {
      for (let j = 0; j < 10; j++) {
        plays.push(makePlay("qb1", `g${i}a`, 2025, i, true, true, 0));
        plays.push(makePlay("qb2", `g${i}b`, 2025, i, true, true, 10));
      }
    }
    const res = computeQbPressureChange(plays, 2026, 1);
    const qb1 = res.find(r => r.passerId === "qb1");
    expect(qb1!.roll8EpaPerPressuredProxy).toBe(0);
    expect(qb1!.roll8EpaPerPressuredProxyShrunk).toBeGreaterThan(0);
  });
});
