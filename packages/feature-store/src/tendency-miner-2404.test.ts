import { describe, expect, it } from "vitest";
import { buildConfrontationMatrix, associationStrengths, ROW_LABELS, COL_LABELS, GSE_TENDENCY_MINER_ENABLED } from "./tendency-miner-2404.js";

const plays = [
  { targetDepthBucket: 0, separationBucket: 1, yacBucket: 2, coverageShell: 2, boxBucket: 1 },
  { targetDepthBucket: 0, separationBucket: 1, yacBucket: 2, coverageShell: 2, boxBucket: 1 },
];

describe("tendency miner", () => {
  it("builds the confrontation matrix with the right shape", () => {
    const m = buildConfrontationMatrix(plays);
    expect(m.counts).toHaveLength(ROW_LABELS.length);
    expect(m.counts[0]).toHaveLength(COL_LABELS.length);
    const total = m.counts.flat().reduce((a, b) => a + b, 0);
    expect(total).toBe(plays.length * 3 * 2); // 3 row feats x 2 col feats per play
  });
  it("association strengths row-normalize", () => {
    const m = buildConfrontationMatrix(plays);
    const a = associationStrengths(m);
    const rowSums = a.map((r) => r.reduce((x, y) => x + y, 0));
    for (const s of rowSums) expect(s === 0 || Math.abs(s - 1) < 1e-10).toBe(true);
  });
  it("handles empty and out-of-range input", () => {
    const m = buildConfrontationMatrix([]);
    expect(m.counts.flat().every((c) => c === 0)).toBe(true);
    const bad = buildConfrontationMatrix([{ targetDepthBucket: 99, separationBucket: 99, yacBucket: 99, coverageShell: 99, boxBucket: 99 }]);
    expect(bad.counts.flat().every((c) => c === 0)).toBe(true);
  });
  it("stays off until the stability gate clears", () => {
    expect(GSE_TENDENCY_MINER_ENABLED).toBe(false);
  });
});

