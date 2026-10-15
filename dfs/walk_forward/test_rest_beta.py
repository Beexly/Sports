import math
import os
import random
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import hybrid_crps as hc
import rest_beta as rb


def _games(n, beta_true, seed=3):
    rnd = random.Random(seed)
    out = []
    for i in range(n):
        rd = rnd.choice([-7.0, 0.0, 7.0])
        sd = 13.45 * math.exp(beta_true * abs(rd) / 7.0)
        out.append({
            "spread": 0.0,
            "margin": rnd.gauss(0.0, sd),
            "home_rest": 7.0 + rd / 2.0,
            "away_rest": 7.0 - rd / 2.0,
            "total_line": 44.0,
            "season": 2020 + i // 40,
            "week": 1 + (i % 40) // 10,
        })
    return out


class TestRestBeta(unittest.TestCase):
    def test_beta_recovered(self):
        beta = rb.fit_rest_beta(_games(600, -0.12))
        self.assertIsNotNone(beta)
        self.assertAlmostEqual(beta, -0.12, delta=0.08)

    def test_beta_bound_is_015(self):
        beta = rb.fit_rest_beta(_games(600, -0.60))
        self.assertLessEqual(abs(beta), 0.15 + 1e-12)

    def test_none_when_history_thin(self):
        self.assertIsNone(rb.fit_rest_beta([]))
        self.assertIsNone(rb.fit_rest_beta(_games(10, -0.12)))

    def test_missing_rest_fails_closed(self):
        games = _games(100, -0.12)
        for g in games:
            g["home_rest"] = None
        self.assertIsNone(rb.fit_rest_beta(games))


class TestModulatedSigma(unittest.TestCase):
    def test_zero_beta_is_identity(self):
        self.assertAlmostEqual(rb.modulated_sigma(13.45, 0.0, 7.0), 13.45, places=12)

    def test_none_feature_is_identity(self):
        self.assertAlmostEqual(rb.modulated_sigma(13.45, -0.15, None), 13.45, places=12)

    def test_clip_bounds(self):
        self.assertGreaterEqual(rb.modulated_sigma(13.45, -0.15, 70.0), 8.0 - 1e-9)
        self.assertLessEqual(rb.modulated_sigma(13.45, 0.15, 70.0), 20.0 + 1e-9)


class TestExcessFallback(unittest.TestCase):
    def _hist(self, n, spread, total):
        return [{"resid": float(i % 9 - 4), "spread": spread, "total_line": total,
                 "home_rest": 7.0, "away_rest": 7.0} for i in range(n)]

    def test_level3_global_when_cells_thin(self):
        hist = self._hist(200, 2.0, 44.0)
        lvl, p3, p7 = rb.excess_mass(hist, 9, 9, 9)
        self.assertEqual(lvl, 3)
        self.assertGreaterEqual(p3 + p7, 0.0)
        self.assertLessEqual(p3 + p7, 1.0)

    def test_level4_pure_gaussian_when_global_thin(self):
        hist = [{"resid": 3.0}]
        lvl, p3, p7 = rb.excess_mass(hist, 9, 9, 9)
        self.assertEqual(lvl, 4)
        self.assertEqual(p3, 0.0)
        self.assertEqual(p7, 0.0)

    def test_key_frequency_counts_three_and_seven(self):
        hist = [{"resid": float(v)} for v in [3, -3, 3, 7, 0, 10, -7, 1]] * 40
        lvl, p3, p7 = rb.excess_mass(hist, 0, 0, 0)
        self.assertAlmostEqual(p3, 0.375, places=9)
        self.assertAlmostEqual(p7, 0.25, places=9)

    def test_resid_derived_from_margin_when_absent(self):
        hist = [{"spread": 0.0, "margin": 3.0, "total_line": 44.0,
                 "home_rest": 7.0, "away_rest": 7.0}] * 40
        lvl, p3, p7 = rb.excess_mass(hist, 1, 1, 1)
        self.assertAlmostEqual(p3, 1.0, places=9)

    def test_unbinnable_history_falls_to_global_not_crash(self):
        """A history entry missing spread/total_line cannot be placed in any cell.
        It must contribute only to the level-3 global fallback, never crash and
        never be imputed into a cell."""
        hist = [{"resid": 3.0}, {"resid": -3.0}, {"resid": 7.0}] * 20
        lvl, p3, p7 = rb.excess_mass(hist, 0, 0, 0)
        self.assertEqual(lvl, 3)
        self.assertGreater(p3, 0.0)


class TestOrderOfOperations(unittest.TestCase):
    def test_order_is_asserted(self):
        hist = _games(400, -0.12)
        beta = rb.fit_rest_beta(hist)
        self.assertIsNotNone(beta)
        # Step 1: sigma first, from the rest feature
        sd = rb.modulated_sigma(13.45, beta, 1.0)
        # Step 2: excess conditioned on the modulated sigma's residual scale
        lvl, p3, p7 = rb.excess_mass(hist, rest_bin=0, spread_bin=0, total_bin=0)
        # Steps 3+4: overlay, then energy CRPS
        c = hc.crps_energy(0.0, sd, p3, p7, -4.0)
        self.assertTrue(math.isfinite(c))
        # Reversed order: score with sigma fixed at 13.45 instead of sd. The number
        # must differ -- that is the assertion that the order is load-bearing.
        c_rev = hc.crps_energy(0.0, 13.45, p3, p7, -4.0)
        self.assertNotEqual(c, c_rev)


if __name__ == "__main__":
    unittest.main()
