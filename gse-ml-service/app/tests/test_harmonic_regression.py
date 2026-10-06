import numpy as np
import pytest

from app.models.harmonic_regression import HarmonicRegression, StackedHarmonicRegression

def test_harmonic_regression_single_period():
    """Recover single 24h period with noisy data."""
    np.random.seed(42)

    # 30 days of data, 1 hour spacing
    timestamps = np.linspace(1600000000, 1600000000 + 3600 * 24 * 30, 24 * 30)

    # Target signal: 24h period, amplitude 5
    true_period = 24
    true_period_sec = true_period * 3600
    signal = 5.0 * np.sin(2 * np.pi * timestamps / true_period_sec) + 2.0 * np.cos(2 * np.pi * timestamps / true_period_sec)

    # Add noise
    y = signal + np.random.normal(0, 0.5, len(timestamps))

    model = HarmonicRegression(period=24)
    model.fit(timestamps, y)

    # Reconstruct amplitude
    amplitude = np.sqrt(model.coef_[0]**2 + model.coef_[1]**2)
    true_amplitude = np.sqrt(5.0**2 + 2.0**2)

    assert np.isclose(amplitude, true_amplitude, rtol=0.05)


def test_harmonic_regression_gappy_series():
    """Recover from gappy series (drop 30% timestamps)."""
    np.random.seed(42)

    timestamps = np.linspace(1600000000, 1600000000 + 3600 * 24 * 30, 24 * 30)

    true_period_sec = 24 * 3600
    signal = 5.0 * np.sin(2 * np.pi * timestamps / true_period_sec) + 2.0 * np.cos(2 * np.pi * timestamps / true_period_sec)

    # Drop 30% of data randomly
    mask = np.random.rand(len(timestamps)) > 0.3
    timestamps_gappy = timestamps[mask]
    signal_gappy = signal[mask]

    y_gappy = signal_gappy + np.random.normal(0, 0.5, len(timestamps_gappy))

    model = HarmonicRegression(period=24)
    model.fit(timestamps_gappy, y_gappy)

    # Even with gaps, amplitude should be correctly recovered
    amplitude = np.sqrt(model.coef_[0]**2 + model.coef_[1]**2)
    true_amplitude = np.sqrt(5.0**2 + 2.0**2)

    assert np.isclose(amplitude, true_amplitude, rtol=0.05)


def test_stacked_harmonic_regression():
    """StackedHarmonicRegression with 24h and 168h on synthetic data."""
    np.random.seed(42)

    # 60 days of data, 1 hour spacing
    timestamps = np.linspace(1600000000, 1600000000 + 3600 * 24 * 60, 24 * 60)

    p1_sec = 24 * 3600
    p2_sec = 168 * 3600

    # 24h signal + 168h signal
    signal = (4.0 * np.sin(2 * np.pi * timestamps / p1_sec) +
              3.0 * np.cos(2 * np.pi * timestamps / p2_sec))

    y = signal + np.random.normal(0, 0.5, len(timestamps))

    model = StackedHarmonicRegression(periods=[24, 168])
    model.fit(timestamps, y)

    # Coefs are [sin_24, cos_24, sin_168, cos_168]
    amp_24 = np.sqrt(model.coef_[0]**2 + model.coef_[1]**2)
    amp_168 = np.sqrt(model.coef_[2]**2 + model.coef_[3]**2)

    # True amps: 24h is 4.0, 168h is 3.0
    assert np.isclose(amp_24, 4.0, rtol=0.05)
    assert np.isclose(amp_168, 3.0, rtol=0.05)


def test_timestamps_as_epoch_seconds():
    """Assert it takes epoch timestamps, not uniform indices."""
    np.random.seed(42)

    # Highly non-uniform spacing to prove it relies on true epoch values
    timestamps = np.array([
        1600000000,
        1600000000 + 3600*24*1.5,
        1600000000 + 3600*24*3.2,
        1600000000 + 3600*24*7.9,
        1600000000 + 3600*24*15.0
    ])

    true_period_sec = 24 * 3600
    # Clean signal on sparse non-uniform timestamps
    y = 5.0 * np.sin(2 * np.pi * timestamps / true_period_sec)

    model = HarmonicRegression(period=24)
    model.fit(timestamps, y)

    amplitude = np.sqrt(model.coef_[0]**2 + model.coef_[1]**2)

    # If it assumed uniform indices like [0, 1, 2, 3, 4], the fit would fail completely.
    # It must use the true absolute time to recover the amplitude.
    assert np.isclose(amplitude, 5.0, rtol=0.01)
