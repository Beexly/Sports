# PROVENANCE — gse-intelligence-build / coaching / tenures.py
# Implements: buildable-systems.md M03 (coordinator tenure registry + YoY deltas).
# Research basis: deep/c03/syntheses.md Thread 1 (the adjustment-detection system
#   starts at the M03 tenure gate: same-coordinator-same-team YoY deltas, because
#   coordinator changes reset every tendency); verified-claims.md (A1 caveat:
#   all headline 1575 coach examples are fired — tenure status is load-bearing).
"""M03 — Coordinator tenure registry.

Seeded from the base pipeline's verified coach_offense.csv / coach_defense.csv
(confidence=1). Everything outside those verified rows is confidence=3
(unknown) — the full 32-team manual registry is queued research, flagged
honestly rather than invented (memory: never fabricate facts).
"""
from __future__ import annotations

import csv
import os
from typing import Any, Optional

from . import base_data as BD
from . import common as C

# The seed data location is resolved through base_data.py (env override ->
# in-repo -> legacy) so a fresh checkout fails loudly instead of silently
# returning an empty registry. Kept as a module attribute for back-compat.
BASE_DATA = BD.REPO_DATA_DIR

# coach_slug -> list of tenure records (verified seed only)
_REGISTRY: Optional[dict[str, list[dict[str, Any]]]] = None


def _load() -> dict[str, list[dict[str, Any]]]:
    global _REGISTRY
    if _REGISTRY is not None:
        return _REGISTRY
    # Raises DataGapError when the seed CSVs are absent — never an empty dict.
    base = BD.resolve(("coach_offense.csv", "coach_defense.csv"))
    reg: dict[str, list[dict[str, Any]]] = {}
    for fname, side in (("coach_offense.csv", "offense"), ("coach_defense.csv", "defense")):
        path = os.path.join(base, fname)
        if not os.path.exists(path):
            # Unreachable after resolve(); kept as a loud guard, not a skip.
            raise FileNotFoundError(
                f"coaching seed file vanished between resolve and read: {path}")
        with open(path, newline="") as fh:
            for r in csv.DictReader(fh):
                name = (r.get("coach") or "").strip()
                if not name:
                    continue
                slug = C.coach_slug(name)
                reg.setdefault(slug, []).append({
                    "name": name,
                    "slug": slug,
                    "role": (r.get("role") or "").strip(),
                    "side": side,
                    "team": (r.get("team") or "").strip(),
                    "season": int(r["season"]),
                    "confidence": 1,  # verified seed row
                    "source": f"coaching-tendencies/data/{fname}",
                    "row": r,
                })
    for slug in reg:
        reg[slug].sort(key=lambda r: r["season"])
        # years_with_team: consecutive seasons with the same team (windowed to seed years)
        runs: dict[tuple[str, int], int] = {}
        for rec in reg[slug]:
            key = (rec["team"], rec["season"])
            prev = runs.get((rec["team"], rec["season"] - 1), 0)
            runs[key] = prev + 1
            rec["years_with_team"] = runs[key]
            rec["years_with_team_note"] = "windowed to verified seed years (2022-2026)"
    _REGISTRY = reg
    return reg


def lookup_coach(name: str, season: int) -> Optional[dict[str, Any]]:
    """Verified tenure record for a coach in a season, or None (unknown)."""
    for rec in _load().get(C.coach_slug(name), []):
        if rec["season"] == season:
            return rec
    return None


def lookup_team_playcaller(team: str, season: int, side: str = "offense") -> Optional[dict[str, Any]]:
    """Verified playcaller/DC record for a team-season, or None."""
    for records in _load().values():
        for rec in records:
            if rec["team"] == team and rec["season"] == season and rec["side"] == side:
                return rec
    return None


def yoy_delta(name: str, season: int, field: str) -> Optional[dict[str, Any]]:
    """Same-coordinator-same-team year-over-year delta of a tendency field.

    Returns None when the coordinator changed teams/roles (delta would be
    meaningless) or either year is missing — the M03 gate that every downstream
    YoY comparison must pass through.
    """
    cur = lookup_coach(name, season)
    prev = lookup_coach(name, season - 1)
    if cur is None or prev is None:
        return None
    if cur["team"] != prev["team"] or cur["role"] != prev["role"]:
        return None  # coordinator changed context: tendencies reset
    try:
        a = float(cur["row"][field])
        b = float(prev["row"][field])
    except (TypeError, ValueError, KeyError):
        return None
    return {
        "coach": name, "team": cur["team"], "season": season, "field": field,
        "prev": b, "cur": a, "delta": a - b,
        "years_with_team": cur["years_with_team"],
    }


def registry_coverage() -> dict[str, Any]:
    """Honest coverage report of the seed registry."""
    reg = _load()
    n = sum(len(v) for v in reg.values())
    return {
        "verified_rows": n,
        "coaches": len(reg),
        "unverified_teams": "all team-seasons outside the seed rows are confidence=3 (unknown)",
        "queued_research": "full 32-team manual tenure registry",
    }
