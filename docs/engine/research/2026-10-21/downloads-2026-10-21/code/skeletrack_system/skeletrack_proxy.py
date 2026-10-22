#!/usr/bin/env python3
"""
SkeleTrack-style Open-Source Proxy
Local multi-person skeletal tracking for sports video.

Approximates Hawk-Eye SkeleTrack using free components:
- YOLO-pose (Ultralytics) for 17/26 keypoints
- ByteTrack for persistent IDs
- Optional multi-view triangulation (OpenCV)
- Weight-0 shadow logging ready

Usage:
    python skeletrack_proxy.py --source video.mp4 --output tracked.mp4
"""

import argparse
import json
import time
from pathlib import Path
from typing import List, Dict, Any, Optional

import cv2
import numpy as np
from ultralytics import YOLO
from supervision import ByteTrack, Detections


# COCO-17 keypoints (standard YOLO-pose)
KEYPOINT_NAMES = [
    "nose", "left_eye", "right_eye", "left_ear", "right_ear",
    "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
    "left_wrist", "right_wrist", "left_hip", "right_hip",
    "left_knee", "right_knee", "left_ankle", "right_ankle"
]


class SkeleTrackProxy:
    """Open-source skeletal tracking proxy for broadcast or multi-camera video."""

    def __init__(self, model_path: str = "yolov8n-pose.pt", conf: float = 0.3, iou: float = 0.5):
        self.model = YOLO(model_path)
        self.tracker = ByteTrack()
        self.conf = conf
        self.iou = iou
        self.frame_id = 0
        self.shadow_log: List[Dict[str, Any]] = []

    def process_frame(self, frame: np.ndarray) -> Dict[str, Any]:
        """Run detection + tracking + keypoint extraction on a single frame."""
        results = self.model(frame, conf=self.conf, iou=self.iou, verbose=False)[0]
        
        # Convert to supervision Detections for tracking
        detections = Detections.from_ultralytics(results)
        tracked = self.tracker.update_with_detections(detections)

        players = []
        if tracked.tracker_id is not None and results.keypoints is not None:
            for i, track_id in enumerate(tracked.tracker_id):
                if i >= len(results.keypoints.xy):
                    continue
                kpts = results.keypoints.xy[i].cpu().numpy()  # (17, 2)
                confs = results.keypoints.conf[i].cpu().numpy() if results.keypoints.conf is not None else np.ones(17)

                keypoints = []
                for name, (x, y), c in zip(KEYPOINT_NAMES, kpts, confs):
                    keypoints.append({
                        "name": name,
                        "x": float(x),
                        "y": float(y),
                        "conf": float(c)
                    })

                players.append({
                    "track_id": int(track_id),
                    "bbox": tracked.xyxy[i].tolist() if i < len(tracked.xyxy) else None,
                    "keypoints": keypoints,
                    "keypoint_count": len([k for k in keypoints if k["conf"] > 0.3])
                })

        frame_result = {
            "frame_id": self.frame_id,
            "timestamp": time.time(),
            "players": players,
            "player_count": len(players)
        }
        self.shadow_log.append(frame_result)
        self.frame_id += 1
        return frame_result

    def draw(self, frame: np.ndarray, result: Dict[str, Any]) -> np.ndarray:
        """Draw skeletons and track IDs on the frame."""
        out = frame.copy()
        for p in result["players"]:
            # Draw keypoints and simple connections
            pts = {k["name"]: (int(k["x"]), int(k["y"])) for k in p["keypoints"] if k["conf"] > 0.3}
            color = (0, 255, 0)

            # Simple skeleton edges (COCO-style subset)
            edges = [
                ("left_shoulder", "right_shoulder"),
                ("left_shoulder", "left_elbow"), ("left_elbow", "left_wrist"),
                ("right_shoulder", "right_elbow"), ("right_elbow", "right_wrist"),
                ("left_shoulder", "left_hip"), ("right_shoulder", "right_hip"),
                ("left_hip", "right_hip"),
                ("left_hip", "left_knee"), ("left_knee", "left_ankle"),
                ("right_hip", "right_knee"), ("right_knee", "right_ankle"),
            ]
            for a, b in edges:
                if a in pts and b in pts:
                    cv2.line(out, pts[a], pts[b], color, 2)

            for name, (x, y) in pts.items():
                cv2.circle(out, (x, y), 4, (0, 0, 255), -1)

            # Track ID
            if p["bbox"]:
                x1, y1 = int(p["bbox"][0]), int(p["bbox"][1])
                cv2.putText(out, f"ID:{p['track_id']}", (x1, y1 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 0), 2)
        return out

    def save_shadow(self, path: str):
        """Write weight-0 shadow ledger."""
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w") as f:
            for row in self.shadow_log:
                f.write(json.dumps(row) + "\n")


def main():
    parser = argparse.ArgumentParser(description="SkeleTrack-style open-source proxy")
    parser.add_argument("--source", required=True, help="Video file or camera index")
    parser.add_argument("--output", default="skeletrack_output.mp4", help="Annotated video")
    parser.add_argument("--shadow", default="skeletrack_shadow.jsonl", help="Shadow ledger path")
    parser.add_argument("--model", default="yolov8n-pose.pt", help="YOLO-pose model")
    parser.add_argument("--conf", type=float, default=0.3)
    args = parser.parse_args()

    proxy = SkeleTrackProxy(model_path=args.model, conf=args.conf)

    cap = cv2.VideoCapture(args.source if not args.source.isdigit() else int(args.source))
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open source: {args.source}")

    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    writer = cv2.VideoWriter(args.output, cv2.VideoWriter_fourcc(*"mp4v"), fps, (w, h))

    print(f"Processing {args.source} → {args.output}")
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        result = proxy.process_frame(frame)
        annotated = proxy.draw(frame, result)
        writer.write(annotated)
        if proxy.frame_id % 30 == 0:
            print(f"Frame {proxy.frame_id} | players: {result['player_count']}")

    cap.release()
    writer.release()
    proxy.save_shadow(args.shadow)
    print(f"Done. Shadow ledger: {args.shadow} ({len(proxy.shadow_log)} frames)")


if __name__ == "__main__":
    main()
