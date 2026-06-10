-- ============================================================================
-- PRE-CHAIN BASELINE (R-02) — fresh-DB bootstrap fix
-- ============================================================================
-- WHY THIS EXISTS
--   The first dated migration (20260522141600_add_loss_autopsy) and the rest
--   of the chain assume a pre-existing schema (users / games / picks /
--   opening_lines / pick_signal_snapshots / the OddsMarket enum, etc.). That
--   schema was applied to production MANUALLY (baselined), never captured as a
--   migration. As a result `prisma migrate deploy` against an EMPTY database
--   failed at the very first migration with 42P01 (relation "picks" does not
--   exist).
--
-- WHAT THIS DOES
--   Re-creates exactly the schema state the chain assumes, derived precisely
--   from the repo's own history: `prisma migrate diff --from-empty
--   --to-schema-datamodel <schema as of the commit BEFORE the first migration>`
--   (git c7a0c30^:packages/db/prisma/schema.prisma). Confirmed purely additive
--   vs. the current schema — every later migration only ADDS to this baseline.
--
-- ORDERING
--   Dated 20260522000000, which sorts BEFORE 20260522141600, so on an empty DB
--   it runs first and the existing chain then applies cleanly on top. The
--   content of the existing (already-applied) migrations is unchanged.
--
-- IDEMPOTENCY / EXISTING ENVIRONMENTS
--   Every statement is guarded (CREATE TABLE/INDEX IF NOT EXISTS; CREATE TYPE
--   and ADD CONSTRAINT wrapped in IF-NOT-EXISTS DO blocks) so that replaying it
--   against an already-baselined database is a harmless no-op.
--
--   IMPORTANT: For any database that ALREADY has this schema (e.g. production,
--   which was baselined manually), do NOT run this migration. Mark it as
--   already-applied so `migrate deploy` skips it:
--
--       npx prisma migrate resolve --applied 20260522000000_baseline
--
--   See docs/command-center/launch/migration-baseline.md for the full runbook.
-- ============================================================================

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserRole') THEN
    CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubscriptionTier') THEN
    CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'PRO', 'ELITE');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubscriptionStatus') THEN
    CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED', 'INCOMPLETE', 'PAUSED');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'GameStatus') THEN
    CREATE TYPE "GameStatus" AS ENUM ('SCHEDULED', 'LIVE', 'FINAL', 'POSTPONED', 'CANCELED');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OddsMarket') THEN
    CREATE TYPE "OddsMarket" AS ENUM ('H2H', 'SPREADS', 'TOTALS');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PickType') THEN
    CREATE TYPE "PickType" AS ENUM ('SPREAD', 'MONEYLINE', 'TOTAL');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PickTier') THEN
    CREATE TYPE "PickTier" AS ENUM ('FREE', 'PREMIUM');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PickGrade') THEN
    CREATE TYPE "PickGrade" AS ENUM ('ELITE_PLAY', 'STRONG_PLAY', 'SOLID_PLAY', 'LEAN');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RiskLevel') THEN
    CREATE TYPE "RiskLevel" AS ENUM ('LOW_RISK', 'MODERATE', 'HIGH_VARIANCE', 'INJURY_RISK', 'LINE_STEAM');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PickResult') THEN
    CREATE TYPE "PickResult" AS ENUM ('PENDING', 'WIN', 'LOSS', 'PUSH', 'VOID');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IngestionStatus') THEN
    CREATE TYPE "IngestionStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED', 'PARTIAL');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContentStatus') THEN
    CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AlertChannel') THEN
    CREATE TYPE "AlertChannel" AS ENUM ('EMAIL', 'PUSH');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'GameLogResult') THEN
    CREATE TYPE "GameLogResult" AS ENUM ('WIN', 'LOSS', 'TBD');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SignalCategory') THEN
    CREATE TYPE "SignalCategory" AS ENUM ('ODDS', 'SCHEDULE', 'WEATHER', 'INJURIES', 'RATINGS', 'MARKET_SENTIMENT', 'PLAYER_AVAILABILITY', 'OFFICIALS', 'VENUE_ENVIRONMENT', 'TEAM_RATES', 'STANDINGS', 'DIVISION_CONTEXT', 'MILESTONES', 'PACE');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SourceSnapshotKind') THEN
    CREATE TYPE "SourceSnapshotKind" AS ENUM ('ODDS_EVENTS', 'ODDS_SCORES', 'CONTEXT_FIXTURES', 'CONTEXT_TEAM_STATS', 'CONTEXT_PLAYER_AVAILABILITY', 'CONTEXT_OFFICIALS', 'CONTEXT_VENUE', 'CONTEXT_WEATHER', 'CONTEXT_STANDINGS', 'CONTEXT_MILESTONES');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AtsResult') THEN
    CREATE TYPE "AtsResult" AS ENUM ('WIN', 'LOSS', 'PUSH', 'TBD');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OperatorAgent') THEN
    CREATE TYPE "OperatorAgent" AS ENUM ('JARVIS', 'SARAH', 'TAL', 'SCOUT', 'AVA', 'BOBBY');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CockpitTaskStatus') THEN
    CREATE TYPE "CockpitTaskStatus" AS ENUM ('NEW', 'ROUTED', 'DRAFTED', 'NEEDS_REVIEW', 'APPROVED', 'REJECTED', 'BLOCKED', 'ARCHIVED');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CockpitRiskLevel') THEN
    CREATE TYPE "CockpitRiskLevel" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'COMPLIANCE_HOLD');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CockpitComplianceStatus') THEN
    CREATE TYPE "CockpitComplianceStatus" AS ENUM ('NOT_APPLICABLE', 'CLEAR', 'REVIEW_REQUIRED', 'HOLD', 'REJECTED');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PromotionStatus') THEN
    CREATE TYPE "PromotionStatus" AS ENUM ('DRAFT', 'NEEDS_REVIEW', 'ACTIVE', 'PAUSED', 'EXPIRED', 'ARCHIVED', 'BLOCKED');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PromotionComplianceStatus') THEN
    CREATE TYPE "PromotionComplianceStatus" AS ENUM ('UNREVIEWED', 'APPROVED', 'NEEDS_TERMS', 'NEEDS_STATE_REVIEW', 'NEEDS_DISCLOSURE', 'BLOCKED');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PromotionOfferCategory') THEN
    CREATE TYPE "PromotionOfferCategory" AS ENUM ('DEPOSIT_MATCH', 'RISK_FREE_BET', 'ODDS_BOOST', 'BONUS_BET', 'SIGNUP_BONUS', 'REFERRAL', 'OTHER');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PromotionAffiliateType') THEN
    CREATE TYPE "PromotionAffiliateType" AS ENUM ('CPA', 'REVSHARE', 'HYBRID', 'NONE');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SourceArtifactKind') THEN
    CREATE TYPE "SourceArtifactKind" AS ENUM ('PICK', 'PROMOTION', 'BRIEF', 'CONTENT_DRAFT');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SourceFreshnessStatus') THEN
    CREATE TYPE "SourceFreshnessStatus" AS ENUM ('FRESH', 'AGING', 'STALE', 'MISSING', 'CONTRADICTORY');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PublishReadinessStatus') THEN
    CREATE TYPE "PublishReadinessStatus" AS ENUM ('PUBLISH_READY', 'HOLD', 'REVIEW', 'BLOCKED');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CalibrationProposalKind') THEN
    CREATE TYPE "CalibrationProposalKind" AS ENUM ('CONFIDENCE_BUCKET_DRIFT', 'GRADE_DRIFT', 'PICK_TYPE_DRIFT', 'SPORT_DRIFT', 'DATA_QUALITY_DRIFT', 'RISK_LEVEL_DRIFT');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CalibrationProposalStatus') THEN
    CREATE TYPE "CalibrationProposalStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'IMPLEMENTED', 'REJECTED');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BriefStatus') THEN
    CREATE TYPE "BriefStatus" AS ENUM ('DRAFT', 'NEEDS_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED', 'BLOCKED');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BriefVisibility') THEN
    CREATE TYPE "BriefVisibility" AS ENUM ('INTERNAL', 'PUBLIC', 'PREMIUM');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BriefSectionType') THEN
    CREATE TYPE "BriefSectionType" AS ENUM ('SLATE_OVERVIEW', 'TOP_PICKS', 'DATA_QUALITY', 'LINE_MOVEMENT', 'SCHEDULE_REST', 'PERFORMANCE_CONTEXT', 'PROMOTIONS', 'MANUAL_REVIEW', 'CONTENT_IDEAS', 'RESPONSIBLE_GAMING', 'WHAT_CHANGED');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContentDraftStatus') THEN
    CREATE TYPE "ContentDraftStatus" AS ENUM ('DRAFT', 'NEEDS_SOURCE', 'NEEDS_REVIEW', 'NEEDS_COMPLIANCE', 'APPROVED', 'REJECTED', 'ARCHIVED', 'BLOCKED');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContentDraftVisibility') THEN
    CREATE TYPE "ContentDraftVisibility" AS ENUM ('INTERNAL', 'PUBLIC', 'PREMIUM');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContentDraftType') THEN
    CREATE TYPE "ContentDraftType" AS ENUM ('DAILY_BRIEF', 'MATCHUP_PREVIEW', 'METHODOLOGY_EDUCATION', 'PROMOTION_ROUNDUP', 'WEEKLY_RECAP', 'PERFORMANCE_TRANSPARENCY', 'RESPONSIBLE_BETTING_EDUCATION', 'MODEL_ACCOUNTABILITY_NOTE', 'LINE_MOVEMENT_WATCH', 'BLOG_POST', 'SOCIAL_DRAFT', 'NEWSLETTER_DRAFT');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContentSourceType') THEN
    CREATE TYPE "ContentSourceType" AS ENUM ('ODDS', 'PICK', 'PERFORMANCE', 'PROMOTION_TERMS', 'RESPONSIBLE_GAMING', 'METHODOLOGY', 'CALIBRATION', 'DAILY_BRIEF', 'INTERNAL_REVIEW');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContentSourceTrustLevel') THEN
    CREATE TYPE "ContentSourceTrustLevel" AS ENUM ('AUTHORITATIVE', 'PLATFORM', 'REVIEWED', 'UNVERIFIED', 'BLOCKED');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContentSourceStatus') THEN
    CREATE TYPE "ContentSourceStatus" AS ENUM ('FRESH', 'AGING', 'STALE', 'MISSING', 'PENDING');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContentSourceCoverageStatus') THEN
    CREATE TYPE "ContentSourceCoverageStatus" AS ENUM ('COVERED', 'PARTIAL', 'NEEDS_SOURCE', 'BLOCKED');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContentComplianceStatus') THEN
    CREATE TYPE "ContentComplianceStatus" AS ENUM ('NOT_APPLICABLE', 'CLEAR', 'REVIEW_REQUIRED', 'NEEDS_DISCLOSURE', 'NEEDS_RG_LANGUAGE', 'BLOCKED');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContentPerformanceGateStatus') THEN
    CREATE TYPE "ContentPerformanceGateStatus" AS ENUM ('NOT_APPLICABLE', 'GATE_ON', 'GATE_OFF_REQUIRED', 'GATE_OFF_BLOCKED');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContentReviewDecision') THEN
    CREATE TYPE "ContentReviewDecision" AS ENUM ('APPROVED', 'CHANGES_REQUESTED', 'REJECTED', 'ESCALATED', 'INTERNAL_ONLY');
  END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "tier" "SubscriptionTier" NOT NULL DEFAULT 'FREE',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "trialStart" TIMESTAMP(3),
    "trialEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "webhook_events" (
    "id" TEXT NOT NULL,
    "stripeEventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "sports" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "leagues" (
    "id" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "country" TEXT,
    "season" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leagues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "teams" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT,
    "city" TEXT,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "games" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "leagueId" TEXT,
    "homeTeamId" TEXT,
    "awayTeamId" TEXT,
    "homeTeamName" TEXT NOT NULL,
    "awayTeamName" TEXT NOT NULL,
    "commenceTime" TIMESTAMP(3) NOT NULL,
    "status" "GameStatus" NOT NULL DEFAULT 'SCHEDULED',
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "resultFetched" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "restDaysHome" INTEGER,
    "restDaysAway" INTEGER,
    "isBackToBackHome" BOOLEAN NOT NULL DEFAULT false,
    "isBackToBackAway" BOOLEAN NOT NULL DEFAULT false,
    "scheduleDensityHome" INTEGER,
    "scheduleDensityAway" INTEGER,
    "openingSpread" DOUBLE PRECISION,
    "openingTotal" DOUBLE PRECISION,
    "lineMovementSpread" DOUBLE PRECISION,
    "lineMovementTotal" DOUBLE PRECISION,
    "bookmakerCoverageMax" INTEGER NOT NULL DEFAULT 0,
    "dataQualityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "contextComputedAt" TIMESTAMP(3),

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "opening_lines" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "market" "OddsMarket" NOT NULL,
    "spread" DOUBLE PRECISION,
    "total" DOUBLE PRECISION,
    "homePrice" DOUBLE PRECISION,
    "awayPrice" DOUBLE PRECISION,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "opening_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "team_game_logs" (
    "id" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "opponentName" TEXT NOT NULL,
    "isHome" BOOLEAN NOT NULL,
    "gameDate" TIMESTAMP(3) NOT NULL,
    "teamScore" INTEGER,
    "opponentScore" INTEGER,
    "result" "GameLogResult" NOT NULL DEFAULT 'TBD',
    "spread" DOUBLE PRECISION,
    "atsResult" "AtsResult" NOT NULL DEFAULT 'TBD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isBootstrap" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "team_game_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "odds" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "ingestionRunId" TEXT NOT NULL,
    "bookmaker" TEXT NOT NULL,
    "market" "OddsMarket" NOT NULL,
    "homePrice" DOUBLE PRECISION,
    "awayPrice" DOUBLE PRECISION,
    "drawPrice" DOUBLE PRECISION,
    "spread" DOUBLE PRECISION,
    "homeSpreadPrice" DOUBLE PRECISION,
    "awaySpreadPrice" DOUBLE PRECISION,
    "total" DOUBLE PRECISION,
    "overPrice" DOUBLE PRECISION,
    "underPrice" DOUBLE PRECISION,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "odds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ingestion_runs" (
    "id" TEXT NOT NULL,
    "sport" TEXT,
    "status" "IngestionStatus" NOT NULL DEFAULT 'RUNNING',
    "gamesUpserted" INTEGER NOT NULL DEFAULT 0,
    "oddsInserted" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ingestion_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "picks" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "ingestionRunId" TEXT,
    "pickType" "PickType" NOT NULL,
    "selection" TEXT NOT NULL,
    "line" DOUBLE PRECISION NOT NULL,
    "confidence" INTEGER NOT NULL,
    "edgeScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "consensusPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bookmakerCount" INTEGER NOT NULL DEFAULT 0,
    "tier" "PickTier" NOT NULL DEFAULT 'FREE',
    "pickGrade" "PickGrade" NOT NULL DEFAULT 'LEAN',
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'MODERATE',
    "reasoning" TEXT NOT NULL,
    "reasoningShort" TEXT NOT NULL DEFAULT '',
    "factorBreakdown" JSONB,
    "modelVersion" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataFreshnessAt" TIMESTAMP(3),
    "result" "PickResult" NOT NULL DEFAULT 'PENDING',
    "settledAt" TIMESTAMP(3),
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isBootstrap" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "picks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "source_snapshots" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "sourceKind" "SourceSnapshotKind" NOT NULL,
    "sport" TEXT,
    "externalId" TEXT,
    "ingestionRunId" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "payload" JSONB NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "payloadBytes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "source_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "game_signals" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "sourceCategory" "SignalCategory" NOT NULL,
    "sourceName" TEXT NOT NULL,
    "signalKey" TEXT NOT NULL,
    "signalValue" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "trustLevel" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "isBootstrap" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "pick_signal_snapshots" (
    "id" TEXT NOT NULL,
    "pickId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hadOddsSignal" BOOLEAN NOT NULL DEFAULT false,
    "hadLineMovementSignal" BOOLEAN NOT NULL DEFAULT false,
    "hadRestSignal" BOOLEAN NOT NULL DEFAULT false,
    "hadScheduleSignal" BOOLEAN NOT NULL DEFAULT false,
    "hadAtsFormSignal" BOOLEAN NOT NULL DEFAULT false,
    "hadH2HSignal" BOOLEAN NOT NULL DEFAULT false,
    "hadVenueSignal" BOOLEAN NOT NULL DEFAULT false,
    "hadWeatherSignal" BOOLEAN NOT NULL DEFAULT false,
    "hadInjurySignal" BOOLEAN NOT NULL DEFAULT false,
    "hadRatingsSignal" BOOLEAN NOT NULL DEFAULT false,
    "hadPlayerSignal" BOOLEAN NOT NULL DEFAULT false,
    "hadOfficialsSignal" BOOLEAN NOT NULL DEFAULT false,
    "hadVenueEnvironmentSignal" BOOLEAN NOT NULL DEFAULT false,
    "hadPaceSignal" BOOLEAN NOT NULL DEFAULT false,
    "hadMilestoneSignal" BOOLEAN NOT NULL DEFAULT false,
    "bookmakerCount" INTEGER NOT NULL DEFAULT 0,
    "dataQualityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "confidenceAtPrediction" INTEGER NOT NULL DEFAULT 0,
    "lineMovementDelta" DOUBLE PRECISION,
    "restAdvantageNet" INTEGER,
    "atsFormSampleSize" INTEGER,
    "h2hSampleSize" INTEGER,
    "scheduleDensityHome" INTEGER,
    "scheduleDensityAway" INTEGER,
    "isBootstrap" BOOLEAN NOT NULL DEFAULT true,
    "usedDerivedHistory" BOOLEAN NOT NULL DEFAULT false,
    "usedScheduleSignal" BOOLEAN NOT NULL DEFAULT false,
    "modelVersion" TEXT NOT NULL DEFAULT '',
    "settlementResult" TEXT,
    "settledAt" TIMESTAMP(3),
    "eligibleForLearning" BOOLEAN NOT NULL DEFAULT false,
    "learningEligibleAt" TIMESTAMP(3),

    CONSTRAINT "pick_signal_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "blog_posts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sport" TEXT,
    "tags" TEXT[],
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "relatedPickIds" TEXT[],
    "generatedBy" TEXT NOT NULL DEFAULT 'system',
    "modelVersion" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "alerts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sport" TEXT,
    "league" TEXT,
    "threshold" INTEGER NOT NULL DEFAULT 70,
    "channel" "AlertChannel" NOT NULL DEFAULT 'EMAIL',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "performance_summaries" (
    "id" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "league" TEXT,
    "pickType" "PickType",
    "tier" "PickTier",
    "modelVersion" TEXT NOT NULL,
    "totalPicks" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "pushes" INTEGER NOT NULL DEFAULT 0,
    "winRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "period" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "performance_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "cockpit_tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "assignedAgent" "OperatorAgent" NOT NULL,
    "status" "CockpitTaskStatus" NOT NULL DEFAULT 'NEW',
    "priority" INTEGER NOT NULL DEFAULT 50,
    "riskLevel" "CockpitRiskLevel" NOT NULL DEFAULT 'LOW',
    "complianceStatus" "CockpitComplianceStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "source" TEXT NOT NULL,
    "payload" JSONB,
    "decisionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cockpit_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "cockpit_decisions" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "toStatus" "CockpitTaskStatus" NOT NULL,
    "reviewer" TEXT NOT NULL,
    "note" TEXT,
    "evidence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cockpit_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "cockpit_media_items" (
    "id" TEXT NOT NULL,
    "briefTitle" TEXT NOT NULL,
    "briefBody" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "draftBody" TEXT,
    "qaStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "complianceStatus" "CockpitComplianceStatus" NOT NULL DEFAULT 'REVIEW_REQUIRED',
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "scheduledFor" TIMESTAMP(3),
    "relatedTaskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cockpit_media_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "promotions" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sportsbookKey" TEXT NOT NULL,
    "operatorName" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "offerSummary" TEXT NOT NULL,
    "offerCategory" "PromotionOfferCategory" NOT NULL,
    "affiliateType" "PromotionAffiliateType" NOT NULL DEFAULT 'NONE',
    "affiliateUrl" TEXT,
    "termsUrl" TEXT,
    "promoCode" TEXT,
    "eligibleStates" JSONB NOT NULL DEFAULT '[]',
    "restrictedStates" JSONB NOT NULL DEFAULT '[]',
    "country" TEXT NOT NULL DEFAULT 'US',
    "minimumAge" INTEGER NOT NULL DEFAULT 21,
    "status" "PromotionStatus" NOT NULL DEFAULT 'DRAFT',
    "complianceStatus" "PromotionComplianceStatus" NOT NULL DEFAULT 'UNREVIEWED',
    "disclosureText" TEXT,
    "responsibleGamingText" TEXT,
    "lastReviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "source_coverage_reports" (
    "id" TEXT NOT NULL,
    "artifactKind" "SourceArtifactKind" NOT NULL,
    "artifactId" TEXT NOT NULL,
    "readiness" "PublishReadinessStatus" NOT NULL,
    "qualityScore" INTEGER NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "categories" JSONB NOT NULL,
    "rationale" TEXT NOT NULL,
    "blockers" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "source_coverage_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "daily_briefs" (
    "id" TEXT NOT NULL,
    "briefDate" TIMESTAMP(3) NOT NULL,
    "status" "BriefStatus" NOT NULL DEFAULT 'DRAFT',
    "visibility" "BriefVisibility" NOT NULL DEFAULT 'INTERNAL',
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "slateSummary" TEXT NOT NULL,
    "dataQualitySummary" TEXT,
    "manualReviewNotes" TEXT,
    "responsibleGamingText" TEXT NOT NULL,
    "generatedBy" TEXT NOT NULL,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_briefs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "daily_brief_sections" (
    "id" TEXT NOT NULL,
    "briefId" TEXT NOT NULL,
    "sectionType" "BriefSectionType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "visibility" "BriefVisibility" NOT NULL DEFAULT 'INTERNAL',
    "sourceStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "requiresReview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_brief_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "daily_brief_items" (
    "id" TEXT NOT NULL,
    "briefId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "metadata" JSONB,
    "sourceId" TEXT,
    "riskLevel" TEXT NOT NULL DEFAULT 'LOW',
    "visibility" "BriefVisibility" NOT NULL DEFAULT 'INTERNAL',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_brief_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "calibration_proposals" (
    "id" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "kind" "CalibrationProposalKind" NOT NULL,
    "observation" TEXT NOT NULL,
    "proposedChange" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "status" "CalibrationProposalStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedBy" TEXT,
    "acknowledgedAt" TIMESTAMP(3),

    CONSTRAINT "calibration_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "content_drafts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "contentType" "ContentDraftType" NOT NULL,
    "status" "ContentDraftStatus" NOT NULL DEFAULT 'DRAFT',
    "visibility" "ContentDraftVisibility" NOT NULL DEFAULT 'INTERNAL',
    "sport" TEXT,
    "league" TEXT,
    "relatedPickIds" JSONB NOT NULL DEFAULT '[]',
    "relatedPromotionIds" JSONB NOT NULL DEFAULT '[]',
    "relatedBriefIds" JSONB NOT NULL DEFAULT '[]',
    "sourceCoverageStatus" "ContentSourceCoverageStatus" NOT NULL DEFAULT 'NEEDS_SOURCE',
    "complianceStatus" "ContentComplianceStatus" NOT NULL DEFAULT 'REVIEW_REQUIRED',
    "responsibleGamingIncluded" BOOLEAN NOT NULL DEFAULT false,
    "affiliateDisclosureIncluded" BOOLEAN NOT NULL DEFAULT false,
    "performanceGateStatus" "ContentPerformanceGateStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "bannedPhraseScanClean" BOOLEAN NOT NULL DEFAULT false,
    "draftBody" TEXT NOT NULL,
    "excerpt" TEXT,
    "metadata" JSONB,
    "generatedBy" TEXT NOT NULL,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "content_sources" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "sourceType" "ContentSourceType" NOT NULL,
    "sourceLabel" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "sourceStatus" "ContentSourceStatus" NOT NULL DEFAULT 'PENDING',
    "trustLevel" "ContentSourceTrustLevel" NOT NULL DEFAULT 'UNVERIFIED',
    "fetchedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "content_reviews" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "reviewer" TEXT NOT NULL,
    "decision" "ContentReviewDecision" NOT NULL,
    "notes" TEXT,
    "evidence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_userId_key" ON "subscriptions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_stripeCustomerId_key" ON "subscriptions"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_stripeSubscriptionId_key" ON "subscriptions"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "subscriptions_stripeCustomerId_idx" ON "subscriptions"("stripeCustomerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "subscriptions_stripeSubscriptionId_idx" ON "subscriptions"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "webhook_events_stripeEventId_key" ON "webhook_events"("stripeEventId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "webhook_events_stripeEventId_idx" ON "webhook_events"("stripeEventId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "sports_key_key" ON "sports"("key");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "leagues_key_key" ON "leagues"("key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "leagues_sportId_idx" ON "leagues"("sportId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "teams_leagueId_idx" ON "teams"("leagueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "teams_name_idx" ON "teams"("name");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "games_externalId_key" ON "games"("externalId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "games_sportId_idx" ON "games"("sportId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "games_commenceTime_idx" ON "games"("commenceTime");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "games_status_idx" ON "games"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "opening_lines_gameId_idx" ON "opening_lines"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "opening_lines_gameId_market_key" ON "opening_lines"("gameId", "market");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "team_game_logs_teamName_sport_gameDate_idx" ON "team_game_logs"("teamName", "sport", "gameDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "team_game_logs_gameId_idx" ON "team_game_logs"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "team_game_logs_gameId_teamName_key" ON "team_game_logs"("gameId", "teamName");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "odds_gameId_idx" ON "odds"("gameId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "odds_ingestionRunId_idx" ON "odds"("ingestionRunId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "odds_fetchedAt_idx" ON "odds"("fetchedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ingestion_runs_status_idx" ON "ingestion_runs"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ingestion_runs_startedAt_idx" ON "ingestion_runs"("startedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "picks_tier_idx" ON "picks"("tier");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "picks_pickGrade_idx" ON "picks"("pickGrade");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "picks_generatedAt_idx" ON "picks"("generatedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "picks_result_idx" ON "picks"("result");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "picks_isFeatured_idx" ON "picks"("isFeatured");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "picks_gameId_pickType_key" ON "picks"("gameId", "pickType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "source_snapshots_provider_sourceKind_idx" ON "source_snapshots"("provider", "sourceKind");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "source_snapshots_sport_idx" ON "source_snapshots"("sport");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "source_snapshots_externalId_idx" ON "source_snapshots"("externalId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "source_snapshots_fetchedAt_idx" ON "source_snapshots"("fetchedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "source_snapshots_payloadHash_idx" ON "source_snapshots"("payloadHash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "game_signals_gameId_sourceCategory_idx" ON "game_signals"("gameId", "sourceCategory");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "game_signals_fetchedAt_idx" ON "game_signals"("fetchedAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "game_signals_gameId_sourceName_signalKey_key" ON "game_signals"("gameId", "sourceName", "signalKey");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "pick_signal_snapshots_pickId_key" ON "pick_signal_snapshots"("pickId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pick_signal_snapshots_gameId_idx" ON "pick_signal_snapshots"("gameId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pick_signal_snapshots_capturedAt_idx" ON "pick_signal_snapshots"("capturedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pick_signal_snapshots_eligibleForLearning_idx" ON "pick_signal_snapshots"("eligibleForLearning");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pick_signal_snapshots_isBootstrap_idx" ON "pick_signal_snapshots"("isBootstrap");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "blog_posts_slug_key" ON "blog_posts"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "blog_posts_status_idx" ON "blog_posts"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "blog_posts_publishedAt_idx" ON "blog_posts"("publishedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "blog_posts_sport_idx" ON "blog_posts"("sport");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "alerts_userId_idx" ON "alerts"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "performance_summaries_sport_idx" ON "performance_summaries"("sport");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "performance_summaries_sport_pickType_tier_modelVersion_peri_key" ON "performance_summaries"("sport", "pickType", "tier", "modelVersion", "period");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "cockpit_tasks_assignedAgent_idx" ON "cockpit_tasks"("assignedAgent");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "cockpit_tasks_status_idx" ON "cockpit_tasks"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "cockpit_tasks_priority_idx" ON "cockpit_tasks"("priority");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "cockpit_tasks_createdAt_idx" ON "cockpit_tasks"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "cockpit_decisions_taskId_createdAt_idx" ON "cockpit_decisions"("taskId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "cockpit_media_items_qaStatus_idx" ON "cockpit_media_items"("qaStatus");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "cockpit_media_items_complianceStatus_idx" ON "cockpit_media_items"("complianceStatus");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "promotions_slug_key" ON "promotions"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "promotions_status_idx" ON "promotions"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "promotions_complianceStatus_idx" ON "promotions"("complianceStatus");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "promotions_sportsbookKey_idx" ON "promotions"("sportsbookKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "promotions_expiresAt_idx" ON "promotions"("expiresAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "source_coverage_reports_artifactKind_artifactId_idx" ON "source_coverage_reports"("artifactKind", "artifactId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "source_coverage_reports_readiness_idx" ON "source_coverage_reports"("readiness");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "source_coverage_reports_generatedAt_idx" ON "source_coverage_reports"("generatedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "daily_briefs_status_idx" ON "daily_briefs"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "daily_briefs_visibility_idx" ON "daily_briefs"("visibility");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "daily_briefs_briefDate_key" ON "daily_briefs"("briefDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "daily_brief_sections_briefId_sortOrder_idx" ON "daily_brief_sections"("briefId", "sortOrder");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "daily_brief_items_briefId_sortOrder_idx" ON "daily_brief_items"("briefId", "sortOrder");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "calibration_proposals_modelVersion_idx" ON "calibration_proposals"("modelVersion");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "calibration_proposals_status_idx" ON "calibration_proposals"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "calibration_proposals_createdAt_idx" ON "calibration_proposals"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "content_drafts_slug_key" ON "content_drafts"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "content_drafts_status_idx" ON "content_drafts"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "content_drafts_contentType_idx" ON "content_drafts"("contentType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "content_drafts_visibility_idx" ON "content_drafts"("visibility");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "content_drafts_sourceCoverageStatus_idx" ON "content_drafts"("sourceCoverageStatus");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "content_drafts_complianceStatus_idx" ON "content_drafts"("complianceStatus");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "content_drafts_createdAt_idx" ON "content_drafts"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "content_sources_draftId_idx" ON "content_sources"("draftId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "content_sources_sourceType_idx" ON "content_sources"("sourceType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "content_sources_trustLevel_idx" ON "content_sources"("trustLevel");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "content_reviews_draftId_createdAt_idx" ON "content_reviews"("draftId", "createdAt");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'accounts_userId_fkey') THEN
    ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sessions_userId_fkey') THEN
    ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_userId_fkey') THEN
    ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'webhook_events_subscriptionId_fkey') THEN
    ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leagues_sportId_fkey') THEN
    ALTER TABLE "leagues" ADD CONSTRAINT "leagues_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "sports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teams_leagueId_fkey') THEN
    ALTER TABLE "teams" ADD CONSTRAINT "teams_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'games_sportId_fkey') THEN
    ALTER TABLE "games" ADD CONSTRAINT "games_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "sports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'games_leagueId_fkey') THEN
    ALTER TABLE "games" ADD CONSTRAINT "games_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'games_homeTeamId_fkey') THEN
    ALTER TABLE "games" ADD CONSTRAINT "games_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'games_awayTeamId_fkey') THEN
    ALTER TABLE "games" ADD CONSTRAINT "games_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'opening_lines_gameId_fkey') THEN
    ALTER TABLE "opening_lines" ADD CONSTRAINT "opening_lines_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_game_logs_gameId_fkey') THEN
    ALTER TABLE "team_game_logs" ADD CONSTRAINT "team_game_logs_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'odds_gameId_fkey') THEN
    ALTER TABLE "odds" ADD CONSTRAINT "odds_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'odds_ingestionRunId_fkey') THEN
    ALTER TABLE "odds" ADD CONSTRAINT "odds_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "ingestion_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'picks_gameId_fkey') THEN
    ALTER TABLE "picks" ADD CONSTRAINT "picks_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'source_snapshots_ingestionRunId_fkey') THEN
    ALTER TABLE "source_snapshots" ADD CONSTRAINT "source_snapshots_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "ingestion_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'game_signals_gameId_fkey') THEN
    ALTER TABLE "game_signals" ADD CONSTRAINT "game_signals_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pick_signal_snapshots_pickId_fkey') THEN
    ALTER TABLE "pick_signal_snapshots" ADD CONSTRAINT "pick_signal_snapshots_pickId_fkey" FOREIGN KEY ("pickId") REFERENCES "picks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pick_signal_snapshots_gameId_fkey') THEN
    ALTER TABLE "pick_signal_snapshots" ADD CONSTRAINT "pick_signal_snapshots_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'alerts_userId_fkey') THEN
    ALTER TABLE "alerts" ADD CONSTRAINT "alerts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cockpit_decisions_taskId_fkey') THEN
    ALTER TABLE "cockpit_decisions" ADD CONSTRAINT "cockpit_decisions_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "cockpit_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'daily_brief_sections_briefId_fkey') THEN
    ALTER TABLE "daily_brief_sections" ADD CONSTRAINT "daily_brief_sections_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "daily_briefs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'daily_brief_items_briefId_fkey') THEN
    ALTER TABLE "daily_brief_items" ADD CONSTRAINT "daily_brief_items_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "daily_briefs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'content_sources_draftId_fkey') THEN
    ALTER TABLE "content_sources" ADD CONSTRAINT "content_sources_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "content_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'content_reviews_draftId_fkey') THEN
    ALTER TABLE "content_reviews" ADD CONSTRAINT "content_reviews_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "content_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;


