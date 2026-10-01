"""
GSE watch-pipeline Space — CV compute brain for the autonomous live watch loop.

Flow: Windows watcher → POST /process-frame (JPEG bytes) → this Space runs
YOLO detection → IoU tracklet association → field homography → derived
metrics → JSON. The watcher relays that JSON to the Vercel ingest route,
which persists it to Neon. Raw frames are NEVER stored here and NEVER leave
this process except as the transient request body.

Endpoints:
  GET  /health          liveness (the Vercel scheduler warm-pings this every
                       3 min during game windows so ZeroGPU stays warm).
                       Unauthenticated by design.
  POST /process-frame   multipart: frame (JPEG), game_id, ts, fps, burst,
                       homography (optional JSON 3x3 px->yards).
                       REQUIRES Authorization: Bearer <GSE_SPACE_TOKEN> —
                       paid GPU, no anonymous inference.

Derived metrics aim at what NGS does NOT give us: route shapes, separation
proxies, break-angle proxies, formation-relevant geometry — never a worse
NGS rebuild.

Weights are baked into the Docker image (see Dockerfile) — no runtime
downloads.
"""

from __future__ import annotations

import hmac
import io
import json
import math
import os
import time
from collections import defaultdict, deque
from typing import Any, Optional

import numpy as np
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import JSONResponse

MODEL_NAME = "yolov8n.pt"
DETECT_WIDTH = 640
CONF_THRESHOLD = 0.35
MIN_IOU = 0.3
MAX_GAP_FRAMES = 5
MIN_TRACKLET_FRAMES = 2
STATE_TTL_S = 6 * 3600  # drop per-game state 6h after last frame

app = FastAPI(title="gse-watch-pipeline", version="1.0.0")

_model = None
_model_error: Optional[str] = None


# ── Auth ────────────────────────────────────────────────────────────────────
#
# POST /process-frame burns paid GPU, so it is gated on a shared bearer token.
# The token lives in the Space's secrets as GSE_SPACE_TOKEN (never in the
# repo); the Windows watcher sends it as `Authorization: Bearer <token>` and
# carries the same value in its config.json as `space_token`.
#
# Fail-closed: if GSE_SPACE_TOKEN is unset, /process-frame refuses everything
# (503) rather than running open. GET /health stays unauthenticated — it is
# the liveness probe the Vercel scheduler warm-pings.


def _expected_space_token() -> str:
    return os.environ.get("GSE_SPACE_TOKEN", "")


def verify_space_token(
    authorization: Optional[str] = Header(default=None),
) -> None:
    """FastAPI dependency: reject unauthenticated /process-frame callers."""
    expected = _expected_space_token()
    if not expected:
        raise HTTPException(status_code=503, detail="space auth not configured")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="missing bearer token")
    provided = authorization[len("Bearer ") :].strip()
    if not provided or not hmac.compare_digest(provided, expected):
        raise HTTPException(status_code=401, detail="invalid token")


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


# ── Geometry (ports of the TS tracking package; keep in sync) ────────────────

def bbox_iou(a: dict, b: dict) -> float:
    x1 = max(a["x"], b["x"])
    y1 = max(a["y"], b["y"])
    x2 = min(a["x"] + a["width"], b["x"] + b["width"])
    y2 = min(a["y"] + a["height"], b["y"] + b["height"])
    inter = max(0.0, x2 - x1) * max(0.0, y2 - y1)
    if inter <= 0:
        return 0.0
    union = a["width"] * a["height"] + b["width"] * b["height"] - inter
    return inter / union if union > 0 else 0.0


def foot_point(det: dict) -> tuple[float, float]:
    b = det["bbox"]
    return (b["x"] + b["width"] / 2.0, b["y"] + b["height"])


def project_point(px: float, py: float, h: list[list[float]]) -> tuple[float, float]:
    denom = h[2][0] * px + h[2][1] * py + h[2][2]
    if abs(denom) < 1e-12:
        raise ValueError("degenerate homography projection")
    return (
        (h[0][0] * px + h[0][1] * py + h[0][2]) / denom,
        (h[1][0] * px + h[1][1] * py + h[1][2]) / denom,
    )


# ── Per-game state ────────────────────────────────────────────────────────────

