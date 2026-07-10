/**
 * Persistence mapping for content-engine drafts.
 *
 * The builders in build-draft.ts return an in-memory `ContentDraftRecord`; this
 * turns that record into the exact Prisma `contentDraft.create` data shape,
 * including the nested `sources.create`. Kept PURE (no DB, no I/O) so the
 * mapping is unit-testable and the draft-only invariant can be asserted
 * directly: `publishedAt` is hard-pinned to null and `status` is never
 * "PUBLISHED" — the engine commits drafts only; publishing stays a human action
 * through the cockpit review flow.
 */

import type { ContentDraftRecord, ContentSourceRecord } from "./types";

/** The nested source-create shape Prisma expects under `sources.create`. */
interface ContentSourceCreateData {
  sourceType: ContentSourceRecord["sourceType"];
  sourceLabel: string;
  sourceUrl: string | null;
  sourceStatus: ContentSourceRecord["sourceStatus"];
  trustLevel: ContentSourceRecord["trustLevel"];
  fetchedAt: Date;
  notes: string | null;
}

/** The `contentDraft.create({ data })` payload derived from a draft record. */
export interface ContentDraftCreateData {
  title: string;
  slug: string;
  contentType: ContentDraftRecord["contentType"];
  status: ContentDraftRecord["status"];
  visibility: ContentDraftRecord["visibility"];
  sport: string | null;
  league: string | null;
  relatedPickIds: string[];
  relatedPromotionIds: string[];
  relatedBriefIds: string[];
  sourceCoverageStatus: ContentDraftRecord["sourceCoverageStatus"];
  complianceStatus: ContentDraftRecord["complianceStatus"];
  responsibleGamingIncluded: boolean;
  affiliateDisclosureIncluded: boolean;
  performanceGateStatus: ContentDraftRecord["performanceGateStatus"];
  bannedPhraseScanClean: boolean;
  draftBody: string;
  excerpt: string | null;
  metadata: Readonly<Record<string, unknown>> | null;
  generatedBy: string;
  /** Hard-pinned null — the engine NEVER publishes. */
  publishedAt: null;
  sources: { create: ContentSourceCreateData[] };
}

export function contentDraftToCreateData(
  record: ContentDraftRecord,
  now: Date,
): ContentDraftCreateData {
  // Defense-in-depth: the builders already set these, but a persist path must
  // never be the place a published/dated draft slips through. Refuse rather
  // than silently "fix" — a record arriving here already-published is a bug
  // upstream, and the draft-only doctrine is a hard stop, not a best-effort.
  if (record.publishedAt != null) {
    throw new Error("contentDraftToCreateData: refusing to persist a record with publishedAt set");
  }
  if ((record.status as string) === "PUBLISHED") {
    throw new Error("contentDraftToCreateData: refusing to persist a PUBLISHED status");
  }

  return {
    title: record.title,
    slug: record.slug,
    contentType: record.contentType,
    status: record.status,
    visibility: record.visibility,
    sport: record.sport ?? null,
    league: record.league ?? null,
    relatedPickIds: [...record.relatedPickIds],
    relatedPromotionIds: [...record.relatedPromotionIds],
    relatedBriefIds: [...record.relatedBriefIds],
    sourceCoverageStatus: record.sourceCoverageStatus,
    complianceStatus: record.complianceStatus,
    responsibleGamingIncluded: record.responsibleGamingIncluded,
    affiliateDisclosureIncluded: record.affiliateDisclosureIncluded,
    performanceGateStatus: record.performanceGateStatus,
    bannedPhraseScanClean: record.bannedPhraseScanClean,
    draftBody: record.draftBody,
    excerpt: record.excerpt ?? null,
    metadata: record.metadata ?? null,
    generatedBy: record.generatedBy,
    publishedAt: null,
    sources: {
      create: record.sources.map((s) => ({
        sourceType: s.sourceType,
        sourceLabel: s.sourceLabel,
        sourceUrl: s.sourceUrl ?? null,
        sourceStatus: s.sourceStatus,
        trustLevel: s.trustLevel,
        fetchedAt: s.fetchedAt ?? now,
        notes: s.notes ?? null,
      })),
    },
  };
}
