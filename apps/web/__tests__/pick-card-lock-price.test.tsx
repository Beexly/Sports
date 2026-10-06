import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { PublicPick } from "@sports/types";
import { PickCard } from "@/components/picks/pick-card";

/**
 * C-354: the card's price is the publish-time LOCK (`clvLockPrice` /
 * `clvLockLine`), never a number embedded in the selection string.
 * Fixture case from the DoD: selection carries "+102" while the row is
 * locked at −135 — the card must show −135.
 *
 * Interactive children are stubbed (same as pick-card-market-implied.test.tsx).
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
    id: "fixture-lock-price-1",
    game: {
      homeTeam: "Home",
      awayTeam: "Away",
      commenceTime: new Date("2026-09-13T17:00:00Z").toISOString(),
      sport: "NFL",
    },
    pickType: "MONEYLINE",
    selection: "Away ML",
    line: -110,
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
    clvLockPrice: null,
    clvLockLine: null,
    ...overrides,
  };
}

function renderCard(pick: PublicPick): HTMLElement {
  const { container } = render(
    <PickCard
      pick={pick}
      canSeeConfidence={false}
      canSeeEdgeScore
      canSeeFactorBreakdown={false}
    />,
  );
  return container;
}

describe("PickCard: card price is the lock price (C-354)", () => {
  it("shows clvLockPrice −135, not the +102 embedded in the selection string", () => {
    const container = renderCard(
      fixturePick({
        pickType: "MONEYLINE",
        // DoD fixture: selection string carries a different number than the lock.
        selection: "Away ML (+102)",
        line: -110,
        clvLockPrice: -135,
        clvLockLine: null,
      }),
    );
    const price = container.querySelector('[data-testid="card-price"]');
    expect(price).not.toBeNull();
    expect(price?.textContent).toContain("-135");
    // The string-embedded +102 must never appear in the price slot.
    expect(price?.textContent).not.toContain("+102");
    expect(price?.textContent).not.toContain("102");
    // Selection label still shows the pick text; it is not the price source.
    expect(container.textContent).toContain("Away ML");
  });

  it("prefers the lock even when pick.line disagrees", () => {
    const container = renderCard(
      fixturePick({
        pickType: "MONEYLINE",
        selection: "Away ML (+102)",
        line: 102, // live/moved column — must lose to the lock
        clvLockPrice: -135,
      }),
    );
    const price = container.querySelector('[data-testid="card-price"]');
    expect(price?.textContent).toContain("-135");
    expect(price?.textContent).not.toContain("+102");
  });

  it("falls back to line when no lock was captured, still never parsing selection", () => {
    const container = renderCard(
      fixturePick({
        pickType: "MONEYLINE",
        selection: "Away ML (+102)",
        line: -110,
        clvLockPrice: null,
      }),
    );
    const price = container.querySelector('[data-testid="card-price"]');
    expect(price?.textContent).toContain("-110");
    expect(price?.textContent).not.toContain("102");
  });

  it("omits the price slot entirely when lock and line are both absent", () => {
    const container = renderCard(
      fixturePick({
        pickType: "MONEYLINE",
        selection: "Away ML (+102)",
        line: 0,
        clvLockPrice: null,
      }),
    );
    expect(container.querySelector('[data-testid="card-price"]')).toBeNull();
    expect(container.textContent).not.toMatch(/Line:/);
  });

  it("renders clvLockLine for TOTAL when present", () => {
    const container = renderCard(
      fixturePick({
        pickType: "TOTAL",
        selection: "OVER 48.5",
        line: 48.5,
        clvLockLine: 47.5,
        clvLockPrice: null,
      }),
    );
    const line = container.querySelector('[data-testid="card-line"]');
    expect(line?.textContent).toContain("47.5");
    expect(line?.textContent).not.toContain("48.5");
  });
});
