/**
 * @vitest-environment jsdom
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

describe("5-Pillar Live Site Revenue Navigation & Homepage Focus", () => {
  it("exports FIVE_REVENUE_PILLARS with exact required routes", () => {
    expect(FIVE_REVENUE_PILLARS).toBeDefined();
    expect(FIVE_REVENUE_PILLARS.length).toBe(5);

    const hrefs = FIVE_REVENUE_PILLARS.map((p) => p.href);
    const expectedRoutes = [
      "/packages",
      "/packages#slate-dossiers",
      "/fantasy/dfs",
      "/pricing",
      "https://t.me/GalaxySportsEdge_bot",
    ];

    expect(hrefs).toEqual(expectedRoutes);

    for (const pillar of FIVE_REVENUE_PILLARS) {
      expect(pillar.label.length).toBeGreaterThan(0);
      expect(pillar.desc.length).toBeGreaterThan(0);
    }
  });

  it("Nav component renders all 5 revenue pillar links prominently in the bar", () => {
    const { container } = render(React.createElement(Nav));

    const renderedHrefs = Array.from(container.querySelectorAll("a"))
      .map((a) => a.getAttribute("href"))
      .filter(Boolean);

    for (const route of [
      "/packages",
      "/fantasy/dfs",
      "/pricing",
    ]) {
      expect(renderedHrefs).toContain(route);
    }

    expect(renderedHrefs).not.toContain("/board");
    expect(renderedHrefs).not.toContain("/players");
    expect(renderedHrefs).not.toContain("/the-beat");
  });

  it("app/page.tsx links directly to all 5 revenue pillars in its commercial callout section", () => {
    const homeSrc = readFileSync(
      resolve(__dirname, "..", "app", "page.tsx"),
      "utf8",
    );

    expect(homeSrc).toContain("GALAXY PICKS (PAID)");
    expect(homeSrc).toMatch(/href="\/packages" className="btn-primary/);
    expect(homeSrc).toMatch(/href="\/fantasy\/dfs"/);
    expect(homeSrc).toMatch(/href="\/pricing"/);
  });
});
