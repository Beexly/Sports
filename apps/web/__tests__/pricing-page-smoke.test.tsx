import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

/**
 * Smoke test: /pricing — the revenue conversion page.
 *
 * Reachable from the footer (Pricing link) and from /auth/signin.
 * Touches money (subscription tiers, prices, refund policy).
 * Only 14 of 231 routes are render-tested; /pricing was weakly covered
 * (source-level text matches only) — this is the first real render test.
 *
 * Nav and Footer are stubbed. `next/navigation` is mocked because the page
 * renders the client-side SubscribeButton which calls useRouter().
 * Motion components (Reveal, ShootingStars, SignalRule) are stubbed to
 * avoid browser-API dependencies (matchMedia, rAF).
 *
 * A matchMedia polyfill is installed for any remaining motion component
 * (e.g. HoloTilt) that uses it in a useEffect after render.
 */
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

  it("renders the founding-rate headline and key money promises", async () => {
    const { container, getByText } = render(await PricingPage());
    await waitFor(() => {
      expect(getByText("Claim the founding rate.")).toBeInTheDocument();
    });
    const text = container.textContent ?? "";
    // Pin the key money promises that must survive edits to /pricing.
    expect(text).toMatch(/locked for the life/i);
    expect(text).toMatch(/Cancel any time/i);
    expect(text).toMatch(/3-day money-back/i);
  });
});
