import { describe, expect, it } from "vitest";
import { scoreContentKpis } from "./content-kpi";

describe("scoreContentKpis", () => {
  it("does not archive a piece with no measured analytics (absence is not failure)", () => {
    const result = scoreContentKpis({});

    expect(result.score).toBe(0);
    // A neutral state, not a definitive negative verdict drawn from missing data.
    expect(result.nextAction).toBe("test_again");
    expect(result.nextAction).not.toBe("archive");
    expect(result.signals).toContain(
      "No analytics recorded yet; a zero score reflects absent data, not measured failure.",
    );
  });

  it("treats every-undefined input (all fields absent) as insufficient data, not archive", () => {
    const result = scoreContentKpis({
      views: undefined,
      comments: undefined,
      shares: undefined,
      newsletterClicks: undefined,
    });

    expect(result.nextAction).toBe("test_again");
  });

  it("still archives a genuinely measured low performer", () => {
    // Real analytics were entered but the piece got almost no traction.
    const result = scoreContentKpis({
      views: 100,
      comments: 0,
      shares: 0,
      saves: 0,
      newsletterClicks: 0,
      siteClicks: 0,
      partnerClicks: 0,
      subscribersGained: 0,
    });

    expect(result.score).toBeLessThan(25);
    expect(result.nextAction).toBe("archive");
  });

  it("archives a measured piece even when all zeros are explicitly recorded", () => {
    const result = scoreContentKpis({
      views: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      clickThroughRate: 0,
      watchTimeHours: 0,
    });

    expect(result.nextAction).toBe("archive");
  });

  it("recommends doubling down on a strong performer", () => {
    const result = scoreContentKpis({
      views: 5_000,
      watchTimeHours: 30,
      averageViewDurationSeconds: 300,
      clickThroughRate: 0.12,
      comments: 60,
      shares: 40,
      saves: 40,
      newsletterClicks: 60,
      siteClicks: 60,
      partnerClicks: 30,
      subscribersGained: 60,
    });

    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.nextAction).toBe("double_down");
  });
});
