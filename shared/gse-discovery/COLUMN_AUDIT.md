# Column Audit Report - compound_table2_final.csv

## Audit Date: 2026-09-18
## Branch: gse-enhancements-2026-09-18 (pushed to Beexly/Sports)

## Real GSE Data Sources (VERIFIED - exist in repo)
| Column | Source | Status |
|--------|--------|--------|
| game_id, season, game_type, week, gameday, weekday, gametime | NFL schedule data | VERIFIED |
| away_team, home_team, away_score, home_score | NFL game data | VERIFIED |
| location, result, total, overtime | NFL game data | VERIFIED |
| away_rest, home_rest | NFL rest data | VERIFIED |
| away_moneyline, home_moneyline | NFL odds data | VERIFIED |
| spread_line, away_spread_odds, home_spread_odds | NFL spread data | VERIFIED |
| total_line, under_odds, over_odds | NFL totals data | VERIFIED |
| div_game, roof, surface, temp, wind | NFL venue/weather | VERIFIED |
| away_qb_id, home_qb_id, away_qb_name, home_qb_name | NFL QB data | VERIFIED |
| away_coach, home_coach | NFL coach data | VERIFIED |
| referee, stadium_id, stadium | NFL officiating/venue | VERIFIED |
| qClose | NFL closing odds | VERIFIED (mean: 0.5539, std: 0.1816) |
| home_win | NFL game result | VERIFIED (mean: 0.5440) |
| rest_diff | NFL rest differential | VERIFIED (mean: -0.0712) |
| home_hc_new, away_hc_new | NFL HC change data | VERIFIED |
| home_alt | NFL altitude | VERIFIED |
| away_road_streak, away_road2 | NFL road streak | VERIFIED |
| cold_windy | NFL weather flag | VERIFIED |
| home_qb_rev, away_qb_rev | NFL QB revision data | VERIFIED |
| home_qb_rook, away_qb_rook | NFL QB rookie data | VERIFIED |
| home_qb_backup, away_qb_backup | NFL QB backup data | VERIFIED |
| h_out, h_doubt, h_q, h_np | NFL home injury data | VERIFIED |
| a_out, a_doubt, a_q, a_np | NFL away injury data | VERIFIED |
| h_burden | NFL home burden | VERIFIED (mean: 2.1699) |
| a_burden | NFL away burden | VERIFIED (mean: 2.2898) |

## UNVERIFIED Columns - No Wired Data Source in Repo

### Phase 1 Enhancements (UNVERIFIED - no wired source)
| Column | Category | Status |
|--------|----------|--------|
| fantasy_c1_score | FantasyPros c1 score | UNVERIFIED - no API wired |
| fantasy_tier | Fantasy tier classification | UNVERIFIED - derived from fantasy_c1_score |
| fantasy_adp | Fantasy ADP | UNVERIFIED - no API wired |
| prop_first_td_odds | Prop bet odds | UNVERIFIED - no API wired |
| prop_win_margin_odds | Prop bet odds | UNVERIFIED - no API wired |
| prop_total_points_odds | Prop bet odds | UNVERIFIED - no API wired |
| mybookie_profit_boost | MyBookie profit boost | UNVERIFIED - no API wired |
| mybookie_squares_prize | MyBookie squares prize | UNVERIFIED - no API wired |
| betonline_crypto_bonus | BetOnline crypto bonus | UNVERIFIED - no API wired |
| betonline_vip_tier | BetOnline VIP tier | UNVERIFIED - no API wired |
| recovery_score | WHOOP recovery score | UNVERIFIED - WHOOP API not wired |
| strain_index | WHOOP strain index | UNVERIFIED - WHOOP API not wired |
| sleep_quality | Oura sleep quality | UNVERIFIED - Oura API not wired |
| hrv_rmssd | WHOOP HRV | UNVERIFIED - WHOOP API not wired |
| circadian_rhythm | Circadian rhythm | UNVERIFIED - no wearable API wired |
| injury_risk_score | Injury risk | UNVERIFIED - derived from recovery/strain/sleep |
| mental_toughness | Mental toughness | UNVERIFIED - no data source |
| pressure_score | Pressure score | UNVERIFIED - no data source |
| mental_toughness_pressure | MT x pressure compound | UNVERIFIED - derived |
| mt_pressure_flag | MT pressure flag | UNVERIFIED - derived |
| nutrition_score | Nutrition score | UNVERIFIED - no data source |
| hydration_status | Hydration status | UNVERIFIED - no data source |
| supplement_use | Supplement use | UNVERIFIED - no data source |
| nutrition_factor | Nutrition factor | UNVERIFIED - derived |
| sleep_duration | Sleep duration | UNVERIFIED - no wearable API wired |
| sleep_efficiency | Sleep efficiency | UNVERIFIED - no wearable API wired |
| sleep_latency | Sleep latency | UNVERIFIED - no wearable API wired |
| circadian_phase | Circadian phase | UNVERIFIED - no wearable API wired |
| sleep_quality_score | Sleep quality score | UNVERIFIED - derived |
| team_chemistry | Team chemistry | UNVERIFIED - no data source |
| leadership_score | Leadership score | UNVERIFIED - no data source |
| communication_score | Communication score | UNVERIFIED - no data source |
| team_chemistry_compound | Team chemistry compound | UNVERIFIED - derived |
| high_performing_team | High performing team flag | UNVERIFIED - derived |

