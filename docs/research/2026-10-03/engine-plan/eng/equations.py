"""Named equation functions. Formulas are copied from the engine plan. No new columns.

Not a scorer, not a feature table, not a mint. NULL stays NULL.

Sources:
- docs/research/2026-10-03/engine-plan/eng/features.py  (logit)
- docs/research/2026-10-03/engine-plan/eng/scoredist.py (log loss, fair side, team points)
- docs/research/2026-10-03/engine-plan/brain/protection_stress.py and brain/BRAIN.md (stress, NULL guards)
- docs/research/2026-10-03/engine-plan/GSE_V2_DECISIONS_SPRINT_2026-10-03.md section 2.1 (promote)
"""
from __future__ import annotations

import math
from collections.abc import Sequence


def logit(p: float) -> float:
    """features.py: lg(p) = log(p / (1 - p)), clipped to [1e-6, 1 - 1e-6]."""
    p = min(max(p, 1e-6), 1.0 - 1e-6)
    return math.log(p / (1.0 - p))


def log_loss(p: float, y: float) -> float:
    """scoredist.py ll: -(y * log(p) + (1 - y) * log(1 - p)), same clip."""
    p = min(max(p, 1e-6), 1.0 - 1e-6)
    return -(y * math.log(p) + (1.0 - y) * math.log(1.0 - p))


def fair_side(values: Sequence[float], line: float, shift: float = 0.0) -> float:
    """scoredist.py: ((v > line) + 0.5 * (v == line)) / n, after adding shift."""
    if len(values) == 0:
        raise ValueError("fair_side: empty sample")
    above = 0.0
    for raw in values:
        v = raw + shift
        if v > line:
            above += 1.0
        elif v == line:
            above += 0.5
    return above / len(values)


def team_points(total: float, margin: float) -> tuple[float, float]:
    """scoredist.py mk: home = (t + m) / 2, away = (t - m) / 2."""
    return (total + margin) / 2.0, (total - margin) / 2.0


def league_expected_pressure(intercept: float, blitz_coef: float, blitz_rate: float) -> float:
    """protection_stress.py: expected = a + b * blitz_rate."""
    return intercept + blitz_coef * blitz_rate


def protection_stress(
    pressure_rate: float,
    blitz_rate: float,
    intercept: float,
    blitz_coef: float,
    n_team_games: int,
    league_team_weeks: int,
) -> float | None:
    """stress = pressure_rate_allowed - league_expected_rate(blitz_rate_faced).

    Guards copied from the script docstring: fewer than 3 team games -> NULL;
    league fit pool under 32 team-weeks -> NULL.
    """
    if n_team_games < 3 or league_team_weeks < 32:
        return None
    expected = league_expected_pressure(intercept, blitz_coef, blitz_rate)
    return pressure_rate - expected


def promoted(delta_logloss_ci_high: float, placebo_fraction: float, fdr_q: float) -> bool:
    """Section 2.1: the 95% CI on delta log loss is below 0 (upper end < 0),
    placebo fraction <= 0.10, and BH-FDR q <= 0.10.
    """
    return delta_logloss_ci_high < 0.0 and placebo_fraction <= 0.10 and fdr_q <= 0.10
