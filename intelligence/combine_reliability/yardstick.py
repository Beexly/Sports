"""Same-yardstick normalization (infrastructure).

Implements the normalization method extracted from
vanductan-NLT/nfl-big-data-bowl-2027-same-yardstick (writeup + src), so that
Combine drill movement and in-game post-snap movement are measured with ONE
identical feature function and can be compared at all:

  1. Resample each track to a uniform 10 Hz grid; distances from x/y only.
  2. Onset back-extrapolation: recording often begins mid-movement. Assume
     constant acceleration from rest over the first frames and shift the
     onset back (source: median shift 0.19-0.32 s). Attempts whose first
     recorded frame is already faster than 2 yd/s are excluded.
  3. One metric set over the first 1.5 s from onset, along the movement
     axis (net-displacement direction for a drill; toward the backfield
     in game): depth at 0.5/1.0/1.5 s, lateral at 1.0 s, speed at 0.5/1.0 s,
     peak speed, time to 1 yd, time to 2 yd, second-yard time (1->2 yd),
     speed when 1 yd is reached, set angle at 1.0 s.
  4. Attempts are sides (left/right), not replicates: average them.
  5. Centre Combine metrics within draft class and game metrics within
     position before comparison; partial correlations control height,
     weight, draft slot, with player-bootstrap CIs.

Distance-referenced metrics (speed at 1 yd) are the least onset-sensitive
and are the ones to trust on the Combine side (source's own guidance).
Self-check from the source: time-to-1-yd agrees with NGS player_get_off
at r = 0.88 on 33,361 DL snaps.
"""

from __future__ import annotations

import numpy as np

HZ = 10.0
WINDOW_S = 1.5
MOVING_THRESHOLD = 0.5     # yd/s; first frame at/above this = movement started
EXCLUDE_FIRST_FRAME = 2.0  # yd/s; first frame faster than this = attempt unusable


def resample_uniform(t, x, y, hz: float = HZ):
    """Interpolate a track onto a uniform grid at `hz`."""
    t = np.asarray(t, float); x = np.asarray(x, float); y = np.asarray(y, float)
    order = np.argsort(t)
    t, x, y = t[order], x[order], y[order]
    t, keep = np.unique(t, return_index=True)
    x, y = x[keep], y[keep]
    grid = np.arange(t[0], t[-1] + 1e-9, 1.0 / hz)
    return grid, np.interp(grid, t, x), np.interp(grid, t, y)


def speed_series(t, x, y):
    """Speed (yd/s) from positions: central differences, 3-point smoothing."""
    vx = np.gradient(x, t)
    vy = np.gradient(y, t)
    v = np.hypot(vx, vy)
    if len(v) >= 3:
        v = np.convolve(v, np.ones(3) / 3.0, mode="same")
        v[0], v[-1] = v[1], v[-2]
    return v


def back_extrapolate_onset(t, x, y):
    """Estimate the onset shift (seconds) for a track whose recording may
    have begun mid-movement. Fits speed over the first 0.5 s of recorded
    motion to v = a * (t + shift) -- constant acceleration from rest, the
    source's assumption -- using unsmoothed gradient speeds (smoothing
    biases the early acceleration). Returns (shift_seconds, valid).
    Attempts whose first recorded frame exceeds EXCLUDE_FIRST_FRAME yd/s
    are invalid."""
    vx = np.gradient(x, t)
    vy = np.gradient(y, t)
    v = np.hypot(vx, vy)
    if v[0] > EXCLUDE_FIRST_FRAME:
        return 0.0, False
    moving = int(np.argmax(v >= MOVING_THRESHOLD))
    if v[moving] < MOVING_THRESHOLD:
        return 0.0, False
    step = t[1] - t[0] if len(t) > 1 else 0.1
    horizon = min(len(v), moving + int(0.5 / step) + 1)
    tt, vv = t[moving:horizon], v[moving:horizon]
    if len(tt) < 2:
        return 0.0, True
    A = np.column_stack([tt, np.ones_like(tt)])
    (slope, intercept), *_ = np.linalg.lstsq(A, vv, rcond=None)
    if slope <= 0:
        return 0.0, True
    return float(max(intercept, 0.0) / slope), True


def _value_at(t, values, tt):
    return float(np.interp(tt, t, values))


def _time_to(t, values, target):
    """First time `values` (cumulative distance along axis) reaches target."""
    idx = np.argmax(values >= target)
    if values[idx] < target:
        return float("nan")
    if idx == 0:
        return float(t[0])
    v0, v1 = values[idx - 1], values[idx]
    frac = 0.0 if v1 == v0 else (target - v0) / (v1 - v0)
    return float(t[idx - 1] + frac * (t[idx] - t[idx - 1]))


