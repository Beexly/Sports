"""Engine integration tests: synthetic end-to-end + real-data regression anchors.

Regression anchors are computed from the frozen local pipeline output
~/workspace/qb-behavioral-profiles/data/qb_season_metrics.parquet
(Rodgers 2016: HHI 0.1417, top1 0.223, top_receiver Jordy Nelson,
int_rate 1.15, scramble_rate 0.0566, epa_db 0.236).
"""
import os
import sys
import tempfile
import unittest

import polars as pl

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
from qb_behavior.engine import ProfileEngine
from qb_behavior.profile import Verification, QBProfile
from qb_behavior import audit as A
from fixtures import synthetic_pbp, synthetic_rosters
from qb_behavior.identity import build_name_map

REAL_METRICS = os.path.expanduser(
    "~/workspace/qb-behavioral-profiles/data/qb_season_metrics.parquet")


def make_engine_with_synthetic() -> ProfileEngine:
    tmp = tempfile.mkdtemp()
    df = synthetic_pbp()
    # loader.apply_metric_bible_filters expects season col from load_pbp;
    # write one parquet per season present.
    for s in df["season"].unique().to_list():
        df.filter(pl.col("season") == s).write_parquet(
            os.path.join(tmp, f"pbp_{s}.parquet"))
    eng = ProfileEngine(data_dir=tmp, name_map=build_name_map(synthetic_rosters()))
    return eng


class TestEngineSynthetic(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.eng = make_engine_with_synthetic()

    def test_dropback_frame_filters(self):
        f = self.eng.get_dropback_frame("00-TEST", 2024)
        # 12 rows - 1 kneel/garbage row = 11
        self.assertEqual(len(f), 11)

    def test_season_profile_none_below_minimum(self):
        # 11 dropbacks < 100 minimum
        self.assertIsNone(self.eng.compute_season_profile("00-TEST", 2024))

    def test_rolling_form_game_order(self):
        rows = self.eng.compute_rolling_form("00-TEST", window=2)
        self.assertEqual(len(rows), 2)  # 2 games
        # window=2: first game None, second = mean of both game EPAs
        self.assertIsNone(rows[0]["rolling_epa_db"])
        self.assertIsNotNone(rows[1]["rolling_epa_db"])

    def test_rolling_form_antileakage(self):
        # availability weight uses strictly-prior games: first game has none
        rows = self.eng.compute_rolling_form("00-TEST", window=2)
        self.assertIsNone(rows[0]["availability_weight"])

    def test_list_qbs_empty_below_min(self):
        self.assertEqual(self.eng.list_qbs(min_dropbacks=100), [])

    def test_list_qbs_finds_synthetic(self):
        qbs = self.eng.list_qbs(min_dropbacks=5)
        self.assertEqual(len(qbs), 1)
        self.assertEqual(qbs[0]["qb_name"], "Test Quarterback")

    def test_auto_name_map_from_pbp(self):
        tmp = tempfile.mkdtemp()
        rows = synthetic_pbp().with_columns(
            pl.lit("T.Quarterback").alias("passer_player_name"))
        rows.write_parquet(os.path.join(tmp, "pbp_2024.parquet"))
        eng = ProfileEngine(data_dir=tmp)  # no name map passed
        eng._ensure_name_map()
        self.assertEqual(eng.name_map.get("00-TEST"), "T.Quarterback")

    def test_full_profile_every_metric_has_n(self):
        # tile the fixture past the 100-dropback minimum
        tmp = tempfile.mkdtemp()
        tiles = []
        base = synthetic_pbp()
        for g in range(12):
            tiles.append(base.with_columns(
                pl.lit(f"g{g}").alias("game_id"),
                pl.lit(g + 1).alias("week")))
        big = pl.concat(tiles, how="diagonal")
        big.write_parquet(os.path.join(tmp, "pbp_2024.parquet"))
        eng = ProfileEngine(data_dir=tmp,
                            name_map={"00-TEST": "Test Quarterback"})
        sp = eng.compute_season_profile("00-TEST", 2024)
        self.assertIsNotNone(sp)
        missing = [k for k, m in sp.metrics.items() if m.n is None]
        self.assertEqual(missing, [], f"metrics missing n: {missing}")
        # core metrics survive the audit
        res = A.audit_season_profile(sp)
        A.mark_weak_links(sp, res)
        for k in ("hhi", "int_rate", "epa_db", "scramble_rate", "adot"):
            self.assertNotIn(f"2024.{k}",
                             QBProfile(qb_id="x", qb_name="X",
                                       seasons=[sp]).weak_links())


class TestEngineRealData(unittest.TestCase):
    """Regression anchors against the frozen pipeline output."""

    @classmethod
    def setUpClass(cls):
        if not os.path.exists(REAL_METRICS):
            raise unittest.SkipTest("real pipeline data not present")
        cls.m = pl.read_parquet(REAL_METRICS)

    def _row(self, qb, season):
        r = self.m.filter((pl.col("qb") == qb) & (pl.col("season") == season))
        self.assertEqual(len(r), 1, f"missing anchor {qb} {season}")
        return r.row(0, named=True)

    def test_rodgers_2016_hhi(self):
        r = self._row("Aaron Rodgers", 2016)
        self.assertAlmostEqual(r["hhi"], 0.1417, places=4)

    def test_rodgers_2016_top1(self):
        r = self._row("Aaron Rodgers", 2016)
        self.assertAlmostEqual(r["top1_share"], 0.223, places=3)
        self.assertEqual(r["top_receiver"], "Jordy Nelson")

    def test_rodgers_2016_int(self):
        r = self._row("Aaron Rodgers", 2016)
        self.assertAlmostEqual(r["int_rate"], 1.15, places=2)

    def test_rodgers_2016_scramble(self):
        r = self._row("Aaron Rodgers", 2016)
        self.assertAlmostEqual(r["scramble_rate"], 0.0566, places=4)

    def test_rodgers_2016_epa(self):
        r = self._row("Aaron Rodgers", 2016)
        self.assertAlmostEqual(r["epa_db"], 0.236, places=3)

    def test_pipeline_has_180_qbs(self):
        self.assertGreaterEqual(self.m["qb"].n_unique(), 150)


class TestAuditOnSynthetic(unittest.TestCase):
    def test_audit_runs(self):
        from qb_behavior.profile import SeasonProfile, MetricValue
        sp = SeasonProfile(season=2024, qb_id="x", qb_name="X", dropbacks=11,
                           metrics={"hhi": MetricValue(0.38, Verification.COMPUTED, n=9)})
        results = A.audit_season_profile(sp)
        self.assertTrue(any(not r.passed for r in results))  # n=9 < 12 floor


if __name__ == "__main__":
    unittest.main()
