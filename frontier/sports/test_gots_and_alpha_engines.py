"""
Comprehensive Unit & Benchmark Tests for:
1. Shootout Velocity Index & Game Script Urgency Engine
2. Alpha WR Target Ceiling & Duress Funnel Engine
3. CP-SAT GPP Game-Stack Optimizer with SVI Portfolio Quotas
"""

import math
import numpy as np
import pytest

from shootout_velocity_engine import ShootoutVelocityEngine, GameContext
from alpha_target_ceiling_engine import (
    AlphaTargetCeilingEngine, ReceiverProfile, OpponentDuressContext
)
from gpp_game_stack_optimizer import (
    GPPGameStackOptimizer, DfsPlayerEntry, GameEnvironment
)

# ==============================================================================
# TEST SUITE 1: Shootout Velocity Index & Clock Mechanics
# ==============================================================================

def test_bilateral_pli_harmonic_mean():
    # If one team has 0 stakes, bilateral PLI is zero
    assert ShootoutVelocityEngine.calculate_bilateral_pli(0.30, 0.0) == 0.0
    # Symmetric high stakes
    pli = ShootoutVelocityEngine.calculate_bilateral_pli(0.30, 0.30)
    assert abs(pli - 0.30) < 1e-3

def test_rivalry_factor_in_state():
    # In-state Texas game: distance 240 miles
    r_in_state = ShootoutVelocityEngine.calculate_rivalry_factor(
        is_in_state=True, is_divisional=False, distance_miles=240.0
    )
    # Generic non-rivalry: 1000 miles away
    r_far = ShootoutVelocityEngine.calculate_rivalry_factor(
        is_in_state=False, is_divisional=False, distance_miles=1000.0
    )
    assert r_in_state > r_far
    assert r_in_state >= 1.50

def test_cowboys_texans_svi_ranking():
    cowboys_texans = GameContext(
        game_id="DAL_HOU", team_a="DAL", team_b="HOU",
        over_under=49.5, spread=2.5, is_dome=True, wind_mph=0.0,
        delta_p_playoffs_a=0.28, delta_p_playoffs_b=0.31,
        is_in_state=True, is_divisional=False, distance_miles=240.0,
        proe_a=0.06, proe_b=0.05,
        sec_per_snap_a=25.8, sec_per_snap_b=25.5,
        explosive_pass_rate_a=0.14, explosive_pass_rate_b=0.13,
        pass_funnel_rating_a=1.2, pass_funnel_rating_b=1.1,
        wr1_target_share_a=0.32, wr2_target_share_a=0.19,
        wr1_target_share_b=0.30, wr2_target_share_b=0.20,
        fourth_down_aggression_a=1.25, fourth_down_aggression_b=1.20
    )
    
    outdoor_slugfest = GameContext(
        game_id="PIT_CLE", team_a="PIT", team_b="CLE",
        over_under=38.0, spread=3.0, is_dome=False, wind_mph=18.0,
        delta_p_playoffs_a=0.15, delta_p_playoffs_b=0.12,
        is_in_state=False, is_divisional=True, distance_miles=130.0,
        proe_a=-0.06, proe_b=-0.05,
        sec_per_snap_a=29.5, sec_per_snap_b=29.0,
        explosive_pass_rate_a=0.07, explosive_pass_rate_b=0.06,
        pass_funnel_rating_a=-0.4, pass_funnel_rating_b=-0.3,
        wr1_target_share_a=0.24, wr2_target_share_a=0.17,
        wr1_target_share_b=0.22, wr2_target_share_b=0.16
    )

    svi_dal_hou = ShootoutVelocityEngine.compute_svi(cowboys_texans)
    svi_pit_cle = ShootoutVelocityEngine.compute_svi(outdoor_slugfest)

    assert svi_dal_hou >= 95.0, f"Expected SVI >= 95 for DAL@HOU, got {svi_dal_hou}"
    assert svi_pit_cle <= 15.0, f"Expected SVI <= 15 for PIT@CLE, got {svi_pit_cle}"

