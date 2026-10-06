import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * FE-17: GalaxyCursor restricted to the home hero; HoloTilt removed from
 * pricing cards.
 *
 * GalaxyCursor (a custom cursor overlay) and HoloTilt (a tilt-on-hover
 * effect) were both mounted globally/on every pricing card — decorative
 * motion this product's "math you can read" positioning doesn't need on
 * every public surface, including data-dense ones like /dashboard and
 * /board.
 */
describe("FE-17: GalaxyCursor and HoloTilt scope", () => {
  it("GalaxyCursor is not mounted in the root layout", () => {
    const layout = readFileSync(join(process.cwd(), "app/layout.tsx"), "utf8");
    expect(layout).not.toMatch(/<GalaxyCursor/);
    expect(layout).not.toMatch(/from\s+"@\/components\/ui\/galaxy-cursor"/);
  });

  it("GalaxyCursor is mounted on the home hero", () => {
    const home = readFileSync(join(process.cwd(), "app/page.tsx"), "utf8");
    expect(home).toMatch(/<GalaxyCursor/);
  });

  it("HoloTilt is not used on the pricing cards", () => {
    const pricingPlans = readFileSync(
      join(process.cwd(), "components/pricing/pricing-plans.tsx"),
      "utf8",
    );
    expect(pricingPlans).not.toMatch(/HoloTilt/);
  });
});
