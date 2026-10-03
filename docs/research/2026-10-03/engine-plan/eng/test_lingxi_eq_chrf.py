"""Kill test for lingxi_eq_chrf.

Fails if β² is dropped, the ratio is inverted, or β=1 does not
reduce to the ordinary harmonic mean 2PR/(P+R).
"""
from __future__ import annotations

import unittest

import lingxi_eq_chrf as m


class TestChrf(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("chrf",))

    def test_beta_one_is_harmonic_mean(self) -> None:
        got = m.chrf(0.8, 0.4, 1.0)
        self.assertAlmostEqual(got, (2.0 * 0.8 * 0.4) / (0.8 + 0.4))
        self.assertNotAlmostEqual(got, (0.8 + 0.4) / 2.0)
        self.assertNotAlmostEqual(got, 0.4 / 0.8)

    def test_beta_three_weights_recall(self) -> None:
        # CHR F3 from the paper uses β=3
        got = m.chrf(0.8, 0.4, 3.0)
        expected = ((1.0 + 9.0) * 0.8 * 0.4) / (9.0 * 0.8 + 0.4)
        self.assertAlmostEqual(got, expected)
        self.assertNotAlmostEqual(got, m.chrf(0.8, 0.4, 1.0))

    def test_perfect_and_zero(self) -> None:
        self.assertEqual(m.chrf(1.0, 1.0, 1.0), 1.0)
        self.assertEqual(m.chrf(0.0, 1.0, 1.0), 0.0)

    def test_nulls(self) -> None:
        self.assertIsNone(m.chrf(None, 0.5, 1.0))
        self.assertIsNone(m.chrf(0.5, None, 1.0))
        self.assertIsNone(m.chrf(0.5, 0.5, None))
        self.assertIsNone(m.chrf(-0.1, 0.5, 1.0))
        self.assertIsNone(m.chrf(0.5, 1.1, 1.0))
        self.assertIsNone(m.chrf(0.0, 0.0, 1.0))
        self.assertIsNone(m.chrf(0.5, 0.5, float("nan")))


if __name__ == "__main__":
    unittest.main()