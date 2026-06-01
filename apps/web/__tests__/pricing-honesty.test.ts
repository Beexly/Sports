import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PRICING_PHASES, getPricingPhase } from "@/lib/pricing/pricing-phases";

/**
 * Pricing honesty + consistency guard.
 *
 * pricing-phases.ts is the single source of truth for what new subscribers pay.
 * This test pins (a) the live FOUNDING floor, (b) that public surfaces show the
 * FOUNDING prices with no weekly-billing remnants, (c) that stripe.ts derives
 * display from the phase rather than hardcoding, and (d) the ladder invariants
 * (prices only rise; annual always discounts vs 12× monthly).
 */

const repoRoot = resolve(__dirname, "..", "..", "..");
function readRepoFile(path: string): string {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

const FOUNDING = getPricingPhase("FOUNDING");

describe("public pricing honesty", () => {
  it("stripe.ts derives display prices from the pricing phase (no hardcoded weekly amounts)", () => {
    const src = readRepoFile("apps/web/lib/stripe.ts");
    expect(src).toContain("getCurrentPricingPhase");
    expect(src).not.toMatch(/period:\s*"week"/);
    expect(src).not.toMatch(/amount:\s*(?:9\.99|13\.99)\b/);
  });

  it("the live FOUNDING phase is the lowest, named rung of the ladder", () => {
    expect(FOUNDING.pro.monthly).toBe(14.99);
    expect(FOUNDING.pro.annual).toBe(99);
    expect(FOUNDING.elite.monthly).toBe(24.99);
    expect(FOUNDING.elite.annual).toBe(179);
  });

  it("pricing page derives prices from the phase and delegates rendering to PricingPlans", () => {
    const pricing = readRepoFile("apps/web/app/pricing/page.tsx");
    expect(pricing).toContain("getCurrentPricingPhase");
    expect(pricing).toContain("PricingPlans");
  });

  it("shows the founding monthly prices on FAQ and picks surfaces", () => {
    const faq = readRepoFile("apps/web/app/faq/page.tsx");
    const picks = readRepoFile("apps/web/app/picks/page.tsx");
    expect(faq).toContain(`$${FOUNDING.pro.monthly}/month`);
    expect(faq).toContain(`$${FOUNDING.elite.monthly}/month`);
    expect(picks).toContain(`Upgrade to Pro / $${FOUNDING.pro.monthly}/mo`);
    expect(picks).toContain(`Upgrade to Elite / $${FOUNDING.elite.monthly}/mo`);
  });

  it("retires weekly billing from every public pricing surface", () => {
    const surfaces = [
      "apps/web/app/pricing/page.tsx",
      "apps/web/app/faq/page.tsx",
      "apps/web/app/picks/page.tsx",
      "apps/web/lib/stripe.ts",
    ];
    for (const path of surfaces) {
      const src = readRepoFile(path);
      expect(src).not.toMatch(/\/week\b/);
      expect(src).not.toMatch(/\/wk\b/);
      expect(src).not.toMatch(/per week/i);
      expect(src).not.toMatch(/billed weekly/i);
    }
  });

  it("the price ladder only ever goes up — proof earns the increase", () => {
    for (let i = 1; i < PRICING_PHASES.length; i++) {
      const prev = PRICING_PHASES[i - 1]!;
      const cur = PRICING_PHASES[i]!;
      expect(cur.pro.monthly).toBeGreaterThanOrEqual(prev.pro.monthly);
      expect(cur.elite.monthly).toBeGreaterThanOrEqual(prev.elite.monthly);
      expect(cur.order).toBe(prev.order + 1);
    }
  });

  it("every phase discounts annual vs 12x monthly (the LTV / retention lever)", () => {
    for (const p of PRICING_PHASES) {
      expect(p.pro.annual).toBeLessThan(p.pro.monthly * 12);
      expect(p.elite.annual).toBeLessThan(p.elite.monthly * 12);
    }
  });
});
