"""Offline unit tests for tinkabot_eq_column. No score, no mint, no parquet."""
from __future__ import annotations

import unittest

import tinkabot_eq_column as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_kept_funcs_exported(self):
        self.assertEqual(
            tuple(m.COLUMN_BACKED_FUNCS),
            ("home_minus_away", "under_center_rate", "proe_or_null"),
        )
        for name in m.COLUMN_BACKED_FUNCS:
            self.assertTrue(callable(getattr(m, name)), name)

    def test_hold_deleted_absent(self):
        for name in m.HOLD_DELETED:
            self.assertFalse(hasattr(m, name), f"HOLD delete still present: {name}")
        for name in ("under_center_diff", "market_elo_residual"):
            self.assertIn(name, m.HOLD_DELETED)
            self.assertFalse(hasattr(m, name))

    def test_proe_floor_cited_from_corpus(self):
        self.assertEqual(m.PROE_N_PLAYS_FLOOR, 25)
        doc = m.proe_or_null.__doc__ or ""
        self.assertIn("learn_wide_coverage.json", doc)
        self.assertIn("n_plays < 25", doc)


class TestPrimitives(unittest.TestCase):
    def test_home_minus_away(self):
        self.assertIsNone(m.home_minus_away(None, 1.0))
        self.assertIsNone(m.home_minus_away(1.0, None))
        self.assertEqual(m.home_minus_away(2.0, 0.5), 1.5)

    def test_under_center_rate(self):
        self.assertEqual(m.under_center_rate(0.6), 0.4)
        self.assertIsNone(m.under_center_rate(None))

    def test_proe_or_null_floor(self):
        self.assertIsNone(m.proe_or_null(0.05, 24.0))
        self.assertEqual(m.proe_or_null(0.05, 25.0), 0.05)
        self.assertIsNone(m.proe_or_null(None, 30.0))


if __name__ == "__main__":
    unittest.main()
