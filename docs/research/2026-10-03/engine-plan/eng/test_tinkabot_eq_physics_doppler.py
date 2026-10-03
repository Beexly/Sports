"""Offline identity tests for tinkabot_eq_physics_doppler. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_physics_doppler as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(
            tuple(m.COLUMN_BACKED_FUNCS),
            ("doppler_frequency_stationary_observer",),
        )
        self.assertTrue(callable(m.doppler_frequency_stationary_observer))

    def test_no_forbidden_copies(self):
        for name in (
            "gravitational_potential_energy",
            "root_mean_squared_error",
            "mean_squared_error",
            "group_norm",
            "wave_speed",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestDoppler(unittest.TestCase):
    def test_stated_form(self):
        # f_s=440, v=340, v_s=20 → 440 * 340/320 = 467.5
        self.assertAlmostEqual(
            m.doppler_frequency_stationary_observer(440.0, 340.0, 20.0), 467.5
        )

    def test_null_missing(self):
        self.assertIsNone(m.doppler_frequency_stationary_observer(None, 340.0, 0.0))
        self.assertIsNone(m.doppler_frequency_stationary_observer(440.0, None, 0.0))
        self.assertIsNone(m.doppler_frequency_stationary_observer(440.0, 340.0, None))

    def test_null_bad(self):
        self.assertIsNone(m.doppler_frequency_stationary_observer(440.0, 0.0, 10.0))
        self.assertIsNone(m.doppler_frequency_stationary_observer(440.0, 340.0, 340.0))


if __name__ == "__main__":
    unittest.main()
