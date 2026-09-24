# arXiv Program — Phase 3 Summary: 1,000 Valuable Papers

**Date:** 2026-09-22
**Program:** Garrett's arXiv deep-research program — "the most accurate and calibrated fantasy and prediction sports company in the world"
**Result: 1,000 / 1,000 valuable papers (ADOPT/ADAPT), every one full-text read, every one ledgered, every one integrity-audited.**
**Canonical tracker:** `docs/research/2026-09-21/arxiv-program/state/ledger-tracker-750.jsonl` (filename unchanged)

## Headline numbers

- Tracker rows: **1,000**
- Unique normalized arXiv IDs: **1,000** (zero duplicates)
- Verdicts: **969 ADAPT / 31 ADOPT** — zero REJECTs in the tracker
- Ledger files: all 1,000 exist; every file contains the matching normalized ID and matching verdict
- Net growth: 750 → 1,000 = **+250**, achieved as 252 audited phase-4 additions minus 2 phase-1 phantom entries removed (see Integrity corrections)

## How the 250 were built

| Step | Commit | Papers | Tracker |
|---|---|---|---|
| Overflow absorption (17 eligible of 19 claimed) | `b83e12f` | +17 | 750→767 |
| Wave 4 — NLP | `abe3fb0` | +12 | 767→779 |
| Wave 4 — weather | `19e9cae` | +12 | 779→791 |
| Wave 4 — Bayesian | `044b158` | +12 | 791→803 |
| Wave 4 — calibration + sizing | `c827909` | +24 | 803→827 |
| Wave 4 — causal | `d19b586` | +13 | 827→840 |
| Wave 4 — ensembles | `b81a642` | +12 | 840→852 |
| Wave 4 — markets | `2c180f3` | +11 | 852→863 |
| Wave 4b — calibration round 2 | `6721cef` | +12 | 863→875 |
| Wave 4b — NLP round 2 | `2733add` | +12 | 875→887 |
| Wave 4b — abstention | `31d0180` | +12 | 887→899 |
| Wave 4b — causal round 2 | `92c121c` | +12 | 899→911 |
| Wave 4b — ensembles round 2 | `632f072` | +12 | 911→923 |
| Wave 4b — props/DFS round 2 | `2310f94` | +12 | 923→935 |
| Wave 4b — Bayesian round 2 | `df9863e` | +12 | 935→947 |
| Wave 4b — markets round 2 | `ec1079f` | +12 | 947→959 |
| Wave 4b — Kelly sizing round 2 | `61460b4` | +12 | 959→971 |
| Wave 4b — win probability / spread / totals | `f016d36` | +12 | 971→983 |
| Wave 4b — weather round 2 | `919f279` | +12 | 983→995 |
| Wave 4b — DFS round 1 (lane exhausted, honest 4) | `2ca0e16` | +4 | 995→999 |
| Wave 4c — single-paper mop-up (#1000) | `b3a5a62` | +1 | 999→1000 |
| Integrity: remove 2 phase-1 phantom entries | `3941ad1` | −2 | 1000→998 |
| Wave 4c — replacements for the 2 phantoms | `c7d0312` | +2 | 998→1000 |
| Reports/dedup backfill + weather verdict-syntax normalization | `003fa13` | 0 | — |
| Local-only ledger backfill (phase-1 era + wave-4 REJECT ledgers, 3 batches) | `4be9aba`, `1ce58c8`, `7e68114` | 0 | — |

## The 17 overflow papers (absorbed as program_phase 4)

A prior summary claimed 19 overflow papers; a direct audit found only 17 eligible. Ledgers 1444–1446 were already represented, and two supposed overflow papers were REJECTs (`1491 acwr-injury-children`, `1496 betting-neither-verifiable-nor-falsifiable`) — both excluded. The 17 eligible papers were appended in `b83e12f`.

## Lane breakdown (final, all 1,000)

tracking_ngs 102 · team_ratings 84 · win_spread_total 74 · calibration_uncertainty 73 · experimental 63 · ensembles 52 · abstention 48 · causal_injury 48 · kelly_sizing 47 · odds_market 45 · nlp_llm 45 · weather 36 · markets 33 · bayesian_statespace 30 · mixed 24 · (unlabeled) 21 · data_api_infra 19 · props_player 18 · calibration 16 · props_fantasy 16 · dfs_props 16 · dfs 14 · sizing 14 · sports_CV 12 · causal 10 · ratings 9 · ensembles-forecast-aggregation 8 · nlp 5 · bayesian 5 · props_dfs 4 · tracking 3 · live_event_modeling 1 · calibration-postprocessing 1 · score-distributions 1 · metric-validation 1 · season-forecasting-parsimony 1 · sports_physics 1

## Verdict breakdown

- **ADAPT: 969** — papers with genuine GSE value requiring adaptation (NFL schema refit, proper-scoring validation, or margin integration before production use)
- **ADOPT: 31** — papers usable near-directly
- **REJECT: 0 in tracker** — a REJECT never counts; every formal REJECT was replaced with another full read

## REJECT / replacement accounting

Formal REJECTs written during the extension (all replaced with fresh full reads, none counted):

- Wave 4 Bayesian: 2 REJECTs replaced (`044b158`)
- Wave 4 ensembles: 1 REJECT replaced (`b81a642`)
- Wave 4 causal: 5 REJECTs replaced (`d19b586`)
- Wave 4 sizing: 1 REJECT replaced (`c827909`)
- Wave 4b causal: 1 REJECT replaced (`92c121c`)
- Wave 4b weather round 2: 2 REJECTs replaced — 1706/1507.02896 (ice-arena heat transfer), 1707/2505.02990 (NYC subway ridership) → replaced by 1711 (physics/0505118) and 1712 (2202.03034) (`919f279`)
- Wave 4b win/spread: 1 full-text read rejected without ledger (`1706.01625`, undergraduate betting-odds exposition) — worker self-replaced its duplicate ledger 1789 with a fresh paper at 1801 (`f016d36`)
- Wave 4b DFS round 1: **5 REJECTs NOT replaced** — the reader ran 23 arXiv search rounds and demonstrated the DFS/fantasy territory is exhausted ("fantasy sports" = 24 total arXiv hits, all sports-relevant hits already in corpus); reported honestly as 4 counting papers rather than padding (`2ca0e16`)
- Wave 4b markets: 1 paper screened out without ledger (`2409.13528`)
- Overflow audit: 2 pre-existing REJECTs excluded (1491, 1496) — never counted

## Blocked / withdrawn papers

- `2206.11105` (wave 4 sizing): withdrawn — no ledger written, not counted, documented in the wave-4 sizing report

## Duplicate exclusions

- `2603.26620` (wave 4 markets, ledger 1619): duplicated already-tracked ledger 1634 — excluded; markets contributed 11, not 12 (`2c180f3`)
- Win/spread worker self-caught: ledger 1789 (`2207.05114`) duplicated ledger 1656 — deleted and replaced with fresh paper at ledger 1801 (`2409.04889`, NFL expected points) (`f016d36`)

## Integrity corrections (found by audit, fixed honestly)

1. **Overflow overcount** — claimed 19, audited to 17 eligible (2026-09-21/22).
2. **Ledger-number collision** — wave-4 causal reused weather ledgers 1578–1580; causal files renumbered 1636–1638.
3. **Wave-4 markets duplicate** — `2603.26620` excluded (see above).
4. **wave4b-nlp2.jsonl malformed summary line** — 12 paper rows valid; summary rewritten as valid JSON (`2733add`).
5. **Phase-1 phantom entries** — tracker entries `2603.13397v2` and `2602.22073v1` pointed at ledger files 0211/0213 that actually document already-tracked papers `2605.05487v1` and `2601.14727v3`. Both phantom entries removed (`3941ad1`) and replaced with two fresh full reads: 1820/`2103.04647` (flexible marked Hawkes football events, lane `live_event_modeling`) and 1821/`1403.7642` (college football ranking sensitivity GLMM, lane `team_ratings`) (`c7d0312`).
6. **Weather ledger verdict syntax** — ledgers 1578–1589 normalized from `**Verdict**: ADAPT/ADOPT` to canonical `**Verdict:** ADAPT/ADOPT` (`003fa13`).

## Final integrity audit (2026-09-22, direct file verification)

- Tracker rows: **1,000** ✓
- Unique normalized arXiv IDs: **1,000** ✓ (zero duplicates)
- All verdicts ADOPT/ADAPT, zero REJECTs ✓
- All 1,000 ledger files exist ✓
- Every ledger contains the matching normalized ID ✓
- Every ledger contains the matching verdict ✓
- program_phase: 1:362, 2:215, 3:171, 4:252 (252 appended − 2 phase-1 phantoms removed = net +250) ✓

## Notable finds of the extension

- **2409.04889** (Brill/Yee/Deshpande/Wyner) — audits NFL expected-points construction itself: size bias, 1/Nᵢ drive weighting, cluster bootstrap, catalytic prior. No corpus ledger covered EP construction.
- **2110.03874** (Gao/Shen/Zhang) — per-team standard errors and data-driven rank CIs for Bradley-Terry-Luce; proof BT-MLE is locally minimax optimal. Paper #1000.
- **2103.04647** — Bayesian marked Hawkes-like framework for football event sequences; fills the corpus's self-exciting-process gap for live NFL modeling.
- **1403.7642** — proves Mease (2003) penalized likelihood is exactly PQL of a multiple-membership GLMM; integral approximation alone flips title pairings.
- **2112.07002** — joint E[max] of correlated Showdown lineups: +$5,376 (+55.6% ROI) on 16 real 2018 DK Showdown contests.
- **2407.13438** — multi-entry March Madness portfolio framework; 2.2% win probability on the real DK 2023 $1M pool.

## Method notes

- Every paper: full-text read (ar5iv HTML / arXiv source / PDF), never abstract-only. One abstract-only candidate (`2102.07738`) was disqualified.
- Every ledger: 14 sections (citation + full-text statement, research question, method, math, dataset, features/target, validation, exact results, code/data, leakage, GSE overlap, implementation spec, reproducible test, numeric gate).
- Dedup: live tracker + wave4/wave4b dedup base-ID snapshots + all arxiv-deep ledger headers + corpus lists, checked immediately before finalizing each batch; IDs normalized by stripping trailing `vN`.
- 22 reader agents across waves 4/4b/4c; every counted paper independently re-audited by the coordinator (file existence, ID match, verdict match, tracker-dedup, in-batch dedup) before appending.
- Commits via `github-push-files` (Git Database API); messages prefixed `arxiv-1000:`.
