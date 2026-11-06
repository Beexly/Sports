"""Certified Repair Class (CRC) engine — public entrypoint."""
from __future__ import annotations

from typing import Any
import numpy as np
from crc_part_a import *  # noqa: F401,F403
from crc_part_b import *  # noqa: F401,F403
from crc_part_a import EdgeMap, CRCReport, analyze_connection, rotation  # noqa: F401
from crc_part_b import repair_class_from, proposals_for, relative_crc  # noqa: F401


def crc_connection(
    nodes: list[str],
    edge_maps: list[EdgeMap],
    features: dict[str, np.ndarray],
    reference: dict[str, np.ndarray] | None = None,
) -> CRCReport:
    analysis = analyze_connection(nodes, edge_maps, features, d=2)
    rc = repair_class_from(analysis)
    props = proposals_for(analysis, rc)
    rel = {"status": "no_reference"}
    if reference is not None:
        rel = relative_crc(nodes, edge_maps, features, reference, d=2)
    n_e = max(analysis["n_edges"], 1)
    return CRCReport(
        energy=analysis["energy"],
        normalized_energy=analysis["energy"] / n_e,
        repair_class=rc,
        holonomy_flag=analysis["holonomy_flag"],
        dim_H0=analysis["dim_H0"],
        dim_H1=analysis["dim_H1"],
        bad_cycles=analysis["bad_cycles"],
        gaps=analysis["gaps"],
        proposals=props,
        relative=rel,
        n_nodes=analysis["n_nodes"],
        n_edges=analysis["n_edges"],
    )


def penrose_edge_maps(broken: bool = True) -> tuple[list[str], list[EdgeMap], dict[str, np.ndarray]]:
    nodes = ["A", "B", "C"]
    features = {
        "A": np.array([1.0, 0.0]),
        "B": np.array([0.0, 1.0]),
        "C": np.array([-1.0, 0.0]),
    }
    ang = np.pi / 2 if broken else 2 * np.pi / 3
    maps = [
        EdgeMap("A", "B", "ab", ang),
        EdgeMap("B", "C", "bc", ang),
        EdgeMap("C", "A", "ca", ang),
    ]
    return nodes, maps, features
