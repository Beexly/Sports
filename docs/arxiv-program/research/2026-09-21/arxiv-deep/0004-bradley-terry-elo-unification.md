# 0004 Modelling Competitive Sports: Bradley-Terry-Élő Models for Supervised and On-Line Learning of Paired Competition Outcomes (arXiv:1701.08055v1)

**Citation:** Franz J. Király, Zhaozhi Qian (2017). *Modelling Competitive Sports: Bradley-Terry-Élő Models for Supervised and On-Line Learning of Paired Competition Outcomes*. arXiv:1701.08055v1. URL: https://arxiv.org/abs/1701.08055v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, 4,324 lines including appendices and references).
**Verdict:** ADAPT — the unified Bradley-Terry-Élő formalization (Élő as single-sample gradient ascent on the Bradley-Terry log-likelihood) and the two-stage training recipe are worth porting to GSE's rating stack, but the headline "added expressivity" models (two-factor, rank-four) failed to beat vanilla Élő on real EPL data, so adopt the framework and the training method, not the fancier parameterizations.

## 1. Research question

Can the Bradley-Terry model and the Élő rating system — usually treated as separate traditions — be written as one joint statistical model, and does that unification enable a family of principled extensions ("structured logodds models") that predict better? Concretely: (1) is Élő's update rule exactly online gradient ascent on the Bradley-Terry log-likelihood; (2) can the log-odds matrix L = logit(P) be endowed with structural assumptions (low rank, antisymmetry, feature dependence) that nest Bradley-Terry, Élő, and logistic regression as special cases; (3) do the extensions (two-factor, rank-four, score-difference/Skellam, promotion covariates, ternary draws) and the proposed two-stage online training beat vanilla Bradley-Terry-Élő and bookmaker odds on English Premier League data; and (4) what does the best model's predictive distribution imply about the fairness (rank stability) of the EPL table?

## 2. Dataset / schema

- **EPL dataset:** 8,524 English Premier League matches, 1993–94 through 2014–15 seasons; 47 teams appeared in the league over the period. Source: http://www.football-data.co.uk/. Schema per match: date, home team, away team, final scores (home goals, away goals). League context: 20 teams per season, double round-robin, 3 points for a win / 1 for a draw, bottom three relegated, three promoted from Division One each year.
- **Betting odds:** historical bookmaker odds (three outcomes: win/draw/lose) from the same source, used as the benchmark; converted via P = 1/odds and renormalized to sum to one (vig removed by normalization).
- **Synthetic datasets:** generated from the structured logodds assumptions (eq. 9) with known ground-truth low-rank matrices; used to verify that higher-rank models win when the generative truth is higher rank. Hyperparameters (K factor; regularization strength λ) tuned by grid search on a validation set maximizing validation log-likelihood.
- **Access:** football-data.co.uk is public and still operating; the EPL dataset is fully reconstructable. Synthetic generation procedure is described but no code is published.

## 3. Method / model

The paper's core move is representational: write the pairwise win-probability matrix as P = σ(L) with L = logit(P) a *structured* matrix (eq. 9). Bradley-Terry-Élő is the special case L = θ·1ᵀ − 1·θᵀ (antisymmetric, rank 2, one factor fixed to the ones vector); Élő with home advantage adds h·1·1ᵀ. Extensions: two-factor model L = u·vᵀ − v·uᵀ (eq. 11); rank-four model adding a full antisymmetric rank-two summand to the Élő log-odds (eq. 12); feature model L_ij = ⟨λ,X_ij⟩ + ⟨β,X_i⟩ + ⟨γ,X_j⟩ + α_ij (eq. 13, main variant with shared λ,β,γ and structured α); ternary draws via the proportional-odds/Rao-Kupper construction with a free draw parameter φ; score differences via a Skellam link with parameters exp(L_ij), exp(L⁰_ij); and trace-norm (nuclear-norm) regularized estimation of L as an implicit-structure alternative. Training: batch gradient ascent on the log-likelihood (noting the problem is non-convex "not even for the Bradley-Terry-Élő model") and a batch/epoch online scheme (Algorithm 1) with four variants — single-batch max-likelihood, repeated retraining, pure online (one sample per batch, one epoch — i.e., classical Élő), and the proposed two-stage (large initial batch to convergence, then online updates). The EPL experiment uses two covariates: whether the home/away team was just promoted from Division One.

