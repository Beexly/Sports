import { describe, it, expect } from "vitest";
import {
  sigmoid,
  applyLocalTemperature,
  nllOfTemperature,
  selectTemperature,
  fitLocalTemperatures,
  calibrateWithLocalTemperature,
} from "@/lib/calibration/local-temperature-scaling";

// ============================================================
// arXiv 2008.05105v2 — local temperature scaling. Additive only.
// ============================================================

describe("local temperature scaling — 2008.05105v2", () => {
  it("sigmoid is the logistic function and numerically stable", () => {
    expect(sigmoid(0)).toBeCloseTo(0.5, 12);
    expect(sigmoid(1000)).toBeCloseTo(1, 6);
    expect(sigmoid(-1000)).toBeCloseTo(0, 6);
  });

  it("applyLocalTemperature with T=1 is identity on sigma", () => {
    expect(applyLocalTemperature(1.2, 1)).toBeCloseTo(sigmoid(1.2), 12);
  });

  it("large T flattens toward 0.5; small T sharpens", () => {
    expect(applyLocalTemperature(2, 1e9)).toBeCloseTo(0.5, 6);
    expect(applyLocalTemperature(2, 0.1)).toBeGreaterThan(sigmoid(2));
    expect(applyLocalTemperature(-2, 0.1)).toBeLessThan(sigmoid(-2));
  });

  it("applyLocalTemperature falls back to unscaled on bad T", () => {
    expect(applyLocalTemperature(1.2, 0)).toBeCloseTo(sigmoid(1.2), 12);
    expect(applyLocalTemperature(1.2, -3)).toBeCloseTo(sigmoid(1.2), 12);
    expect(applyLocalTemperature(1.2, Number.NaN)).toBeCloseTo(sigmoid(1.2), 12);
  });

  it("selectTemperature recovers the data-generating temperature", () => {
    // Synthetic: outcomes from sigma(z / 2).
    const logits: number[] = [];
    const outcomes: number[] = [];
    let seed = 42;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    for (let i = 0; i < 4000; i++) {
      const z = (rand() - 0.5) * 6;
      logits.push(z);
      outcomes.push(rand() < sigmoid(z / 2) ? 1 : 0);
    }
    const t = selectTemperature(logits, outcomes, [0.5, 1, 1.5, 2, 3, 5]);
    expect(t).toBe(2);
  });

  it("nllOfTemperature is infinite on empty/mismatched input", () => {
    expect(nllOfTemperature([], [], 1)).toBe(Number.POSITIVE_INFINITY);
    expect(nllOfTemperature([1], [], 1)).toBe(Number.POSITIVE_INFINITY);
  });

  it("fitLocalTemperatures falls back to global on thin contexts", () => {
    const mk = (key: string, n: number, t: number) => {
      const rows = [];
      let seed = 7;
      const rand = () => {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        return seed / 2147483648;
      };
      for (let i = 0; i < n; i++) {
        const z = (rand() - 0.5) * 6;
        rows.push({ logit: z, outcome: rand() < sigmoid(z / t) ? 1 : 0, contextKey: key });
      }
      return rows;
    };
    const rows = [...mk("nfl", 500, 2), ...mk("mlb", 5, 0.5)];
    const { model, contextSignal } = fitLocalTemperatures(rows, [0.5, 1, 2, 4], 30);
    expect(model.perContext["mlb"]).toBe(model.globalTemperature);
    expect(contextSignal["mlb"]).toBe(false);
    expect(model.perContext["nfl"]).toBe(2);
    expect(contextSignal["nfl"]).toBe(true);
  });

  it("calibrateWithLocalTemperature uses context then global fallback", () => {
    const model = {
      perContext: { nfl: 2 },
      globalTemperature: 1,
      candidates: [1, 2],
    };
    expect(calibrateWithLocalTemperature(model, 2, "nfl")).toBeCloseTo(
      sigmoid(1),
      12,
    );
    expect(calibrateWithLocalTemperature(model, 2, "nba")).toBeCloseTo(
      sigmoid(2),
      12,
    );
  });
});
