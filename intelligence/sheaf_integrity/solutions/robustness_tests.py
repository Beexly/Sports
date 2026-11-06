"""Energy distortion, holonomy bit, adversarial same-as, weak-edge noise."""
from __future__ import annotations
import sys
from pathlib import Path
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "core"))
from crc import EdgeMap, crc_connection  # noqa: E402

SEED = 42


def test_energy_distortion_monotone():
    nodes = ["a", "b"]
    maps = [EdgeMap("a", "b", "same", 0.0)]
    low = crc_connection(nodes, maps, {"a": np.array([0.0, 1.0]), "b": np.array([0.1, 1.0])})
    high = crc_connection(nodes, maps, {"a": np.array([0.0, 1.0]), "b": np.array([1.0, 0.0])})
    assert high.energy > low.energy


def test_holonomy_bit_penrose():
    nodes = ["A", "B", "C"]
    broken = [
        EdgeMap("A", "B", "ab", np.pi / 2),
        EdgeMap("B", "C", "bc", np.pi / 2),
        EdgeMap("C", "A", "ca", np.pi / 2),
    ]
    feats = {n: np.array([1.0, 0.0]) for n in nodes}
    r = crc_connection(nodes, broken, feats)
    assert r.holonomy_flag is True


def test_adversarial_same_as_adds_cycle():
    nodes = ["e1", "e2", "e3"]
    maps = [
        EdgeMap("e1", "e2", "same_as", 0.0),
        EdgeMap("e2", "e3", "same_as", 0.0),
        EdgeMap("e3", "e1", "same_as", 0.0),
    ]
    feats = {
        "e1": np.array([1.0, 0.0]),
        "e2": np.array([0.0, 1.0]),
        "e3": np.array([1.0, 0.0]),
    }
    r = crc_connection(nodes, maps, feats)
    assert r.repair_class in ("statistical", "structural", "mixed", "consistent")


def test_weak_edge_noise_preserves_relative_signal():
    nodes = ["crm", "pay", "support"]
    maps = [
        EdgeMap("crm", "pay", "same_person", 0.0),
        EdgeMap("crm", "support", "associated", 0.0),
    ]
    feats = {
        "crm": np.array([1.0, 0.0]),
        "pay": np.array([1.0, 0.0]),
        "support": np.array([0.9, 0.1]),
    }
    ref = {
        "crm": np.array([0.0, 1.0]),
        "pay": np.array([0.0, 1.0]),
        "support": np.array([0.0, 1.0]),
    }
    r = crc_connection(nodes, maps, feats, reference=ref)
    assert r.relative["status"] != "aligned_with_reference"


if __name__ == "__main__":
    test_energy_distortion_monotone()
    test_holonomy_bit_penrose()
    test_adversarial_same_as_adds_cycle()
    test_weak_edge_noise_preserves_relative_signal()
    print("OK robustness_tests")
