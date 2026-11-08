"""
Unit and Integration Tests for 07:40 AM CST Live Week 9 Full-Slate Simulation Release Engine.
"""

from __future__ import annotations

import json
from pathlib import Path

from intelligence.data_sources.firecrawl_alexandria_live_sync import (
    OFFICIAL_2026_WEEK9_15_GAMES,
)
from intelligence.simulation.release_0740_cst_live_week9_simulations import (
    WEEK9_LIVE_SLATE_SPECS,
    release_live_week9_simulations,
)


def test_week9_live_slate_specs_match_official_15_games():
    assert len(WEEK9_LIVE_SLATE_SPECS) == 15
    pairs = tuple((g["away"], g["home"]) for g in WEEK9_LIVE_SLATE_SPECS)
    assert pairs == OFFICIAL_2026_WEEK9_15_GAMES


def test_release_live_week9_simulations_executes_all_15_games():
    res = release_live_week9_simulations(
        worlds_per_game=2000,
        snaps_per_world=175,
        persist_artifacts=False,
    )
    assert res["status"] == "RELEASED_LIVE"
    assert res["games_simulated_count"] == 15
    assert res["total_game_worlds_simulated"] == 15 * 2000
    assert res["total_pbp_snaps_simulated"] == 15 * 2000 * 175
    assert len(res["games"]) == 15

    # Check heavy-juice firewall on PHI (-340), DEN (-290), SF (-280), KC (-275)
    by_id = {g["game_id"]: g for g in res["games"]}
    assert by_id["2026_09_NYG_PHI"]["heavy_juice_firewall_blocked"] is True
    assert by_id["2026_09_DEN_CAR"]["heavy_juice_firewall_blocked"] is True
    assert by_id["2026_09_LV_SF"]["heavy_juice_firewall_blocked"] is True
    assert by_id["2026_09_NYJ_KC"]["heavy_juice_firewall_blocked"] is True

    # Verify Argon 4 & Opus 5.5 Red-Team additions: 360-degree distributions & plain-English prop plays
    det_mia = by_id["2026_09_DET_MIA"]
    dist_360 = det_mia["full_board_360_prop_distributions"]
    for key in (
        "away_wr1_longest_rec",
        "home_wr1_longest_rec",
        "away_rb1_longest_rush",
        "home_rb1_longest_rush",
        "away_1q_score",
        "home_1h_score",
        "away_fg_made",
        "home_kicking_pts",
        "away_edge1_sacks",
    ):
        assert key in dist_360
        assert "p50" in dist_360[key] and "p90" in dist_360[key]

    assert len(det_mia["top_plain_english_prop_plays"]) >= 1
    first_play = det_mia["top_plain_english_prop_plays"][0]
    assert len(first_play["causal_equation_plain_english"]) > 15
    assert len(first_play["human_plain_english_rationale"]) > 30


def test_two_host_portability_on_simulation_release_engine():
    src = (
        Path(__file__).resolve().parents[2]
        / "intelligence"
        / "simulation"
        / "release_0740_cst_live_week9_simulations.py"
    ).read_text(encoding="utf-8")
    forbidden_win = "C:" + "\\Users\\Garrett"
    forbidden_pos = "/Users/" + "Garrett"
    assert forbidden_win not in src
    assert forbidden_pos not in src
