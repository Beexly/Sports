"""
Unit & Full-Stack Contract Tests for `intelligence/dfs/full_stack_post_sim_projection_and_200pt_dfs_orchestrator.py`.

Covers all 4 phases of `/antigravity-skills:full-stack-orchestration-full-stack-feature`:
  1. Database schema & persistence contract completeness + `pg_cron` zero-waste hygiene
  2. Backend post-simulation 360-degree projection accuracy, 22 proprietary GSE metrics (`M-GSE-01`..`M-GSE-22`),
     and Two-Wave `200+` DK Pt lineup generation (`top_lineup_p90_pts >= 200.0`)
  3. `-250` / `-300+` Heavy-Juice Firewall & `PASS` suppression (never leaking `PASS` or `-300+` traps)
  4. Server-side `FREE` vs. `PRO` paywall redaction (presentational-only client entitlement invariant)
  5. Public copy linter gate (zero forbidden internal math jargon & confidence formatted strictly as `XX/100`)
  6. Phase 4 deployment & observability readiness (`tracesSampleRate: 0.1`, Odds API ceiling, `<500ms` SLO)
"""

from __future__ import annotations

import copy
from pathlib import Path

import pytest

from intelligence.dfs.full_stack_post_sim_projection_and_200pt_dfs_orchestrator import (
    FORBIDDEN_PUBLIC_COPY_JARGON,
    VALID_CONFIDENCE_TOKEN_PATTERN,
    _format_confidence_xx_over_100,
    _sanitize_human_football_copy,
    assert_zero_forbidden_public_copy,
    build_database_migration_and_persistence_spec,
    execute_backend_post_sim_projection_and_200pt_dfs_pipeline,
    project_client_safe_payload,
    verify_phase4_deployment_and_observability_readiness,
    write_phase4_receipt_and_documentation,
)


@pytest.fixture(scope="module")
def backend_bundle():
    return execute_backend_post_sim_projection_and_200pt_dfs_pipeline(
        slate_id="NFL_2026_WEEK9_MAIN_SLATE",
        tier="PRO",
    )


def test_phase1_database_schema_and_persistence_contract():
    spec = build_database_migration_and_persistence_spec()
    assert spec["schema_version"] == "1.0.0"
    tables = spec["tables"]
    expected_tables = {
        "post_sim_player_projections",
        "proprietary_metric_weights_registry",
        "market_calibration_heads",
        "dk_two_wave_contest_sim_receipts",
    }
    assert expected_tables.issubset(set(tables.keys()))

    # Verify 22 proprietary metrics vector keys M-GSE-01 .. M-GSE-22
    proj_table = tables["post_sim_player_projections"]
    assert len(proj_table["proprietary_metrics_vector_keys"]) == 22
    assert proj_table["proprietary_metrics_vector_keys"][0] == "M-GSE-01"
    assert proj_table["proprietary_metrics_vector_keys"][-1] == "M-GSE-22"

    # Verify concurrent indexes and zero-waste pg_cron hygiene
    assert len(spec["indexes"]) >= 3
    for idx in spec["indexes"]:
        assert "CREATE INDEX CONCURRENTLY" in idx["ddl"]

    hygiene = spec["pg_cron_zero_waste_hygiene"]
    assert "weekly-vacuum-analyze" in hygiene["jobs_configured"]
    assert "weekly-odds-analyze" in hygiene["jobs_configured"]
    assert hygiene["target_heap_footprint_gb"] <= 4.2
    assert hygiene["target_dead_tuple_pct"] == 0.0
    assert hygiene["external_redis_or_sharding_required"] is False


