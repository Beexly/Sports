"""CSV multi-source ingest → CRC."""
from __future__ import annotations
from pathlib import Path
from typing import Any
import csv
import numpy as np
from crc import EdgeMap, crc_connection

def load_csv(path: str | Path) -> list[dict[str, str]]:
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))

def rows_to_graph(
    tables: dict[str, list[dict[str, str]]],
    *,
    feature_cols: tuple[str, ...] = ("risk_tier", "kyc_status"),
    sot_system: str | None = None,
) -> tuple[list[str], list[EdgeMap], dict[str, np.ndarray], dict[str, np.ndarray] | None]:
    nodes: list[str] = []
    feats: dict[str, np.ndarray] = {}
    by_entity: dict[str, list[str]] = {}
    for sys_name, rows in tables.items():
        for row in rows:
            eid = row.get("entity_id") or row.get("id")
            if not eid:
                continue
            nid = f"{sys_name}:{eid}"
            nodes.append(nid)
            vec = []
            for c in feature_cols:
                try:
                    vec.append(float(row.get(c, 0) or 0))
                except ValueError:
                    vec.append(0.0)
            feats[nid] = np.array(vec, dtype=float)
            by_entity.setdefault(eid, []).append(nid)
    maps: list[EdgeMap] = []
    for eid, nids in by_entity.items():
        for i, a in enumerate(nids):
            for b in nids[i + 1 :]:
                maps.append(EdgeMap(a, b, "same_person", 0.0))
    reference = None
    if sot_system:
        reference = {n: feats[n].copy() for n in nodes if n.startswith(sot_system + ":")}
        # expand: for every entity, SoT node features as ref for all systems
        ref_full = {}
        for eid, nids in by_entity.items():
            sot_nid = f"{sot_system}:{eid}"
            if sot_nid in feats:
                for n in nids:
                    ref_full[n] = feats[sot_nid].copy()
        reference = ref_full if ref_full else reference
    return nodes, maps, feats, reference

def run_crc_on_tables(
    tables: dict[str, list[dict[str, str]]],
    *,
    sot_system: str | None = None,
    feature_cols: tuple[str, ...] = ("risk_tier", "kyc_status"),
) -> dict[str, Any]:
    nodes, maps, feats, reference = rows_to_graph(
        tables, feature_cols=feature_cols, sot_system=sot_system
    )
    full = crc_connection(nodes, maps, feats, reference=reference)
    per_entity = {}
    entities = set()
    for n in nodes:
        if ":" in n:
            entities.add(n.split(":", 1)[1])
    for eid in entities:
        enodes = [n for n in nodes if n.endswith(":" + eid) or n.split(":")[-1] == eid]
        emaps = [m for m in maps if m.source in enodes and m.target in enodes]
        efeats = {n: feats[n] for n in enodes if n in feats}
        eref = {n: reference[n] for n in enodes if reference and n in reference} or None
        if len(efeats) < 1:
            continue
        r = crc_connection(enodes, emaps, efeats, reference=eref)
        per_entity[eid] = {
            "repair_class": r.repair_class,
            "relative": r.relative.get("status") if r.relative else None,
            "energy": r.energy,
            "n_systems": len(enodes),
            "holonomy_flag": r.holonomy_flag,
        }
    return {
        "full": {
            "repair_class": full.repair_class,
            "energy": full.energy,
            "holonomy_flag": full.holonomy_flag,
            "relative": full.relative,
        },
        "per_entity": per_entity,
    }
