"""Wave 30 unit tests: DeepMind MCTX/OpenSpiel, WeatherBench/BayesNF, Graph Nets & NGS."""

from __future__ import annotations

import json
import math
import re
from pathlib import Path

import pytest
from scripts.ops.enforce_stage0_roster_and_board_allowlist import (
    load_stage0_game_roster_allowlist,
)
from scripts.ops.gse_connected_game_workflow import (
    compile_stage1_to_stage2_simulation_priors,
    run_stage1a_all_38_coaching_and_scheme_layers,
    run_stage1b_all_5367_equations_pre_sim_review,
)

from gse_engine.compute.corpus_situational_integrator import (
    assert_all_books_pdfs_ig_x_situational_wired,
)
from gse_engine.memory import (
    WAVE30_NEW_OSS_ENTRIES,
    compile_gse_to_gsi_rlvr_training_batch,
    compute_ngs_separation_and_ryoe_kinematics,
    compute_weatherbench_fair_crps_and_spread_skill,
    enforce_alphafold3_alphagenome_ehr_ruo_gate,
    evaluate_hill_adstock_workload_saturation,
    evaluate_wave30_deepmind_and_google_corpus_bridge,
    propagate_graph_nets_edge_node_global_step,
    select_gumbel_muzero_sequential_halving_action,
    solve_openspiel_cfr_plus_regret_matching,
    update_elephant_goldfish_selective_memory_gate,
)

REPO_ROOT = Path(__file__).resolve().parents[2]


def test_wave30_mctx_gumbel_and_openspiel_cfr_plus() -> None:
    """Verify Gumbel MuZero sequential halving, System-1/2 gating, and CFR+ exploitability."""
    peaked = select_gumbel_muzero_sequential_halving_action(
        [3.2, -0.5, -1.2, -1.8],
        [0.35, 0.05, -0.10, -0.25],
        visit_counts=[16, 8, 4, 2],
    )
    assert peaked["selected_action"] == 0
    assert peaked["halving_rounds"] == 2
    assert peaked["kl_policy_improvement"] >= 0.0
    assert peaked["thinking_mode"] == "SYSTEM1_FAST_POLICY"
    assert math.isclose(sum(peaked["improved_policy"]), 1.0, abs_tol=1e-4)

    diffuse = select_gumbel_muzero_sequential_halving_action(
        [0.05, 0.04, 0.02, 0.0],
        [0.02, 0.25, 0.12, -0.05],
    )
    assert diffuse["normalized_entropy"] >= 0.99
    assert diffuse["thinking_mode"] == "SYSTEM2_SELECTIVE_PLANNING"

    with pytest.raises(ValueError, match="equal length"):
        select_gumbel_muzero_sequential_halving_action([0.1, 0.2], [0.1])

    cfr = solve_openspiel_cfr_plus_regret_matching(
        [[0.25, -0.10], [-0.08, 0.20]],
        iterations=96,
    )
    assert math.isclose(sum(cfr["row_avg_strategy"]), 1.0, abs_tol=1e-4)
    assert math.isclose(sum(cfr["col_avg_strategy"]), 1.0, abs_tol=1e-4)
    assert 0.0 <= cfr["nash_exploitability"] < 0.05


def test_wave30_weatherbench_fair_crps_and_hill_adstock() -> None:
    """Verify unbiased Fair-CRPS <= empirical CRPS, BayesNF norm, and Hill saturation."""
    wx = compute_weatherbench_fair_crps_and_spread_skill(
        [14.0, 16.0, 18.0, 20.0],
        17.5,
        exceedance_threshold=15.0,
        spatial_coords=(0.35, 0.65),
    )
    assert 0.0 <= wx["fair_crps"] <= wx["empirical_crps"] + 1e-6
    assert wx["exceedance_prob"] == 0.75
    assert wx["exceedance_brier"] == pytest.approx(0.0625, abs=1e-5)
    assert wx["bayesnf_spatiotemporal_feature_norm"] > 0.0

    with pytest.raises(ValueError, match="at least 2"):
        compute_weatherbench_fair_crps_and_spread_skill([12.0], 12.0)

    hl = evaluate_hill_adstock_workload_saturation(
        [20.0, 25.0, 30.0, 38.0],
        adstock_decay=0.65,
        half_saturation_k=45.0,
        hill_slope=1.8,
    )
    assert hl["adstock_state"] > 38.0
    assert 0.0 < hl["hill_saturation"] < 1.0
    assert 0.85 <= hl["efficiency_retention_mult"] <= 1.0
    assert hl["carryover_fraction"] > 0.0


def test_wave30_graph_nets_egm_dnc_and_ngs_kinematics() -> None:
    """Verify Graph Nets message passing, Elephant-Goldfish/DNC memory, and NGS/MuJoCo math."""
    gn = propagate_graph_nets_edge_node_global_step(
        [[0.2, 0.4], [0.1, -0.1], [0.0, 0.3]],
        [(0, 1, 0.5), (1, 2, 0.4), (0, 2, 0.2)],
        global_context=0.15,
        max_hops=2,
    )
    assert len(gn["updated_node_means"]) == 3
    assert gn["reachable_multi_hop_pairs"] == 3
    assert gn["edge_attention_entropy"] > 0.0

    egm = update_elephant_goldfish_selective_memory_gate(
        [
            {"claim_id": "c1", "confidence": 0.90},
            {"claim_id": "c2", "confidence": 0.70},
            {"claim_id": "c3", "confidence": 0.20},
        ],
        [False, False, True],
        prior_dnc_usage=0.30,
        write_gate=0.60,
        free_gate=0.25,
    )
    assert egm["surviving_claim_count"] == 2
    assert egm["goldfish_veto_rate"] == pytest.approx(1.0 / 3.0, abs=1e-4)
    assert egm["verified_context_score"] == pytest.approx(0.80, abs=1e-4)
    assert 0.0 <= egm["dnc_allocation_usage"] <= 1.0

    ngs = compute_ngs_separation_and_ryoe_kinematics(
        avg_cushion_yds=6.1,
        avg_separation_yds=3.1,
        air_yards=8.0,
        actual_completion_rate=0.68,
        actual_rush_ypc=4.6,
        expected_rush_ypc=4.2,
    )
    assert 0.0 < ngs["ngs_expected_comp_prob"] < 1.0
    assert ngs["ngs_ryoe_ypc_delta"] == pytest.approx(0.4, abs=1e-6)
    assert ngs["mujoco_contact_kinetic_index"] > 0.0


