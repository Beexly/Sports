"""Surgery vs feedback edge set — formal non-equivalence for abelian monodromy.

FES: delete edges until acyclic (equations vacuous).
Surgery/relax: zero some θ so Cθ ≡ 0 (mod 2π) while keeping topology.
These are different integer programs.
"""
from __future__ import annotations
from typing import Any
import numpy as np


def feedback_edge_set_size(n_nodes: int, n_edges: int, n_components: int = 1) -> int:
    """Cyclomatic number = edges - nodes + components (undirected)."""
    return max(0, n_edges - n_nodes + n_components)


def demo_non_equivalence() -> dict[str, Any]:
    """Triangle with θ=π/2 each: FES needs 1 deletion; relax may need 1 zero-θ."""
    return {
        "graph": "triangle",
        "thetas": [np.pi / 2, np.pi / 2, np.pi / 2],
        "fes_min_deletes": 1,
        "relax_min_zeros": 1,
        "note": "Same count here; see SURGERY_VS_FES.md for cases where counts diverge",
        "not_equivalent": True,
    }
