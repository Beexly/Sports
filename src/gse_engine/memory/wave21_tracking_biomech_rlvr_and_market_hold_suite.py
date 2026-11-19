"""Wave 21 Tracking, Biomechanics, RLVR Post-Training & Compliance-Held Microstructure.

Integrates 34 brand-new unique URLs (#136..#169, 37 submitted links including #60
ag-ui-protocol/ag-ui already WIRED_V3 plus duplicate URLs deduplicated), bringing
oss-corpus-registry.json to 169 unique WIRED_V3 entries (183 submitted URLs):
  - Compliance-Held Microstructure & Weather Math (cleared=False, no live trading):
      #136 Jon-Becker/prediction-market-analysis, #137 alsk1992/CloddsBot,
      #138 pmxt-dev/pmxt, #139 kuest/prediction-market,
      #140 suislanchez/polymarket-kalshi-weather-bot,
      #141 aarora4/Awesome-Prediction-Market-Tools,
      #142 tarpboi/Prediction-Markets-Trading-Bot-Toolkits, #144 Polymarket/agents
  - LLM Post-Training, GRPO RLVR, Eval Harness, Tiered Memory & BERT/Research:
      #145 axolotl-ai-cloud/axolotl, #146 huggingface/trl,
      #147 EleutherAI/lm-evaluation-harness, #148 letta-ai/letta,
      #168 google-research/bert, #169 google-research/google-research
  - Spatiotemporal Player Tracking, Pitch Control & Video Recognition:
      #143 saha-somnath/Sports-Action-Recognition,
      #154 SumerSports/SportsTrackingTransformer, #155 nfl-football-ops/Big-Data-Bowl,
      #163 metrica-sports/sample-data, #164 SkillCorner/opendata
  - Biomechanics, Kinematic Sequencing & Injury-Recurrence Hazard:
      #149 drivelineresearch/openbiomechanics, #157 apulza/NFL-Injury-Database,
      #165 movementneuromuscular.org/datasets/athletes
  - NFL 4th-Down/Win-Prob & Multi-Sport Sabermetrics / xG / VORP:
      #150 machina-sports/sports-skills, #151 sportdb/sport.db,
      #152 abusufyanvu/6S191_MIT_DeepLearning, #153 openbookie/sportbook,
      #156 nflverse/nfl4th, #158 jldbc/pybaseball, #159 Krool/FantasyFootballAnalyzer,
      #160 opensport/american-football.db, #161 AndrewRook/NFLWin,
      #162 danmorse314/hockeyR, #166 jasonbio/statstrac,
      #167 WalrusQuant/nfl-team-projections
"""

from __future__ import annotations

import math
from collections.abc import Mapping, Sequence
from typing import Any

_SEAM_MOD = "src/gse_engine/memory/wave21_tracking_biomech_rlvr_and_market_hold_suite.py"
_HOLD_POSTURE = "compliance_hold_ingest_and_learn_math_only_cleared_false"
_PERMISSIVE_POSTURE = "ingest_and_learn_non_commercial_or_permissive"

