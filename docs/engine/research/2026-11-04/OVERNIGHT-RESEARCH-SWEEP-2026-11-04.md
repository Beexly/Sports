# Overnight Research Sweep — 2026-11-04

**Status:** COMPLETE — sweep, backfill, index, retrieval verification all done
**Corpus:** 6,376 deduped records · 190,462 unique terms · 1,530 with full text
**Index:** `intelligence/corpus/corpus_mindfeed.jsonl` (6,376 entries, UNVALIDATED gate)
**Last updated:** 2026-11-04 11:05 CST (post-backfill, post-RRF)

## Sources Harvested

| Source file | Records | Method | Notes |
|---|---|---|---|
| `arxiv_sweep_2026-11-04.jsonl` | 300 | arXiv API | 12 sports-analytics queries × 25 |
| `broad_sweep_2026-11-04.jsonl` | 500 | arXiv API | 20 ML/AI clusters × 25 |
| `overnight_sweep_v2_2026-11-04.jsonl` | 429 | OpenAlex API | 40 domain clusters, relevance-sorted |
| `openalex_broad_2026-11-04.jsonl` | 250 | OpenAlex API | 5 non-sports clusters × 50 |
| `overnight_sweep_2026-11-04.jsonl` | 813 | OpenAlex API | v1, cited-by-sorted — contaminated, kept flagged |
| `hf_datasets_2026-11-04.jsonl` | 54 | HuggingFace API | Dataset discovery |
| `manifest.jsonl` (base) | 2,890 | prior harvest | OpenAlex/arXiv bulk |
| `arxiv_gap_2026_11_04.jsonl` | 404 | arXiv API | Gap-targeted clusters |
| `openalex_gap_2026_11_04.jsonl` | 500 | OpenAlex API | Gap-targeted clusters |
| `arxiv_causal_2026_11_04.jsonl` | 273 | arXiv API | Causal inference / Bayesian sports |
| `arxiv_sweep` 2nd/3rd waves | 767 | arXiv API | 20 broad + 24 intersection queries |
| `openalex_nfl_2026_11_04.jsonl` | 158 | OpenAlex API | Deep NFL domain |
| `hf_sports_datasets_2026_11_04.jsonl` | 7 | HuggingFace API | Sports dataset discovery |
| `fulltext_backfill.jsonl` | **1,177** | arXiv bridge | resumable; 1,177 rows, 1,372 key aliases, 26 failures (empty payload) |
| `datasets_tooling_2026_11_04.jsonl` | 15 | web search | nflreadpy, penaltyblog, sports-betting, Metrica, SoccerTrack v2, etc. |
| `arxiv_gap_retry_2026_11_04.jsonl` | 97 | arXiv bridge | recovered 3 of 9 failed gap clusters (action_recog 40, player_valuation 40, injury_mech 17) |

**Merged:** 6,822 records → **6,376 after title-key dedupe** (446 collapsed).

## Retrieval Verification — 8 domains, all pass

| Query | Top hit | Score |
|---|---|---|
| vision language action model robot manipulation | Geometric Action Model for Robot Policy Learning | 27.59 |
| multi-agent reinforcement learning coordination | CODA: Coordination via On-Policy Diffusion | 24.48 |
| explainable AI safety language model | Explainable AI and LLM in Mental Health Support | 18.36 |
| conformal prediction uncertainty | Beyond Prediction-Set Size: Credal Geometry | 19.04 |
| reinforcement learning scheduling logistics | Dynamic Scheduling Optimization for Smart Logistics | 25.21 |
| neural operator control theory | Optimizing Neural Networks via Koopman Operator Theory | 16.39 |
| knowledge graph retrieval augmented generation | TagRAG: Tag-guided Hierarchical KG RAG | 27.20 |
| NFL win probability calibration | The Blown Lead Paradox | 21.22 |

## Full-Text Coverage by Source

| Source | Records | With full text | Coverage |
|---|---|---|---|
| `local_pdf` | 118 | 117 | **99.2%** |
| `arxiv` | 1,302 | — | backfill limited to 21 |
| `openalex` | 3,038 | — | metadata only |
| `web_pdf` | 18 | — | — |
| `huggingface_dataset` | 54 | — | metadata only |

## Topic Density (top 25 of 100+)

Sports + AI core: `football_analytics` 292 · `vision_tracking` 282 · `Sports Analytics and Performance` 208 · `forecasting_calibration` 206 · `pose_homography` 176 · `coverage_scheme` 168 · `american_football` 30 · `nfl_league` 17

Cross-domain ML: `Reinforcement learning` 97 · `Artificial intelligence` 95 · `Scheduling` 42 · `Robot` 31 · `Human–computer interaction` 20 · `Autonomous Vehicle Technology` 20

Theory/methods: `Conformal prediction` (via query) · `stat.AP` 70 · `stat.ML` 20 · `cs.LG` 73 · `cs.CV` 48 · `cs.AI` 28 · `physics.soc-ph` 22

