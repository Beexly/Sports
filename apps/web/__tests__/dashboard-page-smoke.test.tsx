import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";

/**
 * Smoke test: /dashboard — the customer dashboard.
 *
 * The highest-value untested LIVE route that touches MONEY, AUTH, and
 * USER DATA. Linked from NavAuth, /auth/signin (callback after sign-in),
 * and /pricing ("Cancel any time from your dashboard").
 *
 * This test exercises the UNAUTHENTICATED branch: when auth() returns
 * null, the page must render a "Sign in required" gate (not throw, not
 * hang on a DB query). This is the first render test for /dashboard —
 * existing tests only do source-level text matching.
 *
 * Dependencies mocked:
 *  - @/lib/auth: auth() → returns null (no session)
 *  - Next.js server-only imports are handled by the JS environment mock.
 */
const mocks = vi.hoisted(() => ({
  auth: vi.fn<() => Promise<null>>(),
}));

vi.mock("@/lib/auth", () => ({
  auth: mocks.auth,
}));

// Stub Nav (async server component) and Footer — neither carries dashboard data.
vi.mock("@/components/ui/nav", () => ({
  Nav: (): null => null,
}));
vi.mock("@/components/ui/footer", () => ({
  Footer: (): null => null,
}));

import DashboardPage from "@/app/dashboard/page";

describe("/dashboard smoke", () => {
  beforeEach(() => {
    mocks.auth.mockResolvedValue(null);
  });

  it("renders without throwing when unauthenticated", async () => {
    const { container } = render(
      await DashboardPage({ searchParams: {} }),
    );
    await waitFor(() => {
      expect(container).not.toBeEmptyDOMElement();
    });
  });

  it("shows the sign-in-required gate for anonymous visitors", async () => {
    const { getByText } = render(
      await DashboardPage({ searchParams: {} }),
    );
    await waitFor(() => {
      expect(
        getByText("Sign in required"),
      ).toBeInTheDocument();
    });
    expect(
      getByText(/The customer dashboard requires an authenticated session/i),
    ).toBeInTheDocument();
    // The gate must offer a path back to sign-in with a callback URL.
    expect(
      getByText("Continue to sign in"),
    ).toBeInTheDocument();
  });
});
