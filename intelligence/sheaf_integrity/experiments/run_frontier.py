#!/usr/bin/env python3
"""Run H0/H1 classification, ranker bake-off, and T2 Penrose checks."""
from __future__ import annotations
import json
import sys
from pathlib import Path
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "core"))
from crc import EdgeMap, crc_connection, penrose_edge_maps  # noqa: E402
from ranker_bakeoff import bakeoff_report  # noqa: E402


def run_penrose() -> dict:
    nodes, maps, feats = penrose_edge_maps(broken=True)
    r = crc_connection(nodes, maps, feats)
    return {
        "case": "penrose_broken",
        "repair_class": r.repair_class,
        "holonomy_flag": r.holonomy_flag,
        "energy": r.energy,
        "dim_H0": r.dim_H0,
    }


def run_relative() -> dict:
    nodes = ["crm", "pay"]
    maps = [EdgeMap("crm", "pay", "same", 0.0)]
    feats = {"crm": np.array([1.0, 0.0]), "pay": np.array([1.0, 0.0])}
    ref = {"crm": np.array([0.0, 1.0]), "pay": np.array([0.0, 1.0])}
    r = crc_connection(nodes, maps, feats, reference=ref)
    return {
        "case": "relative_fraud",
        "relative": r.relative,
        "repair_class": r.repair_class,
        "energy": r.energy,
    }


def main() -> None:
    out = {
        "penrose": run_penrose(),
        "relative": run_relative(),
    }
    print(json.dumps(out, indent=2, default=float))


if __name__ == "__main__":
    main()
