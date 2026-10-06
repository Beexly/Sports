# [0321] Lineup Regularized Adjusted Plus-Minus (L-RAPM): Basketball Lineup Ratings with Informed Priors (arXiv:2601.15000v1)

**Citation:** Christos Petridis, Konstantinos Pelechrinis (2026). *Lineup Regularized Adjusted Plus-Minus (L-RAPM): Basketball Lineup Ratings with Informed Priors*. arXiv:2601.15000v1. URL: https://arxiv.org/abs/2601.15000v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 333 lines).
**Verdict:** ADAPT — basketball lineup ratings do not transfer to the NFL, but the core device (ridge regression on sparse group units shrunk toward an *informed prior* built as the sum of member-level RAPM ratings from prior-season data) is a directly portable small-sample solution for any sparse NFL grouping problem (personnel packages, target-share units, DFS lineup combos); adapt the prior construction to NFL player EPA-based ratings and the likelihood to per-play EPA.

## 1. Research question
Given an opponent's lineup λ_O and a set Λ of possible lineups a team can play, by how many points does each lineup λ ∈ Λ expect to outperform λ_O? The motivating problem: NBA teams use 600+ lineups per season, the average lineup plays only ~17 offensive and ~17 defensive possessions (std 56), so raw lineup ratings are extremely noisy and have little predictive value — and no public method addresses lineup-level prediction with opponent adjustment.

