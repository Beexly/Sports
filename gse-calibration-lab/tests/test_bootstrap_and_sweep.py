"""Bootstrap determinism and sweep honesty."""

from __future__ import annotations

import random
import unittest

from gsecal.bootstrap import bins_occupancy_warning, bootstrap_ece
from gsecal.metrics import Sample, expected_calibration_error
from gsecal.sweep import apply_link, logit, sigmoid, sweep_link


def _rows(seed: int, n: int, bias: float = 0.0) -> list[Sample]:
    rng = random.Random(seed)
    out = []
    for _ in range(n):
        p = rng.random()
        out.append(Sample(p=p, y=1 if rng.random() < min(1, max(0, p + bias)) else 0))
    return out


class TestBootstrap(unittest.TestCase):
    def test_is_deterministic(self) -> None:
        rows = _rows(1, 120)
        a = bootstrap_ece(rows, resamples=300, seed=42)
        b = bootstrap_ece(rows, resamples=300, seed=42)
        self.assertEqual((a.point, a.low, a.high), (b.point, b.low, b.high))

    def test_different_seed_changes_interval_but_not_point(self) -> None:
        rows = _rows(2, 120)
        a = bootstrap_ece(rows, resamples=300, seed=1)
        b = bootstrap_ece(rows, resamples=300, seed=2)
        self.assertAlmostEqual(a.point, b.point, delta=1e-12)

    def test_point_matches_production_metric(self) -> None:
        rows = _rows(3, 90)
        self.assertAlmostEqual(
            bootstrap_ece(rows, resamples=200).point,
            expected_calibration_error(rows, 10),
            delta=1e-12,
        )

    def test_interval_brackets_the_point(self) -> None:
        rows = _rows(4, 200)
        i = bootstrap_ece(rows, resamples=400)
        self.assertLessEqual(i.low, i.point + 1e-9)
        self.assertGreaterEqual(i.high, i.point - 1e-9)

    def test_small_sample_gives_wider_interval(self) -> None:
        small = bootstrap_ece(_rows(5, 28), resamples=400)
        large = bootstrap_ece(_rows(5, 600), resamples=400)
        self.assertGreater(small.width, large.width)

    def test_verdict_language(self) -> None:
        i = bootstrap_ece(_rows(6, 150), resamples=300)
        self.assertIn(i.verdict(0.05).split()[0], {"CLEARS", "FAILS", "INCONCLUSIVE"})

    def test_empty_raises(self) -> None:
        with self.assertRaises(ValueError):
            bootstrap_ece([])


class TestOccupancyWarning(unittest.TestCase):
    def test_thin_sample_is_flagged(self) -> None:
        warning = bins_occupancy_warning(_rows(7, 28), bins=10)
        self.assertIsNotNone(warning)
        self.assertIn("THIN", warning)
        self.assertIn("direction", warning)

    def test_healthy_sample_not_flagged(self) -> None:
        self.assertIsNone(bins_occupancy_warning(_rows(8, 900), bins=10))


class TestSweep(unittest.TestCase):
    def test_logit_sigmoid_round_trip(self) -> None:
        for p in (0.01, 0.25, 0.5, 0.75, 0.99):
            self.assertAlmostEqual(sigmoid(logit(p)), p, delta=1e-9)

    def test_logit_is_finite_at_extremes(self) -> None:
        for p in (0.0, 1.0):
            self.assertTrue(abs(logit(p)) < float("inf"))

    def test_identity_link_is_a_no_op(self) -> None:
        rows = _rows(9, 100)
        out = apply_link(rows, 1.0, 0.0)
        for a, b in zip(rows, out):
            self.assertAlmostEqual(a.p, b.p, delta=1e-9)

    def test_sweep_never_reports_worse_than_baseline(self) -> None:
        result = sweep_link(_rows(10, 200, bias=0.15), temperatures=[0.8, 1.0, 1.4], shifts=[-0.2, 0.0, 0.2])
        self.assertLessEqual(result.best_ece.ece, result.baseline.ece + 1e-12)
        self.assertGreaterEqual(result.ece_improvement, -1e-12)

    def test_monotone_link_does_not_manufacture_resolution(self) -> None:
        """The central honesty check: a link cuts REL, it does not add RES."""
        result = sweep_link(_rows(11, 400, bias=0.2), temperatures=[0.7, 1.0, 1.5], shifts=[-0.3, 0.0, 0.3])
        self.assertLess(abs(result.resolution_delta), 0.02)

    def test_summary_states_the_tradeoff(self) -> None:
        result = sweep_link(_rows(12, 300), temperatures=[0.9, 1.0, 1.1], shifts=[0.0])
        text = result.honest_summary()
        self.assertIn("RES", text)
        self.assertIn("ECE", text)

    def test_rejects_bad_temperature(self) -> None:
        with self.assertRaises(ValueError):
            apply_link(_rows(13, 10), 0.0, 0.0)

    def test_empty_sweep_raises(self) -> None:
        with self.assertRaises(ValueError):
            sweep_link([])


if __name__ == "__main__":
    unittest.main()
