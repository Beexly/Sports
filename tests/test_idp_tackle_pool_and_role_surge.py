from __future__ import annotations

import numpy as np

from scripts.ops.week8_forensic_kernels import (
    compute_defense_tackle_pool_vector,
    detect_role_surge_or_line_divergence_trap,
)


def test_compute_defense_tackle_pool_vector_tracks_opponent_rushes_and_completions():
    # IND defense faced 37 HOU rushes + 21 completions + 1 sack (actual IND tackles = 74)
    ind_pool = compute_defense_tackle_pool_vector(
        opp_rush_att=np.full(1000, 37.0),
        opp_pass_comp=np.full(1000, 21.0),
        opp_sacks=np.full(1000, 1.0),
    )
    # HOU defense faced 17 IND rushes + 12 completions + 2 sacks (actual HOU tackles = 46)
    hou_pool = compute_defense_tackle_pool_vector(
        opp_rush_att=np.full(1000, 17.0),
        opp_pass_comp=np.full(1000, 12.0),
        opp_sacks=np.full(1000, 2.0),
    )
    assert 68.0 <= float(np.mean(ind_pool)) <= 84.0
    assert 35.0 <= float(np.mean(hou_pool)) <= 50.0
    assert float(np.mean(ind_pool)) - float(np.mean(hou_pool)) >= 25.0


def test_detect_role_surge_catches_cj_allen_week10_and_week11():
    w10 = detect_role_surge_or_line_divergence_trap(
        player_name="CJ Allen",
        market_line=8.5,
        season_avg=1.64,
        player_gp=5,
        team_gp=9,
    )
    assert w10["is_role_surge_trap"] is True
    assert w10["block_under_bets"] is True
    assert w10["decision"] == "PASS_ROLE_SURGE_DIVERGENCE"

    w11 = detect_role_surge_or_line_divergence_trap(
        player_name="CJ Allen",
        market_line=10.5,
        season_avg=5.5,
        player_gp=6,
        team_gp=10,
    )
    assert w11["is_role_surge_trap"] is True
    assert w11["block_under_bets"] is True
    assert w11["decision"] == "PASS_ROLE_SURGE_DIVERGENCE"

    normal = detect_role_surge_or_line_divergence_trap(
        player_name="Roquan Smith",
        market_line=8.5,
        season_avg=8.2,
        player_gp=9,
        team_gp=9,
    )
    assert normal["is_role_surge_trap"] is False
    assert normal["block_under_bets"] is False