## 4. Equations & assumptions

Equations (quoted exactly as in the paper):

- Model definition (eq. 9): Y ~ Bernoulli(P); P = σ(L); "L satisfies certain structural assumptions."
- Bradley-Terry-Élő log-odds: L_ij = θ_i − θ_j; matrix form L = θ·1ᵀ − 1·θᵀ (antisymmetric, rank two for general θ).
- Élő with home advantage: p_ij = σ(θ_i − θ_j + h); L = θ·1ᵀ − 1·θᵀ + h·1·1ᵀ. (The paper notes the antisymmetric part ½(L−Lᵀ) is the constant-free Élő log-odds and the symmetric part ½(L+Lᵀ) is the home-advantage term.)
- Two-factor model (eq. 11): L = u·vᵀ − v·uᵀ.
- Rank-four model (eq. 12): L = u·vᵀ − v·uᵀ + θ·1ᵀ − 1·θᵀ.
- Features (eq. 13): L_ij = ⟨λ^(ij), X_ij⟩ + ⟨β^(i), X_i⟩ + ⟨γ^(j), X_j⟩ + α_ij; main variant: L_ij = ⟨λ, X_ij⟩ + ⟨β, X_i⟩ + ⟨γ, X_j⟩ + α_ij.
- Ternary (Rao-Kupper style): log[P(Y_ij=win)/(P(draw)+P(lose))] = L_ij; log[(P(draw)+P(win))/P(lose)] = L_ij + φ; hence P(win) = σ(L_ij), P(lose) = σ(−L_ij − φ), P(draw) = σ(−L_ij) − σ(−L_ij − φ).
- Score difference: Y_ij (score difference) ~ Skellam with parameters exp(L_ij) and exp(L⁰_ij); simplest structure L = 1·uᵀ + v·1ᵀ (equivalently exp(L) rank one, nonnegative).
- One-outcome log-likelihood: ℓ(θ|X_ij,Y_ij) = Y_ij log p_ij + (1−Y_ij) log(1−p_ij) = Y_ij L_ij − L_ij + log(p_ij).
- Gradient (eq. 14): ∂ℓ(θ|X_ij,Y_ij)/∂θ = (Y_ij − p_ij) · ∂L_ij/∂θ. Key consequence stated in the paper: the residual term (Y_ij − p_ij) has the same form for all model variants; only ∂L_ij/∂θ differs — enabling unified training.
- Batch gradient: θ_i ← θ_i + K·Σ_{(i,j)∈G_i} (Q_i − p_ij) terms, where Q_i is team i's wins minus losses in D.
- Empirical log-odds MLE: L̂ = log W − log Wᵀ (equivalently L̂_ij = log W_ij − log W_ji), from p̂_ij = W_ij/N_ij.
- Low-rank degrees of freedom: r(m+n−r) for an m×n rank-r matrix.

Assumptions stated in the paper: binary outcomes initially (later relaxed); outcomes independent conditional on (X_ij, team factors) — the authors flag temporal structure as handled only heuristically via the online scheme; time-independence assumed "for expository reasons" then removed via batch/epoch training; antisymmetry L = −Lᵀ holds only absent home advantage (neutral fields); the structural assumptions "need not hold for the 'true' generative process" and mismatch "may be (and should be) quantified in a benchmark experiment"; Dixon-Coles-style exponential time decay is referenced as a heuristic alternative.

## 5. Features / target

EPL structured-logodds experiment: features are team identities (via the factor vectors) plus two binary covariates — whether the home team was just promoted from Division One this season, and whether the away team was. Target: ternary match outcome (win/draw/lose). The batch-learning comparison (section 5.2.6) additionally tests: team_id only; team_id + current Championship-points/goals ranking; team_id + VS (percentage of time home team beat away team in last 3, 6, 9 head-to-head matches); team_id + MA (moving averages with lags 3, 6, 12, 24 months of: home win %, away win %, home matches, away matches, championship points, home goals, away goals, home goals conceded, away goals conceded). Prediction horizon: pre-match, using only information available before kickoff.

## 6. Validation design

