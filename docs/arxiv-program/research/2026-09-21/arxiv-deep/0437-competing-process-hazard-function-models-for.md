# [0437] Competing Process Hazard Function Models for Player Ratings in Ice Hockey (arXiv:1208.0799v2)

**Citation:** Thomas, Ventura, Jensen & Ma (2012/2013). *Competing Process Hazard Function Models for Player Ratings in Ice Hockey.* arXiv:1208.0799v2. URL: https://arxiv.org/abs/1208.0799v2
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 4655 lines).
**Verdict:** ADAPT — the competing-process (Cox/semi-Markov) framing of scoring rates and the separate offensive/defensive player ratings (MESH) offer a principled way to model NFL drive outcomes as competing scoring processes; the NHL data and 60-processor-hour MCMC are not directly reusable.

## 1. Research question
Can player ratings with a meaningful game-outcome interpretation (changes in scoring *rate*) be estimated for hockey, where scoring is rare (~10 min between goals) and 98% of shift-intervals have zero goals, by modeling each team's scoring as its own semi-Markov process with player-modulated hazard functions — yielding separate offensive and defensive ratings that account for teammates, opponents, and game situation?

## 2. Dataset / schema
- NHL shift-level data, 2007-08 through 2011-12 seasons, full-strength (5v5 + goalie) only. Intervals end at a substitution or a goal: 10,935 away goals / 1,301,799 no-goal changes / 11,981 home goals; 98.27% of 1,324,715 events are non-goals.
- Outcome Y ∈ {1 (home goal), 0 (no goal, censored by substitution), −1 (away goal)}, observed time T = min(t, T^h, T^a), t = censoring (substitution) time.
- Predictors: player indicators for home/away on-ice sets, team indicators, game-score differential (winning/tied/trailing intercepts).
- 80/20 train/holdout split by games (uniform random); CV within training for tuning.

## 3. Method / model
Two competing Cox processes: h(X,t) = h_0(t)·h_1(X) with h_0(t) = 1 (flat). Scoring rates:
λ^h = exp(r^h + Σ_p(X_p^h ω_p + X_p^a δ_p)); λ^a = exp(r^a + Σ_p(X_p^a ω_p + X_p^h δ_p)),
where (ω_p, δ_p) = offensive/defensive contribution of predictor p (zero = average). Likelihood = product of censored competing-risk likelihoods via survival functions S_h, S_a.
Shrinkage two ways: (a) full hierarchical Bayes — Laplace-Gaussian (elastic-net-style) priors with partial pooling by position (center/wing/defense/goalie), group-level (λ_g, σ²_g) estimated; Gibbs/Metropolis MCMC in R+C++, validated by posterior quantiles (Cook et al.); (b) penalized MLE (Lasso, λ=8 chosen out-of-sample) for selection tasks: per-team MVP/LVP relative to team average, and player-pair "chemistry" interactions among top-1000 co-played pairs. DIC for in/out-of-sample model comparison. Derived: MESH rating = ω_p − δ_p (Mean Even Strength Hazard); net goals G_net = [(exp(r_base+ω_p)−exp(r_base)) − (exp(r_base−δ_p)−exp(r_base))] × T_total,p with r_base = −7.3 (~2.4 goals/60 min).

## 4. Equations & assumptions
- Hazards and likelihood as above; Y censoring assumed independent of event times conditional on predictors (authors flag this as "clearly incorrect" but approximately benign — Fig 6).
- Laplace-Gaussian prior pdf: f(x|λ,σ²) ∝ exp(−σ²λ²/2 − λ|x| − x²/(2σ²)).
- Net MESH: ω_p − δ_p; rating 0.1 ≈ 0.3 goals/game differential.
- Assumed: flat baseline hazard (no puck-location/time dependence — listed as future work); player ability constant across five seasons (no career curves); goaltenders defense-only; team effects omitted in grand player model to avoid goalie collinearity.

## 5. Features / target
Inputs: on-ice player sets per shift (home/away), interval duration, team identities, score differential. Target: (Y, T) — which team scored (or censoring) and when. Pair-interaction extension: indicators for 1000 most-coincident player pairs.

## 6. Validation design
- 80/20 game-level train/holdout per season; tuning by CV within training; DIC in- and out-of-sample for prior-family comparison (L1/L2/L1+L2).
- Out-of-sample doubled negative log-likelihood: Score < Team < Player models in all five seasons (e.g., total 76416 / 76397 / 76087).
- Adequacy check: simulate withheld seasons from posterior means; true home/away goal totals fall inside 95% simulated intervals every season for all three models.
- Lasso penalty λ=8 chosen by out-of-sample likelihood (best in 3/5 seasons); pair penalty λ_pair=8.5 by CV (247 nonzero of 2000 pair params, 221 unique pairs).

