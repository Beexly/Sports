-- Competitive intel: rival harvest tables, provenance-first.
-- Every table carries source_url, retrieved_at, harvest_tier, license_class, commercial_ok,
-- content_hash. prospect_contacts and rival_deltas are derived and carry the columns that
-- matter for their own lineage instead (source_url on contacts, none on deltas).

CREATE TABLE "rival_orgs" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "legalEntity" TEXT,
  "jurisdiction" TEXT,
  "tier" TEXT NOT NULL,
  "valueScore" INTEGER NOT NULL DEFAULT 0,
  "weaknessScore" INTEGER NOT NULL DEFAULT 0,
  "verdict" TEXT NOT NULL DEFAULT 'queued',
  "notes" TEXT,
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rival_orgs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "rival_orgs_slug_key" ON "rival_orgs"("slug");
CREATE INDEX "rival_orgs_tier_verdict_idx" ON "rival_orgs"("tier", "verdict");

CREATE TABLE "rival_assets" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "assetType" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "httpStatus" INTEGER,
  "byteSize" INTEGER,
  "sourceUrl" TEXT NOT NULL,
  "retrievedAt" TIMESTAMP(3) NOT NULL,
  "harvestTier" INTEGER NOT NULL,
  "licenseClass" TEXT NOT NULL,
  "commercialOk" BOOLEAN NOT NULL DEFAULT false,
  "contentHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rival_assets_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "rival_assets_orgId_url_contentHash_key" ON "rival_assets"("orgId", "url", "contentHash");
CREATE INDEX "rival_assets_orgId_assetType_idx" ON "rival_assets"("orgId", "assetType");

CREATE TABLE "rival_picks" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "gameKey" TEXT NOT NULL,
  "market" TEXT NOT NULL,
  "side" TEXT,
  "line" DOUBLE PRECISION,
  "priceAmerican" INTEGER,
  "stakeUnits" DOUBLE PRECISION,
  "signalFamily" TEXT NOT NULL,
  "postedAt" TIMESTAMP(3) NOT NULL,
  "settledAt" TIMESTAMP(3),
  "result" TEXT,
  "clv" DOUBLE PRECISION,
  "sourceUrl" TEXT NOT NULL,
  "retrievedAt" TIMESTAMP(3) NOT NULL,
  "harvestTier" INTEGER NOT NULL,
  "licenseClass" TEXT NOT NULL,
  "commercialOk" BOOLEAN NOT NULL DEFAULT false,
  "contentHash" TEXT NOT NULL,
  CONSTRAINT "rival_picks_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "rival_picks_orgId_gameKey_market_postedAt_key" ON "rival_picks"("orgId", "gameKey", "market", "postedAt");
CREATE INDEX "rival_picks_gameKey_market_idx" ON "rival_picks"("gameKey", "market");
CREATE INDEX "rival_picks_orgId_postedAt_idx" ON "rival_picks"("orgId", "postedAt");

CREATE TABLE "rival_projections" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "gameKey" TEXT NOT NULL,
  "playerId" TEXT,
  "statType" TEXT NOT NULL,
  "projectedValue" DOUBLE PRECISION NOT NULL,
  "modelVersion" TEXT,
  "isWasmDerived" BOOLEAN NOT NULL DEFAULT false,
  "sourceUrl" TEXT NOT NULL,
  "retrievedAt" TIMESTAMP(3) NOT NULL,
  "harvestTier" INTEGER NOT NULL,
  "licenseClass" TEXT NOT NULL,
  "commercialOk" BOOLEAN NOT NULL DEFAULT false,
  "contentHash" TEXT NOT NULL,
  CONSTRAINT "rival_projections_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "rival_projections_orgId_gameKey_playerId_statType_contentHash_key" ON "rival_projections"("orgId", "gameKey", "playerId", "statType", "contentHash");
CREATE INDEX "rival_projections_gameKey_statType_idx" ON "rival_projections"("gameKey", "statType");

