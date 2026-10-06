# Signal audit

46 declarations. No signal was modified. A premise needs a probability, an outcome, and a sample count. `trustWeight` is not a sample count.

| id | shape | outcome | direction | sample count | role | status |
|---|---|---|---|---|---|---|
| prefetched_exchange | 2WAY_PROBABILITY | home and away | homeFairProb is the home side | none | probability without a sample count, not a premise | ACTIVE |
| kalshi | 2WAY_PROBABILITY | home and away | homeFairProb is the home side | none | probability without a sample count, not a premise | ACTIVE |
| espn_powerindex | 2WAY_PROBABILITY | home and away | homeFairProb is the home side | none | probability without a sample count, not a premise | ACTIVE |
| clubelo | 2WAY_PROBABILITY | home and away | homeFairProb is the home side | none | probability without a sample count, not a premise | ACTIVE |
| poisson_dixon_coles | 2WAY_PROBABILITY | home and away | homeFairProb is the home side | none | probability without a sample count, not a premise | ACTIVE |
| mlb_standings | 2WAY_PROBABILITY | home and away | homeFairProb is the home side | none | probability without a sample count, not a premise | ACTIVE |
| elo | 2WAY_PROBABILITY | home and away | homeFairProb is the home side | none | probability without a sample count, not a premise | ACTIVE |
| polymarket_gamma_internal | 2WAY_PROBABILITY | home and away | homeFairProb is the home side | none | probability without a sample count, not a premise | SHADOW_ONLY |
| nfl_epa_adj | 2WAY_PROBABILITY | home and away | homeFairProb is the home side | none | probability without a sample count, not a premise | ACTIVE |
| nfl_contract_incentives | 2WAY_PROBABILITY | none | none | none | neither | BLOCKED_MISSING_SOURCE |
| nfl_cognitive_load_fatigue | 2WAY_PROBABILITY | none | none | none | neither | BLOCKED_MISSING_SOURCE |
| nfl_beat_desk_corroboration | 2WAY_PROBABILITY | none | none | none | neither | BLOCKED_MISSING_SOURCE |
| nfl_trench_pass_block_win_rate | 2WAY_PROBABILITY | none | none | none | neither | BLOCKED_MISSING_SOURCE |
| nfl_luck_fumble_regression | 2WAY_PROBABILITY | none | none | none | neither | BLOCKED_MISSING_SOURCE |
| nfl_wind_elasticity | CONTINUOUS_VALUE | none | none | none | context-only | ACTIVE |
| nfl_coaching_tendencies | CONTINUOUS_VALUE | none | none | none | context-only | ACTIVE |
| nfl_injury_trajectory | CONTINUOUS_VALUE | none | none | none | context-only | ACTIVE |
| nfl_redzone_te_leverage | 2WAY_PROBABILITY | none | none | none | neither | ACTIVE |
| nfl_offensive_line_trench | CONTINUOUS_VALUE | none | none | none | context-only | ACTIVE |
| nfl_referee_crew_tendencies | CONTINUOUS_VALUE | none | none | none | context-only | ACTIVE |
| nfl_circadian_travel_fatigue | CONTINUOUS_VALUE | none | none | none | context-only | ACTIVE |
| nfl_contract_milestones | CONTINUOUS_VALUE | none | none | none | context-only | ACTIVE |
| nfl_wr1_out_redistribution | CONTINUOUS_VALUE | none | none | declared | context-only | ACTIVE |
| nfl_turnover_luck | CONTINUOUS_VALUE | none | none | none | context-only | ACTIVE |
| nfl_short_week_road_deficit | CONTINUOUS_VALUE | none | none | none | context-only | ACTIVE |
| nfl_age_conditioned_rest | CONTINUOUS_VALUE | none | none | none | context-only | ACTIVE |
| nfl_fourth_down_aggressiveness | CONTINUOUS_VALUE | none | none | none | context-only | ACTIVE |
| nfl_second_and_ten_tendency | CONTINUOUS_VALUE | none | none | none | context-only | ACTIVE |
| nfl_primetime_target_concentration | CONTINUOUS_VALUE | none | none | none | context-only | ACTIVE |
| nfl_early_down_proe_momentum | CONTINUOUS_VALUE | none | none | none | context-only | ACTIVE |
| nfl_two_minute_hurry_up | CONTINUOUS_VALUE | none | none | none | context-only | ACTIVE |
| nfl_bye_week_defensive_install | CONTINUOUS_VALUE | none | none | none | context-only | ACTIVE |
| nfl_qb_twp_regression | CONTINUOUS_VALUE | none | none | none | context-only | ACTIVE |
| nfl_qb_receiver_continuity | CONTINUOUS_VALUE | none | none | none | context-only | ACTIVE |
| nfl_penalty_differential_momentum | CONTINUOUS_VALUE | none | none | none | context-only | ACTIVE |
| nfl_backup_qb_target_distribution | CONTINUOUS_VALUE | none | none | none | context-only | ACTIVE |
| nfl_man_zone_receiver_archetype | CONTINUOUS_VALUE | none | none | none | context-only | ACTIVE |
| nfl_wr1_vacated_target_efficiency | CONTINUOUS_VALUE | none | none | none | context-only | ACTIVE |
| nfl_redzone_opportunity_conversion | CONTINUOUS_VALUE | none | none | none | context-only | ACTIVE |
| nfl_negative_binomial_redzone_td | CONTINUOUS_VALUE | none | none | none | context-only | ACTIVE |
| nfl_redzone_personnel_grouping | CONTINUOUS_VALUE | none | none | none | context-only | ACTIVE |
| nfl_rookie_breakout_cohort | CONTINUOUS_VALUE | none | none | none | context-only | ACTIVE |
| nfl_high_altitude_fatigue | CONTINUOUS_VALUE | none | none | none | context-only | ACTIVE |
| nfl_linear_wind_pass_impact | CONTINUOUS_VALUE | none | none | none | context-only | ACTIVE |
| nfl_temperature_precipitation_decay | CONTINUOUS_VALUE | none | none | none | context-only | ACTIVE |
| nfl_turf_surface_fatigue | CONTINUOUS_VALUE | none | none | none | context-only | ACTIVE |

## Counts

- context-only: 31
- neither: 6
- probability without a sample count, not a premise: 9

Zero premise sources. The signals that name a home probability do not name how many games that probability came from, so the trace would discard them. The continuous signals have no side.
