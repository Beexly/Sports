/**
 * Conformance suite for the SOLE canonical `CreditGrantSnapshot` contract.
 *
 * The JSON fixtures in
 * `lib/opportunity-engine/fixtures/credit-grant-snapshot.conformance.json`
 * are the shared conformance surface: S3's evidence/reconciler implementation
 * must produce snapshots that reproduce these exact verdicts, and
 * `feat/ai-control-plane-credit-admission` (PR-D) consumes the same contract
 * read-only through the S1 barrel. This test proves the fixtures and the S1
 * validators agree, and that the barrel actually exports the contract.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as s1 from "@/lib/opportunity-engine";
import type {
  CreditAdmissibilityReason,
  CreditGrantSnapshot,
  CreditScopeRequest,
  CreditSnapshotViolation,
  OpportunityEvidence,
} from "@/lib/opportunity-engine";

const FIXTURES_PATH = path.join(
  __dirname,
  "..",
  "lib",
  "opportunity-engine",
  "fixtures",
  "credit-grant-snapshot.conformance.json",
);

interface SnapshotCaseExpectation {
  readonly valid: boolean;
  readonly violations: readonly CreditSnapshotViolation[];
  readonly admissible: boolean;
  readonly reasons: readonly CreditAdmissibilityReason[];
}

interface SnapshotConformanceCase {
  readonly name: string;
  readonly expected: SnapshotCaseExpectation;
  readonly snapshot: CreditGrantSnapshot;
  readonly note?: string;
}

interface ConformanceFixtureFile {
  readonly description: string;
  readonly contractSchemaVersion: string;
  readonly evaluationAt: string;
  readonly defaultScopeRequest: CreditScopeRequest;
  readonly snapshotCases: readonly SnapshotConformanceCase[];
  readonly opportunityEvidenceExamples: readonly OpportunityEvidence[];
}

const fixtures = JSON.parse(readFileSync(FIXTURES_PATH, "utf8")) as ConformanceFixtureFile;

describe("S1 barrel exports the canonical snapshot contract for control-plane consumption", () => {
  it("exports every snapshot validator and the wildcard marker from the index", () => {
    expect(typeof s1.validateCreditGrantSnapshot).toBe("function");
    expect(typeof s1.isCreditGrantSnapshotFresh).toBe("function");
    expect(typeof s1.isCreditGrantSnapshotExpired).toBe("function");
    expect(typeof s1.creditScopeCovers).toBe("function");
    expect(typeof s1.evaluateCreditSnapshotAdmissibility).toBe("function");
    expect(s1.CREDIT_SCOPE_WILDCARD).toBe("*");
  });

  it("names feat/ai-control-plane-credit-admission as a consumer that must not redefine the contract", () => {
    const source = readFileSync(
      path.join(__dirname, "..", "lib", "opportunity-engine", "credit-snapshot.ts"),
      "utf8",
    );
    expect(source).toContain("SOLE CANONICAL SNAPSHOT CONTRACT");
    expect(source).toContain("feat/ai-control-plane-credit-admission");
  });
});

describe("credit-grant-snapshot conformance fixtures (shared with S3)", () => {
  it("declares the current contract schema version and a non-empty case set", () => {
    expect(fixtures.contractSchemaVersion).toBe("credit-grant-snapshot@1");
    expect(fixtures.snapshotCases.length).toBeGreaterThanOrEqual(10);
    const names = fixtures.snapshotCases.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });

  for (const conformanceCase of fixtures.snapshotCases) {
    it(`case "${conformanceCase.name}" validates and evaluates exactly as declared`, () => {
      const validation = s1.validateCreditGrantSnapshot(conformanceCase.snapshot);
      expect(validation.valid).toBe(conformanceCase.expected.valid);
      expect(validation.violations).toEqual(conformanceCase.expected.violations);

      const admissibility = s1.evaluateCreditSnapshotAdmissibility(
        conformanceCase.snapshot,
        fixtures.defaultScopeRequest,
        fixtures.evaluationAt,
      );
      expect(admissibility.admissible).toBe(conformanceCase.expected.admissible);
      expect(admissibility.reasons).toEqual(conformanceCase.expected.reasons);
    });
  }

  it("covers both an admissible and every fail-closed refusal reason at least once", () => {
    const seen = new Set(fixtures.snapshotCases.flatMap((c) => c.expected.reasons));
    // Derived from the exported runtime union — cannot drift from the type.
    expect(s1.CREDIT_ADMISSIBILITY_REASONS.length).toBe(9);
    for (const reason of s1.CREDIT_ADMISSIBILITY_REASONS) {
      expect(seen.has(reason), reason).toBe(true);
    }
    expect(fixtures.snapshotCases.some((c) => c.expected.admissible)).toBe(true);
  });

  it("ships structurally complete OpportunityEvidence examples for S3", () => {
    expect(fixtures.opportunityEvidenceExamples.length).toBeGreaterThanOrEqual(2);
    for (const evidence of fixtures.opportunityEvidenceExamples) {
      expect(evidence.id.length).toBeGreaterThan(0);
      expect(evidence.sourceId.length).toBeGreaterThan(0);
      expect(evidence.title.length).toBeGreaterThan(0);
      expect(evidence.url.startsWith("https://")).toBe(true);
      expect(Number.isNaN(Date.parse(evidence.observedAt))).toBe(false);
      expect(evidence.contentFingerprint.length).toBeGreaterThan(0);
      expect(evidence.supports.length).toBeGreaterThan(0);
      expect(typeof evidence.directEvidence).toBe("boolean");
    }
  });
});