def test_phase2_backend_pipeline_proprietary_metrics_and_two_wave_200pt_dfs(backend_bundle):
    assert backend_bundle["slate_id"] == "NFL_2026_WEEK9_MAIN_SLATE"
    assert backend_bundle["official_ledger_of_record"]["season_record"] == "47-19-1"
    assert backend_bundle["official_ledger_of_record"]["net_units"] == "+26.50u"

    # 22 proprietary GSE metrics verified
    prop_metrics = backend_bundle["proprietary_gse_metrics"]
    assert prop_metrics["total_metrics_cataloged"] == 22
    assert prop_metrics["all_22_metrics_wired_and_tested"] is True
    assert len(prop_metrics["optimized_weights_by_metric"]) == 22
    oos = prop_metrics["out_of_sample_4fold_benchmark"]
    assert oos["optimized_beats_unoptimized_equal"] is True
    assert oos["optimized_beats_market_baseline"] is True

    # Two-Wave 200+ DK Pt contest simulation verified
    dfs_sim = backend_bundle["two_wave_200pt_dfs_contest_simulation"]
    assert dfs_sim["wave1_candidate_pool"] == 120
    assert dfs_sim["wave2_opponent_field"] == 500
    assert dfs_sim["correlated_worlds"] == 10000
    assert dfs_sim["total_lineup_world_evaluations"] == 6_200_000
    assert dfs_sim["top_lineup_p90_pts"] >= 200.0
    assert dfs_sim["top_lineup_p99_pts"] >= 200.0
    assert dfs_sim["top_lineup_cvar_099_pts"] >= 200.0
    assert dfs_sim["clears_200pt_target"] is True
    assert len(dfs_sim["lineups"]) == 3
    for lu in dfs_sim["lineups"]:
        assert lu["valid_dk_9_slot_roster"] is True
        assert lu["total_salary"] <= 50000
        assert len(lu["roster"]) == 9

    # Model routing & 9-model worker fleet verified
    routing = backend_bundle["model_routing_and_sheaf_consensus"]
    assert routing["quad_frontier_pillars_count"] == 4
    assert routing["capability_worker_fleet_count"] == 9
    expected_canonical_9 = {
        "deepseek/deepseek-v3.2",
        "z-ai/glm-5.1",
        "z-ai/glm-5-turbo",
        "x-ai/grok-4.1-fast",
        "x-ai/grok-4.20-multi-agent-beta-0309",
        "xiaomi/mimo-v2-pro",
        "minimax/minimax-m2.7",
        "inkling/inkling-small-2",
        "inkling/inkling-2",
    }
    fleet_ids = {w["worker_id"] for w in routing["capability_worker_fleet"]}
    assert fleet_ids == expected_canonical_9
    assert "stealth/crouton-alpha" not in fleet_ids
    assert "gpt-6-luna" not in fleet_ids
    assert routing["cellular_sheaf_consensus"]["cohomology_h0_global_section"] is True

    # Verify 22-metric weights actively modulate post-sim player projections (`metric_weighted_projection_boost`)
    assert prop_metrics["metric_weights_actively_modulate_projections"] is True
    assert prop_metrics["mean_metric_weighted_projection_boost"] > 0.0
    assert backend_bundle["post_sim_360_projections_and_tickets"]["proprietary_22_metrics_optimal_weights_applied"] is True
    assert dfs_sim["proprietary_22_metrics_optimal_weights_applied"] is True
    sample_players = backend_bundle["post_sim_360_projections_and_tickets"]["sample_player_projection_records"]
    assert len(sample_players) >= 10
    for pl in sample_players:
        assert pl["metric_weighted_projection_boost"] > 0.0
        assert pl["gse_dk_projection"] >= pl["raw_post_sim_dk_projection"]
    assert sample_players[0]["proprietary_metrics_vector"] is not sample_players[1]["proprietary_metrics_vector"]

    from intelligence.dfs.full_stack_post_sim_projection_and_200pt_dfs_orchestrator import (
        _compute_player_metric_weighted_projection_boost,
    )
    zero_weights = {f"M-GSE-{i:02d}": 0.0 for i in range(1, 23)}
    assert _compute_player_metric_weighted_projection_boost(sample_players[0], zero_weights) == 0.0
    assert _compute_player_metric_weighted_projection_boost(sample_players[0], {}) == 0.0
    w_a = {f"M-GSE-{i:02d}": (1.0 if i <= 7 else 0.0) for i in range(1, 23)}
    w_b = {f"M-GSE-{i:02d}": (1.0 if i >= 18 else 0.0) for i in range(1, 23)}
    assert _compute_player_metric_weighted_projection_boost(sample_players[0], w_a) != _compute_player_metric_weighted_projection_boost(sample_players[0], w_b)


