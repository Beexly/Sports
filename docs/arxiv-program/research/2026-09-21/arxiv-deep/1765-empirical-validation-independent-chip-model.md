# 1765 Empirical Validation of the Independent Chip Model (arXiv:2506.00180v1)

**Citation:** Juho Kim (2025). *Empirical Validation of the Independent Chip Model*. arXiv:2506.00180v1. URL: https://arxiv.org/abs/2506.00180
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).

## 1. Research question

Does the Independent Chip Model (ICM) — the cornerstone of poker tournament strategy — actually work on real data at scale? The paper introduces a dataset of 10,000+ poker tournaments and runs two experiments: (1) ICM beats a proposed baseline; (2) ICM systematically underestimates large stacks and overestimates short stacks.

## 2. Dataset / schema

- **New dataset:** results of 10,000+ poker tournaments (the paper's contribution).
- **Experiments:** (1) ICM vs baseline accuracy in predicting tournament outcomes; (2) calibration analysis by stack size (large vs short stacks).

## 3. Method / model

Standard ICM (Malmuth-Harville recursion) compared against a baseline predictor on the 10k-tournament dataset. Calibration: bin players by stack size, compare ICM-implied finish probabilities to realized frequencies.

## 4. Equations & assumptions

- ICM: P_i(1st) = chips_i/Σchips; P_i(kth) via recursive conditional probabilities.
- Finding: E[realized | ICM-predicted] shows ICM underestimates P(large stack wins) and overestimates P(short stack cashes).
- Assumptions: tournament results are i.i.d. draws; ICM's skill-homogeneity assumption is the source of miscalibration (large stacks are large partly because they're skilled).

## 5. Features / target

Features: chip-stack vectors at tournament stages. Target: finish positions / prize outcomes.

## 6. Validation design

10,000+ tournaments; ICM vs baseline head-to-head; calibration by stack-size bins. Large-scale and reasonably designed for its question.

## 7. Numerical results / baselines

- ICM beats the baseline (exact margins in the paper's tables).
- Systematic miscalibration: ICM underestimates large-stack performance, overestimates short-stack performance (consistent with Henke's WPT finding cited in 0911.3100).

## 8. Code / data availability

Dataset introduced in the paper; availability not verified from the text read. No code repo linked.

## 9. Leakage & limitations

- **Poker-only:** the dataset, the model, and the findings are all about poker tournament chip stacks. DFS has no chip stacks, no eliminations, no ICM analogue — the miscalibration finding (large stacks are skilled) has no DFS translation.
- **Validates ICM; doesn't replace it:** the paper confirms ICM is roughly right but miscalibrated. For GSE, this provides no new method — and the direction (ICM needs skill-adjustment) is already covered by 2608.09586's SCO approach (ledger 1761), which is the superior ADAPT.
- **No transferable methodology:** the validation design (bin by stack size, compare to realized) requires a "stack" concept that doesn't exist in DFS.

## 10. GSE overlap

The tournament-equity theme overlaps with ledgers 1761 (SCO) and 1762 (ICM risk aversion), but this paper adds nothing beyond "ICM is approximately valid but miscalibrated by stack size" — a poker-specific empirical finding with no DFS implementation path. Ledger 1761 already provides the superior forward-looking method.

## 11. GSE implementation spec

None — the empirical finding (ICM stack-size miscalibration) does not transfer to DFS, and the validation methodology requires chip-stack data that doesn't exist in fantasy sports.

## 12. Reproducible test

Not applicable for GSE — poker tournament data, no DFS analogue.

## 13. Acceptance / rejection gate

**Reject** because the paper's contributions (10k poker tournament dataset, ICM calibration finding) are poker-specific with no transferable method or implementable artifact for DFS lineup optimization, contest selection, or payout exploitation. The tournament-equity lane is better served by ledger 1761.

## 14. Improvement experiment

None — no DFS-transferable foundation.

**Verdict:** REJECT — Large-scale poker ICM validation with a stack-size miscalibration finding. Poker-specific throughout; no transferable method for DFS, and the tournament-equity value is already captured better by ledger 1761 (SCO).
