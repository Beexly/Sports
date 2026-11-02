"""Fail-closed tests for lin_js_divergence. 6 cases."""
from grok_eq_lin_js_divergence import lin_js_divergence

def test_equal_zero():
    p = [0.5, 0.5]
    res = lin_js_divergence(p, p)
    assert res is not None and abs(res) < 1e-12

def test_none_on_bad_sum():
    assert lin_js_divergence([0.1, 0.1], [0.5, 0.5]) is None

def test_none_on_negative():
    assert lin_js_divergence([-0.1, 1.1], [0.5, 0.5]) is None

def test_none_on_mismatch():
    assert lin_js_divergence([0.5, 0.5], [0.3, 0.3, 0.4]) is None

def test_none_on_pi_out():
    assert lin_js_divergence([0.5, 0.5], [0.5, 0.5], 1.5) is None

def test_known_positive():
    res = lin_js_divergence([0.9, 0.1], [0.1, 0.9])
    assert res is not None and res > 0.0

if __name__ == "__main__":
    test_equal_zero()
    test_none_on_bad_sum()
    test_none_on_negative()
    test_none_on_mismatch()
    test_none_on_pi_out()
    test_known_positive()
    print("6 fail-closed tests passed")
