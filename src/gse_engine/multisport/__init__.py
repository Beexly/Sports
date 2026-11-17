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

__all__ = [
    "BcAciState",
    "CopulaLegSpec",
    "DirectionalBcAciState",
    "ESPN_SCOREBOARD_ENDPOINTS",
    "build_dixon_coles_pmf",
    "compute_frechet_hoeffding_joint_bounds",
    "evaluate_multisport_sabermetrics_and_pitch_control_overlay",
    "fetch_365_day_five_league_slate",
    "fetch_live_multisport_slate",
    "main",
    "predict_bc_aci_band",
    "predict_directional_bc_aci_band",
    "price_copula_conformal_sgp",
    "render_multisport_daily_card",
    "run_all_sports_unified_situational_simulation_suite",
    "simulate_multisport_matchup_10k",
    "update_bc_aci_interval",
    "update_directional_bc_aci_interval",
]


def __getattr__(name: str) -> Any:
    """Lazily resolve exports so ``python -m ...daily_multisport_slate_engine`` stays clean."""
    if name in __all__:
        from gse_engine.multisport import daily_multisport_slate_engine

        return getattr(daily_multisport_slate_engine, name)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
