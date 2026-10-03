"""Kill test for lingxi_eq_nesterov_velocity.

Fails if classical momentum (same formula but would equal when g is at θ)
is confused with a +εg sign flip, or if θ-update θ+v is returned.
"""
from __future__ import annotations

import unittest

import lingxi_eq_nesterov_velocity as m


class TestNesterovVelocity(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("nesterov_velocity",))

    def test_printed_eq3(self) -> None:
        # μ=0.9, v=1, ε=0.1, g=2 → 0.9 − 0.2 = 0.7
        got = m.nesterov_velocity(1.0, 0.9, 0.1, 2.0)
        self.assertAlmostEqual(got, 0.7)
        self.assertNotAlmostEqual(got, 0.9 + 0.2)  # not +εg
        self.assertNotAlmostEqual(got, 1.0 + 0.7)  # not θ + v

    def test_nulls(self) -> None:
        self.assertIsNone(m.nesterov_velocity(None, 0.9, 0.1, 1.0))
        self.assertIsNone(m.nesterov_velocity(1.0, 1.5, 0.1, 1.0))
        self.assertIsNone(m.nesterov_velocity(1.0, 0.9, 0.0, 1.0))
        self.assertIsNone(m.nesterov_velocity(1.0, 0.9, -0.1, 1.0))
        self.assertIsNone(m.nesterov_velocity(1.0, 0.9, 0.1, float("nan")))


if __name__ == "__main__":
    unittest.main()
