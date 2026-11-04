"""TDD Test Suite for X & Instagram Sweep Production Signals (Oct 29 - Nov 4, 2026).

Verifies the 5 production feature generators:
1. 3-Part Hidden Yardage & Penalty Profile (Nov 3-4 @sfdata9ers, @run_the_sims).
2. 4-Level Pressure & Trench Disruption System (Nov 3-4 @ghatz_28, @SumerSports, @The_Coach_A).
3. QB Dropback Composition & Field-Zone Matrix (Nov 2-4 @ghatz_28, @SumerSports, @Timo_NFL).
4. RB Explosive-vs-Stuffed & xFP Regression Matrix (Nov 2-4 @ghatz_28, @KoalatyStats).
5. WR Target Quality, Red-Zone TD Regression & Coverage Splits (Oct 30 - Nov 4 @ihartitz, @FantasyPtsData).
"""

import pytest


def test_hidden_yardage_and_penalty_profile():
    from intelligence.coaching.x_sweep_production_signals import (
        compute_hidden_yardage_and_penalty_profile,
    )
    
    mock_plays = [
        {"penalty_team": "KC", "penalty_yards": 15, "first_down_penalty": 1, "penalty_type": "Offensive Holding"},
        {"penalty_team": "KC", "penalty_yards": 10, "first_down_penalty": 0, "penalty_type": "False Start"},
        {"defensive_team": "KC", "penalty_type": "Defensive Pass Interference", "penalty_yards": 28, "first_down_penalty": 1},
    ]
    
    profile = compute_hidden_yardage_and_penalty_profile(mock_plays, team="KC")
    assert profile["team"] == "KC"
    assert profile["penalty_yards_conceded"] == 25
    assert profile["first_downs_donated"] == 1
    assert profile["defensive_dpi_yards_conceded"] == 28
    assert "net_penalty_differential" in profile


def test_four_level_pressure_matrix():
    from intelligence.coaching.x_sweep_production_signals import (
        compute_four_level_pressure_matrix,
    )
    
    mock_dropbacks = [
        {"qb_id": "00-0036355", "defteam": "CAR", "was_pressured": 0, "epa": 0.45, "is_blitz": 0, "pass_attempt": 1},
        {"qb_id": "00-0036355", "defteam": "CAR", "was_pressured": 1, "epa": -0.65, "is_blitz": 1, "sack": 1, "time_to_throw": 3.8},
        {"qb_id": "00-0036355", "defteam": "CAR", "was_pressured": 1, "epa": -0.10, "is_blitz": 0, "pass_attempt": 1, "time_to_throw": 2.2},
    ]
    
    matrix = compute_four_level_pressure_matrix(mock_dropbacks, qb_id="00-0036355", def_team="CAR")
    assert matrix["dropbacks"] == 3
    assert matrix["pressure_rate"] == pytest.approx(2.0 / 3.0, abs=1e-3)
    assert matrix["clean_epa_per_db"] == pytest.approx(0.45, abs=1e-3)
    assert matrix["pressured_epa_per_db"] == pytest.approx(-0.375, abs=1e-3)
    assert matrix["pressure_epa_cost"] == pytest.approx(0.45 - (-0.375), abs=1e-3)
    assert "self_invited_pressure_pct" in matrix


def test_qb_composition_and_field_zones():
    from intelligence.coaching.x_sweep_production_signals import (
        compute_qb_composition_and_field_zones,
    )
    
    mock_dropbacks = [
        {"qb_id": "LOVE_J", "complete_pass": 1, "yards_gained": 14, "pass_location": "middle", "air_yards": 12},
        {"qb_id": "LOVE_J", "incomplete_pass": 1, "yards_gained": 0, "pass_location": "left", "air_yards": 8},
        {"qb_id": "LOVE_J", "sack": 1, "yards_gained": -7},
        {"qb_id": "LOVE_J", "interception": 1, "yards_gained": 0, "pass_location": "right", "air_yards": 22},
        {"qb_id": "LOVE_J", "qb_scramble": 1, "yards_gained": 9},
    ]
    
    comp = compute_qb_composition_and_field_zones(mock_dropbacks, qb_id="LOVE_J")
    assert comp["total_dropbacks"] == 5
    assert comp["completion_pct"] == pytest.approx(0.20, abs=1e-3)
    assert comp["sack_pct"] == pytest.approx(0.20, abs=1e-3)
    assert comp["scramble_pct"] == pytest.approx(0.20, abs=1e-3)
    assert comp["int_pct"] == pytest.approx(0.20, abs=1e-3)
    assert comp["middle_of_field_targets"] == 1
    assert comp["middle_of_field_comp_pct"] == 1.0


def test_rb_explosive_vs_stuffed_matrix():
    from intelligence.coaching.x_sweep_production_signals import (
        compute_rb_explosive_vs_stuffed_matrix,
    )
    
    mock_rushes = [
        {"rusher_id": "RB_1", "rushing_yards": 16, "epa": 1.2},
        {"rusher_id": "RB_1", "rushing_yards": -2, "epa": -0.8},
        {"rusher_id": "RB_1", "rushing_yards": 0, "epa": -0.5},
        {"rusher_id": "RB_1", "rushing_yards": 4, "epa": 0.1},
    ]
    
    rb_matrix = compute_rb_explosive_vs_stuffed_matrix(mock_rushes, rb_id="RB_1")
    assert rb_matrix["carries"] == 4
    assert rb_matrix["explosive_12plus_rate"] == pytest.approx(0.25, abs=1e-3)
    assert rb_matrix["stuffed_rate"] == pytest.approx(0.50, abs=1e-3) # -2 and 0 <= 0
    assert "rushing_epa_per_att" in rb_matrix


def test_wr_target_and_td_regression_matrix():
    from intelligence.coaching.x_sweep_production_signals import (
        compute_wr_target_and_td_regression_matrix,
    )
    
    mock_targets = [
        {"receiver_id": "WR_ROME", "complete_pass": 1, "yards_gained": 24, "touchdown": 0, "air_yards": 20},
        {"receiver_id": "WR_ROME", "complete_pass": 1, "yards_gained": 18, "touchdown": 0, "air_yards": 16},
        {"receiver_id": "WR_ROME", "complete_pass": 0, "yards_gained": 0, "touchdown": 0, "air_yards": 12},
    ]
    
    wr_matrix = compute_wr_target_and_td_regression_matrix(mock_targets, wr_id="WR_ROME")
    assert wr_matrix["targets"] == 3
    assert wr_matrix["receptions"] == 2
    assert wr_matrix["explosive_receptions_15plus"] == 2
    assert wr_matrix["touchdowns"] == 0
    assert wr_matrix["td_positive_regression_candidate"] is True
