#!/usr/bin/env python3
"""
Unit tests verifying that both `Inkling Small 2 (New)` (`inkling/inkling-small-2`, alias `inkling-small-2`)
and `Inkling 2` (`inkling/inkling-2`, alias `inkling-2`) are registered alongside the 7 approved fleet models
(`DeepSeek V3.2`, `GLM-5.1`, `GLM-5-Turbo`, `Grok 4.1 Fast`, `Grok 4.20 Beta`, `MiMo-V2-Pro`, `MiniMax M2.7`)
in `workers/stealth-skeleton-provider/opencode.json` and `scripts/ops/zero_waste_model_router.py`,
with task-specific strongest-agent routing and Santa verification council participation.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.ops.zero_waste_model_router import (
    APPROVED_VERIFICATION_MODELS,
    CLAUDE_CLI_AND_HERMES_SUBSCRIPTION_SPINE,
    DUAL_PROVIDER_BUDGET_GOVERNOR,
    HEAVY_MATH_FIRST_SPOT_ASSIGNMENTS,
    MODEL_ID_ALIASES,
    MODEL_ROUTING_TABLE,
    check_dual_provider_budget_and_route,
    run_multi_brain_santa_verification,
    run_multi_brain_santa_verification_council,
    select_strongest_agent_for_task,
    select_zero_waste_cost_optimized_model,
)

EXPECTED_9_FLEET_MODELS = [
    ("deepseek/deepseek-v3.2", "deepseek-v3.2", "DeepSeek V3.2"),
    ("z-ai/glm-5.1", "glm-5.1", "GLM-5.1"),
    ("z-ai/glm-5-turbo", "glm-5-turbo", "GLM-5-Turbo"),
    ("x-ai/grok-4.1-fast", "grok-4.1-fast", "Grok 4.1 Fast"),
    ("x-ai/grok-4.20-multi-agent-beta-0309", "grok-4.20-beta", "Grok 4.20 Beta"),
    ("xiaomi/mimo-v2-pro", "mimo-v2-pro", "MiMo-V2-Pro"),
    ("minimax/minimax-m2.7", "minimax-m2.7", "MiniMax M2.7"),
    ("inkling/inkling-small-2", "inkling-small-2", "Inkling Small 2 (New)"),
    ("inkling/inkling-2", "inkling-2", "Inkling 2"),
]


def test_opencode_json_registers_all_9_fleet_models_including_inkling_small_2_and_inkling_2() -> None:
    opencode_path = REPO_ROOT / "workers" / "stealth-skeleton-provider" / "opencode.json"
    assert opencode_path.exists()
    cfg = json.loads(opencode_path.read_text(encoding="utf-8"))

    ss_models = cfg["provider"]["stealth-skeleton"]["models"]
    or_models = cfg["provider"]["openrouter"]["models"]
    fleet_list = cfg["approved_verification_and_routing_fleet"]
    assert len(fleet_list) == 9

    fleet_by_id = {entry["model_id"]: entry for entry in fleet_list}
    for model_id, alias, display_name in EXPECTED_9_FLEET_MODELS:
        assert model_id in ss_models, f"Missing {model_id} in stealth-skeleton.models"
        assert model_id in or_models, f"Missing {model_id} in openrouter.models"
        assert model_id in fleet_by_id, f"Missing {model_id} in approved_verification_and_routing_fleet"
        assert fleet_by_id[model_id]["alias"] == alias
        assert fleet_by_id[model_id]["display_name"] == display_name
        assert ss_models[model_id]["display_name"] == display_name
        assert or_models[model_id]["display_name"] == display_name

    # Verify alias entries for Inkling Small 2 (New) and Inkling 2 in both providers
    for models_dict in (ss_models, or_models):
        assert "inkling-small-2" in models_dict
        assert models_dict["inkling-small-2"]["id"] == "inkling/inkling-small-2"
        assert models_dict["inkling-small-2"]["display_name"] == "Inkling Small 2 (New)"

        assert "inkling-2" in models_dict
        assert models_dict["inkling-2"]["id"] == "inkling/inkling-2"
        assert models_dict["inkling-2"]["display_name"] == "Inkling 2"


def test_approved_verification_models_and_backward_compatibility() -> None:
    assert len(APPROVED_VERIFICATION_MODELS) == 9
    copied_models = APPROVED_VERIFICATION_MODELS.copy()
    assert len(copied_models) == 9

    for model_id, alias, display_name in EXPECTED_9_FLEET_MODELS:
        assert model_id in APPROVED_VERIFICATION_MODELS
        assert alias in APPROVED_VERIFICATION_MODELS
        assert display_name in APPROVED_VERIFICATION_MODELS
        assert alias in copied_models
        assert display_name in copied_models
        spec = APPROVED_VERIFICATION_MODELS[model_id]
        assert spec["model_id"] == model_id
        assert spec["alias"] == alias
        assert spec["display_name"] == display_name
        assert APPROVED_VERIFICATION_MODELS[alias]["model_id"] == model_id
        assert APPROVED_VERIFICATION_MODELS[display_name]["model_id"] == model_id
        assert copied_models[alias]["model_id"] == model_id
        assert copied_models[display_name]["model_id"] == model_id

    # Backward compatibility with legacy 7 OpenCode council IDs
    for legacy_id in (
        "stealth/crouton-alpha",
        "deepseek-1017",
        "glm-5.3-flash-free",
        "recursive/flint-v1.0:free",
        "qwen3.8-flash",
        "gpt-6-luna",
        "prism-ml/ternary-bonsai-2-27b",
    ):
        assert legacy_id in APPROVED_VERIFICATION_MODELS
        assert APPROVED_VERIFICATION_MODELS[legacy_id]["model_id"] == legacy_id


def test_select_strongest_agent_for_task_and_model_routing_table() -> None:
    # 1. frontier_situational_reasoning_and_5stage_gate
    r_sit = select_strongest_agent_for_task("frontier_situational_reasoning_and_5stage_gate")
    assert r_sit["models"] == [
        "x-ai/grok-4.20-multi-agent-beta-0309",
        "inkling/inkling-2",
        "z-ai/glm-5.1",
    ]
    assert r_sit["display_names"] == ["Grok 4.20 Beta", "Inkling 2", "GLM-5.1"]
    assert r_sit["primary_model_id"] == "x-ai/grok-4.20-multi-agent-beta-0309"

    # 2. mathematical_equations_milp_and_conformal_coding
    r_math = select_strongest_agent_for_task("mathematical_equations_milp_and_conformal_coding")
    assert r_math["models"] == [
        "deepseek/deepseek-v3.2",
        "inkling/inkling-2",
    ]
    assert r_math["display_names"] == ["DeepSeek V3.2", "Inkling 2"]
    assert r_math["primary_model_id"] == "deepseek/deepseek-v3.2"

    # 3. long_context_corpus_and_santa_adversarial_audit
    r_long = select_strongest_agent_for_task("long_context_corpus_and_santa_adversarial_audit")
    assert r_long["models"] == [
        "minimax/minimax-m2.7",
        "z-ai/glm-5.1",
    ]
    assert r_long["display_names"] == ["MiniMax M2.7", "GLM-5.1"]
    assert r_long["primary_model_id"] == "minimax/minimax-m2.7"

    # 4. high_throughput_pbp_snap_and_wave2_dfs_lineup_dispatch
    r_fast = select_strongest_agent_for_task("high_throughput_pbp_snap_and_wave2_dfs_lineup_dispatch")
    assert r_fast["models"] == [
        "inkling/inkling-small-2",
        "x-ai/grok-4.1-fast",
        "z-ai/glm-5-turbo",
        "xiaomi/mimo-v2-pro",
    ]
    assert r_fast["display_names"] == [
        "Inkling Small 2 (New)",
        "Grok 4.1 Fast",
        "GLM-5-Turbo",
        "MiMo-V2-Pro",
    ]
    assert r_fast["primary_model_id"] == "inkling/inkling-small-2"

    # Keyword routing edge cases (including whole-token anti-collision & compound task scoring)
    assert select_strongest_agent_for_task("wave2_dfs_lineup_sim")["primary_alias"] == "inkling-small-2"
    assert select_strongest_agent_for_task("milp_equation_ast_check")["primary_alias"] == "deepseek-v3.2"
    assert select_strongest_agent_for_task("santa_corpus_audit")["primary_alias"] == "minimax-m2.7"
    assert select_strongest_agent_for_task("")["primary_alias"] == "grok-4.20-beta"
    assert select_strongest_agent_for_task("master_situational_reasoning")["primary_alias"] == "grok-4.20-beta"
    assert select_strongest_agent_for_task("forecast_5stage_gate")["primary_alias"] == "grok-4.20-beta"
    assert select_strongest_agent_for_task("sportsbook_5stage_gate")["primary_alias"] == "grok-4.20-beta"
    assert select_strongest_agent_for_task("smallest_edge_5stage_gate")["primary_alias"] == "grok-4.20-beta"
    assert select_strongest_agent_for_task("pbp_math_equation_milp_solver")["primary_alias"] == "deepseek-v3.2"

    # Deep-copy immutability check: mutating returned list must not corrupt MODEL_ROUTING_TABLE
    r_mut = select_strongest_agent_for_task("mathematical_equations_milp_and_conformal_coding")
    r_mut["models"].append("mutated/model")
    assert MODEL_ROUTING_TABLE["mathematical_equations_milp_and_conformal_coding"]["models"] == [
        "deepseek/deepseek-v3.2",
        "inkling/inkling-2",
    ]
    assert set(MODEL_ROUTING_TABLE.keys()) == {
        "frontier_situational_reasoning_and_5stage_gate",
        "mathematical_equations_milp_and_conformal_coding",
        "long_context_corpus_and_santa_adversarial_audit",
        "high_throughput_pbp_snap_and_wave2_dfs_lineup_dispatch",
    }


def test_run_multi_brain_santa_verification_executes_inkling_small_2_and_inkling_2() -> None:
    res = run_multi_brain_santa_verification()
    assert res["santa_method_converged"] is True
    assert res["council_size"] == 9
    assert res["inkling_small_2_verified"] is True
    assert res["inkling_2_verified"] is True

    verdicts = res["model_verdicts"]
    for model_id, alias, display_name in EXPECTED_9_FLEET_MODELS:
        assert model_id in verdicts
        assert alias in verdicts
        assert display_name in verdicts
        assert verdicts[model_id]["verdict"] == "CONVERGED_PASS"
        assert verdicts[model_id]["invariants_checked"] == 8
        assert verdicts[model_id]["invariants_passed"] == 8

    # Explicitly empty artifact_summary={} must fail closed (not fall back to live disk probe)
    empty_res = run_multi_brain_santa_verification({})
    assert empty_res["santa_method_converged"] is False
    assert empty_res["inkling_small_2_verified"] is False
    assert empty_res["inkling_2_verified"] is False
    assert empty_res["model_verdicts"]["inkling-small-2"]["verdict"] == "HOLD_REQUIRES_REMEDIATION"
    assert empty_res["model_verdicts"]["inkling-2"]["verdict"] == "HOLD_REQUIRES_REMEDIATION"

    # Fail-closed edge case when a single invariant fails
    failed_res = run_multi_brain_santa_verification_council(
        {
            "armed_workflows_9_of_9": True,
            "equations_21419_ast_safe": False,
            "sub_min_sample_1400_held": True,
            "copula_tail_1372_repaired": True,
            "families_279_consumed": True,
            "two_host_zero_local_paths": True,
            "google_drive_and_docs_verified": True,
            "gsi_sandbox_quarantined": True,
        }
    )
    assert failed_res["santa_method_converged"] is False
    assert failed_res["inkling_small_2_verified"] is False
    assert failed_res["inkling_2_verified"] is False
    assert failed_res["model_verdicts"]["inkling-small-2"]["verdict"] == "HOLD_REQUIRES_REMEDIATION"
    assert failed_res["model_verdicts"]["inkling-2"]["verdict"] == "HOLD_REQUIRES_REMEDIATION"


def test_overnight_9model_fleet_catalog_canonical_model_ids_match_router() -> None:
    from intelligence.dfs.overnight_9model_fleet_projection_and_200pt_dfs_stress_tester import (
        OVERNIGHT_9MODEL_FLEET_CATALOG,
    )

    catalog_ids = [(s.model_id, s.display_name) for s in OVERNIGHT_9MODEL_FLEET_CATALOG]
    expected_ids = [(m_id, d_name) for m_id, _alias, d_name in EXPECTED_9_FLEET_MODELS]
    assert catalog_ids == expected_ids


def test_opencode_free_and_cheaper_glm_model_routing_hierarchy() -> None:
    # Verify len(APPROVED_VERIFICATION_MODELS) == 9 stays intact while aliases & free endpoints resolve
    assert len(APPROVED_VERIFICATION_MODELS) == 9

    assert MODEL_ID_ALIASES["x-ai/grok-4.20-beta"] == "x-ai/grok-4.20-multi-agent-beta-0309"
    assert MODEL_ID_ALIASES["inkling/inkling-small-2-new"] == "inkling/inkling-small-2"
    assert MODEL_ID_ALIASES["z-ai/glm-5.3-flash:free"] == "glm-5.3-flash-free"
    assert MODEL_ID_ALIASES["mimo-v2-flash"] == "xiaomi/mimo-v2-flash"
    assert MODEL_ID_ALIASES["mimo-v2.6-flash"] == "xiaomi/mimo-v2-flash"

    # Verify $0.00 Free on OpenCode endpoints
    for free_key, expected_canonical in (
        ("xiaomi/mimo-v2-flash", "xiaomi/mimo-v2-flash"),
        ("mimo-v2-flash", "xiaomi/mimo-v2-flash"),
        ("mimo-v2.6-flash", "xiaomi/mimo-v2-flash"),
        ("glm-5.3-flash-free", "glm-5.3-flash-free"),
        ("z-ai/glm-5.3-flash:free", "glm-5.3-flash-free"),
        ("inkling/inkling-2", "inkling/inkling-2"),
        ("inkling/inkling-small-2", "inkling/inkling-small-2"),
        ("stealth/crouton-alpha", "stealth/crouton-alpha"),
        ("xiaomi/mimo-v2-pro", "xiaomi/mimo-v2-pro"),
    ):
        assert free_key in APPROVED_VERIFICATION_MODELS
        spec = APPROVED_VERIFICATION_MODELS[free_key]
        assert spec["model_id"] == expected_canonical
        assert spec["free_on_opencode"] is True
        assert tuple(spec["pricing_per_1m_in_out_usd"]) == (0.0, 0.0)

    # Verify GLM cost-tier metadata on z-ai/glm-5.1 and z-ai/glm-5-turbo
    for glm_id in ("z-ai/glm-5.1", "z-ai/glm-5-turbo"):
        glm_spec = APPROVED_VERIFICATION_MODELS[glm_id]
        assert glm_spec["free_opencode_alternative"] == "glm-5.3-flash-free"
        assert glm_spec["cheaper_glm_tier"] == "z-ai/glm-5-turbo"

    # Verify select_zero_waste_cost_optimized_model routes GLM/MiMo/Inkling to $0.00 Free OpenCode when prefer_free_opencode=True
    r_glm_free = select_zero_waste_cost_optimized_model("z-ai/glm-5.1", prefer_free_opencode=True)
    assert r_glm_free["selected_model_id"] == "glm-5.3-flash-free"
    assert r_glm_free["free_on_opencode"] is True
    assert r_glm_free["pricing_per_1m_in_out_usd"] == (0.0, 0.0)

    # And routes to cheaper paid tier z-ai/glm-5-turbo ($0.02/$0.08 vs $0.10/$0.40) when prefer_free_opencode=False
    r_glm_paid = select_zero_waste_cost_optimized_model("z-ai/glm-5.1", prefer_free_opencode=False)
    assert r_glm_paid["selected_model_id"] == "z-ai/glm-5-turbo"
    assert r_glm_paid["pricing_per_1m_in_out_usd"] == (0.02, 0.08)

    r_mimo = select_zero_waste_cost_optimized_model("xiaomi/mimo-v2-pro", prefer_free_opencode=True)
    assert r_mimo["selected_model_id"] == "xiaomi/mimo-v2-flash"
    assert r_mimo["free_on_opencode"] is True
    assert r_mimo["pricing_per_1m_in_out_usd"] == (0.0, 0.0)

    r_ink2 = select_zero_waste_cost_optimized_model("inkling/inkling-2", prefer_free_opencode=True)
    assert r_ink2["selected_model_id"] == "inkling/inkling-2"
    assert r_ink2["free_on_opencode"] is True
    assert r_ink2["pricing_per_1m_in_out_usd"] == (0.0, 0.0)

    r_inks = select_zero_waste_cost_optimized_model("inkling/inkling-small-2", prefer_free_opencode=True)
    assert r_inks["selected_model_id"] == "inkling/inkling-small-2"
    assert r_inks["free_on_opencode"] is True
    assert r_inks["pricing_per_1m_in_out_usd"] == (0.0, 0.0)


def test_dual_provider_budget_governor_heavy_math_spots_and_claude_cli_subscription() -> None:
    # 1. Verify $10.00 OpenCode + $10.00 OpenRouter Hard Budget Governor
    assert DUAL_PROVIDER_BUDGET_GOVERNOR["opencode_budget_usd"] == 10.00
    assert DUAL_PROVIDER_BUDGET_GOVERNOR["openrouter_budget_usd"] == 10.00
    assert DUAL_PROVIDER_BUDGET_GOVERNOR["total_budget_usd"] == 20.00
    assert DUAL_PROVIDER_BUDGET_GOVERNOR["hard_circuit_breaker_at_pct"] == 0.95

    # 2. Verify Logged-In Claude CLI + Hermes Subscription ($0.00 marginal API burn)
    opus_sub = CLAUDE_CLI_AND_HERMES_SUBSCRIPTION_SPINE["anthropic/claude-opus-5.5"]
    assert opus_sub["drain_all_subscription_capacity"] is True
    assert opus_sub["never_use_claude_for_babysitting_or_workhorse"] is True
    assert tuple(opus_sub["marginal_api_cost_per_1m_usd"]) == (0.0, 0.0)
    assert opus_sub["transport"] == "claude_cli_and_hermes_subscription_no_api_burn"
    assert "anthropic/claude-opus-5.5" in APPROVED_VERIFICATION_MODELS
    assert "claude-opus-5.5" in APPROVED_VERIFICATION_MODELS

    # 3. Verify all 5 Dedicated Heavy-Math-First Spot Assignments
    expected_spots = (
        "spot_1_symbolic_ast_21419_equations_and_jacobian",
        "spot_2_two_wave_200pt_dfs_milp_and_knapsack_portfolio",
        "spot_3_conformal_cqr_venn_abers_and_james_stein_shrinkage",
        "spot_4_sinkhorn_optimal_transport_and_non_stationary_kernels",
        "spot_5_adversarial_santa_and_5stage_conjunction_big_guns",
    )
    for spot_key in expected_spots:
        assert spot_key in HEAVY_MATH_FIRST_SPOT_ASSIGNMENTS
        spot = HEAVY_MATH_FIRST_SPOT_ASSIGNMENTS[spot_key]
        assert spot["subscription_lead"]["model_id"] == "anthropic/claude-opus-5.5"
        assert spot["subscription_lead"]["transport"] == "claude_cli_and_hermes_subscription"
        assert "anthropic/claude-opus-5.5" in spot["models"]

    assert "deepseek/deepseek-v3.2" in HEAVY_MATH_FIRST_SPOT_ASSIGNMENTS["spot_1_symbolic_ast_21419_equations_and_jacobian"]["models"]
    assert "prism-ml/ternary-bonsai-2-27b" in HEAVY_MATH_FIRST_SPOT_ASSIGNMENTS["spot_2_two_wave_200pt_dfs_milp_and_knapsack_portfolio"]["models"]
    assert "inkling/inkling-2" in HEAVY_MATH_FIRST_SPOT_ASSIGNMENTS["spot_3_conformal_cqr_venn_abers_and_james_stein_shrinkage"]["models"]
    assert "xiaomi/mimo-v2-flash" in HEAVY_MATH_FIRST_SPOT_ASSIGNMENTS["spot_4_sinkhorn_optimal_transport_and_non_stationary_kernels"]["models"]
    assert "stealth/crouton-alpha" in HEAVY_MATH_FIRST_SPOT_ASSIGNMENTS["spot_5_adversarial_santa_and_5stage_conjunction_big_guns"]["models"]
    assert "x-ai/grok-4.20-multi-agent-beta-0309" in HEAVY_MATH_FIRST_SPOT_ASSIGNMENTS["spot_5_adversarial_santa_and_5stage_conjunction_big_guns"]["paid_big_guns"]

    # 4. Workhorse & Babysitting routing defaults strictly to $0.00 Free OpenCode and NEVER uses Claude Opus 5.5
    workhorse = check_dual_provider_budget_and_route(
        "pbp_snap_schema_ingest",
        opencode_spent_usd=1.25,
        openrouter_spent_usd=0.50,
        is_adversarial_or_hard_math=False,
    )
    assert workhorse["big_guns_unlocked"] is False
    assert workhorse["never_use_claude_for_babysitting_or_workhorse"] is True
    assert workhorse["selected_model_id"] in ("inkling/inkling-small-2", "xiaomi/mimo-v2-flash", "glm-5.3-flash-free")
    assert workhorse["selected_model_id"] != "anthropic/claude-opus-5.5"
    assert "anthropic/claude-opus-5.5" not in workhorse["active_models"]
    assert workhorse["subscription_api_budget_burn_usd"] == 0.0
    assert workhorse["claude_cli_and_hermes_subscription_lead"]["model_id"] == "anthropic/claude-opus-5.5"
    assert workhorse["pricing_per_1m_in_out_usd"] == (0.0, 0.0)
    assert workhorse["opencode_remaining_usd"] == 8.75
    assert workhorse["openrouter_remaining_usd"] == 9.50

    allowed_free_workhorse_models = {"inkling/inkling-small-2", "xiaomi/mimo-v2-flash", "glm-5.3-flash-free"}
    for task_kw in ("babysit_agent_run", "monitor_pipeline", "poll_job_status", "healthcheck_worker", "workhorse_pbp_loop"):
        routed_budget = check_dual_provider_budget_and_route(
            task_kw,
            opencode_spent_usd=1.00,
            openrouter_spent_usd=1.00,
            is_adversarial_or_hard_math=True,  # even if caller passes True, babysitting/workhorse must never use Opus 5.5
        )
        assert routed_budget["never_use_claude_for_babysitting_or_workhorse"] is True
        assert routed_budget["is_babysitting_or_workhorse_task"] is True
        assert routed_budget["selected_model_id"] in allowed_free_workhorse_models
        assert routed_budget["selected_model_id"] != "anthropic/claude-opus-5.5"
        assert "anthropic/claude-opus-5.5" not in routed_budget["active_models"]
        assert routed_budget["free_on_opencode"] is True
        assert routed_budget["pricing_per_1m_in_out_usd"] == (0.0, 0.0)

        routed_opt = select_zero_waste_cost_optimized_model(task_kw, prefer_free_opencode=True)
        assert routed_opt["never_use_claude_for_babysitting_or_workhorse"] is True
        assert routed_opt["selected_model_id"] in allowed_free_workhorse_models
        assert routed_opt["selected_model_id"] != "anthropic/claude-opus-5.5"
        assert routed_opt["free_on_opencode"] is True
        assert routed_opt["pricing_per_1m_in_out_usd"] == (0.0, 0.0)

    # 5. Adversarial / Heavy-Math within $10+$10 budget unlocks Big Guns alongside Opus 5.5 CLI & Free OpenCode
    adv_ok = check_dual_provider_budget_and_route(
        "spot_5_adversarial_santa_and_5stage_conjunction_big_guns",
        opencode_spent_usd=3.00,
        openrouter_spent_usd=4.00,
        is_adversarial_or_hard_math=True,
    )
    assert adv_ok["big_guns_unlocked"] is True
    assert adv_ok["circuit_breaker_tripped"] is False
    assert "x-ai/grok-4.20-multi-agent-beta-0309" in adv_ok["paid_big_guns_models"]
    assert "deepseek/deepseek-v3.2" in adv_ok["paid_big_guns_models"]
    assert "anthropic/claude-opus-5.5" in adv_ok["active_models"]
    assert "stealth/crouton-alpha" in adv_ok["active_models"]

    # 6. Exhausted budget (>= 95% of $10.00) trips circuit breaker and falls back to $0.00 Free OpenCode + Opus 5.5 CLI
    adv_exhausted = check_dual_provider_budget_and_route(
        "spot_5_adversarial_santa_and_5stage_conjunction_big_guns",
        opencode_spent_usd=9.60,
        openrouter_spent_usd=2.00,
        is_adversarial_or_hard_math=True,
    )
    assert adv_exhausted["circuit_breaker_tripped"] is True
    assert adv_exhausted["big_guns_unlocked"] is False
    assert adv_exhausted["paid_big_guns_models"] == []
    assert adv_exhausted["selected_model_id"] == "stealth/crouton-alpha"
    assert adv_exhausted["pricing_per_1m_in_out_usd"] == (0.0, 0.0)
    assert "anthropic/claude-opus-5.5" in adv_exhausted["active_models"]

    # 7. Verify extra_aliases resolve in run_multi_brain_santa_verification_council()["model_verdicts"]
    santa_verdicts = run_multi_brain_santa_verification_council()["model_verdicts"]
    for extra_alias_key in (
        "x-ai/grok-4.20-beta",
        "inkling/inkling-small-2-new",
        "inkling-small-2-new",
        "z-ai/glm-5.3-flash:free",
        "mimo-v2.6-flash",
    ):
        assert extra_alias_key in santa_verdicts
        assert santa_verdicts[extra_alias_key]["verdict"] == "CONVERGED_PASS"