def window_metrics(t, x, y):
    """The yardstick metric set for one attempt/snap. `t` must start at the
    (corrected) onset; the window is the first WINDOW_S seconds."""
    t = np.asarray(t, float); x = np.asarray(x, float); y = np.asarray(y, float)
    keep = t <= WINDOW_S + 1e-9
    t, x, y = t[keep], x[keep], y[keep]
    dx, dy = x - x[0], y - y[0]
    net = np.hypot(dx[-1], dy[-1])
    if net < 1e-9:
        axis = np.array([1.0, 0.0])
    else:
        axis = np.array([dx[-1], dy[-1]]) / net
    perp = np.array([-axis[1], axis[0]])
    depth = dx * axis[0] + dy * axis[1]
    lateral = dx * perp[0] + dy * perp[1]
    v = speed_series(t, x, y)

    t1 = _time_to(t, depth, 1.0)
    t2 = _time_to(t, depth, 2.0)
    d10 = _value_at(t, depth, 1.0)
    out = {
        "depth_05": _value_at(t, depth, 0.5),
        "depth_10": d10,
        "depth_15": _value_at(t, depth, 1.5),
        "lat_abs_10": abs(_value_at(t, lateral, 1.0)),
        "s_05": _value_at(t, v, 0.5),
        "s_10": _value_at(t, v, 1.0),
        "smax_15": float(np.max(v)) if len(v) else float("nan"),
        "t_d1": t1,
        "t_d1_d2": (t2 - t1) if np.isfinite(t1) and np.isfinite(t2) else float("nan"),
        "s_at_d1": float(np.interp(1.0, depth, v)) if np.isfinite(t1) else float("nan"),
        "set_angle_10": float(np.degrees(np.arctan2(abs(_value_at(t, lateral, 1.0)), d10))) if d10 > 1e-9 else float("nan"),
    }
    return out


def prepare_attempt(t, x, y):
    """Full per-attempt pipeline: resample, onset-correct, window metrics.
    Returns (metrics_dict, valid)."""
    t, x, y = resample_uniform(t, x, y)
    t = t - t[0]
    shift, valid = back_extrapolate_onset(t, x, y)
    if not valid:
        return {}, False
    # The true onset sits `shift` seconds before the first recorded frame.
    # Depth/speed values are computed on the recorded window; onset-referenced
    # metrics (time-to-distance) are corrected by the shift, and the shift is
    # carried on the result so callers can see the size of the correction.
    metrics = window_metrics(t, x, y)
    metrics["onset_shift_s"] = shift
    if np.isfinite(metrics["t_d1"]):
        metrics["t_d1"] += shift
    return metrics, True


def average_attempts(attempt_metrics: list[dict]) -> dict:
    """Attempts are sides (L/R), not replicates: average them (source rule 3)."""
    if not attempt_metrics:
        return {}
    keys = attempt_metrics[0].keys()
    return {
        k: float(np.nanmean([m[k] for m in attempt_metrics]))
        for k in keys
    }


def center_within_group(values, groups):
    """Centre a metric within its group (draft class for Combine metrics,
    position for game metrics) -- source rule 4."""
    values = np.asarray(values, float)
    groups = np.asarray(groups)
    out = values.copy()
    for g in np.unique(groups):
        mask = groups == g
        out[mask] = values[mask] - np.nanmean(values[mask])
    return out


def partial_corr(x, y, controls, n_boot: int = 500, seed: int = 0):
    """Partial correlation of x and y given a control matrix (n x k), with a
    player-bootstrap 95% CI that refits the control regression in every
    resample (source rule 5). Returns (r, lo, hi)."""
    x = np.asarray(x, float); y = np.asarray(y, float)
    C = np.asarray(controls, float)
    if C.ndim == 1:
        C = C.reshape(-1, 1)
    mask = np.isfinite(x) & np.isfinite(y) & np.all(np.isfinite(C), axis=1)
    x, y, C = x[mask], y[mask], C[mask]
    n = len(x)
    if n < 10:
        return float("nan"), float("nan"), float("nan")
    A = np.column_stack([np.ones(n), C])

    def resid(v):
        beta, *_ = np.linalg.lstsq(A, v, rcond=None)
        return v - A @ beta

    rx, ry = resid(x), resid(y)

    def corr(a, b):
        return float(np.corrcoef(a, b)[0, 1])

    r = corr(rx, ry)
    rng = np.random.default_rng(seed)
    boots = []
    for _ in range(n_boot):
        idx = rng.integers(0, n, n)
        Ab = A[idx]
        bx, *_ = np.linalg.lstsq(Ab, x[idx], rcond=None)
        by, *_ = np.linalg.lstsq(Ab, y[idx], rcond=None)
        boots.append(corr(x[idx] - Ab @ bx, y[idx] - Ab @ by))
    lo, hi = np.nanpercentile(boots, [2.5, 97.5])
    return r, float(lo), float(hi)
