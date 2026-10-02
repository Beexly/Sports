"""The paper's coefficients load. A raw play does not become a probability."""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from research.iwinrnfl import COEFS, INTERCEPT, StandardizationMissing, home_win_probability, linear_predictor


def test_table_one_coefficients_match_the_extract():
    assert INTERCEPT == 0.0
    assert COEFS["score_differential"] == 1.41
    assert COEFS["rating_differential"] == 1.72
    assert COEFS["time_lapsed_x_score_differential"] == 2.88
    assert COEFS["time_lapsed_x_rating_differential"] == -0.65
    assert len(COEFS) == 21


def test_raw_play_does_not_get_a_win_probability():
    try:
        home_win_probability({"score_differential": 7, "time_lapsed": 1800})
    except StandardizationMissing:
        pass
    else:
        raise AssertionError("raw play must not become a probability")
    try:
        linear_predictor({"score_differential": 0.2})
    except StandardizationMissing as exc:
        assert "missing standardized inputs" in str(exc)
    else:
        raise AssertionError("partial standardized row must refuse")
