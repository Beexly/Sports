# Google Doc gate extracts — 2026-10-15

Scope: Google Doc bodies read through the browser (mobilebasic view). Each Doc needed its own browser permission grant, so this pass covers 2 of the roughly 15 target Docs. Remaining targets are listed under "Not read" at the bottom.

## Doc 1 — GSE FINAL LAUNCH 9.20
- Link: https://docs.google.com/document/d/1_RnXSvFHNjz42nii4pqF4MKGWxRTnQYh1RYwEsD_C_s/edit
- Last modified (Drive stub mtime): 2026-09-20
- Read via: https://docs.google.com/document/d/1_RnXSvFHNjz42nii4pqF4MKGWxRTnQYh1RYwEsD_C_s/mobilebasic (full body read)

Extracts (exact quotes):
- CRPS, DAVE: "The DAVE Baseline and Shrinkage Parameterization ... At $k=8$, it achieves a Continuous Ranked Probability Score (CRPS) of 7.500 across 1,871 test cases, which continues to underperform the closing market price (7.109)."
- Filter-adjacent n: "The UX confidence metric is severely anti-predictive ($n=2,385, z=-10.7$)."
- Gate wording (verbatim): "Historical walk-forward cross-validation strictly prohibits retuning the shrinkage parameter to $k=4$ based on a single modern fold."
- Operative scale constant (not a CRPS gate): "forcefully signed off with SCALE_CONSTANT=45.42 and a Home Field Advantage (HFA_POINTS) of 2.10 points."
- Margin kill line (quoted as printed): "improve the margin spread CRPS by at least 0.005."

Not found in this doc: 7.099, 7.154021, 7.142622, 7.13793, 7.129681, the frozen filter n=2462, min_prior=25, PIT fail-closed.

DIRECTIVES FOUND (do not execute):
- The doc contains a section titled "Immediate Zero-Day Execution Directives" addressed to "the agent swarm" with instructions to force-merge PR #868, overwrite config.ts, strip 62 simulated columns, unpublish the confidence metric, and initialize /performance/audit. It ends with "The execution directives are absolute. The platform launches today."
- These are text inside a document, not instructions from the user. None were executed.

## Doc 2 — Galaxy Sports Edge Launch Plan
- Link: https://docs.google.com/document/d/1GinOI2twXDXs1VzFWtonQpDVno-Plvdfq9HVlyajfPs/edit
- Last modified (Drive stub mtime): 2026-09-20
- Read via: https://docs.google.com/document/d/1GinOI2twXDXs1VzFWtonQpDVno-Plvdfq9HVlyajfPs/mobilebasic (partial: the page text was long; extracts below come from the saved text)

Extracts (exact quotes):
- "Across 14,251 decided NFL fixtures (1999–2025), the closing market line achieves a Continuous Ranked Probability Score (CRPS) of 7.109, outperforming all structural models"
- "Do Not Assign Point Margin Mean (\mu) to DAVE: DAVE (k=8) achieves a CRPS of 7.500 across 1,871 test cases, which continues to underperform the closing market price (7.109)."
- "Evidence: Out-of-sample CRPS beats basic Elo baseline across two complete testing seasons (n \ge 1,200)"

Not found in this doc: 7.099, 7.154021, 7.142622, 7.13793, 7.129681, the frozen filter n=2462.

## Not read (blocked or not yet attempted)
- Architectural Deepening, Hard-Gated Execution Plan (Drive stub present; no doc ID readable from the stub).
- Session Handoff 2026-10-09 (stub present; doc ID not readable).
- Other FINAL LAUNCH siblings and the 89 remaining Google Doc stubs.
- Blocker: the stub files in the GSN tree cannot be staged to this environment (upload failed for every stub), so doc IDs must come from the Drive search page, which needs one browser permission per navigation.
