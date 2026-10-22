# SkeleTrack-Style Open-Source Proxy v2

Local multi-person skeletal tracking with adaptive Kalman smoothing and multi-view triangulation.

## Features
- YOLO-pose keypoint detection (COCO-17)
- ByteTrack persistent IDs
- Per-keypoint constant-velocity Kalman filter
- Adaptive measurement noise (scales with confidence)
- Joint-specific process noise (extremities vs torso)
- Multi-view DLT triangulation helper
- Weight-0 shadow ledger with velocity and covariance

## Requirements
```bash
pip install ultralytics supervision opencv-python numpy
```

## Usage
```bash
python skeletrack_v2.py --source clip.mp4 --output tracked.mp4 --shadow shadow.jsonl
```

### Kalman tuning flags
- `--q-base` (default 2.0): base process noise. Higher = more responsive to sudden motion.
- `--r-base` (default 8.0): base measurement noise. Higher = smoother tracks.

## Kalman Filter Parameters Explained

| Parameter | What it controls | Higher value | Lower value |
|-----------|------------------|--------------|-------------|
| **Q (process noise)** | Uncertainty in the constant-velocity motion model | Filter reacts faster to changes, follows raw detections more | Smoother tracks, trusts prediction more |
| **R (measurement noise)** | Uncertainty in the keypoint detection | Smoother output, less trust in detections | Follows raw keypoints closely |
| **dt** | Time between frames | Affects how far the prediction travels | — |
| **Initial P** | Starting uncertainty | First measurement is trusted strongly | — |

Joint-specific Q scales are applied automatically (wrists/ankles higher, hips/shoulders lower).

## Multi-view
Call `triangulate_pair(pts1, pts2, P1, P2)` with calibrated 3x4 projection matrices. Uses OpenCV DLT.

All outputs remain weight 0 until identity-loop validation.
