"""Trace row for an abstention audit.

Does not replace trust/abstention.py. That file is a synthetic backtest.
This one reads the trace the runner actually writes.
"""
from __future__ import annotations

from typing import Any


def to_trace_row(trace: dict[str, Any]) -> dict[str, Any]:
    probability = trace.get("probability_after_calibration")
    if probability is None:
        probability = trace.get("probability")
    gaps = list(trace.get("gaps") or [])
    abstention_level = trace.get("abstention_level")
    if probability is None and abstention_level is None:
        abstention_level = "L1"
    return {
        "game_id": trace.get("game_id"),
        "bet_type": trace.get("bet_type"),
        "probability": probability,
        "abstention_level": abstention_level,
        "gaps": gaps,
        "calibration_receipt": trace.get("calibration_receipt"),
    }


def validate_trace_row(row: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    probability = row.get("probability")
    if probability is not None and row.get("abstention_level"):
        errors.append("abstained row must not carry a probability")
    if probability is not None and not row.get("calibration_receipt"):
        errors.append("probability without a calibration receipt")
    if probability is not None and row.get("gaps"):
        errors.append("a gapped trace must not carry a probability")
    return errors
