-- WP-2 (2026-11-13): live literature view for the four-stage cognitive router.
--
-- The router's routeFullFourStage reads lit.v_class_a_literature_premises.
-- The view did not exist on branch main (the 1,098 trust-tiered premises live
-- in lit.premise, one embedding each in lit.premise_vector). This migration
-- creates it, mirroring the column contract of public.v_class_a_literature_premises.
--
-- context_mask is NULL by design: lit.premise carries no measured 288-bit
-- context mask, and a mask is never fabricated. Stage A requires mask overlap,
-- so unmasked premises do not fire until masks are measured (WP-1 literature).
-- Trust tiers flow through verification_tier; the router weights them
-- CITABLE_VERIFIED / MSVH_S1_EXACT = 1.0, COMPUTED = 0.5, RESEARCH_HYPOTHESIS = 0.0.

CREATE OR REPLACE VIEW lit.v_class_a_literature_premises AS
SELECT
  p.id::text AS id,
  CASE
    WHEN p.principle IS NOT NULL AND p.principle <> ''
      THEN p.title || ': ' || p.principle
    ELSE p.title
  END AS premise,
  p.domain AS cluster,
  NULL::integer[] AS context_mask,
  pv.embedding AS embedding,
  p.record_class,
  p.citable,
  p.verification_tier,
  p.status,
  p.created_at
FROM lit.premise p
LEFT JOIN lit.premise_vector pv ON pv.premise_id = p.id
WHERE p.status = 'ACTIVE';