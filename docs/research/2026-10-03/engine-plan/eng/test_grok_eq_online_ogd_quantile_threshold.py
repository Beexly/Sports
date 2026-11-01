"""Fail-closed tests for online_ogd_quantile_threshold from arXiv:2610.27740 eq (4)."""
from __future__ import annotations

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from grok_eq_online_ogd_quantile_threshold import online_ogd_quantile_threshold


def test_increase_when_residual_exceeds():
    # α=0.1, η=0.1, θ=1.0, R=2.0 → delta=0.9, next=1.09
    assert online_ogd_quantile_threshold(1.0, 2.0, 0.1, 0.1) == 1.09


def test_decrease_when_residual_below():
    # α=0.1, η=0.1, θ=1.0, R=0.5 → delta=-0.1, next=0.99
    assert abs(online_ogd_quantile_threshold(1.0, 0.5, 0.1, 0.1) - 0.99) < 1e-12


def test_floor_at_zero():
    # large negative step floors at 0
    assert online_ogd_quantile_threshold(0.01, 0.0, 0.5, 1.0) == 0.0


def test_non_finite_fails_closed():
    assert online_ogd_quantile_threshold(float("nan"), 1.0, 0.1, 0.1) is None


def test_bad_alpha_fails_closed():
    assert online_ogd_quantile_threshold(1.0, 1.0, 1.5, 0.1) is None
    assert online_ogd_quantile_threshold(1.0, 1.0, -0.1, 0.1) is None


def test_bad_eta_fails_closed():
    assert online_ogd_quantile_threshold(1.0, 1.0, 0.1, 0.0) is None
    assert online_ogd_quantile_threshold(1.0, 1.0, 0.1, -0.05) is None


def test_none_input_fails_closed():
    assert online_ogd_quantile_threshold(None, 1.0, 0.1, 0.1) is None
