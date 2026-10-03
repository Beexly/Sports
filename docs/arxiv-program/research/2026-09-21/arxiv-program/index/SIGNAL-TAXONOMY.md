# Signal Taxonomy & Corpus Index Schema

**Date:** 2026-09-22. **Corpus:** 1,251 arXiv papers (1,203 ADAPT / 48 ADOPT), every one full-text read and ledgered.
**Index:** `corpus-index.jsonl` — one JSON record per paper, machine-queryable.

Garrett's law for this index: the GSE engine ingests every signal on earth and produces its OWN proprietary outputs
(GSE score, own formulas, own predictions). Market-efficiency/CLV/devigging work is BASELINE — a solid mathematical
starting point, never the product goal. The frontier is situational and contextual intelligence: things to invent, not copy.

## 1. Signal taxonomy (11 signals)

Every paper carries ≥0 signal tags (pure-theory papers legitimately carry none — never invented).

| Signal | Definition | Papers |
|---|---|---|
| `historical_results` | Past game outcomes, scores, standings, seasons of results | 350 |
| `game_state` | Score, down/distance, clock, possession, lineups | 195 |
| `player_tracking` | NGS/RFID/optical tracking, pose, trajectories | 158 |
| `market_odds_baseline` | Odds, lines, CLV, devigging, market efficiency, book mechanics (BASELINE doctrine) | 158 |
| `weather_environment` | Weather, wind, temperature, altitude | 123 |
| `news_narrative` | News, injury reports, social media, narratives, text | 83 |
| `player_physiological` | Sleep, nutrition, workload, cognitive function, biometrics, injury | 75 |
| `stadium_physics` | Surface, dimensions, roof/dome, ball/flight physics | 35 |
| `officials` | Referee/umpire/crew tendencies, penalty rates | 31 |
| `competitor_intel` | Competitors' formulas, schemes, databases, engines as baseline inputs | 26 |
| `social_relationships` | Team chemistry, locker room, relationships | 10 |

Counts are raw keyword-extraction tallies; see SIGNAL-GAPS.md for the honest (false-positive-discounted) assessment.
The thinnest signals are the next research targets.

## 2. Lane normalization map

The tracker accumulated 50+ raw lane spellings. Normalized deterministically:

| Normalized lane | Absorbs (tracker spellings) | Papers |
|---|---|---|
| `tracking` | tracking_ngs, tracking | 108 |
| `team_ratings` | team_ratings, ratings | 96 |
| `calibration` | calibration_uncertainty, calibration, calibration-postprocessing | 90 |
| `markets` | odds_market, markets | 81 |
| `win_spread_total` | win_spread_total, score-distributions | 75 |
| `props_dfs` | dfs, dfs_props, props_dfs, props_fantasy, props_player | 68 |
| `experimental` | experimental, metric-validation | 64 |
| `sizing` | kelly_sizing, sizing | 61 |
| `ensembles` | ensembles, ensembles-forecast-aggregation | 60 |
| `abstention` | abstention | 60 |
| `causal_injury` | causal_injury, causal | 58 |
| `nlp` | nlp_llm, nlp | 50 |
| `weather` | weather | 36 |
| `bayesian` | bayesian_statespace, bayesian | 35 |
| `data_infra` | data_api_infra, data_infra_feature_store | 34 |
| `symreg_equation_discovery` | (machine-intelligence wave) | 27 |
| `auto_feature_eng` | (machine-intelligence wave) | 25 |
| `mixed` | mixed | 24 |
| `world_models_simulators` | (machine-intelligence wave) | 24 |
| `signal_discovery_alpha_mining` | (machine-intelligence wave) | 14 |
| `selfsupervised_tracking` | (machine-intelligence wave) | 14 |
| `continual_online_learning` | (machine-intelligence wave) | 13 |
| `uncertainty_decision_theory` | (machine-intelligence wave) | 13 |
| `rl_sequential_decisions` | (machine-intelligence wave) | 13 |
| `llm_agents_ai_scientist` | (machine-intelligence wave) | 13 |
| `timeseries_foundation` | (machine-intelligence wave) | 13 |
| `metalearning_fewshot` | (machine-intelligence wave) | 12 |
| `multimodal_fusion` | (machine-intelligence wave) | 12 |
| `causal_discovery` | (machine-intelligence wave) | 12 |
| `synthetic_data` | (machine-intelligence wave) | 12 |
| `sports_cv` | sports_CV (action_recognition/pose) | 12 |
| `active_learning` | (machine-intelligence wave) | 10 |
| `nas_automl` | (machine-intelligence wave) | 10 |
| `live_ingame` | live_event_modeling | 1 |
| `sports_physics` | sports_physics | 1 |

