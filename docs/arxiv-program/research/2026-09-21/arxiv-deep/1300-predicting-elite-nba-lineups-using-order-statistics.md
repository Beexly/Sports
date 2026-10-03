# [1300] Predicting Elite NBA Lineups Using Individual Player Order Statistics (arXiv:2303.04963v1)

**Citation:** Martonosi, S. E., Gonzalez, M., & Oshiro, N. (2023). *Predicting Elite NBA Lineups Using Individual Player Order Statistics*. arXiv:2303.04963v1 [stat.AP]. URL: https://arxiv.org/abs/2303.04963
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** ADAPT — unanimous-consent classifier ensemble that identifies elite five-man NBA lineups from individual-player order statistics without requiring the five to have played together; directly ports to DFS lineup/stack construction and player-acquisition screening. (Replacement for REJECT 1092.)

## 1. Research question
Can elite five-person NBA lineups (positive plus-minus) be predicted from individual player statistics alone — without requiring those five players to have ever shared the court?

## 2. Dataset / schema
NBA seasons used for training/testing (player-level box-score statistics plus lineup plus-minus records). 28 individual player statistics (listed in Appendix A) are expanded into 140 order-statistic predictors per candidate lineup (e.g., the best, 2nd-best, ..., worst value of each statistic among the five players). Lineups are labeled elite if they have a positive plus-minus; elite prevalence in the restricted next-season sample is 62.1%.

## 3. Method / model
Seven classification tools (a decision tree, random forest, boosting, support vector machine, k-nearest neighbors, logistic regression, and linear discriminant analysis) are trained on the 140 order-statistic predictors. Predictions are combined into a unanimous consent classifier (all-or-nothing classifier, ANC): a lineup is predicted elite only if all seven classifiers agree. This deliberately trades recall for precision — only the highest-confidence lineups are flagged.

## 4. Equations & assumptions
- Order-statistic feature expansion: for each of 28 player statistics, the five lineup members' values are sorted and the full sorted vector (min through max) enters the feature set, giving 28 × 5 = 140 predictors.
- Unanimous consent rule: predict elite iff all seven classifiers vote elite.
- Assumptions: elite status (positive plus-minus) is a valid proxy for lineup quality; order statistics of individual stats capture lineup synergy without interaction terms; classifier unanimity is a valid high-precision filter.

## 5. Features / target
Features: 140 order statistics from 28 individual player statistics. Target: binary elite indicator (positive plus-minus).

## 6. Validation design
Train on earlier seasons, test on held-out lineups; a restricted evaluation on next-season lineups tests generalization to unseen player combinations (lineups whose members never played together).

## 7. Numerical results / baselines
- Test-set precision of the unanimous consent classifier: 86.7%; overall accuracy 52.3% (recall deliberately sacrificed).
- Restricted next-season evaluation: 76.9% precision vs 62.1% elite prevalence (baseline).
- The unanimous classifier identifies elite lineups even when the five players never played together — the key generalization result.

## 8. Code / data availability
Data: NBA box-score and lineup plus-minus records (public). Code: not stated in paper.

## 9. Leakage & limitations
Temporal validation (next-season test) guards against look-ahead leakage. Limitations: plus-minus is a noisy, context-dependent label (opponent/schedule effects); unanimity kills recall, so most elite lineups are missed; no salary/DFS-pricing integration; NBA-specific feature set.

## 10. GSE overlap
Consulted `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`. Gap 10 (DFS-specific optimization literature) and Gap 11 (non-NFL sports depth) both apply. Repo DFS work (2026-09-13, 2026-09-19) covers lineup construction heuristics and ownership but no academic lineup-quality classification; no unanimous-ensemble or order-statistic lineup features exist in the corpus. No duplicate.

## 11. GSE implementation spec
1. Replicate on NFL DFS: replace 28 NBA stats with per-player fantasy-relevant stats; define the target as GPP-winning-lineup membership or top-1% lineup finish.
2. Expand each slate's player pool into order-statistic predictors per candidate lineup (sorted by projection, ceiling, ownership, leverage).
3. Train a diverse classifier set; apply the unanimous-consent rule to generate a high-precision short list of lineups for final optimizer seeding.
4. Calibrate the precision/recall trade-off against contest payout structure (top-heavy GPPs favor the unanimity filter).

## 12. Reproducible test
Rebuild on one NBA season of public data: confirm 86.7%-level test precision of the unanimous rule vs the 62.1% prevalence baseline; then port the feature-expansion recipe to one NFL DFS slate and compare optimizer output quality (simulated ROI) with and without unanimity filtering.

## 13. Acceptance / rejection gate
ADAPT: elite-lineup identification without shared-court history is a genuinely transferable DFS/stacks technique, and the unanimous-consent ensemble is a portable high-precision filter for any GPP lineup pipeline.

## 14. Improvement experiment
Replace unanimity with a calibrated agreement-threshold (k-of-7 votes) tuned per contest payout curve; add interaction features (teammate/opponent overlap) to recover some of the sacrificed recall; test on NFL showdown and classic slates.
