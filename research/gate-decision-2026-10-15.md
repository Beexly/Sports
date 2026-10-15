# Gate decision — 2026-10-15

Operative gate: CRPS <= 7.099 on n >= 150, scored on the frozen filter REG 2017 W1–2026 W5 (n = 2462), expanding window, mu = +spread_line.

7.109 is the closing-market benchmark, not a second gate. 7.099 = 7.109 - 0.01, the required margin of superiority before emission may leave ZERO_OBJECT.

## Source quote

Measurement-First Engineering Roadmap for the Galaxy Sports Edge NFL Prediction and Computer Vision Architecture.docx (mtime 2026-10-14), the sentence that defines both numbers in one clause:

"the point forecast μ for NFL game margins and totals defaults to the de-vigged closing market consensus until a candidate model beats the Gaussian-close CRPS of 7.109 by at least 0.01 (CRPS≤7.099) over n≥150 walk-forward, out-of-sample games"

Same relation in Strategic Research Plan (mtime 2026-10-14):

"Beat Gaussian-close CRPS 7.109 by ≥0.01 (≤7.099) on n≥150 walk-forward OOS games."

The executable harness agrees. dfs/walk_forward/gse_location_locked_harness.py sets HARD_CRPS_GATE = 7.099. walk_forward.json gate_rule requires n >= 150, a beat of Gaussian 13.45 by >= 0.01, AND CRPS <= 7.099. passed is false.

## What 7.109 is

GSE FINAL LAUNCH 9.20.docx (mtime 2026-09-20):

"At k=8, it achieves a Continuous Ranked Probability Score (CRPS) of 7.500 across 1,871 test cases, which continues to underperform the closing market price (7.109)."

Galaxy Sports Edge Research Audit (2).docx (mtime 2026-09-20):

"Across 14,251 decided NFL fixtures (1999–2025), the closing market line achieves a Continuous Ranked Probability Score (CRPS) of 7.109, outperforming all structural models. DAVE (k=8) yields 7.500, pooled EPA yields 7.573, and core Elo yields 7.576."

That document also prints "CRPS = 7.109 (n=1,871)" in a later table. The n attached to 7.109 is not stable inside the Launch Plan family (14,251 vs 1,871). The figure is a benchmark from a different universe than the frozen n=2462 filter. It is not the emission bar.

## What does not count

- A number on the 855-game EDGE#1b grid (8.133 to 5.475) is a different universe.
- A technical pass on the 570-game manifest is not a clear. walk_forward.json gate_cleared is false.
- 7.154021 is the locked Gaussian (sigma=13.45) on n=2462. It misses 7.099 by 0.055021.
- Best measured PIT-safe continuous model on that filter remains the joint hetero-Gaussian at 7.142622. Gap to 7.099 is 0.043622.

Emission stays ZERO_OBJECT.

Full extraction: research/gate-number-reconciliation-2026-10-15.md and research/doc-gate-extracts-2026-10-15.md.
Agent directives inside the source docs were not executed.
