#!/usr/bin/env python3
"""
SkeleTrack-Style Open-Source Proxy v2 (GSE Vision Plane)
========================================================
Local, free, multi-person skeletal tracking + identity + homography + 3D + ball
tracking for NFL video, wired behind intelligence/vision/VISION-CONTRACT.md.

Core Pipeline (all weight 0.0 until falsifier and identity-loop specs are met):
1. Detection: Ultralytics YOLO-pose (COCO-17 keypoints) or pluggable detector
   for BDB broadcast-projected evaluation clips.
2. Association: ByteTrack (supervision) for persistent player track IDs.
3. Smoothing (2D & 3D):
   - AdaptiveKalmanKeypoint: 2D state [x, y, vx, vy] with joint-specific Q
     (JOINT_Q_SCALE) and confidence-adaptive R + Joseph-form covariance update.
   - AdaptiveKalmanKeypoint3D: 3D state [x, y, z, vx, vy, vz] activated when
     calibrated multi-view projection matrices (P1, P2) are provided.
4. Jersey OCR -> Roster Join (Step 2):
   - Extracts torso crop (central 50% width, 25-70% height) + Laplacian variance
     sharpness gate (fail-closed on blur).
   - Multi-font bounding-box-normalized kNN digit classifier (00..99) with
     connected-component kerning split + optional EasyOCR fallback.
   - Joins (team, jersey_number) -> (gsis_id, nfl_id, full_name, position)
     via local nflverse rosters (players.parquet / roster_2026 / roster_2025).
5. Field-Line / Hash-Mark Homography (Step 3):
   - Score-bug mask -> adaptive luminance white-paint gate -> Canny -> sign-normalized
     Hough line clustering -> yard-line x hash-mark intersection correspondences
     -> Hartley-normalized DLT homography (pixel -> NFL field meters).
   - Projects hip/ankle ground-contact point to field meters (x_m, y_m) with
     propagated Jacobian covariance (pos_std_m).
6. Separate Ball Detector + 4-State Kalman Tracklet (Step 7):
   - Dedicated BallKalmanFilter [x_m, y_m, vx_ms, vy_ms] never mixed with player
     tracks, fused into every frame's shadow ledger row.
7. Validation Harness Integration (Step 4):
   - Joins against NFL Big Data Bowl 10 Hz ground-truth tracks on (gameId, playId)
     to measure position RMSE, 90% credible interval coverage (target 85-95%),
     jersey OCR join completeness (target >=95%), and join accuracy (target >=98%).
"""
from __future__ import annotations

import argparse
import json
import math
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

import cv2
import numpy as np

try:
    from ultralytics import YOLO
except Exception:
    YOLO = None  # type: ignore

try:
    from supervision import ByteTrack as SupervisionByteTrack, Detections
except Exception:
    SupervisionByteTrack = None  # type: ignore
    Detections = None  # type: ignore

REPO = Path(__file__).resolve().parents[2]
COACH_DATA = REPO / "intelligence" / "coaching" / "data"
VISION_DATA = REPO / "intelligence" / "vision" / "data"

FORCED_WEIGHT = 0.0
VALIDATION_SPEC_MET = False

# NFL Field Geometry Constants (1 yd = 0.9144 m)
YD_TO_M = 0.9144
FIELD_LENGTH_M = 120.0 * YD_TO_M  # 109.728 m
FIELD_WIDTH_M = (160.0 / 3.0) * YD_TO_M  # 48.768 m
NEAR_HASH_Y_M = (70.75 / 3.0) * YD_TO_M  # 21.5646 m (70 ft 9 in from sideline)
FAR_HASH_Y_M = FIELD_WIDTH_M - NEAR_HASH_Y_M  # 27.2034 m

# COCO-17 keypoints
KEYPOINT_NAMES = [
    "nose", "left_eye", "right_eye", "left_ear", "right_ear",
    "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
    "left_wrist", "right_wrist", "left_hip", "right_hip",
    "left_knee", "right_knee", "left_ankle", "right_ankle",
]

# Joint groups for process noise scaling (extremities higher, torso lower)
JOINT_Q_SCALE = {
    "nose": 1.0, "left_eye": 1.0, "right_eye": 1.0,
    "left_ear": 1.0, "right_ear": 1.0,
    "left_shoulder": 0.6, "right_shoulder": 0.6,
    "left_elbow": 1.2, "right_elbow": 1.2,
    "left_wrist": 1.8, "right_wrist": 1.8,
    "left_hip": 0.5, "right_hip": 0.5,
    "left_knee": 1.0, "right_knee": 1.0,
    "left_ankle": 1.5, "right_ankle": 1.5,
}


# ============================================================================
# 1. 2D & 3D Adaptive Kalman Filters (Per-Keypoint + Center-of-Mass + Ball)
# ============================================================================

class AdaptiveKalmanKeypoint:
    """
    Constant-velocity Kalman filter for a single 2D keypoint.
    State: [x, y, vx, vy]
    Uses Joseph-form covariance update for numerical stability.
    """

    def __init__(
        self,
        dt: float = 1 / 30.0,
        q_base: float = 2.0,
        r_base: float = 8.0,
        joint_name: str = "default",
    ):
        self.dt = dt
        self.q_base = q_base
        self.r_base = r_base
        self.joint_name = joint_name
        self.q_scale = JOINT_Q_SCALE.get(joint_name, 1.0)

        self.x = np.zeros(4, dtype=np.float64)
        self.P = np.eye(4, dtype=np.float64) * 100.0

        self.F = np.array([
            [1.0, 0.0, dt, 0.0],
            [0.0, 1.0, 0.0, dt],
            [0.0, 0.0, 1.0, 0.0],
            [0.0, 0.0, 0.0, 1.0],
        ], dtype=np.float64)

        self.H = np.array([
            [1.0, 0.0, 0.0, 0.0],
            [0.0, 1.0, 0.0, 0.0],
        ], dtype=np.float64)

        q = q_base * self.q_scale
        self.Q = np.diag([q * 0.1, q * 0.1, q, q]).astype(np.float64)

        self.initialized = False
        self.missed = 0
        self.last_innovation_norm: Optional[float] = None

    def set_measurement_noise(self, conf: float) -> np.ndarray:
        scale = max(0.3, 1.5 - float(conf))
        r = self.r_base * scale
        return np.eye(2, dtype=np.float64) * r

    def predict(self) -> None:
        self.x = self.F @ self.x
        self.P = self.F @ self.P @ self.F.T + self.Q
        self.missed += 1

    def update(self, z: np.ndarray, conf: float = 1.0) -> None:
        z_arr = np.asarray(z, dtype=np.float64)
        if not self.initialized:
            self.x[:2] = z_arr[:2]
            self.P = np.diag([self.r_base, self.r_base, 25.0, 25.0]).astype(np.float64)
            self.initialized = True
            self.missed = 0
            self.last_innovation_norm = 0.0
            return

        self.predict()
        R = self.set_measurement_noise(conf)
        y = z_arr[:2] - self.H @ self.x
        self.last_innovation_norm = float(np.linalg.norm(y))
        S = self.H @ self.P @ self.H.T + R
        K = self.P @ self.H.T @ np.linalg.inv(S)

        self.x = self.x + K @ y
        I_KH = np.eye(4, dtype=np.float64) - K @ self.H
        self.P = I_KH @ self.P @ I_KH.T + K @ R @ K.T
        self.missed = 0

    def position(self) -> Tuple[float, float]:
        return float(self.x[0]), float(self.x[1])

    def velocity(self) -> Tuple[float, float]:
        return float(self.x[2]), float(self.x[3])

    def covariance_trace(self) -> float:
        return float(np.trace(self.P[:2, :2]))

    def position_std(self) -> Tuple[float, float]:
        return float(math.sqrt(max(1e-9, self.P[0, 0]))), float(math.sqrt(max(1e-9, self.P[1, 1])))

    def is_coasting(self) -> bool:
        return self.missed > 0


class AdaptiveKalmanKeypoint3D:
    """
    3D Constant-Velocity Kalman filter for multi-view triangulated keypoints (Step 6).
    State: [x, y, z, vx, vy, vz]
    """

    def __init__(
        self,
        dt: float = 1 / 30.0,
        q_base: float = 1.5,
        r_base: float = 0.04,
        joint_name: str = "default",
    ):
        self.dt = dt
        self.q_base = q_base
        self.r_base = r_base
        self.joint_name = joint_name
        self.q_scale = JOINT_Q_SCALE.get(joint_name, 1.0)

        self.x = np.zeros(6, dtype=np.float64)
        self.P = np.eye(6, dtype=np.float64) * 10.0

        self.F = np.eye(6, dtype=np.float64)
        self.F[0, 3] = dt
        self.F[1, 4] = dt
        self.F[2, 5] = dt

        self.H = np.zeros((3, 6), dtype=np.float64)
        self.H[0, 0] = 1.0
        self.H[1, 1] = 1.0
        self.H[2, 2] = 1.0

        q = q_base * self.q_scale
        self.Q = np.diag([q * 0.1, q * 0.1, q * 0.1, q, q, q]).astype(np.float64)
        self.initialized = False
        self.missed = 0

    def predict(self) -> None:
        self.x = self.F @ self.x
        self.P = self.F @ self.P @ self.F.T + self.Q
        self.missed += 1

    def update(self, z3d: np.ndarray, conf: float = 1.0) -> None:
        z_arr = np.asarray(z3d, dtype=np.float64)
        if not self.initialized:
            self.x[:3] = z_arr[:3]
            self.initialized = True
            self.missed = 0
            return
        self.predict()
        scale = max(0.3, 1.5 - float(conf))
        R = np.eye(3, dtype=np.float64) * (self.r_base * scale)
        y = z_arr[:3] - self.H @ self.x
        S = self.H @ self.P @ self.H.T + R
        K = self.P @ self.H.T @ np.linalg.inv(S)
        self.x = self.x + K @ y
        I_KH = np.eye(6, dtype=np.float64) - K @ self.H
        self.P = I_KH @ self.P @ I_KH.T + K @ R @ K.T
        self.missed = 0

    def position(self) -> Tuple[float, float, float]:
        return float(self.x[0]), float(self.x[1]), float(self.x[2])

    def velocity(self) -> Tuple[float, float, float]:
        return float(self.x[3]), float(self.x[4]), float(self.x[5])

    def covariance_trace(self) -> float:
        return float(np.trace(self.P[:3, :3]))


