"""Offline identity tests for tinkabot_eq_physics_ideal_gas. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_physics_ideal_gas as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("ideal_gas_pressure",))
        self.assertTrue(callable(m.ideal_gas_pressure))

    def test_no_forbidden_copies(self):
        for name in (
            "euclidean_distance",
            "cosine_similarity",
            "tanh",
            "snells_law_n2",
            "kinetic_energy",
            "ohms_law",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestIdealGas(unittest.TestCase):
    def test_stated_form(self):
        # n=1, R=2, T=3, V=4 → P=6/4=1.5
        self.assertEqual(m.ideal_gas_pressure(1.0, 2.0, 3.0, 4.0), 1.5)
        self.assertEqual(m.ideal_gas_pressure(0.0, 8.314, 300.0, 1.0), 0.0)

    def test_null_missing(self):
        self.assertIsNone(m.ideal_gas_pressure(None, 1.0, 1.0, 1.0))
        self.assertIsNone(m.ideal_gas_pressure(1.0, None, 1.0, 1.0))
        self.assertIsNone(m.ideal_gas_pressure(1.0, 1.0, None, 1.0))
        self.assertIsNone(m.ideal_gas_pressure(1.0, 1.0, 1.0, None))

    def test_null_bad(self):
        self.assertIsNone(m.ideal_gas_pressure(-1.0, 1.0, 1.0, 1.0))
        self.assertIsNone(m.ideal_gas_pressure(1.0, 0.0, 1.0, 1.0))
        self.assertIsNone(m.ideal_gas_pressure(1.0, 1.0, 0.0, 1.0))
        self.assertIsNone(m.ideal_gas_pressure(1.0, 1.0, 1.0, 0.0))
        self.assertIsNone(m.ideal_gas_pressure(1.0, -1.0, 1.0, 1.0))


if __name__ == "__main__":
    unittest.main()
