import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";

/**
 * Smoke test: /auth/signin — the authentication entry point.
 *
 * The single most security-critical PUBLIC route: it handles OAuth callback
 * URLs, error states, and is linked from the footer (auth flow). Zero test
 * evidence existed — classified as "no evidence" in the route census.
 *
 * Mock `auth()` to return null (unauthenticated) so the page renders the
 * sign-in form. This is the anonymous branch — the one every visitor hits.
 * The page also imports GeneratedPlate (an immersive component); stub it
 * to keep the render hermetic and fast.
 */
const mocks = vi.hoisted(() => ({
  auth: vi.fn<() => Promise<null>>(),
}));

vi.mock("@/lib/auth", () => ({
  auth: mocks.auth,
  signIn: vi.fn(),
}));

vi.mock("@/components/immersive/generated-plate", () => ({
  GeneratedPlate: (): null => null,
}));

import SignInPage from "@/app/auth/signin/page";

describe("/auth/signin smoke", () => {
  beforeEach(() => {
    mocks.auth.mockResolvedValue(null);
  });

  it("renders without throwing (unauthenticated)", async () => {
    const { container } = render(await SignInPage({ searchParams: {} }));
    await waitFor(() => {
      expect(container).not.toBeEmptyDOMElement();
    });
  });

  it("renders the sign-in heading and Google OAuth form", async () => {
    const { getByText } = render(await SignInPage({ searchParams: {} }));
    await waitFor(() => {
      expect(getByText(/Sign in to/i)).toBeInTheDocument();
    });
    expect(
      getByText(/Continue with Google/i),
    ).toBeInTheDocument();
    // Legal links must always be present on the sign-in surface.
    expect(getByText("Terms of Service")).toBeInTheDocument();
    expect(getByText("Privacy Policy")).toBeInTheDocument();
  });
});
