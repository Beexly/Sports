import { describe, expect, it } from "vitest";
import { composeJournalDraftMarkdown } from "@/lib/journal/compose";
import type { JournalWeekData } from "@/lib/journal/week-data";

const weekData: JournalWeekData = {
  isoWeek: 21,
  isoYear: 2026,
  rangeStart: "2026-05-18T00:00:00.000Z",
  rangeEnd: "2026-05-25T00:00:00.000Z",
  picks: [
    {
      id: "pick-win",
      gameId: "game-1",
      matchup: "BOS @ NYY",
      sportId: "baseball_mlb",
      leagueId: "mlb",
      selection: "BOS ML",
      pickType: "MONEYLINE",
      tier: "FREE",
      pickGrade: "SOLID_PLAY",
      confidence: 72,
      edgeScore: 6.4,
      consensusPct: 0.64,
      bookmakerCount: 12,
      result: "WIN",
      settledAt: "2026-05-19T03:00:00.000Z",
      modelVersion: "v5.0.0",
      reasoning: "Market consensus and depth both held.",
      factorBreakdown: null,
      signalSnapshot: null,
    },
    {
      id: "pick-loss",
      gameId: "game-2",
      matchup: "DAL @ PHX",
      sportId: "basketball_nba",
      leagueId: "nba",
      selection: "PHX -2.5",
      pickType: "SPREAD",
      tier: "PRO",
      pickGrade: "LEAN",
      confidence: 61,
      edgeScore: 2.2,
      consensusPct: 0.55,
      bookmakerCount: 9,
      result: "LOSS",
      settledAt: "2026-05-20T03:00:00.000Z",
      modelVersion: "v5.0.0",
      reasoning: "Rest read missed.",
      factorBreakdown: null,
      signalSnapshot: null,
    },
  ],
  lossAutopsies: [
    {
      id: "autopsy-1",
      pickId: "pick-loss",
      headline: "Rest read did not survive late rotation news",
      rootCause: "INJURY_SHOCK",
      lessonTags: ["rotation-news"],
      whatWeLearned: "Late lineup changes need higher penalty.",
      authoredAt: "2026-05-21T12:00:00.000Z",
      modelVersion: "v5.0.0",
    },
  ],
  counts: {
    settledPicks: 2,
    wins: 1,
    losses: 1,
    pushes: 0,
    publicLossAutopsies: 1,
  },
};

describe("Model Journal draft composer", () => {
  it("builds an evidence-aware markdown draft skeleton", () => {
    const markdown = composeJournalDraftMarkdown("Model Journal: Week 21, 2026", weekData);

    expect(markdown).toContain("# Model Journal: Week 21, 2026");
    expect(markdown).toContain("Settled picks: 2");
    expect(markdown).toContain("## Signals That Held");
    expect(markdown).toContain("BOS @ NYY");
    expect(markdown).toContain("## Signals That Missed");
    expect(markdown).toContain("DAL @ PHX");
    expect(markdown).toContain("Rest read did not survive late rotation news");
    expect(markdown).toContain("pick pick-loss");
  });
});
