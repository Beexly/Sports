# PROVENANCE — gse-intelligence-build / coaching / fingerprint.py
# Implements: buildable-systems.md M02 (coordinator scheme fingerprint),
#   syntheses.md Thread 1 (Monken fingerprint: quick-game/air-yards/shotgun
#   vector), reasoning-depth-spec.md T1 (the regression fixture).
# Research basis: base pipeline off_tendencies.csv (verified team-season
#   tendencies); quick_game_rate = air_yards <= 5 share (nflverse proxy —
#   the contract labels it as such until TTT is sourced).
"""M02 — Scheme fingerprint: the z-scored tendency vector identifying a
coordinator's scheme (quick-game rate, air yards, shotgun, early-down pass
rate, PROE, script elasticity, pace)."""
from __future__ import annotations

import csv
import math
import os
from typing import Any, Optional

from . import common as C
from . import load as L
from . import proe as PROE

BASE_DATA = os.path.expanduser("~/workspace/coaching-tendencies/data")

_FPRINT_KEYS = ["pass_rate_early", "shotgun_rate", "no_huddle_rate",
                "quick_game_rate", "avg_air_yards", "pace_sec_median"]

_base_rows: Optional[list[dict[str, Any]]] = None


def _base() -> list[dict[str, Any]]:
    global _base_rows
    if _base_rows is None:
        with open(os.path.join(BASE_DATA, "off_tendencies.csv"), newline="") as fh:
            _base_rows = list(csv.DictReader(fh))
    return _base_rows


def _fnum(v: Any) -> float:
    try:
        x = float(v)
        return x if x == x else math.nan
    except (TypeError, ValueError):
        return math.nan


def team_fingerprint(season: int, team: str) -> Optional[dict[str, Any]]:
    """Season-level scheme fingerprint: raw values + within-season z-scores."""
    rows = [r for r in _base() if int(r["season"]) == season]
    hit = next((r for r in rows if r["team"] == team), None)
    if hit is None:
        return None
    out: dict[str, Any] = {"season": season, "team": team, "values": {}, "zscores": {}}
    for k in _FPRINT_KEYS:
        vals = [_fnum(r[k]) for r in rows]
        out["values"][k] = _fnum(hit[k])
        zs = C.zscore_within_season(vals)
        idx = next(i for i, r in enumerate(rows) if r["team"] == team)
        out["zscores"][k] = zs[idx]
    proe_row = PROE.get_proe(season, team)
    out["values"]["proe"] = proe_row["proe"] if proe_row else None
    return out


def weekly_fingerprint(season: int, team: str, week: int) -> Optional[dict[str, Any]]:
    """Week-level fingerprint from weekly_tendencies.csv (regime/adjustment feed)."""
    row = L.index_by("weekly_tendencies.csv", "season", "team", "week").get(
        (season, team, week))
    if row is None:
        return None
    return dict(row)


def t1_fixture_check() -> dict[str, Any]:
    """Reasoning-depth-spec T1 regression fixture: Monken 2026 CLE values.

    Fixture: quickgame 0.639, air_yards 6.12, pass_rate_early 0.562;
    breaking condition restated in quick_game_rate terms (TTT is charting-gapped).
    """
    fp = team_fingerprint(2026, "CLE")
    if fp is None:
        return {"status": "DATA-GAP", "reason": "no 2026 CLE fingerprint"}
    v = fp["values"]
    checks = {
        "quick_game_rate": (v["quick_game_rate"], 0.639, 0.005),
        "avg_air_yards": (v["avg_air_yards"], 6.12, 0.05),
        "pass_rate_early": (v["pass_rate_early"], 0.562, 0.005),
    }
    detail = {k: {"actual": a, "expected": e, "tol": t,
                  "pass": abs(a - e) <= t if not math.isnan(a) else False}
              for k, (a, e, t) in checks.items()}
    return {
        "status": "PASS" if all(d["pass"] for d in detail.values()) else "FAIL",
        "detail": detail,
        # T1 breaking condition, restated: TTT is unavailable in nflverse
        # (DATA_GAPS.md), so the break is defined on the quick-game proxy.
        "breaking_condition": "quick_game_rate < 0.55 (TTT > 2.6s restated — TTT charting-gapped)",
        "ttt_seconds": None,
        "ttt_gap": "time-to-throw unavailable in nflverse; NGS internal-only per doctrine",
    }
