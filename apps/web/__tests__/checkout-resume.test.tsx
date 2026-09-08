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
 * re-pick a tier, re-toggle billing interval, and retype their DOB.
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
    saveCheckoutIntent({ tier: "PRO", interval: "year", dateOfBirth: "1990-01-01" });
    expect(readCheckoutIntent()).toEqual({
      tier: "PRO",
      interval: "year",
      dateOfBirth: "1990-01-01",
    });
  });

  it("does not resurrect an intent older than 30 minutes", () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
    saveCheckoutIntent({ tier: "ELITE", interval: "month", dateOfBirth: "1985-05-05" });

    vi.spyOn(Date, "now").mockReturnValue(now + 31 * 60 * 1000);
    expect(readCheckoutIntent()).toBeNull();
  });

  it("clears the stored intent", () => {
    saveCheckoutIntent({ tier: "FANTASY", interval: "month", dateOfBirth: "2000-06-15" });
    clearCheckoutIntent();
    expect(readCheckoutIntent()).toBeNull();
  });
});

describe("SubscribeButton checkout resume", () => {
  it("saves tier/interval/DOB before bouncing an unauthenticated click to sign-in", async () => {
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

    fireEvent.change(screen.getByLabelText(/date of birth/i), {
      target: { value: "1992-03-04" },
    });
    fireEvent.click(screen.getByRole("button", { name: /go elite/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/auth/signin?callbackUrl=/pricing"));
    expect(readCheckoutIntent()).toEqual({
      tier: "ELITE",
      interval: "year",
      dateOfBirth: "1992-03-04",
    });
  });

  it("restores the DOB it saved when the matching tier/interval button remounts", () => {
    saveCheckoutIntent({ tier: "PRO", interval: "month", dateOfBirth: "1988-11-20" });

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

    expect(screen.getByLabelText(/date of birth/i)).toHaveValue("1988-11-20");
    // Consumed once restored — a second, unrelated button must not also claim it.
    expect(readCheckoutIntent()).toBeNull();
  });

  it("never fills in a DOB saved for a different tier or interval", () => {
    saveCheckoutIntent({ tier: "PRO", interval: "year", dateOfBirth: "1988-11-20" });

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

    expect(screen.getByLabelText(/date of birth/i)).toHaveValue("");
    // Left for whichever button actually matches.
    expect(readCheckoutIntent()).not.toBeNull();
  });
});
