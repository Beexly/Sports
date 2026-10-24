# Muse sweep digest — `arxiv-sweep-2026-10-02.zip` pipeline artifacts

Source zip (read-only): `G:\My Drive\GSE. 10.2.26\arxiv-sweep-2026-10-02.zip` (slice label: 1,380 entries).
Extracted to (only write location): `C:\Users\Garrett\AppData\Local\Temp\gse-extract\muse\arxiv-sweep\` — 1,374 files + 7 dirs on disk (≈1,380 entries with dir records; matches label).
No paper PDFs or calibration briefs re-read per instructions; only the sweep's own scoring machinery below.

## a) Pipeline funnel (numbers read from the files, not invented)

Wave 1 fetch:
- `raw_*.json` (20 files): per-file counts 60,22,0,19,39,7,17,4,1,5,15,34,60,0,5,21,4,9,0,35 = **357 raw hits** across the 20 `fetch_arxiv.py` queries.
- `manifest.json`: `{"fetched_at":"20260921T062102Z","unique_papers":569,"wave2_new":241}` with `per_query_counts` identical to the raw_*.json counts (sum 357). Note: `unique_papers` 569 exceeds the raw-hit sum 357, so `manifest.json` is cumulative/post-wave state, not a pure wave-1 count. Flagged, not reconciled.
- `master.jsonl`: **865 lines**, 1,472,899 bytes (~1.47 MB). Record keys: id/title/authors/abstract/published/categories/doi/url/queries.
- `batch_1..5.jsonl`: 143+142+142+142+296 = **865** (exact partition of master).
- `scored_batch_1..5.jsonl`: same row counts; combined score distribution **0:216, 1:237, 2:316, 3:96** (total 865).
- `screened_batch_1..5.md`: 230/162/308/219/237 lines; `## ` headers 21/14/43/21/17. These are analyst screening highlights, not 1:1 row coverage. Do not quote them as funnel counts.
- `manifest-500.jsonl`: **500 rows**; score dist **3:75, 2:286, 1:139**. (75 of the 96 score-3s selected; 21 score-3s skipped — matches skip-report score-3 count 21.)
- `skip-report.json`: **365 rows** = 216 `score-0-no-sports-transfer` + 97 `reserve-pool-replacement-stock` + 42 `already-covered-in-existing-research` + 10 `pilot-ledger-already-written`. Score dist 0:216, 1:98, 2:30, 3:21.
- `reserve-100.jsonl`: **97 rows** (all score 1), not 100. RECONCILIATION-NOTES.md acknowledges this (see §e).
- `ledger-tracker.jsonl`: **607 rows**; statuses completed:510, reserve:95, replaced:2. Composition: 500 manifest-index slots (including 2 withdrawn-and-replaced slots) + 97 reserve-pool slots + 10 pilot-ID rows carried as completed. `ledger-tracker-750.jsonl` is **0 bytes / 0 lines** (empty placeholder).
- Withdrawn replacement (per ledger `blocked_reason`, verified 2026-09-21 via arXiv abs pages): manifest slots `1512.07208v3` and `2607.01722v2` marked `replaced`; reserve file and ledger reserve lists differ by exactly those 2 ids (`2410.11078v2`, `2412.20733v1` in the reserve file vs the two withdrawn originals in ledger reserve/replaced rows).

