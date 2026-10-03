import os

from reasoning_engine.publish_gate import reasoning_publish_allowed


def test_default_is_shut_even_for_a_clear_final_trace(monkeypatch):
    monkeypatch.delenv("PUBLISH_REASONING_TRACE", raising=False)
    assert reasoning_publish_allowed(
        "FINAL",
        {"offensive_line": "CLEAR", "qb_behavior": "CLEAR"},
    ) is False


def test_invalid_stays_shut_when_the_founder_opens_the_gate(monkeypatch):
    monkeypatch.setenv("PUBLISH_REASONING_TRACE", "true")
    assert reasoning_publish_allowed("INVALID", {"qb_behavior": "CLEAR"}) is False
    assert reasoning_publish_allowed(
        "FINAL",
        {"offensive_line": "DATA-GAP"},
    ) is False
    assert reasoning_publish_allowed(
        "FINAL",
        {"trust_signals": "UNCHECKED"},
    ) is False


def test_open_gate_allows_only_a_clear_final_trace(monkeypatch):
    monkeypatch.setenv("PUBLISH_REASONING_TRACE", "true")
    assert reasoning_publish_allowed(
        "FINAL",
        {"offensive_line": "CLEAR", "qb_behavior": "CLEAR"},
    ) is True
    os.environ.pop("PUBLISH_REASONING_TRACE", None)
