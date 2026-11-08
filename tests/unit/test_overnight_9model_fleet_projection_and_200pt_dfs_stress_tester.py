"""
Unit and Integration Tests for Overnight 9-Model Fleet (`Inkling 2` + `Inkling Small 2 (New)`)
Capability-Matched Projection, 360-Degree Board & DraftKings 200+ Point DFS Stress-Test Engine.
"""

from __future__ import annotations

import json
from pathlib import Path

from intelligence.dfs.overnight_9model_fleet_projection_and_200pt_dfs_stress_tester import (
    CAPABILITY_MATCHED_STAGE_ASSIGNMENT,
    DEFAULT_RECEIPT_PATH,
    FLEET_BY_DISPLAY_NAME,
    OPENCODE_CONFIG_PATH,
    OVERNIGHT_9MODEL_FLEET_CATALOG,
    OVERNIGHT_STRESS_TEST_SLATES,
    evaluate_9model_fleet_consensus_on_dfs_lineup,
    evaluate_9model_fleet_consensus_on_ticket,
    run_overnight_9model_fleet_projection_and_200pt_dfs_stress_test,
    verify_capability_matched_stage_routing,
)
from scripts.ops.zero_waste_model_router import APPROVED_VERIFICATION_MODELS


def test_9model_fleet_catalog_and_capability_matched_stage_assignment() -> None:
    assert len(OVERNIGHT_9MODEL_FLEET_CATALOG) == 9
    expected_models = {
        "DeepSeek V3.2": ("deepseek/deepseek-v3.2", "deepseek-v3.2"),
        "GLM-5.1": ("z-ai/glm-5.1", "glm-5.1"),
        "GLM-5-Turbo": ("z-ai/glm-5-turbo", "glm-5-turbo"),
        "Grok 4.1 Fast": ("x-ai/grok-4.1-fast", "grok-4.1-fast"),
        "Grok 4.20 Beta": ("x-ai/grok-4.20-multi-agent-beta-0309", "grok-4.20-beta"),
        "MiMo-V2-Pro": ("xiaomi/mimo-v2-pro", "mimo-v2-pro"),
        "MiniMax M2.7": ("minimax/minimax-m2.7", "minimax-m2.7"),
        "Inkling Small 2 (New)": ("inkling/inkling-small-2", "inkling-small-2"),
        "Inkling 2": ("inkling/inkling-2", "inkling-2"),
    }
    assert set(FLEET_BY_DISPLAY_NAME.keys()) == set(expected_models.keys())

    opencode_cfg = json.loads(OPENCODE_CONFIG_PATH.read_text(encoding="utf-8"))
    ss_models = opencode_cfg["provider"]["stealth-skeleton"]["models"]
    or_models = opencode_cfg["provider"]["openrouter"]["models"]

    for disp_name, (exp_id, exp_alias) in expected_models.items():
        spec = FLEET_BY_DISPLAY_NAME[disp_name]
        assert spec.model_id == exp_id
        assert spec.alias == exp_alias
        assert spec.model_id in APPROVED_VERIFICATION_MODELS
        assert spec.alias in APPROVED_VERIFICATION_MODELS
        assert spec.model_id in ss_models
        assert spec.model_id in or_models

    # Verify exact capability-matched stage assignments ("strongest agent for their task")
    assert CAPABILITY_MATCHED_STAGE_ASSIGNMENT["stage_1_and_corpus_book_deep_read_verification"] == (
        "MiniMax M2.7",
        "GLM-5.1",
    )
    assert CAPABILITY_MATCHED_STAGE_ASSIGNMENT["stage_2_26layer_situational_and_21419_eq_22_metric_synthesis"] == (
        "Grok 4.20 Beta",
        "Inkling 2",
        "DeepSeek V3.2",
    )
    assert CAPABILITY_MATCHED_STAGE_ASSIGNMENT["stage_3_wave1_10k_world_175_snap_pbp_trajectory_dispatch"] == (
        "Grok 4.1 Fast",
        "Inkling Small 2 (New)",
        "MiMo-V2-Pro",
    )
    assert CAPABILITY_MATCHED_STAGE_ASSIGNMENT[
        "stage_4_and_5_conformal_calibration_heavy_juice_firewall_and_santa_gate"
    ] == (
        "Inkling 2",
        "GLM-5.1",
        "DeepSeek V3.2",
    )
    assert CAPABILITY_MATCHED_STAGE_ASSIGNMENT["wave_2_dk_200pt_dfs_milp_and_6_2m_lineup_vs_field_simulation"] == (
        "DeepSeek V3.2",
        "Inkling 2",
        "GLM-5-Turbo",
        "Inkling Small 2 (New)",
    )

    routing_audit = verify_capability_matched_stage_routing()
    assert routing_audit["all_9_models_registered"] is True
    assert routing_audit["router_and_opencode_synced"] is True
    assert routing_audit["santa_council_9_of_9_converged"] is True
    assert routing_audit["inkling_2_registered"] is True
    assert routing_audit["inkling_small_2_new_registered"] is True
    assert routing_audit["sheaf_weights_sum_to_one"] is True
    assert routing_audit["all_stages_capability_matched"] is True


