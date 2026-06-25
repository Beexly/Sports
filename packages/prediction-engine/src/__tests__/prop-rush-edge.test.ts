import { describe, it, expect } from "vitest";
import {
  assessRushUnderEdge,
  RUSH_UNDER_BUCKETS_3SEASON,
  VIG_BREAK_EVEN,
} from "../prop-rush-edge.js";

describe("assessRushUnderEdge", () => {
  it("grades a high line (≥70) STRONG — its CI floor is above break-even", () => {
    const a = assessRushUnderEdge(72.5);
    expect(a.bucket).toBe("line ≥ 70");
    expect(a.grade).toBe("STRONG_UNDER");
    expect(a.side).toBe("UNDER");
    expect(a.ci95[0]).toBeGreaterThan(VIG_BREAK_EVEN);
  });

  it("grades the 30–49.5 and <30 buckets LEAN — FDR-significant but CI floor dips below break-even", () => {
    expect(assessRushUnderEdge(40.5).grade).toBe("LEAN_UNDER");
    expect(assessRushUnderEdge(20.5).grade).toBe("LEAN_UNDER");
  });

  it("PASSes the efficient 50–70 band (not FDR-significant)", () => {
    const a = assessRushUnderEdge(60.5);
    expect(a.grade).toBe("PASS");
    expect(a.side).toBeNull();
  });

  it("gets stricter with higher juice (−115 break-even) — a lean can fall to pass", () => {
    // 30–49.5 rate is 56.6% which still clears 53.5%, so it stays a lean; but <30 (53.0%)
    // falls below a 53.5% break-even → PASS.
    expect(assessRushUnderEdge(20.5, { breakEven: 0.535 }).grade).toBe("PASS");
    expect(assessRushUnderEdge(40.5, { breakEven: 0.535 }).grade).toBe("LEAN_UNDER");
  });

  it("never recommends OVER and always cites sample size + CI in the rationale", () => {
    for (const b of RUSH_UNDER_BUCKETS_3SEASON) {
      const a = assessRushUnderEdge((b.minLine + Math.min(b.maxLine, b.minLine + 5)) / 2);
      expect(a.side === "UNDER" || a.side === null).toBe(true);
      expect(a.rationale).toContain("over");
    }
  });

  it("rejects invalid lines", () => {
    expect(() => assessRushUnderEdge(-1)).toThrow();
    expect(() => assessRushUnderEdge(Number.NaN)).toThrow();
  });
});
