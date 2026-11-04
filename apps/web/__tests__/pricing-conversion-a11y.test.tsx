import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, within } from "@testing-library/react";
import type { ReactNode } from "react";

/**
 * Accessibility contract for the two surfaces a buyer actually reads before
 * paying: the plan cards' feature lists and the static pack catalog on
 * /pricing (sealed-era design  -  the "Side by side" comparison table is
 * retired; monthly subscriptions are under construction).
 *
 * These assert ACCESSIBLE ROLE AND NAME at RUNTIME (apps/web/tsconfig.json
 * excludes test files from typecheck, so a type-level assertion here would
 * never be checked).
 *
 * Failure modes this locks down:
 *
 *  1. Plan-card feature rows render an ✓ or ✗ icon that was `aria-hidden`,
 *     so "Confidence scores" and "Confidence scores  -  NOT included" were
 *     announced identically. On a pricing page that is the buying decision
 *     itself, so the included/excluded state must be in the accessibility
 *     tree, not only in the icon shape (WCAG 1.1.1 / 1.3.1).
 *
 *  2. The /pricing pack catalog must expose each pack as a proper heading
 *     (level 3) with its CTA link, not a bare wall of divs  -  a screen-reader
 *     user jumps by heading to compare packs.
 */

vi.mock("@/components/ui/nav", () => ({ Nav: (): null => null }));
vi.mock("@/components/ui/footer", () => ({ Footer: (): null => null }));
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
import { LIVE_PACKAGE_CATALOG } from "@/lib/packages/catalog";
import { PricingPlans, type PlanView } from "@/components/pricing/pricing-plans";

const PLAN_FIXTURE: PlanView[] = [
  {
    id: "PRO",
    name: "Pro",
    monthly: 14.99,
    annual: 99,
    annualSavingsPct: 45,
    annualMonthly: 8.25,
    description: "The full board.",
    badge: null,
    cta: "Subscribe to Pro",
    features: [
      { label: "Full board access", included: true },
      { label: "Real-time push alerts", included: false },
    ],
  },
];

describe("/pricing plan-card feature lists  -  included vs excluded is in the a11y tree", () => {
  it("exposes an accessible name for the INCLUDED marker", () => {
    const { getByRole } = render(
      <PricingPlans plans={PLAN_FIXTURE} grandfatherNote="Founding rate." />,
    );
    // Fails while the ✓ icon is aria-hidden: no such accessible element.
    expect(getByRole("img", { name: /^included$/i })).toBeInTheDocument();
  });

  it("exposes an accessible name for the NOT-INCLUDED marker", () => {
    const { getByRole } = render(
      <PricingPlans plans={PLAN_FIXTURE} grandfatherNote="Founding rate." />,
    );
    // Fails while the ✗ icon is aria-hidden: an excluded feature is
    // indistinguishable from an included one for a screen-reader user.
    expect(getByRole("img", { name: /^not included$/i })).toBeInTheDocument();
  });

  it("does not announce an excluded feature identically to an included one", () => {
    const { getAllByRole } = render(
      <PricingPlans plans={PLAN_FIXTURE} grandfatherNote="Founding rate." />,
    );
    const listItems = getAllByRole("listitem");
    const included = listItems.find((li) =>
      (li.textContent ?? "").includes("Full board access"),
    );
    const excluded = listItems.find((li) =>
      (li.textContent ?? "").includes("Real-time push alerts"),
    );
    expect(included).toBeDefined();
    expect(excluded).toBeDefined();
    expect(
      within(included as HTMLElement).getByRole("img").getAttribute("aria-label"),
    ).toBe("Included");
    expect(
      within(excluded as HTMLElement).getByRole("img").getAttribute("aria-label"),
    ).toBe("Not included");
  });
});
describe("/pricing pack catalog  -  heading and link structure", () => {
  it("renders every pack title as a level-3 heading", async () => {
    const { getAllByRole } = render(await PricingPage());
    const headings = getAllByRole("heading", { level: 3 });
    expect(headings.length).toEqual(LIVE_PACKAGE_CATALOG.length);
    expect(headings.map((h) => h.textContent)).toEqual(
      LIVE_PACKAGE_CATALOG.map((p) => p.title),
    );
  });

  it("gives every pack an Open Pack CTA link to its /packages anchor", async () => {
    const { getAllByRole } = render(await PricingPage());
    const links = getAllByRole("link");
    for (const pkg of LIVE_PACKAGE_CATALOG) {
      expect(
        links.some((a) => a.getAttribute("href") === `/packages#${pkg.slug}`),
        `no CTA to /packages#${pkg.slug}`,
      ).toBe(true);
    }
  });

  it("preserves the heading hierarchy: h1 page, h2 catalog section, h3 packs", async () => {
    const { getByRole, getAllByRole } = render(await PricingPage());
    expect(getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(getByRole("heading", { level: 2 })).toBeInTheDocument();
    expect(getAllByRole("heading", { level: 3 }).length).toBeGreaterThan(0);
  });
});
