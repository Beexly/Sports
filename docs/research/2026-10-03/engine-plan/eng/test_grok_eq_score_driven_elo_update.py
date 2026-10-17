"""Fail-closed tests for score_driven_elo_update."""
from __future__ import annotations

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from grok_eq_score_driven_elo_update import score_driven_elo_update  # noqa: E402


def test_printed_equal_ratings_win():
    # equal ratings, y=1: expected=0.5, update = r + 16*(1-0.5) = r+8
    result = score_driven_elo_update(1200.0, 1200.0, 1.0)
    assert result is not None and abs(result - 1208.0) < 1e-9


def test_printed_equal_ratings_loss():
    result = score_driven_elo_update(1200.0, 1200.0, 0.0)
    assert result is not None and abs(result - 1192.0) < 1e-9


def test_printed_stronger_opponent_win():
    # rA=1200, rB=1600, y=1: expected small, big gain
    result = score_driven_elo_update(1200.0, 1600.0, 1.0)
    assert result is not None and result > 1200.0


def test_fail_closed_bad_inputs():
    assert score_driven_elo_update(None, 1200.0, 1.0) is None
    assert score_driven_elo_update(1200.0, 1200.0, -0.1) is None
    assert score_driven_elo_update(1200.0, 1200.0, 1.1) is None
    assert score_driven_elo_update(1200.0, float("nan"), 1.0) is None
    assert score_driven_elo_update(1200.0, 1200.0, 1.0, -1.0) is None


def test_fail_closed_inf():
    assert score_driven_elo_update(float("inf"), 1200.0, 1.0) is None


if __name__ == "__main__":
    test_printed_equal_ratings_win()
    test_printed_equal_ratings_loss()
    test_printed_stronger_opponent_win()
    test_fail_closed_bad_inputs()
    test_fail_closed_inf()
    print("5 tests passed")
