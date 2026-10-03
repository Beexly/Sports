"""Fail-closed mint gate for a game the mind was asked to cover.

analyze() is not a probability. INVALID or any DATA-GAP track withholds the
game. The gate has no path that returns 0.5. asked=False is the games the
mind was not asked to cover: pass, and the caller leaves them alone.
"""
from __future__ import annotations

from typing import Any, Mapping


def mint_after_mind(
    label: str | None,
    checklist: Mapping[str, str] | None,
    *,
    asked: bool,
) -> dict[str, Any]:
    if not asked:
        return {"action": "pass", "reason": "mind was not asked"}
    lab = (label or "").strip()
    if lab == "INVALID" or lab.startswith("INVALID"):
        return {
            "action": "withhold",
            "reason": "analyze() returned INVALID; no probability was substituted",
        }
    gaps = sorted(
        key for key, value in (checklist or {}).items()
        if value in ("DATA-GAP", "DATA_GAP")
    )
    if gaps:
        return {
            "action": "withhold",
            "reason": "analyze() DATA-GAP on " + ", ".join(gaps) + "; no probability was substituted",
        }
    return {"action": "pass", "reason": "a trace does not mint a probability"}
