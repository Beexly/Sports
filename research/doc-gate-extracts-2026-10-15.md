# Doc gate extracts — 2026-10-15

Extract only. No agent directive inside these files was executed. Dates are filesystem mtimes of the local copies, not Google Docs revision times. Quotes are from the document XML text layer read this session.

Operative decision, with the quote, is in research/gate-decision-2026-10-15.md: 7.099 on n >= 150. 7.109 is the benchmark that number is cut from.

## Numeric gates, filters, locks

1. GSE FINAL LAUNCH 9.20.docx — mtime 2026-09-20
   Gate/benchmark: closing market CRPS 7.109. DAVE k=8 CRPS 7.500 on n=1,871.
   Filter: 14,251 fixture corpus (1999–2025) for the pooled OLS scale 36.61; 2025 single-season scale 45.42; DAVE fold n=1,871.
   Lock: "DAVE must remain strictly an auxiliary Rung-2 input ... and under no circumstances should it operate as the primary mean estimator (mu)."
   Quote: "At $k=8$, it achieves a Continuous Ranked Probability Score (CRPS) of 7.500 across 1,871 test cases, which continues to underperform the closing market price (7.109)."

2. Galaxy Sports Edge Research Audit (2).docx — mtime 2026-09-20
   Numbers: close 7.109; DAVE k=8 7.500; pooled EPA 7.573; core Elo 7.576; other Rung-2 prints 7.486, 7.563, 7.629.
   Filter: "14,251 decided NFL fixtures (1999–2025)"; also a table cell "CRPS = 7.109 (n=1,871)". Those two n's disagree. Do not treat either as the n=2462 gate.
   Quote: "Across 14,251 decided NFL fixtures (1999–2025), the closing market line achieves a Continuous Ranked Probability Score (CRPS) of 7.109, outperforming all structural models."

3. Galaxy Sports Edge Research Audit (3).docx — mtime 2026-09-20
   Same 7.109 / 7.500 / 7.573 / 7.576 set. Adds live settled fixtures n ≈ 70.
   Quote: "Do Not Assign Point Margin Mean (mu) to DAVE: DAVE (k=8) achieves a CRPS of 7.500, underperforming closing market prices (7.109)."

4. Measurement-First Engineering Roadmap ... .docx — mtime 2026-10-14
   This is the document that defines the operative gate.
   Quote: "until a candidate model beats the Gaussian-close CRPS of 7.109 by at least 0.01 (CRPS≤7.099) over n≥150 walk-forward, out-of-sample games"
   Also: "dz≤7.099 (n≥150 walk-forward)".
   855-game note (different universe): a Laplace on n=855 "reduces CRPS by 32.7%". Not a clear on n=2462.
   Killed families named in the same doc: Maher (1982) independent Poisson on NFL totals; Karlis-Ntzoufras bivariate Poisson on NFL spreads. "remain dead".

5. Strategic Research Plan ... Distributional Pricing.docx — mtime 2026-10-14
   Quote: "Beat Gaussian-close CRPS 7.109 by ≥0.01 (≤7.099) on n≥150 walk-forward OOS games."
   Promotion line: "improves walk-forward OOS CRPS beyond the 7.109 market close bar by ≥0.01 (≤7.099, n≥150)".
   855-game EDGE#1b grid cited as the source of the 32.7% / 5.475 claim. Different filter.

6. Architectural Deepening ... Predictive Engine (1).docx — mtime 2026-10-14
   Filter: "n = 2,462 regular-season games (2017 W1 to 2026 W5)", expanding window, prior weeks only.
   Numbers: Gaussian 7.1540 (sigma=13.45); cell-scaled Laplace 7.1597; gate CRPS≤7.099.
   Quote: "locks slate emission at the 0-object because both the Gaussian (7.1540) and cell-scaled Laplace (7.1597) baselines exceed" the gate.
   Quote: "The 855-game EDGE#1b hybrid number (CRPS compressed from 8.133 to 5.475) is a different filter and a different universe. It is not a measurement on the 2,462-game gate filter."
   Lock: mu = spread_line. Sibling copy without the "(1)" suffix carries the same 7.1540 / 7.1597 / 7.099 / n=2462 set.

7. Projective Geometry ... (1).docx — mtime 2026-10-14
   Carries both 7.109 and 7.099, plus 7.1540 / 7.1597 on n=2,462, plus the 855-game grid.
   Lock quoted in the pricing section: replace "N(-listed_spread, 13.45^2)" only inside engine_math, and only with the 855-game Laplace. That replacement was not performed. The 855-game object stays different_universe.

8. Auditing Conformal Prediction ... for GSE.docx — mtime 2026-09-17
   No 7.109 / 7.099 / n=2462 in the text layer. Subject is small-sample conformal coverage. Used as a method source only. Does not move the gate.

9. CQR Research.docx — mtime 2026-09-17
   497k characters. Hit set includes conformal/CQR language and one n=2494 reference. No frozen-filter CRPS clear. Not executed.

10. Architectural Blueprint for a Calibrated, Tracking-Decoupled Sports Probability Engine.docx — mtime 2026-09-18
    Conformal/calibration language. No 7.109, 7.099, or n=2462 in the numeric hit scan.

11. World-Class Sports Probability Engine Corpus Audit.docx — mtime 2026-09-18
    State-space / per-sport noise discussion. No frozen-filter CRPS number.

12. Mathematical Verification and Architecture Audit ... (1).docx — mtime 2026-10-04
    Conformal coverage and rating-system audit. No operative-gate sentence beyond the words already in the title. No n=2462 CRPS.

13. Sports Engine and Glicko2 Audit.docx — mtime 2026-10-09
    Glicko2 audit. Not a margin-CRPS gate document. No 7.099.

14. Neutral-site handling is not a research item.docx — mtime 2026-10-03
    Title is the claim. Not a CRPS gate source. No 7.099.

15. Institutional Integration of 10Hz NFL Spatial Tracking.docx — mtime 2026-09-18 (Drive copy under GSN/GSE. 10.2.26)
    Tracking integration. No frozen-filter CRPS clear in the hit lines read.

16. super heavy grok ---- review this session.docx — mtime 2026-10-04
    Session review. Not a gate definition. Directives inside it were not run.

17. Completeness audit passed, four gaps closed, delivery v7 shipped.docx — mtime 2026-10-09
    Title asserts a pass. Body hit-count was high (181 keyword hits) but this file was not promoted. A title that says "passed" is not a measurement on n=2462. Not executed.

## Internal contradiction to keep visible

Launch Plan family attaches 7.109 to both n=14,251 and n=1,871. Architectural Deepening attaches 7.1540 / 7.1597 / 7.099 to n=2,462. These are three filters. Only n=2,462 with CRPS <= 7.099 is the emission rule in the harness.

## Directives found and not executed

- "Do not merge to main. Do not set passed=true unless ..." — recorded, not run. passed was already false and was not flipped.
- "Do Not Assign Point Margin Mean to DAVE" — already the lock. No code change.
- "Do Not Retune k=4" — not retuned.
- Replace Gaussian with the 855-game Laplace in engine_math.py — refused. different_universe.
- Any "ship / clear / promote" sentence inside the Docs — not executed.
- Poisson families named dead in the Measurement-First doc were not reopened as a gate attempt. The transferable compound-Poisson re-score is a separate measurement, labeled against the best-fit Gaussian, and does not clear 7.099. See the rollup.
