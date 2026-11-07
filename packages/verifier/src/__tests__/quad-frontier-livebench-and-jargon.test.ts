import { describe, expect, it } from "vitest";
import { evaluateAlwaysOnLiveBenchScorecard } from "../gse-livebench-AlwaysOnScorer";
import { scanAndSanitizeCustomerCopy } from "../jargon-firewall";

describe("quad-frontier-livebench-and-jargon", () => {
  it("evaluates Always-On LiveBench scorecard with SHA-256 pre-commitment anchor", () => {
    const card = evaluateAlwaysOnLiveBenchScorecard([
      {
        pickId: "P-01",
        sport: "NFL",
        marketType: "spread",
        predictedProb: 0.62,
        deViggedOpenProb: 0.52,
        deViggedCloseProb: 0.57,
        outcome: 1,
        difficultyWeight: 1.2,
        conformalLower90: -10.5,
        conformalUpper90: 3.5,
        realizedMarginOrStat: -3.0,
        preCommitTimestampUtc: "2026-11-05T18:00:00Z",
        kickoffTimestampUtc: "2026-11-05T20:15:00Z",
      },
    ]);
    expect(card.totalEvaluated).toBe(1);
    expect(card.meanDeVigClv).toBeGreaterThan(0);
    expect(card.preCommitMerkleRootSha256).toHaveLength(64);
  });

  it("sanitizes internal math jargon from customer-facing copy", () => {
    const res = scanAndSanitizeCustomerCopy("Tested with Romano CQR and Sinkhorn scaling.");
    expect(res.passed).toBe(false);
    expect(res.sanitizedText).toContain("calibrated range bounds");
    expect(res.sanitizedText).toContain("usage redistribution");
  });
});
