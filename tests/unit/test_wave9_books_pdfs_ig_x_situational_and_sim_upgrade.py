"""Wave 9 unit tests for unified Books/PDFs/IG/X/Situational wiring and PBP sim upgrades."""

from __future__ import annotations

import math
import time
from dataclasses import FrozenInstanceError
from pathlib import Path

import numpy as np
import pytest
from intelligence.coaching.full_repo_279_family_situational_reasoning_matrix import (
    run_full_repo_situational_reasoning_engine,
)
from scripts.ops.enforce_stage0_roster_and_board_allowlist import (
    load_stage0_game_roster_allowlist,
)
from scripts.ops.gse_coach_mind_simulator import (
    load_sealed_object_readonly,
    simulate_matchup_pbp,
)
from scripts.ops.gse_connected_game_workflow import (
    compile_stage1_to_stage2_simulation_priors,
    run_stage1a_all_38_coaching_and_scheme_layers,
    run_stage1b_all_5367_equations_pre_sim_review,
)

from gse_engine.compute.corpus_situational_integrator import (
    TeamPillarSignals,
    apply_vmls_kkt_and_corpus_shares,
    assert_all_books_pdfs_ig_x_situational_wired,
    compile_all_books_pdfs_ig_x_and_situational_priors,
    hybrid_rrf_corpus_and_arxiv_retriever,
)


def test_phase_a_all_five_corpus_pillars_wired_on_week10_matchup() -> None:
    """Every Book, PDF, IG, X, Situational 279, and Coaching pillar must be load-bearing."""
    s0 = load_stage0_game_roster_allowlist("NE", "DET", week=10)
    s1a = run_stage1a_all_38_coaching_and_scheme_layers(s0)
    s1b = run_stage1b_all_5367_equations_pre_sim_review(s0, s1a)
    priors = compile_stage1_to_stage2_simulation_priors(
        s1a,
        s1b,
        game_context={"verified_board_athletes": s0["verified_board_athletes"]},
    )
    lb = priors["combined_load_bearing_priors"]

    verif = assert_all_books_pdfs_ig_x_situational_wired(lb)
    assert verif["all_5_pillars_wired"] is True
    assert verif["scalars_verified_count"] == 18

    assert lb["books_and_pdfs_pillar"]["manifest_877_pdfs_verified"] is True
    assert lb["books_and_pdfs_pillar"]["manifest_total_pdfs"] >= 877
    assert lb["books_and_pdfs_pillar"]["openai_math_manuscripts_wired"] == 721
    assert 0.5 <= float(lb["books_and_pdfs_pillar"]["away_expected_drive_points_own25"]) <= 4.0
    assert 0.5 <= float(lb["books_and_pdfs_pillar"]["home_expected_drive_points_own25"]) <= 4.0
    rrf = lb["books_and_pdfs_pillar"]["hybrid_rrf_corpus_and_arxiv"]
    assert rrf["candidates_evaluated"] >= 877
    assert rrf["rrf_coherence_score"] > 0.0
    assert len(rrf["top_fused_citations"]) == 8
    assert callable(hybrid_rrf_corpus_and_arxiv_retriever)
    assert lb["instagram_360_pillar"]["all_32_teams_360_charting"] is True
    assert math.isfinite(float(lb["instagram_360_pillar"]["away_epa_delta_360"]))
    assert 0.96 <= float(lb["instagram_360_pillar"]["away_dvf_wr"]) <= 1.04
    assert lb["x_twitter_pillar"]["x_sweep_5_mechanisms_executed"] is True
    assert math.isfinite(float(lb["x_twitter_pillar"]["away_clean_pocket_epa"]))
    assert 0.0 <= float(lb["x_twitter_pillar"]["away_self_invited_pressure_pct"]) <= 1.0
    assert math.isfinite(float(lb["x_twitter_pillar"]["away_schedule_cleaned_epa_per_play"]))
    assert math.isfinite(float(lb["x_twitter_pillar"]["home_schedule_cleaned_epa_per_play"]))
    assert math.isfinite(float(lb["x_twitter_pillar"]["away_pgwe_luck_delta_wins"]))
    assert isinstance(lb["x_twitter_pillar"]["away_paired_adot_drop_flagged"], bool)
    assert lb["situational_279_pillar"]["equation_families_count"] == 279
    assert len(lb["situational_279_pillar"]["live_6family_cholesky_whitened"]["away"]) == 6
    js_fac = lb["situational_279_pillar"]["positive_part_js_shrinkage_factor"]
    assert 0.0 <= float(js_fac["away"]) <= 1.0
    assert 0.0 <= float(lb["situational_279_pillar"]["away_qb_visual_cognitive_load"]) <= 1.0
    assert 0.0 <= float(lb["situational_279_pillar"]["home_qb_visual_cognitive_load"]) <= 1.0
    assert lb["contextual_coaching_pillar"]["wired"] is True
    assert math.isfinite(float(lb["contextual_coaching_pillar"]["away_pressure_answer_delta"]))
    assert math.isfinite(float(lb["contextual_coaching_pillar"]["home_pressure_answer_delta"]))
    nav_routes = lb["nvidia_hermes_capability_routes"]
    assert len(nav_routes["routes"]) == 5
    assert nav_routes["blinkenbar_nvidia_ethos_green"] is True
    assert nav_routes["blinkenbar_stealth_86_12_green"] is True
    report_path = (
        Path(__file__).resolve().parents[2]
        / "docs"
        / "engine"
        / "research"
        / "2026-11-16"
        / "deep-research-5pillar-intelligence-maximization.md"
    )
    assert report_path.is_file()
    notion_path = (
        Path(__file__).resolve().parents[2]
        / "docs"
        / "engine"
        / "research"
        / "2026-11-16"
        / "notion-ready-5pillar-intelligence-report.md"
    )
    assert notion_path.is_file()

    # Verify healthy QB1_STARTER fix for Jared Goff (home) & realistic completion rates
    assert priors["home_qb_tier"] == "QB1_STARTER"
    assert lb["home_comp_rate_adj"] >= 0.62
    assert -0.45 <= lb["away_rush_ypc_adj_delta"] <= 0.45
    assert -0.45 <= lb["home_rush_ypc_adj_delta"] <= 0.45
    assert lb["away_q4_fatigue_decay"] < 0.0  # Munich 6h circadian travel flag


