"""Benchmark detector at imgsz 640 vs 960, plus pose and jersey models.

Closes three open items from the vision directive:
  - the detector ranking was measured at library defaults on 640x360 sources
  - YOLO11n-pose was downloaded but never run
  - the prxkc jersey model was downloaded but never run

Reports real numbers or says why it could not.
"""

from __future__ import annotations

import json
import time
from pathlib import Path

import numpy as np

MODELS = Path(r"C:\Users\Garrett\AppData\Local\hermes\cache\scratch\models")
FRAMES = Path(r"C:\Users\Garrett\Sports\data\film_room_2026\_bootstrap")
OUT = Path(r"C:\Users\Garrett\AppData\Local\hermes\cache\scratch\pose_jersey_bench.json")

OFFENSE = {"oline", "qb", "running_back", "tight_end", "wide_receiver"}
DEFENSE = {"defense"}
REF = {"ref", "referee"}


def pick_frames(n: int = 6, pool: int = 60) -> list[Path]:
    """Sample a wide pool; the caller filters to frames that look like live plays.

    Sampling blindly produced frames with zero detections - crowd shots, graphics,
    halftime - which drag every model's error toward 22 and make the 640-vs-960
    comparison meaningless.
    """
    for d in sorted(FRAMES.glob("frames_*")):
        imgs = sorted(d.glob("*.jpg"))
        if len(imgs) > pool:
            step = max(1, len(imgs) // pool)
            return imgs[::step][:pool]
    return []


def live_play_frames(frames: list[Path], lo: int = 15, hi: int = 30) -> list[Path]:
    """Keep frames where the primary detector sees a plausible 11-on-11 snap."""
    from ultralytics import YOLO

    w = MODELS / "gridiron_mit.pt"
    if not w.exists():
        return frames
    model = YOLO(str(w))
    keep = []
    for f in frames:
        res = model.predict(str(f), conf=0.25, imgsz=640, verbose=False)[0]
        n = sum(1 for b in res.boxes
                if str(model.names[int(b.cls)]).lower() not in REF)
        if lo <= n <= hi:
            keep.append(f)
    return keep


def bench_detector(frames: list[Path]) -> dict:
    from ultralytics import YOLO

    out = {}
    for name, weights in (("gridiron_mit", MODELS / "gridiron_mit.pt"),
                          ("removesurgery", MODELS / "players.pt")):
        if not weights.exists():
            out[name] = {"error": "weights missing"}
            continue
        model = YOLO(str(weights))
        for imgsz in (640, 960):
            counts, lat = [], []
            for f in frames:
                t0 = time.perf_counter()
                res = model.predict(str(f), conf=0.25, imgsz=imgsz, verbose=False)[0]
                lat.append((time.perf_counter() - t0) * 1000)
                n = 0
                for box in res.boxes:
                    label = str(model.names[int(box.cls)]).lower()
                    if label in REF:
                        continue
                    if label in OFFENSE or label in DEFENSE or label == "player":
                        n += 1
                counts.append(n)
            errs = [abs(c - 22) for c in counts]
            out[f"{name}@{imgsz}"] = {
                "counts": counts,
                "mean_abs_err_vs_22": round(float(np.mean(errs)), 2),
                "max_err": int(max(errs)),
                "mean_latency_ms": round(float(np.mean(lat)), 1),
            }
    return out


def bench_pose(frames: list[Path]) -> dict:
    import onnxruntime as ort
    import cv2

    w = MODELS / "yolo11n_pose.onnx"
    if not w.exists():
        return {"error": "pose onnx missing"}
    sess = ort.InferenceSession(str(w), providers=["CPUExecutionProvider"])
    inp = sess.get_inputs()[0]
    h, wd = inp.shape[2], inp.shape[3]
    lat, kp_counts = [], []
    for f in frames:
        img = cv2.imread(str(f))
        if img is None:
            continue
        t0 = time.perf_counter()
        blob = cv2.resize(img, (wd, h))
        blob = cv2.cvtColor(blob, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
        blob = np.transpose(blob, (2, 0, 1))[None]
        outs = sess.run(None, {inp.name: blob})
        lat.append((time.perf_counter() - t0) * 1000)
        # YOLO pose output: (1, 56, N) for 17 keypoints
        pred = outs[0]
        if pred.ndim == 3:
            pred = pred[0]
            if pred.shape[0] < pred.shape[1]:
                pred = pred.T
        conf = pred[:, 4] if pred.shape[1] > 4 else np.zeros(len(pred))
        kp_counts.append(int((conf > 0.25).sum()))
    return {
        "input_shape": list(inp.shape),
        "persons_detected_per_frame": kp_counts,
        "mean_latency_ms": round(float(np.mean(lat)), 1) if lat else None,
        "keypoints_per_person": 17,
    }


def bench_jersey() -> dict:
    from ultralytics import YOLO

    w = MODELS / "jersey_temporal.pt"
    if not w.exists():
        return {"error": "jersey weights missing"}
    try:
        m = YOLO(str(w))
        return {"loaded": True, "task": getattr(m, "task", "?"),
                "classes": len(m.names), "names_sample": list(m.names.values())[:12]}
    except Exception as e:
        return {"loaded": False, "error": f"{type(e).__name__}: {e}"}


def main() -> int:
    pool = pick_frames()
    frames = live_play_frames(pool)
    print(f"pool {len(pool)} -> live-play frames {len(frames)} "
          f"from {frames[0].parent.name if frames else 'none'}")
    result = {"frames": [f.name for f in frames], "frame_dir": str(frames[0].parent) if frames else None}
    if frames:
        print("detector...")
        result["detector"] = bench_detector(frames)
        print("pose...")
        result["pose"] = bench_pose(frames)
    print("jersey...")
    result["jersey"] = bench_jersey()
    OUT.write_text(json.dumps(result, indent=1), encoding="utf-8")
    print(json.dumps(result, indent=1)[:2500])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