class GameState:
    """Incremental association state for one game. Mirrors the greedy IoU
    matching in cv-tracklet-association.ts, applied frame-by-frame."""

    def __init__(self) -> None:
        self.active: list[dict] = []  # tracklets still alive
        self.retired: list[dict] = []
        self.next_id = 1
        self.last_seen = time.time()
        self.frames_seen = 0

    def _new_id(self) -> str:
        tid = f"trk-{self.next_id:04d}"
        self.next_id += 1
        return tid

    def ingest(self, detections: list[dict], t: float) -> list[dict]:
        """Match detections to active tracklets (greedy best-IoU), age the
        unmatched, spawn tracklets for the rest. Returns finished tracklets
        retired on this frame (for persistence)."""
        self.last_seen = time.time()
        self.frames_seen += 1
        dets = list(detections)
        used: set[int] = set()
        matched: set[int] = set()  # indices into self.active

        while True:
            best = None  # (iou, active_idx, det_idx)
            for ai, trk in enumerate(self.active):
                if ai in matched:
                    continue
                for di, det in enumerate(dets):
                    if di in used:
                        continue
                    iou = bbox_iou(trk["last_bbox"], det["bbox"])
                    if iou >= MIN_IOU and (best is None or iou > best[0]):
                        best = (iou, ai, di)
            if best is None:
                break
            _, ai, di = best
            matched.add(ai)
            used.add(di)
            trk = self.active[ai]
            fx, fy = foot_point(dets[di])
            trk["points"].append({"t": t, "xPx": fx, "yPx": fy})
            trk["last_bbox"] = dets[di]["bbox"]
            trk["gap"] = 0
            trk["team_hint"] = dets[di].get("teamHint", trk.get("team_hint", "UNK"))

        finished: list[dict] = []
        still_active: list[dict] = []
        for ai, trk in enumerate(self.active):
            if ai in matched:
                still_active.append(trk)
                continue
            trk["gap"] += 1
            if trk["gap"] > MAX_GAP_FRAMES:
                if len(trk["points"]) >= MIN_TRACKLET_FRAMES:
                    finished.append(trk)
                else:
                    self.retired.append(trk)
            else:
                still_active.append(trk)

        for di, det in enumerate(dets):
            if di in used:
                continue
            fx, fy = foot_point(det)
            still_active.append(
                {
                    "id": self._new_id(),
                    "team_hint": det.get("teamHint", "UNK"),
                    "role": det.get("classId", "player"),
                    "points": [{"t": t, "xPx": fx, "yPx": fy}],
                    "last_bbox": det["bbox"],
                    "gap": 0,
                }
            )
        self.active = still_active
        return finished


_games: dict[str, GameState] = {}


def get_game(game_id: str) -> GameState:
    gs = _games.get(game_id)
    now = time.time()
    if gs is None:
        gs = GameState()
        _games[game_id] = gs
    # Evict stale games.
    for gid in [g for g, s in _games.items() if now - s.last_seen > STATE_TTL_S]:
        del _games[gid]
    return gs


# ── Detection ─────────────────────────────────────────────────────────────────

def detect_people(jpeg_bytes: bytes) -> tuple[list[dict], int, int, float]:
    """Returns (detections, width, height, inference_ms)."""
    import cv2

    arr = np.frombuffer(jpeg_bytes, dtype=np.uint8)
    frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if frame is None:
        raise ValueError("could not decode JPEG frame")
    h, w = frame.shape[:2]
    scale = DETECT_WIDTH / w
    small = cv2.resize(frame, (DETECT_WIDTH, int(h * scale)))
    model = get_model()
    t0 = time.time()
    res = model.predict(small, conf=CONF_THRESHOLD, classes=[0], verbose=False)[0]
    ms = (time.time() - t0) * 1000.0
    inv = 1.0 / scale
    dets: list[dict] = []
    boxes = res.boxes
    if boxes is not None:
        for b in boxes:
            x1, y1, x2, y2 = (float(v) for v in b.xyxy[0].tolist())
            dets.append(
                {
                    "bbox": {
                        "x": round(x1 * inv, 1),
                        "y": round(y1 * inv, 1),
                        "width": round((x2 - x1) * inv, 1),
                        "height": round((y2 - y1) * inv, 1),
                    },
                    "confidence": round(float(b.conf[0].item()), 3),
                    "classId": "player",
                }
            )
    return dets, w, h, round(ms, 1)


