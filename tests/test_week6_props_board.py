#!/usr/bin/env python3
"""
Unit tests for build_week6_props_board and its helper functions in
intelligence.pipeline.emit_week6_master_product.
"""

from __future__ import annotations

from typing import Any, Dict, List

from intelligence.pipeline.emit_week6_master_product import (
    _build_player_team_map,
    _evaluate_passer_props,
    _evaluate_receiver_props,
    _evaluate_rusher_props,
    _norm_name,
    _rank_and_dedup_props,
    build_week6_props_board,
)


def test_norm_name() -> None:
    assert _norm_name("C.J. Stroud Jr.") == "cj stroud"
    assert _norm_name("Patrick Mahomes II") == "patrick mahomes"
    assert _norm_name("Travis Kelce") == "travis kelce"


def test_build_player_team_map_with_injuries() -> None:
    inj_map = {
        "test player": {
            "player": "Test Player",
            "team": "KC",
            "pos": "WR",
            "status": "ACTIVE",
            "detail": "",
        }
    }
    team_map = _build_player_team_map(inj_map)
    assert team_map.get("test player") == "KC"


def test_rank_and_dedup_props() -> None:
    props: List[Dict[str, Any]] = [
        {"player": "Player A", "conviction_score": 85.0},
        {"player": "Player B", "conviction_score": 85.0},
        {"player": "Player C", "conviction_score": 80.0},
    ]
    ranked = _rank_and_dedup_props(props, top_n=2)
    assert len(ranked) == 2
    # Check that ties are deduplicated
    scores = [p["conviction_score"] for p in ranked]
    assert len(scores) == len(set(scores))
    assert ranked[0]["conviction_score"] == 85.0
    assert ranked[1]["conviction_score"] == 84.9


def test_evaluate_receiver_props_filtering() -> None:
    player_to_team = {"receiver one": "KC"}
    inj_map = {
        "receiver blocked": {
            "player": "Receiver Blocked",
            "team": "KC",
            "pos": "WR",
            "status": "OUT",
            "detail": "Knee injury",
        }
    }
    all_dk_props = {
        "receiver one": {
            "rec_yds": {
                "player_raw": "Receiver One",
                "prop_market": "Total Receiving Yards (incl. overtime)",
                "category": "Receiving Yards",
                "line": 55.5,
                "open_line": 50.5,
                "line_moved": True,
                "game": "LAC @ KC",
            }
        }
    }
    db_pgs = {
        "receiver one": {
            "full_name": "Receiver One",
            "pos": "WR",
            "gp": 5,
            "tgt": 35,
            "rec": 25,
            "rec_yds": 350.0,
            "carries": 0,
            "rush_yds": 0.0,
            "tshare": 0.25,
        }
    }
    usage_by_name = {
        "receiver one": {
            "snap_share_4wk": 0.85,
        }
    }
    ngs_rec = {
        "stats": [
            {
                "playerName": "Receiver One",
                "avgSeparation": 3.2,
                "avgYACAboveExpectation": 1.5,
                "percentShareOfIntendedAirYards": 30.0,
            },
            {
                # Should be skipped because team is not upcoming / unknown
                "playerName": "Unknown Player",
            },
        ]
    }
    edges = _evaluate_receiver_props(
        ngs_rec=ngs_rec,
        player_to_team=player_to_team,
        inj_map=inj_map,
        all_dk_props=all_dk_props,
        db_pgs=db_pgs,
        usage_by_name=usage_by_name,
    )
    assert len(edges) == 1
    edge = edges[0]
    assert edge["player"] == "Receiver One"
    assert edge["team"] == "KC"
    assert edge["position"] == "WR"
    assert "Receiving Yards" in edge["market"]
    assert edge["dk_line"] == 55.5


