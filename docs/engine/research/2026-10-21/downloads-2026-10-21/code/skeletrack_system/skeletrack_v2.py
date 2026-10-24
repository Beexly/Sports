#!/usr/bin/env python3
"""
SkeleTrack-Style Open-Source Proxy v2
=====================================
Local multi-person skeletal tracking for sports video.

Features:
- YOLO-pose (Ultralytics) for 17 COCO keypoints
- ByteTrack for persistent player IDs
- Per-keypoint constant-velocity Kalman filter with adaptive tuning
- Multi-view DLT triangulation (OpenCV)
- Confidence-weighted measurement noise
- Joint-specific process noise (extremities vs torso)
- Weight-0 shadow ledger with covariance

Kalman Filter Tuning Parameters
-------------------------------
State vector: [x, y, vx, vy]

Q (process noise covariance):
  - Models uncertainty in the motion model (constant velocity).
  - Higher Q → filter trusts measurements more, reacts faster to sudden changes.
  - Lower Q → smoother tracks, trusts the motion model more.
  - Joint-specific: feet/hands get higher Q (more agile); torso gets lower Q.

R (measurement noise covariance):
  - Models uncertainty in the keypoint detection.
  - Higher R → smoother, less trust in raw detections.
  - Lower R → follows raw keypoints more closely.
  - Adaptive: R is scaled by (1 - confidence). Low-confidence detections
    get higher R so the filter coasts more.

Initial P:
  - Large initial covariance so the first measurement is trusted.

dt:
  - Time step between frames (1/fps). Affects the state transition matrix F.

Usage:
    python skeletrack_v2.py --source video.mp4 --output tracked.mp4
    python skeletrack_v2.py --source video.mp4 --q-base 3.0 --r-base 10.0
"""

import argparse
import json
import time
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple

import cv2
import numpy as np
from ultralytics import YOLO
from supervision import ByteTrack, Detections


# COCO-17 keypoints
KEYPOINT_NAMES = [
    "nose", "left_eye", "right_eye", "left_ear", "right_ear",
    "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
    "left_wrist", "right_wrist", "left_hip", "right_hip",
    "left_knee", "right_knee", "left_ankle", "right_ankle"
]

# Joint groups for process noise scaling
# Extremities move faster and change direction more → higher Q
# Torso is more stable → lower Q
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


class AdaptiveKalmanKeypoint:
    """
    Constant-velocity Kalman filter for a single 2D keypoint.

    State: [x, y, vx, vy]
    Tunable parameters:
      - q_base: base process noise (scaled per joint)
      - r_base: base measurement noise (scaled by confidence)
      - dt: frame time step
    """

    def __init__(
        self,
        dt: float = 1/30.0,
        q_base: float = 2.0,
        r_base: float = 8.0,
        joint_name: str = "default",
    ):
        self.dt = dt
        self.q_base = q_base
        self.r_base = r_base
        self.joint_name = joint_name
        self.q_scale = JOINT_Q_SCALE.get(joint_name, 1.0)

        # State: [x, y, vx, vy]
        self.x = np.zeros(4)
        self.P = np.eye(4) * 100.0  # large initial uncertainty

        # State transition (constant velocity)
        self.F = np.array([
            [1, 0, dt, 0],
            [0, 1, 0, dt],
            [0, 0, 1, 0],
            [0, 0, 0, 1]
        ], dtype=np.float64)

        # Observation matrix (we observe position only)
        self.H = np.array([
            [1, 0, 0, 0],
            [0, 1, 0, 0]
        ], dtype=np.float64)

        # Process noise: higher for extremities
        q = q_base * self.q_scale
        self.Q = np.diag([q * 0.1, q * 0.1, q, q])  # position noise small, velocity noise larger

        self.initialized = False
        self.missed = 0  # consecutive missed detections

    def set_measurement_noise(self, conf: float) -> np.ndarray:
        """
        Adaptive R based on detection confidence.
        Low confidence → higher R → filter trusts prediction more.
        conf in [0, 1]
        """
        # Scale: conf=1.0 → R = r_base * 0.5; conf=0.3 → R = r_base * 2.0
        scale = max(0.3, 1.5 - conf)
        r = self.r_base * scale
        return np.eye(2) * r

    def predict(self):
        """Predict step. Call when no measurement is available (coasting)."""
        self.x = self.F @ self.x
        self.P = self.F @ self.P @ self.F.T + self.Q
        self.missed += 1

    def update(self, z: np.ndarray, conf: float = 1.0):
        """
        Update with a measurement.
        z: [x, y]
        conf: keypoint confidence [0, 1]
        """
        if not self.initialized:
            self.x[:2] = z
            self.initialized = True
            self.missed = 0
            return

        self.predict()
        R = self.set_measurement_noise(conf)

        y = z - self.H @ self.x  # innovation
        S = self.H @ self.P @ self.H.T + R
        K = self.P @ self.H.T @ np.linalg.inv(S)  # Kalman gain

        self.x = self.x + K @ y
        I_KH = np.eye(4) - K @ self.H
        self.P = I_KH @ self.P @ I_KH.T + K @ R @ K.T  # Joseph form (more stable)
        self.missed = 0

    def position(self) -> Tuple[float, float]:
        return float(self.x[0]), float(self.x[1])

    def velocity(self) -> Tuple[float, float]:
        return float(self.x[2]), float(self.x[3])

    def covariance_trace(self) -> float:
        return float(np.trace(self.P[:2, :2]))

    def is_coasting(self) -> bool:
        return self.missed > 0


