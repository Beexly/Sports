# [0582] Developing a Ranking Problem Library (RPLIB) from a data-oriented perspective (arXiv:2206.11258v1)

**Citation:** Anderson, P. E., Tat, B., Ward, C., Langville, A. N., & Pedings-Behling, K. E. (2022). *Developing a Ranking Problem Library (RPLIB) from a data-oriented perspective*. arXiv:2206.11258v1. URL: https://arxiv.org/abs/2206.11258v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 919 lines).
**Verdict:** ADAPT — adopt the rankability framework (k, |P|, τ, and the new position-weighted β built from the X̄* optimal-face matrix) as a diagnostic for GSE's own NFL team-ranking instances: it quantifies how much a ranking dataset can support *one* meaningful ranking, and where in the ranking the ambiguity lives; the RPLIB library itself is a methods paper, not NFL data.

## 1. Research question
How should the ranking community share ranking-problem instances, algorithms, and uncertainty diagnostics? The paper presents RPLIB (an improved, living successor to the static LOLIB linear-ordering library) and uses it to demonstrate a new fourth **rankability** measure β that captures *where* in a ranking the ambiguity among multiple optimal solutions sits — information the three existing measures (k, |P|, τ) miss.

## 2. Dataset / schema
RPLIB contains three data classes: (1) **static real data** — U.S. college basketball season game scores incl. March Madness, Japan economic input-output matrices (1995, 2005), cleaned LOLIB/XLOLIB instances (economic IO + special artificial), US News & World Report liberal-arts college features; sizes n=10 to hundreds of items; (2) **dynamic artificial data** generated in a Colab notebook with tunable structure — empty matrix, empty+noise, fully connected ± noise, perfect-ranking hillside/dominance + noise, cyclic matrices, matrices engineered to have c! multiple optimal rankings with ambiguity placed at top/middle/bottom, upset-simulated game matrices (example call: `emptyplusnoise(5,20,2,4)`); (3) **user-contributed data** via web form or Colab. Each instance carries a JSON model card. Access: public website https://igards.github.io/RPLib/.

