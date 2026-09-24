import { describe, it, expect } from "vitest";
import {
  repetitionContrast,
  interruptionContrast,
  hotHandGate,
  Touch,
} from "./1801-07104-hot-hand-repetition.js";

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
function randn(rand: () => number): number {
  let u = 0;
  while (u === 0) u = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

/** Synthetic touches: +3.5pp repetition lift, -3pp interruption drag. */
function simTouches(nDrives: number, seed: number): Touch[] {
  const rand = mulberry32(seed);
  const out: Touch[] = [];
  for (let p = 0; p < 30; p++) {
    for (let d = 0; d < nDrives; d++) {
      for (let k = 0; k < 2; k++) {
        // interruption is orthogonal to repetition: playsSince independent of touch index
        const playsSince = 1 + Math.floor(rand() * 14);
        let pr = 0.62 + (k === 1 ? 0.035 : 0) + (playsSince >= 9 ? -0.04 : 0);
        pr = Math.min(0.95, Math.max(0.05, pr));
        out.push({
          playerId: `p${p}`,
          driveId: d,
          touchIndex: k,
          playsSince,
          snaps: 20 + Math.floor(rand() * 40),
          leverage: rand(),
          success: rand() < pr,
        });
      }
    }
  }
  return out;
}

describe("hot-hand repetition/interruption", () => {
  const touches = simTouches(300, 7);
  it("detects the repetition lift with |z| > 3", () => {
    const rep = repetitionContrast(touches);
    expect(rep.delta).toBeGreaterThan(0.02);
    expect(Math.abs(rep.z)).toBeGreaterThan(3);
  });
  it("detects the interruption drag with |z| > 2", () => {
    const intr = interruptionContrast(touches);
    expect(intr.delta).toBeLessThan(-0.01);
    expect(Math.abs(intr.z)).toBeGreaterThan(2);
  });
  it("gate ADAPTs on the joint criterion", () => {
    const rep = repetitionContrast(touches);
    const intr = interruptionContrast(touches);
    expect(hotHandGate(rep, intr)).toBe("ADAPT");
  });
  it("gate REJECTs pure noise", () => {
    const rand = mulberry32(99);
    const noise: Touch[] = [];
    for (let p = 0; p < 30; p++)
      for (let d = 0; d < 300; d++)
        for (let k = 0; k < 2; k++)
          noise.push({
            playerId: `n${p}`,
            driveId: d,
            touchIndex: k,
            playsSince: 1 + Math.floor(rand() * 14),
            snaps: 30,
            leverage: 0.5,
            success: rand() < 0.6,
          });
    expect(hotHandGate(repetitionContrast(noise), interruptionContrast(noise))).toBe("REJECT");
  });
});
