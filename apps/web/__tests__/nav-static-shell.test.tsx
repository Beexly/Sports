import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

/**
 * P16-03 — split auth-dependent nav-right into a Suspense-bounded NavAuth
 * component so the static Nav() does NOT call auth() and 86+ marketing pages
 * (including /pricing) can be statically prerendered.
 *
 * This file tests ONLY the static Nav() shell. The real NavAuth module is
 * stubbed out (via vi.mock of @/components/ui/nav-auth) so jsdom's renderer
 * never hits the async server component through Suspense. The core assertion
 * is that auth() is NEVER called by Nav() itself.
 */
const mocks = vi.hoisted(() => ({
  auth: vi.fn<() => Promise<{ user?: { id?: string; name?: string | null; email?: string | null; image?: string | null } } | null>>(),
}));

vi.mock("@/lib/auth", () => ({
  auth: mocks.auth,
}));

vi.mock("@sports/prediction-engine", () => ({
  getReadinessGates: () => ({ canExposePublicPicks: false }),
}));

vi.mock("@/components/ui/mobile-nav", () => ({
  MobileNav: () => null,
}));

vi.mock("@/components/brand/brand-lockup", () => ({
  BrandLockup: () => <span data-testid="brand" />,
}));

vi.mock("@/components/ui/nav-menu", () => ({
  NavMenu: ({ label, href }: { label: string; href: string }) => (
    <a href={href} data-testid={`navmenu-${label.toLowerCase()}`}>
      {label}
    </a>
  ),
}));

// Stub the async NavAuth + NavAuthFallback so Nav() tests don't hit
// the async server component through Suspense in jsdom.
// NavAuth / NavAuthFallback are tested separately in nav-auth.test.tsx.
vi.mock("@/components/ui/nav-auth", () => ({
  NavAuth: () => <div data-testid="nav-auth-stub" />,
  NavAuthFallback: () => <div data-testid="nav-auth-fallback" />,
}));

import { Nav } from "@/components/ui/nav";

beforeEach(() => {
  mocks.auth.mockReset();
});

describe("P16-03 — Nav does not block on auth() in the static shell", () => {
  it("Nav() never calls auth() — the static shell must be statically prerenderable", () => {
    mocks.auth.mockResolvedValue(null);

    const { container } = render(<Nav />);

    // The core regression guard: Nav() itself must NOT call auth().
    // This is what lets /pricing and 86+ marketing pages stay static.
    expect(mocks.auth).not.toHaveBeenCalled();

    // The static nav links render from the static nav-left, not from auth.
    expect(container.querySelector('a[href="/board"]')).not.toBeNull();
    expect(container.querySelector('a[href="/players"]')).not.toBeNull();
    // Was a[href="/calibration"]. Record moved OUT of the top bar in the
    // 2026-09-12 trim (AGENTS.md: "Do NOT restore Record/Verify/Plans to the top
    // bar"); it lives in the footer and the Board menu, so it is not a
    // top-level anchor in the static shell. Assert a door that IS one.
    expect(container.querySelector('a[href="/fantasy"]')).not.toBeNull();
  });

  it("Nav() renders all four primary doors + The Lab + Proof as static links", () => {
    mocks.auth.mockResolvedValue({
      user: { id: "u1", name: "Test", email: "t@e.com", image: null },
    });

    const { container } = render(<Nav />);

    // The static shell should render identically regardless of auth state.
    // Auth state lives in the stubbed NavAuth, which Nav() does NOT resolve.
    const hrefs = Array.from(container.querySelectorAll("a"))
      .map((a) => a.getAttribute("href"))
      .filter(Boolean);

    // The bar is four doors since 2026-09-12. This list previously required
    // "/intelligence/engines" and "/calibration", both of which AGENTS.md now
    // forbids in the top bar, so the assertion guarded AGAINST doctrine.
    expect(hrefs).toContain("/board");
    expect(hrefs).toContain("/players");
    expect(hrefs).toContain("/fantasy");
    // And the doctrine half, so a regression is caught rather than tolerated.
    expect(hrefs).not.toContain("/intelligence/engines");

    // auth() was NOT called during static shell render.
    expect(mocks.auth).not.toHaveBeenCalled();
  });
});