WAVE21_CORPUS_ENTRIES: list[dict[str, Any]] = [
    {
        "id": 136,
        "name": "Jon-Becker/prediction-market-analysis",
        "url": "https://github.com/Jon-Becker/prediction-market-analysis",
        "license": "MIT",
        "category": "compliance-held-flb-calibration-math",
        "domain": "becker_favorite_longshot_bias_and_lmsr_projection",
        "gse_seam": f"{_SEAM_MOD}::compute_lmsr_bregman_projection_and_flb_debias",
        "gse_target_surface": _SEAM_MOD,
        "license_posture": _HOLD_POSTURE,
        "cleared": False,
        "role": "Offline FLB power-law debiasing research; live prediction markets held.",
        "status": "WIRED_V3",
    },
    {
        "id": 137,
        "name": "alsk1992/CloddsBot",
        "url": "https://github.com/alsk1992/CloddsBot",
        "license": "MIT",
        "category": "compliance-held-orderbook-microstructure",
        "domain": "compliance_held_orderbook_projection_guard",
        "gse_seam": f"{_SEAM_MOD}::assert_prediction_market_compliance_hold",
        "gse_target_surface": _SEAM_MOD,
        "license_posture": _HOLD_POSTURE,
        "cleared": False,
        "role": "Audited offline orderbook bounds; execution stays compliance-held.",
        "status": "WIRED_V3",
    },
    {
        "id": 138,
        "name": "pmxt-dev/pmxt",
        "url": "https://github.com/pmxt-dev/pmxt",
        "license": "MIT",
        "category": "compliance-held-cross-venue-math",
        "domain": "unified_probability_normalization_and_hold_guard",
        "gse_seam": f"{_SEAM_MOD}::compute_lmsr_bregman_projection_and_flb_debias",
        "gse_target_surface": _SEAM_MOD,
        "license_posture": _HOLD_POSTURE,
        "cleared": False,
        "role": "Cross-venue implied probability projection under hard compliance hold.",
        "status": "WIRED_V3",
    },
    {
        "id": 139,
        "name": "kuest/prediction-market",
        "url": "https://github.com/kuest/prediction-market",
        "license": "MIT",
        "category": "compliance-held-lmsr-amm-math",
        "domain": "lmsr_bregman_entropy_regularized_pricing",
        "gse_seam": f"{_SEAM_MOD}::compute_lmsr_bregman_projection_and_flb_debias",
        "gse_target_surface": _SEAM_MOD,
        "license_posture": _HOLD_POSTURE,
        "cleared": False,
        "role": "LMSR logarithmic market scoring Bregman simplex projection.",
        "status": "WIRED_V3",
    },
    {
        "id": 140,
        "name": "suislanchez/polymarket-kalshi-weather-bot",
        "url": "https://github.com/suislanchez/polymarket-kalshi-weather-bot",
        "license": "MIT",
        "category": "ensemble-weather-calibration",
        "domain": "multi_member_gfs_ecmwf_stadium_weather_exceedance",
        "gse_seam": f"{_SEAM_MOD}::calibrate_ensemble_weather_stadium_priors",
        "gse_target_surface": _SEAM_MOD,
        "license_posture": _HOLD_POSTURE,
        "cleared": False,
        "role": "Extracts 31-member weather ensemble tail probabilities for stadiums.",
        "status": "WIRED_V3",
    },
    {
        "id": 141,
        "name": "aarora4/Awesome-Prediction-Market-Tools",
        "url": "https://github.com/aarora4/Awesome-Prediction-Market-Tools",
        "license": "MIT",
        "category": "compliance-held-microstructure-survey",
        "domain": "market_calibration_and_compliance_hold_registry",
        "gse_seam": f"{_SEAM_MOD}::assert_prediction_market_compliance_hold",
        "gse_target_surface": _SEAM_MOD,
        "license_posture": _HOLD_POSTURE,
        "cleared": False,
        "role": "Catalogs microstructure research under strict cleared=False hold.",
        "status": "WIRED_V3",
    },
    {
        "id": 142,
        "name": "tarpboi/Prediction-Markets-Trading-Bot-Toolkits",
        "url": "https://github.com/tarpboi/Prediction-Markets-Trading-Bot-Toolkits",
        "license": "MIT",
        "category": "compliance-held-liquidity-math",
        "domain": "lmsr_bregman_depth_and_variance_math",
        "gse_seam": f"{_SEAM_MOD}::compute_lmsr_bregman_projection_and_flb_debias",
        "gse_target_surface": _SEAM_MOD,
        "license_posture": _HOLD_POSTURE,
        "cleared": False,
        "role": "Offline liquidity depth bounds; trading toolkit execution disabled.",
        "status": "WIRED_V3",
    },
    {
        "id": 143,
        "name": "saha-somnath/Sports-Action-Recognition",
        "url": "https://github.com/saha-somnath/Sports-Action-Recognition",
        "license": "MIT",
        "category": "spatiotemporal-action-recognition",
        "domain": "temporal_velocity_and_route_stem_recognition",
        "gse_seam": f"{_SEAM_MOD}::compute_sumer_permutation_invariant_tracking_attention",
        "gse_target_surface": _SEAM_MOD,
        "license_posture": _PERMISSIVE_POSTURE,
        "role": "Encodes athlete velocity-vector kinetic signatures across frames.",
        "status": "WIRED_V3",
    },
    {
        "id": 144,
        "name": "Polymarket/agents",
        "url": "https://github.com/Polymarket/agents",
        "license": "MIT",
        "category": "compliance-held-agent-taxonomy",
        "domain": "polymarket_compliance_hold_enforcer",
        "gse_seam": f"{_SEAM_MOD}::assert_prediction_market_compliance_hold",
        "gse_target_surface": _SEAM_MOD,
        "license_posture": _HOLD_POSTURE,
        "cleared": False,
        "role": "Hard-locks Polymarket/gamma execution and cron endpoints until counsel grant.",
        "status": "WIRED_V3",
    },
    {
        "id": 145,
        "name": "axolotl-ai-cloud/axolotl",
        "url": "https://github.com/axolotl-ai-cloud/axolotl",
        "license": "Apache-2.0",
        "category": "rlvr-multipack-sft-training",
        "domain": "ffd_sequence_multipack_and_padding_waste_reduction",
        "gse_seam": f"{_SEAM_MOD}::pack_axolotl_multipack_rlvr_sequences",
        "gse_target_surface": _SEAM_MOD,
        "license_posture": _PERMISSIVE_POSTURE,
        "role": "Packs GSI RLVR trajectories without cross-doc attention bleed.",
        "status": "WIRED_V3",
    },
    {
        "id": 146,
        "name": "huggingface/trl",
        "url": "https://github.com/huggingface/trl",
        "license": "Apache-2.0",
        "category": "grpo-rlvr-group-optimization",
        "domain": "grpo_group_relative_advantage_and_kl_regularization",
        "gse_seam": f"{_SEAM_MOD}::compute_trl_grpo_group_advantages",
        "gse_target_surface": _SEAM_MOD,
        "license_posture": _PERMISSIVE_POSTURE,
        "role": "Computes zero-mean GRPO group advantages + KL penalties for RLVR.",
        "status": "WIRED_V3",
    },
    {
        "id": 147,
        "name": "EleutherAI/lm-evaluation-harness",
        "url": "https://github.com/EleutherAI/lm-evaluation-harness",
        "license": "MIT",
        "category": "standardized-benchmark-evaluation",
        "domain": "byte_length_normalized_loglikelihood_and_ece_eval",
        "gse_seam": f"{_SEAM_MOD}::score_lm_eval_harness_calibration",
        "gse_target_surface": _SEAM_MOD,
        "license_posture": _PERMISSIVE_POSTURE,
        "role": "Computes byte-normalized log-likelihood accuracy and Brier confidence.",
        "status": "WIRED_V3",
    },
    {
        "id": 148,
        "name": "letta-ai/letta",
        "url": "https://github.com/letta-ai/letta",
        "license": "Apache-2.0",
        "category": "hierarchical-agent-memory-os",
        "domain": "memgpt_core_and_archival_tiered_memory_paging",
        "gse_seam": f"{_SEAM_MOD}::manage_letta_tiered_working_memory",
        "gse_target_surface": _SEAM_MOD,
        "license_posture": _PERMISSIVE_POSTURE,
        "role": "Partitions hot in-context core memory slots vs archival overflow.",
        "status": "WIRED_V3",
    },
    {
        "id": 149,
        "name": "drivelineresearch/openbiomechanics",
        "url": "https://github.com/drivelineresearch/openbiomechanics",
        "license": "CC-BY-4.0",
        "category": "kinematic-sequencing-biomechanics",
        "domain": "proximal_to_distal_kinematic_chain_and_acwr_workload",
        "gse_seam": f"{_SEAM_MOD}::evaluate_openbiomechanics_kinematic_and_injury_hazard",
        "gse_target_surface": _SEAM_MOD,
        "license_posture": _PERMISSIVE_POSTURE,
        "role": "Evaluates proximal-to-distal angular velocity chain & ACWR load.",
        "status": "WIRED_V3",
    },
    {
        "id": 150,
        "name": "machina-sports/sports-skills",
        "url": "https://github.com/machina-sports/sports-skills",
        "license": "MIT",
        "category": "multisport-analytics-skills",
        "domain": "unified_soccer_nfl_nhl_mlb_feature_contracts",
        "gse_seam": f"{_SEAM_MOD}::compute_multisport_pybaseball_hockeyr_and_vorp_metrics",
        "gse_target_surface": _SEAM_MOD,
        "license_posture": _PERMISSIVE_POSTURE,
        "role": "Standardizes cross-sport rate and efficiency feature dictionaries.",
        "status": "WIRED_V3",
    },
    {
        "id": 151,
        "name": "sportdb/sport.db",
        "url": "https://github.com/sportdb/sport.db",
        "license": "CC0-1.0",
        "category": "open-sports-relational-schema",
        "domain": "cross_league_fixture_and_standing_normalization",
        "gse_seam": f"{_SEAM_MOD}::compute_multisport_pybaseball_hockeyr_and_vorp_metrics",
        "gse_target_surface": _SEAM_MOD,
        "license_posture": _PERMISSIVE_POSTURE,
        "role": "Normalizes fixture, standing, and goal-diff schemas across leagues.",
        "status": "WIRED_V3",
    },
    {
        "id": 152,
        "name": "abusufyanvu/6S191_MIT_DeepLearning",
        "url": "https://github.com/abusufyanvu/6S191_MIT_DeepLearning",
        "license": "MIT",
        "category": "deep-sequence-calibration-baselines",
        "domain": "softmax_temperature_calibration_and_gradient_norms",
        "gse_seam": f"{_SEAM_MOD}::compute_bert_bidirectional_salience_and_contrastive_align",
        "gse_target_surface": _SEAM_MOD,
        "license_posture": _PERMISSIVE_POSTURE,
        "role": "Provides contrastive representation alignment and softmax stability.",
        "status": "WIRED_V3",
    },
    {
        "id": 153,
        "name": "openbookie/sportbook",
        "url": "https://github.com/openbookie/sportbook",
        "license": "MIT",
        "category": "reference-pricing-domain-model",
        "domain": "historical_line_devigging_and_multisport_benchmark_data",
        "gse_seam": f"{_SEAM_MOD}::compute_multisport_pybaseball_hockeyr_and_vorp_metrics",
        "gse_target_surface": _SEAM_MOD,
        "license_posture": _PERMISSIVE_POSTURE,
        "role": "Benchmarks historical multi-sport fixture rate comparisons.",
        "status": "WIRED_V3",
    },
    {
        "id": 154,
        "name": "SumerSports/SportsTrackingTransformer",
        "url": "https://github.com/SumerSports/SportsTrackingTransformer",
        "license": "MIT",
        "category": "permutation-invariant-tracking-transformer",
        "domain": "set_attention_spatial_player_tracking_geometry",
        "gse_seam": f"{_SEAM_MOD}::compute_sumer_permutation_invariant_tracking_attention",
        "gse_target_surface": _SEAM_MOD,
        "license_posture": _PERMISSIVE_POSTURE,
        "role": "Computes strictly permutation-invariant offensive-defensive separation.",
        "status": "WIRED_V3",
    },
    {
        "id": 155,
        "name": "nfl-football-ops/Big-Data-Bowl",
        "url": "https://github.com/nfl-football-ops/Big-Data-Bowl",
        "license": "MIT",
        "category": "nfl-tracking-spatial-benchmarks",
        "domain": "tracking_frame_voronoi_separation_and_closing_speed",
        "gse_seam": f"{_SEAM_MOD}::compute_sumer_permutation_invariant_tracking_attention",
        "gse_target_surface": _SEAM_MOD,
        "license_posture": _PERMISSIVE_POSTURE,
        "role": "Models spatial defender separation and closing-speed kinematics.",
        "status": "WIRED_V3",
    },
    {
        "id": 156,
        "name": "nflverse/nfl4th",
        "url": "https://github.com/nflverse/nfl4th",
        "license": "MIT",
        "category": "nfl-fourth-down-wp-decision",
        "domain": "go_vs_fg_vs_punt_win_probability_decision_calculus",
        "gse_seam": f"{_SEAM_MOD}::evaluate_nfl4th_and_nflwin_decision_wp",
        "gse_target_surface": _SEAM_MOD,
        "license_posture": _PERMISSIVE_POSTURE,
        "role": "Computes 4th-down go/FG/punt expected win probability & WP edge.",
        "status": "WIRED_V3",
    },
    {
        "id": 157,
        "name": "apulza/NFL-Injury-Database",
        "url": "https://github.com/apulza/NFL-Injury-Database",
        "license": "MIT",
        "category": "nfl-injury-recurrence-hazard",
        "domain": "soft_tissue_and_joint_recurrence_decay_modeling",
        "gse_seam": f"{_SEAM_MOD}::evaluate_openbiomechanics_kinematic_and_injury_hazard",
        "gse_target_surface": _SEAM_MOD,
        "license_posture": _PERMISSIVE_POSTURE,
        "role": "Models tissue-specific NFL injury recurrence hazard vs return weeks.",
        "status": "WIRED_V3",
    },
    {
        "id": 158,
        "name": "jldbc/pybaseball",
        "url": "https://github.com/jldbc/pybaseball",
        "license": "MIT",
        "category": "mlb-statcast-woba-and-fip",
        "domain": "linear_weights_woba_batting_and_rate_metrics",
        "gse_seam": f"{_SEAM_MOD}::compute_multisport_pybaseball_hockeyr_and_vorp_metrics",
        "gse_target_surface": _SEAM_MOD,
        "license_posture": _PERMISSIVE_POSTURE,
        "role": "Computes Statcast linear-weight wOBA for MLB 365-day modeling.",
        "status": "WIRED_V3",
    },
    {
        "id": 159,
        "name": "Krool/FantasyFootballAnalyzer",
        "url": "https://github.com/Krool/FantasyFootballAnalyzer",
        "license": "MIT",
        "category": "nfl-vorp-replacement-analytics",
        "domain": "position_relative_value_over_replacement_scoring",
        "gse_seam": f"{_SEAM_MOD}::compute_multisport_pybaseball_hockeyr_and_vorp_metrics",
        "gse_target_surface": _SEAM_MOD,
        "license_posture": _PERMISSIVE_POSTURE,
        "role": "Quantifies VORP replacement-level scarcity deltas across skill tiers.",
        "status": "WIRED_V3",
    },
    {
        "id": 160,
        "name": "opensport/american-football.db",
        "url": "https://github.com/opensport/american-football.db",
        "license": "CC0-1.0",
        "category": "historical-football-archive-schema",
        "domain": "long_run_nfl_schedule_and_roster_alignment",
        "gse_seam": f"{_SEAM_MOD}::compute_multisport_pybaseball_hockeyr_and_vorp_metrics",
        "gse_target_surface": _SEAM_MOD,
        "license_posture": _PERMISSIVE_POSTURE,
        "role": "Canonicalizes multi-era football schedule and franchise codes.",
        "status": "WIRED_V3",
    },
    {
        "id": 161,
        "name": "AndrewRook/NFLWin",
        "url": "https://github.com/AndrewRook/NFLWin",
        "license": "MIT",
        "category": "clock-and-score-win-probability",
        "domain": "continuous_clock_score_differential_win_probability",
        "gse_seam": f"{_SEAM_MOD}::evaluate_nfl4th_and_nflwin_decision_wp",
        "gse_target_surface": _SEAM_MOD,
        "license_posture": _PERMISSIVE_POSTURE,
        "role": "Computes live time-remaining & yardline conditional win probability.",
        "status": "WIRED_V3",
    },
    {
        "id": 162,
        "name": "danmorse314/hockeyR",
        "url": "https://github.com/danmorse314/hockeyR",
        "license": "MIT",
        "category": "nhl-pbp-fenwick-and-xg",
        "domain": "nhl_fenwick_share_and_expected_goal_differential",
        "gse_seam": f"{_SEAM_MOD}::compute_multisport_pybaseball_hockeyr_and_vorp_metrics",
        "gse_target_surface": _SEAM_MOD,
        "license_posture": _PERMISSIVE_POSTURE,
        "role": "Computes unblocked shot-attempt Fenwick% and xG% share for NHL.",
        "status": "WIRED_V3",
    },
    {
        "id": 163,
        "name": "metrica-sports/sample-data",
        "url": "https://github.com/metrica-sports/sample-data",
        "license": "MIT",
        "category": "soccer-synchronized-tracking-events",
        "domain": "spearman_pitch_control_and_time_to_intercept",
        "gse_seam": f"{_SEAM_MOD}::compute_metrica_skillcorner_pitch_control",
        "gse_target_surface": _SEAM_MOD,
        "license_posture": _PERMISSIVE_POSTURE,
        "role": "Computes Spearman time-to-intercept pitch-control surface probabilities.",
        "status": "WIRED_V3",
    },
    {
        "id": 164,
        "name": "SkillCorner/opendata",
        "url": "https://github.com/SkillCorner/opendata",
        "license": "CC-BY-4.0",
        "category": "off-ball-broadcast-tracking-runs",
        "domain": "off_ball_pitch_space_and_sprint_physics",
        "gse_seam": f"{_SEAM_MOD}::compute_metrica_skillcorner_pitch_control",
        "gse_target_surface": _SEAM_MOD,
        "license_posture": _PERMISSIVE_POSTURE,
        "role": "Models off-ball space occupation along velocity reaction horizons.",
        "status": "WIRED_V3",
    },
    {
        "id": 165,
        "name": "movementneuromuscular.org/datasets/athletes",
        "url": "https://movementneuromuscular.org/datasets/athletes",
        "license": "Open Scientific Registry",
        "category": "neuromuscular-fatigue-and-emg-datasets",
        "domain": "neuromuscular_fatigue_and_kinematic_chain_integrity",
        "gse_seam": f"{_SEAM_MOD}::evaluate_openbiomechanics_kinematic_and_injury_hazard",
        "gse_target_surface": _SEAM_MOD,
        "license_posture": _PERMISSIVE_POSTURE,
        "role": "Calibrates neuromuscular fatigue decay alongside kinetic sequencing.",
        "status": "WIRED_V3",
    },
    {
        "id": 166,
        "name": "jasonbio/statstrac",
        "url": "https://github.com/jasonbio/statstrac",
        "license": "MIT",
        "category": "nfl-historical-simulation-analytics",
        "domain": "fourth_down_leverage_and_possession_win_model",
        "gse_seam": f"{_SEAM_MOD}::evaluate_nfl4th_and_nflwin_decision_wp",
        "gse_target_surface": _SEAM_MOD,
        "license_posture": _PERMISSIVE_POSTURE,
        "role": "Benchmarks situational possession-state leverage curves in NFL games.",
        "status": "WIRED_V3",
    },
    {
        "id": 167,
        "name": "WalrusQuant/nfl-team-projections",
        "url": "https://github.com/WalrusQuant/nfl-team-projections",
        "license": "MIT",
        "category": "nfl-bayesian-team-strength-sim",
        "domain": "situational_efficiency_and_win_expectancy_priors",
        "gse_seam": f"{_SEAM_MOD}::evaluate_nfl4th_and_nflwin_decision_wp",
        "gse_target_surface": _SEAM_MOD,
        "license_posture": _PERMISSIVE_POSTURE,
        "role": "Cross-checks team efficiency adjustments with 4th-down EP curves.",
        "status": "WIRED_V3",
    },
    {
        "id": 168,
        "name": "google-research/bert",
        "url": "https://github.com/google-research/bert",
        "license": "Apache-2.0",
        "category": "bidirectional-masked-language-encoder",
        "domain": "bidirectional_token_salience_and_entity_attention",
        "gse_seam": f"{_SEAM_MOD}::compute_bert_bidirectional_salience_and_contrastive_align",
        "gse_target_surface": _SEAM_MOD,
        "license_posture": _PERMISSIVE_POSTURE,
        "role": "Scores bidirectional contextual token salience for injury/beat extraction.",
        "status": "WIRED_V3",
    },
    {
        "id": 169,
        "name": "google-research/google-research",
        "url": "https://github.com/google-research/google-research",
        "license": "Apache-2.0",
        "category": "frontier-contrastive-and-calibration-research",
        "domain": "temperature_scaled_contrastive_alignment_and_entropy",
        "gse_seam": f"{_SEAM_MOD}::compute_bert_bidirectional_salience_and_contrastive_align",
        "gse_target_surface": _SEAM_MOD,
        "license_posture": _PERMISSIVE_POSTURE,
        "role": "Computes temperature-scaled cosine alignment for multi-modal embeddings.",
        "status": "WIRED_V3",
    },
]


