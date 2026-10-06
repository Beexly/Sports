# PROVENANCE — gse-intelligence-build / coaching / CONTRACT.md
# Interface contract between the coaching tendency engine (c03, this module)
# and the 4th-down / situational module (c04).
# Research basis: corpus-intelligence/deep/c03/buildable-systems.md §M01–M12
#   + A6 handoff (interface contract), syntheses.md Thread 2 (τ vs PROE split).

# Coaching (c03) ⇄ Situational/4th-down (c04) — Interface Contract

## What c03 PROVIDES (tables under `coaching/data/`, rebuilt by `coaching/build/build_tables.py`)

| Table | Key | Contents |
|---|---|---|
| `proe_early_neutral.csv` | (season, team) | M01 PROE: neutral-script early-down pass rate over LOYO expectation, EB-shrunk (k=290), SE, n, publishable flag |
| `pass_rate_cells.csv` | (season, team, down_group, ydstogo_bin) | LOYO cell counts feeding PROE |
| `weekly_tendencies.csv` | (season, week, team) | M02/M04/M10 feed: early-down pass rate, shotgun, no-huddle, quick-game, air yards, pass rate |
| `sequencing.csv` | (season, team, down) | M08 first-order run-success contrast + SE + CI |
| `script_elasticity.csv` | (season, team) | M06 OLS slope of early-down pass rate on WP bin |
| `rz_mix.csv` | (season, team) | M05 red-zone mix + RZ PROE (EB k=60) + goal-to-go split |
| `second_and_short.csv` | (season, team, situation) | 2nd-&-1 / 2nd-&-≤3 pass rates (Paganetti layer) |
| `tempo.csv` | (season, team) | M09 pace percentiles + hurry-up rate |
| `adjustments.csv` | (season, team, week) | M10 Mahalanobis adjustment distance + percentile + deltas |
| `dc_pressure.csv` | (season, team, down, dist_bin) | M11 pressure OUTCOME proxies, labeled `outcome-not-frequency` |
| `timeouts.csv` | (season, team) | M12 timeout usage (descriptive) |

Provider: `coaching/provider.py::CoachingEngineProvider` implements
`integration/providers.py::CoachingProvider`.

## What c03 CONSUMES from c04

c04 builds **inside this same `coaching/` directory** (see `coaching/README.md`,
owner: c04 Phase 2+ coordinator):
- `coaching/coach_risk.py` — per-coach-team-season τ̂ (Sandholtz et al. 1575 estimand)
- `coaching/refit_tau.py` — offseason refit procedure (`data/tau_hat.csv`)
- `coaching/situational_wp.py` — shrunk situational WP decision engine

c03 reads c04's τ artifacts **read-only** when a decision-quality number is
needed. c03 never computes τ, never combines τ with PROE into one number, and
never substitutes a home-grown 4th-down rate for it (A5 resolution: different
estimands, different modules). c04 imports c03's descriptive tables, never
rebuilds them.

## Boundary rules (both sides enforce)

1. **PROE ≠ τ.** PROE measures tendency formation (do they pass more than
   expected in neutral script); τ measures decision quality (do they go for
   it when the model says so). Never merged.
2. **`go4th_rate` is deprecated as an input.** The base pipeline's raw
   `go4th_rate` is superseded by τ wherever a decision-quality claim is made.
   It remains in the base tables as a descriptive artifact only.
3. **Missing data is None + reason, never zero.** Blitz/man/zone/TTTT/motion/
   play-action/rpo are charting-gapped (`DATA_GAPS.md`) — the provider
   surfaces them as `None` with `data_gap` text.
4. **1575 publication gate.** No tendency number is published (surfaced to the
   reasoning layer) with n < 25 decisions. `publishable` flags are in the tables.
5. **Regime discipline.** Any tendency consumed across a coordinator change or
   a confirmed 0598 regime shift must use the 1888-inverted quarantine
   (stale-regime games ×0.25) — see `coaching/regime.py`.

## Pending items (honest, not silent)

- Monken 2026-Wk4 top-decile adjustment gate: PENDING-DATA (pbp_2026 has weeks
  1–3 only as of 2026-10-02). Implemented in `coaching/adjustments.py`.
- Paganetti 2025 2nd-&-1 anchor (20.6%): UNREPRODUCED from the nflverse
  2022–2026 vintage (five "normal situations" filters land 26–29%). The 2026
  level (32.7%) and the YoY direction reproduce. See `coaching/redzone.py`.
- Full 32-team manual tenure registry: queued research. The seed registry
  (19 offense + 8 defense verified rows) is confidence=1; everything else is
  confidence=3 (unknown), never invented.
