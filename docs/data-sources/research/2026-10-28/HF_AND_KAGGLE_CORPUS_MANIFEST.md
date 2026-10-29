# Hugging Face (34 Datasets) & Kaggle (29 Notebooks + 64-File BDB 2027 Suite + Datasets) Master Corpus Manifest

- **Generated At:** `2026-10-29T01:01:56.641607+00:00`
- **Firewall Status:** `PASSED_ZERO_MARKET_COLS_IN_ZONE_1_AND_2` (`20` Zone 1/2 files verified, `0` market/odds columns present)
- **Pregame Perturbation Audit (`assert_future_perturbation` & `assert_holdout_perturbation`):** `PASSED` on `2010-2026_scores.csv` (`4,162` games, `3,078` pre-cutoff rows invariant when flipping `1,084` future outcomes; `272` 2024 holdout rows invariant)
- **Kaggle Physics Mind Feed:** `brain/feeds/2026-10-28/kaggle_20_kernels_bdb_physics_feed.jsonl` (`SHA-256: 6884bc57de470ffe2fb3de0dd82b39e83d94058d86d251dddd8d1d0332cfaf71`)
- **HF 34-Dataset Empirical Mind Feed:** `brain/feeds/2026-10-28/hf_34_datasets_empirical_feed.jsonl` (`SHA-256: a4a1d8b49ad6091618d71f3ca3f527943b0750502579e6bd4d7ded14934a5688`)

## 1. Ingested & Physically Split Datasets Matrix

