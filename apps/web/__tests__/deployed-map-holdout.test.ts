import { describe, expect, it } from "vitest";
import {
  MIN_ROWS_FOR_MAP_HOLDOUT,
  deployedVersionMapHoldout,
  type MapHoldoutMethod,
  type MapHoldoutSplitResult,
} from "@/lib/calibration/deployed-map-holdout";
import type { MarketAnchoredSample } from "@/lib/calibration/live-calibration-p";

/** Deterministic LCG: the synthetic samples must be identical on every run. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 0, 1);

/**
 * Build rows for one version. `truth(p)` gives the probability the outcome is
 * actually drawn from, so a systematic miscalibration is stated explicitly
 * rather than hoped for. `t` increases with the index: settled time IS the row
 * order here, which is what makes the time-split assertions meaningful.
 */
function version(
  modelVersion: string,
  n: number,
  seed: number,
  truth: (p: number) => number,
  opts: { readonly settled?: boolean; readonly startAt?: number } = {},
): MarketAnchoredSample[] {
  const r = rng(seed);
  return Array.from({ length: n }, (_, i) => {
    const p = 0.55 + 0.4 * r();
    return {
      p,
      y: (r() < truth(p) ? 1 : 0) as 0 | 1,
      sportKey: "baseball_mlb",
      modelVersion,
      pickType: "MONEYLINE",
      settledAtMs: opts.settled === false ? null : (opts.startAt ?? T0) + i * DAY,
    };
  });
}

function method(split: MapHoldoutSplitResult, name: MapHoldoutMethod) {
  const hit = split.methods.find((m) => m.method === name);
  expect(hit, `method ${name} present`).toBeDefined();
  return hit!;
}

/** Cheap replication count: the Monte Carlo null is a reported diagnostic here. */
const OPTS = { replications: 40 } as const;

