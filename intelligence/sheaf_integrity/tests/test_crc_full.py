"""Full CRC suite: API shape, Penrose stress test, localization, relative CRC."""
from __future__ import annotations
import sys
from pathlib import Path
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "core"))
from crc import EdgeMap, crc_connection, penrose_edge_maps  # noqa: E402


def test_penrose_structural():
    nodes, maps, feats = penrose_edge_maps(broken=True)
    r = crc_connection(nodes, maps, feats)
    assert r.holonomy_flag is True
    assert r.repair_class in ("structural", "mixed")


def test_penrose_flat_when_angles_sum_zero():
    nodes, maps, feats = penrose_edge_maps(broken=False)
    r = crc_connection(nodes, maps, feats)
    # 3 * (2π/3) = 2π ≡ 0 mod 2π → holonomy trivial
    assert r.holonomy_flag is False or r.dim_H0 > 0


def test_relative_fraud_label():
    nodes = ["a", "b"]
    maps = [EdgeMap("a", "b", "same", 0.0)]
    feats = {"a": np.array([1.0, 0.0]), "b": np.array([1.0, 0.0])}
    ref = {"a": np.array([0.0, 1.0]), "b": np.array([0.0, 1.0])}
    r = crc_connection(nodes, maps, feats, reference=ref)
    assert r.relative["status"] == "self_consistent_wrong_vs_ledger"


def test_consistent_identity():
    nodes = ["a", "b", "c"]
    maps = [
        EdgeMap("a", "b", "ab", 0.0),
        EdgeMap("b", "c", "bc", 0.0),
        EdgeMap("c", "a", "ca", 0.0),
    ]
    feats = {n: np.array([1.0, 0.0]) for n in nodes}
    r = crc_connection(nodes, maps, feats)
    assert r.energy < 1e-8
    assert r.repair_class == "consistent"


def test_report_shape():
    nodes, maps, feats = penrose_edge_maps(True)
    r = crc_connection(nodes, maps, feats)
    d = r.to_dict()
    for k in ("energy", "repair_class", "holonomy_flag", "dim_H0", "proposals", "relative"):
        assert k in d


if __name__ == "__main__":
    test_penrose_structural()
    test_penrose_flat_when_angles_sum_zero()
    test_relative_fraud_label()
    test_consistent_identity()
    test_report_shape()
    print("OK test_crc_full")