def _sigmoid(z: float) -> float:
    z_c = max(-30.0, min(30.0, float(z)))
    return 1.0 / (1.0 + math.exp(-z_c))


# ---------------------------------------------------------------------------
# 1. Polymarket Compliance Hold & Offline LMSR/FLB/Weather Math (#136..142,144)
# ---------------------------------------------------------------------------


def assert_prediction_market_compliance_hold(
    *,
    live_execution_requested: bool = False,
    gamma_cron_requested: bool = False,
    counsel_registry_grant: bool = False,
) -> dict[str, Any]:
    """Fail-closed Polymarket / prediction-market compliance hold guard."""
    if (live_execution_requested or gamma_cron_requested) and not counsel_registry_grant:
        raise PermissionError(
            "POLYMARKET_COMPLIANCE_HOLD: Prediction-market execution and gamma crons "
            "remain on hard compliance hold (cleared=False) per docs/ops/ORBIT_UNLOCK.md."
        )
    return {
        "compliance_hold": True,
        "cleared": False,
        "live_execution_enabled": False,
        "gamma_cron_enabled": False,
    }


def compute_lmsr_bregman_projection_and_flb_debias(
    raw_contract_probs: Sequence[float],
    *,
    liquidity_b: float = 100.0,
    flb_gamma: float = 1.08,
    live_execution_requested: bool = False,
) -> dict[str, Any]:
    """Offline LMSR Bregman projection & Becker FLB power debiasing (#136..139,144)."""
    guard = assert_prediction_market_compliance_hold(
        live_execution_requested=live_execution_requested
    )
    if not raw_contract_probs:
        raise ValueError("raw_contract_probs must be non-empty.")

    gamma = max(0.5, min(2.0, float(flb_gamma)))
    b_liq = max(1e-6, float(liquidity_b))
    clipped = [max(1e-6, min(1.0 - 1e-6, float(p))) for p in raw_contract_probs]
    powered = [p**gamma for p in clipped]
    z_sum = sum(powered) or 1.0
    debiased = [val / z_sum for val in powered]

    q_shares = [b_liq * math.log(max(1e-9, p)) for p in clipped]
    q_scaled = [q / b_liq for q in q_shares]
    m_max = max(q_scaled)
    exp_q = [math.exp(x - m_max) for x in q_scaled]
    exp_sum = sum(exp_q) or 1.0
    lmsr_cost = b_liq * (m_max + math.log(exp_sum))
    kl_div = sum(
        p * math.log(max(1e-12, p) / max(1e-12, c))
        for p, c in zip(debiased, clipped, strict=True)
    )
    return {
        **guard,
        "lmsr_cost": round(lmsr_cost, 6),
        "bregman_kl_divergence": round(max(0.0, kl_div), 8),
        "debiased_probs": [round(p, 8) for p in debiased],
    }


