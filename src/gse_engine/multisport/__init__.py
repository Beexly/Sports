"""Multi-sport daily slate engine with BC-ACI and CopulaCPTS."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from gse_engine.multisport.daily_multisport_slate_engine import (
        ESPN_SCOREBOARD_ENDPOINTS,
        BcAciState,
        CopulaLegSpec,
        DirectionalBcAciState,
        build_dixon_coles_pmf,
        compute_frechet_hoeffding_joint_bounds,
        evaluate_multisport_sabermetrics_and_pitch_control_overlay,
        fetch_365_day_five_league_slate,
        fetch_live_multisport_slate,
        main,
        predict_bc_aci_band,
        predict_directional_bc_aci_band,
        price_copula_conformal_sgp,
        render_multisport_daily_card,
        run_all_sports_unified_situational_simulation_suite,
        simulate_multisport_matchup_10k,
        update_bc_aci_interval,
        update_directional_bc_aci_interval,
    )
    from gse_engine.multisport.wave40_universal_sports_metrics_encyclopedia_and_handicap_engine import (  # noqa: E501
        UNIVERSAL_SPORTS_METRICS_REGISTRY,
        WAVE40_MULTISPORT_RLVR_TRAJECTORIES,
        SportMetricSpec,
        evaluate_cfb_nba_golf_mma_metrics_suite,
        evaluate_mlb_statcast_barrel_and_pitch_arsenal,
        evaluate_nhl_special_teams_ppp_and_penalty_play,
        evaluate_soccer_corner_kicks_and_asian_handicap,
        evaluate_tennis_markov_game_and_set_handicaps,
        evaluate_wave40_universal_multisport_metrics_suite,
        query_universal_sport_metric,
    )
    from gse_engine.multisport.wave41_f1_pit_strategy_nba_pra_copula_and_14sport_expansion import (  # noqa: E501
        UNIVERSAL_14SPORT_METRICS_REGISTRY,
        WAVE41_14SPORT_EXTENSION_METRICS,
        WAVE41_MULTISPORT_RLVR_TRAJECTORIES,
        evaluate_f1_stint_degradation_and_undercut_window,
        evaluate_nba_pra_negbin_copula_propsim,
        evaluate_wave41_14sport_and_copula_propsim_suite,
        query_14sport_universal_metric,
    )

_WAVE40_EXPORTS: frozenset[str] = frozenset(
    {
        "SportMetricSpec",
        "UNIVERSAL_SPORTS_METRICS_REGISTRY",
        "WAVE40_MULTISPORT_RLVR_TRAJECTORIES",
        "evaluate_cfb_nba_golf_mma_metrics_suite",
        "evaluate_mlb_statcast_barrel_and_pitch_arsenal",
        "evaluate_nhl_special_teams_ppp_and_penalty_play",
        "evaluate_soccer_corner_kicks_and_asian_handicap",
        "evaluate_tennis_markov_game_and_set_handicaps",
        "evaluate_wave40_universal_multisport_metrics_suite",
        "query_universal_sport_metric",
    }
)

_WAVE41_EXPORTS: frozenset[str] = frozenset(
    {
        "UNIVERSAL_14SPORT_METRICS_REGISTRY",
        "WAVE41_14SPORT_EXTENSION_METRICS",
        "WAVE41_MULTISPORT_RLVR_TRAJECTORIES",
        "evaluate_f1_stint_degradation_and_undercut_window",
        "evaluate_nba_pra_negbin_copula_propsim",
        "evaluate_wave41_14sport_and_copula_propsim_suite",
        "query_14sport_universal_metric",
    }
)

__all__ = [
    "BcAciState",
    "CopulaLegSpec",
    "DirectionalBcAciState",
    "ESPN_SCOREBOARD_ENDPOINTS",
    "SportMetricSpec",
    "UNIVERSAL_14SPORT_METRICS_REGISTRY",
    "UNIVERSAL_SPORTS_METRICS_REGISTRY",
    "WAVE40_MULTISPORT_RLVR_TRAJECTORIES",
    "WAVE41_14SPORT_EXTENSION_METRICS",
    "WAVE41_MULTISPORT_RLVR_TRAJECTORIES",
    "build_dixon_coles_pmf",
    "compute_frechet_hoeffding_joint_bounds",
    "evaluate_cfb_nba_golf_mma_metrics_suite",
    "evaluate_f1_stint_degradation_and_undercut_window",
    "evaluate_mlb_statcast_barrel_and_pitch_arsenal",
    "evaluate_multisport_sabermetrics_and_pitch_control_overlay",
    "evaluate_nba_pra_negbin_copula_propsim",
    "evaluate_nhl_special_teams_ppp_and_penalty_play",
    "evaluate_soccer_corner_kicks_and_asian_handicap",
    "evaluate_tennis_markov_game_and_set_handicaps",
    "evaluate_wave40_universal_multisport_metrics_suite",
    "evaluate_wave41_14sport_and_copula_propsim_suite",
    "fetch_365_day_five_league_slate",
    "fetch_live_multisport_slate",
    "main",
    "predict_bc_aci_band",
    "predict_directional_bc_aci_band",
    "price_copula_conformal_sgp",
    "query_14sport_universal_metric",
    "query_universal_sport_metric",
    "render_multisport_daily_card",
    "run_all_sports_unified_situational_simulation_suite",
    "simulate_multisport_matchup_10k",
    "update_bc_aci_interval",
    "update_directional_bc_aci_interval",
]


def __getattr__(name: str) -> Any:
    """Lazily resolve exports so ``python -m ...daily_multisport_slate_engine`` stays clean."""
    if name in _WAVE40_EXPORTS:
        from gse_engine.multisport import (
            wave40_universal_sports_metrics_encyclopedia_and_handicap_engine,
        )

        return getattr(
            wave40_universal_sports_metrics_encyclopedia_and_handicap_engine,
            name,
        )
    if name in _WAVE41_EXPORTS:
        from gse_engine.multisport import (
            wave41_f1_pit_strategy_nba_pra_copula_and_14sport_expansion,
        )

        return getattr(
            wave41_f1_pit_strategy_nba_pra_copula_and_14sport_expansion,
            name,
        )
    if name in __all__:
        from gse_engine.multisport import daily_multisport_slate_engine

        return getattr(daily_multisport_slate_engine, name)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
