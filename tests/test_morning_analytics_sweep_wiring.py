#!/usr/bin/env python3
"""
tests/test_morning_analytics_sweep_wiring.py
============================================
Verifies that the Nov 7, 2026 Morning Analytics Sweep (35 full-table CSVs)
is cleanly ingested and wired into:
  1. `intelligence/external_charting/morning_sweep_2026_11_07.py`
  2. `scripts/ops/verify_and_wire_all_layers_before_sim.py` (Layer 3 External Charting)
  3. `scripts/dfs/build_week9_dual_slate_dfs_packets.py` (10,000-sim DFS packet provenance)
"""

from __future__ import annotations

from intelligence.external_charting.morning_sweep_2026_11_07 import (
    build_morning_sweep_summary,
    get_player_situational_highlights,
    get_qb_supporting_cast_scores,
    get_seattle_red_zone_inversion_profile,
    get_wpp_pass_protection_profiles,
    load_all_35_morning_sweep_tables,
)
from scripts.ops.verify_and_wire_all_layers_before_sim import verify_layer_3_external_charting


def test_all_35_morning_sweep_tables_loaded():
    tables = load_all_35_morning_sweep_tables()
    assert len(tables) == 35
    assert "sfdata9ers-qb-supporting-cast-score-2026.csv" in tables
    assert "espinosa-wpp-pass-pro-tackles-2026.csv" in tables
    assert "espinosa-wpp-pass-pro-interior-2026.csv" in tables
    assert "suuma-seattle-red-zone-splits-2026.csv" in tables
    assert "connorlong-pcvr-reich-2026.csv" in tables


def test_qb_supporting_cast_scores_32_teams():
    scores = get_qb_supporting_cast_scores()
    assert len(scores) == 32
    assert scores["SF"]["ovr_score"] == 72.9
    assert scores["DET"]["ovr_score"] == 71.2
    assert scores["LAR"]["ovr_score"] == 68.9
    assert scores["PHI"]["ovr_score"] == 37.1
    assert scores["MIA"]["ovr_score"] == 32.2
    assert scores["NE"]["ovr_score"] == 37.9


def test_wpp_and_xwpp_pass_protection_profiles():
    wpp = get_wpp_pass_protection_profiles()
    assert "PHI" in wpp
    assert "IND" in wpp
    assert "TB" in wpp
    assert "DET" in wpp
    phi_anchors = [a["player"] for a in wpp["PHI"]["elite_ol_anchors"]]
    assert "Jordan Mailata" in phi_anchors
    assert "Tyler Steen" in phi_anchors


def test_seattle_red_zone_inversion_and_player_highlights():
    sea = get_seattle_red_zone_inversion_profile()
    assert sea["inversion_verified"] is True
    assert sea["def_between_20s_dvoa_rank"] == 1
    assert sea["def_red_zone_dvoa_rank"] == 32
    assert sea["off_inside_10_epa_rank"] == 32

    hl = get_player_situational_highlights()
    assert hl["jsn_2026_yards_per_team_pass_att"] == 3.84
    assert hl["rec_yards_vs_2high_leaders"]["Jaxon Smith-Njigba"] == 565
    assert hl["ryoe_per_attempt_leaders"]["James Cook"] == 0.99
    assert hl["drake_maye_splits"]["Maye vs rest (26g)"]["ypg"] == 258.9


def test_pre_sim_layer_3_external_charting_wires_morning_sweep():
    res = verify_layer_3_external_charting()
    assert res["verified"] is True
    assert res["morning_sweep_2026_11_07"]["csv_tables_loaded"] == 35
    assert res["morning_sweep_2026_11_07"]["qb_supporting_cast_teams_count"] == 32
    assert res["morning_sweep_2026_11_07"]["seattle_red_zone_inversion_verified"] is True
