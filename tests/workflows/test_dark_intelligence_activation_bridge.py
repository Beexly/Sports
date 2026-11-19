from __future__ import annotations

from gse_engine.workflows.dark_intelligence_activation_bridge import (
    evaluate_dark_intelligence_pack_for_matchup,
    list_activated_crown_jewels,
)


def test_crown_jewel_modules_are_registered_and_executable() -> None:
    activated = list_activated_crown_jewels()
    required = {
        "rqmc_tilting_and_regimes",
        "rvine_sgp_copula",
        "skfolio_allocator",
        "lineup_doctor",
        "etkf_dma_bus",
        "biomech_and_ballistics",
        "neural_calibration_and_attention",
        "matchup_prose",
        "foundry_compound_miner",
        "worker_daemon",
        "teammate_routines",
        "cache_and_sandbox_governor",
        "vision_and_geofence",
        "gcp_warehouse",
        "kantorovich_mmot",
        "galaxy_conformal_ot",
        "intelligence_props_suite",
        "intelligence_dfs_suite",
        "intelligence_ratings_suite",
        "intelligence_totals_audit_suite",
        "intelligence_week10_engines_suite",
    }
    missing = required - set(activated)
    assert not missing, f"Dark crown jewels still unwired: {sorted(missing)}"


def test_dark_intelligence_pack_executes_cleanly_for_week11_tnf_with_ruo_and_stake_locks() -> None:
    out = evaluate_dark_intelligence_pack_for_matchup(
        away_team="IND",
        home_team="HOU",
        as_of_week=11,
        spread_home=-12.5,
        total_line=43.5,
        env_override="11",
    )
    assert out["schema"] == "gse.dark_intelligence.activation_pack.v1"
    assert float(out["rvine_sgp"]["min_corr_eigenvalue"]) > 0.0
    assert float(out["rqmc_lattice"]["dynamic_kickoff_return_prob"]) > 0.5
    assert out["etkf_dma"]["state_dim"] == 312
    assert out["mmot_certificate"]["birkhoff_valid"] is True
    assert out["skfolio_rd"]["total_live_stake"] == 0.0
    assert out["skfolio_rd"]["calibration_adjustments_enabled"] is False
    assert out["clinical_ruo_sports_weight"] == 0.0
    assert len(out["activated_modules"]) >= 21
    assert int(out["dfs_props_helpers"]["dfs19_equations_active"]) >= 19
    assert float(out["dfs_props_helpers"]["rank_centrality_top"]) > 0.0
    assert float(out["dfs_props_helpers"]["prop_mixture_p50"]) > 10.0
    assert float(out["mmot_certificate"]["schrodinger_kl_cost"]) >= 0.0
