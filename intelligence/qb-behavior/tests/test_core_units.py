"""Tests for identity, loader, profile, splits, audit."""
import os
import sys
import unittest

import polars as pl

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
from qb_behavior import identity as I
from qb_behavior import loader as L
from qb_behavior.profile import Verification, MetricValue, SeasonProfile, QBProfile
from qb_behavior import audit as A
from qb_behavior.splits import apply_split
from fixtures import synthetic_pbp, synthetic_rosters


class TestIdentity(unittest.TestCase):
    def test_backfill_scramble(self):
        self.assertEqual(I.backfill_scramble_passer(None, "QB1", True), "QB1")

    def test_no_backfill_when_passer_present(self):
        self.assertEqual(I.backfill_scramble_passer("QB1", "QB2", True), "QB1")

    def test_no_backfill_when_not_scramble(self):
        self.assertIsNone(I.backfill_scramble_passer(None, "QB1", False))

    def test_name_map(self):
        m = I.build_name_map(synthetic_rosters())
        self.assertEqual(m["00-TEST"], "Test Quarterback")
        self.assertNotIn(None, m)

    def test_canonical_fallback(self):
        self.assertEqual(I.canonical_name("ZZZ", {}), "ZZZ")
        self.assertEqual(I.canonical_name(None, {}), "unknown")

    def test_build_name_map_from_pbp_majority_wins(self):
        pairs = [("a", "Name Old"), ("a", "Name New"), ("a", "Name New"),
                 ("b", None), (None, "Ghost")]
        m = I.build_name_map_from_pbp(pairs)
        self.assertEqual(m["a"], "Name New")
        self.assertNotIn("b", m)

    def test_vectorized_scramble_backfill(self):
        df = pl.DataFrame({
            "passer_player_id": [None, "QB1"],
            "rusher_player_id": ["QB1", "QB1"],
            "qb_scramble": [1, 0],
            "qb_kneel": [0, 0], "qb_spike": [0, 0],
            "qtr": [2, 2], "wp": [0.5, 0.5],
        })
        out = L.apply_metric_bible_filters(df)
        self.assertEqual(out["passer_player_id"].to_list(), ["QB1", "QB1"])


class TestLoader(unittest.TestCase):
    def test_garbage_time_pure(self):
        self.assertTrue(L.is_garbage_time(0.99, 4))
        self.assertTrue(L.is_garbage_time(0.01, 4))
        self.assertFalse(L.is_garbage_time(0.99, 3))
        self.assertFalse(L.is_garbage_time(0.5, 4))
        self.assertFalse(L.is_garbage_time(None, 4))

    def test_filters_drop_kneel_and_garbage(self):
        df = synthetic_pbp()
        out = L.apply_metric_bible_filters(df)
        # 12 rows - 1 kneel/garbage-time row = 11
        self.assertEqual(len(out), 11)

    def test_dropback_frame(self):
        df = L.apply_metric_bible_filters(synthetic_pbp())
        db = L.dropback_frame(df)
        self.assertEqual(len(db), 11)
        self.assertTrue((db["qb_dropback"] == 1).all())

    def test_game_script(self):
        df = pl.DataFrame({"score_differential": [7, -3, 0]})
        out = L.with_game_script(df)
        self.assertEqual(out["script"].to_list(), ["leading", "trailing", "tied"])


class TestProfile(unittest.TestCase):
    def test_verification_enum_closed(self):
        self.assertEqual({v.value for v in Verification},
                         {"CORPUS", "COMPUTED", "SINGLE_SOURCE", "INFERENCE"})

    def test_weak_links(self):
        sp = SeasonProfile(season=2024, qb_id="x", qb_name="X", dropbacks=200,
                           metrics={"a": MetricValue(1.0, Verification.COMPUTED),
                                    "b": MetricValue(2.0, Verification.INFERENCE,
                                                     note="breaking: TTT>2.6s")})
        prof = QBProfile(qb_id="x", qb_name="X", seasons=[sp])
        self.assertEqual(prof.weak_links(), ["2024.b"])

    def test_markdown_renders(self):
        prof = QBProfile(qb_id="x", qb_name="X")
        md = prof.to_markdown()
        self.assertIn("# QB Behavioral Profile: X", md)

    def test_roundtrip_dict(self):
        sp = SeasonProfile(season=2024, qb_id="x", qb_name="X", dropbacks=200,
                           metrics={"hhi": MetricValue(0.14, Verification.COMPUTED, n=300)})
        d = QBProfile(qb_id="x", qb_name="X", seasons=[sp]).to_dict()
        self.assertEqual(d["seasons"][0]["metrics"]["hhi"]["verification"], "COMPUTED")


class TestSplits(unittest.TestCase):
    def test_apply_split_protocol(self):
        class ByQtr:
            name = "by_qtr"
            dimensions = ("qtr",)

            def compute(self, frame):
                return {str(r["qtr"]): {"n": r["n"]}
                        for r in frame.group_by("qtr").agg(pl.len().alias("n")).iter_rows(named=True)}

        class FakeEngine:
            def get_dropback_frame(self, qb_id, season):
                return synthetic_pbp().filter(pl.col("passer_player_id") == qb_id)

        out = apply_split(FakeEngine(), "00-TEST", 2024, ByQtr())
        self.assertEqual(out["split"], "by_qtr")
        self.assertGreater(out["n"], 0)
        self.assertIn("2", out["result"])


class TestAudit(unittest.TestCase):
    def test_tiny_sample_fails(self):
        m = MetricValue(0.5, Verification.COMPUTED, n=5)
        r = A.sample_gate("int_rate", m)
        self.assertFalse(r.passed)
        self.assertIn("tiny-sample", r.reason)

    def test_small_sample_fails(self):
        m = MetricValue(0.5, Verification.COMPUTED, n=20)
        r = A.sample_gate("int_rate", m)
        self.assertFalse(r.passed)

    def test_adequate_passes(self):
        m = MetricValue(0.5, Verification.COMPUTED, n=300)
        self.assertTrue(A.sample_gate("int_rate", m).passed)

    def test_mark_weak_links_demotes(self):
        sp = SeasonProfile(season=2024, qb_id="x", qb_name="X", dropbacks=200,
                           metrics={"int_rate": MetricValue(2.0, Verification.COMPUTED, n=5)})
        results = A.audit_season_profile(sp)
        A.mark_weak_links(sp, results)
        self.assertEqual(sp.metrics["int_rate"].verification, Verification.SINGLE_SOURCE)
        self.assertIn("AUDIT", sp.metrics["int_rate"].note)

    def test_discrimination_gate(self):
        r = A.discrimination_gate("hhi", [0.14, 0.14, 0.14])
        self.assertFalse(r.passed)  # D ~ 0 -> shrink


if __name__ == "__main__":
    unittest.main()
