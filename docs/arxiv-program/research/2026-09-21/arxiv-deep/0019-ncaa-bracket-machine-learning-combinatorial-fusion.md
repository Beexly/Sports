# [0019] NCAA Bracket Prediction Using Machine Learning and Combinatorial Fusion Analysis (arXiv:2603.10916)

**Citation:** (authors as listed on arXiv) (2026). *NCAA Bracket Prediction Using Machine Learning and Combinatorial Fusion Analysis*. arXiv:2603.10916v1. URL: https://arxiv.org/abs/2603.10916
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv HTML v1), all 642 lines — §I–II intro/lit, §III CFA framework (Eqs. 1–9), §IV data/base models (Eqs. LR/SVM/XGB), §V results (Figs. 3–4, Table I), §VI conclusions/discussion, all 41 references.
**Verdict:** ADAPT — college-basketball application and thin single-tournament evidence, but the transferable primitive is genuine: fuse *rank-space* outputs of diverse models, not just scores/probabilities, with weights from cognitive-diversity (RSC) functions. GSE's ensemble lane averages scores; rank-fusion is a different combination operator that is robust to miscalibrated probability scales. Gate it on a multi-season backtest before touching production.

## 1. Research question
Can pairwise game-outcome predictions be improved by viewing sports prediction as a *ranking* problem and fusing five diverse base models in both score space and rank space, using Combinatorial Fusion Analysis (CFA) with cognitive-diversity-based weights — and does a rank-space team ranking beat public NCAA ranking systems?

## 2. Dataset / schema
March Machine Learning Mania data (Kaggle), tournaments 2001–2022 (excl. 2020), plus KenPom team statistics per tournament team; 44 features → 26 after RFECV (5-fold CV on log loss). Features are team-level efficiencies (offense/defense), strength of schedule, luck; lower KenPom ranks = better. Design: for each game, compute difference features (Team1 − Team2); original dataset had all labels = 1 (Team1 always winner), so they swap Team1/Team2 to synthesize label-0 rows, then discard individual features, keeping only difference variables. Train/predict per year; test year = 2024 (63 tournament games); 10 prior years used for ensemble-model selection.

## 3. Method / model
Five base models: logistic regression (regularized, 10-fold randomized search), SVM (kernel search on log loss), random forest, XGBoost (regularized objective), CNN (sigmoid out, ReLU hidden, Adam + cross-entropy) — each with stratified 10-fold CV ×3 reps. CFA: enumerate (2^5−1−5)=26 model subsets × 6 combination forms (score vs rank × AC/WCP/WCDS) = 156 ensembles; reduced to 52 by keeping only diversity-strength weights. Diversity strength from rank-score characteristic (RSC) functions: DS(A_j) = cognitive diversity of model j (data-item-independent). Select the "ABE" (LR+SVM+CNN) rank-combination ensemble — the combo that beat the best individual model most frequently (6 of 10 prior years) — then apply to 2024.

## 4. Equations & assumptions
Eq. (1) score combination: s_sc(d_i) = (1/h)Σ_j s_{A_j}(d_i). Eq. (2) weighted by diversity strength DS(A_j) [L234 typo "D(A_j)" in prose]. Eq. (3) weighted by performance P(A_j) [sic: P(A_j) used in both Eq. (2) and (3) prose; Eq. (2) intended DS]. Eqs. (4)–(6) [L214–230] same three with scores; Eqs. (7)–(9) rank combination analogs with weights 1, 1/DS(A_j), 1/P(A_j) applied to ranks r_{A_j}(d_i). Assumptions: RSC/cognitive diversity measures ensemble-ability; model performances on prior years predict 2024 ensemble quality; difference-features fully capture matchup; KenPom annual stats are the right pre-tournament inputs; per-game pairwise accuracy is the right objective (no bracket-path coherence constraint).

## 5. Features / target
Input: 26 difference-features (KenPom-derived efficiencies, SOS, luck). Target: binary winner for each 2024 tournament game (63 games). Downstream: game rankings → average per-team rank → pairwise accuracy.

