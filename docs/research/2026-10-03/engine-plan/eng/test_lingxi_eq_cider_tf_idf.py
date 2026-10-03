"""Kill test for lingxi_eq_cider_tf_idf.

Fails if TF and IDF are swapped, the ratio is inverted, or
log is dropped (plain TF · |I|/df).
"""
from __future__ import annotations

import math
import unittest

import lingxi_eq_cider_tf_idf as m


class TestCiderTfIdf(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("cider_tf_idf",))

    def test_printed_identity(self) -> None:
        # h=2, Σh=4 → TF=0.5; |I|=100, df=10 → IDF=log(10)
        got = m.cider_tf_idf(2.0, 4.0, 100.0, 10.0)
        expected = 0.5 * math.log(10.0)
        self.assertAlmostEqual(got, expected)
        self.assertNotAlmostEqual(got, 0.5 * (100.0 / 10.0))  # no bare ratio
        self.assertNotAlmostEqual(got, math.log(10.0) / 0.5)  # not inverted

    def test_rare_ngram_higher_than_common(self) -> None:
        rare = m.cider_tf_idf(1.0, 1.0, 1000.0, 1.0)
        common = m.cider_tf_idf(1.0, 1.0, 1000.0, 500.0)
        self.assertGreater(rare, common)

    def test_ubiquitous_zero_idf(self) -> None:
        got = m.cider_tf_idf(1.0, 5.0, 50.0, 50.0)
        self.assertAlmostEqual(got, 0.0)

    def test_nulls(self) -> None:
        self.assertIsNone(m.cider_tf_idf(None, 4.0, 100.0, 10.0))
        self.assertIsNone(m.cider_tf_idf(2.0, None, 100.0, 10.0))
        self.assertIsNone(m.cider_tf_idf(2.0, 4.0, None, 10.0))
        self.assertIsNone(m.cider_tf_idf(2.0, 4.0, 100.0, None))
        self.assertIsNone(m.cider_tf_idf(5.0, 4.0, 100.0, 10.0))  # h>Σh
        self.assertIsNone(m.cider_tf_idf(1.0, 1.0, 10.0, 0.0))
        self.assertIsNone(m.cider_tf_idf(1.0, 1.0, 10.0, 11.0))


if __name__ == "__main__":
    unittest.main()