def test_clock_stoppage_expansion():
    cowboys_texans = GameContext(
        game_id="DAL_HOU", team_a="DAL", team_b="HOU",
        over_under=49.5, spread=2.5, is_dome=True, wind_mph=0.0,
        delta_p_playoffs_a=0.28, delta_p_playoffs_b=0.31,
        is_in_state=True, is_divisional=False, distance_miles=240.0,
        proe_a=0.06, proe_b=0.05,
        sec_per_snap_a=25.8, sec_per_snap_b=25.5,
        explosive_pass_rate_a=0.14, explosive_pass_rate_b=0.13,
        pass_funnel_rating_a=1.2, pass_funnel_rating_b=1.1,
        wr1_target_share_a=0.32, wr2_target_share_a=0.19,
        wr1_target_share_b=0.30, wr2_target_share_b=0.20
    )
    sim = ShootoutVelocityEngine.simulate_clock_expansion(cowboys_texans, n_sims=500)
    assert sim["mean_total_plays"] > 140.0, f"Expected >140 plays, got {sim['mean_total_plays']}"
    assert sim["mean_pass_attempts_a"] > 40.0

# ==============================================================================
# TEST SUITE 2: Alpha WR Target Ceiling & Duress Funnel
# ==============================================================================

def test_wopr_calculation():
    # CeeDee Lamb: 32% TS, 44% AY
    wopr_lamb = AlphaTargetCeilingEngine.calculate_wopr(0.32, 0.44)
    assert abs(wopr_lamb - 0.788) < 1e-3
    assert wopr_lamb >= 0.70  # Elite Alpha status

def test_ceedee_lamb_duress_ceiling_simulation():
    lamb = ReceiverProfile(
        player_id="lamb", name="CeeDee Lamb", team="DAL",
        target_share=0.32, air_yard_share=0.44, first_read_share=0.38,
        tprr=0.32, route_participation=0.96, adot=8.8,
        catch_rate=0.72, yards_per_rec_mu=2.42, yards_per_rec_sigma=0.52,
        red_zone_share=0.35, slot_rate=0.45
    )
    
    # Houston pass rush context (Will Anderson + Danielle Hunter)
    houston_defense = OpponentDuressContext(
        opp_team="HOU", edge_prwr=0.28, ot_pbwr=0.62,
        blitz_rate=0.32, qb_time_to_throw=2.58,
        team_projected_dropbacks=44.0, spread=2.5, team_hhi=0.18
    )

    cfs = AlphaTargetCeilingEngine.calculate_ceiling_funnel_score(lamb, houston_defense)
    assert cfs["cfs"] >= 80.0, f"Expected CFS >= 80.0 for Lamb, got {cfs['cfs']}"
    assert cfs["psi_funnel"] > 1.30, f"Expected duress lock-in psi > 1.30, got {cfs['psi_funnel']}"

    sim = AlphaTargetCeilingEngine.simulate_gpp_right_tail(lamb, houston_defense, n_sims=3000)
    # Verify that the 18 targets CeeDee received is within the 75th-95th percentile right tail
    assert sim["targets"]["p75"] >= 16.0
    assert sim["targets"]["p95"] >= 20.0
    assert sim["targets"]["max"] >= 25
    # Right-tail fantasy scoring
    assert sim["dk_points"]["p90"] >= 45.0

# ==============================================================================
# TEST SUITE 3: CP-SAT GPP Game-Stack Optimizer
# ==============================================================================

