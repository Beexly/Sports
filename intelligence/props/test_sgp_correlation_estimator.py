"""
Tests for the same-game leg correlation estimator.

Run:
    python -m pytest intelligence/props/test_sgp_correlation_estimator.py -o pythonpath=.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from intelligence.props.sgp_correlation_estimator import (
    LEG_NAMES,
    cross_team_pairs,
    estimate,
    pair_correlation,
    player_game_table,
    primary_pairs,
)


# ---------------------------------------------------------------------------
# Correlation primitives
# ---------------------------------------------------------------------------

def test_pair_correlation_matches_numpy_pearson():
    rng = np.random.default_rng(3)
    a = rng.standard_normal(500)
    b = 0.7 * a + 0.3 * rng.standard_normal(500)
    assert pair_correlation(a, b) == pytest.approx(float(np.corrcoef(a, b)[0, 1]), rel=1e-12)


def test_pair_correlation_is_plus_one_on_an_exact_linear_relationship():
    a = np.arange(50, dtype=float)
    assert pair_correlation(a, 3.0 * a + 5.0) == pytest.approx(1.0, abs=1e-12)
    assert pair_correlation(a, -2.0 * a) == pytest.approx(-1.0, abs=1e-12)


def test_pair_correlation_refuses_a_constant_series():
    """A zero-variance leg has no correlation; NaN is returned, not 0."""
    a = np.arange(20, dtype=float)
    assert np.isnan(pair_correlation(a, np.ones(20)))
    assert np.isnan(pair_correlation(np.ones(20), a))


def test_pair_correlation_needs_at_least_three_points():
    assert np.isnan(pair_correlation(np.array([1.0, 2.0]), np.array([1.0, 2.0])))


def test_point_biserial_is_pearson_on_a_zero_one_series():
    """
    Anytime TD is 0/1. The coefficient is numerically Pearson; the test pins
    that it is computed the same way so the note in the report stays true.
    """
    rng = np.random.default_rng(11)
    continuous = rng.standard_normal(400)
    binary = (continuous + rng.standard_normal(400) > 0.3).astype(float)
    assert pair_correlation(continuous, binary) == pytest.approx(
        float(np.corrcoef(continuous, binary)[0, 1]), rel=1e-12
    )


# ---------------------------------------------------------------------------
# Aggregation
# ---------------------------------------------------------------------------

def _toy_plays() -> pd.DataFrame:
    """
    Two team-games with hand-computable sums.

    Game A, team T1: passer P1 throws for 300 yards and 2 TDs; receivers R1 (100
    yards, 1 TD) and R2 (50 yards, 0 TD).
    Game A, team T2: passer P2 throws for 200 yards and 1 TD; receiver R3 (80
    yards, 1 TD).
    """
    rows = [
        # game_id, posteam, passer, receiver, passing_yards, pass_touchdown, receiving_yards
        ("G1", "T1", "P1", "R1", 150.0, 1.0, 60.0),
        ("G1", "T1", "P1", "R1", 150.0, 1.0, 40.0),
        ("G1", "T1", "P1", "R2", 0.0, 0.0, 50.0),
        ("G1", "T2", "P2", "R3", 200.0, 1.0, 80.0),
        ("G2", "T1", "P1", "R1", 220.0, 1.0, 90.0),
        ("G2", "T1", "P1", "R2", 0.0, 0.0, 30.0),
        ("G2", "T2", "P2", "R3", 180.0, 2.0, 70.0),
    ]
    return pd.DataFrame(
        rows,
        columns=[
            "game_id", "posteam", "passer_player_name", "receiver_player_name",
            "passing_yards", "pass_touchdown", "receiving_yards",
        ],
    ).assign(season_type="REG", week=1, defteam="X", complete_pass=1.0,
             rush_attempt=0.0, pass_attempt=1.0)


def test_player_game_table_sums_yards_and_counts_touchdowns():
    pg = player_game_table(_toy_plays())

    p1_g1 = pg[(pg["game_id"] == "G1") & (pg["player"] == "P1")].iloc[0]
    assert p1_g1["qb_pass_yards"] == pytest.approx(300.0)
    assert p1_g1["qb_pass_tds"] == pytest.approx(2.0)

    r1_g1 = pg[(pg["game_id"] == "G1") & (pg["player"] == "R1")].iloc[0]
    assert r1_g1["wr_rec_yards"] == pytest.approx(100.0)
    assert r1_g1["wr_rec_tds"] == pytest.approx(2.0)
    assert r1_g1["wr_anytime_td"] == 1.0


def test_anytime_td_is_zero_when_the_receiver_did_not_score():
    pg = player_game_table(_toy_plays())
    r2 = pg[pg["player"] == "R2"].iloc[0]
    assert r2["wr_rec_yards"] > 0
    assert r2["wr_anytime_td"] == 0.0


def test_primary_pairs_picks_the_leading_qb_and_receiver_per_team_game():
    pg = player_game_table(_toy_plays())
    pairs = primary_pairs(pg)
    assert len(pairs) == 4          # 2 games x 2 teams
    g1_t1 = pairs[(pairs["game_id"] == "G1") & (pairs["posteam"] == "T1")].iloc[0]
    assert g1_t1["player_qb"] == "P1"
    assert g1_t1["player_wr"] == "R1"     # 100 yards beats R2's 50
    assert g1_t1["qb_pass_yards"] == pytest.approx(300.0)
    assert g1_t1["wr_rec_yards"] == pytest.approx(100.0)


def test_primary_pairs_breaks_a_two_qb_game_toward_the_leader():
    """A handoff game has two passers; the game's production belongs to the leader."""
    df = _toy_plays()
    extra = df[df["passer_player_name"] == "P1"].head(1).copy()
    extra["passer_player_name"] = "P1B"
    extra["passing_yards"] = 25.0
    extra["pass_touchdown"] = 0.0
    extra["receiving_yards"] = 0.0
    extra["receiver_player_name"] = None
    pairs = primary_pairs(player_game_table(pd.concat([df, extra], ignore_index=True)))
    g1_t1 = pairs[(pairs["game_id"] == "G1") & (pairs["posteam"] == "T1")].iloc[0]
    assert g1_t1["player_qb"] == "P1"     # 300 yards beats 25


