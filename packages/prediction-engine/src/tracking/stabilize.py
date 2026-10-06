#!/usr/bin/env python3
"""
stabilize.py — PILOT 2: feature-based camera stabilization BEFORE association.

Takes a video + YOLO detections JSONL, estimates the inter-frame camera motion
via ORB features + RANSAC homography, and warps detection foot-points into a
stabilized reference frame so the associator sees camera-still coordinates.

Why ORB (not the Harris+NCC in cv-camera-compensation.ts):
  - Pilot 1 measured 52.5 px median inter-sample camera motion; the median-flow
    compensation was inadequate (81/98 tracklets exceeded the NGS plausibility
    ceiling with 100-275 mph phantom speeds).
  - ORB descriptors + Lowe ratio test give far fewer false matches than NCC
    on broadcast texture (yard lines, hash marks, numbers vs. flat green).

Pipeline per consecutive sampled frame pair (prev -> curr):
  1. ORB detect (nfeatures=2000) on masked frames (exclude top/bottom 12%:
     score bug / ticker are static overlays and would poison camera estimation).
  2. BFMatcher Hamming + Lowe ratio 0.75.
  3. RANSAC homography (reproj thresh 3.0 px). Require >= 12 inliers.
  4. Chain: H_ref_curr = H_ref_prev @ H_prev_curr (accumulate to frame 0).
  5. Warp each detection's foot point by H_ref_curr; emit stabilized coords.

Output JSONL: one object per frame:
  {frameIndex, t, H: [9] (ref<-curr homography, row-major),
   inliers, matches, residualPx (median |p_curr - H*p_prev| over inliers),
   stabilized: [{xPx, yPx, bbox, confidence, classId}]}

Residual < ~3 px/sample is the Pilot-2 success gate (vs 52.5 px raw).

Usage:
  python stabilize.py --video clip.mp4 --detections det.jsonl \
      --out stab.jsonl --fps 5
"""
from __future__ import annotations

import argparse
import json
import sys

import cv2
import numpy as np


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="ORB/RANSAC camera stabilization")
    p.add_argument("--video", required=True)
    p.add_argument("--detections", required=True, help="yolo-detect.py JSONL")
    p.add_argument("--out", required=True)
    p.add_argument("--fps", type=float, default=5.0)
    p.add_argument("--orb-features", type=int, default=2000)
    p.add_argument("--ratio", type=float, default=0.75, help="Lowe ratio")
    p.add_argument("--ransac-thresh", type=float, default=3.0)
    p.add_argument("--min-inliers", type=int, default=12)
    p.add_argument("--mask-top", type=float, default=0.12,
                   help="fraction of frame height masked at top (score bug)")
    p.add_argument("--mask-bottom", type=float, default=0.12,
                   help="fraction masked at bottom (ticker)")
    return p.parse_args()


def load_detections(path: str):
    frames = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line:
                frames.append(json.loads(line))
    frames.sort(key=lambda r: r["frameIndex"])
    return frames


def frame_mask(h: int, w: int, top_frac: float, bot_frac: float) -> np.ndarray:
    mask = np.zeros((h, w), dtype=np.uint8)
    y0 = int(h * top_frac)
    y1 = int(h * (1.0 - bot_frac))
    mask[y0:y1, :] = 255
    return mask