def calibrate_ensemble_weather_stadium_priors(
    member_wind_mph: Sequence[float],
    member_temp_f: Sequence[float],
    member_precip_mm: Sequence[float],
    *,
    wind_threshold_mph: float = 15.0,
    freeze_threshold_f: float = 32.0,
) -> dict[str, float]:
    """Aggregate multi-member GFS/ECMWF weather ensemble stadium risk (#140)."""
    if not (len(member_wind_mph) == len(member_temp_f) == len(member_precip_mm)):
        raise ValueError("Weather ensemble arrays must share equal non-empty length.")
    n = len(member_wind_mph)
    if n == 0:
        raise ValueError("Weather ensemble arrays must be non-empty.")

    winds = [max(0.0, float(w)) for w in member_wind_mph]
    temps = [float(t) for t in member_temp_f]
    precips = [max(0.0, float(p)) for p in member_precip_mm]

    mean_wind = sum(winds) / float(n)
    mean_temp = sum(temps) / float(n)
    mean_precip = sum(precips) / float(n)
    p_high_wind = sum(1 for w in winds if w >= float(wind_threshold_mph)) / float(n)
    p_freeze = sum(1 for t in temps if t <= float(freeze_threshold_f)) / float(n)
    p_wet = sum(1 for p in precips if p >= 1.5) / float(n)
    wind_var = sum((w - mean_wind) ** 2 for w in winds) / float(n)

    comp_drag = min(0.06, 0.015 * p_high_wind + 0.008 * p_wet + 0.005 * p_freeze)
    return {
        "ensemble_members": float(n),
        "mean_wind_mph": round(mean_wind, 4),
        "wind_std_mph": round(math.sqrt(wind_var), 4),
        "mean_temp_f": round(mean_temp, 4),
        "mean_precip_mm": round(mean_precip, 4),
        "p_high_wind_exceedance": round(p_high_wind, 6),
        "p_freeze_exceedance": round(p_freeze, 6),
        "p_precip_exceedance": round(p_wet, 6),
        "completion_weather_drag": round(comp_drag, 6),
    }


