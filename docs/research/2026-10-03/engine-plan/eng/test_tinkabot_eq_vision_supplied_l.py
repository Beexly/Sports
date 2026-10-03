"""Offline identity tests for tinkabot_eq_vision_supplied_l. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_vision_supplied_l as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("difference_of_supplied_l",))
        self.assertTrue(callable(m.difference_of_supplied_l))
        self.assertFalse(hasattr(m, "difference_of_gaussians"))

    def test_no_forbidden_copies(self):
        for name in (
            "shannon_entropy",
            "brier_skill",
            "temperature_scale",
            "nosofsky_similarity",
            "epa_success",
            "red_zone",
            "two_minute",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestSuppliedLDiff(unittest.TestCase):
    def test_difference(self):
        self.assertEqual(m.difference_of_supplied_l(5.0, 3.0, 1.6, 1.0), 2.0)
        self.assertEqual(m.difference_of_supplied_l(1.0, 1.0, 2.0, 0.5), 0.0)

    def test_null_missing_l(self):
        self.assertIsNone(m.difference_of_supplied_l(None, 3.0, 1.6, 1.0))
        self.assertIsNone(m.difference_of_supplied_l(5.0, None, 1.6, 1.0))

    def test_null_bad_scales(self):
        self.assertIsNone(m.difference_of_supplied_l(5.0, 3.0, None, 1.0))
        self.assertIsNone(m.difference_of_supplied_l(5.0, 3.0, 1.6, None))
        self.assertIsNone(m.difference_of_supplied_l(5.0, 3.0, 0.0, 1.0))
        self.assertIsNone(m.difference_of_supplied_l(5.0, 3.0, 1.6, -1.0))
        self.assertIsNone(m.difference_of_supplied_l(5.0, 3.0, -0.5, 1.0))


if __name__ == "__main__":
    unittest.main()
