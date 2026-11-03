"""Tests for the Week 9 sealed-baseline trench adapters (EQ-NOV03-031/032).

Covers:
  - compute_pocket_voronoi_area: sector roll-up geometry, single vs multi frame,
    input validation, and hand-off into the Ibrahim survival kernel.
  - apply_sharp_pass_rush_chip_and_slide_adjustment: exact delegation to the
    Sharp protection model (no forked constants).
"""
from __future__ import annotations

import math

import pytest

from intelligence.coaching.trench_pocket_physics import (
    apply_sharp_pass_rush_chip_and_slide_adjustment,
    compute_ibrahim_voronoi_pocket_survival,
    compute_pocket_voronoi_area,
    compute_sharp_pass_rush_protection_adjustment,
)

N_BINS = 25
WEDGE = 360.0 / N_BINS


def _centres():
    return [(i + 0.5) * WEDGE for i in range(N_BINS)]


def test_sector_membership_matches_angular_geometry():
    out = compute_pocket_voronoi_area([1.0] * N_BINS)
    centres = _centres()
    expected_bs = [i for i, c in enumerate(centres) if 150.0 <= c <= 300.0]
    expected_c = [i for i, c in enumerate(centres) if 60.0 <= c <= 120.0]
    assert out["blindside_bin_indices"] == expected_bs
    assert out["center_bin_indices"] == expected_c
    # 14.4 deg wedges: 11 blindside bins, 4 centre bins.
    assert len(expected_bs) == 11
    assert len(expected_c) == 4


def test_single_frame_totals_are_exact():
    out = compute_pocket_voronoi_area([1.0] * N_BINS)
    assert out["frames"] == 1
    assert out["total_area_yd2"] == pytest.approx(25.0)
    assert out["blindside_area_yd2"] == pytest.approx(11.0)
    assert out["center_area_yd2"] == pytest.approx(4.0)
    assert out["blindside_area_yd2"] + out["center_area_yd2"] <= out["total_area_yd2"]


def test_multi_frame_series_length_and_values():
    frames = [[1.0] * N_BINS for _ in range(6)]
    frames[3] = [2.0] * N_BINS
    out = compute_pocket_voronoi_area(frames)
    assert out["frames"] == 6
    assert len(out["blindside_area_series_yd2"]) == 6
    assert out["blindside_area_series_yd2"][0] == pytest.approx(11.0)
    assert out["blindside_area_series_yd2"][3] == pytest.approx(22.0)
    assert out["total_area_series_yd2"][3] == pytest.approx(50.0)


def test_negative_areas_are_clamped_not_propagated():
    bins = [1.0] * N_BINS
    bins[0] = -5.0
    out = compute_pocket_voronoi_area(bins)
    assert out["total_area_yd2"] == pytest.approx(24.0)


def test_wrong_bin_count_raises():
    with pytest.raises(ValueError):
        compute_pocket_voronoi_area([1.0] * 24)
    with pytest.raises(ValueError):
        compute_pocket_voronoi_area([[1.0] * 24])


def test_zero_bins_raises():
    with pytest.raises(ValueError):
        compute_pocket_voronoi_area([], n_bins=0)


def test_handoff_into_ibrahim_survival_kernel():
    """The aggregation output must be directly consumable by the survival model."""
    frames = [[1.0] * N_BINS for _ in range(30)]
    agg = compute_pocket_voronoi_area(frames)
    surv = compute_ibrahim_voronoi_pocket_survival(
        blindside_voronoi_areas_yd2=agg["blindside_area_series_yd2"],
        center_voronoi_areas_yd2=agg["center_area_series_yd2"],
    )
    assert surv["frames_evaluated"] == 30
    assert 0.0 <= surv["blindside_survival_at_throw"] <= 1.0
    assert 0.0 <= surv["center_survival_at_throw"] <= 1.0
    # Centre space collapses faster than blindside in the Ibrahim model.
    assert surv["center_survival_at_throw"] <= surv["blindside_survival_at_throw"]


def test_chip_slide_alias_is_exact_delegation():
    kwargs = dict(
        raw_strain_rate=0.42,
        slide_protection_rate=0.35,
        rb_te_boink_chip_rate=0.20,
        two_man_post_double_rate=0.10,
        jump_set_rate=0.15,
        quick_release_sub2s_rate=0.25,
    )
    alias = apply_sharp_pass_rush_chip_and_slide_adjustment(**kwargs)
    direct = compute_sharp_pass_rush_protection_adjustment(**kwargs)
    assert alias == direct


def test_chip_slide_alias_defaults_are_identity():
    out = apply_sharp_pass_rush_chip_and_slide_adjustment(raw_strain_rate=0.5)
    assert out["protection_attenuation_factor"] == pytest.approx(1.0)
    assert out["effective_strain_rate"] == pytest.approx(0.5)


def test_chip_slide_alias_attenuation_is_bounded():
    out = apply_sharp_pass_rush_chip_and_slide_adjustment(
        raw_strain_rate=1.0,
        slide_protection_rate=1.0,
        rb_te_boink_chip_rate=1.0,
        two_man_post_double_rate=1.0,
        jump_set_rate=1.0,
        quick_release_sub2s_rate=1.0,
    )
    assert 0.30 <= out["protection_attenuation_factor"] <= 1.0
    assert out["effective_strain_rate"] <= 1.0
