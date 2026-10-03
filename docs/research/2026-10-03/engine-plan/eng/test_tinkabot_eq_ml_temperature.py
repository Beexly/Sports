"""Offline identity tests for tinkabot_eq_ml_temperature. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_ml_temperature as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("temperature_scale",))
        self.assertTrue(callable(m.temperature_scale))

    def test_no_sports_copies(self):
        for name in (
            "epa_success",
            "red_zone",
            "two_minute",
            "under_center_diff",
            "metropolis_acceptance",
            "sigmoid",
            "logit",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestTemperatureScale(unittest.TestCase):
    def test_identity_at_unit_temperature(self):
        self.assertEqual(m.temperature_scale(1.5, 1.0), 1.5)
        self.assertEqual(m.temperature_scale(-2.0, 1.0), -2.0)

    def test_scale(self):
        self.assertEqual(m.temperature_scale(2.0, 2.0), 1.0)
        self.assertEqual(m.temperature_scale(3.0, 0.5), 6.0)

    def test_nulls(self):
        self.assertIsNone(m.temperature_scale(None, 1.0))
        self.assertIsNone(m.temperature_scale(1.0, None))
        self.assertIsNone(m.temperature_scale(1.0, 0.0))
        self.assertIsNone(m.temperature_scale(1.0, -1.0))


if __name__ == "__main__":
    unittest.main()
