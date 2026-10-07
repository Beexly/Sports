# MVE outcome drafts — written BEFORE the path was computed

Frozen 2026-08-20 with the pre-registration. The result must not rewrite
these frames. The runner selects exactly one after the single cycle.

## A. Kill Ledger entry (fires on early abort, E<=0.10 at a checkpoint, or final capital <= 2)

- id: mve
- label: MVE
- title: Fundamentals-vs-market MLB totals e-process
- dated: 2026-08-20
- mechanism: Hierarchical negative-binomial walk-forward (R-9 NB-RBPF machinery) versus Shin-de-vigged cross-book median over-probability at the 6–3h entry window. Side-adaptive asymmetric fractional e-process, lambda 0.3, one predictable bet per game.
- rule: Certification E>=20 at a scheduled 50-pick checkpoint; kill E<=0.10 at any checkpoint; early abort capital<0.01 after 50 graded picks; final capital <= 2 closes the program.
- observed: [FILL FROM RESULTS.md AFTER THE SINGLE CYCLE]
- verdict: Kill. The pre-registered binding outcome fired. The edge program is closed for good. No rerun, no retune, no second window.
- evidence: docs/ops/hermes/hf5-mve/RESULTS.md

## B. Did not certify, did not survive (fires when neither kill nor certification)

Same mechanism and rule as A. Verdict: Did not certify, did not survive. The program closes identically to a kill. No middle state persists.

## C. Prospective pre-registration (fires only if E>=20 at a scheduled checkpoint)

Use the template already frozen in docs/ops/edge/2026-08-20-mve-prereg-v2.md. Do not open the track. Founder signature required.
