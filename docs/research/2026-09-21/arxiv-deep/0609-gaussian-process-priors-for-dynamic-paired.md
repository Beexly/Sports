# [0609] Gaussian Process Priors for Dynamic Paired Comparison Modelling (arXiv:1902.07378v1)

**Citation:** Martin Ingram (2019). *Gaussian Process Priors for Dynamic Paired Comparison Modelling*. arXiv:1902.07378v1. URL: https://arxiv.org/abs/1902.07378v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 2188 lines).
**Verdict:** ADAPT — the GP-with-covariates replacement for Markovian Elo/Glicko dynamics is worth porting to GSE's team-rating layer (Matérn time kernel × context covariate kernel, e.g. QB-change/weather/dome), with the Laplace-approximation sparse-Cholesky inference recipe copied from the paper's GitHub.

## 1. Research question
Can a Gaussian Process (GP) prior over latent skills — which relaxes the Markovian conditional-independence assumption of Elo/Glicko and admits covariates naturally — beat Elo and Glicko at predicting ATP tennis match outcomes? The paper derives an efficient approximate-Bayesian inference procedure (Laplace approximation + sparse Cholesky), selects kernel hyperparameters by marginal-likelihood maximization (Bayesian optimization vs random search), and evaluates on the 2018 ATP season.