def test_phase3_heavy_juice_firewall_and_pass_suppression(backend_bundle):
    proj_sec = backend_bundle["post_sim_360_projections_and_tickets"]
    assert proj_sec["pass_discipline_verified"] is True
    assert proj_sec["heavy_juice_minus_300_trap_blocked"] is True

    # Confirm internal audit holds the blocked -285 and -320 regression specimens
    passed_ids = {t["ticket_id"] for t in proj_sec["passed_tickets_internal_audit_only"]}
    assert "TKT-GATE-REGRESSION-PASS-08" in passed_ids
    assert "TKT-HEAVY-JUICE-MINUS-320-TRAP-09" in passed_ids
    assert "TKT-SOLO-SOURCE-PASS-10" in passed_ids

    # Adversarial injection test: inject a -310 heavy-juice trap and a PASS row into published_tickets
    # and verify `project_client_safe_payload` strips both even for PRO tier.
    tampered_bundle = copy.deepcopy(backend_bundle)
    tampered_bundle["post_sim_360_projections_and_tickets"]["published_tickets"].extend(
        [
            {
                "ticket_id": "TKT-ADVERSARIAL-MINUS-310",
                "market_category": "FULL_GAME_ML",
                "selection": "TRAP_FAVORITE_ML_-310",
                "american_odds": -310,
                "win_prob_capped": 0.77,
                "devigged_edge": 0.05,
                "publishAllowed": True,
                "decision": "PLAY",
            },
            {
                "ticket_id": "TKT-ADVERSARIAL-PASS-LEAK",
                "market_category": "FULL_GAME_SPREAD",
                "selection": "LEAKED_PASS_SPREAD",
                "american_odds": -110,
                "win_prob_capped": 0.52,
                "devigged_edge": -0.02,
                "publishAllowed": False,
                "decision": "PASS",
            },
        ]
    )
    pro_payload = project_client_safe_payload(tampered_bundle, tier="PRO")
    delivered_ids = {t["ticket_id"] for t in pro_payload["official_tickets"]}
    assert "TKT-ADVERSARIAL-MINUS-310" not in delivered_ids
    assert "TKT-ADVERSARIAL-PASS-LEAK" not in delivered_ids
    for t in pro_payload["official_tickets"]:
        assert t["american_odds"] > -250


def test_phase3_server_side_free_vs_pro_paywall_redaction(backend_bundle):
    free_payload = project_client_safe_payload(backend_bundle, tier="FREE")
    pro_payload = project_client_safe_payload(backend_bundle, tier="PRO")

    # FREE tier must redact all official picks, SGP legs, and 200+ Pt DFS lineups on the server
    assert free_payload["tier"] == "FREE"
    assert free_payload["entitlements"]["server_redacted"] is True
    assert free_payload["entitlements"]["can_view_official_picks"] is False
    assert free_payload["entitlements"]["can_view_dfs_200pt_lineups"] is False
    assert free_payload["official_tickets"] == []
    assert free_payload["official_sgp_ticket"] is None
    assert free_payload["dfs_championship_lineups"] == []
    assert free_payload["locked_Preview_counts"]["locked_official_tickets_count"] == 7
    assert free_payload["locked_Preview_counts"]["locked_dfs_200pt_lineups_count"] == 3
    # Public environment analytics must still be populated for FREE tier
    assert len(free_payload["public_game_environment_analytics"]["environment_film_notes"]) == 3

    # PRO tier must receive all vetted tickets, SGP, and 3 DFS lineups
    assert pro_payload["tier"] == "PRO"
    assert pro_payload["entitlements"]["server_redacted"] is False
    assert pro_payload["entitlements"]["can_view_official_picks"] is True
    assert pro_payload["entitlements"]["can_view_dfs_200pt_lineups"] is True
    assert len(pro_payload["official_tickets"]) == 7
    assert pro_payload["official_sgp_ticket"] is not None
    assert len(pro_payload["dfs_championship_lineups"]) == 3


def test_phase3_public_copy_linter_and_confidence_format_gates(backend_bundle):
    free_payload = project_client_safe_payload(backend_bundle, tier="FREE")
    pro_payload = project_client_safe_payload(backend_bundle, tier="PRO")

    assert assert_zero_forbidden_public_copy(free_payload, "free") == []
    assert assert_zero_forbidden_public_copy(pro_payload, "pro") == []

    # Every ticket confidence must match integer XX/100 (never %)
    for t in pro_payload["official_tickets"]:
        assert VALID_CONFIDENCE_TOKEN_PATTERN.match(t["confidence"])
        assert "%" not in t["confidence"]

    for note in free_payload["public_game_environment_analytics"]["environment_film_notes"]:
        assert VALID_CONFIDENCE_TOKEN_PATTERN.match(note["environment_grade"])

    # Negative-control tests: confirm `assert_zero_forbidden_public_copy` catches each forbidden phrase & % confidence
    for banned_phrase in (
        "Romano CQR",
        "Optimal Transport",
        "10,000 worlds",
        "tau_hat",
        "JEV",
        "Cholesky",
        "Sinkhorn",
        "22,750,000 snap evaluations",
    ):
        bad_obj = {"copy": f"Powered by {banned_phrase} simulation"}
        violations = assert_zero_forbidden_public_copy(bad_obj, "neg_control")
        assert len(violations) >= 1, f"Expected violation for '{banned_phrase}'"

    bad_conf = {"confidence": "Confidence: 82%"}
    assert len(assert_zero_forbidden_public_copy(bad_conf, "neg_control_pct")) >= 1


