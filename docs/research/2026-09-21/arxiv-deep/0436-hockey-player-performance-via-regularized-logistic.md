# [0436] Hockey Player Performance via Regularized Logistic Regression (arXiv:1510.02172v2)

**Citation:** Gramacy, Taddy & Tian (2013/2015 chapter version). *Hockey Player Performance via Regularized Logistic Regression.* arXiv:1510.02172v2. URL: https://arxiv.org/abs/1510.02172v2
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 3663 lines).
**Verdict:** ADAPT — the L1-regularized logistic adjusted plus-minus (partial PM/PPM/PFP) framework transfers directly to NFL player-level attribution (EPA/WPA per snap); NHL specifics do not.

## 1. Research question
How to estimate a *partial* player effect — a player's contribution to scoring controlling for teammates, opponents, team-season, and game situation — in the high-dimensional, highly imbalanced setting where standard MLE fails (median on-ice configuration lasts ~8 seconds; ~2,500 players, tens of thousands of goals). Secondarily: do goal-based or shot-based (Corsi/Fenwick) partial effects better match market value (salary)?

## 2. Dataset / schema
- NHL play-by-play from nhl.com, 11 seasons 2002-03 through 2013-14 (2004-05 lockout excluded), regular + playoffs: p = 2,439 players, n = 69,449 goals; Corsi events n_c = 1,329,679; Fenwick n_f = 1,034,154.
- Responses: y_i = +1 home team scored goal i, −1 away (symmetric logit; goalies included, unlike raw PM). Corsi/Fenwick analogues replace y.
- Covariates: player-presence indicators x_ij ∈ {−1(home), 0, +1(away)} (12 nonzero per full-strength goal); team-season indicators u_i; special-teams indicators v_i (6 non-6v6 settings + pulled-goalie; >35% of goals on special teams); player×season and player×playoff interactions.
- Salaries: blackhawkzone.com + hockeyzoneplus.com; 80% of player-seasons (nearly all with more than a couple goals).

## 3. Method / model
Logistic regression on "which team scored goal i" (Equation 1):
log[q_i/(1−q_i)] = α + u_i′γ + v_i′φ + x_i′β_0 + (x_i ∘ s_i)′(β_s + p_i β_p).
Full model K ≈ O(p). Estimation: L1 (lasso) penalized negative log-likelihood (Equation 4), penalizing ONLY player effects (β_0, β_s, β_p); team-season (γ) and special-teams (φ) unpenalized to fully remove confounding. Penalty λ chosen by corrected AICc (analytic, deterministic; preferred over CV). gamlr R package with standardize=FALSE (so low-ice-time players are not up-weighted). Stepwise AIC/BIC rejected (takes days, unstable, overly sparse). Derived metrics: partial for-% PFP_sj = (1+exp[−β_0j−β_sj])^−1 (Eq 5); partial plus-minus PPM_sj = g_sj(1−2·PFP_sj) (Eq 6), same scale as PM but controlling confounders. Fully Bayesian reglogit (Gibbs, Polson data augmentation) discussed for posterior intervals/team construction under budget constraints.

## 4. Equations & assumptions
- NLL: l(η;y) = Σ log(1+exp[−y_i η_i]) (Eq 3); penalized objective l + nλΣ_j(|β_0j|+|β_sj|+|β_pj|) (Eq 4); AICc = 2Σl(η̂_λ;y) + 2kn/(n−k−1).
- PFP_sj = (1+exp[−β_0j−β_sj])^−1; PPM_sj = g_sj·PFP_sj − g_sj(1−PFP_sj) = g_sj(1−2·PFP_sj), with g_sj goals player j was on ice for.
- Laplace prior ≡ L1 penalty; MAP ≡ posterior mode.
- Assumed: conditional independence of goal events; goals only counted (not possession/time); season-innovation sparsity (β_s, β_p → 0 without evidence); team-season effects absorb coaching/fans; home ice α.

## 5. Features / target
Inputs: on-ice player configuration per goal (±1 indicators), team-season, special-teams scenario, season/playoff. Target: which team scored the goal (binary). Extensions: same apparatus applied to Corsi/Fenwick event indicators.

## 6. Validation design
No formal train/test split; validation is (a) AICc path selection (in-sample penalized-likelihood model choice), (b) comparison against marginal PM/FP rankings and against [12]'s no-confounder model, (c) external validation via salary correlation (Bayesian tree regression of log salary on metric), (d) sensitivity: player rankings with/without special-teams and team-season controls. All 10,000+ player-seasons pooled across 11 seasons with season interactions. Notable: all playoff innovations β̂_pj = 0 — no evidence of clutch players.

