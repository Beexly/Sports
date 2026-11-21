"""
Stream 16C (Part B): Counterfactual NFL Ghosts & Bayesian Step-and-Turn Spatial Evaluators
===========================================================================================

Mathematical implementations of:
  1. Yurko, Nguyen & Pelechrinis (arXiv:2406.17220v2): Counterfactual Ghost Defender EPV
     marginalizing weighted 2D spatial ghost distributions against an EPV surface with
     paired bootstrap confidence bounds.
  2. Nguyen & Yurko (arXiv:2603.17866v3): Generative Bayesian Step-and-Turn rollout with
     Gamma step-length draws and von Mises turn-angle draws whose log-concentration
     depends positively on sampled step length (`log kappa = gamma0 + gamma1 * s + w_j`).
"""

from __future__ import annotations

import math
from typing import Any, Callable, Dict, Optional, Tuple

import numpy as np


def evaluate_nfl_ghosts_counterfactual(
    obs_defender_xy: Tuple[float, float],
    ghost_samples_xy: np.ndarray,
    ghost_weights: Optional[np.ndarray],
    epv_surface_fn: Callable[[np.ndarray], np.ndarray],
    n_boot: int = 200,
    seed: int = 42,
) -> Dict[str, Any]:
    """
    Evaluate defensive positioning value added relative to hypothetical ghost defenders:
      E[delta_catch] = EPV_obs - E_ghost[EPV(ghost)]
    Because lower offensive EPV favors the defense, positive `defender_value_added = E_ghost - EPV_obs`
    signifies superior positioning by the observed defender.
    """
    obs_arr = np.asarray(obs_defender_xy, dtype=float).reshape(1, 2)
    ghosts = np.asarray(ghost_samples_xy, dtype=float)
    if ghosts.ndim != 2 or ghosts.shape[1] != 2 or len(ghosts) < 2:
        raise ValueError("ghost_samples_xy must be shape (N, 2) with N >= 2")
    if not np.all(np.isfinite(obs_arr)) or not np.all(np.isfinite(ghosts)):
        raise ValueError("Coordinates must be finite")

    if ghost_weights is None:
        w = np.full(len(ghosts), 1.0 / len(ghosts), dtype=float)
    else:
        w = np.asarray(ghost_weights, dtype=float)
        if w.shape != (len(ghosts),) or np.any(w < 0) or float(np.sum(w)) <= 0:
            raise ValueError("ghost_weights must be non-negative with positive sum matching ghosts")
        w = w / float(np.sum(w))

    obs_epv = float(np.asarray(epv_surface_fn(obs_arr), dtype=float).reshape(-1)[0])
    ghost_epvs = np.asarray(epv_surface_fn(ghosts), dtype=float).reshape(-1)
    expected_ghost_epv = float(np.dot(w, ghost_epvs))
    value_added = expected_ghost_epv - obs_epv

    rng = np.random.default_rng(seed)
    boot_vals = np.empty(max(50, n_boot), dtype=float)
    n = len(ghosts)
    for b in range(len(boot_vals)):
        idx = rng.choice(n, size=n, replace=True, p=w)
        boot_vals[b] = float(np.mean(ghost_epvs[idx])) - obs_epv

    ci_lo, ci_hi = np.percentile(boot_vals, [2.5, 97.5])
    return {
        "schema": "stream_16c_nfl_ghosts_v1",
        "obs_epv": round(obs_epv, 6),
        "expected_ghost_epv": round(expected_ghost_epv, 6),
        "delta_catch_epv": round(obs_epv - expected_ghost_epv, 6),
        "defender_value_added": round(value_added, 6),
        "ci_lo": round(float(ci_lo), 6),
        "ci_hi": round(float(ci_hi), 6),
    }


def simulate_step_and_turn_hypotheticals(
    x0: float,
    y0: float,
    bearing_rad: float,
    step_shape: float,
    step_scale: float,
    mu_turn_rad: float,
    gamma0: float,
    gamma1: float,
    player_w: float = 0.0,
    n_hyp: int = 500,
    seed: int = 42,
    yardline_val_fn: Optional[Callable[[np.ndarray, np.ndarray], np.ndarray]] = None,
    obs_next_xy: Optional[Tuple[float, float]] = None,
) -> Dict[str, Any]:
    """
    Generate hypothetical 1-step spatial locations using Nguyen & Yurko (arXiv:2603.17866v3):
      s_h ~ Gamma(step_shape, step_scale)
      log kappa_h = gamma0 + gamma1 * s_h + player_w
      phi_h ~ vonMises(mu_turn_rad, kappa_h)
      (x_h, y_h) = (x0 + s_h * cos(phi_h + bearing), y0 + s_h * sin(phi_h + bearing))
    """
    if step_shape <= 0 or step_scale <= 0 or n_hyp < 10:
        raise ValueError("step_shape, step_scale must be > 0 and n_hyp >= 10")
    if not all(math.isfinite(float(v)) for v in (x0, y0, bearing_rad, mu_turn_rad, gamma0, gamma1, player_w)):
        raise ValueError("Scalar inputs must be finite")

    rng = np.random.default_rng(seed)
    steps = rng.gamma(shape=float(step_shape), scale=float(step_scale), size=n_hyp)
    log_kappa = np.clip(float(gamma0) + float(gamma1) * steps + float(player_w), -5.0, 10.0)
    kappas = np.exp(log_kappa)
    turns = np.array([rng.vonmises(float(mu_turn_rad), float(k)) for k in kappas], dtype=float)

    angles = float(bearing_rad) + turns
    hyp_x = float(x0) + steps * np.cos(angles)
    hyp_y = float(y0) + steps * np.sin(angles)

    kappa_corr = float(np.corrcoef(steps, kappas)[0, 1]) if np.std(steps) > 1e-9 and np.std(kappas) > 1e-9 else 0.0

    delta_bar = 0.0
    hyp_vals_mean = 0.0
    if yardline_val_fn is not None:
        hyp_vals = np.asarray(yardline_val_fn(hyp_x, hyp_y), dtype=float).reshape(-1)
        hyp_vals_mean = float(np.mean(hyp_vals))
        if obs_next_xy is not None:
            ox = np.asarray([obs_next_xy[0]], dtype=float)
            oy = np.asarray([obs_next_xy[1]], dtype=float)
            obs_val = float(np.asarray(yardline_val_fn(ox, oy), dtype=float).reshape(-1)[0])
            delta_bar = float(np.mean(obs_val - hyp_vals))

    return {
        "schema": "stream_16c_step_and_turn_v1",
        "n_hyp": int(n_hyp),
        "step_lengths": steps.tolist(),
        "turn_angles": turns.tolist(),
        "kappas": kappas.tolist(),
        "hyp_x": hyp_x.tolist(),
        "hyp_y": hyp_y.tolist(),
        "step_turn_kappa_corr": round(kappa_corr, 4),
        "hyp_yardline_mean": round(hyp_vals_mean, 4),
        "delta_bar": round(delta_bar, 6),
    }
