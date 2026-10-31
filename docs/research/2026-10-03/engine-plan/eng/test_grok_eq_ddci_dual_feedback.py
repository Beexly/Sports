"""Fail-closed tests for ddci_dual_feedback_update from arXiv:2610.26987 eq (5)."""
from grok_eq_ddci_dual_feedback import ddci_dual_feedback_update


def test_basic_update():
    # q=1.0, eta=0.1, err=1, alpha=0.1, act=0.2, est=0.1, eps=0.5
    # delta = 0.1*(1-0.1) + 0.1*(0.2 - 0.5*0.1) = 0.09 + 0.1*0.15 = 0.105
    res = ddci_dual_feedback_update(1.0, 0.1, 1.0, 0.1, 0.2, 0.1, 0.5)
    assert res is not None and abs(res - 1.105) < 1e-9


def test_no_error_shrink():
    res = ddci_dual_feedback_update(2.0, 0.2, 0.0, 0.1, -0.1, 0.0, 1.0)
    # 2 + 0.2*(0-0.1) + 0.2*(-0.1 - 1*0) = 2 - 0.02 - 0.02 = 1.96
    assert res is not None and abs(res - 1.96) < 1e-9


def test_none_on_none_inputs():
    assert ddci_dual_feedback_update(None, 0.1, 1, 0.1, 0, 0, 0) is None
    assert ddci_dual_feedback_update(1.0, None, 1, 0.1, 0, 0, 0) is None
    assert ddci_dual_feedback_update(1.0, 0.1, None, 0.1, 0, 0, 0) is None
    assert ddci_dual_feedback_update(1.0, 0.1, 1, None, 0, 0, 0) is None
    assert ddci_dual_feedback_update(1.0, 0.1, 1, 0.1, None, 0, 0) is None
    assert ddci_dual_feedback_update(1.0, 0.1, 1, 0.1, 0, None, 0) is None
    assert ddci_dual_feedback_update(1.0, 0.1, 1, 0.1, 0, 0, None) is None


def test_none_on_bad_values():
    assert ddci_dual_feedback_update(1.0, -0.1, 1, 0.1, 0, 0, 0) is None  # negative eta
    assert ddci_dual_feedback_update(1.0, 0.1, 1, 1.5, 0, 0, 0) is None  # alpha > 1
    assert ddci_dual_feedback_update(1.0, 0.1, 1, -0.1, 0, 0, 0) is None  # alpha < 0
    assert ddci_dual_feedback_update(1.0, 0.1, 1, 0.1, 0, 0, -1) is None  # negative epsilon
    assert ddci_dual_feedback_update(float("nan"), 0.1, 1, 0.1, 0, 0, 0) is None
    assert ddci_dual_feedback_update(1.0, 0.1, "bad", 0.1, 0, 0, 0) is None
