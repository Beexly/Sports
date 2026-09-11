import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SubscribeButton } from "@/components/pricing/subscribe-button";
import {
  clearCheckoutIntent,
  readCheckoutIntent,
  saveCheckoutIntent,
} from "@/lib/pricing/checkout-resume";

/**
 * FE-08: checkout resume across the sign-in bounce.
 *
 * SubscribeButton sends an unauthenticated visitor to /auth/signin, which
 * unmounts the pricing page and drops all React state. Without persisting
 * the intent first, the visitor lands back on a blank form and has to
 * re-pick a tier and re-toggle billing interval.
 *
 * Age gate / DOB removed 2026-09-14.
 */

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

beforeEach(() => {
  pushMock.mockClear();
  clearCheckoutIntent();
  vi.restoreAllMocks();
});

describe("checkout-resume storage helpers", () => {
  it("round-trips a saved intent", () => {
    saveCheckoutIntent({ tier: "PRO", interval: "year" });
    expect(readCheckoutIntent()).toEqual({
      tier: "PRO",
      interval: "year",
    });
  });

  it("does not resurrect an intent older than 30 minutes", () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
    saveCheckoutIntent({ tier: "ELITE", interval: "month" });

    vi.spyOn(Date, "now").mockReturnValue(now + 31 * 60 * 1000);
    expect(readCheckoutIntent()).toBeNull();
  });

  it("clears the stored intent", () => {
    saveCheckoutIntent({ tier: "FANTASY", interval: "month" });
    clearCheckoutIntent();
    expect(readCheckoutIntent()).toBeNull();
  });
});

describe("SubscribeButton checkout resume", () => {
  it("saves tier/interval before bouncing an unauthenticated click to sign-in", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ status: 401, ok: false, json: async () => ({}) }),
    );

    render(
      <SubscribeButton
        tier="ELITE"
        label="Go Elite"
        variant="primary"
        interval="year"
        priceMonthly={24.99}
        priceAnnual={179}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /go elite/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/auth/signin?callbackUrl=/pricing"));
    expect(readCheckoutIntent()).toEqual({
      tier: "ELITE",
      interval: "year",
    });
  });

  it("does not require a date of birth to start checkout", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ url: "https://checkout.stripe.test/session" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    // jsdom has no location assignment target; intercept.
    const locationSpy = vi.fn();
    Object.defineProperty(window, "location", {
      value: { href: "", assign: locationSpy },
      writable: true,
    });

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

    fireEvent.click(screen.getByRole("button", { name: /go pro/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string) as Record<string, unknown>;
    expect(body.tier).toBe("PRO");
    expect(body).not.toHaveProperty("dateOfBirth");
    expect(screen.queryByLabelText(/date of birth/i)).toBeNull();
  });
});
