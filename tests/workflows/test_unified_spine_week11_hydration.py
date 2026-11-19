from __future__ import annotations

from gse_engine.compute.wave32_unified_sports_situational_live_fusion import (
    load_all_analytics_sweep_tables_as_of,
)
from gse_engine.workflows.unified_reasoning_simulation_projection_spine import (
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


def test_wave32_ingests_nov16_to_18_csvs_respecting_bitemporal_cutoff() -> None:
    w10_tables = load_all_analytics_sweep_tables_as_of(as_of_date="2026-11-15")
    w11_tables = load_all_analytics_sweep_tables_as_of(as_of_date="2026-11-18")
    assert len(w10_tables) >= 40
    assert (
        len(w11_tables) >= 140
    ), f"Expected >= 140 tables through 2026-11-18, got {len(w11_tables)}"
    assert len(w11_tables) > len(w10_tables)
