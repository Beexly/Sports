"""
GSE watch-pipeline Space — CV compute brain for the autonomous live watch loop.

Flow: Windows watcher → POST /process-frame (JPEG bytes) → this Space runs
YOLO detection + BoT-SORT tracking on ORB-stabilized frames → field homography
→ derived metrics → JSON. The watcher relays that JSON to the Vercel ingest
route, which persists it to Neon. Raw frames are NEVER stored here and NEVER
leave this process except as the transient request body.

Pipeline (Film Pilot 2, 2026-10-01 — measured, not theorized):
  stabilize (ORB/RANSAC, 0.48px residual @5fps) → detect → BoT-SORT on
  stabilized coords = 33 track IDs for ~22 people (vs 175 raw / 97-98 with
  naive IoU or motion-model association). Stabilization ELIMINATES phantom
  speeds (max 18.9 mph vs 100-275 mph raw).

Endpoints:
  GET  /health          liveness (the Vercel scheduler warm-pings this every
                       3 min during game windows so ZeroGPU stays warm)
  POST /process-frame   multipart: frame (JPEG), game_id, ts, fps, burst,
                       homography (optional JSON 3x3 px->yards)

Derived metrics aim at what NGS does NOT give us: route shapes, separation
proxies, break-angle proxies, formation-relevant geometry — never a worse
NGS rebuild.

Weights are baked into the Docker image (see Dockerfile) — no runtime
downloads.
"""

from __future__ import annotations

import io
import json
import math
import os
import secrets
import time
from collections import defaultdict, deque
from typing import Any, Optional

import numpy as np
from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import JSONResponse

MODEL_NAME = "yolov8n.pt"
DETECT_WIDTH = 640
CONF_THRESHOLD = 0.35
STATE_TTL_S = 6 * 3600  # drop per-game state 6h after last frame

# Tracker selection: "botsort" (default — Film Pilot 2 winner) or "bytetrack"
# (lighter, no appearance re-ID; use on CPU-only if BoT-SORT is too slow).
TRACKER_NAME = os.environ.get("GSE_TRACKER", "botsort").strip().lower()
TRACKER_CFG = "botsort.yaml" if TRACKER_NAME != "bytetrack" else "bytetrack.yaml"

# ORB stabilization params (from Pilot 2's stabilize.py).
ORB_FEATURES = 2000
RANSAC_THRESH = 3.0
MIN_ORB_MATCHES = 10

# Bearer <redacted> for /process-frame, injected as the SPACE_API_TOKEN Space
# secret. /health stays open (the Vercel scheduler warm-pings it).
SPACE_API_TOKEN_ENV = "SPACE_API_TOKEN"

app = FastAPI(title="gse-watch-pipeline", version="2.0.0")


def _expected_space_token() -> Optional[str]:
    tok = os.environ.get(SPACE_API_TOKEN_ENV, "").strip()
    return tok or None


def check_space_auth(authorization: Optional[str]) -> None:
    """Fail-closed Bearer <redacted> for /process-frame. Raises HTTPException.

    - No SPACE_API_TOKEN configured  -> 503 (refuse everything until the
      operator sets the secret; never silently run open).
    - Missing / malformed / wrong token -> 401.
    - Comparison is constant-time (secrets.compare_digest).
    """
    expected = _expected_space_token()
    if expected is None:
        raise HTTPException(status_code=503, detail="space auth not configured")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="missing Bearer <redacted>")
    presented = authorization[len("Bearer "):].strip()
    if not presented or not secrets.compare_digest(presented, expected):
        raise HTTPException(status_code=401, detail="invalid Bearer <redacted>")


_model = None
_model_error: Optional[str] = None


def get_model():
    global _model, _model_error
    if _model is None and _model_error is None:
        try:
            from ultralytics import YOLO

            _model = YOLO(MODEL_NAME)
        except Exception as exc:  # pragma: no cover - env dependent
            _model_error = str(exc)
    if _model_error is not None:
        raise RuntimeError(f"model unavailable: {_model_error}")
    return _model


# ── Geometry ────────────────────────────────────────────────────────────────

def foot_point(bbox: dict) -> tuple[float, float]:
    return (bbox["x"] + bbox["width"] / 2.0, bbox["y"] + bbox["height"])


def project_point(px: float, py: float, h: list[list[float]]) -> tuple[float, float]:
    denom = h[2][0] * px + h[2][1] * py + h[2][2]
    if abs(denom) < 1e-12:
        raise ValueError("degenerate homography projection")
    return (
        (h[0][0] * px + h[0][1] * py + h[0][2]) / denom,
        (h[1][0] * px + h[1][1] * py + h[1][2]) / denom,
    )


# ── Per-game state: stabilization + persistent tracker ──────────────────────

