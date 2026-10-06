# [0544] Regularization in Paired Comparison Models via Pseudo-Games and Phantom Players (arXiv:2606.03805v1)

**Citation:** Glickman, M. E. (2026). *Regularization in Paired Comparison Models via Pseudo-Games and Phantom Players*. Harvard University, Department of Statistics. arXiv:2606.03805v1. URL: https://arxiv.org/abs/2606.03805v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 2519 lines).
**Verdict:** ADAPT — two pseudo-observation regularizers for Bradley–Terry/Thurstone–Mosteller. The phantom-player penalty has *linear* (robust) tails vs ridge's quadratic ones, and both can be fit in plain `glm`; the calibration formula q = (1+δ)/(1+2δ) gives GSE an interpretable shrinkage dial for early-season ratings.

## 1. Research question
Maximum likelihood in Bradley–Terry / Thurstone–Mosteller models fails (infinite estimates) when the comparison graph is disconnected or nearly separated — dominant teams never losing, new entrants, sparse designs. Ridge fixes this but obscures the likelihood interpretation practitioners value. The paper asks: can regularization be expressed *as adding pseudo-observations* — (a) fractional balanced pseudo-games between every pair, or (b) weighted pseudo-win/pseudo-loss against a fixed-strength phantom player — such that the induced penalties are transparent, comparable to ridge, and implementable in standard `glm` software?

## 2. Dataset / schema
- **Application dataset:** 2025 MLB regular season — 30 teams, 2,430 games, game-level binary outcomes (home team win/loss), pulled via the `baseballr` R package (MLB Stats API). Ordinary BT fit without home-field parameter (deliberately a regularization-mechanism comparison, not a ranking model).
- **General schema:** paired-comparison win counts y_ij (times i beats j), m_ij = y_ij + y_ji, probabilities p_ij = F(θ_i − θ_j) with F = logistic (BT) or Φ (TM).
- **Access:** method paper; MLB example data via public `baseballr` package. No proprietary data barrier for the methodology.

