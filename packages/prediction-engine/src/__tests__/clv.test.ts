import { describe, it, expect } from "vitest";
import {
  computeSpreadClv,
  computeTotalClv,
  computeMoneylineClv,
  summarizeClv,
  aggregatePublicClv,
  MIN_PUBLIC_CLV_SAMPLE,
  type PublicClvRow,
} from "../clv.js";

describe("computeSpreadClv (home-perspective line)", () => {
  it("HOME beats the close when it locked a more generous line", () => {
    // Bet home at -3, market closed -4 → laid fewer points → +1 CLV.
    const r = computeSpreadClv(-3, -4, "HOME");
    expect(r.clvPoints).toBe(1);
    expect(r.verdict).toBe("BEAT_CLOSE");
  });

  it("HOME loses to the close when the line moved against it", () => {
    const r = computeSpreadClv(-4, -3, "HOME");
    expect(r.clvPoints).toBe(-1);
    expect(r.verdict).toBe("LOST_TO_CLOSE");
  });

  it("matches the close when the line did not move", () => {
    const r = computeSpreadClv(-3, -3, "HOME");
    expect(r.clvPoints).toBe(0);
    expect(r.verdict).toBe("MATCHED_CLOSE");
  });

  it("AWAY is the mirror image of the home line", () => {
    // Picked away (home line +2 → away -2), closed home +4 (away -4):
    // away laid fewer points at lock → beat the close by 2.
    const r = computeSpreadClv(2, 4, "AWAY");
    expect(r.clvPoints).toBe(2);
    expect(r.verdict).toBe("BEAT_CLOSE");
  });
});

describe("computeTotalClv", () => {
  it("OVER beats the close when it locked a lower total", () => {
    const r = computeTotalClv(48, 49, "OVER");
    expect(r.clvPoints).toBe(1);
    expect(r.verdict).toBe("BEAT_CLOSE");
  });

  it("OVER loses when the total dropped after lock", () => {
    expect(computeTotalClv(49, 48, "OVER").verdict).toBe("LOST_TO_CLOSE");
  });

  it("UNDER beats the close when it locked a higher total", () => {
    const r = computeTotalClv(48, 47, "UNDER");
    expect(r.clvPoints).toBe(1);
    expect(r.verdict).toBe("BEAT_CLOSE");
  });
});

describe("computeMoneylineClv", () => {
  it("beats the close when the locked price was longer (better payout)", () => {
    // Bet +150 (implied 0.40), closed +120 (implied ~0.4545) → beat the close.
    const r = computeMoneylineClv(150, 120);
    expect(r.clvProbability).toBeCloseTo(0.0545, 3);
    expect(r.clvPercent).toBeCloseTo(5.45, 1);
    expect(r.verdict).toBe("BEAT_CLOSE");
  });

  it("beats the close on a favorite that shortened after lock", () => {
    // Bet -150 (0.60), closed -200 (~0.6667) → your -150 was the better price.
    expect(computeMoneylineClv(-150, -200).verdict).toBe("BEAT_CLOSE");
  });

  it("loses to the close when the locked price was shorter", () => {
    expect(computeMoneylineClv(-200, -150).verdict).toBe("LOST_TO_CLOSE");
  });

  it("matches the close within the tolerance band", () => {
    expect(computeMoneylineClv(-110, -110).verdict).toBe("MATCHED_CLOSE");
  });
});

describe("summarizeClv", () => {
  it("returns a collecting summary when empty", () => {
    const s = summarizeClv([]);
    expect(s.sampleSize).toBe(0);
    expect(s.averageClv).toBeNull();
    expect(s.beatCloseRate).toBe(0);
  });

  it("computes beat-close rate and average CLV across a sample", () => {
    const s = summarizeClv([
      { value: 1, verdict: "BEAT_CLOSE" },
      { value: -1, verdict: "LOST_TO_CLOSE" },
      { value: 0.5, verdict: "BEAT_CLOSE" },
    ]);
    expect(s.sampleSize).toBe(3);
    expect(s.beatCloseRate).toBeCloseTo(0.6667, 3);
    expect(s.lostToCloseRate).toBeCloseTo(0.3333, 3);
    expect(s.averageClv).toBeCloseTo(0.1667, 3);
  });
});

