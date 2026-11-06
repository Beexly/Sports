"""
Block-CRC: partition large graphs, run CRC per block.

Scale-out path when n is huge. Uses Fiedler bipartition recursively
until blocks are small enough, then crc_connection per block.

Not on Path A hot path — call only when needed.
"""

from __future__ import annotations

from typing import Any
import numpy as np

from holonomy_cheeger import graph_laplacian, fundamental_cycles, holonomy_product, rotation
from crc import EdgeMap, crc_connection


def fiedler_partition(
    nodes: list[str], edges: list[tuple[str, str]]
) -> tuple[list[str], list[str]]:
    if len(nodes) <= 2:
        return nodes, []
    L = graph_laplacian(nodes, edges)
    evals, evecs = np.linalg.eigh(L)
    pos = np.where(evals > 1e-10)[0]
    if len(pos) == 0:
        mid = len(nodes) // 2
        return nodes[:mid], nodes[mid:]
    fiedler = evecs[:, pos[0]]
    S = [nodes[i] for i in range(len(nodes)) if fiedler[i] >= 0]
    Sc = [nodes[i] for i in range(len(nodes)) if fiedler[i] < 0]
    if not S or not Sc:
        mid = len(nodes) // 2
        return nodes[:mid], nodes[mid:]
    return S, Sc


def induced_edges(
    block: list[str], edges: list[tuple[str, str]]
) -> list[tuple[str, str]]:
    s = set(block)
    return [(u, v) for u, v in edges if u in s and v in s]


def partition_blocks(
    nodes: list[str],
    edges: list[tuple[str, str]],
    max_block: int = 32,
    depth: int = 0,
    max_depth: int = 8,
) -> list[list[str]]:
    if len(nodes) <= max_block or depth >= max_depth:
        return [nodes]
    S, Sc = fiedler_partition(nodes, edges)
    if not S or not Sc:
        return [nodes]
    return partition_blocks(S, induced_edges(S, edges), max_block, depth + 1, max_depth) + partition_blocks(
        Sc, induced_edges(Sc, edges), max_block, depth + 1, max_depth
    )


def block_crc(
    nodes: list[str],
    maps: list[EdgeMap],
    feats: dict[str, np.ndarray],
    *,
    reference: dict[str, np.ndarray] | None = None,
    max_block: int = 32,
) -> dict[str, Any]:
    """
    Run CRC on Fiedler blocks; aggregate structural/statistical flags.
    Cross-block edges are noted but not fully solved in v1 (scale-out approx).
    """
    edges = [(m.source, m.target) for m in maps]
    blocks = partition_blocks(nodes, edges, max_block=max_block)
    block_reports = []
    any_structural = False
    any_relative_fraud = False
    total_energy = 0.0

    for i, blk in enumerate(blocks):
        if not blk:
            continue
        bset = set(blk)
        bmaps = [m for m in maps if m.source in bset and m.target in bset]
        bfeats = {n: feats[n] for n in blk if n in feats}
        bref = {n: reference[n] for n in blk if reference and n in reference} or None
        if len(bfeats) < 1:
            continue
        r = crc_connection(blk, bmaps, bfeats, reference=bref if bref else None)
        total_energy += r.energy
        if r.repair_class == "structural":
            any_structural = True
        if r.relative and r.relative.get("status") == "self_consistent_wrong_vs_ledger":
            any_relative_fraud = True
        block_reports.append(
            {
                "block": i,
                "n_nodes": len(blk),
                "repair_class": r.repair_class,
                "energy": r.energy,
                "relative": r.relative.get("status") if r.relative else None,
                "holonomy_flag": r.holonomy_flag,
            }
        )

    cross = sum(
        1
        for m in maps
        if not any(m.source in set(b) and m.target in set(b) for b in blocks)
    )

    overall = "structural" if any_structural else (
        "relative_fraud_present" if any_relative_fraud else "see_blocks"
    )
    return {
        "mode": "block_crc",
        "n_blocks": len(block_reports),
        "max_block": max_block,
        "cross_block_edges": cross,
        "total_energy": total_energy,
        "overall_hint": overall,
        "blocks": block_reports,
        "note": "v1 approx: CRC per Fiedler block; cross-block maps counted not fully reduced",
    }
