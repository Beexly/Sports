import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { PublicPick } from "@sports/types";
import { selectGradingLine } from "@sports/prediction-engine";
import { PickCard } from "@/components/picks/pick-card";
import { gradedLineDisplay, publicGradedLine } from "@/lib/picks/graded-line-display";

/**
 * Ledger C-143: the line a settled pick is GRADED on is not always the line
 * its card DISPLAYS. DECIDED (founder, delegated 2026-09-08 via the launch
 * orchestrator): grading is unchanged, and a settled card LEADS with the
 * graded number ("Graded at X"), showing the later refreshed line only as
 * secondary context when the two differ. These tests pin both halves: the
 * public payload's `gradedLine` decision and that display order.
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
      sport: "NCAAF",
    },
    pickType: "TOTAL",
    selection: "OVER 83.5",
    line: 83.5,
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
    result: "WIN",
    receiptHash: null,
    gradedLine: 74,
    ...overrides,
  };
}

describe("publicGradedLine (the /api/picks payload decision)", () => {
  it("publishes the lock line on a settled TOTAL, exactly as selectGradingLine chose it", () => {
    const pick = { pickType: "TOTAL" as const, result: "WIN" as const, line: 83.5, clvLockLine: 74 };
    expect(publicGradedLine(pick)).toBe(74);
    expect(publicGradedLine(pick)).toBe(selectGradingLine({ clvLockLine: 74, line: 83.5 }));
  });

  it("falls back to line on a settled SPREAD with no lock, and keeps a genuine 0 lock", () => {
    expect(publicGradedLine({ pickType: "SPREAD", result: "LOSS", line: -2.5, clvLockLine: null })).toBe(-2.5);
    expect(publicGradedLine({ pickType: "SPREAD", result: "PUSH", line: -2.5, clvLockLine: 0 })).toBe(0);
  });

  it("publishes null where no grade against a line has happened: MONEYLINE, PENDING, VOID", () => {
    expect(publicGradedLine({ pickType: "MONEYLINE", result: "WIN", line: -150, clvLockLine: -140 })).toBeNull();
    expect(publicGradedLine({ pickType: "TOTAL", result: "PENDING", line: 83.5, clvLockLine: 74 })).toBeNull();
    expect(publicGradedLine({ pickType: "TOTAL", result: "VOID", line: 83.5, clvLockLine: 74 })).toBeNull();
  });

  it("never publishes a non-finite number", () => {
    expect(publicGradedLine({ pickType: "TOTAL", result: "WIN", line: Number.NaN, clvLockLine: null })).toBeNull();
  });
});

describe("gradedLineDisplay (the settled-row line slot)", () => {
  it("leads with the graded number and gives the refreshed line as secondary context", () => {
    const d = gradedLineDisplay({ pickType: "TOTAL", result: "WIN", line: 83.5, gradedLine: 74 });
    expect(d).not.toBeNull();
    expect(d!.graded).toBe("+74");
    expect(d!.shown).toBe("+83.5");
    expect(d!.primaryText).toBe("Graded at +74");
    expect(d!.secondaryText).toBe("Line as last refreshed: +83.5");
  });

  it("still leads with the graded number when the two agree, and gives no second number", () => {
    const d = gradedLineDisplay({ pickType: "TOTAL", result: "WIN", line: 74, gradedLine: 74 });
    expect(d).not.toBeNull();
    expect(d!.primaryText).toBe("Graded at +74");
    expect(d!.shown).toBeNull();
    expect(d!.secondaryText).toBeNull();
  });

  it("is null when the row has not been graded against a line, so the caller keeps the live line", () => {
    expect(gradedLineDisplay({ pickType: "TOTAL", result: "PENDING", line: 83.5, gradedLine: 74 })).toBeNull();
    expect(gradedLineDisplay({ pickType: "TOTAL", result: "VOID", line: 83.5, gradedLine: 74 })).toBeNull();
    expect(gradedLineDisplay({ pickType: "TOTAL", result: "WIN", line: 83.5, gradedLine: null })).toBeNull();
    expect(gradedLineDisplay({ pickType: "TOTAL", result: "WIN", line: 83.5 })).toBeNull();
  });

  it("is TOTAL-only: a SPREAD card renders no `line`, and MONEYLINE is not graded on one", () => {
    expect(gradedLineDisplay({ pickType: "SPREAD", result: "WIN", line: -3.5, gradedLine: -2.5 })).toBeNull();
    expect(gradedLineDisplay({ pickType: "MONEYLINE", result: "WIN", line: -150, gradedLine: -140 })).toBeNull();
  });
});

describe("PickCard leads a settled TOTAL with the graded line (C-143)", () => {
  it("shows 'Graded at' as the primary number and the refreshed line as secondary", () => {
    const { getByTestId, queryByText } = render(
      <PickCard pick={fixturePick()} canSeeConfidence canSeeEdgeScore canSeeFactorBreakdown />,
    );
    expect(getByTestId("graded-line-primary").textContent).toBe("Graded at +74");
    expect(getByTestId("graded-line-secondary").textContent).toBe("Line as last refreshed: +83.5");
    // The bare "Line: +83.5" lead is gone on a settled row: the refreshed
    // number no longer reads as the number the result came from.
    expect(queryByText(/^Line:\s*\+83\.5$/)).toBeNull();
  });

  it("leads with the graded number and shows no second number when they agree", () => {
    const { getByTestId, queryByTestId } = render(
      <PickCard
        pick={fixturePick({ gradedLine: 83.5 })}
        canSeeConfidence
        canSeeEdgeScore
        canSeeFactorBreakdown
      />,
    );
    expect(getByTestId("graded-line-primary").textContent).toBe("Graded at +83.5");
    expect(queryByTestId("graded-line-secondary")).toBeNull();
  });

  it("keeps the live line on a PENDING pick: nothing has been graded yet", () => {
    const { getByText, queryByTestId } = render(
      <PickCard
        pick={fixturePick({ result: "PENDING", gradedLine: null })}
        canSeeConfidence
        canSeeEdgeScore
        canSeeFactorBreakdown
      />,
    );
    expect(getByText(/Line:\s*\+83\.5/)).toBeTruthy();
    expect(queryByTestId("graded-line-primary")).toBeNull();
    expect(queryByTestId("graded-line-secondary")).toBeNull();
  });
});