def test_edge_cases_heavy_juice_firewall_solo_source_split_vote_and_dfs_cap() -> None:
    # 1. Heavy-juice -320 trap and -250 boundary must be unanimously blocked by all 9 models
    for bad_odds in (-320, -250):
        heavy_juice_trap = {
            "ticket_id": f"TKT-EDGE-HEAVY-JUICE-{abs(bad_odds)}",
            "market_category": "FULL_GAME_ML",
            "selection": f"HEAVY_FAVORITE_ML_{bad_odds}",
            "american_odds": bad_odds,
            "model_prob": 0.790,
            "post_fwl_prob": 0.788,
            "market_devig_prob": 0.690,
            "agreement_sources": ["situational_26_layer", "pbp_10k_trajectory", "trench_l12_ol_dl"],
            "independent_edge_decision": "PLAY",
            "cqr_lower_bound": 0.750,
            "decision": "PLAY",
        }
        hj_res = evaluate_9model_fleet_consensus_on_ticket(heavy_juice_trap)
        assert hj_res["unanimous_9_of_9"] is True
        assert hj_res["consensus_decision"] == "PASS"
        assert hj_res["publishAllowed"] is False
        assert hj_res["pass_votes_count"] == 9
        assert hj_res["inkling_2_vote"]["decision"] == "PASS"
        assert hj_res["inkling_small_2_new_vote"]["decision"] == "PASS"

    # 2. Solo-source ticket (< 2 sources) must be unanimously blocked
    solo_trap = {
        "ticket_id": "TKT-EDGE-SOLO-SOURCE",
        "market_category": "1H_TOTAL",
        "selection": "SOLO_1H_OVER_24.5",
        "american_odds": -110,
        "model_prob": 0.610,
        "post_fwl_prob": 0.605,
        "market_devig_prob": 0.520,
        "agreement_sources": ["elo"],
        "independent_edge_decision": "PLAY",
        "cqr_lower_bound": 0.560,
        "decision": "PLAY",
    }
    solo_res = evaluate_9model_fleet_consensus_on_ticket(solo_trap)
    assert solo_res["unanimous_9_of_9"] is True
    assert solo_res["consensus_decision"] == "PASS"
    assert solo_res["publishAllowed"] is False
    assert solo_res["pass_votes_count"] == 9

    # 3. Borderline edge (0.035) where positive-offset vs negative-offset models split votes:
    # must fail closed to PASS even if input ticket carried decision="PLAY"
    borderline_split_ticket = {
        "ticket_id": "TKT-EDGE-SPLIT-VOTE-035",
        "market_category": "FULL_GAME_SPREAD",
        "selection": "BORDERLINE_SPREAD_-2.5",
        "american_odds": -110,
        "model_prob": 0.555,
        "post_fwl_prob": 0.555,
        "market_devig_prob": 0.520,
        "agreement_sources": ["situational_26_layer", "pbp_10k_trajectory"],
        "independent_edge_decision": "PLAY",
        "cqr_lower_bound": 0.540,
        "decision": "PLAY",
    }
    split_res = evaluate_9model_fleet_consensus_on_ticket(borderline_split_ticket)
    assert split_res["unanimous_9_of_9"] is False
    assert split_res["play_votes_count"] == 5
    assert split_res["pass_votes_count"] == 4
    assert split_res["consensus_decision"] == "PASS"
    assert split_res["publishAllowed"] is False

    # 4. Stage 5 L26 FWL weight violation (> 0.08) must be unanimously blocked
    stage5_violation_ticket = {
        "ticket_id": "TKT-EDGE-L26-WEIGHT-VIOLATION",
        "market_category": "FULL_GAME_TOTAL",
        "selection": "OVER_48.5",
        "american_odds": -110,
        "model_prob": 0.620,
        "post_fwl_prob": 0.615,
        "market_devig_prob": 0.520,
        "agreement_sources": ["situational_26_layer", "pbp_10k_trajectory"],
        "independent_edge_decision": "PLAY",
        "cqr_lower_bound": 0.560,
        "l26_applied_weight": 0.12,
        "decision": "PLAY",
    }
    s5_res = evaluate_9model_fleet_consensus_on_ticket(stage5_violation_ticket)
    assert s5_res["unanimous_9_of_9"] is True
    assert s5_res["consensus_decision"] == "PASS"
    assert s5_res["publishAllowed"] is False
    assert s5_res["pass_votes_count"] == 9

    # 5. Over-salary ($50,500), zero-salary ($0), unstacked GPP, or borderline 200.2pt DFS lineups must be rejected
    for bad_lu in (
        {
            "lineup_id": 99,
            "archetype": "INVALID_OVER_CAP",
            "total_salary": 50500,
            "valid_dk_9_slot_roster": True,
            "joint_p99_shootout_dk_pts": 215.0,
            "cvar_099_championship_dk_pts": 225.0,
        },
        {
            "lineup_id": 100,
            "archetype": "INVALID_ZERO_SALARY",
            "total_salary": 0,
            "valid_dk_9_slot_roster": True,
            "joint_p99_shootout_dk_pts": 215.0,
            "cvar_099_championship_dk_pts": 225.0,
        },
        {
            "lineup_id": 101,
            "archetype": "Primary GPP Game Stack",
            "total_salary": 49800,
            "valid_dk_9_slot_roster": True,
            "stacked_pass_catchers_count": 0,
            "joint_p99_shootout_dk_pts": 215.0,
            "cvar_099_championship_dk_pts": 225.0,
        },
    ):
        lu_res = evaluate_9model_fleet_consensus_on_dfs_lineup(bad_lu)
        assert lu_res["unanimous_9_of_9_200pt_approval"] is False
        assert lu_res["consensus_decision"] == "REJECT"
        assert lu_res["inkling_2_eval"]["clears_200pt_championship_gate"] is False
        assert lu_res["inkling_small_2_new_eval"]["clears_200pt_championship_gate"] is False

    borderline_lu = {
        "lineup_id": 102,
        "archetype": "Borderline 200.2pt Lineup",
        "total_salary": 49800,
        "valid_dk_9_slot_roster": True,
        "joint_p99_shootout_dk_pts": 200.2,
        "cvar_099_championship_dk_pts": 200.2,
    }
    b_lu_res = evaluate_9model_fleet_consensus_on_dfs_lineup(borderline_lu)
    assert b_lu_res["unanimous_9_of_9"] is False
    assert b_lu_res["unanimous_9_of_9_200pt_approval"] is False
    assert b_lu_res["consensus_decision"] == "REJECT"


