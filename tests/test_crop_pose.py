"""Tests for the crop-pose pipeline in intelligence/vision/broadcast_cv.py.

Pure functions only — no model loading, no network, no image files.
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from intelligence.vision import broadcast_cv as cv


def _kp(shoulder_w: float = 40.0, ankle_y: float = 200.0) -> np.ndarray:
    """Build a plausible 17x3 keypoint array with a known shoulder width."""
    kp = np.zeros((17, 3), dtype=np.float32)
    # shoulders
    kp[5] = [100.0, 100.0, 0.9]
    kp[6] = [100.0 + shoulder_w, 100.0, 0.9]
    # hips
    kp[11] = [105.0, 140.0, 0.9]
    kp[12] = [100.0 + shoulder_w - 5.0, 140.0, 0.9]
    # knees
    kp[13] = [105.0, 170.0, 0.9]
    kp[14] = [100.0 + shoulder_w - 5.0, 170.0, 0.9]
    # ankles
    kp[15] = [105.0, ankle_y, 0.9]
    kp[16] = [100.0 + shoulder_w - 5.0, ankle_y, 0.9]
    # elbows / wrists
    kp[7] = [95.0, 120.0, 0.9]
    kp[8] = [100.0 + shoulder_w + 5.0, 120.0, 0.9]
    kp[9] = [95.0, 140.0, 0.9]
    kp[10] = [100.0 + shoulder_w + 5.0, 140.0, 0.9]
    return kp


def _box(x1=80.0, y1=80.0, x2=160.0, y2=210.0) -> dict:
    return {"x1": x1, "y1": y1, "x2": x2, "y2": y2,
            "cx": (x1 + x2) / 2, "cy": (y1 + y2) / 2,
            "conf": 0.9, "role": "player", "role_side": "unknown"}


# -- constants -------------------------------------------------------------

def test_limb_segments_and_priors_agree():
    assert set(cv.LIMB_SEGMENTS) == set(cv.LIMB_PRIORS)
    for name, (a, b) in cv.LIMB_SEGMENTS.items():
        assert 0 <= a < 17 and 0 <= b < 17
        assert cv.LIMB_PRIORS[name] > 0


# -- _crop_with_pad --------------------------------------------------------

def test_crop_with_pad_returns_offsets():
    img = np.zeros((300, 300, 3), dtype=np.uint8)
    crop, x_off, y_off = cv._crop_with_pad(img, _box(), pad=0.1)
    assert crop is not None
    assert x_off == 72 and y_off == 67  # 80 - 0.1*80, 80 - 0.1*130
    assert crop.shape[0] > 0 and crop.shape[1] > 0


def test_crop_with_pad_rejects_tiny_box():
    img = np.zeros((300, 300, 3), dtype=np.uint8)
    tiny = _box(10, 10, 12, 12)
    crop, _, _ = cv._crop_with_pad(img, tiny, pad=0.0)
    assert crop is None


# -- _footpoint ------------------------------------------------------------

def test_footpoint_uses_ankle_midpoint():
    kp = _kp()
    fp = cv._footpoint(kp)
    assert fp is not None
    assert fp[0] == pytest.approx((105.0 + 135.0) / 2)
    assert fp[1] == pytest.approx(200.0)


def test_footpoint_falls_back_to_lowest_confident():
    kp = _kp()
    kp[15, 2] = 0.0  # left ankle unconfident
    kp[16, 2] = 0.0  # right ankle unconfident
    fp = cv._footpoint(kp)
    assert fp is not None
    # lowest confident keypoint is a knee at y=170
    assert fp[1] == pytest.approx(170.0)


def test_footpoint_none_when_no_confident_keypoints():
    kp = np.zeros((17, 3), dtype=np.float32)
    assert cv._footpoint(kp) is None


# -- assign_poses_to_players ----------------------------------------------

def test_assign_matches_nearest_footpoint():
    players = [_box(80, 80, 160, 210), _box(300, 80, 380, 210)]
    pose_a = {"keypoints": _kp(ankle_y=210.0)}  # footpoint x=120, y=210
    pose_b = {"keypoints": _kp(ankle_y=210.0)}
    pose_b["keypoints"][:, 0] += 220  # shift to x=340
    assigned = cv.assign_poses_to_players(players, [pose_a, pose_b])
    assert assigned[0] is pose_a
    assert assigned[1] is pose_b


def test_assign_drops_far_pose():
    players = [_box(80, 80, 160, 210)]
    far = {"keypoints": _kp(ankle_y=210.0)}
    far["keypoints"][:, 0] += 500  # footpoint far from any box
    assigned = cv.assign_poses_to_players(players, [far], max_dist_px=60)
    assert assigned[0] is None


def test_assign_handles_empty_players():
    assert cv.assign_poses_to_players([], []) == []


# -- repair_foreshortened_limbs -------------------------------------------

def test_repair_flags_compressed_limb():
    kp = _kp(shoulder_w=40.0)
    # Compress the left shin: move left ankle up to the knee.
    kp[15] = [105.0, 171.0, 0.9]
    out = cv.repair_foreshortened_limbs(kp)
    assert "l_shin" in out["foreshortened"]
    assert "l_shin" in out["repaired"]
    # Repaired ankle should be pushed back down toward the prior length.
    assert out["keypoints"][15, 1] > 171.0


def test_repair_leaves_normal_limbs_alone():
    kp = _kp(shoulder_w=40.0)
    out = cv.repair_foreshortened_limbs(kp)
    assert out["foreshortened"] == []
    assert out["repaired"] == []


def test_repair_noop_without_shoulders():
    kp = np.zeros((17, 3), dtype=np.float32)
    out = cv.repair_foreshortened_limbs(kp)
    assert out["foreshortened"] == []
    assert out["repaired"] == []


# -- filter_sideline -------------------------------------------------------

def test_filter_drops_players_without_pose():
    players = [_box(), _box(300, 80, 380, 210)]
    poses = [{"keypoints": _kp()}, None]
    keep = cv.filter_sideline(players, poses)
    assert keep == [0]


def test_filter_drops_small_shoulder_pose():
    players = [_box()]
    tiny = {"keypoints": _kp(shoulder_w=2.0)}
    keep = cv.filter_sideline(players, [tiny])
    assert keep == []


def test_filter_keeps_valid_pose():
    players = [_box()]
    keep = cv.filter_sideline(players, [{"keypoints": _kp()}])
    assert keep == [0]
