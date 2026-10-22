"""Pinhole Jacobian, InSituMeasure gate, and BDB 2027 10 Hz kinematic proxies."""

import pytest

from vision.bdb2027_kinematics import (
    allen_relation,
    compute_biomechanical_load_hazard,
    compute_cod_curvature_retention,
    compute_decel_reaccel_asymmetry,
    compute_first_step_burst_latency,
    compute_kinematic_derivatives_10hz,
    evaluate_itl_complex_event,
    Interval,
)
from vision.pinhole_jacobian import image_jacobian_2x3, insitu_measure_gate, project_pinhole


I3 = ((1.0, 0.0, 0.0), (0.0, 1.0, 0.0), (0.0, 0.0, 1.0))
K = ((100.0, 0.0, 320.0), (0.0, 80.0, 240.0), (0.0, 0.0, 1.0))
T = (0.0, 0.0, 0.0)


def test_optical_axis_projects_to_principal_point():
    u, v, z = project_pinhole((0.0, 0.0, 10.0), K, I3, T)
    assert abs(u - 320.0) < 1e-9
    assert abs(v - 240.0) < 1e-9
    assert abs(z - 10.0) < 1e-9


def test_jacobian_on_optical_axis():
    j = image_jacobian_2x3((0.0, 0.0, 10.0), K, I3, T)
    assert j is not None
    assert abs(j[0][0] - 10.0) < 1e-9
    assert abs(j[1][1] - 8.0) < 1e-9
    assert abs(j[0][2]) < 1e-9


def test_gate_rejects_behind_camera_and_occlusion():
    behind = insitu_measure_gate((0.0, 0.0, -1.0), K, I3, T, 0.0)
    assert behind["accept"] is False and behind["reason"] == "behind-camera"
    occ = insitu_measure_gate((0.0, 0.0, 10.0), K, I3, T, 0.5)
    assert occ["accept"] is False and occ["reason"] == "occluded"
    ok = insitu_measure_gate((0.0, 0.0, 10.0), K, I3, T, 0.1)
    assert ok["accept"] is True


def test_constant_velocity_10hz():
    xs = [0.0, 1.0, 2.0, 3.0]
    ys = [0.0, 0.0, 0.0, 0.0]
    d = compute_kinematic_derivatives_10hz(xs, ys)
    assert d["vx"] == [10.0, 10.0, 10.0]
    assert d["ax"] == [0.0, 0.0]


def test_drai_and_burst_and_load():
    speed = [0.0, 1.0, 0.0, 2.0]
    drai = compute_decel_reaccel_asymmetry(speed)
    assert drai is not None and abs(drai - 2.0) < 1e-9
    assert compute_first_step_burst_latency(speed, threshold=2.0) == pytest.approx(0.3)
    assert compute_biomechanical_load_hazard([0.0, 0.0]) == 0.0
    assert compute_decel_reaccel_asymmetry([1.0, 1.0, 1.0]) is None


def test_straight_track_has_no_curvature_retention():
    xs = [float(i) for i in range(6)]
    ys = [0.0] * 6
    assert compute_cod_curvature_retention(xs, ys) is None


def test_allen_relations():
    assert allen_relation(Interval(0, 1), Interval(1, 2)) == "meets"
    assert allen_relation(Interval(0, 1), Interval(2, 3)) == "before"
    assert allen_relation(Interval(1, 2), Interval(0, 3)) == "during"
    assert allen_relation(Interval(0, 2), Interval(1, 3)) == "overlaps"
    assert evaluate_itl_complex_event([Interval(0, 1), Interval(1, 2)], "meets") is True
    assert evaluate_itl_complex_event([Interval(0, 1)], "meets") is False
