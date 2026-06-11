import { describe, it, expect } from "vitest";
import {
  validateClaimBatchJson,
  validateClaimBatchCsv,
} from "@/lib/airwave/claim-batch-validator";

const VALID_CLAIM = {
  id: "claim-001",
  aired_at_ct: "2026-06-11T10:00:00",
  channel: "CH87",
  source_policy_id: "satellite_radio_context",
  show: "Morning Drive",
  segment: "seg-01",
  speaker: "Alex Smith",
  paraphrased_claim: "Speaker suggested the running back may see increased carries this week.",
  sport: "NFL",
  league: "NFL",
  entity: "running back",
  entity_type: "player",
  claim_type: "usage_trend",
  confidence_language: "LEAN",
  actionability: "HIGH",
  evidence_type: "on_air_statement",
  rights_status: "LICENSED",
  operator_status: "DRAFT",
  source_pointer_private: "seg-01-clip",
  public_safe: false,
  review_notes: "",
};

const VALID_CSV = `id,aired_at_ct,channel,source_policy_id,show,segment,speaker,paraphrased_claim,sport,league,entity,entity_type,claim_type,confidence_language,actionability,evidence_type,rights_status,operator_status,source_pointer_private,public_safe,review_notes
claim-001,2026-06-11T10:00:00,CH87,satellite_radio_context,Morning Drive,seg-01,Alex Smith,Speaker said running back may get more carries.,NFL,NFL,running back,player,usage_trend,LEAN,HIGH,on_air_statement,LICENSED,DRAFT,seg-01-clip,false,`;

