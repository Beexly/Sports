"""Kill test for lingxi_eq_bertscore_p.

Fails if the mean is replaced by a sum, a product, a max, or a
harmonic mean of the token max-similarities.
"""
from __future__ import annotations

import math
import unittest

import lingxi_eq_bertscore_p as m


class TestBertscoreP(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("bertscore_p",))

    def test_mean_of_max_sims(self) -> None:
        sims = (0.8, 0.4, 1.0)
        got = m.bertscore_p(sims)
        self.assertAlmostEqual(got, (0.8 + 0.4 + 1.0) / 3.0)
        self.assertNotAlmostEqual(got, 0.8 + 0.4 + 1.0)
        self.assertNotAlmostEqual(got, 0.8 * 0.4 * 1.0)
        self.assertNotAlmostEqual(got, max(sims))
        harm = 3.0 / (1.0 / 0.8 + 1.0 / 0.4 + 1.0 / 1.0)
        self.assertNotAlmostEqual(got, harm)

    def test_perfect(self) -> None:
        self.assertEqual(m.bertscore_p((1.0, 1.0)), 1.0)

    def test_single(self) -> None:
        self.assertAlmostEqual(m.bertscore_p((0.55,)), 0.55)

    def test_nulls(self) -> None:
        self.assertIsNone(m.bertscore_p(None))
        self.assertIsNone(m.bertscore_p(()))
        self.assertIsNone(m.bertscore_p((0.5, None)))  # type: ignore[arg-type]
        self.assertIsNone(m.bertscore_p((1.1, 0.5)))
        self.assertIsNone(m.bertscore_p((0.5, float("nan"))))
        self.assertIsNone(m.bertscore_p((-1.1,)))


if __name__ == "__main__":
    unittest.main()