### Phase 2 Enhancements (PARTIAL - some wired, some not)
| Column | Source | Status |
|--------|--------|--------|
| pff_offense_grade | PFF grades | UNVERIFIED - PFF API not wired |
| pff_defense_grade | PFF grades | UNVERIFIED - PFF API not wired |
| pff_special_teams_grade | PFF grades | UNVERIFIED - PFF API not wired |
| pff_overall_grade | Derived from PFF | UNVERIFIED - derived |
| xg_attacked | Understat xG | UNVERIFIED - Understat API not wired |
| xg_defended | Understat xG | UNVERIFIED - Understat API not wired |
| xg_diff | Derived from xG | UNVERIFIED - derived |
| exit_velocity | Baseball Savant | UNVERIFIED - Baseball Savant API not wired |
| launch_angle | Baseball Savant | UNVERIFIED - Baseball Savant API not wired |
| spin_rate | Baseball Savant | UNVERIFIED - Baseball Savant API not wired |
| sprint_speed | NBA Stats tracking | UNVERIFIED - NBA Stats API not wired |
| reaction_time | NBA Stats tracking | UNVERIFIED - NBA Stats API not wired |
| advanced_metrics_score | Derived | UNVERIFIED - derived |
| exchange_home_odds | Exchange odds | UNVERIFIED - no exchange API wired |
| exchange_away_odds | Exchange odds | UNVERIFIED - no exchange API wired |
| bookmaker_home_odds | Bookmaker odds | UNVERIFIED - no sportsbook API wired |
| bookmaker_away_odds | Bookmaker odds | UNVERIFIED - no sportsbook API wired |
| home_odds_spread | Derived | UNVERIFIED - derived |
| away_odds_spread | Derived | UNVERIFIED - derived |
| avg_odds_spread | Derived | UNVERIFIED - derived |
| market_efficiency | Derived | UNVERIFIED - derived |
| arbitrage_opportunity | Derived | UNVERIFIED - derived |
| value_bet_home | Derived | UNVERIFIED - derived |
| value_bet_away | Derived | UNVERIFIED - derived |

### Sport Modules (UNVERIFIED - no wired source)
| Column | Sport | Status |
|--------|-------|--------|
| combat_sport | UFC/Bellator/Boxing | UNVERIFIED - no API wired |
| fighter_age | UFC | UNVERIFIED - no API wired |
| fighter_height | UFC | UNVERIFIED - no API wired |
| fighter_weight | UFC | UNVERIFIED - no API wired |
| fighter_reach | UFC | UNVERIFIED - no API wired |
| fighter_stance | UFC | UNVERIFIED - no API wired |
| fighter_record_w/l/d | UFC | UNVERIFIED - no API wired |
| fighter_ko_tko | UFC | UNVERIFIED - no API wired |
| fighter_submission | UFC | UNVERIFIED - no API wired |
| fighter_decision | UFC | UNVERIFIED - no API wired |
| fighter_strikes_per_min | UFC | UNVERIFIED - no API wired |
| fighter_takedown_avg | UFC | UNVERIFIED - no API wired |
| fighter_defense_pct | UFC | UNVERIFIED - no API wired |
| fighter_sub_avg | UFC | UNVERIFIED - no API wired |
| combat_sport_odds | UFC | UNVERIFIED - no API wired |
| combat_sport_method | UFC | UNVERIFIED - no API wired |
| combat_sport_round | UFC | UNVERIFIED - no API wired |
| combat_sport_time | UFC | UNVERIFIED - no API wired |
| combat_sport_total | UFC | UNVERIFIED - no API wired |
| cricket_format | Test/ODI/T20 | UNVERIFIED - no API wired |
| batsman_avg/sr/runs/centuries/fifties | Cricket | UNVERIFIED - no API wired |
| bowler_avg/sr/wickets/eco/best | Cricket | UNVERIFIED - no API wired |
| cricket_odds | Cricket | UNVERIFIED - no API wired |
| cricket_total | Cricket | UNVERIFIED - no API wired |
| cricket_method | Cricket | UNVERIFIED - no API wired |
| golf_tour | PGA/LPGA/European/LIV | UNVERIFIED - no API wired |
| golf_rank/scoring_avg/gir_pct/putts_avg | Golf | UNVERIFIED - no API wired |
| golf_driving_dist/acc/approach/scrambling/sand_save | Golf | UNVERIFIED - no API wired |
| golf_odds/total/position | Golf | UNVERIFIED - no API wired |
| tennis_surface/tour/rank | Tennis | UNVERIFIED - no API wired |
| tennis_ace/df/1st_serve_pct/pts | Tennis | UNVERIFIED - no API wired |
| tennis_2nd_serve_pts/svpt_pct/bp_saved/bp_faced | Tennis | UNVERIFIED - no API wired |
| tennis_odds/total/set_score | Tennis | UNVERIFIED - no API wired |

## Summary
- Total columns: 133
- VERIFIED (real GSE data): 71
- UNVERIFIED (no wired source): 62
- UNVERIFIED percentage: 46.6%

## Recommendation
All 62 UNVERIFIED columns must be either:
1. Wired to a real API/data source, OR
2. Cut from the dataset

Until then, the dataset is NOT production-ready.

## Action Items
1. Wire WHOOP/Oura API for recovery metrics (6 columns)
2. Wire PFF API for player grades (4 columns)
3. Wire Understat API for xG data (3 columns)
4. Wire Baseball Savant API for statcast data (3 columns)
5. Wire FantasyPros API for fantasy data (3 columns)
6. Wire sports betting APIs for odds (11 columns)
7. Wire sport-specific APIs for Combat Sports, Cricket, Golf, Tennis (59 columns)
8. Wire wearable APIs for sleep/nutrition/team chemistry (14 columns)
