"""Fail-closed mint gate for a game the mind was asked to cover.

analyze() is not a probability. INVALID or any DATA-GAP track withholds the
game. The gate has no path that returns 0.5. asked=False is the games the
mind was not asked to cover: pass, and the caller leaves them alone.

A conformal pass-discipline advisory (gates/conformal_pass_discipline.py),
when supplied, is a one-directional veto: a NO_BET verdict — or a malformed
advisory — withholds a game that would otherwise pass. It sits after the
INVALID / DATA-GAP checks, so it can never mask them, and a COVERED verdict
changes nothing: conformal discipline can only ever say no.
"""
from __future__ import annotations

from typing import Any, Mapping


def mint_after_mind(
    label: str | None,
    checklist: Mapping[str, str] | None,
    *,
    asked: bool,
    conformal: Mapping[str, Any] | None = None,
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
    if conformal is not None:
        verdict = conformal.get("verdict")
        if verdict == "NO_BET":
            reasons = conformal.get("reasons") or []
            detail = "; ".join(str(r) for r in reasons) or "interval not formed"
            return {
                "action": "withhold",
                "reason": "conformal pass discipline NO_BET: " + detail + "; no probability was substituted",
            }
        if verdict != "COVERED":
            return {
                "action": "withhold",
                "reason": "conformal pass discipline advisory malformed (no COVERED/NO_BET verdict); fail closed; no probability was substituted",
            }
    return {"action": "pass", "reason": "a trace does not mint a probability"}
