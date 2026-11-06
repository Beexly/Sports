"""
Cycle-space equations over R/2πZ for abelian (U(1)/SO(2)) connections.

Hol_γ(θ) = exp(i * (C θ)_γ). Flatness: C θ ≡ 0 (mod 2π).

DELETE (FES): remove edges so no cycles remain.
RELAX (surgery): keep edges, set some θ_e = 0, solve C θ ≡ 0 (mod 2π).
These are NOT the same integer programs — see SURGERY_VS_FES.md.
"""

from __future__ import annotations

from typing import Any
import numpy as np
from itertools import combinations

try:
    from holonomy_cheeger import fundamental_cycles, rotation
except ImportError:
    from crc import rotation  # type: ignore
    fundamental_cycles = None  # type: ignore


def cycle_basis_matrix(
    nodes: list[str], edges: list[tuple[str, str]]
) -> tuple[np.ndarray, list]:
    if fundamental_cycles is None:
        return np.zeros((0, len(edges))), []
    cycles = fundamental_cycles(nodes, edges)
    m = len(edges)
    edge_index = {frozenset(e): i for i, e in enumerate(edges)}
    C = np.zeros((len(cycles), m), dtype=float)
    for ci, cyc in enumerate(cycles):
        for a, b in cyc:
            key = frozenset([a, b])
            if key not in edge_index:
                continue
            j = edge_index[key]
            s, t = edges[j]
            C[ci, j] += 1.0 if (a, b) == (s, t) else -1.0
    return C, cycles


def holonomy_angles(theta: np.ndarray, C: np.ndarray) -> np.ndarray:
    raw = C @ theta
    return (raw + np.pi) % (2 * np.pi) - np.pi


def is_flat(theta: np.ndarray, C: np.ndarray, tol: float = 1e-8) -> bool:
    return bool(np.all(np.abs(holonomy_angles(theta, C)) < tol))


def min_relax_set(
    nodes: list[str],
    edges: list[tuple[str, str]],
    theta: np.ndarray,
) -> dict[str, Any]:
    """Minimum edges to zero so Cθ ≡ 0 (mod 2π). Exact for small graphs."""
    C, cycles = cycle_basis_matrix(nodes, edges)
    if len(cycles) == 0:
        return {"edits": [], "n_edits": 0, "flat_after": True, "optimal": True}
    nonzero = [i for i, t in enumerate(theta) if abs(t) > 1e-12]
    best = None
    for k in range(0, len(nonzero) + 1):
        for combo in combinations(nonzero, k):
            theta2 = theta.copy()
            for i in combo:
                theta2[i] = 0.0
            if is_flat(theta2, C):
                best = list(combo)
                break
        if best is not None:
            break
    return {
        "edits": best or [],
        "n_edits": len(best or []),
        "flat_after": best is not None,
        "optimal": True,
        "note": "relax ≠ feedback-edge-set; see research/SURGERY_VS_FES.md",
    }
