/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PaywallRevealCard } from "@/components/packages/paywall-reveal-card";
import { LIVE_PACKAGE_CATALOG, getPackageBySlug } from "@/lib/packages/catalog";
import {
  LIVE_SLATE_COACH_WRITEUPS,
  getRedactedTeasersForWindowSlot,
  getWriteupsForWindowSlot,
} from "@/lib/writeups/coach-writeup-engine";
import BoardPage from "@/app/board/page";
import PicksPage from "@/app/picks/page";
import PlayersPage from "@/app/players/page";
import SgpProjectionsPage from "@/app/sgp-projections/page";
import IntelligenceEnginesPage from "@/app/intelligence/engines/page";
import CalibrationProofRoomPage from "@/app/calibration/page";
import FantasyHubPage from "@/app/fantasy/page";
import PackagesPage from "@/app/packages/page";

vi.mock("@/components/ui/nav", () => ({
  Nav: () => <nav data-testid="mock-nav" />,
}));

vi.mock("@/components/ui/footer", () => ({
  Footer: () => <footer data-testid="mock-footer" />,
}));

describe("Packages Storefront & Paywall Reveal Vault", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("exposes 5 Week 8 Galaxy Picks packages with creditBackPriceCents: null and zero third-party brand names", () => {
    expect(LIVE_PACKAGE_CATALOG.length).toBe(5);
    const slugs = LIVE_PACKAGE_CATALOG.map((p) => p.slug);
    expect(slugs).toEqual([
      "tnf-all-in-pack",
      "sunday-nfl-5pct-slate",
      "sgp-correlation-basket",
      "redzone-dfs-pro-pack",
      "week8-all-access",
    ]);

    const bannedBrands = /\b(WagerTalk|OnlyFans|FTN|Circa|Pinnacle)\b/i;
    for (const pkg of LIVE_PACKAGE_CATALOG) {
      expect(pkg.creditBackPriceCents).toBeNull();
      const serialized = JSON.stringify(pkg);
      expect(serialized).not.toMatch(bannedBrands);
    }
  });

  it("renders locked PaywallRevealCard with What's Inside checklist, blurred preview badge, XX/100 confidence, and zero leaked picks or %", () => {
    const tnfPkg = getPackageBySlug("tnf-all-in-pack")!;
    const teasers = getRedactedTeasersForWindowSlot(tnfPkg.windowSlot);
    const tnfWriteups = getWriteupsForWindowSlot(tnfPkg.windowSlot);

    const { container } = render(
      <PaywallRevealCard pkg={tnfPkg} teasers={teasers} initialUnlockedWriteups={null} />,
    );

    expect(screen.getByText(tnfPkg.title)).toBeDefined();
    expect(container.textContent).toContain("$19");
    expect(container.textContent).toContain("Unlock Picks Now · $19");
    expect(container.textContent).toContain("What’s inside");
    expect(container.textContent).toContain(
      "Spread call · Over/Under call · Player props · Same-game parlay · DFS lineup core",
    );
    expect(container.textContent).toContain("Already purchased? Enter Receipt ID");
    expect(container.textContent).not.toMatch(/Telegram/i);
    expect(container.textContent).not.toMatch(/10,000|simulation|dropbacks|%/i);
    // Locked preview must NEVER leak confidence numbers, side picks, or over/under picks
    expect(container.textContent).not.toMatch(/Side Confidence|Total Confidence|61\/100|58\/100|Take Green Bay|and the under/i);
    // CreditBack toggle must not render when creditBackPriceCents is null
    expect(container.textContent).not.toContain("Credit-Back");

    // Teaser confidence is formatted strictly as XX/100
    for (const teaser of teasers) {
      expect(teaser.lockedSummary.sideConfidence).toMatch(/^\d{1,3}\/100$/);
      expect(teaser.lockedSummary.totalConfidence).toMatch(/^\d{1,3}\/100$/);
    }

    // Locked DOM must not leak the actual sideSelection string
    for (const w of tnfWriteups) {
      expect(container.textContent).not.toContain(w.sideTotalCall.sideSelection);
    }
  });

  it("renders unlocked PaywallRevealCard in-place with XX/100 confidence and honest BET THIS / PASS · NO BET badges", () => {
    const tnfPkg = getPackageBySlug("tnf-all-in-pack")!;
    const teasers = getRedactedTeasersForWindowSlot(tnfPkg.windowSlot);
    const tnfWriteups = getWriteupsForWindowSlot(tnfPkg.windowSlot);

    const { container } = render(
      <PaywallRevealCard
        pkg={tnfPkg}
        teasers={teasers}
        initialUnlockedWriteups={tnfWriteups}
      />,
    );

    expect(container.textContent).toContain("UNLOCKED IN-PLACE");
    expect(container.textContent).toContain("Live Picks Revealed In-Place");
    // Decision badges must exactly mirror the data decisions: every PLAY
    // renders a BET THIS badge, every PASS renders a PASS · NO BET badge,
    // never more and never fewer. Counts are derived so the pin survives the
    // weekly slate refresh. (As of the Week 8 seal the TNF window is settled:
    // "Game is final. Do not sell a side or a total on a finished game.")
    const unlockedText = container.textContent ?? "";
    const plays = tnfWriteups.reduce(
      (n, w) =>
        n +
        (String(w.sideTotalCall.sideDecision) === "PLAY" ? 1 : 0) +
        (String(w.sideTotalCall.totalDecision) === "PLAY" ? 1 : 0) +
        w.topProps.filter((p) => String(p.decision) === "PLAY").length,
      0,
    );
    const passes = tnfWriteups.reduce(
      (n, w) =>
        n +
        (String(w.sideTotalCall.sideDecision) === "PASS" ? 1 : 0) +
        (String(w.sideTotalCall.totalDecision) === "PASS" ? 1 : 0) +
        w.topProps.filter((p) => String(p.decision) === "PASS").length,
      0,
    );
    expect((unlockedText.match(/BET THIS:/g) ?? []).length).toBe(plays);
    expect((unlockedText.match(/PASS · NO BET/g) ?? []).length).toBe(passes);
expect(container.textContent).toContain(`Confidence: ${tnfWriteups[0]!.sideTotalCall.sideConfidence}`);
expect(container.textContent).toContain(`Confidence: ${tnfWriteups[0]!.sideTotalCall.totalConfidence}`);
expect(container.textContent).not.toMatch(/10,000|simulation|dropbacks|%/i);

// Verify all 14 writeups use XX/100 confidence and honest PLAY/PASS gating
expect(LIVE_SLATE_COACH_WRITEUPS.length).toBe(14);
for (const w of LIVE_SLATE_COACH_WRITEUPS) {
  expect(w.sideTotalCall.sideConfidence).toMatch(/^\d{1,3}\/100$/);
  expect(w.sideTotalCall.totalConfidence).toMatch(/^\d{1,3}\/100$/);
  expect(["PLAY", "PASS"]).toContain(w.sideTotalCall.sideDecision);
  expect(["PLAY", "PASS"]).toContain(w.sideTotalCall.totalDecision);

  for (const prop of w.topProps) {
    expect(prop.confidence).toMatch(/^\d{1,3}\/100$/);
    expect(["PLAY", "PASS"]).toContain(prop.decision);
    if (prop.decision === "PLAY") {
      expect(prop.expectedClv).toBeGreaterThan(0);
        }
      }
    }
  });

  it("gates inactive routes with Under Construction notice (/picks, /board, /calibration, /sgp-projections un-gated to live verified cards), and keeps app/page.tsx free of DoorCard, FieldBoardTicker, NoBetGateChapter, and FieldRecordPanel", () => {
    const gatedPages = [
      PlayersPage,
      IntelligenceEnginesPage,
      FantasyHubPage,
    ];

    for (const PageComponent of gatedPages) {
      const { container, unmount } = render(<PageComponent />);
      expect(container.textContent).toContain(
        "🚧 Under Construction · Galaxy Picks & DFS Only",
      );
      expect(container.textContent).toContain("GALAXY PICKS (PAID)");
      expect(container.textContent).toContain("DFS");
      const hrefs = Array.from(container.querySelectorAll("a")).map((a) =>
        a.getAttribute("href"),
      );
      expect(hrefs).toContain("/packages");
      expect(hrefs).toContain("/fantasy/dfs");
      unmount();
    }

    // /picks, /board, /calibration, /sgp-projections are restored to live production:
    // Pin that they are NOT wearing the stub notice.
    const { container: picksDom, unmount: unmountPicks } = render(<PicksPage />);
    expect(picksDom.textContent).not.toContain("Under Construction");
    expect(picksDom.textContent).toContain("sealed card");
    unmountPicks();

    const { container: boardDom, unmount: unmountBoard } = render(<BoardPage />);
    expect(boardDom.textContent).not.toContain("Under Construction");
    expect(boardDom.textContent).toContain("47-19-1");
    unmountBoard();

    const { container: calDom, unmount: unmountCal } = render(<CalibrationProofRoomPage />);
    expect(calDom.textContent).not.toContain("Under Construction");
    expect(calDom.textContent).toContain("Calibration Proof Room");
    expect(calDom.textContent).toContain("Brier Calibration Score");
    unmountCal();

    const { container: sgpDom, unmount: unmountSgp } = render(<SgpProjectionsPage />);
    expect(sgpDom.textContent).not.toContain("Under Construction");
    expect(sgpDom.textContent).toContain("Correlated SGP Projections");
    unmountSgp();

    const homeSrc = readFileSync(resolve(__dirname, "..", "app", "page.tsx"), "utf8");
    expect(homeSrc).not.toContain("DoorCard");
    expect(homeSrc).not.toContain("FieldBoardTicker");
    expect(homeSrc).not.toContain("NoBetGateChapter");
    expect(homeSrc).not.toContain("FieldRecordPanel");

    const packagesSrc = readFileSync(
      resolve(__dirname, "..", "app", "packages", "page.tsx"),
    "utf8",
    );
    // The storefront hero was reworded by the humanize pass; pin the current
    // stable promise (the pack chooser) instead of the retired sentence.
    expect(packagesSrc).toContain("Choose Your Football Pack");
    expect(packagesSrc).toContain(
      "One-time purchase. Your official picks, player props, and parlays unlock immediately right inside the card below.",
    );
    expect(packagesSrc).not.toMatch(/10,000|simulation|dropbacks/i);
    expect(packagesSrc).toContain("47-19-1");

    const { container: pkgPageDom, unmount: unmountPkgPage } = render(<PackagesPage />);
    const pkgText = pkgPageDom.textContent ?? "";
    expect(pkgText).toContain("Free Matchup & Game-Environment Analytics: Jacksonville Jaguars @ Baltimore Ravens");
    expect(pkgText).not.toContain("Sunday Spotlight Game Pack (Panthers @ Packers)");
    expect(pkgText).not.toContain("Tonight");
    expect(pkgText).not.toMatch(/TONIGHT\s*·\s*TNF/i);
    expect(pkgText).not.toMatch(
      /Take Green Bay|and the under|Side Confidence|Total Confidence|61\/100|58\/100|Green Bay Packers -3\.5|UNDER 47\.5|OVER 54\.5|Detroit Lions -3|Chicago Bears \+3/i,
    );
    unmountPkgPage();
  });
});
