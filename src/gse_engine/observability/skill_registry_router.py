"""Arize deep-link/migration adapters & NVIDIA/Agent-Platform capability router."""

from __future__ import annotations

import base64
import json
import re
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Literal
from urllib.parse import quote

CapabilityDomain = Literal[
    "cv_biomechanics",
    "accelerated_simulation",
    "multi_agent_wave",
    "dossier_copy",
    "corpus_tree_search",
]

_BASE64_PATH_RE = re.compile(r"^[A-Za-z0-9+/=]{4,}$")
_PROMPT_INJECTION_RE = re.compile(
    r"(?:ignore\s+previous\s+instructions|system\s+prompt|<script|</script>)",
    re.IGNORECASE,
)

_ATTRIBUTION_HEADER = "agent-skills/1.0 (skill:agent-platform-skill-registry)"

_DOMAIN_ROUTES: dict[CapabilityDomain, tuple[str, str, float]] = {
    "cv_biomechanics": ("tao-setup", "orbit-desktop", 86.12),
    "accelerated_simulation": ("dgx-spark-skills", "blinkenbar", 86.12),
    "multi_agent_wave": ("ethos-orchestrate", "squad-hub", 86.12),
    "dossier_copy": ("ethos-write", "boardstate", 86.12),
    "corpus_tree_search": ("ethos-explore", "brain-graph", 86.12),
}


@dataclass(frozen=True, slots=True)
class BraintrustTurnRecord:
    """Source Braintrust log row prior to Arize AX OTLP conversion."""

    turn_id: str
    conversation_id: str
    user_id: str
    span_type: str
    input_payload: object
    output_payload: object
    parent_span_id: str | None = None


@dataclass(frozen=True, slots=True)
class ArizeOtlpSpanRecord:
    """Mapped OpenInference/Arize AX span emitting one trace per request turn."""

    trace_id: str
    span_id: str
    parent_span_id: str | None
    span_kind: str
    input_value: str
    output_value: str
    session_id: str
    user_id: str
    migration_source: str = "braintrust"


@dataclass(frozen=True, slots=True)
class SkillRouteVerdict:
    """Capability routing verdict binding NVIDIA Hermes & GCP Agent Platform."""

    domain: str
    nvidia_skill: str
    hermes_plugin: str
    wiring_score: float
    attribution_header: str
    dgx_invariants_ok: bool


def _ensure_base64_id(raw_id: str, field_name: str) -> str:
    cleaned = raw_id.strip()
    if not cleaned:
        raise ValueError(f"{field_name} must be non-empty.")
    if cleaned.isdigit():
        raise ValueError(f"{field_name} cannot be a raw numeric ID; pass base64 or typed ID.")
    if ":" in cleaned:
        return base64.b64encode(cleaned.encode("utf-8")).decode("ascii")
    if not _BASE64_PATH_RE.match(cleaned):
        raise ValueError(f"{field_name} must be valid base64 path characters.")
    return cleaned


def _serialize_untrusted_text(value: object) -> str:
    raw = value if isinstance(value, str) else json.dumps(value, sort_keys=True, default=str)
    return _PROMPT_INJECTION_RE.sub("[redacted-untrusted-directive]", raw)


def build_arize_deep_link(
    org_id: str,
    space_id: str,
    project_id: str,
    *,
    trace_id: str | None = None,
    span_id: str | None = None,
    session_id: str | None = None,
    start_ms: int = 1763164800000,
    end_ms: int = 1763251200000,
    base_url: str = "https://app.arize.com",
) -> str:
    """Constructs a validated Arize AX deep link with base64 IDs and UTC epoch bounds."""
    if start_ms <= 0 or end_ms <= start_ms:
        raise ValueError("end_ms must exceed positive start_ms.")

    b64_org = _ensure_base64_id(org_id, "org_id")
    b64_space = _ensure_base64_id(space_id, "space_id")
    b64_proj = _ensure_base64_id(project_id, "project_id")
    root = base_url.rstrip("/")
    proj_path = f"{root}/organizations/{b64_org}/spaces/{b64_space}/projects/{b64_proj}"

    if trace_id:
        url = (
            f"{proj_path}?selectedTraceId={quote(trace_id, safe='')}"
            "&queryFilterA=&selectedTab=llmTracing&timeZoneA=America%2FLos_Angeles"
            f"&startA={start_ms}&endA={end_ms}&envA=tracing&modelType=generative_llm"
        )
        if span_id:
            url += f"&selectedSpanId={quote(span_id, safe='')}"
        return url

    if session_id:
        return (
            f"{proj_path}?selectedSessionId={quote(session_id, safe='')}"
            "&queryFilterA=&selectedTab=llmTracing&timeZoneA=America%2FLos_Angeles"
            f"&startA={start_ms}&endA={end_ms}&envA=tracing&modelType=generative_llm"
        )

    return proj_path


def map_braintrust_turns_to_arize_spans(
    turns: Sequence[BraintrustTurnRecord],
) -> list[ArizeOtlpSpanRecord]:
    """Maps Braintrust conversation logs into one Arize AX trace per request turn."""
    spans: list[ArizeOtlpSpanRecord] = []
    for row in turns:
        if row.span_type == "chat.session":
            continue
        span_kind = "LLM" if row.span_type == "chat.request" else "TOOL"
        spans.append(
            ArizeOtlpSpanRecord(
                trace_id=f"ax-trace-{row.turn_id}",
                span_id=row.turn_id,
                parent_span_id=row.parent_span_id,
                span_kind=span_kind,
                input_value=_serialize_untrusted_text(row.input_payload),
                output_value=_serialize_untrusted_text(row.output_payload),
                session_id=row.conversation_id,
                user_id=row.user_id,
                migration_source="braintrust",
            )
        )
    return spans


def route_gse_capability_domain(
    domain: CapabilityDomain,
    sinkhorn_l1_divergence: float = 1e-7,
    max_delta_log_odds: float = 0.25,
) -> SkillRouteVerdict:
    """Routes domain tasks to NVIDIA Hermes + DGX Spark invariants with attribution."""
    nvidia_skill, hermes_plugin, score = _DOMAIN_ROUTES[domain]
    dgx_ok = sinkhorn_l1_divergence < 1e-6 and abs(max_delta_log_odds) <= 0.35
    return SkillRouteVerdict(
        domain=domain,
        nvidia_skill=nvidia_skill,
        hermes_plugin=hermes_plugin,
        wiring_score=score,
        attribution_header=_ATTRIBUTION_HEADER,
        dgx_invariants_ok=dgx_ok,
    )
