from __future__ import annotations

from gse_engine.compute.wave32_unified_sports_situational_live_fusion import (
    load_all_analytics_sweep_tables_as_of,
)
from gse_engine.workflows.unified_reasoning_simulation_projection_spine import (
    evaluate_vault_hydrated_unified_spine_matchup,
    hydrate_causal_matchup_context_from_vaults,
)


def test_unified_spine_hydrates_week11_tnf_with_real_stage0_and_injuries() -> None:
    ctx = hydrate_causal_matchup_context_from_vaults(
        away_team="IND",
        home_team="HOU",
        as_of_week=11,
        env_override="11",
    )
    assert int(ctx["as_of_week"]) == 11
    assert int(ctx["stage0_week"]) == 11, "Spine silently fell back to Week 10 Stage-0"
    assert int(ctx["injury_rows_scanned"]) > 0, "Spine skipped Week 11 injuries (as_of_week <= 10)"
    assert (
        ctx["schedule_source"] != "synthetic_default"
    ), "Spine fell back to synthetic 2.5/45.5 line"


def test_unified_spine_layer1_market_anchoring_week11_games() -> None:
    ind_hou = evaluate_vault_hydrated_unified_spine_matchup(
        away_team="IND",
        home_team="HOU",
        as_of_week=11,
        env_override="11",
        n_worlds=1000,
    )
    env_ih = ind_hou["stage2_reasoned_environment"]
    sim_ih = ind_hou["stage3_simulation_summary"]
    assert abs(float(env_ih["market_total"]) - float(sim_ih["total_score_mean"])) <= 4.0
    assert float(sim_ih["home_score_mean"]) > float(sim_ih["away_score_mean"]) + 7.5
    assert float(ind_hou["max_world_conservation_residual"]) == 0.0
    assert int(ind_hou["orphaned_non_simulated_projections"]) == 0

    ten_dal = evaluate_vault_hydrated_unified_spine_matchup(
        away_team="TEN",
        home_team="DAL",
        as_of_week=11,
        env_override="11",
        n_worlds=1000,
    )
    env_td = ten_dal["stage2_reasoned_environment"]
    sim_td = ten_dal["stage3_simulation_summary"]
    assert abs(float(env_td["market_total"]) - float(sim_td["total_score_mean"])) <= 4.0
    assert float(sim_td["total_score_mean"]) >= 50.0
    assert float(sim_td["home_score_mean"]) > float(sim_td["away_score_mean"]) + 4.5


def test_wave32_ingests_nov16_to_18_csvs_respecting_bitemporal_cutoff() -> None:
    w10_tables = load_all_analytics_sweep_tables_as_of(as_of_date="2026-11-15")
    w11_tables = load_all_analytics_sweep_tables_as_of(as_of_date="2026-11-18")
    assert len(w10_tables) >= 40
    assert (
        len(w11_tables) >= 140
    ), f"Expected >= 140 tables through 2026-11-18, got {len(w11_tables)}"
    assert len(w11_tables) > len(w10_tables)
