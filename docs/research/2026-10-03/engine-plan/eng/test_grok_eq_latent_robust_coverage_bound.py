"""Fail-closed tests for latent_robust_coverage_bound from arXiv:2610.28937 Theorem 4.2."""
from __future__ import annotations

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from grok_eq_latent_robust_coverage_bound import latent_robust_coverage_bound


def test_basic_bound():
    result = latent_robust_coverage_bound(0.1, 0.05)
    assert result == 0.85


def test_zero_levels():
    result = latent_robust_coverage_bound(0.0, 0.0)
    assert result == 1.0


def test_negative_fails_closed():
    assert latent_robust_coverage_bound(-0.01, 0.1) is None
    assert latent_robust_coverage_bound(0.1, -0.01) is None


def test_too_large_fails_closed():
    assert latent_robust_coverage_bound(0.6, 0.5) is None
    assert latent_robust_coverage_bound(1.0, 0.0) is None
    assert latent_robust_coverage_bound(0.0, 1.0) is None


def test_non_finite_fails_closed():
    assert latent_robust_coverage_bound(float("nan"), 0.1) is None
    assert latent_robust_coverage_bound(0.1, float("inf")) is None
    assert latent_robust_coverage_bound(None, 0.1) is None


def test_sum_exactly_one_fails_closed():
    assert latent_robust_coverage_bound(0.5, 0.5) is None