def test_vmls_kkt_simplex_conservation_and_player_multipliers() -> None:
    """VMLS KKT reconciler preserves non-negativity and exact sum-to-1.0 simplex conservation."""
    raw = {
        "Amon-Ra St. Brown": 72.0,
        "Jameson Williams": 48.0,
        "Sam LaPorta": 40.0,
        "OTHER_TEAM_REC": 25.0,
    }
    mults = {"Amon-Ra St. Brown": 1.035, "Jameson Williams": 0.96}
    solved = apply_vmls_kkt_and_corpus_shares(raw, mults)
    assert set(solved.keys()) == set(raw.keys())
    assert all(math.isfinite(v) and v > 0.0 for v in solved.values())
    assert abs(sum(solved.values()) - 1.0) < 1e-9


def test_fail_closed_when_corpus_pillar_missing() -> None:
    """assert_all_books_pdfs_ig_x_situational_wired must raise if any pillar is dropped."""
    import pytest

    bad_payload = {
        "books_and_pdfs_pillar": {"wired": True},
        "instagram_360_pillar": {"wired": False},
    }
    with pytest.raises(RuntimeError, match="STAGE2_PRE_SIM_CORPUS_WIRING_FAIL"):
        assert_all_books_pdfs_ig_x_situational_wired(bad_payload)


