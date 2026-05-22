import { db, type ModelJournalEntryStatus } from "@sports/db";

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

function wordCount(markdown: string): number {
  return markdown.trim().split(/\s+/).filter(Boolean).length;
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
