-- Baseline migration (generated 2026-09-02 from schema.prisma with
-- `prisma migrate diff --from-empty --to-schema-datamodel --script`, then rewritten
-- to be idempotent). Replaces the pre-2026-09 migration history, which was not
-- replayable from an empty database (it began on top of a db push-built schema).
-- Safe to apply on a database that already carries the schema: every statement
-- is IF NOT EXISTS or wrapped in a duplicate_object guard.

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "CheckoutAttemptStatus" AS ENUM ('CREATED', 'REQUEST_IN_FLIGHT', 'SESSION_CREATED', 'AMBIGUOUS', 'COMPLETED', 'FAILED', 'EXPIRED', 'CANCELED');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "CheckoutOutcomeClass" AS ENUM ('DEFINITIVE_REJECTION', 'AMBIGUOUS_NETWORK_OUTCOME', 'RETRIABLE_NO_REQUEST_SENT', 'CONFIGURATION_FAILURE');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "LossAutopsyStatus" AS ENUM ('DRAFT', 'PEER_REVIEW', 'PUBLISHED', 'RETRACTED');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "LossRootCause" AS ENUM ('DATA_GAP', 'STALE_LINE', 'INJURY_SHOCK', 'WEATHER', 'OFFICIATING', 'VARIANCE', 'MODEL_DRIFT', 'HUMAN_OVERRIDE', 'OTHER');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'FANTASY', 'PRO', 'ELITE');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED', 'INCOMPLETE', 'PAUSED');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "GameStatus" AS ENUM ('SCHEDULED', 'LIVE', 'FINAL', 'POSTPONED', 'CANCELED');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "OddsMarket" AS ENUM ('H2H', 'SPREADS', 'TOTALS');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "PickType" AS ENUM ('SPREAD', 'MONEYLINE', 'TOTAL');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "PickTier" AS ENUM ('FREE', 'PREMIUM');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "PickGrade" AS ENUM ('ELITE_PLAY', 'STRONG_PLAY', 'SOLID_PLAY', 'LEAN');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "RiskLevel" AS ENUM ('LOW_RISK', 'MODERATE', 'HIGH_VARIANCE', 'INJURY_RISK', 'LINE_STEAM');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "PickResult" AS ENUM ('PENDING', 'WIN', 'LOSS', 'PUSH', 'VOID');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "GateDecisionStatus" AS ENUM ('SCORING', 'PUBLISHED', 'GATED');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "IngestionStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED', 'PARTIAL');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "AlertChannel" AS ENUM ('EMAIL', 'PUSH');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "GameLogResult" AS ENUM ('WIN', 'LOSS', 'TBD');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "SignalCategory" AS ENUM ('ODDS', 'SCHEDULE', 'WEATHER', 'INJURIES', 'RATINGS', 'MARKET_SENTIMENT', 'PLAYER_AVAILABILITY', 'OFFICIALS', 'VENUE_ENVIRONMENT', 'TEAM_RATES', 'STANDINGS', 'DIVISION_CONTEXT', 'MILESTONES', 'PACE');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "SourceSnapshotKind" AS ENUM ('ODDS_EVENTS', 'ODDS_SCORES', 'CONTEXT_FIXTURES', 'CONTEXT_TEAM_STATS', 'CONTEXT_PLAYER_AVAILABILITY', 'CONTEXT_OFFICIALS', 'CONTEXT_VENUE', 'CONTEXT_WEATHER', 'CONTEXT_STANDINGS', 'CONTEXT_MILESTONES');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "AtsResult" AS ENUM ('WIN', 'LOSS', 'PUSH', 'TBD');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "MemoryType" AS ENUM ('episodic', 'semantic', 'procedural', 'preference', 'decision', 'failure', 'source', 'agent_performance', 'escalation_rule', 'public_claim_rule');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "MemoryState" AS ENUM ('candidate', 'confirmed', 'repeated_pattern', 'conflicted', 'stale', 'superseded', 'rejected', 'expired');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "AgentHandoffStatus" AS ENUM ('pending', 'accepted', 'rejected', 'escalated');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "AgentHandoffRiskLevel" AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "SubagentParentReviewStatus" AS ENUM ('pending_review', 'accepted', 'rejected', 'edited');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "OperatorAgent" AS ENUM ('JARVIS', 'SARAH', 'TAL', 'SCOUT', 'AVA', 'BOBBY');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "CockpitTaskStatus" AS ENUM ('NEW', 'ROUTED', 'DRAFTED', 'NEEDS_REVIEW', 'APPROVED', 'REJECTED', 'BLOCKED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "CockpitRiskLevel" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'COMPLIANCE_HOLD');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "CockpitComplianceStatus" AS ENUM ('NOT_APPLICABLE', 'CLEAR', 'REVIEW_REQUIRED', 'HOLD', 'REJECTED');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "CreatorAssetKind" AS ENUM ('FAN_EXPLAINER', 'FANTASY_ANGLE', 'BETTING_EDUCATION', 'X_THREAD', 'TIKTOK_REELS_SCRIPT', 'NEWSLETTER_BLOCK', 'SPONSOR_SAFE_BLURB', 'YOUTUBE_TITLE_IDEAS');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "CreatorAssetStatus" AS ENUM ('DRAFT', 'EXPORTED', 'ARCHIVED', 'BLOCKED');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "CreatorAssetComplianceStatus" AS ENUM ('GREEN', 'YELLOW', 'RED');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "ModelJournalEntryStatus" AS ENUM ('DRAFT', 'REVIEW_PENDING', 'PUBLISHED', 'RETRACTED');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "PromotionStatus" AS ENUM ('DRAFT', 'NEEDS_REVIEW', 'ACTIVE', 'PAUSED', 'EXPIRED', 'ARCHIVED', 'BLOCKED');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "PromotionComplianceStatus" AS ENUM ('UNREVIEWED', 'APPROVED', 'NEEDS_TERMS', 'NEEDS_STATE_REVIEW', 'NEEDS_DISCLOSURE', 'BLOCKED');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "PromotionOfferCategory" AS ENUM ('DEPOSIT_MATCH', 'RISK_FREE_BET', 'ODDS_BOOST', 'BONUS_BET', 'SIGNUP_BONUS', 'REFERRAL', 'OTHER');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "PromotionAffiliateType" AS ENUM ('CPA', 'REVSHARE', 'HYBRID', 'NONE');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "SourceArtifactKind" AS ENUM ('PICK', 'PROMOTION', 'BRIEF', 'CONTENT_DRAFT');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "SourceFreshnessStatus" AS ENUM ('FRESH', 'AGING', 'STALE', 'MISSING', 'CONTRADICTORY');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "PublishReadinessStatus" AS ENUM ('PUBLISH_READY', 'HOLD', 'REVIEW', 'BLOCKED');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "CalibrationProposalKind" AS ENUM ('CONFIDENCE_BUCKET_DRIFT', 'GRADE_DRIFT', 'PICK_TYPE_DRIFT', 'SPORT_DRIFT', 'DATA_QUALITY_DRIFT', 'RISK_LEVEL_DRIFT');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "CalibrationProposalStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'IMPLEMENTED', 'REJECTED');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "BriefStatus" AS ENUM ('DRAFT', 'NEEDS_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED', 'BLOCKED');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "BriefVisibility" AS ENUM ('INTERNAL', 'PUBLIC', 'PREMIUM');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "BriefSectionType" AS ENUM ('SLATE_OVERVIEW', 'TOP_PICKS', 'DATA_QUALITY', 'LINE_MOVEMENT', 'SCHEDULE_REST', 'PERFORMANCE_CONTEXT', 'PROMOTIONS', 'MANUAL_REVIEW', 'CONTENT_IDEAS', 'RESPONSIBLE_GAMING', 'WHAT_CHANGED');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "ContentDraftStatus" AS ENUM ('DRAFT', 'NEEDS_SOURCE', 'NEEDS_REVIEW', 'NEEDS_COMPLIANCE', 'APPROVED', 'REJECTED', 'ARCHIVED', 'BLOCKED');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "ContentDraftVisibility" AS ENUM ('INTERNAL', 'PUBLIC', 'PREMIUM');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "ContentDraftType" AS ENUM ('DAILY_BRIEF', 'MATCHUP_PREVIEW', 'METHODOLOGY_EDUCATION', 'PROMOTION_ROUNDUP', 'WEEKLY_RECAP', 'PERFORMANCE_TRANSPARENCY', 'RESPONSIBLE_BETTING_EDUCATION', 'MODEL_ACCOUNTABILITY_NOTE', 'LINE_MOVEMENT_WATCH', 'BLOG_POST', 'SOCIAL_DRAFT', 'NEWSLETTER_DRAFT');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "ContentSourceType" AS ENUM ('ODDS', 'PICK', 'PERFORMANCE', 'PROMOTION_TERMS', 'RESPONSIBLE_GAMING', 'METHODOLOGY', 'CALIBRATION', 'DAILY_BRIEF', 'INTERNAL_REVIEW');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "ContentSourceTrustLevel" AS ENUM ('AUTHORITATIVE', 'PLATFORM', 'REVIEWED', 'UNVERIFIED', 'BLOCKED');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "ContentSourceStatus" AS ENUM ('FRESH', 'AGING', 'STALE', 'MISSING', 'PENDING');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "ContentSourceCoverageStatus" AS ENUM ('COVERED', 'PARTIAL', 'NEEDS_SOURCE', 'BLOCKED');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "ContentComplianceStatus" AS ENUM ('NOT_APPLICABLE', 'CLEAR', 'REVIEW_REQUIRED', 'NEEDS_DISCLOSURE', 'NEEDS_RG_LANGUAGE', 'BLOCKED');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "ContentPerformanceGateStatus" AS ENUM ('NOT_APPLICABLE', 'GATE_ON', 'GATE_OFF_REQUIRED', 'GATE_OFF_BLOCKED');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "ContentReviewDecision" AS ENUM ('APPROVED', 'CHANGES_REQUESTED', 'REJECTED', 'ESCALATED', 'INTERNAL_ONLY');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "ModerationReasonCode" AS ENUM ('HARASSMENT', 'HATE_SPEECH', 'THREATS', 'DOXXING', 'TOUT_BEHAVIOR', 'GUARANTEED_WINNER_LANGUAGE', 'PRESSURE_TO_BET', 'BEGINNER_MOCKING', 'LOSS_SHAMING', 'CHASING_LOSSES_ENCOURAGEMENT', 'SELF_EXCLUSION_CIRCUMVENTION', 'UNDERAGE_PARTICIPATION', 'PIRATED_CONTENT', 'PERSONAL_DATA_SHARING', 'SPAM_REFERRAL_FLOOD', 'OTHER');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "ModerationReportStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'ACTIONED', 'DISMISSED', 'ESCALATED');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "ModerationActionKind" AS ENUM ('NUDGE', 'REMOVE', 'MUTE_24H', 'MUTE_7D', 'SUSPEND', 'BAN');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "ModerationAppealStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'UPHELD', 'OVERTURNED', 'EXPIRED');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "EntityType" AS ENUM ('player', 'team', 'coach', 'coordinator', 'league', 'season', 'game', 'venue', 'injury', 'practice_report', 'transaction', 'article', 'reporter', 'source', 'rumor_cluster', 'market', 'sportsbook', 'line', 'prop', 'model_output', 'pick', 'settlement', 'public_claim', 'fantasy_league', 'fantasy_team', 'fantasy_roster', 'fantasy_player', 'fantasy_matchup', 'fantasy_recommendation');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

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
    "pastDueSince" TIMESTAMP(3),
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
CREATE TABLE IF NOT EXISTS "checkout_attempts" (
    "id" TEXT NOT NULL,
    "originalClientIntentId" TEXT,
    "activeClientIntentId" TEXT,
    "userId" TEXT,
    "subjectUserId" TEXT NOT NULL,
    "subjectEmail" TEXT,
    "customerId" TEXT,
    "tier" "SubscriptionTier" NOT NULL,
    "interval" TEXT NOT NULL,
    "priceId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "requestFingerprint" TEXT NOT NULL,
    "fingerprintVersion" TEXT NOT NULL DEFAULT 'v2',
    "status" "CheckoutAttemptStatus" NOT NULL DEFAULT 'CREATED',
    "lastOutcomeClass" "CheckoutOutcomeClass",
    "stripeIdempotencyKey" TEXT NOT NULL,
    "stripeSessionId" TEXT,
    "stripeSubscriptionId" TEXT,
    "lastErrorKind" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checkout_attempts_pkey" PRIMARY KEY ("id")
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
    "currentEdgeIndex" DOUBLE PRECISION,
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
CREATE TABLE IF NOT EXISTS "odds_line_snapshots" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "phase" TEXT NOT NULL,
    "book" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "line" DOUBLE PRECISION,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "odds_line_snapshots_pkey" PRIMARY KEY ("id")
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
    "clvLockLine" DOUBLE PRECISION,
    "clvLockPrice" INTEGER,
    "clvCloseLine" DOUBLE PRECISION,
    "clvClosePrice" INTEGER,
    "clvKind" TEXT,
    "clvValue" DOUBLE PRECISION,
    "clvVerdict" TEXT,
    "clvCapturedAt" TIMESTAMP(3),
    "clvGradedAt" TIMESTAMP(3),
    "bookDisagreementAtLock" DOUBLE PRECISION,
    "isBootstrap" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "picks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "pick_proof_receipts" (
    "id" TEXT NOT NULL,
    "pickId" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "marketFairProb" DOUBLE PRECISION NOT NULL,
    "confidence" INTEGER NOT NULL,
    "edgeScore" DOUBLE PRECISION NOT NULL,
    "modelProb" DOUBLE PRECISION,
    "entryOdds" INTEGER NOT NULL,
    "line" DOUBLE PRECISION NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "asOf" TIMESTAMP(3) NOT NULL,
    "frozenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "slateKey" TEXT,

    CONSTRAINT "pick_proof_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "slate_commitments" (
    "id" TEXT NOT NULL,
    "slateKey" TEXT NOT NULL,
    "root" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "committedAt" TIMESTAMP(3) NOT NULL,
    "pedersenAggregateHex" TEXT,
    "pedersenAggregateValue" TEXT,
    "pedersenBlindingSum" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slate_commitments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "gate_decisions" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "pickId" TEXT,
    "status" "GateDecisionStatus" NOT NULL,
    "reason" VARCHAR(240) NOT NULL,
    "reasonCode" VARCHAR(80) NOT NULL,
    "edgeIndex" DOUBLE PRECISION,
    "confidence" INTEGER,
    "modelVersion" TEXT NOT NULL,
    "isBootstrap" BOOLEAN NOT NULL DEFAULT true,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "evidenceRefs" JSONB,

    CONSTRAINT "gate_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "loss_autopsies" (
    "id" TEXT NOT NULL,
    "pickId" TEXT NOT NULL,
    "authorEmail" TEXT NOT NULL,
    "authoredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "LossAutopsyStatus" NOT NULL DEFAULT 'DRAFT',
    "headline" VARCHAR(140) NOT NULL,
    "whatWeSaw" TEXT NOT NULL,
    "whatHappened" TEXT NOT NULL,
    "whatWeLearned" TEXT NOT NULL,
    "rootCause" "LossRootCause" NOT NULL,
    "lessonTags" TEXT[],
    "modelVersion" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "evidenceRefs" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loss_autopsies_pkey" PRIMARY KEY ("id")
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
CREATE TABLE IF NOT EXISTS "watchlist_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watchlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "push_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "settlement_runs" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "scheduledWindow" TEXT NOT NULL,
    "sourceSnapshotFingerprint" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReusedAt" TIMESTAMP(3),

    CONSTRAINT "settlement_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "settlement_observations" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "settlementRunId" TEXT NOT NULL,
    "payloadFingerprint" TEXT NOT NULL,
    "sourceSnapshotFingerprint" TEXT,
    "observedSourceStatus" TEXT NOT NULL,
    "homeScorePresent" BOOLEAN NOT NULL,
    "awayScorePresent" BOOLEAN NOT NULL,
    "mappingStatus" TEXT NOT NULL,
    "freshnessState" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "sourceObservedAt" TIMESTAMP(3),
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settlement_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "settlement_anomalies" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "anomalyType" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'OPEN',
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "distinctRunCount" INTEGER NOT NULL DEFAULT 1,
    "resolutionActor" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionReason" TEXT,

    CONSTRAINT "settlement_anomalies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "owner_decision_requests" (
    "id" TEXT NOT NULL,
    "anomalyId" TEXT NOT NULL,
    "requestKind" TEXT NOT NULL,
    "context" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "owner_decision_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "settlement_decision_events" (
    "id" TEXT NOT NULL,
    "anomalyId" TEXT NOT NULL,
    "decisionKind" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorReceipt" JSONB NOT NULL,
    "priorState" TEXT NOT NULL,
    "nextState" TEXT NOT NULL,
    "reason" TEXT,
    "evidence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settlement_decision_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "settlement_decisions" (
    "id" TEXT NOT NULL,
    "anomalyId" TEXT NOT NULL,
    "decisionKind" TEXT NOT NULL,
    "context" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settlement_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "pick_settlement_events" (
    "id" TEXT NOT NULL,
    "pickId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "result" "PickResult" NOT NULL,
    "settledAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "claimedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "payload" JSONB,
    "recipientsMaterializedAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "channelOutcomes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pick_settlement_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "pick_settlement_deliveries" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "destinationVersion" INTEGER NOT NULL DEFAULT 1,
    "idempotencyKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "claimVersion" INTEGER NOT NULL DEFAULT 0,
    "leaseToken" TEXT,
    "leaseOwner" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "nextAttemptAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "lastErrorClass" TEXT,
    "attemptHistory" JSONB,
    "latencyMs" INTEGER,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pick_settlement_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "outbox_dead_letter_receipts" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "reason" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),

    CONSTRAINT "outbox_dead_letter_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "post_settlement_work" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "post_settlement_work_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "filter_state_snapshots" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "observations" INTEGER NOT NULL DEFAULT 0,
    "payload" JSONB NOT NULL,
    "teamIndex" JSONB,
    "forecastSkillState" JSONB,
    "baeeWeights" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "filter_state_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "shadow_signals" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "shadowProb" DOUBLE PRECISION NOT NULL,
    "marketProb" DOUBLE PRECISION NOT NULL,
    "liveConfidence" INTEGER,
    "outcome" INTEGER,
    "modelProbs" JSONB,
    "settledAt" TIMESTAMP(3),
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shadow_signals_pkey" PRIMARY KEY ("id")
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
CREATE TABLE IF NOT EXISTS "jarvis_memory_events" (
    "id" TEXT NOT NULL,
    "memory_type" "MemoryType" NOT NULL,
    "memory_state" "MemoryState" NOT NULL DEFAULT 'candidate',
    "scope" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "full_text" TEXT,
    "source_type" TEXT NOT NULL,
    "source_ref" TEXT,
    "source_timestamp" TIMESTAMP(3),
    "actor" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,
    "sensitivity" TEXT NOT NULL DEFAULT 'normal',
    "tags" TEXT[],
    "related_decision_id" TEXT,
    "related_agent_id" TEXT,
    "supersedes_memory_id" TEXT,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "confirmed_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "embedding_ref" TEXT,
    "metadata" JSONB,
    "owner_approval" BOOLEAN NOT NULL DEFAULT false,
    "related_agent_run_id" TEXT,

    CONSTRAINT "jarvis_memory_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "jarvis_decisions" (
    "id" TEXT NOT NULL,
    "decision_title" TEXT NOT NULL,
    "decision_summary" TEXT NOT NULL,
    "decision_type" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "evidence" JSONB,
    "alternatives_rejected" JSONB,
    "owner" TEXT NOT NULL,
    "decision_date" TIMESTAMP(3) NOT NULL,
    "revisit_date" TIMESTAMP(3),
    "outcome" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "source_refs" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jarvis_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "agent_handoffs" (
    "id" TEXT NOT NULL,
    "source_seat" TEXT NOT NULL,
    "target_seat" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "task_type" TEXT NOT NULL,
    "evidence_text" TEXT NOT NULL,
    "risk_level" "AgentHandoffRiskLevel" NOT NULL DEFAULT 'low',
    "authority_tier" INTEGER NOT NULL,
    "status" "AgentHandoffStatus" NOT NULL DEFAULT 'pending',
    "owner_approval_required" BOOLEAN NOT NULL DEFAULT false,
    "outcome" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "actor_subject_id" TEXT,
    "actor_type" TEXT,
    "actor_email" TEXT,
    "policy_version" TEXT,
    "actor_receipt_id" TEXT,

    CONSTRAINT "agent_handoffs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "subagent_runs" (
    "id" TEXT NOT NULL,
    "subagent_id" TEXT NOT NULL,
    "parent_seat" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "input_context" TEXT NOT NULL,
    "output_artifact_ref" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,
    "uncertainty" TEXT NOT NULL,
    "evidence" TEXT[],
    "prohibited_actions_checked" BOOLEAN NOT NULL DEFAULT false,
    "parent_review_status" "SubagentParentReviewStatus" NOT NULL DEFAULT 'pending_review',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "actor_subject_id" TEXT,
    "actor_type" TEXT,
    "actor_email" TEXT,
    "reviewer_subject_id" TEXT,
    "reviewer_type" TEXT,
    "reviewer_email" TEXT,
    "policy_version" TEXT,
    "actor_receipt_id" TEXT,
    "reviewer_receipt_id" TEXT,

    CONSTRAINT "subagent_runs_pkey" PRIMARY KEY ("id")
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
CREATE TABLE IF NOT EXISTS "creator_assets" (
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

-- CreateTable
CREATE TABLE IF NOT EXISTS "model_journal_entries" (
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

-- CreateTable
CREATE TABLE IF NOT EXISTS "claude_api_call_records" (
    "id" TEXT NOT NULL,
    "surface" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "estimatedCostUsd" DECIMAL(10,6) NOT NULL,
    "userId" TEXT,
    "gameId" TEXT,
    "templateKind" TEXT,
    "durationMs" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL,
    "errorKind" TEXT,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "claude_api_call_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "claude_api_budgets" (
    "id" TEXT NOT NULL,
    "surface" TEXT NOT NULL,
    "monthlyBudgetUsd" DECIMAL(10,2) NOT NULL,
    "alertThresholds" JSONB NOT NULL,
    "overrideActive" BOOLEAN NOT NULL DEFAULT false,
    "overrideExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "claude_api_budgets_pkey" PRIMARY KEY ("id")
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
CREATE TABLE IF NOT EXISTS "ladder_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "track" TEXT,
    "modelVersion" TEXT NOT NULL,
    "sourceEventId" TEXT,
    "idempotencyKey" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ladder_events_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE IF NOT EXISTS "actor_receipts" (
    "id" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "authMethod" TEXT NOT NULL,
    "authorityScope" TEXT NOT NULL,
    "tenant" TEXT,
    "project" TEXT,
    "requestId" TEXT,
    "runId" TEXT,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "emailSnapshot" TEXT,
    "policyVersion" TEXT NOT NULL,
    "operation" TEXT,
    "credentialMethod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "actor_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "rate_limit_counters" (
    "scope" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limit_counters_pkey" PRIMARY KEY ("scope","key","window_start")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "moderation_reports" (
    "id" TEXT NOT NULL,
    "reporterUserId" TEXT,
    "reporterActorType" TEXT,
    "reporterReceiptId" TEXT,
    "targetUserId" TEXT NOT NULL,
    "contentRef" TEXT NOT NULL,
    "surface" TEXT NOT NULL,
    "reason" "ModerationReasonCode" NOT NULL,
    "notes" TEXT,
    "status" "ModerationReportStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "moderation_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "moderation_actions" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "actorType" TEXT,
    "actorEmail" TEXT,
    "policyVersion" TEXT,
    "actorReceiptId" TEXT,
    "targetUserId" TEXT NOT NULL,
    "contentRef" TEXT,
    "surface" TEXT,
    "action" "ModerationActionKind" NOT NULL,
    "reason" "ModerationReasonCode" NOT NULL,
    "notes" TEXT,
    "reportId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "moderation_appeals" (
    "id" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "appellantId" TEXT NOT NULL,
    "grounds" TEXT NOT NULL,
    "status" "ModerationAppealStatus" NOT NULL DEFAULT 'PENDING',
    "decidedBy" TEXT,
    "reviewerType" TEXT,
    "reviewerEmail" TEXT,
    "policyVersion" TEXT,
    "appellantReceiptId" TEXT,
    "reviewerReceiptId" TEXT,
    "decision" TEXT,
    "decidedAt" TIMESTAMP(3),
    "slaDeadline" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "moderation_appeals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "players" (
    "id" TEXT NOT NULL,
    "gsisId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "position" TEXT,
    "recentTeam" TEXT,
    "headshotUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "player_game_stats" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "seasonType" TEXT NOT NULL DEFAULT 'REG',
    "team" TEXT,
    "opponent" TEXT,
    "attempts" INTEGER,
    "carries" INTEGER,
    "receptions" INTEGER,
    "targets" INTEGER,
    "targetShare" DOUBLE PRECISION,
    "receivingYards" DOUBLE PRECISION,
    "rushingYards" DOUBLE PRECISION,
    "fantasyPointsPpr" DOUBLE PRECISION,
    "passingEpa" DOUBLE PRECISION,
    "rushingEpa" DOUBLE PRECISION,
    "receivingEpa" DOUBLE PRECISION,
    "sourceId" TEXT NOT NULL DEFAULT 'nflverse',
    "rightsSnapshot" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_game_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "snap_counts" (
    "id" TEXT NOT NULL,
    "playerId" TEXT,
    "pfrPlayerId" TEXT,
    "playerName" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "seasonType" TEXT NOT NULL DEFAULT 'REG',
    "team" TEXT,
    "opponent" TEXT,
    "position" TEXT,
    "offenseSnaps" INTEGER,
    "offensePct" DOUBLE PRECISION,
    "defenseSnaps" INTEGER,
    "defensePct" DOUBLE PRECISION,
    "stSnaps" INTEGER,
    "stPct" DOUBLE PRECISION,
    "sourceId" TEXT NOT NULL DEFAULT 'nflverse',
    "rightsSnapshot" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "snap_counts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "injuries" (
    "id" TEXT NOT NULL,
    "playerId" TEXT,
    "gsisId" TEXT,
    "playerName" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "team" TEXT,
    "position" TEXT,
    "reportStatus" TEXT,
    "practiceStatus" TEXT,
    "primaryInjury" TEXT,
    "sourceId" TEXT NOT NULL DEFAULT 'nflverse',
    "rightsSnapshot" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "injuries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "depth_chart_entries" (
    "id" TEXT NOT NULL,
    "playerId" TEXT,
    "gsisId" TEXT,
    "playerName" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "team" TEXT,
    "position" TEXT,
    "depthRank" INTEGER,
    "role" TEXT,
    "sourceId" TEXT NOT NULL DEFAULT 'nflverse',
    "rightsSnapshot" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "depth_chart_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "historical_games" (
    "id" TEXT NOT NULL,
    "gameKey" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "gameType" TEXT NOT NULL DEFAULT 'REG',
    "awayTeam" TEXT NOT NULL,
    "homeTeam" TEXT NOT NULL,
    "awayScore" INTEGER,
    "homeScore" INTEGER,
    "result" DOUBLE PRECISION,
    "spreadLine" DOUBLE PRECISION,
    "totalLine" DOUBLE PRECISION,
    "awayMoneyline" INTEGER,
    "homeMoneyline" INTEGER,
    "sourceId" TEXT NOT NULL DEFAULT 'nflverse',
    "rightsSnapshot" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "historical_games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "team_game_efficiency" (
    "id" TEXT NOT NULL,
    "gameKey" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "seasonType" TEXT NOT NULL DEFAULT 'REG',
    "team" TEXT NOT NULL,
    "opponent" TEXT NOT NULL,
    "isHome" BOOLEAN NOT NULL,
    "plays" INTEGER NOT NULL,
    "offEpaPerPlay" DOUBLE PRECISION NOT NULL,
    "offSuccess" DOUBLE PRECISION NOT NULL,
    "defEpaPerPlay" DOUBLE PRECISION NOT NULL,
    "defSuccess" DOUBLE PRECISION NOT NULL,
    "sourceId" TEXT NOT NULL DEFAULT 'nflverse',
    "rightsSnapshot" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_game_efficiency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "player_rush_profiles" (
    "id" TEXT NOT NULL,
    "gsisId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "team" TEXT,
    "runs" INTEGER NOT NULL,
    "guardRuns" INTEGER NOT NULL DEFAULT 0,
    "tackleRuns" INTEGER NOT NULL DEFAULT 0,
    "endRuns" INTEGER NOT NULL DEFAULT 0,
    "leftRuns" INTEGER NOT NULL DEFAULT 0,
    "middleRuns" INTEGER NOT NULL DEFAULT 0,
    "rightRuns" INTEGER NOT NULL DEFAULT 0,
    "epaPerRun" DOUBLE PRECISION NOT NULL,
    "sourceId" TEXT NOT NULL DEFAULT 'nflverse',
    "rightsSnapshot" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_rush_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "next_gen_stats" (
    "id" TEXT NOT NULL,
    "gsisId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "position" TEXT,
    "season" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "seasonType" TEXT NOT NULL DEFAULT 'REG',
    "team" TEXT,
    "statType" TEXT NOT NULL,
    "avgTimeToThrow" DOUBLE PRECISION,
    "avgCompletedAirYards" DOUBLE PRECISION,
    "avgIntendedAirYards" DOUBLE PRECISION,
    "aggressiveness" DOUBLE PRECISION,
    "avgAirYardsToSticks" DOUBLE PRECISION,
    "completionPct" DOUBLE PRECISION,
    "expectedCompletionPct" DOUBLE PRECISION,
    "cpoe" DOUBLE PRECISION,
    "passerRating" DOUBLE PRECISION,
    "avgCushion" DOUBLE PRECISION,
    "avgSeparation" DOUBLE PRECISION,
    "pctShareIntendedAirYards" DOUBLE PRECISION,
    "catchPct" DOUBLE PRECISION,
    "avgYac" DOUBLE PRECISION,
    "avgExpectedYac" DOUBLE PRECISION,
    "avgYacAboveExpectation" DOUBLE PRECISION,
    "rushEfficiency" DOUBLE PRECISION,
    "pctAttemptsGte8Defenders" DOUBLE PRECISION,
    "avgTimeToLos" DOUBLE PRECISION,
    "expectedRushYards" DOUBLE PRECISION,
    "rushYardsOverExpected" DOUBLE PRECISION,
    "rushYardsOverExpectedPerAtt" DOUBLE PRECISION,
    "rushPctOverExpected" DOUBLE PRECISION,
    "sourceId" TEXT NOT NULL DEFAULT 'nflverse',
    "rightsSnapshot" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "next_gen_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "pfr_adv_stats" (
    "id" TEXT NOT NULL,
    "pfrPlayerId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "seasonType" TEXT NOT NULL DEFAULT 'REG',
    "team" TEXT,
    "opponent" TEXT,
    "gameKey" TEXT NOT NULL,
    "statType" TEXT NOT NULL,
    "timesSacked" INTEGER,
    "timesBlitzed" INTEGER,
    "timesHurried" INTEGER,
    "timesHit" INTEGER,
    "timesPressured" INTEGER,
    "timesPressuredPct" DOUBLE PRECISION,
    "passingBadThrows" INTEGER,
    "passingBadThrowPct" DOUBLE PRECISION,
    "passingDrops" INTEGER,
    "passingDropPct" DOUBLE PRECISION,
    "receivingBrokenTackles" INTEGER,
    "receivingDrop" INTEGER,
    "receivingDropPct" DOUBLE PRECISION,
    "receivingInt" INTEGER,
    "receivingRat" DOUBLE PRECISION,
    "carries" INTEGER,
    "rushingYardsBeforeContact" DOUBLE PRECISION,
    "rushingYardsBeforeContactAvg" DOUBLE PRECISION,
    "rushingYardsAfterContact" DOUBLE PRECISION,
    "rushingYardsAfterContactAvg" DOUBLE PRECISION,
    "rushingBrokenTackles" INTEGER,
    "sourceId" TEXT NOT NULL DEFAULT 'nflverse',
    "rightsSnapshot" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pfr_adv_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "team_week_stats" (
    "id" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "seasonType" TEXT NOT NULL DEFAULT 'REG',
    "team" TEXT NOT NULL,
    "opponent" TEXT,
    "completions" INTEGER,
    "attempts" INTEGER,
    "passYards" DOUBLE PRECISION,
    "passTds" INTEGER,
    "passInt" INTEGER,
    "sacksSuffered" INTEGER,
    "passAirYards" DOUBLE PRECISION,
    "passYac" DOUBLE PRECISION,
    "passFirstDowns" INTEGER,
    "passEpa" DOUBLE PRECISION,
    "passCpoe" DOUBLE PRECISION,
    "carries" INTEGER,
    "rushYards" DOUBLE PRECISION,
    "rushTds" INTEGER,
    "rushFirstDowns" INTEGER,
    "rushEpa" DOUBLE PRECISION,
    "receptions" INTEGER,
    "targets" INTEGER,
    "recYards" DOUBLE PRECISION,
    "recEpa" DOUBLE PRECISION,
    "defSacks" DOUBLE PRECISION,
    "defInterceptions" INTEGER,
    "defQbHits" INTEGER,
    "defTacklesForLoss" INTEGER,
    "defPassDefended" INTEGER,
    "defTds" INTEGER,
    "sourceId" TEXT NOT NULL DEFAULT 'nflverse',
    "rightsSnapshot" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_week_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "signals" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "valueRaw" DOUBLE PRECISION,
    "value" DOUBLE PRECISION NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "season" INTEGER NOT NULL DEFAULT 0,
    "week" INTEGER NOT NULL DEFAULT 0,
    "sourceId" TEXT NOT NULL DEFAULT 'nflverse',
    "rightsSnapshot" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ai_invocations" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "taskClass" TEXT NOT NULL,
    "surface" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "dataClass" TEXT NOT NULL,
    "costMode" TEXT NOT NULL,
    "envClass" TEXT NOT NULL,
    "envClassSource" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorSubjectId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "telemetryStatus" TEXT NOT NULL DEFAULT 'OK',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "requestFingerprint" TEXT NOT NULL,
    "executionOwnerToken" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "heartbeatAt" TIMESTAMP(3),
    "stealCount" INTEGER NOT NULL DEFAULT 0,
    "resultRef" TEXT,
    "resultHash" TEXT,
    "resultJson" JSONB,
    "blockedReasonCode" TEXT,
    "blockedDetail" TEXT,

    CONSTRAINT "ai_invocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ai_attempts" (
    "id" TEXT NOT NULL,
    "invocationId" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "providerRequested" TEXT NOT NULL,
    "providerUsed" TEXT,
    "providerAccount" TEXT,
    "region" TEXT,
    "modelRequested" TEXT NOT NULL,
    "modelResolved" TEXT,
    "substitutionId" TEXT,
    "providerRequestId" TEXT,
    "status" TEXT NOT NULL,
    "errorCode" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "cacheReadTokens" INTEGER,
    "cacheWriteTokens" INTEGER,
    "pricingVersion" TEXT,
    "requestFingerprint" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "attemptNonce" TEXT NOT NULL,
    "resultHash" TEXT,

    CONSTRAINT "ai_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ai_financial_attributions" (
    "id" TEXT NOT NULL,
    "invocationId" TEXT NOT NULL,
    "attemptId" TEXT,
    "estimatedGrossUsd" DECIMAL(12,6) NOT NULL,
    "fundingLabel" TEXT NOT NULL,
    "reconciledLabel" TEXT,
    "creditGrantSnapshotId" TEXT,
    "billedUsd" DECIMAL(12,6),
    "reconciledAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ai_financial_attributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ai_telemetry_recovery" (
    "id" TEXT NOT NULL,
    "invocationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 10,
    "leaseOwner" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "abandonedAt" TIMESTAMP(3),

    CONSTRAINT "ai_telemetry_recovery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ai_budget_windows" (
    "id" TEXT NOT NULL,
    "scopeKind" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'ACTIVE',
    "capUsd" DECIMAL(12,6) NOT NULL,
    "reservedUsd" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "provisionalUsd" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "confirmedBilledUsd" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "confirmedCreditUsd" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "releasedUsd" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "disputedUsd" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_budget_windows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ai_budget_reservations" (
    "id" TEXT NOT NULL,
    "invocationId" TEXT NOT NULL,
    "windowId" TEXT NOT NULL,
    "reservationVersion" INTEGER NOT NULL DEFAULT 1,
    "amountUsd" DECIMAL(12,6) NOT NULL,
    "state" TEXT NOT NULL,
    "provisionalUsd" DECIMAL(12,6),
    "confirmedUsd" DECIMAL(12,6),
    "confirmedKind" TEXT,
    "overage" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_budget_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "credit_grant_reservation_ledger" (
    "grantId" TEXT NOT NULL,
    "reservedMinorUnits" BIGINT NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_grant_reservation_ledger_pkey" PRIMARY KEY ("grantId")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "credit_grant_reservations" (
    "id" TEXT NOT NULL,
    "grantId" TEXT NOT NULL,
    "amountMinorUnits" BIGINT NOT NULL,
    "state" TEXT NOT NULL,
    "settledMinorUnits" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_grant_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "control_event_ledger" (
    "eventId" TEXT NOT NULL,
    "seq" BIGSERIAL NOT NULL,
    "source" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "control_event_ledger_pkey" PRIMARY KEY ("eventId")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "processed_event" (
    "eventId" TEXT NOT NULL,
    "sink" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_event_pkey" PRIMARY KEY ("eventId","sink")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "formal_incident" (
    "id" TEXT NOT NULL,
    "violationKind" TEXT NOT NULL,
    "abstractState" JSONB NOT NULL,
    "eventIds" JSONB NOT NULL,
    "srqcVersion" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewOutcome" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,

    CONSTRAINT "formal_incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "srqc_version" (
    "version" INTEGER NOT NULL,
    "indInvHash" TEXT NOT NULL,
    "refinementReceiptHash" TEXT,
    "status" TEXT NOT NULL,
    "activatedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "srqc_version_pkey" PRIMARY KEY ("version")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "srqc_shadow_metric" (
    "id" TEXT NOT NULL,
    "windowSince" TIMESTAMP(3) NOT NULL,
    "windowUntil" TIMESTAMP(3) NOT NULL,
    "eventsSeen" INTEGER NOT NULL,
    "ge2Count" INTEGER NOT NULL,
    "rejectedUnbound" INTEGER NOT NULL,
    "admitWouldRefuse" INTEGER NOT NULL,
    "srqcVersion" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "srqc_shadow_metric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "cti_candidate" (
    "id" TEXT NOT NULL,
    "before" JSONB NOT NULL,
    "action" TEXT NOT NULL,
    "after" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cti_candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ind_inv_proposal" (
    "id" TEXT NOT NULL,
    "ctiCandidateIds" TEXT[],
    "predicateKeys" TEXT[],
    "proposedPredicateText" TEXT NOT NULL,
    "skillKind" TEXT NOT NULL,
    "sourceWindowHash" TEXT NOT NULL,
    "activeVersionAtMint" INTEGER NOT NULL,
    "strength" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "support" INTEGER NOT NULL DEFAULT 0,
    "variance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'open',
    "acceptedSrqcVersion" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ind_inv_proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "agent_receipt" (
    "id" TEXT NOT NULL,
    "raw" JSONB NOT NULL,
    "decision" TEXT NOT NULL,
    "kid" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,
    "agentId" TEXT NOT NULL,
    "tool" TEXT NOT NULL,
    "argsDigest" TEXT NOT NULL,
    "reasons" JSONB NOT NULL,
    "receiptId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "revenue_event" (
    "id" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kind" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "userId" TEXT,
    "meta" JSONB,

    CONSTRAINT "revenue_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "product_activation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "surface" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "product_activation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "compliance_evidence" (
    "id" TEXT NOT NULL,
    "controlId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contentHash" TEXT NOT NULL,
    "uri" TEXT,
    "meta" JSONB,

    CONSTRAINT "compliance_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "compliance_check_run" (
    "id" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ok" BOOLEAN NOT NULL,
    "results" JSONB NOT NULL,

    CONSTRAINT "compliance_check_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "compliance_exception" (
    "id" TEXT NOT NULL,
    "controlId" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "compliance_exception_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "entities" (
    "id" TEXT NOT NULL,
    "entity_type" "EntityType" NOT NULL,
    "canonical_name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "sport" TEXT NOT NULL DEFAULT '',
    "external_ids" JSONB,
    "source_tier" INTEGER NOT NULL,
    "attributes" JSONB,
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "entity_edges" (
    "id" TEXT NOT NULL,
    "from_entity_id" TEXT NOT NULL,
    "to_entity_id" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "source_tier" INTEGER NOT NULL,
    "source_ref" TEXT,
    "observed_at" TIMESTAMP(3) NOT NULL,
    "valid_from" TIMESTAMP(3),
    "valid_to" TIMESTAMP(3),
    "confidence" INTEGER NOT NULL DEFAULT 50,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entity_edges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "_MemoryDecisionLink" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
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
CREATE UNIQUE INDEX IF NOT EXISTS "checkout_attempts_stripeIdempotencyKey_key" ON "checkout_attempts"("stripeIdempotencyKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "checkout_attempts_stripeSessionId_idx" ON "checkout_attempts"("stripeSessionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "checkout_attempts_userId_idx" ON "checkout_attempts"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "checkout_attempts_subjectUserId_idx" ON "checkout_attempts"("subjectUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "checkout_attempts_status_expiresAt_idx" ON "checkout_attempts"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "checkout_attempts_userId_activeClientIntentId_key" ON "checkout_attempts"("userId", "activeClientIntentId");

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
CREATE INDEX IF NOT EXISTS "odds_gameId_fetchedAt_idx" ON "odds"("gameId", "fetchedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "odds_line_snapshots_gameId_market_capturedAt_idx" ON "odds_line_snapshots"("gameId", "market", "capturedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "odds_line_snapshots_phase_capturedAt_idx" ON "odds_line_snapshots"("phase", "capturedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ingestion_runs_status_idx" ON "ingestion_runs"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ingestion_runs_startedAt_idx" ON "ingestion_runs"("startedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ingestion_runs_status_completedAt_idx" ON "ingestion_runs"("status", "completedAt");

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
CREATE INDEX IF NOT EXISTS "picks_clvVerdict_idx" ON "picks"("clvVerdict");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "picks_settledAt_idx" ON "picks"("settledAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "picks_gameId_pickType_key" ON "picks"("gameId", "pickType");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "pick_proof_receipts_pickId_key" ON "pick_proof_receipts"("pickId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pick_proof_receipts_contentHash_idx" ON "pick_proof_receipts"("contentHash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pick_proof_receipts_slateKey_idx" ON "pick_proof_receipts"("slateKey");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "slate_commitments_slateKey_key" ON "slate_commitments"("slateKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "slate_commitments_committedAt_idx" ON "slate_commitments"("committedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "gate_decisions_gameId_idx" ON "gate_decisions"("gameId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "gate_decisions_pickId_idx" ON "gate_decisions"("pickId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "gate_decisions_status_evaluatedAt_idx" ON "gate_decisions"("status", "evaluatedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "gate_decisions_isBootstrap_idx" ON "gate_decisions"("isBootstrap");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "loss_autopsies_pickId_key" ON "loss_autopsies"("pickId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "loss_autopsies_authoredAt_idx" ON "loss_autopsies"("authoredAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "loss_autopsies_status_idx" ON "loss_autopsies"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "loss_autopsies_rootCause_idx" ON "loss_autopsies"("rootCause");

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
CREATE INDEX IF NOT EXISTS "watchlist_entries_userId_idx" ON "watchlist_entries"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "watchlist_entries_userId_entityType_entityId_key" ON "watchlist_entries"("userId", "entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "push_subscriptions_userId_idx" ON "push_subscriptions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "settlement_runs_idempotencyKey_key" ON "settlement_runs"("idempotencyKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "settlement_runs_sport_scheduledWindow_idx" ON "settlement_runs"("sport", "scheduledWindow");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "settlement_observations_gameId_idx" ON "settlement_observations"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "settlement_observations_gameId_settlementRunId_payloadFinge_key" ON "settlement_observations"("gameId", "settlementRunId", "payloadFingerprint");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "settlement_anomalies_state_idx" ON "settlement_anomalies"("state");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "settlement_anomalies_gameId_anomalyType_key" ON "settlement_anomalies"("gameId", "anomalyType");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "owner_decision_requests_anomalyId_key" ON "owner_decision_requests"("anomalyId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "settlement_decision_events_anomalyId_createdAt_idx" ON "settlement_decision_events"("anomalyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "settlement_decisions_anomalyId_key" ON "settlement_decisions"("anomalyId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "pick_settlement_events_pickId_key" ON "pick_settlement_events"("pickId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pick_settlement_events_status_claimedAt_idx" ON "pick_settlement_events"("status", "claimedAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "pick_settlement_deliveries_idempotencyKey_key" ON "pick_settlement_deliveries"("idempotencyKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pick_settlement_deliveries_status_nextAttemptAt_idx" ON "pick_settlement_deliveries"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pick_settlement_deliveries_eventId_idx" ON "pick_settlement_deliveries"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "pick_settlement_deliveries_eventId_userId_channel_destinati_key" ON "pick_settlement_deliveries"("eventId", "userId", "channel", "destinationId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "outbox_dead_letter_receipts_deliveryId_key" ON "outbox_dead_letter_receipts"("deliveryId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "outbox_dead_letter_receipts_acknowledgedAt_createdAt_idx" ON "outbox_dead_letter_receipts"("acknowledgedAt", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "post_settlement_work_status_idx" ON "post_settlement_work"("status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "post_settlement_work_subjectId_kind_key" ON "post_settlement_work"("subjectId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "filter_state_snapshots_scope_key" ON "filter_state_snapshots"("scope");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "shadow_signals_settledAt_idx" ON "shadow_signals"("settledAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "shadow_signals_evaluatedAt_idx" ON "shadow_signals"("evaluatedAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "shadow_signals_gameId_modelVersion_key" ON "shadow_signals"("gameId", "modelVersion");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "performance_summaries_sport_idx" ON "performance_summaries"("sport");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "performance_summaries_sport_pickType_tier_modelVersion_peri_key" ON "performance_summaries"("sport", "pickType", "tier", "modelVersion", "period");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "jarvis_memory_events_memory_state_idx" ON "jarvis_memory_events"("memory_state");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "jarvis_memory_events_memory_type_idx" ON "jarvis_memory_events"("memory_type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "jarvis_memory_events_scope_idx" ON "jarvis_memory_events"("scope");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "jarvis_memory_events_created_at_idx" ON "jarvis_memory_events"("created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "jarvis_memory_events_scope_type_created_idx" ON "jarvis_memory_events"("scope", "memory_type", "created_at" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "jarvis_decisions_decision_date_idx" ON "jarvis_decisions"("decision_date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "jarvis_decisions_status_idx" ON "jarvis_decisions"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "agent_handoffs_source_seat_created_at_idx" ON "agent_handoffs"("source_seat", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "agent_handoffs_target_seat_created_at_idx" ON "agent_handoffs"("target_seat", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "agent_handoffs_status_idx" ON "agent_handoffs"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "agent_handoffs_created_at_idx" ON "agent_handoffs"("created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "subagent_runs_subagent_id_created_at_idx" ON "subagent_runs"("subagent_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "subagent_runs_parent_seat_created_at_idx" ON "subagent_runs"("parent_seat", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "subagent_runs_parent_review_status_idx" ON "subagent_runs"("parent_review_status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "subagent_runs_created_at_idx" ON "subagent_runs"("created_at");

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
CREATE INDEX IF NOT EXISTS "creator_assets_gameId_generatedAt_idx" ON "creator_assets"("gameId", "generatedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "creator_assets_pickId_idx" ON "creator_assets"("pickId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "creator_assets_templateKind_idx" ON "creator_assets"("templateKind");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "creator_assets_status_idx" ON "creator_assets"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "creator_assets_complianceStatus_idx" ON "creator_assets"("complianceStatus");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "model_journal_entries_slug_key" ON "model_journal_entries"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "model_journal_entries_status_idx" ON "model_journal_entries"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "model_journal_entries_publishedAt_idx" ON "model_journal_entries"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "model_journal_entries_isoYear_isoWeek_key" ON "model_journal_entries"("isoYear", "isoWeek");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "claude_api_call_records_observedAt_idx" ON "claude_api_call_records"("observedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "claude_api_call_records_surface_observedAt_idx" ON "claude_api_call_records"("surface", "observedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "claude_api_call_records_userId_idx" ON "claude_api_call_records"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "claude_api_call_records_gameId_idx" ON "claude_api_call_records"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "claude_api_budgets_surface_key" ON "claude_api_budgets"("surface");

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
CREATE UNIQUE INDEX IF NOT EXISTS "ladder_events_idempotencyKey_key" ON "ladder_events"("idempotencyKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ladder_events_type_idx" ON "ladder_events"("type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ladder_events_track_idx" ON "ladder_events"("track");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ladder_events_modelVersion_idx" ON "ladder_events"("modelVersion");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ladder_events_sourceEventId_idx" ON "ladder_events"("sourceEventId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ladder_events_occurredAt_idx" ON "ladder_events"("occurredAt");

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

-- CreateIndex
CREATE INDEX IF NOT EXISTS "actor_receipts_subjectId_observedAt_idx" ON "actor_receipts"("subjectId", "observedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "actor_receipts_createdAt_idx" ON "actor_receipts"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "rate_limit_counters_window_start_idx" ON "rate_limit_counters"("window_start");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "moderation_reports_targetUserId_idx" ON "moderation_reports"("targetUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "moderation_reports_status_createdAt_idx" ON "moderation_reports"("status", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "moderation_reports_surface_idx" ON "moderation_reports"("surface");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "moderation_reports_reason_idx" ON "moderation_reports"("reason");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "moderation_actions_targetUserId_createdAt_idx" ON "moderation_actions"("targetUserId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "moderation_actions_action_idx" ON "moderation_actions"("action");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "moderation_actions_reportId_idx" ON "moderation_actions"("reportId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "moderation_actions_expiresAt_idx" ON "moderation_actions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "moderation_appeals_actionId_key" ON "moderation_appeals"("actionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "moderation_appeals_status_slaDeadline_idx" ON "moderation_appeals"("status", "slaDeadline");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "moderation_appeals_appellantId_idx" ON "moderation_appeals"("appellantId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "players_gsisId_key" ON "players"("gsisId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "players_position_idx" ON "players"("position");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "players_recentTeam_idx" ON "players"("recentTeam");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "player_game_stats_season_week_idx" ON "player_game_stats"("season", "week");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "player_game_stats_playerId_idx" ON "player_game_stats"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "player_game_stats_playerId_season_week_seasonType_key" ON "player_game_stats"("playerId", "season", "week", "seasonType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "snap_counts_season_week_idx" ON "snap_counts"("season", "week");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "snap_counts_playerId_idx" ON "snap_counts"("playerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "injuries_season_week_idx" ON "injuries"("season", "week");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "injuries_playerId_idx" ON "injuries"("playerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "depth_chart_entries_season_week_team_idx" ON "depth_chart_entries"("season", "week", "team");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "depth_chart_entries_playerId_idx" ON "depth_chart_entries"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "historical_games_gameKey_key" ON "historical_games"("gameKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "historical_games_season_week_idx" ON "historical_games"("season", "week");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "historical_games_season_idx" ON "historical_games"("season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "team_game_efficiency_season_week_idx" ON "team_game_efficiency"("season", "week");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "team_game_efficiency_team_season_idx" ON "team_game_efficiency"("team", "season");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "team_game_efficiency_team_gameKey_key" ON "team_game_efficiency"("team", "gameKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "player_rush_profiles_season_idx" ON "player_rush_profiles"("season");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "player_rush_profiles_gsisId_season_key" ON "player_rush_profiles"("gsisId", "season");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "next_gen_stats_season_week_idx" ON "next_gen_stats"("season", "week");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "next_gen_stats_statType_season_idx" ON "next_gen_stats"("statType", "season");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "next_gen_stats_gsisId_season_week_seasonType_statType_key" ON "next_gen_stats"("gsisId", "season", "week", "seasonType", "statType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pfr_adv_stats_season_week_idx" ON "pfr_adv_stats"("season", "week");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pfr_adv_stats_statType_season_idx" ON "pfr_adv_stats"("statType", "season");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "pfr_adv_stats_pfrPlayerId_gameKey_statType_key" ON "pfr_adv_stats"("pfrPlayerId", "gameKey", "statType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "team_week_stats_season_week_idx" ON "team_week_stats"("season", "week");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "team_week_stats_team_season_week_seasonType_key" ON "team_week_stats"("team", "season", "week", "seasonType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "signals_entityType_entityId_idx" ON "signals"("entityType", "entityId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "signals_category_idx" ON "signals"("category");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "signals_entityType_entityId_key_season_week_key" ON "signals"("entityType", "entityId", "key", "season", "week");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_invocations_taskClass_createdAt_idx" ON "ai_invocations"("taskClass", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ai_invocations_requestId_taskClass_key" ON "ai_invocations"("requestId", "taskClass");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_attempts_invocationId_idx" ON "ai_attempts"("invocationId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ai_attempts_invocationId_ordinal_key" ON "ai_attempts"("invocationId", "ordinal");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_financial_attributions_invocationId_idx" ON "ai_financial_attributions"("invocationId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ai_financial_attributions_invocationId_version_key" ON "ai_financial_attributions"("invocationId", "version");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_telemetry_recovery_deliveredAt_leaseExpiresAt_idx" ON "ai_telemetry_recovery"("deliveredAt", "leaseExpiresAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_telemetry_recovery_invocationId_idx" ON "ai_telemetry_recovery"("invocationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_budget_reservations_invocationId_idx" ON "ai_budget_reservations"("invocationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_budget_reservations_windowId_idx" ON "ai_budget_reservations"("windowId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_budget_reservations_state_expiresAt_idx" ON "ai_budget_reservations"("state", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ai_budget_reservations_invocationId_windowId_reservationVer_key" ON "ai_budget_reservations"("invocationId", "windowId", "reservationVersion");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "credit_grant_reservations_grantId_idx" ON "credit_grant_reservations"("grantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "credit_grant_reservations_state_expiresAt_idx" ON "credit_grant_reservations"("state", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "control_event_ledger_seq_key" ON "control_event_ledger"("seq");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "control_event_ledger_source_sourceId_idx" ON "control_event_ledger"("source", "sourceId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "control_event_ledger_createdAt_idx" ON "control_event_ledger"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "formal_incident_status_createdAt_idx" ON "formal_incident"("status", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "formal_incident_reviewOutcome_idx" ON "formal_incident"("reviewOutcome");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "srqc_shadow_metric_windowSince_idx" ON "srqc_shadow_metric"("windowSince");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "cti_candidate_status_createdAt_idx" ON "cti_candidate"("status", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ind_inv_proposal_status_idx" ON "ind_inv_proposal"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ind_inv_proposal_activeVersionAtMint_idx" ON "ind_inv_proposal"("activeVersionAtMint");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ind_inv_proposal_sourceWindowHash_activeVersionAtMint_key" ON "ind_inv_proposal"("sourceWindowHash", "activeVersionAtMint");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "agent_receipt_receiptId_key" ON "agent_receipt"("receiptId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "agent_receipt_agentId_at_idx" ON "agent_receipt"("agentId", "at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "agent_receipt_tool_at_idx" ON "agent_receipt"("tool", "at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "revenue_event_at_kind_idx" ON "revenue_event"("at", "kind");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "product_activation_userId_day_surface_key" ON "product_activation"("userId", "day", "surface");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "compliance_evidence_controlId_collectedAt_idx" ON "compliance_evidence"("controlId", "collectedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "compliance_exception_status_controlId_idx" ON "compliance_exception"("status", "controlId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "entities_entity_type_idx" ON "entities"("entity_type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "entities_sport_idx" ON "entities"("sport");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "entities_last_seen_at_idx" ON "entities"("last_seen_at");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "entities_type_name_sport_key" ON "entities"("entity_type", "normalized_name", "sport");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "entity_edges_from_entity_id_relation_idx" ON "entity_edges"("from_entity_id", "relation");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "entity_edges_to_entity_id_relation_idx" ON "entity_edges"("to_entity_id", "relation");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "entity_edges_observed_at_idx" ON "entity_edges"("observed_at");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "entity_edges_unique_observation" ON "entity_edges"("from_entity_id", "relation", "to_entity_id", "observed_at");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "_MemoryDecisionLink_AB_unique" ON "_MemoryDecisionLink"("A", "B");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "_MemoryDecisionLink_B_index" ON "_MemoryDecisionLink"("B");

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "checkout_attempts" ADD CONSTRAINT "checkout_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "leagues" ADD CONSTRAINT "leagues_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "sports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "teams" ADD CONSTRAINT "teams_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "games" ADD CONSTRAINT "games_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "sports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "games" ADD CONSTRAINT "games_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "games" ADD CONSTRAINT "games_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "games" ADD CONSTRAINT "games_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "opening_lines" ADD CONSTRAINT "opening_lines_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "team_game_logs" ADD CONSTRAINT "team_game_logs_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "odds" ADD CONSTRAINT "odds_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "odds" ADD CONSTRAINT "odds_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "ingestion_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "odds_line_snapshots" ADD CONSTRAINT "odds_line_snapshots_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "picks" ADD CONSTRAINT "picks_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "pick_proof_receipts" ADD CONSTRAINT "pick_proof_receipts_pickId_fkey" FOREIGN KEY ("pickId") REFERENCES "picks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "pick_proof_receipts" ADD CONSTRAINT "pick_proof_receipts_slateKey_fkey" FOREIGN KEY ("slateKey") REFERENCES "slate_commitments"("slateKey") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "gate_decisions" ADD CONSTRAINT "gate_decisions_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "gate_decisions" ADD CONSTRAINT "gate_decisions_pickId_fkey" FOREIGN KEY ("pickId") REFERENCES "picks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "loss_autopsies" ADD CONSTRAINT "loss_autopsies_pickId_fkey" FOREIGN KEY ("pickId") REFERENCES "picks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "source_snapshots" ADD CONSTRAINT "source_snapshots_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "ingestion_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "game_signals" ADD CONSTRAINT "game_signals_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "pick_signal_snapshots" ADD CONSTRAINT "pick_signal_snapshots_pickId_fkey" FOREIGN KEY ("pickId") REFERENCES "picks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "pick_signal_snapshots" ADD CONSTRAINT "pick_signal_snapshots_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "watchlist_entries" ADD CONSTRAINT "watchlist_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "settlement_observations" ADD CONSTRAINT "settlement_observations_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "settlement_anomalies" ADD CONSTRAINT "settlement_anomalies_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "owner_decision_requests" ADD CONSTRAINT "owner_decision_requests_anomalyId_fkey" FOREIGN KEY ("anomalyId") REFERENCES "settlement_anomalies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "settlement_decision_events" ADD CONSTRAINT "settlement_decision_events_anomalyId_fkey" FOREIGN KEY ("anomalyId") REFERENCES "settlement_anomalies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "settlement_decisions" ADD CONSTRAINT "settlement_decisions_anomalyId_fkey" FOREIGN KEY ("anomalyId") REFERENCES "settlement_anomalies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "pick_settlement_events" ADD CONSTRAINT "pick_settlement_events_pickId_fkey" FOREIGN KEY ("pickId") REFERENCES "picks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "pick_settlement_events" ADD CONSTRAINT "pick_settlement_events_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "pick_settlement_deliveries" ADD CONSTRAINT "pick_settlement_deliveries_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "pick_settlement_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "outbox_dead_letter_receipts" ADD CONSTRAINT "outbox_dead_letter_receipts_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "pick_settlement_deliveries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "jarvis_memory_events" ADD CONSTRAINT "jarvis_memory_events_supersedes_memory_id_fkey" FOREIGN KEY ("supersedes_memory_id") REFERENCES "jarvis_memory_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "jarvis_memory_events" ADD CONSTRAINT "jarvis_memory_events_related_agent_run_id_fkey" FOREIGN KEY ("related_agent_run_id") REFERENCES "subagent_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "cockpit_decisions" ADD CONSTRAINT "cockpit_decisions_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "cockpit_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "creator_assets" ADD CONSTRAINT "creator_assets_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "creator_assets" ADD CONSTRAINT "creator_assets_pickId_fkey" FOREIGN KEY ("pickId") REFERENCES "picks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "claude_api_call_records" ADD CONSTRAINT "claude_api_call_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "claude_api_call_records" ADD CONSTRAINT "claude_api_call_records_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "daily_brief_sections" ADD CONSTRAINT "daily_brief_sections_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "daily_briefs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "daily_brief_items" ADD CONSTRAINT "daily_brief_items_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "daily_briefs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "content_sources" ADD CONSTRAINT "content_sources_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "content_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "content_reviews" ADD CONSTRAINT "content_reviews_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "content_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "moderation_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "moderation_appeals" ADD CONSTRAINT "moderation_appeals_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "moderation_actions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "player_game_stats" ADD CONSTRAINT "player_game_stats_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "snap_counts" ADD CONSTRAINT "snap_counts_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "injuries" ADD CONSTRAINT "injuries_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "depth_chart_entries" ADD CONSTRAINT "depth_chart_entries_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "ai_attempts" ADD CONSTRAINT "ai_attempts_invocationId_fkey" FOREIGN KEY ("invocationId") REFERENCES "ai_invocations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "ai_financial_attributions" ADD CONSTRAINT "ai_financial_attributions_invocationId_fkey" FOREIGN KEY ("invocationId") REFERENCES "ai_invocations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "ai_financial_attributions" ADD CONSTRAINT "ai_financial_attributions_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ai_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "ai_telemetry_recovery" ADD CONSTRAINT "ai_telemetry_recovery_invocationId_fkey" FOREIGN KEY ("invocationId") REFERENCES "ai_invocations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "ai_budget_reservations" ADD CONSTRAINT "ai_budget_reservations_windowId_fkey" FOREIGN KEY ("windowId") REFERENCES "ai_budget_windows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "ai_budget_reservations" ADD CONSTRAINT "ai_budget_reservations_invocationId_fkey" FOREIGN KEY ("invocationId") REFERENCES "ai_invocations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "credit_grant_reservations" ADD CONSTRAINT "credit_grant_reservations_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "credit_grant_reservation_ledger"("grantId") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "processed_event" ADD CONSTRAINT "processed_event_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "control_event_ledger"("eventId") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "entity_edges" ADD CONSTRAINT "entity_edges_from_entity_id_fkey" FOREIGN KEY ("from_entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "entity_edges" ADD CONSTRAINT "entity_edges_to_entity_id_fkey" FOREIGN KEY ("to_entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "_MemoryDecisionLink" ADD CONSTRAINT "_MemoryDecisionLink_A_fkey" FOREIGN KEY ("A") REFERENCES "jarvis_decisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "_MemoryDecisionLink" ADD CONSTRAINT "_MemoryDecisionLink_B_fkey" FOREIGN KEY ("B") REFERENCES "jarvis_memory_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;



-- ---------------------------------------------------------------------------
-- Hand-written objects carried over from the pre-baseline migration history.
-- Prisma does not model CHECK constraints or seed rows, so they are restated here
-- (guarded by pg_constraint / ON CONFLICT) to keep a fresh database identical to
-- production. Source migration named on each block.
-- ---------------------------------------------------------------------------

-- CHECK from 20260717120000_add_watchlist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'watchlist_entries_entityType_check') THEN
    ALTER TABLE "watchlist_entries" ADD CONSTRAINT "watchlist_entries_entityType_check" CHECK ("entityType" IN ('TEAM', 'PLAYER'));
  END IF;
END $$;

-- CHECK from 20260722130000_add_checkout_attempt
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'checkout_attempts_active_key_matches_origin_chk') THEN
    ALTER TABLE "checkout_attempts" ADD CONSTRAINT "checkout_attempts_active_key_matches_origin_chk" CHECK ("activeClientIntentId" IS NULL OR "activeClientIntentId" = "originalClientIntentId");
  END IF;
END $$;

-- CHECK from 20260722130000_add_checkout_attempt
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'checkout_attempts_terminal_key_released_chk') THEN
    ALTER TABLE "checkout_attempts" ADD CONSTRAINT "checkout_attempts_terminal_key_released_chk" CHECK ("status" NOT IN ('FAILED', 'EXPIRED', 'CANCELED') OR "activeClientIntentId" IS NULL);
  END IF;
END $$;

-- CHECK from 20260722130000_add_checkout_attempt
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'checkout_attempts_completed_at_chk') THEN
    ALTER TABLE "checkout_attempts" ADD CONSTRAINT "checkout_attempts_completed_at_chk" CHECK ("status" <> 'COMPLETED' OR "completedAt" IS NOT NULL);
  END IF;
END $$;

-- CHECK from 20260722130000_add_checkout_attempt
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'checkout_attempts_quantity_positive_chk') THEN
    ALTER TABLE "checkout_attempts" ADD CONSTRAINT "checkout_attempts_quantity_positive_chk" CHECK ("quantity" > 0);
  END IF;
END $$;

-- CHECK from 20260722130000_add_checkout_attempt
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'checkout_attempts_currency_lowercase_chk') THEN
    ALTER TABLE "checkout_attempts" ADD CONSTRAINT "checkout_attempts_currency_lowercase_chk" CHECK ("currency" = lower("currency"));
  END IF;
END $$;

-- CHECK from 20260722140000_add_ai_control_plane_ledger
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_invocations_status_check') THEN
    ALTER TABLE "ai_invocations" ADD CONSTRAINT "ai_invocations_status_check" CHECK ("status" IN ('RUNNING', 'SUCCEEDED', 'FAILED', 'AMBIGUOUS', 'POLICY_BLOCKED', 'BUDGET_BLOCKED', 'BLOCKED'));
  END IF;
END $$;

-- CHECK from 20260722140000_add_ai_control_plane_ledger
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_invocations_telemetryStatus_check') THEN
    ALTER TABLE "ai_invocations" ADD CONSTRAINT "ai_invocations_telemetryStatus_check" CHECK ("telemetryStatus" IN ('OK', 'DEGRADED'));
  END IF;
END $$;

-- CHECK from 20260722140000_add_ai_control_plane_ledger
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_invocations_envClassSource_check') THEN
    ALTER TABLE "ai_invocations" ADD CONSTRAINT "ai_invocations_envClassSource_check" CHECK ("envClassSource" IN ('explicit', 'derived', 'UNRESOLVED'));
  END IF;
END $$;

-- CHECK from 20260722140000_add_ai_control_plane_ledger
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_invocations_blocked_nondispatchable_check') THEN
    ALTER TABLE "ai_invocations" ADD CONSTRAINT "ai_invocations_blocked_nondispatchable_check" CHECK ("status" <> 'BLOCKED' OR ("executionOwnerToken" IS NULL AND "leaseExpiresAt" IS NULL));
  END IF;
END $$;

-- CHECK from 20260722140000_add_ai_control_plane_ledger
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_invocations_blocked_reason_check') THEN
    ALTER TABLE "ai_invocations" ADD CONSTRAINT "ai_invocations_blocked_reason_check" CHECK ("status" <> 'BLOCKED' OR "blockedReasonCode" IS NOT NULL);
  END IF;
END $$;

-- CHECK from 20260722140000_add_ai_control_plane_ledger
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_attempts_status_check') THEN
    ALTER TABLE "ai_attempts" ADD CONSTRAINT "ai_attempts_status_check" CHECK ("status" IN ('DISPATCHED', 'SUCCEEDED', 'FAILED', 'TIMEOUT', 'AMBIGUOUS'));
  END IF;
END $$;

-- CHECK from 20260722140000_add_ai_control_plane_ledger
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_financial_attributions_fundingLabel_check') THEN
    ALTER TABLE "ai_financial_attributions" ADD CONSTRAINT "ai_financial_attributions_fundingLabel_check" CHECK ("fundingLabel" IN ('CASH_EXPECTED', 'CREDIT_ELIGIBLE_UNCONFIRMED', 'CREDIT_EXPECTED_FROM_ACTIVE_GRANT', 'LOCAL_RESOURCE', 'EXTERNAL_FREE_ALLOWANCE_UNCONFIRMED', 'BLOCKED'));
  END IF;
END $$;

-- CHECK from 20260722140000_add_ai_control_plane_ledger
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_financial_attributions_reconciledLabel_check') THEN
    ALTER TABLE "ai_financial_attributions" ADD CONSTRAINT "ai_financial_attributions_reconciledLabel_check" CHECK ("reconciledLabel" IS NULL OR "reconciledLabel" IN ('CREDIT_APPLIED_CONFIRMED', 'CASH_CHARGED_CONFIRMED', 'NO_VENDOR_CHARGE_CONFIRMED', 'UNRECONCILED'));
  END IF;
END $$;

-- CHECK from 20260722140000_add_ai_control_plane_ledger
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_financial_attributions_confirmed_requires_reconciledAt_check') THEN
    ALTER TABLE "ai_financial_attributions" ADD CONSTRAINT "ai_financial_attributions_confirmed_requires_reconciledAt_check" CHECK (("reconciledLabel" IS NULL AND "billedUsd" IS NULL) OR "reconciledAt" IS NOT NULL);
  END IF;
END $$;

-- CHECK from 20260722140000_add_ai_control_plane_ledger
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_financial_attributions_billed_nonnegative_check') THEN
    ALTER TABLE "ai_financial_attributions" ADD CONSTRAINT "ai_financial_attributions_billed_nonnegative_check" CHECK ("billedUsd" IS NULL OR "billedUsd" >= 0);
  END IF;
END $$;

-- CHECK from 20260722140000_add_ai_control_plane_ledger
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_financial_attributions_estimate_nonnegative_check') THEN
    ALTER TABLE "ai_financial_attributions" ADD CONSTRAINT "ai_financial_attributions_estimate_nonnegative_check" CHECK ("estimatedGrossUsd" >= 0);
  END IF;
END $$;

-- CHECK from 20260722140000_add_ai_control_plane_ledger
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_financial_attributions_credit_requires_grant_check') THEN
    ALTER TABLE "ai_financial_attributions" ADD CONSTRAINT "ai_financial_attributions_credit_requires_grant_check" CHECK ("reconciledLabel" IS DISTINCT FROM 'CREDIT_APPLIED_CONFIRMED' OR "creditGrantSnapshotId" IS NOT NULL);
  END IF;
END $$;

-- CHECK from 20260722140000_add_ai_control_plane_ledger
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_financial_attributions_version_positive_check') THEN
    ALTER TABLE "ai_financial_attributions" ADD CONSTRAINT "ai_financial_attributions_version_positive_check" CHECK ("version" >= 1);
  END IF;
END $$;

-- CHECK from 20260722140000_add_ai_control_plane_ledger
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_telemetry_recovery_kind_check') THEN
    ALTER TABLE "ai_telemetry_recovery" ADD CONSTRAINT "ai_telemetry_recovery_kind_check" CHECK ("kind" IN ('FINALIZE_SUCCESS', 'FINALIZE_AMBIGUOUS', 'FINALIZE_FAILURE', 'ATTEMPT_TELEMETRY'));
  END IF;
END $$;

-- CHECK from 20260722150001_add_ai_budget_reservations
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_budget_windows_scopeKind_check') THEN
    ALTER TABLE "ai_budget_windows" ADD CONSTRAINT "ai_budget_windows_scopeKind_check" CHECK ("scopeKind" IN ('REQUEST', 'DAILY', 'MONTHLY', 'SURFACE', 'PROVIDER_ACCOUNT', 'ENTITY', 'EMERGENCY_OVERRIDE'));
  END IF;
END $$;

-- CHECK from 20260722150001_add_ai_budget_reservations
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_budget_windows_state_check') THEN
    ALTER TABLE "ai_budget_windows" ADD CONSTRAINT "ai_budget_windows_state_check" CHECK ("state" IN ('ACTIVE', 'OVERAGE_LOCKED'));
  END IF;
END $$;

-- CHECK from 20260722150001_add_ai_budget_reservations
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_budget_windows_nonneg_check') THEN
    ALTER TABLE "ai_budget_windows" ADD CONSTRAINT "ai_budget_windows_nonneg_check" CHECK ("capUsd" >= 0 AND "reservedUsd" >= 0 AND "provisionalUsd" >= 0
         AND "confirmedBilledUsd" >= 0 AND "confirmedCreditUsd" >= 0
         AND "releasedUsd" >= 0 AND "disputedUsd" >= 0);
  END IF;
END $$;

-- CHECK from 20260722150001_add_ai_budget_reservations
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_budget_windows_cap_check') THEN
    ALTER TABLE "ai_budget_windows" ADD CONSTRAINT "ai_budget_windows_cap_check" CHECK ("reservedUsd" + "provisionalUsd" + "confirmedBilledUsd" <= "capUsd"
             OR "state" = 'OVERAGE_LOCKED');
  END IF;
END $$;

-- CHECK from 20260722150001_add_ai_budget_reservations
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_budget_reservations_state_check') THEN
    ALTER TABLE "ai_budget_reservations" ADD CONSTRAINT "ai_budget_reservations_state_check" CHECK ("state" IN ('HELD', 'PROVISIONALLY_SETTLED', 'RECONCILIATION_HOLD', 'CONFIRMED_SETTLED', 'RELEASED', 'EXPIRED'));
  END IF;
END $$;

-- CHECK from 20260722150001_add_ai_budget_reservations
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_budget_reservations_nonneg_check') THEN
    ALTER TABLE "ai_budget_reservations" ADD CONSTRAINT "ai_budget_reservations_nonneg_check" CHECK ("amountUsd" >= 0
         AND ("provisionalUsd" IS NULL OR "provisionalUsd" >= 0)
         AND ("confirmedUsd" IS NULL OR "confirmedUsd" >= 0));
  END IF;
END $$;

-- CHECK from 20260722150001_add_ai_budget_reservations
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_budget_reservations_version_check') THEN
    ALTER TABLE "ai_budget_reservations" ADD CONSTRAINT "ai_budget_reservations_version_check" CHECK ("reservationVersion" >= 1);
  END IF;
END $$;

-- CHECK from 20260722150001_add_ai_budget_reservations
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_budget_reservations_confirmed_state_check') THEN
    ALTER TABLE "ai_budget_reservations" ADD CONSTRAINT "ai_budget_reservations_confirmed_state_check" CHECK (("state" = 'CONFIRMED_SETTLED') = ("confirmedUsd" IS NOT NULL));
  END IF;
END $$;

-- CHECK from 20260722150001_add_ai_budget_reservations
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_budget_reservations_confirmed_kind_check') THEN
    ALTER TABLE "ai_budget_reservations" ADD CONSTRAINT "ai_budget_reservations_confirmed_kind_check" CHECK (("confirmedUsd" IS NULL) = ("confirmedKind" IS NULL));
  END IF;
END $$;

-- CHECK from 20260722150001_add_ai_budget_reservations
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_budget_reservations_confirmed_kind_enum_check') THEN
    ALTER TABLE "ai_budget_reservations" ADD CONSTRAINT "ai_budget_reservations_confirmed_kind_enum_check" CHECK ("confirmedKind" IS NULL OR "confirmedKind" IN ('BILLED', 'CREDIT'));
  END IF;
END $$;

-- CHECK from 20260722150001_add_ai_budget_reservations
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_budget_reservations_provisional_state_check') THEN
    ALTER TABLE "ai_budget_reservations" ADD CONSTRAINT "ai_budget_reservations_provisional_state_check" CHECK (("provisionalUsd" IS NULL OR "state" IN ('PROVISIONALLY_SETTLED', 'CONFIRMED_SETTLED'))
       AND ("state" <> 'PROVISIONALLY_SETTLED' OR "provisionalUsd" IS NOT NULL));
  END IF;
END $$;

-- CHECK from 20260722160000_add_credit_grant_authorization
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'credit_grant_reservation_ledger_nonnegative_check') THEN
    ALTER TABLE "credit_grant_reservation_ledger" ADD CONSTRAINT "credit_grant_reservation_ledger_nonnegative_check" CHECK ("reservedMinorUnits" >= 0);
  END IF;
END $$;

-- CHECK from 20260722160000_add_credit_grant_authorization
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'credit_grant_reservations_state_check') THEN
    ALTER TABLE "credit_grant_reservations" ADD CONSTRAINT "credit_grant_reservations_state_check" CHECK ("state" IN ('HELD', 'SETTLED', 'RELEASED', 'EXPIRED'));
  END IF;
END $$;

-- CHECK from 20260722160000_add_credit_grant_authorization
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'credit_grant_reservations_amount_nonnegative_check') THEN
    ALTER TABLE "credit_grant_reservations" ADD CONSTRAINT "credit_grant_reservations_amount_nonnegative_check" CHECK ("amountMinorUnits" >= 0);
  END IF;
END $$;

-- CHECK from 20260722160000_add_credit_grant_authorization
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'credit_grant_reservations_settled_nonnegative_check') THEN
    ALTER TABLE "credit_grant_reservations" ADD CONSTRAINT "credit_grant_reservations_settled_nonnegative_check" CHECK ("settledMinorUnits" IS NULL OR "settledMinorUnits" >= 0);
  END IF;
END $$;

-- Seed rows are defaults for an EMPTY database only. On a database that already
-- carries claude_api_budgets (production, built with db push before this baseline
-- existed) the operator may have tuned monthlyBudgetUsd / alertThresholds; the
-- replay must never overwrite live spending controls, so every seed below is
-- ON CONFLICT DO NOTHING (changed from DO UPDATE on 2026-09-02, before the
-- baseline was ever applied outside CI and disposable test clusters).
-- Seed from 20260523031000_seed_claude_api_budgets
INSERT INTO "claude_api_budgets" (
  "id",
  "surface",
  "monthlyBudgetUsd",
  "alertThresholds",
  "overrideActive",
  "createdAt",
  "updatedAt"
) VALUES
  (
    'claude-budget-blog-generation',
    'BLOG_GENERATION',
    50.00,
    '{"yellow":0.5,"orange":0.8,"red":1,"hardCap":1.5}'::jsonb,
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'claude-budget-studio-generation',
    'STUDIO_GENERATION',
    500.00,
    '{"yellow":0.5,"orange":0.8,"red":1,"hardCap":1.5}'::jsonb,
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'claude-budget-model-journal-draft',
    'MODEL_JOURNAL_DRAFT',
    50.00,
    '{"yellow":0.5,"orange":0.8,"red":1,"hardCap":1.5}'::jsonb,
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'claude-budget-model-court-answer',
    'MODEL_COURT_ANSWER',
    2000.00,
    '{"yellow":0.5,"orange":0.8,"red":1,"hardCap":1.5}'::jsonb,
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'claude-budget-calibration-weekly-insight',
    'CALIBRATION_WEEKLY_INSIGHT',
    50.00,
    '{"yellow":0.5,"orange":0.8,"red":1,"hardCap":1.5}'::jsonb,
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'claude-budget-pre-mortem-summary',
    'PRE_MORTEM_SUMMARY',
    0.00,
    '{"yellow":0.5,"orange":0.8,"red":1,"hardCap":1.5}'::jsonb,
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'claude-budget-other',
    'OTHER',
    100.00,
    '{"yellow":0.5,"orange":0.8,"red":1,"hardCap":1.5}'::jsonb,
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("surface") DO NOTHING;

-- Seed from 20260603130000_seed_pick_explanation_budget
INSERT INTO "claude_api_budgets" (
  "id",
  "surface",
  "monthlyBudgetUsd",
  "alertThresholds",
  "overrideActive",
  "createdAt",
  "updatedAt"
) VALUES
  (
    'claude-budget-pick-explanation',
    'PICK_EXPLANATION',
    200.00,
    '{"yellow":0.5,"orange":0.8,"red":1,"hardCap":1.5}'::jsonb,
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("surface") DO NOTHING;

-- Seed from 20260603140000_seed_loss_autopsy_draft_budget
INSERT INTO "claude_api_budgets" (
  "id",
  "surface",
  "monthlyBudgetUsd",
  "alertThresholds",
  "overrideActive",
  "createdAt",
  "updatedAt"
) VALUES
  (
    'claude-budget-loss-autopsy-draft',
    'LOSS_AUTOPSY_DRAFT',
    50.00,
    '{"yellow":0.5,"orange":0.8,"red":1,"hardCap":1.5}'::jsonb,
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("surface") DO NOTHING;

