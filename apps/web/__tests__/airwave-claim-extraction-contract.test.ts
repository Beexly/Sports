import { describe, it, expect } from "vitest";
import {
  validateClaimCandidate,
  redactClaimCandidateForPublic,
  isClaimCandidateGseRelevant,
  isClaimCandidateGsnRelevant,
  type ClaimCandidate,
} from "../lib/airwave/claim-extraction-contract";

const VALID_CLAIM: ClaimCandidate = {
  id: "test-001",
  aired_at_ct: "2026-06-11T09:00:00",
  channel: "CH87",
  source_policy_id: "satellite_radio_context",
  show: "Morning Drive (Sample)",
  segment: "Hour 1",
  speaker: "Host A",
  paraphrased_claim: "Host suggested the starting QB is unlikely to play Sunday.",
  sport: "NFL",
  league: "NFL",
  entity: "Starting QB",
  entity_type: "player",
  claim_type: "injury_read",
  confidence_language: "EMPHATIC",
  actionability: "HIGH",
  evidence_type: "on_air_statement",
  rights_status: "LICENSED",
  operator_status: "APPROVED",
  source_pointer_private: "ch87/seg-2026-06-11/morning-drive/00:42",
  public_safe: true,
  review_notes: "Verified against injury report.",
};

const DRAFT_CLAIM: ClaimCandidate = {
  ...VALID_CLAIM,
  id: "test-002",
  operator_status: "DRAFT",
  public_safe: false,
};

describe("Claim Extraction Contract", () => {
  describe("validateClaimCandidate", () => {
    it("accepts a valid claim", () => {
      const result = validateClaimCandidate(VALID_CLAIM);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("requires paraphrased_claim", () => {
      const result = validateClaimCandidate({ ...VALID_CLAIM, paraphrased_claim: "" });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("paraphrased_claim"))).toBe(true);
    });

    it("requires rights_status", () => {
      const result = validateClaimCandidate({
        ...VALID_CLAIM,
        rights_status: undefined as unknown as ClaimCandidate["rights_status"],
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("rights_status"))).toBe(true);
    });

    it("requires operator_status", () => {
      const result = validateClaimCandidate({
        ...VALID_CLAIM,
        operator_status: undefined as unknown as ClaimCandidate["operator_status"],
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("operator_status"))).toBe(true);
    });

    it("rejects raw_audio_url field", () => {
      const withForbidden = {
        ...VALID_CLAIM,
        raw_audio_url: "s3://bucket/file.mp3",
      } as unknown as ClaimCandidate;
      const result = validateClaimCandidate(withForbidden);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("raw_audio_url"))).toBe(true);
    });

    it("rejects public_verbatim_transcript field", () => {
      const withForbidden = {
        ...VALID_CLAIM,
        public_verbatim_transcript: "Full verbatim text...",
      } as unknown as ClaimCandidate;
      const result = validateClaimCandidate(withForbidden);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("public_verbatim_transcript"))).toBe(true);
    });

    it("rejects full_quote field", () => {
      const withForbidden = {
        ...VALID_CLAIM,
        full_quote: "He said...",
      } as unknown as ClaimCandidate;
      const result = validateClaimCandidate(withForbidden);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("full_quote"))).toBe(true);
    });

    it("rejects public_safe=true when operator_status is DRAFT", () => {
      const result = validateClaimCandidate({
        ...VALID_CLAIM,
        operator_status: "DRAFT",
        public_safe: true,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("public_safe"))).toBe(true);
    });

    it("rejects public_safe=true when rights_status is HELD", () => {
      const result = validateClaimCandidate({
        ...VALID_CLAIM,
        rights_status: "HELD",
        public_safe: true,
      });
      expect(result.valid).toBe(false);
    });
  });

  describe("redactClaimCandidateForPublic", () => {
    it("returns null for a draft claim", () => {
      const result = redactClaimCandidateForPublic(DRAFT_CLAIM);
      expect(result).toBeNull();
    });

    it("returns null when public_safe is false", () => {
      const unsafeClaim: ClaimCandidate = { ...VALID_CLAIM, public_safe: false };
      const result = redactClaimCandidateForPublic(unsafeClaim);
      expect(result).toBeNull();
    });

    it("strips source_pointer_private from public output", () => {
      const result = redactClaimCandidateForPublic(VALID_CLAIM);
      expect(result).not.toBeNull();
      expect("source_pointer_private" in (result ?? {})).toBe(false);
    });

    it("strips review_notes from public output", () => {
      const result = redactClaimCandidateForPublic(VALID_CLAIM);
      expect("review_notes" in (result ?? {})).toBe(false);
    });

    it("strips channel from public output", () => {
      const result = redactClaimCandidateForPublic(VALID_CLAIM);
      expect("channel" in (result ?? {})).toBe(false);
    });

    it("retains paraphrased_claim in public output", () => {
      const result = redactClaimCandidateForPublic(VALID_CLAIM);
      expect(result?.paraphrased_claim).toBe(VALID_CLAIM.paraphrased_claim);
    });

    it("does not contain source_pointer_private in JSON", () => {
      const result = redactClaimCandidateForPublic(VALID_CLAIM);
      const json = JSON.stringify(result);
      expect(json).not.toContain("source_pointer_private");
      expect(json).not.toContain("ch87/seg");
    });
  });

  describe("GSE / GSN relevance", () => {
    it("injury_read is GSE relevant", () => {
      expect(isClaimCandidateGseRelevant({ ...VALID_CLAIM, claim_type: "injury_read" })).toBe(true);
    });

    it("unfalsifiable_hot_take is NOT GSE relevant", () => {
      expect(
        isClaimCandidateGseRelevant({ ...VALID_CLAIM, claim_type: "unfalsifiable_hot_take" }),
      ).toBe(false);
    });

    it("unfalsifiable_hot_take IS GSN relevant", () => {
      expect(
        isClaimCandidateGsnRelevant({ ...VALID_CLAIM, claim_type: "unfalsifiable_hot_take" }),
      ).toBe(true);
    });

    it("narrative_only is NOT GSE relevant", () => {
      expect(
        isClaimCandidateGseRelevant({ ...VALID_CLAIM, claim_type: "narrative_only" }),
      ).toBe(false);
    });

    it("dfs_value is GSE relevant", () => {
      expect(isClaimCandidateGseRelevant({ ...VALID_CLAIM, claim_type: "dfs_value" })).toBe(true);
    });
  });
});
