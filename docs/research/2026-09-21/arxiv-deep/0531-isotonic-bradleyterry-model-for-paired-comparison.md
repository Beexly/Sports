# [0531] Isotonic Bradley-Terry Model for Paired Comparison Data (arXiv:2608.02081v1)

**Citation:** Ryoya Yamasaki (2026). *Isotonic Bradley-Terry Model for Paired Comparison Data*. arXiv:2608.02081v1. URL: https://arxiv.org/abs/2608.02081v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 110090 chars; §1–6 and conclusion read in full; appendices 7–8 skimmed).
**Verdict:** ADOPT — a principled, cheap upgrade to GSE's team-rating layer: learn the rating→win-probability link function from data (isotonic regression) instead of assuming logistic, fixing link misspecification NFL exhibits vs market odds.

## 1. Research question
Fixed inverse link functions (logistic, probit, gamma) in Bradley–Terry models may be misspecified, hurting win-probability prediction and ranking. The paper proposes the Isotonic Bradley–Terry (IBT) model: alternately learn the rate parameters rᵢ by a (sub-)gradient method and the inverse link function σ by isotonic (monotone) regression (PAV algorithm), guaranteeing monotonic improvement in training error and naturally yielding exact ties (σ=0.5) when data are insufficient to rank a pair.

## 2. Dataset / schema
- Synthetic "Cauchy-N" (deliberately misspecified link): n ∈ {25, 50, 100, 200, 400} players, N ∈ {1, 5, 25} matches per pair; yᵢⱼ = Binomial(N, σ_Cauchy(r̃ᵢ − r̃ⱼ))/N, σ_Cauchy(u) = arctan(u)/π + 1/2, r̃ᵢ ~ Normal(0,1); train/test pair splits 1:9, 3:7, 5:5, 7:3, 9:1; 1000 trials. "Logistic-N" (correctly specified) variant in Appendix 7.
- Real world: Premier League 2024/25 (n=20 teams, 380 matches; football-data.co.uk E0.csv); MLB 2025 (n=30, 2430 matches; retrosheet gl2025.zip); ATP Tour 2025 (n=457 players, 2944 matches, 2522 matched pairs of 104196 possible; Jeff Sackmann GitHub). Draws folded into win probabilities as yᵢⱼ = (wins + 0.5·draws)/matches (Eq. 1).
- All real data public (accessed 2026-05-14).

## 3. Method / model
Alternating algorithm: initialize σ̂⁽⁰⁾ = σ_Logistic; iterate: (1) learn rates (r̂ᵢ) by minimizing training criterion (1/|D_tra|)Σ φ(σ(rᵢ−rⱼ), yᵢⱼ) with φ = squared loss (Appendix 8: NLL), using coordinate sub-gradient + line search so training error never increases (MM only for the first update, since the link becomes non-convex after t=1). (2) Learn σ via PAV isotonic regression: σ̂ = polyline connecting unique elements of (r̂ᵢ−r̂ⱼ, σ̂ᵢⱼ) sorted by rating difference, with constraints σ̂ⱼᵢ = 1−σ̂ᵢⱼ and monotonicity σ̂ᵢⱼ ≤ σ̂ᵢ′ⱼ′ whenever r̂ᵢ−r̂ⱼ ≤ r̂ᵢ′−r̂ⱼ′ (Eq. 6), solved by a symmetric PAV variant (Algorithm 1); closed-form inner solution = group mean for NLL/squared loss (Theorem 2), guaranteeing σ̂ ∈ Σ (non-decreasing, symmetric, in [0,1]). (3) Ranking uses Borda count Σⱼ σ(r̂ᵢ−r̂ⱼ), not raw rates, since a non-strictly-increasing σ breaks rate↔Borda equivalence. Model selection: number of alternating updates chosen by 10-fold CV (Procedure 2), because excessive updates overfit.