describe("Claim Batch Validator", () => {
  describe("policy enforcement", () => {
    it("always returns validatesOnly=true and no write/capture/publish flags", () => {
      const result = validateClaimBatchJson([]);
      expect(result.policy.validatesOnly).toBe(true);
      expect(result.policy.writesDatabase).toBe(false);
      expect(result.policy.capturesAudio).toBe(false);
      expect(result.policy.publishesOutput).toBe(false);
      expect(result.policy.sourcePointerPrivateNeverLeaks).toBe(true);
    });
  });

  describe("validateClaimBatchJson — valid input", () => {
    it("accepts a valid single claim", () => {
      const result = validateClaimBatchJson([VALID_CLAIM]);
      expect(result.totalRows).toBe(1);
      expect(result.validRows).toBe(1);
      expect(result.invalidRows).toBe(0);
      expect(result.rows[0]!.valid).toBe(true);
      expect(result.rows[0]!.errors).toHaveLength(0);
    });

    it("classifies DRAFT status correctly", () => {
      const result = validateClaimBatchJson([VALID_CLAIM]);
      expect(result.byStatus.DRAFT).toBe(1);
      expect(result.byStatus.APPROVED).toBe(0);
    });

    it("marks usage_trend as GSE-relevant", () => {
      const result = validateClaimBatchJson([VALID_CLAIM]);
      expect(result.rows[0]!.gseRelevant).toBe(true);
      expect(result.gseReadyRows).toBe(1);
    });

    it("marks usage_trend as GSN-relevant", () => {
      const result = validateClaimBatchJson([VALID_CLAIM]);
      expect(result.rows[0]!.gsnRelevant).toBe(true);
    });

    it("does not mark DRAFT claim as public safe", () => {
      const result = validateClaimBatchJson([VALID_CLAIM]);
      expect(result.rows[0]!.publicSafe).toBe(false);
      expect(result.rows[0]!.publicProjection).toBeNull();
      expect(result.publicSafeRows).toBe(0);
    });

    it("marks APPROVED + public_safe=true claim as public safe with projection", () => {
      const approved = {
        ...VALID_CLAIM,
        operator_status: "APPROVED",
        rights_status: "LICENSED",
        public_safe: true,
      };
      const result = validateClaimBatchJson([approved]);
      expect(result.rows[0]!.publicSafe).toBe(true);
      expect(result.rows[0]!.publicProjection).not.toBeNull();
      expect(result.publicSafeRows).toBe(1);
    });

    it("public projection does not carry source_pointer_private", () => {
      const approved = {
        ...VALID_CLAIM,
        operator_status: "APPROVED",
        rights_status: "LICENSED",
        public_safe: true,
      };
      const result = validateClaimBatchJson([approved]);
      const projection = result.rows[0]!.publicProjection!;
      expect("source_pointer_private" in projection).toBe(false);
    });

    it("handles empty array", () => {
      const result = validateClaimBatchJson([]);
      expect(result.totalRows).toBe(0);
      expect(result.validRows).toBe(0);
    });

    it("processes multiple claims and counts correctly", () => {
      const draft = { ...VALID_CLAIM, id: "c1" };
      const approved = { ...VALID_CLAIM, id: "c2", operator_status: "APPROVED", rights_status: "LICENSED", public_safe: true };
      const review = { ...VALID_CLAIM, id: "c3", operator_status: "REVIEW" };
      const result = validateClaimBatchJson([draft, approved, review]);
      expect(result.totalRows).toBe(3);
      expect(result.validRows).toBe(3);
      expect(result.byStatus.DRAFT).toBe(1);
      expect(result.byStatus.APPROVED).toBe(1);
      expect(result.byStatus.REVIEW).toBe(1);
    });

    it("includes generatedAt timestamp", () => {
      const now = new Date("2026-06-11T12:00:00.000Z");
      const result = validateClaimBatchJson([VALID_CLAIM], now);
      expect(result.generatedAt).toBe("2026-06-11T12:00:00.000Z");
    });
  });

  describe("validateClaimBatchJson — invalid input", () => {
    it("rejects claim with missing id", () => {
      const bad = { ...VALID_CLAIM, id: "" };
      const result = validateClaimBatchJson([bad]);
      expect(result.rows[0]!.valid).toBe(false);
      expect(result.rows[0]!.errors.some((e) => e.includes("id"))).toBe(true);
    });

    it("rejects claim with empty paraphrased_claim", () => {
      const bad = { ...VALID_CLAIM, paraphrased_claim: "" };
      const result = validateClaimBatchJson([bad]);
      expect(result.rows[0]!.valid).toBe(false);
      expect(result.rows[0]!.errors.some((e) => e.includes("paraphrased_claim"))).toBe(true);
    });

    it("rejects claim with raw_audio_url field", () => {
      const bad = { ...VALID_CLAIM, raw_audio_url: "s3://audio.mp3" };
      const result = validateClaimBatchJson([bad]);
      expect(result.rows[0]!.valid).toBe(false);
      expect(result.rows[0]!.errors.some((e) => e.includes("FORBIDDEN"))).toBe(true);
    });

    it("rejects claim with public_verbatim_transcript field", () => {
      const bad = { ...VALID_CLAIM, public_verbatim_transcript: "verbatim text" };
      const result = validateClaimBatchJson([bad]);
      expect(result.rows[0]!.valid).toBe(false);
    });

    it("rejects public_safe=true with DRAFT operator_status", () => {
      const bad = { ...VALID_CLAIM, public_safe: true, operator_status: "DRAFT" };
      const result = validateClaimBatchJson([bad]);
      expect(result.rows[0]!.valid).toBe(false);
      expect(result.rows[0]!.errors.some((e) => e.includes("public_safe"))).toBe(true);
    });

    it("counts invalid rows in invalidRows", () => {
      const good = { ...VALID_CLAIM, id: "good" };
      const bad = { ...VALID_CLAIM, id: "", paraphrased_claim: "" };
      const result = validateClaimBatchJson([good, bad]);
      expect(result.validRows).toBe(1);
      expect(result.invalidRows).toBe(1);
    });
  });

  describe("validateClaimBatchCsv", () => {
    it("parses valid CSV and validates claims", () => {
      const result = validateClaimBatchCsv(VALID_CSV);
      expect(result.source).toBe("csv");
      expect(result.totalRows).toBe(1);
      expect(result.validRows).toBe(1);
    });

    it("marks usage_trend claim as GSE-relevant from CSV", () => {
      const result = validateClaimBatchCsv(VALID_CSV);
      expect(result.gseReadyRows).toBe(1);
    });

    it("handles empty CSV (header only)", () => {
      const csv = "id,aired_at_ct,channel,source_policy_id,show,speaker,paraphrased_claim,sport,entity,claim_type,rights_status,operator_status";
      const result = validateClaimBatchCsv(csv);
      expect(result.totalRows).toBe(0);
    });

    it("reports row index 1-based in row results", () => {
      const result = validateClaimBatchCsv(VALID_CSV);
      expect(result.rows[0]!.rowIndex).toBe(1);
    });
  });
});
