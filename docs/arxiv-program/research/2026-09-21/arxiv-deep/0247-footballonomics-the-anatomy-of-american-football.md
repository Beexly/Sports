# [0247] Footballonomics: The Anatomy of American Football — Evidence from 7 Years of NFL Game Data (arXiv:1601.04302v6)

**Citation:** Pelechrinis, K., & Papalexakis, E. (2016). *Footballonomics: The Anatomy of American Football. Evidence from 7 years of NFL game data*. arXiv:1601.04302v6 (v6, 2016-10-31; originally 2016-01). URL: https://arxiv.org/abs/1601.04302
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 2,282 lines through references).
**Verdict:** ADAPT — directly NFL-relevant and empirically grounded, but do not adopt the model as-is: the data are 2009–2015 (a stale rule environment — pre-2018 kickoff/helmet rules, pre-modern 2pt/PAT equilibrium), the nflgame API it was built on is long dead, and the features are basic box-score differentials GSE already computes in richer form. Adapt two things: (1) the FPM bootstrap prediction architecture — resample team performance vectors (block-correlated), push each through the win model, get a *distribution* over win probability plus a hypothesis-test pick rule, which GSE's calibration/Kelly lanes currently lack; (2) the quantified factor magnitudes (turnover differential dominates; pass-run balance r≈0.64 winning vs ≈0.80 losing) as sanity priors. The propensity-score schedule-strength adjustment was proposed but never implemented — it is a design sketch, not a result.

## 1. Research question
Do NFL coaches make rational (expected-points-maximizing) decisions? And which observable game factors move the probability of winning an NFL game — then can a simple descriptive model + statistical bootstrap predict winners?

## 2. Dataset / schema
NFL Game Center play-by-play via the Python `nflgame` API (BurntSushi/nflgame, accessed 2016-01-12 — now defunct), 2009–2015 seasons: 1,792 regular-season games (focus of analysis; 77 playoff games excluded for sample-size/parity reasons). Derived: 9,021 touchdowns (460 2-pt attempts, 8,561 XP attempts), 1,870 fourth-down conversion attempts, ~43,000 drives. Only 3 regular-season ties in the data (0.1%).

