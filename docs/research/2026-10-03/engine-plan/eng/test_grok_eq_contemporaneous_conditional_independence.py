import pytest
from grok_eq_contemporaneous_conditional_independence import contemporaneous_conditional_independence

def poisson_like(lam):
    def pmf(y):
        if y < 0:
            return 0.0
        # simplified, not exact
        return (lam ** y) * (2.71828 ** -lam) / (1 if y==0 else y)
    return pmf

def test_basic():
    pmfs = [poisson_like(0.15), poisson_like(6.1)]
    obs = [0, 5]
    j = contemporaneous_conditional_independence(pmfs, obs)
    assert j > 0

def test_fail_empty():
    with pytest.raises(ValueError):
        contemporaneous_conditional_independence([], [])

def test_fail_mismatch():
    with pytest.raises(ValueError):
        contemporaneous_conditional_independence([lambda x: 0.5], [1, 2])

def test_fail_negative():
    with pytest.raises(ValueError):
        contemporaneous_conditional_independence([lambda x: -1], [1])
