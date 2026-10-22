"""Fail-closed tests for agent_tanh_coupling_update. Returns None on invalid input."""
import math
import pytest
from grok_eq_agent_tanh_coupling_update import agent_tanh_coupling_update


def test_zero_step_unchanged():
    beliefs = [1.0, 0.0]
    adj = [0.0, 1.0]
    res = agent_tanh_coupling_update(beliefs, adj, 0.0, 0)
    assert res == 1.0


def test_symmetric_pull():
    beliefs = [1.0, -1.0]
    adj = [0.0, 1.0]
    res = agent_tanh_coupling_update(beliefs, adj, 0.1, 0)
    expected = 1.0 + 0.1 * math.tanh(-1.0 - 1.0)
    assert res is not None
    assert abs(res - expected) < 1e-9


def test_none_on_none_inputs():
    assert agent_tanh_coupling_update(None, [0.0], 0.1, 0) is None
    assert agent_tanh_coupling_update([1.0], None, 0.1, 0) is None
    assert agent_tanh_coupling_update([1.0], [0.0], None, 0) is None
    assert agent_tanh_coupling_update([1.0], [0.0], 0.1, None) is None


def test_none_on_bad_shapes_and_values():
    assert agent_tanh_coupling_update([1.0], [0.0, 1.0], 0.1, 0) is None
    assert agent_tanh_coupling_update([1.0], [0.0], -0.1, 0) is None
    assert agent_tanh_coupling_update([1.0], [0.0], 0.1, 1) is None
    assert agent_tanh_coupling_update([float("nan")], [0.0], 0.1, 0) is None
    assert agent_tanh_coupling_update("bad", [0.0], 0.1, 0) is None
