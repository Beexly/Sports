"""Fail-closed tests for tilted_mondrian_aggregate_gap from arXiv:2610.24813 eq (5)."""
from grok_eq_tilted_mondrian_aggregate_gap import tilted_mondrian_aggregate_gap


def test_none_inputs():
    assert tilted_mondrian_aggregate_gap(None, {}, {}, {}) is None
    assert tilted_mondrian_aggregate_gap({}, None, {}, {}) is None
    assert tilted_mondrian_aggregate_gap({}, {}, None, {}) is None
    assert tilted_mondrian_aggregate_gap({}, {}, {}, None) is None


def test_empty():
    assert tilted_mondrian_aggregate_gap({}, {}, {}, {}) is None


def test_invalid_prob():
    assert tilted_mondrian_aggregate_gap({"z": -0.1}, {"z": 0.5}, {"z": 1.0}, {"z": 0.0}) is None


def test_non_finite():
    assert tilted_mondrian_aggregate_gap({"z": float("nan")}, {"z": 0.5}, {"z": 1.0}, {"z": 0.0}) is None
    assert tilted_mondrian_aggregate_gap({"z": 0.5}, {"z": float("inf")}, {"z": 1.0}, {"z": 0.0}) is None


def test_valid_simple():
    # pi_a = pi_b = 1.0 on z, delta=2, v=1 -> 1*2 + (1-1)*1 = 2
    result = tilted_mondrian_aggregate_gap(
        {"z": 1.0}, {"z": 1.0}, {"z": 2.0}, {"z": 1.0}
    )
    assert result == 2.0


def test_valid_composition():
    # pi_a(z)=0.6, pi_b=0.4, delta=1, v=3 -> 0.6*1 + (0.6-0.4)*3 = 0.6 + 0.6 = 1.2
    result = tilted_mondrian_aggregate_gap(
        {"z": 0.6}, {"z": 0.4}, {"z": 1.0}, {"z": 3.0}
    )
    assert abs(result - 1.2) < 1e-9
