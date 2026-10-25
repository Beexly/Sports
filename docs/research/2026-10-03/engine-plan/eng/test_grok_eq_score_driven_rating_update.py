"""Fail-closed tests for score_driven_rating_update. Returns None on invalid input."""
from grok_eq_score_driven_rating_update import score_driven_rating_update


def test_basic_win_equal_ratings():
    # equal ratings, win: expected ~0.5, delta = 16*0.5 = 8, new = 1500+8
    res = score_driven_rating_update(1500.0, 1.0, 1500.0, 16.0)
    assert res is not None
    assert abs(res - 1508.0) < 1e-6


def test_basic_loss_equal_ratings():
    res = score_driven_rating_update(1500.0, 0.0, 1500.0, 16.0)
    assert res is not None
    assert abs(res - 1492.0) < 1e-6


def test_none_on_none():
    assert score_driven_rating_update(None, 1.0, 1500.0) is None
    assert score_driven_rating_update(1500.0, None, 1500.0) is None
    assert score_driven_rating_update(1500.0, 1.0, None) is None


def test_none_on_bad_values():
    assert score_driven_rating_update(1500.0, 0.5, 1500.0) is None  # invalid outcome
    assert score_driven_rating_update(1500.0, 1.0, 1500.0, -1.0) is None  # bad K
    assert score_driven_rating_update(float("nan"), 1.0, 1500.0) is None
    assert score_driven_rating_update(1500.0, 1.0, float("inf")) is None
    assert score_driven_rating_update(1e7, 1.0, 1500.0) is None  # too large


if __name__ == "__main__":
    test_basic_win_equal_ratings()
    test_basic_loss_equal_ratings()
    test_none_on_none()
    test_none_on_bad_values()
    print("4 tests passed")
