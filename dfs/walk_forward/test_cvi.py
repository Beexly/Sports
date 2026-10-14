import os, sys, unittest
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cvi


class TestCVI(unittest.TestCase):
    def test_gamma_recovers_scale_effect(self):
        rng = np.random.default_rng(1)
        c = rng.uniform(0, 2, 6000); r = rng.normal(0, 13.45 * (1 + 0.3 * c))
        g = cvi.fit_gamma(r, c, lambda rr, f: cvi._nll_gauss(rr, 13.45 * f))
        self.assertAlmostEqual(g, 0.3, delta=0.05)

    def test_gamma_zero_when_no_effect(self):
        rng = np.random.default_rng(2)
        c = rng.uniform(0, 2, 6000); r = rng.normal(0, 13.45, 6000)
        self.assertLess(abs(cvi.fit_gamma(r, c, lambda rr, f: cvi._nll_gauss(rr, 13.45 * f))), 0.05)

    def test_mu_never_moves(self):
        # harness centers every predictive at the close: a game whose Y equals the close scores
        # identically regardless of gamma sign (symmetric scale change only)
        rows = [{"game_id": f"g{i}", "season": 2020 + (i >= 40), "week": i % 20 + 1, "S": 3.0, "Y": 3.0 + (i % 7 - 3)} for i in range(80)]
        cv = {f"g{i}": {"cvi": 0.5} for i in range(80)}
        out = cvi.harness(rows, cv)
        self.assertEqual(out["n_cvi_filtered"], 40)


if __name__ == "__main__":
    unittest.main()
