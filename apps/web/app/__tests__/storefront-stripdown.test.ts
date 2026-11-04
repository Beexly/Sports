/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeAll } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Storefront stripdown contract.
 *
 * AGENTS.md narrowed the public storefront to Galaxy Picks and DFS. This suite
 * pins the four surfaces that survived the stripdown and the copy rules that
 * keep them honest.
 *
 * REWRITTEN 2026-11-03. The original file imported two routes that no longer
 * exist (`games/[slug]`, `dfs`) and asserted the retired FIELD design: PLAY and
 * PASS badges, revenue pillars, the wagertalk storefront, and the old "market
 * is full of noise" hero. Those surfaces are gone. The prohibitions are not:
 * no banned jargon, no fabricated settlement examples, no "Under Construction"
 * copy on a live storefront page. Every prohibition below is carried over
 * unchanged from the original suite.
 */

vi.mock("@/components/ui/nav", () => ({
  Nav: () => React.createElement("nav", { "data-testid": "mock-nav" }),
}));

vi.mock("@/components/ui/footer", () => ({
  Footer: () => React.createElement("footer", { "data-testid": "mock-footer" }),
}));

vi.mock("@/components/motion/reveal", () => ({
  Reveal: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
}));

import HomePage from "../page";
import PackagesPage from "../packages/page";
import GamePage from "../games/[gameId]/page";
import DfsSuitePage from "../fantasy/dfs/page";
import DfsLegacyPage from "../dfs/page";

const webRoot = resolve(__dirname, "..", "..");
const read = (rel: string) => readFileSync(resolve(webRoot, rel), "utf8");

const STOREFRONT_FILES = [
  "app/page.tsx",
  "app/packages/page.tsx",
  "app/games/[gameId]/page.tsx",
  "app/fantasy/dfs/page.tsx",
] as const;

/**
 * Phrases the storefront stripdown removed. Each one either leaked internal
 * modelling jargon to customers or described a surface that no longer exists.
 */
const BANNED = [
  /\bBrier\b/i,
  /\bCLV\b/,
  /Stage 1/i,
  /\bJEV\b/,
  /Sinkhorn/i,
  /Cholesky/i,
  /Fr[eé]chet/i,
  /James-Stein/i,
  /Four doors/i,
  /5-pillar/i,
  /\bUnder\s+Construction\b/i,
];

beforeAll(() => {
  // RedlineWorld reads prefers-reduced-motion through window.matchMedia in an
  // effect. jsdom ships no implementation, so the field would throw on mount.
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  }
});

describe("storefront stripdown: surviving surfaces exist", () => {
  for (const rel of STOREFRONT_FILES) {
    it(`keeps ${rel}`, () => {
      expect(existsSync(resolve(webRoot, rel))).toBe(true);
    });
  }

  it("keeps the [gameId] rename and the live legacy /dfs landing page", () => {
    // The game dossier route was renamed from [slug] to [gameId]. The old
    // segment must not return as a second, divergent dossier surface.
    expect(existsSync(resolve(webRoot, "app/games/[slug]/page.tsx"))).toBe(false);
    // /dfs is a live legacy landing page (HTTP 200 in production, last updated
    // 2026-10-31). It is not the canonical DFS suite (/fantasy/dfs), but it is
    // reachable and sells the same pack, so it stays and must keep rendering.
    expect(existsSync(resolve(webRoot, "app/dfs/page.tsx"))).toBe(true);
  });
});

describe("storefront stripdown: copy stays clean", () => {
  for (const rel of STOREFRONT_FILES) {
    it(`${rel} carries no banned jargon`, () => {
      const src = read(rel);
      for (const pattern of BANNED) {
        expect(src).not.toMatch(pattern);
      }
    });
  }
});

describe("storefront stripdown: surfaces render", () => {
  it("renders HomePage with the field and the responsible close", () => {
    const { container } = render(React.createElement(HomePage));

    expect(container.querySelector('[data-testid="redline-world"]')).not.toBeNull();
    expect(
      container.querySelector('[data-testid="homepage-responsible-close"]')
    ).not.toBeNull();
    expect(container.textContent).toContain("The math can point. The decision stays yours.");
    expect(container.textContent).toContain("Close / Responsible Intelligence");
    expect(container.textContent).toContain(
      "Past performance does not guarantee future results."
    );
    expect(container.querySelector('[data-testid="mock-footer"]')).not.toBeNull();
  });

  it("renders PackagesPage with the Week 8 sealed board hero", () => {
    const { container } = render(React.createElement(PackagesPage));

    expect(container.textContent).toContain("GALAXY PICKS");
    expect(container.textContent).toContain("Choose Your Football Pack");
    expect(container.querySelector("#slate-dossiers")).not.toBeNull();
    expect(container.querySelector('[data-testid="mock-footer"]')).not.toBeNull();
  });

  it("renders GamePage with locked official calls and no leaked picks", () => {
    const { container } = render(
      React.createElement(GamePage, { params: { gameId: "nfl-2026-w8-lac-lar" } })
    );

    expect(container.textContent).toContain("Official Picks Locked");
    expect(container.textContent).toContain("Official Spread Call");
    expect(container.textContent).toContain("Locked Until Purchase");
    // Locked means locked: no side, total, or confidence number escapes the card.
    expect(container.textContent).not.toMatch(/Confidence Rating:/);
    expect(container.textContent).not.toMatch(/%/);
  });

  it("renders DfsSuitePage with its slate-breakdown copy", async () => {
    const element = await DfsSuitePage();
    const { container } = render(element);

    expect(container.textContent).toContain(
      "How We Break Down the Slate for Cash Games & Tournaments"
    );
    expect(container.textContent).toContain(
      "Unlock Full DFS Lineup Cores & Official Game Picks"
    );
  });

  it("renders the legacy /dfs landing page", () => {
    const { container } = render(React.createElement(DfsLegacyPage));

    expect(container.textContent).toContain(
      "DFS Optimizer, Cash Cores & Tournament Stacks"
    );
    expect(container.textContent).toContain("How We Build Winning DFS Rosters");
  });
});
