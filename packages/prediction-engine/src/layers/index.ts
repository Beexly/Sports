/**
 * packages/prediction-engine/src/layers/index.ts
 * ==============================================================================
 * Wave 7 (W7-02) TypeScript Bridge for the 26 Executable Reasoning Layers and
 * Context Packet Validator (`schemas/v1/context_packet.schema.json`).
 */

export type ReasoningLayerStatus = "ACTIVE" | "WAIVED_WITH_REASON" | "MISSING_UPSTREAM";

export interface ReasoningLayerManifest {
  readonly layer_id: number;
  readonly layer_slug: string;
  readonly module_path: string;
  readonly inputs: readonly string[];
  readonly outputs: readonly string[];
  readonly source_datasets: readonly string[];
  readonly freshness_rule: string;
  readonly consumer: string;
}

export interface LayerOutputV1 {
  readonly layer_id: number;
  readonly layer_slug: string;
  readonly game_id: string;
  readonly as_of_utc: string;
  readonly status: ReasoningLayerStatus;
  readonly status_reason: string;
  readonly inputs: readonly string[];
  readonly source_datasets: readonly string[];
  readonly freshness_rule: string;
  readonly consumer: string;
  readonly signals: Readonly<Record<string, unknown>>;
  readonly uncertainty_width_delta: number;
  readonly citations: readonly string[];
}

export interface ResolvedEntityV1 {
  readonly canonical_id: string;
  readonly full_name: string;
  readonly team: string;
  readonly position: string;
}

export interface ContextPacketCompletenessSummaryV1 {
  readonly total_layers: 26;
  readonly active_layers: number;
  readonly waived_layers: number;
  readonly missing_upstream_layers: number;
  readonly aggregate_uncertainty_width: number;
}

export interface ContextPacketV1 {
  readonly packet_id: string;
  readonly schema_version: "1.0.0";
  readonly game_id: string;
  readonly season: number;
  readonly week: number;
  readonly home_team: string;
  readonly away_team: string;
  readonly kickoff_utc: string;
  readonly as_of_utc: string;
  readonly entity_resolution_verified: boolean;
  readonly resolved_entities: readonly ResolvedEntityV1[];
  readonly layers: readonly LayerOutputV1[];
  readonly completeness_summary: ContextPacketCompletenessSummaryV1;
}

