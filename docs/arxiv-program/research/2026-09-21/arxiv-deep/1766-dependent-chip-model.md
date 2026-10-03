# 1766 The Dependent Chip Model (arXiv:2102.07738v1)

**Citation:** E. Besalú (2021). *The Dependent Chip Model (DCM): a simple and more realistic alternative to the Independent Chip Model (ICM)*. arXiv:2102.07738v1. URL: https://arxiv.org/abs/2102.07738
**Ledger completed:** 2026-09-22. **Read:** abstract only — full text NOT accessible (ar5iv returned abstract page only; PDF not fetched). Per the task's full-text rule, this paper cannot count regardless of verdict.

## 1. Research question

Can a "Dependent Chip Model" (DCM) — recursive exploration of a multiplayer Texas Hold'em game tree assuming all players have equal skill but different survival prospects from their stacks — price tournament equity more realistically than ICM for deal-making (chopping prize pools)?

## 2. Dataset / schema

No dataset described in the abstract. The method is computational: recursive game-tree exploration. 29 pages, 4 figures, 4 tables, 3 algorithms (per abstract).

## 3. Method / model

DCM: recursively explore the multiplayer Hold'em game tree, assuming equal playing skill (equal per-hand win probabilities) but stack-dependent survival. Prize differences arise purely from initial chip amounts. Claim: DCM awards MORE to top podium positions and LESS to lower ones than ICM, sometimes changing optimal tournament actions with "very important monetary implications."

## 4. Equations & assumptions

- Equal-skill assumption: all players have identical per-hand win probabilities.
- Recursive tree exploration (3 algorithms in the paper).
- Key claim: DCM_podium_top > ICM_podium_top; DCM_podium_bottom < ICM_podium_bottom.
- Assumptions: equal skill (strong and acknowledged); the game-tree recursion is computationally feasible for the relevant stack depths.

## 5. Features / target

Features: chip-stack vector. Target: tournament equity (deal-making chop amounts).

## 6. Validation design

Unknown — full text not read. The abstract claims monetary implications but describes no validation dataset.

## 7. Numerical results / baselines

Unknown — full text not read. Abstract reports only the directional claim (DCM more top-heavy than ICM).

## 8. Code / data availability

Unknown — full text not read.

## 9. Leakage & limitations

- **Full text not accessible:** ar5iv returned only the abstract page; the PDF was not fetched. Under the task's "full text only; never abstract-only" rule, this paper is disqualified regardless of content.
- **Poker deal-making:** the application is chopping prize pools in poker tournaments — negotiating splits, not strategic play. There is no DFS analogue (DFS players don't negotiate prize splits).
- **Equal-skill assumption:** even on its own terms, assuming all players have exactly equal skill is a strong limitation for any strategic application.
- **Superseded in-lane:** to the extent DCM is "a better ICM," ledger 1761 (SCO) already provides a strictly more general and better-validated replacement for ICM-based tournament equity.

## 10. GSE overlap

None — poker deal-making has no DFS application, and the tournament-equity theme is covered by ledgers 1761 and 1762.

## 11. GSE implementation spec

None — no DFS application exists for poker prize-chop negotiation models.

## 12. Reproducible test

Not applicable — full text unavailable and no DFS transfer.

## 13. Acceptance / rejection gate

**Reject** on two independent grounds: (1) full text not accessible (abstract-only disqualification per task rules); (2) poker deal-making content with no DFS transfer, superseded by ledger 1761 for tournament-equity purposes.

## 14. Improvement experiment

None.

**Verdict:** REJECT — Abstract-only (full text inaccessible; disqualified per the full-text rule). Poker prize-chop model with no DFS application, superseded by ledger 1761.
