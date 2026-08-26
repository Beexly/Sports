import { describe, it, expect } from "vitest";
import {
  metaModelContribution,
  type MmcSourceStream,
} from "../edge-lab/features/mmc-contribution.js";

// 12 resolved rows. "unique" disagrees with the herd on the rows the herd
// gets wrong — its residual should carry real signal.
const outcomes: Array<0 | 1> = [1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 1];

const herdProbs = [0.9, 0.8, 0.7, 0.6, 0.85, 0.65, 0.8, 0.75, 0.7, 0.6, 0.65, 0.55];
// Herd says low on rows 4, 8, 10 (idx 3, 8, 10) where outcome is 0 — good there;
// but says high on idx 2? No: 0.7 with outcome 0 → wrong. Unique flips exactly those.
const uniqueProbs = herdProbs.map((p, i) => (outcomes[i] === 1 ? 1 - p + 0.5 : 1 - p - 0.5));

describe("metaModelContribution", () => {
  // NOTE on design: with only 2 sources each one IS half the consensus, so
  // orthogonalization can absorb the entire stream (honest null). These tests
  // use ≥3 sources so the consensus is not dominated by the target source —
  // mirroring how Numerai's meta model averages many submissions.
  it("a source tracking the herd adds no residual beyond the other herd member", () => {
    const sources: MmcSourceStream[] = [
      { name: "a", probs: herdProbs },
      { name: "b", probs: herdProbs.map((p) => p * 0.98 + 0.01) },
    ];
    const r = metaModelContribution(outcomes, sources);
    expect(r.n).toBe(12);
    // Identical rankings → fully absorbed by the 2-source consensus → null.
    expect(r.contributions[0]?.mmc).toBeNull();
    expect(r.degenerate).toContain("a");
  });

  it("an anti-herd source with true signal earns nonzero MMC against a 2-source herd", () => {
    const sources: MmcSourceStream[] = [
      { name: "herd1", probs: herdProbs },
      { name: "herd2", probs: herdProbs.map((p) => p * 0.98 + 0.01) },
      { name: "unique", probs: uniqueProbs },
    ];
    const r = metaModelContribution(outcomes, sources);
    const uniq = r.contributions.find((c) => c.name === "unique");
    expect(uniq?.mmc).not.toBeNull();
  });

  it("constant source is reported degenerate, not zero-imputed; live peer survives", () => {
    const sources: MmcSourceStream[] = [
      { name: "flat", probs: herdProbs.map(() => 0.5) },
      { name: "live1", probs: herdProbs },
      { name: "live2", probs: uniqueProbs },
    ];
    const r = metaModelContribution(outcomes, sources);
    expect(r.degenerate).toContain("flat");
    expect(r.contributions.find((c) => c.name === "flat")?.mmc).toBeNull();
    expect(r.contributions.find((c) => c.name === "live1")?.mmc).not.toBeNull();
  });

  it("fail-closed on short history, mismatched lengths, non-finite probs", () => {
    expect(() =>
      metaModelContribution([1, 0], [{ name: "a", probs: [0.5, 0.5] }]),
    ).toThrow(/at least 3/);
    expect(() =>
      metaModelContribution(outcomes, [{ name: "short", probs: herdProbs.slice(0, 5) }]),
    ).toThrow(/length/);
    expect(() =>
      metaModelContribution(outcomes, [{ name: "nan", probs: herdProbs.map((p, i) => (i === 3 ? NaN : p)) }]),
    ).toThrow(/non-finite/);
    expect(() =>
      metaModelContribution(outcomes.slice(0, 11).concat([2 as 0 | 1]), [
        { name: "a", probs: herdProbs },
      ]),
    ).toThrow(/exactly 0 or 1/);
  });

  it("fail-closed on empty source list", () => {
    expect(() => metaModelContribution(outcomes, [])).toThrow();
  });

  it("ties in forecasts are handled (tied ranks still produce finite mmc vs a peer)", () => {
    const tied = [0.5, 0.5, 0.5, 0.6, 0.6, 0.6, 0.7, 0.7, 0.7, 0.8, 0.8, 0.8];
    const r = metaModelContribution(outcomes, [
      { name: "tied", probs: tied },
      { name: "peer", probs: herdProbs },
    ]);
    const mmc = r.contributions.find((c) => c.name === "tied")?.mmc;
    expect(mmc).not.toBeNull();
    expect(Number.isFinite(mmc ?? NaN)).toBe(true);
  });

  it("single source is its own consensus → honest null (documented limit)", () => {
    const r = metaModelContribution(outcomes, [{ name: "solo", probs: herdProbs }]);
    expect(r.contributions[0]?.mmc).toBeNull();
  });
});