## 2. Dataset / schema
- ATP men's professional tennis, 2018 season as the evaluation set: 2,623 matches (tour level only; Davis Cup, ATP Next Gen Finals, Challenger and qualifying events discarded). Surface split: hard 1,072 / clay 810 / indoor hard 417 / grass 324.
- Fit iteratively from 2016 onward: to predict day d's matches, fit on all data up to day d; then roll forward day by day.
- Hyperparameter selection on 2016–2017 seasons (5,323 matches).
- Source: OnCourt software (http://www.oncourt.info/download.html). Not stated as downloadable from a public URL; the paper's GitHub is given for code (see §8).
- Schema: per match — date, player i, player j, winner, surface (one-hot, 4 surfaces).

## 3. Method / model
GP prior over each player's latent skill vector f_i with block-diagonal kernel K (independent players), combined with the Bradley–Terry logit likelihood P(y=1|f_i,f_j) = logit⁻¹(f_i − f_j). Posterior found via Laplace approximation: Newton's method on the mode, exploiting sparsity of the Hessian (only 4n nonzero entries in the 2n×2n likelihood Hessian), solved with sparse Cholesky (CHOLMOD via scikit-sparse). Predictions via the standard GP predictive mean/variance formulas with an extra Hessian-correction term. Hyperparameters (lengthscale, variance) chosen by maximizing the approximate log marginal likelihood with GPyOpt Bayesian optimization (bounds: σ ∈ (0.01,2), lengthscale ∈ (0.1,10), i.e., 30–3,000 days after the paper's /300 time rescaling), benchmarked against random search. Three kernel experiments: (1) single Matérn 3/2 on time; (2) Matérn 3/2 + Matérn 1/2 on time; (3) Matérn 3/2 on time × ARD-RBF kernel on one-hot surface covariates (6 hyperparameters).

## 4. Equations & assumptions
Bradley–Terry likelihood (paper Eq. 1): P(y=1|θ_i,θ_j) = 1/(1+e^(θ_j−θ_i)) = logit⁻¹(θ_i − θ_j).
GP prior (Eq. 6): P(f_i) = N(f_i | 0, K_i), [K_i]_jk = k(t_j,t_k) (Eq. 7). RBF kernel (Eq. 8): k(t,t′) = α² exp(−(t−t′)²/(2ρ²)).
Joint prior (Eq. 10): P(f|θ) = N(f|0,K), K block diagonal over players.
Likelihood (Eq. 11–12): P(y_i|f_{w(i)},f_{l(i)}) = logit⁻¹(f_{w(i)} − f_{l(i)}); P(y|f) = ∏ᵢ logit⁻¹(f_{w(i)} − f_{l(i)}).
Laplace approximation (Eq. 25): Q(f|y,θ) = N(f|f̂, H⁻¹), H = K⁻¹ − ∇∇ log P(y|f) (Eq. 18).
Predictive mean (Eq. 26): E_q[f*|X,y,x*] = k_*ᵀ K⁻¹ f̂; predictive variance (Eq. 27): V_q[f*] = k(x*,x*) − k_*ᵀ K⁻¹ k_* + k_*ᵀ K⁻¹ H⁻¹ K⁻¹ k_*.
Approx. log marginal likelihood (Eq. 28): log Q(y|θ) = log P(f̂|θ) + log P(y|f̂) + n log(2π) − ½ log|H| (n log(2π) dropped in practice).
Evaluation metrics (Eq. 29–30): log loss = −(1/n) Σᵢ [yᵢ log pᵢ + (1−yᵢ) log(1−pᵢ)]; accuracy = (1/n) Σᵢ [yᵢ I(pᵢ>0.5) + (1−yᵢ) I(pᵢ≤0.5)].
Assumptions (stated or implied): player skills are a priori independent across players; zero-mean GP prior; time rescaled by /300; Matérn 3/2 family chosen by experimentation; hyperparameters tuned once on 2016–2017 and frozen for 2018 (no online re-tuning); H positive definite (asserted, not proved).

## 5. Features / target
- Inputs: match dates (days between matches), surface one-hot covariates (4 surfaces, ARD RBF kernel).
- Target: binary match outcome (win/loss; no draws modeled). Prediction horizon: next-day forward iterative prediction of the 2018 season.
- Baselines: Elo (k tuned on training log-likelihood) and Glicko (initial σ and period variance tuned; period length 1 best), each fit from 2016 start and from 2002 start (longer start helps them).

## 6. Validation design
Time-ordered walk-forward validation: fit on all matches up to day d (starting 2016), predict day d+1, append, repeat through the 2018 season. Baselines fit two ways (2016 start vs 2002 start, per Kovalchik 2016 that earlier starts help Elo). Metrics: log loss and accuracy. Hyperparameters selected on 2016–2017, not refit during 2018. Speed test: fit time vs dataset size n on a 2017 MacBook Pro (3.1GHz i5, 16GB RAM), 10 repetitions each.

## 7. Numerical results / baselines
- Hyperparameter optimization (Fig. 4): Expt 1 single Matérn 3/2 — negative marginal log-likelihood ≈ 13116.8; optimum lengthscale 5.29 (≈1,587 days), σ = 0.882. Expt 2 (Matérn 3/2+1/2) — best 13116.4; lengthscales 9.87 (2,961 days) and 7.95 (2,385 days) — effectively both smooth, no gain from the jagged component. Expt 3 (time × surface) — best 13109.3 (BO, 200 iters; an outlier, optimization not fully converged); surface lengthscales clay 2.57 / grass 2.31 / hard 7.47 / indoor hard 2.08; implied surface correlations 72% (grass–indoor hard) to 81% (hard–clay).
- Speed: fit time ≈ 3.25×10⁻⁷ n² seconds (quadratic); 5,323 matches → 7.8 s; 13,159 matches → 56.2 s.
- 2018 evaluation (Fig. 6, log loss | accuracy): GP Matérn+surface 0.631 | 0.636; GP Matérn 3/2 0.634 | 0.637; GP Matérn 3/2+1/2 0.634 | 0.634; Glicko-2002 0.635 | 0.641; Glicko-2016 0.637 | 0.628; Elo-2002 0.638 | 0.644; Elo-2016 0.639 | 0.628.
- Key claim: all GP variants beat all Elo/Glicko variants on log loss (best 0.631 vs best non-GP 0.635); Elo-2002 has the best accuracy (64.4%) while the best GP gets 63.7%.
- Nadal surface-rating illustration: clay ≈ 2,200 vs grass ≈ 1,950 Elo-scale points (2013); Thiem ranked 6th on clay, outside top 8 elsewhere — surface specialization is real in the model.

## 8. Code / data availability
Code promised at https://github.com/martiningram/paired-comparison-gp-laplace (link given in the Discussion, §4.3). Libraries used: scikit-sparse (CHOLMOD), GPyOpt. Data from OnCourt software (commercial). No code or data URLs otherwise.

## 9. Leakage & limitations
- No lookahead: strictly time-ordered walk-forward. But surface covariates are static, not time-varying — fine for tennis, but an NFL analog needs care.
- Data snooping risk: 2016–2017 used for hyperparameter tuning, then frozen for 2018 — clean, but hyperparameter stability across seasons is not tested (tennis player careers ≈ lengthscale of 1,587 days ≈ 4.3 years, i.e., the model basically learned "skill is near-constant for years").
- Overfitting risk in Expt 3: 6 hyperparameters via gradient-free optimization that never converged (best run an outlier after 200 iterations); the surface-lengthscale matrix may be unreliable.
- Tennis-only: ATP has ~2,600 matches/year, balanced-ish schedule, no ties; NFL has 272 games/year with 32 teams — far sparser per-entity data and no surface analog (surface is the whole win; no natural NFL equivalent except dome/outdoor, which the paper's surface-covariate machinery could handle).
- Non-Markovian flexibility proved unnecessary here (both Matérn components chose multi-year lengthscales; the "trend" motivation produced no practical gain) — the win over Elo is mostly calibration + surface covariates.
- BO vs random search: BO only "slightly better"; GPyOpt default settings "may not have been ideal" — optimization quality is fragile.

## 10. GSE overlap
The existing-research map already covers: Elo, Glicko (mentioned), Bradley-Terry, Gaussian processes (state-space/dynamics lane: Kalman filters, nested AR(1) team strength 1701.05976, temporal fusion transformers), surface/dome covariates are not yet in the GSE rating stack. No Gaussian-process paired-comparison implementation exists in Garrett's corpus — this is a **new capability**: GP dynamics with multiplicative covariate kernels (time × context) plus the sparse-Laplace inference recipe. Closely related to the "state-space team strength" and "nested AR(1)" work, but those are Markovian; the GP formulation is the first non-Markovian option on record in the corpus, and the ARD-covariate kernel is a genuinely new mechanism (surface effect → dome/outdoor, QB-change, rest).

## 11. GSE implementation spec
- Data: nflverse play-by-play aggregated to game outcomes, 2000–2026 (32 teams, ~4,700 games). Context covariates per game: dome/outdoor × weather bin, QB starter identity (for unit-strength variants), days rest, post-bye flag. Treat each team's game-by-game strength as the skill function; likelihood = Bradley–Terry with home-field offset (standard nflverse home edge ≈ 1–2 pts, encoded via logit offset).
- Model: GP prior, kernel = Matérn 3/2 on time (days) × ARD RBF on one-hot context covariates — i.e., copy Experiment 3 wholesale. Inference: Laplace approximation with sparse Cholesky (scipy.sparse.linalg / scikit-sparse); predicted game probabilities from predictive mean/variance with Hessian correction (paper Eq. 27).
- Hyperparameters: maximize approximate log marginal likelihood via Bayesian optimization (skopt, since GPyOpt is unmaintained) on 2015–2020 seasons, freeze, evaluate 2021–2026 walk-forward.
- Serving: refit weekly (n ≈ 32 teams × seasons; quadratic in matches, still seconds at NFL scale — NFL has ~10× fewer matches than ATP).
- Effort: ~2–3 days engineering (port inference from the paper's GitHub), 1 day tuning protocol, 1 day validation against GSE's Elo baseline.

## 12. Reproducible test
Dataset: NFL regular-season games 2021–2026 from nflverse. Protocol: walk-forward weekly prediction (fit on all games up to week w, predict week w+1), identical to the paper's daily scheme. Metric: log loss (primary, matching the paper's finding that the GP wins on log loss not accuracy) + accuracy (secondary). Baseline: GSE's current Elo (dynamic Elo already in corpus) and the benbbaldwin objective-ratings v3 tiers as a ratings floor. Covariate ablation: time-only kernel vs time × (dome/outdoor × weather) kernel.

## 13. Acceptance / rejection gate
Adopt GP-over-Elo for the GSE ratings layer only if: (a) walk-forward log loss on 2021–2026 NFL beats dynamic Elo by ≥ 0.002 (the paper's margin was 0.004–0.008 on tennis); AND (b) the time × context kernel beats the time-only kernel by ≥ 0.001 log loss (proves covariates earn their keep); AND (c) fit time per weekly refit < 60 s on the lab VM. Reject otherwise — keep dynamic Elo and note the tennis result didn't transfer to NFL sparsity.

## 14. Improvement experiment
Two upgrades the paper flags but doesn't do: (1) automatic kernel discovery (Duvenaud 2014) — run compositional kernel search over {Matérn 1/2, 3/2, RBF, periodic} × time and × QB-identity covariates, letting the marginal likelihood pick whether team strength has a short-jagged component (injury-driven, what Matérn 1/2 was meant to capture) — NFL's injury volatility may reward this where tennis didn't. (2) Derive the third-derivative gradients of the Bradley–Terry log-likelihood so hyperparameters can be optimized with L-BFGS instead of gradient-free BO — unlocks many more covariates (offensive/defensive unit ratings as continuous covariates via ARD).
