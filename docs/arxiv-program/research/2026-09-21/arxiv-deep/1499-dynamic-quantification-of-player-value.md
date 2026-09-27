# [1499] Dynamic quantification of player value for fantasy basketball (arXiv:2409.09884v1)

**Citation:** Rosenof, Z. (2024). *Dynamic quantification of player value for fantasy basketball*. arXiv:2409.09884v1 [stat.ME]. URL: https://arxiv.org/abs/2409.09884
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, main body + appendices on auctions and future-pick estimation).
**Verdict:** ADAPT — H-scoring: a dynamic draft-value framework that optimizes per-pick category weights and positional allocations by gradient descent on format-specific win probability, implicitly learning to punt categories; beats static G-score rankings in 20 seasons of simulated 12-team drafts (21.8% Each-Category / 37.7% Most-Categories win rates vs 8.3% chance). Ports to GSE as adaptive DFS/fantasy draft strategy: optimize pick value against the evolving roster, not a static board.

## 1. Research question
Can player value in fantasy drafts be quantified dynamically — adapting to already-drafted players, positional needs, and format objectives — rather than via a static ranking list? The paper introduces the H-scoring framework and its implementation H0 for head-to-head category leagues, and tests whether it beats static G-score drafting in simulation.

## 2. Dataset / schema
Simulated NBA fantasy seasons 2004–05 through 2023–24: 12-team, 13-player head-to-head leagues; each player's season simulated by sampling 20 weeks from actual weekly performances (injured weeks excluded; players with <10 weeks excluded). Yahoo positional eligibility. 1,000 simulated seasons per draft seat (seats 0–11) per format → standard errors ≈ 1.6%.

## 3. Method / model
- **H-scoring framework:** for each candidate player, (1) estimate optimal strategy parameters j maximizing a format objective V(j); (2) draft the player with highest V(j). Three functions: X(j) = distribution of category-total differentials vs opponents; W(X(j)) = category win probabilities = CDF of the differential at zero; V(W) = format objective.
- **H0 implementation:** j = (j_C category weights summing to 1; j_U, j_G, j_F flex-share vectors). X(j) modeled as normal: X(j) = N·X_s + X_p + X_δ(j) − X_Om, variance 2N + (N−K−1)X²_σ. X_δ(j) approximates future-pick value under the planned strategy: assumes available players' stats are multivariate normal with category covariance Σ; the chosen player is ωσ above generic in the j_C basis and γσ below in the generic v basis (ω = 0.7, γ = 0.25, empirically calibrated via regression with R² ≈ 47%/46%).
- **Positional model:** assignment problem (Jonker-Volgenant via scikit-learn) placing drafted players in least-desirable eligible slots, freeing good slots for future picks; flex shares control expected position mix.
- **Objectives:** Each Category: V = Σ_c w_c. Most Categories: V = P(win majority) over the 256 winning scenarios in 9-cat (computed via tipping-point probabilities T(j, c₁)). Gradient descent with Adam; j initialized as v perturbed 1/500 toward the candidate's stats (exactly v gives undefined gradient); V is non-convex (normal CDF), so only local optima.
- **Category win prob:** w_c = ½[1 + erf(μ/(√2·σ))].