Phase 2 (separate fetch; exclusion list `phase2-excluded-ids.txt`, 1,730 lines):
- `phase2-candidates-bayes.jsonl` **171**; `-calibration` **149**; `-causal` **159**; `-market` **135**; `-marketretry` **69**; `-merged` **570** (171+149+159+135=614 pre-dedupe → 570 merged); `-topup` **63**. Merged/topup/marketretry candidate records carry id/title/authors/abstract/published/categories/url/query (no score field).
- `phase2-triage-scored-00.jsonl` **288** (3:10, 2:42, 1:189, 0:47); `-01` **282** (3:21, 2:66, 1:123, 0:72); `-marketretry` **381** (3:5, 2:17, 1:47, 0:312 — 381 scored rows vs 69 `marketretry` candidates: the retry scorer re-scored a broader pool, not just the 69); `-topup` **63** (3:2, 2:27, 1:34). Union: 1,014 rows → **1,013 unique ids** (single duplicate: `2402.15588v1`, score 2 in both marketretry and topup). Unique score dist: 0:431, 1:393, 2:151, 3:38.
- `selection-750.jsonl`: **582 rows** (1:393, 2:151, 3:38) = exactly the deduped phase-2 triage non-zero set (verified id-set equality). The filename's "750" is stale/aspirational; the file holds 582. Not acknowledged in RECONCILIATION-NOTES.md — flagged.
- Search stats: `phase2-search-stats-bayes.json` `total_kept: 1475` across 18 queries, but 8 queries show raw=0/kept=0 in that JSON (failed queries at stats-write time). `phase2-search-notes-bayes.md` gives the verified table (all-200-raw: e.g. hierarchical-Bayesian 200/200, fantasy 200/180, trajectory 200/159, role/formation 200/119, spatial/pitch-control 200/199, event-detection 200/72, Elo/TrueSkill 200/141, Poisson 200/191, props 200/63, calibration 200/151). Calibration notes: 14 queries × 200 = **2,800 raw**. Causal notes: 21 queries → **159 candidates**. Market notes: wave-1 16 × 150 = **2,400 raw** → **135 candidates**. Notes files are the reliable counters where the stats JSON shows zeros.
- `fulltext/` **1,115** .txt files; `fetch-queue.jsonl` 432 lines, `fetch-queue2.jsonl` 524 lines, `fetch-failures.jsonl` 1 line.

## b) Scoring rubric (from the code)

`fetch_arxiv.py` `fetch()` (rate-limited `export.arxiv.org/api/query`, `User-Agent: GSE-research-sweep/1.0`) + `parse()` (id/title/authors/abstract/published/categories/doi/url) + `main()` (per-query fetch, `seen`-dict dedupe by id with `queries[]` tagging, master sorted by published desc, writes `master.jsonl`/`manifest.json`); phase-2 `bayes_search.py` `fetch()` (`all:<query>`, sortBy=relevance, max 200) + `base_id()` (strip trailing `vN`) + `parse()` with `phase2-excluded-ids.txt` exclusion and within-file base-ID dedupe, stats to `phase2-search-stats-bayes.json`; `bayes_filter.py` regex machine (`SPORT_TITLE`, `SPORT_ABS`, `METHOD`, `JUNK_DOMAIN`) + `is_english()` (non-Latin <2%) + withdrawn/pure-theory rejection, formula `score = 4*titleSports + 2*abstractSports + min(methods,6) − 1.5*junk − 3*theory` with gate `sport_total ≥ 1 and score ≥ 2.0 and junk ≤ 4`, sort `(-score, id)`, `FINAL_N = 170`; `bayes_rebuild.py` `bid()` base-ID cleaning, exclusion re-application, identical rescore, top-170 cutoff plus explicit rescue of `1912.10417v1`, `assert` no-dupes/no-exclusion-leaks; `bayes_retry.py` `fetch()` with `tries=6` exponential backoff (`5*2^t`) over the 8 failed queries, append-deduped against `excluded`+`have`; `build_manifest.py` `bare()` version-strip, `lane_of()` (query-first via `QUERY_LANE` vote, keyword fallback via `KW_LANES`, default `experimental`), `pubkey()` published-date key, `main()` (dedupe by bare id, skip `PILOT`→pilot-ledger, `COVERED`→already-covered, score-0→no-transfer; all score-3 auto-in regardless of lane quota, then per-lane `QUOTA=50` by (score, published) desc, backfill to 500, next 100 → reserve; write order by (lane, published, score); emits `manifest-500.jsonl`/`reserve-100.jsonl`/`skip-report.json`/`ledger-tracker.jsonl`).

## c) TOP-25 digest (phase-2 triage-scored union, deduped to 1,013 ids; 38 score-3s total; top 25 strictly by (score desc, id asc))