def test_wave30_ruo_and_arithmancer_compliance_holds() -> None:
    """Verify AlphaFold3/AlphaGenome/EHR zero weight and Arithmancer PermissionError hold."""
    ruo = enforce_alphafold3_alphagenome_ehr_ruo_gate(
        ("google-deepmind/alphafold3", "google-deepmind/alphagenome", "google/ehr-predictions"),
        sbom_licenses=("Apache-2.0", "MIT", "CUSTOM_OR_UNSPECIFIED"),
        arithmancer_live_market_requested=False,
    )
    assert ruo["ruo_sports_weight"] == 0.0
    assert ruo["arithmancer_cleared"] is False
    assert ruo["quarantined_source_count"] == 3
    assert ruo["permissive_sbom_count"] == 2
    assert ruo["custom_sbom_count"] == 1

    with pytest.raises(PermissionError, match="POLYMARKET_COMPLIANCE_HOLD"):
        enforce_alphafold3_alphagenome_ehr_ruo_gate(
            ("google/arithmancer",),
            arithmancer_live_market_requested=True,
        )


def test_wave30_stage2_integrator_registry_346_report_and_rlvr_210() -> None:
    """Verify Stage-2 bridge, 81 new URLs -> 346/346 WIRED_V3, clean report, and 210 RLVR."""
    assert len(WAVE30_NEW_OSS_ENTRIES) == 81
    assert WAVE30_NEW_OSS_ENTRIES[0]["id"] == 266
    assert WAVE30_NEW_OSS_ENTRIES[-1]["id"] == 346

    bridge = evaluate_wave30_deepmind_and_google_corpus_bridge(
        away_clean_epa=0.04,
        home_clean_epa=0.12,
        effective_wind_mph=14.5,
        is_short_week=True,
    )
    assert bridge["wave30_wired"] is True
    assert bridge["new_oss_entries_count"] == 81
    assert bridge["all_scalars_finite"] is True
    assert bridge["ruo_sports_weight"] == 0.0
    assert bridge["arithmancer_cleared"] is False
    assert bridge["live_stage2_weight"] == 0.0

    s0 = load_stage0_game_roster_allowlist("NE", "DET", week=10)
    s1a = run_stage1a_all_38_coaching_and_scheme_layers(s0)
    s1b = run_stage1b_all_5367_equations_pre_sim_review(s0, s1a)
    priors = compile_stage1_to_stage2_simulation_priors(
        s1a,
        s1b,
        game_context={"verified_board_athletes": s0["verified_board_athletes"]},
    )
    lb = priors["combined_load_bearing_priors"]
    assert_all_books_pdfs_ig_x_situational_wired(lb)
    pillar = lb["books_and_pdfs_pillar"]
    assert pillar["wave30_deepmind_google_wired"] is True
    assert pillar["wave30_new_oss_entries_count"] == 81
    assert pillar["wave30_ruo_sports_weight"] == 0.0
    assert pillar["wave30_arithmancer_cleared_false"] is True
    assert pillar["wave30_live_stage2_weight"] == 0.0

    reg = json.loads(
        (
            REPO_ROOT
            / "docs"
            / "data-sources"
            / "research"
            / "2026-11-15"
            / "oss-corpus-registry.json"
        ).read_text(encoding="utf-8")
    )
    assert reg["total_entries"] >= 346
    assert reg["total_unique_entries"] == reg["total_entries"]
    assert reg["total_submitted_urls"] >= 430
    reg_urls = {str(e["url"]) for e in reg["entries"]}
    reg_by_url = {str(e["url"]): e for e in reg["entries"]}
    for entry in WAVE30_NEW_OSS_ENTRIES:
        assert entry["url"] in reg_urls
    arith = next(
        e for e in WAVE30_NEW_OSS_ENTRIES if str(e["url"]).endswith("/google/arithmancer")
    )
    assert arith["cleared"] is False
    assert reg_by_url["https://github.com/google/arithmancer"]["cleared"] is False

    report_path = (
        REPO_ROOT
        / "docs"
        / "engine"
        / "research"
        / "2026-11-17"
        / "deep-research-wave30-deepmind-bayesnf-weatherbench-mctx-and-ngs.md"
    )
    report = report_path.read_text(encoding="utf-8")
    assert max(ord(ch) for ch in report) <= 127
    assert re.search(r"\bblock(?:ed|er|ers|ing|s)?\b", report, re.IGNORECASE) is None
    for entry in WAVE30_NEW_OSS_ENTRIES:
        assert entry["url"] in report

    rlvr = compile_gse_to_gsi_rlvr_training_batch(REPO_ROOT)
    assert rlvr["records_compiled"] >= 210
    assert rlvr["zero_odds_contamination"] is True
    assert rlvr["monotone_curriculum_verified"] is True
