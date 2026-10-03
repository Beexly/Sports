/**
 * Closing-line distillation: the distiller learns a real feature→close
 * relationship, refuses closing-shaped features, refuses under-determined
 * fits, and the CLV-selection consumer is inert without a real
 * decision-time price.
 */
import { describe, expect, it } from "vitest";

import {
  predictedMoveEdge,
  scoreDistillation,
  trainCloseDistiller,
  type CloseRow,
} from "../close-distillation.js";
import { mulberry32 } from "../rng.js";

const sigmoid = (z: number): number => 1 / (1 + Math.exp(-z));

function corpus(seed: number, n: number): CloseRow[] {
  const rng = mulberry32(seed);
  return Array.from({ length: n }, () => {
    const gap = (rng() - 0.5) * 2;
    const rest = (rng() - 0.5) * 4;
    const q = sigmoid(0.9 * gap + 0.1 * rest + (rng() - 0.5) * 0.15);
    return {
      features: new Map([
        ["sched:rolling_wr_diff", gap + (rng() - 0.5) * 0.2],
        ["sched:rest_diff", rest],
      ]),
      qClose: Math.min(0.95, Math.max(0.05, q)),
    };
  });
}

describe("trainCloseDistiller", () => {
  it("beats the train-mean baseline on held-out data when structure exists", () => {
    const rows = corpus(9, 1200);
    const train = rows.slice(0, 900);
    const test = rows.slice(900);
    const d = trainCloseDistiller(train, { featureKeys: ["sched:rolling_wr_diff", "sched:rest_diff"] });
    expect(d).not.toBeNull();
    const score = scoreDistillation(d!, train, test, 0);
    expect(score.maeModel).toBeLessThan(score.maeBaseline);
    expect(score.r2VsBaseline).toBeGreaterThan(0.3);
  });

  it("refuses closing-shaped feature keys and under-determined fits", () => {
    const rows = corpus(10, 300);
    expect(() =>
      trainCloseDistiller(rows, { featureKeys: ["market:closing_spread"] }),
    ).toThrow(RangeError);
    expect(trainCloseDistiller(rows.slice(0, 15), { featureKeys: ["sched:rolling_wr_diff", "sched:rest_diff"] })).toBeNull();
  });

  it("is deterministic: same rows -> identical coefficients", () => {
    const rows = corpus(11, 600);
    const a = trainCloseDistiller(rows, { featureKeys: ["sched:rolling_wr_diff", "sched:rest_diff"] });
    const b = trainCloseDistiller(rows, { featureKeys: ["sched:rolling_wr_diff", "sched:rest_diff"] });
    expect([...a!.coefficients.entries()]).toEqual([...b!.coefficients.entries()]);
  });
});

describe("predictedMoveEdge — inert without a real decision price", () => {
  it("throws on null/invalid decision price (never invents a baseline)", () => {
    expect(() => predictedMoveEdge({ predictedClose: 0.55, decisionPrice: null })).toThrow(/real decision-time price/);
    expect(() => predictedMoveEdge({ predictedClose: 0.55, decisionPrice: 0.8 })).toThrow(RangeError);
  });

  it("signs correctly with a real price", () => {
    // Decision at 2.10 (q=0.476), predicted close 0.52 -> positive expected move.
    expect(predictedMoveEdge({ predictedClose: 0.52, decisionPrice: 2.1 })).toBeGreaterThan(0);
    expect(predictedMoveEdge({ predictedClose: 0.45, decisionPrice: 2.1 })).toBeLessThan(0);
  });
});
