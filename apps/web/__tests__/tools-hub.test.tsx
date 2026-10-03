import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";

/**
 * /tools — the free public calculators hub. Pins:
 *   - all four calculators are linked,
 *   - every card shows its formula (the "math you can read" plaque),
 *   - zero trust-gate banned phrases, zero affiliate-style copy.
 */

// Nav is an async server component that calls auth(); Footer is pure chrome.
vi.mock("@/components/ui/nav", () => ({ Nav: (): null => null }));
vi.mock("@/components/ui/footer", () => ({ Footer: (): null => null }));
// Reveal/Stagger use window.matchMedia (not polyfilled in jsdom here) purely
// for a scroll-in animation; render children through unchanged so content
// assertions still work without pulling in a matchMedia shim.
vi.mock("@/components/motion/reveal", () => ({
  Reveal: ({ children }: { children: ReactNode }) => children,
  Stagger: ({ children }: { children: ReactNode[] }) => children,
}));

import ToolsHubPage from "@/app/tools/page";

// Mirrors scripts/guardrails/trust-gate.mjs BANNED_PHRASES (case-insensitive substrings).
const TRUST_GATE_BANNED_PHRASES = [
  "guaranteed",
  "sure thing",
  "risk-free",
  "risk free",
  "riskless",
  "easy money",
  "free money",
  "can't lose",
  "cant lose",
  "verified track record",
  "guaranteed profit",
  "guaranteed roi",
  "guaranteed winner",
  "lock of the day",
  "automatic winner",
  "beat the book",
  "insider information",
  "profitable system",
  "no risk",
  "100% chance",
];

describe("/tools hub", () => {
  it("renders and links to all four calculators", async () => {
    const { container } = render(await ToolsHubPage());
    const hrefs = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/tools/ev-calculator");
    expect(hrefs).toContain("/tools/no-vig-calculator");
    expect(hrefs).toContain("/tools/odds-converter");
    expect(hrefs).toContain("/tools/parlay-calculator");
  });

  it("shows a formula plaque for every calculator card", async () => {
    const { container } = render(await ToolsHubPage());
    const plaques = container.querySelectorAll('[data-testid="formula-plaque"]');
    expect(plaques.length).toBeGreaterThanOrEqual(4);
    for (const p of Array.from(plaques)) {
      expect((p.textContent ?? "").length).toBeGreaterThan(0);
    }
  });

  it("never uses trust-gate banned phrases", async () => {
    const { container } = render(await ToolsHubPage());
    const text = (container.textContent ?? "").toLowerCase();
    for (const banned of TRUST_GATE_BANNED_PHRASES) {
      expect(text, `hub page must not contain "${banned}"`).not.toContain(banned);
    }
  });

  it("carries no affiliate tracking links and states the free/no-paywall posture", async () => {
    const { container } = render(await ToolsHubPage());
    const text = container.textContent ?? "";
    expect(text.toLowerCase()).toContain("free");
    // No outbound tracking-style / affiliate links — every href is an internal path.
    const hrefs = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href") ?? "");
    expect(hrefs.every((h) => h.startsWith("/"))).toBe(true);
    expect(hrefs.some((h) => h.includes("utm_") || h.includes("partner="))).toBe(false);
  });
});
