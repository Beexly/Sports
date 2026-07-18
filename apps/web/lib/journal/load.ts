import { db, type ModelJournalEntryStatus } from "@sports/db";
import { guardPublicJournalBody, guardPublicJournalTitle } from "@/lib/journal/public-guard";

export interface JournalEntryListItem {
  readonly id: string;
  readonly isoWeek: number;
  readonly isoYear: number;
  readonly status: ModelJournalEntryStatus;
  readonly title: string;
  readonly slug: string;
  readonly wordCount: number;
  readonly referencedPickCount: number;
  readonly referencedAutopsyCount: number;
  readonly modelVersion: string;
  readonly draftedAt: string;
  readonly publishedAt: string | null;
  readonly retractedAt: string | null;
}

export interface JournalDashboardData {
  readonly drafts: readonly JournalEntryListItem[];
  readonly published: readonly JournalEntryListItem[];
  readonly retracted: readonly JournalEntryListItem[];
  readonly nextPublishLabel: string;
}

export interface JournalEntryDetail extends JournalEntryListItem {
  readonly bodyMarkdown: string;
  readonly referencedPickIds: readonly string[];
  readonly referencedAutopsyIds: readonly string[];
  readonly referencedFactorChanges: unknown;
  readonly authorEmail: string;
  readonly reviewedAt: string | null;
  readonly emailedAt: string | null;
  readonly twitterTeasedAt: string | null;
  readonly retractionReason: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly isBodyEditable: boolean;
}

export interface PublicJournalEntry {
  readonly id: string;
  readonly isoWeek: number;
  readonly isoYear: number;
  readonly title: string;
  readonly slug: string;
  readonly bodyMarkdown: string;
  readonly coldOpen: string;
  readonly readTimeMinutes: number;
  readonly referencedPickIds: readonly string[];
  readonly referencedAutopsyIds: readonly string[];
  readonly modelVersion: string;
  readonly publishedAt: string;
}

/**
 * Deliberately minimal — a retraction tombstone shows the title and when it
 * was retracted, never the withdrawn body/coldOpen. Reusing `PublicJournalEntry`
 * here would risk a future field added to that type leaking retracted content.
 */
export interface RetractedJournalEntry {
  readonly title: string;
  readonly retractedAt: string | null;
}

function wordCount(markdown: string): number {
  return markdown.trim().split(/\s+/).filter(Boolean).length;
}

function firstParagraph(markdown: string): string {
  const paragraph = markdown
    .split(/\n{2,}/)
    .map((section) => section.trim())
    .find((section) => section.length > 0 && !section.startsWith("#"));

  return paragraph ?? "This Journal entry is available to read.";
}

function readTimeMinutes(markdown: string): number {
  return Math.max(1, Math.ceil(wordCount(markdown) / 225));
}

function toListItem(row: {
  readonly id: string;
  readonly isoWeek: number;
  readonly isoYear: number;
  readonly status: ModelJournalEntryStatus;
  readonly title: string;
  readonly slug: string;
  readonly bodyMarkdown: string;
  readonly referencedPickIds: readonly string[];
  readonly referencedAutopsyIds: readonly string[];
  readonly modelVersion: string;
  readonly draftedAt: Date;
  readonly publishedAt: Date | null;
  readonly retractedAt: Date | null;
}): JournalEntryListItem {
  return {
    id: row.id,
    isoWeek: row.isoWeek,
    isoYear: row.isoYear,
    status: row.status,
    title: row.title,
    slug: row.slug,
    wordCount: wordCount(row.bodyMarkdown),
    referencedPickCount: row.referencedPickIds.length,
    referencedAutopsyCount: row.referencedAutopsyIds.length,
    modelVersion: row.modelVersion,
    draftedAt: row.draftedAt.toISOString(),
    publishedAt: row.publishedAt?.toISOString() ?? null,
    retractedAt: row.retractedAt?.toISOString() ?? null,
  };
}

