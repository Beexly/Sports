"""BDB 2027 10 Hz kinematic proxies and Allen interval relations.

Proxies are finite differences on a supplied 10 Hz track. They are not
certified biomechanical measurements and return None when the series
cannot support the definition.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

DT_10HZ = 0.1


def compute_kinematic_derivatives_10hz(
    xs: list[float], ys: list[float]
) -> dict[str, list[float] | float]:
    if len(xs) < 3 or len(xs) != len(ys):
        raise ValueError("need at least 3 paired samples")
    vx = [(xs[i] - xs[i - 1]) / DT_10HZ for i in range(1, len(xs))]
    vy = [(ys[i] - ys[i - 1]) / DT_10HZ for i in range(1, len(ys))]
    ax = [(vx[i] - vx[i - 1]) / DT_10HZ for i in range(1, len(vx))]
    ay = [(vy[i] - vy[i - 1]) / DT_10HZ for i in range(1, len(vy))]
    return {"vx": vx, "vy": vy, "ax": ax, "ay": ay, "dt": DT_10HZ}


def compute_decel_reaccel_asymmetry(speed: list[float]) -> float | None:
    """Reacceleration / |strongest deceleration|. None if either phase is absent."""
    if len(speed) < 3:
        return None
    acc = [(speed[i] - speed[i - 1]) / DT_10HZ for i in range(1, len(speed))]
    i_min = min(range(len(acc)), key=lambda i: acc[i])
    if acc[i_min] >= -0.5:
        return None
    after = [a for a in acc[i_min + 1 :] if a > 0.5]
    if not after:
        return None
    return after[0] / abs(acc[i_min])


def compute_cod_curvature_retention(xs: list[float], ys: list[float]) -> float | None:
    """End curvature / peak curvature. None if the track never turns."""
    d = compute_kinematic_derivatives_10hz(xs, ys)
    vx, vy = d["vx"], d["vy"]
    ax, ay = d["ax"], d["ay"]
    assert isinstance(vx, list) and isinstance(ax, list)
    kappas: list[float] = []
    for i in range(len(ax)):
        sx, sy = vx[i + 1], vy[i + 1]
        speed = math.hypot(sx, sy)
        if speed < 0.5:
            continue
        cross = abs(sx * ay[i] - sy * ax[i])
        kappas.append(cross / (speed ** 3))
    if len(kappas) < 2 or max(kappas) < 1e-6:
        return None
    return kappas[-1] / max(kappas)


def compute_first_step_burst_latency(speed: list[float], threshold: float = 2.0) -> float | None:
    for i, sample in enumerate(speed):
        if sample >= threshold:
            return i * DT_10HZ
    return None


def compute_biomechanical_load_hazard(speed: list[float]) -> float | None:
    """Integral of acceleration squared. A load proxy, not a medical score."""
    if len(speed) < 2:
        return None
    acc = [(speed[i] - speed[i - 1]) / DT_10HZ for i in range(1, len(speed))]
    return sum(a * a for a in acc) * DT_10HZ


@dataclass(frozen=True)
class Interval:
    start: float
    end: float


def allen_relation(a: Interval, b: Interval, eps: float = 1e-9) -> str:
    def eq(x: float, y: float) -> bool:
        return abs(x - y) <= eps

    if eq(a.end, b.start):
        return "meets"
    if a.end < b.start - eps:
        return "before"
    if eq(a.start, b.start) and a.end < b.end - eps:
        return "starts"
    if eq(a.end, b.end) and a.start > b.start + eps:
        return "finishes"
    if b.start + eps < a.start and a.end < b.end - eps:
        return "during"
    if a.start < b.start - eps and b.start < a.end - eps and a.end < b.end - eps:
        return "overlaps"
    return "other"


def evaluate_itl_complex_event(intervals: list[Interval], relation: str) -> bool:
    if len(intervals) < 2:
        return False
    return allen_relation(intervals[0], intervals[1]) == relation


def combine_speed_ceiling(drill_speeds: list[float]) -> float | None:
    """Max finite speed in a Combine drill. None if the drill has no samples.

    Prior art, not copied code: conormalone/BDB27 README asks whether a
    10 Hz Combine ceiling binds in NFL games. That repo has no licence.
    This is an original definition. It does not claim Combine predicts
    NFL success.
    """
    finite = [s for s in drill_speeds if math.isfinite(s) and s >= 0]
    if not finite:
        return None
    return max(finite)


def exceedance_rate(game_speeds: list[float], ceiling: float | None) -> float | None:
    """Share of in-game samples strictly above the Combine ceiling."""
    if ceiling is None or not math.isfinite(ceiling) or ceiling <= 0:
        return None
    finite = [s for s in game_speeds if math.isfinite(s) and s >= 0]
    if not finite:
        return None
    return sum(1 for s in finite if s > ceiling) / len(finite)


def ceiling_closeness(game_peak: float, ceiling: float | None) -> float | None:
    """Game peak / Combine ceiling. Above 1 means the game exceeded the drill."""
    if ceiling is None or not math.isfinite(ceiling) or ceiling <= 0:
        return None
    if not math.isfinite(game_peak) or game_peak < 0:
        return None
    return game_peak / ceiling


KTD_SEPARATION_EPS = 0.01


def kinetic_translation_deficit(
    s_max: float, s_cut: float, mean_separation_yards: float
) -> float | None:
    """Combine cut-speed loss divided by in-game separation at the throw.

    Formula from usufalbaz/nfl-big-data-bowl-2027-ktd (MIT):
    (S_max - S_cut) / (mean separation_at_pass_forward + 0.01).
    Units are yards/second over yards. A larger score means more Combine
    speed was given up at the cut per yard of game separation. This does
    not repeat that repo's Spearman or ROC numbers.
    """
    values = (s_max, s_cut, mean_separation_yards)
    if not all(math.isfinite(v) and v >= 0 for v in values):
        return None
    denom = mean_separation_yards + KTD_SEPARATION_EPS
    if denom == 0:
        return None
    return (s_max - s_cut) / denom
