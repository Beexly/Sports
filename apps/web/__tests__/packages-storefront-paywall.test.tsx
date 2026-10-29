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

  it("exposes 4 Week 8 Galaxy Picks packages with guaranteedPriceCents: null and zero third-party brand names", () => {
    expect(LIVE_PACKAGE_CATALOG.length).toBe(4);
    const slugs = LIVE_PACKAGE_CATALOG.map((p) => p.slug);
    expect(slugs).toEqual([
      "tnf-all-in-pack",
      "sunday-nfl-5pct-slate",
      "sgp-correlation-basket",
      "week8-all-access",
    ]);

    const bannedBrands = /\b(WagerTalk|OnlyFans|FTN|Circa|Pinnacle)\b/i;
    for (const pkg of LIVE_PACKAGE_CATALOG) {
      expect(pkg.guaranteedPriceCents).toBeNull();
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
    expect(container.textContent).toContain("Unlock Picks Now — $19");
    expect(container.textContent).toContain(
      "What’s Inside: Side · Total · JEV Player Props · Correlated SGP · DFS Lineup Core",
    );
    expect(container.textContent).toContain(
      "🔒 Locked Until Purchase — Instant Reveal on This Page",
    );
    expect(container.textContent).not.toMatch(/Telegram/i);
    expect(container.textContent).not.toMatch(/10,000|simulation|dropbacks|%/i);
    // Guaranteed toggle must not render when guaranteedPriceCents is null
    expect(container.textContent).not.toContain("Guaranteed Credit-Back");

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

  it("renders unlocked PaywallRevealCard in-place with XX/100 confidence and honest BET THIS / PASS — NO BET badges", () => {
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
    expect(container.textContent).toContain("Green Bay Packers -3.5");
    expect(container.textContent).toContain("BET THIS:");
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

  it("gates old routes with Under Construction notice and keeps app/page.tsx free of DoorCard, FieldBoardTicker, NoBetGateChapter, and FieldRecordPanel", () => {
    const gatedPages = [
      BoardPage,
      PicksPage,
      PlayersPage,
      SgpProjectionsPage,
      IntelligenceEnginesPage,
      CalibrationProofRoomPage,
      FantasyHubPage,
    ];

    for (const PageComponent of gatedPages) {
      const { container, unmount } = render(<PageComponent />);
      expect(container.textContent).toContain(
        "🚧 Under Construction — Galaxy Picks & DFS Only",
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

    const homeSrc = readFileSync(resolve(__dirname, "..", "app", "page.tsx"), "utf8");
    expect(homeSrc).not.toContain("DoorCard");
    expect(homeSrc).not.toContain("FieldBoardTicker");
    expect(homeSrc).not.toContain("NoBetGateChapter");
    expect(homeSrc).not.toContain("FieldRecordPanel");

    const packagesSrc = readFileSync(
      resolve(__dirname, "..", "app", "packages", "page.tsx"),
      "utf8",
    );
    expect(packagesSrc).toContain(
      "Plain-English NFL Picks, Player Props &amp; Parlays — Written so you know exactly what to bet and why in 30 seconds.",
    );
    expect(packagesSrc).not.toMatch(/10,000|simulation|dropbacks|%/i);
  });
});
