/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { PaywallRevealCard } from "@/components/packages/paywall-reveal-card";
import { LIVE_PACKAGE_CATALOG, getPackageBySlug } from "@/lib/packages/catalog";
import {
  LIVE_SLATE_COACH_WRITEUPS,
  getRedactedTeasersForWindowSlot,
  getWriteupsForWindowSlot,
} from "@/lib/writeups/coach-writeup-engine";

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

  it("renders locked PaywallRevealCard with redacted teasers, XX/100 confidence, and zero leaked picks", () => {
    const tnfPkg = getPackageBySlug("tnf-all-in-pack")!;
    const teasers = getRedactedTeasersForWindowSlot(tnfPkg.windowSlot);
    const tnfWriteups = getWriteupsForWindowSlot(tnfPkg.windowSlot);

    const { container } = render(
      <PaywallRevealCard pkg={tnfPkg} teasers={teasers} initialUnlockedWriteups={null} />,
    );

    expect(screen.getByText(tnfPkg.title)).toBeDefined();
    expect(container.textContent).toContain("$19");
    expect(container.textContent).toContain("Unlock Picks Now — $19");
    expect(container.textContent).not.toMatch(/Telegram/i);
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

  it("renders unlocked PaywallRevealCard in-place with XX/100 confidence and honest PLAY/PASS writeup data", () => {
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
    expect(container.textContent).toContain("Confidence: 69/100");
    expect(container.textContent).toContain("Confidence: 78/100");

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
});