## 3. Method / model
**Pseudo-game regularization.** Add δ fractional wins AND δ fractional losses to *every* unordered pair: augmented log-likelihood ℓ_δ(θ) = Σ_{i<j}{(y_ij+δ)log p_ij + (y_ji+δ)log(1−p_ij)} = ℓ(θ) + δ Σ_{i<j} log{p_ij(1−p_ij)}. The penalty term is ≤ 0, maximized at p_ij = 1/2 (all abilities equal) → shrinks ability *differences*. **Does not** resolve location nonidentifiability — sum-to-zero constraint still needed.
**Phantom-player regularization.** Add an artificial competitor with fixed strength θ_0 = 0; each real competitor receives one pseudo-win + one pseudo-loss vs the phantom, weighted by ρ ≥ 0: ℓ_ρ(θ) = ℓ(θ) + ρ Σ_j [log F(θ_j) + log(1−F(θ_j))]. Anchors *individual* abilities → resolves location nonidentifiability with no explicit constraint.
**Key derivations:** For BT (logit link), log{p_ij(1−p_ij)} = −2log2 − d_ij²/4 + O(d_ij⁴) near d_ij = θ_i−θ_j = 0 (Eq. 7). Since Σ_{i<j} d_ij² = JΣ_j θ_j² under centering (Eq. 9), pseudo-games are locally ridge with **λ ≈ δJ/4**. Phantom-player: θ_j − 2log(1+e^{θ_j}) = −2log2 − θ_j²/4 + O(θ_j⁴) (Eq. 12) → locally ridge with **λ ≈ ρ/4**, but **linear rather than quadratic tails** (Fig. 1) — more robust to extreme θ (L1-like tail behavior under a GLM likelihood).
**Bayesian reading:** MAP under pseudo-game "prior" ∏_{i<j}[F(Δ_ij)(1−F(Δ_ij))]^δ; phantom-player MAP under independent proper shrinkage priors ∝ [F(θ_j)(1−F(θ_j))]^ρ. (Contrast with ledger 0542's Bayesian BT — there the posterior came from a different prior specification; this paper gives a likelihood-preserving prior pair.)

## 4. Equations & assumptions
- Linear paired-comparison model: p_ij = F(θ_i − θ_j), F(x) = 1−F(−x) (Eq. 1).
- Ridge: ℓ_R(θ;λ) = ℓ(θ) − λΣ_j θ_j² (Eq. 2).
- Log-likelihood: ℓ(θ) = Σ_{i<j}{y_ij log p_ij + y_ji log(1−p_ij)} (Eq. 3).
- Pseudo-game augmented: ℓ_δ(θ) = ℓ(θ) + δΣ_{i<j} log{p_ij(1−p_ij)} (Eq. 5).
- **Calibration formula:** if a single observed win (no other info) should imply future-win probability q > 1/2, then q = (1+δ)/(1+2δ), i.e. **δ = (1−q)/(2q−1)** (Eq. 6). q = 0.99 → δ = 1/98.
- Local ridge equivalence: pseudo-game λ ≈ δJ/4 (Eqs. 7–9); phantom-player λ ≈ ρ/4 (Eq. 12).
- Phantom augmented: ℓ_ρ(θ) = ℓ(θ) + ρΣ_j[θ_j − 2log(1+e^{θ_j})] for BT (Eq. 11).
- **Stated assumptions:** (1) comparisons are conditionally independent given θ (shared with BT); (2) phantom strength fixed at zero — the anchor scale is a modeling choice, not estimated; (3) CV tuning uses the *unregularized* log-likelihood on held-out folds; (4) folds at game level (held-out games, not held-out teams); (5) Wald intervals from the augmented likelihood are conditional on the tuned parameter (bootstrap advised).

## 5. Features / target
- **Inputs:** pairwise win counts (y_ij, m_ij). No features — latent-strength model. Home-field omitted in the application; could be added as a covariate without changing the regularization structure.
- **Targets:** binary game outcomes; the object of regularization is the latent θ vector.

## 6. Validation design
- 10-fold CV (same 10 folds for all three methods; folds at the game level); select tuning value maximizing summed *unregularized* validation log-likelihood.
- Candidate grids: ridge λ (via `glmnet` CV); δ ∈ [0.001, 10] log-grid; ρ ∈ [25, 60].
- Point comparison of fitted strengths (Table 1) and top-to-bottom spread (Table 2) across ordinary BT, ridge, pseudo-game, phantom-player; phantom vs ridge identity plot (Fig. 4).
- Implementation recipe given for both methods using base R `glm` with two-column binomial response + augmented design matrix (pseudo-games) or appended identity rows + case weights (phantom player). Cautions: noninteger-binomial-counts warning for fractional δ; bootstrap including the tuning step for honest uncertainty.

## 7. Numerical results / baselines
- **CV-selected tuning (MLB 2025):** ridge λ = 0.01; pseudo-game **δ = 1.2589** (Fig. 2); phantom-player **ρ = 40** (Fig. 3). (ρ = 40 ≈ 40 weighted pseudo-wins + 40 pseudo-losses = 80 games vs a zero-strength team — the "effective sample size" interpretation is strikingly concrete.)
- **Table 1 (log-ability scale):** Brewers: BT 0.386 → ridge 0.240 / pseudo-game 0.263 / phantom 0.258. Rockies: −0.979 → −0.580 / −0.643 / −0.629. Middle teams (Royals 0.012, Rangers 0.010) barely move — shrinkage is selective for extremes.
- **Table 2 (spread, Milwaukee−Colorado):** ordinary 1.365 → ridge 0.820 / pseudo-game 0.907 / phantom 0.887 — roughly one-third to two-fifths reduction. Implied neutral-field Milwaukee win probability: 0.797 (ordinary) → 0.708 (phantom-player).
- Phantom-player estimates track ridge most closely (Fig. 4, right panel); pseudo-game tracks with slightly less shrinkage.

## 8. Code / data availability
Method described fully; implementation via base R `glm` with recipe in §2.3. No standalone package. MLB example data via public `baseballr` R package.

## 9. Leakage & limitations
- **MLB application is a mechanism comparison, not a prediction bake-off:** no holdout prediction scores reported beyond the CV tuning curves — only fitted-strength agreement. The 0.01 ridge vs δ=1.2589 vs ρ=40 "similarity" is qualitative (identity-plot closeness), not a head-to-head win-rate test.
- **CV grids are narrow and method-specific** (ρ ∈ [25,60] — why that range?); no ablation showing the optimum is interior and robust.
- **Phantom-player ρ=40 = 80 effective games vs average** is heavy shrinkage for a 162-game season — roughly half a season of phantom weight — yet this is the CV optimum, which should prompt care (per §2.4, flat validation curves make many tunings "equivalent").
- **Expert-calibration route (Eq. 6) vs CV route can disagree sharply** (δ = 1/98 ≈ 0.0102 for q=0.99 vs CV δ = 1.2589) — the paper notes both without reconciling them; for GSE this means "choose your tuning philosophy explicitly".
- **Ignores home field** in the demo; NFL home advantage is large enough that GSE must re-run the tuning *with* the covariate before adopting numbers.

## 10. GSE overlap
Per the existing-research map and ledger 0542: **ridge-penalized BT exists in GSE's toolkit**, and 0542 covers covariate-adjusted BT and Bayesian BT. **New here:** (a) the **phantom-player construction** — no existing-research entry covers anchor-to-reference shrinkage, and its **linear-tail (robust) penalty** is a genuinely different shrinkage profile from ridge (relevant when a few teams' ratings blow out, e.g., an undefeated run); (b) the **q-calibration formula δ = (1−q)/(2q−1)** — an interpretable, expert-elicitable shrinkage dial that maps a plain-English statement ("a 1–0 team should be priced at q vs an average team") to a tuning value — the corpus has no such elicitation device; (c) the **pseudo-game power-prior view** gives a language for *communicating* regularization to users ("equivalent to adding δ balanced games to every matchup"), which GSE's public-facing content could use. Verdict: **extension** — same BT machinery, a new regularization family with distinct tail behavior and an elicitation formula the corpus lacks.

