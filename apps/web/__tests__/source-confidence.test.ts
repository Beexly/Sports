import { describe, it, expect } from "vitest";
import { deriveSourceConfidence } from "@/lib/data-sources/source-confidence";

describe("source-confidence: derivation", () => {
  it("no-fake-live-data invariant always holds", () => {
    const cases = [
      deriveSourceConfidence({ cost: "free", status: "wired" }),
      deriveSourceConfidence({ cost: "licensed", status: "planned", rightsStatus: "excluded" }),
      deriveSourceConfidence({ cost: "free", status: "manual-ingest", rightsStatus: "permission_required" }),
    ];
    for (const c of cases) expect(c.noFakeLiveData).toBe(true);
  });

  it("approved open-license + wired ⇒ high rights/license/source/freshness, low uncertainty", () => {
    const c = deriveSourceConfidence({ cost: "free", status: "wired", rightsStatus: "approved_open_license", providerWired: true });
    expect(c.rightsConfidence).toBe("high");
    expect(c.licenseConfidence).toBe("high");
    expect(c.sourceConfidence).toBe("high");
    expect(c.freshnessConfidence).toBe("high");
    expect(c.uncertainty).toBe("low");
    expect(c.ownerApprovalRequired).toBe(false);
  });

  it("permission_required ⇒ owner approval required + low rights confidence + high uncertainty", () => {
    const c = deriveSourceConfidence({ cost: "free", status: "manual-ingest", rightsStatus: "permission_required" });
    expect(c.rightsConfidence).toBe("low");
    expect(c.ownerApprovalRequired).toBe(true);
    expect(c.uncertainty).toBe("high");
    expect(c.limitations.length).toBeGreaterThan(0);
  });

  it("vendor_candidate ⇒ gated (owner approval) and license unverified", () => {
    const c = deriveSourceConfidence({ cost: "paid-optional", status: "adapter-ready", rightsStatus: "vendor_candidate" });
    expect(c.ownerApprovalRequired).toBe(true);
    expect(c.licenseConfidence).toBe("low");
  });

  it("a failing live provider lowers source/freshness and is flagged in limitations", () => {
    const c = deriveSourceConfidence({ cost: "free", status: "wired", rightsStatus: "approved_api", providerWired: false });
    expect(c.sourceConfidence).toBe("medium");
    expect(c.freshnessConfidence).toBe("medium");
    expect(c.limitations.some((l) => /provider/i.test(l))).toBe(true);
  });

  it("unknown rights ⇒ unknown rights/license and high uncertainty", () => {
    const c = deriveSourceConfidence({ cost: "free", status: "planned" });
    expect(c.rightsConfidence).toBe("unknown");
    expect(c.uncertainty).toBe("high");
  });
});
