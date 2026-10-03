import { describe, it, expect } from "vitest";
import { scoreSourceReliability, type SourceReliabilityInput } from "@/lib/sources/source-reliability";

function strong(overrides: Partial<SourceReliabilityInput> = {}): SourceReliabilityInput {
  return {
    sourceId: "the-odds-api",
    uptimePct: 99,
    freshnessMinutes: 5,
    schemaStable: true,
    agreementRate: 0.97,
    rightsStatus: "approved",
    latencyMs: 300,
    settlementLossesAttributed: 0,
    ...overrides,
  };
}

describe("source reliability score", () => {
  it("scores a clean approved source HIGH and public-usable", () => {
    const r = scoreSourceReliability(strong());
    expect(r.tier).toBe("HIGH");
    expect(r.score).toBeGreaterThanOrEqual(80);
    expect(r.usableForPublicClaims).toBe(true);
    expect(r.flags).toEqual([]);
  });

  it("hard-stops a blocked/excluded source to SUSPENDED regardless of metrics", () => {
    const r = scoreSourceReliability(strong({ rightsStatus: "blocked" }));
    expect(r.tier).toBe("SUSPENDED");
    expect(r.score).toBe(0);
    expect(r.confidencePenalty).toBe(1);
    expect(r.usableForPublicClaims).toBe(false);
  });

  it("never lets a non-approved (but operationally fine) source back a public claim", () => {
    const r = scoreSourceReliability(strong({ rightsStatus: "permission_required" }));
    expect(r.usableForPublicClaims).toBe(false);
    expect(r.flags.join(" ")).toMatch(/not public-usable/i);
  });

  it("penalizes staleness and lowers the tier", () => {
    const fresh = scoreSourceReliability(strong());
    const stale = scoreSourceReliability(strong({ freshnessMinutes: 600 }));
    expect(stale.score).toBeLessThan(fresh.score);
    expect(stale.flags).toContain("stale");
  });

  it("penalizes downstream settlement losses traced to the source", () => {
    const clean = scoreSourceReliability(strong());
    const lossy = scoreSourceReliability(strong({ settlementLossesAttributed: 5 }));
    expect(lossy.score).toBeLessThan(clean.score);
    expect(lossy.confidencePenalty).toBeGreaterThan(clean.confidencePenalty);
  });

  it("flags disagreement with other sources and schema breaks", () => {
    const r = scoreSourceReliability(strong({ agreementRate: 0.5, schemaStable: false }));
    expect(r.flags).toContain("disagrees with other sources");
    expect(r.flags).toContain("schema changed");
  });
});
