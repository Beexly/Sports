# VISION-CONTRACT — the state-estimator layer's ingestion contract (v0, 2026-10-14)

`intelligence/vision/` is the home of the pasted architecture's **State Estimator (Physical
Layer)**: a posterior over player/ball physical state, updated from tracking. Today the package is
empty — this document is its contract, written before any code, so that the first implementation is
pulled toward the architecture instead of drifting into a demo.

Status: **SPEC ONLY — nothing here is built.** Named gap, not a claim.

## Inputs (what must exist before any estimator runs)

| input | granularity | tier if present | current availability |
|---|---|---|---|
| Player/ball tracking | ≥10 Hz positions; 60 Hz joint-level is the architecture's target | MEASURED | none ingested. Candidate public source: NFL Big Data Bowl tracking releases (1–10 Hz, licensed for research). |
| Camera footage | broadcast or all-22 | REPORTED | no rights path established (founder decision). |
| Field/environment calibration | venue dimensions, surface type, wind field | MEASURED | partial: weather-pilot gives venue conditions; venue geometry not ingested. |
| Reference implementations | — | — | `roboflow/sports` (MIT) task taxonomy; `perfanalytics/pose2sim` (BSD-3) kinematics pipeline. Both vetted 2026-10-14, `docs/ops/REPO-VETTING-2026-10-14.md`. |

## Outputs (what this module must emit when built)

1. `state_posterior` — per player, per ball: position/velocity distribution with explicit
   covariance, timestamped, source-stamped. Never a point estimate (the architecture's "honest
   about missingness" rule: absent tracking WIDENS the distribution; it is never imputed).
2. `short_horizon_rollout` — 1–2 s forward distribution under each action hypothesis, consumable by
   `intelligence/physics/aerodynamics.py` for ball flight and by the game-level simulator for
   score/clock propagation.
3. `uncertainty_budget` — the per-node residual variance, which the decision layer compares against
   market uncertainty. The refusal rule ("do not bet when model uncertainty ≥ market uncertainty")
   consumes this and nothing else.

## Verification tiers (same vocabulary as the rest of the engine)

- MEASURED — direct from an ingested tracking feed, timestamped.
- COMPUTED — derived by this module from MEASURED inputs (e.g. velocity from positions).
- INFERRED — vision-model output from footage; must carry model identity + confidence.
- ASSUMED — anything else. Labeled, and excluded from load-bearing links by the adversary.

## Falsifier (what "done" means; without this the module is a demo)

The module is DONE when: on a held-out set of plays with known outcomes, its short-horizon
rollouts' 90% credible intervals contain the realized outcome at 85–95% (calibration, not sharpness),
AND its per-play uncertainty is strictly smaller than the market's implied pre-snap distribution for
the same plays on at least one margin (prop or total). If calibration holds but no margin beats the
market, the module is a working state estimator and still not an edge — both facts get recorded.

## Non-goals (v0)

- No live in-game operation: batch/offline first.
- No player-identification from footage beyond jersey-number OCR with confidence; identity comes
  from rosters (`intelligence/roster/`), never guessed from pixels alone (contamination rule).
- No imputation of missing tracking: gap = wider distribution, named.