## 7. Numerical results / baselines
- Home-ice advantage confirmed every season; scoring rates elevated (equally for both teams) when the game is not tied — teams play more cautiously when tied.
- Team effects: only 2 of 150 team-seasons significantly non-zero (2012 Bruins, 2010 Capitals); Laplace-Gaussian beats L1/L2 on DIC in every season, in- and out-of-sample.
- Players (grand model, 1,592 players): only 37 have 95% credible intervals excluding zero for net MESH (36 positive, 1 negative — Stephane Veilleux). Top: Datsyuk 0.463 (39.5% P(best center)), Crosby 0.388, H. Sedin 0.355; goalie Lundqvist 0.186 (36% P(best)); best defenseman Chara 0.077 with CI crossing zero.
- Position structure: forwards carry offensive variability, defensemen little; skater defensive variability << offensive (goalie absorbs defense); centers affect defense more than defensemen do; offense/defense estimates ~uncorrelated.
- G_net top-20: Lundqvist 127.8 (goalie, time-driven), Datsyuk 119.6, H. Sedin 100.7, Ovechkin 94.63; top defenseman Chara ranks 81st (23.47).
- Pair chemistry: best Boyes–McClement +0.393; worst Kovalchuk–White −0.545 (wiped out their positive individual ratings); Crosby–Malkin −0.283 (defensive liability together). Adding pairs flips #1 from Datsyuk to Crosby.
- MVP/LVP per team per season via Lasso cascade (e.g., 2011-12: Eberle EDM +0.407; Carter NJ −0.338). Faceoff specialists (Steckel) spuriously penalized on offense — flagged as zone-start confounding.

## 8. Code / data availability
No public code link stated; sampler hand-built in R with C++ backend. Data: NHL game logs 2007-2012 (shift-level reconstruction per Macdonald 2011). Supplementary material referenced (full ratings, MVP/LVP tables) — not verified present.

## 9. Leakage & limitations
Adversarial read: (1) Computation is extreme — 60 processor-hours for 200k outcomes × 2600 covariates; the authors themselves flag this as a barrier to adoption. (2) Player ability constant over five seasons — no aging/career curves, acknowledged as future work; biases long-window ratings. (3) Censoring independence assumption admitted false (shifts ending in goals are longer); the bias correction is deferred to puck-location modeling. (4) Flat baseline hazard h_0(t)=1 discards all within-shift dynamics (faceoff effects, zone pressure); the "garbage goal" down-weighting is speculative. (5) Only 5v5 even strength — power plays (where much scoring happens) excluded as "not obviously" modelable. (6) Team effects dropped from the grand player model for goalie collinearity — so "cross-team comparison" claim rests on an incomplete specification. (7) Only 37/1592 players significant — the method mostly says "can't tell"; honest but limits practical use. (8) Faceoff-specialist confounding (zone starts) contaminates offensive ratings. (9) Pair-interaction selection has no uncertainty quantification (Dawid 1994 selection paradox cited by authors). NFL transfer caveat: football plays are discrete with rich state (down/distance), so a continuous-time hazard framing is less natural than a discrete drive-outcome model — but the *competing processes* idea maps well to drive outcomes (TD vs FG vs punt vs turnover as competing risks).

## 10. GSE overlap
Relevant to the map's player-attribution lane (nflWAR) and game-state modeling: no repo work frames NFL scoring as competing stochastic processes with separate offensive/defensive player contributions, nor estimates player-pair chemistry effects. The MESH concept (offense/defense separated ratings in rate units) is a genuine alternative to nflWAR's wins-based attribution. Note paper 8 (0436, Gramacy et al.) is the direct predecessor/comparator — the two ledgers should be read as a pair: 0436 = fast L1 logistic on goal events; 0437 = slower but richer competing-process model with uncertainty. Status: **extension** — new modeling paradigm for player attribution, complementary to 0436.

## 11. GSE implementation spec
1. NFL competing-risk analogue: model each drive as competing processes — offense scores TD / kicks FG / punts / turns over — with player-modulated hazards (or multinomial logistic per drive/play as the discrete-time equivalent, which avoids the MCMC cost).
2. Separate offensive and defensive player ratings: offensive skill raises own-team scoring rate, defensive skill lowers opponent's — directly addresses props questions like "which WRs beat man coverage" vs "which corners suppress".
3. Start with the cheap version: penalized multinomial logistic on drive outcomes with player-presence indicators (22 players), team-season unpenalized, Laplace-Gaussian/elastic-net penalty tuned out-of-sample — the paper's Lasso path without the 60-hour MCMC.
4. Pair chemistry: test top co-played NFL pairs (QB-WR, CB-WR matchups) for interaction effects beyond individual ratings.
Estimated effort: 5–7 days (drive-outcome dataset + penalized multinomial + pair selection).

## 12. Reproducible test
Dataset: nflverse 2020–2025 drives/plays with participation data. Metric: out-of-sample log-likelihood on drive outcomes (2024–2025 holdout) for player-competing-risk model vs team-only model vs nflWAR-based prediction; plus offense/defense separation sanity (correlation of ω/δ with PFF-style grades if available). Test: does the player-level competing-outcome model beat the team-only model out-of-sample (the paper's Table 4 test), and do QB-WR pair interactions survive penalized selection?

## 13. Acceptance / rejection gate
ADOPT the competing-outcome player-rating framework if the player-level model beats the team-only baseline on 2024–2025 holdout drive-outcome log-likelihood by a margin exceeding the paper's relative gain (~0.4% doubled-NLL improvement, scaled) AND at least 20 player effects (or 5 pair interactions) are selected with stable signs across 2023–2024/2024–2025 splits; REJECT if player effects add no out-of-sample lift over team strength (the paper's own warning that information is "quite small" may bite harder in the NFL's 17-game seasons).

## 14. Improvement experiment
Beyond the paper: (1) discrete-time competing risks per play (multinomial: TD/FG/first-down/punt/turnover) instead of continuous-time hazards — fits football's discrete structure and kills the MCMC cost; (2) time-varying baseline hazard within drives using down/distance/field position as the "puck location" analogue the authors wanted; (3) career-curve/aging structure on player abilities across seasons, which the authors explicitly deferred; (4) special-teams-inclusive model (the paper excluded power plays; the NFL analogue — 4th-down/fake situations — is exactly where GSE finds edge).
