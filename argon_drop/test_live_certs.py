"""Unit tests for argon_drop/live_certs.py (12 stdlib checks)."""
import unittest
from pathlib import Path
from argon_drop.live_certs import (
    SourceNotMountedError,
    assert_conservation,
    birkhoff_gap,
    brenier_four_atom_ratio,
    four_marginal_gap,
    friesecke_gap,
    landau_siegel_predicate,
    load_verified_pbp,
    reallocate_injured,
    sinkhorn_log_domain,
    trotter_step_comparison,
)


class TestArgonDropLiveCerts(unittest.TestCase):
    def test_01_birkhoff_3x3_gap_zero(self):
        res = birkhoff_gap()
        self.assertEqual(res["best_permutation"], (1, 0, 2))
        self.assertAlmostEqual(res["monge_cost"], 5.0 / 3.0, places=12)
        self.assertAlmostEqual(res["dual_cost"], 5.0 / 3.0, places=12)
        self.assertEqual(res["gap"], 0.0)
        self.assertEqual(res["dual_violation"], 0.0)

    def test_02_friesecke_three_marginal_parity_half(self):
        res = friesecke_gap()
        self.assertEqual(res["kantorovich_cost"], 0.0)
        self.assertEqual(res["monge_min"], 0.5)
        self.assertEqual(res["gap"], 0.5)

    def test_03_sinkhorn_log_domain_120_steps_monotonic(self):
        res = sinkhorn_log_domain(eps=0.2, steps=120, h=1.0)
        self.assertEqual(res["steps"], 120)
        self.assertTrue(res["never_increased"])
        self.assertLess(res["residual"], 1e-3)

    def test_04_trotter_h1_vs_h175_measured_acceleration(self):
        comp = trotter_step_comparison(tol=1e-8)
        self.assertLess(comp["iterations_h175"], comp["iterations_h1"])

    def test_05_yard_identity_balanced_passes(self):
        res = assert_conservation(
            pass_yds=260.0,
            role_rec_yds=[95.0, 65.0, 40.0, 35.0, 25.0],
            rush_yds=115.0,
            role_rush_yds=[75.0, 25.0, 10.0, 5.0],
            qtr_pts=[7.0, 6.0, 3.0, 8.0],
            half1_pts=13.0,
            half2_pts=11.0,
            full_pts=24.0,
            fgm=1,
            pat=3,
            kick_pts=6.0,
        )
        self.assertEqual(res["max_residual"], 0.0)

    def test_06_yard_identity_280_vs_260_rejected(self):
        with self.assertRaises(ValueError):
            assert_conservation(pass_yds=280.0, role_rec_yds=[95.0, 65.0, 40.0, 35.0, 25.0])

    def test_07_injured_share_index_1_zero_and_sums_to_1(self):
        sh = reallocate_injured([0.26, 0.21, 0.17, 0.20, 0.16], injured_indices=[1])
        self.assertEqual(sh[1], 0.0)
        self.assertAlmostEqual(sum(sh), 1.0, places=12)

    def test_08_play_by_play_fail_closed_no_synthetic_drives(self):
        with self.assertRaises(SourceNotMountedError):
            load_verified_pbp(Path("/nonexistent/unmounted/pbp_2026.parquet"))

    def test_09_four_marginal_gap_blocked_on_purpose(self):
        with self.assertRaises(NotImplementedError):
            four_marginal_gap()

    def test_10_brenier_labeled_single_4_atom_instance(self):
        b = brenier_four_atom_ratio()
        self.assertAlmostEqual(b["ratio"], 0.5284, places=4)
        self.assertIn("SINGLE_4_ATOM_INSTANCE", b["label"])

    def test_11_landau_siegel_arithmetic_predicate(self):
        p = landau_siegel_predicate(19, 0.85)
        self.assertTrue(p["passes_predicate"])
        self.assertEqual(p["label"], "ARITHMETIC_PREDICATE_ON_SUPPLIED_NUMBERS")

    def test_12_verified_jev_spine_mounted_on_sports_checkout(self):
        spine = Path(__file__).resolve().parents[1] / "data" / "engine" / "nfl_2026_w8_jev_full_game_spine.json"
        loaded = load_verified_pbp(spine)
        self.assertTrue(loaded.exists())


if __name__ == "__main__":
    unittest.main()
