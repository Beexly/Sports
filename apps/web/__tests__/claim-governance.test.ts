import { describe, it, expect, vi } from "vitest";

vi.mock("@sports/db", () => ({
  db: {
    publicClaim: { create: vi.fn(), updateMany: vi.fn() },
  },
  Prisma: {},
}));

vi.mock("@/lib/signal-ledger", () => ({
  CALIBRATION_GATE_THRESHOLD: 30,
  CONFIDENCE_BANDS: [],
  recordPickPublished: vi.fn(),
  recordSettlement: vi.fn(),
  listModelVersions: vi.fn(),
  getCalibrationReport: vi.fn(),
}));

import {
  evaluateClaimApproval,
  type ClaimEvidenceSummary,
} from "@/lib/claim-governance";
import type { CalibrationReport } from "@/lib/signal-ledger";

const COMPUTED_AT = new Date("2026-05-28T10:00:00Z");

const GATE_CLEARED_REPORT: CalibrationReport = {
  modelVersion: "v5.0.0",
  totalSettled: 30,
  gateCleared: true,
  bands: [],
  computedAt: COMPUTED_AT,
};

const GATE_PENDING_REPORT: CalibrationReport = {
  modelVersion: "v5.0.0",
  totalSettled: 12,
  gateCleared: false,
  bands: [],
  computedAt: COMPUTED_AT,
};

function ev(overrides: Partial<ClaimEvidenceSummary> = {}): ClaimEvidenceSummary {
  return {
    claimType: "informational",
    evidenceIds: ["ev-1"],
    sourceTiers: [1],
    ...overrides,
  };
}

describe("evaluateClaimApproval — pure governance function", () => {
  it("rejects any claim with no evidence IDs", () => {
    const result = evaluateClaimApproval(ev({ evidenceIds: [] }));
    expect(result.verdict).toBe("REJECTED");
    expect(result.rejectionCode).toBe("NO_EVIDENCE");
  });

  it("approves informational claim with tier-1 evidence", () => {
    const result = evaluateClaimApproval(ev({ claimType: "informational", sourceTiers: [1] }));
    expect(result.verdict).toBe("APPROVED");
  });

  it("approves injury_status and line_movement without calibration", () => {
    expect(evaluateClaimApproval(ev({ claimType: "injury_status" })).verdict).toBe("APPROVED");
    expect(evaluateClaimApproval(ev({ claimType: "line_movement" })).verdict).toBe("APPROVED");
    expect(evaluateClaimApproval(ev({ claimType: "odds_snapshot" })).verdict).toBe("APPROVED");
    expect(evaluateClaimApproval(ev({ claimType: "public_lean" })).verdict).toBe("APPROVED");
  });

  describe("win_rate claims", () => {
    it("rejects win_rate when calibration gate not cleared", () => {
      const result = evaluateClaimApproval(
        ev({ claimType: "win_rate", calibrationReport: GATE_PENDING_REPORT })
      );
      expect(result.verdict).toBe("REJECTED");
      expect(result.rejectionCode).toBe("WINRATE_GATE_NOT_CLEARED");
    });

    it("rejects win_rate when no calibration report provided", () => {
      const result = evaluateClaimApproval(ev({ claimType: "win_rate" }));
      expect(result.verdict).toBe("REJECTED");
      expect(result.rejectionCode).toBe("WINRATE_GATE_NOT_CLEARED");
    });

    it("approves win_rate when gate is cleared", () => {
      const result = evaluateClaimApproval(
        ev({ claimType: "win_rate", calibrationReport: GATE_CLEARED_REPORT })
      );
      expect(result.verdict).toBe("APPROVED");
    });
  });

  describe("accuracy claims", () => {
    it("rejects accuracy when gate not cleared", () => {
      const result = evaluateClaimApproval(
        ev({ claimType: "accuracy", calibrationReport: GATE_PENDING_REPORT })
      );
      expect(result.verdict).toBe("REJECTED");
      expect(result.rejectionCode).toBe("ACCURACY_GATE_NOT_CLEARED");
    });

    it("approves accuracy when gate is cleared", () => {
      const result = evaluateClaimApproval(
        ev({ claimType: "accuracy", calibrationReport: GATE_CLEARED_REPORT })
      );
      expect(result.verdict).toBe("APPROVED");
    });
  });

  describe("sharp_action claims", () => {
    it("rejects sharp_action with tier-3+ sources only", () => {
      const result = evaluateClaimApproval(
        ev({ claimType: "sharp_action", sourceTiers: [3, 4] })
      );
      expect(result.verdict).toBe("REJECTED");
      expect(result.rejectionCode).toBe("SHARP_ACTION_TIER_INSUFFICIENT");
    });

    it("approves sharp_action when at least one tier-1 or tier-2 source", () => {
      expect(
        evaluateClaimApproval(ev({ claimType: "sharp_action", sourceTiers: [1] })).verdict
      ).toBe("APPROVED");
      expect(
        evaluateClaimApproval(ev({ claimType: "sharp_action", sourceTiers: [2, 3] })).verdict
      ).toBe("APPROVED");
    });
  });

  describe("rumor claims", () => {
    it("rejects rumor backed only by tier-3+ sources", () => {
      const result = evaluateClaimApproval(
        ev({ claimType: "rumor", sourceTiers: [3] })
      );
      expect(result.verdict).toBe("REJECTED");
      expect(result.rejectionCode).toBe("RUMOR_TIER_INSUFFICIENT");
    });

    it("approves rumor with tier-2 source", () => {
      expect(
        evaluateClaimApproval(ev({ claimType: "rumor", sourceTiers: [2] })).verdict
      ).toBe("APPROVED");
    });
  });
});
