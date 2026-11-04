"""
Unit tests for Python Sentry Observability & AI Agent Monitoring.
Tests no-DSN path safety, tracing context managers, token usage accounting,
and error triage capture.
"""

import os
import pytest
from unittest.mock import patch, MagicMock

from intelligence.observability.sentry_ai_tracer import (
    init_python_observability,
    trace_ai_agent_run,
    trace_ai_tool_call,
    record_ai_token_usage,
    capture_python_error,
    get_observability_posture,
)


@pytest.fixture(autouse=True)
def clean_sentry_env():
    """Ensure environment is clean before and after each test."""
    old_dsn = os.environ.get("SENTRY_DSN")
    if "SENTRY_DSN" in os.environ:
        del os.environ["SENTRY_DSN"]
    yield
    if old_dsn is not None:
        os.environ["SENTRY_DSN"] = old_dsn
    elif "SENTRY_DSN" in os.environ:
        del os.environ["SENTRY_DSN"]


def test_init_python_observability_no_dsn():
    """Verify init is safe no-op when SENTRY_DSN is absent."""
    success = init_python_observability()
    assert success is False
    assert get_observability_posture() == "error tracking: not wired (no DSN)"


def test_init_python_observability_idempotent():
    """Calling init multiple times without DSN does not raise."""
    assert init_python_observability() is False
    assert init_python_observability() is False


def test_trace_ai_agent_run_context_manager_no_dsn():
    """Verify trace_ai_agent_run yields and executes code cleanly without DSN."""
    executed = False
    with trace_ai_agent_run(agent_name="hermes-forensic", model="claude-3-7-sonnet", conversation_id="conv-123") as span:
        executed = True
        assert span is None
    assert executed is True


def test_trace_ai_tool_call_context_manager_no_dsn():
    """Verify trace_ai_tool_call yields and executes code cleanly without DSN."""
    result = None
    with trace_ai_tool_call(tool_name="get_odds_snapshot", input_args={"sport": "nfl"}):
        result = "tool_executed"
    assert result == "tool_executed"


def test_trace_ai_agent_run_exception_propagation():
    """Verify exceptions inside agent block are propagated faithfully."""
    with pytest.raises(ValueError, match="simulated failure"):
        with trace_ai_agent_run(agent_name="failing-agent", model="test-model"):
            raise ValueError("simulated failure")


def test_record_ai_token_usage_safe_without_dsn():
    """Verify record_ai_token_usage runs without throwing when no DSN/active span."""
    # Should not throw
    record_ai_token_usage(model="claude-3-7-sonnet", input_tokens=100, output_tokens=200)


def test_capture_python_error_safe_without_dsn():
    """Verify capture_python_error runs without throwing when no DSN."""
    capture_python_error(RuntimeError("test error"), context={"subsystem": "test"})


def test_observability_posture_with_mocked_dsn():
    """Verify posture string accurately reflects presence of DSN."""
    os.environ["SENTRY_DSN"] = "https://mock@ingest.sentry.io/123456"
    assert get_observability_posture() == "error tracking: wired (DSN set)"


def test_initialized_ai_agent_and_tool_tracing():
    """Verify agent and tool spans are emitted when Sentry is initialized."""
    import intelligence.observability.sentry_ai_tracer as sat
    
    mock_span = MagicMock()
    mock_span.__enter__.return_value = mock_span
    mock_span.__exit__.return_value = False

    with patch.object(sat, "_initialized", True), \
         patch.object(sat.sentry_sdk, "start_span", return_value=mock_span), \
         patch.object(sat.sentry_sdk, "get_current_span", return_value=mock_span), \
         patch.object(sat.sentry_sdk, "capture_exception") as mock_capture:
        
        # Test agent run
        with trace_ai_agent_run(agent_name="hermes-lead", model="claude-3-7-sonnet", conversation_id="c-456", prompt="analyze game") as s:
            assert s == mock_span
            record_ai_token_usage(model="claude-3-7-sonnet", input_tokens=500, output_tokens=150, total_tokens=650)
            
        mock_span.set_data.assert_any_call("gen_ai.agent.name", "hermes-lead")
        mock_span.set_data.assert_any_call("gen_ai.request.model", "claude-3-7-sonnet")
        mock_span.set_data.assert_any_call("gen_ai.conversation.id", "c-456")
        mock_span.set_data.assert_any_call("gen_ai.usage.input_tokens", 500)
        
        # Test tool call
        with trace_ai_tool_call(tool_name="run_pbp_simulation", input_args={"snaps": 175}) as ts:
            assert ts == mock_span
            
        mock_span.set_data.assert_any_call("gen_ai.tool.name", "run_pbp_simulation")
        
        # Test error capture
        test_err = RuntimeError("engine disruption")
        capture_python_error(test_err, context={"week": 9})
        mock_capture.assert_called_with(test_err)

