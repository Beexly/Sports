# PROVENANCE: tests for qb_behavior/trust_target.py — implements
# corpus-intelligence/deep/c01/buildable-systems.md #3 (QB trust-target
# profile table with absence conditionals).
"""Tests: trust-target profiles are trailing-only, gated, and conditional."""
from __future__ import annotations

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from qb_behavior.trust_target import (absence_delta, target_profile,
                                      MIN_TARGETS)


def _t(qb, season, week, rc, name, targets):
    return {"qb_id": qb, "season": season, "week": week,
            "receiver_id": rc, "receiver_name": name, "targets": targets}


def _rows():
    # QB1: 4 weeks; A gets 10/wk, B gets 5/wk, C gets 5/wk (wk1-2),
    # then C absent (0 targets) in wk3-4.
    rows = []
    for w in (1, 2):
        rows += [_t("qb1", 2024, w, "A", "Al", 10),
                 _t("qb1", 2024, w, "B", "Bo", 5),
                 _t("qb1", 2024, w, "C", "Cy", 5)]
    for w in (3, 4):
        rows += [_t("qb1", 2024, w, "A", "Al", 10),
                 _t("qb1", 2024, w, "B", "Bo", 5)]
    return rows


class TestTargetProfile(unittest.TestCase):
    def test_shares_sum_and_order(self):
        p = target_profile("qb1", 2024, 5, _rows(), window=4)
        self.assertIsNotNone(p)
        self.assertEqual(p.n_targets, 70)  # 20+20+15+15
        self.assertEqual(p.n_weeks, 4)
        self.assertEqual([s.receiver_id for s in p.shares], ["A", "B", "C"])
        self.assertAlmostEqual(p.shares[0].share, 40 / 70, places=4)
        self.assertAlmostEqual(sum(s.share for s in p.shares), 1.0, places=3)

    def test_current_week_excluded(self):
        rows = _rows() + [_t("qb1", 2024, 5, "Z", "Zed", 100)]
        p = target_profile("qb1", 2024, 5, rows, window=4)
        self.assertNotIn("Z", [s.receiver_id for s in p.shares])

    def test_window_caps_weeks(self):
        p = target_profile("qb1", 2024, 5, _rows(), window=2)
        self.assertEqual(p.n_weeks, 2)
        self.assertEqual(p.n_targets, 30)  # weeks 3-4 only

    def test_below_min_targets_withheld(self):
        rows = [_t("qb9", 2024, 1, "A", "Al", 5)]
        p = target_profile("qb9", 2024, 2, rows)
        self.assertEqual(p.shares, ())
        self.assertIsNone(p.hhi)
        self.assertIn(str(MIN_TARGETS), p.gap_note)

    def test_unknown_qb_returns_none(self):
        self.assertIsNone(target_profile("nope", 2024, 5, _rows()))

    def test_reports_n(self):
        # The research reporting rule: n alongside every share.
        p = target_profile("qb1", 2024, 5, _rows(), window=4)
        self.assertEqual(p.shares[0].targets, 40)
        self.assertEqual(p.n_targets, 70)


class TestAbsenceDelta(unittest.TestCase):
    def test_pitts_template(self):
        d = absence_delta("qb1", "C", 2024, 5, _rows(), window=4)
        self.assertEqual(d.weeks_present, 2)
        self.assertEqual(d.weeks_absent, 2)
        # With C: A leads 10/20 = 0.50. Without C: A leads 10/15 = 0.667.
        self.assertAlmostEqual(d.leader_share_with, 0.50, places=4)
        self.assertAlmostEqual(d.leader_share_without, 0.6667, places=4)
        self.assertAlmostEqual(d.trust_delta_absent, -0.1667, places=4)
        self.assertIsNone(d.gap_note)

    def test_sliver_withheld(self):
        # C present in 3 of 4 weeks -> absent side has 1 week < 2.
        rows = [_t("qb1", 2024, w, "A", "Al", 10) for w in (1, 2, 3, 4)]
        rows += [_t("qb1", 2024, w, "C", "Cy", 5) for w in (1, 2, 3)]
        d = absence_delta("qb1", "C", 2024, 5, rows, window=4)
        self.assertIsNone(d.trust_delta_absent)
        self.assertIsNotNone(d.gap_note)

    def test_unknown_receiver(self):
        d = absence_delta("qb1", "ZZZ", 2024, 5, _rows(), window=4)
        # Never present -> present side empty -> withheld.
        self.assertIsNone(d.trust_delta_absent)


if __name__ == "__main__":
    unittest.main()