## 2. Dataset / schema
NBA possession-level data for 2022-23 and 2023-24 seasons (regular seasons and playoffs). Each data point is a possession tuple: < p_i (points scored), offPl_{i,1..5} (5 offensive players), defPl_{i,1..5} (5 defensive players) >. 2022-23 is used to fit player RAPM ratings (priors); 2023-24 is the evaluation season. Data access: not stated as public — the underlying possession data is proprietary; the paper references the public NBA advanced stats lineup page (https://stats.nba.com/lineups/advanced/) only for raw lineup ratings context. Rookies/players absent from 2022-23 (no prior RAPM) have their offensive and defensive RAPM set to −1 each.

## 3. Method / model
Two components:
(a) **Player ratings via Sill (2010) RAPM**: ridge regression at the possession level. Each player p has two dummies: x_{i,p,off} = 1 if p on offense in possession i, x_{i,p,def} = −1 if p on defense, else 0. Objective: min_γ Σ_i (y_i − (γ_0 + Σ_j γ_{j,off} x_{i,j,off} + Σ_j γ_{j,def} x_{i,j,def}))² + λ_off Σ_j γ²_{j,off} + λ_def Σ_j γ²_{j,def}. γ_0 = league-average points per possession; γ_{p,off} = points/possession above league average contributed on offense; γ_{p,def} = points/possession below league average saved on defense. Regularization constants chosen by validation set: **λ_off = 4000, λ_def = 6000** (2022-23 data). Crucially, player ratings come from the *prior* season (2022-23 for 2023-24 lineup ratings).
(b) **L-RAPM lineup regression**: same structure but dummies are lineup units (l = number of distinct lineups), and the ridge penalty shrinks coefficients toward **informed priors** rather than zero: π_{λa,off} = league ppp + γ_{1,off} + γ_{2,off} + γ_{3,off} + γ_{4,off} + γ_{5,off} (and analogously for defense), where γ_{k} are the prior-season RAPM ratings of the five players in lineup λa. Objective: min_β Σ_i (y_i − (β_0 + Σ_j β_{j,off} x_{i,j,off} + Σ_j β_{j,def} x_{i,j,def}))² + λ Σ_j (β_{j,off} − π_{j,off})² + λ Σ_j (β_{j,def} − π_{j,def})². The regression covariates adjust for opposition faced; the shrinkage handles sparsity. For previously unseen lineups, prediction uses the prior π directly.

## 4. Equations & assumptions
Paper's stated equations, copied faithfully:

Player RAPM (Sill 2010): min_γ Σ_{i=1}^{n} (y_i − (γ_0 + Σ_{j=1}^{m} γ_{j,off}·x_{i,j,off} + Σ_{j=1}^{m} γ_{j,def}·x_{i,j,def}))² + λ_off Σ_{j=1}^{m} γ²_{j,off} + λ_def Σ_{j=1}^{m} γ²_{j,def}.

Informed priors: π_{λa,off} = league ppp + γ_{1,off} + γ_{2,off} + γ_{3,off} + γ_{4,off} + γ_{5,off}; π_{λa,def} = league ppp + γ_{1,def} + γ_{2,def} + γ_{3,def} + γ_{4,def} + γ_{5,def}.

L-RAPM: min_β Σ_{i=1}^{n} (y_i − (β_0 + Σ_{j=1}^{l} β_{j,off}·x_{i,j,off} + Σ_{j=1}^{l} β_{j,def}·x_{i,j,def}))² + λ Σ_{j=1}^{l} (β_{j,off} − π_{j,off})² + λ Σ_{j=1}^{l} (β_{j,def} − π_{j,def})².

Improvement metric: δ_{L−RAPM} = (RMSE_{L−RAPM} − RMSE_{baseline}) / RMSE_{baseline}.

Stated assumptions: (a) lineup performance is additively decomposable into player RAPM sums (prior); (b) prior-season player ratings are informative about current-season lineup quality; (c) a single regularization constant suffices for the lineup regression (authors flag this as a limitation — offense stabilizes faster than defense, Partnow 2021); (d) rookies can be imputed at RAPM = −1 (arbitrary); (e) possessions are exchangeable conditional on the units involved (no score/time context).

## 5. Features / target
Input features: per possession, the offensive lineup unit (5 player identities → lineup dummy) and the defensive lineup unit (5 player identities → lineup dummy); the informed prior π built from the five players' prior-season offensive/defensive RAPM ratings plus league-average points per possession. Target: y_i = points scored in possession i. Downstream: lineup offensive/defensive ratings (β coefficients) usable to predict points per possession of any lineup matchup, including unseen lineups via the prior.

## 6. Validation design
Expanding-window out-of-sample evaluation on the 2023-24 season: start with weeks 1–4 as observations, predict week-5 possessions; then expand weekly (weeks 1..n−1 → predict week n). Metric: weekly RMSE of predicted points per possession vs baseline of raw lineup offensive/defensive ratings. Additional analyses: δ_{L−RAPM} as a function of the number of training-sample possessions for the lineup (sample-size curve, Figure 3); unseen-lineup evaluation — possessions involving lineups never seen in training, where the baseline predicts league-average ppp and L-RAPM predicts via the prior (Figure 4). Always out-of-sample; no leakage from the evaluation season into the priors (priors use only 2022-23).

## 7. Numerical results / baselines
All numbers quoted from the paper (paper's claims):
- RAPM tuning: λ_off = 4000, λ_def = 6000 minimized validation error on 2022-23 data.
- L-RAPM improves over the raw-rating baseline in every week of the 2023-24 season (Figure 2), with week-to-week variability and no clear within-season trend.
- Sample-size curve (Figure 3): improvement is largest for lineups with few training possessions (<50); for lineups with >500 possessions, raw ratings perform nearly as well as L-RAPM (opponent mix has converged).
- Unseen lineups: L-RAPM consistently outperforms the league-average baseline with **δ_{L−RAPM} ∼ 5%** (Figure 4); the final 2 weeks are outliers (playoffs: very few games and very few newly seen lineups).
- Practical significance: "even a 1.5% improvement adds up quickly over the possessions of a whole game to approximately 3.4 points, which is not small" — larger than the ~2-point home edge betting markets price into the handicap (Lopez et al. 2018).

## 8. Code / data availability
Code: none stated. Data: possession-level NBA data — not stated as publicly available (proprietary source implied); public reference is the NBA advanced stats lineup efficiency page. No GitHub link given.

## 9. Leakage & limitations
- **No temporal leakage**: priors strictly from the prior season; expanding-window evaluation is strictly out-of-sample. Clean.
- **Stale priors**: player ratings from the prior season only; no within-season updating. Discussed by authors — would capture current form better but costs compute; would also fix the rookie problem.
- **Arbitrary rookie imputation**: unseen players set to RAPM = −1 (both sides) — a made-up number that could bias priors for young lineups; no sensitivity analysis.
- **Single λ for offense and defense** in the lineup regression, despite evidence offense stabilizes faster (Partnow 2021) — authors flag this; separate constants would likely improve results (i.e., reported gains are a lower bound).
- **Additivity assumption**: prior = sum of individual RAPMs ignores lineup fit/chemistry (the very interaction the method might want to capture); regularization to an additive prior may under-shrink synergistic lineups.
- **Playoff tail**: unseen-lineup test degrades to tiny samples in the final two weeks — the ~5% figure is regular-season-driven.
- **Proprietary data**: possession-level lineup data is not public, so independent replication is hard; evaluation is NBA-only.
- NFL external validity: basketball lineups (5 fixed players, alternating possessions) map poorly to football; the *statistical device* (informed-prior shrinkage for sparse group estimates) transfers, not the sport structure.

## 10. GSE overlap
Existing map coverage: the corpus has plus-minus-adjacent NFL material (nflWAR 1802.00998 — player value decomposition) and small-sample calibration work, but **no informed-prior shrinkage for sparse group estimates** anywhere in the repo. NFL analogs of the sparse-group problem exist in Garrett's work implicitly: personnel-package efficiency (11 vs 12 vs 21 personnel EPA on small samples), down/distance splits, DFS lineup-combination correlation. None currently use member-sum priors. **Verdict: new capability** — the statistical device is absent from the corpus; it is a general small-sample estimation technique, not a duplicate.

## 11. GSE implementation spec
Build an NFL "G-RAPM" (grouping-regularized adjusted EPA) module:
- **Data**: nflverse play-by-play 2020–2025. Grouping units: offensive personnel packages (e.g., team × personnel × down-band) or receiver target units (e.g., 3-WR sets), each observed on small play samples — the NFL analog of sparse lineups.
- **Member ratings**: per-player EPA-based ratings from the prior season (e.g., prior-year EPA/target for receivers, EPA/rush for backs, adjusted for the repo's existing opponent-adjustment conventions) — the analog of RAPM.
- **Prior**: π_{group} = league-average EPA/play + Σ member ratings; ridge regression of per-play EPA on group dummies shrunk toward π, with separate λ for early-down vs late-down (the paper's own improvement note, mapped to football).
- **Use cases**: (a) evaluating rare personnel packages (e.g., 6-OL sets, wildcat) without waiting for samples to accumulate; (b) DFS showdown/slate lineup-combo projections — predict a stack's EPA from member priors when the exact combo has few observed snaps; (c) in-season trade/injury evaluation of new groupings (the "unseen lineup" case → paper's 5% analog).
- **Effort**: 1 engineer-day prototype on nflverse; the math is closed-form ridge (no MCMC needed).

## 12. Reproducible test
Dataset: nflverse play-by-play, 2021–2024 (priors from season N−1, evaluation on season N), restricted to team × personnel-grouping units with <100 plays in the evaluation season's first 8 weeks. Metric: out-of-sample RMSE of predicted per-play EPA for weeks 9–17 plays, G-RAPM vs baseline of raw group EPA/play. Baseline to beat: raw small-sample group EPA (the paper's "raw rating" analog). Window: 4 seasons, expanding weekly exactly as the paper (weeks 1..n−1 → week n). Must replicate the paper's sample-size curve: plot improvement vs group sample size; expect the same monotone decay.

## 13. Acceptance / rejection gate
**Adopt** if, on 2021–2024 data, G-RAPM beats raw group EPA/play on out-of-sample RMSE for sparse groups (<50 plays) in at least 3 of 4 seasons, with relative improvement ≥ 3% for the <50-play bin and no bin where it underperforms the baseline by > 1% (mirrors the paper's "never worse, better when sparse" profile). **Reject** if the prior adds nothing beyond raw estimates once opponent adjustment is included — i.e., if the informed prior's gain vanishes after the repo's existing opponent-adjusted EPA is used as the baseline (then the device is redundant with in-house adjustment).

## 14. Improvement experiment
Beyond the paper: replace the paper's fixed additive prior with a **learned interaction prior** — fit a gradient-boosted model (or the repo's tabular-learner stack from the 15-area ML brief) predicting group EPA from member ratings *plus* pairwise interaction features (e.g., receiver route-complementarity, OL continuity), then use its predictions as π in the ridge shrinkage. This directly attacks the paper's additivity limitation: the prior captures chemistry/synergy from historical data while the ridge term still handles sparsity. Test whether the learned prior beats the additive prior on the unseen-grouping test — if synergy is real and stable, this should widen the paper's ~5% gap.
