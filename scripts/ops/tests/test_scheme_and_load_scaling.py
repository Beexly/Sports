"""
Tests for load_scaling.py and engine_reverse.py.

Covers:
  - effective_competitors (including empty, non-positive degeneracy, [0.2]*5 -> 5.0)
  - scale_concentration_n_eff (including zero-vector degeneracy, target scaling, sum to 1.0)
  - fit_book_pricing_kernel (including multiplicative de-vigging, normal CDF fit, and edge cases)
"""

import math
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from engine_reverse import fit_book_pricing_kernel
from load_scaling import effective_competitors, scale_concentration_n_eff


# --------------------------------------------------------------------------- #
# effective_competitors tests
# --------------------------------------------------------------------------- #


def test_effective_competitors_empty_and_degeneracy():
    assert effective_competitors([]) == 1.0
    assert effective_competitors([0.0, 0.0, -1.0]) == 1.0
    assert effective_competitors([1.0]) == 1.0


def test_effective_competitors_uniform_five():
    shares = [0.2, 0.2, 0.2, 0.2, 0.2]
    assert effective_competitors(shares) == pytest.approx(5.0)


def test_effective_competitors_skewed_and_unnormalized():
    # Two equal competitors
    assert effective_competitors([0.5, 0.5]) == pytest.approx(2.0)
    # Unnormalized inputs are normalized to positive sum
    assert effective_competitors([2.0, 2.0]) == pytest.approx(2.0)
    # [0.4, 0.3, 0.2, 0.1] -> HHI = 0.16 + 0.09 + 0.04 + 0.01 = 0.30 -> N_eff = 3.3333...
    assert effective_competitors([0.4, 0.3, 0.2, 0.1]) == pytest.approx(1.0 / 0.30)


# --------------------------------------------------------------------------- #
# scale_concentration_n_eff tests
# --------------------------------------------------------------------------- #


def test_scale_concentration_zero_vector_degeneracy():
    zeros = [0.0, 0.0, 0.0, 0.0, 0.0]
    out = scale_concentration_n_eff(zeros, 3.0)
    assert len(out) == 5
    assert sum(out) == pytest.approx(1.0)
    assert all(x == pytest.approx(0.2) for x in out)

    empty = scale_concentration_n_eff([], 2.0)
    assert empty == []


def test_scale_concentration_uniform_five_to_target():
    shares = [0.2, 0.2, 0.2, 0.2, 0.2]
    # Scaling to identical target returns the same distribution
    out_same = scale_concentration_n_eff(shares, 5.0)
    assert sum(out_same) == pytest.approx(1.0)
    assert effective_competitors(out_same) == pytest.approx(5.0)

    # Scaling down to 2.5 concentrates the distribution
    out_concentrated = scale_concentration_n_eff(shares, 2.5)
    assert sum(out_concentrated) == pytest.approx(1.0)
    assert all(x >= 0.0 for x in out_concentrated)
    assert effective_competitors(out_concentrated) == pytest.approx(2.5, abs=1e-4)


def test_scale_concentration_disperse_and_concentrate():
    # Disperse: start concentrated, scale towards uniform
    initial = [0.6, 0.2, 0.1, 0.1]
    curr_n = effective_competitors(initial)
    target_disperse = 3.5
    assert target_disperse > curr_n

    out_disperse = scale_concentration_n_eff(initial, target_disperse)
    assert sum(out_disperse) == pytest.approx(1.0)
    assert all(x >= 0.0 for x in out_disperse)
    assert effective_competitors(out_disperse) == pytest.approx(target_disperse, abs=1e-4)

    # Concentrate: start dispersed, scale down
    target_conc = 1.8
    out_conc = scale_concentration_n_eff(initial, target_conc)
    assert sum(out_conc) == pytest.approx(1.0)
    assert all(x >= 0.0 for x in out_conc)
    assert effective_competitors(out_conc) == pytest.approx(target_conc, abs=1e-3)


def test_scale_concentration_clamping():
    shares = [0.4, 0.3, 0.2, 0.1]
    # Target > n -> clamped to n (uniform)
    out_high = scale_concentration_n_eff(shares, 10.0)
    assert sum(out_high) == pytest.approx(1.0)
    assert effective_competitors(out_high) == pytest.approx(4.0)

    # Target < 1.0 -> clamped to 1.0
    out_low = scale_concentration_n_eff(shares, 0.5)
    assert sum(out_low) == pytest.approx(1.0)
    assert effective_competitors(out_low) == pytest.approx(1.0, abs=0.05)


# --------------------------------------------------------------------------- #
# fit_book_pricing_kernel tests
# --------------------------------------------------------------------------- #


def test_fit_book_pricing_kernel_synthetic_ladder():
    # Synthetic NFL total market around mu = 47.5, sigma = 13.5
    mu_true = 47.5
    sigma_true = 13.5
    rungs = []
    lines = [41.5, 43.5, 45.5, 47.5, 49.5, 51.5, 53.5]

    for line in lines:
        z = (mu_true - line) / sigma_true
        p_over = 0.5 * (1.0 + math.erf(z / math.sqrt(2)))
        p_under = 1.0 - p_over
        # Add book vig
        p_o_vig = p_over * 1.025
        p_u_vig = p_under * 1.025
        to_am = (
            lambda p: int(round(-100.0 * p / (1.0 - p)))
            if p >= 0.5
            else int(round(100.0 * (1.0 - p) / p))
        )
        rungs.append((line, to_am(p_o_vig), to_am(p_u_vig)))

    kernel = fit_book_pricing_kernel(rungs)

    assert "mu" in kernel
    assert "sigma" in kernel
    assert "rmse" in kernel
    assert kernel["mu"] == pytest.approx(mu_true, abs=0.1)
    assert kernel["sigma"] == pytest.approx(sigma_true, abs=0.3)
    assert kernel["rmse"] < 0.01


def test_fit_book_pricing_kernel_degeneracy():
    # Empty ladder
    empty = fit_book_pricing_kernel([])
    assert math.isnan(empty["mu"])

    # Single rung
    single = fit_book_pricing_kernel([(47.5, -110, -110)])
    assert math.isnan(single["mu"])

    # Flat ladder
    flat = fit_book_pricing_kernel([(45.0, -110, -110), (47.0, -110, -110)])
    assert flat["sigma"] >= 10.0