export const ALL_26_REASONING_LAYER_MANIFESTS: readonly ReasoningLayerManifest[] = [
  {
    layer_id: 1,
    layer_slug: "layer_01_freshness_reality",
    module_path: "intelligence/reasoning/layers/layer_01_freshness_reality.py",
    inputs: ["as_of_utc", "kickoff_utc", "feed_age_minutes", "entity_resolution_verified"],
    outputs: ["pre_kickoff_lead_minutes", "temporal_leakage_clear", "feed_freshness_score", "standing_roster_truth_verified"],
    source_datasets: ["nflverse_schedules", "gse_warehouse_manifest_v1", "stage0_roster_hygiene"],
    freshness_rule: "as_of_utc < kickoff_utc AND feed_age <= 90m pre-lock",
    consumer: "trust_signals",
  },
  {
    layer_id: 2,
    layer_slug: "layer_02_totals_baselines",
    module_path: "intelligence/reasoning/layers/layer_02_totals_baselines.py",
    inputs: ["league_mean_total", "home_off_epa_baseline", "away_off_epa_baseline", "dynamic_kickoff_return_rate"],
    outputs: ["structural_total_baseline", "structural_spread_home_margin", "dynamic_kickoff_drive_start_ydline", "scoring_environment_z"],
    source_datasets: ["nflverse_pbp_2026", "nflverse_team_epa_baselines"],
    freshness_rule: "<= 24h weekly rolling Tuesday post-MNF recalibration",
    consumer: "L3_structural_valuation",
  },
  {
    layer_id: 3,
    layer_slug: "layer_03_venue_physical_environment",
    module_path: "intelligence/reasoning/layers/layer_03_venue_physical_environment.py",
    inputs: ["is_dome", "wind_mph", "temp_f", "precip_prob", "surface_type", "altitude_ft"],
    outputs: ["weather_total_delta_pts", "deep_pass_completion_penalty", "fg_make_prob_50plus_delta", "surface_speed_multiplier"],
    source_datasets: ["open_meteo_hourly_forecast", "nfl_stadium_geometry_registry"],
    freshness_rule: "<= 3h pre-kickoff synoptic + mesoscale wind update",
    consumer: "L3_structural_valuation",
  },
  {
    layer_id: 4,
    layer_slug: "layer_04_schedule_situations",
    module_path: "intelligence/reasoning/layers/layer_04_schedule_situations.py",
    inputs: ["home_rest_days", "away_rest_days", "away_timezone_shift_hours", "is_divisional"],
    outputs: ["net_rest_days_home_minus_away", "rest_spread_adjustment_pts", "circadian_fourth_quarter_drag", "divisional_familiarity_total_dampener"],
    source_datasets: ["nflverse_schedules", "intelligence_coaching_rest_days"],
    freshness_rule: "<= 7d static schedule + flex kickoff confirmation",
    consumer: "L2_interaction_synthesis",
  },
  {
    layer_id: 5,
    layer_slug: "layer_05_health_replacement",
    module_path: "intelligence/reasoning/layers/layer_05_health_replacement.py",
    inputs: ["home_ol_starters_active", "away_ol_starters_active", "home_injury_war_lost", "away_injury_war_lost"],
    outputs: ["home_ol_continuity_score", "away_ol_continuity_score", "net_injury_war_advantage_home", "trench_cluster_degradation_flag"],
    source_datasets: ["nfl_official_injury_reports", "gsi_rtp_trauma_registry"],
    freshness_rule: "<= 90m pre-kickoff active/inactive declaration gate",
    consumer: "offensive_line",
  },
  {
    layer_id: 6,
    layer_slug: "layer_06_roster_usage",
    module_path: "intelligence/reasoning/layers/layer_06_roster_usage.py",
    inputs: ["home_wr1_target_share", "away_wr1_target_share", "home_rb1_opportunity_share", "strict_player_gp_denominator"],
    outputs: ["home_target_concentration_hhi", "away_target_concentration_hhi", "home_rb1_weighted_opportunities", "strict_player_gp_denominator_enforced"],
    source_datasets: ["nflverse_snap_counts_2026", "nflverse_player_stats_active_gp"],
    freshness_rule: "<= 24h post-practice participation & depth chart lock",
    consumer: "L1_signal_extraction",
  },
  {
    layer_id: 7,
    layer_slug: "layer_07_player_traits_form",
    module_path: "intelligence/reasoning/layers/layer_07_player_traits_form.py",
    inputs: ["home_qb_ttt_sec", "away_qb_ttt_sec", "home_qb_p2s_rate", "away_qb_p2s_rate", "home_qb_cpoe_ewma", "away_qb_cpoe_ewma"],
    outputs: ["home_qb_ttt_sec", "away_qb_ttt_sec", "net_qb_sack_avoidance_edge_home", "net_qb_cpoe_form_delta_home"],
    source_datasets: ["nflverse_nextgen_stats_passing", "gse_qb_visual_cognitive_load"],
    freshness_rule: "<= 48h rolling 4-week exponentially weighted form",
    consumer: "qb_behavior",
  },
  {
    layer_id: 8,
    layer_slug: "layer_08_player_vs_player",
    module_path: "intelligence/reasoning/layers/layer_08_player_vs_player.py",
    inputs: ["home_edge1_pass_rush_win_rate", "away_lt_pass_block_win_rate", "away_edge1_pass_rush_win_rate", "home_lt_pass_block_win_rate", "wr1_vs_cb1_separation_delta"],
    outputs: ["home_edge_vs_away_lt_mismatch", "away_edge_vs_home_lt_mismatch", "wr1_cb1_separation_yards_delta", "isolated_boundary_win_prob"],
    source_datasets: ["nflverse_nextgen_stats_receiving", "gse_trench_pocket_physics"],
    freshness_rule: "<= 48h weekly alignment & shadow cornerback projection",
    consumer: "offensive_line",
  },
  {
    layer_id: 9,
    layer_slug: "layer_09_unit_vs_unit",
    module_path: "intelligence/reasoning/layers/layer_09_unit_vs_unit.py",
    inputs: ["home_ol_ybc_per_rush", "away_dl_stuff_rate", "away_ol_ybc_per_rush", "home_dl_stuff_rate", "home_ol_pocket_time_sec", "away_ol_pocket_time_sec"],
    outputs: ["home_trench_run_push_index", "away_trench_run_push_index", "net_pocket_integrity_sec_home", "ol_unit_dominance_edge_home"],
    source_datasets: ["gse_trench_pocket_physics", "nflverse_pbp_2026_rushing"],
    freshness_rule: "<= 24h post-injury OL 5-man unit combination projection",
    consumer: "offensive_line",
  },
  {
    layer_id: 10,
    layer_slug: "layer_10_scheme",
    module_path: "intelligence/reasoning/layers/layer_10_scheme.py",
    inputs: ["home_off_scheme", "away_def_primary_shell", "home_protection_family", "rushers_weak_slide_side", "rushers_strong_man_side", "protection_adjustment_call", "primary_formation_tag"],
    outputs: ["offensive_schemes_catalog_count", "route_concepts_catalog_count", "pass_protection_slide_rule", "coverage_shell_rule", "gruden_formation_tag", "s_words_count", "t_words_count"],
    source_datasets: ["core_nfl_schemes_and_systems", "fourth_and_film_formation_taxonomy"],
    freshness_rule: "<= 24h coordinator tendency & film dossier sync",
    consumer: "coaching_scheme",
  },
  {
    layer_id: 11,
    layer_slug: "layer_11_coach_mind",
    module_path: "intelligence/reasoning/layers/layer_11_coach_mind.py",
    inputs: ["home_proe_neutral", "away_proe_neutral", "home_opening15_epa_per_play", "home_fourth_down_go_over_expected", "scripted_third_down_ydstogo"],
    outputs: ["home_proe_neutral", "away_proe_neutral", "home_opening15_epa_per_play", "fourth_down_aggressiveness_delta", "third_down_immediate_conversion_prior", "referee_sub_window_sec"],
    source_datasets: ["core_nfl_schemes_and_systems", "intelligence_coaching_proe", "intelligence_coaching_coach_risk"],
    freshness_rule: "<= 24h rolling play-caller tenure & PROE+ update",
    consumer: "coaching_scheme",
  },
  {
    layer_id: 12,
    layer_slug: "layer_12_coach_vs_coach",
    module_path: "intelligence/reasoning/layers/layer_12_coach_vs_coach.py",
    inputs: ["home_hc_2h_adjustment_epa", "away_dc_disguise_rate", "coaching_tree_familiarity", "script_elasticity_delta"],
    outputs: ["net_2h_adjustment_epa_home", "away_dc_pre_post_snap_disguise_rate", "coaching_tree_familiarity_flag", "halftime_script_elasticity_score"],
    source_datasets: ["intelligence_coaching_adjustments", "intelligence_coaching_script_elasticity"],
    freshness_rule: "<= 7d coaching staff matchup & tree familiarity index",
    consumer: "coaching_scheme",
  },
  {
    layer_id: 13,
    layer_slug: "layer_13_coach_vs_player",
    module_path: "intelligence/reasoning/layers/layer_13_coach_vs_player.py",
    inputs: ["dc_star_wr_double_rate", "dc_simulated_pressure_rate", "qb_epa_vs_sim_pressure", "rb_pass_pro_pickup_grade"],
    outputs: ["wr1_bracket_suppression_factor", "wr2_te1_funnel_target_boost", "qb_sim_pressure_vulnerability_epa", "rb_blitz_pickup_reliability"],
    source_datasets: ["intelligence_coaching_dc_pressure", "intelligence_coaching_qb_disguise_blitz_matrix"],
    freshness_rule: "<= 48h opponent game-plan bracket & pressure tendency",
    consumer: "qb_behavior",
  },
  {
    layer_id: 14,
    layer_slug: "layer_14_player_vs_scheme",
    module_path: "intelligence/reasoning/layers/layer_14_player_vs_scheme.py",
    inputs: ["away_def_primary_shell", "qb_yprr_delta_vs_shell", "rb_epa_vs_light_box", "light_box_rate_faced", "primary_route_concept"],
    outputs: ["target_coverage_shell", "qb_epa_split_vs_shell", "rb_counter_run_epa_vs_two_high", "route_concept_beater_active", "rb_release_match_rule"],
    source_datasets: ["core_nfl_schemes_and_systems", "nflverse_coverage_shell_splits"],
    freshness_rule: "<= 48h player vs coverage shell & box-count split matrix",
    consumer: "qb_behavior",
  },
  {
    layer_id: 15,
    layer_slug: "layer_15_scheme_vs_scheme",
    module_path: "intelligence/reasoning/layers/layer_15_scheme_vs_scheme.py",
    inputs: ["home_off_scheme", "away_def_primary_shell", "away_off_scheme", "home_def_primary_shell"],
    outputs: ["home_scheme_vs_away_shell_epa_boost", "away_scheme_vs_home_shell_epa_boost", "quarters_mills_post_dig_epa_unmatched", "cover1_plug_rat_banjo_rule", "net_scheme_interaction_epa_home"],
    source_datasets: ["core_nfl_schemes_and_systems"],
    freshness_rule: "<= 24h structural scheme interaction matrix",
    consumer: "scheme_matchup",
  },
  {
    layer_id: 16,
    layer_slug: "layer_16_scheme_vs_team",
    module_path: "intelligence/reasoning/layers/layer_16_scheme_vs_team.py",
    inputs: ["home_12p_rate", "away_big_nickel_match_grade", "away_def_4q_snap_fatigue_threshold", "home_no_sub_tempo_rate"],
    outputs: ["sixty_minute_execution_capacity_home", "no_sub_tempo_trap_epa_boost", "under_center_3step_timing_edge_sec", "condensed_12_snug_formation_rule"],
    source_datasets: ["core_nfl_schemes_and_systems", "nflverse_personnel_grouping_rates"],
    freshness_rule: "<= 48h 60-minute personnel & defensive sub-package endurance audit",
    consumer: "scheme_matchup",
  },
  {
    layer_id: 17,
    layer_slug: "layer_17_pace_tempo",
    module_path: "intelligence/reasoning/layers/layer_17_pace_tempo.py",
    inputs: ["home_neutral_sec_per_snap", "away_neutral_sec_per_snap", "home_trailing_hurry_up_sec", "away_trailing_hurry_up_sec"],
    outputs: ["combined_neutral_sec_per_snap", "projected_combined_plays", "pace_total_points_adjustment"],
    source_datasets: ["intelligence_coaching_tempo", "nflverse_pbp_2026"],
    freshness_rule: "<= 24h situation-neutral pace & clock runoff audit",
    consumer: "L3_structural_valuation",
  },
  {
    layer_id: 18,
    layer_slug: "layer_18_game_script_state",
    module_path: "intelligence/reasoning/layers/layer_18_game_script_state.py",
    inputs: ["home_lead_prob_q3", "home_four_minute_offense_epa", "away_two_minute_drill_epa", "blowout_tail_prob"],
    outputs: ["home_lead_prob_q3", "four_minute_kill_clock_efficiency", "two_minute_comeback_elasticity", "garbage_time_pass_volume_inflation"],
    source_datasets: ["intelligence_coaching_situational_wp", "intelligence_coaching_drive_dire_situations"],
    freshness_rule: "<= 24h game-script Markov transition tensor",
    consumer: "L3_structural_valuation",
  },
  {
    layer_id: 19,
    layer_slug: "layer_19_micro_in_game",
    module_path: "intelligence/reasoning/layers/layer_19_micro_in_game.py",
    inputs: ["home_motion_at_snap_rate", "away_motion_at_snap_rate", "home_avg_target_separation_yds", "dynamic_kickoff_avg_start_ydline"],
    outputs: ["home_motion_at_snap_epa_delta", "away_motion_at_snap_epa_delta", "home_avg_target_separation_yds", "dynamic_kickoff_avg_start_ydline", "dynamic_kickoff_concussion_reduction_pct"],
    source_datasets: ["nflverse_ftn_charting_2026", "core_nfl_schemes_and_systems"],
    freshness_rule: "<= 48h FTN charting motion-at-snap & Dynamic Kickoff field position",
    consumer: "L2_interaction_synthesis",
  },
  {
    layer_id: 20,
    layer_slug: "layer_20_outside_game_human_signals",
    module_path: "intelligence/reasoning/layers/layer_20_outside_game_human_signals.py",
    inputs: ["coach_speak_deflection_index", "beat_reporter_injury_optimism_z", "contract_incentive_active"],
    outputs: ["coach_speak_deflection_index", "beat_reporter_injury_optimism_z", "hidden_snap_count_limit_risk", "human_motivation_reliability_weight"],
    source_datasets: ["intelligence_coaching_coach_speak_probe", "gse_beat_reporter_verified_feeds"],
    freshness_rule: "<= 12h Friday/Saturday podium transcript & beat check",
    consumer: "trust_signals",
  },
  {
    layer_id: 21,
    layer_slug: "layer_21_history",
    module_path: "intelligence/reasoning/layers/layer_21_history.py",
    inputs: ["same_coaching_regime_meetings", "historical_ats_margin_regime_cleaned", "tenures_overlap_weight"],
    outputs: ["same_coaching_regime_meetings", "regime_cleaned_historical_margin_adj", "stale_history_contamination_rejected"],
    source_datasets: ["intelligence_coaching_tenures", "intelligence_reasoning_precedents"],
    freshness_rule: "Seasonal coaching tenure & roster continuity decay tau",
    consumer: "trust_signals",
  },
  {
    layer_id: 22,
    layer_slug: "layer_22_officials",
    module_path: "intelligence/reasoning/layers/layer_22_officials.py",
    inputs: ["referee_crew_id", "crew_offensive_holding_z", "crew_dpi_rate_z", "crew_home_penalty_bias_yds"],
    outputs: ["referee_crew_id", "offensive_holding_drive_kill_delta", "dpi_explosive_extension_delta", "referee_total_points_delta"],
    source_datasets: ["nfl_officiating_crew_assignments_2026"],
    freshness_rule: "<= 72h Wednesday NFL officiating crew assignment release",
    consumer: "L2_interaction_synthesis",
  },
  {
    layer_id: 23,
    layer_slug: "layer_23_market",
    module_path: "intelligence/reasoning/layers/layer_23_market.py",
    inputs: ["market_home_ml_decimal", "market_away_ml_decimal", "opening_spread_home", "current_spread_home", "market_total_points", "sgp_quoted_hold_pct"],
    outputs: ["market_enters_last_verified", "shin_devig_home_win_prob", "shin_devig_away_win_prob", "line_move_velocity_pts", "crossed_key_number_3_or_7", "sgp_copula_hold_check_passed"],
    source_datasets: ["nfl_odds_2026_closing_snapshots", "packages_prediction_engine_shin_devig"],
    freshness_rule: "<= 15m pre-decision live consensus book screen",
    consumer: "L5_synthesis",
  },
  {
    layer_id: 24,
    layer_slug: "layer_24_gsi_cross_domain_methods",
    module_path: "intelligence/reasoning/layers/layer_24_gsi_cross_domain_methods.py",
    inputs: ["raw_structural_edge_prob", "market_shin_prob", "high_ankle_rtp_players_active", "hamstring_rtp_players_active"],
    outputs: ["romano_cqr_90_half_width_pts", "kadavath_pik_confidence", "fwl_orthogonal_residual_edge", "sinkhorn_l1_marginal_residual", "gsi_cte_deceased_cohort_n", "dynamic_kickoff_concussion_reduction_pct"],
    source_datasets: ["core_nfl_schemes_and_systems", "intelligence_coaching_biomech_kinetic_translation", "workers_stealth_skeleton_provider_cqr"],
    freshness_rule: "Runtime execution-verified mathematical & GSI epidemiological invariants",
    consumer: "L3_structural_valuation",
  },
  {
    layer_id: 25,
    layer_slug: "layer_25_missingness_contradiction",
    module_path: "intelligence/reasoning/layers/layer_25_missingness_contradiction.py",
    inputs: ["waived_layers", "missing_layers", "signal_conflict_count"],
    outputs: ["waived_layer_count", "missing_upstream_layer_count", "signal_conflict_count", "epistemic_penalty_width_pts", "abstain_recommended"],
    source_datasets: ["gse_layer_completeness_monitor"],
    freshness_rule: "Real-time synchronous audit across Layers 01..24",
    consumer: "L4_adversary",
  },
  {
    layer_id: 26,
    layer_slug: "layer_26_adversary_synthesis",
    module_path: "intelligence/reasoning/layers/layer_26_adversary_synthesis.py",
    inputs: ["breaking_conditions_met", "correlated_sgp_legs_killed", "ol_to_scheme_to_qb_verified", "crossed_key_number_3_or_7"],
    outputs: ["adversary_veto_fired", "killed_correlated_legs_count", "dependency_hierarchy_order", "ol_to_scheme_to_qb_verified", "synthesis_gate_verdict"],
    source_datasets: ["intelligence_reasoning_adversary", "intelligence_reasoning_levels"],
    freshness_rule: "Mandatory L4 adversary review before L5 synthesis output",
    consumer: "L5_synthesis",
  },
] as const;

