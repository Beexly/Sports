import numpy as np
import pytest

from ..yardstick import (
    average_attempts,
    back_extrapolate_onset,
    center_within_group,
    partial_corr,
    prepare_attempt,
    speed_series,
    window_metrics,
)


def _const_accel_track(a=4.0, dur=1.5, hz=10.0):
    t = np.arange(0, dur + 1e-9, 1.0 / hz)
    x = 0.5 * a * t**2
    y = np.zeros_like(t)
    return t, x, y


def test_window_metrics_constant_acceleration():
    t, x, y = _const_accel_track()
    m = window_metrics(t, x, y)
    # distance 0.5*a*t^2: 1 yd at t = sqrt(2/4) = 0.707 s; speed at 1 s = 4 yd/s
    assert m["t_d1"] == pytest.approx(0.707, abs=0.08)
    assert m["s_10"] == pytest.approx(4.0, abs=0.45)
    assert m["depth_10"] == pytest.approx(2.0, abs=0.25)
    assert m["lat_abs_10"] == pytest.approx(0.0, abs=1e-6)


def test_onset_back_extrapolation_recovers_shift():
    # Simulate a recording that starts 0.3 s after movement onset.
    a = 4.0
    t_full = np.arange(0, 2.0, 0.1)
    x_full = 0.5 * a * t_full**2
    start = 3  # first recorded frame at t = 0.3 s, speed = 1.2 yd/s
    t, x, y = t_full[start:], x_full[start:], np.zeros_like(x_full[start:])
    shift, valid = back_extrapolate_onset(t - t[0], x, y)
    assert valid
    assert shift == pytest.approx(0.3, abs=0.15)


def test_onset_excludes_unusable_attempt():
    t = np.arange(0, 1.0, 0.1)
    x = 3.0 * t  # first frame already at 3 yd/s
    _, valid = back_extrapolate_onset(t, x, np.zeros_like(t))
    assert not valid
    metrics, ok = prepare_attempt(t, 3.0 * t, np.zeros_like(t))
    assert not ok and metrics == {}


def test_average_attempts_is_side_average():
    a = {"depth_10": 2.0, "s_10": 4.0}
    b = {"depth_10": 3.0, "s_10": 5.0}
    out = average_attempts([a, b])
    assert out["depth_10"] == 2.5 and out["s_10"] == 4.5


def test_center_within_group():
    vals = np.array([1.0, 3.0, 10.0, 14.0])
    groups = np.array(["2023", "2023", "2024", "2024"])
    out = center_within_group(vals, groups)
    assert np.allclose(out, [-1.0, 1.0, -2.0, 2.0])


def test_partial_corr_removes_confound():
    rng = np.random.default_rng(7)
    n = 300
    z = rng.normal(size=n)
    x = z + rng.normal(scale=0.3, size=n)
    y = z + rng.normal(scale=0.3, size=n)  # y related to x only through z
    r_raw = np.corrcoef(x, y)[0, 1]
    r, lo, hi = partial_corr(x, y, z, n_boot=100, seed=1)
    assert r_raw > 0.7
    assert abs(r) < 0.2 and lo < 0 < hi


def test_partial_corr_detects_direct_effect():
    rng = np.random.default_rng(3)
    n = 300
    z = rng.normal(size=n)
    x = rng.normal(size=n)
    y = 0.8 * x + 0.3 * z + rng.normal(scale=0.4, size=n)
    r, lo, _ = partial_corr(x, y, z, n_boot=100, seed=1)
    assert r > 0.6 and lo > 0.3
