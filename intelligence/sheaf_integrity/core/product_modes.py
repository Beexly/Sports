"""
Product expansions that clear the value×safety / cost bar.

Modes
-----
1. entity_integrity   — batch per-entity relative CRC (Path A core)
2. temporal_relative  — windowed relative status (when did fraud appear)
3. typed_relations    — relation-aware proposals (same_person vs weak link)
4. model_agreement    — multi-model outputs as systems (Path C preset)
5. ontology_hygiene   — same-as graph without SoT (Path B preset)

Not included: spectral clustering product, PH API, learned maps.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any
import numpy as np

from crc import EdgeMap, crc_connection
from ingest_multisource import load_csv, rows_to_graph, run_crc_on_tables


def entity_integrity_report(
    tables: dict[str, list[dict[str, str]]],
    sot_system: str,
    feature_cols: tuple[str, ...] = ("risk_tier", "kyc_status"),
) -> dict[str, Any]:
    raw = run_crc_on_tables(tables, sot_system=sot_system, feature_cols=feature_cols)
    entities = []
    for eid, row in raw["per_entity"].items():
        entities.append(
            {
                "entity_id": eid,
                "repair_class": row["repair_class"],
                "relative": row["relative"],
                "energy": row["energy"],
                "n_systems": row["n_systems"],
                "priority": _priority(row["relative"], row["energy"]),
            }
        )
    entities.sort(key=lambda e: (-e["priority"], -e["energy"]))
    fraud = [e for e in entities if e["relative"] == "self_consistent_wrong_vs_ledger"]
    noise = [e for e in entities if e["relative"] == "inconsistent_and_mismatched"]
    clean = [e for e in entities if e["relative"] == "aligned_with_reference"]
    return {
        "mode": "entity_integrity",
        "summary": {
            "n_entities": len(entities),
            "n_fraud_flagged": len(fraud),
            "n_noise": len(noise),
            "n_clean": len(clean),
        },
        "fraud_candidates": fraud,
        "entities": entities,
        "full_graph": raw["full"],
    }


def _priority(relative: str | None, energy: float) -> int:
    if relative == "self_consistent_wrong_vs_ledger":
        return 100
    if relative == "inconsistent_and_mismatched":
        return 40
    if energy and energy > 1e-6:
        return 20
    return 0


def temporal_relative_report(
    windows: list[dict[str, Any]],
    *,
    sot_key: str = "reference",
) -> dict[str, Any]:
    rows = []
    first_fraud = None
    for i, w in enumerate(windows):
        r = crc_connection(
            w["nodes"],
            w["maps"],
            w["feats"],
            reference=w.get(sot_key) or w.get("reference"),
        )
        status = r.relative.get("status") if r.relative else None
        row = {
            "window": i,
            "label": w.get("label", f"w{i}"),
            "repair_class": r.repair_class,
            "relative": status,
            "energy": r.energy,
            "fraud_flag": status == "self_consistent_wrong_vs_ledger",
        }
        rows.append(row)
        if row["fraud_flag"] and first_fraud is None:
            first_fraud = i
    return {
        "mode": "temporal_relative",
        "windows": rows,
        "first_fraud_window": first_fraud,
        "detection_rate": sum(1 for r in rows if r["fraud_flag"]) / max(len(rows), 1),
    }


RELATION_POLICY = {
    "same_person": {"critical": True, "default_theta": 0.0},
    "same_as": {"critical": True, "default_theta": 0.0},
    "linked": {"critical": False, "default_theta": 0.0},
    "associated": {"critical": False, "default_theta": 0.0},
    "beam": {"critical": True, "default_theta": None},
}


def proposals_with_relation_policy(report) -> list[dict[str, Any]]:
    out = []
    for p in report.proposals:
        rel = p.get("relation") or "related"
        policy = RELATION_POLICY.get(rel, {"critical": True})
        q = dict(p)
        q["relation_critical"] = policy["critical"]
        if report.repair_class == "statistical" and not policy["critical"]:
            if q.get("action") == "drop_edge":
                q["score"] = q.get("score", 0) + 1.0
            if q.get("action") == "realign":
                q["score"] = q.get("score", 0) - 0.5
        out.append(q)
    out.sort(key=lambda z: -z.get("score", 0))
    return out


def model_agreement_report(
    model_outputs: dict[str, np.ndarray],
    *,
    reference: dict[str, np.ndarray] | None = None,
) -> dict[str, Any]:
    names = list(model_outputs.keys())
    nodes = names
    maps = [
        EdgeMap(a, b, "should_agree", 0.0)
        for i, a in enumerate(names)
        for b in names[i + 1 :]
    ]
    feats = {k: np.asarray(v, dtype=float) for k, v in model_outputs.items()}
    ref = None
    if reference is not None:
        if set(reference.keys()) == set(names):
            ref = {k: np.asarray(v, dtype=float) for k, v in reference.items()}
        else:
            vec = np.asarray(next(iter(reference.values())), dtype=float)
            ref = {n: vec.copy() for n in names}
    r = crc_connection(nodes, maps, feats, reference=ref)
    return {
        "mode": "model_agreement",
        "repair_class": r.repair_class,
        "relative": r.relative,
        "energy": r.energy,
        "holonomy_flag": r.holonomy_flag,
        "proposals": r.proposals[:5],
        "n_models": len(names),
    }


def ontology_hygiene_report(
    nodes: list[str],
    same_as_edges: list[tuple[str, str]],
    features: dict[str, np.ndarray],
) -> dict[str, Any]:
    maps = [EdgeMap(a, b, "same_as", 0.0) for a, b in same_as_edges]
    r = crc_connection(nodes, maps, features, reference=None)
    return {
        "mode": "ontology_hygiene",
        "repair_class": r.repair_class,
        "energy": r.energy,
        "holonomy_flag": r.holonomy_flag,
        "dim_H0": r.dim_H0,
        "proposals": r.proposals[:5],
        "interpretation": (
            "structural: same-as rules conflict — do not embed away"
            if r.repair_class == "structural"
            else "statistical: values drift on valid same-as — realign or drop"
            if r.repair_class == "statistical"
            else "consistent: same-as graph glues"
        ),
    }