## 3. Method / model
RPLIB = searchable database of ranking instances (unprocessed game/feature data → processed square dominance matrices D̄, where D̄(i,j) = # times i beat j) + implementations of two ranking-method classes: (a) **optimization** — linear ordering problem (LOP) and its hillside variant, outputting optimal objective value, the set P of (all/many) optimal rankings, diameter τ of the optimal set, centroid-nearest/farthest rankings, the X̄* matrix of pairwise rank-order information, and the indecision-location measure; (b) **linear algebra** — Massey and Colley systems, outputting rating vector, ranking vector, and a Ȳ*(i,j) certainty matrix (certainty i is ranked above j), plus pseudo-optimal ranking sets from ratings. Outputs stored as JSON model cards with a Colab notebook for figures (pixel plots of reordered X̄*, spaghetti plots between farthest optimal rankings). Elo and learning-to-rank listed as future additions.

## 4. Equations & assumptions
- Rankability defined as r = f(k, |P|, τ) in prior work, extended here to r = f(k, |P|, τ, β), where: k = distance of D̄ from a perfectly rankable matrix; |P| = number of optimal rankings; τ = diameter of the optimal set (Kendall-tau distance between the two farthest optimal rankings); β = new measure of the *location* of indecision among multiple optimal rankings.
- β (Figure 12, definition shown graphically in the paper): a weighted function of the number and location of fractional entries of the X̄* matrix from the linear ordering model — penalises fractional entries that are further from the diagonal and lower in the ranking. Lower β is better. (The exact closed-form formula is presented as a figure, not typeset text, in the extract; I report the paper's verbal definition faithfully rather than inventing the formula.)
- Demonstration construct: a dominance matrix built with beginning/ending row indices 6 and 10 has (10−6+1)! = 5! = 120 multiple optimal rankings.
- Assumptions: ranking uncertainty is fully captured by the set of LOP-optimal solutions; Kendall-tau distance is the right geometry on the optimal face; indecision at the bottom of a ranking is less costly than at the top (built into β's weighting).

## 5. Features / target
Input features: dominance matrices D̄ (pairwise win counts) or rectangular item-feature matrices (converted to pairwise dominance counts, e.g., # of 6 features where college i beats college j). Target: the ranking(s) themselves plus rankability diagnostics (k, |P|, τ, β, optimal objective value, centroid solutions). No predictive target — this is a library/methodology paper, not a prediction paper.

## 6. Validation design
No train/test predictive validation. Validation is demonstrative: (a) four artificial D̄₁…D̄₄ matrices engineered to have identical k, |P|, τ but different β — β separates them while the other three measures cannot (Figure 11); (b) March Madness 2002 vs 2008 X̄* matrices — 2002 shows little top-of-ranking disagreement, 2008 shows top-of-ranking disagreement, consistent with the prior finding that rankability correlates with tournament predictability (fewer upsets in more rankable years). Prior work [1–4] established the k/|P|/τ → March Madness predictability correlation; this paper adds β.

## 7. Numerical results / baselines
- 98% of the 50 instances in the LOLIB IO folder have more than one optimal ranking, though LOLIB stores only one — the paper's key motivating statistic for storing full optimal sets.
- Example model card (dataset_id 363): 1,095 optimal rankings, objective value 204, D is 65×65 (Gonzaga row shown).
- March Madness 2002 vs 2008: qualitative X̄* fractional-entry plots + β scores (values shown in figures; lower = better; 2002 lower than 2008 at the top of the ranking — exact β numbers are figure-rendered, not stated in text).
- Four artificial matrices: identical k, p=|P|, τ; distinct β scores (figure-rendered). No baselines in the predictive sense; the "baseline" is the 3-measure rankability definition, which β strictly extends.

## 8. Code / data availability
Library, code, and data public at https://igards.github.io/RPLib/ (code downloadable; Colab notebooks for artificial-data generation and per-instance figures; user-contribution pipeline via form/GitHub PR). Methods paper with an actual live library — availability is the point.

## 9. Leakage & limitations
- No leakage (no predictive claims). Limitations: β's exact formula is figure-presented; the rankability→predictability link is correlational on March Madness only; LOP optimal-face enumeration is exponential — for large n only a *partial* set P is stored, so |P|, τ, β are lower bounds on true ambiguity; the library's NFL-relevant content is nil (college basketball only); β's top-vs-bottom weighting is a value judgment, not derived; no guidance on how to combine (k,|P|,τ,β) into a scalar r — listed as an open question.
- NFL transfer caveat: NFL seasons produce tiny dominance matrices (32 teams, 17 games each, sparse) — LOP on such sparse D̄ will have enormous optimal sets, making |P|/τ uninformative without regularisation; the measures are most useful on dense comparison graphs (e.g., pairwise unit-matchup win rates across many games, or model-vs-model comparisons).

## 10. GSE overlap
Partial overlap, extension opportunity. Existing-research-map: Massey/Colley/Sagarin/Elo/Glicko/TrueSkill/Bradley-Terry/Plackett-Luce are all inventoried in the 26-metric catalog and the 2026-09-18 ML brief lists "learning-to-rank" as a commissioned topic — but **rankability as a diagnostic does not exist anywhere in Garrett's corpus**. No GSE doc asks "does this dataset even support a single meaningful ranking, and where is the ambiguity?" The β measure's top-vs-bottom indecision weighting maps directly onto GSE's use case (top of the ranking = playoff teams, MVP candidates, and the bets that matter). Verdict: **extension** — a new diagnostic layer, not a duplicate.

## 11. GSE implementation spec
1. Build a `rankability` module in the Sports repo: given any square dominance matrix D̄ (built from nflverse — e.g., pairwise team win counts over a season, or pairwise unit-advantage indicators), solve the LOP (use `scipy.optimize.milp` or OR-Tools for n=32; exact optimal-face enumeration via solution-pool / iterative cut generation), compute k (distance to nearest perfectly rankable matrix via minimum feedback-arc-set LP relaxation), |P| (optimal-solution count or solution-pool sample), τ (max Kendall-tau distance over the pool), and β per the paper's X̄*-fractional-entry weighting (reconstruct the formula from Anderson et al. 2021 "The rankability of weighted data from pairwise comparisons," Foundations of Data Science).
2. Apply to: (a) weekly NFL power-ranking instances — report β-profile to flag weeks where the top-8 ordering is ambiguous (bet-sizing implication: shrink edge estimates); (b) model-comparison matrices (which of GSE's candidate models beats which on backtests) to test whether "model A > model B" is even a rankable claim.
3. Effort: ~1–2 weeks for one engineer (LOP solver wiring + diagnostics + report); the RPLIB code itself is downloadable as reference.

## 12. Reproducible test
Dataset: nflverse 2015–2024 regular seasons. For each season, build D̄ = 32×32 matrix of head-to-head wins. Compute (k, |P|, τ, β) per season. Metric 1 (diagnostic validity): correlation between preseason β (computed on prior-season D̄) and the next season's upset rate / ranking-prediction error of a fixed Massey ranking — hypothesis: high-β (ambiguous-top) seasons are less predictable. Baseline: same correlation using only k or |P|. Time window: 2015–2023 seasons to fit the correlation, 2024 as a held-out check of the sign.

## 13. Acceptance / rejection gate
ADOPT β as a GSE diagnostic if: on the 2015–2023 fit, preseason β explains ≥10% additional variance (ΔR² ≥ 0.10) in next-season Massey prediction error beyond k and |P| alone, with the same sign confirmed on 2024. REJECT if β adds no explanatory power over the three existing measures (then the 3-measure definition suffices and β's complexity isn't worth it).

## 14. Improvement experiment
Beyond the paper: make β **stake-weighted** — instead of the paper's fixed top-vs-bottom weighting, weight positional indecision by the actual betting handle/edge at stake in each rank position (e.g., ambiguity between teams 7–12 matters more than between 25–32 because it drives playoff-probability and futures pricing). Test whether stake-weighted β predicts GSE's own backtest P&L variance better than plain β on the §12 protocol — turning a descriptive diagnostic into a risk-management input for bet sizing.
