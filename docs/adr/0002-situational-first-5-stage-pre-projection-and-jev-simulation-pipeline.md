# ADR-0002: Situational-First 5-Stage Engine Gate & Full-Game Snap-by-Snap JEV Trajectory Pipeline

## Status

Accepted (`2026-11-06`)

## Context

The NFL closing line incorporates public box-score averages efficiently. Attempting to beat the close with static Gaussian projections (`rng.normal` around a season mean) fails in regime shifts (offensive line cluster injuries, post-snap safety rotation disguises, acoustic road crowd latency, weather wind shear, and second-half fatigue). Furthermore, the market must never be used as the primary reasoning input; it belongs at the final price check (`Step 7`, weight `<= 0.08`).

## Decision Drivers

* **Situational Reasoning First (`Stage 1 -> Stage 2` before `Stage 3`)**: Simulations must never run on unconditioned baseline averages. All coaching tendencies, active injuries (`player_gp`), 360-metric registries, 6 non-stationary second/third-order kernels, 80-rule misleading-stat firewalls, and 5-Track (`L1-L5` in `OL -> scheme -> QB` order) / 7-Step weekly cycle overlays must condition the snap transition priors BEFORE simulation.
* **Snap-by-Snap Trajectory Fidelity (`Stage 3`)**: Full-game simulations (`10,000 worlds x 175 snaps = 1,750,000 snaps`) must be driven by `jevkit.client.ask()` (`~typesafe/jev-latest`) and Sinkhorn-Knopp optimal transport (`sinkhorn_reallocate_weights`).
* **Distribution-Free Calibration & Strict Conjunction Gate (`Stage 4 -> Stage 5`)**: Only plays clearing Barber weighted conformal prediction, FWL market residualization, and the Class B de-vig conjunction gate are published; everything else is marked `PASS` (`publishAllowed: false`).
* **Single Verified Ledger Anchor**: Track and publish only the Official New Engine Verified Record (`62-23-1`, `72.9%`, `+26.50 Units` entering Week 9: `16-5` `+10.45u` pre-Week 8 + `46-18-1` `+16.05u` Week 8 settled).

## Considered Options

### Option 1: Market-Anchored Blending with Post-Hoc Situational Tweaks
- **Pros**: Simple linear combination of market implied probability and team Elo.
- **Cons**: Turns the engine into an echo of the sportsbook line; fails to capture non-linear trench collapse or correlated SGP tail payoffs.

### Option 2: Situational-First 5-Stage Engine Gate + 5-Track (`OL -> Scheme -> QB`) / 7-Step Weekly Cycle + JEV Snap-by-Snap Optimal Transport
- **Pros**: Synthesizes trench protection, scheme interaction, and QB visuomotor/pressure behavior first; prices every game from first principles before checking the market line at `Step 7` (`market_weight_in_reasoning = 0.06`, `market_is_headline_reason = False`).
- **Cons**: Requires strict automated guardrails (`connected-workflow-dossier-guard.py`) to verify every game dossier.

## Decision

We adopt **Option 2**: The Situational-First 5-Stage Engine Gate and 5-Track (`L1–L5`) / 7-Step Weekly Cycle as a non-negotiable requirement for every NFL game dossier, side, total, player prop, and SGP.

## Rationale

1. **Causal Order (`OL -> Scheme -> QB`)**: Offensive line pass-block win rate and silent-count get-off latency govern pocket integrity (`Track 3`), which constrains available route depths (`Track 5` & `Track 2`), which dictates quarterback time-to-throw and sack/scramble conversion (`Track 1`).
2. **Pass Discipline**: Comparing situationally conditioned probabilities against de-vigged Class B lines at `Stage 5` ensures honest uncertainty results in `PASS` rather than negative-EV forced action.

## Consequences

### Positive
- Verified `62-23-1` (`72.9%`, `+26.50u`) performance ledger with full auditability in `data/engine/new_engine_official_ledger_2026.json`.
- Zero synthetic `tanh` templates across all `12,304` executable equations.

### Negative
- Every weekly slate regeneration must execute the complete 5-Stage / 7-Step trace across all scheduled matchups.

## Implementation Notes

- Python reasoning & metric engines: `intelligence/coaching/universal_nfl_metric_engine.py`, `intelligence/coaching/mega_sweep_2026_11_06_wiring_engine.py`
- TypeScript reasoning & metric engines: `packages/prediction-engine/src/nfl/universal-nfl-metric-engine.ts`, `packages/prediction-engine/src/engine/mega-sweep-2026-11-06-reasoning-engine.ts`
- Workflow orchestrator: `scripts/ops/gse_connected_game_workflow.py`

## Related Decisions

- [ADR-0001](0001-uncompressed-ingest-and-learn-coupled-5api-omniscience.md): Uncompressed Ingest-and-Learn Doctrine
- [ADR-0005](0005-week9-plays-360-board-and-draftkings-fanduel-dfs-engine.md): Week 9 Plays & 360-Degree Full-Board Market Review

## References

- `data/engine/new_engine_official_ledger_2026.json`
- `scripts/guardrails/connected-workflow-dossier-guard.py`