Genuinely time-ordered and careful — the strongest validation design among the five pilot papers. Train/tune/test split by date: training set starts with Arsenal vs Coventry on 1993-08-04; tuning set starts with Aston Villa vs Blackburn on 2005-01-01; test set runs from Stoke vs Fulham on 2010-01-05 to Stoke vs Liverpool on 2015-05-24, with 2,048 test matches. Hyperparameters chosen by grid search maximizing out-of-sample log-likelihood on the tuning split; the final model trains on train+tune and is evaluated once on test. Training methods compared under a unified batch/epoch protocol (Algorithm 1) guaranteeing no future information leaks into current predictions and identical data access across methods. Baselines: naive always-predict-home-win; normalized Bet365 odds; GLM (multinomial/ordinal link) with elastic net; random forest; Dixon-Coles. Metrics: accuracy with Clopper-Pearson 95% CIs; mean out-of-sample log-likelihood with 5,000-sample bootstrap 95% CIs; paired t-tests on per-match log-likelihoods (H1–H4), with Holm correction for the model-comparison family. Synthetic experiments use separate validation/test sets for hyperparameter selection.

## 7. Numerical results / baselines

All numbers below are the paper's, quoted exactly (Tables 2–9, §§5.2.5–5.3, §6):

**Accuracy on 2,048 test matches (Table 3):**
- Benchmark / home team win: 46.07%, 95% CI [43.93%, 48.21%]
- Benchmark / Bet365 odds: 54.13%, 95% CI [51.96%, 56.28%]
- Élő / two-stage: 52.40% [50.23%, 54.56%]; online: 52.16% [50.00%, 54.32%]; batch: 50.58% [48.41%, 52.74%]
- Two-factor / two-stage: 51.30% [49.13%, 53.46%]; online: 50.34% [48.17%, 52.50%]; batch: 50.86% [48.69%, 53.03%]
- Rank-four / two-stage: 51.34% [49.17%, 53.51%]; online: 50.34% [48.17%, 52.50%]; batch: 50.58% [48.41%, 52.74%]
- Score difference / two-stage: 52.59% [50.42%, 54.75%]; online: 47.17% [45.01%, 49.34%]; batch: 51.10% [48.93%, 53.27%]
- Élő with covariates / two-stage: 52.78% [50.61%, 54.95%]; batch: 50.86% [48.69%, 53.03%]
- Trace-norm regularized / batch: 45.89% [43.54%, 48.21%] — worse than the naive home-win baseline.

**Mean out-of-sample log-likelihood (Table 4):**
- Bet365 odds: −0.9669 [−0.9877, −0.9460]
- Élő / two-stage: −0.9854 [−1.0074, −0.9625]; online: −1.0003; batch: −1.0079
- Two-factor / two-stage: −1.0058; online: −1.0870; batch: −1.0158
- Rank-four / two-stage: −1.0295; online: −1.1024; batch: −1.0078
- Score difference / two-stage: −0.9828 [−1.0034, −0.9623]; online: −1.1217; batch: −1.0009
- Élő with covariates / two-stage: −0.9807 [−1.0016, −0.9599]; batch: −1.0002

**Hypothesis tests (Table 2):** H1 (two-stage > online): Élő p = 7.8×10⁻⁵; two-factor p = 4.4×10⁻¹⁴; rank-four p = 9.8×10⁻⁹; score difference p = 2.2×10⁻¹⁶ — "All tests are highly significant even if we take into account the issue of multiple testing." H2 (new model > Élő, best training): two-factor p ≈ 1; rank-four p ≈ 1; score difference p = 0.235 (not significant); Élő with covariates p = 0.002 (significant).

**Batch-learning comparison (Tables 5–9):** best accuracy GLM2 (ordinal link) with team_id + MA: 52.93% [50.76%, 55.09%]; GLM1 + MA: 52.69% [50.52%, 54.85%]; Dixon-Coles: 52.54% [50.40%, 54.68%]; random forest + MA: 52.06%. Best log-loss: GLM1 + MA −0.9797. H3 (ordinal vs multinomial link): p-values 0.148, 0.035, 0.118, 0.121 — not significant in three of four scenarios. H4 (moving-average features best): GLM1 p = 2.7×10⁻¹², 1.2×10⁻⁹, 0.044; GLM2 p = 5.3×10⁻⁸, 3.7×10⁻⁶, 0.004. Model comparison (Table 7): GLM vs RF p = 0.03 (adjusted 0.08); GLM vs Dixon-Coles p = 0.48 (adjusted 0.96); Dixon-Coles vs RF p = 0.54 (adjusted 0.96) — after Holm correction, no significant difference.

