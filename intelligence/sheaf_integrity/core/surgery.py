"""Minimal restriction edits (surgery) to restore gluing."""
from __future__ import annotations
from typing import Any
import numpy as np
from crc import EdgeMap, crc_connection


def propose_surgery(
    nodes: list[str],
    maps: list[EdgeMap],
    feats: dict[str, np.ndarray],
) -> dict[str, Any]:
    """If structural, rank edges to relax (theta→0) by holonomy reduction."""
    r = crc_connection(nodes, maps, feats)
    if r.repair_class not in ("structural", "mixed"):
        return {"needed": False, "repair_class": r.repair_class, "edits": []}
    edits = []
    for bc in r.bad_cycles:
        best = bc.get("best_relax")
        if best:
            edits.append({
                "source": best["source"],
                "target": best["target"],
                "action": "relax_theta_to_0",
                "reduction": best["reduction"],
                "cycle_id": bc.get("cycle_id"),
            })
    edits.sort(key=lambda e: -e.get("reduction", 0))
    return {
        "needed": True,
        "repair_class": r.repair_class,
        "edits": edits,
        "certificate": "post-edit: re-run crc_connection; expect holonomy_flag False or reduced",
    }


def apply_surgery(
    maps: list[EdgeMap],
    edits: list[dict[str, Any]],
) -> list[EdgeMap]:
    keys = {(e["source"], e["target"]) for e in edits}
    out = []
    for m in maps:
        if (m.source, m.target) in keys:
            out.append(EdgeMap(m.source, m.target, m.relation, 0.0))
        else:
            out.append(m)
    return out
