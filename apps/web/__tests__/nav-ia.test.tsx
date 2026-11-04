/**
 * @vitest-environment jsdom
 *
 * Field IA (sealed-era design): the desktop bar carries exactly two primary
 * doors  -  GALAXY PICKS (PAID) → /packages and DFS → /fantasy/dfs  -  plus the
 * "This week's packs" pillars bar mirroring FIVE_REVENUE_PILLARS (Picks,
 * Props, Packs, DFS over the sealed Week 8 board). /board is deliberately
 * absent from nav; the funnel door shared by every pack is /packages.
 * Prohibitions carried over from the retired live-board IA: zero Telegram,
 * no /board, /players, /the-beat, /academy, or /fantasy/studio doors.
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, within } from "@testing-library/react";

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

import { Nav, NavSkeleton, FIVE_REVENUE_PILLARS } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";

describe("Desktop Navigation & Footer IA", () => {
  it("Nav renders only GALAXY PICKS (PAID) and DFS in primary bar and clean quick-jump links with zero Telegram", () => {
    const { container } = render(<Nav />);

    const primaryNav = container.querySelector('nav[aria-label="Primary"]') as HTMLElement;
    expect(primaryNav).not.toBeNull();

    const primaryLinks = Array.from(primaryNav.querySelectorAll("a")).map((a) => ({
      label: a.textContent?.trim(),
      href: a.getAttribute("href"),
    }));

    expect(primaryLinks).toEqual([
      { label: "GALAXY PICKS (PAID)", href: "/packages" },
      { label: "DFS", href: "/fantasy/dfs" },
    ]);

    const pillarsNav = container.querySelector(
      'nav[aria-label="This week’s packs"]',
    ) as HTMLElement;
    expect(pillarsNav).not.toBeNull();
    const pillarLinks = Array.from(pillarsNav.querySelectorAll("a")).map((a) => ({
      label: a.textContent?.trim(),
      href: a.getAttribute("href"),
    }));

    expect(pillarLinks).toEqual(
      FIVE_REVENUE_PILLARS.map((p) => ({ label: p.label, href: p.href })),
    );
    expect(container.textContent).not.toMatch(/Telegram/i);

    // Ensure retired doors are absent
    const allHrefs = Array.from(container.querySelectorAll("a")).map((a) =>
      a.getAttribute("href"),
    );
    for (const retired of ["/board", "/players", "/the-beat", "/academy", "/fantasy/studio"]) {
      expect(allHrefs).not.toContain(retired);
    }
  });

  it("NavSkeleton renders identical primary and 5-pillar links without invoking auth", () => {
    const { container } = render(<NavSkeleton />);
    const primaryNav = container.querySelector('nav[aria-label="Primary"]') as HTMLElement;
    expect(within(primaryNav).getByText("GALAXY PICKS (PAID)").getAttribute("href")).toBe(
      "/packages",
    );
    expect(within(primaryNav).getByText("DFS").getAttribute("href")).toBe("/fantasy/dfs");
  });

  it("Footer exposes Picks, Props, Packs, and DFS alongside disclosures", () => {
    const { container } = render(<Footer />);
    const footerNav = container.querySelector('nav[aria-label="Footer"]') as HTMLElement;
    expect(footerNav).not.toBeNull();

    const footerLinks = Array.from(footerNav.querySelectorAll("a")).map((a) => ({
      label: a.textContent?.trim(),
      href: a.getAttribute("href"),
    }));

    expect(footerLinks).toEqual([
      { label: "Picks", href: "/picks" },
      { label: "Props", href: "/props" },
      { label: "Packs", href: "/packages" },
      { label: "DFS", href: "/fantasy/dfs" },
    ]);

    const disclosuresNav = container.querySelector('nav[aria-label="Disclosures"]') as HTMLElement;
    expect(disclosuresNav).not.toBeNull();
    const disclosureHrefs = Array.from(disclosuresNav.querySelectorAll("a")).map((a) =>
      a.getAttribute("href"),
    );
    expect(disclosureHrefs).toContain("/accountability");
    expect(disclosureHrefs).toContain("/responsible-play");
    expect(disclosureHrefs).toContain("/terms");
    expect(disclosureHrefs).toContain("/privacy");
  });
});
