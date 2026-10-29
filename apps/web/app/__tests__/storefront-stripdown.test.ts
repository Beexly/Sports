/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

vi.mock("@/components/ui/nav", () => ({
  Nav: () => React.createElement("nav", { "data-testid": "mock-nav" }),
}));

vi.mock("@/components/ui/footer", () => ({
  Footer: () => React.createElement("footer", { "data-testid": "mock-footer" }),
}));

vi.mock("@/components/motion/reveal", () => ({
  Reveal: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children),
}));

vi.mock("@/components/motion/signal-decode", () => ({
  SignalDecode: ({ children }: { children: React.ReactNode }) => React.createElement("span", null, children),
}));

vi.mock("@/components/ui/galaxy-cursor", () => ({
  GalaxyCursor: () => React.createElement("div", { "data-testid": "mock-cursor" }),
}));

vi.mock("@/components/landing/field-cinematic-intro", () => ({
  FieldCinematicIntro: () => React.createElement("div", { "data-testid": "mock-intro" }),
}));

vi.mock("@/components/landing/field-hero-canvas", () => ({
  FieldHeroCanvas: () => React.createElement("canvas", { "data-testid": "mock-canvas" }),
}));

vi.mock("@/components/ui/risk-disclosure", () => ({
  RiskDisclosure: () => React.createElement("div", { "data-testid": "mock-risk" }),
}));

import HomePage from "../page";
import PackagesPage from "../packages/page";
import GameDossierPage from "../games/[slug]/page";
import DfsPage from "../dfs/page";

describe("Storefront Stripdown & High-Contrast Visual Readability", () => {
  const appRoot = resolve(__dirname, "..");
  const targetFiles = [
    resolve(appRoot, "page.tsx"),
    resolve(appRoot, "packages", "page.tsx"),
    resolve(appRoot, "games", "[slug]", "page.tsx"),
    resolve(appRoot, "dfs", "page.tsx"),
  ];

  it("verifies all four storefront UI presentation files exist on disk", () => {
    for (const filePath of targetFiles) {
      expect(existsSync(filePath), `Expected file to exist: ${filePath}`).toBe(true);
    }
  });

  it("verifies readable body copy styling (text-[#F3EFE6], text-base or sm:text-[17px], leading-relaxed) in all four files", () => {
    for (const filePath of targetFiles) {
      const src = readFileSync(filePath, "utf8");
      expect(src).toContain("text-[#F3EFE6]");
      expect(src).toContain("leading-relaxed");
      expect(src).toMatch(/text-base|sm:text-\[17px\]/);
    }
  });

  it("verifies high-contrast action badges for PLAY and PASS across all four files", () => {
    const playBadgePattern = /bg-emerald-500\/20\s+text-emerald-300\s+border\s+border-emerald-400\/50\s+font-bold\s+tracking-wide\s+shadow-sm/;
    const passBadgePattern = /bg-amber-500\/20\s+text-amber-200\s+border\s+border-amber-400\/50\s+font-semibold\s+tracking-wide/;

    // Files with active betting decision displays
    const filesWithBadges = [
      resolve(appRoot, "page.tsx"),
      resolve(appRoot, "packages", "page.tsx"),
      resolve(appRoot, "games", "[slug]", "page.tsx"),
    ];

    for (const filePath of filesWithBadges) {
      const src = readFileSync(filePath, "utf8");
      expect(src, `PLAY badge missing in ${filePath}`).toMatch(playBadgePattern);
      expect(src, `PASS badge missing in ${filePath}`).toMatch(passBadgePattern);
    }
  });

  it("verifies tabular key numbers with bold high contrast numerals (font-mono text-base sm:text-lg font-bold text-white tabular-nums)", () => {
    const tabularPattern = /font-mono\s+text-base\s+sm:text-lg\s+font-bold\s+text-white\s+tabular-nums/;

    for (const filePath of targetFiles) {
      const src = readFileSync(filePath, "utf8");
      expect(src, `Tabular key numbers missing in ${filePath}`).toMatch(tabularPattern);
    }
  });

  it("verifies strictly zero banned phrases across all four files", () => {
    const bannedPhrases = [
      /\bBrier\b/i,
      /\bCLV\b/,
      /\bStage\s*1\b/i,
      /\bJEV\b/,
      /\bSinkhorn\b/i,
      /\bCholesky\b/i,
      /\bFr[eé]chet\b/i,
      /\bJames-Stein\b/i,
      /\bFour\s+Doors\b/i,
      /\b5-Pillar\b/i,
      /\bUnder\s+Construction\b/i,
    ];

    for (const filePath of targetFiles) {
      const src = readFileSync(filePath, "utf8");
      for (const banned of bannedPhrases) {
        expect(src, `File ${filePath} contains banned phrase matching ${String(banned)}`).not.toMatch(banned);
      }
    }
  });

  it("renders HomePage without errors and preserves revenue-pillars and wagertalk-storefront test hooks", async () => {
    const PageComponent = await HomePage();
    const { container } = render(PageComponent);
    expect(container.querySelector("#revenue-pillars")).not.toBeNull();
    expect(container.querySelector('[data-testid="five-pillar-revenue-section"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="homepage-wagertalk-storefront"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="homepage-responsible-close"]')).not.toBeNull();
    expect(container.textContent).toContain("The market is full of noise.");
    expect(container.textContent).toContain("Plain-English NFL Picks, Player Props & Parlays");
  });

  it("renders PackagesPage without errors and includes required marketing hero and slate dossiers", () => {
    const { container } = render(React.createElement(PackagesPage));
    expect(container.querySelector("#slate-dossiers")).not.toBeNull();
    expect(container.textContent).toContain(
      "Plain-English NFL Picks, Player Props & Parlays — Written so you know exactly what to bet and why in 30 seconds.",
    );
    expect(container.textContent).toContain("Choose Your Betting Pack");
  });

  it("renders GameDossierPage for TNF Panthers @ Packers with high-contrast Action Badges and tabular ratings", () => {
    const { container } = render(React.createElement(GameDossierPage, { params: { slug: "nfl-2026-w8-car-gb" } }));
    expect(container.textContent).toContain("Carolina Panthers @ Green Bay Packers");
    expect(container.textContent).toContain("SPREAD CALL");
    expect(container.textContent).toContain("TOTAL CALL");
    expect(container.textContent).toMatch(/Confidence Rating:/);
    expect(container.textContent).not.toMatch(/%/);
  });

  it("renders DfsPage with readable body copy, captain leverage notes, and high-floor cash cores", () => {
    const { container } = render(React.createElement(DfsPage));
    expect(container.textContent).toContain("DFS Optimizer, Cash Cores & Tournament Stacks");
    expect(container.textContent).toContain("Showdown Captain / Top Target");
    expect(container.textContent).toContain("High-Floor Cash Core");
  });
});