def test_phase4_deployment_observability_and_edge_cases(backend_bundle):
    readiness = verify_phase4_deployment_and_observability_readiness(backend_bundle)
    assert readiness["phase4_status"] == "READY"
    assert readiness["all_deployment_and_observability_gates_passed"] is True
    assert readiness["sentry_telemetry_governance"]["production_traces_sample_rate"] == 0.1
    assert readiness["odds_api_credit_governance"]["circuit_breaker_armed"] is True
    assert readiness["api_response_latency_slo"]["meets_sub_500ms_slo"] is True

    # Edge cases: empty slate_id or invalid tier must raise ValueError
    with pytest.raises(ValueError):
        execute_backend_post_sim_projection_and_200pt_dfs_pipeline(slate_id="   ", tier="PRO")
    with pytest.raises(ValueError):
        execute_backend_post_sim_projection_and_200pt_dfs_pipeline(slate_id="SLATE_1", tier="INVALID_TIER")
    with pytest.raises(ValueError):
        project_client_safe_payload(backend_bundle, tier="ENTERPRISE")

    # Verify zero hardcoded host paths in the orchestrator source file
    src_path = (
        Path(__file__).resolve().parents[2]
        / "intelligence"
        / "dfs"
        / "full_stack_post_sim_projection_and_200pt_dfs_orchestrator.py"
    )
    src_text = src_path.read_text(encoding="utf-8")
    forbidden_host_prefix = "C:\\" + "Users\\Garrett"
    assert forbidden_host_prefix not in src_text
    assert "C:/" + "Users/Garrett" not in src_text

    # Verify receipt & markdown writer produces valid artifacts
    receipt = write_phase4_receipt_and_documentation(slate_id="NFL_2026_WEEK9_MAIN_SLATE")
    assert receipt["status"] == "PASS"
    assert len(receipt["digest_sha256"]) == 64


