"""Research-Gated Module 3: Ridge RAPM & Spatial Field-Zone EP Residual Overlay (weight=0.0)."""
from __future__ import annotations

from typing import Sequence

import numpy as np

PRODUCTION_WEIGHT: float = 0.0
OOS_GATE_REQUIRED: bool = True


def compute_rapm_spatial_ep_overlay(
    unit_design_matrix: Sequence[Sequence[float]],
    observed_epa_per_play: Sequence[float],
    target_unit_weights: Sequence[float],
    *,
    ridge_lambda: float = 12.0,
) -> dict[str, object]:
    """Solve ridge-regularized unit RAPM shadow coefficients (zero production weight)."""
    x = np.asarray(unit_design_matrix, dtype=np.float64)
    y = np.asarray(observed_epa_per_play, dtype=np.float64)
    w_t = np.asarray(target_unit_weights, dtype=np.float64)

    if x.ndim != 2 or x.shape[0] == 0 or x.shape[1] != w_t.shape[0] or y.shape[0] != x.shape[0]:
        raise ValueError("Incompatible shapes for RAPM spatial EP solver")

    n_cols = x.shape[1]
    gram = x.T @ x + float(ridge_lambda) * np.eye(n_cols, dtype=np.float64)
    rhs = x.T @ y
    beta_rapm = np.linalg.solve(gram, rhs)
    shadow_ep_delta = float(np.clip(np.dot(w_t, beta_rapm), -0.18, 0.18))
    return {
        "production_weight": PRODUCTION_WEIGHT,
        "oos_gate_required": OOS_GATE_REQUIRED,
        "shadow_ep_per_play_delta": round(shadow_ep_delta, 6),
        "live_applied_ep_delta": round(shadow_ep_delta * PRODUCTION_WEIGHT, 8),
        "ridge_lambda": float(ridge_lambda),
        "feature_count": int(n_cols),
    }
