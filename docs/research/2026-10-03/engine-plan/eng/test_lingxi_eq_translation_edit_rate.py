"""Kill test for lingxi_eq_translation_edit_rate.

Fails if the ratio is inverted, the paper example 4/13 is missed,
or a zero-edit hypothesis scores as 1.
"""
from __future__ import annotations

import unittest

import lingxi_eq_translation_edit_rate as m


class TestTranslationEditRate(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("translation_edit_rate",))

    def test_paper_example_four_over_thirteen(self) -> None:
        # PDF p.3: 4 edits / 13 reference words => 31%
        got = m.translation_edit_rate(4.0, 13.0)
        self.assertAlmostEqual(got, 4.0 / 13.0)
        self.assertNotEqual(got, 13.0 / 4.0)
        self.assertNotEqual(got, 1.0 - 4.0 / 13.0)

    def test_zero_edits_is_zero(self) -> None:
        self.assertEqual(m.translation_edit_rate(0.0, 10.0), 0.0)
        self.assertNotEqual(m.translation_edit_rate(0.0, 10.0), 1.0)

    def test_nulls(self) -> None:
        self.assertIsNone(m.translation_edit_rate(None, 13.0))
        self.assertIsNone(m.translation_edit_rate(4.0, None))
        self.assertIsNone(m.translation_edit_rate(4.0, 0.0))
        self.assertIsNone(m.translation_edit_rate(4.0, -1.0))
        self.assertIsNone(m.translation_edit_rate(-1.0, 13.0))
        self.assertIsNone(m.translation_edit_rate(float("nan"), 13.0))


if __name__ == "__main__":
    unittest.main()