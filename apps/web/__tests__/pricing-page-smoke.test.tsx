import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

/**
 * Smoke test: /pricing  -  the revenue conversion page (sealed-era design).
 *
 * Monthly subscriptions are under construction; /pricing is the static
 * pay-per-slate catalog: an under-construction banner, CTAs to /packages
 * and /fantasy/dfs, and one card per LIVE_PACKAGE_CATALOG entry whose
 * "Open Pack" buttons deep-link to /packages#<slug>. The money promises on
 * this page: NO subscription exists to cancel or to refund  -  the only
 * purchase is a one-time pack checkout, and no monthly price is advertised.
 *
 * Nav, Footer, and motion components are stubbed as before.
 */
import { LIVE_PACKAGE_CATALOG } from "@/lib/packages/catalog";
vi.mock("@/components/ui/nav", () => ({
  Nav: (): null => null,
}));
vi.mock("@/components/ui/footer", () => ({
  Footer: (): null => null,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

vi.mock("@/components/motion/reveal", () => ({
  Reveal: ({ children }: { children: ReactNode }) => children,
  Stagger: ({ children }: { children: ReactNode[] }) => children,
}));
vi.mock("@/components/motion/shooting-stars", () => ({
  ShootingStars: (): null => null,
}));
vi.mock("@/components/motion/signal-rule", () => ({
  SignalRule: (): null => null,
}));

// Polyfill matchMedia for any motion component not explicitly mocked.
beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

import PricingPage from "@/app/pricing/page";

describe("/pricing smoke", () => {
  it("renders without throwing", async () => {
    const { container } = render(await PricingPage());
    await waitFor(() => {
      expect(container).not.toBeEmptyDOMElement();
    });
  });

  it("renders the Week 10 headline, the pack catalog, and zero monthly price", async () => {
    const { container, getByText, getAllByRole } = render(await PricingPage());
    await waitFor(() => {
      expect(getByText("Week 10 NFL Packs & Glass-Ledger Verification")).toBeInTheDocument();
    });
    const text = container.textContent ?? "";
    // Pin the money posture that must survive edits to /pricing.
    expect(text).toMatch(/under construction/i);
    expect(text).toMatch(/one-time/i);
    // No subscription ladder, no founding-rate headline, no monthly price.
    expect(text).not.toMatch(/locked for the life/i);
    expect(text).not.toMatch(/3-day money-back/i);
    expect(text).not.toMatch(/\$\s?[\d.]+\s*\/\s*(?:mo|month)/i);
    // One card per catalog pack, each with a deep-linking Open Pack CTA.
    expect(getAllByRole("heading", { level: 3 })).toHaveLength(LIVE_PACKAGE_CATALOG.length);
    for (const pkg of LIVE_PACKAGE_CATALOG) {
      expect(getByText(pkg.title)).toBeInTheDocument();
    }
    const hrefs = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/packages");
    expect(hrefs).toContain("/fantasy/dfs");
    for (const pkg of LIVE_PACKAGE_CATALOG) {
      expect(hrefs).toContain(`/packages#${pkg.slug}`);
    }
  });
});