class GameState:
    """Per-game pipeline state.

    Holds:
    - A dedicated YOLO model instance whose BoT-SORT/ByteTrack tracker
      persists across /process-frame calls (track IDs stay consistent).
    - ORB stabilization state: previous grayscale frame + keypoints, and the
      cumulative homography mapping current-frame pixels to the reference
      (first-frame) coordinate system. Detections are tracked in stabilized
      coords, which is what killed the phantom speeds in Pilot 2.
    """

    def __init__(self) -> None:
        import cv2

        self.tracker_model = None          # lazy per-game YOLO instance
        self.orb = cv2.ORB_create(nfeatures=ORB_FEATURES)
        self.bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
        self.prev_gray: Optional[np.ndarray] = None
        self.cum_h: np.ndarray = np.eye(3, dtype=np.float64)
        self.frames_seen = 0
        self.last_seen = time.time()
        self.stab_ok_count = 0
        self.stab_fail_count = 0
        # Tracklet bookkeeping for the response (mirrors old shape).
        self.tracklet_points: dict[int, list[dict]] = defaultdict(list)
        self.tracklet_meta: dict[int, dict] = {}

    def _ensure_tracker(self):
        if self.tracker_model is None:
            from ultralytics import YOLO

            self.tracker_model = YOLO(MODEL_NAME)
        return self.tracker_model

    def stabilize(self, frame_bgr: np.ndarray) -> tuple[np.ndarray, bool]:
        """Warp frame to the reference coordinate system.

        Returns (stabilized_frame, homography_ok). On ORB failure the raw
        frame is returned and the cumulative homography is left unchanged
        (tracker keeps running; continuity degrades gracefully, not fatally).
        """
        import cv2

        gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
        if self.prev_gray is None:
            self.prev_gray = gray
            self.frames_seen += 1
            return frame_bgr, True

        kp1, des1 = self.orb.detectAndCompute(self.prev_gray, None)
        kp2, des2 = self.orb.detectAndCompute(gray, None)
        ok = False
        if des1 is not None and des2 is not None and len(des1) >= MIN_ORB_MATCHES and len(des2) >= MIN_ORB_MATCHES:
            matches = self.bf.match(des1, des2)
            if len(matches) >= MIN_ORB_MATCHES:
                matches = sorted(matches, key=lambda m: m.distance)[:200]
                src = np.float32([kp1[m.queryIdx].pt for m in matches])
                dst = np.float32([kp2[m.trainIdx].pt for m in matches])
                h, mask = cv2.findHomography(dst, src, cv2.RANSAC, RANSAC_THRESH)
                if h is not None:
                    self.cum_h = self.cum_h @ h
                    ok = True

        h, w = frame_bgr.shape[:2]
        if ok:
            warped = cv2.warpPerspective(
                frame_bgr, self.cum_h, (w, h),
                flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE,
            )
            self.stab_ok_count += 1
        else:
            warped = frame_bgr
            self.stab_fail_count += 1

        self.prev_gray = gray
        self.frames_seen += 1
        self.last_seen = time.time()
        return warped, ok

    def track_frame(
        self, frame_bgr: np.ndarray, ts: float
    ) -> tuple[list[dict], list[dict], float, bool]:
        """Stabilize → track. Returns (detections, active_tracklets, infer_ms, stab_ok).

        Detections carry stabilized pixel coords. Tracklet IDs come from the
        persistent BoT-SORT/ByteTrack tracker.
        """
        import cv2

        t0 = time.time()
        stab_frame, stab_ok = self.stabilize(frame_bgr)
        model = self._ensure_tracker()

        # Downscale for inference speed; tracker runs on the small frame.
        h0, w0 = stab_frame.shape[:2]
        scale = DETECT_WIDTH / w0
        small = cv2.resize(stab_frame, (DETECT_WIDTH, int(h0 * scale)))
        inv = 1.0 / scale

        results = model.track(
            small, persist=True, tracker=TRACKER_CFG,
            conf=CONF_THRESHOLD, classes=[0], verbose=False,
        )
        infer_ms = (time.time() - t0) * 1000.0
        res = results[0]

        detections: list[dict] = []
        active: list[dict] = []
        if res.boxes is not None and len(res.boxes) > 0:
            ids = res.boxes.id
            for i, b in enumerate(res.boxes):
                x1, y1, x2, y2 = (float(v) for v in b.xyxy[0].tolist())
                tid = int(ids[i].item()) if ids is not None else -1
                bbox = {
                    "x": round(x1 * inv, 1),
                    "y": round(y1 * inv, 1),
                    "width": round((x2 - x1) * inv, 1),
                    "height": round((y2 - y1) * inv, 1),
                }
                conf = round(float(b.conf[0].item()), 3)
                detections.append({"bbox": bbox, "confidence": conf, "classId": "player", "trackId": tid})
                if tid >= 0:
                    fx, fy = foot_point(bbox)
                    pt = {"t": ts, "xPx": round(fx, 1), "yPx": round(fy, 1)}
                    self.tracklet_points[tid].append(pt)
                    self.tracklet_meta.setdefault(tid, {"first_t": ts})
                    self.tracklet_meta[tid]["last_t"] = ts
                    active.append({
                        "id": f"trk-{tid:04d}",
                        "track_id": tid,
                        "n_points": len(self.tracklet_points[tid]),
                        "last": pt,
                    })
        return detections, active, round(infer_ms, 1), stab_ok


