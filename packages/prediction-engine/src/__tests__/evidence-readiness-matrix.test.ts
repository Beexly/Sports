import { describe, expect, it } from "vitest";
import {
  buildEvidenceReadinessMatrix,
  getEvidenceFactorDefinition,
} from "../evidence-readiness-matrix.js";
import type { EvidenceRecord, SignalCategory } from "@sports/types";

const NOW = new Date("2026-05-21T18:00:00.000Z");

function evidence(
  sourceCategory: SignalCategory,
  overrides: Partial<EvidenceRecord> = {}
): EvidenceRecord {
  return {
    signalKey: `${sourceCategory.toLowerCase()}-signal`,
    sourceCategory,
    sourceName: `${sourceCategory.toLowerCase()}-adapter`,
    fetchedAt: new Date(NOW.getTime() - 5 * 60_000),
    trustLevel: 0.92,
    isBootstrap: false,
    activationStatus: "ACTIVE",
    freshnessStatus: "FRESH",
    sampleSize: 30,
    whyUsedOrBlocked: "Source-backed test evidence.",
    ...overrides,
  };
}

describe("evidence readiness matrix", () => {
  it("activates market odds when fresh, trusted, and source-backed", () => {
    const matrix = buildEvidenceReadinessMatrix({
      now: NOW,
      evidence: [evidence("ODDS")],
    });

    const odds = matrix.rows.find((row) => row.key === "market.odds")!;
    expect(odds.status).toBe("ACTIVE");
    expect(odds.canContributeToScore).toBe(true);
    expect(matrix.blockedCriticalFactors).toHaveLength(0);
  });

  it("blocks public pick readiness when the market board is absent", () => {
    const matrix = buildEvidenceReadinessMatrix({
      now: NOW,
      evidence: [evidence("SCHEDULE")],
    });

    expect(matrix.blockedCriticalFactors).toEqual(["market.odds"]);
    expect(matrix.nextBestActions[0]).toContain("Market board");
    expect(matrix.integrityScore).toBeLessThan(70);
  });

  it("keeps player availability in shadow until calibration promotes it", () => {
    const matrix = buildEvidenceReadinessMatrix({
      now: NOW,
      evidence: [
        evidence("ODDS"),
        evidence("PLAYER_AVAILABILITY", {
          activationStatus: "SHADOW_ONLY",
          sampleSize: 3,
        }),
      ],
    });

    const players = matrix.rows.find((row) => row.key === "player.availability")!;
    expect(players.status).toBe("SHADOW_READY");
    expect(players.canContributeToScore).toBe(false);
    expect(players.action).toContain("shadow outcomes");
  });

  it("blocks stale venue environment even when the source is trusted", () => {
    const matrix = buildEvidenceReadinessMatrix({
      now: NOW,
      evidence: [
        evidence("ODDS"),
        evidence("VENUE_ENVIRONMENT", {
          fetchedAt: new Date(NOW.getTime() - 12 * 60 * 60_000),
          freshnessStatus: "STALE",
          sampleSize: 1,
        }),
      ],
    });

    const venue = matrix.rows.find((row) => row.key === "venue.environment")!;
    expect(venue.status).toBe("BLOCKED");
    expect(venue.blockers).toContain(
      "Evidence is stale for this factor's decision window."
    );
    expect(venue.failureHorizon).toBe("TWO_WEEKS");
  });

  it("never lets true EV contribute before independent fair probability is active", () => {
    const matrix = buildEvidenceReadinessMatrix({
      now: NOW,
      evidence: [
        evidence("ODDS"),
        evidence("RATINGS", {
          activationStatus: "ACTIVE",
          sampleSize: 500,
        }),
      ],
    });

    const fairProbability = matrix.rows.find(
      (row) => row.key === "model.independentFairProbability"
    )!;
    const trueEv = matrix.rows.find((row) => row.key === "model.trueEv")!;

    expect(fairProbability.status).toBe("ACTIVE");
    expect(fairProbability.canContributeToScore).toBe(false);
    expect(trueEv.status).toBe("BLOCKED");
    expect(trueEv.canContributeToScore).toBe(false);
    expect(trueEv.blockers).toContain(
      "True EV stays blocked until independent fair probability is active."
    );
  });

  // FIX 7: model.trueEv was unconditionally blocked by fiat. It now accepts
  // an optional edgeLabVerdict artifact (the edge-lab honesty-engine's
  // logit-pool β verdict + tuned tau) and activates iff the verdict is the
  // REAL "adds information" string from edge-lab/logit-pool.ts AND tau is
  // non-null. Absent artifact must be byte-identical to today's behavior.
  const trueEvReadyEvidence = [
    evidence("ODDS"),
    evidence("RATINGS", { activationStatus: "ACTIVE", sampleSize: 500 }),
  ];

  it("default (no edgeLabVerdict): trueEv stays blocked exactly as before", () => {
    const matrix = buildEvidenceReadinessMatrix({
      now: NOW,
      evidence: trueEvReadyEvidence,
    });

    const trueEv = matrix.rows.find((row) => row.key === "model.trueEv")!;
    expect(trueEv.status).toBe("BLOCKED");
    expect(trueEv.canContributeToScore).toBe(false);
    expect(trueEv.blockers).toContain(
      "True EV stays blocked until independent fair probability is active."
    );
  });

  it("edgeLabVerdict artifact (MODEL_ADDS_INFORMATION + tuned tau): trueEv goes ACTIVE", () => {
    const matrix = buildEvidenceReadinessMatrix({
      now: NOW,
      evidence: trueEvReadyEvidence,
      edgeLabVerdict: { logitPoolVerdict: "MODEL_ADDS_INFORMATION", tunedTau: 0.02 },
    });

    const trueEv = matrix.rows.find((row) => row.key === "model.trueEv")!;
    expect(trueEv.status).toBe("ACTIVE");
    expect(trueEv.blockers).not.toContain(
      "True EV stays blocked until independent fair probability is active."
    );
  });

  it("FIRE_NOTHING edgeLabVerdict artifact: trueEv stays blocked", () => {
    const matrix = buildEvidenceReadinessMatrix({
      now: NOW,
      evidence: trueEvReadyEvidence,
      edgeLabVerdict: { logitPoolVerdict: "FIRE_NOTHING", tunedTau: null },
    });

    const trueEv = matrix.rows.find((row) => row.key === "model.trueEv")!;
    expect(trueEv.status).toBe("BLOCKED");
    expect(trueEv.blockers).toContain(
      "True EV stays blocked until independent fair probability is active."
    );
  });

  it("adds-information verdict but null tau (honest fire-nothing tau): trueEv stays blocked", () => {
    const matrix = buildEvidenceReadinessMatrix({
      now: NOW,
      evidence: trueEvReadyEvidence,
      edgeLabVerdict: { logitPoolVerdict: "MODEL_ADDS_INFORMATION", tunedTau: null },
    });

    const trueEv = matrix.rows.find((row) => row.key === "model.trueEv")!;
    expect(trueEv.status).toBe("BLOCKED");
  });

  it("normalizes 0-100 trust scores for source adapters that emit percentages", () => {
    const matrix = buildEvidenceReadinessMatrix({
      now: NOW,
      evidence: [
        evidence("ODDS", {
          trustLevel: 94,
        }),
      ],
    });

    const odds = matrix.rows.find((row) => row.key === "market.odds")!;
    expect(odds.bestTrustLevel).toBeCloseTo(0.94);
    expect(odds.status).toBe("ACTIVE");
  });

  it("documents the highest-risk short-horizon factor explicitly", () => {
    const playerDefinition = getEvidenceFactorDefinition("player.availability");
    expect(playerDefinition.failureHorizon).toBe("TWO_WEEKS");
    expect(playerDefinition.failureMode).toContain("Late scratches");
  });
});