## 11. GSE implementation spec
1. **Phantom-player-regularized NFL power ratings (early-season stabilization).** Port: fit BT ratings each week (nflverse 2015–2025, weeks 1–6), with a zero-strength phantom player and ρ tuned by leave-one-week-out CV on unregularized log-likelihood. The linear-tail penalty prevents one early blowout from creating a Rockies-style extreme rating (−0.979 → −0.629 in the demo) while leaving average teams untouched. Effort: ~2 days (augmented `glm` design matrix + weight vector; recipe is explicit in §2.3).
2. **Elicited shrinkage dial for public ratings content.** Use Eq. 6: ask "if Team A beats Team B in week 1 and both were average before, what's A's fair win probability vs average?" — e.g., q = 0.70 → δ = (0.30)/(0.40) = 0.75 — and set the pseudo-game δ directly. This gives a defensible, explainable regularization story for GSE's published power ratings instead of an opaque λ. Effort: ~1 day.

## 12. Reproducible test
- **Dataset:** nflverse 2020–2024 regular seasons, weekly BT fits for weeks 1–8 of each season.
- **Baseline:** ordinary (unregularized) weekly BT ratings.
- **Protocol:** for each week 1–8 of 2022–2024, fit ordinary BT, ridge BT (CV λ), pseudo-game BT (δ from CV), and phantom-player BT (ρ from CV) on games through that week; predict that season's *remaining* games; compare mean log-loss. Expectation from the paper: regularized ≫ ordinary in weeks 1–4 (separation/near-separation territory), converging by week 8; phantom-player should beat ridge on weeks where one team's record is extreme.

## 13. Acceptance / rejection gate
- **Adopt phantom-player regularization for GSE's weekly in-season ratings** if it beats ordinary BT on remaining-season log-loss in ≥ 7 of the 9 test windows (weeks 1–8 × 2022–2024 seasons... actually 8 windows × 3 seasons = 24 windows; adopt if it wins on log-loss in ≥ 17 of 24) AND beats or ties ridge BT on the same windows (confirming the linear-tail penalty is not worse than the quadratic one). **Reject otherwise.** Gate stated before running.

## 14. Improvement experiment
The paper suggests (but never runs) replacing the single zero-strength phantom player with **several phantom opponents at fixed, dispersed abilities** (e.g., θ ∈ {−1.5, −0.75, 0, 0.75, 1.5}), inducing a penalty centered on a reference *distribution* of strengths rather than a single point. For GSE, implement this with phantom abilities calibrated to the historical distribution of final NFL power ratings (roughly normal, σ ≈ 0.5–0.7 in BT units): each team gets ρ/J_phantom-weighted pseudo-win/loss vs each phantom. Hypothesis: this preserves the finite-estimate guarantee while allowing *multiple* clusters (elite/mid/bad) to form without the single-point anchor over-shrinking a genuinely elite team — directly addressing the paper's own flagged limitation of linear-tail anchoring at one point.
