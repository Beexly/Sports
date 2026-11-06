"""Sheaf cohomology helpers (H0 dimension, energy as distance to sections)."""
from __future__ import annotations
from typing import Any
import numpy as np
from numpy.linalg import matrix_rank


def coboundary_matrix(
    n_nodes: int,
    edges: list[tuple[int, int]],
    d: int = 1,
) -> np.ndarray:
    """δ: C0 → C1 for constant sheaf R^d (identity maps)."""
    m = len(edges)
    delta = np.zeros((m * d, n_nodes * d))
    for e_i, (s, t) in enumerate(edges):
        delta[e_i * d : (e_i + 1) * d, t * d : (t + 1) * d] = np.eye(d)
        delta[e_i * d : (e_i + 1) * d, s * d : (s + 1) * d] = -np.eye(d)
    return delta


def dim_h0(n_nodes: int, edges: list[tuple[int, int]], d: int = 1) -> int:
    if n_nodes == 0:
        return 0
    delta = coboundary_matrix(n_nodes, edges, d)
    rank = int(matrix_rank(delta, tol=1e-10))
    return n_nodes * d - rank


def energy_from_delta(delta: np.ndarray, x: np.ndarray) -> float:
    dx = delta @ x
    return float(np.dot(dx, dx))


def h0_report(n_nodes: int, edges: list[tuple[int, int]], d: int = 1) -> dict[str, Any]:
    return {
        "dim_H0": dim_h0(n_nodes, edges, d),
        "n_nodes": n_nodes,
        "n_edges": len(edges),
        "feature_dim": d,
    }
