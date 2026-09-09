"""
The stratified ECE identity, proven by property test rather than by one example.

    SUM_s w_s*ECE_s - ECE_pooled
        = SUM_k (n_k/N)[ SUM_s w_s,k|d_s,k| - |SUM_s w_s,k d_s,k| ]   >= 0

Both halves are checked independently: the residual must vanish, and every
per-bin term must be non-negative (triangle inequality).
"""

from __future__ import annotations

import random
import unittest

from gsecal.decomposition import (
    IDENTITY_TOLERANCE,
    cancellation_from_summaries,
    decompose_stratified_ece,
)
from gsecal.metrics import Sample, expected_calibration_error


def _synthetic_stratum(rng: random.Random, n: int, bias: float) -> list[Sample]:
    """Abstract (p, y) rows. `bias` tilts outcomes to create a signed gap.

    Not picks, teams, odds or product data — pure mathematics for exercising
    the estimator, in line with AGENTS.md law 8.
    """
    out: list[Sample] = []
    for _ in range(n):
        p = rng.random()
        true_p = min(1.0, max(0.0, p + bias))
        out.append(Sample(p=p, y=1 if rng.random() < true_p else 0))
    return out


class TestStratifiedIdentity(unittest.TestCase):
    def test_identity_holds_over_random_strata(self) -> None:
        """The decomposition must reconstruct the gap exactly, many times over."""
        for seed in range(60):
            rng = random.Random(seed)
            n_strata = rng.randint(2, 5)
            strata = {
                f"s{i}": _synthetic_stratum(
                    rng, rng.randint(20, 160), rng.uniform(-0.35, 0.35)
                )
                for i in range(n_strata)
            }
            report = decompose_stratified_ece(strata, bins=10)
            with self.subTest(seed=seed):
                self.assertTrue(
                    report.identity_holds,
                    f"residual {report.identity_residual!r} exceeds {IDENTITY_TOLERANCE}",
                )

    def test_cancellation_is_never_negative(self) -> None:
        """Triangle inequality: per-bin and in total."""
        for seed in range(60):
            rng = random.Random(1000 + seed)
            strata = {
                f"s{i}": _synthetic_stratum(rng, rng.randint(20, 120), rng.uniform(-0.4, 0.4))
                for i in range(rng.randint(2, 4))
            }
            report = decompose_stratified_ece(strata, bins=10)
            with self.subTest(seed=seed):
                self.assertGreaterEqual(report.total_cancellation, 0.0)
                for b in report.bin_detail:
                    self.assertGreaterEqual(
                        b.aligned_abs_gap + IDENTITY_TOLERANCE, b.pooled_abs_gap
                    )

    def test_pooled_ece_matches_production_metric(self) -> None:
        """The report's pooled figure IS the production ECE, not a re-derivation."""
        rng = random.Random(7)
        strata = {
            "a": _synthetic_stratum(rng, 90, 0.2),
            "b": _synthetic_stratum(rng, 70, -0.25),
        }
        report = decompose_stratified_ece(strata, bins=10)
        pooled = [s for rows in strata.values() for s in rows]
        self.assertAlmostEqual(
            report.pooled_ece, expected_calibration_error(pooled, 10), delta=1e-12
        )

    def test_single_stratum_has_zero_cancellation(self) -> None:
        """With one stratum there is nothing to cancel against."""
        rng = random.Random(3)
        strata = {"only": _synthetic_stratum(rng, 200, 0.15)}
        report = decompose_stratified_ece(strata, bins=10)
        self.assertAlmostEqual(report.total_cancellation, 0.0, delta=IDENTITY_TOLERANCE)
        self.assertAlmostEqual(
            report.pooled_ece, report.weighted_stratum_mean_ece, delta=IDENTITY_TOLERANCE
        )

    def test_same_sign_strata_barely_cancel(self) -> None:
        """Strata erring in the SAME direction cannot cancel much."""
        rng = random.Random(11)
        strata = {
            "a": _synthetic_stratum(rng, 150, 0.30),
            "b": _synthetic_stratum(rng, 150, 0.28),
        }
        report = decompose_stratified_ece(strata, bins=10)
        self.assertLess(report.cancellation_share, 0.25)

    def test_opposite_sign_strata_cancel_substantially(self) -> None:
        """Strata erring in OPPOSITE directions are the flattering case."""
        rng = random.Random(13)
        strata = {
            "over": _synthetic_stratum(rng, 200, -0.30),
            "under": _synthetic_stratum(rng, 200, 0.30),
        }
        report = decompose_stratified_ece(strata, bins=10)
        self.assertGreater(report.cancellation_share, 0.30)
        self.assertTrue(any(b.is_mixed_sign for b in report.bin_detail if b.pooled_count))

    def test_empty_input(self) -> None:
        report = decompose_stratified_ece({}, bins=10)
        self.assertEqual(report.total_n, 0)
        self.assertEqual(report.total_cancellation, 0.0)


class TestSummaryPath(unittest.TestCase):
    """The (label, n, ece) path must agree with the full row-level path."""

    def test_summary_path_matches_full_path(self) -> None:
        rng = random.Random(21)
        strata = {
            "a": _synthetic_stratum(rng, 120, 0.22),
            "b": _synthetic_stratum(rng, 80, -0.18),
            "c": _synthetic_stratum(rng, 60, 0.05),
        }
        full = decompose_stratified_ece(strata, bins=10)
        summarised = cancellation_from_summaries(
            [(s.name, s.n, s.ece) for s in full.strata], pooled_ece=full.pooled_ece
        )
        self.assertAlmostEqual(
            summarised.total_cancellation, full.total_cancellation, delta=1e-12
        )
        self.assertAlmostEqual(
            summarised.weighted_stratum_mean_ece, full.weighted_stratum_mean_ece, delta=1e-12
        )

    def test_weights_sum_to_one(self) -> None:
        r = cancellation_from_summaries([("a", 245, 0.1), ("b", 110, 0.05)], pooled_ece=0.04)
        self.assertAlmostEqual(sum(s.weight for s in r.strata), 1.0, delta=1e-12)

    def test_floor_verdict_flags_flattered_pooled(self) -> None:
        """Pooled clears the floor, honest mean does not -> must say FLATTERED."""
        r = cancellation_from_summaries(
            [("hi", 100, 0.12), ("lo", 100, 0.02)], pooled_ece=0.04
        )
        self.assertIn("FLATTERED", r.floor_verdict(0.05))

    def test_floor_verdict_robust_when_both_pass(self) -> None:
        r = cancellation_from_summaries(
            [("a", 100, 0.03), ("b", 100, 0.02)], pooled_ece=0.02
        )
        self.assertIn("ROBUST", r.floor_verdict(0.05))


if __name__ == "__main__":
    unittest.main()
