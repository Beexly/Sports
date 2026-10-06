# Wave 2 Summary — arXiv-750 program (2026-09-21)

## Headline
- **120 valuable papers** added (119 ADAPT + 1 ADOPT), 0 REJECT counted.
- Tracker: **485 → 605** (`arxiv-program/state/ledger-tracker-750.jsonl`).
- Remaining to 750: **145 valuable papers**.
- Ledgers: 0858–0893, 0906–0941, 0954–0965, 0978–0989, 1002–1041, 1050–1089 (120 files, all in `docs/research/2026-09-21/arxiv-deep/`).

## Lane totals (normalized)
| lane | count |
|---|---|
| calibration | 21 |
| markets | 20 |
| tracking | 19 |
| ratings | 15 |
| abstention | 15 |
| win_spread_total | 10 |
| props_dfs | 9 |
| nlp | 4 |
| weather | 4 |
| bayesian | 3 |

Note: reader 18's `sports_CV (action_recognition/pose)` lane (12 papers) was normalized to `tracking` (nearest standard lane); the original lane string is preserved in each wave report.

## Per-reader results
| reader | valuable | verdicts | notes |
|---|---|---|---|
| 11 (0858–0869) | 12 | 12 ADAPT | 1 dedup skip (1211.4000v1) → fresh replacement 2004.08428v1 |
| 12 (0882–0893) | 12 | 12 ADAPT (1 weak) | 6 REJECTs (none counted) + 14 duplicate skips, all replaced via fresh searches |
| 13 (0906–0917) | 12 | 12 ADAPT | 0 REJECT |
| 14 (0930–0941) | 12 | 12 ADAPT | 0 REJECT |
| 15 (0954–0965) | 12 | 11 ADAPT + 1 ADOPT | 3 BLOCKED → recovered by coordinator via direct PDF fetch; full reads, ledgers 0963–0965 |
| 16 (0978–0989) | 12 | 12 ADAPT | all 12 assigned were duplicates → 12 fresh replacements |
| 17 (1002–1013) | 12 | 12 ADAPT | abstention architecture series |
| 18 (1030–1041) | 12 | 12 ADAPT | all 12 assigned duplicates → 12 fresh sports-CV replacements |
| 19 (1050–1061) | 12 | 12 ADAPT | all 12 assigned duplicates → 12 fresh replacements |
| 20 (1074–1089) | 12 | 12 ADAPT | 2 assigned REJECTs + 1 reserve REJECT → completed chains (1077, 1080 ADAPT) |

## REJECT / replacement accounting
- REJECTs not counted: **9** (reader 12: 2504.09499, 2512.18858, 1508.06773, 2401.11016, 1211.5037, 2409.13528; reader 20: 1610.06833v1, 1806.10648v2, plus reserve-chain 2207/tvcalib). Every REJECT has a completed replacement ending in an ADAPT ledger. No REJECT is in the tracker.
- Duplicate skips not counted: reader 11 (1), reader 12 (14), reader 16 (12), reader 18 (12), reader 19 (12) — all replaced with fresh dedup-checked papers.
- Disqualified: reader 20's 1079 (auxiliary ADAPT, not from the required replacement mechanism) — ledger exists but is NOT in the tracker.
- Blocked: 3 (reader 15's originals) — all recovered and fully read; 0 remain blocked.

## Integrity notes
1. **done-ids.txt anomaly persists**: all wave-2 assigned IDs appeared in `done-ids.txt` (1,493 IDs) with no matching prior ledgers or tracker rows for most. Readers proceeded on assigned papers only where corpus-map dedup confirmed them as unread; everything else was replaced. 49 genuinely-new IDs were appended to done-ids.txt (now 1,542).
2. **Orphan ledgers 1026/1027**: written by the first reader-18 worker during its abandoned abstention detour, never attached to any wave report, not counted, not pushed. The files are no longer present in the working tree (removed during the reader-18 continuation). Noted here so the number gap is explained.
3. **Reader-12 chain documentation**: the fresh-candidate chain 2401.11016 → 1211.5037 → REJECT was superseded by the duplicate-skip reruns; its slot terminates in one of the ADAPT ledgers 0888/0889 (both full reads). All 12 reader-12 slots have completed ADAPT ledgers; 0 REJECTs counted.
4. **Format repairs (coordinator, post-read)**: reader 16's 0982–0989 and reader 19's 1050–1061 were restructured into the full section format by two repair workers (content preserved, no new claims); reader 13/17 ledgers got `## Verdict` headings; reader 15's 0954–0962 got `## Verdict` sections per report; `## Citation / full-text source` sections added where missing; 1074's `## 10. Limitations` renamed to exact `## Limitations`; reader 20's 1077–1089 got `## Research question` sections distilled from their own Summaries. Final verification: all 120 ledgers have every required section, exactly one `## Limitations`, one `## Verdict`, and report-matching verdicts.
5. **Reader-15 summary correction**: its report summary said adopt:0; records show 11 ADAPT + 1 ADOPT (1906.03339v2). Tracker counts from records.

## Standout findings (one line each)
- 0955 (ADOPT): next-gen-scraPy extracts NFL tracking data from images.
- 0963: 3D Player Pressure Map → 78.7% possession-outcome accuracy (vs 55.8% tracking-only).
- 0965: self-affirmation feedback models (p(n)=p₀κⁿ) beat GEV on World Cup scores; κ profiles leagues.
- 0987: conformal reject option — singleton error rate σ=(ε−P(E))/P(S); same certification-bug class as GSE's cqr.ts.
- 1035: monocular 3D pose from broadcast via partial field registration (6.41 cm vs MeTRAbs 10.33 cm) — NFL yard lines are ideal.
- 1086: shortest prediction intervals are non-elicitable (Thm 4.16).
