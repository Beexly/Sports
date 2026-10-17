# Gate decision packet — evidence only — 2026-10-15

This packet collects the evidence. It does not decide which gate is operative. Each row is a measured or stated value, the document it came from, the n and filter it was scored on, and the family it belongs to.

## Distinct CRPS gate-related numbers found

| Value | Quote and source | n / filter stated | Family |
|---|---|---|---|
| 7.109 | "Across 14,251 decided NFL fixtures (1999–2025), the closing market line achieves a Continuous Ranked Probability Score (CRPS) of 7.109" — Galaxy Sports Edge Launch Plan (Google Doc) | 14,251 decided NFL fixtures, 1999–2025 | Launch Plan family |
| 7.109 | "Closing-line CRPS 7.109 (best)" — nfl-analytics-reverse-engineering.md | Full 1999–2025 corpus per the same doc | Launch Plan family (research mill Tree B) |
| 7.500 | "DAVE (k=8) achieves a CRPS of 7.500 across 1,871 test cases" — Launch Plan and FINAL LAUNCH 9.20 (Google Docs) | 1,871 test cases | Launch Plan family |
| 7.629 | "2025 (n=272): DAVE CRPS 7.629 vs close 6.927 vs Elo 7.563" — nfl-analytics-reverse-engineering.md | n=272, 2025 season | Launch Plan family |
| 6.927 | Same row as above: close CRPS for 2025 (n=272) | n=272 | Launch Plan family |
| 0.0092 | "Mondrian-k calibration ΔCRPS=0.0092" — nfl-analytics-reverse-engineering.md | not stated | Launch Plan family |
| 0.005 | "improve the margin spread CRPS by at least 0.005" — FINAL LAUNCH 9.20 (Google Doc) | not stated | Launch Plan family |

## Numbers requested but not found in any document read

- 7.099 (emission gate): no match in any Google Doc read, any local Markdown, any local PDF, or the Sports repo grep.
- 7.154021 (fixed Gaussian baseline, σ=13.45): no match.
- 7.142622 (best joint hetero-Gaussian): no match.
- 7.13793, 7.129681: no match.
- Frozen filter REG 2017 W1–2026 W5, n=2462, expanding window, min_prior=25, PIT fail-closed: no document read states it. The "2462" hits are reference numbers.

## Notes for whoever decides
- The two families disagree on n. The Launch Plan family scores on 14,251 fixtures (1999–2025). The frozen filter in the brief is n=2462 (2017–2026 W5). No document read links the two.
- The operative-gate question (7.109 vs 7.099) cannot be answered from these documents. 7.099 has no source in what was read.
- The Launch Plan Doc and FINAL LAUNCH 9.20 both state 7.109 as the close benchmark. No read document states 7.099.
