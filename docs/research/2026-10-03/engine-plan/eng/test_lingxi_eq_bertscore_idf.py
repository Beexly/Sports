"""Kill test for lingxi_eq_bertscore_idf.

Fails if idf is replaced by df/M, log(df/M) without the sign,
or tf-idf product forms.
"""
from __future__ import annotations

import math
import unittest

import lingxi_eq_bertscore_idf as m


class TestBertscoreIdf(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("bertscore_idf",))

    def test_printed_neglog(self) -> None:
        # df=1, M=10 -> -log(0.1) = log(10)
        got = m.bertscore_idf(1.0, 10.0)
        self.assertAlmostEqual(got, -math.log(1.0 / 10.0))
        self.assertAlmostEqual(got, math.log(10.0))
        self.assertNotAlmostEqual(got, 1.0 / 10.0)
        self.assertNotAlmostEqual(got, math.log(1.0 / 10.0))
        self.assertNotAlmostEqual(got, (1.0 / 10.0) * math.log(10.0))

    def test_ubiquitous_token(self) -> None:
        self.assertAlmostEqual(m.bertscore_idf(5.0, 5.0), 0.0)

    def test_half(self) -> None:
        self.assertAlmostEqual(m.bertscore_idf(2.0, 4.0), -math.log(0.5))

    def test_nulls(self) -> None:
        self.assertIsNone(m.bertscore_idf(None, 10.0))
        self.assertIsNone(m.bertscore_idf(1.0, None))
        self.assertIsNone(m.bertscore_idf(0.0, 10.0))
        self.assertIsNone(m.bertscore_idf(11.0, 10.0))
        self.assertIsNone(m.bertscore_idf(1.0, 0.0))
        self.assertIsNone(m.bertscore_idf(1.0, float("nan")))


if __name__ == "__main__":
    unittest.main()