| # | score | arXiv id | title | scorer's one-line reason (verbatim, trimmed) |
|---|-------|----------|-------|----------------------------------------------|
| 1 | 3 | 0710.0485v2 | Prediction with expert advice for the Brier game | Prediction-with-expert-advice algorithm for the Brier game applied to real football and tennis match results with tight theoretical guarantees; online expert aggregation directly adaptable to combining GSE models. |
| 2 | 3 | 1305.1998v1 | Inferring Team Strengths Using a Discrete Markov Random Field | Offensive/defensive team-strength inference over time demonstrated on English Premier League data. |
| 3 | 3 | 1502.05886v1 | On predictability of rare events leveraging social media: a machine learning perspective | ML framework predicting soccer match outcomes from social media streams with focus on rare outcomes; directly sports prediction. |
| 4 | 3 | 1601.00574v1 | NFL Play Prediction | Play-outcome prediction on NFL game data with a new progress measure and promising results; directly NFL prediction. |
| 5 | 3 | 1604.03186v1 | Estimating an NBA player's impact on his team's chances of winning | Bayesian linear regression estimating NBA player impact on win probability, controlling for teammates; directly win modeling. |
| 6 | 3 | 1604.03614v5 | The Market for English Premier League (EPL) Odds | Skellam-process model of live EPL betting odds estimating scoring rates and implied volatility on 1520 real games. |
| 7 | 3 | 1609.01176v1 | The Player Kernel: Learning Team Strengths Based on Implicit Player Contributions | Gaussian-process match-outcome prediction with player kernels evaluated on Euro 2008/2012/2016; principled uncertainty. |
| 8 | 3 | 1701.02814v2 | Kelly betting on horse races with uncertainty in probability estimates | Kelly betting on horse races with uncertainty in probability estimates; direct sports-betting application with empirical results. |
| 9 | 3 | 1705.04356v1 | Comparing probabilistic predictive models applied to football | Bayesian multinomial-Dirichlet models for Brazilian football match outcomes on 1,710 matches, competitive with standards and well calibrated under proper scoring rules; directly adaptable calibrated match forecasting. |
| 10 | 3 | 1705.08079v2 | Effective injury forecasting in soccer with GPS training data and machine learning | GPS-based injury forecaster for a professional soccer club over a full season, shown accurate and interpretable with case studies. |
| 11 | 3 | 1706.04336v1 | Predictive modelling of training loads and injury in Australian football | Injury prediction from 3 seasons of GPS/accelerometer/RPE data with regularized logistic, GEE, RF, SVM evaluated by AUC on a held-out season. |
| 12 | 3 | 1710.02824v2 | Beating the bookies with their own numbers - and how the online sports betting market is rigged | Betting strategy exploiting bookmakers own odds to beat football markets with real wagering results; directly sports-betting with empirical profits. |
| 13 | 3 | 1907.00208v2 | Deep Gamblers: Learning to Abstain with Portfolio Theory | Deep Gamblers: (m+1)-class abstention via portfolio-theory doubling-rate loss; directly ties abstention to betting theory. |
| 14 | 3 | 1909.02343v1 | Online Gambling of Pure Chance: Wager Distribution, Risk Attitude, and Anomalous Diffusion | Real gambling logs: log-normal wager distributions and anomalous diffusion of gambler net income across pure-chance games. |
| 15 | 3 | 1912.10417v1 | Modelling basketball players' performance and interactions between teammates with a regime switching approach | Markov-switching model of shooting performance variability plus lineup-interaction networks on real basketball data. |
| 16 | 3 | 2109.08051v1 | Frame by frame completion probability of an NFL pass | Frame-by-frame NFL pass completion probability using tracking distances with empirical target identification; directly NFL prediction. |
| 17 | 3 | 2201.01168v1 | Application of the Pythagorean Expected Wins Percentage and Cross-Validation Methods in Estimating Team Quality | Pythagorean/contest-theory win estimators tested with cross-validation on 13 seasons of MLB data with RMSE improvements. |
| 18 | 3 | 2202.10085v2 | Bettors' reaction to match dynamics -- Evidence from in-game betting | State-space model of live in-play stakes driven by pre-game and VAEP-measured in-game strength on real high-frequency data. |
| 19 | 3 | 2206.13222v1 | ML-Based Approach for NFL Defensive Pass Interference Prediction Using GPS Tracking Data | LSTM/GRU/ANN models predicting defensive pass interference from 2018 NFL Next Gen Stats tracking data; directly NFL tracking prediction. |
| 20 | 3 | 2207.13747v1 | Bayesian estimation of in-game home team win probability for Division-I FBS college football | Bayesian in-game home-team win-probability models for FBS college football using expected remaining possessions and score, applied to real games; directly adaptable in-play probability methodology. |
| 21 | 3 | 2211.15734v1 | Predicting Football Match Outcomes with eXplainable Machine Learning and the Kelly Index | Elo-featured ML with Kelly-Index difficulty classification on 2019-2021 Premier League data, competitive with prior work. |
| 22 | 3 | 2303.05774v1 | NFL Career Success as Predicted by NFL Scouting Combine | Six algorithms predicting NFL matriculation and career success from Scouting Combine data; directly NFL player prediction. |
| 23 | 3 | 2405.12588v1 | An analysis of factors impacting team strengths in the Australian Football League using time-variant Bradley-Terry models | Time-variant Bradley-Terry models fit to AFL 2015-2023 data identifying team strengths and performance factors; directly sports-relevant rating methodology with real data. |
| 24 | 3 | 2408.10867v1 | Bye-Bye, Bye Advantage: Estimating the competitive impact of rest differential in the National Football League | Bayesian state-space models on NFL outcomes and betting-market data showing bye-week rest advantage has vanished; directly win-modeling relevant. |
| 25 | 3 | 2410.00943v1 | RisingBALLER: A player is a token, a match is a sentence, A path towards a foundational model for football players data analytics | Transformer player embeddings with next-match statistics prediction beating a strong forecasting baseline on real match data. |

