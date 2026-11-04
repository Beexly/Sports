/**
 * @vitest-environment jsdom
 *
 * Storefront navigation (sealed-era design). FIVE_REVENUE_PILLARS is the
 * four-door "This week's packs" bar: Picks (locked Week 8 board), Props
 * (locked props + watchlist), Packs (the GALAXY PICKS storefront), DFS
 * (optimizer). The desktop primary bar keeps exactly two doors  -  GALAXY PICKS
 * (PAID) → /packages and DFS → /fantasy/dfs. The homepage routes buyers
 * through TRUST_LINKS + the RedlineWorld storefront, never through a
 * "5 promo anchors" block. /board, /players, /the-beat stay absent.
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { FIVE_REVENUE_PILLARS, Nav } from "@/components/ui/nav";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

vi.mock("@sports/prediction-engine", () => ({
  getReadinessGates: () => ({ canExposePublicPicks: false }),
}));

vi.mock("@/components/ui/mobile-nav", () => ({
  MobileNav: () => null,
}));

vi.mock("@/components/brand/brand-lockup", () => ({
  BrandLockup: () => React.createElement("span", { "data-testid": "brand" }),
}));

vi.mock("@/components/ui/nav-auth", () => ({
  NavAuth: () => React.createElement("div", { "data-testid": "nav-auth-stub" }),
  NavAuthFallback: () => React.createElement("div", { "data-testid": "nav-auth-fallback" }),
}));

vi.mock("@/components/ui/nav-menu", () => ({
  NavMenu: ({ label, href }: { label: string; href: string }) =>
    React.createElement("a", { href, "data-testid": `navmenu-${label.toLowerCase()}` }, label),
}));

describe("Storefront navigation  -  four weekly doors over the sealed Week 8 board", () => {
  it("exports FIVE_REVENUE_PILLARS with the four current routes", () => {
    expect(FIVE_REVENUE_PILLARS).toBeDefined();
    expect(FIVE_REVENUE_PILLARS.length).toBe(4);

    const hrefs = FIVE_REVENUE_PILLARS.map((p) => p.href);
    const expectedRoutes = ["/picks", "/props", "/packages", "/fantasy/dfs"];

    expect(hrefs).toEqual(expectedRoutes);

    for (const pillar of FIVE_REVENUE_PILLARS) {
      expect(pillar.label.length).toBeGreaterThan(0);
      expect(pillar.desc.length).toBeGreaterThan(0);
    }
  });

  it("Nav component renders the four pillar links in the bar", () => {
    const { container } = render(React.createElement(Nav));

    const renderedHrefs = Array.from(container.querySelectorAll("a"))
      .map((a) => a.getAttribute("href"))
      .filter(Boolean);

    for (const route of ["/picks", "/props", "/packages", "/fantasy/dfs"]) {
      expect(renderedHrefs).toContain(route);
    }

    expect(renderedHrefs).not.toContain("/board");
    expect(renderedHrefs).not.toContain("/players");
    expect(renderedHrefs).not.toContain("/the-beat");
  });

  it("app/page.tsx routes buyers through TRUST_LINKS in the responsible close", () => {
    const homeSrc = readFileSync(
      resolve(__dirname, "..", "app", "page.tsx"),
      "utf8",
    );

    // The homepage is RedlineWorld + responsible close; its only route to
    // the price list and the proof/trust surfaces is the TRUST_LINKS block.
    expect(homeSrc).toMatch(/const\s+TRUST_LINKS/);
    for (const route of ["/methodology", "/responsible-play", "/how-we-make-money", "/accountability", "/pricing"]) {
      expect(homeSrc).toContain(`href: "${route}"`);
    }
  });
});
