import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

import { SubscribeButton } from "@/components/pricing/subscribe-button";

/**
 * The last click before money changes hands.
 *
 * SubscribeButton client-validates date of birth (21+) before it will POST to
 * /api/subscriptions/checkout. When that check fails it rendered a
 * `role="alert"` banner — good — but the failure was never connected to the
 * field that caused it:
 *
 *   - the <input> was not marked `aria-invalid`, so a screen reader announced
 *     the date field as perfectly valid while checkout silently refused to
 *     proceed (WCAG 3.3.1);
 *   - the error text was not `aria-describedby` the input, so moving to the
 *     field gave no hint what was wrong (WCAG 3.3.1 / 3.3.3);
 *   - focus stayed on the Subscribe button, so a keyboard user heard "there is
 *     a problem" and was left standing on the control that just refused them,
 *     with no cue where to go.
 *
 * The net effect: a blind user clicks Subscribe, nothing happens, and the
 * product is unbuyable. These are RUNTIME assertions (apps/web/tsconfig.json
 * excludes __tests__ from typecheck) queried by accessible role and name.
 */

const DOB_LABEL = /date of birth/i;

function renderPro() {
  return render(
    <SubscribeButton
      tier="PRO"
      label="Subscribe to Pro"
      variant="primary"
      interval="month"
      priceMonthly={14.99}
      priceAnnual={99}
    />,
  );
}

describe("SubscribeButton — date-of-birth validation is exposed to assistive tech", () => {
  it("marks the date field invalid when checkout is refused for a missing DOB", async () => {
    const user = userEvent.setup();
    renderPro();

    await user.click(screen.getByRole("button", { name: /subscribe to pro/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(screen.getByLabelText(DOB_LABEL)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("describes the date field with the error text that blocked checkout", async () => {
    const user = userEvent.setup();
    renderPro();

    await user.click(screen.getByRole("button", { name: /subscribe to pro/i }));

    const alert = await screen.findByRole("alert");
    const input = screen.getByLabelText(DOB_LABEL);
    const describedBy = input.getAttribute("aria-describedby") ?? "";
    expect(describedBy.split(/\s+/)).toContain(alert.id);
    expect(alert.id).not.toBe("");
    expect(alert).toHaveTextContent(/date of birth/i);
  });

  it("moves focus to the field that blocked checkout", async () => {
    const user = userEvent.setup();
    renderPro();

    await user.click(screen.getByRole("button", { name: /subscribe to pro/i }));

    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByLabelText(DOB_LABEL));
    });
  });

  it("clears the invalid state once the user edits the field", async () => {
    const user = userEvent.setup();
    renderPro();

    await user.click(screen.getByRole("button", { name: /subscribe to pro/i }));
    await waitFor(() => {
      expect(screen.getByLabelText(DOB_LABEL)).toHaveAttribute(
        "aria-invalid",
        "true",
      );
    });

    const input = screen.getByLabelText(DOB_LABEL);
    await user.type(input, "1990-01-02");

    await waitFor(() => {
      expect(input).not.toHaveAttribute("aria-invalid", "true");
    });
  });

  it("keeps the recurring-billing disclosure as the button's description", async () => {
    renderPro();
    const button = screen.getByRole("button", { name: /subscribe to pro/i });
    const describedBy = button.getAttribute("aria-describedby") ?? "";
    expect(describedBy).not.toBe("");
    const disclosure = document.getElementById(describedBy);
    expect(disclosure).not.toBeNull();
    expect(disclosure).toHaveTextContent(/auto-renews/i);
  });
});
