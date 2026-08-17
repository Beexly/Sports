import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

/**
 * P16-03 — NavAuth and NavAuthFallback tests.
 *
 * NavAuth is an async server component. In the test environment we mock
 * @/lib/auth and the sibling components it transitively imports, then await
 * the component directly (server-component test pattern; see
 * __tests__/board-gate-page.test.tsx for precedent).
 */
const mocks = vi.hoisted(() => ({
  auth: vi.fn<() => Promise<{ user?: { id?: string; name?: string | null; email?: string | null; image?: string | null } } | null>>(),
}));

vi.mock("@/lib/auth", () => ({
  auth: mocks.auth,
}));

vi.mock("@sports/prediction-engine", () => ({
  getReadinessGates: () => ({ canExposePublicPicks: false }),
}));

vi.mock("@/components/ui/mobile-nav", () => ({
  MobileNav: () => null,
}));

vi.mock("next/image", () => ({
  default: (props: { src: string; alt: string; width?: number; height?: number }) => (
    <img src={props.src} alt={props.alt} width={props.width} height={props.height} />
  ),
}));

// Import the REAL NavAuth and NavAuthFallback from their own module — no
// module-level mock of nav-auth.tsx, so these tests exercise the actual
// auth-dependent code path.
import { NavAuth, NavAuthFallback } from "@/components/ui/nav-auth";

beforeEach(() => {
  mocks.auth.mockReset();
});

describe("NavAuth — signed-out state", () => {
  it("renders Sign in + See plans when auth() returns null", async () => {
    mocks.auth.mockResolvedValue(null);

    const { container } = render(await NavAuth());

    expect(container.querySelector('a[href="/auth/signin"]')).not.toBeNull();
    expect(container.querySelector('a[href="/pricing"]')).not.toBeNull();
    expect(container.querySelector('a[href="/dashboard"]')).toBeNull();
  });

  it("renders Sign in + See plans when auth() rejects (fail-closed to anonymous)", async () => {
    mocks.auth.mockRejectedValue(new Error("cookie read failed"));

    const { container } = render(await NavAuth());

    expect(container.querySelector('a[href="/auth/signin"]')).not.toBeNull();
    expect(container.querySelector('a[href="/pricing"]')).not.toBeNull();
    expect(container.querySelector('a[href="/dashboard"]')).toBeNull();
  });
});

describe("NavAuth — signed-in state", () => {
  it("renders the user's name as a dashboard link when auth() returns a session", async () => {
    mocks.auth.mockResolvedValue({
      user: {
        id: "user-123",
        name: "Test User",
        email: "test@example.com",
        image: null,
      },
    });

    const { container, getByText } = render(await NavAuth());

    expect(container.querySelector('a[href="/dashboard"]')).not.toBeNull();
    expect(getByText("Test User")).toBeInTheDocument();
    expect(container.querySelector('a[href="/auth/signin"]')).toBeNull();
    expect(container.querySelector('a[href="/pricing"]')).toBeNull();
  });

  it("renders the avatar image when auth() returns a session with an image", async () => {
    mocks.auth.mockResolvedValue({
      user: {
        id: "user-123",
        name: "Test User",
        email: "test@example.com",
        image: "https://example.com/avatar.png",
      },
    });

    const { container } = render(await NavAuth());

    expect(container.querySelector('img[alt="Test User"]')).not.toBeNull();
    expect(container.querySelector('img[src="https://example.com/avatar.png"]')).not.toBeNull();
  });
});

describe("NavAuthFallback — signed-out mirror for Suspense loading state", () => {
  it("renders Sign in + See plans (same as NavAuth signed-out)", () => {
    const { container } = render(<NavAuthFallback />);

    expect(container.querySelector('a[href="/auth/signin"]')).not.toBeNull();
    expect(container.querySelector('a[href="/pricing"]')).not.toBeNull();
    expect(container.querySelector('a[href="/dashboard"]')).toBeNull();
  });
});
