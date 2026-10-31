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
import GameDossierPage from "../games/[gameId]/page";
import DfsPage from "../dfs/page";

describe("Storefront Stripdown & High-Contrast Visual Readability", () => {
  const appRoot = resolve(__dirname, "..");
  const targetFiles = [
    resolve(appRoot, "page.tsx"),
    resolve(appRoot, "packages", "page.tsx"),
    resolve(appRoot, "games", "[gameId]", "page.tsx"),
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

  it("verifies locked official pick badges across storefront surfaces with zero free Sunday pick leaks", () => {
    const lockedBadgePattern = /LOCKED|Locked/i;
    const filesWithBadges = [
      resolve(appRoot, "page.tsx"),
      resolve(appRoot, "packages", "page.tsx"),
      resolve(appRoot, "games", "[gameId]", "page.tsx"),
      resolve(appRoot, "dfs", "page.tsx"),
    ];

    for (const filePath of filesWithBadges) {
      const src = readFileSync(filePath, "utf8");
      expect(src, `LOCKED badge missing in ${filePath}`).toMatch(lockedBadgePattern);
      expect(src, `Stale Panthers @ Packers / Week 9 found in ${filePath}`).not.toMatch(/Panthers @ Packers|WEEK 9/i);
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
    expect(container.textContent).toContain("16-5 · 76.2/100 · +10.45u");
    expect(container.textContent).toContain("47-16 · 74.6/100 · +29.01u");
  });

  it("renders PackagesPage without errors and includes verified engine dominance hero and slate dossiers", () => {
    const { container } = render(React.createElement(PackagesPage));
    expect(container.querySelector("#slate-dossiers")).not.toBeNull();
    expect(container.textContent).toContain("16-5 · 76.2/100 · +10.45u");
    expect(container.textContent).toContain("47-16 · 74.6/100 · +29.01u");
    expect(container.textContent).toContain("22,750,000 Snaps · 581 Markets");
    expect(container.textContent).toContain("Choose Your Football Pack");
  });

  it("renders GameDossierPage for Week 8 MNF Spotlight WAS @ KC with locked official calls and zero % sign", () => {
    const PageElement = GameDossierPage({ params: { gameId: "401873023" } });
    const { container } = render(PageElement);
    expect(container.textContent).toContain("Washington Commanders @ Kansas City Chiefs");
    expect(container.textContent).toContain("Official Spread Call");
    expect(container.textContent).toContain("Official Over/Under Call");
    expect(container.textContent).not.toMatch(/%/);
  });

  it("renders DfsPage with Week 8 DFS Portfolio dominance header and gated cash/GPP stacks", () => {
    const { container } = render(React.createElement(DfsPage));
    expect(container.textContent).toContain("Week 8 DFS Portfolio: DraftKings ($50K) & FanDuel ($60K) Cash Cores & GPP Stacks");
    expect(container.textContent).toContain("Showdown Captain & GPP Stack Architecture");
    expect(container.textContent).toContain("Romano CQR q10 High-Floor Cash Core");
  });
});
