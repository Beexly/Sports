-- Phase 3: persist weekly Model Journal drafts and published essays.
CREATE TYPE "ModelJournalEntryStatus" AS ENUM (
  'DRAFT',
  'REVIEW_PENDING',
  'PUBLISHED',
  'RETRACTED'
);

CREATE TABLE "model_journal_entries" (
  "id" TEXT NOT NULL,
  "isoWeek" INTEGER NOT NULL,
  "isoYear" INTEGER NOT NULL,
  "status" "ModelJournalEntryStatus" NOT NULL DEFAULT 'DRAFT',
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "bodyMarkdown" TEXT NOT NULL,
  "modelVersion" TEXT NOT NULL,
  "referencedPickIds" TEXT[],
  "referencedAutopsyIds" TEXT[],
  "referencedFactorChanges" JSONB,
  "authorEmail" TEXT NOT NULL,
  "draftedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "emailedAt" TIMESTAMP(3),
  "twitterTeasedAt" TIMESTAMP(3),
  "retractedAt" TIMESTAMP(3),
  "retractionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "model_journal_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "model_journal_entries_slug_key" ON "model_journal_entries"("slug");
CREATE UNIQUE INDEX "model_journal_entries_isoYear_isoWeek_key" ON "model_journal_entries"("isoYear", "isoWeek");
CREATE INDEX "model_journal_entries_status_idx" ON "model_journal_entries"("status");
CREATE INDEX "model_journal_entries_publishedAt_idx" ON "model_journal_entries"("publishedAt");
