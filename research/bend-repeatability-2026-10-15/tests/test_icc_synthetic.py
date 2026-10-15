"""Estimator proof on synthetic ground truth. The ICC estimator must
recover known ICCs (0.3 / 0.6 / 0.85) and its 95% CI must cover the truth
at roughly nominal rate BEFORE any real-data number is quoted.

Simulation model (two-way random effects, matching ICC(2,1)'s model):
    X_ij = mu + a_i + c_j + e_ij,
    a_i ~ N(0, s2a), c_j ~ N(0, s2c), e_ij ~ N(0, s2e),
    true ICC(2,1) = s2a / (s2a + s2c + s2e).
"""
import sys
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from icc import icc_2_1, reps_needed, split_half_sb          # noqa: E402
from bend_reps import centripetal_series, segment_play       # noqa: E402

RNG = np.random.default_rng(20261015)


def simulate(n=80, k=2, icc_true=0.6, s2c_frac=0.25, rng=None):
    rng = rng or RNG
    s2a = icc_true
    rest = 1.0 - icc_true
    s2c, s2e = rest * s2c_frac, rest * (1 - s2c_frac)
    a = rng.normal(0, np.sqrt(s2a), size=(n, 1))
    c = rng.normal(0, np.sqrt(s2c), size=(1, k))
    e = rng.normal(0, np.sqrt(s2e), size=(n, k))
    return 10.0 + a + c + e


@pytest.mark.parametrize("icc_true", [0.3, 0.6, 0.85])
def test_icc_recovers_known_values(icc_true):
    ests, covers = [], 0
    reps = 150
    for _ in range(reps):
        out = icc_2_1(simulate(n=80, k=2, icc_true=icc_true), n_boot=800)
        ests.append(out["icc"])
        covers += out["ci_lo"] <= icc_true <= out["ci_hi"]
    mean_est = float(np.mean(ests))
    coverage = covers / reps
    print(f"ICC true={icc_true}: mean est={mean_est:.3f}, 95% CI coverage={coverage:.2f}")
    assert abs(mean_est - icc_true) < 0.05, f"bias too large: {mean_est} vs {icc_true}"
    assert 0.86 <= coverage <= 1.0, f"CI coverage off nominal: {coverage}"


def test_icc_k4_occasions():
    out = icc_2_1(simulate(n=60, k=4, icc_true=0.6))
    assert abs(out["icc"] - 0.6) < 0.15


def test_icc_rejects_bad_input():
    with pytest.raises(ValueError):
        icc_2_1(np.array([[1.0, np.nan], [2.0, 3.0], [4.0, 5.0]]))
    with pytest.raises(ValueError):
        icc_2_1(np.ones((2, 2)))


def test_spearman_brown_and_reps_needed():
    # SB prophecy identity: k reps of r=0.5 -> 2*0.5/1.5 = 0.667
    assert reps_needed(0.5, 2 * 0.5 / 1.5) == pytest.approx(2.0, abs=1e-6)
    # r=0.5 to reach 0.80: k = 0.8*0.5/(0.5*0.2) = 4
    assert reps_needed(0.5, 0.80) == pytest.approx(4.0, abs=1e-6)
    sh = split_half_sb(np.arange(10.0), np.arange(10.0) + 0.01 * np.sin(np.arange(10.0)))
    assert sh["r_spearman_brown"] > 0.99


def test_centripetal_on_known_arc():
    """Synthetic constant-radius arc at constant speed: ac = s * omega
    with omega = s / R (v^2/R centripetal, s in yd/s). Recovered peak
    (interior frames) must match v^2/R within tolerance."""
    R, v = 8.0, 6.0                       # yd, yd/s
    t = np.arange(0, 3.0, 0.1)
    th = v * t / R
    x, y = R * np.sin(th), R * (1 - np.cos(th))
    s = np.full_like(t, v)
    ac = centripetal_series(x, y, s)
    expected = v * v / R                  # 4.5 yd/s^2
    interior = ac[3:-3]
    assert np.median(interior) == pytest.approx(expected, rel=0.05)


def test_segmenter_finds_planted_bend():
    """Straight-line frames (ac~0) with a planted 1 s arc in the middle:
    exactly one segment, not touching the edge guards."""
    R, v = 6.0, 6.0
    straight = np.zeros((30, 2))
    straight[:, 0] = np.arange(30) * v * 0.1
    th = v * np.arange(1, 11) * 0.1 / R
    arc = np.column_stack([30 * v * 0.1 + R * np.sin(th), R * (1 - np.cos(th))])
    th_end = th[-1]
    tangent = np.array([np.cos(th_end), np.sin(th_end)])   # arc exit heading
    tail = arc[-1] + np.outer(np.arange(1, 31) * v * 0.1, tangent)
    path = np.vstack([straight, arc, tail])
    s = np.full(len(path), v)
    ac = centripetal_series(path[:, 0], path[:, 1], s)
    thr = np.percentile(ac, 75)
    segs = segment_play(ac, np.arange(1, len(path) + 1), thr)
    assert len(segs) == 1
    assert segs[0]["ac_peak"] == pytest.approx(v * v / R, rel=0.15)
