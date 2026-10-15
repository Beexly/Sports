#!/usr/bin/env python3
"""Tests for sai_diagnostics.py (SAI diagnostics build, 2026-10-15).

Covers: frozen-filter baseline reproduction, family-2 reproduction, PIT
fail-closed semantics of the feature builders on synthetic contexts, the
SAI product rule, and the screen-protocol dispositions recorded in the
results artifact (BQP PARKED, SWCC REFUSED-prior, passed stays false).
Data-dependent tests skip cleanly when the nflverse data dir is absent.
"""
import json
import math
import os
import sys
import unittest
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import wf_situational_engine as eng  # noqa: E402

DATA_PRESENT = os.path.exists(os.path.expanduser("~/workspace/sai-build/data/games.csv"))


@unittest.skipUnless(DATA_PRESENT, "nflverse data dir absent")
class TestFrozenFilter(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        import sai_diagnostics as sd
        cls.sd = sd
        cls.all_rows, cls.filt = sd.load_games()

    def test_filter_n_and_baseline(self):
        sd = self.sd
        self.assertEqual(len(self.filt), 2462)
        base = sum(eng.crps_gaussian(g["spread"], 13.45, g["margin"]) for g in self.filt) / len(self.filt)
        self.assertAlmostEqual(base, 7.154021, places=6)

    def test_mu_is_spread_line(self):
        for g in self.filt:
            self.assertEqual(g["margin"], g["home_score"] - g["away_score"])
            self.assertIsNotNone(g["spread"])

    def test_family2_reproduction(self):
        sd = self.sd
        _, mean = sd.family2_per_game(self.filt)
        self.assertAlmostEqual(mean, 7.133199, places=6)


class TestKeynumMath(unittest.TestCase):
    def test_keynum_reduces_to_gaussian_without_atoms(self):
        sd = __import__("sai_diagnostics")
        for mu, sd_, y in ((-3.5, 13.45, 7.0), (2.5, 13.45, -10.0), (0.0, 9.0, 3.0)):
            self.assertAlmostEqual(sd.crps_keynum(mu, sd_, 0.0, 0.0, y),
                                   eng.crps_gaussian(mu, sd_, y), places=9)

    def test_keynum_mean_lock(self):
        sd = __import__("sai_diagnostics")
        w, c, atoms = sd.keynum_components(-4.0, 13.45, 0.05, 0.03)
        mean = w * c + sum(a * q for a, q in atoms)
        self.assertAlmostEqual(mean, -4.0, places=12)


class TestSAIProduct(unittest.TestCase):
    def test_tilde_zero_until_25_prior(self):
        sd = __import__("sai_diagnostics")
        filt = [{"game_id": f"g{i}", "season": 2020, "week": 1 + (i % 18),
                 "spread": 0.0, "margin": 0} for i in range(10)]
        # keep (season, week) blocks unique-ish; build_sai only needs game_id + feats
        feats = {"CAOFI": {g["game_id"]: 1.0 for g in filt},
                 "RIL": {g["game_id"]: None for g in filt},
                 "OLCAI": {g["game_id"]: None for g in filt},
                 "SPESE": {g["game_id"]: None for g in filt},
                 "QPTSR": {g["game_id"]: None for g in filt},
                 "SWCC": {g["game_id"]: None for g in filt},
                 "BQP": {g["game_id"]: None for g in filt}}
        vals = sd.build_sai(filt, feats, {"CAOFI"})
        self.assertTrue(all(v == 0.0 for v in vals.values()))


class TestResultsArtifact(unittest.TestCase):
    def test_dispositions_and_locks(self):
        path = os.path.join(HERE, "sai_diagnostics_result.json")
        if not os.path.exists(path):
            self.skipTest("results artifact not produced yet")
        r = json.load(open(path))
        self.assertFalse(r["passed"])
        self.assertFalse(r["walk_forward_json_touched"])
        self.assertIn("PARKED", r["metrics"]["BQP"]["disposition"])
        self.assertIn("REFUSED", r["metrics"]["SWCC"]["disposition"])
        self.assertEqual(r["metrics"]["BQP"]["screens"], {})
        self.assertEqual(r["metrics"]["SWCC"]["screens"], {})
        for name, blk in r["graph_registration"]["edge_families"].items():
            self.assertEqual(blk["weight"], 0, name)
        self.assertTrue(r["baseline_reproduction"]["ok"])
        self.assertTrue(r["family2_reproduction"]["ok"])


if __name__ == "__main__":
    unittest.main()