export const ALL_26_LAYER_MANIFESTS = ALL_26_REASONING_LAYER_MANIFESTS;

/**
 * Runtime validator for `ContextPacketV1` in TypeScript.
 * Enforces `as_of_utc < kickoff_utc` pre-game temporal leakage guard and 1..26 layer order.
 */
export function validateContextPacketV1(packet: ContextPacketV1): {
  readonly valid: boolean;
  readonly errors: readonly string[];
} {
  const errors: string[] = [];

  if (packet.schema_version !== "1.0.0") {
    errors.push(`Expected schema_version '1.0.0', got '${String(packet.schema_version)}'`);
  }
  const asOfMs = Date.parse(packet.as_of_utc);
  const kickoffMs = Date.parse(packet.kickoff_utc);
  if (Number.isNaN(asOfMs) || Number.isNaN(kickoffMs)) {
    errors.push("Invalid ISO-8601 timestamp in as_of_utc or kickoff_utc");
  } else if (!(asOfMs < kickoffMs)) {
    errors.push(
      `Temporal leakage guard failed: as_of_utc (${packet.as_of_utc}) must be strictly earlier than kickoff_utc (${packet.kickoff_utc})`
    );
  }

  if (!Array.isArray(packet.layers) || packet.layers.length !== 26) {
    errors.push(`Expected 26 layers, got ${packet.layers?.length ?? 0}`);
  } else {
    for (let i = 0; i < 26; i++) {
      const layer = packet.layers[i];
      if (!layer || layer.layer_id !== i + 1) {
        errors.push(`Layer at index ${i} has layer_id=${layer?.layer_id}, expected ${i + 1}`);
      }
      if (
        layer &&
        (layer.status === "WAIVED_WITH_REASON" || layer.status === "MISSING_UPSTREAM") &&
        layer.uncertainty_width_delta <= 0
      ) {
        errors.push(`Layer ${layer.layer_id} (${layer.layer_slug}) is ${layer.status} but uncertainty_width_delta <= 0`);
      }
    }
  }

  if (packet.completeness_summary?.total_layers !== 26) {
    errors.push("completeness_summary.total_layers must equal 26");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