## 4. Equations & assumptions
- Win-probability target with draws: yᵢⱼ = (#{i beats j} + 0.5·#{draws})/(#matches between i,j) (Eq. 1); yⱼᵢ = 1 − yᵢⱼ.
- Rate learning (Eq. 2): (r̂ᵢ) ∈ argmin (1/|D_tra|)Σ φ(σ(rᵢ−rⱼ), yᵢⱼ); NLL φ_nll(u,v) = −v log u; squared φ_sq(u,v) = (u−v)².
- Prediction criterion (Eq. 3): (1/|D|)Σ φ(σ(rᵢ−rⱼ), yᵢⱼ).
- Ranking metric (Eq. 4): Kendall's τ = (n₊−n₋)/√((|D|−n₊)(|D|−n₋)), n₊ = Σ 1((σ(rᵢ−rⱼ)−0.5)·(yᵢⱼ−0.5)>0), n₋ analogously; Spearman's ρ mentioned but τ preferred (tie handling).
- Isotonic link (Eq. 5–7): σ̂ = polyline of unique sorted (r̂ᵢ−r̂ⱼ, σ̂ᵢⱼ) pairs; explicit piecewise-linear form in Eq. 7 with group bounds (L_k, R_k, z_k) from PAV.
- PAV inner problem (Algorithm 1, Theorem 2): z_k ∈ argmin_u Σ_{v∈Y_k} {φ(u,v)+φ(1−u,1−v)} = (1/|Y_k|)Σv for φ ∈ {nll, sq}; merge adjacent groups while order violated; then σ̂ᵢⱼ = z_k for (r̂ᵢ−r̂ⱼ)∈[L_k,R_k].
- Tie rate (Eq. 9): |{(i,j)∈D : σ(rᵢ−rⱼ)=0.5}|/|D|.
- Link candidates: σ_Logistic(u)=1/(1+e^{−u}); σ_TM(u)=∫_{−∞}^u (2π)^{−1/2}e^{−v²/2}dv; Stern's gamma link σ(u)=∫₀^∞∫₀^{e^u w}{Γ(s)}^{−2}(vw)^{s−1}e^{−(v+w)}dv dw (logistic at s=1, →½ as s→0, →step function as s→∞); Σ = {σ: ℝ→[0,1] non-decreasing, σ(−u)=1−σ(u)}.
- Relation to nonparametric BT (Eq. 8): bivariate isotonic regression assuming known ranking; IBT has ≥ its training error (structural constraint) but can predict unmatched pairs and update rankings, which nonparametric BT cannot.
- Assumptions: Ford's strong-connectivity condition (no isolated subsets, no all-win/all-loss teams → identifiability); strictly convex φ for unique solution of each rate step; symmetry constraint σ̂ⱼᵢ=1−σ̂ᵢⱼ.

## 5. Features / target
Inputs: pairwise match outcomes aggregated to yᵢⱼ. Targets: (a) win probability yᵢⱼ for unmatched pairs (D_tes), (b) player/team ranking (Borda order). No covariates; home-field advantage not modeled (cited as future work via David 1963).

## 6. Validation design
Synthetic: 1000 random trials per (n, N, split) configuration; Procedure 1 fixes t∈[1..10] updates and plots train/test WPP error, Kendall τ, tie rate vs number of updates; Procedure 2 selects updates by 10-fold CV and compares BT vs selected IBT with Mann–Whitney U (α=0.05) per cell, 1000 trials each. Metrics: WPP error (squared loss; NLL variant in Appendix 8 — noted NaN issue when isotonic bins hit 0/1), Kendall's τ, tie rate. Real data: same two procedures on PL/MLB/ATP with squared loss. Baselines: vanilla BT with logistic link. No baselines beyond logistic-BT (no Thurstone/Elo comparison).

## 7. Numerical results / baselines
- Synthetic (misspecified Cauchy link), t=1 update: IBT improved test WPP error vs logistic-BT in most cells (Table 1, e.g. at n=25, N=1, 1:9 split: .3956±.0474 BT vs .3689±.0489 IBT; at n=50, N=25, 9:1: .0084±.0011 vs .0080±.0011), with many cells significant at Mann–Whitney p<0.05 (bold red). Gains most pronounced when n, N, and |D_tra| were small (regularization effect — prevents |r̂ᵢ−r̂ⱼ| blowups) and when n, N large (misspecification mitigation; verified against the correctly-specified Logistic-N in Appendix 7, where gains shrank).
- Ranking: IBT improved Kendall's τ in most cases, driven by withholding judgment as exact ties (σ̂=0.5) for undecidable pairs — higher tie rates correlate with the ranking gains.
- More updates beyond t≈1 often degraded performance (overfitting; Figure 2) — hence 10-fold CV for the update count.
- Real data: similar patterns — IBT improved WPP error at small |D_tra| ratios for PL (n=20) and MLB (n=30); improved across a wider range of split ratios for ATP (n=457, sparse: only 2522/104196 pairs observed); ranking improved in most cases.
- Training error is guaranteed monotone non-increasing per update by construction.
- Caveat (paper-stated): NLL-based WPP evaluation can hit NaN when a PAV group mean is exactly 0 or 1 — a practical reason the experiments use squared loss.

## 8. Code / data availability
Code: https://github.com/yamasakiryoya/IBT (stated, summarizes experimental code). Data: all public (football-data.co.uk, retrosheet, Jeff Sackmann GitHub). Isotonic regression computed via sklearn.isotonic.IsotonicRegression.

## 9. Leakage & limitations
Adversarial reading: the synthetic misspecification experiment is maximally favorable — true link is Cauchy, fitted link starts logistic; the real-world "misspecification" claims rest on unidentified links, so we don't know which side of the link the gains come from. Procedure-2 gains depend on a 10-fold CV inner loop over updates — expensive and not reproduced by others; single-shot (t=1) results are the honest comparison and are weaker in large-data cells. Sparse pair coverage (ATP 2.4%) is where IBT shines, but NFL is the opposite: 32 teams × ~17 games gives dense pair coverage within a season, so the sparse-data advantage may not transfer; the NFL transfer case is the link-shape (market-vs-model) argument, not sparsity. The NaN-at-0/1 issue makes NLL evaluation (the natural choice for probability calibration) fragile with the isotonic link — GSE needs calibrated probabilities, and this paper gives no clean NLL/Brier-based model selection story (Brier on [0,1]-clipped bins untested). No home-field, no draws handling beyond 0.5-scoring (NFL ties are rare but not zero), no time dependence — each season refit is static. Training-error monotonicity is by construction (sub-gradient with line search); no global-optimum guarantee after t≥1 (non-convex rate step). Baseline set is thin: only logistic-BT; no comparison to Elo/Glicko/TrueSkill or market-implied probabilities.

## 10. GSE overlap
Extension of existing corpus capability. Garrett's repo already inventories Bradley–Terry in the 26-metric catalog and reverse-engineers analyst rating sources; the gse-lab (2026-09-17) computes EPA-based team metrics and the opp-adj-EPA lane is live. But GSE's rating→probability conversion is presumably a fixed logistic mapping — no existing work learns the LINK FUNCTION from data. This is a direct, cheap upgrade to the team-rating layer: keep GSE's rating engine, replace the assumed logistic link with an isotonic link learned on games, correcting the systematic shape mismatch (favorites win less often than logistic-Elo predicts — the well-documented longshot/favorite compression NFL markets exhibit). Not a duplicate: nothing in the corpus estimates σ(·) nonparametrically. Note 0530 (Boltzmann-rational EM) is complementary: 0530 learns per-source reliability weights, 0531 learns the probability mapping — they can stack.

## 11. GSE implementation spec
1. Compute team ratings rᵢ on rolling 3-season nflverse windows (GSE's existing opp-adj EPA ratings; fall back to Elo from nflverse if that lane is incomplete).
2. Build pair targets yᵢⱼ = empirical win prob (wins + 0.5·ties)/games over the window for each observed pair; D_tra = pairs from seasons t−2..t−1, D_tes = season t games (time-ordered, mirroring the paper's split but temporal).
3. Fit IBT: init σ̂⁽⁰⁾ = logistic; iterate sub-gradient rate update (or MM first step) + PAV isotonic link; choose update count t by 10-fold CV on D_tra; implement with sklearn.isotonic.IsotonicRegression (as in the paper).
4. Rank teams by Borda count Σⱼ σ̂(r̂ᵢ−r̂ⱼ) — test whether Borda order beats raw-rate order for GSE's purposes.
5. Serve: refit link function weekly on rolling window; publish the fitted σ̂ polyline as a versioned JSON artifact so pick generation uses a fixed function per week.
Estimated effort: 2–3 engineer-days (rating data exists; the whole algorithm is ~150 lines + sklearn). Risk: low; fallback is logistic.

## 12. Reproducible test
Dataset: NFL 2018–2024 games (nflverse pbp). D_tra: 2018–2022 (all games); D_tes: 2023–2024 season games, time-ordered, no future leakage. Ratings: season-start Elo (nflfastR data) refit per the paper's procedure. Baseline: logistic-BT (σ̂⁽⁰⁾ logistic, one rate fit). Candidate: IBT with CV-selected update count. Metrics: Brier score and log loss on D_tes moneyline outcomes (NFL: home/away binary; ties → 0.5), plus Kendall τ between season-end ratings and final standings. Clamp isotonic bins to [0.001, 0.999] before log loss to avoid the paper's NaN issue.

## 13. Acceptance / rejection gate
ADOPT if IBT beats logistic-BT on D_tes by ≥0.003 Brier (or ≥0.5% log-loss) AND Kendall's τ is not worse (Δτ ≥ −0.01), on 2023–2024 NFL. REJECT otherwise — a fixed logistic link stays, and the tie-rate/Borda machinery is dropped. Secondary gate: run the same protocol separately on totals-adjacent pair comparisons? No — this test is moneyline-only.

## 14. Improvement experiment
Go beyond the paper: learn a HOME-FIELD-CONDITIONAL link — two isotonic functions, σ̂_home(u) and σ̂_away(u), or a bivariate isotonic regression of win probability on (rating difference, home-field advantage index). NFL home advantage is shrinking/volatile (corpus: rest/bye edge vanished post-2011 CBA); a data-learned home-conditional link could capture the asymmetric favorite-compression the paper's single σ cannot. Test: does σ̂_home differ structurally from σ̂_away (e.g., flatter tails for road favorites)? If yes, fold it into the serving artifact.
