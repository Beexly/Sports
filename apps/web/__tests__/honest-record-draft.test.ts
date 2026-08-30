import { describe, expect, it } from "vitest";
import { scanForBannedPhrases } from "@/lib/trust-claims";
import {
  BOOKGRADE_INTERPRETATION_LINE,
  HONEST_RECORD_EMPTY_LINE,
  KILL_LEDGER_CLOSING_LINE,
  PULSESCORE_INTERPRETATION_LINE,
  buildHonestRecordDraft,
  formatYesterdayRecordLine,
  rotateBookGradeHighlight,
  rotateKillLedgerFeature,
} from "@/lib/content-engine/honest-record";
import type { ContentSourceRecord } from "@/lib/content-engine/types";

const sources: readonly ContentSourceRecord[] = [
  {
    sourceType: "METHODOLOGY",
    sourceLabel: "test",
    sourceUrl: null,
    sourceStatus: "FRESH",
    trustLevel: "PLATFORM",
    fetchedAt: new Date("2026-08-20T12:00:00Z"),
    notes: null,
  },
];

describe("formatYesterdayRecordLine", () => {
  it("refuses to fabricate when the DB has no rows", () => {
    expect(
      formatYesterdayRecordLine({
        dateIso: "2026-08-19",
        winCount: 0,
        lossCount: 0,
        pushCount: 0,
      }),
    ).toBe(HONEST_RECORD_EMPTY_LINE);
  });

  it("reports counts only, never a win rate", () => {
    const line = formatYesterdayRecordLine({
      dateIso: "2026-08-19",
      winCount: 1,
      lossCount: 2,
      pushCount: 1,
    });
    expect(line).toContain("Settled picks yesterday: 4 (W 1 · L 2 · Push 1)");
    expect(line.toLowerCase()).toContain("not a win rate");
    expect(line).not.toMatch(/%/);
  });
});

describe("Kill Ledger / BookGrade rotation", () => {
  it("rotates Kill Ledger features by UTC day", () => {
    const a = rotateKillLedgerFeature(new Date("2026-08-19T12:00:00Z"));
    const b = rotateKillLedgerFeature(new Date("2026-08-20T12:00:00Z"));
    expect(a.id).not.toBe(b.id);
    expect(a.href).toMatch(/^\/kill-ledger#/);
  });

  it("rotates BookGrade highlights by UTC day", () => {
    const a = rotateBookGradeHighlight(new Date("2026-08-19T12:00:00Z"));
    const b = rotateBookGradeHighlight(new Date("2026-08-20T12:00:00Z"));
    expect(a.book).not.toBe(b.book);
  });
});

describe("buildHonestRecordDraft", () => {
  it("emits a DRAFT with honest empty copy, rotation, and interpretation — zero banned phrases", () => {
    const day = new Date("2026-08-20T12:00:00Z");
    const draft = buildHonestRecordDraft({
      yesterday: {
        dateIso: "2026-08-19",
        winCount: 0,
        lossCount: 0,
        pushCount: 0,
      },
      killLedger: rotateKillLedgerFeature(day),
      bookGrade: rotateBookGradeHighlight(day),
      generatedBy: "test",
      slug: "honest-record-2026-08-19",
      sources,
    });

    expect(draft.status).toBe("DRAFT");
    expect(draft.publishedAt).toBeNull();
    expect(draft.visibility).toBe("INTERNAL");
    expect(draft.draftBody).toContain(HONEST_RECORD_EMPTY_LINE);
    expect(draft.draftBody).toContain(KILL_LEDGER_CLOSING_LINE);
    expect(draft.draftBody).toContain(BOOKGRADE_INTERPRETATION_LINE);
    expect(draft.draftBody).toContain(PULSESCORE_INTERPRETATION_LINE);
    expect(draft.responsibleGamingIncluded).toBe(true);
    expect(scanForBannedPhrases(draft.draftBody)).toEqual([]);
  });

  it("does not invent a win rate when settled rows exist", () => {
    const day = new Date("2026-08-20T12:00:00Z");
    const draft = buildHonestRecordDraft({
      yesterday: {
        dateIso: "2026-08-19",
        winCount: 2,
        lossCount: 1,
        pushCount: 0,
      },
      killLedger: rotateKillLedgerFeature(day),
      bookGrade: rotateBookGradeHighlight(day),
      generatedBy: "test",
      slug: "honest-record-2026-08-19",
      sources,
    });
    expect(draft.draftBody).toContain("Settled picks yesterday: 3 (W 2 · L 1 · Push 0)");
    expect(draft.draftBody).not.toMatch(/\b\d+(\.\d+)?%/);
    expect(scanForBannedPhrases(draft.draftBody)).toEqual([]);
  });
});