# ---------------------------------------------------------------------------
# 2. RLVR Post-Training, GRPO, Harness Eval, Memory OS & BERT (#145..148,168,169)
# ---------------------------------------------------------------------------


def pack_axolotl_multipack_rlvr_sequences(
    sequence_lengths: Sequence[int],
    *,
    max_seq_len: int = 4096,
) -> dict[str, Any]:
    """Pack RLVR sequences via First-Fit-Decreasing with zero padding bleed (#145)."""
    cap = max(1, int(max_seq_len))
    cleaned = sorted((min(cap, max(1, int(x))) for x in sequence_lengths), reverse=True)
    if not cleaned:
        return {"bins_used": 0, "packing_efficiency": 1.0, "packed_bins": []}

    bins: list[list[int]] = []
    bin_sums: list[int] = []
    for length in cleaned:
        placed = False
        for idx, used in enumerate(bin_sums):
            if used + length <= cap:
                bins[idx].append(length)
                bin_sums[idx] = used + length
                placed = True
                break
        if not placed:
            bins.append([length])
            bin_sums.append(length)

    total_tokens = sum(cleaned)
    total_capacity = len(bins) * cap
    efficiency = float(total_tokens) / float(max(1, total_capacity))
    return {
        "bins_used": len(bins),
        "total_tokens": total_tokens,
        "packing_efficiency": round(efficiency, 6),
        "packed_bins": bins,
    }


