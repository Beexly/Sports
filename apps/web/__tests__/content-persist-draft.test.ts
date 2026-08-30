import { describe, it, expect } from "vitest";
import { contentDraftToCreateData } from "@/lib/content-engine/persist-draft";
import { buildDailyBriefDraft, type SlateSummary } from "@/lib/content-engine/build-draft";
import type { ContentDraftRecord, ContentSourceRecord } from "@/lib/content-engine/types";

/**
 * persist-draft mapper — the draft-only invariant is the load-bearing test.
 * The content engine commits DRAFTS ONLY; publishing is a human action. This
 * pins that the persistence mapping can never emit a published/dated draft, and
 * that a real Daily Slate Brief round-trips into a valid create payload.
 */

const NOW = new Date("2026-07-10T11:00:00Z");

const SOURCES: ContentSourceRecord[] = [
  {
    sourceType: "ODDS",
    sourceLabel: "Live odds",
    sourceUrl: null,
    sourceStatus: "FRESH",
    trustLevel: "PLATFORM",
    fetchedAt: NOW,
    notes: null,
  },
];

function briefRecord(overrides: Partial<SlateSummary> = {}): ContentDraftRecord {
  const slate: SlateSummary = {
    briefDate: NOW,
    gameCount: 14,
    publishedPickCount: 9,
    dataQualityWarnings: [],
    lineMovementNotes: [],
    ...overrides,
  };
  return buildDailyBriefDraft({
    slate,
    generatedBy: "cron:generate-drafts",
    slug: "daily-slate-brief-2026-07-10",
    sources: SOURCES,
  });
}

describe("contentDraftToCreateData", () => {
  it("maps a Daily Slate Brief into a DRAFT create payload with publishedAt null", () => {
    const data = contentDraftToCreateData(briefRecord(), NOW);

    // The safety invariant is status=DRAFT + publishedAt=null — NOT visibility.
    // The Daily Slate Brief template is PUBLIC-visibility by design (it is meant
    // for eventual publication after human review); it simply never auto-gets
    // there. Publishing stays a human action.
    expect(data.status).toBe("DRAFT");
    expect(data.visibility).toBe("PUBLIC");
    expect(data.publishedAt).toBeNull();
    expect(data.contentType).toBe("DAILY_BRIEF");
    expect(data.slug).toBe("daily-slate-brief-2026-07-10");
    expect(data.generatedBy).toBe("cron:generate-drafts");
    expect(data.draftBody).toContain("14 scheduled games");
    expect(data.draftBody).toContain("Picks published so far: 9");
    expect(data.sources.create).toHaveLength(1);
    expect(data.sources.create[0]?.sourceType).toBe("ODDS");
  });

  it("the builder itself never sets publishedAt or a PUBLISHED status (drafts only)", () => {
    const record = briefRecord();
    expect(record.publishedAt ?? null).toBeNull();
    expect(record.status).toBe("DRAFT");
  });

  it("refuses to persist a record that already has publishedAt set (hard stop, not silent fix)", () => {
    const tampered = { ...briefRecord(), publishedAt: NOW } as ContentDraftRecord;
    expect(() => contentDraftToCreateData(tampered, NOW)).toThrow(/publishedAt/);
  });

  it("refuses to persist a PUBLISHED status", () => {
    const tampered = { ...briefRecord(), status: "PUBLISHED" } as unknown as ContentDraftRecord;
    expect(() => contentDraftToCreateData(tampered, NOW)).toThrow(/PUBLISHED/);
  });

  it("handles an empty slate honestly (no fabrication when zero picks are published)", () => {
    const data = contentDraftToCreateData(briefRecord({ publishedPickCount: 0 }), NOW);
    expect(data.draftBody).toContain("No picks published yet");
    expect(data.draftBody).not.toMatch(/Picks published so far/);
  });
});
