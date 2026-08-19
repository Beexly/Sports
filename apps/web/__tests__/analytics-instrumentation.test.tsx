import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { PricingPageAnalytics } from "@/components/pricing/pricing-page-analytics";
import { SubscribeButton } from "@/components/pricing/subscribe-button";

/**
 * Instrumentation tests for P12-03 — wiring the declared analytics events at
 * their natural call sites. `track()` is a pure inert no-op (returns the payload,
 * never hits the network, never reads a vendor env var). These tests mock
 * `track` and assert the RIGHT event with the RIGHT context is emitted at each
 * site. Mocking `track` (rather than spying on a global) proves the call sites
 * pass type-checked AnalyticsEvent literals, not free-form strings.
 */

const mocks = vi.hoisted(() => ({
  track: vi.fn(),
}));

vi.mock("@/lib/analytics/events", () => ({
  track: mocks.track,
  isAnalyticsEvent: (name: string): boolean => typeof name === "string",
  ANALYTICS_EVENTS: {
    pricing_page_view: "test",
    upgrade_cta_click: "test",
    checkout_start: "test",
    checkout_complete: "test",
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("analytics instrumentation (P12-03)", () => {
  beforeEach(() => {
    mocks.track.mockReset();
  });

  describe("pricing_page_view", () => {
    it("fires pricing_page_view exactly once on mount", () => {
      const { unmount } = render(<PricingPageAnalytics />);
      expect(mocks.track).toHaveBeenCalledTimes(1);
      expect(mocks.track).toHaveBeenCalledWith("pricing_page_view");
      unmount();
      // unmount must not fire it again
      expect(mocks.track).toHaveBeenCalledTimes(1);
    });
  });

  describe("upgrade_cta_click", () => {
    it("fires upgrade_cta_click with the tier + interval when the CTA is clicked", async () => {
      render(
        <SubscribeButton
          tier="PRO"
          label="Subscribe to Pro"
          variant="primary"
          interval="month"
        />,
      );
      const button = screen.getByRole("button", { name: /subscribe to pro/i });
      fireEvent.click(button);
      await waitFor(() => {
        expect(mocks.track).toHaveBeenCalledWith("upgrade_cta_click", {
          tier: "PRO",
          interval: "month",
        });
      });
    });
  });

  describe("checkout_start", () => {
    it("fires checkout_start with the tier + interval when checkout is initiated", async () => {
      render(
        <SubscribeButton
          tier="ELITE"
          label="Subscribe to Elite"
          variant="ghost"
          interval="year"
        />,
      );
      const button = screen.getByRole("button", { name: /subscribe to elite/i });
      fireEvent.click(button);
      await waitFor(() => {
        expect(mocks.track).toHaveBeenCalledWith("checkout_start", {
          tier: "ELITE",
          interval: "year",
        });
      });
    });

    it("fires checkout_start AFTER upgrade_cta_click (intent before network)", async () => {
      render(
        <SubscribeButton
          tier="FANTASY"
          label="Subscribe to Fantasy"
          variant="primary"
          interval="month"
        />,
      );
      const button = screen.getByRole("button", { name: /subscribe to fantasy/i });
      fireEvent.click(button);
      await waitFor(() => {
        const calls = mocks.track.mock.calls;
        const ctaIdx = calls.findIndex((c) => c[0] === "upgrade_cta_click");
        const startIdx = calls.findIndex((c) => c[0] === "checkout_start");
        expect(ctaIdx).toBeGreaterThanOrEqual(0);
        expect(startIdx).toBeGreaterThanOrEqual(0);
        expect(ctaIdx).toBeLessThan(startIdx);
      });
    });
  });

  describe("checkout_complete", () => {
    /**
     * The webhook handler fires track("checkout_complete", { tier }) inside the
     * checkout.session.completed case. Since track is mocked at the module level
     * (vi.mock above), any module that imports track — including
     * apps/web/app/api/webhooks/stripe/route.ts — will use mocks.track. We
     * import the route lazily so the mock is in place, then drive one event
     * through the full POST and assert the event was recorded.
     */
    it("fires checkout_complete with the resolved tier on checkout.session.completed", async () => {
      // Minimal Stripe client mock — only the bits the checkout.session.completed
      // branch touches.
      const stripeClient = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue({
            id: "evt_test",
            type: "checkout.session.completed",
            data: {
              object: {
                id: "cs_test",
                subscription: "sub_123",
              },
            },
          }),
        },
        subscriptions: {
          retrieve: vi.fn().mockResolvedValue({
            id: "sub_123",
            customer: "cus_123",
            status: "active",
            items: { data: [{ price: { id: "price_pro_monthly_test" } }] },
            current_period_start: 1760000000,
            current_period_end: 1762600000,
            cancel_at_period_end: false,
            trial_start: null,
            trial_end: null,
            metadata: { userId: "user_1" },
          }),
        },
      };

      vi.doMock("@/lib/stripe", () => ({
        __esModule: true,
        stripe: stripeClient,
        getStripe: () => stripeClient,
        StripeConfigError: class extends Error {
          readonly name = "StripeConfigError" as const;
          constructor(public readonly capability: string) {
            super(`Stripe is not configured for "${capability}"`);
          }
        },
      }));

      vi.doMock("@sports/db", () => ({
        __esModule: true,
        db: {
          webhookEvent: {
            findUnique: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({ id: "wh_1" }),
          },
          subscription: {
            upsert: vi.fn().mockResolvedValue({ id: "s_1" }),
            findUnique: vi.fn().mockResolvedValue(null),
            updateMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
          checkoutAttempt: {
            updateMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
        },
        requireDurableWriteStore: vi.fn(),
        DurableWriteStoreUnavailableError: class extends Error {
          readonly kind = "durable_write_store_unavailable" as const;
        },
      }));

      process.env["STRIPE_WEBHOOK_SECRET"] = "whsec_test";
      process.env["STRIPE_PRO_MONTHLY_PRICE_ID"] = "price_pro_monthly_test";

      const { NextRequest } = await import("next/server");
      const { POST } = await import("@/app/api/webhooks/stripe/route");

      const req = new NextRequest("http://localhost/api/webhooks/stripe", {
        method: "POST",
        body: "{}",
        headers: { "stripe-signature": "sig_valid" },
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      await waitFor(() => {
        expect(mocks.track).toHaveBeenCalledWith("checkout_complete", {
          tier: "PRO",
        });
      });

      vi.resetModules();
    });
  });
});