def main() -> int:
    a = parse_args()
    det_frames = load_detections(a.detections)
    if not det_frames:
        print("no detections", file=sys.stderr)
        return 1

    cap = cv2.VideoCapture(a.video)
    if not cap.isOpened():
        print(f"cannot open {a.video}", file=sys.stderr)
        return 1
    src_fps = cap.get(cv2.CAP_PROP_FPS) or 29.97
    step = max(1, round(src_fps / a.fps))

    orb = cv2.ORB_create(nfeatures=a.orb_features)
    bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=False)

    # Read the sampled frames that correspond to detection frame indices.
    # yolo-detect.py samples frame k*step; frameIndex in JSONL is the sample idx.
    max_idx = max(r["frameIndex"] for r in det_frames)
    gray_frames: dict[int, np.ndarray] = {}
    for sample_idx in range(max_idx + 1):
        cap.set(cv2.CAP_PROP_POS_FRAMES, sample_idx * step)
        ok, frame = cap.read()
        if not ok:
            break
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gray_frames[sample_idx] = gray
    cap.release()
    h, w = next(iter(gray_frames.values())).shape
    mask = frame_mask(h, w, a.mask_top, a.mask_bottom)

    # Keypoints/descriptors per sampled frame.
    feats: dict[int, tuple] = {}
    for idx, gray in gray_frames.items():
        kp, des = orb.detectAndCompute(gray, mask)
        feats[idx] = (kp, des)

    def apply_H(H: np.ndarray, x: float, y: float):
        p = H @ np.array([x, y, 1.0])
        return (float(p[0] / p[2]), float(p[1] / p[2]))

    H_ref = np.eye(3)  # ref (frame 0) <- curr
    out_lines = []
    prev_idx = None
    total_residual = []
    n_ok = 0

    for r in det_frames:
        idx = r["frameIndex"]
        if idx not in gray_frames:
            continue
        inliers = 0
        n_matches = 0
        residual = None
        frame_ok = False
        if prev_idx is not None and prev_idx in feats and idx in feats:
            kp1, des1 = feats[prev_idx]
            kp2, des2 = feats[idx]
            if des1 is not None and des2 is not None and len(des1) >= 2 and len(des2) >= 2:
                knn = bf.knnMatch(des1, des2, k=2)
                good = []
                for m_n in knn:
                    if len(m_n) != 2:
                        continue
                    m, n = m_n
                    if m.distance < a.ratio * n.distance:
                        good.append(m)
                n_matches = len(good)
                if len(good) >= 4:
                    src = np.float32([kp1[m.queryIdx].pt for m in good])
                    dst = np.float32([kp2[m.trainIdx].pt for m in good])
                    H, inl_mask = cv2.findHomography(src, dst, cv2.RANSAC, a.ransac_thresh)
                    if H is not None and inl_mask is not None:
                        inl = inl_mask.ravel().astype(bool)
                        inliers = int(inl.sum())
                        if inliers >= a.min_inliers:
                            # residual over inliers
                            proj = cv2.perspectiveTransform(src[inl].reshape(-1, 1, 2), H)
                            err = np.linalg.norm(
                                proj.reshape(-1, 2) - dst[inl], axis=1)
                            residual = float(np.median(err))
                            total_residual.append(residual)
                            H_ref = H_ref @ np.linalg.inv(H)
                            # H maps prev->curr; ref<-curr = (ref<-prev) @ (prev<-curr)
                            frame_ok = True
                            n_ok += 1
        # Stabilize detections: warp foot points into ref frame.
        stab = []
        for d in r.get("detections", []):
            b = d["bbox"]
            fx = b["x"] + b["width"] / 2.0
            fy = b["y"] + b["height"]
            sx, sy = apply_H(H_ref, fx, fy)
            stab.append({
                "xPx": sx, "yPx": sy,
                "bbox": b,
                "confidence": d.get("confidence", 0),
                "classId": d.get("classId", "player"),
            })
        out_lines.append(json.dumps({
            "frameIndex": idx,
            "t": r.get("t", idx / a.fps),
            "H": H_ref.reshape(-1).tolist(),
            "inliers": inliers,
            "matches": n_matches,
            "residualPx": residual,
            "homographyOk": frame_ok,
            "stabilized": stab,
        }))
        prev_idx = idx

    with open(a.out, "w") as f:
        f.write("\n".join(out_lines) + "\n")

    res = np.array(total_residual) if total_residual else np.array([float("nan")])
    print(f"frames={len(out_lines)} pairs_ok={n_ok} "
          f"median_residual_px={np.nanmedian(res):.2f} "
          f"mean_residual_px={np.nanmean(res):.2f}")
    print(f"wrote {a.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
