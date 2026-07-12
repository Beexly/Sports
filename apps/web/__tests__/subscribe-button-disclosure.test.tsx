import { describe, it, expect, vi } from "vitest";
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { SubscribeButton } from "@/components/pricing/subscribe-button";

/**
 * SubscribeButton — proximate recurring-billing / auto-renewal disclosure
 * (FTC ROSCA + state auto-renewal laws).
 *
 * The CTA surface MUST carry, immediately adjacent to the button:
 *   1. a recurring-subscription / auto-renew-until-cancelled disclosure,
 *   2. the interval-appropriate price pulled from the pricing source (never a
 *      hardcoded amount), and
 *   3. a link to /terms.
 */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("SubscribeButton auto-renewal disclosure", () => {
  it("renders the recurring-billing disclosure adjacent to the CTA", () => {
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

    const disclosure = screen.getByTestId("auto-renew-disclosure");
    const text = disclosure.textContent ?? "";
    expect(text).toMatch(/recurring subscription/i);
    expect(text).toMatch(/auto-renews/i);
    expect(text).toMatch(/cancel anytime/i);
  });

  it("links to /terms from the CTA surface", () => {
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

    const termsLink = screen.getByRole("link", { name: /terms/i });
    expect(termsLink).toHaveAttribute("href", "/terms");
  });

  it("states the monthly price/interval for a monthly plan (single-sourced, not hardcoded)", () => {
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

    expect(screen.getByTestId("auto-renew-disclosure").textContent ?? "").toContain(
      "$14.99/month",
    );
  });

  it("states the annual price/interval for an annual plan", () => {
    render(
      <SubscribeButton
        tier="FANTASY"
        label="Claim founding"
        variant="primary"
        interval="year"
        priceMonthly={4.99}
        priceAnnual={49}
      />,
    );

    expect(screen.getByTestId("auto-renew-disclosure").textContent ?? "").toContain(
      "$49/year",
    );
  });
});
