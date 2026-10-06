import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { PublicPick } from "@sports/types";
import { PickCard } from "@/components/picks/pick-card";
import { formatMarketImpliedLabel } from "@/lib/picks/market-implied-display";

/**
 * Pick card render contract for FE-05 and the v5.2.8 display side (C-107):
 *   - a receipted book-priced moneyline shows the verified market-implied label;
 *   - a signal-slate row shows "No book price attached", a stripped selection
 *     and no percentage anywhere;
 *   - a SPREAD pick shows no percentage.
 *
 * Interactive children are stubbed: they are client components with their own
 * tests, and the card's own text is the subject here.
 */
vi.mock("@/components/picks/evidence-audit-drawer", () => ({
  EvidenceAuditDrawer: (): null => null,
}));
vi.mock("@/components/picks/ask-why", () => ({
  AskWhy: (): null => null,
}));
vi.mock("@/components/picks/verify-pick-button", () => ({
  VerifyPickButton: (): null => null,
}));

/** Test fixture only. */
function fixturePick(overrides: Partial<PublicPick> = {}): PublicPick {
  return {
    id: "fixture-pick-1",
    game: {
      homeTeam: "Home",
      awayTeam: "Away",
      commenceTime: new Date("2026-09-13T17:00:00Z").toISOString(),
      sport: "NFL",
    },
    pickType: "MONEYLINE",
    selection: "Home ML",
    line: -150,
    hasBookPrice: true,
    lineMovement: null,
    confidence: 70,
    confidenceCalibrated: null,
    edgeScore: 12,
    factorBreakdown: null,
    dataQualityScore: 90,
    tier: "PREMIUM",
    pickGrade: "LEAN",
    riskLevel: "MODERATE",
    reasoning: "Fixture reasoning. More text.",
    reasoningShort: "Fixture reasoning.",
    isFeatured: false,
    isAuditAvailable: false,
    generatedAt: new Date("2026-09-12T12:00:00Z").toISOString(),
    dataFreshnessAt: null,
    result: "PENDING",
    receiptHash: null,
    ...overrides,
  };
}

function renderCard(pick: PublicPick, canSeeConfidence = true): HTMLElement {
  const { container } = render(
    <PickCard
      pick={pick}
      canSeeConfidence={canSeeConfidence}
      canSeeEdgeScore
      canSeeFactorBreakdown={canSeeConfidence}
    />,
  );
  return container;
}

describe("PickCard: market-implied win probability", () => {
  it("renders the verified label for a receipted book-priced moneyline", () => {
    const marketImplied = { prob: 0.6142, bookmakerCount: 6 };
    const container = renderCard(fixturePick({ marketImplied, receiptHash: "a".repeat(64) }));
    const node = container.querySelector('[data-testid="market-implied-win-probability"]');
    expect(node?.textContent).toBe(formatMarketImpliedLabel(marketImplied));
    expect(node?.textContent).toContain("Market-implied win probability 61%");
    expect(node?.textContent).toContain("averaged across the 6 books in the snapshot");
    // Confidence stays a selection score, never a percent.
    expect(container.textContent).toContain("70/100");
  });

  it("renders the label for a viewer who cannot see confidence, and no percent beside it", () => {
    // Phase 2: the card no longer gates this on canSeeConfidence. The API is
    // the scope authority — it omits the field entirely where the number is not
    // publishable — so the card renders whatever it is given.
    const marketImplied = { prob: 0.6142, bookmakerCount: 6 };
    const container = renderCard(fixturePick({ marketImplied }), false);
    const node = container.querySelector('[data-testid="market-implied-win-probability"]');
    expect(node?.textContent).toBe(formatMarketImpliedLabel(marketImplied));

    // The invariant that must hold for this viewer: the ONLY percent on the
    // card is the market-implied one. Confidence is hidden entirely and is
    // never rendered as a percent at any tier.
    const percents = container.textContent?.match(/\d+\s?%/g) ?? [];
    expect(percents).toEqual(["61%"]);
    expect(container.textContent).not.toContain("70/100");
  });

  it("renders no label when the API omitted the field", () => {
    // Scope failures (signal slate, < 2 books, no receipt, SPREAD/TOTAL) all
    // arrive as an absent key, for every tier.
    const container = renderCard(fixturePick({}), false);
    expect(container.querySelector('[data-testid="market-implied-win-probability"]')).toBeNull();
    expect(container.textContent).not.toMatch(/\d+\s?%/);
  });

  it("renders no percentage on a SPREAD pick", () => {
    const container = renderCard(fixturePick({ pickType: "SPREAD", selection: "Home -3.5", line: -3.5 }));
    expect(container.querySelector('[data-testid="market-implied-win-probability"]')).toBeNull();
    expect(container.textContent).not.toMatch(/\d+%/);
  });
});

describe("PickCard: signal-slate row (FE-05)", () => {
  it("shows the plain-language pill, strips the marker and shows no percentage", () => {
    const container = renderCard(
      fixturePick({
        selection: "Home ML (model signal)",
        line: 0,
        hasBookPrice: false,
        edgeScore: null,
      }),
    );
    expect(container.querySelector('[data-testid="no-book-price-pill"]')?.textContent).toBe(
      "No book price attached",
    );
    expect(container.textContent).not.toContain("(model signal)");
    expect(container.textContent).toContain("Home ML");
    expect(container.textContent).not.toMatch(/Line:/);
    expect(container.querySelector('[data-testid="market-implied-win-probability"]')).toBeNull();
    expect(container.textContent).not.toMatch(/\d+%/);
  });

  it("keeps the explicit line on a book-priced total", () => {
    const container = renderCard(fixturePick({ pickType: "TOTAL", selection: "OVER 48.5", line: 48.5 }));
    expect(container.querySelector('[data-testid="no-book-price-pill"]')).toBeNull();
    expect(container.textContent).toContain("Line: +48.5");
  });
});
