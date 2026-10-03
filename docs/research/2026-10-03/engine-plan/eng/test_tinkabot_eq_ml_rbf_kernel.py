"""Offline identity tests for tinkabot_eq_ml_rbf_kernel. No score. No mint."""
from __future__ import annotations

import math
import unittest

import tinkabot_eq_ml_rbf_kernel as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("rbf_kernel",))
        self.assertTrue(callable(m.rbf_kernel))

    def test_no_forbidden_copies(self):
        for name in (
            "prelu",
            "leaky_relu",
            "hinge_loss",
            "minkowski_distance",
            "manhattan_distance",
            "chebyshev_distance",
            "euclidean_distance",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestRbf(unittest.TestCase):
    def test_stated_form(self):
        # identical → exp(0)=1
        self.assertEqual(m.rbf_kernel([1.0, 2.0], [1.0, 2.0], 1.0), 1.0)
        # ‖Δ‖²=1, σ=1 → exp(-1/2)
        self.assertAlmostEqual(
            m.rbf_kernel([0.0], [1.0], 1.0),
            math.exp(-0.5),
        )
        # ‖Δ‖²=4, σ=2 → exp(-4/(2*4))=exp(-0.5)
        self.assertAlmostEqual(
            m.rbf_kernel([0.0, 0.0], [0.0, 2.0], 2.0),
            math.exp(-0.5),
        )

    def test_null_missing(self):
        self.assertIsNone(m.rbf_kernel(None, [1.0], 1.0))
        self.assertIsNone(m.rbf_kernel([1.0], None, 1.0))
        self.assertIsNone(m.rbf_kernel([1.0], [0.0], None))

    def test_null_bad(self):
        self.assertIsNone(m.rbf_kernel([], [], 1.0))
        self.assertIsNone(m.rbf_kernel([1.0], [1.0, 2.0], 1.0))
        self.assertIsNone(m.rbf_kernel([1.0], [0.0], 0.0))
        self.assertIsNone(m.rbf_kernel([1.0], [0.0], -1.0))


if __name__ == "__main__":
    unittest.main()
