#!/usr/bin/env python3
"""Unit tests for Brenier 1/3 stability, Solenoidal zero-sum assert, Kreyszig 20.4/20.5, HJO 2609.20567v2, Katch-McArdle, MathWorks #19232, and Tangri anchors."""
import math
import sys
import unittest
from pathlib import Path
import numpy as np

_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from intelligence.math.vmls_and_numpy_kernels import (
    condition_number_estimate,
    katch_mcardle_rmr,
    least_squares_polynomial_fit,
)
from intelligence.math.effective_theory_and_large_deviations import (
    mathworks_disposable_edge_tail_check,
    verify_hjo_cone_positive_definiteness,
)
from scripts.ops.gse_coach_mind_simulator import (
    DEFAULT_SEALED_BASELINE,
    brenier_one_third_stability_ratio,
    conserve_target_shares_kkt,
    load_sealed_object_readonly,
    load_week8_injuries_from_csv,
    simulate_matchup_pbp,
    sinkhorn_reallocate_weights,
)


class TestBrenierAndKreyszigAndHJO(unittest.TestCase):
    def test_synthetic_perturbation_and_sinkhorn_reallocation(self):
        cost_c = DEFAULT_SEALED_BASELINE["costMatrixC"]
        mu = np.array([0.26, 0.21, 0.17, 0.20, 0.16], dtype=np.float64)

        nu_small = np.array([0.19, 0.28, 0.17, 0.20, 0.16], dtype=np.float64)
        K = np.exp(-np.asarray(cost_c, dtype=np.float64) / 0.10)
        u = np.ones_like(mu)
        v = np.ones_like(nu_small)
        for _ in range(200):
            u = mu / np.maximum(K @ v, 1e-12)
            v = nu_small / np.maximum(K.T @ u, 1e-12)
        P = np.diag(u) @ K @ np.diag(v)
        realized_small = conserve_target_shares_kkt(P.sum(axis=0))
        ratio_small = brenier_one_third_stability_ratio(mu, nu_small, realized_small)

        nu_scratch = mu.copy()
        nu_scratch[1] = 0.01
        nu_scratch = nu_scratch / np.sum(nu_scratch)
        realized_scratch_raw, _ = sinkhorn_reallocate_weights(cost_c, mu, ["WR2"])
        realized_scratch = conserve_target_shares_kkt(realized_scratch_raw)
        ratio_scratch = brenier_one_third_stability_ratio(mu, nu_scratch, realized_scratch)

        print(
            f"[BRENIER 1/3 CHECK] 7% synthetic shift ratio = {ratio_small:.4f} | "
            f"WR2 scratch ratio = {ratio_scratch:.4f}"
        )
        self.assertTrue(math.isfinite(ratio_small) and ratio_small > 0.0)
        self.assertTrue(math.isfinite(ratio_scratch) and ratio_scratch > 0.0)
        self.assertLess(ratio_small, 2.0)
        self.assertLess(ratio_scratch, 2.0)

    def test_condition_number_kreyszig_20_4(self):
        A_ill = np.array([[0.9999, -1.0001], [1.0000, -1.0000]], dtype=np.float64)
        kappa_ill = condition_number_estimate(A_ill, norm="2")
        self.assertGreater(kappa_ill, 19_999.0)

        A_well = np.array([[5.0, 1.0, 1.0], [1.0, 4.0, 2.0], [1.0, 2.0, 4.0]], dtype=np.float64)
        kappa_well = condition_number_estimate(A_well, norm="2")
        self.assertTrue(3.0 < kappa_well < 5.0)
        print(f"[KREYSZIG 20.4] kappa_ill = {kappa_ill:.1f} | kappa_well = {kappa_well:.4f}")

    def test_least_squares_polynomial_fit_kreyszig_20_5_ex2(self):
        x = np.array([0.0, 2.0, 4.0, 6.0, 8.0], dtype=np.float64)
        y = np.array([5.0, 4.0, 1.0, 6.0, 7.0], dtype=np.float64)
        res = least_squares_polynomial_fit(x, y, degree=2)
        c = res["coefficients"]
        expected = np.array([5.1142857, -1.4142857, 0.2142857], dtype=np.float64)
        np.testing.assert_allclose(c, expected, atol=1e-4)
        self.assertFalse(res["ill_conditioned_flag"])
        print(
            f"[KREYSZIG 20.5 EX.2] coeffs = [{c[0]:.5f}, {c[1]:.5f}, {c[2]:.5f}] | "
            f"Vandermonde kappa = {res['condition_number_kappa']:.2f}"
        )

    def test_verify_hjo_cone_positive_definiteness_2609_20567(self):
        Q_pd = np.array([[2.0, 0.5], [0.5, 1.5]], dtype=np.float64)
        cone_vecs = np.array([[1.0, 1.0], [2.0, 1.0], [0.0, 3.0], [3.0, 2.0]], dtype=np.float64)
        out_ok = verify_hjo_cone_positive_definiteness(Q_pd, cone_vecs, delta=1.0)
        self.assertTrue(out_ok["cone_positive_definite"])

        Q_fail = np.array([[1.0, 0.0], [0.0, -0.5]], dtype=np.float64)
        out_fail = verify_hjo_cone_positive_definiteness(Q_fail, cone_vecs, delta=1.0)
        self.assertFalse(out_fail["cone_positive_definite"])
        print(
            f"[HJO 2609.20567v2] PD min_margin = {out_ok['min_margin']:.4f} | "
            f"Indefinite pass = {out_fail['cone_positive_definite']}"
        )

    def test_katch_mcardle_rmr_and_bias_band(self):
        rmr_80 = katch_mcardle_rmr(80.0)
        self.assertAlmostEqual(rmr_80, 2098.0, places=6)
        # Paper's ±6% Bland-Altman band around 2098 kcal/day is [1972.12, 2223.88]
        lo_6pct, hi_6pct = rmr_80 * 0.94, rmr_80 * 1.06
        self.assertTrue(1970.0 < lo_6pct < 1975.0 and 2220.0 < hi_6pct < 2225.0)
        print(f"[KATCH-MCARDLE] FFM=80kg -> RMR={rmr_80:.1f} kcal/day (±6% band: [{lo_6pct:.1f}, {hi_6pct:.1f}])")

    def test_mathworks_disposable_edge_tail_check(self):
        # Conservative profile ($14,190 disposable, small stakes) stays under 10%
        cons = mathworks_disposable_edge_tail_check(
            disposable_bankroll=14190.0, wager_per_bet=15.0, n_bets=100, win_prob=0.50, payout_odds_net=0.9091
        )
        self.assertFalse(cons["exceeds_10pct_disposable_threshold"])
        # Aggressive negative-EV profile breaches 10% disposable threshold
        aggr = mathworks_disposable_edge_tail_check(
            disposable_bankroll=10430.0, wager_per_bet=50.0, n_bets=300, win_prob=0.47, payout_odds_net=0.9091
        )
        self.assertTrue(aggr["exceeds_10pct_disposable_threshold"])
        print(
            f"[MATHWORKS #19232] cons_95th_loss=${cons['loss_95th_percentile']:.1f} ({cons['loss_fraction_of_disposable']*100:.1f}%) | "
            f"aggr_95th_loss=${aggr['loss_95th_percentile']:.1f} ({aggr['loss_fraction_of_disposable']*100:.1f}%)"
        )

    def test_week8_13_games_invariants(self):
        sealed_obj, digest = load_sealed_object_readonly()
        inj_map = load_week8_injuries_from_csv()
        week8_matchups = [
            ("MIN", "LAC"), ("MIA", "ATL"), ("NYJ", "CIN"), ("CLE", "NE"),
            ("NYG", "PHI"), ("BUF", "CAR"), ("CHI", "BAL"), ("SF", "HOU"),
            ("TB", "NO"), ("TEN", "IND"), ("DAL", "DEN"), ("GB", "PIT"), ("WAS", "KC"),
        ]
        ratios = []
        max_zero_sum_err = 0.0
        for idx, (aw, hm) in enumerate(week8_matchups):
            aw_i = inj_map.get(aw, ["WR2"] if idx % 3 == 0 else [])
            hm_i = inj_map.get(hm, ["TE1"] if idx % 4 == 0 else [])
            r = simulate_matchup_pbp(aw, hm, aw_i, hm_i, sealed_obj, digest, n_sims=500, seed=800 + idx)
            self.assertLess(r["solenoidal_zero_sum_error_max"], 1e-12)
            self.assertEqual(r["external_accuracy_anchors"]["low_scoring_football_pct"], 53.9)
            self.assertEqual(r["external_accuracy_anchors"]["high_scoring_basketball_pct"], 74.5)
            max_zero_sum_err = max(max_zero_sum_err, r["solenoidal_zero_sum_error_max"])
            if r["brenier_stability_ratio_away"] > 0:
                ratios.append((f"{aw}@{hm}(A)", r["brenier_stability_ratio_away"]))
            if r["brenier_stability_ratio_home"] > 0:
                ratios.append((f"{aw}@{hm}(H)", r["brenier_stability_ratio_home"]))
        vals = [v for _, v in ratios]
        print(
            f"[WEEK 8 13-GAME INVARIANTS] active_ratios={len(vals)} | "
            f"median={float(np.median(vals)):.4f} | max={float(np.max(vals)):.4f} | "
            f"max_zero_sum_err={max_zero_sum_err:.2e}"
        )
        self.assertLess(float(np.max(vals)), 1.0)


if __name__ == "__main__":
    unittest.main()
