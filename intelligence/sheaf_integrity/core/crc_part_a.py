"""
Certified Repair Class (CRC) engine.

Public outputs:
  repair_class ∈ {consistent, statistical, structural, mixed}
  holonomy_flag, bad_cycles, relative_status

Internal:
  constant sheaves, SO(2) connection sheaves, relative grounding cone proxy.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
import itertools
import numpy as np
from numpy.linalg import norm, matrix_rank, svd


def rotation(theta: float) -> np.ndarray:
    c, s = np.cos(theta), np.sin(theta)
    return np.array([[c, -s], [s, c]], dtype=float)


def connected_components(nodes: list[str], edges: list[tuple[str, str]]) -> list[set[str]]:
    parent = {n: n for n in nodes}

    def find(x: str) -> str:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for s, t in edges:
        if s in parent and t in parent:
            rs, rt = find(s), find(t)
            if rs != rt:
                parent[rt] = rs
    comps: dict[str, set[str]] = {}
    for n in nodes:
        r = find(n)
        comps.setdefault(r, set()).add(n)
    return list(comps.values())


def fundamental_cycles(
    nodes: list[str], edges: list[tuple[str, str]]
) -> list[list[tuple[str, str]]]:
    parent: dict[str, str | None] = {n: None for n in nodes}
    depth = {n: 0 for n in nodes}
    tree_edges: set[frozenset[str]] = set()
    visited: set[str] = set()
    adj: dict[str, list[str]] = {n: [] for n in nodes}
    for s, t in edges:
        adj[s].append(t)
        adj[t].append(s)

    def dfs(u: str, p: str | None) -> None:
        visited.add(u)
        for v in adj[u]:
            if v == p:
                continue
            if v not in visited:
                parent[v] = u
                depth[v] = depth[u] + 1
                tree_edges.add(frozenset([u, v]))
                dfs(v, u)

    for n in nodes:
        if n not in visited:
            dfs(n, None)

    cycles: list[list[tuple[str, str]]] = []
    for s, t in edges:
        e = frozenset([s, t])
        if e in tree_edges:
            continue
        path_s: list[str] = []
        path_t: list[str] = []
        a, b = s, t
        while a != b:
            if depth[a] >= depth[b]:
                path_s.append(a)
                a = parent[a]  # type: ignore
            if a != b and depth[b] > depth[a]:
                path_t.append(b)
                b = parent[b]  # type: ignore
            if a != b and depth[a] == depth[b]:
                path_s.append(a)
                path_t.append(b)
                a = parent[a]  # type: ignore
                b = parent[b]  # type: ignore
        lca = a
        chain = path_s + [lca] + list(reversed(path_t))
        cyc_edges = [(chain[i], chain[i + 1]) for i in range(len(chain) - 1)]
        cyc_edges.append((s, t))
        cycles.append(cyc_edges)
    return cycles


@dataclass
class EdgeMap:
    source: str
    target: str
    relation: str
    theta: float
    matrix: np.ndarray = field(init=False)

    def __post_init__(self) -> None:
        self.matrix = rotation(self.theta)


@dataclass
class CRCReport:
    energy: float
    normalized_energy: float
    repair_class: str
    holonomy_flag: bool
    dim_H0: int
    dim_H1: int
    bad_cycles: list[dict[str, Any]]
    gaps: list[dict[str, Any]]
    proposals: list[dict[str, Any]]
    relative: dict[str, Any]
    n_nodes: int
    n_edges: int

    def to_dict(self) -> dict[str, Any]:
        return {
            "energy": float(self.energy),
            "normalized_energy": float(self.normalized_energy),
            "repair_class": self.repair_class,
            "holonomy_flag": self.holonomy_flag,
            "dim_H0": self.dim_H0,
            "dim_H1": self.dim_H1,
            "bad_cycles": self.bad_cycles,
            "gaps": self.gaps,
            "proposals": self.proposals,
            "relative": self.relative,
            "n_nodes": self.n_nodes,
            "n_edges": self.n_edges,
        }


def _edge_key(s: str, t: str) -> frozenset[str]:
    return frozenset([s, t])


def analyze_connection(
    nodes: list[str],
    edge_maps: list[EdgeMap],
    features: dict[str, np.ndarray],
    d: int = 2,
) -> dict[str, Any]:
    n, m = len(nodes), len(edge_maps)
    idx = {node: i for i, node in enumerate(nodes)}
    delta = np.zeros((m * d, n * d))
    x = np.zeros(n * d)
    for i, node in enumerate(nodes):
        feat = features[node]
        x[i * d : (i + 1) * d] = feat[:d] if feat.size >= d else np.pad(feat, (0, d - feat.size))

    for e_i, em in enumerate(edge_maps):
        si, ti = idx[em.source], idx[em.target]
        R = em.matrix
        delta[e_i * d : (e_i + 1) * d, ti * d : (ti + 1) * d] = R
        delta[e_i * d : (e_i + 1) * d, si * d : (si + 1) * d] = -np.eye(d)

    dx = delta @ x
    energy = float(np.dot(dx, dx))
    rank = int(matrix_rank(delta, tol=1e-10))
    dim_H0 = n * d - rank
    dim_H1 = m * d - rank

    undirected = [(em.source, em.target) for em in edge_maps]
    cycles = fundamental_cycles(nodes, undirected)
    em_by_key: dict[frozenset[str], EdgeMap] = {}
    for em in edge_maps:
        em_by_key[_edge_key(em.source, em.target)] = em

    bad_cycles: list[dict[str, Any]] = []
    for ci, cyc in enumerate(cycles):
        Hol = np.eye(d)
        edge_list = []
        for a, b in cyc:
            em = em_by_key.get(_edge_key(a, b))
            if em is None:
                continue
            if em.source == a and em.target == b:
                Hol = em.matrix @ Hol
            else:
                Hol = em.matrix.T @ Hol
            edge_list.append({"source": em.source, "target": em.target, "theta": em.theta})
        dev = float(norm(Hol - np.eye(d), ord="fro"))
        if dev > 1e-6:
            relax_scores = []
            for em in edge_maps:
                Hol2 = np.eye(d)
                for a, b in cyc:
                    em2 = em_by_key[_edge_key(a, b)]
                    R = np.eye(d) if em2 is em else em2.matrix
                    if em2.source == a and em2.target == b:
                        Hol2 = R @ Hol2
                    else:
                        Hol2 = R.T @ Hol2
                dev2 = float(norm(Hol2 - np.eye(d), ord="fro"))
                relax_scores.append({
                    "source": em.source, "target": em.target, "theta": em.theta,
                    "holonomy_after_relax": dev2, "reduction": dev - dev2,
                })
            relax_scores.sort(key=lambda z: z["reduction"], reverse=True)
            bad_cycles.append({
                "cycle_id": ci, "edges": edge_list, "holonomy_deviation": dev,
                "best_relax": relax_scores[0] if relax_scores else None,
                "relax_ranking": relax_scores[:3],
            })

    holonomy_flag = len(bad_cycles) > 0 or dim_H0 == 0

    gaps = []
    for em in edge_maps:
        rs = features[em.source][:d]
        rt = features[em.target][:d]
        if rs.size < d:
            rs = np.pad(rs, (0, d - rs.size))
        if rt.size < d:
            rt = np.pad(rt, (0, d - rt.size))
        diff = em.matrix @ rt - rs
        gaps.append({
            "source": em.source, "target": em.target, "relation": em.relation,
            "disagreement": float(np.dot(diff, diff)), "theta": em.theta,
        })
    gaps.sort(key=lambda g: g["disagreement"], reverse=True)
    for i, g in enumerate(gaps, 1):
        g["rank"] = i

    return {
        "energy": energy, "dim_H0": dim_H0, "dim_H1": dim_H1, "rank_delta": rank,
        "holonomy_flag": holonomy_flag, "bad_cycles": bad_cycles, "gaps": gaps,
        "n_nodes": n, "n_edges": m,
    }