def test_overnight_5slate_9model_fleet_stress_test_and_receipt() -> None:
    receipt = run_overnight_9model_fleet_projection_and_200pt_dfs_stress_test(
        slates=OVERNIGHT_STRESS_TEST_SLATES,
        num_dfs_sims=10000,
        write_receipt=True,
    )
    assert receipt["status"] == "PASS"
    assert receipt["slates_verified_count"] == 5
    assert tuple(receipt["slates_verified"]) == OVERNIGHT_STRESS_TEST_SLATES
    assert receipt["total_equations_cataloged"] == 21419
    assert receipt["total_equation_families"] == 279
    assert receipt["total_dfs_frontier_equations"] == 30
    assert receipt["total_proprietary_gse_metrics"] == 22
    assert receipt["wave1_total_pbp_snaps_simulated_across_slates"] == 8750000

    w2 = receipt["wave2_dk_200pt_championship_summary"]
    assert w2["total_lineup_world_evaluations"] == 6200000
    assert w2["all_lineups_clear_200pt_championship_ceiling"] is True
    assert w2["all_lineups_unanimous_9_of_9_fleet_approval"] is True
    assert w2["max_cvar_099_championship_dk_pts"] >= 200.0
    assert w2["max_joint_p99_shootout_dk_pts"] >= 200.0

    for slate_id in OVERNIGHT_STRESS_TEST_SLATES:
        s_res = receipt["per_slate_stress_test_results"][slate_id]
        assert s_res["layers_26_verified"] is True
        assert s_res["equations_executed_count"] == 21419
        assert s_res["families_consumed_count"] == 279
        assert s_res["dependency_order_verified"] is True
        assert s_res["l26_entered_last_and_weight_le_0_08"] is True
        assert s_res["wave1_pbp_simulation"]["total_snaps_evaluated"] == 1750000
        assert 0.05 < s_res["wave1_pbp_simulation"]["empirical_home_win_prob"] < 0.95
        assert 20.0 < s_res["wave1_pbp_simulation"]["empirical_mean_total_points"] < 75.0
        assert s_res["board_360_and_9model_consensus"]["heavy_juice_minus_300_trap_blocked"] is True
        assert s_res["board_360_and_9model_consensus"]["all_tickets_unanimous_9_of_9"] is True
        assert s_res["board_360_and_9model_consensus"]["sgp_unanimous_9_of_9"] is True
        assert s_res["dfs_200pt_9model_consensus"]["all_lineups_unanimous_9_of_9_200pt"] is True

    assert DEFAULT_RECEIPT_PATH.exists()

    # Two-Host Rule: verify zero literal Windows user paths in the module source
    mod_path = (
        Path(__file__).resolve().parents[2]
        / "intelligence"
        / "dfs"
        / "overnight_9model_fleet_projection_and_200pt_dfs_stress_tester.py"
    )
    mod_src = mod_path.read_text(encoding="utf-8")
    forbidden_prefix = "C:" + "\\Users\\" + "Garrett"
    assert forbidden_prefix not in mod_src
