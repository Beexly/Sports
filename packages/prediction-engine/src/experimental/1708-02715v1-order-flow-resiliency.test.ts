import { describe, it, expect } from "vitest";
import {
  volumeBuckets,
  resiliencyRegression,
  steamSignal,
  scarceLiquidityFlag,
  Trade,
  FlowBucket,
} from "./1708-02715v1-order-flow-resiliency.js";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Synthetic tape: price moves with taker imbalance plus noise. */
function simTrades(seed: number): Trade[] {
  const rand = mulberry32(seed);
  const trades: Trade[] = [];
  let price = 50;
  for (let i = 0; i < 600; i++) {
    const buySide = rand() < 0.55;
    const size = 1 + Math.floor(rand() * 5);
    const kindRoll = rand();
    const kind = kindRoll < 0.6 ? "taker" : kindRoll < 0.85 ? "maker-add" : "maker-cancel";
    if (kind === "taker") price += (buySide ? 1 : -1) * size * 0.4 + (rand() - 0.5) * 0.2;
    trades.push({ side: buySide ? "buy" : "sell", size, kind: kind as Trade["kind"], price });
  }
  return trades;
}

describe("volumeBuckets", () => {
  it("partitions the tape into fixed-volume buckets", () => {
    const buckets = volumeBuckets(simTrades(4), 100);
    expect(buckets.length).toBeGreaterThan(3);
    expect(buckets.every((b) => b.volume >= 100)).toBe(true);
  });
});

describe("resiliencyRegression", () => {
  it("recovers positive taker impact and explanatory power", () => {
    const fit = resiliencyRegression(volumeBuckets(simTrades(8), 60));
    expect(fit.betaTaker).toBeGreaterThan(0);
    expect(fit.rSquared).toBeGreaterThan(0.3);
  });
});

describe("steamSignal", () => {
  const steam: FlowBucket[] = [
    { takerImbalance: 40, makerNetFlow: -15, priceChange: 2, volume: 100 },
    { takerImbalance: 55, makerNetFlow: -20, priceChange: 3, volume: 100 },
    { takerImbalance: 48, makerNetFlow: -12, priceChange: 2.5, volume: 100 },
  ];
  const calm: FlowBucket[] = [
    { takerImbalance: 5, makerNetFlow: 10, priceChange: 0.2, volume: 100 },
    { takerImbalance: -4, makerNetFlow: 8, priceChange: -0.1, volume: 100 },
    { takerImbalance: 3, makerNetFlow: 12, priceChange: 0.1, volume: 100 },
  ];
  it("flags hockey-stick flow and stays quiet on balanced flow", () => {
    expect(steamSignal(steam)).toBe(true);
    expect(steamSignal(calm)).toBe(false);
  });
  it("needs the maker fade, not just one-sided takers", () => {
    const noFade = steam.map((b) => ({ ...b, makerNetFlow: 20 }));
    expect(steamSignal(noFade)).toBe(false);
  });
});

describe("scarceLiquidityFlag", () => {
  it("flags an outsized residual move", () => {
    const buckets = volumeBuckets(simTrades(12), 60);
    const fit = resiliencyRegression(buckets);
    // inject an outsized move unrelated to flow
    const shocked = buckets.map((b, i) =>
      i === 2 ? { ...b, priceChange: b.priceChange + 12 } : b,
    );
    expect(scarceLiquidityFlag(shocked, 2, fit)).toBe(true);
    // without the shock, bucket 2 is not a scarce-liquidity regime
    expect(scarceLiquidityFlag(buckets, 2, fit)).toBe(false);
  });
});
