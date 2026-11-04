"""
Sentry Observability & AI Agent Monitoring for Galaxy Sports Edge (Python).

Integrates Sentry for Startups (org: 'galaxy-sports-edge') with:
- Distributed traces and spans
- GenAI / AI Agent Monitoring (Hermes, Jev, model runs, tool calls, token usage)
- Exception capture and triage context
- FastMCP / low-level MCP server monitoring via Sentry MCP integration

Safe by default: When SENTRY_DSN is absent, every function and context manager
cleanly no-ops with zero overhead and without throwing.
"""

from __future__ import annotations

import contextlib
import json
import logging
import os
from typing import Any, Dict, Generator, Optional

logger = logging.getLogger("gse.observability")

_initialized: bool = False

try:
    import sentry_sdk
    from sentry_sdk.integrations.mcp import MCPIntegration
    _HAS_SENTRY = True
except ImportError:
    sentry_sdk = None  # type: ignore
    MCPIntegration = None  # type: ignore
    _HAS_SENTRY = False


def init_python_observability(dsn: Optional[str] = None) -> bool:
    """
    Initialize Sentry for Python services and agent workflows.
    Returns True if initialized, False if skipped due to missing DSN or library.
    """
    global _initialized

    resolved_dsn = dsn or os.environ.get("SENTRY_DSN")
    if not resolved_dsn or not _HAS_SENTRY or sentry_sdk is None:
        if not _initialized:
            logger.info("observability: Python Sentry not wired (no DSN or sentry-sdk absent)")
        return False

    if _initialized:
        return True

    traces_sample_rate = float(
        os.environ.get("SENTRY_TRACES_SAMPLE_RATE", "1.0" if os.environ.get("ENVIRONMENT") == "development" else "0.1")
    )
    environment = os.environ.get("ENVIRONMENT", "development")
    org = os.environ.get("SENTRY_ORG", "galaxy-sports-edge")

    integrations = []
    if MCPIntegration is not None:
        try:
            integrations.append(MCPIntegration())
        except Exception as e:
            logger.debug(f"Could not enable MCP integration: {e}")

    try:
        sentry_sdk.init(
            dsn=resolved_dsn,
            traces_sample_rate=traces_sample_rate,
            environment=environment,
            integrations=integrations,
            send_default_pii=False,
            _experiments={
                "enable_ai_monitoring": True,
            },
        )
        sentry_sdk.set_tag("org", org)
        sentry_sdk.set_tag("service", "gse-intelligence")
        _initialized = True
        logger.info(f"observability: Sentry wired for org '{org}' (env: {environment})")
        return True
    except Exception as exc:
        logger.warning(f"Failed to initialize Sentry: {exc}")
        return False


@contextlib.contextmanager
def trace_ai_agent_run(
    agent_name: str,
    model: str = "unknown",
    conversation_id: str = "default",
    prompt: Optional[str] = None,
) -> Generator[Any, None, None]:
    """
    Context manager to trace an AI agent's execution lifecycle.
    Conforms to OpenTelemetry GenAI semantic conventions.
    """
    if not _initialized or sentry_sdk is None:
        yield None
        return

    span_name = f"ai.agent.{agent_name}"
    with sentry_sdk.start_span(op="gen_ai.agent", description=span_name) as span:
        span.set_data("gen_ai.agent.name", agent_name)
        span.set_data("gen_ai.request.model", model)
        span.set_data("gen_ai.conversation.id", conversation_id)
        if prompt:
            span.set_data("gen_ai.prompt", prompt[:500])
        try:
            yield span
        except Exception as exc:
            span.set_status("internal_error")
            sentry_sdk.capture_exception(exc)
            raise


@contextlib.contextmanager
def trace_ai_tool_call(
    tool_name: str,
    input_args: Optional[Dict[str, Any]] = None,
) -> Generator[Any, None, None]:
    """
    Context manager to trace an AI tool call within an agent run.
    """
    if not _initialized or sentry_sdk is None:
        yield None
        return

    span_name = f"ai.tool.{tool_name}"
    with sentry_sdk.start_span(op="gen_ai.tool_call", description=span_name) as span:
        span.set_data("gen_ai.tool.name", tool_name)
        if input_args:
            try:
                span.set_data("gen_ai.tool.args", json.dumps(input_args)[:1000])
            except Exception:
                span.set_data("gen_ai.tool.args", str(input_args)[:1000])
        try:
            yield span
        except Exception as exc:
            span.set_status("internal_error")
            sentry_sdk.capture_exception(exc)
            raise


def record_ai_token_usage(
    model: str,
    input_tokens: Optional[int] = None,
    output_tokens: Optional[int] = None,
    total_tokens: Optional[int] = None,
) -> None:
    """
    Record token counts on the currently active span.
    """
    if not _initialized or sentry_sdk is None:
        return

    try:
        current_span = sentry_sdk.get_current_span()
        if current_span:
            current_span.set_data("gen_ai.response.model", model)
            if input_tokens is not None:
                current_span.set_data("gen_ai.usage.input_tokens", input_tokens)
            if output_tokens is not None:
                current_span.set_data("gen_ai.usage.output_tokens", output_tokens)
            if total_tokens is not None:
                current_span.set_data("gen_ai.usage.total_tokens", total_tokens)
    except Exception as exc:
        logger.debug(f"Could not record token usage on active span: {exc}")


def capture_python_error(
    err: Exception,
    context: Optional[Dict[str, Any]] = None,
) -> None:
    """
    Capture an exception and send to Sentry with extra triage context.
    No-ops cleanly if uninitialized.
    """
    if not _initialized or sentry_sdk is None:
        return

    try:
        scope_cm = getattr(sentry_sdk, "new_scope", getattr(sentry_sdk, "push_scope", None))
        if scope_cm is not None:
            with scope_cm() as scope:
                if context:
                    for key, val in context.items():
                        scope.set_extra(key, val)
                sentry_sdk.capture_exception(err)
        else:
            sentry_sdk.capture_exception(err)
    except Exception as exc:
        logger.debug(f"Failed to capture exception to Sentry: {exc}")


def get_observability_posture() -> str:
    """
    Return current observability wiring state for telemetry and health reports.
    """
    dsn = os.environ.get("SENTRY_DSN")
    return "error tracking: wired (DSN set)" if dsn else "error tracking: not wired (no DSN)"
