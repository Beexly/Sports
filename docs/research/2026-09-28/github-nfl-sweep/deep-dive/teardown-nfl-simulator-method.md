# Methodology extraction: dgrifka/nfl_simulator — the deserve-to-win process meter

Attribution: David Grifka. Repo is MIT (code), docs CC-BY 4.0. ~31 MB repo, mostly figures. V1 code is gone from the repo (tag v1.4.3 only); v2 is retrospective-only by explicit design. Filing detail at `~/workspace/research/nfl-simulator-dtw-extraction.md`.

## The math pipeline (definition → regression → bootstrap → DTW%)

**Definition.** Each team-game gets two numbers: success rate = `(K+T_s)/(N+T)` (takeaways folded in as plays for the taker, successful when the offense lost EPA), yards per play = `(Y+R)/N` (return yards credited, no play charged — the asymmetric fold is the whole of v2.1).

**Regression.** OLS on 2016–2023 team-games (4,190 rows): exactly three regressors — intercept, own success rate, own yards per play. Weights: **−16.829288585 / +35.126158543 / +4.177796953**, R² 0.609. Likely points = that linear combo; deserved margin = home minus away. No opponent columns, no charting, no special teams, no field position, no penalties, garbage time kept.

**The draws (terminology note: not a bootstrap).** V2 does *parametric posterior sampling*, 40,000 draws per game: weights ~ Normal(beta-hat, σ²(X'X)⁻¹), rate ~ Beta(K+T_s+1, N−K+T−T_s+1), yards ~ Normal(y-bar, y_sd/√N). DTW% = mean of **Φ(margin draw / 5.4528)**. The 40,000 count survived a pre-registered stability gate (4k/16k failed seed stability). V1's *genuine* two-layer bootstrap (draw posterior for p(e), then 800 Bernoulli coin flips; DTW% = P(deserved_margin* > 0)) was retired with v1 but is where the interval-coverage lesson lives.

**The scale correction (v2's key move):** margin_sd = 8.875 is fit to realized rates, so it already contains sampling noise the draws add twice → `σ_once = sqrt(8.875² − 49.0324) = 5.4528`, with a documented 6.4e-4 ambiguity from measuring off the published 3-decimal value.

## Assumptions & calibration, honestly

- Normal margin residual, Beta rate (uniform prior), Normal yards mean, Normal weight posterior, team errors **not** assumed independent.
- **Calibration is deliberately absent:** the meter scores its own game, is "too timid" at both ends by design, and is allowed to be miscalibrated vs actual results — "a meter that scored perfectly against who actually won would be a meter that had stopped removing luck." Stripping luck was tested and **did not improve forward prediction** (next-game log-loss gap −0.0007 [−0.0018, +0.0004], adopted on the definition). GSE should treat DTW as a process metric for grading finished games, not a forecast feature.
- V1 lesson: their 89% DTW interval was actually ~97% on informative games — ~31% of its width was Monte Carlo noise from too few coin draws; raising DEFAULT_COIN_DRAWS to 800 fixed it (0.9152, still ~2 pp conservative).

## Top research docs (75 numbered)

75 (foundations — all constants, start here), 76 (sampler of record: seed/draw-count/scale), 05 (neutralization principle: Gates A/B/C), 10 (interval coverage audit), 04 (Bayesian component results: fumble κ=1,408 → full luck; penalties κ≈3–4k → skill, not neutralized), 06/07 (rematch validation pre-reg + pass), 02 (skill-vs-luck split-half base), 05b (kicker-hierarchical FG model), 33 (magnitude audit), 08 (sequencing: placement luck, leverage timing skill).

## Code & grounded results

`process_meter/` = plays → features → posterior (closed-form, no sampler) → record (per-game sha256-seeded generator, 40k draws, Φ-percent) → score; `weights.json` is a 1 KB pin-checked artifact — the library never refits at score time, and `fit.py` refuses to write if pins moved. Grounded claims: `test_process_meter_stage0.py` reproduces six reference percents (e.g. 2025 WK1 CIN@CLE → 0.7488 Cleveland though Cincinnati won 17–16), Brier **0.1436**, log loss **0.4376** on the 543-game gate window — all through the library's own scoring seam.

## Most portable piece for GSE

Not the regression — **the reproducibility protocol**: (1) pre-register every gate in git before fitting; (2) weights as a committed, pin-checked artifact, never refit at score time; (3) per-game seeding (`sha256("{seed}:{game_id}")`) with bit-for-bit invariance tests; (4) draw counts set by a pre-registered stability gate; (5) stage-0 tests recomputing published numbers through the scoring seam; (6) the calibration firewall — process metrics are not forecast features unless a pre-registered test says so. Runner-up: the neutralization rule with Gate A (mechanism first — the penalties cautionary tale: correct math `w ≈ 0.42–0.46` would have mispriced disciplined teams).
