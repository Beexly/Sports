import { describe, it, expect } from "vitest";
import {
  mapClaimToGseOutputs,
  mapClaimToGsnOutputs,
  mapClaimToAllOutputs,
  summarizeOutputReadiness,
} from "../lib/airwave/gse-gsn-output-map";
import type { ClaimCandidate } from "../lib/airwave/claim-extraction-contract";

const BASE_CLAIM: ClaimCandidate = {
  id: "test-001",
  aired_at_ct: "2026-06-11T09:00:00",
  channel: "CH87",
  source_policy_id: "satellite_radio_context",
  show: "Morning Drive",
  segment: "Hour 1",
  speaker: "Host A",
  paraphrased_claim: "Host suggested QB is unlikely to play.",
  sport: "NFL",
  league: "NFL",
  entity: "QB Name",
  entity_type: "player",
  claim_type: "injury_read",
  confidence_language: "EMPHATIC",
  actionability: "HIGH",
  evidence_type: "on_air_statement",
  rights_status: "LICENSED",
  operator_status: "APPROVED",
  source_pointer_private: "ch87/seg-001",
  public_safe: true,
  review_notes: "",
};

describe("GSE / GSN Output Map", () => {
  describe("mapClaimToGseOutputs", () => {
    it("injury_read maps to GSE outputs when approved", () => {
      const outputs = mapClaimToGseOutputs(BASE_CLAIM);
      expect(outputs.length).toBeGreaterThan(0);
      const types = outputs.map((o) => o.outputType);
      expect(types).toContain("injury_readiness_alert");
    });

    it("unfalsifiable_hot_take does NOT map to pick_evidence_candidate", () => {
      const claim: ClaimCandidate = {
        ...BASE_CLAIM,
        claim_type: "unfalsifiable_hot_take",
      };
      const outputs = mapClaimToGseOutputs(claim);
      const types = outputs.map((o) => o.outputType);
      expect(types).not.toContain("pick_evidence_candidate");
    });

    it("DRAFT status claim produces no approved GSE outputs", () => {
      const draftClaim: ClaimCandidate = {
        ...BASE_CLAIM,
        operator_status: "DRAFT",
      };
      const outputs = mapClaimToGseOutputs(draftClaim);
      // DRAFT is not in requiredReviewStatus for most rules
      expect(outputs.filter((o) => o.allowedAudience !== "INTERNAL_ONLY")).toHaveLength(0);
    });

    it("HELD rights status claim produces no outputs", () => {
      const heldClaim: ClaimCandidate = {
        ...BASE_CLAIM,
        rights_status: "HELD",
      };
      const outputs = mapClaimToGseOutputs(heldClaim);
      expect(outputs).toHaveLength(0);
    });

    it("all GSE outputs have sourcePointerPrivate=true", () => {
      const outputs = mapClaimToGseOutputs(BASE_CLAIM);
      for (const output of outputs) {
        expect(output.sourcePointerPrivate).toBe(true);
      }
    });

    it("all GSE outputs are review-gated (not PUBLIC without approval)", () => {
      const draft: ClaimCandidate = { ...BASE_CLAIM, operator_status: "DRAFT" };
      const outputs = mapClaimToGseOutputs(draft);
      for (const output of outputs) {
        // DRAFT should never allow PUBLIC_AFTER_REVIEW
        expect(output.allowedAudience).not.toBe("PUBLIC_AFTER_REVIEW");
      }
    });
  });

  describe("mapClaimToGsnOutputs", () => {
    it("injury_read maps to GSN outputs when approved", () => {
      const outputs = mapClaimToGsnOutputs(BASE_CLAIM);
      expect(outputs.length).toBeGreaterThan(0);
    });

    it("unfalsifiable_hot_take maps to hot_take_ledger_candidate", () => {
      const claim: ClaimCandidate = {
        ...BASE_CLAIM,
        claim_type: "unfalsifiable_hot_take",
        operator_status: "REVIEW",
      };
      const outputs = mapClaimToGsnOutputs(claim);
      const types = outputs.map((o) => o.outputType);
      expect(types).toContain("hot_take_ledger_candidate");
    });

    it("all GSN outputs have sourcePointerPrivate=true", () => {
      const outputs = mapClaimToGsnOutputs(BASE_CLAIM);
      for (const output of outputs) {
        expect(output.sourcePointerPrivate).toBe(true);
      }
    });

    it("GSN outputs are review-gated", () => {
      const outputs = mapClaimToGsnOutputs(BASE_CLAIM);
      expect(outputs.length).toBeGreaterThan(0);
      // Approved claim should produce outputs with REVIEW_QUEUE or INTERNAL_ONLY audience
      for (const output of outputs) {
        expect(["REVIEW_QUEUE", "INTERNAL_ONLY", "PUBLIC_AFTER_REVIEW"]).toContain(
          output.allowedAudience,
        );
      }
    });
  });

  describe("mapClaimToAllOutputs", () => {
    it("produces blocked reasons for DRAFT claims", () => {
      const draftClaim: ClaimCandidate = {
        ...BASE_CLAIM,
        operator_status: "DRAFT",
        public_safe: false,
      };
      const mapping = mapClaimToAllOutputs(draftClaim);
      expect(mapping.blockedReasons.length).toBeGreaterThan(0);
    });

    it("produces no blocked reasons for approved public-safe claims", () => {
      const mapping = mapClaimToAllOutputs(BASE_CLAIM);
      expect(mapping.blockedReasons).toHaveLength(0);
    });

    it("reviewRequired is true for draft claims", () => {
      const draftClaim: ClaimCandidate = {
        ...BASE_CLAIM,
        operator_status: "DRAFT",
        public_safe: false,
      };
      const mapping = mapClaimToAllOutputs(draftClaim);
      expect(mapping.reviewRequired).toBe(true);
    });

    it("HELD rights produces blocked reason", () => {
      const heldClaim: ClaimCandidate = {
        ...BASE_CLAIM,
        rights_status: "HELD",
        public_safe: false,
      };
      const mapping = mapClaimToAllOutputs(heldClaim);
      expect(mapping.blockedReasons.some((r) => r.includes("HELD"))).toBe(true);
    });
  });

  describe("summarizeOutputReadiness", () => {
    it("returns zero counts for empty array", () => {
      const summary = summarizeOutputReadiness([]);
      expect(summary.totalCandidates).toBe(0);
      expect(summary.gseReady).toBe(0);
      expect(summary.gsnReady).toBe(0);
    });

    it("includes forbidden actions", () => {
      const summary = summarizeOutputReadiness([BASE_CLAIM]);
      expect(summary.forbiddenActions).toContain("pick_evidence_from_unfalsifiable_claim");
      expect(summary.forbiddenActions).toContain("auto_publish_any_output");
      expect(summary.forbiddenActions).toContain("source_pointer_in_public_output");
    });

    it("counts public safe claims", () => {
      const summary = summarizeOutputReadiness([BASE_CLAIM]);
      expect(summary.publicSafe).toBe(1);
    });

    it("blocked claim reduces available counts", () => {
      const heldClaim: ClaimCandidate = {
        ...BASE_CLAIM,
        rights_status: "HELD",
        public_safe: false,
      };
      const summary = summarizeOutputReadiness([heldClaim]);
      expect(summary.blocked).toBe(1);
    });
  });
});
