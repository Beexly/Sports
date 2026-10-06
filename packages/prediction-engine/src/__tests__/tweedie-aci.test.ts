import { describe, expect, it } from "vitest";
import {
  adaptiveConformalIntervals,
  type AciObservation,
} from "../tweedie-aci.js";

function obs(
  sampleId: string,
  position: string,
  predictedMean: number,
  actualFantasyPoints: number,
): AciObservation {
  return { sampleId, position, predictedMean, actualFantasyPoints };
}

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

/** Split-conformal finite-sample quantile: ceil((n+1)*p)-th order statistic. */
function finiteSampleQuantile(values: readonly number[], probability: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((sorted.length + 1) * probability);
  const index = Math.min(sorted.length - 1, Math.max(0, rank - 1));
  return sorted[index]!;
}

/** Naive ceil(n*p) quantile — too small on small samples vs the (n+1) correction. */
function naiveNpQuantile(values: readonly number[], probability: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil(sorted.length * probability);
  const index = Math.min(sorted.length - 1, Math.max(0, rank - 1));
  return sorted[index]!;
}

describe("adaptiveConformalIntervals — per-position independence", () => {
  it("QB residuals do not change WR alpha or residual quantiles", () => {
    const wrOnly: readonly AciObservation[] = [
      obs("wr-1", "WR", 12, 13),
      obs("wr-2", "WR", 12, 14),
      obs("wr-3", "WR", 12, 11),
      obs("wr-4", "WR", 12, 18),
    ];
    const mixed: readonly AciObservation[] = [
      obs("wr-1", "WR", 12, 13),
      obs("qb-1", "QB", 22, 48),
      obs("wr-2", "WR", 12, 14),
      obs("qb-2", "QB", 22, 3),
      obs("wr-3", "WR", 12, 11),
      obs("qb-3", "QB", 22, 60),
      obs("wr-4", "WR", 12, 18),
    ];

    const wrBaseline = adaptiveConformalIntervals(wrOnly);
    const wrFromMixed = adaptiveConformalIntervals(mixed).filter((row) => row.position === "WR");

    expect(wrFromMixed).toHaveLength(wrBaseline.length);
    for (let i = 0; i < wrBaseline.length; i++) {
      expect(wrFromMixed[i]?.alpha).toBe(wrBaseline[i]?.alpha);
      expect(wrFromMixed[i]?.residualQuantile).toBe(wrBaseline[i]?.residualQuantile);
      expect(wrFromMixed[i]?.lower).toBe(wrBaseline[i]?.lower);
      expect(wrFromMixed[i]?.upper).toBe(wrBaseline[i]?.upper);
      expect(wrFromMixed[i]?.covered).toBe(wrBaseline[i]?.covered);
    }

    const qb = adaptiveConformalIntervals(mixed).filter((row) => row.position === "QB");
    const wrLast = wrFromMixed[wrFromMixed.length - 1];
    expect(
      qb.some(
        (row) =>
          row.residualQuantile !== wrLast?.residualQuantile ||
          row.status !== wrLast?.status ||
          row.alpha !== wrLast?.alpha,
      ),
    ).toBe(true);
  });
});

describe("adaptiveConformalIntervals — finite-sample quantile", () => {
  it("uses ceil((n+1)*p) rather than ceil(n*p) on small residual pools", () => {
    // Freeze alpha at 1 - targetCoverage = 0.2 so p = 0.8 is known.
    const residuals = [1, 2, 3, 4, 10];
    const seeded: AciObservation[] = residuals.map((residual, index) =>
      obs(`seed-${index}`, "WR", 20, 20 + residual),
    );
    seeded.push(obs("probe", "WR", 20, 20));

    const intervals = adaptiveConformalIntervals(seeded, 0.8, 0);
    const probe = intervals[intervals.length - 1];
    expect(probe).toBeDefined();

    const p = 1 - (probe?.alpha ?? 0);
    expect(p).toBeCloseTo(0.8, 4);

    const corrected = finiteSampleQuantile(residuals, p);
    const naive = naiveNpQuantile(residuals, p);
    expect(corrected).not.toBe(naive);
    expect(corrected).toBeGreaterThan(naive);
    expect(probe?.status).toBe("ok");
    expect(probe?.qhatInfinite).toBe(false);
    expect(probe?.residualQuantile).toBeCloseTo(round4(corrected), 4);
    expect(probe?.residualQuantile).not.toBeCloseTo(round4(naive), 4);
  });

  it("FAIL CLOSED when ceil((n+1)p) > n — never clamp rank to n", () => {
    // n=4 residuals after seeds; force p high via targetCoverage=0.95 → alpha=0.05, p=0.95
    // After 4 seeds: k=ceil(5*0.95)=5 > 4 → +Infinity, status fail_closed_insufficient_n
    const residuals = [1, 2, 3, 4];
    const seeded: AciObservation[] = residuals.map((residual, index) =>
      obs(`seed-${index}`, "RB", 10, 10 + residual),
    );
    seeded.push(obs("probe", "RB", 10, 10));
    const intervals = adaptiveConformalIntervals(seeded, 0.95, 0);
    const probe = intervals[intervals.length - 1];
    expect(probe?.qhatInfinite).toBe(true);
    expect(probe?.status).toBe("fail_closed_insufficient_n");
    expect(probe?.residualQuantile).toBe(Number.POSITIVE_INFINITY);
    expect(probe?.upper).toBe(Number.POSITIVE_INFINITY);
    // Fail-closed is not a certified cover — ACI must still see a miss.
    expect(probe?.covered).toBe(false);
  });
});

