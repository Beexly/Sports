"""Offline identity tests for tinkabot_eq_physics_photon_energy. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_physics_photon_energy as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("photon_energy",))
        self.assertTrue(callable(m.photon_energy))

    def test_no_forbidden_copies(self):
        for name in (
            "coulomb_force",
            "ideal_gas_pressure",
            "euclidean_distance",
            "kinetic_energy",
            "ohms_law",
            "snells_law_n2",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestPhotonEnergy(unittest.TestCase):
    def test_stated_form(self):
        # h=2, f=3 → E=6
        self.assertEqual(m.photon_energy(2.0, 3.0), 6.0)
        self.assertEqual(m.photon_energy(6.626e-34, 1.0e14), 6.626e-20)

    def test_null_missing(self):
        self.assertIsNone(m.photon_energy(None, 1.0))
        self.assertIsNone(m.photon_energy(1.0, None))

    def test_null_bad(self):
        self.assertIsNone(m.photon_energy(0.0, 1.0))
        self.assertIsNone(m.photon_energy(-1.0, 1.0))
        self.assertIsNone(m.photon_energy(1.0, 0.0))
        self.assertIsNone(m.photon_energy(1.0, -1.0))


if __name__ == "__main__":
    unittest.main()
