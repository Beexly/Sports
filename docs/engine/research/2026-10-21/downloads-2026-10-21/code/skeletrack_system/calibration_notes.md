# Camera Calibration Notes (Open-Source SkeleTrack Approximation)

## Single-View (Broadcast)
- Use field-line keypoints (yard lines, hashes) detected by a keypoint model.
- Compute homography to map pixel coordinates to field meters.
- Sufficient for 2D tracklets in the image plane or top-down field view.

## Multi-View (True 3D)
1. Capture checkerboard or ChArUco board in overlapping views.
2. Run OpenCV `calibrateCamera` for intrinsics per camera.
3. Run `stereoCalibrate` or multi-camera bundle adjustment for extrinsics.
4. For each matched keypoint pair, call `cv2.triangulatePoints(P1, P2, pts1, pts2)`.
5. Smooth the resulting 3D trajectories with a Kalman filter.

## Practical Free Path
- Start with the single-view proxy in `skeletrack_proxy.py`.
- Add field-line homography for world coordinates.
- Only move to multi-view when you have synchronized cameras.
- Validate against Big Data Bowl historical tracking where the same plays exist.

Hawk-Eye SkeleTrack uses proprietary multi-camera arrays and trained models. This system uses public YOLO-pose + OpenCV and can be improved incrementally without any paid data.
