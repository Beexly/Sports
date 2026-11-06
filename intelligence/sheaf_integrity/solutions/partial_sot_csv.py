"""Partial SoT → unknown (never fraud) + ranked entity CSV export."""
from __future__ import annotations
import csv
import io
from typing import Any
import numpy as np
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "core"))
from crc import EdgeMap, crc_connection  # noqa: E402


def relative_with_partial_sot(
    nodes, maps, feats, reference, sot_covered: set[str],
) -> dict[str, Any]:
    if not reference:
        return {"status": "unknown", "reason": "no_reference"}
    ref_sub = {n: reference[n] for n in nodes if n in sot_covered and n in reference}
    feat_sub = {n: feats[n] for n in nodes if n in sot_covered and n in feats}
    maps_sub = [m for m in maps if m.source in sot_covered and m.target in sot_covered]
    nodes_sub = [n for n in nodes if n in sot_covered]
    uncovered = [n for n in nodes if n not in sot_covered]
    if not nodes_sub:
        return {"status": "unknown", "reason": "no_sot_coverage", "uncovered": uncovered}
    r = crc_connection(nodes_sub, maps_sub, feat_sub, reference=ref_sub)
    return {
        "status": r.relative.get("status"),
        "covered": nodes_sub,
        "uncovered": uncovered,
        "uncovered_label": "unknown",
        "energy": r.energy,
        "repair_class": r.repair_class,
        "relative": r.relative,
    }


def entity_csv_export(entities: list[dict[str, Any]]) -> str:
    def priority(row):
        rel = row.get("relative") or ""
        if rel == "self_consistent_wrong_vs_ledger":
            return 100
        if rel == "inconsistent_and_mismatched":
            return 40
        if rel == "unknown":
            return 10
        if (row.get("energy") or 0) > 1e-6:
            return 20
        return 0
    rows = sorted(entities, key=lambda e: (-priority(e), -(e.get("energy") or 0)))
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=["entity_id", "relative", "energy", "n_systems", "priority", "note"])
    w.writeheader()
    for e in rows:
        w.writerow({
            "entity_id": e.get("entity_id", ""),
            "relative": e.get("relative", "unknown"),
            "energy": f"{float(e.get('energy') or 0):.6f}",
            "n_systems": e.get("n_systems", 0),
            "priority": priority(e),
            "note": e.get("note", ""),
        })
    return buf.getvalue()


if __name__ == "__main__":
    nodes = ["crm:alice", "ledger:alice", "crm:bob"]
    maps = [EdgeMap("crm:alice", "ledger:alice", "same", 0.0)]
    feats = {
        "crm:alice": np.array([1.0, 0.0]),
        "ledger:alice": np.array([1.0, 0.0]),
        "crm:bob": np.array([1.0, 0.0]),
    }
    reference = {
        "crm:alice": np.array([0.0, 1.0]),
        "ledger:alice": np.array([0.0, 1.0]),
    }
    sot = {"crm:alice", "ledger:alice"}
    result = relative_with_partial_sot(nodes, maps, feats, reference, sot)
    entities = [
        {"entity_id": "alice", "relative": result["status"], "energy": result.get("energy", 0), "n_systems": 2, "note": "covered"},
        {"entity_id": "bob", "relative": "unknown", "energy": 0, "n_systems": 1, "note": "no SoT — never fraud"},
    ]
    print(entity_csv_export(entities))
    print("alice status:", result["status"], "uncovered:", result["uncovered"])