function toPublicEntry(row: {
  readonly id: string;
  readonly isoWeek: number;
  readonly isoYear: number;
  readonly title: string;
  readonly slug: string;
  readonly bodyMarkdown: string;
  readonly referencedPickIds: readonly string[];
  readonly referencedAutopsyIds: readonly string[];
  readonly modelVersion: string;
  readonly publishedAt: Date | null;
}): PublicJournalEntry | null {
  if (!row.publishedAt) return null;

  const guarded = guardPublicJournalBody(row.bodyMarkdown);

  return {
    id: row.id,
    isoWeek: row.isoWeek,
    isoYear: row.isoYear,
    title: guardPublicJournalTitle(row.title),
    slug: row.slug,
    bodyMarkdown: guarded.body,
    coldOpen: firstParagraph(guarded.body),
    // Read time must reflect the VISIBLE body. When the no-claim guard redacts a
    // body to the short placeholder, computing this from the original row would
    // publish a wrong "min read" / JSON-LD timeRequired and leak the suppressed
    // body's length. Source it from guarded.body so it matches what readers see.
    readTimeMinutes: readTimeMinutes(guarded.body),
    referencedPickIds: row.referencedPickIds,
    referencedAutopsyIds: row.referencedAutopsyIds,
    modelVersion: row.modelVersion,
    publishedAt: row.publishedAt.toISOString(),
  };
}

export async function loadJournalDashboard(): Promise<JournalDashboardData> {
  const rows = await db.modelJournalEntry
    .findMany({
      orderBy: [{ isoYear: "desc" }, { isoWeek: "desc" }, { draftedAt: "desc" }],
      take: 30,
    })
    .catch(() => []);

  const items = rows.map(toListItem);

  return {
    drafts: items.filter((item) => item.status === "DRAFT" || item.status === "REVIEW_PENDING"),
    published: items.filter((item) => item.status === "PUBLISHED"),
    retracted: items.filter((item) => item.status === "RETRACTED"),
    nextPublishLabel: "Sunday 10:00 AM ET",
  };
}

export async function loadJournalEntryDetail(entryId: string): Promise<JournalEntryDetail | null> {
  const row = await db.modelJournalEntry
    .findUnique({
      where: { id: entryId },
    })
    .catch(() => null);

  if (!row) return null;

  return {
    ...toListItem(row),
    bodyMarkdown: row.bodyMarkdown,
    referencedPickIds: row.referencedPickIds,
    referencedAutopsyIds: row.referencedAutopsyIds,
    referencedFactorChanges: row.referencedFactorChanges,
    authorEmail: row.authorEmail,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    emailedAt: row.emailedAt?.toISOString() ?? null,
    twitterTeasedAt: row.twitterTeasedAt?.toISOString() ?? null,
    retractionReason: row.retractionReason,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    isBodyEditable: row.status === "DRAFT" || row.status === "REVIEW_PENDING",
  };
}

export async function loadPublicJournalEntries(): Promise<readonly PublicJournalEntry[]> {
  const rows = await db.modelJournalEntry
    .findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ publishedAt: "desc" }, { isoYear: "desc" }, { isoWeek: "desc" }],
      take: 20,
    })
    .catch(() => []);

  return rows.map(toPublicEntry).filter((entry): entry is PublicJournalEntry => entry !== null);
}

export async function loadPublicJournalEntry(slug: string): Promise<PublicJournalEntry | null> {
  const row = await db.modelJournalEntry
    .findFirst({
      where: { slug, status: "PUBLISHED" },
    })
    .catch(() => null);

  if (!row) return null;
  return toPublicEntry(row);
}

/** Title + retraction timestamp only, for the public 410 tombstone. Never the body. */
export async function loadRetractedJournalEntry(
  slug: string
): Promise<RetractedJournalEntry | null> {
  const row = await db.modelJournalEntry
    .findFirst({
      where: { slug, status: "RETRACTED" },
      select: { title: true, retractedAt: true },
    })
    .catch(() => null);

  if (!row) return null;
  return {
    title: guardPublicJournalTitle(row.title),
    retractedAt: row.retractedAt?.toISOString() ?? null,
  };
}
