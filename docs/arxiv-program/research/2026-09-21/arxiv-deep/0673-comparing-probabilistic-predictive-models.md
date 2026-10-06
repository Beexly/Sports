# [0673] Comparing probabilistic predictive models applied to football (arXiv:1705.04356)

**Citation:** Marcio A. Diniz, Rafael Izbicki, Danilo Lopes, Luis Ernesto Salasar (2017). *Comparing probabilistic predictive models applied to football*. arXiv:1705.04356. URL: https://arxiv.org/abs/1705.04356
**Ledger completed:** 2026-09-21. **Read:** full text (local cache /tmp/arxiv750-cache/fulltext/1705.04356.txt, all sections 1–4, tables 1–6, appendix).
**Verdict:** ADAPT — the multinomial-Dirichlet win/draw/loss model is a dead-simple, well-calibrated Bayesian baseline that beats Bradley–Terry on proper scoring rules; adopt it as GSE's minimum-viable probability forecaster and calibration reference.

## 1. Research question
Can two novel Bayesian multinomial-Dirichlet models — which use only each team's counts of wins, draws and losses as inputs — compete with established goal-based models (Arruda, Lee bivariate-Poisson websites) and a Bradley–Terry–Davidson extension on Brazilian championship matches, judged by proper scoring rules, error rate and calibration?

## 2. Dataset / schema
1,710 matches from the first division of the Brazilian football championship, seasons 2006–2014 (20 teams, 380 matches/season, double round-robin). Benchmark predictions from public websites chancedegol.com.br (Arruda) and previsaoesportiva.com.br (Lee), published before each matchday. Comparisons restricted to second-half matches (190/season) so all models use comparable information. Access: public league results + website predictions (as of 2017).

## 3. Method / model
Two multinomial-Dirichlet models predicting second-half matches from current-championship W/D/L counts only. Mn-Dir1: mixture with equal weights (w=1/2) of two Dirichlet posteriors — one from team A's home matches, one from team B's away matches — combined by linear opinion pooling (Stone 1961), with uniform D(1,1,1) prior updated by first-half results as prior for second half. Mn-Dir2: same but with weight w and symmetric Dirichlet D(α,α,α) prior chosen by grid search over 400 (w,α) pairs minimising first-half Brier scores. Baselines: Arruda and Lee bivariate-Poisson goal models (log-linear attack/defence + home advantage), and a Bradley–Terry–Davidson model with multiplicative order effects (home advantage γ, draw parameter ν). Posterior predictive: P(X_{n+1}=k) = (n_k + α_k)/(n + α_•).

## 4. Equations & assumptions
- Bivariate Poisson (Holgate 1964): P(Y1=y1,Y2=y2|λ1,λ2,λ3) = exp(−(λ1+λ2+λ3))·Σ_k λ1^{y1−k}λ2^{y2−k}λ3^k/[(y1−k)!(y2−k)!k!]; Lee sets λ3=0.
- log λ1 = μ + ATT_A − DEF_B + γ; log λ2 = μ + ATT_B − DEF_A; ΣATT = ΣDEF = 0.
- Bradley–Terry–Davidson: p^W_ij = γπ_i/(γπ_i + π_j + ν√(π_iπ_j)); p^D_ij = ν√(π_iπ_j)/(γπ_i + π_j + ν√(π_iπ_j)); p^L = 1 − p^W − p^D.
- Dirichlet prior π(θ|α) = Γ(α_•)/[Γ(α1)Γ(α2)Γ(α3)]·θ1^{α1−1}θ2^{α2−1}(1−θ1−θ2)^{α3−1}; posterior D(n1+α1, n2+α2, n3+α3).
- Predictive: P(win) = (n1+α1)/(n+α_•), etc.
- Linear opinion pool: combined predictive = w·p_A + (1−w)·p_B.
- Assumptions: match outcomes i.i.d. categorical given θ; home/away records separable; first-half results an adequate prior; Arruda's 12-month window makes its comparison slightly advantaged (acknowledged handicap).

## 5. Features / target
Features: counts of wins/draws/losses per team, split by home/away (Mn-Dir); goals and attack/defence ratings for benchmarks. Target: categorical full-time outcome {home win, draw, away win} for second-half matchdays.

