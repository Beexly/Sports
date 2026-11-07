"""
schema_validator.py — Wave 7 (W7-01) Runtime JSON Schema & Domain Invariant Validator
=====================================================================================
Validates all Wave 7 and Wave 8 contracts against `/schemas/v1/*.schema.json`:
  1. `layer_output.schema.json`
  2. `context_packet.schema.json` (plus `as_of_utc < kickoff_utc` temporal leakage guard & 1..26 layer order)
  3. `reasoning_trace.schema.json` (plus strict `OL -> scheme -> QB` dependency order)
  4. `simulation_distribution.schema.json` (strictly `mode == "SYNTHETIC_FIXTURE_ONLY"`)
  5. `content_bundle.schema.json` (strictly `mode == "PLACEHOLDER_VALIDATION_ONLY"` + pulled-play redaction guard)
"""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
SCHEMA_DIR = REPO_ROOT / "schemas" / "v1"

SCHEMA_FILES: dict[str, str] = {
    "layer_output": "layer_output.schema.json",
    "context_packet": "context_packet.schema.json",
    "reasoning_trace": "reasoning_trace.schema.json",
    "simulation_distribution": "simulation_distribution.schema.json",
    "content_bundle": "content_bundle.schema.json",
}

PULLED_PLAY_BANNED_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"\b62-23-1\b", re.IGNORECASE),  # VOIDED_NOV_5_BATCH redaction guard
    re.compile(r"\bnyj\s+ml\b", re.IGNORECASE),
    re.compile(r"\bjets\s+dst\b", re.IGNORECASE),
    re.compile(r"\bchris\s+godwin\b", re.IGNORECASE),
)


class SchemaValidationError(ValueError):
    """Raised when a payload violates its versioned JSON Schema or domain invariant."""


def load_schema(schema_name: str) -> dict[str, Any]:
    """Load a versioned JSON schema from `schemas/v1/`."""
    filename = SCHEMA_FILES.get(schema_name, schema_name)
    if not filename.endswith(".json"):
        filename = f"{filename}.schema.json"
    schema_path = SCHEMA_DIR / filename
    if not schema_path.exists():
        raise SchemaValidationError(f"Schema file not found: {schema_path}")
    return json.loads(schema_path.read_text(encoding="utf-8"))


def _parse_iso_utc(ts: str, field_name: str) -> datetime:
    if not isinstance(ts, str) or not ts.strip():
        raise SchemaValidationError(f"{field_name} must be a non-empty ISO-8601 UTC string")
    normalized = ts.strip()
    if normalized.endswith("Z"):
        normalized = normalized[:-1] + "+00:00"
    try:
        dt = datetime.fromisoformat(normalized)
    except ValueError as exc:
        raise SchemaValidationError(f"Invalid ISO-8601 timestamp in {field_name}: '{ts}'") from exc
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _check_json_type(val: Any, expected_type: str | list[str], path: str) -> None:
    if isinstance(expected_type, list):
        for t in expected_type:
            try:
                _check_json_type(val, t, path)
                return
            except SchemaValidationError:
                continue
        raise SchemaValidationError(f"{path}: expected one of types {expected_type}, got {type(val).__name__}")

    if expected_type == "null":
        if val is not None:
            raise SchemaValidationError(f"{path}: expected null, got {type(val).__name__}")
    elif expected_type == "boolean":
        if not isinstance(val, bool):
            raise SchemaValidationError(f"{path}: expected boolean, got {type(val).__name__}")
    elif expected_type == "integer":
        if isinstance(val, bool) or not isinstance(val, int):
            raise SchemaValidationError(f"{path}: expected integer, got {type(val).__name__}")
    elif expected_type == "number":
        if isinstance(val, bool) or not isinstance(val, (int, float)):
            raise SchemaValidationError(f"{path}: expected number, got {type(val).__name__}")
    elif expected_type == "string":
        if not isinstance(val, str):
            raise SchemaValidationError(f"{path}: expected string, got {type(val).__name__}")
    elif expected_type == "array":
        if not isinstance(val, list):
            raise SchemaValidationError(f"{path}: expected array, got {type(val).__name__}")
    elif expected_type == "object":
        if not isinstance(val, dict):
            raise SchemaValidationError(f"{path}: expected object, got {type(val).__name__}")


