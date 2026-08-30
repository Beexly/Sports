import { describe, it, expect } from "vitest";
import { buildProofCard, DEFAULT_FOOTER } from "@/lib/proof/proof-card";

describe("dynamic proof cards", () => {
  it("builds a claim-safe, shareable card with the default RG footer", () => {
    const c = buildProofCard({
      kind: "clv-milestone",
      headline: "We beat the close again",
      subhead: "Graded in public, calibrated not confident.",
      stat: "57% beat-close over 220 graded picks (95% CI 50.5–63.4%)",
    });
    expect(c.claimSafe).toBe(true);
    expect(c.shareable).toBe(true);
    expect(c.footer).toBe(DEFAULT_FOOTER);
    expect(c.blockers).toEqual([]);
  });

  it("refuses to mint a card whose copy isn't claim-safe", () => {
    const c = buildProofCard({
      kind: "settled-pick",
      headline: "Guaranteed lock of the day",
      subhead: "risk-free money",
      stat: "100% sure thing",
    });
    expect(c.claimSafe).toBe(false);
    expect(c.shareable).toBe(false);
    expect(c.blockers.length).toBeGreaterThan(0);
  });

  it("scans the footer too (an unsafe override is caught)", () => {
    const c = buildProofCard({
      kind: "no-bet",
      headline: "We passed this game",
      subhead: "No edge, no pick.",
      stat: "Pass list: 6 of 9 games",
      footer: "guaranteed winners next time",
    });
    expect(c.claimSafe).toBe(false);
  });

  it("a loss-autopsy card is first-class and shareable", () => {
    const c = buildProofCard({
      kind: "loss-autopsy",
      headline: "We lost this one — here's why",
      subhead: "The line moved against our read; the model was wrong.",
      stat: "Logged in the public ledger, in calibration not out of it",
    });
    expect(c.shareable).toBe(true);
  });
});