## 3. Method / model
1. **Rational-coaching test:** Hypothesis 1 — coaching decisions maximize expected points scored. Tested on PAT (extra point vs 2-pt conversion) and fourth-down decisions via mean-field approximations that model only consecutive-play interactions (failed 4th down → ensuing opponent field position), ignoring higher-order effects.
2. **Descriptive Bradley-Terry GLM:** Pr(T_i ≻ T_j) = e^{π_i−π_j}/(1+e^{π_i−π_j}) (1); π_i − π_j = Σ_r α_r(z_ir − z_jr) + U, U∼N(0,σ²) (2). Response W_ij = 1 if home team wins. Features (all home−away differentials): total offensive yards, penalty yards, turnovers, possession time, pass-to-rush yardage ratio r = pass yards/total yards (6), ΔSportsNetRank (network-based ranking capturing schedule strength). Intercept captures home advantage (all-zero features → Pr = 0.555).
3. **FPM prediction engine:** bootstrap module (resample each team's M_T performance matrix with replacement, B = 1,000; recency bias to last k = 5 games; block sampling of correlated columns like total yards + possession time), regression module (each resampled vector pair through the Bradley-Terry model → sets P_1, P_2 of win probabilities), statistical-test module (H_0: P̄_1 = P̄_2; reject → sign of difference picks the winner; α = 0.05). Predictions start Week 6; model trained on the other 6 seasons each year.
4. **Reverse-causality checks:** r-ratio tracked quarter-by-quarter (stable after Q1 — rejects reverse causation); turnover differential already favors eventual winners by end of Q3 (p ≪ 0.01).

## 4. Equations & assumptions
- PAT expected point differential: E[p] = 2·s_2pts − 1·s_kick (3).
- Fourth-down mean field: E[P+] = 6·s_4conv^{γ(l)} (4); E[P−] = 3·s_fg + (3·Δπ_fg + 6·Δπ_td) (5); γ(l) = (100−l)/29 (avg drive 29 yards); E[P] = E[P+] − E[P−].
- FPM hypothesis test: H_0: P̄_1 = P̄_2 (7); H_1: P̄_1 ≠ P̄_2 (8).
**Assumptions:** features valid only within observed ranges (r ∈ [0.3, 0.98] — the authors explicitly warn against extrapolating, e.g., r = 0 all-run is not implied optimal); descriptive correlations, not causal; mean-field ignores long-range game-state interactions; bootstrap assumes past-season game stats are exchangeable draws from the team's performance distribution (modulo recency bias).

## 5. Features / target
Descriptive: home-team win (W_ij). Predictive: same, but features are bootstrapped from the current season's prior games. Horizon: weekly NFL matchups, weeks 6–17 (+playoffs implicitly).

## 6. Validation design
10-fold CV of the Bradley-Terry model (84.03% ± 0.35% — conditional on true features, descriptive only). FPM evaluated season-by-season 2009–2015 vs a win-loss-percentage baseline; probability calibration via y=x check (quantized 5% bins, slope CI [0.76, 1.16], R² = 0.94). Weekly-accuracy trend regression.

## 7. Numerical results / baselines
- **PAT:** 2-pt success 51% (235/460), expected 1.02 pts vs XP 98.4% (8,425/8,561), expected 0.984 → E[p] > 0 favors 2-pt. 2015 rule change (XP from 15-yard line): XP success fell ~5% (p < 10^−6); 2-pt success unchanged (p = 0.4). Steelers/Bears had most to gain; Steelers attempted 11/45 TDs in 2015 (~25%).
- **Fourth down:** conversion rate 77.9% overall (89% on 4th-and-1, which is 55% of attempts; yardage-adjusted 73%); constant beyond own 35 (own-territory dip attributed to sampling bias — only 10% of attempts there). FG success 85.5% overall, sharp decline beyond 50 yards (11% of attempts). Failed conversion in opponent territory raises ensuing-drive score probability by only ~7% vs touchback. E[P] positive for >80% of field; mean +1.4 points/drive (p ≪ 0.01).
- **Paired winner-vs-loser differences (Table 2):** total yards +51.78***, penalty yards −3.29*, turnovers −1.04***, possession +211.79s***, r −0.06***, home win 56.03% ± 2.49%. Winners had fewer turnovers in ~80% of games (ECDF).
- **Bradley-Terry coefficients (Table 3):** intercept 0.22**, total yards 0.01***, penalty yards −0.02***, turnovers −1.05***, possession 0.0001 (n.s.), r −3.18***, ΔSportsNetRank 0.04***. Standardized (Table 5): turnovers −2.08, total yards +1.82, penalty −0.83, r −0.63, rank +0.55. Practical read: winning the turnover battle by 1 ≈ +20% win probability; 10-yard penalty differential ≈ 5%. Winning teams' r concentrated ≈0.64, losing teams' ≈0.80.
- **FPM accuracy:** 63.4% (SE 1.3%), beating the win-loss baseline every season by ~9% (Table 4: 0.55–0.72 per season). Comparable to Microsoft Cortana ~64.5% and ESPN FPI 63%; better than ~60% of sampled experts (ESPN/NFLN/CBS/FOX). Accuracy rises through the season (weekly slope 0.01, p < 0.05, R² = 0.41).

## 8. Code / data availability
Data via the nflgame API (GitHub link given; the API/project is defunct as of 2026 — data path not reproducible as written). No model code released.

## 9. Leakage & limitations
- **Stale era:** 2009–2015 predates the 2018 kickoff/helmet-contact rules, the modern 2-pt equilibrium (attempt rates have roughly tripled since 2015), and current offensive efficiency levels. The quantified coefficients are era-specific.
- **Descriptive features are post-game statistics** (total yards, turnovers) — the 84% CV accuracy is not a prediction result; only FPM's 63.4% is.
- **Reverse causality partially addressed** (quarter-by-quarter r, Q3 turnover gap) but the authors concede observational-data limits; situational football (garbage-time passing inflating yards/turnovers) contaminates box-score features.
- **Schedule strength unhandled in practice:** the propensity-score opponent adjustment is proposed in Discussion, never implemented or evaluated.
- **Defense underrepresented** (authors' own admission); no weather/roster/injury inputs — the output is explicitly framed as an "anchor" probability for expert adjustment.

## 10. GSE overlap
- **Covered:** Bradley-Terry is in the map (paper 0242/others); Elo/Glicko/TrueSkill families; calibration methods; basic box-score features overlap heavily with GSE's nflverse metrics and the engine-benchmark tables.
- **Novel vs map:** (a) the FPM bootstrap architecture producing a full distribution + CI over win probability with a hypothesis-test pick rule — the map's calibration lanes calibrate point probabilities, they don't bootstrap performance-vector uncertainty into probability intervals; (b) the quantified NFL factor hierarchy (standardized coefficients) as cross-check priors for GSE's own feature importance; (c) the y=x quantized-bin calibration validation protocol, a clean template for GSE's probability-accuracy audits.

## 11. GSE implementation spec
1. Replicate FPM's architecture on GSE's stack: for each team, maintain the season's per-game feature matrix M_T (nflverse-derived, richer than the paper's six features); bootstrap B = 1,000 correlated performance vectors with recency weighting; push each pair through GSE's existing win-probability model; output the mean, 95% CI, and the H_0: P̄_1 = P̄_2 test as the pick/no-pick gate.
2. Use the resulting probability CI — not the point estimate — as the Kelly input: size by the lower confidence bound for conservative bankroll growth, or by CI width as an uncertainty penalty (directly addresses the Kelly-under-uncertainty priority gap).
3. Recalibrate the descriptive factor hierarchy on 2020–2025 data (the paper's coefficients are stale); use the standardized magnitudes (−2.08 turnovers etc.) only as priors/sanity checks.
4. Implement the paper's *proposed but unbuilt* propensity-score opponent adjustment: bias resampling toward past opponents similar to the upcoming opponent on defensive features — this fixes the paper's admitted schedule-strength hole.

## 12. Reproducible test
- **Data:** nflverse 2020–2025 play-by-play + game results.
- **Test 1 (architecture):** build the bootstrap engine with GSE's current win model; confirm the output CI contains the point estimate and that CI width correlates with upset frequency (wider CI → more upsets in that bin).
- **Test 2 (calibration):** run the paper's y=x quantized-bin check on the bootstrap means; require slope CI covering 1 with R² ≥ 0.9, else the uncertainty layer is miscalibrated and not shippable.
- **Test 3 (decision value):** backtest Kelly sizing with the lower-confidence-bound probability vs point-estimate Kelly over 2020–2025; the uncertainty-penalized variant must show better worst-season drawdown to justify the added complexity.

## 13. Acceptance / rejection gate
ADAPT gate: (a) Test 2 calibration must hold on modern data — if the bootstrap means fail the y=x check, the architecture is rejected regardless of Test 1; (b) the factor hierarchy must replicate directionally on 2020–2025 data (turnovers dominant, r-balance signal present) — if not, the era shift is too large and only the architecture (not the magnitudes) transfers; (c) nflgame is dead, so all replication runs on nflverse — any result that depends on a discontinued data source is dropped. If the bootstrap CI adds no sizing value over point estimates in Test 3, downgrade to REJECT-the-architecture but keep the calibration protocol.

## 14. Improvement experiment
- Replace the paper's six box-score features with GSE's EPA/success-rate/proprietary metrics in M_T and test whether the bootstrap CI tightens (ablation: box-score-only vs EPA-rich).
- Implement the propensity-score opponent-similarity resampling and A/B it against plain recency-weighted bootstrap — the paper's own suggested upgrade, never tested.
- Swap the mean-difference hypothesis test for a direct P(P_1 > P_2) computation from the bootstrap joint distribution — a cleaner pick rule that also yields a natural "pass" threshold for low-confidence games.
