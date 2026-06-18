import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { PickCard } from "@/components/picks/pick-card";
import type { PublicPick, FactorBreakdown, IndependentEdgeSummary } from "@sports/types";

/**
 * The independent-edge layer is the product's intelligence differentiator: a
 * market-INDEPENDENT model's read shown next to the book's de-vigged price.
 * These render tests pin that it:
 *   - shows the real numbers (our read %, market %, beat-the-close) when an
 *     estimate has an opinion,
 *   - never appears when there's no estimate (no fabricated "independent" claim),
 *   - stays hidden on a PASS decision (no false signal),
 *   - is honest about being surfaced, not priced.
 *
 * isAuditAvailable is false so the card renders without its client-only
 * Evidence/AskWhy children — we're testing the factor panel, not the drawer.
 */

afterEach(cleanup);

function independentEdge(overrides: Partial<IndependentEdgeSummary> = {}): IndependentEdgeSummary {
  return {
    decision: "LEAN",
    agreement: "CONFIRMS",
    marketFairProb: 0.58,
    trueProb: 0.63,
    rawEdge: 0.05,
    shrunkEdge: 0.04,
    expectedClv: 2.1,
    conviction: 60,
    sources: ["elo"],
    priced: false,
    rationale: "Elo reads the home side higher than the de-vigged close.",
    ...overrides,
  };
}

function factorBreakdown(overrides: Partial<FactorBreakdown> = {}): FactorBreakdown {
  return {
    consensusScore: 22,
    marketDepthScore: 16,
    edgeScore: 18,
    lineMovementScore: 4,
    volatilityPenalty: 0,
    dataQualityScore: 82,
    factors: [{ name: "Consensus", impact: "positive", description: "Books align.", weight: 22 }],
    ...overrides,
  };
}

function makePick(overrides: Partial<PublicPick> = {}): PublicPick {
  return {
    id: "pick-ie-1",
    game: { homeTeam: "Chiefs", awayTeam: "Bills", commenceTime: "2026-04-15T18:00:00Z", sport: "NFL" },
    pickType: "MONEYLINE",
    selection: "Chiefs ML (-180)",
    line: -180,
    confidence: 72,
    edgeScore: 61,
    factorBreakdown: factorBreakdown(),
    dataQualityScore: 82,
    tier: "PREMIUM",
    pickGrade: "SOLID_PLAY",
    riskLevel: "MODERATE",
    reasoning: "Chiefs to win outright: 8 books, fair-valued near 62%.",
    reasoningShort: "62% fair-value consensus on Chiefs.",
    isFeatured: false,
    isAuditAvailable: false,
    generatedAt: "2026-04-15T12:00:00Z",
    dataFreshnessAt: "2026-04-15T12:00:00Z",
    result: "PENDING",
    ...overrides,
  };
}

function renderCard(pick: PublicPick) {
  return render(
    <PickCard pick={pick} canSeeConfidence canSeeEdgeScore canSeeFactorBreakdown />
  );
}

describe("PickCard — independent-edge display", () => {
  it("shows our read against the market when the estimate has an opinion", () => {
    renderCard(makePick({ factorBreakdown: factorBreakdown({ independentEdge: independentEdge() }) }));
    expect(screen.getByText(/Independent edge/i)).toBeTruthy();
    expect(screen.getByText("63%")).toBeTruthy();      // our read (trueProb)
    expect(screen.getByText("58%")).toBeTruthy();      // market fair prob
    expect(screen.getByText(/Beat-the-close/i)).toBeTruthy();
    expect(screen.getByText(/\+2\.1 pts/)).toBeTruthy();
    // honest about its status
    expect(screen.getByText(/not yet priced/i)).toBeTruthy();
  });

  it("never renders the independent layer when there is no estimate", () => {
    renderCard(makePick({ factorBreakdown: factorBreakdown({ independentEdge: undefined }) }));
    expect(screen.queryByText(/Independent edge/i)).toBeNull();
    expect(screen.queryByText(/Our read/i)).toBeNull();
  });

  it("stays hidden on a PASS decision — no false signal", () => {
    renderCard(makePick({ factorBreakdown: factorBreakdown({ independentEdge: independentEdge({ decision: "PASS" }) }) }));
    expect(screen.queryByText(/Independent edge/i)).toBeNull();
  });

  it("omits the beat-the-close chip when expected CLV is not positive", () => {
    renderCard(makePick({ factorBreakdown: factorBreakdown({ independentEdge: independentEdge({ expectedClv: 0 }) }) }));
    expect(screen.getByText(/Independent edge/i)).toBeTruthy();
    expect(screen.queryByText(/Beat-the-close/i)).toBeNull();
  });
});
