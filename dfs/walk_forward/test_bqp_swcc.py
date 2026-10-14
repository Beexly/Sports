import math, os, sys, unittest
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bqp_swcc as b


class T(unittest.TestCase):
    def test_gold_recovers_log_scale_gamma(self):
        rng = np.random.default_rng(3); z = rng.normal(0, 1, 8000)
        r = rng.normal(0, 13.45 * np.exp(0.2 * z))
        g = b._gold(lambda gv: b._nll_g(r, 13.45 * np.exp(gv * z)))
        self.assertAlmostEqual(g, 0.2, delta=0.03)

    def test_omitted_feature_is_baseline(self):
        rows = [{"game_id": f"g{i}", "season": 2020 + (i >= 60), "week": i % 15 + 1, "S": 0.0, "T": 44.0,
                 "Y": float((i * 7) % 29 - 14), "TOT": 44.0 + (i % 9 - 4)} for i in range(120)]
        out = b.harness(rows, [{f"g{i}": None for i in range(120)}])
        self.assertEqual(out["coverage"], 0.0)
        self.assertEqual(out["crps"]["gaussian"], out["crps"]["gaussian+feat"])
        self.assertEqual(out["crps"]["normal_mixture_2"], out["crps"]["normal_mixture_2+feat"])


if __name__ == "__main__":
    unittest.main()
