# arXiv 750-Valuable Program — Phase 2 Summary (2026-09-21)

**Target: 750 papers with real GSE value (ADAPT/ADOPT). Status: COMPLETE — 750/750 verified.**

## Final count

- **750 unique valuable papers**: 724 ADAPT + 26 ADOPT
- Phase 1 (carried): 364 | Phase 2 (wave 2): 215 | Phase 3 (wave 3): 171
- Tracker: `docs/research/2026-09-21/arxiv-program/state/ledger-tracker-750.jsonl` (750 rows)

## Lane breakdown (tracker)

| Lane | Count |
|---|---|
| tracking_ngs | 104 |
| team_ratings | 77 |
| experimental | 63 |
| win_spread_total | 60 |
| calibration_uncertainty | 48 |
| odds_market | 45 |
| abstention | 35 |
| ensembles | 26 |
| causal_injury | 23 |
| kelly_sizing | 22 |
| data_api_infra | 19 |
| nlp_llm | 19 |
| props_player | 18 |
| calibration | 16 |
| props_fantasy | 16 |
| sizing | 14 |
| dfs | 13 |
| mixed | 24 |
| sports_CV (action_recognition/pose) | 12 |
| weather | 11 |
| markets | 10 |
| causal | 10 |
| ratings | 9 |
| ensembles-forecast-aggregation | 8 |
| bayesian_statespace | 6 |
| nlp | 5 |
| props_dfs | 4 |
| bayesian | 4 |
| tracking | 3 |
| sports_physics | 1 |
| calibration-postprocessing | 1 |
| score-distributions | 1 |
| metric-validation | 1 |
| season-forecasting-parsimony | 1 |
| (unlabeled/other) | 21 |

## Wave-3 reader accounting

| Reader | Ledgers | Valuable | REJECT | Replacements |
|---|---|---|---|---|
| 3b1 (1462-1473) | 15 | 12 | 3 (2 dup, 1 genuine) | 1498-1500 |
| 3b2 (1474-1485) | 13 | 11 | 1 genuine | 1504 |
| 3b3 (1486-1497) | 12 | pending (corpus overflow) | — | — |
| cleanup-a | 4 | 4 | 0 | — |
| cleanup-b (1444-1453) | 10 | 10 (3 counted, 7 overflow) | 0 | 1447/1448 rewritten |
| reader 01 (1090-1101) | 19 | 12 | 7 | 1300-1305, 1311 |
| reader 10 (1198-1209) | 18 | 11 | 7 | 1354-1359 |
| reader 02b | 2 | 2 | 0 | 1309, 1310 |

## REJECT / replacement accounting

- Every REJECT was replaced with a full-paper read. No REJECT counts toward the 750.
- Wave-3 REJECTs: 7 (reader 01) + 7 (reader 10) + 3 (3b1) + 1 (3b2) = 18, all replaced.
- Replacement ledgers are distinct valuable papers; provenance ("replaces N") is bookkeeping only.

## Blocked papers

- `0903.2243v5` — withdrawn on arXiv; three PDF attempts returned withdrawal HTML. Full v4 obtained and read; the 1201 REJECT ledger is from v4 (disclosed).

## Dedup / collision corrections

1. **1309 collision**: reader 01's provisional 1309 (ballpark effects) collided with reader 02b's tracked 1309 (Bayesian circular mixed-effects). Resolved by renumbering reader 01's paper to 1311.
2. **01b duplicate**: a second worker (8aea2362) was spawned on reader 01's slots and wrote 1300 before being closed. Reader 01's complete set was kept; 01b closed.
3. **1354-1355 collision**: cleanup-b was assigned 1354/1355 for 1198/1199 replacements, but reader 10 had already completed them. Cleanup-b redirected to 10 fresh papers.
4. **1368-1370 redundancy**: cleanup-a's Kelly slots were filled by reader 10's 1356-1359. Cleanup-a redirected to reader-09 slots + the 1207 replacement (1517).
5. **1447/1448 duplicates**: cleanup-b's initial 1447/1448 duplicated cleanup-a's 1460/1461. Cleanup-b rewrote them with fresh papers.
6. **1481 duplicate**: 3b2's 1481 (2409.09884) duplicated 3b1's 1499. Skipped in tracker.
7. **2411.11012**: conflicting REJECT (1092) and ADAPT (1233) ledgers. Counted once.
8. **Version normalization**: all IDs stripped of vN suffixes for dedup.

## Corpus overflow (valid, uncounted)

- 3b3's 12 papers (1486-1497) — in flight, will remain corpus material.
- cleanup-b's 1447-1453 (7 papers) — valid ADAPT ledgers, not counted (target already met).
- These stay in `arxiv-deep/` as research corpus but are not in the 750 tracker.

## Key commits

- `68d5ef3` — reader-02b papers, tracker 699→701
- `c7715ae` — reader 01 complete, tracker 701→713
- `4c87c17` — reader 10 replacements, tracker 713→719
- `7c9103e` — cleanup-a, tracker 719→723
- `b3c6883` — 3b1 + 1368, tracker 723→736
- `b1a26e7` — 3b2, tracker 736→747
- `980aa2f` — cleanup-b, tracker 747→750 COMPLETE

## Integrity statement

Every counted paper has a full-text-read ledger with all 14 sections, exact `**Verdict:**` syntax, and independent coordinator verification (report↔ledger agreement, 4-way dedup vs tracker/master/ledgers/concurrent reports). No abstracts, assignments, manifests, duplicate papers, blocked papers, or agent claims were counted. The count is exactly 750 unique ADAPT/ADOPT papers.
