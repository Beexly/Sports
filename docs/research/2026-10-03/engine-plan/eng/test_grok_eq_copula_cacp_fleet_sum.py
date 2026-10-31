"""Fail-closed tests for copula_cacp_fleet_sum from arXiv:2602.02583."""
from grok_eq_copula_cacp_fleet_sum import copula_cacp_fleet_sum


def test_sum_two_sites():
    assert copula_cacp_fleet_sum([1.0, 2.5]) == 3.5


def test_sum_one_site():
    assert copula_cacp_fleet_sum([4.2]) == 4.2


def test_sum_zeros():
    assert copula_cacp_fleet_sum([0.0, 0.0, 0.0]) == 0.0


def test_none_on_empty():
    assert copula_cacp_fleet_sum([]) is None


def test_none_on_bad_inputs():
    assert copula_cacp_fleet_sum(None) is None
    assert copula_cacp_fleet_sum("not a list") is None
    assert copula_cacp_fleet_sum([1.0, "bad"]) is None
    assert copula_cacp_fleet_sum([1.0, None]) is None
    assert copula_cacp_fleet_sum([True, 1.0]) is None
