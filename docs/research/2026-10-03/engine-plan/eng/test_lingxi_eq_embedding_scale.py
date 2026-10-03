"""Kill test for lingxi_eq_embedding_scale.

Fails if √d_model is dropped, if 1/√d_model (attention scale) is used,
or if d_model^{-0.5} lrate factor is returned alone.
"""
from __future__ import annotations

import math
import unittest

import lingxi_eq_embedding_scale as m


class TestEmbeddingScale(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("embedding_scale",))

    def test_printed_multiply_sqrt(self) -> None:
        got = m.embedding_scale(2.0, 512.0)
        self.assertAlmostEqual(got, 2.0 * math.sqrt(512.0))
        # Kill: no scale
        self.assertNotAlmostEqual(got, 2.0)
        # Kill: attention scale 1/√d_k style
        self.assertNotAlmostEqual(got, 2.0 / math.sqrt(512.0))
        # Kill: bare √d_model
        self.assertNotAlmostEqual(got, math.sqrt(512.0))
        # Kill: d_model^{-0.5} (lrate factor)
        self.assertNotAlmostEqual(got, 512.0**-0.5)

    def test_nulls(self) -> None:
        self.assertIsNone(m.embedding_scale(None, 512.0))
        self.assertIsNone(m.embedding_scale(1.0, None))
        self.assertIsNone(m.embedding_scale(1.0, 0.0))
        self.assertIsNone(m.embedding_scale(1.0, -4.0))
        self.assertIsNone(m.embedding_scale(1.0, float("nan")))


if __name__ == "__main__":
    unittest.main()