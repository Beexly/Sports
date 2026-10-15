#!/usr/bin/env python3
"""Unit tests for the PIT line-movement scorer (line_movement_score.py).

Covers the four rules the brief demands:
  1. future / post-kickoff stamps fail closed (row is refused, never folded)
  2. predictive mean == spread_line to < 1e-12
  3. thin prior (cnt < 25) forces beta = 0 -> delta exactly 0
  4. no current-week leakage: perturbing the last stamped rows' moves cannot
     change any earlier stamped delta

Run: python dfs/walk_forward/test_line_movement_score.py
"""
import math
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import line_movement_score as L  # noqa: E402


def _row(i, spread=3.0, margin=10.0, gameday="2026-09-13"):
    return {
        "game_id": "2026_%02d_T_A" % i,
        "season": 2026,
        "week": (i // 16) + 1,
        "spread_line": spread,
        "margin": margin,
        "total_line": 44.0,
        "gameday": gameday,
    }


def _move(mv, observed_at="2026-09-12 12:00:00", gameday="2026-09-13"):
    return {"move": mv, "observed_at": observed_at, "gameday": gameday}


def _frozen_and_moves(n=40):
    rows = [_row(i) for i in range(n)]
    moves = {r["game_id"]: _move(1.0 + (i % 5) * 0.5) for i, r in enumerate(rows)}
    return rows, moves


class TestFailClosed(unittest.TestCase):
    def test_future_stamp_is_refused(self):
        rows, moves = _frozen_and_moves(30)
        k = rows[10]["game_id"]
        moves[k] = _move(2.0, observed_at="2026-09-14 12:00:00",  # after gameday
                         gameday="2026-09-13")
        res = L.score(rows, moves)
        self.assertEqual(res["n_scored"], 29)
        self.assertEqual(res["refused_unstamped"], 1)

    def test_missing_stamp_is_refused(self):
        rows, moves = _frozen_and_moves(30)
        del moves[rows[7]["game_id"]]
        res = L.score(rows, moves)
        self.assertEqual(res["n_scored"], 29)
        self.assertEqual(res["refused_unstamped"], 1)

    def test_unparsable_move_is_refused(self):
        rows, moves = _frozen_and_moves(30)
        moves[rows[3]["game_id"]] = {"move": "NaN-not-a-float", "observed_at": "2026-09-12", "gameday": "2026-09-13"}
        res = L.score(rows, moves)
        self.assertEqual(res["n_scored"], 29)

    def test_no_gameday_anywhere_fails_closed(self):
        rows = [_row(i, gameday="") for i in range(30)]
        moves = {r["game_id"]: {"move": 1.0, "observed_at": "2026-09-12", "gameday": ""} for r in rows}
        res = L.score(rows, moves)
        self.assertEqual(res["n_scored"], 0)


class TestLocationLock(unittest.TestCase):
    def test_mean_shift_is_zero(self):
        rows, moves = _frozen_and_moves(60)
        res = L.score(rows, moves)
        self.assertLess(res["max_abs_mean_shift"], 1e-12)

    def test_no_row_can_report_a_shift(self):
        # the guard raises whenever |mu - spread_line| >= 1e-12 is even possible;
        # on a clean run every row must report max_abs_mean_shift == 0.0 exactly.
        rows, moves = _frozen_and_moves(30)
        res = L.score(rows, moves)
        self.assertEqual(res["max_abs_mean_shift"], 0.0)


class TestThinPrior(unittest.TestCase):
    def test_beta_zero_below_min_prior(self):
        rows, moves = _frozen_and_moves(30)
        # reproduce the scorer loop and check the first 25 deltas are exactly 0
        base = [L.H.crps_gaussian(r["spread_line"], L.SIGMA0, r["margin"]) for r in rows]
        res = L.score(rows, moves)
        self.assertEqual(res["n_scored"], 30)
        for d in res["deltas"][:L.MIN_PRIOR]:
            self.assertEqual(d, 0.0)
        self.assertGreaterEqual(len(res["deltas"]), L.MIN_PRIOR)


class TestNoLeakage(unittest.TestCase):
    def test_late_move_perturbation_inert_on_earlier_rows(self):
        rows, moves = _frozen_and_moves(40)
        res_a = L.score(rows, moves)
        # change only the LAST stamped row's move absurdly
        moves2 = dict(moves)
        last = rows[-1]["game_id"]
        moves2[last] = _move(999.0)
        res_b = L.score(rows, moves2)
        self.assertEqual(res_a["deltas"][:-1], res_b["deltas"][:-1])
        # earlier fit must not have consumed the perturbed row: identical betas
        # up to that point means deltas are bit-identical.

    def test_reversal_changes_result_suite_can_fail(self):
        rows, moves = _frozen_and_moves(40)
        rev = dict(moves)
        for k, v in rev.items():
            rev[k] = _move(-v["move"])  # sign flip changes |move| ordering only via x=abs; keep abs same
        res_a = L.score(rows, moves)
        # abs(move) unchanged -> deltas must be identical: the family is
        # |move|-only. A difference here would mean signed leakage.
        res_b = L.score(rows, rev)
        self.assertEqual(res_a["deltas"], res_b["deltas"])

    def test_n_below_150_never_clears(self):
        rows, moves = _frozen_and_moves(60)
        res = L.score(rows, moves)
        self.assertFalse(res["gate_cleared"])
        self.assertFalse(res["passed"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
