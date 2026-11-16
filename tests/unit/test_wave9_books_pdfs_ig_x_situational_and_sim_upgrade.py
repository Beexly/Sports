"""Wave 9 unit tests for unified Books/PDFs/IG/X/Situational wiring and PBP sim upgrades."""

from __future__ import annotations

import math

import numpy as np

from gse_engine.compute.corpus_situational_integrator import (
    apply_vmls_kkt_and_corpus_shares,
    assert_all_books_pdfs_ig_x_situational_wired,
    compile_all_books_pdfs_ig_x_and_situational_priors,
    hybrid_rrf_corpus_and_arxiv_retriever,
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
    rrf = lb["books_and_pdfs_pillar"]["hybrid_rrf_corpus_and_arxiv"]
    assert rrf["candidates_evaluated"] >= 877
    assert rrf["rrf_coherence_score"] > 0.0
    assert len(rrf["top_fused_citations"]) == 8
    assert callable(hybrid_rrf_corpus_and_arxiv_retriever)
    assert lb["instagram_360_pillar"]["all_32_teams_360_charting"] is True
    assert lb["x_twitter_pillar"]["x_sweep_5_mechanisms_executed"] is True
    assert lb["situational_279_pillar"]["equation_families_count"] == 279
    assert lb["contextual_coaching_pillar"]["wired"] is True

    # Verify healthy QB1_STARTER fix for Jared Goff (home) & realistic completion rates
    assert priors["home_qb_tier"] == "QB1_STARTER"
    assert lb["home_comp_rate_adj"] >= 0.62
    assert -0.45 <= lb["away_rush_ypc_adj_delta"] <= 0.45
    assert -0.45 <= lb["home_rush_ypc_adj_delta"] <= 0.45
    assert lb["away_q4_fatigue_decay"] < 0.0  # Munich 6h circadian travel flag


def test_vmls_kkt_simplex_conservation_and_player_multipliers() -> None:
    """VMLS KKT reconciler preserves non-negativity and exact sum-to-1.0 simplex conservation."""
    raw = {"Amon-Ra St. Brown": 72.0, "Jameson Williams": 48.0, "Sam LaPorta": 40.0, "OTHER_TEAM_REC": 25.0}
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
        "away": {"qb_tier": "QB1_STARTER", "comp_rate_w1_w7": 0.64, "comp_rate_w6_w7": 0.64, "early_down_pass_rate": 0.56},
        "home": {"qb_tier": "QB1_STARTER", "comp_rate_w1_w7": 0.64, "comp_rate_w6_w7": 0.64, "early_down_pass_rate": 0.56},
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
