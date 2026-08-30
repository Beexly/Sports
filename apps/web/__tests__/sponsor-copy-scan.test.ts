import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { assertCommercialCopySafe, buildOfferCopyDraft, dailyOutreachTarget, scanCommercialCopy } from "@/lib/revenue";

const repoRoot = resolve(__dirname, "..", "..", "..");

describe("commercial copy and docs", () => {
  it("passes neutral partner copy", () => {
    const scan = scanCommercialCopy("Partner mention is disclosed, manual-reviewed, and educational.");

    expect(scan.ok).toBe(true);
    expect(scan.blockedTerms).toEqual([]);
  });

  it("blocks banned or evidence-required commercial copy", () => {
    expect(scanCommercialCopy("This is a sure thing.").ok).toBe(false);
    expect(scanCommercialCopy("Verified ROI requires evidence.").ok).toBe(false);
  });

  it("throws for unsafe copy", () => {
    expect(() => assertCommercialCopySafe("This has proven profit.")).toThrow(/Unsafe commercial copy/);
  });

  it("builds a disclosed offer draft without live links", () => {
    const draft = buildOfferCopyDraft(
      {
        allowedSurfaces: ["newsletter"],
        approvalStatus: "approved",
        category: "creator_tool",
        disclosureRequired: true,
        displayName: "Creator Tool",
        id: "creator_tool",
      },
      {
        allowedSurfaces: ["newsletter"],
        approvalStatus: "approved",
        category: "creator_tool",
        disclosureText: "Affiliate disclosure: GSE may earn a commission.",
        id: "offer",
        partnerId: "creator_tool",
        publicName: "Workflow review",
        riskClass: "low",
      },
    );

    expect(draft.ok).toBe(true);
    expect(draft.disclosure).toContain("Affiliate disclosure");
    expect(draft.body).not.toContain("http");
  });

  it("fails closed when the offer has no usable disclosure", () => {
    const draft = buildOfferCopyDraft(
      {
        allowedSurfaces: ["newsletter"],
        approvalStatus: "approved",
        category: "creator_tool",
        disclosureRequired: true,
        displayName: "Creator Tool",
        id: "creator_tool",
      },
      {
        allowedSurfaces: ["newsletter"],
        approvalStatus: "approved",
        category: "creator_tool",
        id: "offer",
        partnerId: "creator_tool",
        publicName: "Workflow review",
        riskClass: "low",
      },
    );

    // No disclosureText -> placeholder disclosure that names no commercial
    // relationship. The banned-term scan is clean, but ok must not signal
    // publish-readiness while the emitted disclosure would fail the policy.
    expect(draft.ok).toBe(false);
    expect(draft.warnings.some((warning) => warning.toLowerCase().includes("disclosure"))).toBe(true);
  });

  it("keeps the daily outreach target at 10 messages", () => {
    expect(dailyOutreachTarget()).toBe(10);
  });

  it("adds the commercial and revenue docs as repo-visible contracts", () => {
    for (const file of [
      "docs/commercial/COMMERCIALIZATION_DOCTRINE.md",
      "docs/commercial/REVENUE_RISK_REGISTER.md",
      "docs/revenue/OFFER_COMPLIANCE_CHECKLIST.md",
      "docs/revenue/RESPONSIBLE_GAMING_PARTNER_POLICY.md",
    ]) {
      expect(readFileSync(resolve(repoRoot, file), "utf8").length).toBeGreaterThan(500);
    }
  });
});
