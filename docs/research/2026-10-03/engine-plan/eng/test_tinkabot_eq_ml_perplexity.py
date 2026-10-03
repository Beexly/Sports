"""Tests for perplexity (LM form)."""
from __future__ import annotations

import math
import unittest

from tinkabot_eq_ml_perplexity import COLUMN_BACKED_FUNCS, IDENTITY, perplexity


class TestPerplexity(unittest.TestCase):
    def test_identity_and_column(self) -> None:
        self.assertEqual(IDENTITY, "tinkabot")
        self.assertIn("perplexity", COLUMN_BACKED_FUNCS)

    def test_certain(self) -> None:
        self.assertAlmostEqual(perplexity([1.0, 1.0, 1.0]), 1.0)

    def test_half(self) -> None:
        self.assertAlmostEqual(perplexity([0.5, 0.5]), 2.0)

    def test_basic(self) -> None:
        # −avg log = −(ln 0.25 + ln 0.5)/2 → exp of that
        expected = math.exp(-(math.log(0.25) + math.log(0.5)) / 2.0)
        self.assertAlmostEqual(perplexity([0.25, 0.5]), expected, places=12)

    def test_null_guards(self) -> None:
        self.assertIsNone(perplexity(None))
        self.assertIsNone(perplexity([]))
        self.assertIsNone(perplexity([0.0, 0.5]))
        self.assertIsNone(perplexity([1.1]))
        self.assertIsNone(perplexity([0.5, float("nan")]))


if __name__ == "__main__":
    unittest.main()
