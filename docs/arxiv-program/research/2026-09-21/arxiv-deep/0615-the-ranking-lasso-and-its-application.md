# [0615] The ranking lasso and its application to sport tournaments (arXiv:1301.2954v1)

**Citation:** Guido Masarotto and Cristiano Varin (2012). *The ranking lasso and its application to sport tournaments*. Annals of Applied Statistics (DOI: 10.1214/12-AOAS581). arXiv:1301.2954v1. URL: https://arxiv.org/abs/1301.2954v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 4521 lines).
**Verdict:** ADOPT — the adaptive ranking lasso (penalized Bradley–Terry with L1 on all pairwise ability differences, Eq. 4, AIC/BIC-tuned) cut cross-validated negative log-likelihood by 15–20% vs MLE on NFL 2010–11 data with ~60% of games beaten vs coin toss; it is a directly implementable, interpretable upgrade to GSE's team-rating fits, producing tiered groupings as a free byproduct.

## 1. Research question
Can a lasso-type penalty on all pairwise differences of team abilities in a Bradley–Terry model — forcing similar-ability teams into identical-ability groups — both simplify ranking interpretation and improve out-of-sample prediction over standard maximum likelihood? Illustrated on NFL 2010–2011 regular season and NCAA men's hockey 2009–2010 (with a ties extension via cumulative-link Bradley–Terry).

## 2. Dataset / schema
- NFL regular season 2010–2011: 32 teams; Table 1 lists per-team records and ability estimates (MLE / adaptive lasso AIC/BIC / hybrid AIC/BIC). Home-field indicator h_ijr ∈ {−1,0,1} included in the model.
- NCAA College Hockey Men's Division I 2009–2010: 58 teams, 1,083 matches, 125 ties (11.5%); schedule highly incomplete — 73.3% of 1,653 possible pairings unplayed, 6.8% played once, 10.5% twice, 9.4% 3+ times (0.4% seven times); matches/team 31–43; home team won 54.8%, ties 11.6%, visitors 33.5% (69 neutral-site games excluded from those percentages). Data via R package BradleyTerry2's `icehockey` data frame.
- Schema: y_ijr ∈ {0,1} (NFL) or {0,1,2} (hockey: loss/tie/win), home indicator, team abilities μ_i with Σμ_i = 0 identifiability.

## 3. Method / model
Bradley–Terry logistic model pr(Y_ijr=1) = exp(τh_ijr + μ_i − μ_j)/(1+exp(τh_ijr + μ_i − μ_j)) (Eq. 1); log-likelihood ℓ(μ,τ) (Eq. 2). Ranking lasso: penalize Σ_{i<j} w_ij|μ_i − μ_j| with bound/penalty λ (Eq. 4); reformulated as constrained ordinary lasso via θ_ij = μ_i − μ_j (Eq. 5–6) — a generalized fused lasso without natural order. Adaptive version: w_ij = |μ̂_i^{(mle)} − μ̂_j^{(mle)}|⁻¹ (Eq. 7) with ε=10⁻⁴ ridge stabilization for undefeated/winless teams. Computation: Augmented Lagrangian method (Hestenes/Powell; Nocedal & Wright §17.3) splitting into a smooth subproblem + ordinary lasso subproblem (§3.2). Penalty selected by AIC/BIC. Hybrid variant: lasso for grouping, then unpenalized MLE refit within groups. Ties extension: cumulative-link BT pr(Y_ijr ≤ y) = exp(δ_y + hτ + μ_i − μ_j)/(1+exp(...)) with δ_0 = −δ_1 symmetry (Eq. 9–10); collapses to standard BT when δ_0=δ_1=0.

