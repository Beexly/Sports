---
modelVersion: v5.2.2
status: IMPLEMENTED
date: 2026-08-09
author: ranking independents leverage (principal build agent)
supersedes: v5.2.1
---

# CalibrationProposal — Dixon–Coles soccer independent + Kalshi match polarity (v5.2.1 → v5.2.2)

## Decision

Bump `MODEL_VERSION` to **v5.2.2** for ranking-independent quality:

1. **Dixon–Coles τ(ρ)** soccer independent (`source: "dixon_coles"`) — market-free trueProb from TeamGameLog λ + low-score correlation (ρ default −0.13). On soccer it **replaces** independent Poisson in the blend (no double-count of the same rates); hockey/baseball keep Poisson.
2. **Kalshi ESPN short-code aliases** — CHW→CWS, GS→GSW, NY→NYK, SA→SAS, NO→NOP, UTAH→UTA, NJ→NJD; unknown shorts → null (no invent).
3. **Kalshi ticker ET wall clock** — date/time fragments for ISO instants use `America/New_York` (date-only strings stay calendar days).
4. **Series match 12h start skew** — drop far-future attach when `occurrence_datetime` known.
5. **toIndependentFairValue** — both sides null if either unmapped/unquoted (no one-sided invent).

Heuristic confidence weights / composite formula **unchanged**. Maps, AUTO_PUBLISH, floors unchanged.

## What this is — and is NOT

Ranking discrimination / independent coverage + polarity safety. **Not** a PROVEN claim. Floors (Brier ≤ 0.22, ECE ≤ 0.05, Murphy R ≤ 0.05, n ≥ 100, GREEN×K) unchanged.

## Evidence

- Unit: `dixon-coles.test.ts`, `kalshi-team-abbr.test.ts`, `kalshi-series.test.ts`, `kalshi-client.test.ts`.
- Research port: machina-predictions-templates `monte-carlo.py` τ(ρ); sports-skills markets ET + 12h skew.
- Doctrine: wrong independent **null** > wrong independent **inverted**.

## Gates still OFF

- `CALIBRATION_ADJUSTMENTS_ENABLED` — off
- `CALIBRATION_AUTO_PUBLISH` — false
- Conformal/ACI abstain — off
- Free-path ABSENT-only; Odds key untouched
- Polymarket independent still env-gated OFF

## Founder follow-up

1. Promote Production → main after merge.
2. Re-run calibration-metrics + generate slate (new picks carry dixon_coles when soccer rates exist).
3. Optional later: fit ρ from form; Understat xG λ; title-token Kalshi fallback.
