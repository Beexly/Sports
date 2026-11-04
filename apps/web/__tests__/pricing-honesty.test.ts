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

  it("pricing page is the static pay-per-slate catalog  -  no subscription price anywhere", () => {
    // Sealed-era design: monthly subscriptions are under construction, so
    // /pricing renders LIVE_PACKAGE_CATALOG directly (one-time packs) and
    // advertises NO monthly price, NO founding-rate headline, NO money-back
    // promise. The phase ladder module below (money-path stripe.ts, which
    // DOES derive from the phase) is unchanged; the public page simply does
    // not sell subscriptions yet.
    const pricing = readRepoFile("apps/web/app/pricing/page.tsx");
    expect(pricing).not.toContain("getCurrentPricingPhase");
    expect(pricing).not.toContain("PricingPlans");
    expect(pricing).toContain("LIVE_PACKAGE_CATALOG");
    expect(pricing).toMatch(/under construction/i);
    expect(pricing).toMatch(/No Monthly Subscription/i);
    expect(pricing).not.toMatch(/\$\s?[\d.]+\s*\/\s*(?:mo|month)/i);
    expect(pricing).not.toMatch(/locked for the life/i);
    expect(pricing).not.toMatch(/money-back/i);
  });

  it("FAQ derives its prices from the phase module; picks advertises no subscription price", () => {
    // The FAQ answers "What does Pro get?" by interpolating
    // getCurrentPricingPhase()  -  the same source checkout reads  -  so advancing
    // PRICING_PHASE can never leave the FAQ advertising a price checkout
    // won't honor. /picks is the static sealed board: it sells no
    // subscription at all (packs are funnelled through /packages), so the
    // honest pin is the ABSENCE of any subscription price, upgrade banner,
    // or phase interpolation there.
    const faq = readRepoFile("apps/web/app/faq/page.tsx");
    const picks = readRepoFile("apps/web/app/picks/page.tsx");
    expect(faq).toContain("getCurrentPricingPhase");
    expect(faq).toContain("${phase.pro.monthly}/month");
    expect(faq).toContain("${phase.elite.monthly}/month");
    // No stale hardcoded founding prices left behind on the FAQ.
    expect(faq).not.toContain("$14.99/month");
    // /picks carries no subscription price and no upgrade banner.
    expect(picks).not.toContain("getCurrentPricingPhase");
    expect(picks).not.toContain("Upgrade to");
    expect(picks).not.toMatch(/\$\s?[\d.]+\s*\/\s*(?:mo|month)/i);
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

  it("the price ladder only ever goes up  -  proof earns the increase", () => {
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