def test_adversarial_edge_cases_word_boundaries_nan_and_solo_source_suppression(backend_bundle):
    # 1. Word-boundary check: player names containing 'Jev' (e.g., Miami Dolphins safety Jevon Holland)
    # must NOT be corrupted by _sanitize_human_football_copy or flagged by assert_zero_forbidden_public_copy,
    # whereas standalone 'JEV' or 'jevkit' must be scrubbed and flagged.
    benign_copy = "Jevon Holland aligns in two-high safety coverage with veteran longevity."
    assert _sanitize_human_football_copy(benign_copy) == benign_copy
    assert assert_zero_forbidden_public_copy({"copy": benign_copy}, "benign_jevon") == []

    standalone_jev = "Simulated via JEV and jevkit trajectory engine."
    assert "JEV" not in _sanitize_human_football_copy(standalone_jev).upper()
    assert len(assert_zero_forbidden_public_copy({"copy": standalone_jev}, "standalone_jev")) >= 2

    # 2. _format_confidence_xx_over_100 resilience against NaN, Inf, None, pre-formatted tokens, and max_cap
    assert _format_confidence_xx_over_100(float("nan")) == "50/100"
    assert _format_confidence_xx_over_100(float("inf")) == "50/100"
    assert _format_confidence_xx_over_100(float("-inf")) == "50/100"
    assert _format_confidence_xx_over_100(None) == "50/100"
    assert _format_confidence_xx_over_100("74/100") == "74/100"
    assert _format_confidence_xx_over_100("92/100", max_cap=78) == "78/100"
    assert _format_confidence_xx_over_100(0.95, max_cap=78) == "78/100"
    assert _format_confidence_xx_over_100(0.0, max_cap=78) == "1/100"

    # 3. Non-finite NaN/Inf detection in assert_zero_forbidden_public_copy
    nan_violations = assert_zero_forbidden_public_copy({"val": float("nan")}, "nan_check")
    assert any("non-finite" in v for v in nan_violations)

    # 4. Adversarial ticket & SGP edge cases in project_client_safe_payload:
    #    - Unpriced ticket (`american_odds: None`) -> suppressed (no TypeError)
    #    - NaN edge or NaN win_prob -> suppressed (no ValueError)
    #    - Zero probability (`win_prob_capped: 0.0`) -> suppressed
    #    - Solo-source ticket (`agreement_count: 1` or `agreement: "SOLO"`) -> suppressed
    #    - Uncapped probability (`win_prob_capped: 0.94`, `agreement_count: 3`) -> kept but capped at `78/100`
    #    - SGP with `publishAllowed: False` or `decision: "PASS"` or negative ROI -> suppressed (`None`)
    adv_bundle = copy.deepcopy(backend_bundle)
    adv_bundle["post_sim_360_projections_and_tickets"]["published_tickets"] = [
        {
            "ticket_id": "TKT-UNPRICED-NONE-ODDS",
            "market_category": "PROP",
            "selection": "Player A OVER 50.5 Yds",
            "american_odds": None,
            "win_prob_capped": 0.65,
            "devigged_edge": 0.06,
            "agreement_count": 3,
            "publishAllowed": True,
            "decision": "PLAY",
        },
        {
            "ticket_id": "TKT-NAN-PROB",
            "market_category": "PROP",
            "selection": "Player B OVER 40.5 Yds",
            "american_odds": -110,
            "win_prob_capped": float("nan"),
            "devigged_edge": 0.06,
            "agreement_count": 3,
            "publishAllowed": True,
            "decision": "PLAY",
        },
        {
            "ticket_id": "TKT-ZERO-PROB",
            "market_category": "PROP",
            "selection": "Player C OVER 30.5 Yds",
            "american_odds": -110,
            "win_prob_capped": 0.0,
            "devigged_edge": 0.06,
            "agreement_count": 3,
            "publishAllowed": True,
            "decision": "PLAY",
        },
        {
            "ticket_id": "TKT-SOLO-SOURCE-1",
            "market_category": "FULL_GAME_ML",
            "selection": "SOLO TEAM ML",
            "american_odds": -110,
            "win_prob_capped": 0.64,
            "devigged_edge": 0.06,
            "agreement_count": 1,
            "publishAllowed": True,
            "decision": "PLAY",
        },
        {
            "ticket_id": "TKT-SOLO-LABEL",
            "market_category": "FULL_GAME_ML",
            "selection": "SOLO LABEL ML",
            "american_odds": -110,
            "win_prob_capped": 0.64,
            "devigged_edge": 0.06,
            "agreement_count": 2,
            "agreement": "SOLO",
            "publishAllowed": True,
            "decision": "PLAY",
        },
        {
            "ticket_id": "TKT-UNCAPPED-PROB-94",
            "market_category": "SKILL_PLAYER_SUITE",
            "selection": "Jevon Holland OVER 4.5 Tackles",
            "american_odds": -115,
            "win_prob_capped": 0.94,
            "devigged_edge": 0.07,
            "agreement_count": 3,
            "publishAllowed": True,
            "decision": "PLAY",
        },
    ]
    adv_bundle["post_sim_360_projections_and_tickets"]["correlated_sgp_analysis"] = {
        "sgp_id": "SGP-PASS-NEGATIVE-ROI",
        "legs": ["Leg 1", "Leg 2"],
        "publishAllowed": False,
        "decision": "PASS",
        "expected_value_roi": -0.12,
    }

    pro_adv = project_client_safe_payload(adv_bundle, tier="PRO")
    free_adv = project_client_safe_payload(adv_bundle, tier="FREE")

    assert len(pro_adv["official_tickets"]) == 1
    surviving = pro_adv["official_tickets"][0]
    assert surviving["ticket_id"] == "TKT-UNCAPPED-PROB-94"
    assert surviving["selection"] == "Jevon Holland OVER 4.5 Tackles"
    assert surviving["confidence"] == "78/100"
    assert pro_adv["official_sgp_ticket"] is None
    assert free_adv["locked_preview_counts"]["locked_sgp_cards_count"] == 0
    assert free_adv["locked_Preview_counts"]["locked_official_tickets_count"] == 1

