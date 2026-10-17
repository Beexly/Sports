# Paper and Markdown CRPS extracts — 2026-10-15

Scope: all 417 Markdown files and all 136 PDFs in the GSN Drive tree (text extracted locally), scanned for the terms 7.109, 7.099, 7.154021, 7.142622, 7.13793, 7.129681, 2462, 14,251, CRPS, PIT, conformal, BSTS, hetero-Gaussian, joint, gate. 320 files contain at least one term. Only a handful contain CRPS values, and those are quoted below.

## Files with measured CRPS values

### nfl-analytics-reverse-engineering.md
Path: GSE. 10.2.26/nfl-analytics-reverse-engineering.md (Google Drive GSN tree)
- Table row: "| (iii) | NFL Physical Model | 0.15 | 42 | 6.30 | Close CRPS 7.109 beats DAVE k=8 (7.500); scale 36.61 pooled vs 45.42 Hermes; ~70 live settled |"
- "Closing-line CRPS 7.109 (best); DAVE k=8 7.500; pooled EPA 7.573; core Elo 7.576."
- "2025 (n=272): DAVE CRPS 7.629 vs close 6.927 vs Elo 7.563; DAVE Brier 0.251 vs market 0.204."
- "Fay-Herriot year shrinkage k̂=7.486 (Δ0.011 vs k=8) → keep; Mondrian-k calibration ΔCRPS=0.0092"
- "**Tree B (research mill) — 14,251 decided NFL fixtures, 1999–2025:**"
- Filter definition (lab conventions, 2026-09-17): "base filters = REG only, pass/run, no kneels/spikes, garbage time excluded (4Q, possession WP >0.95 or <0.05), success = EPA > 0 — EXCEPT drive_stats / kicker / defense_detail / special_teams families, which are deliberately UNFILTERED FULL-game record."

Measured n for these values: 14,251 (close and DAVE k=8 on the full 1999–2025 corpus, per the Launch Plan family), 1,871 (DAVE k=8 test cases), 272 (2025 season). None of these is the frozen n=2462 filter.

## Terms with zero matches in local text
- 7.154021 (fixed Gaussian baseline): no matches.
- 7.142622 (best joint hetero-Gaussian): no matches.
- 7.13793, 7.129681: no matches.
- 7.099 (emission gate): no matches.
- n=2462 / 2,462 as a filter count: 8 hits, all bibliographic reference numbers (for example "24611–24624", "0.2462" in a Brier table). None refers to the frozen filter.
- min_prior=25, PIT fail-closed, BSTS, hetero-Gaussian: no matches as defined terms.

## Sports repo search
- A repo-wide grep for 7.154021, 7.142622, 7.13793, 7.129681, 7.099, min_prior, PIT fail, n=2462 returned no matches before the grep ran out of time.
- A narrower grep in docs/, reports/, intelligence/, handoff/, research/ timed out. This check is inconclusive for the repo. It needs a rerun with a longer timeout or a git grep.

## PDFs
- No PDF in the GSN tree contains the gate values or the frozen filter definition. CRPS hits in PDFs are generic references, not measured values for GSE.
