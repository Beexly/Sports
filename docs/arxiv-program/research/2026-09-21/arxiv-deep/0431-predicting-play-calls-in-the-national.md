# [0431] Predicting play calls in the National Football League using hidden Markov models (arXiv:2003.10791v1)

**Citation:** Ötting (2020). *Predicting play calls in the National Football League using hidden Markov models*. arXiv:2003.10791v1. URL: https://arxiv.org/abs/2003.10791v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1004 lines).
**Verdict:** ADAPT — fit per-team 2-state HMMs with covariate-driven transitions on nflverse data to capture run/pass "regime" stickiness for in-game and pre-snap edge work; don't copy the fitted model (old data, coarse covariates).

## 1. Research question
Can hidden Markov models improve NFL run/pass play-call prediction over static classifiers by accounting for the time-series structure (streaks of pass-heavy or run-heavy stretches within a game)? The latent states serve as a proxy for a team's current propensity to pass, with transitions driven by game-context covariates. Practical framing: help defensive coordinators adjust in real time and offensive coordinators audit their own predictability.

## 2. Dataset / schema
Kaggle play-by-play NFL dataset: regular-season matches 2009–2018, 2,526 of 2,560 matches, each split into two per-team-offense time series → 5,052 time series, 318,691 plays total. Training: 2009–2017 (2,302 matches, 289,191 plays); test: 2018 (224 matches, 29,500 plays). Observation y_{m,p} ∈ {0,1}: 1 = pass, 0 = run; overall 58.4% passes. Field goals/kickoffs ignored. Covariates: home dummy, ydstogo (mean 8.634), down dummies (down1 0.443, down2 0.333, down3 0.209, down4 0.015), shotgun (0.525), no-huddle (0.087), scorediff (mean −1.458), goaltogo (0.057), yardline90 (0.033). Public Kaggle data; old (pre-2019) and team-level only.

## 3. Method / model
Per-team 2-state HMM (N=2, Bernoulli state-dependent emissions), fitted individually to each team's training data (no pooling). Transition probabilities γ_ij^(p) depend on covariates at play p via multinomial logit: γ_ij^(p) = exp(η_ij^(p)) / Σ_k exp(η_ik^(p)), η_ij^(p) = β_0^(ij) + Σ_l β_l^(ij) x_l^(p) for i≠j, 0 otherwise. Initial distribution δ estimated (not stationary). Likelihood via forward algorithm; full-data likelihood = product over matches (independence between matches). Parameters maximized numerically with nlm() in R. Forecasting: one-step-ahead forecast distribution Pr(y_{P+1}=y | y^(P)) = ratio of likelihoods including the candidate next observation (Zucchini et al. 2016); argmax class is the forecast. Covariate selection: AIC forward selection per team, including interactions (ydstogo×scorediff, downs×ydstogo, shotgun×ydstogo, nohuddle×scorediff, nohuddle×shotgun). N=2 chosen to avoid numerical instability given per-team sample sizes.

## 4. Equations & assumptions
γ_ij^(p) = exp(η_ij^(p)) / Σ_{k=1}^N exp(η_ik^(p)); η_ij^(p) = β_0^(ij) + Σ_{l=1}^K β_l^(ij) x_l^(p) if i≠j, else 0.
Match likelihood: L = δ P(y_{m,1}) Γ^{(m,2)} P(y_{m,2}) … Γ^{(m,P_m)} P(y_{m,P_m)} 1.
Full likelihood: L = Π_{m=1}^M [same].
Forecast: Pr(y_{P+1}=y | y^(P)) = [δ P(y_1) Γ^{(2)} P(y_2) … Γ^{(P)} P(y_P) Γ^{(y)} P(y) 1] / [δ P(y_1) Γ^{(2)} P(y_2) … Γ^{(P)} P(y_P) 1].
Stated assumptions: latent 2-state Markov chain captures pass propensity; matches independent of each other; per-team fits (heterogeneity handled by stratification, not hierarchy); Bernoulli emissions; initial distribution estimated; no player/personnel information.

## 5. Features / target
Inputs: covariate vector at play p (home, ydstogo, down dummies, shotgun, no-huddle, scorediff, goaltogo, yardline90, selected interactions) + latent state. Target: binary next-play call (pass vs run), one-step-ahead per play.

## 6. Validation design
Strict temporal split: train 2009–2017, test full 2018 season (out-of-sample, 29,500 plays, 224 matches). Models fitted per team on team-specific training data; no cross-validation reported. Compared against earlier studies' accuracies (Heiny & Blevins 2011, Teich et al. 2016 ~0.67 on pbp-only; Lee et al. 2017, Joash Fernandes et al. 2019 ~0.75 with player data). Metrics: accuracy (weighted average over teams), precision/recall for run and pass separately. Evaluation is honest out-of-sample.

