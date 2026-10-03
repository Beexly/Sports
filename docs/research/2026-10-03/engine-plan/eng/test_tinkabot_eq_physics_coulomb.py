"""Offline identity tests for tinkabot_eq_physics_coulomb. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_physics_coulomb as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("coulomb_force",))
        self.assertTrue(callable(m.coulomb_force))

    def test_no_forbidden_copies(self):
        for name in (
            "ideal_gas_pressure",
            "euclidean_distance",
            "cosine_similarity",
            "ohms_law",
            "kinetic_energy",
            "snells_law_n2",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestCoulomb(unittest.TestCase):
    def test_stated_form(self):
        # k=9, q1=2, q2=3, r=3 → F = 9*6/9 = 6
        self.assertEqual(m.coulomb_force(9.0, 2.0, 3.0, 3.0), 6.0)
        # opposite signs: |product| same
        self.assertEqual(m.coulomb_force(9.0, -2.0, 3.0, 3.0), 6.0)

    def test_null_missing(self):
        self.assertIsNone(m.coulomb_force(None, 1.0, 1.0, 1.0))
        self.assertIsNone(m.coulomb_force(1.0, None, 1.0, 1.0))
        self.assertIsNone(m.coulomb_force(1.0, 1.0, None, 1.0))
        self.assertIsNone(m.coulomb_force(1.0, 1.0, 1.0, None))

    def test_null_bad(self):
        self.assertIsNone(m.coulomb_force(0.0, 1.0, 1.0, 1.0))
        self.assertIsNone(m.coulomb_force(-1.0, 1.0, 1.0, 1.0))
        self.assertIsNone(m.coulomb_force(1.0, 1.0, 1.0, 0.0))
        self.assertIsNone(m.coulomb_force(1.0, 1.0, 1.0, -1.0))


if __name__ == "__main__":
    unittest.main()
