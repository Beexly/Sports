"""Shadow feature implementations for the Combine-reliability lane.

Both features are extracted from their source repos (Phase 1, 2026-10-15),
computed from 10 Hz tracking, and admitted only as SHADOW (weight 0) behind
the reliability gate in gate.py. Neither is a recommendation surface.

Bend Score (StevanHRG/nfl-big-data-bowl-2027, "Bend You Can Measure"):
  centripetal acceleration a_c = v * omega = v^2 / r per frame (heading from
  x/y, turning rate frame-to-frame, smoothed over 3 frames), PEAK per player
  per arc drill (Run the Hoop, Run and Club, Front Start Wave + Lateral
  Reaction). CBS = mean of per-drill z-scores across the cohort, rescaled
  50 = average, 10 points = 1 SD. Gate status on extracted evidence:
  UNDERPOWERED -- controlled transfer is positive (+0.99 POE/100, CI
  0.45-1.53, nested-validated) but repeatability was never measured.

KTD primitives (usufalbaz/nfl-big-data-bowl-2027-ktd):
  on the isolated cut (SPEED_OUT), DeltaS = S_max - S_cut and speed
  retention = S_cut / S_max. The published KTD divides DeltaS by mean game
  separation -- the outcome sits in the denominator, so the published form
  FAILS the gate (outcome leakage) and is NOT implemented here. Only the
  Combine-side numerator primitives are computed; their single-rep
  reliability is 0.40 (Pratheeksh-7S), 4 reps needed for decision-grade.
"""

from __future__ import annotations

import numpy as np

from .yardstick import resample_uniform, speed_series

ARC_DRILLS = ("RUN_THE_HOOP", "RUN_AND_CLUB", "FRONT_START_WAVE_LATERAL_REACTION")


def centripetal_acceleration(t, x, y, smooth_frames: int = 3):
    """a_c = v * |dtheta/dt| per frame, smoothed over `smooth_frames`."""
    t, x, y = resample_uniform(t, x, y)
    vx = np.gradient(x, t)
    vy = np.gradient(y, t)
    v = np.hypot(vx, vy)
    theta = np.unwrap(np.arctan2(vy, vx))
    omega = np.abs(np.gradient(theta, t))
    a_c = v * omega
    if smooth_frames > 1 and len(a_c) >= smooth_frames:
        kernel = np.ones(smooth_frames) / smooth_frames
        a_c = np.convolve(a_c, kernel, mode="same")
    return t, a_c, v


def bend_attempt_peak(t, x, y) -> float:
    """Peak centripetal acceleration in one arc-drill attempt (yd/s^2)."""
    _, a_c, _ = centripetal_acceleration(t, x, y)
    return float(np.max(a_c)) if len(a_c) else float("nan")


def bend_scores(cohort: dict[str, dict[str, float]]) -> dict[str, float]:
    """CBS per player. `cohort`: player -> {drill: peak a_c}. z-scores are
    computed across the cohort per drill; CBS = 50 + 10 * mean(z)."""
    drills = [d for d in ARC_DRILLS if any(d in p for p in cohort.values())]
    stats = {}
    for d in drills:
        vals = np.array([p[d] for p in cohort.values() if d in p], float)
        stats[d] = (np.nanmean(vals), np.nanstd(vals) or 1.0)
    out = {}
    for player, peaks in cohort.items():
        zs = [
            (peaks[d] - stats[d][0]) / stats[d][1]
            for d in drills
            if d in peaks and np.isfinite(peaks[d])
        ]
        out[player] = 50.0 + 10.0 * float(np.mean(zs)) if zs else float("nan")
    return out


def cut_primitives(t, x, y):
    """KTD Combine-side primitives on an isolated cut (e.g. SPEED_OUT).

    Returns dict with entry peak speed S_max, apex (max turning-rate) time,
    minimum speed at the apex S_cut, DeltaS = S_max - S_cut, and retention
    = S_cut / S_max. The published KTD ratio is deliberately not computed:
    it divides by the outcome (see module docstring)."""
    t, x, y = resample_uniform(t, x, y)
    v = speed_series(t, x, y)
    vx = np.gradient(x, t)
    vy = np.gradient(y, t)
    theta = np.unwrap(np.arctan2(vy, vx))
    omega = np.abs(np.gradient(theta, t))
    apex = int(np.argmax(omega))
    s_max = float(np.max(v[: apex + 1])) if apex > 0 else float(np.max(v))
    half = max(1, int(0.3 / (t[1] - t[0])))  # +-0.3 s around the apex
    lo, hi = max(0, apex - half), min(len(v), apex + half + 1)
    s_cut = float(np.min(v[lo:hi]))
    return {
        "s_max": s_max,
        "s_cut": s_cut,
        "delta_s": s_max - s_cut,
        "retention": (s_cut / s_max) if s_max > 0 else float("nan"),
        "apex_t": float(t[apex]),
    }
