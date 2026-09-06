import { describe, it, expect } from "vitest";
import {
  checkClaimConsistency,
  isClaimStale,
  claimStalenessWindowHours,
  CLAIM_TYPE_STALENESS_CATEGORY,
} from "@/lib/airwave/claim-consistency-check";
import type { ClaimCandidate } from "@/lib/airwave/claim-extraction-contract";

const NOW = new Date("2026-09-06T12:00:00Z");

function claim(overrides: Partial<ClaimCandidate>): ClaimCandidate {
  return {
    id: "claim-default",
    aired_at_ct: "2026-09-06T10:00:00Z",
    channel: "CH87",
    source_policy_id: "satellite_radio_context",
    show: "Morning Drive",
    segment: "seg-01",
    speaker: "Alex Smith",
    paraphrased_claim: "Speaker discussed the player's practice status.",
    sport: "NFL",
    league: "NFL",
    entity: "Jane Runner",
    entity_type: "player",
    claim_type: "injury_read",
    confidence_language: "LEAN",
    actionability: "HIGH",
    evidence_type: "on_air_statement",
    rights_status: "LICENSED",
    operator_status: "DRAFT",
    source_pointer_private: "seg-01-clip",
    public_safe: false,
    review_notes: "",
    ...overrides,
  };
}

