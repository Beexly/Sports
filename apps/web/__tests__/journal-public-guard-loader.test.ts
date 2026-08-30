import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  journalFindMany: vi.fn<(args?: unknown) => Promise<unknown[]>>(),
}));

vi.mock("@sports/db", () => ({
  db: {
    modelJournalEntry: { findMany: mocks.journalFindMany },
  },
}));

import { loadPublicJournalEntries } from "@/lib/journal/load";
import { scanForBannedPhrases } from "@/lib/trust-claims";

// The same banned language used by journal-public-guard.test.ts — confirmed to
// trip scanForBannedPhrases. Placed in the FIRST paragraph so that, were the
// guard NOT applied before deriving coldOpen, the cold-open would carry it.
const BANNED_FIRST_PARAGRAPH = "This one is a guaranteed profit — basically a sure thing, you can't lose.";

const CALM_PLACEHOLDER =
  "This Journal entry is being re-reviewed before publication and is temporarily unavailable.";

function row(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "mje_1",
    isoWeek: 13,
    isoYear: 2026,
    status: "PUBLISHED",
    title: "Week 13 Notes",
    slug: "week-13-notes",
    bodyMarkdown: ["# Week 13 Notes", "", BANNED_FIRST_PARAGRAPH].join("\n"),
    referencedPickIds: [],
    referencedAutopsyIds: [],
    modelVersion: "v5.1.0",
    publishedAt: new Date("2026-06-21T14:00:00.000Z"),
    ...overrides,
  };
}

describe("loadPublicJournalEntries — public-guard wiring", () => {
  beforeEach(() => {
    mocks.journalFindMany.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("guards a banned-phrase body AND derives coldOpen from the guarded body", async () => {
    // sanity: the fixture really does trip the scanner
    expect(scanForBannedPhrases(BANNED_FIRST_PARAGRAPH).length).toBeGreaterThan(0);

    mocks.journalFindMany.mockResolvedValue([row()]);

    const entries = await loadPublicJournalEntries();
    expect(entries).toHaveLength(1);
    const entry = entries[0]!;

    // body is replaced with the calm placeholder
    expect(entry.bodyMarkdown).toBe(CALM_PLACEHOLDER);
    expect(entry.bodyMarkdown).not.toContain("guaranteed profit");
    expect(entry.bodyMarkdown).not.toContain("sure thing");
    expect(entry.bodyMarkdown).not.toContain("can't lose");

    // the REAL regression: coldOpen is derived from the GUARDED body, not the raw
    // one — so it must carry zero banned phrases.
    expect(entry.coldOpen).not.toContain("guaranteed profit");
    expect(scanForBannedPhrases(entry.coldOpen)).toHaveLength(0);
  });

  it("reads time from the GUARDED body — a redacted entry must not report the suppressed body's length", async () => {
    // A long body that trips the guard: without sourcing read-time from the
    // guarded body, the public 'min read' badge + JSON-LD timeRequired would
    // reflect the ~2000-word original and leak the suppressed content's length.
    const longBanned = "This one is a guaranteed profit. " + "word ".repeat(2000);
    expect(scanForBannedPhrases(longBanned).length).toBeGreaterThan(0);

    mocks.journalFindMany.mockResolvedValue([row({ bodyMarkdown: longBanned })]);

    const entries = await loadPublicJournalEntries();
    const entry = entries[0]!;

    // body redacted to the short placeholder…
    expect(entry.bodyMarkdown).toBe(CALM_PLACEHOLDER);
    // …and read-time reflects the VISIBLE placeholder (1 min), not the ~2000-word
    // original (which would compute to ~9).
    expect(entry.readTimeMinutes).toBe(1);
  });

  it("passes a clean entry through unchanged", async () => {
    const cleanBody = [
      "# Week 14 Notes",
      "",
      "The model leaned toward the home side after the line moved on Thursday.",
      "We weight recent form and market depth, then score every available matchup.",
    ].join("\n");

    mocks.journalFindMany.mockResolvedValue([
      row({ id: "mje_2", isoWeek: 14, slug: "week-14-notes", bodyMarkdown: cleanBody }),
    ]);

    const entries = await loadPublicJournalEntries();
    expect(entries).toHaveLength(1);
    const entry = entries[0]!;

    // passthrough: body unchanged, coldOpen is the first real paragraph
    expect(entry.bodyMarkdown).toBe(cleanBody);
    expect(entry.coldOpen).toBe(
      "The model leaned toward the home side after the line moved on Thursday.\nWe weight recent form and market depth, then score every available matchup."
    );
    expect(scanForBannedPhrases(entry.coldOpen)).toHaveLength(0);
  });
});
