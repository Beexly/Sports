import { describe, expect, it } from "vitest";
import { buildProvenance, provenancePayload, type SourceSnapshot } from "../provenance.js";

const GEN = "2026-06-03T18:00:00Z";

const snap = (over: Partial<SourceSnapshot> & { source: string; fetchedAt: string }): SourceSnapshot => ({
  snapshotId: "s1",
  tier: "A",
  ...over,
});

describe("buildProvenance", () => {
  it("marks recent, all-Tier-A inputs as fresh and fully citable", () => {
    const p = buildProvenance({
      predictionId: "p1",
      modelVersion: "v6",
      generatedAt: GEN,
      sources: [
        snap({ source: "kalshi", fetchedAt: "2026-06-03T17:55:00Z", tier: "A" }),
        snap({ source: "api-sports", fetchedAt: "2026-06-03T17:50:00Z", tier: "A" }),
      ],
    });
    expect(p.freshness).toBe("fresh");
    expect(p.fullyCitable).toBe(true);
    expect(p.maxStalenessMinutes).toBe(10);
  });

  it("flags stale data instead of looking confidently fresh", () => {
    const p = buildProvenance({
      predictionId: "p2",
      modelVersion: "v6",
      generatedAt: GEN,
      sources: [snap({ source: "espn", fetchedAt: "2026-06-03T14:00:00Z", tier: "B" })], // 4h old
    });
    expect(p.freshness).toBe("stale");
    expect(p.maxStalenessMinutes).toBe(240);
    expect(p.fullyCitable).toBe(false); // Tier-B present → not citable
  });

  it("treats a Tier-B source as not fully citable even when fresh", () => {
    const p = buildProvenance({
      predictionId: "p3",
      modelVersion: "v6",
      generatedAt: GEN,
      sources: [
        snap({ source: "kalshi", fetchedAt: "2026-06-03T17:59:00Z", tier: "A" }),
        snap({ source: "reddit", fetchedAt: "2026-06-03T17:59:00Z", tier: "B" }),
      ],
    });
    expect(p.fullyCitable).toBe(false);
    expect(p.freshness).toBe("fresh");
  });
});

describe("provenancePayload", () => {
  it("is deterministic and order-independent across sources", () => {
    const a = buildProvenance({
      predictionId: "p1",
      modelVersion: "v6",
      generatedAt: GEN,
      sources: [
        snap({ source: "kalshi", snapshotId: "k1", fetchedAt: GEN }),
        snap({ source: "espn", snapshotId: "e1", fetchedAt: GEN }),
      ],
    });
    const b = buildProvenance({
      predictionId: "p1",
      modelVersion: "v6",
      generatedAt: GEN,
      sources: [
        snap({ source: "espn", snapshotId: "e1", fetchedAt: GEN }),
        snap({ source: "kalshi", snapshotId: "k1", fetchedAt: GEN }),
      ],
    });
    expect(provenancePayload(a)).toBe(provenancePayload(b));
  });
});
