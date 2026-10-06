import { describe, it, expect } from "vitest";
import {
  cusumDetect,
  bocpdLite,
} from "./2206-11578v1-doubly-online-changepoint.js";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function randn(rand: () => number): number {
  let u = 0;
  while (u === 0) u = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

describe("changepoint", () => {
  it("cusumDetect fires after a level shift", () => {
    const rand = mulberry32(151);
    const xs = [...Array.from({ length: 200 }, () => randn(rand)), ...Array.from({ length: 200 }, () => 2 + randn(rand))];
    // h=8: negligible false-alarm probability over 200 in-control points,
    // yet a +2-sigma shift crosses it within a handful of steps.
    const alarms = cusumDetect(xs, 0.5, 8);
    expect(alarms.length).toBeGreaterThan(0);
    expect(alarms[0]!).toBeGreaterThanOrEqual(195);
  });
  it("bocpdLite spikes at the changepoint", () => {
    const rand = mulberry32(152);
    const xs = [...Array.from({ length: 60 }, () => randn(rand)), ...Array.from({ length: 60 }, () => 3 + randn(rand))];
    const cp = bocpdLite(xs, 1 / 80, 0, 1, 2, 2);
    const before = Math.max(...cp.slice(40, 58));
    const at = Math.max(...cp.slice(58, 64));
    expect(at).toBeGreaterThan(before);
    expect(at).toBeGreaterThan(0.05);
  });
});
