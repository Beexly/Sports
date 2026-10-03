import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readRepoFile(path: string): string {
  return readFileSync(resolve(__dirname, "..", "..", "..", path), "utf8");
}

describe("homepage finish doctrine polish", () => {
  const page = readRepoFile("apps/web/app/page.tsx");
  const methodology = readRepoFile("apps/web/components/ui/methodology-section.tsx");
  const riskDisclosure = readRepoFile("apps/web/components/ui/risk-disclosure.tsx");

  it("does not reintroduce redundant legacy homepage sections", () => {
    for (const legacyName of ["StackSection", "ThreeQuestions", "LiveStateStrip"]) {
      expect(page).not.toContain(legacyName);
    }
  });

  it("lands the homepage on an editorial responsible close", () => {
    expect(page).toContain('data-testid="homepage-responsible-close"');
    expect(page).toContain("The math can point. The decision stays yours.");
    expect(page).toContain("RiskDisclosure");
    expect(page).toContain("includePastPerformance");
  });

  it("tokenizes the methodology wrapper and visible card grid", () => {
    expect(methodology).toContain("data-testid=\"methodology-section\"");
    expect(methodology).toContain("surface-card");
    expect(methodology).toContain("bg-carbon");
    expect(methodology).toContain("text-orbital-cyan");
    expect(methodology).toContain("text-ultraviolet");
    expect(methodology).toContain("text-plasma");
    expect(methodology).not.toMatch(/\b(?:text|bg|border)-gray-/);
    expect(methodology).not.toMatch(/\b(?:text|bg|border)-(?:green|yellow|emerald|orange)-/);
  });

  it("keeps the homepage risk disclosure on design tokens", () => {
    expect(riskDisclosure).toContain("surface-card");
    expect(riskDisclosure).toContain("text-ion-1");
    expect(riskDisclosure).not.toMatch(/\b(?:text|bg|border)-gray-/);
  });
});
