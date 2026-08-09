# Independent exchange harvest (v5.2.1 → v5.2.2)

**MODEL_VERSION `v5.2.2`** adds Dixon–Coles soccer + Kalshi match polarity.
Coverage harvest from v5.2.1 remains. Floors, AUTO_PUBLISH, maps, free-path
ABSENT-only unchanged. See CalibrationProposal
`2026-08-09-dixon-coles-kalshi-match-v5.2.2.md`.


## What shipped

| Source | Role | Gate |
| --- | --- | --- |
| **Kalshi** series search | P0 — MLB time-encoded tickers + multi-league game series | Always on (soft-fail) |
| **Kalshi** league expand | NFL/NBA/MLB/NHL + WNBA/CFB/CBB + EPL/MLS/UCL/… | Abbr map hit required |
| **ClubElo** | Soccer Fixtures W/D/L → 2-way, else rating logistic | Soccer sport keys only |
| **ESPN FPI** | Unchanged logistic | Exact name match |
| **Poisson / Elo** | Unchanged from TeamGameLog | Sport validity |
| **Dixon–Coles** | Soccer τ(ρ) on Poisson joint (source `dixon_coles`) | Soccer only; **replaces** Poisson in blend (no double-count) |
| **Polymarket Gamma** | Internal estimator only | `INDEPENDENT_POLYMARKET=1` default **OFF** |

### Kalshi match polarity (v5.2.2)

- ESPN short aliases: CHW→CWS, GS→GSW, NY→NYK, SA→SAS, NO→NOP, UTAH→UTA, NJ→NJD.
- Unknown 2–6 letter tokens → **null** (no invent).
- ISO commence → **America/New_York** date/time fragments (date-only stays calendar).
- Series attach drops candidates with |Δt| > 12h when occurrence known.
- `toIndependentFairValue`: both sides null if either unmapped/unquoted.


## Kalshi series path (why)

Constructed event tickers alone miss live MLB:

```
constructed (date-only): KXMLBGAME-26AUG12MILSD     → empty
live time-encoded:       KXMLBGAME-26AUG121610MILSD → quoted
```

Path: constructed → if **zero markets**, cursor-page `series_ticker=KXMLBGAME`
(status=open), match date fragment + `AWAYHOME` abbr pair, snapshot event.
Soccer drops `TIE` legs and de-vigs the two team sides (same 2-way law as Poisson).

Series map harvested from sports-skills `KALSHI_SERIES` (machina-sports),
verified live 2026-08-09 against `external-api.kalshi.com`.

## Polymarket compliance hold

`docs/agent-skills/polymarket-hold` still applies:

- Not a product surface, not a cleared source, not a cron.
- Source tag: `polymarket_gamma_internal` (never confusable with quote-plane clear).
- Env default OFF. Founder may enable for offline ranking research only.

## Integrity (unchanged)

- Floors: Brier ≤ 0.22, ECE ≤ 0.05, Murphy R ≤ 0.05, n ≥ 100, GREEN×K
- Edge is **not** a probability; ranking uses trueProb / blend / confidence only
- Soft-fail → no opinion; never invent tickers, ratings, or prices
- Odds API key untouched; free-path ABSENT-only

## Founder ops

1. Promote Production → main after merge (if lagging).
2. Re-run calibration-metrics; generate slate under v5.2.2.
3. Expect more `independentFairValues` hits on MLB/soccer when Kalshi/ClubElo up.
4. Optional research: set `INDEPENDENT_POLYMARKET=1` in a non-prod env only.

## Research lineage

- `/workspace/research/sports-skills` — KALSHI_SERIES, ClubElo fixtures, markets matching
- `/workspace/research/machina-predictions-templates` — Dixon–Coles τ(ρ) monte-carlo
- `/workspace/research/polymarket-template` — Gamma read-only patterns
- Existing GSE `@sports/quote-plane` polymarket-gamma (product hold remains)
