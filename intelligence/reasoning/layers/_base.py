"""
_base.py — Shared helper utilities for all 26 Wave 7 executable reasoning layers.
"""

from __future__ import annotations

from typing import Any

from intelligence.reasoning.schema_validator import validate_layer_output


def resolve_layer_status(
    game_input: dict[str, Any],
    layer_id: int,
    layer_slug: str,
    default_uncertainty_delta: float = 0.0,
) -> tuple[str, str, float]:
    """
    Determine whether a layer is `ACTIVE`, `WAIVED_WITH_REASON`, or `MISSING_UPSTREAM`
    from `game_input["layer_overrides"]` or `game_input["waived_layers"]` / `game_input["missing_layers"]`.
    """
    overrides = game_input.get("layer_overrides", {})
    layer_override = overrides.get(str(layer_id)) or overrides.get(layer_id) or overrides.get(layer_slug) or {}
    if isinstance(layer_override, dict) and "status" in layer_override:
        status = str(layer_override["status"])
        reason = str(
            layer_override.get(
                "status_reason",
                f"Explicit override for layer {layer_id} ({layer_slug}): {status}",
            )
        )
        default_widen = 0.035 if status != "ACTIVE" else default_uncertainty_delta
        width_delta = float(layer_override.get("uncertainty_width_delta", default_widen))
        return status, reason, max(0.0, width_delta)

    waived_map = game_input.get("waived_layers", {})
    if str(layer_id) in waived_map or layer_id in waived_map or layer_slug in waived_map:
        reason = str(
            waived_map.get(str(layer_id))
            or waived_map.get(layer_id)
            or waived_map.get(layer_slug)
            or f"Historical/offline fixture waiver for {layer_slug}"
        )
        return "WAIVED_WITH_REASON", reason, max(0.025, default_uncertainty_delta)

    missing_list = game_input.get("missing_layers", [])
    if layer_id in missing_list or str(layer_id) in missing_list or layer_slug in missing_list:
        return (
            "MISSING_UPSTREAM",
            f"Upstream feed unavailable for layer {layer_id} ({layer_slug}); uncertainty widened.",
            max(0.045, default_uncertainty_delta),
        )

    return (
        "ACTIVE",
        f"Layer {layer_id:02d} ({layer_slug}) verified active within SLA freshness window.",
        max(0.0, float(default_uncertainty_delta)),
    )


def build_layer_output(
    *,
    layer_id: int,
    layer_slug: str,
    game_input: dict[str, Any],
    inputs: list[str] | tuple[str, ...],
    source_datasets: list[str] | tuple[str, ...],
    freshness_rule: str,
    consumer: str,
    signals: dict[str, Any],
    citations: list[str] | tuple[str, ...],
    default_uncertainty_delta: float = 0.002,
) -> dict[str, Any]:
    """Assemble and schema-validate a single layer output dictionary."""
    game_id = str(game_input.get("game_id", "2026_W09_JAX_BAL"))
    as_of_utc = str(game_input.get("as_of_utc", "2026-11-01T14:00:00Z"))

    status, status_reason, uncertainty_width_delta = resolve_layer_status(
        game_input=game_input,
        layer_id=layer_id,
        layer_slug=layer_slug,
        default_uncertainty_delta=default_uncertainty_delta,
    )

    overrides = game_input.get("layer_overrides", {})
    layer_override = overrides.get(str(layer_id)) or overrides.get(layer_id) or overrides.get(layer_slug) or {}
    merged_signals = dict(signals)
    if isinstance(layer_override, dict) and isinstance(layer_override.get("signals"), dict):
        merged_signals.update(layer_override["signals"])

    payload: dict[str, Any] = {
        "layer_id": int(layer_id),
        "layer_slug": str(layer_slug),
        "game_id": game_id,
        "as_of_utc": as_of_utc,
        "status": status,
        "status_reason": status_reason,
        "inputs": [str(x) for x in inputs],
        "source_datasets": [str(x) for x in source_datasets],
        "freshness_rule": str(freshness_rule),
        "consumer": str(consumer),
        "signals": merged_signals,
        "uncertainty_width_delta": round(float(uncertainty_width_delta), 6),
        "citations": [str(c) for c in citations],
    }
    return validate_layer_output(payload)