def _validate_node(instance: Any, schema: dict[str, Any], path: str = "$") -> None:
    if "$ref" in schema:
        ref = schema["$ref"]
        if ref.endswith("layer_output.schema.json"):
            sub_schema = load_schema("layer_output")
            _validate_node(instance, sub_schema, path)
            return

    expected_type = schema.get("type")
    if expected_type is not None:
        _check_json_type(instance, expected_type, path)

    if "const" in schema and instance != schema["const"]:
        raise SchemaValidationError(f"{path}: expected const {schema['const']!r}, got {instance!r}")

    if "enum" in schema and instance not in schema["enum"]:
        raise SchemaValidationError(f"{path}: value {instance!r} not in enum {schema['enum']}")

    if isinstance(instance, str):
        if "minLength" in schema and len(instance) < schema["minLength"]:
            raise SchemaValidationError(f"{path}: string length {len(instance)} < minLength {schema['minLength']}")
        if "maxLength" in schema and len(instance) > schema["maxLength"]:
            raise SchemaValidationError(f"{path}: string length {len(instance)} > maxLength {schema['maxLength']}")
        if schema.get("format") == "date-time":
            _parse_iso_utc(instance, path)

    if isinstance(instance, (int, float)) and not isinstance(instance, bool):
        if "minimum" in schema and instance < schema["minimum"]:
            raise SchemaValidationError(f"{path}: value {instance} < minimum {schema['minimum']}")
        if "maximum" in schema and instance > schema["maximum"]:
            raise SchemaValidationError(f"{path}: value {instance} > maximum {schema['maximum']}")

    if isinstance(instance, list):
        if "minItems" in schema and len(instance) < schema["minItems"]:
            raise SchemaValidationError(f"{path}: array length {len(instance)} < minItems {schema['minItems']}")
        if "maxItems" in schema and len(instance) > schema["maxItems"]:
            raise SchemaValidationError(f"{path}: array length {len(instance)} > maxItems {schema['maxItems']}")
        item_schema = schema.get("items")
        if isinstance(item_schema, dict):
            for idx, item in enumerate(instance):
                _validate_node(item, item_schema, f"{path}[{idx}]")

    if isinstance(instance, dict):
        required = schema.get("required", [])
        for req_key in required:
            if req_key not in instance:
                raise SchemaValidationError(f"{path}: missing required property '{req_key}'")
        if "minProperties" in schema and len(instance) < schema["minProperties"]:
            raise SchemaValidationError(
                f"{path}: object has {len(instance)} properties, minProperties is {schema['minProperties']}"
            )
        props = schema.get("properties", {})
        if schema.get("additionalProperties") is False and props:
            extra_keys = set(instance.keys()) - set(props.keys())
            if extra_keys:
                raise SchemaValidationError(f"{path}: disallowed additionalProperties {sorted(extra_keys)}")
        for k, v in instance.items():
            if k in props:
                _validate_node(v, props[k], f"{path}.{k}")


def validate_against_schema(payload: dict[str, Any], schema_name: str) -> dict[str, Any]:
    """Validate `payload` against the named JSON schema in `schemas/v1/`."""
    schema = load_schema(schema_name)
    _validate_node(payload, schema, f"$({schema_name})")
    return payload


def validate_layer_output(payload: dict[str, Any]) -> dict[str, Any]:
    """Validate a single reasoning layer output against `layer_output.schema.json`."""
    validate_against_schema(payload, "layer_output")
    if payload["status"] in ("WAIVED_WITH_REASON", "MISSING_UPSTREAM"):
        if payload["uncertainty_width_delta"] <= 0:
            raise SchemaValidationError(
                f"Layer {payload['layer_id']} ({payload['layer_slug']}) has status {payload['status']} "
                "but uncertainty_width_delta <= 0 (must widen epistemic uncertainty when waived/missing)."
            )
    return payload


