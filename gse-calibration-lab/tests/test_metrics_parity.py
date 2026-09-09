"""
Parity: the Python port must reproduce the production TypeScript exactly.

Vectors in parity/vectors.json are produced by transpiling and executing the
real source files (see parity/gen_vectors.mjs). If this test fails, the port is
wrong — not the vectors.

Tolerance is 1e-12 on floats, which is IEEE-754 noise between two engines doing
the same arithmetic in a different order. Anything larger is a real divergence.
"""

from __future__ import annotations

import json
import unittest
from pathlib import Path

from gsecal.metrics import (
    Sample,
    brier_decomposition,
    brier_score,
    confidence_buckets,
    expected_calibration_error,
    maximum_calibration_error,
)

VECTORS = Path(__file__).resolve().parent.parent / "parity" / "vectors.json"
TOL = 1e-12


class TestMetricsParity(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        if not VECTORS.exists():
            raise unittest.SkipTest(
                f"{VECTORS} missing — run: node gse-calibration-lab/parity/gen_vectors.mjs"
            )
        cls.payload = json.loads(VECTORS.read_text())

    def _samples(self, case) -> list[Sample]:
        return [Sample(p=float(s["p"]), y=int(s["y"])) for s in case["samples"]]

    def test_vectors_are_present(self) -> None:
        self.assertGreaterEqual(len(self.payload["cases"]), 10)
        self.assertIn(10, [int(b) for b in self.payload["binCounts"]])

    def test_brier_parity(self) -> None:
        for case in self.payload["cases"]:
            with self.subTest(case=case["name"]):
                got = brier_score(self._samples(case))
                self.assertAlmostEqual(got, case["brier"], delta=TOL)

    def test_ece_parity(self) -> None:
        for case in self.payload["cases"]:
            samples = self._samples(case)
            for bins_str, expected in case["perBins"].items():
                with self.subTest(case=case["name"], bins=bins_str):
                    got = expected_calibration_error(samples, int(bins_str))
                    self.assertAlmostEqual(got, expected["ece"], delta=TOL)

    def test_mce_parity(self) -> None:
        for case in self.payload["cases"]:
            samples = self._samples(case)
            for bins_str, expected in case["perBins"].items():
                with self.subTest(case=case["name"], bins=bins_str):
                    got = maximum_calibration_error(samples, int(bins_str))
                    self.assertAlmostEqual(got, expected["mce"], delta=TOL)

    def test_bucket_parity(self) -> None:
        """Every bucket field, including the [lower, upper) vs [lower, upper] edge."""
        for case in self.payload["cases"]:
            samples = self._samples(case)
            for bins_str, expected in case["perBins"].items():
                got = confidence_buckets(samples, int(bins_str))
                self.assertEqual(len(got), len(expected["buckets"]))
                for i, (g, e) in enumerate(zip(got, expected["buckets"])):
                    with self.subTest(case=case["name"], bins=bins_str, bucket=i):
                        self.assertEqual(g.count, e["count"])
                        self.assertAlmostEqual(g.lower, e["lower"], delta=TOL)
                        self.assertAlmostEqual(g.upper, e["upper"], delta=TOL)
                        self.assertAlmostEqual(g.avg_confidence, e["avgConfidence"], delta=TOL)
                        self.assertAlmostEqual(g.accuracy, e["accuracy"], delta=TOL)
                        self.assertAlmostEqual(g.gap, e["gap"], delta=TOL)

    def test_decomposition_parity(self) -> None:
        """Includes production's 4dp rounding — the gate compares rounded values."""
        for case in self.payload["cases"]:
            samples = self._samples(case)
            for bins_str, expected in case["perBins"].items():
                d = expected["decomposition"]
                got = brier_decomposition(samples, int(bins_str))
                with self.subTest(case=case["name"], bins=bins_str):
                    self.assertEqual(got.sample_size, d["sampleSize"])
                    self.assertAlmostEqual(got.brier, d["brier"], delta=TOL)
                    self.assertAlmostEqual(got.reliability, d["reliability"], delta=TOL)
                    self.assertAlmostEqual(got.resolution, d["resolution"], delta=TOL)
                    self.assertAlmostEqual(got.uncertainty, d["uncertainty"], delta=TOL)
                    self.assertAlmostEqual(got.base_rate, d["baseRate"], delta=TOL)


if __name__ == "__main__":
    unittest.main()
