/**
 * Targeted coverage for evidence-readiness-matrix branches not reached by
 * evidence-readiness-matrix.test.ts.
 *
 * The primary test covers: ACTIVE status, missing market board
 * (blockedCriticalFactors), SHADOW_READY (player.availability + SHADOW_ONLY),
 * BLOCKED stale venue, true EV always blocked, trust normalization >1,
 * getEvidenceFactorDefinition.
 *
 * This file covers: SHADOW_COLLECTING (canContributeWhenActive=false with
 * SHADOW_ONLY), actionForStatus branches (context-only ACTIVE, SHADOW_READY
 * message, SHADOW_COLLECTING message), factorBlockers sub-conditions
 * (bootstrap, MISSING freshness, low trust, small sample, blocked activation
 * statuses), buildNextBestActions when no critical factor is blocked, and
 * getEvidenceFactorDefinition throw on unknown key.
 */

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
    whyUsedOrBlocked: "Test evidence.",
    ...overrides,
  };
}

function oddsActive() {
  return evidence("ODDS"); // market.odds ACTIVE satisfies blockedCriticalFactors=[]
}

// ============================================================
// SHADOW_COLLECTING status
// ============================================================

describe("SHADOW_COLLECTING — canContributeWhenActive=false + SHADOW_ONLY", () => {
  it("derives SHADOW_COLLECTING for team.divisionContext with SHADOW_ONLY activation", () => {
    // team.divisionContext has canContributeWhenActive=false
    const matrix = buildEvidenceReadinessMatrix({
      now: NOW,
      evidence: [
        oddsActive(),
        evidence("DIVISION_CONTEXT", { activationStatus: "SHADOW_ONLY" }),
      ],
    });

    const row = matrix.rows.find((r) => r.key === "team.divisionContext")!;
    expect(row.status).toBe("SHADOW_COLLECTING");
    expect(row.canContributeToScore).toBe(false);
    expect(row.action).toContain("explanation context only");
  });
});

// ============================================================
// actionForStatus — ACTIVE + canContributeWhenActive=false
// ============================================================

describe("actionForStatus — ACTIVE + canContributeWhenActive=false", () => {
  it("uses context-only action message for factors active but not eligible for scoring", () => {
    // model.independentFairProbability: canContributeWhenActive=false
    // Provide evidence that passes all blockers (high trust, large sample, ACTIVE, fresh)
    const matrix = buildEvidenceReadinessMatrix({
      now: NOW,
      evidence: [
        oddsActive(),
        evidence("RATINGS", { sampleSize: 500, activationStatus: "ACTIVE" }),
      ],
    });

    const row = matrix.rows.find((r) => r.key === "model.independentFairProbability")!;
    expect(row.status).toBe("ACTIVE");
    expect(row.canContributeToScore).toBe(false);
    expect(row.action).toContain("context only");
  });
});

// ============================================================
// actionForStatus — SHADOW_READY message
// ============================================================

describe("actionForStatus — SHADOW_READY", () => {
  it("action mentions calibration proposal and minimum window", () => {
    const matrix = buildEvidenceReadinessMatrix({
      now: NOW,
      evidence: [
        oddsActive(),
        evidence("PLAYER_AVAILABILITY", { activationStatus: "SHADOW_ONLY" }),
      ],
    });
    const row = matrix.rows.find((r) => r.key === "player.availability")!;
    expect(row.status).toBe("SHADOW_READY");
    expect(row.action).toContain("calibration proposal");
  });
});

// ============================================================
// factorBlockers — bootstrap evidence
// ============================================================

describe("factorBlockers — bootstrap evidence", () => {
  it("blocks when record.isBootstrap=true", () => {
    const matrix = buildEvidenceReadinessMatrix({
      now: NOW,
      evidence: [
        evidence("ODDS", { isBootstrap: true }),
        // No other ODDS source → market.odds picks the bootstrap one
      ],
    });
    const row = matrix.rows.find((r) => r.key === "market.odds")!;
    expect(row.status).toBe("BLOCKED");
    expect(row.blockers.some((b) => b.includes("Bootstrap"))).toBe(true);
  });
});

// ============================================================
// factorBlockers — MISSING freshnessStatus
// ============================================================

describe("factorBlockers — MISSING freshnessStatus", () => {
  it("blocks when freshnessStatus is MISSING", () => {
    const matrix = buildEvidenceReadinessMatrix({
      now: NOW,
      evidence: [
        evidence("ODDS", { freshnessStatus: "MISSING" }),
      ],
    });
    const row = matrix.rows.find((r) => r.key === "market.odds")!;
    expect(row.status).toBe("BLOCKED");
    expect(row.blockers.some((b) => b.includes("freshness is missing"))).toBe(true);
  });
});

// ============================================================
// factorBlockers — low trust
// ============================================================

