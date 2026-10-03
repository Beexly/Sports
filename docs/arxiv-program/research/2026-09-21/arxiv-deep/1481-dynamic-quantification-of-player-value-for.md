# [1481] Dynamic quantification of player value for fantasy basketball (arXiv:2409.09884v1)

**Citation:** Zach Rosenof (2024). *Dynamic quantification of player value for fantasy basketball*. arXiv:2409.09884v1 [stat.ME]. URL: https://arxiv.org/abs/2409.09884
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arxiv.org/pdf; main body §§1–6 read in full; appendices noted for derivations).
**Verdict:** ADAPT

## 1. Research question
Can a dynamic draft algorithm that re-optimizes its strategy parameters for every candidate pick beat static ranking lists in head-to-head fantasy basketball category leagues — in particular by learning adaptive strategies like punting?

## 2. Dataset / schema
Simulated NBA fantasy seasons 2004-05 through 2023-24 (20 seasons). Each simulated season: player weekly performances sampled from actual historical weeks (injured weeks excluded; ≥10 weeks required); 12 teams × 13 players; 20-week seasons; 1000 simulated seasons per draft seat; weekly head-to-head winners by most categories. Positional eligibility from Yahoo fantasy basketball.

## 3. Method / model
- **H-scoring framework:** three functions — X(j): distribution of category-total differentials vs opponents given strategy params j; W(j): category win probs = CDF of X(j) at 0; V(j): format objective. Procedure: (1) optimize j per candidate player (gradient descent), (2) draft the player with max V(j).
- **H0 implementation:** j = (jC category weights summing to 1; jU, jG, jF flex-share vectors). X-scores = G-scores with player-to-player variance terms zeroed (Xp = (mp−mμ)/mτ; percentage stats Xp = (aq/aμ)(rq−rμ)/rτ).
- Team differential: X(j) = N(Xs + Xp + Xδ − XOm, 2N + (N−K−1)Xσ²); Xδ(j) from a multivariate-normal future-pick model: Xδ(jC) = (N−K−1)·Σ·(vjCᵀ − jCvᵀ)·Σ·(…) (Appx. B; γ, ω fit empirically) + μCP positional adjustment.
- Positional structure enforced via an assignment problem (modified Jonker-Volgenant, scikit-learn) with rewards μCjC; flex bonuses 0.0001 (guard/forward), 0.0002 (utility).
- Win probs: wc = ½[1 + erf(μ/(σ√2))]. Objectives: Each Category V = Σc wc; Most Categories V = Σ over the 256 winning scenarios (9-cat: C(9,5)+C(9,6)+C(9,7)+C(9,8)+C(9,9)=256; ≤2048 ops/player) of Πc[f(s,c)wc + (1−f)(1−wc)] + ½·ties; gradient weighted by "tipping-point" probabilities T(j,c₁).
- Optimization: Adam; j initialized as mixture of default weights v and previous round's optimum (first round: v perturbed toward candidate's stats; jC=v gives undefined gradient so perturbation is mandatory); jC re-normalized to sum 1 after each step.

## 4. Equations & assumptions
- X(j) normal differential above; wc formula; V objectives; gradient ∇V = Σ PDFc(X(j))·∇X(j) (Each Category).
- Assumptions (§3.1, honestly audited in §5.2): fixed positional structure; player distributions known exactly and static; all players share week-to-week variance (mτ counting, rτ percentage); future-pick means ~ multivariate normal; percentage stats ≈ counting stats in X-score basis; category independence; maximize expected performance; opponents' unknown picks ~ random; future-pick aggregate variance = 0; local optima suffice.

## 5. Features / target
Features: candidate player X-scores, drafted-team X-scores, opponent known picks, positional eligibility, category covariance Σ, positional mean matrix μC. Target: V(j) = expected format score (categories won, or P(win matchup)).

## 6. Validation design
H0 drafter at each of 12 draft seats vs 11 G-score drafters; 1000 simulated 20-week seasons per seat per season (20 seasons); standard error ≤ ~1.6%; ω=0.7, γ=0.25. Both Each Category and Most Categories formats.

## 7. Numerical results / baselines
- Each Category: H0 mean season-win rate **21.8%** vs 8.3% random-chance baseline (seat means 15.6%–31.7%); better at higher draft seats; worst cell 3.2% (2013-14, pick 11).
- Most Categories: **37.7%** mean (seat means 32.9%–46.1%).
- Emergent behavior: category win-rate histograms show mass slightly above 50% plus a lower mode at 0% — H0 **implicitly learns punting**; "soft-punting": most weights slightly above 100%, ~20% of weights below 0.95 (≈1–2 punted categories at ~75% weight); rarely pushes any category to 100%.
- Calibration: expected vs actual category win rates match closely above ~10%; distortions below (over-predicts assists/3s/blocks, under-predicts turnovers/FT%).
- ω/γ empirical fits: slopes 0.37 (R² 47%) and 0.87 (R² 46%) vs assumed 0.25/0.7.
- Turnovers: NOT down-weighted by default (contrary to analyst folk wisdom); gradient analysis (Tab. 4) shows turnovers ≈ as important as other counting stats.

