"""Fail-closed tests for ddci_quantile_update."""
import math
from grok_eq_ddci_quantile_update import ddci_quantile_update


def test_valid_update():
    res = ddci_quantile_update(0.5, 0.1, 1.0, 0.1)
    assert res is not None
    assert math.isclose(res, 0.5 + 0.1 * (1.0 - 0.1))
    assert math.isfinite(res)


def test_none_on_missing():
    assert ddci_quantile_update(None, 0.1, 1.0, 0.1) is None
    assert ddci_quantile_update(0.5, None, 1.0, 0.1) is None
    assert ddci_quantile_update(0.5, 0.1, None, 0.1) is None
    assert ddci_quantile_update(0.5, 0.1, 1.0, None) is None


def test_none_on_bad_eta_or_alpha():
    assert ddci_quantile_update(0.5, 0.0, 1.0, 0.1) is None
    assert ddci_quantile_update(0.5, -0.1, 1.0, 0.1) is None
    assert ddci_quantile_update(0.5, 0.1, 1.0, 0.0) is None
    assert ddci_quantile_update(0.5, 0.1, 1.0, 1.0) is None


def test_none_on_bad_err():
    assert ddci_quantile_update(0.5, 0.1, 0.5, 0.1) is None
    assert ddci_quantile_update(0.5, 0.1, 2.0, 0.1) is None
