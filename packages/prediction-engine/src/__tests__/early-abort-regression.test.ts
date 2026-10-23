import { describe, it, expect } from "vitest";
import { runIntelligence } from "../../../../apps/web/lib/intelligence-core/engine";
import { verifyAndBrandCausalReceipt } from "../verification/neuro-symbolic-z3-verifier";
import { leanToBoundedProbability } from "../../../../apps/web/lib/intelligence-core/situational-trace";

describe("Task D: Permanent Early-Abort & Posterior Feedback Regression Suite", () => {
  it("maps non-positive leans onto a probability inside (0, 1)", () => {
    expect(leanToBoundedProbability(-0.45)).toBeGreaterThan(0);
    expect(leanToBoundedProbability(-0.45)).toBeLessThan(1);
    expect(leanToBoundedProbability(0)).toBeCloseTo(0.5, 5);
    expect(leanToBoundedProbability(undefined)).toBe(0.5);
  });

  it("executes corpus and mind even when observations have negative leans", async () => {
    const bundleWithNegativeLeans = {
      gameId: "2026-10-22-NE-CHI",
      sport: "NFL",
      homeTeam: "CHI",
      awayTeam: "NE",
      marketSpreadHome: -3.0,
      marketTotal: 50.5,
      weather: { temperatureF: 56.6, windSpeedMph: 5.1, precipitationRateMmHr: 0 },
      extraObservations: [
        { id: "obs-neg-1", category: "trench", lean: -0.45, weight: 0.8, timestampMs: Date.now() - 3600_000 },
        { id: "obs-zero-2", category: "market", lean: 0.0, weight: 0.5, timestampMs: Date.now() - 7200_000 },
        { id: "obs-week-old", category: "structural", lean: 0.35, weight: 0.9, timestampMs: Date.now() - 48 * 3600_000 },
      ],
    };
    const result = await runIntelligence(bundleWithNegativeLeans as never);
    expect(result.situationTrace).toBeDefined();
    expect(result.situationTrace?.ok).toBe(true);
    expect(result.situationTrace?.corpusItemsLoaded ?? 0).toBeGreaterThanOrEqual(3143);
    expect(result.situationTrace?.corpusItemsEvaluated ?? 0).toBeGreaterThanOrEqual(2162);
    // The spec headline is 5303. The file is 5149 unique rows. Do not pad it.
    expect(result.situationTrace?.mindRecordsLoaded).toBe(5149);
    expect(result.situationTrace?.mindApplicablePrinciplesCount ?? 0).toBeGreaterThan(0);
    expect(result.reasoning.corpusPosteriorDelta).not.toBe(0);
    expect(result.reasoning.mindPosteriorDelta).not.toBe(0);
    expect(result.reasoning.publishState).not.toBe("WITHHOLD");
  });

  it("verifies a well-formed 2026-10-22 payload is sat", async () => {
    const replayReceipt = await verifyAndBrandCausalReceipt({
      gameId: "2026-10-22-NE-CHI",
      asOfIso: "2026-10-22T23:45:00Z",
      selection: "OVER 50.5",
      marketType: "TOTAL",
      calibratedProb: 0.574,
      complementProb: 0.426,
      marketImpliedDeVigProb: 0.5,
      edgeVsMarket: 0.074,
      publishState: "PLAY",
      bitmaskSha256: "ignored-by-axiom-checker",
      corpusItemsLoaded: 3143,
      corpusItemsEvaluated: 2162,
      mindRecordsLoaded: 5148,
      mindApplicablePrinciplesCount: 71,
      mentionedActivePlayerIds: ["CHI-QB-WILLIAMS", "NE-QB-MAYE", "NE-TE-HENRY", "NE-RB-STEVENSON"],
      officialInactivePlayerIds: ["CHI-LB-SANBORN", "CHI-LB-EDWARDS", "NE-CB-DAVIS"],
      narrativeWindMph: 5.1,
      sensorWindMph: 5.1,
      narrativeTempF: 56.6,
      sensorTempF: 56.6,
      narrativeLine: 50.5,
      liveBookLine: 50.5,
    });
    expect(replayReceipt.z3SolverStatus).toBe("sat");
    expect(replayReceipt.publishState).toBe("PLAY");
    expect(replayReceipt.pipelineState).toBe("AuthorizedPublishReceipt");
  });
});