**Fairness (§5.3):** 10,000 Monte Carlo season replays from the best model's predictive distribution for 2010–11: "none of the teams, except Manchester United, ends up with the same rank they achieved in reality in more than 50% of the cases. For most teams, the middle 50% are spread over 5 or more ranks, and for all teams, over 2 or more." Arsenal was "predicted/expected among the first three with high confidence, but eventually was ranked fourth."

**Discussion (§6.2, authors' claims):** "how little the stateofart improves above an uninformed guess which already predicts almost half the (win/lose/draw) outcomes correctly, while differences between the more sophisticated methods range in the percents"; "All our models and those we adapted from literature were outperformed by the Bet365 betting odds"; only three observable influential factors could be confirmed: "a general 'good vs bad' quantifier for whatever one may consider as a team's 'skills', which of the teams is at home, and the fact whether the team is new to the league."

## 8. Code / data availability

None stated. No code repository, no supplementary code file; Algorithm 1 is given as pseudocode only. Data source named (football-data.co.uk, public) but no processed dataset is published.

## 9. Leakage & limitations

- **The headline extensions failed.** Two-factor and rank-four models do not beat vanilla Élő (H2 p ≈ 1 for both); the score-difference model is not significantly better (p = 0.235). The paper is admirably honest about this, but it means the "added expressivity yields the best predictions" framing from the abstract rests entirely on the promotion covariates (p = 0.002) — a two-binary-feature tweak, not the new model family. (This is the authors' own result; the adversarial read is that the fancy parameterizations are dead weight on real data.)
- **Everything loses to Bet365.** Best model accuracy 52.78% vs Bet365 54.13%; best log-loss −0.9807 vs −0.9669. The gap is small but consistent, and the authors' explanation (bookmaker odds aggregate nonpublic information) is conjecture — "we have not extensively studied betting companies empirically, hence this latter belief is entirely conjectural."
- **Promotion covariates may be era-specific.** "Just promoted" mattered in 1993–2015 EPL; with modern parachute payments and squad investment, the effect may have attenuated. The paper does not test stability over time.
- **Trace-norm model collapses.** 45.89% accuracy — below the naive baseline. The implicit-regularization path the theory section motivates does not survive contact with real data (the authors note "many limitations for the application to the real data" without fully diagnosing them).
- **Test window is one era.** 2010–2015 EPL; no test on other leagues, other sports, or later seasons. The two-stage training advantage (H1) is demonstrated only here.
- **Synthetic experiments are circular by design.** Data generated from the model's own assumptions; the "higher rank wins when truth is higher rank" result validates the estimator, not the modeling choice for real data — and real data rejected the higher-rank models.
- **The fairness analysis inherits the model.** Rank-stability conclusions assume the best accessible model approximates true odds; if the model is miscalibrated, the Monte Carlo spread is misestimated too. The "fairness" surrogate (rank stability under resampling) is the authors' own admittedly disputable definition.
- **No uncertainty on the headline p = 0.002.** With multiple model variants tried (two-factor, rank-four, score-diff, covariates), the H2 family has its own multiplicity; the paper applies Holm only to Table 7, not to the H2 column.

## 10. GSE overlap

Direct overlap with GSE's inventoried Bradley-Terry / Élő / Glicko work in the existing-research map — this paper is the theoretical foundation those implementations implicitly rest on, and it likely *extends* them: GSE's Élő implementations almost certainly do not include (a) the explicit log-odds-matrix view that makes home advantage, features, and higher-rank structure composable; (b) the two-stage training recipe (large-batch MLE initialization + online updates), which beat pure online updating at p = 7.8×10⁻⁵ for vanilla Élő; or (c) the ternary Skellam score-difference training path. The calibration lane (temperature/Platt/isotonic) is complementary, not duplicative. The EPL "chance dominates" finding resonates with paper 0003's φ analysis — together they suggest GSE should budget for irreducible noise rather than chase it with expressivity, a lesson this paper demonstrates empirically (rank-four lost to rank-two).

## 11. GSE implementation spec

1. **Unify GSE's rating stack on the structured-logodds view.** Refactor the existing Élő/Bradley-Terry implementations so the log-odds matrix L is explicit and structural choices (rank, antisymmetry, home term, feature terms) are composable options, not separate code paths. Equations to implement exactly: P = σ(L); base L = θ·1ᵀ − 1·θᵀ + h·1·1ᵀ; gradient step ∂ℓ/∂θ = (Y − p)·∂L/∂θ (eq. 14).
2. **Adopt two-stage training for GSE's NFL Élő.** Stage 1: batch MLE on a multi-season initial block (convergence of log-likelihood, no fixed K — the paper's point that "apriori setting a K factor is not necessary" under batch training); Stage 2: online per-game updates with the learning rate tuned on a validation block. Keep vanilla rank-2 + home advantage + a small set of binary covariates (e.g., rookie QB starting, short rest) — do NOT implement two-factor/rank-four; the paper shows they add nothing on real data.
3. **Add the ternary/proportional-odds head for markets with draws** (soccer) and the Skellam score-difference head as an auxiliary training objective for NFL (predict margin distribution, derive win prob from P(Y>0)) — the paper's score-difference variant was the closest to significance (p = 0.235) and is cheap to try.
4. **Data:** nflverse schedules/scores 1999–2025; The Odds API for the bookmaker-odds benchmark comparison. Effort: 1 week for the refactor + two-stage training harness; the math is fully specified in the paper.

## 12. Reproducible test

Replicate §5.2 on NFL data: train/tune/test split by date (train 1999–2012, tune 2013–2016, test 2017–2025 — test N ≈ 2,400+ games, comparable to the paper's 2,048). Models: vanilla Élő (online vs two-stage), Élő + binary covariates (rookie QB, divisional game, short rest), and the Skellam score-difference variant; baselines: always-home-win, normalized consensus odds. Metrics identical to the paper: accuracy with Clopper-Pearson CIs, mean log-likelihood with 5,000-bootstrap CIs, paired t-tests H1 (two-stage > online) and H2 (covariate model > vanilla). Test succeeds (adopt two-stage) if H1 replicates at p < 0.01 on NFL data; adopt the covariate set only if H2 replicates at p < 0.05 with Holm correction across the covariate family. Runnable from nflverse + odds archive; no new data needed.

## 13. Acceptance / rejection gate

ADOPT the unified log-odds refactor + two-stage training if, on the 2017–2025 NFL test window: (a) two-stage beats online Élő on mean log-likelihood with paired p < 0.01 (replicating H1); (b) the refactored implementation reproduces the legacy Élő ratings to within 1e-6 on the training block (no regression); (c) no adopted model variant underperforms vanilla Élő by more than 0.002 nats (the paper's rank-four lesson: expressivity that doesn't pay is rejected). REJECT two-factor/rank-four/ternary-extravagant variants for NFL unless they clear H2-style significance (p < 0.05 Holm-corrected) — the paper's own evidence says they won't. REJECT the trace-norm path entirely (45.89% < naive baseline in the paper).

## 14. Improvement experiment

The paper leaves two doors open that it explicitly names: structural restrictions on *feature-coefficient* matrices/tensors ("beyond the scope of this manuscript") and smarter online variants (data-dependent learning rates, §4.3.3). Improvement experiment: **adaptive, uncertainty-aware two-stage Élő** — replace the fixed learning rate in Stage 2 with a per-team adaptive rate scaled by the inverse Fisher information of that team's factor (a diagonal natural-gradient step, computable in closed form from eq. 14 since ∂L_ij/∂θ is known analytically), and make the Stage-1/Stage-2 boundary team-specific: teams with stable rosters stay in Stage-2 online mode, while teams with regime changes (new QB/coach, detected via a changepoint test on the residual stream (Y − p)) get re-initialized through a fresh Stage-1 batch fit. This directly attacks the paper's "temporal structure is only heuristically handled" weakness and is testable inside the §12 protocol: the adaptive variant must beat fixed-rate two-stage on held-out log-likelihood to be kept.
