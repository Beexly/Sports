import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * FE-18: "Save up to 45% annually" was hardcoded on the pricing page — a
 * number that survives a pricing-phase change (PROVEN, ESTABLISHED, ...)
 * into a stale, unsupportable claim. It must be computed from the plans
 * actually passed in (pricing-phases.ts's annualSavingsPct).
 *
 * Sign-in used a generic placeholder SVG diamond as its logo instead of the
 * official BrandLockup component every other public surface (Nav, Footer)
 * already uses.
 */
describe("FE-18: computed annual savings and BrandLockup on sign-in", () => {
  it("pricing-plans.tsx computes the savings headline from plan data, not a literal percent", () => {
    const src = readFileSync(
      join(process.cwd(), "components/pricing/pricing-plans.tsx"),
      "utf8",
    );
    expect(src).not.toMatch(/Save up to 45%/);
    expect(src).toMatch(/maxAnnualSavingsPct/);
    expect(src).toMatch(/annualSavingsPct/);
  });

  it("sign-in imports and renders BrandLockup instead of a generic mark", () => {
    const src = readFileSync(join(process.cwd(), "app/auth/signin/page.tsx"), "utf8");
    expect(src).toMatch(/from\s+"@\/components\/brand\/brand-lockup"/);
    expect(src).toMatch(/<BrandLockup/);
  });
});
