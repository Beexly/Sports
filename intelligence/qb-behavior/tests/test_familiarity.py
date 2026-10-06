# PROVENANCE: tests for qb_behavior/familiarity.py — implements
# corpus-intelligence/deep/c01/buildable-systems.md #28 (QB familiarity =
# share of last 16 starts by the listed starter; backup-QB flag).
"""Tests: familiarity is trailing-only, counts starts, flags instability."""
from __future__ import annotations

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from qb_behavior.familiarity import BACKUP_THRESHOLD, familiarity


def _s(team, season, week, qb):
    return {"team": team, "season": season, "week": week, "starter_qb_id": qb}


def _starts(qb_starts: dict[int, str], team="T", season=2024):
    # qb_starts: {week: qb_id}
    return [_s(team, season, w, q) for w, q in sorted(qb_starts.items())]


class TestFamiliarity(unittest.TestCase):
    def test_full_stability(self):
        rows = _starts({w: "qb1" for w in range(1, 17)})
        f = familiarity("T", 2024, 17, "qb1", rows)
        self.assertEqual(f.familiarity, 1.0)
        self.assertEqual(f.n_starts, 16)
        self.assertFalse(f.backup_flag)

    def test_counts_only_listed_starter(self):
        rows = _starts({**{w: "qb1" for w in range(1, 13)},
                        **{w: "qb2" for w in range(13, 17)}})
        f = familiarity("T", 2024, 17, "qb2", rows)
        self.assertAlmostEqual(f.familiarity, 4 / 16)
        self.assertTrue(f.backup_flag)  # 0.25 < 0.5

    def test_current_week_excluded(self):
        rows = _starts({w: "qb1" for w in range(1, 17)})
        rows.append(_s("T", 2024, 17, "qb2"))  # week-17 change not yet in window
        f = familiarity("T", 2024, 17, "qb1", rows)
        self.assertEqual(f.familiarity, 1.0)  # week 17 itself excluded

    def test_window_is_sixteen(self):
        rows = _starts({w: "qb1" for w in range(1, 25)})
        f = familiarity("T", 2024, 25, "qb1", rows)
        self.assertEqual(f.n_starts, 16)  # capped at the window

    def test_no_history_returns_none(self):
        self.assertIsNone(familiarity("T", 2024, 1, "qb1", []))

    def test_none_qb_uses_latest_starter(self):
        rows = _starts({**{w: "qb1" for w in range(1, 15)},
                        **{w: "qb2" for w in range(15, 17)}})
        f = familiarity("T", 2024, 17, None, rows)
        self.assertEqual(f.qb_id, "qb2")
        self.assertAlmostEqual(f.familiarity, 2 / 16)

    def test_short_history_is_provisional(self):
        rows = _starts({w: "qb1" for w in range(1, 5)})
        f = familiarity("T", 2024, 5, "qb1", rows)
        self.assertEqual(f.familiarity, 1.0)
        self.assertIsNone(f.backup_flag)  # not enough history to call it
        self.assertIsNotNone(f.gap_note)

    def test_backup_threshold_boundary(self):
        rows = _starts({**{w: "qb1" for w in range(1, 9)},
                        **{w: "qb2" for w in range(9, 17)}})
        f = familiarity("T", 2024, 17, "qb1", rows)
        self.assertAlmostEqual(f.familiarity, 0.5)
        self.assertFalse(f.backup_flag)  # 0.5 is not < 0.5


if __name__ == "__main__":
    unittest.main()
