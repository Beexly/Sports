"""Rest days come from game dates. Week 1 is a gap, not zero."""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from coaching.rest_days import rest_before


def test_week_one_has_no_prior_game():
    row = rest_before("CLE", 2026, 1)
    assert row["rest_days"] is None
    assert row["gap"] == "no prior game in this file"


def test_cle_week_four_rest_is_a_date_difference_not_an_age():
    row = rest_before("CLE", 2026, 4)
    assert row["source"] == "real"
    assert row["previous_week"] == 3
    assert row["previous_date"] == "2026-09-27"
    assert row["game_date"] == "2026-10-01"
    assert row["rest_days"] == 4
    assert "age" in row["note"].lower()


def test_nonunique_game_date_is_a_gap_not_a_guess():
    row = rest_before("BUF", 2026, 4)
    assert row["rest_days"] is None
    assert "not unique" in row["gap"]