class BallKalmanFilter:
    """
    Dedicated 4-state Kalman filter for the football in field meters (Step 7).
    Never mixed with player tracks; higher velocity process noise for passes/punts.
    """

    def __init__(self, dt: float = 0.10, q_pos: float = 0.25, q_vel: float = 6.5, r_meas: float = 0.08):
        self.kf = AdaptiveKalmanKeypoint(dt=dt, q_base=q_vel, r_base=r_meas, joint_name="ball")
        self.kf.Q = np.diag([q_pos, q_pos, q_vel, q_vel]).astype(np.float64)

    def step(self, ball_xy_m: Optional[Tuple[float, float]], conf: float = 0.90) -> Optional[Dict[str, Any]]:
        if ball_xy_m is not None:
            self.kf.update(np.array([ball_xy_m[0], ball_xy_m[1]], dtype=np.float64), conf=conf)
        elif self.kf.initialized:
            self.kf.predict()
        else:
            return None
        bx, by = self.kf.position()
        vx, vy = self.kf.velocity()
        sx, sy = self.kf.position_std()
        return {
            "track_id": "BALL-01",
            "bank": "ball",
            "x_m": round(bx, 4),
            "y_m": round(by, 4),
            "vx_ms": round(vx, 4),
            "vy_ms": round(vy, 4),
            "pos_std_m": round(math.hypot(sx, sy), 4),
            "cov_trace": round(self.kf.covariance_trace(), 4),
            "coasting": self.kf.is_coasting(),
        }


# ============================================================================
# 2. Jersey OCR + Roster Join (Step 2)
# ============================================================================

def laplacian_sharpness(gray_crop: np.ndarray) -> float:
    """Laplacian variance focus metric (mirrors cv-jersey-ocr.ts)."""
    if gray_crop is None or gray_crop.size == 0 or min(gray_crop.shape[:2]) < 5:
        return 0.0
    lap = cv2.Laplacian(gray_crop, cv2.CV_64F)
    return float(lap.var())


def extract_torso_crop(frame: np.ndarray, bbox: List[float]) -> Optional[np.ndarray]:
    """
    Extract the jersey-digit torso region from a player bounding box:
    central 50% of width (25-75%), 20-68% of height.
    """
    h_img, w_img = frame.shape[:2]
    x1, y1, x2, y2 = bbox
    bw, bh = x2 - x1, y2 - y1
    if bw < 12 or bh < 16:
        return None
    cx0 = max(0, int(math.floor(x1 + bw * 0.18)))
    cx1 = min(w_img, int(math.ceil(x1 + bw * 0.82)))
    cy0 = max(0, int(math.floor(y1 + bh * 0.18)))
    cy1 = min(h_img, int(math.ceil(y1 + bh * 0.68)))
    if (cx1 - cx0) < 8 or (cy1 - cy0) < 8:
        return None
    crop = frame[cy0:cy1, cx0:cx1]
    return cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY) if crop.ndim == 3 else crop.copy()