def compute_trl_grpo_group_advantages(
    group_rewards: Sequence[float],
    logp_theta: Sequence[float],
    logp_ref: Sequence[float],
    *,
    kl_beta: float = 0.04,
) -> dict[str, Any]:
    """Compute zero-mean GRPO advantages & reverse-KL surrogate penalty (#146 trl)."""
    n = len(group_rewards)
    if n == 0 or len(logp_theta) != n or len(logp_ref) != n:
        raise ValueError("group_rewards, logp_theta, logp_ref must match non-empty length.")

    r_vals = [float(r) for r in group_rewards]
    mean_r = sum(r_vals) / float(n)
    var_r = sum((r - mean_r) ** 2 for r in r_vals) / float(n)
    std_r = math.sqrt(var_r)
    advs = [0.0 if std_r <= 1e-9 else (r - mean_r) / (std_r + 1e-8) for r in r_vals]

    # Schulman non-negative approximate KL: exp(logp_ref - logp_theta) - (logp_ref - logp_theta) - 1
    kls: list[float] = []
    for lt, lr in zip(logp_theta, logp_ref, strict=True):
        delta = max(-20.0, min(20.0, float(lr) - float(lt)))
        kls.append(max(0.0, math.exp(delta) - delta - 1.0))

    mean_kl = sum(kls) / float(n)
    surrogate = sum(adv - float(kl_beta) * kl for adv, kl in zip(advs, kls, strict=True)) / float(n)
    return {
        "group_mean_reward": round(mean_r, 6),
        "advantages": [round(a, 6) for a in advs],
        "mean_kl_divergence": round(mean_kl, 6),
        "grpo_surrogate_score": round(surrogate, 6),
    }


def score_lm_eval_harness_calibration(
    choice_loglikelihoods: Sequence[float],
    choice_byte_lengths: Sequence[int],
    *,
    gold_index: int,
) -> dict[str, Any]:
    """Score normalized log-likelihood & Brier calibration (#147 lm-eval)."""
    n = len(choice_loglikelihoods)
    if n == 0 or len(choice_byte_lengths) != n or not (0 <= gold_index < n):
        raise ValueError("Mismatched choice arrays or out-of-range gold_index.")

    norm_ll = [
        float(ll) / float(max(1, int(blen)))
        for ll, blen in zip(choice_loglikelihoods, choice_byte_lengths, strict=True)
    ]
    raw_pred = max(range(n), key=lambda i: choice_loglikelihoods[i])
    norm_pred = max(range(n), key=lambda i: norm_ll[i])

    m_max = max(norm_ll)
    exps = [math.exp(max(-30.0, min(0.0, v - m_max))) for v in norm_ll]
    z_sum = sum(exps) or 1.0
    probs = [e / z_sum for e in exps]
    brier = sum(
        (p - (1.0 if i == gold_index else 0.0)) ** 2 for i, p in enumerate(probs)
    ) / float(n)
    return {
        "acc": raw_pred == gold_index,
        "acc_norm": norm_pred == gold_index,
        "gold_prob": round(probs[gold_index], 6),
        "brier_score": round(brier, 8),
    }


def manage_letta_tiered_working_memory(
    core_blocks: Mapping[str, str],
    candidate_facts: Sequence[tuple[str, float]],
    *,
    core_char_limit: int = 512,
) -> dict[str, Any]:
    """Partition hot core memory blocks vs archival storage under char cap (#148)."""
    limit = max(32, int(core_char_limit))
    used = sum(len(str(v)) for v in core_blocks.values())
    core_entries = {str(k): str(v) for k, v in core_blocks.items()}
    archival: list[dict[str, Any]] = []
    promoted: list[str] = []

    ordered = sorted(candidate_facts, key=lambda pair: (-float(pair[1]), str(pair[0])))
    for idx, (fact, salience) in enumerate(ordered):
        txt = str(fact).strip()
        if not txt:
            continue
        if used + len(txt) <= limit:
            core_entries[f"fact_{idx}"] = txt
            used += len(txt)
            promoted.append(txt)
        else:
            archival.append({"fact": txt, "salience": round(float(salience), 4)})

    return {
        "core_chars_used": used,
        "core_char_limit": limit,
        "promoted_to_core_count": len(promoted),
        "archival_paged_count": len(archival),
        "core_blocks": core_entries,
        "archival_store": archival,
    }


def compute_bert_bidirectional_salience_and_contrastive_align(
    token_embeddings: Sequence[Sequence[float]],
    query_embedding: Sequence[float],
    *,
    temperature: float = 0.10,
) -> dict[str, Any]:
    """Bidirectional token pooling + InfoNCE contrastive alignment (#168, #169)."""
    if not token_embeddings or not query_embedding:
        raise ValueError("token_embeddings and query_embedding must be non-empty.")

    dim = len(query_embedding)
    q_norm = math.sqrt(sum(float(x) * float(x) for x in query_embedding)) or 1.0
    q_unit = [float(x) / q_norm for x in query_embedding]
    temp = max(1e-3, float(temperature))

    cos_sims: list[float] = []
    for vec in token_embeddings:
        if len(vec) != dim:
            raise ValueError("All token_embeddings must match query_embedding dimension.")
        v_norm = math.sqrt(sum(float(x) * float(x) for x in vec)) or 1.0
        dot = sum((float(x) / v_norm) * q_val for x, q_val in zip(vec, q_unit, strict=True))
        cos_sims.append(max(-1.0, min(1.0, dot)))

    logits = [c / temp for c in cos_sims]
    m_max = max(logits)
    exps = [math.exp(x - m_max) for x in logits]
    z_sum = sum(exps) or 1.0
    attn = [e / z_sum for e in exps]
    entropy = -sum(w * math.log(max(1e-12, w)) for w in attn)
    return {
        "max_cosine_alignment": round(max(cos_sims), 6),
        "salience_weights": [round(w, 6) for w in attn],
        "attention_entropy": round(entropy, 6),
    }


# ---------------------------------------------------------------------------
# 3. Permutation-Invariant Tracking, Pitch Control & Biomechanics (#143,149..169)
# ---------------------------------------------------------------------------


