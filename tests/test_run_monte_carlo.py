"""Unit tests for LogNormalLeg in intelligence/colab/run_monte_carlo.py."""

from __future__ import annotations

import math
import numpy as np
import pytest

from intelligence.colab.run_monte_carlo import LogNormalLeg


class TestLogNormalLegInitialization:
    """Tests for LogNormalLeg initialization and attribute calculations."""

    def test_kind_attribute(self):
        leg = LogNormalLeg(mean=100.0, sd=20.0)
        assert leg.kind == "lognormal"

    def test_attributes_calculation(self):
        mean = 245.5
        sd = 42.0
        leg = LogNormalLeg(mean=mean, sd=sd)

        assert leg.mean == 245.5
        assert leg.sd == 42.0

        expected_sigma2 = math.log1p((sd / mean) ** 2)
        expected_sigma = math.sqrt(expected_sigma2)
        expected_mu = math.log(mean) - 0.5 * expected_sigma2

        assert math.isclose(leg.sigma2, expected_sigma2, rel_tol=1e-12)
        assert math.isclose(leg.sigma, expected_sigma, rel_tol=1e-12)
        assert math.isclose(leg.mu, expected_mu, rel_tol=1e-12)

    def test_type_coercion_to_float(self):
        leg = LogNormalLeg(mean=100, sd=25)
        assert isinstance(leg.mean, float)
        assert isinstance(leg.sd, float)
        assert isinstance(leg.sigma2, float)
        assert isinstance(leg.sigma, float)
        assert isinstance(leg.mu, float)
        assert leg.mean == 100.0
        assert leg.sd == 25.0


class TestLogNormalLegValidation:
    """Tests for parameter validation in LogNormalLeg."""

    @pytest.mark.parametrize(
        "mean, sd",
        [
            (0.0, 10.0),
            (-1.0, 10.0),
            (-100.0, 10.0),
            (100.0, 0.0),
            (100.0, -1.0),
            (100.0, -50.0),
            (0.0, 0.0),
            (-5.0, -5.0),
        ],
    )
    def test_invalid_parameters_raise_value_error(self, mean, sd):
        with pytest.raises(ValueError, match="lognormal needs mean > 0 and sd > 0"):
            LogNormalLeg(mean=mean, sd=sd)


class TestLogNormalLegImpliedVariance:
    """Tests for implied_variance method of LogNormalLeg."""

    @pytest.mark.parametrize(
        "mean, sd",
        [
            (50.0, 10.0),
            (74.5, 25.0),
            (245.5, 42.0),
            (1000.0, 150.0),
            (1.5, 0.5),
        ],
    )
    def test_implied_variance_matches_sd_squared(self, mean, sd):
        leg = LogNormalLeg(mean=mean, sd=sd)
        expected_variance = sd ** 2
        assert math.isclose(leg.implied_variance(), expected_variance, rel_tol=1e-9)


class TestLogNormalLegQuantile:
    """Tests for quantile mapping of LogNormalLeg."""

    def test_quantile_median(self):
        """For log-normal, quantile(0.5) should equal the theoretical median exp(mu)."""
        leg = LogNormalLeg(mean=200.0, sd=50.0)
        median = leg.quantile(0.5)
        expected_median = math.exp(leg.mu)
        assert math.isclose(float(median), expected_median, rel_tol=1e-7)

    def test_quantile_monotonic_increasing(self):
        """Quantile function must be strictly increasing on (0, 1)."""
        leg = LogNormalLeg(mean=150.0, sd=30.0)
        u = np.linspace(0.01, 0.99, 100)
        q = leg.quantile(u)
        assert np.all(np.diff(q) > 0)

    def test_quantile_array_shapes(self):
        """Quantile should support scalars, 1D arrays, and 2D arrays preserving shape."""
        leg = LogNormalLeg(mean=100.0, sd=20.0)

        # 1D array
        u_1d = np.array([0.1, 0.5, 0.9])
        q_1d = leg.quantile(u_1d)
        assert q_1d.shape == (3,)

        # 2D array
        u_2d = np.array([[0.1, 0.2], [0.8, 0.9]])
        q_2d = leg.quantile(u_2d)
        assert q_2d.shape == (2, 2)

    def test_quantile_boundary_probabilities(self):
        """Values near 0 and 1 should be finite, positive, and ordered."""
        leg = LogNormalLeg(mean=100.0, sd=20.0)
        u = np.array([1e-10, 0.5, 1.0 - 1e-10])
        q = leg.quantile(u)
        assert np.all(np.isfinite(q))
        assert np.all(q > 0.0)
        assert q[0] < q[1] < q[2]


class TestLogNormalLegStatisticalProperties:
    """Empirical statistical recovery tests for LogNormalLeg."""

    def test_monte_carlo_mean_and_sd_recovery(self):
        """Sampling uniforms and evaluating quantile reproduces mean and sd."""
        mean = 245.5
        sd = 42.0
        leg = LogNormalLeg(mean=mean, sd=sd)

        # Uniform grid / quasi-Monte Carlo or large random sample
        rng = np.random.default_rng(42)
        n_samples = 500_000
        u = rng.uniform(0.0, 1.0, size=n_samples)
        samples = leg.quantile(u)

        sample_mean = float(np.mean(samples))
        sample_sd = float(np.std(samples, ddof=1))

        # Within 0.5% relative error for 500,000 draws
        assert math.isclose(sample_mean, mean, rel_tol=5e-3)
        assert math.isclose(sample_sd, sd, rel_tol=1e-2)
