"""Tests for route geometry, ball flight and QB load.

The ball-metric tests exist specifically to kill a fabrication: derive_ball_metrics
used to return 18.4 / 12.1 for every input while labelling itself computed. A
regression test that only checks key presence would have passed that. These check
that different inputs produce different, arithmetically correct answers.
"""

from __future__ import annotations

import math

import numpy as np
import pytest

from intelligence.vision import ball_tracklet as bt
from intelligence.vision import route_geometry as rg
from intelligence.coaching import qb_visual_cognitive_load as qbl


# ---------------------------------------------------------------------------
# Bézier
# ---------------------------------------------------------------------------
def test_bezier_fit_reproduces_straight_line():
    traj = np.column_stack([np.linspace(0, 10, 20), np.zeros(20)])
    ctrl = rg.fit_bezier_control_points(traj, n_ctrl=5)
    assert ctrl.shape == (5, 2)
    curve = rg.bezier_eval(ctrl, n=20)
    # ridges in the normal equations put endpoint recovery at ~1e-6, so 1e-6
    # is below the solver's own error floor
    assert curve[0] == pytest.approx(traj[0], abs=1e-5)
    assert curve[-1] == pytest.approx(traj[-1], abs=1e-5)
    # a straight line must stay straight: no lateral wander introduced
    assert np.allclose(curve[:, 1], 0.0, atol=1e-5)


def test_signature_is_translation_invariant():
    rng = np.random.default_rng(0)
    base = np.cumsum(rng.normal(size=(25, 2)) * 0.4, axis=0)
    shifted = base + np.array([37.0, -12.0])
    a = rg.route_signature(base)
    b = rg.route_signature(shifted)
    assert np.allclose(a, b, atol=1e-6)


def test_fit_rejects_bad_shape():
    with pytest.raises(ValueError):
        rg.fit_bezier_control_points(np.zeros((10, 3)))


def test_em_clustering_separates_two_route_shapes():
    n = 14
    t = np.linspace(0, 1, 20)
    # shape A: straight vertical stem
    a = [np.column_stack([np.zeros(20), 12 * t]) + np.random.default_rng(i).normal(0, 0.05, (20, 2))
         for i in range(n)]
    # shape B: sharp horizontal break
    b = [np.column_stack([12 * t, np.zeros(20)]) + np.random.default_rng(100 + i).normal(0, 0.05, (20, 2))
         for i in range(n)]
    res = rg.em_cluster_routes(a + b, n_clusters=2, max_iter=60)
    truth = ["A"] * n + ["B"] * n
    purity = rg.cluster_purity(res["labels"], truth)
    assert purity >= 0.95, f"clusters failed to separate route shapes (purity={purity})"
    assert len(res["loglik_trace"]) >= 2


def test_em_clustering_empty_raises():
    with pytest.raises(ValueError):
        rg.em_cluster_routes([])


# ---------------------------------------------------------------------------
# ball metrics -- the anti-fabrication tests
# ---------------------------------------------------------------------------
def test_ball_metrics_are_computed_not_constant():
    straight = bt.Tracklet("b1", "football", [(0, 0), (1, 0), (2, 0), (3, 0)])
    short = bt.Tracklet("b2", "football", [(0, 0), (0.5, 0)])
    m1 = bt.derive_ball_metrics(straight, dt=0.1)
    m2 = bt.derive_ball_metrics(short, dt=0.1)
    assert m1["distance_m"] == pytest.approx(3.0, abs=1e-6)
    assert m2["distance_m"] == pytest.approx(0.5, abs=1e-6)
    assert m1["distance_m"] != m2["distance_m"]
    assert m1["top_speed_ms"] == pytest.approx(10.0, abs=1e-6)
    # the old placeholder values must be gone
    assert not (m1["distance_m"] == 18.4 and m1["top_speed_ms"] == 12.1)


def test_ball_metrics_insufficient_points():
    m = bt.derive_ball_metrics(bt.Tracklet("b", "football", [(1, 1)]))
    assert m["honesty"] == "insufficient_points"
    assert m["distance_m"] == 0.0


