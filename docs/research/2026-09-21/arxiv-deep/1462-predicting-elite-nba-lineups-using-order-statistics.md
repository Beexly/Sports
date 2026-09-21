# [1462] Predicting Elite NBA Lineups Using Individual Player Order Statistics (arXiv:2303.04963v1)

**Citation:** Martonosi, S. E., Gonzalez, M., & Oshiro, N. (2023). *Predicting Elite NBA Lineups Using Individual Player Order Statistics*. arXiv:2303.04963v1 [stat.AP]. URL: https://arxiv.org/abs/2303.04963
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, 12 pages).
**Verdict:** REJECT — duplicate of ledger 1300, which already deep-read this exact paper (arXiv:2303.04963v1) on 2026-09-21 with an ADAPT verdict; the valuable content is already in the corpus. Replaced by ledger 1499 (arXiv:2409.09884v1).

## 1. Research question
Same as ledger 1300: can elite five-man NBA lineups (positive plus-minus per minute) be predicted from individual-player order statistics without the five ever having shared the court?

## 2. Dataset / schema
Same as ledger 1300: 2017–18 BigDataBall play-by-play plus NBA.com box/hustle data; 28 player statistics × five order statistics = 140 lineup predictors; players ≥50 minutes, lineups ≥25 minutes, 888 lineups, random 712/176 split.

## 3. Method / model
Same as ledger 1300: seven-model unanimous classifier (tree, RF, boosting, SVM, KNN, logistic regression, LDA). Test elite precision 13/15 = 86.7%; overall accuracy 52.3%; next-season restricted evaluation 20/26 = 76.9% precision vs 62.1% prevalence.

## 4. Equations & assumptions
See ledger 1300. Key caveat already recorded there: random same-season split shares players/teams; PMM is among player features.

## 5. Features / target
Same as ledger 1300.

## 6. Validation design
Same as ledger 1300.

## 7. Numerical results / baselines
Same as ledger 1300 (13/15 = 86.7% elite precision; 52.3% accuracy; 20/26 = 76.9% next-season precision vs 62.1% prevalence).

## 8. Code / data availability
See ledger 1300.

## 9. Leakage & limitations
Duplicate read — no new limitations beyond those in ledger 1300. This entry exists only to satisfy the replace-on-duplicate rule.

## 10. GSE overlap
Ledger 1300 (`1300-predicting-elite-nba-lineups-using-order-statistics.md`) already holds this paper's content with an ADAPT verdict: unanimous-consent classifier ensemble + player-order-stat aggregation for DFS lineup/stack construction. Writing a second ledger would double-count.

## 11. GSE implementation spec
Not applicable — see ledger 1300.

## 12. Reproducible test
Not applicable — see ledger 1300.

## 13. Acceptance / rejection gate
REJECT as duplicate: the paper's arXiv ID (2303.04963v1) matches ledger 1300 exactly, and the reserve replacement (1499) was fully read instead.

## 14. Improvement experiment
Not applicable — improvement experiments belong on ledger 1300.
