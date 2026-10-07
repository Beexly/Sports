import { describe, it, expect, vi, beforeAll } from "vitest";
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { SubscribeButton } from "@/components/pricing/subscribe-button";
import { PricingPlans, type PlanView } from "@/components/pricing/pricing-plans";

/**
 * /pricing mobile ergonomics — the conversion path's touch targets.
 *
 * Most consumer sports traffic is mobile, and /pricing → Stripe Checkout is the
 * revenue path. WCAG 2.5.8 (Target Size, Minimum) and the platform HIG both put
 * the floor at 44px; the codebase expresses that floor as Tailwind `min-h-11`
 * (2.75rem = 44px), which the billing toggle and every picks-board control
 * already carry.
 *
 * These assertions run against the RENDERED class list, not the source text, and
 * they run at RUNTIME — apps/web/tsconfig.json excludes __tests__ from
 * typechecking, so a type-level assertion here would never be checked.
 *
 * NOTE ON WHAT THIS PROVES: jsdom does not do layout, so this cannot measure a
 * rendered pixel height. It proves the 44px floor class is present on the
 * control. The pixel outcome still wants a real-device check.
 */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

// HoloTilt (wraps each plan card) probes window.matchMedia in an effect; jsdom
// ships no implementation. Report "not a fine pointer" so the static, untilted
// card renders — which is exactly the touch-device branch this test is about.
beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
});

/** 2.75rem = 44px — the repo's touch-target floor. */
const TOUCH_TARGET_FLOOR = "min-h-11";

describe("pricing conversion-path touch targets", () => {
  it("gives the primary checkout CTA a 44px minimum height", () => {
    render(
      <SubscribeButton
        tier="PRO"
        label="Go Pro"
        variant="primary"
        interval="month"
        priceMonthly={14.99}
        priceAnnual={99}
      />,
    );

    const button = screen.getByRole("button", { name: /go pro/i });
    expect(button.className.split(/\s+/)).toContain(TOUCH_TARGET_FLOOR);
  });

  it("gives the ghost checkout CTA a 44px minimum height", () => {
    render(
      <SubscribeButton
        tier="ELITE"
        label="Go Elite"
        variant="ghost"
        interval="year"
        priceMonthly={24.99}
        priceAnnual={179}
      />,
    );

    const button = screen.getByRole("button", { name: /go elite/i });
    expect(button.className.split(/\s+/)).toContain(TOUCH_TARGET_FLOOR);
  });

  it("keeps the CTA label centered now that the box can exceed its content height", () => {
    render(
      <SubscribeButton
        tier="PRO"
        label="Go Pro"
        variant="primary"
        interval="month"
        priceMonthly={14.99}
        priceAnnual={99}
      />,
    );

    const classes = screen.getByRole("button", { name: /go pro/i }).className.split(/\s+/);
    expect(classes).toContain("items-center");
    expect(classes).toContain("justify-center");
  });

  it("gives the required date-of-birth field a 44px minimum height", () => {
    render(
      <SubscribeButton
        tier="PRO"
        label="Go Pro"
        variant="primary"
        interval="month"
        priceMonthly={14.99}
        priceAnnual={99}
      />,
    );

    const dob = screen.getByLabelText(/date of birth/i);
    expect(dob.className.split(/\s+/)).toContain(TOUCH_TARGET_FLOOR);
  });
});

describe("pricing plan card touch targets", () => {
  const FREE_PLAN: PlanView = {
    id: "FREE",
    name: "Free",
    monthly: null,
    annual: null,
    annualSavingsPct: null,
    annualMonthly: null,
    description: "The daily teaser.",
    badge: null,
    cta: "Start free",
    features: [{ label: "Public calibration", included: true }],
  };

  const PRO_PLAN: PlanView = {
    id: "PRO",
    name: "Pro",
    monthly: 14.99,
    annual: 99,
    annualSavingsPct: 45,
    annualMonthly: 8.25,
    description: "The full board.",
    badge: "Most popular",
    cta: "Go Pro",
    features: [{ label: "Every pick", included: true }],
  };

  it("gives the Free plan's sign-up CTA a 44px minimum height", () => {
    render(<PricingPlans plans={[FREE_PLAN, PRO_PLAN]} grandfatherNote="Locked for life." />);

    const freeCta = screen.getByRole("link", { name: /start free/i });
    expect(freeCta.className.split(/\s+/)).toContain(TOUCH_TARGET_FLOOR);
  });

  it("centers the Free plan CTA label inside the taller box", () => {
    render(<PricingPlans plans={[FREE_PLAN, PRO_PLAN]} grandfatherNote="Locked for life." />);

    const classes = screen.getByRole("link", { name: /start free/i }).className.split(/\s+/);
    expect(classes).toContain("items-center");
    expect(classes).toContain("justify-center");
    // Still edge-to-edge in the card — the mobile fix must not shrink the CTA.
    expect(classes).toContain("w-full");
  });

  it("keeps the plan grid mobile-first (single column before the md breakpoint)", () => {
    const { container } = render(
      <PricingPlans plans={[FREE_PLAN, PRO_PLAN]} grandfatherNote="Locked for life." />,
    );

    const grid = container.querySelector("[class*='grid-cols-1']");
    expect(grid).not.toBeNull();
    const classes = (grid as HTMLElement).className.split(/\s+/);
    // Tailwind is mobile-first: a bare `grid-cols-N` (N>1) would mean N columns
    // on a phone. The base must be one column, with the multi-column layouts
    // gated behind breakpoints.
    expect(classes).toContain("grid-cols-1");
    expect(classes.some((c) => /^(sm|md|lg|xl):grid-cols-/.test(c))).toBe(true);
    expect(classes.filter((c) => /^grid-cols-/.test(c))).toEqual(["grid-cols-1"]);
  });
});
