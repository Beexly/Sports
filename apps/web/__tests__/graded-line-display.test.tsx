import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { PublicPick } from "@sports/types";
import { selectGradingLine } from "@sports/prediction-engine";
import { PickCard } from "@/components/picks/pick-card";
import { gradedLineNote, publicGradedLine } from "@/lib/picks/graded-line-display";

/**
 * Ledger C-143: the line a settled pick is GRADED on is not always the line
 * its card DISPLAYS. These tests pin the two halves that make the result
 * reproducible from the card: the public payload's `gradedLine` decision, and
 * the card note that names both numbers when they differ. Nothing here
 * changes which line grades; that is a founder decision.
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

describe("gradedLineNote (the card wording)", () => {
  it("names both numbers, in plain words, when a settled TOTAL was graded on a different line", () => {
    const note = gradedLineNote({ pickType: "TOTAL", result: "WIN", line: 83.5, gradedLine: 74 });
    expect(note).not.toBeNull();
    expect(note!.graded).toBe("+74");
    expect(note!.shown).toBe("+83.5");
    expect(note!.text).toBe(
      "Graded at +74, the line locked when this pick was published. The +83.5 shown above is the line as last refreshed.",
    );
  });

  it("is silent when the two numbers agree, when the pick is not settled, and when nothing was recorded", () => {
    expect(gradedLineNote({ pickType: "TOTAL", result: "WIN", line: 74, gradedLine: 74 })).toBeNull();
    expect(gradedLineNote({ pickType: "TOTAL", result: "PENDING", line: 83.5, gradedLine: 74 })).toBeNull();
    expect(gradedLineNote({ pickType: "TOTAL", result: "WIN", line: 83.5, gradedLine: null })).toBeNull();
    expect(gradedLineNote({ pickType: "TOTAL", result: "WIN", line: 83.5 })).toBeNull();
  });

  it("is TOTAL-only for now: a SPREAD card shows the chosen side's number, not `line`", () => {
    expect(gradedLineNote({ pickType: "SPREAD", result: "WIN", line: -3.5, gradedLine: -2.5 })).toBeNull();
    expect(gradedLineNote({ pickType: "MONEYLINE", result: "WIN", line: -150, gradedLine: -140 })).toBeNull();
  });
});

describe("PickCard renders the graded line beside the displayed one (C-143)", () => {
  it("shows the note with both numbers on a settled TOTAL whose graded line differs", () => {
    const { getByTestId, getByText } = render(
      <PickCard pick={fixturePick()} canSeeConfidence canSeeEdgeScore canSeeFactorBreakdown />,
    );
    // The displayed line is still the card's own number.
    expect(getByText(/Line:\s*\+83\.5/)).toBeTruthy();
    const note = getByTestId("graded-line-note");
    expect(note.textContent).toContain("Graded at +74");
    expect(note.textContent).toContain("+83.5 shown above");
  });

  it("shows no note when the graded line is the displayed line", () => {
    const { queryByTestId } = render(
      <PickCard
        pick={fixturePick({ gradedLine: 83.5 })}
        canSeeConfidence
        canSeeEdgeScore
        canSeeFactorBreakdown
      />,
    );
    expect(queryByTestId("graded-line-note")).toBeNull();
  });

  it("shows no note on a PENDING pick even when a lock is present on the row", () => {
    const { queryByTestId } = render(
      <PickCard
        pick={fixturePick({ result: "PENDING", gradedLine: null })}
        canSeeConfidence
        canSeeEdgeScore
        canSeeFactorBreakdown
      />,
    );
    expect(queryByTestId("graded-line-note")).toBeNull();
  });
});
