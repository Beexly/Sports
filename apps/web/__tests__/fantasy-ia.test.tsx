/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/components/brand/brand-lockup", () => ({
  BrandLockup: () => <span data-testid="brand-lockup">Galaxy Sports Edge</span>,
}));

vi.mock("@/components/ui/nav-auth", () => ({
  NavAuth: () => <div data-testid="nav-auth" />,
  NavAuthFallback: () => <div data-testid="nav-auth-fallback" />,
}));

vi.mock("@/components/motion/reveal", () => ({
  Reveal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/ui/atmosphere", () => ({
  Atmosphere: () => <div data-testid="atmosphere" />,
}));

import { FantasyShell } from "@/components/fantasy/fantasy-shell";
import { LIVE_PACKAGE_CATALOG } from "@/lib/packages/catalog";
import { LIVE_SLATE_COACH_WRITEUPS } from "@/lib/writeups/coach-writeup-engine";

describe("Fantasy & DFS Storefront IA", () => {
  it("FantasyShell renders global GALAXY PICKS (PAID) and DFS navigation and footer chrome", () => {
    const { container } = render(
      <FantasyShell
        eyebrow="DFS Intelligence Dossier"
        title="Coach & Reasoning Mind First."
        intro="10,000-simulation cash and 20-max GPP lineup construction."
        accent="cyan"
        projectionsBadge={false}
      >
        <div data-testid="dfs-inner-content">DFS Optimizer &amp; Stacks Active</div>
      </FantasyShell>,
    );

    expect(screen.getByTestId("dfs-inner-content")).toBeDefined();

    const primaryNav = container.querySelector('nav[aria-label="Primary"]') as HTMLElement;
    expect(primaryNav).not.toBeNull();
    const navHrefs = Array.from(primaryNav.querySelectorAll("a")).map((a) =>
      a.getAttribute("href"),
    );
    expect(navHrefs).toEqual([
      "/packages",
      "/fantasy/dfs",
    ]);

    const footerNav = container.querySelector('nav[aria-label="Footer"]') as HTMLElement;
    expect(footerNav).not.toBeNull();
    const footerHrefs = Array.from(footerNav.querySelectorAll("a")).map((a) =>
      a.getAttribute("href"),
    );
    expect(footerHrefs).toContain("/packages");
    expect(footerHrefs).toContain("/fantasy/dfs");
  });

  it("validates DFS-enabled packages in LIVE_PACKAGE_CATALOG and complete DFS stacks across all 14 Week 8 writeups", () => {
    const dfsPackages = LIVE_PACKAGE_CATALOG.filter((p) => p.includesDfs);
    expect(dfsPackages.map((p) => p.slug)).toEqual(["tnf-all-in-pack", "week8-all-access"]);

    for (const pkg of dfsPackages) {
      expect(pkg.guaranteedPriceCents).toBeNull();
    }

    expect(LIVE_SLATE_COACH_WRITEUPS.length).toBe(14);
    for (const w of LIVE_SLATE_COACH_WRITEUPS) {
      expect(w.dfsStacks.captainPicks.length).toBeGreaterThanOrEqual(2);
      expect(w.dfsStacks.cashCore.length).toBeGreaterThanOrEqual(2);
      expect(w.dfsStacks.gppStacks.length).toBeGreaterThanOrEqual(1);
      expect(w.dfsStacks.gppStacks[0]?.primaryStack.passCatchers.length).toBeGreaterThanOrEqual(2);
      expect(w.dfsStacks.gppStacks[0]?.bringBack.length).toBeGreaterThan(0);
    }
  });
});