## 8. Code / data availability
None stated (methods fully specified; uses scikit-learn's assignment solver).

## 9. Leakage & limitations
Simulated opponents use static G-scores (not adaptive humans); known/static distributions; equal-variance and category-independence assumptions violated in reality (blocks are heavy-tailed); no trades/waivers/injuries mid-season; no Rotisserie (1.32×10⁷⁸ orderings infeasible); local optima; playoff-week scheduling ignored. Author discusses all of these in §5.2.

## 10. GSE overlap
DFS lane. Existing-research-map check: no prior ledger covers dynamic draft-pick optimization or the punting-as-emergent-behavior result; DFS/lineup-optimizer material in the corpus is static-projection based. No duplication — this is the first dynamic H2H draft optimizer in the corpus.

## 11. GSE implementation spec
Adapt H-scoring to NFL DFS lineup construction (`gse_hscore.py`):
1. Map the framework: categories → scoring-relevant stat differentials vs field; draft picks → lineup slots under a salary cap (cap replaces the positional structure; assignment problem becomes a knapsack/ILP for slot+salary feasibility).
2. Strategy params j: per-position exposure targets + stack/correlate weights (the analog of jC); optimize per candidate player via gradient descent on V = P(lineup cashes) or expected GPP payout, where the outcome distribution comes from the engine's player-score distributions.
3. Opponent model: field lineups ~ ownership-weighted random (the paper's "opponents draft randomly" assumption maps to field-ownership chalk).
4. Key adaptation to test: whether soft-punting emerges as contrarian low-owned differentiation — i.e., the optimizer should learn to fade over-owned players implicitly via the tipping-point-weighted gradients.

## 12. Reproducible test
Backtest on one NFL DFS season: H-score-constructed lineups vs static projection-ranked lineups (same salary cap) in simulated contests vs ownership-weighted field; metrics: cash rate, ROI, GPP top-0.1% rate. Mirror the paper's seat analysis by testing across salary-cap utilization tiers.

## 13. Acceptance / rejection gate
ADAPT bar: H-score lineups must beat static-ranked lineups on ROI in backtest with the paper's margin-of-safety spirit (≥2× cash-rate baseline improvement); if the optimizer collapses to static rankings (no emergent differentiation), record the negative and keep the static optimizer.

## 14. Improvement experiment
(a) Replace the paper's equal-variance assumption with player-specific variance from the engine (directly addresses §5.2.3); (b) model week-to-week stat correlations (addresses §5.2.6) via a Gaussian copula on the engine's joint score distribution; (c) robust/multi-start optimization to escape the local-optima limitation (§5.2.9); (d) upside-quantile objective (top-1% payout) instead of expected value for GPP play (§5.2.7).

## 15. Appendix (read 2026-09-21; no verdict change)
- **Auction extension (A.1–A.2):** H-score → dollars via cash-equivalence: compare a player's H-score to the H-score of simply adding cash until break-even (exact method is expensive; H0 uses replacement-player + cash-level sweep). Team decomposition X(j) = Xs+Xp−Xos + MR + LD + Xδ(j): M extra players × R replacement profile, L extra dollars × D per-dollar category benefit; R estimated from highest G-score undrafted player (turnovers handled with inverted sign, ×−71 vs ×17 for other categories across 9 categories); D = above-replacement value / remaining money pool.
- **Future-pick distribution (B):** xδq ≈ correlated Gaussian; closed-form Xδ(jC) via the expected maximum of normals (Royston 1982) and Gaussian conditioning (jlewk 2022), scaled by (N−K−1) remaining picks.
- **Computation (C–E):** per-category gradient ∇V(j) = Σ_c PDF_c·∇X(j); "most categories" win probability via pruned scenario tree — 634 multiplications, a **69% reduction**; gradient gets a "tipping point" probability multiplier T(j,c1) (probability category c1 is decisive); even-category case halves the gradient weight.
(a) Replace the paper's equal-variance assumption with player-specific variance from the engine (directly addresses §5.2.3); (b) model week-to-week stat correlations (addresses §5.2.6) via a Gaussian copula on the engine's joint score distribution; (c) robust/multi-start optimization to escape the local-optima limitation (§5.2.9); (d) upside-quantile objective (top-1% payout) instead of expected value for GPP play (§5.2.7).
