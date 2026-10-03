"""Offline identity tests for tinkabot_eq_physics_beer_lambert. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_physics_beer_lambert as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("beer_lambert",))
        self.assertTrue(callable(m.beer_lambert))

    def test_no_forbidden_copies(self):
        for name in (
            "hookes_law",
            "softplus",
            "gaussian_pdf",
            "jaccard_index",
            "dice_coefficient",
            "huber_loss",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestBeerLambert(unittest.TestCase):
    def test_stated_form(self):
        self.assertEqual(m.beer_lambert(2.0, 3.0, 4.0), 24.0)
        self.assertEqual(m.beer_lambert(1.0, 1.0, 0.0), 0.0)

    def test_null_missing(self):
        self.assertIsNone(m.beer_lambert(None, 1.0, 1.0))
        self.assertIsNone(m.beer_lambert(1.0, None, 1.0))
        self.assertIsNone(m.beer_lambert(1.0, 1.0, None))

    def test_null_bad_params(self):
        self.assertIsNone(m.beer_lambert(0.0, 1.0, 1.0))
        self.assertIsNone(m.beer_lambert(-1.0, 1.0, 1.0))
        self.assertIsNone(m.beer_lambert(1.0, 0.0, 1.0))
        self.assertIsNone(m.beer_lambert(1.0, -1.0, 1.0))
        self.assertIsNone(m.beer_lambert(1.0, 1.0, -0.5))


if __name__ == "__main__":
    unittest.main()
