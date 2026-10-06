# [0571] Ratings of European and South American Football Leagues Based on Glicko-2 with Modifications (arXiv:2310.11459v1)

**Citation:** Andrei Shelopugin, Alexander Sirotkin (2023). *Ratings of European and South American Football Leagues Based on Glicko-2 with Modifications*. arXiv:2310.11459v1. URL: https://arxiv.org/abs/2310.11459v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1515 lines).
**Verdict:** ADAPT — the four modifications (softmax draw probability with bias correction, separate pandemic-era home advantage, promotion/relegation rating initialization and season-start drift, post-season normalization) port directly to an NFL Glicko-2 team-strength model; the soccer club tables are irrelevant, and the LightGBM draw-probability feed is replaced by GSE's own draw/total models.

## 1. Research question
How to compute comparable strength ratings for clubs in European and South American first and second divisions (solving the league-strength-transfer problem for player scouting: how does player performance change moving between leagues?) using a Glicko-2 rating system modified to handle draws, home-field advantage, promotion/relegation transitions, and rating inflation — plus a gradient-boosting (LightGBM) Poisson goal-count model as a prediction baseline.

## 2. Dataset / schema
- ~366,000 matches, seasons 2010/2011–2022/2023, scraped from flashscore.com: first and second leagues of Europe and South America + national cups + international tournaments (Champions League, Copa Libertadores). Matches involving third-division-or-lower teams and forfeit-decided matches excluded.
- Features per team-match row: home/away flag; pandemic-period flag; average goals scored in last 5/10/20/30 matches; average opponent goals conceded in last 5/10/20/30; tournament (categorical); team/opponent league (categorical); average/median home (or away) goals in last 5/10/20/30; average/median opponent away (or home) goals conceded in last 5/10/20/30.
- Train: 2010/2011–2020/2021; test: 2021/2022–2022/2023 (60,091 matches). Split is season-blocked (time-ordered), not random.
- Access: proprietary scrape, no public URL. Dataset not shared.

## 3. Method / model
- Baseline: LightGBM with objective "poisson" predicting each team's goal count; win/draw/loss derived via the Skellam PMF: p(k,μ1,μ2) = exp(−(μ1+μ2))·(μ1/μ2)^(k/2)·I_k(2√(μ1μ2)) (k>0 = team 1 wins, k=0 draw, k<0 team 2 wins). CatBoost also tried, inferior.
- Rating model: Glicko-2 with four modifications: (a) draw-aware expected-outcome function E(μ,μ_j,φ_j,d,s) = exp(g(φ_j)(μ−μ_j)) / (1 + exp(g(φ_j)(μ−μ_j)) + exp(d+s)), where s = draw probability from the LightGBM model and d = hyperparameter correcting Poisson underestimation of low-scoring (draw) matches (Dixon–Coles style bias, ref [13]); (b) home-team advantage h added inside the expectation, μ' = μ + φ'^2 g(φ_j)(s_j − E(μ+h, μ_j, φ_j, d, s)), with separate h_p for the pandemic period (March 2020–June 2021) and constraint h > h_p; (c) per-season rating initialization r(μ_init + μ_new, φ, σ) for promoted teams (μ_new < 0 penalizes entrants whose pre-2010 history implies sub-average strength) and r(μ_init, φ, σ) otherwise; (d) mid-season transfer-window uncertainty via φ + φ_s, league-change drift μ + μ_l (μ_l > 0 promoted, < 0 relegated), and post-season normalization holding the global mean rating constant (anti-inflation).
- All parameters trained per league by minimizing log-loss of match outcomes: {μ_init, μ_new, μ_l, φ_s, h, h_p, φ, σ, d}.