def test_ball_metrics_detects_deceleration():
    # spacing shrinks each step -> slowing
    pts = [(0, 0), (2, 0), (3.5, 0), (4.5, 0), (5.2, 0)]
    m = bt.derive_ball_metrics(bt.Tracklet("b", "football", pts), dt=0.1)
    assert m["accel_ms2"] is not None and m["accel_ms2"] < 0
    assert m["drag_decel_ms2"] > 0


# ---------------------------------------------------------------------------
# 6-DOF flight model
# ---------------------------------------------------------------------------
def test_ball_constants_match_published_values():
    assert bt.BALL_MASS_KG == pytest.approx(0.415)
    assert bt.BALL_R_LONG_M == pytest.approx(0.14)
    assert bt.BALL_AREA_M2 == pytest.approx(math.pi * 0.14 * 0.0857, rel=1e-9)


def test_flight_drag_reduces_carry_versus_vacuum():
    r = bt.simulate_football_trajectory_3d(25.0, 35.0)
    assert r["aerodynamic_drag_loss_m"] > 0
    assert r["carry_distance_m"] < r["vacuum_carry_m"]
    # 25 m/s at 35 deg is a 2.9 s ball in vacuum; drag pulls it under that.
    # The assertion is that drag shortens hang time, not a guessed absolute.
    vacuum_hang = 2 * (25.0 * math.sin(math.radians(35.0))) / 9.80665
    assert 1.5 < r["hang_time_s"] < vacuum_hang
    assert r["carry_distance_m"] > 20.0


def test_higher_speed_carries_further():
    slow = bt.simulate_football_trajectory_3d(18.0, 30.0)
    fast = bt.simulate_football_trajectory_3d(30.0, 30.0)
    assert fast["carry_distance_m"] > slow["carry_distance_m"]


def test_spin_produces_lateral_drift_and_no_spin_does_not():
    # Straight-downfield launch (azimuth 0): any lateral motion is purely Magnus.
    # With an azimuth the geometric lateral component swamps it and the test
    # would be measuring the launch angle instead of the spin.
    spin = bt.simulate_football_trajectory_3d(25.0, 30.0, azimuth_deg=0.0, spin_rpm=600.0)
    dead = bt.simulate_football_trajectory_3d(25.0, 30.0, azimuth_deg=0.0, spin_rpm=0.0)
    assert abs(dead["lateral_drift_m"]) < 1e-6
    assert abs(spin["lateral_drift_m"]) > 1e-3


def test_flight_rejects_impossible_input():
    with pytest.raises(ValueError):
        bt.simulate_football_trajectory_3d(0.0, 30.0)
    with pytest.raises(ValueError):
        bt.simulate_football_trajectory_3d(20.0, 95.0)


# ---------------------------------------------------------------------------
# QB load
# ---------------------------------------------------------------------------
def test_qb_load_increases_with_disguise():
    lo = qbl.compute_qb_visual_cognitive_load(3, 0.0, 6.0, 2.0, 2.0)
    hi = qbl.compute_qb_visual_cognitive_load(3, 1.0, 6.0, 2.0, 2.0)
    assert hi["visual_cognitive_load_index"] > lo["visual_cognitive_load_index"]


def test_qb_load_increases_with_target_overload():
    base = qbl.compute_qb_visual_cognitive_load(4, 0.5, 6.0, 3.0, 2.0)
    over = qbl.compute_qb_visual_cognitive_load(7, 0.5, 6.0, 3.0, 2.0)
    assert over["components"]["targets_over_capacity"] == 3.0
    assert over["visual_cognitive_load_index"] > base["visual_cognitive_load_index"]


def test_qb_load_bounded_and_declares_assumptions():
    r = qbl.compute_qb_visual_cognitive_load(12, 1.0, 0.0, 20.0, 0.05)
    assert 0.0 <= r["visual_cognitive_load_index"] <= 1.0
    assert r["assumptions"]["status"].startswith("ASSUMED")
    assert r["interpretation"].startswith("not a probability")


def test_qb_load_rejects_out_of_range_inputs():
    with pytest.raises(ValueError):
        qbl.compute_qb_visual_cognitive_load(-1, 0.5, 6.0, 3.0, 2.0)
    with pytest.raises(ValueError):
        qbl.compute_qb_visual_cognitive_load(3, 1.5, 6.0, 3.0, 2.0)
