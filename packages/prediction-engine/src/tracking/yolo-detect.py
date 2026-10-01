#!/usr/bin/env python3
"""
Real detector behind the GSE CV detector contract
(packages/prediction-engine/src/tracking/cv-detector-contract.ts).

Runs an open-weights YOLO model (ultralytics, COCO person class) over a video
file and emits per-frame detections as JSON in the detector-contract shape,
so the TypeScript pipeline (association → homography → metrics) consumes real
detections without any change.

Why Python and not pure TS: there is no practical pure-TS YOLO runtime with
open weights that matches ultralytics' maintained Python stack. The boundary
is clean: this module is the "frame producer + detector" upstream stage; the
TS side sees only the JSON contract via yolo-adapter.ts.

Usage:
    python yolo-detect.py --video clip.mp4 --out detections.jsonl \
        --model yolov8n.pt --conf 0.35 --fps 5 --detect-width 640

Output: one JSON object per line (frameIndex, t, width, height, detections[]),
each detection = {bbox: {x, y, width, height} (top-left, pixels),
confidence 0..1, classId: "player" | "ball"}.

Model weights are downloaded by ultralytics on first run (~6 MB for
yolov8n.pt) and are NOT committed to the repo. No footage is committed either:
clips used for evaluation are short, internal-only, and documented in
docs/research/2026-10-01/cv-detector-eval-2026-10-01.md.
"""

from __future__ import annotations

import argparse
import json
import sys


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="YOLO detector → GSE detector-contract JSONL")
    p.add_argument("--video", required=True, help="Input video file")
    p.add_argument("--out", required=True, help="Output .jsonl path")
    p.add_argument("--model", default="yolov8n.pt", help="Ultralytics model/weights")
    p.add_argument("--conf", type=float, default=0.35, help="Confidence threshold")
    p.add_argument("--fps", type=float, default=5.0,
                   help="Sample frames per second (watch-loop v1 targets 1-5 fps)")
    p.add_argument("--detect-width", type=int, default=640,
                   help="Resize frames to this width for detection")
    p.add_argument("--device", default="cpu", help="cpu or cuda:0")
    p.add_argument("--ball", action="store_true",
                   help="Also emit COCO 'sports ball' as classId 'ball'")
    return p.parse_args()


def main() -> int:
    args = parse_args()
    try:
        import cv2
    except ImportError:
        print("need opencv (pip install opencv-python-headless)", file=sys.stderr)
        return 2
    try:
        from ultralytics import YOLO
    except ImportError:
        print("need ultralytics (pip install ultralytics)", file=sys.stderr)
        return 2

    cap = cv2.VideoCapture(args.video)
    if not cap.isOpened():
        print(f"cannot open video: {args.video}", file=sys.stderr)
        return 2
    src_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    stride = max(1, round(src_fps / args.fps))

    model = YOLO(args.model)
    # COCO: 0 = person, 32 = sports ball
    classes = [0, 32] if args.ball else [0]

    n_out = 0
    with open(args.out, "w") as fh:
        idx = 0
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            if idx % stride == 0:
                h, w = frame.shape[:2]
                scale = args.detect_width / w
                small = cv2.resize(frame, (args.detect_width, int(h * scale)))
                res = model.predict(small, conf=args.conf, classes=classes,
                                    device=args.device, verbose=False)[0]
                dets = []
                boxes = res.boxes
                if boxes is not None:
                    for b in boxes:
                        x1, y1, x2, y2 = (float(v) for v in b.xyxy[0].tolist())
                        cls = int(b.cls[0].item())
                        # Back to source-pixel coordinates.
                        inv = 1.0 / scale
                        dets.append({
                            "bbox": {
                                "x": x1 * inv,
                                "y": y1 * inv,
                                "width": (x2 - x1) * inv,
                                "height": (y2 - y1) * inv,
                            },
                            "confidence": float(b.conf[0].item()),
                            "classId": "ball" if cls == 32 else "player",
                        })
                fh.write(json.dumps({
                    "frameIndex": n_out,
                    "t": round(n_out / args.fps, 3),
                    "width": w,
                    "height": h,
                    "detections": dets,
                }) + "\n")
                n_out += 1
            idx += 1
    cap.release()
    print(f"wrote {n_out} frames -> {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
