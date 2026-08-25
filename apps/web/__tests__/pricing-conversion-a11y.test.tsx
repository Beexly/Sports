import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, within } from "@testing-library/react";
import type { ReactNode } from "react";

/**
 * Accessibility contract for the two surfaces a buyer actually reads before
 * paying: the plan cards' feature lists and the "Side by side" comparison
 * table on /pricing.
 *
 * These assert ACCESSIBLE ROLE AND NAME at RUNTIME (apps/web/tsconfig.json
 * excludes test files from typecheck, so a type-level assertion here would
 * never be checked).
 *
 * Two failure modes this locks down:
 *
 *  1. Plan-card feature rows render an ✓ or ✗ icon that was `aria-hidden`,
 *     so "Confidence scores" and "Confidence scores — NOT included" were
 *     announced identically. On a pricing page that is the buying decision
 *     itself, so the included/excluded state must be in the accessibility
 *     tree, not only in the icon shape (WCAG 1.1.1 / 1.3.1).
 *
 *  2. The comparison table's feature column was a plain <td>, so every
 *     "Included"/"Not included" cell was announced with no row context —
 *     a screen-reader user hears 60 disconnected checkmarks. <th scope="row">
 *     restores the row header association (WCAG 1.3.1).
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

describe("/pricing plan-card feature lists — included vs excluded is in the a11y tree", () => {
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

describe("/pricing comparison table — header association", () => {
  it("renders the feature column as row headers, not bare cells", async () => {
    const { getByRole } = render(await PricingPage());
    // <td> maps to role "cell"; only <th scope="row"> maps to "rowheader".
    expect(
      getByRole("rowheader", { name: "Confidence rating" }),
    ).toBeInTheDocument();
    expect(
      getByRole("rowheader", { name: "Parlay MRI" }),
    ).toBeInTheDocument();
  });

  it("scopes the plan column headers to their column", async () => {
    const { getAllByRole } = render(await PricingPage());
    const colHeaders = getAllByRole("columnheader");
    expect(colHeaders.length).toBeGreaterThan(0);
    // Every column header in the comparison table declares scope="col" so the
    // plan name is announced with each cell beneath it.
    const comparisonHeaders = colHeaders.filter((h) =>
      h.closest("table") !== null,
    );
    expect(comparisonHeaders.length).toBeGreaterThan(0);
    for (const h of comparisonHeaders) {
      expect(h.getAttribute("scope")).toBe("col");
    }
  });
});
