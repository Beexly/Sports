/**
 * Targeted coverage for composeJournalDraftMarkdown branches not reached by
 * model-journal-compose.test.ts.
 *
 * The primary test covers: thin-week note (settledPicks=2), wins + losses
 * section with picks, loss autopsies section with 1 autopsy.
 *
 * This file covers: normal scope note (settledPicks >= 3), sectionLines when
 * empty (no wins → "No settled picks in this category"), no loss autopsies,
 * picks capped at 6 per section, and lessonTags "none" fallback.
 */

import { describe, it, expect } from "vitest";
import { composeJournalDraftMarkdown } from "@/lib/journal/compose";
import type { JournalWeekData, JournalWeekPickEvidence } from "@/lib/journal/week-data";

function makePick(id: string, result: "WIN" | "LOSS" | "PUSH"): JournalWeekPickEvidence {
  return {
    id,
    gameId: `game-${id}`,
    matchup: "BOS @ NYK",
    sportId: "basketball_nba",
    leagueId: "nba",
    selection: "BOS -3.5",
    pickType: "SPREAD",
    tier: "FREE",
    pickGrade: "SOLID_PLAY",
    confidence: 70,
    edgeScore: 4.5,
    consensusPct: 0.62,
    bookmakerCount: 10,
    result,
    settledAt: "2026-05-19T03:00:00.000Z",
    modelVersion: "v5.1.0",
    reasoning: "Factor read held.",
    factorBreakdown: null,
    signalSnapshot: null,
  };
}

function baseWeekData(overrides: Partial<JournalWeekData> = {}): JournalWeekData {
  return {
    isoWeek: 21,
    isoYear: 2026,
    rangeStart: "2026-05-18T00:00:00.000Z",
    rangeEnd: "2026-05-24T23:59:59.999Z",
    picks: [],
    lossAutopsies: [],
    counts: {
      settledPicks: 0,
      wins: 0,
      losses: 0,
      pushes: 0,
      publicLossAutopsies: 0,
    },
    ...overrides,
  };
}

// ============================================================
// scopeNote — settledPicks >= 3 branch
// ============================================================

describe("composeJournalDraftMarkdown — normal scope note (settledPicks >= 3)", () => {
  it("uses the anchored-to-evidence note when >= 3 settled picks", () => {
    const picks = [makePick("p1", "WIN"), makePick("p2", "WIN"), makePick("p3", "LOSS")];
    const markdown = composeJournalDraftMarkdown("Week Test", baseWeekData({
      picks,
      counts: { settledPicks: 3, wins: 2, losses: 1, pushes: 0, publicLossAutopsies: 0 },
    }));
    expect(markdown).toContain("This draft should stay anchored to the settled-pick evidence below.");
    expect(markdown).not.toContain("Thin-week note");
  });
});

// ============================================================
// sectionLines — empty sections
// ============================================================

describe("composeJournalDraftMarkdown — no wins section", () => {
  it("shows 'No settled picks in this category' when no wins", () => {
    const picks = [makePick("p1", "LOSS")];
    const markdown = composeJournalDraftMarkdown("Week Test", baseWeekData({
      picks,
      counts: { settledPicks: 1, wins: 0, losses: 1, pushes: 0, publicLossAutopsies: 0 },
    }));
    // The "What the Model Got Right" section should have the no-picks message
    const winSection = markdown.split("## What the Model Got Wrong")[0]!;
    expect(winSection).toContain("No settled picks in this category for the selected week.");
  });
});

describe("composeJournalDraftMarkdown — no losses section", () => {
  it("shows 'No settled picks in this category' when no losses", () => {
    const picks = [makePick("p1", "WIN")];
    const markdown = composeJournalDraftMarkdown("Week Test", baseWeekData({
      picks,
      counts: { settledPicks: 1, wins: 1, losses: 0, pushes: 0, publicLossAutopsies: 0 },
    }));
    // The "What the Model Got Wrong" section should have the no-picks message
    const afterWrong = markdown.split("## What the Model Got Wrong")[1]!;
    expect(afterWrong).toContain("No settled picks in this category for the selected week.");
  });
});

// ============================================================
// Loss autopsies — empty branch
// ============================================================

describe("composeJournalDraftMarkdown — no loss autopsies", () => {
  it("shows 'No public loss autopsies are attached' when lossAutopsies is empty", () => {
    const markdown = composeJournalDraftMarkdown("Week Test", baseWeekData({
      lossAutopsies: [],
      counts: { settledPicks: 0, wins: 0, losses: 0, pushes: 0, publicLossAutopsies: 0 },
    }));
    expect(markdown).toContain("No public loss autopsies are attached to this week yet.");
  });
});

// ============================================================
// Picks capped at 6 per section
// ============================================================

describe("composeJournalDraftMarkdown — picks capped at 6", () => {
  it("includes at most 6 wins in the wins section", () => {
    const picks = Array.from({ length: 8 }, (_, i) => makePick(`win-${i}`, "WIN"));
    const markdown = composeJournalDraftMarkdown("Week Test", baseWeekData({
      picks,
      counts: { settledPicks: 8, wins: 8, losses: 0, pushes: 0, publicLossAutopsies: 0 },
    }));
    // Each pick line contains "pick win-N" — count those
    const winSection = markdown.split("## What the Model Got Wrong")[0]!;
    const pickLines = winSection.split("\n").filter((l) => l.startsWith("- ") && l.includes("BOS @ NYK"));
    expect(pickLines.length).toBe(6);
  });
});

// ============================================================
// lessonTags "none" fallback
// ============================================================

describe("composeJournalDraftMarkdown — lessonTags none fallback", () => {
  it("shows 'lesson tags none' when lessonTags is empty array", () => {
    const markdown = composeJournalDraftMarkdown("Week Test", baseWeekData({
      lossAutopsies: [{
        id: "auto-1",
        pickId: "pick-x",
        headline: "Test autopsy",
        rootCause: "INJURY_SHOCK",
        lessonTags: [], // empty → "none"
        whatWeLearned: "We learned something.",
        authoredAt: "2026-05-21T12:00:00.000Z",
        modelVersion: "v5.1.0",
      }],
      counts: { settledPicks: 0, wins: 0, losses: 1, pushes: 0, publicLossAutopsies: 1 },
    }));
    expect(markdown).toContain("lesson tags none");
  });

  it("shows actual tags when lessonTags has values", () => {
    const markdown = composeJournalDraftMarkdown("Week Test", baseWeekData({
      lossAutopsies: [{
        id: "auto-2",
        pickId: "pick-y",
        headline: "Another autopsy",
        rootCause: "LINE_MOVEMENT",
        lessonTags: ["late-movement", "sharp-reversal"],
        whatWeLearned: "Sharp reversal.",
        authoredAt: "2026-05-21T12:00:00.000Z",
        modelVersion: "v5.1.0",
      }],
      counts: { settledPicks: 0, wins: 0, losses: 1, pushes: 0, publicLossAutopsies: 1 },
    }));
    expect(markdown).toContain("late-movement, sharp-reversal");
  });
});
