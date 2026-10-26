import pytest
from grok_eq_ogd_quantile_tracking import ogd_quantile_tracking

def test_increase_when_above():
    # residual > theta, alpha=0.1, eta=0.1 -> +0.09
    assert abs(ogd_quantile_tracking(1.0, 2.0, 0.1, 0.1) - 1.09) < 1e-9

def test_decrease_when_below():
    # residual <= theta -> -alpha * eta
    assert abs(ogd_quantile_tracking(1.0, 0.5, 0.1, 0.1) - 0.99) < 1e-9

def test_floor_at_zero():
    assert ogd_quantile_tracking(0.01, 0.0, 0.5, 1.0) == 0.0

def test_fail_closed_alpha():
    assert ogd_quantile_tracking(1.0, 1.0, 1.5, 0.1) is None
    assert ogd_quantile_tracking(1.0, 1.0, 0.0, 0.1) is None

def test_fail_closed_type():
    assert ogd_quantile_tracking(None, 1.0, 0.1, 0.1) is None
    assert ogd_quantile_tracking(1.0, "bad", 0.1, 0.1) is None