def test_pbp_simulator_responds_directly_to_stage2_load_bearing_priors() -> None:
    """simulate_matchup_pbp trajectories must shift with Stage-2 YPA, Rush YPC, and Comp Priors."""
    sealed_obj, sealed_hash = load_sealed_object_readonly()
    base_override = {
        "away_qb_tier": "QB1_STARTER",
        "home_qb_tier": "QB1_STARTER",
        "combined_load_bearing_priors": {
            "away_off_epa_adj": 0.04,
            "home_off_epa_adj": 0.04,
            "away_def_epa_adj": -0.02,
            "home_def_epa_adj": -0.02,
            "away_comp_rate_adj": 0.64,
            "home_comp_rate_adj": 0.64,
            "away_pass_rate_adj": 0.56,
            "home_pass_rate_adj": 0.56,
            "away_sack_prob_adj": 0.060,
            "home_sack_prob_adj": 0.060,
            "away_ypa_adj_delta": -0.80,
            "home_ypa_adj_delta": 0.0,
            "away_rush_ypc_adj_delta": -0.40,
            "home_rush_ypc_adj_delta": 0.40,
            "away_pace_sec_adj": 27.5,
            "home_pace_sec_adj": 27.5,
            "away_redzone_td_prob_delta": -0.04,
            "home_redzone_td_prob_delta": 0.04,
            "away_q4_fatigue_decay": -0.02,
            "home_q4_fatigue_decay": 0.0,
        },
        "away": {
            "qb_tier": "QB1_STARTER",
            "comp_rate_w1_w7": 0.64,
            "comp_rate_w6_w7": 0.64,
            "early_down_pass_rate": 0.56,
        },
        "home": {
            "qb_tier": "QB1_STARTER",
            "comp_rate_w1_w7": 0.64,
            "comp_rate_w6_w7": 0.64,
            "early_down_pass_rate": 0.56,
        },
    }
    boosted_override = {
        **base_override,
        "combined_load_bearing_priors": {
            **base_override["combined_load_bearing_priors"],
            "away_ypa_adj_delta": 0.90,
            "away_rush_ypc_adj_delta": 0.45,
        },
    }

    sim_low = simulate_matchup_pbp(
        away="KC",
        home="ATL",
        away_inj=[],
        home_inj=[],
        sealed_state=sealed_obj,
        expected_hash=sealed_hash,
        n_sims=600,
        seed=20261115,
        w1_w7_override=base_override,
        return_vectors=True,
    )
    sim_high = simulate_matchup_pbp(
        away="KC",
        home="ATL",
        away_inj=[],
        home_inj=[],
        sealed_state=sealed_obj,
        expected_hash=sealed_hash,
        n_sims=600,
        seed=20261115,
        w1_w7_override=boosted_override,
        return_vectors=True,
    )
    assert float(np.mean(sim_high["vectors"]["away_pass_yds"])) > float(
        np.mean(sim_low["vectors"]["away_pass_yds"])
    ) + 8.0
    assert float(np.mean(sim_high["vectors"]["away_rush_yds"])) > float(
        np.mean(sim_low["vectors"]["away_rush_yds"])
    ) + 5.0
    # Verify callable directly works without error
    assert callable(compile_all_books_pdfs_ig_x_and_situational_priors)


