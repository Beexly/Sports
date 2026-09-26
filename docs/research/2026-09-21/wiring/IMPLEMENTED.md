# IMPLEMENTED — improvement-ledger wiring checklist

Tracks every IMPROVEMENT-LEDGER item wired into the engine, so waves never duplicate work.
Format: `arxiv_id` | title | files added | commit | date | notes.

## Wave 0 (2026-09-22 — merged via `motif/wiring-plans-2026-09-22`)

| arxiv_id | Title | Files | Commit | Notes |
|---|---|---|---|---|
| 2103.00083 | Quantile aggregation (W-1) | `apps/web/lib/calibration/quantile-isotonize.ts`, `quantile-isotonize.test.ts` | 85f2b37 (merged 62ff528) | Publish-path wiring = NEEDS HUMAN CALL |
| 1912.05642v4 | Scale-invariant scoring (W-2) | `apps/web/lib/calibration/scrps.ts`, `scrps.test.ts` | 85f2b37 (merged 62ff528) | 2nd ranking gated on ≥2 flips |
| 1808.07501v2 | Practical scoring rules (W-3) | `apps/web/lib/calibration/practical-scoring.ts`, `practical-scoring.test.ts` | 85f2b37 (merged 62ff528) | Leaderboard gated on Spearman ≥0.95 |

Also on main: `apps/web/lib/calibration/cqr.ts` fail-closed fix (`1d38140`).

## NEEDS HUMAN CALL (do not implement without founder/Hermes call)

- Props storage: `PROP` in Prisma `PickType` + settlement/grading — `schema.prisma`/`migrations/**` frozen to agents (AGENTS.md law 2).
- Fixture dating fix (Claude handoff §9.3): next-Sunday fixtures stamped ~7 days early — needs DB read (law 7); do not patch from board side.
- W-1 publish-path wiring: changes published intervals — wire only after 2025 crossing-violation measurement.

## Wave 1 (2026-09-22 — small-effort items, 6 workers)
## Wave 1 — small-effort items (2026-09-22, 6 parallel workers, direct-to-main)

**Totals: 454 implemented | 47 deferred | 4 needs-human-call** (out of 506 small-effort records; 3 pre-existing skips already on main).
All additive: new files only, zero edits to existing files, nothing wired into live publish paths.
Tracking detail per record lives in `~/workspace/wiring-wave/parts/wave1-*.json` (local).

| Worker | Slice | Implemented | New files | Tests | Commits | Target dirs |
|---|---|---|---|---|---|---|
| wave1-calibrate | CALIBRATE 45 + INVENT 8 | 50 | 100 (50 modules + 50 tests) | 354/354 web calib + 57/57 invention | 11 (00e2826, 47faf25, be73a0a…) | apps/web/lib/calibration/, packages/prediction-engine/src/invention/ |
| wave1-decide | DECIDE 62 | 62 | 20 (10 modules + 10 tests) | 209/209 | 2 (80d5edf, 56b6787…) | packages/prediction-engine/src/decision/ |
| wave1-ingest-1 | INGEST 90 (idx 0–89) | 90 | 180 (90 modules + 90 tests) | 381/381 | 18 (a85a532, 6abf6e5, d93c8e1…) | packages/data-ingestion/src/ |
| wave1-ingest-2 | INGEST 91 (idx 90–180) | 74 | 148 (74 modules + 74 tests) | 409/409 | 17 (f76fb51, aa93fd1, ff8f8c2…) | packages/data-ingestion/src/ |
| wave1-model-1 | MODEL 105 (idx 0–104) | 105 | 210 (105 modules + 105 tests) | 521/521 | 30 (f18eeab, 4f81995, e62df82…) | packages/prediction-engine/src/ |
| wave1-model-2 | MODEL 105 (idx 105–209) | 73 | 146 (73 modules + 73 tests) | 327/327 | 15 (1b24bed, 15b63cc, 0b50add…) | packages/prediction-engine/src/ |

### Implemented arXiv IDs (dedup reference for future waves)

<details><summary>wave1-calibrate — 50 ids</summary>

1204.3463, 1505.04137v1, 1511.05191v1, 1609.09830v1, 1905.03222, 2008.05105v2, 2010.09107, 2011.11277v6, 2101.02703, 2103.06023v4, 2106.00170, 2106.08460, 2112.14649v1, 2204.08276v8, 2208.08598, 2212.03463, 2212.12504v1, 2302.03201v2, 2303.11366v4, 2305.01582v3, 2305.16291v2, 2306.08946v2, 2307.11780v2, 2307.16895, 2308.14339v3, 2312.01586v1, 2401.17743v1, 2402.06062v1, 2402.16300, 2402.17453v5, 2404.13371v1, 2406.02141, 2406.07496v1, 2504.01781, 2506.13687, 2507.15320v5, 2509.04203v1, 2509.08744, 2510.04399v3, 2601.09673v3, 2601.18509, 2602.04714, 2603.19551v2, 2606.08587v1, 2607.24573, 2607.28178, 2608.10620, 2608.21591, 2609.10589, 2609.13100

</details>

<details><summary>wave1-decide — 62 ids</summary>