| Source Dataset | Firewall Zone | Rows | Pure Football Cols | Stripped Market Cols | Zone 1/2 Path | Zone 3 Quarantined Path | Zone 1/3 SHA-256 |
|---|---|---:|---:|---:|---|---|---|
| `HF:ClarusC64/nfl-playcall-defense-coherence-risk-v0.1` | Zone 1 (Pure Football) | 20 | 18 | 0 | `data\coach-brain\clarusc64_8_coherence_suites_zone1.jsonl` | `NONE (0 market cols)` | `a79ab61e6f7a7b14...` |
| `HF:ClarusC64/nfl-defense-motion-adjustment-coherence-risk-v0.1` | Zone 1 (Pure Football) | 20 | 18 | 0 | `data\coach-brain\clarusc64_8_coherence_suites_zone1.jsonl` | `NONE (0 market cols)` | `7d8075f04f35ea7e...` |
| `HF:ClarusC64/nfl-pass-protection-coherence-risk-v0.1` | Zone 1 (Pure Football) | 20 | 19 | 0 | `data\coach-brain\clarusc64_8_coherence_suites_zone1.jsonl` | `NONE (0 market cols)` | `c328a8a555b31f0e...` |
| `HF:ClarusC64/nfl-route-timing-coherence-risk-v0.1` | Zone 1 (Pure Football) | 20 | 18 | 0 | `data\coach-brain\clarusc64_8_coherence_suites_zone1.jsonl` | `NONE (0 market cols)` | `6f07eb9e9b09258f...` |
| `HF:ClarusC64/nfl-drive-momentum-coherence-risk-v0.1` | Zone 1 (Pure Football) | 20 | 18 | 0 | `data\coach-brain\clarusc64_8_coherence_suites_zone1.jsonl` | `NONE (0 market cols)` | `4cef8b8efccd4571...` |
| `HF:ClarusC64/nfl-red-zone-playcall-coherence-risk-v0.1` | Zone 1 (Pure Football) | 20 | 19 | 0 | `data\coach-brain\clarusc64_8_coherence_suites_zone1.jsonl` | `NONE (0 market cols)` | `cc93209edf4e0112...` |
| `HF:ClarusC64/nfl-qb-read-coverage-coherence-risk-v0.1` | Zone 1 (Pure Football) | 20 | 17 | 0 | `data\coach-brain\clarusc64_8_coherence_suites_zone1.jsonl` | `NONE (0 market cols)` | `00170a553d2c9222...` |
| `HF:ClarusC64/nfl-player-workload-injury-coherence-risk-v0.1` | Zone 1 (Pure Football) | 20 | 19 | 0 | `data\coach-brain\clarusc64_8_coherence_suites_zone1.jsonl` | `NONE (0 market cols)` | `300bb16c4431b0c6...` |
| `HF:afzalmengal/nfl-4th-downs-dataset` | Dual-Fenced (Zone 1 + Zone 3) | 113,156 | 79 | 2 | `data\nflverse\hf_4th_downs_1999_2025_zone1.parquet` | `data\step-n-market\hf_4th_downs_market_lines_step_n.parquet` | `71a850c0d5b9380c...` |
| `HF:Karmane/nfl-weather-quarterback-passing-research-sample` | Dual-Fenced (Zone 1 + Zone 3) | 696 | 112 | 8 | `data\nflverse\hf_karmane_weather_qb_zone1.parquet` | `data\step-n-market\hf_karmane_weather_market_step_n.parquet` | `a268d689c564956b...` |
| `HF:Karmane/nfl-anytime-touchdown-parlay-usage-trends-sample` | Dual-Fenced (Zone 1 + Zone 3) | 3,932 | 117 | 9 | `data\nflverse\hf_karmane_td_usage_zone1.parquet` | `data\step-n-market\hf_karmane_td_market_step_n.parquet` | `633c3b07b82b2ef1...` |
| `HF:Karmane/nfl-rest-advantage-travel-spot-research-sample` | Dual-Fenced (Zone 1 + Zone 3) | 727 | 67 | 20 | `data\nflverse\hf_karmane_rest_travel_zone1.parquet` | `data\step-n-market\hf_karmane_rest_market_step_n.parquet` | `7be4cd569175847f...` |
| `HF:oliviersportsdata/NFL-Multi-Market-Timestamped-Odds-Team-Stats` | Dual-Fenced (Zone 1 + Zone 3) | 26,169 | 25 | 9 | `data\nflverse\hf_olivier_zone1_team_stats.parquet` | `data\step-n-market\olivier_timestamped_multi_market_odds.parquet` | `dfc337917ae71e7a...` |
| `HF:minmaxxxer/nfl-odds-2026 + nfl-closing-lines-ats-2025` | Dual-Fenced (Zone 1 + Zone 3) | 391 | 25 | 20 | `data\nflverse\hf_2025_2026_zone1_game_outcomes.parquet` | `data\step-n-market\minmaxxxer_nfl_odds_2026_step_n.parquet, data\step-n-market\minmaxxxer_nfl_closing_lines_2025_step_n.parquet` | `3b8334d56aa4ec8a...` |
| `HF:pennydata/nfl-2026-player-stats-injuries` | Zone 1 & 2 (Pure Football) | 9,602 | 166 | 0 | `data\nflverse\pennydata_2026_player_week_stats.csv, data\nflverse\pennydata_2026_injuries.csv` | `NONE` | `200cbf061984192b...` |
| `HF:clarkkitchen22/NFLWR2025CLEANED` | Zone 1 (Coach-Brain SFT) | 10,163 | 3 | 0 | `data\coach-brain\hf_nflwr2025_cleaned_zone1.jsonl` | `NONE` | `2b3f1cc4d56c5042...` |
| `HF:AdamRoch/nfl-play-normalization-v2` | Zone 1 (Coach-Brain NLP) | 25,000 | 7 | 0 | `data\coach-brain\hf_adamroch_play_normalization_zone1.jsonl` | `NONE` | `4906929906b6554d...` |
| `HF:MikeySports/nfl-stats-2021-2025` | Zone 1 (Pure Football) | 37,312 | 26 | 0 | `data\nflverse\hf_mikeysports_2025_depth_charts_zone1.parquet` | `NONE` | `4c994b9d59b5f794...` |
| `HF:ameau01/Big-Data-Bowl-2025` | Zone 1 (Pre-Snap Motion) | 16,124 | 50 | 0 | `data\nflverse\hf_bdb2025_plays_presnap_zone1.parquet` | `NONE` | `2ae6ad5b53bf2604...` |
| `HF:haoxianc/cammyc_nfl-twitter-sentiment-analysis + eengel7` | Zone 2 (Beat/Sentiment Overlay) | 5,250 | 17 | 0 | `data\nflverse\hf_sentiment_twitter_zone2.parquet` | `NONE` | `7f86d65c7d4a17ff...` |
| `HF:ypolatog/football-contracts-500` | Zone 1 (5B Contract Incentives) | 1,000 | 12 | 0 | `data\nflverse\hf_ypolatog_contracts_500_zone1.parquet` | `NONE` | `db81212606c83d80...` |
| `HF:tipsaudit/football-predictions-closing-odds-margins` | Zone 3 (Step N Quarantined Market) | 7,390 | 0 | 32 | `NONE (100% Quarantined)` | `data\step-n-market\hf_tipsaudit_closing_odds_margins_step_n.parquet` | `528087127f4ab6a8...` |
| `HF:lewisyw/footalytics-settled-predictions` | Zone 3 (Step N Quarantined Market) | 127 | 0 | 12 | `NONE (100% Quarantined)` | `data\step-n-market\hf_footalytics_settled_predictions_step_n.parquet` | `7f2c096e17aee41e...` |
| `HF:sach0312/flybrain-nfl-polymarket` | Zone 3 (Step N Quarantined Market) | 513 | 0 | 27 | `NONE (100% Quarantined)` | `data\step-n-market\hf_flybrain_nfl_polymarket_step_n.parquet` | `fa3b50574b170d92...` |
| `Kaggle:keonim/nfl-game-scores-dataset-2017-2023` | Zone 1 (Perturbation-Audited Scores + As-Of Features) | 4,162 | 16 | 0 | `data\nflverse\kaggle_keonim_2010_2026_scores_zone1.parquet` | `NONE` | `ab55bc9cc1ecf603...` |
| `Kaggle:tobycrabtree/nfl-scores-and-betting-data` | Dual-Fenced (Zone 1 Weather/Scores + Zone 3 Betting) | 14,371 | 14 | 3 | `data\nflverse\kaggle_tobycrabtree_scores_weather_zone1.parquet` | `data\step-n-market\kaggle_tobycrabtree_betting_step_n.parquet` | `d5c1da2fb2a42a1c...` |
| `Kaggle:vishakhsandwar/sumersupplement-bdb-26` | Zone 1 (SumerSports BDB 2026 Coverage Supplement) | 173,150 | 7 | 0 | `data\nflverse\kaggle_sumersupplement_bdb26_zone1.parquet` | `NONE` | `a77baf2939971f78...` |
| `Kaggle:dariushafshar/bdb-2027-public-enrichment` | Zone 1 (BDB 2027 Combine-to-NFL Rookie Enrichment) | 4,161 | 76 | 0 | `data\nflverse\kaggle_bdb2027_public_enrichment_zone1.parquet` | `NONE` | `b2c222d47e31058e...` |
| `Kaggle:georgedurrant/nfl-qb-shoulder-injuries` | Zone 1/2 (QB Injury Recovery Overlay) | 19 | 7 | 0 | `data\nflverse\kaggle_qb_shoulder_injuries_zone1.parquet` | `NONE` | `16dcc81a71c7a113...` |

