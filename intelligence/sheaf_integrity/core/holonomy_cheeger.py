"""
Holonomy calculation methods + Cheeger constant bound.

Classical only. Cheeger is optional scale-out diagnostic (not repair class).
"""

from __future__ import annotations

from typing import Any
import numpy as np


def rotation(theta: float) -> np.ndarray:
    c, s = np.cos(theta), np.sin(theta)
    return np.array([[c, -s], [s, c]], dtype=float)


def spanning_forest_parent(
    nodes: list[str], edges: list[tuple[str, str]]
) -> dict[str, str | None]:
    adj: dict[str, list[str]] = {n: [] for n in nodes}
    for u, v in edges:
        adj[u].append(v)
        adj[v].append(u)
    parent: dict[str, str | None] = {n: None for n in nodes}
    seen: set[str] = set()
    for root in nodes:
        if root in seen:
            continue
        queue = [root]
        seen.add(root)
        parent[root] = None
        while queue:
            u = queue.pop(0)
            for w in adj[u]:
                if w not in seen:
                    seen.add(w)
                    parent[w] = u
                    queue.append(w)
    return parent


def fundamental_cycles(
    nodes: list[str], edges: list[tuple[str, str]]
) -> list[list[tuple[str, str]]]:
    parent = spanning_forest_parent(nodes, edges)
    tree_edges = set()
    for v, p in parent.items():
        if p is not None:
            tree_edges.add(frozenset((p, v)))

    def path_to_root(v: str) -> list[str]:
        chain = [v]
        while parent[chain[-1]] is not None:
            chain.append(parent[chain[-1]])  # type: ignore
        return chain

    cycles: list[list[tuple[str, str]]] = []
    for u, v in edges:
        if frozenset((u, v)) in tree_edges:
            continue
        pu, pv = path_to_root(u), path_to_root(v)
        set_pu = set(pu)
        lca = next(x for x in pv if x in set_pu)
        path_u = []
        x = u
        while x != lca:
            p = parent[x]
            assert p is not None
            path_u.append((x, p))
            x = p
        stack = []
        x = v
        while x != lca:
            p = parent[x]
            assert p is not None
            stack.append((p, x))
            x = p
        path_v_rev = list(reversed(stack))
        cyc = path_u + path_v_rev + [(v, u)]
        cycles.append(cyc)
    return cycles


def holonomy_product(
    cycle: list[tuple[str, str]],
    maps: dict[tuple[str, str], np.ndarray],
    d: int = 2,
) -> tuple[np.ndarray, float]:
    H = np.eye(d)
    for u, v in cycle:
        if (u, v) in maps:
            M = maps[(u, v)]
        elif (v, u) in maps:
            M = np.linalg.inv(maps[(v, u)])
        else:
            M = np.eye(d)
        H = M @ H
    dev = float(np.linalg.norm(H - np.eye(d)))
    return H, dev


def holonomy_report(
    nodes: list[str],
    edge_maps: list[tuple[str, str, float]],
    eps: float = 1e-8,
) -> dict[str, Any]:
    edges = [(a, b) for a, b, _ in edge_maps]
    maps = {(a, b): rotation(th) for a, b, th in edge_maps}
    cycles = fundamental_cycles(nodes, edges)
    bad = []
    for cyc in cycles:
        H, dev = holonomy_product(cyc, maps)
        if dev > eps:
            bad.append({"cycle": cyc, "dev": dev, "tr": float(np.trace(H))})
    return {
        "n_cycles": len(cycles),
        "holonomy_flag": len(bad) > 0,
        "bad_cycles": bad,
    }


def graph_laplacian(
    nodes: list[str], edges: list[tuple[str, str]]
) -> np.ndarray:
    n = len(nodes)
    idx = {nd: i for i, nd in enumerate(nodes)}
    L = np.zeros((n, n))
    for u, v in edges:
        i, j = idx[u], idx[v]
        L[i, i] += 1
        L[j, j] += 1
        L[i, j] -= 1
        L[j, i] -= 1
    return L


def cheeger_from_fiedler(
    nodes: list[str], edges: list[tuple[str, str]]
) -> dict[str, Any]:
    L = graph_laplacian(nodes, edges)
    evals, evecs = np.linalg.eigh(L)
    pos = np.where(evals > 1e-10)[0]
    if len(pos) == 0:
        return {"lambda1": 0.0, "h_upper_sqrt": 0.0, "cut": 0, "partition": []}
    i1 = pos[0]
    lam1 = float(evals[i1])
    fiedler = evecs[:, i1]
    side = fiedler >= 0
    S = {nodes[i] for i in range(len(nodes)) if side[i]}
    Sc = set(nodes) - S
    cut = sum(1 for u, v in edges if (u in S) != (v in S))
    h_proxy = cut / max(min(len(S), len(Sc)), 1)
    return {
        "lambda1": lam1,
        "cheeger_upper_sqrt2lam": float(np.sqrt(2 * lam1)),
        "cut_edges": cut,
        "partition_sizes": [len(S), len(Sc)],
        "h_proxy": h_proxy,
        "note": "λ₁/2 ≤ h ≤ √(2λ₁) form depends on normalization; proxy is combinatorial",
    }


if __name__ == "__main__":
    nodes = ["A", "B", "C"]
    emaps = [("A", "B", np.pi / 2), ("B", "C", np.pi / 2), ("C", "A", np.pi / 2)]
    print("PENROSE", holonomy_report(nodes, emaps))
    nodes2 = [f"L{i}" for i in range(4)] + [f"R{i}" for i in range(4)]
    edges2 = [
        ("L0", "L1"), ("L1", "L2"), ("L2", "L3"), ("L3", "L0"),
        ("R0", "R1"), ("R1", "R2"), ("R2", "R3"), ("R3", "R0"),
        ("L0", "R0"),
    ]
    print("CHEEGER", cheeger_from_fiedler(nodes2, edges2))
