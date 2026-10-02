# MIMO Unit 1 (xFP / FPOE) 2026-09-18

Measured on free nflverse data. Kill line pre-registered before the holdout run.

OBSERVATION (unit1_holdout.json, exit code 2):
- n_pairs 6022
- spearman_xfp 0.210119
- spearman_naive 0.226608 (raw prior-week PPR)
- delta_rho -0.016489
- week-bootstrap 95% CI on delta [-0.039590, 0.008622]
- rmse_xfp 8.696999 vs rmse_naive 10.271886 (secondary only)

VERDICT: FAIL. xFP did not beat naive raw fantasy points on the pre-registered
holdout Spearman. Do not treat FPOE buy/sell language as out-of-sample edge
support. Full writeup: scripts/research/mimo-xfp/RESULT_UNIT1.md
Local branch: mimo/mimo-xfp-2026-09-18 commit 735cb6f5d (NOT pushed).
Worktree: C:\Users\Garrett\Sports-worktrees\mimo-xfp-2026-09-18
Attribution: Data via nflverse (nflverse-data), CC BY 4.0.

Unit 2 is independent and pre-registered in PREREGISTRATION_UNIT2.md.
Unit 4 stays blocked until Unit 3 returns a verdict.
Agent-bus roster still lacks mimo on the remote, so bus post failed; this
section and the worktree artifacts are the record until the roster includes mimo.
