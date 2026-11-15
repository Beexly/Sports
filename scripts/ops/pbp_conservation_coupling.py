"""PBP coupling and JEV-fallback rules the Week 8 autopsy named.

The 10,000-world simulator already conserves team yards. Blending those draws
back toward a static per-game mean, or stamping LOCK_TOURNAMENT_ALPHA when
JEV did not run, is what put 0-point chalk into locked lineups.
"""
from __future__ import annotations

from typing import Any, Dict, Optional

import numpy as np

PBP_COUPLE_MIN_MEAN = 2.0
SHOWDOWN_SALARY_FLOOR = 48500
SHOWDOWN_SALARY_CAP = 50000


def couple_conserved_pbp(
    static_draws: np.ndarray,
    pbp_draws: np.ndarray,
    min_mean: float = PBP_COUPLE_MIN_MEAN,
) -> np.ndarray:
    """Use conserved PBP draws as-is. Never rescale them onto a static mean."""
    static = np.asarray(static_draws, dtype=np.float64)
    pbp = np.asarray(pbp_draws, dtype=np.float64)
    if pbp.size == 0 or not np.isfinite(pbp).all():
        return static
    if pbp.shape != static.shape:
        raise ValueError(
            f"PBP draw shape {pbp.shape} != static draw shape {static.shape}"
        )
    if float(np.mean(pbp)) <= float(min_mean):
        return static
    return pbp.copy()


def degraded_jev_lineup_evaluation(leverage_notes: str = "") -> Dict[str, Any]:
    """JEV did not verify this lineup. Do not invent a lock or an 86/100."""
    return {
        "source": "DEGRADED_UNVERIFIED",
        "model": "~typesafe/jev-latest",
        "latency_ms": 0,
        "jev_status": "DEGRADED_UNVERIFIED",
        "publish_allowed": False,
        "publishAllowed": False,
        "lineup_verdict": "PASS_FRAGILE",
        "verdict_probabilities": {"PASS_FRAGILE": 1.0},
        "stack_coherence_noul": 0.0,
        "leverage_efficiency_noul": 0.0,
        "injury_fragility_noul": 1.0,
        "confidence_display": "UNVERIFIED",
        "confidence_int": None,
        "leverage_notes": leverage_notes,
    }


def live_jev_confidence(stack_coh: float, lev_eff: float, inj_frag: float) -> int:
    """Integer /100 from live noul values. No 72 floor and no 86 default."""
    raw = 100.0 * (0.42 * stack_coh + 0.40 * lev_eff + 0.18 * (1.0 - inj_frag))
    return int(max(0, min(100, round(raw))))


def showdown_salary_floor(requested: Optional[int]) -> int:
    """Reject the $25,000 floor that left ~$17,000 unspent on SNF showdown."""
    if requested is None:
        return SHOWDOWN_SALARY_FLOOR
    return max(int(requested), SHOWDOWN_SALARY_FLOOR)
