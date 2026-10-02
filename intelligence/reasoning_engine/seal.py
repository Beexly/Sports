"""Attach the paper window and withhold any probability that has no receipt.

Called by the runner. It does not invent a pick to satisfy the schema.
"""
from __future__ import annotations

from typing import Any

from calibration.receipts import calibration_applied
from kernels.three import KernelGap, kernel_01_market_strength, kernel_02_form, kernel_03_shell
from research.corpus import WINDOW, BINDINGS, index
from trust.trace_row import to_trace_row, validate_trace_row


def _kernel_gaps(facts: list[dict[str, Any]]) -> list[str]:
    gaps: list[str] = []
    try:
        kernel_01_market_strength(None, None)
    except KernelGap as exc:
        gaps.append(str(exc))
    facets = None
    for fact in facts:
        value = fact.get("value")
        if isinstance(value, dict) and "pass_epa" in value and value.get("plays"):
            facets = value
            break
    if facets is None:
        gaps.append("02: no facet split on this trace. form is not filled in")
    else:
        try:
            kernel_02_form(facets)
        except KernelGap as exc:
            gaps.append(str(exc))
    try:
        kernel_03_shell(None, None)
    except KernelGap as exc:
        gaps.append(str(exc))
    return gaps


def seal_trace(doc: dict[str, Any]) -> dict[str, Any]:
    out = dict(doc)
    facts = list(out.get("facts") or [])
    for fact in facts:
        fact.setdefault("weight", None)
        fact.setdefault("weight_status", "withheld")
    gaps = list(out.get("gaps") or [])
    for gap in _kernel_gaps(facts):
        if gap not in gaps:
            gaps.append(gap)
    papers = index()
    out["facts"] = facts
    out["gaps"] = gaps
    out["paper_index"] = {
        "window": WINDOW,
        "n": len(papers),
        "weight": None,
        "weight_status": "withheld",
        "bindings": BINDINGS,
        "reason": "An abstract is not a fitted weight.",
    }
    out["calibration_applied"] = calibration_applied()
    for key in ("probability_before_calibration", "probability_after_calibration", "confidence"):
        if out.get(key) is not None:
            gaps.append(f"{key} withheld: no calibration receipt")
            out[key] = None
            out["gaps"] = gaps
    if out.get("pick") is not None:
        gaps.append("pick withheld: no independent-edge receipt")
        out["pick"] = None
        out["gaps"] = gaps
    row = to_trace_row(out)
    errors = validate_trace_row(row)
    if errors:
        raise RuntimeError("sealed trace failed its own row check: " + "; ".join(errors))
    if not papers:
        raise RuntimeError("paper window is empty")
    return out