describe("claim-consistency-check", () => {
  describe("policy", () => {
    it("is read-only and never claims to inspect claim text for contradiction", () => {
      const report = checkClaimConsistency([], NOW);
      expect(report.policy.readOnly).toBe(true);
      expect(report.policy.mutatesOperatorStatus).toBe(false);
      expect(report.policy.autoAppliesNothing).toBe(true);
      expect(report.policy.inspectsClaimTextForContradiction).toBe(false);
    });

    it("returns an empty report for no claims", () => {
      const report = checkClaimConsistency([], NOW);
      expect(report.totalClaimsChecked).toBe(0);
      expect(report.findings).toHaveLength(0);
    });
  });

  describe("staleness (one shared definition)", () => {
    it("categorizes fast/slow/stable/scheduled claim types as documented", () => {
      expect(CLAIM_TYPE_STALENESS_CATEGORY.injury_read).toBe("fast");
      expect(CLAIM_TYPE_STALENESS_CATEGORY.usage_trend).toBe("slow");
      expect(CLAIM_TYPE_STALENESS_CATEGORY.ranking_tier).toBe("stable");
      expect(CLAIM_TYPE_STALENESS_CATEGORY.narrative_only).toBe("scheduled");
    });

    it("a fresh fast-category claim is not stale", () => {
      const c = claim({ aired_at_ct: "2026-09-06T11:00:00Z", claim_type: "injury_read" });
      expect(isClaimStale(c, NOW)).toBe(false);
    });

    it("a fast-category claim older than its window is stale", () => {
      const c = claim({ aired_at_ct: "2026-09-01T00:00:00Z", claim_type: "injury_read" });
      expect(isClaimStale(c, NOW)).toBe(true);
    });

    it("a slow-category claim of the same age is NOT yet stale", () => {
      const c = claim({ aired_at_ct: "2026-09-01T00:00:00Z", claim_type: "usage_trend" });
      expect(isClaimStale(c, NOW)).toBe(false);
    });

    it("never fabricates a verdict on an unparseable timestamp", () => {
      const c = claim({ aired_at_ct: "not-a-date" });
      expect(isClaimStale(c, NOW)).toBe(false);
    });

    it("scheduled/narrative claim types never go stale", () => {
      expect(claimStalenessWindowHours("narrative_only")).toBe(Number.POSITIVE_INFINITY);
      const c = claim({ aired_at_ct: "2020-01-01T00:00:00Z", claim_type: "narrative_only" });
      expect(isClaimStale(c, NOW)).toBe(false);
    });
  });

  describe("supersession candidates", () => {
    it("flags an older live claim when a newer one exists for the same entity+claim_type", () => {
      const older = claim({ id: "c-old", aired_at_ct: "2026-09-01T00:00:00Z", operator_status: "APPROVED" });
      const newer = claim({ id: "c-new", aired_at_ct: "2026-09-05T00:00:00Z", operator_status: "DRAFT" });
      const report = checkClaimConsistency([older, newer], NOW);

      const finding = report.findings.find((f) => f.kind === "supersession_candidate");
      expect(finding).toBeDefined();
      expect(finding!.claimIds).toEqual(["c-old", "c-new"]);
      expect(finding!.recommendedAction).toBe("route_to_review");
      expect(finding!.detector).toBe("arrival");
      expect(report.supersessionCandidates).toBe(1);
    });

    it("never auto-applies — recommendedAction is always route_to_review for supersession, never a made-up 'auto_apply'", () => {
      const older = claim({ id: "c-old", aired_at_ct: "2026-09-01T00:00:00Z" });
      const newer = claim({ id: "c-new", aired_at_ct: "2026-09-05T00:00:00Z" });
      const report = checkClaimConsistency([older, newer], NOW);
      for (const f of report.findings.filter((x) => x.kind === "supersession_candidate")) {
        expect(f.recommendedAction).toBe("route_to_review");
      }
    });

    it("does not flag claims about different entities", () => {
      const a = claim({ id: "c-a", entity: "Jane Runner", aired_at_ct: "2026-09-01T00:00:00Z" });
      const b = claim({ id: "c-b", entity: "John Blocker", aired_at_ct: "2026-09-05T00:00:00Z" });
      const report = checkClaimConsistency([a, b], NOW);
      expect(report.supersessionCandidates).toBe(0);
    });

    it("does not flag a REJECTED or SETTLED claim as a live supersession candidate", () => {
      const rejected = claim({ id: "c-rej", aired_at_ct: "2026-09-01T00:00:00Z", operator_status: "REJECTED" });
      const settled = claim({ id: "c-set", aired_at_ct: "2026-09-02T00:00:00Z", operator_status: "SETTLED" });
      const newer = claim({ id: "c-new", aired_at_ct: "2026-09-05T00:00:00Z", operator_status: "DRAFT" });
      const report = checkClaimConsistency([rejected, settled, newer], NOW);
      expect(report.supersessionCandidates).toBe(0);
    });
  });

  describe("competing unresolved claims", () => {
    it("flags 2+ unresolved claims about the same entity+claim_type at once", () => {
      const a = claim({ id: "c-a", operator_status: "DRAFT", aired_at_ct: "2026-09-05T00:00:00Z" });
      const b = claim({ id: "c-b", operator_status: "REVIEW", aired_at_ct: "2026-09-05T01:00:00Z" });
      const report = checkClaimConsistency([a, b], NOW);

      const finding = report.findings.find((f) => f.kind === "competing_unresolved");
      expect(finding).toBeDefined();
      expect(finding!.claimIds.sort()).toEqual(["c-a", "c-b"]);
      expect(finding!.detector).toBe("human");
      expect(report.competingUnresolved).toBe(1);
    });

    it("does not flag a single unresolved claim", () => {
      const a = claim({ id: "c-a", operator_status: "DRAFT" });
      const report = checkClaimConsistency([a], NOW);
      expect(report.competingUnresolved).toBe(0);
    });
  });

  describe("stale_unresolved", () => {
    it("flags the newest claim in a group when it is APPROVED and past its staleness window with nothing newer", () => {
      const stale = claim({
        id: "c-stale",
        claim_type: "injury_read",
        operator_status: "APPROVED",
        aired_at_ct: "2026-09-01T00:00:00Z",
      });
      const report = checkClaimConsistency([stale], NOW);

      const finding = report.findings.find((f) => f.kind === "stale_unresolved");
      expect(finding).toBeDefined();
      expect(finding!.claimIds).toEqual(["c-stale"]);
      expect(finding!.recommendedAction).toBe("advisory_only");
      expect(finding!.detector).toBe("aged");
    });

    it("does not flag a DRAFT claim as stale_unresolved (only APPROVED claims sitting unsuperseded)", () => {
      const stale = claim({
        id: "c-stale",
        claim_type: "injury_read",
        operator_status: "DRAFT",
        aired_at_ct: "2026-09-01T00:00:00Z",
      });
      const report = checkClaimConsistency([stale], NOW);
      expect(report.staleUnresolved).toBe(0);
    });

    it("does not flag a fresh APPROVED claim", () => {
      const fresh = claim({
        id: "c-fresh",
        claim_type: "injury_read",
        operator_status: "APPROVED",
        aired_at_ct: "2026-09-06T11:00:00Z",
      });
      const report = checkClaimConsistency([fresh], NOW);
      expect(report.staleUnresolved).toBe(0);
    });
  });

  describe("REJECTED/SETTLED claims are excluded from all checks", () => {
    it("a REJECTED claim contributes no findings on its own", () => {
      const rejected = claim({
        id: "c-rej",
        operator_status: "REJECTED",
        aired_at_ct: "2020-01-01T00:00:00Z",
      });
      const report = checkClaimConsistency([rejected], NOW);
      expect(report.findings).toHaveLength(0);
    });
  });
});
