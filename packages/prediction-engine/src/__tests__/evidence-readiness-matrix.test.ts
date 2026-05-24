import { describe, expect, it } from "vitest";
import {
  buildEvidenceReadinessMatrix,
  getEvidenceFactorDefinition,
} from "../evidence-readiness-matrix";
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

  it("getEvidenceFactorDefinition throws on an unknown factor key", () => {
    expect(() =>
      getEvidenceFactorDefinition("nonexistent.factor" as "market.odds")
    ).toThrow(/Unknown evidence factor/);
  });

  it("buildEvidenceReadinessMatrix reports shadow-ready count correctly", () => {
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
    expect(matrix.shadowReadyFactors).toBeGreaterThan(0);
  });

  it("buildEvidenceReadinessMatrix activeContributingFactors counts ACTIVE rows that canContributeToScore", () => {
    const matrix = buildEvidenceReadinessMatrix({
      now: NOW,
      evidence: [evidence("ODDS")],
    });
    // market.odds is ACTIVE and should canContributeToScore = true
    expect(matrix.activeContributingFactors).toBeGreaterThanOrEqual(1);
  });
});

// ── actionForStatus — untested branches ───────────────────────────────────

describe("evidence matrix — ACTIVE canContributeWhenActive=false action", () => {
  it("returns 'Active for context only' when factor is ACTIVE but cannot contribute to score", () => {
    // team.divisionContext has canContributeWhenActive=false. With a fresh,
    // high-trust, ACTIVE evidence record it should reach actionForStatus with
    // status=ACTIVE and canContributeWhenActive=false.
    const matrix = buildEvidenceReadinessMatrix({
      now: NOW,
      evidence: [
        evidence("ODDS"), // keep market.odds active so critical list is empty
        evidence("DIVISION_CONTEXT", {
          activationStatus: "ACTIVE",
          sampleSize: 1,
        }),
      ],
    });
    const row = matrix.rows.find((r) => r.key === "team.divisionContext")!;
    expect(row.status).toBe("ACTIVE");
    expect(row.canContributeToScore).toBe(false);
    expect(row.action).toContain("context only");
  });
});

describe("evidence matrix — SHADOW_COLLECTING status", () => {
  it("yields SHADOW_COLLECTING when factor cannot contribute but is shadow-only", () => {
    // team.divisionContext has canContributeWhenActive=false. SHADOW_ONLY
    // activation → deriveStatus returns SHADOW_COLLECTING (not SHADOW_READY).
    const matrix = buildEvidenceReadinessMatrix({
      now: NOW,
      evidence: [
        evidence("ODDS"),
        evidence("DIVISION_CONTEXT", {
          activationStatus: "SHADOW_ONLY",
          sampleSize: 1,
        }),
      ],
    });
    const row = matrix.rows.find((r) => r.key === "team.divisionContext")!;
    expect(row.status).toBe("SHADOW_COLLECTING");
    expect(row.canContributeToScore).toBe(false);
    expect(row.action).toContain("explanation context only");
  });
});

describe("evidence matrix — factorBlockers edge cases", () => {
  it("adds bootstrap blocker when evidence.isBootstrap is true", () => {
    const matrix = buildEvidenceReadinessMatrix({
      now: NOW,
      evidence: [
        evidence("ODDS", { isBootstrap: true }),
      ],
    });
    const row = matrix.rows.find((r) => r.key === "market.odds")!;
    expect(row.status).toBe("BLOCKED");
    expect(row.blockers).toContain("Bootstrap evidence cannot activate scoring.");
  });

  it("adds missing-freshness blocker when freshnessStatus is MISSING", () => {
    const matrix = buildEvidenceReadinessMatrix({
      now: NOW,
      evidence: [
        evidence("ODDS", { freshnessStatus: "MISSING" }),
      ],
    });
    const row = matrix.rows.find((r) => r.key === "market.odds")!;
    expect(row.status).toBe("BLOCKED");
    expect(row.blockers).toContain("Evidence freshness is missing.");
  });

  it("blockedActivationReason — BLOCKED_MISSING_SOURCE returns the missing source message", () => {
    const matrix = buildEvidenceReadinessMatrix({
      now: NOW,
      evidence: [
        evidence("ODDS", { activationStatus: "BLOCKED_MISSING_SOURCE" }),
      ],
    });
    const row = matrix.rows.find((r) => r.key === "market.odds")!;
    expect(row.status).toBe("BLOCKED");
    expect(row.blockers.some((b) => b.includes("missing source adapter"))).toBe(true);
  });

  it("blockedActivationReason — BLOCKED_LOW_TRUST returns the low-trust message", () => {
    const matrix = buildEvidenceReadinessMatrix({
      now: NOW,
      evidence: [
        evidence("ODDS", { activationStatus: "BLOCKED_LOW_TRUST" }),
      ],
    });
    const row = matrix.rows.find((r) => r.key === "market.odds")!;
    expect(row.blockers.some((b) => b.includes("low-trust"))).toBe(true);
  });

  it("blockedActivationReason — BLOCKED_SMALL_SAMPLE returns the small-sample message", () => {
    const matrix = buildEvidenceReadinessMatrix({
      now: NOW,
      evidence: [
        evidence("ODDS", { activationStatus: "BLOCKED_SMALL_SAMPLE" }),
      ],
    });
    const row = matrix.rows.find((r) => r.key === "market.odds")!;
    expect(row.blockers.some((b) => b.includes("insufficient sample size"))).toBe(true);
  });
});

describe("evidence matrix — nextBestActions non-critical path", () => {
  it("falls back to first 5 blocked/absent factors when all critical factors are active", () => {
    // market.odds (minSampleSize=1) is ACTIVE with sampleSize=1.
    // market.lineMovement (minSampleSize=2, optional) is BLOCKED because
    // sampleSize=1 < 2. Since no critical factors are blocked, nextBestActions
    // falls back to the blocked/absent list, which includes "Line movement".
    const matrix = buildEvidenceReadinessMatrix({
      now: NOW,
      evidence: [
        evidence("ODDS", { sampleSize: 1 }),
      ],
    });
    expect(matrix.blockedCriticalFactors).toHaveLength(0);
    expect(matrix.nextBestActions.some((a) => a.includes("Line movement"))).toBe(true);
  });
});
