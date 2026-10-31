"""Fail-closed tests for tta_pinball_loss from arXiv:2610.36183 eq (3)."""
import math
from grok_eq_tta_pinball_loss import tta_pinball_loss


def test_overprediction_penalized_more():
    # tau=0.01, y_hat > y (overpredict arrival time)
    res = tta_pinball_loss(2.0, 1.0, 0.01)
    assert res is not None
    assert math.isclose(res, 0.99 * (2.0 - 1.0))


def test_underprediction():
    res = tta_pinball_loss(1.0, 2.0, 0.01)
    assert res is not None
    assert math.isclose(res, 0.01 * (2.0 - 1.0))


def test_equal_zero():
    res = tta_pinball_loss(1.5, 1.5, 0.01)
    assert res is not None
    assert math.isclose(res, 0.0)


def test_none_on_bad_inputs():
    assert tta_pinball_loss(None, 1.0) is None
    assert tta_pinball_loss(1.0, None) is None
    assert tta_pinball_loss(1.0, 1.0, None) is None
    assert tta_pinball_loss(1.0, 1.0, 0.0) is None
    assert tta_pinball_loss(1.0, 1.0, 1.0) is None
    assert tta_pinball_loss(float('nan'), 1.0) is None
    assert tta_pinball_loss(1.0, float('inf')) is None


def test_default_tau():
    res = tta_pinball_loss(2.0, 1.0)
    assert res is not None
    assert math.isclose(res, 0.99)
