import { describe, it, expect } from "vitest";
import {
  gradeAnchorClv,
  rollupAnchorClv,
  type AnchorClvInput,
  type AnchorClvResult,
} from "@/lib/performance/clv-anchor";

function base(overrides: Partial<AnchorClvInput> = {}): AnchorClvInput {
  return {
    entryProb: 0.5,
    consensusCloseProb: 0.54,
    anchorCloseProb: 0.55,
    ...overrides,
  };
}

describe("anchor CLV grading", () => {
  it("returns null on out-of-range probabilities (never fabricates)", () => {
    expect(gradeAnchorClv(base({ entryProb: 1.2 }))).toBeNull();
    expect(gradeAnchorClv(base({ anchorCloseProb: -0.1 }))).toBeNull();
    expect(gradeAnchorClv(base({ consensusCloseProb: Number.NaN }))).toBeNull();
  });

  it("beats the anchor when the sharp close moved past our entry price", () => {
    const r = gradeAnchorClv(base({ entryProb: 0.5, anchorCloseProb: 0.55 }))!;
    expect(r.clvVsAnchor).toBe(0.05);
    expect(r.verdict).toBe("BEAT_ANCHOR");
  });

  it("loses to the anchor when the sharp close went the other way", () => {
    const r = gradeAnchorClv(base({ entryProb: 0.55, anchorCloseProb: 0.5 }))!;
    expect(r.clvVsAnchor).toBe(-0.05);
    expect(r.verdict).toBe("LOST_TO_ANCHOR");
  });

  it("grades vs the ANCHOR, which can differ from vs our consensus", () => {
    // We "beat" our own soft consensus (+0.04) but only matched the sharp anchor exactly.
    const r = gradeAnchorClv(base({ entryProb: 0.5, consensusCloseProb: 0.54, anchorCloseProb: 0.5 }))!;
    expect(r.clvVsConsensus).toBe(0.04);
    expect(r.clvVsAnchor).toBe(0);
    expect(r.verdict).toBe("MATCHED_ANCHOR");
  });

  it("flags a soft consensus close when it diverges from the sharp anchor", () => {
    const soft = gradeAnchorClv(base({ consensusCloseProb: 0.54, anchorCloseProb: 0.50 }))!;
    expect(soft.divergence).toBe(0.04);
    expect(soft.softClose).toBe(true); // 0.04 > default 0.02

    const tight = gradeAnchorClv(base({ consensusCloseProb: 0.541, anchorCloseProb: 0.54 }))!;
    expect(tight.softClose).toBe(false); // 0.001 ≤ 0.02
  });

  it("rolls up anchor grades honestly", () => {
    const results: AnchorClvResult[] = [
      gradeAnchorClv(base({ entryProb: 0.5, anchorCloseProb: 0.55 }))!, // beat
      gradeAnchorClv(base({ entryProb: 0.5, anchorCloseProb: 0.45 }))!, // lost
      gradeAnchorClv(base({ entryProb: 0.5, anchorCloseProb: 0.60 }))!, // beat
    ];
    const roll = rollupAnchorClv(results);
    expect(roll.count).toBe(3);
    expect(roll.beatAnchorRate).toBeCloseTo(2 / 3, 4);
    expect(roll.meanClvVsAnchor).toBeCloseTo((0.05 - 0.05 + 0.1) / 3, 4);
  });

  it("returns an empty (not fabricated) rollup for no data", () => {
    const roll = rollupAnchorClv([]);
    expect(roll.count).toBe(0);
    expect(roll.meanClvVsAnchor).toBe(0);
    expect(roll.note).toMatch(/empty/i);
  });
});