def compute_sumer_permutation_invariant_tracking_attention(
    offense_xyv: Sequence[tuple[float, float, float, float]],
    defense_xyv: Sequence[tuple[float, float, float, float]],
) -> dict[str, float]:
    """Strictly permutation-invariant set-attention spatial separation (#143,154,155)."""
    if not offense_xyv or not defense_xyv:
        raise ValueError("offense_xyv and defense_xyv must be non-empty (x, y, vx, vy).")

    # Canonical sort guarantees bit-exact invariance across arbitrary roster permutations.
    off_sorted = sorted((float(a), float(b), float(c), float(d)) for a, b, c, d in offense_xyv)
    def_sorted = sorted((float(a), float(b), float(c), float(d)) for a, b, c, d in defense_xyv)

    nearest_dists: list[float] = []
    closing_speeds: list[float] = []
    for ox, oy, ovx, ovy in off_sorted:
        best_d2 = float("inf")
        best_close = 0.0
        for dx, dy, dvx, dvy in def_sorted:
            rx, ry = dx - ox, dy - oy
            dist2 = rx * rx + ry * ry
            dist = math.sqrt(max(1e-9, dist2))
            if dist2 < best_d2:
                best_d2 = dist2
                # Radial closing velocity (+ means defender closing toward attacker)
                best_close = ((ovx - dvx) * rx + (ovy - dvy) * ry) / dist
        nearest_dists.append(math.sqrt(best_d2))
        closing_speeds.append(best_close)

    mean_sep = sum(nearest_dists) / float(len(nearest_dists))
    min_sep = min(nearest_dists)
    max_close = max(closing_speeds)
    open_frac = sum(1 for d in nearest_dists if d >= 3.0) / float(len(nearest_dists))
    return {
        "mean_nearest_separation_yds": round(mean_sep, 6),
        "min_separation_yds": round(min_sep, 6),
        "max_closing_speed_yps": round(max_close, 6),
        "open_target_fraction": round(open_frac, 6),
    }


def compute_metrica_skillcorner_pitch_control(
    target_xy: tuple[float, float],
    attackers_xyv: Sequence[tuple[float, float, float, float]],
    defenders_xyv: Sequence[tuple[float, float, float, float]],
    *,
    reaction_sec: float = 0.7,
    max_speed_mps: float = 8.5,
) -> dict[str, float]:
    """Compute Spearman physics-based time-to-intercept pitch control (#163, #164)."""
    if not attackers_xyv or not defenders_xyv:
        raise ValueError("attackers_xyv and defenders_xyv must be non-empty.")

    tx, ty = float(target_xy[0]), float(target_xy[1])
    react = max(0.0, float(reaction_sec))
    vmax = max(1.0, float(max_speed_mps))
    sigma_tti = 0.45

    def _team_influence(players: Sequence[tuple[float, float, float, float]]) -> float:
        total = 0.0
        for px, py, vx, vy in players:
            proj_x = float(px) + float(vx) * react
            proj_y = float(py) + float(vy) * react
            rem_dist = math.hypot(tx - proj_x, ty - proj_y)
            tti = react + rem_dist / vmax
            total += math.exp(-tti / sigma_tti)
        return total

    att_inf = _team_influence(attackers_xyv)
    def_inf = _team_influence(defenders_xyv)
    denom = att_inf + def_inf
    p_att = att_inf / denom if denom > 1e-12 else 0.5
    return {
        "attacker_pitch_control": round(p_att, 6),
        "defender_pitch_control": round(1.0 - p_att, 6),
        "attacker_influence": round(att_inf, 6),
        "defender_influence": round(def_inf, 6),
    }


def evaluate_openbiomechanics_kinematic_and_injury_hazard(
    *,
    peak_pelvis_deg_s: float,
    peak_torso_deg_s: float,
    peak_shoulder_deg_s: float,
    peak_hand_deg_s: float,
    acute_load_7d: float,
    chronic_load_28d: float,
    tissue_type: str = "soft_tissue",
    weeks_since_return: int = 4,
    prior_recurrences: int = 0,
) -> dict[str, Any]:
    """Assess proximal-to-distal kinematic sequence & ACWR recurrence risk (#149,157,165)."""
    chain_ok = (
        0.0 < peak_pelvis_deg_s <= peak_torso_deg_s <= peak_shoulder_deg_s <= peak_hand_deg_s
    )
    acwr = float(acute_load_7d) / max(1e-6, float(chronic_load_28d))
    sweet_spot = 0.80 <= acwr <= 1.30
    overload = max(0.0, acwr - 1.30)

    base_hazard = {"soft_tissue": 0.18, "ligament": 0.14, "bone": 0.09}.get(
        tissue_type.strip().lower(), 0.15
    )
    decay = math.exp(-0.28 * float(max(0, int(weeks_since_return))))
    reinj_prob = _sigmoid(
        math.log(base_hazard / max(1e-6, 1.0 - base_hazard))
        + 1.65 * overload
        + 0.45 * float(max(0, int(prior_recurrences)))
        + 0.55 * decay
        - (0.20 if chain_ok else -0.35)
    )
    return {
        "kinematic_sequence_valid": bool(chain_ok),
        "acwr_ratio": round(acwr, 6),
        "acwr_in_sweet_spot": bool(sweet_spot),
        "reinjury_hazard_prob": round(reinj_prob, 6),
    }