## 4. Equations & assumptions
BT model (Eq. 1): pr(Y_ijr=1) = exp(τh_ijr + μ_i − μ_j)/(1+exp(τh_ijr + μ_i − μ_j)).
Log-likelihood (Eq. 2): ℓ(μ,τ) = Σ_{i<j} Σ_r y_ijr(τh_ijr + μ_i − μ_j) − log{1+exp(τh_ijr + μ_i − μ_j)}.
Ranking lasso (Eq. 4): (μ̂_λ, τ̂_λ) = argmin{−ℓ(μ,τ) + λ Σ_{i<j} w_ij|μ_i − μ_j|}.
Adaptive weights (Eq. 7): w_ij = |μ̂_i^{(mle)} − μ̂_j^{(mle)}|⁻¹.
Ties model (Eq. 9): pr(Y_ijr ≤ y_ijr) = exp(δ_{y_ijr} + h_ijr τ + μ_i − μ_j)/(1+exp(δ_{y_ijr} + h_ijr τ + μ_i − μ_j)), δ_0 = −δ_1.
Home indicator (Eq. 1 context): h_ijr = 1 (home i), 0 (neutral), −1 (home j). Identifiability: Σ_i μ_i = 0.
Assumptions: matches independent conditional on abilities; single global home-field τ (per-team τ_i tested by Mease 2003, "of little benefit"); adaptive weights' MLEs stabilized by 10⁻⁴ ridge; penalty λ chosen by AIC/BIC (no cross-validation for λ in the paper's main fits).

## 5. Features / target
- Features: home-field indicator only; team identities (abilities are the parameters).
- Target: binary (NFL) or ordinal win/tie/loss (hockey) outcomes; abilities double as ratings for prediction.
- Baselines: standard MLE Bradley–Terry (via BradleyTerry2 / GLM software); hybrid lasso+MLE refit.

## 6. Validation design
Repeated 100×: random half of the season's matches → train (fit MLE / adaptive lasso AIC/BIC / hybrid AIC/BIC) → negative log-likelihood on the held-out half (a KL-divergence-consistent scoring rule). Reported as boxplots (Fig. 5) + Table 3 means/medians. Note: random-half splits are NOT time-ordered (all games from the same season) — within-season leakage of "future" games into training is present but affects all methods equally, so the relative comparison stands.

## 7. Numerical results / baselines
- NFL 2010–11 cross-validated negative log-likelihood (Table 3, mean | median | ≻coin): MLE 139.90 | 137.30 | 0.59; Lasso-AIC 119.10 | 111.70 | 0.60; Lasso-BIC 117.20 | 109.30 | 0.58; Hybrid-AIC 135.20 | 131.90 | 0.60; Hybrid-BIC 131.60 | 127.30 | 0.60.
- Claimed improvements: AIC-lasso ≈ 15% mean / 19% median better than MLE; BIC-lasso ≈ 16% mean / 20% median better; hybrid variants only marginally better than MLE — "supports adaptive ranking lasso without refitting."
- ≈60% of matches predicted better than coin tossing for all methods.
- Hockey: τ̂^{(mle)} = 0.402 (se 0.066), δ̂_1^{(mle)} = 0.288 (se 0.024); MLE top teams Denver 1.65, Miami (Ohio) 1.60, Wisconsin 1.53, Boston College 1.43 (eventual champion); lasso groups the top four at identical 0.58 (AIC) / 0.41 (BIC) — grouping visible in Table 4.
- NFL groupings: e.g., New England 14–2: MLE 2.59 → lasso-AIC 1.40 / BIC 1.13; bottom-tier teams (Houston, Tennessee, Seattle, Cincinnati, St. Louis) collapse to shared −0.21 (AIC) / −0.12 (BIC) groups.

## 8. Code / data availability
No code stated for the ranking lasso itself (Augmented Lagrangian implementation described in §3.2 but not published). MLE baseline via R package BradleyTerry2 (Turner & Firth 2012), whose `icehockey` data frame supplies the hockey data. NFL data source not specified beyond the season.

