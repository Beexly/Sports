"""Kill test for lingxi_eq_softsign.

Fails if tanh, if logistic sigmoid, or if x/(1+x²).
"""
from __future__ import annotations

import math
import unittest

import lingxi_eq_softsign as m


class TestSoftsign(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("softsign",))

    def test_printed(self) -> None:
        self.assertAlmostEqual(m.softsign(0.0), 0.0)
        self.assertAlmostEqual(m.softsign(1.0), 0.5)
        self.assertAlmostEqual(m.softsign(-2.0), -2.0 / 3.0)
        # not tanh(1)≈0.761; not σ(1)≈0.731; not 1/(1+1)=0.5 wait softsign(1)=0.5
        # use x=2: softsign=2/3; tanh≈0.964; σ≈0.881; 2/(1+4)=0.4
        got = m.softsign(2.0)
        self.assertAlmostEqual(got, 2.0 / 3.0)
        self.assertNotAlmostEqual(got, math.tanh(2.0))
        self.assertNotAlmostEqual(got, 1.0 / (1.0 + math.exp(-2.0)))
        self.assertNotAlmostEqual(got, 2.0 / (1.0 + 4.0))

    def test_vector(self) -> None:
        self.assertEqual(m.softsign([0.0, 1.0, -1.0]), [0.0, 0.5, -0.5])

    def test_large(self) -> None:
        self.assertAlmostEqual(m.softsign(1e6), 1e6 / (1.0 + 1e6))
        self.assertAlmostEqual(m.softsign(-1e6), -1e6 / (1.0 + 1e6))

    def test_nulls(self) -> None:
        self.assertIsNone(m.softsign(None))
        self.assertIsNone(m.softsign(float("nan")))
        self.assertIsNone(m.softsign([1.0, None]))


if __name__ == "__main__":
    unittest.main()