0712.2771v3, 1009.3753, 1206.2305, 1209.4203, 1305.6831, 1311.2550v2, 1312.3989v1, 1506.00166v2, 1507.08713, 1609.00869, 1610.08558, 1611.09130, 1707.01457, 1708.03813v1, 1710.01503, 1710.01786v1, 1710.02838, 1710.09901v1, 1711.06664, 1802.07024v5, 1802.07107, 1807.11729, 1901.06278, 1902.04256, 1904.09235v2, 1905.09561v1, 1906.02179v2, 2001.10623v2, 2004.14048, 2006.16597v2, 2104.14277v2, 2111.08230v1, 2112.06751, 2201.03387v2, 2206.09034v4, 2208.02814, 2302.13979v1, 2304.03870, 2307.02035v1, 2307.05199v1, 2310.14770v2, 2310.14772v2, 2312.10331, 2402.03035, 2406.04062v1, 2412.14144, 2501.10302, 2503.17927, 2508.07617, 2508.18868v2, 2509.21514v4, 2510.13327, 2603.09947v1, 2603.13581v1, 2603.26620, 2604.11577, 2604.17577, 2604.25280v1, 2606.23448v1, 2607.09505v1, 2607.27143v1, 2608.00127

</details>

<details><summary>wave1-ingest-1 — 90 ids</summary>

0911.4503v1, 1205.4750v1, 1301.2954v1, 1411.1243v1, 1412.0248v1, 1501.07179v1, 1504.01070v1, 1510.02172v2, 1511.04351v2, 1603.05583v1, 1604.05090v1, 1606.02011v3, 1608.03793v2, 1609.03471v1, 1610.06272v2, 1610.09225v1, 1701.08055v1, 1702.05982v1, 1705.08079v2, 1706.00327, 1706.02447v1, 1706.04943v1, 1708.00489v4, 1709.07150, 1710.02784, 1710.02824v2, 1710.06551v2, 1712.05879v1, 1802.00527v1, 1802.08496v2, 1802.08765v1, 1805.02501, 1805.09091, 1806.01930v1, 1810.12068v2, 1901.02776v2, 1901.04695, 1906.03339, 1909.03555v1, 1910.06081v1, 2009.07947v1, 2010.00781v1, 2012.04455v1, 2101.12072v1, 2102.05107, 2102.07081, 2104.14012v1, 2106.12059v3, 2106.14345v2, 2108.02140v1, 2108.03210v3, 2109.07581v1, 2109.13743v2, 2109.15046v2, 2111.09695v1, 2111.12429v2, 2202.10085v2, 2204.10185v1, 2206.02397, 2206.07212v2, 2206.10323v2, 2206.13580v2, 2206.14786, 2207.08635, 2208.01562v2, 2208.04360v2, 2209.07018v1, 2209.08778v1, 2211.02556, 2211.12507, 2211.15734v1, 2212.12015v2, 2302.08981v2, 2303.14857v1, 2303.16648v1, 2303.17610, 2303.17863v2, 2304.12654v1, 2304.14774v3, 2305.01120v3, 2305.03403, 2305.03780v3, 2305.09126v3, 2306.01740v4, 2307.02139v1, 2307.10303, 2307.10411v1, 2307.13116v1, 2307.16642v2, 2308.10231v5

</details>

<details><summary>wave1-ingest-2 — 74 ids</summary>

2308.11142, 2309.00756, 2309.01472, 2309.03808, 2309.07856, 2309.12239, 2309.14390, 2310.08697, 2310.09656, 2310.11459, 2312.04338, 2312.04711, 2312.12700, 2312.13619, 2401.05451, 2401.09940, 2402.06815, 2402.06820, 2402.09444, 2402.10979, 2402.11191, 2402.12400, 2402.15862, 2403.03862, 2403.04873, 2403.11016, 2403.12385, 2403.12977, 2403.13893, 2404.00030, 2404.08254, 2404.19383, 2405.03708, 2405.07354, 2405.11802, 2405.13397, 2405.17214, 2406.01273, 2406.03321, 2408.02498, 2408.02520, 2408.11847, 2409.13098, 2410.08474, 2410.09180, 2411.00862, 2501.14755, 2503.19809, 2504.20768, 2508.19848, 2508.21622, 2509.04546, 2510.04516, 2510.17641, 2511.03279, 2511.14537, 2512.14727, 2512.18013, 2601.18774, 2603.10916, 2604.03840, 2604.04673, 2605.05487, 2606.02547, 2606.03805, 2606.04387, 2606.07492, 2606.08266, 2606.13221, 2607.04590, 2607.17525v1, 2607.18084, 2607.22221v1, 2607.23509

</details>

<details><summary>wave1-model-1 — 105 ids</summary>