describe("deployedVersionMapHoldout (C-297)", () => {
  it("brings a systematically over-priced version under the ECE floor on TEST, where identity does not", () => {
    // Priced ~12 points too high everywhere: the exact shape measured on the
    // deployed version (top-bin moneylines hitting well below their price).
    const samples = version("v9.9.9-over", 900, 7, (p) => p - 0.12);
    const result = deployedVersionMapHoldout(samples, "v9.9.9-over", OPTS);
    expect(result).not.toBeNull();

    for (const split of result!.splits) {
      const identity = method(split, "identity");
      const platt = method(split, "platt");
      const temperature = method(split, "temperature");

      // Identity carries the real gap: well above the 0.05 floor.
      expect(identity.eceDebiased).toBeGreaterThan(result!.eceFloor);
      expect(identity.clearsEceFloor).toBe(false);

      // A map fitted on train only removes it on rows it never saw.
      expect(platt.eceDebiased).toBeLessThan(identity.eceDebiased);
      expect(temperature.eceDebiased).toBeLessThan(identity.eceDebiased);
      expect(platt.clearsEceFloor || temperature.clearsEceFloor).toBe(true);
      expect(split.aMapClearsBothFloors).toBe(true);
      expect(split.identityClearsBothFloors).toBe(false);
      expect(split.bestByEceDebiased).not.toBe("identity");
    }
    expect(result!.aMapClearsBothFloorsAtEverySplit).toBe(true);
  });

  it("leaves a perfectly calibrated version under the floor, and the maps do not make it worse than noise", () => {
    const samples = version("v9.9.9-perfect", 900, 21, (p) => p);
    const result = deployedVersionMapHoldout(samples, "v9.9.9-perfect", OPTS);
    expect(result).not.toBeNull();

    for (const split of result!.splits) {
      const identity = method(split, "identity");
      expect(identity.eceDebiased).toBeLessThanOrEqual(result!.eceFloor);
      expect(identity.clearsEceFloor).toBe(true);

      for (const m of split.methods) {
        // A map fitted on a calibrated train slice is near-identity; it may
        // add sampling noise but must not manufacture a floor-sized gap.
        expect(m.eceDebiased).toBeLessThanOrEqual(result!.eceFloor);
        expect(m.eceDebiased - identity.eceDebiased).toBeLessThan(0.03);
      }
    }
  });

  it("returns null — not a passing verdict — below the row minimum", () => {
    const few = version("v9.9.9-thin", MIN_ROWS_FOR_MAP_HOLDOUT - 1, 3, (p) => p);
    expect(deployedVersionMapHoldout(few, "v9.9.9-thin", OPTS)).toBeNull();

    // Exactly at the minimum it measures.
    const atMin = version("v9.9.9-thin", MIN_ROWS_FOR_MAP_HOLDOUT, 3, (p) => p);
    expect(deployedVersionMapHoldout(atMin, "v9.9.9-thin", OPTS)).not.toBeNull();

    // Undated rows cannot be time-ordered: dropped and counted, not guessed at.
    const undated = version("v9.9.9-undated", 300, 5, (p) => p, { settled: false });
    expect(deployedVersionMapHoldout(undated, "v9.9.9-undated", OPTS)).toBeNull();
  });

  it("scores only the requested version's rows", () => {
    const mine = version("v-deployed", 300, 9, (p) => p);
    const other = version("v-other", 400, 10, (p) => p - 0.2, { startAt: T0 + 5000 * DAY });
    const result = deployedVersionMapHoldout([...mine, ...other], "v-deployed", OPTS);
    expect(result?.n).toBe(300);
    expect(result?.modelVersion).toBe("v-deployed");
  });

  it("splits by settled time, not by array position", () => {
    // Same rows, shuffled into a different array order. A time split must give
    // the identical answer; an index split would not.
    const ordered = version("v-time", 300, 33, (p) => p - 0.1);
    const shuffled = [...ordered];
    const r = rng(1234);
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(r() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }
    expect(shuffled.map((s) => s.settledAtMs)).not.toEqual(ordered.map((s) => s.settledAtMs));

    const now = new Date("2026-09-09T00:00:00.000Z");
    const a = deployedVersionMapHoldout(ordered, "v-time", { ...OPTS, now });
    const b = deployedVersionMapHoldout(shuffled, "v-time", { ...OPTS, now });
    expect(b).toEqual(a);

    // And the train window really is earlier than the test window.
    for (const split of a!.splits) {
      expect(split.trainSettledTo! < split.testSettledFrom!).toBe(true);
      expect(split.nTrain + split.nTest).toBe(a!.n);
    }
  });

  it("never scores a map on the rows it was fitted on", () => {
    const samples = version("v-disjoint", 300, 44, (p) => p - 0.1);
    const result = deployedVersionMapHoldout(samples, "v-disjoint", OPTS)!;
    const byTime = [...samples].sort((x, y) => x.settledAtMs! - y.settledAtMs!);

    for (const split of result.splits) {
      const trainTimes = new Set(byTime.slice(0, split.nTrain).map((s) => s.settledAtMs));
      const testTimes = byTime.slice(split.nTrain).map((s) => s.settledAtMs);
      expect(testTimes).toHaveLength(split.nTest);
      // Every test row is strictly outside the fit window.
      for (const t of testTimes) expect(trainTimes.has(t)).toBe(false);
      // And every method was scored on the test slice, never the whole sample.
      for (const m of split.methods) expect(m.nTest).toBe(split.nTest);
      expect(split.nTest).toBeLessThan(result.n);
    }

    // Two split points, and the two-thirds cut leaves more train than the half.
    expect(result.splits.map((s) => s.nTrain)).toEqual([200, 150]);
  });

  it("fits on train only: rewriting every TEST outcome leaves the fitted parameters identical", () => {
    // The sharpest available leak detector. If a map had seen the test rows,
    // flipping their outcomes would move the fitted T / A / B. Disjoint index
    // ranges only prove the slices differ; this proves the FIT did not read
    // them.
    const base = version("v-leak", 300, 77, (p) => p - 0.1);
    const now = new Date("2026-09-09T00:00:00.000Z");
    const fitted = deployedVersionMapHoldout(base, "v-leak", { ...OPTS, now })!;

    // The larger train slice is the two-thirds cut, so flipping everything
    // after the LATER cut point is safely inside both splits' test windows.
    const latestTrainEnd = Math.max(...fitted.splits.map((s) => s.nTrain));
    const tampered = base.map((s, i) =>
      i >= latestTrainEnd ? { ...s, y: (1 - s.y) as 0 | 1 } : s,
    );
    const after = deployedVersionMapHoldout(tampered, "v-leak", { ...OPTS, now })!;

    for (let i = 0; i < fitted.splits.length; i += 1) {
      const before = fitted.splits[i]!;
      const now_ = after.splits[i]!;
      for (const m of before.methods) {
        expect(now_.methods.find((x) => x.method === m.method)!.params).toEqual(m.params);
      }
      // The SCORES must move — otherwise the tampering did nothing and the
      // parameter check above would pass vacuously.
      expect(now_.methods.find((x) => x.method === "identity")!.eceDebiased).not.toBe(
        before.methods.find((x) => x.method === "identity")!.eceDebiased,
      );
    }
  });

  it("says on the artifact itself that it is a projection the gate does not read", () => {
    const result = deployedVersionMapHoldout(version("v-hint", 300, 55, (p) => p), "v-hint", OPTS)!;
    expect(result.operatorHint).toContain("PROJECTION ONLY");
    expect(result.operatorHint).toContain("does NOT read this key");
    expect(result.operatorHint).toContain("held-out");
    expect(result.operatorHint).toContain("not as a published claim");
  });

  it("is deterministic for a fixed sample", () => {
    const samples = version("v-det", 300, 66, (p) => p - 0.08);
    const now = new Date("2026-09-09T00:00:00.000Z");
    expect(deployedVersionMapHoldout(samples, "v-det", { ...OPTS, now })).toEqual(
      deployedVersionMapHoldout(samples, "v-det", { ...OPTS, now }),
    );
  });
});
