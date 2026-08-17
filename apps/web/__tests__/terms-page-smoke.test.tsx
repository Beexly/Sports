import { describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";

/**
 * Smoke test: /terms — the public Terms of Service.
 *
 * Reachable from the footer (Terms link). Promised on /pricing and /signin
 * as the cancellation/refund policy surface. A render regression here
 * breaks the legal contract the business relies on.
 *
 * Nav and Footer are stubbed to focus on the page's own JSX.
 */
vi.mock("@/components/ui/nav", () => ({
  Nav: (): null => null,
}));
vi.mock("@/components/ui/footer", () => ({
  Footer: (): null => null,
}));

import TermsPage from "@/app/terms/page";

describe("/terms smoke", () => {
  it("renders without throwing", async () => {
    const { container } = render(await TermsPage());
    await waitFor(() => {
      expect(container).not.toBeEmptyDOMElement();
    });
  });

  it("renders the title and 10 sections", async () => {
    const { getByText } = render(await TermsPage());
    await waitFor(() => {
      expect(getByText("Terms of Service")).toBeInTheDocument();
    });
    // Pin the ten section headings that constitute the legal contract.
    const expectedHeadings = [
      "1. Acceptance of these terms",
      "2. What the Service is",
      "3. No guarantees",
      "4. Eligibility",
      "5. Subscriptions and billing",
      "6. Acceptable use",
      "7. Promotions and affiliate links",
      "8. Disclaimers",
      "9. Changes",
      "10. Contact",
    ];
    for (const heading of expectedHeadings) {
      expect(getByText(heading)).toBeInTheDocument();
    }
    // The 3-day money-back window is the key refund promise on /terms §5.
    expect(getByText(/3-day money-back window/i)).toBeInTheDocument();
    // "Cancel any time" promise lives on /pricing, not /terms — verifying
    // /terms §5 specifically says "cancel from your account dashboard".
    expect(
      getByText(/cancel from your account dashboard at any time/i),
    ).toBeInTheDocument();
  });
});