## 2. Zone 1 & Zone 2 Physical Firewall Verification Receipts

| File Path | Rows | Columns | Market Cols Found | Full SHA-256 |
|---|---:|---:|---:|---|
| `data\nflverse\hf_4th_downs_1999_2025_zone1.parquet` | 113,156 | 79 | `0` | `71a850c0d5b9380caecaa2857969a87d7d7d3723e15e094e1bc4ccc3d38adf55` |
| `data\nflverse\hf_karmane_weather_qb_zone1.parquet` | 696 | 112 | `0` | `a268d689c564956b8debc0b9708a964b08ee9fb56d7b39f2f38cf068c347be60` |
| `data\nflverse\hf_karmane_td_usage_zone1.parquet` | 3,932 | 117 | `0` | `633c3b07b82b2ef1109fe861e7cc3088ef0abba6a96a98e3f07692895302ff6e` |
| `data\nflverse\hf_karmane_rest_travel_zone1.parquet` | 727 | 67 | `0` | `7be4cd569175847f4db140c6fea9ed383dc09014779dca900938c1441f831975` |
| `data\nflverse\hf_olivier_zone1_team_stats.parquet` | 26,169 | 25 | `0` | `dfc337917ae71e7abc512e8770b8857dda85b9ea392c89f8e3758ffdd44f84df` |
| `data\nflverse\hf_2025_2026_zone1_game_outcomes.parquet` | 391 | 25 | `0` | `3b8334d56aa4ec8a88f6a39c03e0656a30eb1fbadf3aba2fdb0f167e405338a4` |
| `data\nflverse\pennydata_2026_player_week_stats.csv` | 7,447 | 150 | `0` | `200cbf061984192bfd63c8d4de0c19c27651654382e8f0bdf774d2e7d5f2e931` |
| `data\nflverse\pennydata_2026_injuries.csv` | 2,155 | 16 | `0` | `e514fe2a4925934ea51f7e51680fa91056d4ee727b03967e2c4583787ae00d3b` |
| `data\nflverse\hf_mikeysports_2025_depth_charts_zone1.parquet` | 37,312 | 26 | `0` | `4c994b9d59b5f7941f9c2ea290d7d27707d9bf1cbd8c15b5806ca3f8cee53c0b` |
| `data\nflverse\hf_bdb2025_plays_presnap_zone1.parquet` | 16,124 | 50 | `0` | `2ae6ad5b53bf26043cc74b172cd7b09e32e7f61b2fc2377bca655169d9f80026` |
| `data\nflverse\hf_sentiment_twitter_zone2.parquet` | 5,171 | 17 | `0` | `7f86d65c7d4a17ff9815f1ea2cf095317f60bb2b467452306e8fac9639b5a415` |
| `data\nflverse\hf_ypolatog_contracts_500_zone1.parquet` | 1,000 | 12 | `0` | `db81212606c83d80911b7b31a142288b0b14668689209b7eb5e0984a546901fb` |
| `data\nflverse\kaggle_keonim_2010_2026_scores_zone1.parquet` | 4,162 | 16 | `0` | `ab55bc9cc1ecf603776106f8451cfeb2928f8e8b947a85c210a2a21fd5455333` |
| `data\nflverse\kaggle_tobycrabtree_scores_weather_zone1.parquet` | 14,371 | 14 | `0` | `d5c1da2fb2a42a1cadcadaa59af6a6b9b5183f1d42c26747db93c017591f001e` |
| `data\nflverse\kaggle_sumersupplement_bdb26_zone1.parquet` | 173,150 | 7 | `0` | `a77baf2939971f789f2c494f3fcaaad7530d1bed1ed45629b38ef857b48f9cbc` |
| `data\nflverse\kaggle_bdb2027_public_enrichment_zone1.parquet` | 4,161 | 76 | `0` | `b2c222d47e31058e3a0f5378d6027c1f2714a237902a9bef381c37a435415db3` |
| `data\nflverse\kaggle_qb_shoulder_injuries_zone1.parquet` | 19 | 7 | `0` | `16dcc81a71c7a1139d350a8f244f13d3b8ed88b2bee1c3ca83c7fd7ba6de4993` |
| `data\coach-brain\clarusc64_8_coherence_suites_zone1.jsonl` | 160 | 11 | `0` | `ae001d18857b500a0b3fef7dd0af932c13936656be92079f3b490b45fa5784f2` |
| `data\coach-brain\hf_nflwr2025_cleaned_zone1.jsonl` | 10,163 | 2 | `0` | `2b3f1cc4d56c504243d452ac88f19b44ad7358c6f976ba79b6b7cbe9cc79c4dd` |
| `data\coach-brain\hf_adamroch_play_normalization_zone1.jsonl` | 25,000 | 7 | `0` | `4906929906b6554d2e3671fdc0473ec11805d0afab906f96d3b48dfa0781c606` |

## 3. Pregame Future & Holdout Perturbation Audit Receipt (`sachith7` Protocol)

```json
{
  "status": "PASSED",
  "source_file": "keonim/nfl-game-scores-dataset-2017-2023::2010-2026_scores.csv",
  "source_sha256": "cce5d532c8dfb5bdee2e77fa28ea2c276073817d82a16f76317e1498f26b48b6",
  "raw_rows": 6187,
  "usable_regular_season_games": 4162,
  "ties_excluded": 13,
  "future_perturbation_cutoff": "2022-09-01",
  "past_rows_verified_invariant": 3078,
  "future_rows_flipped": 1084,
  "holdout_2024_rows_verified_invariant": 272
}
```