def test_wave12_intelligence_efficiency_and_snap_effectiveness() -> None:
    """Verify Wave 12 deep pillar telemetry, cached speed, and snap-level sim coupling."""
    assert hasattr(TeamPillarSignals, "__slots__")
    sig_sample = TeamPillarSignals(team="DET")
    with pytest.raises(FrozenInstanceError):
        sig_sample.team = "KC"  # type: ignore[misc]

    s0 = load_stage0_game_roster_allowlist("NE", "DET", week=10)
    s1a = run_stage1a_all_38_coaching_and_scheme_layers(s0)
    s1b = run_stage1b_all_5367_equations_pre_sim_review(s0, s1a)
    priors = compile_stage1_to_stage2_simulation_priors(
        s1a,
        s1b,
        game_context={"verified_board_athletes": s0["verified_board_athletes"]},
    )
    lb = priors["combined_load_bearing_priors"]

    # Pillar 1: Books & PDFs deep kernels + Hidden Game empirical points
    bp = lb["books_and_pdfs_pillar"]
    assert bp["wave8_local_pdfs_wired"] == 36
    assert bp["wave8_github_repos_wired"] == 77
    assert math.isfinite(float(bp["sogge_wind_deflection_yds"]))
    assert 0.0 <= float(bp["radial_collapse_prob"]) <= 1.0
    assert 0.0 <= float(bp["amplitude_damping_retention"]) <= 1.0
    assert 0.0 <= float(bp["cnf_conjunction_satisfaction_prob"]) <= 1.0
    assert math.isfinite(float(bp["away_hidden_game_points_pg"]))
    assert math.isfinite(float(bp["home_hidden_game_points_pg"]))
    rrf = bp["hybrid_rrf_corpus_and_arxiv"]
    assert rrf["fusion_method"] == "reciprocal_rank_fusion_3way_k60"
    assert int(rrf["lessons_ledger_indexed"]) >= 20
    assert int(bp["foundry_books_swept_count"]) >= 12000
    assert int(bp["foundry_primitives_indexed_count"]) >= 40000
    assert int(rrf["candidates_evaluated"]) >= 1200

    # Pillar 3: X 2026 PBP Q41..Q51 & 12-law numerical priors
    xp = lb["x_twitter_pillar"]
    assert math.isfinite(float(xp["away_q41_scripted_epa_delta"]))
    assert math.isfinite(float(xp["home_q41_scripted_epa_delta"]))
    assert math.isfinite(float(xp["away_q44_neutral_wp_epa"]))
    assert math.isfinite(float(xp["home_q44_neutral_wp_epa"]))
    assert math.isfinite(float(xp["away_q46_scramble_net_sack_epa"]))
    assert math.isfinite(float(xp["home_q46_scramble_net_sack_epa"]))
    assert math.isfinite(float(xp["away_q49_toxic_differential"]))
    assert math.isfinite(float(xp["home_q49_toxic_differential"]))
    assert 0.0 <= float(xp["away_q51_target_success_rate"]) <= 1.0
    assert 0.0 <= float(xp["home_q51_target_success_rate"]) <= 1.0
    assert 0.0 <= float(xp["layer2_pressure_disruption_prob"]) <= 1.0
    assert isinstance(xp["layer2_stage5_command"], str)
    assert math.isfinite(float(bp["away_tukey_fenced_epa_delta"]))
    assert math.isfinite(float(bp["ollivier_ricci_curvature_kappa"]))
    assert math.isfinite(float(bp["coaching_fiedler_lambda2"]))
    ig = lb["instagram_360_pillar"]
    assert 0.20 <= float(ig["away_patton_surv_2_5s"]) <= 0.95
    assert 0.05 <= float(ig["away_patton_p2s_rate"]) <= 0.50
    assert float(xp["away_pressure_epa_cost"]) >= 0.0
    assert float(xp["away_first_downs_donated_pg"]) >= 0.0
    cc = lb["contextual_coaching_pillar"]
    assert math.isfinite(float(cc["away_dire_survival_gap"]))
    assert 0.0 <= float(cc["away_injury_concealment_stress"]) <= 1.0

    # Pillar 4: GDrive/OneDrive numerical priors + Barber-Romano CQR + RB multipliers
    sp = lb["situational_279_pillar"]
    assert math.isfinite(float(sp["gdrive_fg_make_prob_delta"]))
    assert float(sp["gdrive_cqr_interval_width_mult"]) >= 0.5
    assert 0.92 <= float(sp["barber_romano_cqr_width_mult"]) <= 1.30
    assert float(sp["barber_effective_sample_n"]) > 0.0
    rb_names = [
        nm
        for nm, inf in s0["verified_board_athletes"].items()
        if str(inf.get("position") or "").upper() == "RB"
    ]
    mults = lb["player_target_and_carry_multipliers"]
    assert -0.44 < float(lb["away_rush_ypc_adj_delta"]) < 0.44
    assert -0.44 < float(lb["home_rush_ypc_adj_delta"]) < 0.44
    assert rb_names and any(0.95 < float(mults.get(nm, 1.0)) < 1.06 for nm in rb_names)

    # Warm efficiency benchmark: full repo 279-matrix + 5-pillar compile < 0.25s
    x_ig_360 = priors["x_and_ig_360_charting"]
    full_279 = priors["full_repo_279_family_situational_matrix"]
    gdrive_ov = priors["google_drive_and_onedrive_omni_overlay"]
    uncomp_25k = priors["uncompressed_25k_repo_books_papers_routes_bridge"]
    x_l2 = priors["x_situational_layer2_overlay"]
    q_reg = priors["q1_to_q51_feature_registry"]
    env_cfg = {"wind_mph": priors["weather_wind_mph"], "posted_home_spread": -2.5}
    pbp_ftn_32: dict[str, dict[str, float]] = {}
    _ = run_full_repo_situational_reasoning_engine({"away_team": "NE", "home_team": "DET"})
    t0 = time.perf_counter()
    _ = run_full_repo_situational_reasoning_engine({"away_team": "NE", "home_team": "DET"})
    _ = compile_all_books_pdfs_ig_x_and_situational_priors(
        away_team="NE",
        home_team="DET",
        week=10,
        merged_game_context=s0,
        stage1a_receipt=s1a,
        stage1b_receipt=s1b,
        pbp_ftn_32=pbp_ftn_32,
        x_and_ig_360_charting=x_ig_360,
        full_repo_situational=full_279,
        gdrive_onedrive_overlay=gdrive_ov,
        uncompressed_25k_bridge=uncomp_25k,
        x_layer2_overlay=x_l2,
        q1_to_q51_registry=q_reg,
        env_cfg=env_cfg,
        verified_athletes_map=s0["verified_board_athletes"],
    )
    elapsed_warm = time.perf_counter() - t0
    assert elapsed_warm < 0.25, f"Warm compile + 279-matrix too slow: {elapsed_warm:.3f}s"

    # Effectiveness: Snap-by-snap simulator responds to Q41 opener, Dire conv, Script Elasticity
    sealed_obj, sealed_hash = load_sealed_object_readonly()
    common_team = {
        "qb_tier": "QB1_STARTER",
        "comp_rate_w1_w7": 0.65,
        "comp_rate_w6_w7": 0.65,
        "early_down_pass_rate": 0.56,
    }
    base_priors = {
        "away_off_epa_adj": 0.08,
        "home_off_epa_adj": 0.02,
        "away_def_epa_adj": -0.02,
        "home_def_epa_adj": 0.0,
        "away_comp_rate_adj": 0.65,
        "home_comp_rate_adj": 0.63,
        "away_pass_rate_adj": 0.56,
        "home_pass_rate_adj": 0.54,
        "away_sack_prob_adj": 0.058,
        "home_sack_prob_adj": 0.064,
        "away_ypa_adj_delta": 0.0,
        "home_ypa_adj_delta": 0.0,
        "away_rush_ypc_adj_delta": 0.0,
        "home_rush_ypc_adj_delta": 0.0,
        "away_pace_sec_adj": 27.0,
        "home_pace_sec_adj": 27.5,
        "away_redzone_td_prob_delta": 0.0,
        "home_redzone_td_prob_delta": 0.0,
        "away_q4_fatigue_decay": 0.0,
        "home_q4_fatigue_decay": 0.0,
        "away_q41_scripted_epa_delta": -0.12,
        "home_q41_scripted_epa_delta": 0.0,
        "away_dire_score_rate": 0.14,
        "home_dire_score_rate": 0.24,
        "away_script_elasticity": -0.26,
        "home_script_elasticity": -0.15,
    }
    elite_priors = {
        **base_priors,
        "away_q41_scripted_epa_delta": 0.18,
        "away_dire_score_rate": 0.38,
        "away_script_elasticity": -0.04,
    }
    sim_base = simulate_matchup_pbp(
        away="KC",
        home="ATL",
        away_inj=[],
        home_inj=[],
        sealed_state=sealed_obj,
        expected_hash=sealed_hash,
        n_sims=800,
        seed=20261116,
        w1_w7_override={
            "away_qb_tier": "QB1_STARTER",
            "home_qb_tier": "QB1_STARTER",
            "combined_load_bearing_priors": base_priors,
            "away": dict(common_team),
            "home": dict(common_team),
        },
        return_vectors=True,
    )
    sim_elite = simulate_matchup_pbp(
        away="KC",
        home="ATL",
        away_inj=[],
        home_inj=[],
        sealed_state=sealed_obj,
        expected_hash=sealed_hash,
        n_sims=800,
        seed=20261116,
        w1_w7_override={
            "away_qb_tier": "QB1_STARTER",
            "home_qb_tier": "QB1_STARTER",
            "combined_load_bearing_priors": elite_priors,
            "away": dict(common_team),
            "home": dict(common_team),
        },
        return_vectors=True,
    )
    assert (
        float(np.mean(sim_elite["vectors"]["away_pass_yds"]))
        > float(np.mean(sim_base["vectors"]["away_pass_yds"])) + 3.0
    )
    assert float(np.mean(sim_elite["vectors"]["away_score"])) > float(
        np.mean(sim_base["vectors"]["away_score"])
    )
