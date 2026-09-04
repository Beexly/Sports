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
    expect(prompt).toContain("price vs fair value: an expensive price vs fair value");
    expect(prompt).not.toContain("confidence 72");
    expect(prompt).not.toContain("edge 6.4");
    // Market/public data (consensus %, book count) is still fine to include.
    expect(prompt).toContain("consensus 64%");
    expect(prompt).toContain("12 books");
  });
});

/**
 * The Edge Index is a PRICE-QUALITY reading: the de-vigged fair probability of
 * the picked side minus the probability implied by the price offered on it. It
 * is not a measure of OUR advantage, and nothing fits it to settled results.
 *
 * On the retired half scale the index could never exceed 50, so the drafting
 * prompt's upper bands never fired and the wording "a strong edge" was harmless
 * only by accident. On the current full scale an ordinary -110/-110 market reads
 * ~52 and a sharp one ~76, so that wording would start telling the drafting
 * model that routine markets carry a strong edge we never measured.
 */
describe("the Edge Index band describes the price, not an advantage we claim", () => {
  const withEdge = (edgeScore: number): JournalWeekData => ({
    ...weekData,
    picks: [{ ...weekData.picks[0]!, edgeScore }],
  });

  it("never calls an ordinary or cheap price an 'edge' we hold", () => {
    // 52 = a vanilla -110/-110 two-way. 76 = roughly a 2% hold.
    for (const edgeScore of [0, 30, 49, 52, 65, 76, 95, 100]) {
      const prompt = buildJournalDraftPromptUser(withEdge(edgeScore));
      expect(prompt, `edgeScore ${edgeScore}`).not.toMatch(/\ba (?:strong|moderate|slim) edge\b/);
    }
  });

  it("bands the ordinary market as ordinary, not as a strong edge", () => {
    expect(buildJournalDraftPromptUser(withEdge(52))).toContain(
      "price vs fair value: an ordinary price vs fair value",
    );
  });

  it("bands a genuinely cheap price as cheap, and an expensive one as expensive", () => {
    expect(buildJournalDraftPromptUser(withEdge(76))).toContain(
      "price vs fair value: a cheap price vs fair value",
    );
    expect(buildJournalDraftPromptUser(withEdge(20))).toContain(
      "price vs fair value: an expensive price vs fair value",
    );
  });

  it("still withholds the raw index value from the public prompt", () => {
    const prompt = buildJournalDraftPromptUser(withEdge(76));
    expect(prompt).not.toContain("76");
  });
});
