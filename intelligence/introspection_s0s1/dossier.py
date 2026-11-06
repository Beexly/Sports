"""SPEC-C dossier helpers: the line-move forecast field (§2.2) and the
read-of-record rules (§1.2.3).

The line-move forecast is a three-way probability vector over ordered
categories (AWAY, FLAT, HOME) for the archived spread's move from T0 to T1.
It is mandatory in a T0 read and must sum to 1. A game whose T0 passed with
no authored forecast carries the explicit MISSED_T0 marker instead — the
scorer treats a missing forecast as the reference (§2.2), and the marker
keeps that state honest and visible rather than silent.
"""

from __future__ import annotations

from datetime import datetime, timezone

CATEGORIES = ("AWAY", "FLAT", "HOME")
SUM_TOLERANCE = 1e-6


class ForecastError(ValueError):
    pass


def parse_utc(value: str) -> datetime:
    dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        raise ForecastError(f"timestamp lacks an explicit timezone designator: {value!r}")
    return dt.astimezone(timezone.utc)


def validate_line_move_forecast(field) -> dict:
    """Validate a dossier's line_move_forecast field. Returns a verdict."""
    if not isinstance(field, dict):
        raise ForecastError("line_move_forecast must be an object")
    status = field.get("status")
    if status == "MISSED_T0":
        if not field.get("reason"):
            raise ForecastError("MISSED_T0 forecast must carry a reason")
        return {"ok": True, "kind": "MISSED_T0"}
    if status != "FORECAST":
        raise ForecastError(f"line_move_forecast.status must be FORECAST or MISSED_T0, got {status!r}")
    q = field.get("q")
    if not isinstance(q, (list, tuple)) or len(q) != 3:
        raise ForecastError("line_move_forecast.q must be a 3-vector (AWAY, FLAT, HOME)")
    for v in q:
        if not isinstance(v, (int, float)) or isinstance(v, bool) or not (0.0 <= float(v) <= 1.0):
            raise ForecastError(f"line_move_forecast.q entries must be probabilities in [0, 1], got {v!r}")
    total = sum(float(v) for v in q)
    if abs(total - 1.0) > SUM_TOLERANCE:
        raise ForecastError(f"line_move_forecast.q must sum to 1 (got {total})")
    return {"ok": True, "kind": "FORECAST", "q": [float(v) for v in q]}


def categorize(delta: float) -> str:
    """Ordered category for a T0->T1 spread move (SPEC-A sign convention).

    The half-point threshold is the policy constant of §2.2: it is the
    smallest line increment.
    """
    if delta <= -0.5:
        return "AWAY"
    if delta >= 0.5:
        return "HOME"
    return "FLAT"


def t0_read(versions: list, t0_utc: str):
    """The T0 read of record: latest version with authored_utc <= T0 (§1.2.3)."""
    t0 = parse_utc(t0_utc)
    eligible = [v for v in versions if parse_utc(v["authored_utc"]) <= t0]
    return eligible[-1] if eligible else None


def final_read(versions: list, kickoff_utc: str):
    """The final read of record: latest version with authored_utc < kickoff."""
    kickoff = parse_utc(kickoff_utc)
    eligible = [v for v in versions if parse_utc(v["authored_utc"]) < kickoff]
    return eligible[-1] if eligible else None