Remaining 13 score-3s (ranks 26–38, same sort): 2411.08901v1, 2505.21275v1, 2506.03057v1, 2508.09992v1, 2508.15956v1, 2510.16008v1, 2601.19479v1, 2603.26935v1, 2604.01491v1, 2606.24171v1, 2607.00164v1, 2608.05560v1, physics/0608007v1.

## d) Overlap vs the Sports repo (by bare arXiv id, read-only greps)

Result: **25/25 of the top-25 are ALREADY represented in `docs/arxiv-program/`** (each has a dedicated `arxiv-deep/` ledger file plus hits in `MASTER-PAPER-INDEX.md` and `arxiv-program/index/corpus-index.jsonl`). 7 of the 25 are additionally implemented in `packages/data-ingestion/src/`. None of the 25 appear in the three named briefs (those briefs cover different papers).

| arXiv bare id | Sports verdict | file when found |
|---------------|----------------|-----------------|
| 0710.0485 | ALREADY | `docs/arxiv-program/research/2026-09-21/arxiv-deep/0625-predicting-under-brier-game-expert.md` |
| 1305.1998 | ALREADY | `.../arxiv-deep/0652-inferring-team-strengths-discrete-markov-random-field.md` |
| 1502.05886 | ALREADY (+data-ingestion) | `.../arxiv-deep/0627-predictability-rare-events-leveraging-social-media.md`; `packages/data-ingestion/src/1502-05886v1-nlp.ts` (+`.test.ts`) |
| 1601.00574 | ALREADY | `.../arxiv-deep/0671-nfl-play-prediction.md` |
| 1604.03186 | ALREADY | `.../arxiv-deep/0672-estimating-an-nba-player-s.md` |
| 1604.03614 | ALREADY (+data-ingestion) | `.../arxiv-deep/0628-market-for-english-premier-league.md`; `packages/data-ingestion/src/1604-03614v5-markets.ts` (+`.test.ts`) |
| 1609.01176 | ALREADY | `.../arxiv-deep/0653-player-kernel-team-strengths.md` |
| 1701.02814 | ALREADY | `.../arxiv-deep/0626-kelly-criterion-under-probability-uncertainty.md` |
| 1705.04356 | ALREADY | `.../arxiv-deep/0673-comparing-probabilistic-predictive-models.md` |
| 1705.08079 | ALREADY (+data-ingestion) | `.../arxiv-deep/0619-effective-injury-forecasting-in-soccer.md`; `packages/data-ingestion/src/injury-availability-layer.ts` (+`.test.ts`) |
| 1706.04336 | ALREADY | `.../arxiv-deep/0620-non-contact-injury-australian-football-players.md` |
| 1710.02824 | ALREADY (+data-ingestion) | `.../arxiv-deep/0629-beating-the-bookmakers-consensus-odds.md`; `packages/data-ingestion/src/consensus-maxprice-engine.ts` (+`.test.ts`) |
| 1907.00208 | ALREADY | `.../arxiv-deep/0618-deep-gamblers-learning-to-abstain.md` |
| 1909.02343 | ALREADY | `.../arxiv-deep/0642-online-gambling-pure-chance-wager-distribution.md` |
| 1912.10417 | ALREADY | `.../arxiv-deep/0647-regime-switching-basketball-player-performance.md` |
| 2109.08051 | ALREADY (+data-ingestion) | `.../arxiv-deep/0648-frame-by-frame-completion-probability-nfl-pass.md`; `packages/data-ingestion/src/2109-08051v1-tracking.ts` (+`.test.ts`) |
| 2201.01168 | ALREADY | `.../arxiv-deep/0674-application-of-the-pythagorean-expected.md` |
| 2202.10085 | ALREADY (+data-ingestion) | `.../arxiv-deep/0643-bettors-reaction-match-dynamics-evidence.md`; `packages/data-ingestion/src/ingame-bettor-reaction.ts` (+`.test.ts`) |
| 2206.13222 | ALREADY | `.../arxiv-deep/0668-ml-based-approach-for-nfl.md` |
| 2207.13747 | ALREADY | `.../arxiv-deep/0675-bayesian-estimation-of-in-game-home.md` |
| 2211.15734 | ALREADY (+data-ingestion) | `.../arxiv-deep/0676-predicting-football-match-outcomes-with.md`; `packages/data-ingestion/src/kelly-index-features.ts` (+`.test.ts`) |
| 2303.05774 | ALREADY | `.../arxiv-deep/0649-nfl-career-success-predicted-scouting-combine.md` |
| 2405.12588 | ALREADY | `.../arxiv-deep/0666-analysis-of-factors-impacting-team-strengths.md` |
| 2408.10867 | ALREADY | `.../arxiv-deep/0677-bye-bye-bye-advantage-estimating-the.md` (plus citations in `0094-`/`0098-` ledgers) |
| 2410.00943 | ALREADY | `.../arxiv-deep/0650-risingballer-player-token-match-sentence.md` |