## 7. Numerical results / baselines
- Top player-season by goals-PPM: Forsberg 2002-03, 55.5 (~25% above Crosby 2009-10, 43.5); Crosby holds 4 of top-10. Bottom: Niclas Havelid −65.94 (2005-06 ATL), Bouwmeester −69.62.
- Rankings change dramatically vs [12] (no team-season control): Crosby drops out of top 5 per-season when special-teams effects are omitted (penalty-kill time confounds). Goalies' PPM collapse once team-season effects are controlled (they act as team surrogates).
- Goal vs Corsi rankings differ dramatically: Daniel Sedin tops Corsi-PPM (615.14, 2010-11) but ranks 152nd in goals-PPM (19.45). Authors: troubling for Corsi-only analysis since only goal differentials win games.
- Salary: PPM more correlated with salary than PM; goals-based metrics more salary-correlated than Corsi-based; PFP>0.5 cleanly predicts high salary vs marginal FP peaking near 0.5. Highest value 2013-14: Ondrej Palat, 58.27 goals-per-million ($500k salary, 7th-round pick, rookie-of-year nominee).

## 8. Code / data availability
Code: https://github.com/TaddyLab/hockey (R, gamlr). Data: nhl.com play-by-play; salaries from blackhawkzone.com / hockeyzoneplus.com.

## 9. Leakage & limitations
Adversarial read: (1) No out-of-sample prediction test — AICc selection is in-sample; claim of "high-quality estimates" rests on face validity and salary correlation, not holdout log-loss. (2) L1 point estimates have no uncertainty; credible intervals deferred to reglogit not run here. (3) Post-selection inference problem: ranking top/bottom player-seasons by PPM after shrinkage is selection-biased. (4) Goal events treated as independent — ignores score effects, within-game correlation, empty-net asymmetry (only a pulled-goalie indicator). (5) 11-season pooling with season interactions risks survivorship/selection bias; lockout season gap. (6) Salary correlation as validation is confounded (salary ← past performance ← PM itself; rookie contracts distort). (7) Corsi vs goals comparison is qualitative, not a head-to-head predictive test. For NFL transfer, the equivalent limitation: play-level logistic on "which team scored next" would need down/distance/score controls the hockey model lacks.

## 10. GSE overlap
Directly relevant: the map's player-attribution lane contains nflWAR (wins above replacement) as the incumbent NFL player-value framework, and team-strength hierarchical models; no repo work implements a regularized per-snap adjusted plus-minus for NFL. The paper's method (L1 logistic on event outcomes with player-presence indicators, unpenalized team/situation controls) is the natural complement/competitor to nflWAR for GSE's props and player-valuation content. Status: **extension** — new estimation technique for an existing lane (player value), not a duplicate.

## 11. GSE implementation spec
1. NFL analogue: logistic regression on "which team scores next touchdown/field-goal event" (or EPA>0 on a play) with indicators for the 22 on-field players (from nflverse roster/snap data or charting), unpenalized team-season + down/distance/score/field-position controls, L1-penalized player effects.
2. Derive NFL PFP (probability team's event given player on field) and partial-PM on the EPA scale: PPM_j = snaps_j × (2·PFP_j − 1) × avg EPA per event.
3. Validate against nflWAR: correlation, and head-to-head in predicting next-season team performance / player salary (cap hit) like the paper's salary test.
4. Deliverable: weekly "true contribution" leaderboard for GSE content (props angle: players whose market perception diverges from partial effect).
Estimated effort: 4–5 days (snap-player matrix construction is the heavy lift).

## 12. Reproducible test
Dataset: nflverse 2020–2025 play-by-play with participation (where available) or 22-man proxies from depth charts. Metric: out-of-sample log-loss on next-score events (2024–2025 holdout) for L1-adjusted model vs raw on/off EPA differential; plus salary (cap hit) correlation comparison vs nflWAR components. Test: does the partial-effect ranking beat raw on/off and nflWAR at predicting 2025 team offensive efficiency for traded/free-agent movers (the "different team" prediction the paper claims as the key advantage)?

## 13. Acceptance / rejection gate
ADOPT the L1 partial-PM as a GSE player metric if on the mover test (players changing teams 2024→2025) partial-PM predicts 2025 team EPA/play contribution better (higher R² or rank correlation) than raw on/off EPA and matches or beats nflWAR; REJECT if the high-dimensional logistic underperforms simple on/off differentials out-of-sample (NFL's 11-man units and play-type heterogeneity may defeat the hockey transfer).

## 14. Improvement experiment
Beyond the paper: (1) gamma-lasso (diminishing-bias penalty, per Taddy [30]) to avoid over-shrinking stars — directly addresses the paper's own caveat about Crosby/Datsyuk; (2) fully Bayesian reglogit-style posterior for credible intervals on player rankings (the paper's deferred extension); (3) position-group hierarchical priors (QB effects drawn from a QB distribution) instead of flat Laplace — an NFL-specific structural improvement the hockey paper didn't need.