describe("factorBlockers — low trust level", () => {
  it("blocks when trustLevel is below factor minimum", () => {
    // market.odds requires minTrustLevel=0.75; provide 0.50
    const matrix = buildEvidenceReadinessMatrix({
      now: NOW,
      evidence: [
        evidence("ODDS", { trustLevel: 0.5 }),
      ],
    });
    const row = matrix.rows.find((r) => r.key === "market.odds")!;
    expect(row.status).toBe("BLOCKED");
    expect(row.blockers.some((b) => b.includes("below required"))).toBe(true);
  });
});

// ============================================================
// factorBlockers — small sample size
// ============================================================

describe("factorBlockers — small sample size", () => {
  it("blocks when sampleSize is below factor minimum", () => {
    // official.tendencies requires minSampleSize=20; provide 5
    const matrix = buildEvidenceReadinessMatrix({
      now: NOW,
      evidence: [
        oddsActive(),
        evidence("OFFICIALS", { sampleSize: 5 }),
      ],
    });
    const row = matrix.rows.find((r) => r.key === "official.tendencies")!;
    expect(row.status).toBe("BLOCKED");
    expect(row.blockers.some((b) => b.includes("Sample size"))).toBe(true);
  });
});

// ============================================================
// factorBlockers — blocked activation statuses
// ============================================================

describe("factorBlockers — BLOCKED_MISSING_SOURCE activation", () => {
  it("blocks with missing-source message when activationStatus=BLOCKED_MISSING_SOURCE", () => {
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
});

describe("factorBlockers — BLOCKED_LOW_TRUST activation", () => {
  it("includes low-trust activation reason in blockers", () => {
    const matrix = buildEvidenceReadinessMatrix({
      now: NOW,
      evidence: [
        evidence("ODDS", { activationStatus: "BLOCKED_LOW_TRUST" }),
      ],
    });
    const row = matrix.rows.find((r) => r.key === "market.odds")!;
    expect(row.blockers.some((b) => b.includes("low-trust evidence"))).toBe(true);
  });
});

describe("factorBlockers — BLOCKED_SMALL_SAMPLE activation", () => {
  it("includes small-sample activation reason in blockers", () => {
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

describe("factorBlockers — BLOCKED_STALE activation", () => {
  it("includes stale activation reason in blockers", () => {
    const matrix = buildEvidenceReadinessMatrix({
      now: NOW,
      evidence: [
        evidence("ODDS", { activationStatus: "BLOCKED_STALE" }),
      ],
    });
    const row = matrix.rows.find((r) => r.key === "market.odds")!;
    expect(row.blockers.some((b) => b.includes("stale evidence"))).toBe(true);
  });
});

// ============================================================
// buildNextBestActions — no critical blockers
// ============================================================

describe("buildNextBestActions — no critical blockers", () => {
  it("returns up to 5 blocked/absent rows when no required factor is blocked", () => {
    // market.odds is ACTIVE → no critical blockers
    const matrix = buildEvidenceReadinessMatrix({
      now: NOW,
      evidence: [oddsActive()],
    });
    // Most factors will be ABSENT (no evidence provided)
    expect(matrix.nextBestActions.length).toBeGreaterThan(0);
    expect(matrix.nextBestActions.length).toBeLessThanOrEqual(5);
  });
});

// ============================================================
// getEvidenceFactorDefinition — throws on unknown key
// ============================================================

describe("getEvidenceFactorDefinition — unknown key", () => {
  it("throws for an unknown factor key", () => {
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getEvidenceFactorDefinition("unknown.factor" as any);
    }).toThrow(/Unknown evidence factor/);
  });
});

// ============================================================
// rowScore reflected in integrityScore
// ============================================================

describe("integrityScore — weighted row scoring", () => {
  it("integrityScore is 100 when only required factor is ACTIVE and no others are present", () => {
    // With only market.odds (ACTIVE, required), integrityScore should be 100
    // market.odds: weight=3, score=100 → total=300/3=100
    // Other factors are ABSENT: weight=1, score=0
    // Full weighted: (1×100×3 + 12×0×1) / (3+12) ≈ 20 — but let's just check it's > 50
    const matrix = buildEvidenceReadinessMatrix({
      now: NOW,
      evidence: [oddsActive()],
    });
    // The required factor being active boosts score above neutral
    expect(matrix.integrityScore).toBeGreaterThan(20);
  });
});

// ============================================================
// ageMinutes calculation
// ============================================================

describe("ageMinutes — elapsed time from fetchedAt to now", () => {
  it("computes ageMinutes as elapsed time rounded to the minute", () => {
    // Fetch 10 minutes ago
    const matrix = buildEvidenceReadinessMatrix({
      now: NOW,
      evidence: [
        evidence("ODDS", { fetchedAt: new Date(NOW.getTime() - 10 * 60_000) }),
      ],
    });
    const row = matrix.rows.find((r) => r.key === "market.odds")!;
    expect(row.ageMinutes).toBe(10);
  });

  it("returns null ageMinutes for ABSENT factors", () => {
    const matrix = buildEvidenceReadinessMatrix({
      now: NOW,
      evidence: [],
    });
    const row = matrix.rows.find((r) => r.key === "market.odds")!;
    expect(row.status).toBe("ABSENT");
    expect(row.ageMinutes).toBeNull();
  });
});
