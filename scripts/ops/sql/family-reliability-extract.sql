-- Extract settled, non-bootstrap pick observations for the family-reliability
-- harness.
--
-- Read-only. One row per settled WIN/LOSS pick. VOID and PUSH are excluded
-- upstream: a VOID settles no side, and a PUSH returns the stake, so neither
-- carries a Bernoulli outcome to calibrate against.
--
-- `true_prob` is `factorBreakdown->'independentEdge'->>'trueProb'`, the only
-- probability in the record that is independent of the market it is scored
-- against. It is NULL where the writer did not produce one — which is the
-- whole TOTAL population — and the harness is built to report that as missing
-- data rather than substitute a number.
--
-- `families` is the array of signal families whose mint-time flag was true.
-- `hadOddsSignal` is deliberately INCLUDED even though it is true on every row:
-- a flag that is constant everywhere is a real finding (the family has no
-- contrast arm), and dropping it here would hide that at the source.
WITH snap AS (
  SELECT
    "pickId",
    -- Family names mirror the flag names without the had*/Signal infix, so a
    -- reader can join a verdict back to the schema column by eye.
    array_remove(ARRAY[
      CASE WHEN "hadLineMovementSignal" THEN 'line_movement' END,
      CASE WHEN "hadRestSignal"        THEN 'rest'            END,
      CASE WHEN "hadScheduleSignal"    THEN 'schedule'        END,
      CASE WHEN "hadAtsFormSignal"     THEN 'ats_form'        END,
      CASE WHEN "hadH2HSignal"         THEN 'h2h'             END,
      CASE WHEN "hadVenueSignal"       THEN 'venue'           END,
      CASE WHEN "hadWeatherSignal"     THEN 'weather'         END,
      CASE WHEN "hadInjurySignal"      THEN 'injury'          END,
      CASE WHEN "hadRatingsSignal"     THEN 'ratings'         END,
      CASE WHEN "hadPlayerSignal"      THEN 'player'          END,
      CASE WHEN "hadOfficialsSignal"   THEN 'officials'       END,
      CASE WHEN "hadVenueEnvironmentSignal" THEN 'venue_environment' END,
      CASE WHEN "hadPaceSignal"        THEN 'pace'            END,
      CASE WHEN "hadMilestoneSignal"   THEN 'milestone'       END,
      CASE WHEN "hadOddsSignal"        THEN 'odds'            END
    ], NULL) AS families
  FROM pick_signal_snapshots
)
SELECT
  p.id                                             AS pick_id,
  p."gameId"                                       AS game_id,
  p."pickType"::text                               AS pick_type,
  CASE WHEN p.result = 'WIN' THEN 1 ELSE 0 END     AS outcome,
  -- NULL when absent. Never 0, never 0.5.
  (p."factorBreakdown"->'independentEdge'->>'trueProb')::double precision AS true_prob,
  -- Sanity: the raw JSON sometimes carries a probability outside (0,1).
  -- Surfaced separately so the harness can report saturation rather than
  -- silently clamp a bad value into a plausible one.
  COALESCE(s.families, ARRAY[]::text[])           AS families,
  to_char(p."settledAt", 'YYYY-MM')               AS era,
  to_char(p."generatedAt", 'YYYY-MM-DD" T"HH24:MI')::timestamp AS generated_at
FROM picks p
LEFT JOIN snap s ON s."pickId" = p.id
WHERE p.result IN ('WIN', 'LOSS')
  AND p."isBootstrap" = false
  AND p."settledAt" IS NOT NULL
ORDER BY p."settledAt", p.id;
