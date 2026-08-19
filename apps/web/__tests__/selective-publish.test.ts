import { describe, expect, it } from "vitest";
import {
  filterSelective,
  selectivePublishSweep,
  isSelectivePublishEnabled,
} from "@/lib/calibration/selective-publish";
import { buildHoldoutRankingReport } from "@/lib/calibration/holdout-ranking-report";
import { fitPlattFromProbs, applyPlattToProb } from "@/lib/calibration/platt-scaling";
import { authorizeB2bApiKey } from "@/lib/b2b/api-key-auth";

describe("selective publish", () => {
  const rows = Array.from({ length: 100 }, (_, i) => ({
    p: 0.35 + (i % 20) * 0.02,
    y: (i % 3 === 0 ? 1 : 0) as 0 | 1,
    groupKey: i < 50 ? "nfl|spread" : "mlb|ml",
    marketP: 0.5,
  }));

  it("filters by delta", () => {
    const f = filterSelective(rows, { delta: 0.12, edge: null, minGroupRes: null });
    expect(f.every((r) => Math.abs(r.p - 0.5) >= 0.12)).toBe(true);
  });

  it("sweep recommends finite Res when possible", () => {
    const s = selectivePublishSweep(rows, { minN: 10 });
    expect(s.baseline.n).toBe(100);
    expect(s.grid.length).toBeGreaterThan(0);
  });

  it("flag default off", () => {
    expect(isSelectivePublishEnabled({})).toBe(false);
  });

  it("holdout report pause candidates", () => {
    const r = buildHoldoutRankingReport(rows, { minGroupN: 20 });
    expect(r.overall.n).toBe(100);
    expect(r.rankingLevers.length).toBeGreaterThan(0);
  });
});

describe("platt scaling", () => {
  it("fits and applies", () => {
    const samples = Array.from({ length: 80 }, (_, i) => ({
      p: 0.3 + (i % 10) * 0.05,
      y: (i % 2) as 0 | 1,
    }));
    const { A, B } = fitPlattFromProbs(samples);
    expect(Number.isFinite(A)).toBe(true);
    const q = applyPlattToProb(0.6, A, B);
    expect(q).toBeGreaterThan(0);
    expect(q).toBeLessThan(1);
  });
});

describe("b2b auth", () => {
  it("rejects missing key", () => {
    const req = new Request("http://x/api/v1/signals");
    expect(authorizeB2bApiKey(req, { GSE_B2B_API_KEYS: "secret" })).toBe(false);
  });

  it("accepts matching x-api-key", () => {
    const req = new Request("http://x/api/v1/signals", {
      headers: { "x-api-key": "secret" },
    });
    expect(authorizeB2bApiKey(req, { GSE_B2B_API_KEYS: "secret,other" })).toBe(true);
  });
});