describe("adaptiveConformalIntervals — alpha adaptation", () => {
  it("returns the pre-update alpha on each observation", () => {
    const targetCoverage = 0.8;
    const learningRate = 0.05;
    const startAlpha = 1 - targetCoverage;

    const hit = adaptiveConformalIntervals(
      [obs("hit-0", "WR", 15, 15), obs("hit-1", "WR", 15, 15)],
      targetCoverage,
      learningRate,
    );
    expect(hit[0]?.alpha).toBeCloseTo(round4(startAlpha), 4);
    expect(hit[0]?.covered).toBe(true);
    const afterHit = Math.min(0.5, Math.max(0.02, startAlpha + learningRate * (1 - targetCoverage - 0)));
    expect(hit[1]?.alpha).toBeCloseTo(round4(afterHit), 4);

    const miss = adaptiveConformalIntervals(
      [obs("miss-0", "QB", 10, 40), obs("miss-1", "QB", 10, 80)],
      targetCoverage,
      learningRate,
    );
    expect(miss[0]?.alpha).toBeCloseTo(round4(startAlpha), 4);
    expect(miss[0]?.covered).toBe(false);
    const afterMiss = Math.min(0.5, Math.max(0.02, startAlpha + learningRate * (1 - targetCoverage - 1)));
    expect(miss[1]?.alpha).toBeCloseTo(round4(afterMiss), 4);
    expect(miss[1]?.alpha).toBeLessThan(miss[0]?.alpha ?? 0);
  });

  it("raises alpha on hits once qhat is finite; fail-closed warmup may lower alpha (honest)", () => {
    // 80 exact hits: after alpha floors at 0.02, p=0.98 needs n≥49 before k≤n.
    const hits = Array.from({ length: 80 }, (_, i) => obs(`h-${i}`, "WR", 15, 15));
    const intervals = adaptiveConformalIntervals(hits, 0.8, 0.05);

    expect(intervals[0]?.alpha).toBeCloseTo(0.2, 4);
    expect(intervals[0]?.status).toBe("warmup_point_band");
    let firstFiniteIdx = -1;
    for (let i = 0; i < intervals.length; i++) {
      const row = intervals[i]!;
      expect(row.alpha).toBeGreaterThanOrEqual(0.02);
      expect(row.alpha).toBeLessThanOrEqual(0.5);
      if (firstFiniteIdx < 0 && row.status === "ok" && !row.qhatInfinite) firstFiniteIdx = i;
    }
    expect(firstFiniteIdx).toBeGreaterThan(0);
    const last = intervals[intervals.length - 1]!;
    expect(last.status).toBe("ok");
    expect(last.qhatInfinite).toBe(false);
    expect(last.residualQuantile).toBeCloseTo(0, 4);
    // Once certified, exact hits are covered and alpha rises from the floor.
    expect(last.alpha).toBeGreaterThan(0.02);
  });

  it("lowers alpha on repeated misses and clamps at 0.02", () => {
    const misses = Array.from({ length: 20 }, (_, i) =>
      obs(`m-${i}`, "QB", 10, 10 + (i + 1) * 1_000),
    );
    const intervals = adaptiveConformalIntervals(misses, 0.8, 0.05);

    expect(intervals[0]?.alpha).toBeCloseTo(0.2, 4);
    expect(intervals.every((row) => row.covered === false)).toBe(true);
    for (const row of intervals) {
      expect(row.alpha).toBeGreaterThanOrEqual(0.02);
      expect(row.alpha).toBeLessThanOrEqual(0.5);
    }
    const last = intervals[intervals.length - 1];
    expect(last?.alpha).toBeCloseTo(0.02, 4);
    const earlier = intervals[3];
    expect(earlier?.alpha).toBeGreaterThan(0.02);
  });
});

describe("adaptiveConformalIntervals — lower clamp", () => {
  it("clamps lower at 0 when residual quantile exceeds the predicted mean", () => {
    const intervals = adaptiveConformalIntervals(
      [obs("wide-1", "RB", 3, 30), obs("wide-2", "RB", 3, 4)],
      0.8,
      0,
    );
    const second = intervals[1];
    expect(second?.residualQuantile).toBeGreaterThan(3);
    expect(second?.lower).toBe(0);
    expect(second?.upper).toBeGreaterThan(3);
    expect(intervals.every((row) => row.lower >= 0)).toBe(true);
  });
});
