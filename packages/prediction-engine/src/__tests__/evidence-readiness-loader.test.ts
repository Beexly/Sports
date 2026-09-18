import { describe, expect, it } from "vitest";
import { buildEvidenceReadinessMatrix, EVIDENCE_FACTOR_DEFINITIONS } from "../evidence-readiness-matrix.js";
import {
  EVIDENCE_FACTOR_KEYS,
  EVIDENCE_READINESS_FAMILY,
  recordEvidenceReadinessTrial,
  rung2EligibleFactorKeys,
} from "../evidence-readiness-loader.js";
import { createTrialsRegistry, verifyTrialEntries } from "../edge-lab/trials-registry.js";
import type { EvidenceRecord, SignalCategory } from "@sports/types";

const NOW = new Date("2026-05-21T18:00:00.000Z");

function evidence(sourceCategory: SignalCategory): EvidenceRecord {
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
  };
}

describe("evidence readiness loader enumerates the matrix", () => {
  it("has 13 factor keys from EVIDENCE_FACTOR_DEFINITIONS", () => {
    expect(EVIDENCE_FACTOR_DEFINITIONS).toHaveLength(13);
    expect(EVIDENCE_FACTOR_KEYS).toHaveLength(13);
    expect([...EVIDENCE_FACTOR_KEYS]).toEqual(
      EVIDENCE_FACTOR_DEFINITIONS.map((d) => d.key),
    );
  });
});

describe("rung-2 evidence admission", () => {
  it("admits only factors the matrix already says can contribute", () => {
    const empty = buildEvidenceReadinessMatrix({ now: NOW, evidence: [] });
    expect(rung2EligibleFactorKeys(empty)).toEqual([]);

    const withOdds = buildEvidenceReadinessMatrix({
      now: NOW,
      evidence: [evidence("ODDS")],
    });
    expect(rung2EligibleFactorKeys(withOdds)).toContain("market.odds");
    expect(rung2EligibleFactorKeys(withOdds)).not.toContain("player.availability");
  });

  it("hash-chains a matrix snapshot with a null p-value", () => {
    const matrix = buildEvidenceReadinessMatrix({
      now: NOW,
      evidence: [evidence("ODDS")],
    });
    const reg = createTrialsRegistry();
    const entry = recordEvidenceReadinessTrial({
      registry: reg,
      matrix,
      recordedAt: "2026-09-18T19:22:00.000Z",
      runId: "empty-board-odds-only",
    });
    expect(entry.family).toBe(EVIDENCE_READINESS_FAMILY);
    expect(entry.kind).toBe("model_admission");
    expect(entry.pValue).toBeNull();
    expect(entry.outcome).toBe("recorded");
    expect(verifyTrialEntries(reg.entries()).valid).toBe(true);
    expect(() =>
      recordEvidenceReadinessTrial({
        registry: reg,
        matrix,
        recordedAt: "2026-09-18T19:22:01.000Z",
        runId: "empty-board-odds-only",
      }),
    ).toThrow(/duplicate/);
  });
});
