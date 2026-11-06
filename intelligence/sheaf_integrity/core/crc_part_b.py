"""CRC repair class + proposals + relative (depends on crc_part_a)."""
from __future__ import annotations
from typing import Any
import numpy as np
from crc_part_a import *  # noqa: F401,F403
from crc_part_a import EdgeMap, rotation, CRCReport, analyze_connection, connected_components  # noqa: F401


def repair_class_from(analysis: dict[str, Any]) -> str:
    E = analysis["energy"]
    h0 = analysis["dim_H0"]
    hol = analysis["holonomy_flag"]
    if E < 1e-8 and not hol:
        return "consistent"
    if hol and h0 == 0 and E > 1e-8:
        return "structural"
    if hol and E > 1e-8:
        return "mixed"
    if E > 1e-8:
        return "statistical"
    return "consistent"


def proposals_for(analysis: dict[str, Any], repair_class: str) -> list[dict[str, Any]]:
    props: list[dict[str, Any]] = []
    if repair_class in ("statistical", "mixed", "consistent"):
        for g in analysis["gaps"][:5]:
            if g["disagreement"] < 1e-12:
                continue
            props.append({
                "action": "realign",
                "source": g["source"],
                "target": g["target"],
                "score": g["disagreement"],
                "rationale": f"Statistical gap; realign stalks (ΔE≈{g['disagreement']:.4f})",
            })
            props.append({
                "action": "drop_edge",
                "source": g["source"],
                "target": g["target"],
                "score": g["disagreement"] * 0.95,
                "rationale": "Drop inconsistent link",
            })
    if repair_class in ("structural", "mixed"):
        for bc in analysis["bad_cycles"]:
            best = bc.get("best_relax")
            if best:
                props.append({
                    "action": "relax_restriction",
                    "source": best["source"],
                    "target": best["target"],
                    "score": best["reduction"] + 10.0,
                    "rationale": (
                        f"Kill holonomy on cycle {bc['cycle_id']}: "
                        f"relax map θ→0 reduces deviation by {best['reduction']:.4f}"
                    ),
                })
            props.append({
                "action": "grow_structure",
                "source": bc["edges"][0]["source"] if bc["edges"] else "?",
                "target": bc["edges"][-1]["target"] if bc["edges"] else "?",
                "score": bc["holonomy_deviation"] + 9.0,
                "rationale": (
                    f"Structural obstruction on cycle {bc['cycle_id']} "
                    f"(holonomy dev={bc['holonomy_deviation']:.4f})"
                ),
            })
    seen: dict[tuple, dict] = {}
    for p in props:
        key = (p["action"], p["source"], p["target"])
        if key not in seen or p["score"] > seen[key]["score"]:
            seen[key] = p
    return sorted(seen.values(), key=lambda p: p["score"], reverse=True)


def relative_crc(
    nodes: list[str],
    edge_maps: list[EdgeMap],
    features: dict[str, np.ndarray],
    reference: dict[str, np.ndarray],
    d: int = 2,
) -> dict[str, Any]:
    self_a = analyze_connection(nodes, edge_maps, features, d)
    ref_a = analyze_connection(nodes, edge_maps, reference, d)
    mismatch = 0.0
    for n in nodes:
        xf = features[n][:d]
        rf = reference[n][:d]
        if xf.size < d:
            xf = np.pad(xf, (0, d - xf.size))
        if rf.size < d:
            rf = np.pad(rf, (0, d - rf.size))
        mismatch += float(np.sum((xf - rf) ** 2))

    self_E, ref_E = self_a["energy"], ref_a["energy"]
    if mismatch < 1e-6 and self_E < 1e-6:
        status = "aligned_with_reference"
    elif self_E < 1e-6 and mismatch > 1e-4:
        status = "self_consistent_wrong_vs_ledger"
    elif self_E > 1e-4 and mismatch > 1e-4:
        status = "inconsistent_and_mismatched"
    elif self_E > 1e-4 and mismatch < 1e-4:
        status = "matches_ledger_but_internal_gaps"
    else:
        status = "partial"

    return {
        "status": status,
        "self_energy": self_E,
        "reference_energy": ref_E,
        "grounding_mismatch": mismatch,
        "self_repair_class": repair_class_from(self_a),
        "reference_repair_class": repair_class_from(ref_a),
        "interpretation": {
            "self_consistent_wrong_vs_ledger": "Internally harmonic but disagrees with ledger",
            "aligned_with_reference": "Self and ledger agree",
            "inconsistent_and_mismatched": "Broken internally and vs ledger",
            "matches_ledger_but_internal_gaps": "Matches ledger but sheaf energy high",
            "partial": "Intermediate",
        }.get(status, status),
    }


def crc_constant_graph(
    nodes: list[str],
    edges: list[tuple[str, str, str]],
    features: dict[str, np.ndarray],
    d: int,
    reference: dict[str, np.ndarray] | None = None,
) -> CRCReport:
    edge_maps = [EdgeMap(source=s, target=t, relation=rel, theta=0.0) for s, t, rel in edges]
    feats = {}
    for n in nodes:
        v = np.asarray(features[n], dtype=float).ravel()
        if v.size < d:
            v = np.pad(v, (0, d - v.size))
        feats[n] = v[:d]
    analysis = analyze_connection(nodes, edge_maps, feats, d=2) if d == 2 else {
        "energy": 0.0, "dim_H0": d, "dim_H1": 0, "holonomy_flag": False,
        "bad_cycles": [], "gaps": [], "n_nodes": len(nodes), "n_edges": len(edges),
    }
    rc = repair_class_from(analysis)
    props = proposals_for(analysis, rc)
    rel = {"status": "no_reference"}
    if reference is not None and d == 2:
        ref2 = {}
        for n in nodes:
            v = np.asarray(reference[n], dtype=float).ravel()
            if v.size < 2:
                v = np.pad(v, (0, 2 - v.size))
            ref2[n] = v[:2]
        rel = relative_crc(nodes, edge_maps, feats, ref2, d=2)
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
