import { describe, expect, it } from "vitest";
import {
  buildWhyBoardQuietDraft,
  buildEvidencePackMatchupDraft,
} from "@/lib/content-engine/build-draft";

const sources = [
  {
    sourceType: "DAILY_BRIEF" as const,
    sourceLabel: "test",
    sourceUrl: null,
    sourceStatus: "FRESH" as const,
    trustLevel: "PLATFORM" as const,
    fetchedAt: new Date("2026-08-09T12:00:00Z"),
    notes: null,
  },
];

describe("buildWhyBoardQuietDraft", () => {
  it("never claims PROVEN or invents picks", () => {
    const d = buildWhyBoardQuietDraft({
      darkReason: "quiet_board_no_slate",
      boardSurface: "signal",
      oddsInsertAgeMinutes: 12,
      publishedPickCount: 0,
      gameCount: 8,
      calibrationStatus: "RED",
      generatedBy: "test",
      slug: "why-board-quiet-test",
      sources,
    });
    expect(d.status).toBe("DRAFT");
    expect(d.draftBody).toMatch(/quiet/i);
    expect(d.draftBody.toLowerCase()).toMatch(/not a proven track record/);
    expect(d.draftBody.toLowerCase()).not.toMatch(/guaranteed|sure thing|verified roi of/);
    expect(d.draftBody).toMatch(/Published non-seed picks today: \*\*0\*\*/);
  });
});

describe("buildEvidencePackMatchupDraft", () => {
  it("shows rankingP with not-PROVEN footer", () => {
    const d = buildEvidencePackMatchupDraft({
      home: "Lakers",
      away: "Celtics",
      selection: "Celtics ML",
      rankingP: 0.61,
      rankingSource: "independent_trueProb",
      independentSources: ["kalshi", "fpi"],
      calibrationStatus: "RED",
      generatedBy: "test",
      slug: "evidence-pack-test",
      sources,
    });
    expect(d.draftBody).toMatch(/0\.610/);
    expect(d.draftBody).toMatch(/Not PROVEN/i);
    expect(d.visibility).toBe("INTERNAL");
  });
});
