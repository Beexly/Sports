# GSE — VISUAL SYSTEM CASCADE · AUDIT · CODING AGENT HANDOFF

**Thesis:** Sell honesty, not pick volume. Refusal-Native Forecasting.

## CASCADE

```
PROVIDERS (quotes bulkhead | stats bulkhead)
  → circuit/offline on 402
  → INGEST */30 + fetchedAt + hist vault append
  → partitionGateSlate (describe → placeable → 6h → handicap → q → provenance)
  → calibration | candidates
  → IVAP multiprob: fire ⇔ n≥100 ∧ width ok ∧ (p_lo−q)>τ
  → DecisionCertificate FIRE|NO_BET
  → UA honesty | Phase C live meter | HEOS walk-forward (≠ public tips)
```

## AUDIT LINKS
Cron→fetchedAt · Circuit→offline · Partition→Phase C · Gate→Certificate · Vault→HEOS · (5b)→LIVE_BOARD policy

## LAW
No LIVE_BOARD=1 · No 6h widen · No pav/ivap rewrite · No invented ROI · Certificates after gate · HEOS ≠ board

## MERGE ORDER
#220 → #218 → #219 → #224 (prefer over #222) → #223 → #226 HEOS

## PHASE C BASELINE
888|359|283|0 eval|(5b)=0 — remeasure after Odds paid

## UA (integrity surfaces)
We certify decisions—including NO_BET. Stale quotes are not close enough. Thin strata are not close enough. Live board stays dark until measurement says a stratum can evaluate.

## WIRING
- HEOS intervalFn → real ivapPredict (consume only)
- certificateFromGateCandidate after gate only
- hist_odds_snapshot on successful refresh only
- classifyCandidateOddsAge for Phase C; global_max for ops only

## REPORT
MAIN sha | FLAG off | PHASE C old→new | CASCADE ok? | SHIPPED | BLOCKERS | NEXT
