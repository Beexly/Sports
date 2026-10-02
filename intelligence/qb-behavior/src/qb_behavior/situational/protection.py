# PROVENANCE — qb-behavior / situational / protection.py
# Runtime server for Protection Stress (stdlib + csv ONLY).
# Implements: corpus-intelligence/deep/c02/buildable-systems.md (System 1b);
# verified-claims.md PRESS-3/4/5/10. Formula/guards verbatim from
# docs/models/qb-pressure-indices-proposal.md :41-50.
# Usage bar (PRESS-5): display + analyst use only in v1 — no pick-engine input.
"""Protection Stress: team-week OL stress vs blitz-exposure expectation.

stress = pressure_rate_allowed - (alpha + beta * blitz_rate_faced),
league OLS refit weekly. Positive = the line gives up more pressure than its
blitz exposure explains (losing one-on-ones). Served with caveats (a01
CH-PRESS-6/7/8): blitz rate is endogenous; QB-fault sacks inflate it;
quick-game scheme confounds it.
"""
from __future__ import annotations

import csv
import os
from typing import Any

import numpy as np


def _f(v: str) -> float | None:
    v = (v or "").strip()
    return float(v) if v else None


def _i(v: str) -> int | None:
    v = (v or "").strip()
    return int(float(v)) if v else None


def ols_fit(x: "np.ndarray", y: "np.ndarray") -> tuple[float, float, float]:
    """Unweighted OLS y ~ a + b*x (proposal :44-45, 'linear', refit weekly).

    Documented implementer choices (a01 CH-PRESS-9): unweighted; WITH
    intercept; sub-3-game teams excluded from the fit pool (build script).
    Returns (alpha, beta, t_beta). Degenerate x -> slope 0, intercept = mean.
    Shared by the build-time generator and (for audit) the runtime.
    """
    n = len(x)
    if n < 2:
        return float(np.mean(y)) if n else 0.0, 0.0, 0.0
    vx = float(np.var(x))
    if vx <= 0:
        return float(np.mean(y)), 0.0, 0.0
    b = float(np.cov(x, y, bias=True)[0, 1] / vx)
    a = float(np.mean(y) - b * np.mean(x))
    resid = y - (a + b * x)
    s2 = float(np.sum(resid ** 2) / max(n - 2, 1))
    se_b = (s2 / (n * vx)) ** 0.5 if n * vx > 0 else float("inf")
    if se_b > 0 and np.isfinite(se_b):
        t_b = b / se_b
    elif b != 0:
        t_b = float("inf")  # perfect fit: slope is exact
    else:
        t_b = 0.0
    return a, b, float(t_b)


ANALYST_ONLY_NOTE = (
    "Protection Stress is display + analyst use only in v1 (proposal :57-60): "
    "no pick-engine input until calibration says otherwise. Caveats: blitz rate "
    "is endogenous (defenses choose it); QB-fault sacks inflate the line's number; "
    "quick-game scheme suppresses both rates."
)


class ProtectionStressIndex:
    """Loads data/protection_stress.csv once; serves team-week stress."""

    def __init__(self, data_dir: str):
        self.data_dir = data_dir
        # (team, season, week) -> row
        self.rows: dict[tuple, dict] = {}
        self._load()

    def _load(self) -> None:
        p = os.path.join(self.data_dir, "protection_stress.csv")
        if not os.path.exists(p):
            return
        with open(p, newline="") as f:
            for r in csv.DictReader(f):
                self.rows[(r["team"], int(r["season"]), int(r["week"]))] = r

    def get(self, team: str, season: int, week: int) -> dict[str, Any] | None:
        """Latest row with week <= requested. None when never observed."""
        cands = [(w, r) for (t, s, w), r in self.rows.items()
                 if t == team and s == season and w <= week]
        if not cands:
            return None
        _, r = max(cands, key=lambda x: x[0])
        return {
            "team": team, "season": season, "week": int(r["week"]),
            "games": _i(r["games"]), "dropbacks": _i(r["dropbacks"]),
            "pressure_rate_allowed": _f(r["press_rate_allowed"]),
            "blitz_rate_faced": _f(r["blitz_rate_faced"]),
            "expected_rate": _f(r["expected_rate"]),
            "stress": _f(r["stress"]),
            "alpha": _f(r["alpha"]), "beta": _f(r["beta"]),
            "t_beta": _f(r["t_beta"]), "fit_n": _i(r["fit_n"]),
            "null_reason": r["null_reason"] or None,
            "note": ANALYST_ONLY_NOTE,
            "verification": "COMPUTED",
        }