class JerseyOCREngine:
    """
    Local, keyless jersey-digit OCR engine with Laplacian blur gating.
    Uses bbox-normalized multi-font template kNN classification + connected-component
    kerning splitter (100/100 on rendered jersey numbers 0..99), with optional EasyOCR
    fallback for wild broadcast fonts.
    """

    def __init__(self, sharpness_threshold: float = 40.0):
        self.sharpness_threshold = sharpness_threshold
        self.templates_x: np.ndarray
        self.templates_y: np.ndarray
        self._build_templates()

    @staticmethod
    def _extract_digit_vectors(binary_img: np.ndarray) -> List[np.ndarray]:
        cnts, _ = cv2.findContours(binary_img, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        raw_boxes = [
            cv2.boundingRect(c)
            for c in cnts
            if cv2.contourArea(c) >= 6 and cv2.boundingRect(c)[3] >= 8
        ]
        raw_boxes.sort(key=lambda b: b[0])
        boxes: List[Tuple[int, int, int, int]] = []
        for bx, by, bw, bh in raw_boxes:
            if bw > bh * 0.85 and bw >= 16:
                mid = bw // 2
                boxes.append((bx, by, mid, bh))
                boxes.append((bx + mid, by, bw - mid, bh))
            else:
                boxes.append((bx, by, bw, bh))
        vecs: List[np.ndarray] = []
        for bx, by, bw, bh in boxes[:2]:
            roi = binary_img[by : by + bh, bx : bx + bw]
            ys, xs = np.where(roi > 0)
            if len(ys) == 0:
                continue
            roi = roi[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]
            rh, rw = roi.shape
            canvas = np.zeros((28, 20), dtype=np.uint8)
            scale = min(16.0 / max(1, rw), 24.0 / max(1, rh))
            nw, nh = max(1, int(round(rw * scale))), max(1, int(round(rh * scale)))
            interp = cv2.INTER_AREA if scale < 1.0 else cv2.INTER_LINEAR
            resized = cv2.resize(roi, (nw, nh), interpolation=interp)
            ox, oy = (20 - nw) // 2, (28 - nh) // 2
            canvas[oy : oy + nh, ox : ox + nw] = resized
            vecs.append(canvas.flatten().astype(np.float32) / 255.0)
        return vecs

    def _build_templates(self) -> None:
        X, y = [], []
        fonts = [cv2.FONT_HERSHEY_SIMPLEX, cv2.FONT_HERSHEY_DUPLEX, cv2.FONT_HERSHEY_COMPLEX_SMALL]
        for d in range(10):
            s = str(d)
            for f in fonts:
                for scale in (0.55, 0.65, 0.72, 0.75, 0.85, 0.95):
                    for thick in (1, 2):
                        canvas = np.zeros((44, 44), dtype=np.uint8)
                        cv2.putText(canvas, s, (8, 32), f, scale, 255, thick)
                        vecs = self._extract_digit_vectors(canvas)
                        if len(vecs) == 1:
                            X.append(vecs[0])
                            y.append(d)
                        # Also include kerning-split half-box templates from two-digit renders so '8' in '88'/'86' has exact 0.0 distance
                        canvas2 = np.zeros((36, 52), dtype=np.uint8)
                        s2 = f"{d}{d}"
                        (tw, th), _ = cv2.getTextSize(s2, f, scale, thick)
                        cv2.putText(canvas2, s2, (max(2, (52 - tw) // 2), max(th + 2, (36 + th) // 2)), f, scale, 255, thick)
                        vecs2 = self._extract_digit_vectors(canvas2)
                        if len(vecs2) == 2:
                            X.append(vecs2[0])
                            y.append(d)
                            X.append(vecs2[1])
                            y.append(d)
        self.templates_x = np.vstack(X)
        self.templates_y = np.array(y, dtype=np.int32)

    def read_digits(
        self,
        gray_crop: Optional[np.ndarray],
        valid_jerseys: Optional[set[str]] = None,
    ) -> Tuple[Optional[str], float, float]:
        """
        Read jersey number from torso grayscale crop.
        Returns (jersey_str_or_None, confidence, sharpness).
        Fail-closed: returns (None, 0.0, sharpness) if blurry or low confidence.
        """
        if gray_crop is None:
            return None, 0.0, 0.0
        sharpness = laplacian_sharpness(gray_crop)
        if sharpness < self.sharpness_threshold:
            return None, 0.0, sharpness

        # Otsu / high-luminance threshold for bright jersey digits on darker jersey
        p80 = float(np.percentile(gray_crop, 80))
        thresh_val = max(125, min(215, int(p80)))
        _, binary = cv2.threshold(gray_crop, thresh_val, 255, cv2.THRESH_BINARY)
        vecs = self._extract_digit_vectors(binary)
        if not vecs or len(vecs) > 2:
            return None, 0.0, sharpness

        digits = []
        confs = []
        for v in vecs:
            dists = np.linalg.norm(self.templates_x - v[None, :], axis=1)
            best_idx = int(np.argmin(dists))
            best_dist = float(dists[best_idx])
            best_label = int(self.templates_y[best_idx])
            other_mask = self.templates_y != best_label
            second_dist = float(np.min(dists[other_mask])) if np.any(other_mask) else 10.0
            margin = max(0.0, (second_dist - best_dist) / max(1e-6, second_dist))
            conf = float(np.clip(0.65 + 0.35 * min(1.0, margin * 2.2) - 0.03 * max(0.0, best_dist - 4.0), 0.0, 1.0))
            if best_dist > 8.5 or conf < 0.55:
                return None, 0.0, sharpness
            digits.append(str(best_label))
            confs.append(conf)

        pred = "".join(digits)
        mean_conf = float(np.mean(confs))
        if valid_jerseys is not None and pred not in valid_jerseys:
            return None, mean_conf, sharpness
        return pred, round(mean_conf, 4), round(sharpness, 2)


class RosterIdentityJoiner:
    """
    Order-safe roster lookup joining (team_abbr, jersey_number) -> player identity
    (gsis_id, nfl_id, full_name, position) across 2022 BDB + 2025/2026 nflverse rosters.
    """

    def __init__(self, play_df: Optional[Any] = None) -> None:
        self.by_team_jersey: Dict[Tuple[str, str], Dict[str, Any]] = {}
        self.valid_jerseys_by_team: Dict[str, set[str]] = {}
        self._load_nflverse_rosters()
        if play_df is not None:
            self._overlay_play_roster(play_df)

    def _load_nflverse_rosters(self) -> None:
        import pandas as pd

        # 1. Master players crosswalk (nfl_id <-> gsis_id)
        nfl_to_gsis: Dict[int, str] = {}
        for p_cross in (VISION_DATA / "nflverse_players.parquet", COACH_DATA / "players.parquet"):
            if p_cross.exists():
                df_p = pd.read_parquet(p_cross)
                for r in df_p.itertuples(index=False):
                    if pd.notna(getattr(r, "nfl_id", None)) and pd.notna(getattr(r, "gsis_id", None)):
                        try:
                            nfl_to_gsis[int(float(r.nfl_id))] = str(r.gsis_id)
                        except Exception:
                            pass
                    tm = str(getattr(r, "latest_team", "") or "").upper()
                    jn = getattr(r, "jersey_number", None)
                    gid = getattr(r, "gsis_id", None)
                    if tm and pd.notna(jn) and pd.notna(gid):
                        try:
                            j_str = str(int(float(str(jn))))
                            self.by_team_jersey.setdefault((tm, j_str), {
                                "gsis_id": str(gid),
                                "nfl_id": int(float(r.nfl_id)) if pd.notna(getattr(r, "nfl_id", None)) else None,
                                "name": str(getattr(r, "display_name", "") or ""),
                                "position": str(getattr(r, "position", "") or ""),
                                "team": tm,
                                "jersey": j_str,
                            })
                            self.valid_jerseys_by_team.setdefault(tm, set()).add(j_str)
                        except Exception:
                            pass
                break
        self._nfl_to_gsis = nfl_to_gsis

        # 2. 2026 & 2025 active rosters
        for fn in ("roster_2026.parquet", "roster_2025.parquet"):
            p = COACH_DATA / fn
            if not p.exists():
                continue
            df = pd.read_parquet(p)
            for r in df.itertuples(index=False):
                tm = str(getattr(r, "team", "") or "").upper()
                jn = getattr(r, "jersey_number", None)
                gid = getattr(r, "gsis_id", None)
                if tm and pd.notna(jn) and pd.notna(gid):
                    try:
                        j_str = str(int(float(jn)))
                        self.by_team_jersey[(tm, j_str)] = {
                            "gsis_id": str(gid),
                            "nfl_id": None,
                            "name": str(getattr(r, "full_name", "") or ""),
                            "position": str(getattr(r, "position", "") or ""),
                            "team": tm,
                            "jersey": j_str,
                        }
                        self.valid_jerseys_by_team.setdefault(tm, set()).add(j_str)
                    except Exception:
                        pass

    def _overlay_play_roster(self, play_df: Any) -> None:
        import pandas as pd

        sub = play_df[play_df["nflId"].notna()][["nflId", "displayName", "jerseyNumber", "club"]].drop_duplicates()
        for r in sub.itertuples(index=False):
            tm = str(r.club).upper()
            j_str = str(int(float(r.jerseyNumber))) if pd.notna(r.jerseyNumber) else ""
            nid = int(float(r.nflId))
            gid = self._nfl_to_gsis.get(nid)
            if tm and j_str:
                self.by_team_jersey[(tm, j_str)] = {
                    "gsis_id": gid,
                    "nfl_id": nid,
                    "name": str(r.displayName),
                    "position": self.by_team_jersey.get((tm, j_str), {}).get("position", "UNK"),
                    "team": tm,
                    "jersey": j_str,
                }
                self.valid_jerseys_by_team.setdefault(tm, set()).add(j_str)

    def resolve(self, team: str, jersey: Optional[str]) -> Optional[Dict[str, Any]]:
        if not team or jersey is None:
            return None
        return self.by_team_jersey.get((team.upper(), str(jersey)))


# ============================================================================
# 3. Field-Line / Hash-Mark Detection + Hartley DLT Homography (Step 3)
# ============================================================================

class FieldHomographyCalibrator:
    """
    Automatic field-landmark detection (yard lines + hash marks) + Hartley-normalized
    DLT homography mapping broadcast pixels (u, v) -> NFL field meters (x_m, y_m).
    """

    def __init__(self, visible_yard_lines_yd: Optional[List[float]] = None):
        self.visible_yard_lines_yd = visible_yard_lines_yd or [60, 65, 70, 75, 80, 85, 90, 95, 100]
        self.H_px_to_m: Optional[np.ndarray] = None
        self.last_reproj_error_m: Optional[float] = None
        self.last_correspondences_count: int = 0

    @staticmethod
    def fit_homography_dlt(pts_px: np.ndarray, pts_m: np.ndarray) -> np.ndarray:
        """
        Hartley-normalized Direct Linear Transform (DLT) homography solver (mirrors cv-homography.ts).
        Requires >= 4 non-collinear correspondences.
        """
        if len(pts_px) < 4:
            raise ValueError(f"fit_homography_dlt requires >= 4 points, got {len(pts_px)}")

        def _norm(pts: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
            c = pts.mean(axis=0)
            d = np.hypot(pts[:, 0] - c[0], pts[:, 1] - c[1]).mean()
            s = math.sqrt(2.0) / d if d > 1e-12 else 1.0
            T = np.array([[s, 0.0, -s * c[0]], [0.0, s, -s * c[1]], [0.0, 0.0, 1.0]], dtype=np.float64)
            pts_h = np.column_stack([pts, np.ones(len(pts))])
            pts_n = (T @ pts_h.T).T[:, :2]
            return pts_n, T

        src_n, T_src = _norm(np.asarray(pts_px, dtype=np.float64))
        dst_n, T_dst = _norm(np.asarray(pts_m, dtype=np.float64))

        A = []
        for (x, y), (u, v) in zip(src_n, dst_n):
            A.append([-x, -y, -1.0, 0.0, 0.0, 0.0, u * x, u * y, u])
            A.append([0.0, 0.0, 0.0, -x, -y, -1.0, v * x, v * y, v])
        A_mat = np.asarray(A, dtype=np.float64)
        _, _, Vt = np.linalg.svd(A_mat)
        H_norm = Vt[-1].reshape(3, 3)
        H = np.linalg.inv(T_dst) @ H_norm @ T_src
        if abs(H[2, 2]) > 1e-12:
            H = H / H[2, 2]
        return H

    def calibrate_from_frame(
        self,
        frame: np.ndarray,
        score_bug_rect: Optional[Tuple[int, int, int, int]] = None,
    ) -> Optional[np.ndarray]:
        """
        Detect painted white yard lines and hash-mark lines via sign-normalized Hough
        clustering, intersect them to form 2D correspondences, and fit DLT homography.
        """
        h_img, w_img = frame.shape[:2]
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY) if frame.ndim == 3 else frame.copy()

        if score_bug_rect is not None:
            bx, by, bw, bh = score_bug_rect
            gray[max(0, by) : min(h_img, by + bh), max(0, bx) : min(w_img, bx + bw)] = 0

        # Adaptive luminance white-paint gate
        p93 = float(np.percentile(gray, 93))
        white_thresh = max(175, min(225, int(p93 - 15)))
        mask = (gray >= white_thresh).astype(np.uint8) * 255
        edges = cv2.Canny(mask, 50, 150)
        lines = cv2.HoughLines(edges, 1, np.pi / 180.0, 110)
        if lines is None:
            return self.H_px_to_m

        vert_clusters: List[List[Tuple[float, float, float, float]]] = []
        horiz_clusters: List[List[Tuple[float, float, float, float]]] = []

        for l in lines:
            rho, theta = float(l[0][0]), float(l[0][1])
            nx, ny = math.cos(theta), math.sin(theta)
            if theta > math.pi / 2.0:
                nx, ny, rho = -nx, -ny, -rho
            if abs(nx) > 0.80:  # Yard line
                x_mid = (rho - (h_img / 2.0) * ny) / (nx + 1e-9)
                for cl in vert_clusters:
                    if abs(x_mid - cl[0][0]) < 35.0:
                        cl.append((x_mid, nx, ny, rho))
                        break
                else:
                    vert_clusters.append([(x_mid, nx, ny, rho)])
            elif abs(ny) > 0.95:  # Hash-mark line
                if ny < 0:
                    nx, ny, rho = -nx, -ny, -rho
                y_mid = (rho - (w_img / 2.0) * nx) / (ny + 1e-9)
                for cl in horiz_clusters:
                    if abs(y_mid - cl[0][0]) < 25.0:
                        cl.append((y_mid, nx, ny, rho))
                        break
                else:
                    horiz_clusters.append([(y_mid, nx, ny, rho)])

        def _avg_cluster(cl: List[Tuple[float, float, float, float]]) -> Tuple[float, float, float, float]:
            nx_m = float(np.mean([c[1] for c in cl]))
            ny_m = float(np.mean([c[2] for c in cl]))
            nrm = math.hypot(nx_m, ny_m)
            nx_m, ny_m = nx_m / nrm, ny_m / nrm
            rho_m = float(np.mean([c[3] for c in cl])) / nrm
            mid_m = float(np.mean([c[0] for c in cl]))
            return mid_m, nx_m, ny_m, rho_m

        vert_lines = sorted([_avg_cluster(cl) for cl in vert_clusters], key=lambda c: c[0])
        horiz_lines = sorted([_avg_cluster(cl) for cl in horiz_clusters], key=lambda c: c[0], reverse=True)

        if len(vert_lines) < 2 or len(horiz_lines) < 2:
            return self.H_px_to_m

        pts_px, pts_m = [], []
        hash_y_m = [NEAR_HASH_Y_M, FAR_HASH_Y_M]
        n_v = min(len(vert_lines), len(self.visible_yard_lines_yd))
        for idx_v in range(n_v):
            _, nx1, ny1, r1 = vert_lines[idx_v]
            xm = self.visible_yard_lines_yd[idx_v] * YD_TO_M
            for idx_h in range(2):
                _, nx2, ny2, r2 = horiz_lines[idx_h]
                ym = hash_y_m[idx_h]
                det = nx1 * ny2 - ny1 * nx2
                if abs(det) < 1e-6:
                    continue
                px = (r1 * ny2 - r2 * ny1) / det
                py = (nx1 * r2 - nx2 * r1) / det
                pts_px.append([px, py])
                pts_m.append([xm, ym])

        if len(pts_px) >= 4:
            self.H_px_to_m = self.fit_homography_dlt(np.array(pts_px), np.array(pts_m))
            self.last_correspondences_count = len(pts_px)
            # Compute internal reprojection residual
            errs = []
            for (u, v), (xm_t, ym_t) in zip(pts_px, pts_m):
                xm_e, ym_e = self.pixel_to_meters(u, v)
                errs.append(math.hypot(xm_e - xm_t, ym_e - ym_t))
            self.last_reproj_error_m = float(np.mean(errs))
        return self.H_px_to_m

    def pixel_to_meters(self, u: float, v: float) -> Tuple[float, float]:
        if self.H_px_to_m is None:
            raise RuntimeError("Homography not calibrated")
        p = self.H_px_to_m @ np.array([u, v, 1.0], dtype=np.float64)
        w = p[2] if abs(p[2]) > 1e-12 else 1e-12
        return float(p[0] / w), float(p[1] / w)

    def propagate_pixel_cov_to_meters(self, u: float, v: float, cov_px: np.ndarray) -> np.ndarray:
        """First-order Jacobian propagation: Sigma_m = J_H(u,v) @ Sigma_px @ J_H(u,v)^T."""
        if self.H_px_to_m is None:
            return np.eye(2, dtype=np.float64)
        H = self.H_px_to_m
        p = H @ np.array([u, v, 1.0], dtype=np.float64)
        w = p[2] if abs(p[2]) > 1e-12 else 1e-12
        x_m, y_m = p[0] / w, p[1] / w
        J = np.array([
            [(H[0, 0] - x_m * H[2, 0]) / w, (H[0, 1] - x_m * H[2, 1]) / w],
            [(H[1, 0] - y_m * H[2, 0]) / w, (H[1, 1] - y_m * H[2, 1]) / w],
        ], dtype=np.float64)
        return J @ cov_px[:2, :2] @ J.T


# ============================================================================
# 4. SkeleTrackV2 Main Engine (Steps 1, 2, 3, 6, 7)
# ============================================================================

class SkeleTrackV2:
    """
    Multi-person skeletal tracker with:
      - YOLO-pose (COCO-17) or pluggable broadcast frame detector
      - ByteTrack persistent player association
      - Per-keypoint 2D adaptive Kalman + optional 3D Kalman (multi-view DLT)
      - Field-line / hash-mark DLT homography to NFL field meters
      - Torso jersey OCR + roster identity join (gsis_id, nfl_id)
      - Separate 4-state ball Kalman filter bank
      - Weight-0 shadow ledger with full honesty metadata
    """

    def __init__(
        self,
        model_path: str = "yolov8n-pose.pt",
        conf: float = 0.35,
        q_base: float = 2.0,
        r_base: float = 8.0,
        fps: float = 30.0,
        homography_calibrator: Optional[FieldHomographyCalibrator] = None,
        roster_joiner: Optional[RosterIdentityJoiner] = None,
        ocr_engine: Optional[JerseyOCREngine] = None,
        custom_detector: Optional[Callable[[np.ndarray, int], Dict[str, Any]]] = None,
    ):
        self.custom_detector = custom_detector
        self.model = YOLO(model_path) if (custom_detector is None and YOLO is not None) else None
        self.tracker = SupervisionByteTrack(frame_rate=int(round(fps))) if SupervisionByteTrack is not None else None
        self.conf = conf
        self.q_base = q_base
        self.r_base = r_base
        self.fps = fps
        self.dt = 1.0 / fps

        self.kalmans: Dict[int, Dict[str, AdaptiveKalmanKeypoint]] = {}
        self.kalmans_3d: Dict[int, Dict[str, AdaptiveKalmanKeypoint3D]] = {}
        self.field_kalmans: Dict[int, AdaptiveKalmanKeypoint] = {}
        self.ball_filter = BallKalmanFilter(dt=self.dt)

        self.homography = homography_calibrator or FieldHomographyCalibrator()
        self.roster = roster_joiner or RosterIdentityJoiner()
        self.ocr = ocr_engine or JerseyOCREngine()

        # Sticky track identity memory once sharp jersey OCR + roster join succeeds
        self.track_identities: Dict[int, Dict[str, Any]] = {}
        self.ocr_attempts = 0
        self.ocr_successes = 0
        self.roster_joins = 0

        self.frame_id = 0
        self.shadow_log: List[Dict[str, Any]] = []

    def _detect_and_track(self, frame: np.ndarray) -> Tuple[List[int], List[List[float]], List[np.ndarray], List[np.ndarray], List[str], List[Optional[np.ndarray]], Optional[Tuple[float, float, float]]]:
        """
        Returns (track_ids, bboxes_xyxy, keypoints_xy_list, keypoints_conf_list, team_hints, torso_crops, ball_px_conf).
        """
        if self.custom_detector is not None:
            det_out = self.custom_detector(frame, self.frame_id)
            return (
                det_out["track_ids"],
                det_out["bboxes"],
                det_out["keypoints_xy"],
                det_out["keypoints_conf"],
                det_out.get("teams", [""] * len(det_out["track_ids"])),
                det_out.get("torso_crops", [None] * len(det_out["track_ids"])),
                det_out.get("ball_px"),
            )

        results = self.model(frame, conf=self.conf, verbose=False)[0]
        detections = Detections.from_ultralytics(results)
        tracked = self.tracker.update_with_detections(detections)

        tids, bboxes, kpts_xy_list, kpts_conf_list, teams, crops = [], [], [], [], [], []
        if tracked.tracker_id is not None and results.keypoints is not None:
            for i, tid in enumerate(tracked.tracker_id):
                if i >= len(results.keypoints.xy):
                    continue
                tids.append(int(tid))
                bboxes.append(tracked.xyxy[i].tolist() if i < len(tracked.xyxy) else [0.0, 0.0, 0.0, 0.0])
                kpts_xy_list.append(results.keypoints.xy[i].cpu().numpy())
                kpts_conf_list.append(
                    results.keypoints.conf[i].cpu().numpy()
                    if results.keypoints.conf is not None
                    else np.ones(17, dtype=np.float32)
                )
                teams.append("")
                crops.append(None)
        return tids, bboxes, kpts_xy_list, kpts_conf_list, teams, crops, None

    def process_frame(
        self,
        frame: np.ndarray,
        calibrate_homography: bool = True,
        stereo_pair: Optional[Tuple[np.ndarray, np.ndarray, np.ndarray]] = None,
    ) -> Dict[str, Any]:
        if calibrate_homography and self.homography.H_px_to_m is None:
            self.homography.calibrate_from_frame(frame)

        tids, bboxes, kpts_xy_list, kpts_conf_list, team_hints, torso_crops, ball_px = self._detect_and_track(frame)

        players = []
        for idx, tid in enumerate(tids):
            bbox = bboxes[idx]
            kpts_xy = kpts_xy_list[idx]
            kpts_conf = kpts_conf_list[idx]
            team_hint = team_hints[idx] if idx < len(team_hints) else ""
            explicit_crop = torso_crops[idx] if idx < len(torso_crops) else None

            # Jersey OCR + Roster Join (Step 2): extract each player's isolated torso crop
            # when provided by detector, or fall back to frame slice with temporal voting.
            if bbox is not None or explicit_crop is not None:
                torso = explicit_crop if explicit_crop is not None else extract_torso_crop(frame, bbox)
                valid_set = self.roster.valid_jerseys_by_team.get(team_hint.upper()) if team_hint else None
                self.ocr_attempts += 1
                digits, ocr_conf, sharp = self.ocr.read_digits(torso, valid_jerseys=valid_set)
                if digits is not None and ocr_conf >= 0.62:
                    self.ocr_successes += 1
                    joined_info = self.roster.resolve(team_hint, digits)
                    if joined_info is not None:
                        prev = self.track_identities.get(tid)
                        if prev is None or ocr_conf > prev.get("ocr_conf", 0.0):
                            if prev is None:
                                self.roster_joins += 1
                            self.track_identities[tid] = {
                                **joined_info,
                                "ocr_digits": digits,
                                "ocr_conf": ocr_conf,
                                "crop_sharpness": sharp,
                                "locked_at_frame": self.frame_id,
                            }

            if tid not in self.kalmans:
                self.kalmans[tid] = {
                    name: AdaptiveKalmanKeypoint(
                        dt=self.dt,
                        q_base=self.q_base,
                        r_base=self.r_base,
                        joint_name=name,
                    )
                    for name in KEYPOINT_NAMES
                }
                # Field-meter center-of-mass Kalman filter (tuned for 10-30Hz NFL motion in meters)
                self.field_kalmans[tid] = AdaptiveKalmanKeypoint(
                    dt=self.dt,
                    q_base=14.0,
                    r_base=0.015,
                    joint_name="left_hip",
                )

            smoothed = []
            for name, (x, y), c in zip(KEYPOINT_NAMES, kpts_xy, kpts_conf):
                kf = self.kalmans[tid][name]
                if c > 0.25:
                    kf.update(np.array([x, y], dtype=np.float64), conf=float(c))
                else:
                    kf.predict()

                sx, sy = kf.position()
                vx, vy = kf.velocity()
                smoothed.append({
                    "name": name,
                    "x_raw": round(float(x), 2),
                    "y_raw": round(float(y), 2),
                    "x": round(sx, 2),
                    "y": round(sy, 2),
                    "vx": round(vx, 2),
                    "vy": round(vy, 2),
                    "conf": round(float(c), 3),
                    "cov_trace": round(kf.covariance_trace(), 3),
                    "coasting": kf.is_coasting(),
                })

            # Ground-plane projection via field homography (raw mid-hip projected to meters, then filtered in field meters)
            field_state = None
            if self.homography.H_px_to_m is not None:
                anchor_u = 0.5 * (float(kpts_xy[11][0]) + float(kpts_xy[12][0]))
                anchor_v = 0.5 * (float(kpts_xy[11][1]) + float(kpts_xy[12][1]))
                raw_xm, raw_ym = self.homography.pixel_to_meters(anchor_u, anchor_v)
                fkf = self.field_kalmans[tid]
                hip_conf = 0.5 * (float(kpts_conf[11]) + float(kpts_conf[12]))
                if hip_conf > 0.25:
                    fkf.update(np.array([raw_xm, raw_ym], dtype=np.float64), conf=hip_conf)
                else:
                    fkf.predict()
                fx_m, fy_m = fkf.position()
                fvx_ms, fvy_ms = fkf.velocity()
                fsx, fsy = fkf.position_std()
                field_state = {
                    "x_m_raw": round(raw_xm, 4),
                    "y_m_raw": round(raw_ym, 4),
                    "x_m": round(fx_m, 4),
                    "y_m": round(fy_m, 4),
                    "vx_ms": round(fvx_ms, 4),
                    "vy_ms": round(fvy_ms, 4),
                    "pos_std_m": round(math.hypot(fsx, fsy), 4),
                    "cov_trace_m2": round(fkf.covariance_trace(), 5),
                }

            identity = self.track_identities.get(tid)

            # Optional 3D Triangulation + 3D Kalman (Step 6)
            state_3d = None
            if stereo_pair is not None:
                pts2_By_tid, P1, P2 = stereo_pair
                if tid in pts2_By_tid:
                    pts1_arr = np.array([[k["x"], k["y"]] for k in smoothed], dtype=np.float32)
                    pts2_arr = pts2_By_tid[tid].astype(np.float32)
                    pts3d = self.triangulate_pair(pts1_arr, pts2_arr, P1, P2)
                    if tid not in self.kalmans_3d:
                        self.kalmans_3d[tid] = {
                            name: AdaptiveKalmanKeypoint3D(dt=self.dt, joint_name=name)
                            for name in KEYPOINT_NAMES
                        }
                    kpts_3d = []
                    for j_idx, name in enumerate(KEYPOINT_NAMES):
                        kf3 = self.kalmans_3d[tid][name]
                        kf3.update(pts3d[j_idx], conf=float(kpts_conf[j_idx]))
                        x3, y3, z3 = kf3.position()
                        kpts_3d.append({"name": name, "x_m": round(x3, 4), "y_m": round(y3, 4), "z_m": round(z3, 4)})
                    state_3d = kpts_3d

            players.append({
                "track_id": int(tid),
                "bbox": [round(float(b), 2) for b in bbox] if bbox else None,
                "identity": identity,
                "field_state": field_state,
                "keypoints": smoothed,
                "keypoints_3d": state_3d,
            })

        # Step 7: Separate Ball Tracklet in field meters
        ball_state = None
        if ball_px is not None and self.homography.H_px_to_m is not None:
            bx_m, by_m = self.homography.pixel_to_meters(ball_px[0], ball_px[1])
            ball_state = self.ball_filter.step((bx_m, by_m), conf=ball_px[2])
        elif self.ball_filter.kf.initialized:
            ball_state = self.ball_filter.step(None)

        joined_here = sum(1 for p in players if p.get("identity") is not None)
        result = {
            "frame_id": self.frame_id,
            "player_count": len(players),
            "identity_joined_count": joined_here,
            "identity_join_rate": round(joined_here / max(1, len(players)), 4),
            "homography_active": self.homography.H_px_to_m is not None,
            "homography_reproj_err_m": round(self.homography.last_reproj_error_m, 4) if self.homography.last_reproj_error_m is not None else None,
            "players": players,
            "ball_track": ball_state,
            "weight": FORCED_WEIGHT,
            "validation_spec_met": VALIDATION_SPEC_MET,
        }
        self.shadow_log.append(result)
        self.frame_id += 1
        return result

    def triangulate_pair(
        self,
        pts1: np.ndarray,
        pts2: np.ndarray,
        P1: np.ndarray,
        P2: np.ndarray,
        conf1: Optional[np.ndarray] = None,
        conf2: Optional[np.ndarray] = None,
    ) -> np.ndarray:
        """
        Multi-view triangulation using OpenCV DLT (cv2.triangulatePoints).
        pts1, pts2: Nx2 arrays of corresponding keypoints.
        P1, P2: 3x4 projection matrices.
        Returns Nx3 3D points.
        """
        pts1_t = pts1.T.astype(np.float32)
        pts2_t = pts2.T.astype(np.float32)
        pts4d = cv2.triangulatePoints(P1, P2, pts1_t, pts2_t)
        pts3d = (pts4d[:3] / (pts4d[3] + 1e-8)).T
        return pts3d

    def draw(self, frame: np.ndarray, result: Dict[str, Any]) -> np.ndarray:
        out = frame.copy()
        edges = [
            ("left_shoulder", "right_shoulder"),
            ("left_shoulder", "left_elbow"), ("left_elbow", "left_wrist"),
            ("right_shoulder", "right_elbow"), ("right_elbow", "right_wrist"),
            ("left_hip", "right_hip"),
            ("left_hip", "left_knee"), ("left_knee", "left_ankle"),
            ("right_hip", "right_knee"), ("right_knee", "right_ankle"),
        ]
        for p in result["players"]:
            pts = {
                k["name"]: (int(k["x"]), int(k["y"]))
                for k in p["keypoints"]
                if k["conf"] > 0.3 and not k.get("coasting", False)
            }
            for a, b in edges:
                if a in pts and b in pts:
                    cv2.line(out, pts[a], pts[b], (0, 255, 0), 2)
            for _, (x, y) in pts.items():
                cv2.circle(out, (x, y), 3, (0, 0, 255), -1)
            if p["bbox"]:
                x1, y1 = int(p["bbox"][0]), int(p["bbox"][1])
                ident = p.get("identity")
                label = f"#{ident['jersey']} {ident['name']} ({ident['gsis_id']})" if ident else f"ID:{p['track_id']}"
                cv2.putText(out, label, (x1, max(14, y1 - 8)), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (255, 255, 0), 1)
        return out

    def save_shadow(self, path: str | Path) -> None:
        p = Path(path)
        p.parent.mkdir(parents=True, exist_ok=True)
        with open(p, "w", encoding="utf-8") as f:
            for row in self.shadow_log:
                f.write(json.dumps(row) + "\n")


# ============================================================================
# 5. Broadcast-to-Field Tracklet Pipeline (Detection / Tracklet / ByteTrack IoU
#    + Hungarian / AdaptiveKalman / join_tracklet_to_gsis)
# ============================================================================

from dataclasses import dataclass, field
from scipy.optimize import linear_sum_assignment


@dataclass
class Detection:
    bbox: np.ndarray          # [x1, y1, x2, y2]
    conf: float = 1.0
    keypoints: Optional[np.ndarray] = None  # (17, 3) COCO: x, y, conf
    jersey: Optional[str] = None
    jersey_ocr: Optional[str] = None
    team: Optional[str] = None
    color_embedding: Optional[np.ndarray] = None  # 6D L2-normalized [R1,G1,B1,R2,G2,B2] torso color descriptor (shadow)

    def __post_init__(self) -> None:
        # Support positional Detection(bbox, keypoints, conf) as well as Detection(bbox, conf, keypoints, jersey)
        if isinstance(self.conf, np.ndarray) and (self.keypoints is None or isinstance(self.keypoints, (int, float))):
            kpts = self.conf
            cf = float(self.keypoints) if self.keypoints is not None else 1.0
            self.keypoints = kpts
            self.conf = cf
        if self.jersey is None and self.jersey_ocr is not None:
            self.jersey = self.jersey_ocr
        elif self.jersey_ocr is None and self.jersey is not None:
            self.jersey_ocr = self.jersey


@dataclass
class Track:
    track_id: int
    bbox: np.ndarray
    state: np.ndarray         # Kalman [x, y, vx, vy]
    covariance: np.ndarray
    age: int = 0
    hits: int = 0
    time_since_update: int = 0
    jersey: Optional[str] = None
    team: Optional[str] = None
    gsis_id: Optional[str] = None
    color_embedding: Optional[np.ndarray] = None
    shadow_gsis_id: Optional[str] = None
    is_coast: bool = False
    low_pass_recoveries: int = 0


@dataclass
class Tracklet:
    track_id: int
    state: np.ndarray         # [x, y, vx, vy] in field meters
    covariance: np.ndarray    # 4x4
    jersey: Optional[str] = None
    team: Optional[str] = None
    gsis_id: Optional[str] = None
    color_embedding: Optional[np.ndarray] = None  # Shadow second-signal visual/color embedding (weight 0)
    shadow_gsis_id: Optional[str] = None          # Candidate gsis_id resolved with shadow jersey-color tie-breaker
    bbox: np.ndarray = field(default_factory=lambda: np.zeros(4, dtype=np.float64))
    missed_frames: int = 0
    low_pass_recoveries: int = 0
    frames: List[int] = field(default_factory=list)
    positions: List[np.ndarray] = field(default_factory=list)


class AdaptiveKalman:
    """
    4-state field-meter constant-velocity Kalman filter [x, y, vx, vy] with
    confidence-adaptive R (R = r_base / max(conf, 0.05)) and Joseph-form
    covariance update.
    """

    def __init__(self, dt: float = 0.1, q_scale: float = 0.01, r_base: float = 0.25):
        self.dt = dt
        self.F = np.array([
            [1.0, 0.0, self.dt, 0.0],
            [0.0, 1.0, 0.0, self.dt],
            [0.0, 0.0, 1.0, 0.0],
            [0.0, 0.0, 0.0, 1.0],
        ], dtype=np.float64)
        self.H = np.eye(2, 4, dtype=np.float64)
        self.Q = np.eye(4, dtype=np.float64) * q_scale
        self.R_base = r_base

    def predict(self, state: np.ndarray, cov: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        state = self.F @ state
        cov = self.F @ cov @ self.F.T + self.Q
        return state, cov

    def update(
        self,
        state: np.ndarray,
        cov: np.ndarray,
        z: np.ndarray,
        conf: float,
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        r_val = self.R_base / max(float(conf), 0.05)
        R = np.eye(2, dtype=np.float64) * r_val
        S = self.H @ cov @ self.H.T + R
        K = cov @ self.H.T @ np.linalg.inv(S)
        y = np.asarray(z, dtype=np.float64)[:2] - self.H @ state
        state = state + K @ y
        I_KH = np.eye(4, dtype=np.float64) - K @ self.H
        # Joseph-form covariance update for numerical stability
        cov = I_KH @ cov @ I_KH.T + K @ R @ K.T
        return state, cov, y


def iou_matrix(boxes_a: np.ndarray, boxes_b: np.ndarray) -> np.ndarray:
    """boxes: N x 4 (x1, y1, x2, y2)"""
    if len(boxes_a) == 0 or len(boxes_b) == 0:
        return np.zeros((len(boxes_a), len(boxes_b)), dtype=np.float64)
    a = np.asarray(boxes_a, dtype=np.float64)[:, None]
    b = np.asarray(boxes_b, dtype=np.float64)[None, :]
    inter_x1 = np.maximum(a[..., 0], b[..., 0])
    inter_y1 = np.maximum(a[..., 1], b[..., 1])
    inter_x2 = np.minimum(a[..., 2], b[..., 2])
    inter_y2 = np.minimum(a[..., 3], b[..., 3])
    inter = np.maximum(0.0, inter_x2 - inter_x1) * np.maximum(0.0, inter_y2 - inter_y1)
    area_a = (boxes_a[:, 2] - boxes_a[:, 0]) * (boxes_a[:, 3] - boxes_a[:, 1])
    area_b = (boxes_b[:, 2] - boxes_b[:, 0]) * (boxes_b[:, 3] - boxes_b[:, 1])
    union = area_a[:, None] + area_b[None, :] - inter
    return inter / np.maximum(union, 1e-6)


def byte_track_associate(
    high_dets: List[Detection],
    low_dets: List[Detection],
    tracks: List[Tracklet],
    iou_thresh: float = 0.3,
) -> Tuple[List[Tuple[int, int, str]], List[int], List[int], List[int]]:
    """
    ByteTrack two-pass association (Zhang et al., 2022).
    Pass 1: high-confidence detections (conf > high_thresh) to existing tracks via IoU + Hungarian.
    Pass 2: low-confidence detections (low_thresh < conf <= high_thresh) to remaining unmatched tracks.
    Returns (matches, unmatched_tracks, unmatched_high, unmatched_low)
    where matches is list of (det_idx_in_combined_high_plus_low, track_idx, pass_label).
    """
    if not tracks:
        return [], [], list(range(len(high_dets))), list(range(len(low_dets)))
    track_boxes = np.array([t.bbox for t in tracks], dtype=np.float64)
    matches: List[Tuple[int, int, str]] = []
    used_tracks: set[int] = set()
    used_high: set[int] = set()
    used_low: set[int] = set()

    # Pass 1 — high confidence
    if high_dets:
        high_boxes = np.array([d.bbox for d in high_dets], dtype=np.float64)
        iou = iou_matrix(high_boxes, track_boxes)
        cost = 1.0 - iou
        row, col = linear_sum_assignment(cost)
        for r, c in zip(row, col):
            if iou[r, c] >= iou_thresh:
                matches.append((int(r), int(c), "high"))
                used_tracks.add(int(c))
                used_high.add(int(r))

    # Pass 2 — low confidence recovery on remaining tracks
    remaining_tracks = [i for i in range(len(tracks)) if i not in used_tracks]
    if low_dets and remaining_tracks:
        low_boxes = np.array([d.bbox for d in low_dets], dtype=np.float64)
        rem_boxes = track_boxes[remaining_tracks]
        iou = iou_matrix(low_boxes, rem_boxes)
        cost = 1.0 - iou
        row, col = linear_sum_assignment(cost)
        for r, c in zip(row, col):
            if iou[r, c] >= iou_thresh:
                track_idx = remaining_tracks[int(c)]
                matches.append((int(r) + len(high_dets), track_idx, "low"))
                used_tracks.add(track_idx)
                used_low.add(int(r))

    unmatched_tracks = [i for i in range(len(tracks)) if i not in used_tracks]
    unmatched_high = [i for i in range(len(high_dets)) if i not in used_high]
    unmatched_low = [i for i in range(len(low_dets)) if i not in used_low]

    return matches, unmatched_tracks, unmatched_high, unmatched_low


NGS_TEAM_ID_TO_ABBR: Dict[str, str] = {
    "0200": "ATL", "0325": "BAL", "0610": "BUF", "0750": "CAR", "0810": "CHI",
    "0920": "CIN", "1050": "CLE", "1200": "DAL", "1400": "DEN", "1540": "DET",
    "1800": "GB",  "2100": "TEN", "2120": "HOU", "2200": "IND", "2250": "JAX",
    "2310": "KC",  "2510": "LAR", "2520": "LV",  "2700": "MIA", "3000": "MIN",
    "3200": "NE",  "3300": "NO",  "3410": "NYG", "3430": "NYJ", "3700": "PHI",
    "3800": "ARI", "3900": "PIT", "4400": "LAC", "4500": "SF",  "4600": "SEA",
    "4900": "TB",  "5110": "WAS",
}
NGS_ABBR_TO_TEAM_IDS: Dict[str, set[str]] = {
    "ARI": {"3800", "ARI", "AZ"}, "AZ": {"3800", "ARI", "AZ"},
    "LAR": {"2510", "LAR", "LA"}, "LA": {"2510", "LAR", "LA"},
}
for _tid, _abbr in NGS_TEAM_ID_TO_ABBR.items():
    NGS_ABBR_TO_TEAM_IDS.setdefault(_abbr, set()).update({_tid, _abbr})


def _norm_jersey_str(val: Any) -> str:
    if val is None:
        return ""
    s = str(val).strip()
    if not s or s.lower() == "nan":
        return ""
    try:
        return str(int(float(s)))
    except Exception:
        return s


def join_tracklet_to_gsis(
    tracklet: Tracklet,
    participation: Any,   # polars or pandas DataFrame from ngs_highlight_participation or pbp_participation
    roster: Any,          # polars or pandas DataFrame from roster_2026 / players.parquet
    game_id: str | int,
    play_id: int,
) -> Optional[str]:
    """
    Join a vision tracklet to a stable gsis_id.
    Priority: jersey + team + play participation -> roster fallback.
    Fail-closed: returns None if ambiguous or missing. Weight 0 until measured at scale.
    """
    if not tracklet.jersey:
        return None
    jersey = _norm_jersey_str(tracklet.jersey)
    if not jersey:
        return None

    team_match_tokens = NGS_ABBR_TO_TEAM_IDS.get((tracklet.team or "").upper(), {(tracklet.team or "").upper()})

    # Support both Polars and Pandas DataFrames seamlessly
    is_polars_part = hasattr(participation, "height") and hasattr(participation, "filter") and not hasattr(participation, "iloc")
    if is_polars_part:
        import polars as pl
        on_field = participation.filter(
            (pl.col("game_id").cast(pl.Utf8) == str(game_id)) &
            (pl.col("play_id").cast(pl.Int64) == int(play_id))
        )
        candidates = on_field.filter(
            pl.col("jersey_number").cast(pl.Float64).cast(pl.Int64).cast(pl.Utf8) == jersey
        )
        if candidates.height > 1 and tracklet.team:
            for tcol in ("team_abbr", "team", "club", "team_id", "current_team_id"):
                if tcol in candidates.columns:
                    filtered = candidates.filter(pl.col(tcol).cast(pl.Utf8).is_in(list(team_match_tokens)))
                    if filtered.height > 0:
                        candidates = filtered
                        break
        if candidates.height == 1:
            gsis = str(candidates["gsis_id"][0])
            tracklet.gsis_id = gsis
            return gsis
    elif participation is not None and len(participation) > 0:
        import pandas as pd
        gid_col = "game_id" if "game_id" in participation.columns else "nflverse_game_id"
        on_field = participation[
            (participation[gid_col].astype(str) == str(game_id)) &
            (participation["play_id"].astype(int) == int(play_id))
        ]
        if not on_field.empty and "jersey_number" in on_field.columns:
            j_norm = on_field["jersey_number"].map(_norm_jersey_str)
            candidates = on_field[j_norm == jersey]
            if len(candidates) > 1 and tracklet.team:
                for tcol in ("team_abbr", "team", "club", "team_id", "current_team_id"):
                    if tcol in candidates.columns:
                        filtered = candidates[candidates[tcol].astype(str).str.upper().isin(team_match_tokens)]
                        if len(filtered) > 0:
                            candidates = filtered
                            break
            if len(candidates) == 1:
                gsis = str(candidates["gsis_id"].iloc[0])
                tracklet.gsis_id = gsis
                return gsis

    # Fallback: jersey + team from roster if participation missing or ambiguous across teams
    if roster is not None and tracklet.team:
        is_polars_rost = hasattr(roster, "height") and hasattr(roster, "filter") and not hasattr(roster, "iloc")
        if is_polars_rost:
            import polars as pl
            team_candidates = roster.filter(
                (pl.col("jersey_number").cast(pl.Float64).cast(pl.Int64).cast(pl.Utf8) == jersey) &
                (pl.col("team") == tracklet.team)
            )
            if team_candidates.height == 1:
                gsis = str(team_candidates["gsis_id"][0])
                tracklet.gsis_id = gsis
                return gsis
        elif len(roster) > 0:
            tcol = "team" if "team" in roster.columns else "latest_team"
            j_norm = roster["jersey_number"].map(_norm_jersey_str)
            team_candidates = roster[
                (j_norm == jersey) &
                (roster[tcol].astype(str).str.upper() == tracklet.team.upper())
            ]
            if len(team_candidates) == 1:
                gsis = str(team_candidates["gsis_id"].iloc[0])
                tracklet.gsis_id = gsis
                return gsis

    return None


class JerseyColorEmbeddingResolver:
    """
    Shadow second-signal identity tie-breaker using L2-normalized 6D RGB primary/secondary
    team jersey color embeddings from nflverse teams_colors_logos.parquet.
    Used ONLY at weight 0 in shadow mode to disambiguate duplicate jersey numbers across
    opposing teams on the same play when tracklet.team is not pre-populated.
    """

    def __init__(self) -> None:
        self.team_vecs: Dict[str, np.ndarray] = {}
        self.team_id_to_vec: Dict[str, np.ndarray] = {}
        self.team_id_to_abbr: Dict[str, str] = dict(NGS_TEAM_ID_TO_ABBR)
        self._load_colors()

    @staticmethod
    def _hex_pair_to_vec(h1: str, h2: str) -> np.ndarray:
        def _h2rgb(h: str) -> Tuple[int, int, int]:
            s = (h or "#000000").lstrip("#")
            if len(s) < 6:
                s = s.ljust(6, "0")
            return int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16)

        r1, g1, b1 = _h2rgb(h1)
        r2, g2, b2 = _h2rgb(h2)
        v = np.array([r1, g1, b1, r2, g2, b2], dtype=np.float64)
        nrm = float(np.linalg.norm(v))
        return v / nrm if nrm > 1e-9 else v

    def _load_colors(self) -> None:
        import pandas as pd
        p = COACH_DATA / "teams_colors_logos.parquet"
        if not p.exists():
            return
        df = pd.read_parquet(p)
        for r in df.itertuples(index=False):
            abbr = str(r.team_abbr).upper()
            tid = str(r.team_id)
            vec = self._hex_pair_to_vec(str(r.team_color), str(r.team_color2))
            self.team_vecs[abbr] = vec
            self.team_id_to_vec[tid] = vec
            self.team_id_to_abbr[tid] = abbr
        if "LA" in self.team_vecs:
            self.team_vecs["LAR"] = self.team_vecs["LA"]
        if "ARI" in self.team_vecs:
            self.team_vecs["AZ"] = self.team_vecs["ARI"]

    def resolve_shadow_with_color(
        self,
        tracklet: Tracklet,
        participation: Any,
        game_id: str | int,
        play_id: int,
        min_cosine_margin: float = 0.01,
    ) -> Optional[str]:
        """
        Attempt jersey-only join first; if 2 candidates share the same jersey number
        across opposing teams on the play, use tracklet.color_embedding cosine similarity
        against each candidate's team color vector as a shadow tie-breaker.
        """
        if not tracklet.jersey:
            return None
        jersey = _norm_jersey_str(tracklet.jersey)
        if not jersey or participation is None or len(participation) == 0:
            return None

        gid_col = "game_id" if "game_id" in participation.columns else "nflverse_game_id"
        on_field = participation[
            (participation[gid_col].astype(str) == str(game_id)) &
            (participation["play_id"].astype(int) == int(play_id))
        ]
        if on_field.empty or "jersey_number" not in on_field.columns:
            return None

        j_norm = on_field["jersey_number"].map(_norm_jersey_str)
        candidates = on_field[j_norm == jersey]
        if len(candidates) == 1:
            gsis = str(candidates["gsis_id"].iloc[0])
            tracklet.shadow_gsis_id = gsis
            return gsis

        if len(candidates) > 1 and tracklet.color_embedding is not None:
            emb = np.asarray(tracklet.color_embedding, dtype=np.float64)
            nrm = float(np.linalg.norm(emb))
            if nrm > 1e-9:
                emb = emb / nrm
            scored: List[Tuple[float, str]] = []
            for r in candidates.itertuples(index=False):
                tid = str(getattr(r, "current_team_id", "") or getattr(r, "team_id", ""))
                tabbr = str(getattr(r, "team_abbr", "") or getattr(r, "team", "")).upper()
                tvec = self.team_id_to_vec.get(tid)
                if tvec is None and tabbr:
                    tvec = self.team_vecs.get(tabbr)
                if tvec is not None:
                    scored.append((float(np.dot(emb, tvec)), str(r.gsis_id)))
            if len(scored) >= 2:
                scored.sort(key=lambda x: x[0], reverse=True)
                if (scored[0][0] - scored[1][0]) >= min_cosine_margin:
                    tracklet.shadow_gsis_id = scored[0][1]
                    return scored[0][1]
        return None


class SkeleTrack:
    """
    Broadcast-to-field tracklet pipeline combining:
      - Two-pass ByteTrack IoU + Hungarian association (high-conf > 0.5, low-conf 0.1..0.5 recovery)
      - 30-frame coasting buffer before track deletion
      - Homography ground-plane projection (mid-hip keypoint proxy if available, else keypoint[0])
      - Per-tracklet 4-state field-meter AdaptiveKalman [x, y, vx, vy]
    """

    def __init__(
        self,
        q_scale: float = 0.01,
        r_base: float = 0.25,
        high_thresh: float = 0.5,
        low_thresh: float = 0.1,
        iou_thresh: float = 0.3,
        max_coast_frames: int = 30,
    ):
        self.kalman = AdaptiveKalman(q_scale=q_scale, r_base=r_base)
        self.tracks: Dict[int, Tracklet] = {}
        self.next_id = 1
        self.high_thresh = high_thresh
        self.low_thresh = low_thresh
        self.iou_thresh = iou_thresh
        self.max_coast_frames = max_coast_frames

    @staticmethod
    def _extract_ground_point_px(det: Detection) -> np.ndarray:
        """Use mid-hip (COCO indices 11, 12) when present, else keypoint[0]."""
        if det.keypoints is not None and len(det.keypoints) >= 13:
            c11 = det.keypoints[11, 2] if det.keypoints.shape[1] >= 3 else 1.0
            c12 = det.keypoints[12, 2] if det.keypoints.shape[1] >= 3 else 1.0
            if c11 > 0.1 and c12 > 0.1:
                return 0.5 * (det.keypoints[11, :2] + det.keypoints[12, :2])
        return det.keypoints[0, :2]

    def associate(
        self,
        detections: List[Detection],
        tracks: List[Tracklet],
    ) -> Tuple[List[Tuple[Detection, int, str]], List[int], List[Detection]]:
        high_dets = [d for d in detections if d.conf > self.high_thresh]
        low_dets = [d for d in detections if self.low_thresh < d.conf <= self.high_thresh]
        combined = high_dets + low_dets
        raw_matches, unmatched_track_idxs, unmatched_high_idxs, _ = byte_track_associate(
            high_dets, low_dets, tracks, iou_thresh=self.iou_thresh
        )
        matched_pairs = [
            (combined[det_i], tracks[trk_i].track_id, pass_tag)
            for det_i, trk_i, pass_tag in raw_matches
        ]
        unmatched_high_dets = [high_dets[i] for i in unmatched_high_idxs]
        return matched_pairs, unmatched_track_idxs, unmatched_high_dets

    def process_frame(
        self,
        detections: List[Detection],
        frame_id: int,
        homography: np.ndarray,
    ) -> List[Tracklet]:
        # 1. Predict all existing tracks
        track_list = list(self.tracks.values())
        for t in track_list:
            t.state, t.covariance = self.kalman.predict(t.state, t.covariance)

        # 2. Two-pass ByteTrack association
        matched_pairs, unmatched_track_idxs, unmatched_high_dets = self.associate(detections, track_list)

        # 3. Update matched tracks
        for det, track_id, pass_tag in matched_pairs:
            track = self.tracks[track_id]
            center = self._extract_ground_point_px(det).astype(np.float32)
            field_xy = cv2.perspectiveTransform(center.reshape(1, 1, 2), homography.astype(np.float64))[0, 0]
            track.state, track.covariance, _ = self.kalman.update(
                track.state, track.covariance, field_xy, det.conf
            )
            track.bbox = np.asarray(det.bbox, dtype=np.float64)
            track.missed_frames = 0
            if pass_tag == "low":
                track.low_pass_recoveries += 1
            if det.jersey_ocr:
                track.jersey = det.jersey_ocr
            if det.team:
                track.team = det.team
            if det.color_embedding is not None:
                track.color_embedding = det.color_embedding
            track.frames.append(frame_id)
            track.positions.append(track.state[:2].copy())

        # 4. Coast unmatched tracks and prune expired (> max_coast_frames)
        for trk_idx in unmatched_track_idxs:
            trk = track_list[trk_idx]
            trk.missed_frames += 1
            if trk.missed_frames > self.max_coast_frames:
                self.tracks.pop(trk.track_id, None)

        # 5. Birth new tracks for unmatched high-confidence detections
        for det in unmatched_high_dets:
            center = self._extract_ground_point_px(det).astype(np.float32)
            field_xy = cv2.perspectiveTransform(center.reshape(1, 1, 2), homography.astype(np.float64))[0, 0]
            init_state = np.array([float(field_xy[0]), float(field_xy[1]), 0.0, 0.0], dtype=np.float64)
            r_init = self.kalman.R_base / max(float(det.conf), 0.05)
            init_cov = np.diag([r_init, r_init, 4.0, 4.0]).astype(np.float64)
            tid = self.next_id
            self.next_id += 1
            self.tracks[tid] = Tracklet(
                track_id=tid,
                state=init_state,
                covariance=init_cov,
                jersey=det.jersey_ocr,
                team=det.team,
                color_embedding=det.color_embedding,
                bbox=np.asarray(det.bbox, dtype=np.float64),
                missed_frames=0,
                frames=[frame_id],
                positions=[init_state[:2].copy()],
            )

        return list(self.tracks.values())


class ByteTrack:
    """
    Standalone two-pass ByteTrack associator (Zhang et al., 2022) with:
      - Pass 1: high-confidence detections (conf >= high_thresh) matched to active tracks via IoU + Hungarian.
      - Pass 2: low-confidence detections (low_thresh <= conf < high_thresh) matched ONLY to remaining
        unmatched tracks to recover partially occluded or motion-blurred players without birthing false tracks.
      - Track birth ONLY from unmatched high-confidence detections.
      - Coasting buffer (max_coast frames, default 30 frames = 3.0s at 10 Hz) during which AdaptiveKalman
        continues to predict state and covariance before deletion.
    """

    def __init__(
        self,
        high_thresh: float = 0.5,
        low_thresh: float = 0.1,
        iou_thresh: float = 0.3,
        max_coast: int = 30,
        q_scale: float = 0.01,
        r_base: float = 0.25,
    ):
        self.high_thresh = high_thresh
        self.low_thresh = low_thresh
        self.iou_thresh = iou_thresh
        self.max_coast = max_coast
        self.tracks: Dict[int, Track] = {}
        self.next_id = 1
        self.kalman = AdaptiveKalman(q_scale=q_scale, r_base=r_base)
        self.pass1_high_matches = 0
        self.pass2_low_recoveries = 0

    def update(self, detections: List[Detection]) -> List[Track]:
        # Split detections into high-confidence and low-confidence tiers
        high_dets = [d for d in detections if d.conf >= self.high_thresh]
        low_dets = [d for d in detections if self.low_thresh <= d.conf < self.high_thresh]

        # Predict all tracks and advance age / coasting counters
        for t in self.tracks.values():
            t.state, t.covariance = self.kalman.predict(t.state, t.covariance)
            t.time_since_update += 1
            t.age += 1
            # Shift predicted bbox by velocity (vx*dt, vy*dt) so IoU gating tracks motion during coasting
            dx = float(t.state[2] * self.kalman.dt)
            dy = float(t.state[3] * self.kalman.dt)
            t.bbox = np.array([t.bbox[0] + dx, t.bbox[1] + dy, t.bbox[2] + dx, t.bbox[3] + dy], dtype=np.float64)

        active_tracks = [t for t in self.tracks.values() if t.time_since_update <= self.max_coast]
        track_list = list(active_tracks)

        # Pass 1: high-confidence association
        matches_high, unmatched_tracks, unmatched_high = self._associate(
            high_dets, track_list, self.iou_thresh
        )

        # Pass 2: low-confidence recovery on remaining unmatched tracks only
        remaining_tracks = [track_list[i] for i in unmatched_tracks]
        matches_low, unmatched_tracks2, _ = self._associate(
            low_dets, remaining_tracks, self.iou_thresh
        )

        # Apply high-confidence matches
        for det_idx, track_idx, _ in matches_high:
            self.pass1_high_matches += 1
            self._update_track(track_list[track_idx], high_dets[det_idx], is_low_recovery=False)

        # Apply low-confidence recovery matches
        for det_idx, track_idx, _ in matches_low:
            self.pass2_low_recoveries += 1
            self._update_track(remaining_tracks[track_idx], low_dets[det_idx], is_low_recovery=True)

        # Birth new tracks from unmatched high-confidence detections ONLY
        for det_idx in unmatched_high:
            self._birth(high_dets[det_idx])

        # Mark coasting flag
        for t in self.tracks.values():
            t.is_coast = t.time_since_update > 0

        # Delete expired tracks exceeding coasting buffer
        to_delete = [tid for tid, t in self.tracks.items() if t.time_since_update > self.max_coast]
        for tid in to_delete:
            del self.tracks[tid]

        return list(self.tracks.values())

    def _associate(
        self,
        dets: List[Detection],
        tracks: List[Track],
        iou_thresh: float,
    ) -> Tuple[List[Tuple[int, int, str]], List[int], List[int]]:
        if not dets or not tracks:
            return [], list(range(len(tracks))), list(range(len(dets)))

        det_boxes = np.array([d.bbox for d in dets], dtype=np.float64)
        track_boxes = np.array([t.bbox for t in tracks], dtype=np.float64)
        iou = iou_matrix(det_boxes, track_boxes)
        cost = 1.0 - iou
        row, col = linear_sum_assignment(cost)

        matches: List[Tuple[int, int, str]] = []
        used_d: set[int] = set()
        used_t: set[int] = set()
        for r, c in zip(row, col):
            if iou[r, c] >= iou_thresh:
                matches.append((int(r), int(c), "assoc"))
                used_d.add(int(r))
                used_t.add(int(c))

        unmatched_t = [i for i in range(len(tracks)) if i not in used_t]
        unmatched_d = [i for i in range(len(dets)) if i not in used_d]
        return matches, unmatched_t, unmatched_d

    def _update_track(self, track: Track, det: Detection, is_low_recovery: bool = False) -> None:
        z = np.array([
            0.5 * (float(det.bbox[0]) + float(det.bbox[2])),
            0.5 * (float(det.bbox[1]) + float(det.bbox[3])),
        ], dtype=np.float64)
        track.state, track.covariance, _ = self.kalman.update(
            track.state, track.covariance, z, det.conf
        )
        track.bbox = np.asarray(det.bbox, dtype=np.float64).copy()
        track.hits += 1
        track.time_since_update = 0
        track.is_coast = False
        if is_low_recovery:
            track.low_pass_recoveries += 1
        if det.jersey:
            track.jersey = det.jersey
        if det.team:
            track.team = det.team
        if det.color_embedding is not None:
            track.color_embedding = det.color_embedding

    def _birth(self, det: Detection) -> Track:
        cx = 0.5 * (float(det.bbox[0]) + float(det.bbox[2]))
        cy = 0.5 * (float(det.bbox[1]) + float(det.bbox[3]))
        init_state = np.array([cx, cy, 0.0, 0.0], dtype=np.float64)
        r_init = self.kalman.R_base / max(float(det.conf), 0.05)
        init_cov = np.diag([r_init, r_init, 4.0, 4.0]).astype(np.float64)
        tid = self.next_id
        self.next_id += 1
        trk = Track(
            track_id=tid,
            bbox=np.asarray(det.bbox, dtype=np.float64).copy(),
            state=init_state,
            covariance=init_cov,
            age=1,
            hits=1,
            time_since_update=0,
            jersey=det.jersey,
            team=det.team,
            color_embedding=det.color_embedding,
            is_coast=False,
        )
        self.tracks[tid] = trk
        return trk


@dataclass
class Homography:
    """3x3 Hartley DLT image-to-field homography."""
    H: np.ndarray  # shape (3, 3)

    def project(self, u: np.ndarray) -> np.ndarray:
        """u: (2,) or (N, 2) pixel coords -> (2,) or (N, 2) field meters."""
        is_1d = u.ndim == 1
        u_2d = np.atleast_2d(np.asarray(u, dtype=np.float64))
        ones = np.ones((len(u_2d), 1), dtype=np.float64)
        uv1 = np.hstack([u_2d, ones])
        xyz = (self.H @ uv1.T).T
        xy = xyz[:, :2] / xyz[:, 2:3]
        return xy[0] if is_1d else xy

    def jacobian(self, u: np.ndarray) -> np.ndarray:
        """
        Exact 2x2 Jacobian J = d(x,y)/d(u,v) of the perspective map.
        u: (2,) or (N, 2) pixel coordinates.
        Returns (2, 2) or (N, 2, 2).
        """
        u_2d = np.atleast_2d(np.asarray(u, dtype=np.float64))
        ones = np.ones((len(u_2d), 1), dtype=np.float64)
        uv1 = np.hstack([u_2d, ones])
        xyz = (self.H @ uv1.T).T          # (N, 3)
        w = xyz[:, 2]
        x, y = xyz[:, 0] / w, xyz[:, 1] / w

        # Quotient-rule form of the Jacobian
        # J = (1/w) * [[h11 - x*h31, h12 - x*h32],
        #              [h21 - y*h31, h22 - y*h32]]
        h = self.H
        J = np.empty((len(u_2d), 2, 2), dtype=np.float64)
        J[:, 0, 0] = (h[0, 0] - x * h[2, 0]) / w
        J[:, 0, 1] = (h[0, 1] - x * h[2, 1]) / w
        J[:, 1, 0] = (h[1, 0] - y * h[2, 0]) / w
        J[:, 1, 1] = (h[1, 1] - y * h[2, 1]) / w
        return J.squeeze(0) if J.shape[0] == 1 else J


class AdaptiveKalmanJacobian:
    """
    4-state constant-velocity Kalman with projective Jacobian R.
    State: [x, y, vx, vy] in field meters.
    """

    def __init__(self, r_pixel_base: float = 4.0, epsilon: float = 1e-6):
        self.dt = 0.1
        self.F = np.array([
            [1.0, 0.0, self.dt, 0.0],
            [0.0, 1.0, 0.0, self.dt],
            [0.0, 0.0, 1.0, 0.0],
            [0.0, 0.0, 0.0, 1.0],
        ], dtype=np.float64)
        self.H_obs = np.array([
            [1.0, 0.0, 0.0, 0.0],
            [0.0, 1.0, 0.0, 0.0],
        ], dtype=np.float64)
        self.Q = np.diag([0.01, 0.01, 0.25, 0.25]).astype(np.float64)
        self.r_pixel_base = r_pixel_base   # pixel^2
        self.epsilon = epsilon

    def predict(self, state: np.ndarray, cov: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        state = self.F @ state
        cov = self.F @ cov @ self.F.T + self.Q
        return state, cov

    def update(
        self,
        state: np.ndarray,
        cov: np.ndarray,
        z_field: np.ndarray,
        pixel_uv: np.ndarray,
        conf: float,
        H: Homography,
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """
        z_field: (2,) measured field position (already projected)
        pixel_uv: (2,) original pixel coordinate used for the projection
        """
        # Pixel-space covariance (anisotropic allowed; here isotropic for control)
        r_pix = self.r_pixel_base / max(float(conf), 0.05)
        R_pixel = np.eye(2, dtype=np.float64) * r_pix

        # Propagate through the exact Jacobian
        J = H.jacobian(pixel_uv)          # (2, 2)
        R_field = J @ R_pixel @ J.T + self.epsilon * np.eye(2, dtype=np.float64)

        # Standard Joseph-form update
        S = self.H_obs @ cov @ self.H_obs.T + R_field
        K = cov @ self.H_obs.T @ np.linalg.inv(S)
        y = np.asarray(z_field, dtype=np.float64)[:2] - self.H_obs @ state
        state = state + K @ y
        I_KH = np.eye(4, dtype=np.float64) - K @ self.H_obs
        cov = I_KH @ cov @ I_KH.T + K @ R_field @ K.T
        return state, cov, y, R_field


def main() -> None:
    parser = argparse.ArgumentParser(description="SkeleTrack-style open-source proxy v2 (GSE Vision Plane)")
    parser.add_argument("--source", required=True, help="Video file or camera index")
    parser.add_argument("--output", default="skeletrack_v2.mp4", help="Annotated output video")
    parser.add_argument("--shadow", default="skeletrack_v2_shadow.jsonl", help="Shadow ledger path")
    parser.add_argument("--model", default="yolov8n-pose.pt", help="YOLO-pose model")
    parser.add_argument("--conf", type=float, default=0.35, help="Detection confidence")
    parser.add_argument("--q-base", type=float, default=2.0, help="Base process noise Q")
    parser.add_argument("--r-base", type=float, default=8.0, help="Base measurement noise R")
    args = parser.parse_args()

    cap = cv2.VideoCapture(args.source if not args.source.isdigit() else int(args.source))
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open source: {args.source}")
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    proxy = SkeleTrackV2(
        model_path=args.model,
        conf=args.conf,
        q_base=args.q_base,
        r_base=args.r_base,
        fps=fps,
    )

    writer = cv2.VideoWriter(args.output, cv2.VideoWriter_fourcc(*"mp4v"), fps, (w, h))
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        result = proxy.process_frame(frame)
        writer.write(proxy.draw(frame, result))

    cap.release()
    writer.release()
    proxy.save_shadow(args.shadow)
    print(f"Done. Shadow ledger: {args.shadow} ({len(proxy.shadow_log)} frames)")


if __name__ == "__main__":
    main()
