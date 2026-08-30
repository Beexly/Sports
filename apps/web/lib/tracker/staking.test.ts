import { describe, it, expect } from "vitest";
import { staking } from "./staking";

describe("kelly staking", () => {
  it("recommends a positive stake when you have an edge", () => {
    // 55% to win at +100 (even money, market implies 50%) → clear edge
    const s = staking(0.55, 100, 100, 0.25);
    expect(s.hasEdge).toBe(true);
    expect(s.edgePp).toBeCloseTo(5, 1);
    expect(s.fullKelly).toBeGreaterThan(0);
    expect(s.stakeAmount).toBeGreaterThan(0);
  });

  it("full Kelly at even money equals 2p−1", () => {
    // at +100, b=1, kelly = (1*p - (1-p))/1 = 2p-1
    expect(staking(0.6, 100, 100, 1).fullKelly).toBeCloseTo(0.2, 3);
  });

  it("a fractional multiplier scales the stake down", () => {
    const full = staking(0.6, 100, 1000, 1).stakeFraction;
    const quarter = staking(0.6, 100, 1000, 0.25).stakeFraction;
    expect(quarter).toBeCloseTo(full * 0.25, 3);
  });

  it("refuses (zero stake) when there is no edge", () => {
    // 48% at -110 (market ~52.4%) → negative EV
    const s = staking(0.48, -110, 100, 0.25);
    expect(s.hasEdge).toBe(false);
    expect(s.fullKelly).toBe(0);
    expect(s.stakeAmount).toBe(0);
  });

  it("scales the stake to the bankroll", () => {
    const small = staking(0.6, 100, 100, 0.5).stakeAmount;
    const big = staking(0.6, 100, 1000, 0.5).stakeAmount;
    expect(big).toBeCloseTo(small * 10, 1);
  });

  it("computes the market's implied probability from the price", () => {
    expect(staking(0.5, -110, 100).marketProb).toBeCloseTo(0.524, 2);
  });
});