def test_evaluate_rusher_props_filtering() -> None:
    player_to_team = {"rusher one": "BUF"}
    inj_map: Dict[str, Dict[str, str]] = {}
    all_dk_props = {
        "rusher one": {
            "rush_yds": {
                "player_raw": "Rusher One",
                "prop_market": "Total Rushing Yards (incl. overtime)",
                "category": "Rushing Yards",
                "line": 65.5,
                "open_line": 62.5,
                "line_moved": True,
                "game": "BUF @ LV",
            },
            "rush_att": {
                "line": 15.5,
            },
        }
    }
    db_pgs = {
        "rusher one": {
            "full_name": "Rusher One",
            "pos": "RB",
            "gp": 5,
            "tgt": 10,
            "rec": 8,
            "rec_yds": 60.0,
            "carries": 75,
            "rush_yds": 400.0,
            "tshare": 0.08,
        }
    }
    usage_by_name = {
        "rusher one": {
            "carry_share_4wk": 0.65,
            "snap_share_4wk": 0.70,
        }
    }
    ngs_rush = {
        "stats": [
            {
                "playerName": "Rusher One",
                "rushYardsOverExpected": 45.0,
                "rushYardsOverExpectedPerAtt": 0.60,
                "percentAttemptsGteEightDefenders": 15.0,
            }
        ]
    }
    edges = _evaluate_rusher_props(
        ngs_rush=ngs_rush,
        player_to_team=player_to_team,
        inj_map=inj_map,
        all_dk_props=all_dk_props,
        db_pgs=db_pgs,
        usage_by_name=usage_by_name,
    )
    assert len(edges) == 1
    edge = edges[0]
    assert edge["player"] == "Rusher One"
    assert edge["team"] == "BUF"
    assert edge["position"] == "RB"
    assert "Rushing Yards" in edge["market"]


def test_evaluate_passer_props_filtering() -> None:
    player_to_team = {"passer one": "LAR"}
    inj_map: Dict[str, Dict[str, str]] = {}
    all_dk_props = {
        "passer one": {
            "pass_yds": {
                "player_raw": "Passer One",
                "prop_market": "Total Passing Yards (incl. overtime)",
                "category": "Passing Yards",
                "line": 265.5,
                "open_line": 260.5,
                "line_moved": True,
                "game": "ARI @ LAR",
            }
        }
    }
    ngs_pass = {
        "stats": [
            {
                "playerName": "Passer One",
                "attempts": 150,
                "passYards": 1400.0,
                "completionPercentageAboveExpectation": 4.5,
                "avgTimeToThrow": 2.75,
                "gamesPlayed": 5,
            }
        ]
    }
    edges = _evaluate_passer_props(
        ngs_pass=ngs_pass,
        player_to_team=player_to_team,
        inj_map=inj_map,
        all_dk_props=all_dk_props,
    )
    assert len(edges) == 1
    edge = edges[0]
    assert edge["player"] == "Passer One"
    assert edge["team"] == "LAR"
    assert edge["position"] == "QB"
    assert "Passing Yards" in edge["market"]


def test_build_week6_props_board_integration() -> None:
    inj_map = {
        "blocked guy": {
            "player": "Blocked Guy",
            "team": "KC",
            "pos": "WR",
            "status": "OUT",
            "detail": "Ruled out",
        }
    }
    db_pgs = {
        "travis kelce": {
            "full_name": "Travis Kelce",
            "pos": "TE",
            "gp": 5,
            "tgt": 35,
            "rec": 28,
            "rec_yds": 280.0,
            "carries": 0,
            "rush_yds": 0.0,
            "tshare": 0.22,
        }
    }
    board = build_week6_props_board(inj_map, db_pgs)
    assert isinstance(board, list)
    assert len(board) <= 20
    # Ensure all returned items have distinct conviction scores
    scores = [p["conviction_score"] for p in board]
    assert len(scores) == len(set(scores))
    for p in board:
        assert "player" in p
        assert "team" in p
        assert "market" in p
        assert "conviction_score" in p
        assert "win_prob" in p
