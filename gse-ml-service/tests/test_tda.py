"""Tests for app.models.tda.compute_tda_features.

Wrapped with pytest.importorskip so the suite degrades gracefully if the
heavy C-extension packages (ripser, persim) fail to install in a sandboxed
environment.
"""

from __future__ import annotations

import pytest

ripser = pytest.importorskip("ripser")
persim = pytest.importorskip("persim")

import numpy as np  # noqa: E402

from app.models.tda import TDA_FEATURE_LENGTH, compute_tda_features  # noqa: E402


def test_feature_length_is_derived_not_hardcoded():
    # pixel_size=0.1 over birth_range=(0,1) x pers_range=(0,0.5) => a 10x5
    # pixel grid => 50 flattened values. This is documented, not guessed.
    assert TDA_FEATURE_LENGTH == 50


def test_empty_frames_returns_documented_length_zero_vector():
    result = compute_tda_features([])
    assert result.shape == (TDA_FEATURE_LENGTH,)
    assert np.all(result == 0.0)


def test_all_degenerate_frames_returns_zero_vector():
    # Every frame has fewer than 3 points -> nothing usable.
    frames = [[(0.0, 0.0)], [(1.0, 1.0), (2.0, 2.0)]]
    result = compute_tda_features(frames)
    assert result.shape == (TDA_FEATURE_LENGTH,)
    assert np.all(result == 0.0)


def test_single_valid_frame_returns_finite_fixed_length_vector():
    frame = [(0.0, 0.0), (1.0, 0.0), (0.5, 0.87), (0.2, 0.4), (0.8, 0.6)]
    result = compute_tda_features([frame])
    assert result.shape == (TDA_FEATURE_LENGTH,)
    assert np.all(np.isfinite(result))


def test_mixed_valid_and_degenerate_frames_skips_degenerate_ones():
    good_frame = [(0.0, 0.0), (1.0, 0.0), (0.5, 0.87), (0.3, 0.1)]
    degenerate_frame = [(0.0, 0.0), (1.0, 1.0)]  # only 2 points
    result_mixed = compute_tda_features([good_frame, degenerate_frame])
    result_good_only = compute_tda_features([good_frame])
    assert result_mixed.shape == (TDA_FEATURE_LENGTH,)
    assert np.allclose(result_mixed, result_good_only)


def test_frame_with_non_finite_points_is_skipped():
    bad_frame = [(0.0, 0.0), (float("nan"), 1.0), (1.0, 1.0), (2.0, 2.0)]
    result = compute_tda_features([bad_frame])
    assert result.shape == (TDA_FEATURE_LENGTH,)
    assert np.all(result == 0.0)


def test_multiple_frames_average_is_finite():
    rng = np.random.default_rng(0)
    frames = []
    for _ in range(4):
        pts = rng.uniform(0, 1, size=(6, 2))
        frames.append([tuple(p) for p in pts])
    result = compute_tda_features(frames)
    assert result.shape == (TDA_FEATURE_LENGTH,)
    assert np.all(np.isfinite(result))


def test_output_is_deterministic_for_same_input():
    frame = [(0.0, 0.0), (1.0, 0.0), (0.5, 0.87), (0.3, 0.1)]
    result_a = compute_tda_features([frame])
    result_b = compute_tda_features([frame])
    assert np.allclose(result_a, result_b)
