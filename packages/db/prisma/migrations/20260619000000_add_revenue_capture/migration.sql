-- Workstream L2: Add newsletter_subscribers and ask_galaxy_submissions tables.
-- Additive migration only — no DROP, no ALTER of existing tables or columns.

-- CreateEnum
CREATE TYPE "AskGalaxyClassification" AS ENUM ('PENDING', 'ACTION', 'CAUTION', 'NO_BET', 'INSUFFICIENT_DATA');

-- CreateTable
CREATE TABLE "newsletter_subscribers" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "source" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "newsletter_subscribers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ask_galaxy_submissions" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "sport" TEXT,
    "league" TEXT,
    "matchup" TEXT NOT NULL,
    "considering" TEXT NOT NULL,
    "reasoning" TEXT,
    "trustNeed" TEXT,
    "contactConsent" BOOLEAN NOT NULL DEFAULT false,
    "classification" "AskGalaxyClassification" NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,

    CONSTRAINT "ask_galaxy_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_subscribers_email_key" ON "newsletter_subscribers"("email");

-- CreateIndex
CREATE INDEX "ask_galaxy_submissions_classification_idx" ON "ask_galaxy_submissions"("classification");
