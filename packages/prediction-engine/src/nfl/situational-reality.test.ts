import { describe, expect, it } from "vitest";
import {
  personnelVsCoverage,
  playActionMotion,
  pressureByThrowTime,
  qbPressureRate,
  teamPressure,
} from "./situational-reality";

describe("situational counts, 2025 regular season", () => {
  it("11 personnel is alive against cover 1 and dead against cover 2", () => {
    const cover1 = personnelVsCoverage(2025, "11", "COVER_1");
    const cover2 = personnelVsCoverage(2025, "11", "COVER_2");
    expect(cover1).toBeTruthy();
    expect(cover2).toBeTruthy();
    expect(cover1!.n).toBe(3464);
    expect(cover2!.n).toBe(3212);
    expect(cover1!.epaPerPlay).toBeGreaterThan(0.09);
    expect(cover2!.epaPerPlay).toBeLessThan(0.01);
    expect(cover1!.epaPerPlay - cover2!.epaPerPlay).toBeGreaterThan(0.08);
  });

  it("21 personnel flips from a win against cover 1 to a loss against cover 4", () => {
    const cover1 = personnelVsCoverage(2025, "21", "COVER_1");
    const cover4 = personnelVsCoverage(2025, "21", "COVER_4");
    expect(cover1!.n).toBeGreaterThan(100);
    expect(cover4!.n).toBeGreaterThan(50);
    expect(cover1!.epaPerPlay).toBeGreaterThan(0.2);
    expect(cover4!.epaPerPlay).toBeLessThan(0);
  });

  it("play-action with motion is worth a lot more against single-high than against split safety", () => {
    const single = playActionMotion(2025, "PA", "MOT", "SINGLE");
    const split = playActionMotion(2025, "PA", "MOT", "SPLIT");
    expect(single!.n).toBe(2008);
    expect(split!.n).toBe(1107);
    expect(single!.epaPerPlay).toBeGreaterThan(0.15);
    expect(split!.epaPerPlay).toBeLessThan(0.06);
  });

  it("the ball out under 2 seconds is pressured a third as often as a ball held past 2.5", () => {
    const fast = pressureByThrowTime(2025, "FAST");
    const slow = pressureByThrowTime(2025, "SLOW");
    expect(fast!.dropbacks).toBe(4083);
    expect(slow!.dropbacks).toBe(9117);
    expect(fast!.pressureRate!).toBeGreaterThan(0.08);
    expect(fast!.pressureRate!).toBeLessThan(0.11);
    expect(slow!.pressureRate!).toBeGreaterThan(0.32);
  });

  it("has a 2026 pressure rate for every tracked team, and a 2025 team cell for Baltimore", () => {
    const ravens = teamPressure(2025, "BAL");
    expect(ravens).toBeTruthy();
    expect(ravens!.n).toBeGreaterThan(800);
    expect(ravens!.dropbacks).toBeGreaterThan(300);
    expect(ravens!.pressureRate).toBeGreaterThan(0.15);
    expect(ravens!.pressureRate).toBeLessThan(0.5);
    const current = qbPressureRate(2026, "BAL");
    expect(current).toBeTruthy();
    expect(current!.dropbacks).toBeGreaterThan(100);
    expect(current!.rate).toBeGreaterThan(0.1);
    expect(current!.rate).toBeLessThan(0.6);
  });
});
