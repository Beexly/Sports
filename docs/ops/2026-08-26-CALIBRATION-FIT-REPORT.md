# Calibration fit on the real settled sample — 2026-08-26

**What ran:** the ORBIT_UNLOCK §6 R&D task, executed against the live
`gse-postgres` settled sample (read-only `hermes_ro`, SQL-over-HTTP). Offline
only — nothing applied to live scoring. Method exactly as prescribed:
time-ordered `timeHoldoutSplit(0.7)` → fit on train only → report held-out.

**Sample:** 1,469 settled non-bootstrap WIN/LOSS picks with confidence
(2026-05-31 → 2026-08-25). Base rate 0.5133 (test slice 0.5261).

## Held-out results (test = most recent 441 picks, never seen by the fit)

| | ECE | Brier |
|---|---|---|
| Raw confidence | 0.1318 | 0.2672 |
| CIR (centered isotonic) | 0.0690 | 0.2521 |
| **PAVA (classic isotonic)** | **0.0371** | 0.2490 |
| Eligibility floor | ≤ 0.05 | ≤ 0.22 |

## The two findings that matter

**1. The ECE floor is reachable today; the Brier floor is not — and that split
is the honest diagnosis.** PAVA calibration passes the ECE floor on held-out
data (0.0371 ≤ 0.05). But calibrated Brier lands ≈0.249 — essentially the
0.25 of a calibrated coin flip — because the sample's outcome uncertainty
(≈0.2487) dominates and the model currently shows almost no *resolution*
(the live eligibility probe's Murphy decomposition agrees: resolution 0.0071).
Calibration makes the numbers honest; it cannot invent discrimination.
**Brier ≤ 0.22 is a demand for real edge, and it is correctly still red.**
That is exactly what the edge-lab program (covariate binds, e = p − q selective
gating) exists to earn.

**2. The miscalibration is concentrated, and it validates the strategy.**
Per-pickType raw calibration on the full sample:

| pickType | n | mean forecast | observed | ECE |
|---|---|---|---|---|
| SPREAD | 497 | 0.674 | **0.455** | 0.219 |
| TOTAL | 489 | 0.629 | **0.448** | 0.181 |
| MONEYLINE | 483 | 0.632 | **0.640** | 0.144 |

MONEYLINE confidence (market-anchored) is honest at the mean. SPREAD/TOTAL
confidence is tout-grade overconfidence — ~65% forecasts on what played out as
sub-coin-flip outcomes — and the platform's own gates have (correctly) kept
those numbers from ever being published as performance claims. This is
PATH_TO_PROVEN_EDGE's thesis showing up in our own data: the mainstream
spread/total market is dead-efficient; unanchored model confidence there is
noise; the trustable probability is the market-derived one, and edge must be
hunted as calibrated divergence from price, not as raw confidence.

Held-out reliability (raw): 0.574→0.457 (n=138) · 0.673→0.564 (n=243) ·
0.786→0.552 (n=58) · 0.900→0.000 (n=2).

## Decisions this evidence supports (owner-gated, per ADJUSTMENTS_ENABLE_RUNBOOK)

1. **Fit choice:** on this sample classic PAVA beats CIR on both held-out ECE
   and Brier. CIR's value is ranking preservation (no plateaus) for Kelly
   sizing; if the apply-decision is display-honesty first, PAVA is the
   stronger candidate — run the apply-matrix
   (`docs/ops/CALIBRATION_MAP_APPLY_MATRIX.md`) before choosing.
2. **Confidence display:** until calibration is applied, SPREAD/TOTAL raw
   confidence must not surface anywhere precision implies accuracy
   (`CONFIDENCE_DISPLAY_MODE` stays coarse) — the C8 gate ordering already
   encodes this.
3. **Re-fit cadence:** the fit is one command once a sample export exists;
   re-run at each ~250 new settled picks and before any C6 flip
   (`calibratedEce ≤ rawEce` re-confirmation was 0.0371 vs 0.1318 here).

**Reproduce:** export `(confidence, y, t, pickType)` for settled
non-bootstrap WIN/LOSS picks (read-only role; SQL-over-HTTP works from
restricted containers: `POST https://<endpoint-host>/sql` with the
`Neon-Connection-String` header), then run the driver in
`scripts/calibration-offline/` against the exported JSON.