## 4. Equations & assumptions
- Skellam PMF (Eq. 1): p(k,μ1,μ2) = exp(−(μ1+μ2))·(μ1/μ2)^(k/2)·I_k(2√(μ1μ2)), I_k modified Bessel function; k = score difference.
- Original Glicko-2 expectation (Eq. 2): E(μ,μ_j,φ_j) = 1 / (1 + exp(−g(φ_j)(μ−μ_j))).
- Modified expectation with draw (Eq. 3): E(μ,μ_j,φ_j,d,s) = exp(g(φ_j)(μ−μ_j)) / (1 + exp(g(φ_j)(μ−μ_j)) + exp(d+s)); s = LightGBM draw probability, d = bias hyperparameter.
- Modified home update (Eq. 5): μ' = μ + φ'^2·g(φ_j)·(s_j − E(μ+h, μ_j, φ_j, d, s)); pandemic constraint (Eq. 6): h > h_p.
- Promotion initialization (Eq. 7): r(μ,φ,σ) = r(μ_init+μ_new, φ, σ) if promoted, else r(μ_init, φ, σ); μ_new < 0.
- Season-start update (Eq. 8): r(μ+μ_l, φ+φ_s, σ) if team changed league, else r(μ, φ+φ_s, σ); φ_s > 0, μ_l signed by promotion/relegation.
- Assumptions: team strength roughly stable within a season (paper's own stated limitation); per-league (not per-team) parameters to avoid overfitting; Poisson goal model biased on low scores hence the d term; μ_init ≈ league average rating; post-season global-mean normalization is arbitrary but prevents inflation.

## 5. Features / target
- LightGBM: home flag, pandemic flag, rolling goal means (5/10/20/30) scored and opponent-conceded, tournament/league categoricals, home/away-split rolling means and medians (5/10/20/30).
- Glicko-2: match outcome only (win/draw/loss encoded in s_j) + home/pandemic flags + league-change metadata + the LightGBM draw probability s as a plug-in parameter.
- Target: match outcome (3-way) evaluated by log-loss; secondary output: club and league strength tables (summer 2023, Appendix Tables III–VI).

## 6. Validation design
- Time-ordered season-blocked split: train 2010/11–2020/21, test 2021/22–2022/23 (60,091 matches) — no leakage across the split boundary.
- Baselines compared on test log-loss: CatBoost (0.5931), LightGBM (0.5896), original Glicko-2 (0.5949), modified Glicko-2 (0.5832).
- Metric: 3-class log-loss only. No accuracy, no calibration plots, no betting-simulation, no ablation of the individual modifications.

## 7. Numerical results / baselines
Quoted exactly from the paper (Table I, test set of 60,091 matches):
- CatBoost-based: log-loss 0.5931
- LightGBM-based: log-loss 0.5896
- Original Glicko-2: log-loss 0.5949
- Glicko-2 with modifications: log-loss 0.5832 (best; Δ ≈ 0.0064 vs LightGBM, ≈ 1.1% relative)
- Interpretation table (Table II, approximate, average φ_j and s): rating difference 0 → win 35.7 / draw 28.6 / loss 35.7; difference 100 → 49.9 / 25.7 / 24.3; 200 → 63.8 / 20.5 / 15.7; 500 → 90.5 / 6.0 / 3.5; 800 → 98.1 / 1.2 / 0.7.
- Club tables (summer 2023): Man City 2237.7 (top Europe), Palmeiras 1961.0 (top South America). League top-5 averages: England 2118.8, Germany 2069.9, Italy 2064.0, Spain 2039.4, Portugal 2000.7; Brazil 1868.4, Argentina 1779.9, Paraguay 1743.8.
- Claim: "the Glicko-2 based approach exhibits a marginally superior level of accuracy when compared to the commonly used Poisson regression-based approach" and ratings are more interpretable.

## 8. Code / data availability
Implementation: github.com/andreyshelopugin/GlickoSoccer. Data: proprietary flashscore.com scrape, not shared.

## 9. Leakage & limitations
- The draw probability s is fed from the LightGBM model trained on the SAME matches used to fit the Glicko-2 parameters — the LightGBM features include rolling goal averages that overlap the Glicko training data; no leakage firewall described between the s-producer and the Glicko consumer. s is computed on the same match corpus it was trained on (no stated out-of-fold scheme).
- No ablation: which of the four modifications (draw, HFA, promotion init, inflation normalization) drives the 0.0064 log-loss gain is unknown — could be almost entirely the draw term.
- Test set is two seasons of soccer; the 0.0064 gain is statistically unquantified (no SEs/CIs) — plausibly noise.
- "Stability within season" assumed but second-division teams "frequently experience significant roster changes" (paper's own admission).
- Cross-continent comparison (Europe vs South America) admitted as impossible with this data — the league-strength question the paper opened with is unanswered at the intercontinental level.
- NFL transfer: soccer draw handling doesn't map (no draws in NFL); but the home-advantage-inside-expectation, season-start uncertainty bump, and anti-inflation normalization DO map.

## 10. GSE overlap
Extension, not duplicate. Per existing-research-map.md: Glicko is only "mentioned" in the 26-metric catalog (2026-09-17), dynamic Elo and Kalman/particle filters cover the state-space lane, and TrueSkill is mentioned — but no Glicko-2 implementation exists in the repo and none of the four modifications (draw-aware expectation, regime-dependent HFA, promotion-drift initialization, mean normalization) has been tried. Closest existing: Hermes's opponent-adjusted EPA (in flight, Gmail thread) and the 2026-09-17 gse-lab metric family. The modifications are a genuinely new capability for GSE's team-strength lane.

## 11. GSE implementation spec
- Implement Glicko-2 on NFL (nflverse 2002–2025): standard μ/φ/σ with these paper-ported modifications: (a) home advantage h added inside the expectation function (tune h; no pandemic split — replace with a COVID-era 2020 flag if fitting that season); (b) season-start update: φ += φ_s and μ += μ_l for teams with ≥40% roster turnover (free-agency/draft churn proxy for the paper's league-change drift); (c) post-season normalization of the league mean to a fixed constant; (d) skip the draw term (NFL has no draws — the exp(d+s) term drops out, simplifying to standard Glicko-2).
- Drop the LightGBM Poisson baseline entirely (soccer goals don't transfer); compare Glicko-2 log-loss against GSE's existing Elo/nfelo baseline on the same games.
- Output: per-team (μ, φ) each week — φ (rating deviation) is the new uncertainty signal GSE lacks in its current point ratings.
- Effort: ~3 days (Glicko-2 core + 3 modifications + per-league-equivalent hyperparameter search via train/valid log-loss on 2002–2020, test 2021–2025).

## 12. Reproducible test
- Dataset: nflverse 2002–2025 regular-season games (n ≈ 5,700); train 2002–2016, validation 2017–2020, test 2021–2025 (time-ordered).
- Metric: log-loss of implied win probability on the test block.
- Baseline 1: paper's unmodified Glicko-2 on the same split. Baseline 2: GSE's existing Elo-style rating (fixed formula) as win-prob source.

## 13. Acceptance / rejection gate
- ADOPT modified Glicko-2 if it beats BOTH baselines by ≥0.004 mean log-loss on the 2021–2025 test block, with the gain robust when 2020 (COVID season) is excluded.
- ADAPT if it beats only one baseline — keep the winning modification subset (e.g., HFA-in-expectation only).
- REJECT if it beats neither — Glicko-2 adds nothing over GSE's existing ratings.

## 14. Improvement experiment
- Run an ablation the paper never did: toggle each modification (HFA-in-expectation, season-start φ-bump, roster-turnover drift μ_l, mean normalization) independently on the NFL test block to attribute the log-loss gain. Then try a team-specific h_i (home advantage per team, e.g., altitude Denver) — which the paper rejected for overfitting on soccer — with hierarchical shrinkage across the 32 teams; test whether shrunken per-team HFA beats the pooled h on the §13 gate.
