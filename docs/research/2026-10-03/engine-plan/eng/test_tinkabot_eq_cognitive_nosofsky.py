"""Offline identity tests for tinkabot_eq_cognitive_nosofsky. No score. No mint."""
from __future__ import annotations

import math
import unittest

import tinkabot_eq_cognitive_nosofsky as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("nosofsky_similarity",))
        self.assertTrue(callable(m.nosofsky_similarity))

    def test_no_forbidden_copies(self):
        for name in (
            "difference_of_gaussians",
            "shannon_entropy",
            "brier_skill",
            "temperature_scale",
            "epa_success",
            "red_zone",
            "two_minute",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestNosofsky(unittest.TestCase):
    def test_identical_points(self):
        self.assertEqual(
            m.nosofsky_similarity(1.0, 1.0, 2.0, 2.0, 1.0, 0.5, 2.0),
            1.0,
        )

    def test_stated_form_r2(self):
        # w1=0.5, r=2, c=1; dx=(3,4) → weighted=0.5*9+0.5*16=12.5
        # dist=sqrt(12.5); eta=exp(-sqrt(12.5))
        got = m.nosofsky_similarity(0.0, 3.0, 0.0, 4.0, 1.0, 0.5, 2.0)
        want = math.exp(-math.sqrt(12.5))
        self.assertAlmostEqual(got, want, places=12)

    def test_city_block_w1_one(self):
        # w1=1 → only dim1; r=1,c=2 → eta=exp(-2*|5|)
        got = m.nosofsky_similarity(0.0, 5.0, 99.0, 0.0, 2.0, 1.0, 1.0)
        self.assertAlmostEqual(got, math.exp(-10.0), places=12)

    def test_null_missing_coord(self):
        self.assertIsNone(m.nosofsky_similarity(None, 0.0, 0.0, 0.0, 1.0, 0.5, 2.0))
        self.assertIsNone(m.nosofsky_similarity(0.0, None, 0.0, 0.0, 1.0, 0.5, 2.0))
        self.assertIsNone(m.nosofsky_similarity(0.0, 0.0, None, 0.0, 1.0, 0.5, 2.0))
        self.assertIsNone(m.nosofsky_similarity(0.0, 0.0, 0.0, None, 1.0, 0.5, 2.0))

    def test_null_bad_params(self):
        self.assertIsNone(m.nosofsky_similarity(0.0, 1.0, 0.0, 1.0, None, 0.5, 2.0))
        self.assertIsNone(m.nosofsky_similarity(0.0, 1.0, 0.0, 1.0, -0.1, 0.5, 2.0))
        self.assertIsNone(m.nosofsky_similarity(0.0, 1.0, 0.0, 1.0, 1.0, None, 2.0))
        self.assertIsNone(m.nosofsky_similarity(0.0, 1.0, 0.0, 1.0, 1.0, -0.01, 2.0))
        self.assertIsNone(m.nosofsky_similarity(0.0, 1.0, 0.0, 1.0, 1.0, 1.01, 2.0))
        self.assertIsNone(m.nosofsky_similarity(0.0, 1.0, 0.0, 1.0, 1.0, 0.5, None))
        self.assertIsNone(m.nosofsky_similarity(0.0, 1.0, 0.0, 1.0, 1.0, 0.5, 0.0))
        self.assertIsNone(m.nosofsky_similarity(0.0, 1.0, 0.0, 1.0, 1.0, 0.5, -1.0))


if __name__ == "__main__":
    unittest.main()