describe("aggregatePublicClv (public proof aggregate)", () => {
  const row = (
    clvVerdict: string | null,
    clvValue: number | null = null,
    clvKind: string | null = null
  ): PublicClvRow => ({ clvVerdict, clvValue, clvKind });

  it("returns an empty, floor-failing aggregate when nothing is graded", () => {
    const a = aggregatePublicClv([]);
    expect(a.gradedSampleSize).toBe(0);
    expect(a.beatCloseRate).toBeNull();
    expect(a.averageClvPoints).toBeNull();
    expect(a.meetsPublicSampleFloor).toBe(false);
  });

  it("computes the beat-the-close rate from graded verdicts", () => {
    // 30 graded picks: 18 beat, 8 lost, 4 matched → 60% beat rate.
    const rows: PublicClvRow[] = [
      ...Array.from({ length: 18 }, () => row("BEAT_CLOSE", 0.5, "POINTS")),
      ...Array.from({ length: 8 }, () => row("LOST_TO_CLOSE", -1, "POINTS")),
      ...Array.from({ length: 4 }, () => row("MATCHED_CLOSE", 0, "POINTS")),
    ];
    const a = aggregatePublicClv(rows);
    expect(a.gradedSampleSize).toBe(30);
    expect(a.beatCloseCount).toBe(18);
    expect(a.lostToCloseCount).toBe(8);
    expect(a.matchedCloseCount).toBe(4);
    expect(a.beatCloseRate).toBeCloseTo(0.6, 5);
    // (18·0.5 + 8·(−1) + 4·0) / 30 = 1/30 ≈ 0.03
    expect(a.averageClvPoints).toBeCloseTo(0.03, 2);
    expect(a.meetsPublicSampleFloor).toBe(true);
  });

  it("excludes ungraded and junk-verdict rows from the sample", () => {
    const rows: PublicClvRow[] = [
      row("BEAT_CLOSE", 1, "POINTS"),
      row(null), // close never captured — never graded
      row("SOMETHING_ELSE", 2, "POINTS"), // junk verdict — ignored
      row("LOST_TO_CLOSE", -1, "POINTS"),
    ];
    const a = aggregatePublicClv(rows);
    expect(a.gradedSampleSize).toBe(2);
    expect(a.beatCloseRate).toBeCloseTo(0.5, 5);
  });

  it("fails the public sample floor below MIN_PUBLIC_CLV_SAMPLE", () => {
    const rows = Array.from({ length: MIN_PUBLIC_CLV_SAMPLE - 1 }, () =>
      row("BEAT_CLOSE", 1, "POINTS")
    );
    const a = aggregatePublicClv(rows);
    // The rate is computed (real data) but the floor flag stays false, which
    // is what keeps it off the public surface.
    expect(a.beatCloseRate).toBe(1);
    expect(a.meetsPublicSampleFloor).toBe(false);
  });

  it("averages points-kind CLV only — never mixes moneyline probability units", () => {
    const rows: PublicClvRow[] = [
      row("BEAT_CLOSE", 2, "POINTS"),
      row("BEAT_CLOSE", 0.05, "PROBABILITY"), // ML prob must not pollute points avg
      row("LOST_TO_CLOSE", -1, "POINTS"),
    ];
    const a = aggregatePublicClv(rows);
    expect(a.averageClvPoints).toBeCloseTo(0.5, 5);
  });

  it("returns a null points average when only moneyline grades exist", () => {
    const a = aggregatePublicClv([
      row("BEAT_CLOSE", 0.04, "PROBABILITY"),
      row("LOST_TO_CLOSE", -0.02, "PROBABILITY"),
    ]);
    expect(a.gradedSampleSize).toBe(2);
    expect(a.averageClvPoints).toBeNull();
  });
});