## 9. Leakage & limitations
- Cross-validation uses random half-splits within a single season — not time-ordered; "future" games train predictions of "past" games. Relative method ranking is still valid, but absolute log-likelihoods are optimistic vs a true walk-forward.
- Single season each (NFL 2010–11, hockey 2009–10) — no multi-season replication; the 15–20% gain could be season-specific.
- Penalty selection by AIC/BIC on the training half, not by cross-validation — the paper's own CV shows AIC-lasso ≈ BIC-lasso, but λ-selection stability across seasons is untested.
- Adaptive weights depend on MLEs that diverge for undefeated/winless teams (patched with 10⁻⁴ ridge — an arbitrary stabilizer).
- n=32 (NFL) with 16 games/team is a small-sample regime where shrinkage trivially helps; the paper doesn't test whether the gain persists with more data per team.
- Hybrid (lasso groups + MLE refit) barely beats MLE — the grouping helps, the shrinkage helps more; the "without refitting" recommendation means accepting biased ability estimates, which complicates calibration of derived probabilities.
- No comparison vs Elo/Glicko or vs simple ridge (L2) — the L1-grouping benefit over plain shrinkage is asserted via the hybrid comparison, not isolated cleanly.

## 10. GSE overlap
Corpus has Bradley–Terry (inventoried), Elo, and regularized regression generally, but no fused/grouped-ability penalty on team ratings — **new capability / extension**. Directly complements paper 0611 (hierarchical Bayesian BT): where 0611 shrinks all teams toward a league mean via a Gaussian prior, the ranking lasso shrinks teams into data-determined tiers — arguably more useful for GSE's content (tier graphics are a staple of the edge-sheet/published cards) and for bet selection (within-tier games = pass; cross-tier games = edge). The ties extension is irrelevant for NFL (no ties worth modeling) but the hockey application validates the method on sparse, unbalanced schedules resembling the NFL's.

## 11. GSE implementation spec
- Data: nflverse 2015–2026, game outcomes + home indicator; 32 teams.
- Model: Bradley–Terry logistic with home-field τ, penalized objective Eq. 4 with adaptive weights Eq. 7 (ridge-stabilized MLEs, ε=10⁻⁴); λ via BIC (paper: BIC slightly better than AIC); solve with the Augmented Lagrangian recipe (§3.2) or modern equivalent (cvxpy with the θ_ij = μ_i − μ_j constraints — 496 constraints for 32 teams, trivial for ECOS/SCS).
- Outputs: weekly tiered ratings (groups = content-ready tiers for the edge sheet), win probabilities from the penalized abilities (recalibrate via Platt/isotonic — the corpus already has temperature scaling and isotonic regression inventoried).
- Scheduling: refit weekly; track tier membership changes as a "tier movement" feature for the engine.
- Effort: 2–3 days (cvxpy formulation ~60 lines; validation harness reuse from paper's 100× half-split CV, upgraded to time-ordered walk-forward).

## 12. Reproducible test
Dataset: NFL 2016–2025 (nflverse), walk-forward by week (fit on weeks ≤ w, predict week w+1; refit λ by BIC each week). Metric: log loss per game (primary; the paper's negative log-likelihood on held-out halves maps directly) + calibration slope. Baselines: unpenalized MLE Bradley–Terry with home field; GSE dynamic Elo.

## 13. Acceptance / rejection gate
Adopt adaptive ranking lasso as a GSE ratings input iff on 2016–2025 walk-forward: (a) log loss beats MLE-BT by ≥ 0.005 (paper's margin was ~15–20% on held-out NLL — demanding a fraction of that out-of-sample and time-ordered); AND (b) log loss beats dynamic Elo by ≥ 0.002; AND (c) tier assignments are stable week-to-week (median team changes tiers ≤ 2 times per season — unstable tiers are unpublishable). If (a) holds but (c) fails, use the shrunken abilities internally but publish Elo-based tiers.

## 14. Improvement experiment
The paper selects λ by AIC/BIC, never by cross-validation, and never tests time-ordered selection. Run nested walk-forward λ selection (choose λ each week by trailing-4-week log loss) vs BIC selection; if trailing-window CV beats BIC, GSE gets an adaptive-regularization schedule that tightens automatically in high-parity stretches. Second: replace the L1 pairwise penalty with the paper's own "clustered lasso" reference (She 2010, cited §3) — a penalty designed for exactly this unordered-grouping problem — and test whether it produces cleaner tiers than the generalized-fused-lasso formulation.
