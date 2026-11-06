"""Planted gap tests for CRC structural detection."""
from __future__ import annotations
import sys
from pathlib import Path
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "core"))
from crc import EdgeMap, crc_connection, rotation  # noqa: E402

def test_penrose_structural():
    nodes = ["A", "B", "C"]
    ang = np.pi / 2
    maps = [
        EdgeMap("A", "B", "ab", ang),
        EdgeMap("B", "C", "bc", ang),
        EdgeMap("C", "A", "ca", ang),
    ]
    feats = {n: np.array([1.0, 0.0]) for n in nodes}
    r = crc_connection(nodes, maps, feats)
    assert r.holonomy_flag is True
    assert r.repair_class == "structural"

def test_consistent_identity():
    nodes = ["A", "B", "C"]
    maps = [
        EdgeMap("A", "B", "ab", 0.0),
        EdgeMap("B", "C", "bc", 0.0),
        EdgeMap("C", "A", "ca", 0.0),
    ]
    feats = {n: np.array([1.0, 0.0]) for n in nodes}
    r = crc_connection(nodes, maps, feats)
    assert r.holonomy_flag is False
    assert r.energy < 1e-9
    assert r.repair_class == "consistent"

def test_relative_fraud():
    nodes = ["crm", "pay"]
    maps = [EdgeMap("crm", "pay", "same", 0.0)]
    feats = {"crm": np.array([1.0, 0.0]), "pay": np.array([1.0, 0.0])}
    ref = {"crm": np.array([0.0, 1.0]), "pay": np.array([0.0, 1.0])}
    r = crc_connection(nodes, maps, feats, reference=ref)
    assert r.relative["status"] == "self_consistent_wrong_vs_ledger"

if __name__ == "__main__":
    test_penrose_structural()
    test_consistent_identity()
    test_relative_fraud()
    print("OK planted_gap")