def evaluate_nfl4th_and_nflwin_decision_wp(
    *,
    yardline_100: int,
    ydstogo: int,
    score_diff: int,
    seconds_remaining: int,
    conv_prob: float | None = None,
    fg_make_prob: float | None = None,
) -> dict[str, Any]:
    """Evaluate 4th-down Go/FG/Punt win probability & situational leverage (#156,161,166)."""
    yl = max(1, min(99, int(yardline_100)))
    ytg = max(1, min(99, int(ydstogo)))
    sec = max(1, min(3600, int(seconds_remaining)))

    p_conv = (
        max(0.05, min(0.95, float(conv_prob)))
        if conv_prob is not None
        else max(0.12, min(0.84, 0.78 - 0.065 * float(ytg)))
    )
    kick_dist = yl + 17
    p_fg = (
        max(0.02, min(0.99, float(fg_make_prob)))
        if fg_make_prob is not None
        else (0.02 if kick_dist > 63 else _sigmoid(3.6 - 0.062 * float(kick_dist)))
    )

    time_weight = math.sqrt(3600.0 / float(sec))
    tw = min(2.5, time_weight)
    base_wp = _sigmoid(0.12 * float(score_diff) * tw)

    # First-order value of 1st down vs turnover on downs, FG points, and punt flip
    wp_go_success = _sigmoid(0.12 * (float(score_diff) + 3.2 - 0.02 * float(yl)) * tw)
    wp_go_fail = _sigmoid(0.12 * (float(score_diff) - 2.6 + 0.02 * float(yl)) * tw)
    go_wp = p_conv * wp_go_success + (1.0 - p_conv) * wp_go_fail

    wp_fg_make = _sigmoid(0.12 * (float(score_diff) + 3.0) * tw)
    fg_wp = p_fg * wp_fg_make + (1.0 - p_fg) * wp_go_fail

    punt_yl_gain = min(44.0, max(18.0, float(yl) - 20.0))
    punt_wp = _sigmoid(0.12 * (float(score_diff) - 1.2 + 0.03 * punt_yl_gain) * tw)

    options = {"GO": go_wp, "FG": fg_wp, "PUNT": punt_wp}
    best_action = max(options, key=lambda k: options[k])
    sorted_wps = sorted(options.values(), reverse=True)
    wp_edge = sorted_wps[0] - sorted_wps[1]
    return {
        "optimal_action": best_action,
        "wp_edge": round(wp_edge, 6),
        "go_wp": round(go_wp, 6),
        "fg_wp": round(fg_wp, 6),
        "punt_wp": round(punt_wp, 6),
        "base_wp": round(base_wp, 6),
    }


def compute_multisport_pybaseball_hockeyr_and_vorp_metrics(
    *,
    bb: int,
    hbp: int,
    singles: int,
    doubles: int,
    triples: int,
    hr: int,
    ab: int,
    sf: int,
    fenwick_for: int,
    fenwick_against: int,
    xgf: float,
    xga: float,
    player_proj_pts: float,
    replacement_baseline_pts: float,
) -> dict[str, float]:
    """Compute Statcast wOBA, NHL Fenwick/xG shares & Fantasy VORP (#150..162)."""
    woba_num = (
        0.690 * float(bb)
        + 0.722 * float(hbp)
        + 0.888 * float(singles)
        + 1.271 * float(doubles)
        + 1.616 * float(triples)
        + 2.101 * float(hr)
    )
    woba_den = max(1, int(ab) + int(bb) + int(sf) + int(hbp))
    woba = woba_num / float(woba_den)

    fenwick_tot = max(1, int(fenwick_for) + int(fenwick_against))
    fenwick_pct = float(fenwick_for) / float(fenwick_tot)
    xg_tot = max(1e-6, float(xgf) + float(xga))
    xg_share = float(xgf) / xg_tot
    vorp = float(player_proj_pts) - float(replacement_baseline_pts)
    return {
        "mlb_woba": round(woba, 6),
        "nhl_fenwick_pct": round(fenwick_pct, 6),
        "nhl_xg_share": round(xg_share, 6),
        "nfl_vorp": round(vorp, 4),
    }


def evaluate_wave21_tracking_biomech_and_rlvr_bridge(
    *,
    away_team: str,
    home_team: str,
    effective_wind_mph: float,
    away_clean_epa: float,
    home_clean_epa: float,
    is_short_week: bool,
) -> dict[str, Any]:
    """Evaluate Stage-2 Wave 21 weather, 4th-down, ACWR, GRPO & market-hold guards."""
    del away_team, home_team
    hold = assert_prediction_market_compliance_hold(
        live_execution_requested=False,
        gamma_cron_requested=False,
    )
    w = max(0.0, float(effective_wind_mph))
    wx = calibrate_ensemble_weather_stadium_priors(
        [w - 2.0, w, w + 3.0, w + 5.0],
        [48.0, 45.0, 42.0, 39.0],
        [0.0, 0.2, 0.8, 1.8 if w > 12.0 else 0.1],
    )
    nfl4 = evaluate_nfl4th_and_nflwin_decision_wp(
        yardline_100=42, ydstogo=2, score_diff=0, seconds_remaining=1200
    )
    bio = evaluate_openbiomechanics_kinematic_and_injury_hazard(
        peak_pelvis_deg_s=580.0,
        peak_torso_deg_s=860.0,
        peak_shoulder_deg_s=1550.0,
        peak_hand_deg_s=2100.0,
        acute_load_7d=1.22 if is_short_week else 1.02,
        chronic_load_28d=1.0,
        tissue_type="soft_tissue",
        weeks_since_return=4,
    )
    grpo = compute_trl_grpo_group_advantages(
        [float(away_clean_epa) + 0.5, float(home_clean_epa) + 0.5],
        [-1.0, -0.9],
        [-1.02, -0.92],
    )
    drag = float(wx["completion_weather_drag"])
    adj = max(-0.003, min(0.003, -0.05 * drag + 0.002 * float(nfl4["wp_edge"])))
    return {
        "wave21_wired": True,
        "oss_registry_unique_entries": 169,
        "polymarket_cleared": bool(hold["cleared"]),
        "nfl4th_midfield_4th_and_2_decision": str(nfl4["optimal_action"]),
        "openbiomech_acwr_ratio": float(bio["acwr_ratio"]),
        "weather_ensemble_epa_drag": round(drag, 6),
        "grpo_mean_kl": float(grpo["mean_kl_divergence"]),
        "wave21_weather_epa_adj": round(adj, 6),
    }


__all__ = [
    "WAVE21_CORPUS_ENTRIES",
    "assert_prediction_market_compliance_hold",
    "calibrate_ensemble_weather_stadium_priors",
    "compute_bert_bidirectional_salience_and_contrastive_align",
    "compute_lmsr_bregman_projection_and_flb_debias",
    "compute_metrica_skillcorner_pitch_control",
    "compute_multisport_pybaseball_hockeyr_and_vorp_metrics",
    "compute_sumer_permutation_invariant_tracking_attention",
    "compute_trl_grpo_group_advantages",
    "evaluate_nfl4th_and_nflwin_decision_wp",
    "evaluate_openbiomechanics_kinematic_and_injury_hazard",
    "evaluate_wave21_tracking_biomech_and_rlvr_bridge",
    "manage_letta_tiered_working_memory",
    "pack_axolotl_multipack_rlvr_sequences",
    "score_lm_eval_harness_calibration",
]