Resolved by reading ledgers: all 13 `?` lanes and all 8 unlabeled entries now carry substantive lanes.
Each record also carries `suggested_lane` — the indexer's judgment call, used to catch tracker mislabels
(e.g., Kelly papers filed under `win_spread_total`, stock-sentiment papers filed under `markets`).

## 3. Doctrine tags (Garrett's law, per paper)

| Tag | Meaning | Papers |
|---|---|---|
| `PROPRIETARY_EDGE` | Becomes GSE-owned output: metric invention, proprietary models, feature discovery, GSE score components | 881 |
| `SITUATIONAL` | Contextual intelligence: weather, officials, physiology, social, stadium physics, causal/injury, in-game context | 152 |
| `INFRA` | Data pipelines, feature stores, streaming, compute, APIs, schemas | 118 |
| `BASELINE` | Market microstructure, CLV, devigging, odds movement — the mathematical starting point, never the goal | 100 |

## 4. Engine buckets (every paper lands in ≥1)

| Bucket | Meaning | Papers |
|---|---|---|
| `MODEL` | Prediction machinery — the math that predicts | 1,083 |
| `INGEST` | Data/signal pipelines — what to collect and how | 566 |
| `CALIBRATE` | Uncertainty honesty — calibration, conformal, Venn-Abers, ECE/Brier | 494 |
| `DECIDE` | Sizing, Kelly, abstention, selective prediction, pick selection | 274 |
| `MONITOR` | Live drift detection, calibration alarms, regime change | 219 |
| `INVENT` | Metric/signal invention — symbolic regression, feature discovery, alpha mining | 185 |

## 5. Record schema (`corpus-index.jsonl`)

```json
{
  "arxiv_id": "2609.06739v1",
  "title": "paper title",
  "tracker_lane": "raw lane verbatim from tracker",
  "normalized_lane": "per map above",
  "suggested_lane": "indexer judgment (may equal normalized_lane)",
  "verdict": "ADOPT | ADAPT (verified against the ledger file's Verdict line)",
  "signals": ["market_odds_baseline", "news_narrative"],
  "capability": "one line: what engine capability this paper feeds",
  "methods": "<=25 words",
  "key_equations": ["name/symbol only, max 5"],
  "numeric_gate": "the ledger's accept/reject gate (quoted/paraphrased); null if none",
  "ledger_path": "path to the full ledger",
  "doctrine_tag": "BASELINE | PROPRIETARY_EDGE | SITUATIONAL | INFRA",
  "buckets": ["INGEST","MODEL","CALIBRATE","DECIDE","INVENT","MONITOR"]
}
```

Query examples:
```bash
# all INVENT-bucket papers with their gates
jq -r 'select(.buckets | index("INVENT")) | [.arxiv_id, .numeric_gate] | @tsv' corpus-index.jsonl
# ADOPTs only
jq -r 'select(.verdict=="ADOPT") | [.arxiv_id, .normalized_lane, .capability] | @tsv' corpus-index.jsonl
# everything touching officials
jq -r 'select(.signals | index("officials")) | .arxiv_id' corpus-index.jsonl
```

## 6. Known limitations

- Signal/bucket/doctrine assignment is heuristic (keyword extraction + indexer judgment); ~5–10% of assignments
  are debatable at the margins. `arxiv_id`, `tracker_lane`, `verdict`, `ledger_path` are verbatim from the tracker;
  verdicts were cross-checked against every ledger file (0 conflicts).
- `key_equations` is name-level only; ~1/4 of papers have none (systems/survey papers) — recorded as empty, not invented.
- `numeric_gate` is quoted or tightly paraphrased from each ledger's accept/reject gate; the full gate lives in the ledger.
- `experimental` (64) and `mixed` (24) remain broad by design; `suggested_lane` subdivides many of them.
- False-positive patterns found and guarded during indexing: "penalty" (LASSO), "official" (official data),
  "temperature" (LLM sampling / temperature scaling), "weather"⊂"whether", "crew"⊂"screw", "dome"⊂"freedom",
  camera/sensor calibration vs uncertainty calibration, RL "trajectories" vs player tracking.