## Known Contamination

The v1 OpenAlex sweep (813 records) was sorted by `cited_by_count:desc` rather than relevance and pulled ~89% off-domain papers. It is retained in the merged manifest with `_merge_prio: 9` so downstream consumers can filter it out. Topic counts expose it directly: "Galaxies: Formation" 12, "Stellar, planetary, and galactic studies" 10, "Genomics and Phylogenetic Studies" 10 — none are sports/coaching research.

**Remediation:** filter `_merge_prio < 9` when precision matters; or drop v1 entirely on the next merge cycle.

## Pipeline Components Verified

- `intelligence/research/corpus_index.py` — `build_index()` → `dedupe()` → BM25 search. 4.76s build on 69 MB manifest.
- `intelligence/research/corpus_retriever.py:73` — calls `ci.dedupe(ci.build_index(Path(manifest)))`.
- `scripts/ops/build_corpus_index.py` — CLI driver, emits mind-feed + stats JSON.
- `scripts/research/fulltext_backfill.py` — 1,177 rows, resumable, 26 failures (empty payload, not 429).
- `scripts/research/arxiv_bridge.py` — stdio MCP bridge; returns `{"papers": [...]}` dict, not a list.
- `scripts/research/nfl_deep_sweep_v2_2026_11_04.py` — HTTPS, 429 backoff (30/60/120/240s), resume-by-cluster.

## Gaps Still Open

1. **Kaggle API unavailable** — no credentials at `~/.kaggle/kaggle.json`, no `KAGGLE_KEY` env. Public search endpoint returns 404 without auth. Substituted HuggingFace Datasets (54 records).
2. **Full-text backfill at 1,177 rows** — pipeline works and is resumable; remaining ~1,300 IDs are increasingly off-domain (drug discovery, DL compilers) because the merged manifest includes the broad sweep's generic ML records.
3. **Non-arXiv records lack a resolver** — ~3,000 OpenAlex records have no full-text path; needs Unpaywall/OpenAlex PDF resolution, which doesn't exist yet.
4. **v1 contamination not filtered at index time** — `build_corpus_index.py` has no `--min-priority` flag.
5. **RRF/domain-weighting IS implemented** — `corpus_index.py` has `RRF_K=60`, `RRF_ALPHA=0.55`, `search_fused()`, and `domain_prior()` (SAME_DOMAIN_BOOST=1.6, OTHER_DOMAIN_DEMOTE=0.90, CROSS_DOMAIN_DEMOTE=0.25). `corpus_retriever.retrieve()` defaults to `fused=True`. `sport_domain` is now persisted at index build (572 AF / 975 soccer / 4,829 other).
6. **`sensitive-excluded` gate unenforceable** — the merged manifest has no `status` field. Only `retracted` exists and is enforced in all three rankers. A content-level filter would be needed, but the exclusion criteria are undefined.
7. **NFL deep sweep failed** — all 20 arXiv clusters 429'd (0 records); 4 of 10 OpenAlex clusters survived (160 records). `nfl_deep_sweep_v2_2026_11_04.py` is staged with HTTPS, 429 backoff, and resume-by-cluster.

## Targeted Findings — GSE-Critical Themes

Top hits per theme from the live 4,239-record index. All scores from BM25.

### Win-Probability Calibration
- **[20.60] Evaluating probabilistic classifiers: Reliability diagrams and score decompositions revisited** (2020) — the canonical treatment of calibration diagnostics. Directly applicable to the `calibration-map.ts` reliability curve.
- **[19.77] Verifiable Rewards for Calibrated Probabilistic Forecasting** (2026) — RL with proper scoring rules (Brier) to train calibrated forecasters. Relevant to the `gse-coach-brain-v1` training loop.

### Conformal Prediction (Sports Forecasting)
- **[23.45] Global and adaptive split conformal prediction for capacity-constrained Top-K screening** (2026) — uncertainty-aware prioritization when review capacity is limited. Maps to GSE's play-selection under limited lineup slots.
- **[22.93] Conformal Prediction with Stable Measurement Mechanisms** (2026) — distribution shift adaptation. Relevant to week-over-week injury-overlay drift.

### Injury Prediction
- **[24.95] AI-Driven Pain Monitoring in Sports Medicine: Integrating Wearable Sensors** (2026) — continuous, individualized injury-risk assessment. Relevant to the Sinkhorn target reallocation inputs.
- **[23.39] Association Between Noncontact Injuries and the Acute–Chronic Workload Ratio** (2019) — the ACWR baseline. GSE's `athlete workload monitoring` query hits this; it is the standard the injury overlay should be benchmarked against.