## 4. Equations & assumptions
- X-scores: X_p = (m_p − m_μ)/m_τ (counting); X_p = (a_q/(a_μ))·(r_q − r_μ)/r_τ (percentage). v converts X-score → G-score basis: v = m_τ/√(m²_τ + m²_σ).
- w_c = ½ + ½·erf(μ/(σ√2)).
- Each-Category gradient: ∇V = Σ_c PDF_c(X(j))·∇X(j).
- Assumptions (paper's own list, Sec. 5.2): fixed positional structure; known static performance distributions (no drift, no trades/waivers); equal variance per player per category; future picks multivariate normal; percentage stats ≈ counting stats in X-basis; category independence week-to-week; maximize expected value (not title odds); opponents draft by G-score order; local optimum suffices.

## 5. Features / target
Features: candidate player's X-scores, drafted roster's aggregate X-scores, positional eligibility, category covariance Σ, positional category means μ_C. Target: V(j) — format-specific win probability if this player is drafted.

## 6. Validation design
Simulation study (not a train/test split): H-score drafter at each seat vs 11 G-score drafters, 1,000 seasons × 20 years × 12 seats × 2 formats. Reports win rates with ≈1.6% SE. No real-draft validation.

## 7. Numerical results / baselines
- Win rates: 21.8% (Each Category) and 37.7% (Most Categories) vs 8.3% random-chance baseline — beats static G-score drafting decisively.
- Better from higher draft seats (top picks make the job easier); worst case 3.2% (2013–14, 11th pick, Each Category).
- Implicit punting: category win-rate histograms show mass slightly above 50% plus a lower mode at 0% — H0 learns to punt without being told. "Soft punting": optimal weights mostly slightly above default, with a long tail below (~20% of weights < 0.95, i.e., 1–2 punted categories); weights rarely go to 0%.
- Gradient intuition: gradients ∝ category PDF at zero — average categories get boosted, weak ones snowball downward (punt), strong ones are held slightly above 50% rather than maxed.
- Most-Categories punting is more extreme (no marginal value beyond the majority).
- Predicted vs actual category win rates match above ~10%; distortions below (assists/3s/blocks over-predicted; turnovers/FT% under-predicted).
- Turnovers: not down-weighted by default, contrary to analyst folk wisdom; correlated-multivariate-normal gradient analysis (Table 4) shows turnovers ≈ as important as other counting stats.
- ω/γ calibration: best-fit slopes 0.37 (R² 47%) and 0.87 (R² 46%) vs assumed 0.7/0.25 — roughly consistent.

## 8. Code / data availability
None stated. Methods described in enough detail to reimplement; assignment via scikit-learn's linear_sum_assignment.

## 9. Leakage & limitations
- Opponents modeled as naive G-score drafters — real opponents punt, adapt, and trade; H0's edge shrinks against smart fields.
- Static performance distributions: no in-season drift, injuries (beyond exclusion), or waiver wire — the paper flags this as the biggest gap.
- Equal-variance and multivariate-normal assumptions are "roundly unfounded" (paper's words); blocks have heavy right tails.
- Week-to-week category correlations ignored (no closed-form multivariate normal CDF).
- Local optima only; robustness to wrong assumptions not guaranteed.
- Rotisserie format computationally infeasible (12! orderings per category).
- No real-money or real-draft validation — simulation only.

## 10. GSE overlap
Per `/home/hatch/workspace/arxiv-sweep/existing-research-map.md` and arxiv-deep: ledgers 1090/1091/1092 cover DFS lineup optimization (given projections), and 1300 covers lineup construction from player stats, but no existing ledger covers adaptive draft strategy (snake drafts, season-long fantasy). This paper's H-scoring is the draft-strategy analogue of 1091's IP: 1091 optimizes a lineup given values; H-scoring computes values given the evolving draft. New capability, cleanly complementary.

## 11. GSE implementation spec
- Data: NFL season-long fantasy ADP + weekly projections (GSE's own), league format settings (categories or points).
- Build: (a) adapt H-scoring to points leagues: X(j) = projected-points differential distribution vs opponents; V(j) = P(finish position) approximated via Monte Carlo over remaining picks; (b) positional scarcity via the assignment-problem trick (flex shares → RB/WR/TE); (c) per-pick gradient-based weight optimization with the "soft-punt" insight: let the optimizer de-weight replaceable positions rather than hard-coding positional runs; (d) snake-draft seat adjustment.
- Effort: ~2 weeks (the X_δ future-pick approximation is the subtle piece; prototype in Python with scipy).

## 12. Reproducible test
Dataset: 2022–2024 fantasy football mock-draft simulations (12-team snake, PPR) with GSE projections as the information set. Metric: simulated season win rate / playoff rate vs ADP-based drafting and vs static projection ranking. Baseline: draft by static projected-points rank. Window: one-time simulation study across 3 seasons × all 12 seats.

## 13. Acceptance / rejection gate
ADOPT H-scoring-style dynamic drafting if, across 1,000 simulated seasons per seat, it beats static-rank drafting by ≥5 percentage points of playoff rate with SE ≤ 1.6%. Reject if the gain concentrates only in top seats (then it's just "drafting good players early," not strategy).

## 14. Improvement experiment
Add opponent modeling: replace the "opponents draft by static rank" assumption with a mixture over opponent archetypes (punters, position-runners, value drafters) fit from real ADP data, and test whether H-scoring's edge persists — this attacks the paper's weakest assumption with data Garrett can actually get.
