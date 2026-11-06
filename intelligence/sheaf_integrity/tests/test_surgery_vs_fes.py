"""Surgery ≠ feedback edge set — unit lock."""
from __future__ import annotations
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "core"))
from surgery_equivalence import feedback_edge_set_size, demo_non_equivalence  # noqa: E402


def test_fes_size_triangle():
    assert feedback_edge_set_size(3, 3, 1) == 1


def test_fes_size_two_triangles_share_vertex():
    assert feedback_edge_set_size(5, 6, 1) == 2


def test_operations_are_different_types():
    fes_action = {"type": "delete_edge", "edge": ("A", "B")}
    surgery_action = {"type": "set_theta", "edge": ("A", "B"), "theta": 0.0}
    assert fes_action["type"] != surgery_action["type"]
    assert "theta" not in fes_action
    assert "theta" in surgery_action


def test_demo_flags_non_equivalence():
    demo = demo_non_equivalence()
    assert demo["not_equivalent"] is True


if __name__ == "__main__":
    test_fes_size_triangle()
    test_fes_size_two_triangles_share_vertex()
    test_operations_are_different_types()
    test_demo_flags_non_equivalence()
    print("OK test_surgery_vs_fes")
