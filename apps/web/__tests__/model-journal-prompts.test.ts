import { describe, expect, it } from "vitest";
import { buildJournalDraftPromptUser, JOURNAL_DRAFTING_SYSTEM_PROMPT } from "@/lib/journal/prompts";
import type { JournalWeekData } from "@/lib/journal/week-data";

const weekData: JournalWeekData = {
  isoWeek: 21,
  isoYear: 2026,
  rangeStart: "2026-05-18T00:00:00.000Z",
  rangeEnd: "2026-05-25T00:00:00.000Z",
  picks: [
    {
      id: "pick-1",
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
      reasoning: "Consensus and depth held.",
      factorBreakdown: null,
      signalSnapshot: {
        id: "snap-1",
        capturedAt: "2026-05-18T18:00:00.000Z",
        eligibleForLearning: true,
        settlementResult: "WIN",
      },
    },
  ],
  lossAutopsies: [
    {
      id: "autopsy-1",
      pickId: "pick-2",
      headline: "Lineup news changed the read",
      rootCause: "INJURY_SHOCK",
      lessonTags: ["rotation-news"],
      whatWeLearned: "Late lineup changes need a higher penalty.",
      authoredAt: "2026-05-21T12:00:00.000Z",
      modelVersion: "v5.0.0",
    },
  ],
  counts: {
    settledPicks: 1,
    wins: 1,
    losses: 0,
    pushes: 0,
    publicLossAutopsies: 1,
  },
};

describe("Model Journal prompts", () => {
  it("documents the real JournalWeekData input shape", () => {
    expect(JOURNAL_DRAFTING_SYSTEM_PROMPT).toContain("picks[]");
    expect(JOURNAL_DRAFTING_SYSTEM_PROMPT).toContain("lossAutopsies[]");
    expect(JOURNAL_DRAFTING_SYSTEM_PROMPT).toContain("counts");
    expect(JOURNAL_DRAFTING_SYSTEM_PROMPT).not.toContain("settledPicks[]");
    expect(JOURNAL_DRAFTING_SYSTEM_PROMPT).not.toMatch(/model saw|engine saw/i);
  });

  it("builds the user prompt from typed week-data evidence", () => {
    const prompt = buildJournalDraftPromptUser(weekData);

    expect(prompt).toContain("ISO week: 21, year 2026");
    expect(prompt).toContain("Settled picks (1)");
    expect(prompt).toContain("pick-1: BOS @ NYY");
    expect(prompt).toContain("snapshot snap-1");
    expect(prompt).toContain("Loss autopsies (1)");
    expect(prompt).toContain("autopsy-1: Lineup news changed the read");
  });

  it("never leaks the raw paid confidence or internal edge number into the public prompt", () => {
    const prompt = buildJournalDraftPromptUser(weekData);
    // Qualitative bands, not the raw values (confidence 72 / edge 6.4).
    expect(prompt).toContain("conviction: solid conviction");
    expect(prompt).toContain("edge: a slim edge");
    expect(prompt).not.toContain("confidence 72");
    expect(prompt).not.toContain("edge 6.4");
    // Market/public data (consensus %, book count) is still fine to include.
    expect(prompt).toContain("consensus 64%");
    expect(prompt).toContain("12 books");
  });
});
