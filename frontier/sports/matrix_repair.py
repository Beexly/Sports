"""
matrix_repair.py
================
Higham Nearest Positive Semi-Definite Matrix Repair & Safe Cholesky Engine.

Prevents unhandled LinAlgError crashes when evaluating non-positive-definite correlation
matrices in multivariate Gaussian/Vine copulas, multi-leg SGPs, and correlated Monte Carlo draws.

Example Attack Case (from crash_repro_2026_10_04.py):
A = [[ 1.0,  0.9, -0.9],
     [ 0.9,  1.0,  0.9],
     [-0.9,  0.9,  1.0]]
Determinant < 0, non-positive definite.
numpy.linalg.cholesky(A) -> raises LinAlgError("Matrix is not positive definite")
nearest_positive_definite(A) -> transforms eigenvalues >= eps, rescales diag to 1.0,
permits stable Cholesky factorization.
"""

from __future__ import annotations
import numpy as np
from typing import Tuple


def nearest_positive_definite(A: np.ndarray, eps: float = 1e-6) -> np.ndarray:
    """
    Computes the nearest positive semi-definite matrix to A using Higham eigenvalue projection.
    
    1. Enforces symmetry: B = (A + A^T) / 2
    2. Performs spectral decomposition: B = V * diag(λ) * V^T
    3. Clips negative and near-zero eigenvalues: λ_hat = max(λ, eps)
    4. Reconstructs: A_psd = V * diag(λ_hat) * V^T
    5. Normalizes diagonals to 1.0 for correlation matrices: A_corr = D * A_psd * D
    """
    A = np.asarray(A, dtype=np.float64)
    if A.ndim != 2 or A.shape[0] != A.shape[1]:
        raise ValueError(f"Input must be a square 2D matrix, got shape {A.shape}")

    # Symmetrize
    B = (A + A.T) / 2.0

    # Spectral decomposition (eigh for symmetric/Hermitian)
    evals, evecs = np.linalg.eigh(B)

    # Project eigenvalues to positive cone
    evals_clipped = np.maximum(evals, eps)

    # Reconstruct
    A_psd = evecs @ np.diag(evals_clipped) @ evecs.T

    # If original diagonal is all ~1.0 (correlation matrix), preserve unit diagonal
    is_corr = np.allclose(np.diag(A), 1.0, atol=1e-3)
    if is_corr:
        inv_sqrt_diag = 1.0 / np.sqrt(np.maximum(np.diag(A_psd), eps))
        D = np.diag(inv_sqrt_diag)
        A_corr = D @ A_psd @ D
        # Ensure perfect 1.0 on diagonal
        np.fill_diagonal(A_corr, 1.0)
        return A_corr

    return A_psd


def safe_cholesky(A: np.ndarray, eps: float = 1e-6) -> Tuple[np.ndarray, bool]:
    """
    Performs Cholesky decomposition L such that A ~= L @ L^T.
    If A is non-positive-definite, automatically applies nearest_positive_definite repair.
    
    Returns:
        (L, was_repaired): Lower triangular matrix L and boolean flag indicating if repair was needed.
    """
    A = np.asarray(A, dtype=np.float64)
    try:
        L = np.linalg.cholesky(A)
        return L, False
    except np.linalg.LinAlgError:
        # Matrix is not positive definite: repair and factorize
        A_repaired = nearest_positive_definite(A, eps=eps)
        L = np.linalg.cholesky(A_repaired)
        return L, True
