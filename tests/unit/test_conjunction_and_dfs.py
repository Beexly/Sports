"""Unit tests for Class B prop gate, QB anti-cannibalization, and 2-TE DFS lineup builder."""

from __future__ import annotations

import numpy as np

from gse_engine.compute.dfs_optimizer import (
    SALARY_CAP,
    build_dfs_lineup,
    shrunk_empirical_covariance,
)
from gse_engine.gates.conjunction import evaluate_prop_board
from gse_engine.models import DfsPlayerPoolItem, TwoSidedPropCandidate


def test_conjunction_gate_enforces_two_sided_juice_and_qb_anti_cannibalization() -> None:
    """Validates missing juice PASS, integer NN/100 confidence, and standalone QB de-dup."""
    candidates = [
        TwoSidedPropCandidate(
            prop_id="p_pass_yds",
            player_id="qb1",
            player_name="Joe Burrow",
            market="pass_yds",
            line=274.5,
            side="OVER",
            model_prob=0.61,
            conformal_lower_prob=0.56,
            over_american=-110,
            under_american=-110,
        ),
        TwoSidedPropCandidate(
            prop_id="p_pass_att",
            player_id="qb1",
            player_name="Joe Burrow",
            market="pass_attempts",
            line=36.5,
            side="OVER",
            model_prob=0.58,
            conformal_lower_prob=0.55,
            over_american=-110,
            under_american=-110,
        ),
        TwoSidedPropCandidate(
            prop_id="p_sgp_comp",
            player_id="qb1",
            player_name="Joe Burrow",
            market="pass_completions",
            line=23.5,
            side="OVER",
            model_prob=0.59,
            conformal_lower_prob=0.55,
            over_american=-110,
            under_american=-110,
            sgp_bundle_id="sgp_cin_1",
        ),
        TwoSidedPropCandidate(
            prop_id="p_no_under",
            player_id="wr1",
            player_name="Test WR",
            market="rec_yds",
            line=69.5,
            side="OVER",
            model_prob=0.65,
            conformal_lower_prob=0.60,
            over_american=-115,
            under_american=None,
        ),
    ]

    decisions, receipt = evaluate_prop_board(candidates)
    by_id = {d.prop_id: d for d in decisions}

    assert "%" not in by_id["p_pass_yds"].confidence_display
    assert by_id["p_pass_yds"].confidence_display == "61/100"
    assert by_id["p_pass_yds"].decision == "PLAY"
    assert by_id["p_pass_att"].decision == "PASS"
    assert "QB_ANTI_CANNIBALIZATION" in by_id["p_pass_att"].reasons
    assert by_id["p_sgp_comp"].decision == "PLAY"
    assert by_id["p_no_under"].decision == "PASS"
    assert "MISSING_TWO_SIDED_JUICE" in by_id["p_no_under"].reasons
    assert len(receipt.payload_sha256) == 64


def test_dfs_optimizer_builds_2te_lineup_and_places_latest_kickoff_in_flex() -> None:
    """Constructs a 9-man <=$50,000 DraftKings Classic roster with 2 TEs and late FLEX."""
    early = "2026-11-15T18:00:00Z"
    late = "2026-11-16T01:20:00Z"
    pool = [
        DfsPlayerPoolItem("qb1", "QB A", "CIN", "QB", 7200, early, 22.5, 2.6, 65.0),
        DfsPlayerPoolItem("rb1", "RB A", "CIN", "RB", 7500, early, 19.0, 2.5, 52.0),
        DfsPlayerPoolItem("rb2", "RB B", "BAL", "RB", 6200, early, 16.0, 2.4, 48.0),
        DfsPlayerPoolItem("rb3", "RB C", "PIT", "RB", 4200, early, 7.0, 1.5, 18.0),
        DfsPlayerPoolItem("wr1", "WR A", "CIN", "WR", 7800, early, 20.5, 2.6, 62.0),
        DfsPlayerPoolItem("wr2", "WR B", "BAL", "WR", 6400, early, 16.2, 2.4, 58.0),
        DfsPlayerPoolItem("wr3", "WR C", "LAC", "WR", 5100, early, 13.0, 2.3, 50.0),
        DfsPlayerPoolItem("wr4", "WR D", "PIT", "WR", 4100, early, 7.2, 1.6, 22.0),
        DfsPlayerPoolItem("te1", "TE Alpha", "BAL", "TE", 3600, early, 11.8, 2.6, 46.0),
        DfsPlayerPoolItem("te2", "TE LateFlex", "LAC", "TE", 3000, late, 11.2, 2.8, 44.0),
        DfsPlayerPoolItem("dst1", "DEF A", "PIT", "DST", 3100, early, 8.5, 2.5, 60.0),
    ]

    lineup = build_dfs_lineup(pool, mode="gpp", max_tes=2)
    flat = [p for players in lineup.values() for p in players]
    assert len(flat) == 9
    assert sum(p.salary for p in flat) <= SALARY_CAP
    assert lineup["FLEX"][0].player_id == "te2"

    cov = shrunk_empirical_covariance(
        np.array([[20.0, 15.0], [22.0, 17.0], [18.0, 14.0], [25.0, 20.0]]),
        shrinkage=0.25,
    )
    assert cov.shape == (2, 2)
    assert cov[0, 1] > 0.0
