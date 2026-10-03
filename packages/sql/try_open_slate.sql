-- Structural open kernel (DB side) — SECURITY DEFINER stub
-- Single function owns pending count + opener disclosure under one snapshot.
-- STATUS: CODE_READY design stub. Not applied until migration + GRANT fence.
-- Aligns with packages/ingestion-pipeline slateKey / pickProofReceipt model.

CREATE OR REPLACE FUNCTION try_open_slate(p_slate_key text)
RETURNS TABLE (
  decision text,
  reason text,
  pending_pick_count int,
  covered_pick_count int,
  pedersen_aggregate_hex text,
  pedersen_aggregate_value text,
  pedersen_blinding_sum text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending int;
  v_hex text;
  v_n int;
  v_val text;
  v_blind text;
BEGIN
  -- Covered-set keying MUST match freeze stamp (slateKey on pickProofReceipt).
  SELECT count(*)::int INTO v_pending
  FROM "PickProofReceipt" r
  JOIN "Pick" p ON p.id = r."pickId"
  WHERE r."slateKey" = p_slate_key
    AND p.result NOT IN ('WIN', 'LOSS', 'PUSH', 'VOID');

  SELECT
    c."pedersenAggregateHex",
    c.count,
    c."pedersenAggregateValue"::text,
    c."pedersenBlindingSum"::text
  INTO v_hex, v_n, v_val, v_blind
  FROM "SlateCommitment" c
  WHERE c."slateKey" = p_slate_key;

  pending_pick_count := coalesce(v_pending, 0);
  covered_pick_count := coalesce(v_n, 0);
  pedersen_aggregate_hex := v_hex;
  pedersen_aggregate_value := v_val;
  pedersen_blinding_sum := v_blind;

  IF v_n IS NULL THEN
    decision := 'REFUSE';
    reason := 'no_opener';
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_pending IS NULL OR v_pending <> 0 THEN
    decision := 'REFUSE';
    reason := 'not_settled';
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_hex IS NULL OR length(trim(v_hex)) = 0
     OR v_val IS NULL OR v_blind IS NULL THEN
    decision := 'REFUSE';
    reason := 'no_opener';
    RETURN NEXT;
    RETURN;
  END IF;

  -- Mint bound + openCommitment stay in planSlateOpening (pure TS).
  decision := 'REVEAL';
  reason := null;
  RETURN NEXT;
END;
$$;

-- REVOKE ALL ON FUNCTION try_open_slate(text) FROM PUBLIC;
-- GRANT EXECUTE ON FUNCTION try_open_slate(text) TO gse_app;