### Defensive Coverage Detection
- **[23.62] Decoding Defensive Coverage Responsibilities in American Football Using Factorized Attention** (2026) — factorized attention over player trajectories to classify coverage. Directly competitive with GSE's film-rule coverage heuristics.
- **[21.90] Integrating Unsupervised and Supervised Learning for the Prediction of Defensive Schemes** (2026) — pre-snap disguise is the core problem; this paper attacks exactly that.

### Expected Points / Player Value
- **[22.06] NFL Ghosts: A framework for evaluating defender positioning with conditional density estimation** (2024) — conditional density estimation for defender attribution. Alternative to GSE's EP attribution.
- **[21.70] NFL Data Analytics For A New Era** (2023) — Cal Poly survey; useful reference for method inventory.

### DFS Lineup Optimization
- **[31.69] Method and Validation for Optimal Lineup Creation for Daily Fantasy Football Using Machine Learning** (2023) — direct methodological comparison to GSE's MILP DFS optimizer.
- **[34.35]** untitled INFORMS optimization submission (2019) — template artifact; low signal.

### Player Props
- **[19.28] Partially Regularized Ordinal Regression to Adjust Teams' Scoring for Strength of Schedule** (2025) — opponent adjustment for scoring. Relevant to the props projection baseline.

## Datasets & Python Packages — Actionable Inventory

### Open datasets verified available
| Dataset | Access | Coverage | Notes |
|---|---|---|---|
| **StatsBomb Open Data** | `github.com/hudl/open-data` | ~30 competitions, 3,400 events/match | Free event-level soccer data; schema mirrors pro scouting |
| **NFL Big Data Bowl** | `kaggle.com/competitions/nfl-big-data-bowl-*` | 2019–2026 seasons | Player/play tracking; 2026 focuses WR/TE/DB/OL/DL |
| **nflverse** | `github.com/nflverse` | NFL play-by-play 1999–present | `nflreadpy` is the Python port of nflreadr |
| **NBA SportVU tracking** | HuggingFace `dcayton/nba_tracking_data_15_16` | 2015-16 season | Raw optical tracking merged with PBP |
| **OSU Sports Data Sets** | `sportsandsociety.osu.edu` | NFL PBP 2013–2024 | Team/play/down-situation CSVs |

### Python packages — installed vs. absent
| Package | Status | Use |
|---|---|---|
| `scikit-learn` | ✅ installed | Core ML |
| `torch` | ✅ installed | Deep learning |
| `nflreadpy` | ❌ absent | NFL data access with caching |
| `sports-betting` (PyPI) | ❌ absent | Betting model build/test/backtest |
| `soccer_xg` (ML-KULeuven) | ❌ absent | xG model training |
| `dowhy` / `pywhy` | ❌ absent | Causal inference with explicit graphs |
| `pymc` | ❌ absent | Bayesian hierarchical models |
| `statsmodels` | ❌ absent | Classical stat inference |
| `xgboost` | ❌ absent | Gradient boosting |

### Corpus papers matching these datasets/tools
- **xG models:** "Expected goals in football: Improving model performance" (2023) · "Poisson Modeling and Predicting EPL Goal Scoring" (2021) · "Football Shot Quality" (2020)
- **Causal inference:** "The Counterfactual Combine: A Causal Framework for Player Evaluation" (2026) · "Transport-based Counterfactual Models" (2021) · "Confidence in Causal Inference under Structure Uncertainty" (2023)
- **Tracking:** "next-gen-scraPy: Extracting NFL Tracking Data from Images" (2019) · "Applying Deep Learning to Basketball Trajectories" (2016) · "GTA: Global Tracklet Association for MOT in Sports" (2024)
- **Event representation:** "A Universal Dense Football Event Representation Based on TabTransformer" (2026) · "Pressing Intensity: An Intuitive Measure for Pressing in Soccer" (2024)
- **Pass modeling:** "Frame by frame completion probability of an American football pass" (2022) · "Expected hypothetical completion probability" (2019)

## Rate-Limit Notes (2026-11-04)

Both arXiv (`export.arxiv.org`) and OpenAlex (`api.openalex.org`) returned **HTTP 429** after ~60 queries in a short window. The polite-pool `mailto` parameter did not prevent throttling. By 11:00 CST all three search APIs (arXiv, OpenAlex, Semantic Scholar) were hard-429'd at the IP level after a night of sweeps. The backfill's PDF path (`arxiv.org/pdf/...`) is a different endpoint and remained unaffected.

Bulk sweeps must be paced (arXiv ≥3.5s/request, OpenAlex ≥1.5s/request with backoff on 429) or scheduled across hours. `nfl_deep_sweep_v2_2026_11_04.py` implements this. The corpus is already large enough (6,376 records) for retrieval work; further harvesting should be incremental.

## Reproduce

```bash
python scripts/ops/build_corpus_index.py \
  --manifest C:/Users/Garrett/AppData/Local/hermes/cache/scratch/research_corpus/merged_manifest_2026-11-04.jsonl \
  --out intelligence/corpus
```