# ── Derived metrics (formation/route shapes, not NGS) ─────────────────────────

def derive_frame_metrics(
    active: list[dict], homography: Optional[list[list[float]]]
) -> dict[str, Any]:
    """Per-frame derived outputs. Field coords only when a homography is
    seeded (hand-seed v1; auto landmarks are the research gap)."""
    positions: list[dict] = []
    for trk in active:
        pt = trk["points"][-1]
        entry: dict[str, Any] = {
            "tracklet_id": trk["id"],
            "t": pt["t"],
            "x_px": round(pt["xPx"], 1),
            "y_px": round(pt["yPx"], 1),
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

    # Separation proxy: for each tracklet with field coords, distance to the
    # nearest other tracklet (the fieldcoachai "sep" shape, v1 proxy).
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

    # Break-angle proxy: max heading change over the tracklet's recent field
    # positions (needs ≥3 projected points). v1 proxy for route-break quality.
    break_angles: list[dict] = []
    if homography is not None:
        for trk in active:
            pts = trk["points"][-8:]
            if len(pts) < 3:
                continue
            try:
                fpts = [project_point(p["xPx"], p["yPx"], homography) for p in pts]
            except ValueError:
                continue
            max_turn = 0.0
            for i in range(1, len(fpts) - 1):
                ax, ay = fpts[i][0] - fpts[i - 1][0], fpts[i][1] - fpts[i - 1][1]
                bx, by = fpts[i + 1][0] - fpts[i][0], fpts[i + 1][1] - fpts[i][1]
                na, nb = math.hypot(ax, ay), math.hypot(bx, by)
                if na < 1e-9 or nb < 1e-9:
                    continue
                cosang = max(-1.0, min(1.0, (ax * bx + ay * by) / (na * nb)))
                max_turn = max(max_turn, math.degrees(math.acos(cosang)))
            break_angles.append(
                {"tracklet_id": trk["id"], "max_heading_change_deg": round(max_turn, 1)}
            )

    return {
        "positions": positions,
        "separations": separations,
        "break_angles": break_angles,
        "homography_seeded": homography is not None,
    }


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health() -> dict[str, Any]:
    ok = True
    try:
        get_model()
    except RuntimeError as exc:
        ok = False
        return JSONResponse(
            status_code=503, content={"status": "degraded", "error": str(exc)}
        )
    return {
        "status": "ok" if ok else "degraded",
        "model": MODEL_NAME,
        "detect_width": DETECT_WIDTH,
        "games_tracked": len(_games),
    }


@app.post("/process-frame", dependencies=[Depends(verify_space_token)])
async def process_frame(
    frame: UploadFile = File(...),
    game_id: str = Form(...),
    ts: float = Form(...),
    fps: float = Form(1.0),
    burst: bool = Form(False),
    homography: Optional[str] = Form(None),
) -> dict[str, Any]:
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

    try:
        detections, width, height, infer_ms = detect_people(jpeg)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    gs = get_game(game_id)
    finished = gs.ingest(detections, ts)
    metrics = derive_frame_metrics(gs.active, h)

    return {
        "game_id": game_id,
        "t": ts,
        "fps": fps,
        "burst": burst,
        "width": width,
        "height": height,
        "detections": detections,
        "n_detections": len(detections),
        "active_tracklets": [
            {
                "id": t["id"],
                "team_hint": t["team_hint"],
                "role": t["role"],
                "n_points": len(t["points"]),
            }
            for t in gs.active
        ],
        "finished_tracklets": [
            {
                "id": t["id"],
                "team_hint": t["team_hint"],
                "role": t["role"],
                "n_points": len(t["points"]),
                "start_t": t["points"][0]["t"],
                "end_t": t["points"][-1]["t"],
            }
            for t in finished
        ],
        "metrics": metrics,
        "timing_ms": {
            "inference": infer_ms,
            "total": round((time.time() - t_start) * 1000.0, 1),
        },
    }