# ---------------------------------------------------------------------------
# The estimate itself
# ---------------------------------------------------------------------------

def test_estimate_returns_a_square_unit_diagonal_matrix_with_the_declared_legs(tmp_path):
    """Structure only — uses whatever parquet is on disk, or skips."""
    try:
        report = estimate([2024, 2025])
    except FileNotFoundError:
        pytest.skip("nflverse play-by-play not present on this checkout")

    m = np.array(report.matrix, dtype=float)
    assert m.shape == (4, 4)
    assert report.leg_names == LEG_NAMES
    assert np.allclose(np.diag(m), 1.0)
    assert np.allclose(m, m.T, atol=1e-12), "correlation matrix must be symmetric"
    assert np.all(m >= -1.0 - 1e-9) and np.all(m <= 1.0 + 1e-9)
    assert report.n_team_games > 0
    assert report.n_games > 0


def test_estimate_reports_psd_status_and_never_returns_a_silent_repair():
    try:
        report = estimate([2024, 2025])
    except FileNotFoundError:
        pytest.skip("nflverse play-by-play not present on this checkout")
    joined = " ".join(report.notes)
    assert "eigenvalue" in joined, "the report must state its PSD status"


def test_the_measured_qb_yards_to_wr_yards_correlation_is_strong_and_positive():
    """
    A directional sanity check on the physics, not a tuned target: a QB's passing
    yards and his leading receiver's yards are the most directly coupled pair in
    the set, so the estimate must be clearly positive. If this ever comes back
    negative or near zero, the aggregation is wrong, not the NFL.
    """
    try:
        report = estimate([2024, 2025])
    except FileNotFoundError:
        pytest.skip("nflverse play-by-play not present on this checkout")
    m = np.array(report.matrix, dtype=float)
    i, j = LEG_NAMES.index("qb_pass_yards"), LEG_NAMES.index("wr_rec_yards")
    assert m[i][j] > 0.3, f"qb_pass_yards~wr_rec_yards = {m[i][j]:.4f}, expected clearly positive"


def test_missing_seasons_are_reported_rather_than_silently_dropped():
    """A season with no parquet must appear as a note, never as a silent omission."""
    try:
        report = estimate([1900, 2025])
    except FileNotFoundError:
        pytest.skip("nflverse play-by-play not present on this checkout")
    assert any("1900" in n for n in report.notes), report.notes


# ---------------------------------------------------------------------------
# Cross-side block
# ---------------------------------------------------------------------------

def test_cross_team_pairs_yields_both_orderings_and_never_self_pairs():
    pg = player_game_table(_toy_plays())
    pairs = primary_pairs(pg)
    cross = cross_team_pairs(pairs)
    # 2 games x 2 teams x 1 opposing team = 4 ordered pairs
    assert len(cross) == 4
    assert (cross["posteam_own"] != cross["posteam_opp"]).all()
    # both orderings of each matchup are present
    g1 = cross[cross["game_id"] == "G1"]
    assert set(zip(g1["posteam_own"], g1["posteam_opp"])) == {("T1", "T2"), ("T2", "T1")}


def test_cross_side_diagonal_is_measured_and_not_forced_to_one():
    """
    The bug this pins: if only own-QB and opp-WR columns are supplied, entry
    [0][0] compares a series with itself and reads exactly 1.0000, and the block
    becomes indistinguishable from a same-side matrix. Every diagonal entry here
    must be a real measurement, i.e. not exactly 1.
    """
    try:
        report = estimate([2024, 2025])
    except FileNotFoundError:
        pytest.skip("nflverse play-by-play not present on this checkout")
    assert report.cross_matrix, "cross-side block should be populated"
    k = len(report.leg_names)
    diag = [report.cross_matrix[i][i] for i in range(k)]
    assert all(abs(d - 1.0) > 1e-9 for d in diag), f"degenerate cross diagonal: {diag}"
    # and the report must not have flagged its own block as degenerate
    assert not any("degenerate" in n for n in report.notes), report.notes


def test_cross_side_block_is_symmetric_because_both_orderings_are_present():
    """Symmetry is a property of the pairing, so a failure here is a pairing bug."""
    try:
        report = estimate([2024, 2025])
    except FileNotFoundError:
        pytest.skip("nflverse play-by-play not present on this checkout")
    cm = np.array(report.cross_matrix, dtype=float)
    assert np.allclose(cm, cm.T, atol=1e-9), "cross block must be symmetric"
    assert not any("asymmetric" in n for n in report.notes), report.notes