CREATE TABLE "rival_promotions" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "sportsbook" TEXT NOT NULL,
  "offerText" TEXT NOT NULL,
  "termsUrl" TEXT,
  "disclosure" TEXT,
  "eligibleStates" TEXT[],
  "complianceStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "publishApproved" BOOLEAN NOT NULL DEFAULT false,
  "sourceUrl" TEXT NOT NULL,
  "retrievedAt" TIMESTAMP(3) NOT NULL,
  "harvestTier" INTEGER NOT NULL,
  "licenseClass" TEXT NOT NULL,
  "commercialOk" BOOLEAN NOT NULL DEFAULT false,
  "contentHash" TEXT NOT NULL,
  CONSTRAINT "rival_promotions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "rival_promotions_orgId_sportsbook_contentHash_key" ON "rival_promotions"("orgId", "sportsbook", "contentHash");
CREATE INDEX "rival_promotions_orgId_complianceStatus_idx" ON "rival_promotions"("orgId", "complianceStatus");

CREATE TABLE "prospect_contacts" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "emailHash" TEXT NOT NULL,
  "email" TEXT,
  "handle" TEXT,
  "platform" TEXT,
  "segment" TEXT NOT NULL,
  "confidence" INTEGER NOT NULL DEFAULT 50,
  "sourceUrl" TEXT NOT NULL,
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "prospect_contacts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "prospect_contacts_orgId_emailHash_key" ON "prospect_contacts"("orgId", "emailHash");
CREATE INDEX "prospect_contacts_orgId_segment_idx" ON "prospect_contacts"("orgId", "segment");
CREATE INDEX "prospect_contacts_platform_idx" ON "prospect_contacts"("platform");

CREATE TABLE "paywall_recipes" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "targetUrl" TEXT NOT NULL,
  "technique" INTEGER NOT NULL,
  "curlRepro" TEXT NOT NULL,
  "responseHash" TEXT NOT NULL,
  "worksAsOf" TIMESTAMP(3) NOT NULL,
  "stillWorks" BOOLEAN NOT NULL DEFAULT true,
  "sourceUrl" TEXT NOT NULL,
  "retrievedAt" TIMESTAMP(3) NOT NULL,
  "harvestTier" INTEGER NOT NULL,
  "licenseClass" TEXT NOT NULL,
  "commercialOk" BOOLEAN NOT NULL DEFAULT false,
  "contentHash" TEXT NOT NULL,
  CONSTRAINT "paywall_recipes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "paywall_recipes_orgId_targetUrl_technique_responseHash_key" ON "paywall_recipes"("orgId", "targetUrl", "technique", "responseHash");
CREATE INDEX "paywall_recipes_orgId_stillWorks_idx" ON "paywall_recipes"("orgId", "stillWorks");

CREATE TABLE "rival_deltas" (
  "id" TEXT NOT NULL,
  "gameKey" TEXT NOT NULL,
  "market" TEXT NOT NULL,
  "ownPickId" TEXT,
  "rivalPickId" TEXT,
  "edgeDelta" DOUBLE PRECISION,
  "clvDelta" DOUBLE PRECISION,
  "divergenceClass" TEXT NOT NULL,
  "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rival_deltas_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "rival_deltas_gameKey_market_ownPickId_rivalPickId_key" ON "rival_deltas"("gameKey", "market", "ownPickId", "rivalPickId");
CREATE INDEX "rival_deltas_divergenceClass_computedAt_idx" ON "rival_deltas"("divergenceClass", "computedAt");

ALTER TABLE "rival_assets" ADD CONSTRAINT "rival_assets_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "rival_orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rival_picks" ADD CONSTRAINT "rival_picks_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "rival_orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rival_projections" ADD CONSTRAINT "rival_projections_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "rival_orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rival_promotions" ADD CONSTRAINT "rival_promotions_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "rival_orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "prospect_contacts" ADD CONSTRAINT "prospect_contacts_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "rival_orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "paywall_recipes" ADD CONSTRAINT "paywall_recipes_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "rival_orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rival_deltas" ADD CONSTRAINT "rival_deltas_rivalPickId_fkey" FOREIGN KEY ("rivalPickId") REFERENCES "rival_picks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