_games: dict[str, GameState] = {}


def get_game(game_id: str) -> GameState:
    gs = _games.get(game_id)
    now = time.time()
    if gs is None:
        gs = GameState()
        _games[game_id] = gs
    for gid in [g for g, s in _games.items() if now - s.last_seen > STATE_TTL_S]:
        del _games[gid]
    return gs


# ── Derived metrics (formation/route shapes, not NGS) ─────────────────────────

def derive_frame_metrics(
    active: list[dict], homography: Optional[list[list[float]]]
) -> dict[str, Any]:
    """Per-frame derived outputs. Field coords only when a homography is
    seeded (hand-seed v1; auto landmarks are the research gap)."""
    positions: list[dict] = []
    for trk in active:
        pt = trk["last"]
        entry: dict[str, Any] = {
            "tracklet_id": trk["id"],
            "t": pt["t"],
            "x_px": pt["xPx"],
            "y_px": pt["yPx"],
            "x_yd": None,
            "y_yd": None,
        }
        if homography is not None:
            try:
                x_yd, y_yd = project_point(pt["xPx"], pt["yPx"], homography)
                entry["x_yd"] = round(x_yd, 2)
                entry["y_yd"] = round(y_yd, 2)
            except ValueError:
                pass
        positions.append(entry)

    separations: list[dict] = []
    with_coords = [p for p in positions if p["x_yd"] is not None]
    for p in with_coords:
        best = min(
            (
                math.hypot(p["x_yd"] - q["x_yd"], p["y_yd"] - q["y_yd"])
                for q in with_coords
                if q["tracklet_id"] != p["tracklet_id"]
            ),
            default=None,
        )
        separations.append(
            {
                "tracklet_id": p["tracklet_id"],
                "nearest_other_yd": round(best, 2) if best is not None else None,
            }
        )

    return {
        "positions": positions,
        "separations": separations,
        "break_angles": [],  # recomputed from tracklet history on the ingest side
        "homography_seeded": homography is not None,
    }


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health() -> dict[str, Any]:
    ok = True
    try:
        get_model()
    except RuntimeError as exc:
        return JSONResponse(
            status_code=503, content={"status": "degraded", "error": str(exc)}
        )
    return {
        "status": "ok" if ok else "degraded",
        "model": MODEL_NAME,
        "tracker": TRACKER_NAME,
        "detect_width": DETECT_WIDTH,
        "games_tracked": len(_games),
    }


@app.post("/process-frame")
async def process_frame(
    authorization: Optional[str] = Header(default=None),
    frame: UploadFile = File(...),
    game_id: str = Form(...),
    ts: float = Form(...),
    fps: float = Form(1.0),
    burst: bool = Form(False),
    homography: Optional[str] = Form(None),
) -> dict[str, Any]:
    check_space_auth(authorization)
    t_start = time.time()
    jpeg = await frame.read()
    if len(jpeg) > 2_000_000:
        raise HTTPException(status_code=413, detail="frame too large (2MB cap)")

    h: Optional[list[list[float]]] = None
    if homography:
        try:
            h = json.loads(homography)
            assert len(h) == 3 and all(len(r) == 3 for r in h)
        except Exception:
            raise HTTPException(status_code=400, detail="homography must be a 3x3 array")

    import cv2

    arr = np.frombuffer(jpeg, dtype=np.uint8)
    frame_bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if frame_bgr is None:
        raise HTTPException(status_code=400, detail="could not decode JPEG frame")
    height, width = frame_bgr.shape[:2]

    gs = get_game(game_id)
    try:
        detections, active, infer_ms, stab_ok = gs.track_frame(frame_bgr, ts)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    metrics = derive_frame_metrics(active, h)

    return {
        "game_id": game_id,
        "t": ts,
        "fps": fps,
        "burst": burst,
        "width": width,
        "height": height,
        "tracker": TRACKER_NAME,
        "stabilized": stab_ok,
        "detections": detections,
        "n_detections": len(detections),
        "active_tracklets": active,
        "n_track_ids": len(gs.tracklet_points),
        "metrics": metrics,
        "timing_ms": {
            "inference": infer_ms,
            "total": round((time.time() - t_start) * 1000.0, 1),
        },
    }
