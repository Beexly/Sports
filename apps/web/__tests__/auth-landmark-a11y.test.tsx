import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

/**
 * The root layout (app/layout.tsx) renders a "Skip to content" link as the very
 * first focusable element on EVERY page:
 *
 *     <a href="#main-content" className="sr-only focus:not-sr-only …">
 *
 * That link is only real if the page it lands on actually contains
 * `id="main-content"`. Most routes wrap their body in
 * `<main id="main-content">` — but the sign-in and auth-error pages did not, so
 * the first thing a keyboard user reached on the login surface was a link that
 * moved focus nowhere (WCAG 2.4.1 bypass blocks). The same held for the
 * unauthenticated branch of /dashboard.
 *
 * These are runtime assertions against the rendered DOM (apps/web/tsconfig.json
 * excludes test files from typecheck, so a type-level assertion would never run).
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
import AuthErrorPage from "@/app/auth/error/page";

/** The anchor the root-layout skip link points at. */
const SKIP_TARGET = "main-content";

describe("auth surfaces expose the skip-link target", () => {
  beforeEach(() => {
    mocks.auth.mockResolvedValue(null);
  });

  it("/auth/signin renders a main landmark", async () => {
    const { getByRole } = render(await SignInPage({ searchParams: {} }));
    expect(getByRole("main")).toBeInTheDocument();
  });

  it("/auth/signin's main landmark carries the skip-link id", async () => {
    const { getByRole } = render(await SignInPage({ searchParams: {} }));
    expect(getByRole("main").getAttribute("id")).toBe(SKIP_TARGET);
  });

  it("/auth/error renders a main landmark carrying the skip-link id", () => {
    const { getByRole } = render(AuthErrorPage({ searchParams: {} }));
    const main = getByRole("main");
    expect(main).toBeInTheDocument();
    expect(main.getAttribute("id")).toBe(SKIP_TARGET);
  });

  it("keeps the sign-in heading inside the main landmark", async () => {
    const { getByRole } = render(await SignInPage({ searchParams: {} }));
    const heading = getByRole("heading", { level: 1 });
    expect(getByRole("main").contains(heading)).toBe(true);
  });
});

/**
 * WCAG 2.4.2 — every page needs a title that describes its topic. Neither auth
 * page exported one, so both inherited the root layout's default and announced
 * as "Galaxy Sports Edge | …" — byte-identical to the homepage. A screen-reader
 * user tabbing between windows, and anyone scanning browser history or a pile of
 * tabs mid-signup, had no way to tell the login page from the marketing page.
 */
describe("auth surfaces have distinct, meaningful page titles", () => {
  it("/auth/signin exports its own metadata title", async () => {
    const mod = await import("@/app/auth/signin/page");
    expect(mod.metadata?.title).toBeTruthy();
    expect(String(mod.metadata?.title)).toMatch(/sign in/i);
  });

  it("/auth/error exports its own metadata title", async () => {
    const mod = await import("@/app/auth/error/page");
    expect(mod.metadata?.title).toBeTruthy();
    expect(String(mod.metadata?.title)).not.toMatch(/^Galaxy Sports Edge$/i);
  });

  it("the two auth titles are not identical to each other", async () => {
    const signin = await import("@/app/auth/signin/page");
    const error = await import("@/app/auth/error/page");
    expect(String(signin.metadata?.title)).not.toBe(
      String(error.metadata?.title),
    );
  });
});
