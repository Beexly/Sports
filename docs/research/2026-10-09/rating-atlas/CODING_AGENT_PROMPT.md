# Coding-agent prompt — rating atlas follow-through

Branch: `research/rating-atlas-2026-10-09-packet`. Do not commit to `main`. Do not touch trust gates, Stripe, MODEL_VERSION, or `packages/prediction-engine` scoring. Do not add recon handlers.

Read `docs/research/2026-10-09/rating-atlas/SESSION_LEDGER_2026-10-09.md` first. The ledger wins over the pasted dossier where they disagree.

## Land the research packet, do not promote it

Copy the verified stdlib modules into `docs/research/2026-10-09/rating-atlas/code/` (not into production packages):

- engine_math.py, ratings2.py, calibration2.py, kelly2.py, props_deep.py, props_optimizer.py, clv.py, backtest.py, pick6_hold.py, router_prediction.py
- data/build_db.py, data/fit_engines.py, data/analyze_nfl.py, data/context_engine.py, data/fatigue_efficiency.py

Fix these before the self-checks are treated as green:

1. `props_optimizer.team_total_dist` must use `mu = -spread`, then `(total ± mu) / 2`. A listed −3 on 48.5 is 25.75 / 22.75, not the reverse.
2. `analyze_nfl.ci` must report the posterior interval (percentiles of the draws), not `mean ± 1.96 * sd / sqrt(n)`. The second quantity is a CI of the posterior mean and is what produced the fake [1.54, 1.59] band.
3. `fit_engines.py` must use `att.get(team, 0.0)` and `deff.get(team, 0.0)` so a promoted side does not KeyError. Score the showdown on 1X2 probabilities, never on the exact-score cell. Print both scales if both are computed, labeled.
4. `ratings2.glicko2` stays period-parallel. Do not add a sequential default. A sequential helper may exist only behind an explicit flag, with a docstring that it is not Glicko-2.
5. `engine_math.kalman_ratings` and `weather_adj` docstrings stay labeled PRIORS. Do not change the 13.45 ladder or the production wind curve from this packet.
6. `router_prediction.py` routes prediction commands only. No /hydra, /sqlmap, /crack, /shodan, /exposure.

Self-checks that must print:

- Shin −110/−110 → z ≈ 0.0476, fair 0.5/0.5
- CRPS(0,1,0) ≈ 0.2337
- Glicko-2 canonical → 1464.05 / 151.52 / 0.05999
- alt ladder listed −3.5 contains `mu_margin +3.5`
- team total −3 on 48.5 → 25.75 / 22.75

## Do not do

- Do not retune production HFA. `NFL_EPA_HFA` is 0.025 EPA/play.
- Do not add +1.74 to any total.
- Do not cite [1.54, 1.59] as a posterior interval.
- Do not cite teaser fair −155. A 46.8% ticket is +114.
- Do not merge this branch to main.

## After the files land

Write `docs/research/2026-10-09/rating-atlas/SELF_CHECK_LOG.md` with the printed lines. Leave EPL and weather rows as NOT RE-RUN until `research.db` and a wind column exist.