def validate_context_packet(payload: dict[str, Any]) -> dict[str, Any]:
    """Validate a 26-layer context packet and enforce the pre-game temporal leakage guard."""
    validate_against_schema(payload, "context_packet")

    as_of_dt = _parse_iso_utc(payload["as_of_utc"], "as_of_utc")
    kickoff_dt = _parse_iso_utc(payload["kickoff_utc"], "kickoff_utc")
    if not (as_of_dt < kickoff_dt):
        raise SchemaValidationError(
            f"Temporal leakage guard failed: as_of_utc ({payload['as_of_utc']}) "
            f"must be strictly earlier than kickoff_utc ({payload['kickoff_utc']})."
        )

    layers = payload["layers"]
    if len(layers) != 26:
        raise SchemaValidationError(f"Context packet must contain exactly 26 layers, got {len(layers)}")

    expected_ids = list(range(1, 27))
    actual_ids = [layer.get("layer_id") for layer in layers]
    if actual_ids != expected_ids:
        raise SchemaValidationError(
            f"Context packet layers must be ordered 1..26; got {actual_ids}"
        )

    for layer in layers:
        validate_layer_output(layer)
        if layer["game_id"] != payload["game_id"]:
            raise SchemaValidationError(
                f"Layer {layer['layer_id']} game_id ({layer['game_id']}) != packet game_id ({payload['game_id']})"
            )

    summary = payload["completeness_summary"]
    active_count = sum(1 for lyr in layers if lyr["status"] == "ACTIVE")
    waived_count = sum(1 for lyr in layers if lyr["status"] == "WAIVED_WITH_REASON")
    missing_count = sum(1 for lyr in layers if lyr["status"] == "MISSING_UPSTREAM")

    if (
        summary["active_layers"] != active_count
        or summary["waived_layers"] != waived_count
        or summary["missing_upstream_layers"] != missing_count
        or active_count + waived_count + missing_count != 26
    ):
        raise SchemaValidationError(
            "completeness_summary counts do not match layer status distribution: "
            f"summary={summary}, computed=(active={active_count}, waived={waived_count}, missing={missing_count})"
        )

    return payload


def validate_reasoning_trace(payload: dict[str, Any]) -> dict[str, Any]:
    """Validate an L1-L5 reasoning trace and enforce `OL -> scheme -> QB` dependency ordering."""
    validate_against_schema(payload, "reasoning_trace")

    if payload.get("dependency_order_verified") is not True:
        raise SchemaValidationError("reasoning_trace must have dependency_order_verified == True")

    l5 = payload["levels"].get("L5_synthesis", {})
    hierarchy = l5.get("hierarchy_order")
    if isinstance(hierarchy, list):
        try:
            ol_idx = hierarchy.index("offensive_line")
            scheme_idx = hierarchy.index("coaching_scheme")
            qb_idx = hierarchy.index("qb_behavior")
        except ValueError as exc:
            raise SchemaValidationError(
                f"L5_synthesis.hierarchy_order missing required track in {hierarchy}"
            ) from exc
        if not (ol_idx < scheme_idx < qb_idx):
            raise SchemaValidationError(
                f"Hierarchy violation in L5_synthesis: expected OL -> scheme -> QB, got {hierarchy}"
            )

    if payload["fallback_fired"] and not payload.get("fallback_reason"):
        raise SchemaValidationError("fallback_reason is required when fallback_fired is True")

    return payload


def validate_simulation_distribution(payload: dict[str, Any]) -> dict[str, Any]:
    """Validate a synthetic simulation distribution (`mode == 'SYNTHETIC_FIXTURE_ONLY'`)."""
    validate_against_schema(payload, "simulation_distribution")

    if payload.get("mode") != "SYNTHETIC_FIXTURE_ONLY":
        raise SchemaValidationError("simulation_distribution mode must be 'SYNTHETIC_FIXTURE_ONLY'")

    wp_sum = float(payload["win_prob_home"]) + float(payload["win_prob_away"])
    if abs(wp_sum - 1.0) > 1e-4:
        raise SchemaValidationError(
            f"win_prob_home + win_prob_away must equal 1.0 (+/- 1e-4), got {wp_sum}"
        )

    for q_field in ("spread_quantiles", "total_quantiles"):
        q = payload[q_field]
        ordered = [q["p05"], q["p25"], q["p50"], q["p75"], q["p95"]]
        if ordered != sorted(ordered):
            raise SchemaValidationError(f"{q_field} quantiles are not monotonic: {q}")

    return payload


def validate_content_bundle(payload: dict[str, Any]) -> dict[str, Any]:
    """Validate a placeholder content bundle (`mode == 'PLACEHOLDER_VALIDATION_ONLY'`)."""
    validate_against_schema(payload, "content_bundle")

    if payload.get("mode") != "PLACEHOLDER_VALIDATION_ONLY":
        raise SchemaValidationError("content_bundle mode must be 'PLACEHOLDER_VALIDATION_ONLY'")

    for idx, section in enumerate(payload["sections"]):
        text_blob = f"{section.get('title', '')} {section.get('body', '')}"
        for pattern in PULLED_PLAY_BANNED_PATTERNS:
            if pattern.search(text_blob):
                raise SchemaValidationError(
                    f"Redaction guard violation in sections[{idx}]: matched banned pattern '{pattern.pattern}'"
                )

    return payload
