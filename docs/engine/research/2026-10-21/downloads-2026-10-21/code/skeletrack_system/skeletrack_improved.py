#!/usr/bin/env python3
"""
Improved SkeleTrack-style Proxy
Multi-view triangulation + Kalman smoothing ready.

Free local system:
- YOLO-pose + ByteTrack (single view)
- Optional multi-view DLT triangulation (OpenCV)
- Per-keypoint constant-velocity Kalman filter
- Weight-0 shadow ledger

Improvements over base version:
- Cleaner keypoint association
- Optional Kalman smoothing on 2D or 3D points
- Multi-view triangulation helper
- Better shadow logging with covariance
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


KEYPOINT_NAMES = [
    "nose", "left_eye", "right_eye", "left_ear", "right_ear",
    "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
    "left_wrist", "right_wrist", "left_hip", "right_hip",
    "left_knee", "right_knee", "left_ankle", "right_ankle"
]


class KalmanKeypoint:
    """Simple constant-velocity Kalman filter for a single 2D keypoint."""

    def __init__(self, dt: float = 1/30.0, process_noise: float = 1.0, measurement_noise: float = 5.0):
        # State: [x, y, vx, vy]
        self.x = np.zeros(4)
        self.P = np.eye(4) * 100.0
        self.dt = dt
        self.F = np.array([
            [1, 0, dt, 0],
            [0, 1, 0, dt],
            [0, 0, 1, 0],
            [0, 0, 0, 1]
        ])
        self.H = np.array([
            [1, 0, 0, 0],
            [0, 1, 0, 0]
        ])
        self.Q = np.eye(4) * process_noise
        self.R = np.eye(2) * measurement_noise
        self.initialized = False

    def predict(self):
        self.x = self.F @ self.x
        self.P = self.F @ self.P @ self.F.T + self.Q

    def update(self, z: np.ndarray):
        if not self.initialized:
            self.x[:2] = z
            self.initialized = True
            return
        self.predict()
        y = z - self.H @ self.x
        S = self.H @ self.P @ self.H.T + self.R
        K = self.P @ self.H.T @ np.linalg.inv(S)
        self.x = self.x + K @ y
        self.P = (np.eye(4) - K @ self.H) @ self.P

    def position(self) -> Tuple[float, float]:
        return float(self.x[0]), float(self.x[1])

    def covariance_trace(self) -> float:
        return float(np.trace(self.P[:2, :2]))


class SkeleTrackImproved:
    def __init__(self, model_path: str = "yolov8n-pose.pt", conf: float = 0.35,
                 process_noise: float = 2.0, measurement_noise: float = 8.0):
        self.model = YOLO(model_path)
        self.tracker = ByteTrack()
        self.conf = conf
        self.kalmans: Dict[int, Dict[str, KalmanKeypoint]] = {}
        self.process_noise = process_noise
        self.measurement_noise = measurement_noise
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
                kpts_conf = results.keypoints.conf[i].cpu().numpy() if results.keypoints.conf is not None else np.ones(17)

                if tid not in self.kalmans:
                    self.kalmans[tid] = {name: KalmanKeypoint(
                        process_noise=self.process_noise,
                        measurement_noise=self.measurement_noise
                    ) for name in KEYPOINT_NAMES}

                smoothed = []
                for name, (x, y), c in zip(KEYPOINT_NAMES, kpts_xy, kpts_conf):
                    if c > 0.3:
                        self.kalmans[tid][name].update(np.array([x, y]))
                    sx, sy = self.kalmans[tid][name].position()
                    smoothed.append({
                        "name": name,
                        "x_raw": float(x),
                        "y_raw": float(y),
                        "x": sx,
                        "y": sy,
                        "conf": float(c),
                        "cov_trace": self.kalmans[tid][name].covariance_trace()
                    })

                players.append({
                    "track_id": int(tid),
                    "keypoints": smoothed,
                    "bbox": tracked.xyxy[i].tolist() if i < len(tracked.xyxy) else None
                })

        result = {
            "frame_id": self.frame_id,
            "players": players,
            "player_count": len(players),
            "weight": 0.0
        }
        self.shadow_log.append(result)
        self.frame_id += 1
        return result

    def triangulate_pair(self, pts1: np.ndarray, pts2: np.ndarray,
                         P1: np.ndarray, P2: np.ndarray) -> np.ndarray:
        """
        Multi-view triangulation using OpenCV (DLT).
        pts1, pts2: Nx2 arrays of corresponding keypoints.
        P1, P2: 3x4 projection matrices.
        Returns Nx3 3D points.
        """
        pts1 = pts1.T.astype(np.float32)
        pts2 = pts2.T.astype(np.float32)
        pts4d = cv2.triangulatePoints(P1, P2, pts1, pts2)
        pts3d = (pts4d[:3] / pts4d[3]).T
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
            pts = {k["name"]: (int(k["x"]), int(k["y"])) for k in p["keypoints"] if k["conf"] > 0.3}
            for a, b in edges:
                if a in pts and b in pts:
                    cv2.line(out, pts[a], pts[b], (0, 255, 0), 2)
            for name, (x, y) in pts.items():
                cv2.circle(out, (x, y), 3, (0, 0, 255), -1)
            if p["bbox"]:
                x1, y1 = int(p["bbox"][0]), int(p["bbox"][1])
                cv2.putText(out, f"ID:{p['track_id']}", (x1, y1-8),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 0), 1)
        return out

    def save_shadow(self, path: str):
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w") as f:
            for row in self.shadow_log:
                f.write(json.dumps(row) + "\n")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True)
    parser.add_argument("--output", default="skeletrack_improved.mp4")
    parser.add_argument("--shadow", default="skeletrack_improved_shadow.jsonl")
    parser.add_argument("--model", default="yolov8n-pose.pt")
    parser.add_argument("--process-noise", type=float, default=2.0, help="Kalman Q scale")
    parser.add_argument("--measurement-noise", type=float, default=8.0, help="Kalman R scale")
    args = parser.parse_args()

    proxy = SkeleTrackImproved(
        model_path=args.model,
        process_noise=args.process_noise,
        measurement_noise=args.measurement_noise
    )

    cap = cv2.VideoCapture(args.source if not args.source.isdigit() else int(args.source))
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    writer = cv2.VideoWriter(args.output, cv2.VideoWriter_fourcc(*"mp4v"), fps, (w, h))

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
    print(f"Done. Shadow: {args.shadow}")


if __name__ == "__main__":
    main()
