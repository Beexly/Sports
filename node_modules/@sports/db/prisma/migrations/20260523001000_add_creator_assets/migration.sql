-- Phase 3: persist Galaxy Studio creator drafts as internal artifacts only.
CREATE TYPE "CreatorAssetKind" AS ENUM (
  'FAN_EXPLAINER',
  'FANTASY_ANGLE',
  'BETTING_EDUCATION',
  'X_THREAD',
  'TIKTOK_REELS_SCRIPT',
  'NEWSLETTER_BLOCK',
  'SPONSOR_SAFE_BLURB',
  'YOUTUBE_TITLE_IDEAS'
);

CREATE TYPE "CreatorAssetStatus" AS ENUM ('DRAFT', 'EXPORTED', 'ARCHIVED', 'BLOCKED');

CREATE TYPE "CreatorAssetComplianceStatus" AS ENUM ('GREEN', 'YELLOW', 'RED');

CREATE TABLE "creator_assets" (
  "id" TEXT NOT NULL,
  "gameId" TEXT NOT NULL,
  "pickId" TEXT,
  "templateKind" "CreatorAssetKind" NOT NULL,
  "status" "CreatorAssetStatus" NOT NULL DEFAULT 'DRAFT',
  "complianceStatus" "CreatorAssetComplianceStatus" NOT NULL DEFAULT 'YELLOW',
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "markdown" TEXT NOT NULL,
  "gateState" VARCHAR(24) NOT NULL,
  "citations" JSONB NOT NULL DEFAULT '[]',
  "complianceFlags" JSONB NOT NULL DEFAULT '[]',
  "modelVersion" TEXT NOT NULL,
  "generatedBy" TEXT NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "exportedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "creator_assets_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "creator_assets_gameId_generatedAt_idx" ON "creator_assets"("gameId", "generatedAt");
CREATE INDEX "creator_assets_pickId_idx" ON "creator_assets"("pickId");
CREATE INDEX "creator_assets_templateKind_idx" ON "creator_assets"("templateKind");
CREATE INDEX "creator_assets_status_idx" ON "creator_assets"("status");
CREATE INDEX "creator_assets_complianceStatus_idx" ON "creator_assets"("complianceStatus");

ALTER TABLE "creator_assets"
  ADD CONSTRAINT "creator_assets_gameId_fkey"
  FOREIGN KEY ("gameId") REFERENCES "games"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "creator_assets"
  ADD CONSTRAINT "creator_assets_pickId_fkey"
  FOREIGN KEY ("pickId") REFERENCES "picks"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
