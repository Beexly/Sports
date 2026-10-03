"""Offline identity tests for tinkabot_eq_physics_snell. No score. No mint."""
from __future__ import annotations

import math
import unittest

import tinkabot_eq_physics_snell as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("snells_law_n2",))
        self.assertTrue(callable(m.snells_law_n2))

    def test_no_forbidden_copies(self):
        for name in (
            "kinetic_energy",
            "ohms_law",
            "logistic_sigmoid",
            "beer_lambert",
            "relu",
            "hookes_law",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestSnell(unittest.TestCase):
    def test_stated_form(self):
        # n1=1, θ1=π/6, θ2=π/4 → sin(π/6)/sin(π/4) = 0.5 / (√2/2) = 1/√2
        want = math.sin(math.pi / 6) / math.sin(math.pi / 4)
        self.assertAlmostEqual(m.snells_law_n2(1.0, math.pi / 6, math.pi / 4), want, places=12)
        # equal angles → n2 = n1
        self.assertAlmostEqual(m.snells_law_n2(1.5, 0.3, 0.3), 1.5, places=12)

    def test_null_missing(self):
        self.assertIsNone(m.snells_law_n2(None, 0.1, 0.2))
        self.assertIsNone(m.snells_law_n2(1.0, None, 0.2))
        self.assertIsNone(m.snells_law_n2(1.0, 0.1, None))

    def test_null_bad(self):
        self.assertIsNone(m.snells_law_n2(0.0, 0.1, 0.2))
        self.assertIsNone(m.snells_law_n2(-1.0, 0.1, 0.2))
        self.assertIsNone(m.snells_law_n2(1.0, 0.1, 0.0))  # sin(0)=0


if __name__ == "__main__":
    unittest.main()
