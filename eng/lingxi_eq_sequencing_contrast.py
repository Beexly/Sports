"""Stated sequencing contrasts from c03 M08.

contrast = P(pass | prev failed run) - P(pass | prev successful run)
Columns: sequencing__{2|3}__p_pass_after_fail_run, sequencing__{2|3}__p_pass_after_succ_run.
Source: docs/engine/research/2026-10-02/corpus-deep/deep/c03/buildable-systems.md M08.
No free coefficients. No score. No mint. Never main.
"""
from __future__ import annotations


def _num(row: dict, name: str) -> float | None:
    if row is None:
        return None
    try:
        v = row[name]
    except Exception:
        return None
    if v is None:
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _contrast(row: dict, lag: str) -> float | None:
    fail = _num(row, f"sequencing__{lag}__p_pass_after_fail_run")
    succ = _num(row, f"sequencing__{lag}__p_pass_after_succ_run")
    if fail is None or succ is None:
        return None
    return fail - succ


def sequencing_2_contrast(row: dict) -> float | None:
    """2nd-down lag contrast (fail run minus succ run)."""
    return _contrast(row, "2")


def sequencing_3_contrast(row: dict) -> float | None:
    """3rd-down lag contrast (fail run minus succ run)."""
    return _contrast(row, "3")


FUNCTIONS = {
    "sequencing_2_contrast": sequencing_2_contrast,
    "sequencing_3_contrast": sequencing_3_contrast,
}