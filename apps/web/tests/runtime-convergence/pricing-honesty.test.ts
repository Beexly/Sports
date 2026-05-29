/**
 * C90 — Pricing-honesty source-level test.
 *
 * Source-scans the pricing page for forbidden conversion phrases:
 * scarcity, urgency, social-bandwagon, certainty, manufactured-insider.
 *
 * If any of these appear in pricing copy, the test fails — the upgrade
 * path must remain Constitution-aligned.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(__dirname, "../../");
const pricingSrc = readFileSync(resolve(ROOT, "app/pricing/page.tsx"), "utf8");

const FORBIDDEN_CONVERSION_PATTERNS: ReadonlyArray<{ name: string; pattern: RegExp }> = [
  // scarcity / urgency
  { name: "limited-time", pattern: /\blimited[- ]time\b/i },
  { name: "act now", pattern: /\bact now\b/i },
  { name: "don't miss out", pattern: /\bdon'?t miss out\b/i },
  { name: "last chance", pattern: /\blast chance\b/i },
  // social pressure
  { name: "join thousands", pattern: /\bjoin thousands\b/i },
  { name: "everyone is", pattern: /\beveryone is (using|buying|switching)\b/i },
  // tout vocabulary
  { name: "tail", pattern: /\btail (?:the )?sharps?\b/i },
  { name: "lock", pattern: /\block of the (?:day|week|month)\b/i },
  // certainty (Constitution #5)
  { name: "guaranteed", pattern: /\bguaranteed (?:winner|profit|return)\b/i },
  { name: "risk-free", pattern: /\brisk[- ]free\b/i },
];

describe("pricing honesty", () => {
  for (const { name, pattern } of FORBIDDEN_CONVERSION_PATTERNS) {
    it(`does not contain forbidden conversion phrase: ${name}`, () => {
      expect(pricingSrc).not.toMatch(pattern);
    });
  }

  it("explains why a price (no-tout posture)", () => {
    expect(pricingSrc).toMatch(/why a price/i);
  });

  it("links to /we-are-not (anti-tout statement)", () => {
    expect(pricingSrc).toMatch(/\/we-are-not/);
  });

  it("PRO and ELITE have distinct use cases", () => {
    expect(pricingSrc).toMatch(/pro.*research before/i);
    expect(pricingSrc).toMatch(/elite.*live operations/i);
  });
});