0710.0485v2, 0712.0380, 0911.3100, 1112.0076, 1203.2228v2, 1204.3496v1, 1206.6814, 1211.4000, 1212.6018v1, 1310.4461v2, 1403.8125v4, 1404.7493v5, 1410.8042v1, 1501.05831, 1503.03509v1, 1504.05872v1, 1505.00475v1, 1601.00574v1, 1601.04203v2, 1603.06183v1, 1603.07593v2, 1604.01455v3, 1604.03186v1, 1604.07949v3, 1610.02653, 1701.02814v2, 1701.07555, 1702.05662, 1704.00583v1, 1704.02030, 1705.04356v1, 1706.04599v2, 1710.00431v1, 1710.10044v1, 1711.05865v2, 1711.06498, 1711.11122v1, 1802.00967v1, 1802.04987v3, 1802.08664, 1803.06730, 1805.08937v1, 1806.08059v2, 1807.01623v1, 1807.05059, 1807.07536, 1807.09236, 1808.00111v2, 1809.03561v1, 1809.07751, 1810.00908, 1811.12516, 1901.03645, 1902.04489, 2001.10039, 2003.00083, 2006.12471, 2007.15508, 2008.01485, 2008.05203, 2008.10423, 2010.15779v2, 2011.14048v2, 2103.15147v3, 2106.07197v1, 2109.09871, 2112.14451v1, 2112.14846, 2201.01168v1, 2201.05249, 2201.08671, 2202.03034, 2204.11777, 2206.10540, 2207.07318, 2207.08924v2, 2207.13287v1, 2207.13747v1, 2208.00139, 2209.03013v1, 2209.06346v2, 2209.07581, 2209.14594, 2210.06327v3, 2210.11802, 2211.02417v3, 2212.08116v1, 2212.12092, 2301.11898v2, 2301.13594v1, 2303.05774v1, 2303.06021v4, 2303.16776v1, 2304.05242, 2304.05294v5, 2304.06333v2, 2305.03623v1, 2305.14656v1, 2305.16735, 2307.02188v5, 2307.02752v2, 2307.08768, 2307.11777, 2307.13807v1, 2307.15422v2

</details>

<details><summary>wave1-model-2 — 73 ids</summary>

2308.03810v2, 2308.05263, 2308.10328v3, 2308.15443v1, 2308.15559v1, 2309.01641, 2309.12696v1, 2309.14807, 2310.04227v2, 2310.08278v1, 2310.10386v1, 2310.10553v2, 2310.12145v1, 2310.19343v1, 2311.02971v3, 2311.13707v1, 2312.08528v3, 2312.09466v1, 2401.02601v1, 2401.07018, 2401.08718v1, 2401.15161v2, 2402.08328v1, 2402.15588v1, 2403.00578v1, 2403.13821, 2403.14769, 2403.16282v1, 2404.02270v2, 2404.04213, 2404.06587, 2404.10495v2, 2404.11350v3, 2404.15018, 2405.01598v1, 2405.10247, 2406.00814v1, 2406.11584, 2409.01493v1, 2412.09430, 2412.10871v1, 2412.21181v1, 2505.11841v2, 2505.24783, 2507.05470, 2507.15079v1, 2508.16598v1, 2511.02815v1, 2512.14779, 2601.09999, 2602.03767, 2602.09982v1, 2602.21173v1, 2604.17194v1, 2604.21087, 2604.24517v2, 2606.02663, 2606.04900v1, 2606.08578v1, 2606.24171v1, 2607.00164v1, 2607.12248v2, 2607.17991, 2608.01494v1, 2608.07168v1, 2608.14683, 2608.16814v1, 2609.10357v1, 2609.12878, physics/0505118, physics/0512143, physics/0601166v3, physics/0608007v1

</details>

### Deferred (47) — not small work, or gate not evaluable as a pure module

