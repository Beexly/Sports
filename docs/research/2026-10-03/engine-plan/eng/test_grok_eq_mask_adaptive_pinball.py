"""Fail-closed tests for mask_adaptive_pinball. Returns None on invalid input."""
from grok_eq_mask_adaptive_pinball import mask_adaptive_pinball


def test_basic_alpha_half():
    # alpha=0.5: reduces to 0.5 * |s-theta|
    res = mask_adaptive_pinball(0.5, 1.0, 3.0)
    assert res is not None
    assert abs(res - 1.0) < 1e-9


def test_alpha_zero():
    # alpha=0: 0.5*|d| + 0.5*d = d if d>0 else 0? wait
    # d = s-theta=2, 0.5*2 + (0.5-0)*2 = 1 + 1 = 2
    res = mask_adaptive_pinball(0.0, 1.0, 3.0)
    assert res is not None
    assert abs(res - 2.0) < 1e-9


def test_alpha_one():
    # alpha=1: 0.5*|d| + (0.5-1)*d = 0.5*|d| - 0.5*d = 0 if d>0 else |d|
    res = mask_adaptive_pinball(1.0, 1.0, 3.0)
    assert res is not None
    assert abs(res - 0.0) < 1e-9


def test_none_on_none():
    assert mask_adaptive_pinball(None, 1.0, 2.0) is None
    assert mask_adaptive_pinball(0.5, None, 2.0) is None
    assert mask_adaptive_pinball(0.5, 1.0, None) is None


def test_none_on_nonfinite():
    assert mask_adaptive_pinball(float("nan"), 1.0, 2.0) is None
    assert mask_adaptive_pinball(0.5, float("inf"), 2.0) is None


def test_none_on_bad_alpha():
    assert mask_adaptive_pinball(-0.1, 1.0, 2.0) is None
    assert mask_adaptive_pinball(1.1, 1.0, 2.0) is None


def test_none_on_large():
    assert mask_adaptive_pinball(0.5, 1e10, 2.0) is None
