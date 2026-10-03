import { describe, expect, it } from "vitest";
import {
  expectedCalibrationError,
  fitTemperature,
  preservesPicks,
  scaledProb,
  softmaxTemp,
} from "./temperature-scaling";

describe("temperature-scaling", () => {
  it("softmaxTemp is a valid distribution, sharper when T < 1", () => {
    const hot = softmaxTemp([2, 1, 0], 2);
    const cold = softmaxTemp([2, 1, 0], 0.5);
    expect(hot.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    expect(cold[0]).toBeGreaterThan(hot[0]!); // colder = more confident
    expect(() => softmaxTemp([1], 0)).toThrow();
  });

  it("fitTemperature recovers the true temperature", () => {
    // Data generated from scaledProb(logit, T=2): overconfident raw logits.
    let s = 13;
    const rng = (): number => {
      s = (1664525 * s + 1013904223) >>> 0;
      return s / 4294967296;
    };
    const logits: number[] = [];
    const labels: Array<0 | 1> = [];
    for (let i = 0; i < 2000; i++) {
      const z = (rng() - 0.5) * 6;
      const p = 1 / (1 + Math.exp(-z / 2));
      logits.push(z);
      labels.push(rng() < p ? 1 : 0);
    }
    const { temperature, nll } = fitTemperature(logits, labels);
    expect(temperature).toBeGreaterThan(1.5);
    expect(temperature).toBeLessThan(2.7);
    // calibrated NLL beats raw (T=1) NLL
    const raw = (() => {
      let acc = 0;
      for (let i = 0; i < logits.length; i++) {
        const p = Math.min(Math.max(scaledProb(logits[i] ?? 0, 1), 1e-12), 1 - 1e-12);
        acc += -((labels[i] ?? 0) * Math.log(p) + (1 - (labels[i] ?? 0)) * Math.log(1 - p));
      }
      return acc / logits.length;
    })();
    expect(nll).toBeLessThan(raw);
  });

  it("scaledProb(0, T) = 0.5 for any T", () => {
    expect(scaledProb(0, 0.3)).toBeCloseTo(0.5, 12);
    expect(() => scaledProb(1, -1)).toThrow();
  });

  it("ECE is ~0 for calibrated probs, high for overconfident ones", () => {
    let s = 17;
    const rng = (): number => {
      s = (1664525 * s + 1013904223) >>> 0;
      return s / 4294967296;
    };
    const probs: number[] = [];
    const labels: Array<0 | 1> = [];
    for (let i = 0; i < 3000; i++) {
      const p = 0.1 + rng() * 0.8;
      probs.push(p);
      labels.push(rng() < p ? 1 : 0);
    }
    expect(expectedCalibrationError(probs, labels)).toBeLessThan(0.03);
    const overconf = probs.map((p) => (p > 0.5 ? 0.95 : 0.05));
    expect(expectedCalibrationError(overconf, labels)).toBeGreaterThan(0.1);
    expect(() => expectedCalibrationError([], [])).toThrow();
  });

  it("preservesPicks: scaling never flips the argmax", () => {
    expect(preservesPicks([0.2, 1.5, -0.3], 0.4)).toBe(true);
    expect(preservesPicks([0.2, 1.5, -0.3], 5)).toBe(true);
  });

  it("rejects bad inputs", () => {
    expect(() => fitTemperature([1], [1, 0] as Array<0 | 1>)).toThrow("mismatch");
  });
});