- wave1-ingest-2 (15): gates requiring live measurements/backtests — 2410.21484v1 (narrative review, no pooling), 2412.10298v1 (viewership forecast needs 2020 baseline), 2504.04186v1 (fragmentation measurement), 2504.08764 (recall≥0.95 reproducible), 2507.17844v1 (editor-preference test on 50 NFL clips), 2508.11711v2 (7-day live log review), 2602.18541v1 (LAPIS pilot), 2605.23854v1 (MMWU rank centrality backtest), 2605.24445v1 (drift-calibrated Elo backtest), 2606.19642 (30-day weather sim), 2608.02081v1 (isotonic-BT Brier backtest), 2608.11505v1 (log-opinion-pool diagnostic), 2608.28482v2 (BIN diagnostics), 2609.03790v2 (landmark alignment eval), 2609.21674v1 (frozen NFL blend backtest)
- wave1-model-2 (32): training programs, not small modules — AutoGluon/AutoML, TimesFM/Chronos/Mamba/GFlowNet/transformer pretraining, LLM fine-tunes, JAGS/Stan weather model, PEB-ridge λ̂, sPoRT test, bookmaking bounds, physics/*

### Needs human call (4, added this wave)

- wave1-decide: (1) wiring any of the 10 decision modules into a live publish path; (2) running the documented ACCEPTANCE GATE backtests and promoting any module.
- wave1-ingest-2: 2502.14710v1 (head-acceleration-exposure features — injury/health-adjacent modeling, needs founder call); 2507.11642v2 (posture-driven action-intent from NGS tracking — GSE port gated on reproducible test).


## Wave 2 — medium-effort items (2026-09-22, 7 parallel workers + 1 continuation, direct-to-main)

**Totals: 624 implemented | 0 deferred | 0 needs-human-call** (all 624 medium-effort records).
All additive: 1,248 new files, zero modified, zero deleted (verified via `git diff` from wave-2 base `97c33e7^` to `origin/main`: 1248 added / 0 modified / 0 deleted). Nothing wired into live publish paths. 55 commits.

| Worker | Slice | Implemented | New files | Tests | Commits | Target dirs |
|---|---|---|---|---|---|---|
| wave2-calibrate | CALIBRATE 43 | 43 | 86 (43 modules + 43 tests) | 214/214 | 4 (44c2cf4, 84f48a3, c3ccf5f, ef544f9) | apps/web/lib/calibration/ |
| wave2-decide | DECIDE 45 | 45 | 90 (45 modules + 45 tests) | 304/304 | 5 (0c1ed7d, 592732e, f82c7c7, 4a30c17, 667cfdb) | packages/prediction-engine/src/decision/ |
| wave2-ingest-1 | INGEST 136 | 136 | 272 (136 modules + 136 tests) | files verified on remote; worker final test count pending | 12 (d41292e, 88a2442, 6ecca44, d5b5b67, 4c0bf15, 0b5ef01, 743585b, 9854ecf, 0e8c947, 1300435, 0cb4559, 37fe2a2) | packages/data-ingestion/src/ |
| wave2-ingest-2 | INGEST 136 | 136 | 272 (136 modules + 136 tests) | 591/591 | 11 (ed8fc2b, 8d9e5b1, 1626f02, 6564baa, 0fc770c, 1cb61e5, 288ea40, 0440386, f9cefd9, 994eb7f, 8f4d1a) | packages/data-ingestion/src/ |
| wave2-model-1 | MODEL 128 | 128 | 256 (128 modules + 128 tests) | 134/134 on records 0-27; remainder files verified on remote, final test count pending | 11 (8339a8a, d850f53, 3ea6ebe, c153e8b, f3bd006, 4c00a6e, ad06fdc, 4c63117, 67a1694, b19b74b, b9aa22c) | packages/prediction-engine/src/ (+ lane subdirs) |
| wave2-model-2 | MODEL 129 | 129 | 258 (129 modules + 129 tests) | 338/338 | 11 (ae0d0d3, a77c9f1, efe9a25, 8ad9884, 911f701, dea5bd7, 6a9a96b, f065fcc, 46e98da, 01da748, 915133c) | packages/prediction-engine/src/ |
| wave2-invent | INVENT 8 | 8 | 16 (8 modules + 8 tests) | 57/57 | 1 (97c33e7) | packages/prediction-engine/src/invention/ |

### Implemented arXiv IDs (dedup reference for future waves)

<details><summary>wave2-calibrate — 43 ids</summary>

1302.5681v1, 1501.01126v1, 1904.02855v1, 1904.06019, 1906.02530, 1908.08980v1, 1909.03725v3, 1910.02600, 1910.03779, 1910.07325v1, 1910.07912v2, 1910.10562, 2002.12860v1, 2004.08607, 2004.09368, 2004.14108v2, 2012.04626v2, 2101.02104v1, 2106.06317v1, 2109.12990v1, 2110.03874, 2203.01420v1, 2210.08740v1, 2401.16392v3, 2412.03190v1, 2501.02087v2, 2501.08397, 2502.06884, 2505.03585v1, 2506.11399v1, 2509.13141v1, 2510.26456v1, 2512.16968v1, 2603.08907, 2604.20172v2, 2606.05551v2, 2606.18686v1, 2606.29203, 2608.20511, 2608.25940v2, 2609.05561, 2609.19035, 2609.22048

</details>

<details><summary>wave2-decide — 45 ids</summary>

0903.2910v1, 1011.3177v3, 1710.01787, 1710.04818, 1801.06737, 1803.08355v2, 1806.05293, 1807.05265, 1812.10371, 1901.09192v4, 1905.10964v2, 1907.00208v2, 1911.11253v1, 2001.09097v1, 2002.03448v1, 2003.02743, 2004.12099, 2005.11698, 2006.01862, 2101.12523, 2104.08236v1, 2104.08281v1, 2107.03090, 2109.10814v1, 2205.13532, 2409.18645v1, 2411.18374, 2502.07255v2, 2503.07498, 2503.23782v1, 2505.00724, 2505.22422v2, 2505.23437v2, 2507.05994v1, 2508.07556v2, 2510.19672, 2601.20452v1, 2601.22570v1, 2603.24704, 2604.24723v2, 2605.02611, 2607.24875v1, 2608.23393, 2609.22632, physics/0607166

</details>

<details><summary>wave2-ingest-1 — 136 ids</summary>

0905.2997v1, 0911.3249v1, 1006.4884v1, 1009.1446v1, 1111.0693v1, 1205.3212v1, 1208.0799v2, 1211.6496, 1502.05886v1, 1601.00991v1, 1602.08754v2, 1604.03614v5, 1609.07480v1, 1707.08559, 1710.05284v1, 1806.06696v1, 1809.08016v3, 1810.08032v1, 1812.00778, 1901.07329, 1902.07378v1, 1903.07746v2, 1906.01760v3, 1906.02746v3, 1906.03671v2, 1906.08158v2, 1906.11373v3, 1907.00503v1, 1907.05326, 1907.11769v4, 1908.02144v4, 1908.08991v2, 1908.11490v2, 1909.03802v1, 1909.06722v1, 1909.10631v3, 1910.01863, 1910.12337v1, 1910.12622v1, 1912.05129v2, 1912.06806v1, 1912.07441v1, 1912.08726v4, 2001.04226v2, 2002.04148v1, 2002.08245v2, 2003.03271v2, 2003.05854v1, 2003.10791v1, 2006.00873v2, 2006.08189v1, 2006.11909v2, 2007.05507, 2007.14870v2, 2009.00550, 2009.14454v1, 2010.08784, 2010.10739v1, 2011.01324v2, 2011.02122v1, 2011.06430v2, 2012.00253, 2012.04380v1, 2101.05388v1, 2101.08175v1, 2102.06024v3, 2103.14430, 2103.16196v2, 2104.02883v1, 2104.08312v1, 2105.11982v2, 2105.12785v1, 2106.01972, 2106.11397v1, 2107.07561v1, 2108.05053v1, 2108.11149, 2109.04720, 2109.08051v1, 2109.15239v1, 2110.00864v1, 2110.05750, 2110.10914v1, 2110.14632v1, 2111.02859v3, 2111.02874v1, 2111.08140v1, 2111.12535, 2112.01267v1, 2112.11262v1, 2112.13593v5, 2201.04480v2, 2202.00211v3, 2202.00583v1, 2202.02691v1, 2203.03990, 2203.08489v2, 2204.11142v1, 2204.13087v2, 2205.04173v3, 2205.10746v3, 2206.11258v1, 2206.15241v2, 2207.00585v1, 2207.11486v1, 2209.15421v1, 2210.04018v1, 2211.06052v1, 2301.13576, 2302.09276v1, 2303.16741v1, 2304.04437, 2304.09918v2, 2306.06252, 2308.01523v2, 2310.01748v2, 2401.02919, 2402.04898v1, 2406.12084, 2406.14877, 2406.16171v5, 2406.18530, 2407.03672v1, 2407.08508, 2407.15900, 2408.01603v2, 2408.05123, 2409.04665, 2409.05052v1, 2409.05714v2, 2409.09607, 2409.13934v1, 2410.01304v1, 2410.01307v1, 2410.05431v2, 2410.11078v2

</details>

<details><summary>wave2-ingest-2 — 136 ids</summary>

2411.06391v1, 2411.06725, 2411.08216v1, 2411.08901v1, 2411.17450v2, 2412.06794v1, 2412.08840, 2412.14019v4, 2412.14730v1, 2412.15673v1, 2412.15832, 2412.16454v1, 2501.05873v1, 2501.07999v2, 2501.08710v2, 2501.10299v1, 2501.16565v1, 2502.01613v2, 2502.02785v2, 2502.21242v1, 2503.02137v1, 2503.04470, 2503.07499, 2503.08945, 2503.09737v1, 2503.19355v2, 2503.21067, 2504.00767v1, 2504.04798v1, 2504.08175v3, 2504.08222v2, 2504.09759v1, 2504.09953v1, 2504.12100v1, 2504.17365, 2505.16630v1, 2506.02351v1, 2506.03335v1, 2506.07860v1, 2506.15578, 2506.22450v1, 2507.02904v1, 2507.04929v1, 2507.06122, 2507.08108v1, 2507.18404v2, 2507.18937, 2508.04008v1, 2508.06312v2, 2508.09650v1, 2508.13174v2, 2508.13396v1, 2508.14667, 2508.15956v1, 2508.17157v1, 2508.17611, 2509.01243v1, 2509.12592v1, 2509.14645v3, 2509.18387v3, 2509.20083v2, 2509.22683, 2509.24606v1, 2509.26325v2, 2510.01810, 2510.14723v1, 2510.16008v1, 2510.18173, 2511.07703v2, 2511.17610v1, 2511.17733v1, 2511.23072v1, 2512.00203v2, 2512.00342v2, 2512.04407v1, 2512.08591v1, 2512.17266, 2512.22254v1, 2601.00216, 2601.03099v1, 2601.06112v1, 2601.11492v2, 2601.14727v3, 2602.03189v1, 2602.11668, 2602.14670v2, 2602.15673v1, 2602.16137v2, 2602.16830v1, 2602.19513v1, 2603.02574v3, 2603.11016v3, 2603.14629v1, 2603.24015v1, 2603.26935v1, 2604.01491v1, 2604.04947v1, 2604.09143v1, 2604.16870v2, 2604.17111v1, 2604.19340, 2605.14855v1, 2605.16066v1, 2605.29395v2, 2606.07433v1, 2606.13033v3, 2606.26497v1, 2606.27274v2, 2607.06495v1, 2607.11432v1, 2607.14430v1, 2607.15483v1, 2607.15899v1, 2607.18461v1, 2607.19783v2, 2607.26061v1, 2608.03416, 2608.07513, 2608.10045v1, 2608.12291v1, 2608.15688v1, 2608.22389v1, 2608.23808v2, 2608.25126v1, 2608.27362v1, 2609.00905v1, 2609.01337v1, 2609.02854v1, 2609.04754v1, 2609.06739v1, 2609.07512, 2609.07559v1, 2609.07617v1, 2609.10498v1, 2609.15309v1, q-bio/0406024v1

</details>

<details><summary>wave2-model-1 — 128 ids</summary>

0803.1364v2, 1106.4509, 1109.2825v2, 1210.1016, 1310.6998v1, 1403.7642, 1503.07642, 1505.01147v2, 1601.04302v6, 1609.01176v1, 1612.00796v2, 1703.03400v3, 1705.03918, 1707.06887v1, 1708.02715v1, 1710.08749v1, 1801.07104, 1802.08848v1, 1803.01422v2, 1803.01984, 1804.04226v1, 1805.01271v1, 1806.06923v2, 1807.08912v2, 1811.03931v1, 1812.05170, 1901.09890v1, 1902.08102v2, 1904.10644v1, 1905.03628v1, 1905.07886, 1908.05745, 1908.07372, 1909.12938v1, 1910.08858v2, 1911.08138, 1911.08791, 1912.10417v1, 2001.04197v4, 2002.01193, 2003.01712v1, 2003.03685v2, 2003.06505v1, 2003.09384v2, 2003.10865v2, 2004.03019, 2004.08428v1, 2005.07742, 2005.09024v1, 2006.04551v4, 2006.04779v2, 2006.06707v2, 2006.07513, 2006.10782v2, 2007.00267v1, 2008.13005, 2009.01206v1, 2009.03228v3, 2009.06750, 2010.00526v1, 2010.10435v1, 2010.11187, 2010.12508v1, 2011.02077, 2011.11691, 2012.01643, 2012.11717v3, 2012.14949, 2101.08954, 2101.10385v1, 2103.04349v1, 2103.04647, 2104.04918v2, 2104.07537, 2105.08877v2, 2106.00175, 2106.05174v1, 2106.05799v1, 2107.06268, 2107.08827v1, 2108.00821v2, 2108.02082v3, 2108.08797, 2109.06625v1, 2109.09287, 2110.00637v4, 2111.15365, 2112.07002, 2112.13001v3, 2202.00769v1, 2202.08500, 2202.11834, 2203.03003v1, 2203.03279v3, 2203.10706, 2205.07193v2, 2206.01038v1, 2206.09654v1, 2206.11578v1, 2207.05114, 2207.12147v1, 2207.13191, 2208.08135v1, 2209.01697, 2209.07274v5, 2210.11010, 2211.04459v3, 2211.04534v1, 2212.11041v1, 2302.13386, 2303.04963v1, 2303.12401v2, 2304.01239v1, 2304.01538, 2305.02968v1, 2305.14612, 2306.00840v1, 2308.02414v3, 2312.11955v1, 2401.00282v1, 2401.01505v5, 2401.06086v1, 2402.01914v1, 2406.15760, 2407.13438, 2407.17832, 2407.20028v1, 2408.00785v4

</details>

<details><summary>wave2-model-2 — 129 ids</summary>

2408.09178v1, 2408.14837v2, 2409.01874, 2409.03940, 2409.04889, 2409.08172v4, 2409.09884v1, 2409.13888v2, 2409.17077v1, 2409.17129v1, 2410.09068, 2410.09190v2, 2410.16333, 2410.24029, 2411.09085v1, 2411.11012v1, 2411.15075v1, 2411.17900v1, 2412.11158v1, 2412.19215v1, 2501.00933v1, 2501.18606v1, 2502.07528v3, 2502.08565v3, 2503.07789, 2503.12107v1, 2503.16470, 2503.16953v1, 2503.20082, 2504.06163v1, 2504.08747v1, 2504.10106v1, 2504.10936v1, 2504.19612v1, 2504.20877v2, 2505.02170v3, 2505.08342, 2506.00348, 2506.01373v1, 2506.03057v1, 2506.04282v1, 2506.22350, 2506.23424v1, 2507.02827v2, 2507.08921v1, 2507.09098, 2507.11739v1, 2507.12657v1, 2507.13033v1, 2507.22472, 2508.00200v1, 2508.05891v1, 2508.07136v2, 2508.09992v1, 2508.14065v1, 2508.15299v1, 2509.03036, 2509.23455v1, 2509.25858v1, 2510.06635, 2510.18193v2, 2511.07250v2, 2511.14186v1, 2511.16183v1, 2511.17535v1, 2512.00312v2, 2512.05271v1, 2512.08824v2, 2512.11668v1, 2512.15269v1, 2601.07980v1, 2601.15000v1, 2601.18815, 2602.06986, 2602.11379, 2602.17043, 2602.19520v2, 2602.21307v2, 2602.22527v1, 2602.23233v1, 2603.08206v5, 2603.11750v2, 2603.21163v2, 2603.22620v2, 2604.01318v1, 2604.08251v1, 2604.13861v2, 2604.17065v1, 2604.24366v2, 2604.27041, 2604.27865v1, 2605.00459, 2605.00864, 2605.02287, 2605.09599, 2605.30209v1, 2605.31529v2, 2606.05332v1, 2606.07811, 2606.09276, 2606.16356v1, 2606.17345v1, 2607.04389v1, 2607.06166, 2607.08199, 2607.11548v1, 2607.18009v1, 2607.18269v2, 2607.18299, 2608.00666, 2608.06635v2, 2608.09586, 2608.09824, 2608.09887v1, 2608.11203v1, 2608.12998, 2608.13886, 2608.19454, 2608.23776v1, 2608.23859, 2608.28116v1, 2608.28598, 2609.06005, 2609.08060v1, 2609.13564v1, 2609.20017, 2609.22641v1, physics/0606016v1, physics/0607064

</details>

<details><summary>wave2-invent — 8 ids</summary>

1905.11481v2, 1912.04871v4, 2409.00629v2, 2410.17238v1, 2508.01285v2, 2606.29823v1, 2608.25770v2, 1210.4854

</details>

## Wave 3 — cheap free-lane wiring (bunny, 2026-09-23)

Additive disabled-by-default scaffolds only. No live ingestion, database, schema, credential, or publish-path changes. Local verification: 6 co-located test files, 18 tests passed. Acceptance gates remain documented and unpromoted.

| ID | Module | Co-located test | Lane | State |
|---|---|---|---|---|
| 2410.21484v1 | `packages/data-ingestion/src/2410-21484v1-markets.ts` | `packages/data-ingestion/src/2410-21484v1-markets.test.ts` | markets | `ENABLED=false` scaffold |
| 2412.10298v1 | `packages/data-ingestion/src/2412-10298v1-viewership.ts` | `packages/data-ingestion/src/2412-10298v1-viewership.test.ts` | nlp | `ENABLED=false` scaffold |
| 2504.04186v1 | `packages/data-ingestion/src/2504-04186v1-data-infra.ts` | `packages/data-ingestion/src/2504-04186v1-data-infra.test.ts` | data_infra | `ENABLED=false` scaffold |
| 2504.08764 | `packages/data-ingestion/src/2504-08764-nlp.ts` | `packages/data-ingestion/src/2504-08764-nlp.test.ts` | nlp | `ENABLED=false` scaffold |
| 2507.17844v1 | `packages/data-ingestion/src/2507-17844v1-tracking.ts` | `packages/data-ingestion/src/2507-17844v1-tracking.test.ts` | tracking | `ENABLED=false` scaffold |
| 2508.11711v2 | `packages/data-ingestion/src/2508-11711v2-data-infra.ts` | `packages/data-ingestion/src/2508-11711v2-data-infra.test.ts` | data_infra | `ENABLED=false` scaffold |

## Wave 4 � V5�V8 + W3�W6 + D1�D4 builders (2026-09-25)

All 12 builds composed into the engine-facing suite. Live-path promotion remains disabled under the new-files-only rule.

| Build | File | Tests | Status |
|---|---|---|---|
| V5 Model-output CSV contract | `packages/prediction-engine/src/eval/model-submission-schema.ts` | 13/13 | DONE |
| V6 Generalized Poisson TD model | `packages/prediction-engine/src/nfl/generalized-poisson.ts` | 15/15 | DONE |
| V7 Feature-construction discipline | `packages/prediction-engine/src/eval/feature-construction-recipe.ts` | 11/11 | DONE |
| V8 Pro-bettor process checklist | `docs/research/2026-09-25/model-process-checklist.md` | doc | DONE |
| W3 ATS ablation harness | `packages/prediction-engine/src/nfl/ats-ablation-harness.ts` | 6/6 | DONE |
| W4 Anytime-TD + EV (MIT) | `packages/prediction-engine/src/props/anytime-td-mit.ts` | 14/14 | DONE |
| W5 Luck-neutralized EPA (MIT) | `packages/prediction-engine/src/nfl/luck-neutralized-epa.ts` | 12/12 | DONE |
| W6 WP event replay (MIT) | `packages/prediction-engine/src/backtest/wp-event-replay.ts` | 9/9 | DONE |
| D1 PropLine intake | `packages/data-ingestion/src/propline-intake.ts` | 13/13 | DONE |
| D2 Forecast-vintage weather | `packages/data-ingestion/src/weather-vintage.ts` | 14/14 | DONE |
| D3 Sleeper intake | `packages/data-ingestion/src/sleeper-intake.ts` | 9/9 | DONE |
| D4 cfbfastR college PBP | `packages/data-ingestion/src/cfbfastr-intake.ts` | 10/10 | DONE |

Full prediction-engine suite: 5837/5837 across 817 test files. coverage.test.ts 10/10. data-ingestion new intakes 46/46 + holdout 12/12.

## Wave 5 � NGS-11/12 + strategic adapters (2026-09-25)

| Build | File | Tests | Status |
|---|---|---|---|
| NGS-11 Coverage/DB metrics | `packages/prediction-engine/src/nfl/coverage-db-metrics.ts` | 9/9 | DONE |
| NGS-12 Adjacent metric families | `packages/prediction-engine/src/nfl/ngs-adjacent-metrics.ts` | 13/13 | DONE |
| Strategic signal adapters | `packages/prediction-engine/src/engine/strategic-signal-adapters.ts` | 16/16 | DONE |

| Decision adapters | `packages/prediction-engine/src/engine/decision-adapters.ts` | 19/19 | DONE |
| Reasoning surface facade | `packages/prediction-engine/src/engine/reasoning-surface.ts` | 11/11 | DONE |

| Market/inplay/sizing adapters | `packages/prediction-engine/src/engine/market-inplay-sizing-adapters.ts` | 22/22 | DONE |

| Expected-metrics adapters | `packages/prediction-engine/src/engine/expected-metrics-adapters.ts` | 9/9 | DONE |

| Dispersion/bayesian adapters | `packages/prediction-engine/src/engine/dispersion-bayesian-adapters.ts` | 14/14 | DONE |

Wave 5 full prediction-engine suite: 5951/5951 across 825 test files. coverage.test.ts 10/10. Engine adapter surface: 170/170 across 14 test files.

## Wave 6 � live-path promotion (2026-09-25)

| Item | File | Status |
|---|---|---|
| 23 signal evaluators into SIGNAL_REGISTRY | `packages/ingestion-pipeline/src/signal-registry-extensions.ts` | LIVE |
| Continuous-signal tilt (hierarchical pool) | `packages/ingestion-pipeline/src/continuous-signal-tilt.ts` | LIVE |
| Intelligence-core ? picks API (six questions, family weights) | `apps/web/lib/picks/intelligence-enrichment.ts` | LIVE |
| GSE 4-Beat props slate | `packages/ingestion-pipeline/src/props-slate.ts` | LIVE |
| gse-four-beat + leakage probes on barrel | `packages/prediction-engine/src/index.ts` | LIVE |
| hierarchical-pool | via continuous-signal-tilt | LIVE |

| Prereg leakage gate | `packages/ingestion-pipeline/src/leakage-gate.ts` | 4/4 | LIVE |
| Walk-forward eval + ship gate | `packages/ingestion-pipeline/src/walk-forward-eval.ts` | 4/4 | LIVE |
| props-hb hierarchical Bayes bridge | `packages/ingestion-pipeline/src/props-hb-bridge.ts` | 4/4 | LIVE |
| Calibration apply/map/monitor/sequence/commitment | `packages/prediction-engine/src/index.ts` barrel | exported | LIVE |
| edge-lab proportionalDevig / impliedFromDecimal | `packages/prediction-engine/src/index.ts` barrel | exported | LIVE |

| Ensemble learning bridge (logit-pool + residual GBM) | `packages/ingestion-pipeline/src/ensemble-bridge.ts` | 6/6 | LIVE |

| Walk-forward taxonomy report | `packages/ingestion-pipeline/src/walk-forward-eval.ts` | 6/6 | LIVE |
| Continual-learning bridge (online metrics + EWC + AdaER) | `packages/ingestion-pipeline/src/continual-learning-bridge.ts` | 10/10 | LIVE |

| Monitoring bridge (ECDD + drift ensemble + Hawkes threat) | `packages/ingestion-pipeline/src/monitoring-bridge.ts` | 8/8 | LIVE |

| In-play bridge (antipersistent + Markov WP + mixed-tier) | `packages/ingestion-pipeline/src/inplay-bridge.ts` | 10/10 | LIVE |

## Wave 6B — props fire/price gates + remaining HB models + leakage factor (2026-09-25)

| Item | File | Tests | Status |
|---|---|---|---|
| props-hb-*-bind wrappers (9 bind layers) | packages/ingestion-pipeline/src/props-hb-bridge.ts | 17/17 | LIVE |
| Remaining per-stat estimators (comp/INT/pass-TD/rush-att/rush-TD/sacks/ATD) | packages/ingestion-pipeline/src/props-hb-bridge.ts | covered in 17/17 | LIVE |
| Fire/price gates after buildBoard (fire-gate, juice-floor, line-shop, priced-edge) | packages/ingestion-pipeline/src/props-slate.ts | 11/11 | LIVE |
| reasonAnytimeTd on player-prop picks | packages/ingestion-pipeline/src/props-slate.ts | covered in 11/11 | LIVE |
| evalLeakageQuality fail-open factor on signal slate | packages/ingestion-pipeline/src/leakage-gate.ts | 7/7 | LIVE |
| assertSubmissionLeakage fail-closed on submission path | packages/ingestion-pipeline/src/leakage-gate.ts | covered in 7/7 | LIVE |
| Catch-cushion / comp-air-yards-diff / rec-TD-cushion / sack-TTT bind barrel exports | packages/prediction-engine/src/index.ts | exported | LIVE |
## Wave 6C — detector classes, Hawkes bootstrap/simulate, edge-lab-bridge (2026-09-25)

| Item | File | Tests | Status |
|---|---|---|---|
| PageHinkley + PUDD as live alarm producers | packages/ingestion-pipeline/src/monitoring-bridge.ts | 15/15 | LIVE |
| bootstrapGoT + simulateHawkes fail-closed wrappers | packages/ingestion-pipeline/src/monitoring-bridge.ts | covered in 15/15 | LIVE |
| schedule-features + logistic + standings-math + binomial stats | packages/ingestion-pipeline/src/edge-lab-bridge.ts | 7/7 | LIVE |
| stats wilsonInterval renamed statsWilsonInterval (duplicate barrel export blocked) | packages/prediction-engine/src/index.ts | exported | LIVE |