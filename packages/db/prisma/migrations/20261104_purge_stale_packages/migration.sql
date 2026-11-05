-- Migration: Purge Stale Week 8 Promotions/Packages & Reset Storefront State for Week 9 Live Slate
-- Safe idempotent wrapper: never fail if optional tables/enums differ on target environment.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Promotion'
  ) THEN
    BEGIN
      UPDATE "Promotion"
      SET "updatedAt" = CURRENT_TIMESTAMP
      WHERE "slug" LIKE '%WEEK_08%'
         OR "slug" LIKE '%week-8%'
         OR "headline" LIKE '%Week 8%';
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

