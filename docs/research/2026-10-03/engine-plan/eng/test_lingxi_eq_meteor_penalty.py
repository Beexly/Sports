"""Kill test for lingxi_eq_meteor_penalty.

Fails if the 0.5 scale is dropped, the exponent is not 3, or the
ratio is inverted.
"""
from __future__ import annotations

import unittest

import lingxi_eq_meteor_penalty as m


class TestMeteorPenalty(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("meteor_penalty",))

    def test_printed_scale_and_cube(self) -> None:
        # paper example shape: 2 chunks, 6 matched unigrams
        got = m.meteor_penalty(2.0, 6.0)
        self.assertAlmostEqual(got, 0.5 * ((2.0 / 6.0) ** 3))
        self.assertNotAlmostEqual(got, ((2.0 / 6.0) ** 3))  # missing 0.5
        self.assertNotAlmostEqual(got, 0.5 * ((2.0 / 6.0) ** 2))
        self.assertNotAlmostEqual(got, 0.5 * ((6.0 / 2.0) ** 3))

    def test_single_chunk_lower_bound_shape(self) -> None:
        got = m.meteor_penalty(1.0, 5.0)
        self.assertAlmostEqual(got, 0.5 * ((1.0 / 5.0) ** 3))
        self.assertLess(got, 0.5)

    def test_max_fragmentation_half(self) -> None:
        # as many chunks as matches => penalty = 0.5
        self.assertEqual(m.meteor_penalty(4.0, 4.0), 0.5)

    def test_nulls(self) -> None:
        self.assertIsNone(m.meteor_penalty(None, 6.0))
        self.assertIsNone(m.meteor_penalty(2.0, None))
        self.assertIsNone(m.meteor_penalty(0.0, 6.0))
        self.assertIsNone(m.meteor_penalty(2.0, 0.0))
        self.assertIsNone(m.meteor_penalty(7.0, 6.0))
        self.assertIsNone(m.meteor_penalty(float("nan"), 6.0))


if __name__ == "__main__":
    unittest.main()