## 6. Validation design
First half of each season builds priors; predictions on second-half matches only (190/season, 1,710 total), updating posteriors matchday by matchday. Time-ordered within season. Metrics: Brier, logarithmic, spherical proper scoring rules (mean + total + SE), proportion of errors, calibration curves (smoothing splines, 95% bands), goodness-of-fit χ² (expected vs observed wins home/away per team, 40 df), predictive entropy. ANOVA + post-hoc pairwise tests on scores.

## 7. Numerical results / baselines
Total Brier scores (n=1,710): BT 1085.9 (14.9), Arruda 1053.2 (12.6), Lee 1075.5 (14.9), Mn-Dir1 1067.59 (10.4), Mn-Dir2 1073.5 (8.8). Derived mean Brier: BT 0.6350, Arruda 0.6159, Lee 0.6289, Mn-Dir1 0.6243, Mn-Dir2 0.6278 (derived from reported totals — mean-score cells lost in text conversion). Post-hoc: Mn-Dir1 beats BT on Brier (estimate −0.01, p=0.04) and log score (p=0.01); Mn-Dir2 beats BT on log score (p=0.02); Arruda best on all three scoring rules but not significantly different from Mn-Dir1; no model differences on proportion of errors (ANOVA p=0.86). Calibration: Arruda and both Mn-Dir models track the 45° line; BT and Lee over-estimate probabilities of frequent events. Goodness of fit χ² (40 df): BT 112.8 (p=0.001 — rejected), Arruda 76.9 (p=0.48), Lee 91.5 (p=0.14), Mn-Dir1 61.5 (p=0.91 — best), Mn-Dir2 77.2 (p=0.50). Entropy: all models similar, all more informative than trivial (1/3,1/3,1/3).

## 8. Code / data availability
None stated (R used for analysis).

## 9. Leakage & limitations
Arruda uses 12 months of data including other championships — comparison favours it; authors restrict to second-half to compensate but the handicap is real. Grêmio example shows priors built on only ~19 matches — thin. W/D/L counts discard all goal information, so the model cannot estimate team quality on attack/defence dimensions or predict scores. i.i.d. assumption ignores form dynamics within the second half (posterior updates partially mitigate). No market-odds benchmark — comparison is model-vs-model only. Soccer 3-way outcome; NFL adaptation needs re-derivation for spread/total or moneyline.

## 10. GSE overlap
Existing-research-map covers Bradley–Terry, Elo, and calibration work; no multinomial-Dirichlet baseline found. This is a new minimum-viable Bayesian forecaster for the win_spread_total lane — simpler than anything in the map, with proper-scoring and calibration evidence. Extension, not duplicate.

## 11. GSE implementation spec
Build the NFL analogue as GSE's "simplest defensible forecaster": for each team, maintain Dirichlet posteriors over {cover, push, no-cover} (or {win, loss} for moneyline) from ATS results, split home/away, combined by linear opinion pooling of the two teams' predictive distributions with w fitted on a validation season. Use as (a) a calibration reference curve for the engine, (b) a prior for the full model, (c) a floor in the model-comparison harness — any engine upgrade must beat Mn-Dir on log loss before shipping. Effort: ~1 day.

## 12. Reproducible test
Dataset: NFL 2015–2024 ATS results. Protocol: first half of each season builds priors, predict second-half spreads; metric: mean log loss vs current GSE engine and vs trivial (1/3 each). Baseline to beat: Mn-Dir analogue must achieve log loss < 1.0986 (trivial) and within 0.05 of the engine — if the engine cannot beat this 12-line model by >0.05, the engine's complexity is unjustified.

## 13. Acceptance / rejection gate
Adopt as permanent GSE floor model if on 2020–2024 second-half ATS it beats the trivial forecaster on all three proper scoring rules with paired-test p<0.05; reject as floor if it fails to beat trivial in any season (indicating the count-only approach doesn't transfer to spread markets).

## 14. Improvement experiment
Replace the uniform D(1,1,1) prior with an empirical-Bayes prior estimated from league-wide ATS base rates per season, and fit the pooling weight w hierarchically per team-pair type (division vs non-division); test whether this closes the gap to the Arruda-equivalent (market-implied) benchmark on log loss.
