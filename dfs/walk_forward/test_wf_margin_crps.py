import json, math, os, sys, tempfile, time, unittest
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wf_margin_crps as w


def _mid(f, a, b, n):
    h = (b - a) / n
    return h * sum(f(a + (i + 0.5) * h) for i in range(n))


def numeric_crps(cdf, x, lo, hi, n=100000):
    """Integral of (F(z) - 1{z>=x})^2, split at x so the step never sits inside a cell."""
    return _mid(lambda z: cdf(z) ** 2, lo, x, n) + _mid(lambda z: (1 - cdf(z)) ** 2, x, hi, n)


class TestLaplace(unittest.TestCase):
    def test_crps_laplace_vs_integration(self):
        for mu, b, x in [(3.0, 10.0, 7.0), (-6.5, 11.6, 14.0), (0.0, 7.512, 0.0)]:
            num = numeric_crps(lambda z: w.laplace_cdf(z, mu, b), x, mu - 40 * b, mu + 40 * b)
            self.assertAlmostEqual(w.crps_laplace(mu, b, x), num, places=4)

    def test_crps_gaussian_import_vs_integration(self):
        cdf = lambda z: 0.5 * (1 + math.erf((z - 2.5) / (13.45 * math.sqrt(2))))
        self.assertAlmostEqual(w.crps_gaussian(2.5, 13.45, -4.0), numeric_crps(cdf, -4.0, -200, 200), places=4)

    def test_cdf_formula(self):
        mu, b = 3.0, 11.0
        self.assertAlmostEqual(w.laplace_cdf(-5.0, mu, b), 0.5 * math.exp(-8.0 / 11.0))
        self.assertAlmostEqual(w.laplace_cdf(10.0, mu, b), 1 - 0.5 * math.exp(-7.0 / 11.0))
        self.assertAlmostEqual(w.laplace_cdf(mu, mu, b), 0.5)

    def test_p_cover_half(self):
        for s in (-14.0, -3.0, 0.0, 2.5, 7.0):
            self.assertEqual(w.p_cover(s, 12.0), 0.5)

    def test_p_home_win(self):
        self.assertAlmostEqual(w.p_home_win(3.0, 11.0), 1 - 0.5 * math.exp(-3.0 / 11.0))
        self.assertAlmostEqual(w.p_home_win(0.0, 11.0), 0.5)


class TestFailClosed(unittest.TestCase):
    def test_missing_field_stops(self):
        d = {"observed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
             "manifest_rows": [{"game_id": "x", "season": 2023, "week": 1, "spread_line": 3.0,
                                "total_line": 44.0, "home_score": 20, "away_score": None}]}
        p = os.path.join(tempfile.mkdtemp(), "m.json"); json.dump(d, open(p, "w"))
        with self.assertRaises(w.FailClosed):
            w.run(p, p + ".out", ledger=False)


if __name__ == "__main__":
    unittest.main()
