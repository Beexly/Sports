import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "..", "..", "..");

const publicPricingSurfacePaths = [
  "apps/web/app/pricing/page.tsx",
  "apps/web/app/faq/page.tsx",
  "apps/web/app/picks/page.tsx",
] as const;

function readRepoFile(path: string): string {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

describe("public pricing honesty", () => {
  it("pins Stripe display metadata to the live weekly products", () => {
    const src = readRepoFile("apps/web/lib/stripe.ts");

    expect(src).toContain('PRO: { amount: 9.99, label: "Pro", period: "week" }');
    expect(src).toContain('ELITE: { amount: 13.99, label: "Elite", period: "week" }');
    expect(src).not.toMatch(/amount:\s*(19|49)\b/);
    expect(src).not.toMatch(/period:\s*"month"/);
  });

  it("displays Pro at $9.99/week and Elite at $13.99/week on pricing, FAQ, and picks surfaces", () => {
    const pricing = readRepoFile("apps/web/app/pricing/page.tsx");
    const faq = readRepoFile("apps/web/app/faq/page.tsx");
    const picks = readRepoFile("apps/web/app/picks/page.tsx");

    expect(pricing).toMatch(/price:\s*9\.99/);
    expect(pricing).toMatch(/price:\s*13\.99/);
    expect(pricing).toContain('${plan.price}/week');

    expect(faq).toContain("$9.99/week");
    expect(faq).toContain("$13.99/week");

    expect(picks).toContain("Upgrade to Pro / $9.99/wk");
    expect(picks).toContain("Upgrade to Elite / $13.99/wk");
  });

  it("does not retain stale monthly display prices on public pricing surfaces", () => {
    for (const path of publicPricingSurfacePaths) {
      const src = readRepoFile(path);

      expect(src).not.toMatch(/\$(?:19|49)(?:\b|\/)/);
      expect(src).not.toMatch(/\/mo\b/);
      expect(src).not.toMatch(new RegExp(String.raw`\b(?:19|49)` + "/" + String.raw`month\b`, "i"));
      expect(src).not.toMatch(/billed monthly/i);
    }
  });
});