## 6. Validation design
Genuinely prospective in the temporal sense: the ABE ensemble and rank-combination procedure were fixed from the 10 prior years and applied to 2024 games. But the *selection* procedure examined 52 candidate ensembles over 10 years and chose the most-frequently-improving one — a multiple-comparison/seeded-selection design, not a pre-registered hypothesis. Baseline: 10 public ranking systems (Table I) evaluated on the same 2024 games.

## 7. Numerical results / baselines
- Rank combination (ABE): **74.60%** accuracy on 2024 games vs best public system 73.02% (NET Rankings, Logan) — a 1.58 percentage-point gap, ≈1 game out of 63. Not stated in paper, but 74.60% − 73.02% on 63 games cannot be statistically significant; treat as noise-adjacent.
- Score combination (ABE): 71.43% — beats only half the public systems.
- §V-A: on 2022, the LR+XGBoost ("2-com") and LR+XGB+CNN ("3-com") ensembles beat the best individual; rank combination (blue) vs score combination (orange) shown per-subset in Figs. 3–4 (figures are placeholder text "dajfkjasdkafdkfjaksdlfasdfsadfasddsfjkjaskdfljdskfjalskjdfklsjdafkljasdf" in the HTML — figures unreadable, exact per-combo values not extractable).
- Internal inconsistency: conclusion says "The CFA framework generates 56 ensembles from 5 base models" — contradicts §V-A's 156 (reduced to 52). Number not reconciled.

## 8. Code / data availability
Data from Kaggle March Machine Learning Mania + KenPom (public); no code repository stated. Partially reproducible in principle; KenPom snapshot timing not specified (season-end vs pre-tournament), which matters for leakage.

## 9. Leakage & limitations
(1) KenPom timing: paper says "annual statistics" without specifying pre-tournament snapshot; if season-end ratings incorporate tournament games, leakage. (2) Selection leakage: 52 ensembles × 10 years mined for the frequent winner; the 2024 "test" is clean only in the narrow temporal sense. (3) Single-tournament evidence (n=63 games), one season of out-of-sample. (4) Pairwise accuracy ignores bracket coherence and probability calibration (log loss not reported for 2024). (5) CNN on tabular difference-features is an odd, unexplained choice; no ablation of base models. (6) Figure captions render as garbage text; results rely on prose claims. (7) The "56 ensembles" conclusion typo undermines confidence in the reported enumeration.

## 10. GSE overlap
No duplication of the CFA primitive. GSE's model-combination work averages scores/probabilities (Euclidean space); rank-space fusion with cognitive-diversity (RSC) weights is not in the corpus. The existing map flags bandit/ensemble-selection as a GSE gap; this paper belongs to that neighborhood. Note §VI-B's claim that cognitive diversity "is independent of data items" is the theoretical hook: a diversity measure computed from model-output rank profiles alone, usable before ground truth arrives.

## 11. GSE implementation spec
ADAPT as an experimental ensemble mode: for each NFL slate, take GSE's existing pick models' outputs, convert win probabilities to ranks per game, and fuse via rank combination with RSC-based diversity weights (recompute RSC functions from the models' rank profiles over the season), comparing against the production score-average. No new data needed — runs on existing model outputs. Effort: days, not weeks.

## 12. Reproducible test
Backtest rank-fusion vs score-fusion vs performance-weighted fusion on 3+ NFL seasons of GSE model outputs, scoring per-game hit rate and log loss. Adopt rank-fusion only if it beats score-fusion on at least 2 of 3 seasons *and* the RSC diversity weights outperform uniform weights — the paper's two specific claims. If rank-fusion ≈ score-fusion, keep as a robustness variant for miscalibrated weeks, not the default.

## 13. Acceptance / rejection gate
ADAPT conditional on §12. Do not import the NCAA base models, KenPom features, or the ABE ensemble itself; import only the rank-space fusion operator and the RSC diversity-weight idea. Reject the paper's 74.60% headline as evidence — it is one game of margin on a single 63-game tournament after selection over 52 ensembles × 10 years.

## 14. Improvement experiment
The paper's own future work (all three weight types: average, performance, diversity strength) maps directly onto §12's three-way comparison. Improvement beyond it: make the fusion *adaptive within season* — recompute RSC diversity weights on a rolling window so the ensemble downweights models that have become mutually redundant as the season progresses, rather than fixing weights from prior-year analysis.
