import { describe, expect, it } from "vitest";
import { scanMediaClaimText } from "@/lib/media-revenue/claim-safety";

describe("media revenue claim safety", () => {
  it("blocks banned phrases", () => {
    const result = scanMediaClaimText("This is a sure thing and you should hammer this.");

    expect(result.ok).toBe(false);
    expect(result.blockedHits).toContain("sure thing");
    expect(result.blockedHits).toContain("hammer this");
  });

  it("warns on evidence-required phrases without automatically blocking", () => {
    const result = scanMediaClaimText("We need evidence before saying verified win rate or ROI.");

    expect(result.ok).toBe(true);
    expect(result.evidenceRequiredHits).toContain("win rate");
    expect(result.evidenceRequiredHits).toContain("roi");
    expect(result.warnings[0]).toContain("Evidence-required language");
  });

  it("passes neutral educational copy", () => {
    const result = scanMediaClaimText("No bet can be a decision when the evidence is weak.");

    expect(result.ok).toBe(true);
    expect(result.blockedHits).toEqual([]);
    expect(result.evidenceRequiredHits).toEqual([]);
  });

  it("flags calibrated probability language for threshold evidence", () => {
    const result = scanMediaClaimText("This segment explains calibrated probability.");

    expect(result.ok).toBe(true);
    expect(result.warnings.join(" ")).toContain("calibration-threshold evidence");
  });

  it("blocks risk-free and risk free variants", () => {
    expect(scanMediaClaimText("risk-free offer").blockedHits).toContain("risk-free");
    expect(scanMediaClaimText("risk free offer").blockedHits).toContain("risk free");
  });
});