def test_gpp_optimizer_enforces_runback_and_gots_exposure():
    games = [
        GameEnvironment("DAL_HOU", "DAL", "HOU", 49.5, 2.5, True, svi_score=99.8),
        GameEnvironment("DET_MIN", "DET", "MIN", 51.0, 2.0, True, svi_score=98.5),
        GameEnvironment("PIT_CLE", "PIT", "CLE", 38.0, 3.0, False, svi_score=3.5),
    ]

    players = [
        # DAL@HOU
        DfsPlayerEntry("dak", "Dak Prescott", "QB", "DAL", "HOU", "DAL_HOU", 7500, 21.0, 38.0, 0.12, wopr=0.0, cfs=0.0),
        DfsPlayerEntry("lamb", "CeeDee Lamb", "WR", "DAL", "HOU", "DAL_HOU", 8800, 20.5, 42.0, 0.18, wopr=0.79, cfs=90.0),
        DfsPlayerEntry("ferg", "Jake Ferguson", "TE", "DAL", "HOU", "DAL_HOU", 4800, 11.5, 24.0, 0.08, wopr=0.45, cfs=55.0),
        DfsPlayerEntry("collins", "Nico Collins", "WR", "HOU", "DAL", "DAL_HOU", 7600, 18.0, 36.0, 0.14, wopr=0.72, cfs=75.0),
        DfsPlayerEntry("mixon", "Joe Mixon", "RB", "HOU", "DAL", "DAL_HOU", 6800, 16.0, 28.0, 0.15),
        DfsPlayerEntry("dowdle", "Rico Dowdle", "RB", "DAL", "HOU", "DAL_HOU", 5400, 11.0, 22.0, 0.06),

        # DET@MIN
        DfsPlayerEntry("goff", "Jared Goff", "QB", "DET", "MIN", "DET_MIN", 6400, 18.5, 32.0, 0.09),
        DfsPlayerEntry("arsb", "Amon-Ra St. Brown", "WR", "DET", "MIN", "DET_MIN", 8200, 19.5, 39.0, 0.16, wopr=0.75, cfs=85.0),
        DfsPlayerEntry("jefferson", "Justin Jefferson", "WR", "MIN", "DET", "DET_MIN", 8600, 21.0, 43.0, 0.20, wopr=0.82, cfs=92.0),
        DfsPlayerEntry("gibbs", "Jahmyr Gibbs", "RB", "DET", "MIN", "DET_MIN", 7200, 17.5, 34.0, 0.15),
        DfsPlayerEntry("hock", "TJ Hockenson", "TE", "MIN", "DET", "DET_MIN", 5000, 11.0, 22.0, 0.07),

        # Value players
        DfsPlayerEntry("chubb", "Nick Chubb", "RB", "CLE", "PIT", "PIT_CLE", 5600, 12.0, 20.0, 0.10),
        DfsPlayerEntry("harris", "Najee Harris", "RB", "PIT", "CLE", "PIT_CLE", 5500, 11.5, 19.0, 0.08),
        DfsPlayerEntry("allgeier", "Tyler Allgeier", "RB", "ATL", "NO", "ATL_NO", 4200, 9.0, 18.0, 0.06),
        DfsPlayerEntry("pickens", "George Pickens", "WR", "PIT", "CLE", "PIT_CLE", 5800, 12.5, 26.0, 0.11),
        DfsPlayerEntry("tolbert", "Jalen Tolbert", "WR", "DAL", "HOU", "DAL_HOU", 3800, 9.5, 18.0, 0.05),
        DfsPlayerEntry("rayray", "Ray-Ray McCloud", "WR", "ATL", "NO", "ATL_NO", 3400, 8.5, 16.0, 0.04),
        DfsPlayerEntry("whittington", "Jordan Whittington", "WR", "LAR", "CHI", "LAR_CHI", 3600, 9.0, 17.0, 0.07),
        DfsPlayerEntry("stover", "Cade Stover", "TE", "HOU", "DAL", "DAL_HOU", 2800, 6.0, 12.0, 0.03),
        DfsPlayerEntry("strange", "Brenton Strange", "TE", "JAX", "TEN", "JAX_TEN", 3100, 7.5, 14.0, 0.05),
        DfsPlayerEntry("dst_cle", "Browns DST", "DST", "CLE", "PIT", "PIT_CLE", 2800, 7.5, 16.0, 0.08),
        DfsPlayerEntry("dst_pit", "Steelers DST", "DST", "PIT", "CLE", "PIT_CLE", 3000, 8.0, 17.0, 0.09),
    ]

    opt = GPPGameStackOptimizer(players, games)
    portfolio = opt.solve_portfolio(n_lineups=3, top_gots_min_exposure=0.66)

    assert len(portfolio) == 3, f"Expected 3 lineups, got {len(portfolio)}"

    for lu in portfolio:
        assert lu["salary"] <= 50000
        # Every lineup must have at least 1 teammate stack and 1 opposing runback
        assert len(lu["primary_stack"]) >= 1, "Must have teammate pass catcher"
        assert len(lu["opposing_runback"]) >= 1, "Must have opposing runback"

    # Enforce Top-2 SVI exposure quota: at least 2 of 3 lineups must stack DAL_HOU or DET_MIN
    top_envs = sum(1 for lu in portfolio if lu["game_environment"] in ["DAL_HOU", "DET_MIN"])
    assert top_envs >= 2, f"Expected at least 2 top-game lineups, got {top_envs}"

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