Named-brief check: `1494-dynamic-bradley-terry.md`, `1704-duckworth-lewis-bayesian-resource-table.md`, `1601-goal-few-shot-sports-game-summarization.md` contain **none** of the 25 ids (they are different papers). Roots checked read-only: `C:\Users\Garrett\Sports\docs\arxiv-program` (1,707 text files) and `C:\Users\Garrett\Sports\packages\data-ingestion\src` (971 files). No G: or repo files modified; no git commands run.

## e) Reconciliation check (64 / 42 / 10)

- "64 existing IDs": VERIFIED for the map — `existing-research-map.md` contains **64 unique** `\d{4}.\d{4,5}` ids (regex count). **MISMATCH in code**: `build_manifest.py` `COVERED` hardcodes **63** ids (9 quoted chunks → 63 tokens, 63 unique), and its docstring claim "skips 64" is wrong by one. So the sweep excluded 63, not 64.
- "42 in-corpus": VERIFIED — 42 of the COVERED bare ids occur in `master.jsonl` (865 unique bare ids); `skip-report.json` independently records 42 `already-covered-in-existing-research` rows.
- "10 pilot exclusions": VERIFIED — all 10 `PILOT` bare ids (`2609.06739, 2607.14430, 1706.02447, 1701.08055, 2511.03732, 1906.11373, 2602.07030, 2506.03335, 2402.06815, 2309.15253`) occur in `master.jsonl`, and `skip-report.json` records 10 `pilot-ledger-already-written` rows. The 10 also persist as extra `completed` rows in `ledger-tracker.jsonl` (hence 607 = 500 + 97 + 10).
- "Remaining 22 never in corpus": consistent (64 − 42 = 22; with the 63-id code set it would be 63 − 42 = 21 — another reason to fix the COVERED list).
- Reserve note in RECONCILIATION-NOTES.md ("97 eligible remain… reserve-100.jsonl holds all 97") VERIFIED (97 rows, all score 1). Tracker-bug note (manifest 41–50 group4 reset to pending) is historical: current `ledger-tracker.jsonl` shows manifest slots as `completed`/`replaced`, i.e. post-processing state, not the pending manifest state.
