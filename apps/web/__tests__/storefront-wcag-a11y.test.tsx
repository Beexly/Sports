/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
// jsdom bootstrap: keep React on the global scope for classic-runtime consumers.
// Typed cast instead of @ts-ignore (ban-ts-comment) — behavior unchanged.
(globalThis as Record<string, unknown>).React = React;
import { render } from "@testing-library/react";

vi.mock("@/components/ui/nav", () => ({
  Nav: () => React.createElement("nav", { "data-testid": "mock-nav", "aria-label": "Main Navigation" }),
}));

vi.mock("@/components/ui/footer", () => ({
  Footer: () => React.createElement("footer", { "data-testid": "mock-footer", "aria-label": "Site Footer" }),
}));

vi.mock("@/components/motion/reveal", () => ({
  Reveal: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
}));

import HomePage from "../app/page";
import PackagesPage from "../app/packages/page";
import { RedlineWorld } from "../components/redline/redline-world";
import { LIVE_PACKAGE_CATALOG } from "../lib/packages/catalog";
import { getActiveUpcomingWriteups } from "../lib/writeups/coach-writeup-engine";

function setupMatchMedia(reducedMotion: boolean = false) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes("prefers-reduced-motion") ? reducedMotion : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(() => false),
  }));
}

describe("WCAG 2.1 AA Storefront Accessibility & Landmark Hardening", () => {
  beforeEach(() => {
    setupMatchMedia(false);
  });

  describe("HomePage (apps/web/app/page.tsx)", () => {
    it("renders a keyboard-accessible skip-link pointing to #main-content", async () => {
      const { container } = render(await HomePage());
      const skipLink = container.querySelector('a[href="#main-content"]');
      expect(skipLink).not.toBeNull();
      expect(skipLink?.textContent).toContain("Skip to board");
      expect(skipLink?.className).toContain("sr-only");
      expect(skipLink?.className).toContain("focus:not-sr-only");
    });

    it("wraps primary storefront and board content inside <main id=\"main-content\">", async () => {
      const { container } = render(await HomePage());
      const main = container.querySelector("main#main-content");
      expect(main).not.toBeNull();

      // Board and responsible close sections live inside the main landmark
      const boardSection = main?.querySelector('[data-testid="homepage-doctrine-board"]');
      const closeSection = main?.querySelector('[data-testid="homepage-responsible-close"]');
      const worldSection = main?.querySelector('[data-testid="redline-world"]');

      expect(boardSection).not.toBeNull();
      expect(closeSection).not.toBeNull();
      expect(worldSection).not.toBeNull();
    });

    it("ensures zero '%' confidence labels across rendered home copy", async () => {
      const { container } = render(await HomePage());
      const text = container.textContent ?? "";
      // Must never claim XX% confidence (strictly XX/100)
      expect(text).not.toMatch(/\b\d{1,2}(?:\.\d+)?%\s*(?:confidence|conf)\b/i);
      expect(text).not.toMatch(/\bconfidence\s*:\s*\d{1,2}%\b/i);
    });
  });

  describe("PackagesPage (apps/web/app/packages/page.tsx)", () => {
    it("renders <main id=\"main-content\"> as the primary landmark", async () => {
      const { container } = render(await PackagesPage());
      const main = container.querySelector("main#main-content");
      expect(main).not.toBeNull();
    });

    it("renders stage5-gate-band with role=\"status\" and aria-live=\"polite\"", async () => {
      const { container } = render(await PackagesPage());
      const gateBand = container.querySelector('[data-testid="stage5-gate-band"]');
      expect(gateBand).not.toBeNull();
      expect(gateBand?.getAttribute("role")).toBe("status");
      expect(gateBand?.getAttribute("aria-live")).toBe("polite");
      expect(gateBand?.getAttribute("aria-label")).toMatch(/Stage-5.*gate status/i);
    });

    it("verifies proper heading hierarchy and focus ring visibility on checkout actions", async () => {
      const { container } = render(await PackagesPage());
      const h1 = container.querySelector("h1");
      expect(h1).not.toBeNull();
      expect(h1?.textContent).toContain("Two doors. One standard.");

      const h2Elements = container.querySelectorAll("h2");
      expect(h2Elements.length).toBeGreaterThanOrEqual(2);

      // Verify focus rings on key links
      const recordLink = container.querySelector('a[href="/record"]');
      expect(recordLink?.className).toContain("focus:ring-plasma");
    });

    it("ensures zero '%' confidence strings on public storefront packages copy", async () => {
      const { container } = render(await PackagesPage());
      const text = container.textContent ?? "";
      expect(text).not.toMatch(/\b\d{1,2}(?:\.\d+)?%\s*(?:confidence|conf)\b/i);
      expect(text).not.toMatch(/\bconfidence\s*:\s*\d{1,2}%\b/i);
    });
  });

  describe("RedlineWorld (apps/web/components/redline/redline-world.tsx)", () => {
    it("activates static accessible fallback when prefers-reduced-motion is detected", () => {
      setupMatchMedia(true);
      const packs = LIVE_PACKAGE_CATALOG;
      const writeups = getActiveUpcomingWriteups();

      const { container } = render(<RedlineWorld packs={packs} writeups={writeups} initialStage={2} />);
      const world = container.querySelector('[data-testid="redline-world"]');
      expect(world).not.toBeNull();
      expect(world?.className).toContain("is-static");

      const motionBtn = container.querySelector("button.motion-toggle");
      expect(motionBtn).not.toBeNull();
      expect(motionBtn?.getAttribute("aria-pressed")).toBe("true");
    });

    it("marks purely decorative 3D canvas and HUD elements with aria-hidden=\"true\"", () => {
      const packs = LIVE_PACKAGE_CATALOG;
      const writeups = getActiveUpcomingWriteups();

      const { container } = render(<RedlineWorld packs={packs} writeups={writeups} initialStage={0} />);
      const camera = container.querySelector(".world-camera");
      expect(camera?.getAttribute("aria-hidden")).toBe("true");

      const hud = container.querySelector(".plate-hud");
      expect(hud?.getAttribute("aria-hidden")).toBe("true");

      const photo = container.querySelector(".world-photograph");
      expect(photo?.getAttribute("aria-hidden")).toBe("true");
    });

    it("renders confidence exclusively as XX/100, never as percentage", () => {
      const packs = LIVE_PACKAGE_CATALOG;
      const writeups = getActiveUpcomingWriteups();

      const { container } = render(<RedlineWorld packs={packs} writeups={writeups} initialStage={2} initialPanel="slate" />);
      const text = container.textContent ?? "";
      expect(text).not.toMatch(/\b\d{1,2}(?:\.\d+)?%\s*conf/i);
      // Verify integer score format exists
      expect(text).toContain("85/100");
      expect(text).toMatch(/\d{2}\/100/);
    });
  });
});
