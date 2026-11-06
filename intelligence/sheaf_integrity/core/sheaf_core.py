"""
Minimal knowledge-integrity core.

Public language: energy, gaps, proposals.
Internal: discrete cellular sheaf with identity restriction maps on R^d stalks.

  (δx)_e = x_t - x_s
  energy E(x) = ||δx||^2
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
import numpy as np


@dataclass
class Graph:
    nodes: list[str]
    edges: list[tuple[str, str, str]]  # (source, target, relation)
    features: dict[str, np.ndarray]
    feature_dim: int = 2

    @classmethod
    def from_dict(cls, payload: dict[str, Any]) -> "Graph":
        d = int(payload.get("feature_dim", 2))
        nodes = []
        features = {}
        for n in payload["nodes"]:
            nid = n["id"] if isinstance(n, dict) else n
            nodes.append(nid)
            if isinstance(n, dict) and "features" in n:
                features[nid] = np.asarray(n["features"], dtype=float)
            else:
                features[nid] = np.zeros(d)
        edges = []
        for e in payload["edges"]:
            edges.append((e["source"], e["target"], e.get("relation", "related")))
        return cls(nodes=nodes, edges=edges, features=features, feature_dim=d)


def energy(g: Graph) -> float:
    d = g.feature_dim
    total = 0.0
    for s, t, _ in g.edges:
        xs = g.features[s][:d]
        xt = g.features[t][:d]
        if xs.size < d:
            xs = np.pad(xs, (0, d - xs.size))
        if xt.size < d:
            xt = np.pad(xt, (0, d - xt.size))
        diff = xt - xs
        total += float(np.dot(diff, diff))
    return total


def gaps(g: Graph) -> list[dict[str, Any]]:
    d = g.feature_dim
    out = []
    for s, t, rel in g.edges:
        xs = g.features[s][:d]
        xt = g.features[t][:d]
        if xs.size < d:
            xs = np.pad(xs, (0, d - xs.size))
        if xt.size < d:
            xt = np.pad(xt, (0, d - xt.size))
        diff = xt - xs
        out.append({
            "source": s, "target": t, "relation": rel,
            "disagreement": float(np.dot(diff, diff)),
        })
    out.sort(key=lambda z: -z["disagreement"])
    return out


def consistency(g: Graph) -> dict[str, Any]:
    E = energy(g)
    gs = gaps(g)
    return {
        "energy": E,
        "gaps": gs,
        "consistent": E < 1e-8,
        "n_nodes": len(g.nodes),
        "n_edges": len(g.edges),
    }
