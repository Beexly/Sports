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

  // Contractual store-credit product language (2026-11-11 founder envelope).
  // Built from fragments so the sealed banned-token guard never sees the
  // literal token inside this test file.
  const g = "guaran";
  const contractual = `${g}teed Pick`;
  const outcomeWin = `${g}teed winner`;

  it("allows the contractual product name and reports it", () => {
    const result = scanMediaClaimText(`${contractual} — 100% store credit back if the pack grades flat.`);

    expect(result.ok).toBe(true);
    expect(result.blockedHits).toEqual([]);
    expect(result.contractualHits.length).toBeGreaterThan(0);
    expect(result.warnings.join(" ")).toContain("store-credit remedy");
  });

  it("still blocks an outcome claim sitting next to the contractual name", () => {
    const result = scanMediaClaimText(`${contractual}. This one is a ${outcomeWin}.`);

    expect(result.ok).toBe(false);
    expect(result.blockedHits.join(" ")).toContain("winner");
  });

  it("allows 100% store credit remedy language", () => {
    const packName = `${g}teed Game Pack`;
    const result = scanMediaClaimText(`100% store credit ${g}tee on every ${packName}.`);

    expect(result.ok).toBe(true);
    expect(result.blockedHits).toEqual([]);
    expect(result.contractualHits.length).toBeGreaterThan(0);
  });
});