## 7. Numerical results / baselines
- Weighted-average out-of-sample accuracy 2018: **0.715** (paper's headline; vs ~0.67 pbp-only baselines; vs ~0.75 with player data).
- Per-team accuracy range: 0.602 (Seattle Seahawks) to 0.779 (New England Patriots) (Figure 5).
- Run precision: 0.532 (Green Bay Packers) – 0.763 (Houston Texans); run recall: 0.324 (Baltimore Ravens) – 0.886 (Los Angeles Rams).
- Pass precision: 0.559 (Seattle Seahawks) – 0.9 (Los Angeles Rams); pass recall: 0.664 (Los Angeles Rams) – 0.922 (Pittsburgh Steelers).
- AIC-selected covariate sets differ per team (slightly). Fit cost: ~7 hours per team for forward selection on a standard desktop; forecasting <1 second per match.

## 8. Code / data availability
Data: Kaggle NFL play-by-play (public). No code link stated. Method follows Zucchini et al. 2016 (Hidden Markov Models for Time Series, R implementation referenced).

## 9. Leakage & limitations
Adversarial read: (1) Strictly no leakage — clean temporal split; honest 2018 holdout. (2) Sample-era bias: data end 2018, pre-modern pass-happy era and pre-nflverse; fitted relationships (shotgun/pass rates) are stale. (3) Binary target (run/pass) ignores scrambles, sacks as pass attempts, penalties, RPOs — target definition muddy. (4) Per-team fits discard cross-team information; partial pooling would help weak teams (Seahawks 0.602). (5) No player/personnel covariates — the author admits personnel is the main missing input, and questions whether it's usable in practice given substitution. (6) Static 2009–2017 fit applied to all of 2018 (no online updating); the author notes dynamic updating would improve results — a real gap. (7) 2 states chosen for numerical convenience, not validated (no AIC comparison of N=2 vs 3 reported). (8) Accuracy ~71.5% vs 58.4% naive pass-rate baseline — the lift over a majority-class/covariate logistic model is not isolated (no plain-logistic-with-same-covariates baseline shown, so the HMM's marginal value over a static model is unproven).

## 10. GSE overlap
No existing repo work covers play-call prediction or HMM run/pass modeling — the map has 4th-down WP, EP, drive models, and game-state stuff, but nothing predicting the *next play call*. The manifest lane is props_player, and play-call tendency feeds directly into player prop projection (attempts/targets) and in-game markets. Status: **new capability** (play-call tendency modeling), complementary to existing game-state/projection work. Related gap from map: in-play/live spread & total modeling (gap #7) — a pass-propensity state model is a natural building block.

## 11. GSE implementation spec
1. Data: nflverse pbp 2015–2025; target = pass attempt (dropback) vs designed run at the play level; exclude penalties/no-plays; covariates: down, ydstogo, yardline, shotgun, no_huddle, score_differential, time remaining, goaltogo, posteam, plus personnel groupings (11/12/21/10) from nflverse.
2. Model: per-team 2–3 state HMM with multinomial-logit covariate transitions, fitted with Stan or hmmlearn; compare N=2 vs N=3 by held-out log-likelihood; add hierarchical partial pooling across teams (improves on paper's per-team fits).
3. Online update: refit weekly during season (paper's suggested improvement — static fit is the weak point).
4. Serving: pre-snap pass-probability API feeding (a) prop projection adjustments (attempts share), (b) in-game win-probability conditioning, (c) "script" model for game-script-conditioned props (ties into existing props-consensus work).
Estimated effort: 3–5 days (data exists; Stan HMM + weekly refit harness is the new work).

## 12. Reproducible test
Dataset: nflverse pbp 2023–2025 regular season plays (pass = dropback). Metric: out-of-sample one-step-ahead accuracy AND log-loss, 2025 season as test (train ≤2024). Baseline: gradient-boosted logistic with same covariates (no latent states) — this isolates the HMM's marginal value, which the paper never tested. Also compare to naive 58% pass baseline. Report per-team accuracy range like the paper.

## 13. Acceptance / rejection gate
ADOPT (as in-game/prop input) if the per-team HMM beats the covariate-only logistic baseline by ≥0.5 pp accuracy AND ≥0.005 log-loss on 2025 holdout, with the improvement concentrated in late-game/script-driven situations; REJECT if it fails to beat the static baseline (streak structure adds nothing beyond covariates) — in which case keep the logistic tendency model only.

## 14. Improvement experiment
Beyond the paper: (1) add a third latent state and personnel covariates, plus hierarchical pooling; (2) condition the emission distribution on game script (win probability bucket) so states map to "neutral / pass-heavy comeback / run-heavy kill-clock" regimes; (3) use the decoded state sequence as a feature in the prop projection model (does being in the pass-heavy state shift WR target share beyond what the covariates already explain?); (4) dynamic in-season updating with exponential forgetting — the paper's own suggested improvement, testable on 2024–2025.