class SkeleTrackV2:
    """
    Multi-person skeletal tracker with adaptive Kalman smoothing
    and optional multi-view triangulation.
    """

    def __init__(
        self,
        model_path: str = "yolov8n-pose.pt",
        conf: float = 0.35,
        q_base: float = 2.0,
        r_base: float = 8.0,
        fps: float = 30.0,
    ):
        self.model = YOLO(model_path)
        self.tracker = ByteTrack()
        self.conf = conf
        self.q_base = q_base
        self.r_base = r_base
        self.dt = 1.0 / fps
        self.kalmans: Dict[int, Dict[str, AdaptiveKalmanKeypoint]] = {}
        self.frame_id = 0
        self.shadow_log: List[Dict] = []

    def process_frame(self, frame: np.ndarray) -> Dict[str, Any]:
        results = self.model(frame, conf=self.conf, verbose=False)[0]
        detections = Detections.from_ultralytics(results)
        tracked = self.tracker.update_with_detections(detections)

        players = []
        if tracked.tracker_id is not None and results.keypoints is not None:
            for i, tid in enumerate(tracked.tracker_id):
                if i >= len(results.keypoints.xy):
                    continue

                kpts_xy = results.keypoints.xy[i].cpu().numpy()
                kpts_conf = (
                    results.keypoints.conf[i].cpu().numpy()
                    if results.keypoints.conf is not None
                    else np.ones(17)
                )

                # Initialize Kalman filters for this track if needed
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

                smoothed = []
                for name, (x, y), c in zip(KEYPOINT_NAMES, kpts_xy, kpts_conf):
                    kf = self.kalmans[tid][name]
                    if c > 0.25:
                        kf.update(np.array([x, y]), conf=float(c))
                    else:
                        kf.predict()  # coast

                    sx, sy = kf.position()
                    vx, vy = kf.velocity()
                    smoothed.append({
                        "name": name,
                        "x_raw": float(x),
                        "y_raw": float(y),
                        "x": sx,
                        "y": sy,
                        "vx": vx,
                        "vy": vy,
                        "conf": float(c),
                        "cov_trace": kf.covariance_trace(),
                        "coasting": kf.is_coasting(),
                    })

                players.append({
                    "track_id": int(tid),
                    "keypoints": smoothed,
                    "bbox": tracked.xyxy[i].tolist() if i < len(tracked.xyxy) else None,
                })

        result = {
            "frame_id": self.frame_id,
            "players": players,
            "player_count": len(players),
            "weight": 0.0,
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
        Multi-view triangulation using OpenCV DLT.

        pts1, pts2: Nx2 arrays of corresponding keypoints.
        P1, P2: 3x4 projection matrices.
        conf1, conf2: optional Nx1 confidence arrays for weighting.

        Returns Nx3 3D points.
        """
        pts1_t = pts1.T.astype(np.float32)
        pts2_t = pts2.T.astype(np.float32)
        pts4d = cv2.triangulatePoints(P1, P2, pts1_t, pts2_t)
        pts3d = (pts4d[:3] / (pts4d[3] + 1e-8)).T
        return pts3d

    def draw(self, frame: np.ndarray, result: Dict) -> np.ndarray:
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
            for name, (x, y) in pts.items():
                cv2.circle(out, (x, y), 3, (0, 0, 255), -1)
            if p["bbox"]:
                x1, y1 = int(p["bbox"][0]), int(p["bbox"][1])
                cv2.putText(
                    out, f"ID:{p['track_id']}", (x1, y1 - 8),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 0), 1
                )
        return out

    def save_shadow(self, path: str):
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w") as f:
            for row in self.shadow_log:
                f.write(json.dumps(row) + "\n")


def main():
    parser = argparse.ArgumentParser(description="SkeleTrack-style open-source proxy v2")
    parser.add_argument("--source", required=True, help="Video file or camera index")
    parser.add_argument("--output", default="skeletrack_v2.mp4", help="Annotated output video")
    parser.add_argument("--shadow", default="skeletrack_v2_shadow.jsonl", help="Shadow ledger path")
    parser.add_argument("--model", default="yolov8n-pose.pt", help="YOLO-pose model")
    parser.add_argument("--conf", type=float, default=0.35, help="Detection confidence")
    parser.add_argument("--q-base", type=float, default=2.0,
                        help="Base process noise Q (higher = more responsive)")
    parser.add_argument("--r-base", type=float, default=8.0,
                        help="Base measurement noise R (higher = smoother)")
    args = parser.parse_args()

    # Get FPS for dt
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

    print(f"Processing {args.source} → {args.output}")
    print(f"Kalman: Q_base={args.q_base}, R_base={args.r_base}, dt={1/fps:.4f}")

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        result = proxy.process_frame(frame)
        writer.write(proxy.draw(frame, result))
        if proxy.frame_id % 50 == 0:
            print(f"Frame {proxy.frame_id} | players: {result['player_count']}")

    cap.release()
    writer.release()
    proxy.save_shadow(args.shadow)
    print(f"Done. Shadow ledger: {args.shadow} ({len(proxy.shadow_log)} frames)")


if __name__ == "__main__":
    main()
