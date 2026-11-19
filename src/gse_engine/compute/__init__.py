"""Core numerical physics, vacated-volume conservation, and DFS modules."""

from __future__ import annotations

from gse_engine.compute.dfs_optimizer import build_dfs_lineup, filter_cash_eligible_players
from gse_engine.compute.qb_physics import project_qb_rushing
from gse_engine.compute.volume_conservation import reallocate_vacated_volume
from gse_engine.compute.wave32_unified_sports_situational_live_fusion import (
    evaluate_wave32_unified_sports_situational_live_fusion,
    fuse_universal_sports_stat_engineering_vaults,
    load_nov15_44_csv_situational_sweep,
    optimize_all_2026_player_and_settled_projections,
    run_wave32_historical_nfl_and_all_sports_simulation_benchmark,
)

__all__ = [
    "build_dfs_lineup",
    "evaluate_wave32_unified_sports_situational_live_fusion",
    "filter_cash_eligible_players",
    "fuse_universal_sports_stat_engineering_vaults",
    "load_nov15_44_csv_situational_sweep",
    "optimize_all_2026_player_and_settled_projections",
    "project_qb_rushing",
    "reallocate_vacated_volume",
    "run_wave32_historical_nfl_and_all_sports_simulation_benchmark",
]
