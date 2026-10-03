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


def drive_state_line(ydstogo: float, yardline_100: float) -> float:
    """drive_linear.py: 0.2007*ydstogo - 0.0446*yardline_100."""
    return 0.2007 * ydstogo - 0.0446 * yardline_100


def mean_or_null(total: float, n: int, floor: int = 30) -> float | None:
    """Prior-play mean. drive_linear.py and the air-yards files: null under the floor (30)."""
    if n < floor:
        return None
    return total / n


def shrunk_cell(w: float, n: float, p_hat_parent: float | None, m: float = 25.0) -> float | None:
    """int_parent.py: (w + 25 * p_hat_parent) / (n + 25). No invented parent rate."""
    if p_hat_parent is None:
        return None
    return (w + m * p_hat_parent) / (n + m)


def raw_rate_or_null(w: float, n: float) -> float | None:
    """int_parent.py: p_hat is w/n when n > 0 else null."""
    if n <= 0:
        return None
    return w / n


def air_yards_to_sticks(air_yards: float, ydstogo: float) -> float:
    """air_yards_to_sticks.py: air_yards - ydstogo."""
    return air_yards - ydstogo


def completion_residual(completions: float, expected: float, attempts: int, floor: int = 30) -> float | None:
    """qb_air_cpoe.py: (completions - expected) / attempts. Null under 30 attempts."""
    if attempts < floor:
        return None
    return (completions - expected) / attempts


def complete_minus_probability(complete_pass: float, probability: float) -> float:
    """independent_cpoe.py: residual is complete_pass minus the fitted probability."""
    return complete_pass - probability


def logistic_probability(offset: float, weight: float, z: float) -> float:
    """independent_cpoe.py fit step: 1 / (1 + exp(-(offset + weight * z)))."""
    return 1.0 / (1.0 + math.exp(-(offset + weight * z)))


def margin_residual(result: float, spread_line: float) -> float:
    """scoredist.py: result - spread_line."""
    return result - spread_line


def total_residual(total: float, total_line: float) -> float:
    """scoredist.py: total - total_line."""
    return total - total_line


def push_adjusted(p_side: float, p_push: float) -> float:
    """scoredist.py: p_side / max(1e-9, 1 - p_push)."""
    return p_side / max(1e-9, 1.0 - p_push)


def home_minus_away(home: float | None, away: float | None) -> float | None:
    """Stated on the drive, sticks, and completion features: home minus away, null if either side is null."""
    if home is None or away is None:
        return None
    return home - away
