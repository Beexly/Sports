"""Guarded Grassmann principal angles from Loukrezis et al. arXiv:2610.23508 eq (7).

Y1^T Y2 = U Sigma V^T ; theta_i = arccos(sigma_i) for sigma_i in [0,1].

Missing, non-numeric, mismatched shape, or invalid fail closed to None.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math
from typing import Sequence


def grassmann_principal_angles(
    basis1: Sequence[Sequence[float]] | None,
    basis2: Sequence[Sequence[float]] | None,
) -> list[float] | None:
    if basis1 is None or basis2 is None:
        return None
    try:
        import numpy as np
        Y1 = np.asarray(basis1, dtype=float)
        Y2 = np.asarray(basis2, dtype=float)
        if Y1.ndim != 2 or Y2.ndim != 2 or Y1.shape != Y2.shape or Y1.shape[0] == 0:
            return None
        # Check roughly orthonormal: columns unit and orthogonal
        if not np.allclose(Y1.T @ Y1, np.eye(Y1.shape[1]), atol=1e-6):
            return None
        if not np.allclose(Y2.T @ Y2, np.eye(Y2.shape[1]), atol=1e-6):
            return None
        M = Y1.T @ Y2
        _, sigma, _ = np.linalg.svd(M, full_matrices=False)
        sigma = np.clip(sigma, 0.0, 1.0)
        angles = np.arccos(sigma)
        return [float(a) for a in angles]
    except (TypeError, ValueError, OverflowError, ImportError):
        return None
