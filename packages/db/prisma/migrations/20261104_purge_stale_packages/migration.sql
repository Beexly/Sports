-- Migration: Purge Stale Week 8 Promotions/Packages & Reset Storefront State for Week 9 Live Slate
-- Target Schema: packages/db/prisma/schema.prisma ("Promotion" / "cockpit_tasks")

BEGIN;

-- 1. Locate and archive obsolete Week 8 commercial promotions/packages safely
UPDATE "Promotion"
SET
    "status" = 'ARCHIVED',
    "offerSummary" = 'Archived historical Week 8 package - shifted cleanly to upcoming active Week 9 slate.',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" LIKE '%WEEK_08%'
   OR "slug" LIKE '%week-8%'
   OR "headline" LIKE '%Week 8%';

-- 2. Clear out hardcoded stale Week 8 tasks from the Jarvis Launch Cockpit log
UPDATE "cockpit_tasks"
SET
    "status" = 'ARCHIVED',
    "decisionNotes" = 'Purged automatically via database migration layer execution script (WEEK_09_LIVE).',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "title" LIKE '%Week 8%';

COMMIT;
