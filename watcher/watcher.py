"""
GSE autonomous watch client — runs on Garrett's always-on Windows box.

Three jobs: TUNE, CAPTURE, RELAY. No human in the loop after one-time setup.

  TUNE    — per game window, launch/focus the viewing app on the right game.
            Deep links first (YouTube TV / NFL app accept launch URLs),
            scripted keystrokes as fallback. Tiny, logged, per-app isolated.
  CAPTURE — screen grab of the app window via mss. ADAPTIVE frame rate:
            1 fps idle sampling always; burst to 5 fps only during live play.
            Play detection v1: frame-difference motion energy above threshold
            + score-bug region presence. v2 hook: score-bug clock OCR
            (interface defined in play_gate.py, not built).
            Capture is 720p, JPEG quality ~60 (~50 KB/frame). YOLOv8n operates
            at 640px anyway — 1080p buys nothing but bandwidth.
  RELAY   — POST each frame to the HF Space /process-frame, then relay the
            Space's JSON to the Vercel ingest route. Raw frames are NEVER
            uploaded anywhere except the transient Space request; the box
            keeps a rolling ~30 min local buffer for debugging only.

HARD LINES: his subscriptions, his hardware, his home. No DRM stripping, no
credential handling (the box is already logged into his apps — one-time
setup), no scraping of streaming servers, no restreaming or publishing
video. The watcher mimics normal viewing: one stream, real cadence.

Sunday modes (one input = one stream):
  priority — tune to one game (config priority list, else first active window)
  redzone  — tune to NFL RedZone whip-around; one feed learns every game's
             key plays simultaneously. Frames tagged by game via scheduler
             time-range heuristics (v1); score-bug OCR is the v2 hook.
"""

from __future__ import annotations

import argparse
import io
import json
import logging
import time
from collections import deque
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

import requests

from play_gate import PlayGate, PlayGateConfig

log = logging.getLogger("gse-watcher")

# ── Tunables ──────────────────────────────────────────────────────────────────

IDLE_FPS = 1.0
BURST_FPS = 5.0
CAPTURE_WIDTH = 1280          # 720p
JPEG_QUALITY = 60
BUFFER_MINUTES = 30           # rolling local debug buffer; never uploaded
WINDOW_POLL_S = 60            # how often to re-check the scheduler for windows


@dataclass
class WatcherConfig:
    space_url: str                       # https://<org>-gse-watch-pipeline.hf.space
    ingest_url: str                      # https://<vercel-app>/api/ops/watch-ingest
    ingest_secret: str                   # Bearer <CRON_SECRET> equivalent
    scheduler_url: str = ""              # optional: Vercel watch-scheduler status
    mode: str = "priority"               # priority | redzone
    priority_teams: list[str] = field(default_factory=list)
    apps: dict[str, Any] = field(default_factory=dict)  # per-app deep links
    homography: Optional[list] = None    # 3x3 px->yards, hand-seeded per view (v1)

    @staticmethod
    def load(path: Path) -> "WatcherConfig":
        data = json.loads(path.read_text())
        return WatcherConfig(**data)


# ── Tune ──────────────────────────────────────────────────────────────────────

def tune_to_game(cfg: WatcherConfig, game: dict[str, Any]) -> bool:
    """Point the viewing app at the game. Returns True if a tune was attempted.

    Strategy: per-app deep link first; scripted keystrokes fallback. Failures
    are logged and the window is flagged degraded — the watcher keeps
    capturing whatever is on screen rather than dying silently.
    """
    app_name = cfg.apps.get("default", "youtube_tv")
    app_cfg = cfg.apps.get(app_name, {})
    deep_links: dict[str, str] = app_cfg.get("deep_links", {})
    game_key = f"{game.get('away','')}@{game.get('home','')}".upper()

    url = deep_links.get(game_key) or deep_links.get(cfg.mode)
    if url:
        log.info("tune: opening deep link for %s (%s)", game_key, app_name)
        return _open_url(url)

    log.warning("tune: no deep link for %s; keystroke fallback", game_key)
    return _keystroke_fallback(app_cfg, game)


def _open_url(url: str) -> bool:
    import webbrowser

    try:
        webbrowser.open(url)
        return True
    except Exception as exc:
        log.error("tune: deep link failed: %s", exc)
        return False


def _keystroke_fallback(app_cfg: dict[str, Any], game: dict[str, Any]) -> bool:
    """Last-resort scripted navigation. Per-app isolated; override per app."""
    try:
        import pyautogui  # optional dependency
    except ImportError:
        log.error("tune: pyautogui not installed; cannot keystroke-navigate")
        return False
    try:
        keys: list[str] = app_cfg.get("tune_keys", [])
        for k in keys:
            pyautogui.press(k)
            time.sleep(0.5)
        log.info("tune: keystroke fallback sent %d keys", len(keys))
        return True
    except Exception as exc:
        log.error("tune: keystroke fallback failed: %s", exc)
        return False


# ── Capture ───────────────────────────────────────────────────────────────────

class Capture:
    """mss screen capture at 720p with a rolling local buffer."""

    def __init__(self) -> None:
        from mss import mss  # deferred import: only needed on the box

        self._sct = mss()
        self.monitor = self._sct.monitors[1]  # primary display
        self.buffer: deque[bytes] = deque()

    def grab_jpeg(self) -> Optional[bytes]:
        try:
            import cv2
            import numpy as np
        except ImportError:
            log.error("capture: opencv not installed")
            return None
        shot = self._sct.grab(self.monitor)
        img = np.asarray(shot)[:, :, :3]  # BGRA -> BGR
        h, w = img.shape[:2]
        scale = CAPTURE_WIDTH / w
        small = cv2.resize(img, (CAPTURE_WIDTH, int(h * scale)))
        ok, buf = cv2.imencode(".jpg", small, [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY])
        if not ok:
            return None
        jpeg = bytes(buf)
        self.buffer.append(jpeg)
        # Rolling ~30 min at worst-case 5fps = 9000 frames; trim oldest.
        while len(self.buffer) > 9000:
            self.buffer.popleft()
        return jpeg


# ── Relay ─────────────────────────────────────────────────────────────────────

def process_and_relay(
    cfg: WatcherConfig,
    jpeg: bytes,
    game_id: str,
    ts: float,
    fps: float,
    burst: bool,
    session: requests.Session,
) -> Optional[dict[str, Any]]:
    """POST frame to the Space, relay the Space's JSON to Vercel ingest."""
    try:
        r = session.post(
            f"{cfg.space_url}/process-frame",
            files={"frame": ("frame.jpg", jpeg, "image/jpeg")},
            data={
                "game_id": game_id,
                "ts": str(ts),
                "fps": str(fps),
                "burst": str(burst).lower(),
                **(
                    {"homography": json.dumps(cfg.homography)}
                    if cfg.homography
                    else {}
                ),
            },
            timeout=30,
        )
        r.raise_for_status()
        space_out = r.json()
    except Exception as exc:
        log.error("relay: space /process-frame failed: %s", exc)
        return None

    try:
        r2 = session.post(
            cfg.ingest_url,
            json=space_out,
            headers={"Authorization": f"Bearer {cfg.ingest_secret}"},
            timeout=15,
        )
        r2.raise_for_status()
    except Exception as exc:
        # Ingest failure is non-fatal: the Space already returned the JSON
        # and the frame is in the local buffer. Log and continue live.
        log.error("relay: vercel ingest failed: %s", exc)
    return space_out


# ── Window polling ────────────────────────────────────────────────────────────

def fetch_windows(cfg: WatcherConfig, session: requests.Session) -> list[dict[str, Any]]:
    """Ask the Vercel scheduler which windows are active. Falls back to []."""
    if not cfg.scheduler_url:
        return []
    try:
        r = session.get(cfg.scheduler_url, timeout=10)
        r.raise_for_status()
        data = r.json()
        return data.get("active_windows", []) if isinstance(data, dict) else []
    except Exception as exc:
        log.warning("scheduler poll failed: %s", exc)
        return []


def pick_game(cfg: WatcherConfig, windows: list[dict[str, Any]]) -> Optional[dict[str, Any]]:
    if not windows:
        return None
    if cfg.mode == "redzone":
        return {"game_id": "REDZONE", "away": "NFL", "home": "RedZone", "mode": "redzone"}
    for team in cfg.priority_teams:
        for w in windows:
            if team.upper() in (str(w.get("away", "")).upper(), str(w.get("home", "")).upper()):
                return w
    return windows[0]


# ── Main loop ─────────────────────────────────────────────────────────────────

def run(cfg: WatcherConfig) -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )
    capture = Capture()
    gate = PlayGate(PlayGateConfig())
    session = requests.Session()
    current_game_id: Optional[str] = None
    last_window_poll = 0.0
    windows: list[dict[str, Any]] = []

    log.info("gse watcher starting (mode=%s)", cfg.mode)
    while True:
        now = time.time()
        if now - last_window_poll >= WINDOW_POLL_S:
            windows = fetch_windows(cfg, session)
            last_window_poll = now
            game = pick_game(cfg, windows)
            game_id = game.get("game_id") if game else None
            if game_id and game_id != current_game_id:
                ok = tune_to_game(cfg, game)
                log.info("window: tuned to %s (ok=%s)", game_id, ok)
                current_game_id = game_id
            elif not game_id:
                current_game_id = None

        if current_game_id is None:
            # Between games: 1 fps idle sampling keeps the pipeline warm and
            # cheap; nothing is relayed (no game to key it to).
            jpeg = capture.grab_jpeg()
            if jpeg:
                gate.observe_idle(jpeg)
            time.sleep(1.0 / IDLE_FPS)
            continue

        # In-window: adaptive rate. Burst at 5 fps during live play,
        # idle at 1 fps otherwise (3-5x compute saving).
        jpeg = capture.grab_jpeg()
        if jpeg is None:
            time.sleep(0.2)
            continue
        live = gate.observe(jpeg)
        fps = BURST_FPS if live else IDLE_FPS
        process_and_relay(cfg, jpeg, current_game_id, now, fps, live, session)
        time.sleep(1.0 / fps)


def main() -> None:
    p = argparse.ArgumentParser(description="GSE autonomous watch client")
    p.add_argument("--config", default="config.json", help="Path to config.json")
    p.add_argument(
        "--once",
        action="store_true",
        help="Capture one frame and print the Space JSON (smoke test)",
    )
    args = p.parse_args()
    cfg = WatcherConfig.load(Path(args.config))
    if args.once:
        logging.basicConfig(level=logging.INFO)
        cap = Capture()
        jpeg = cap.grab_jpeg()
        assert jpeg, "capture failed"
        out = process_and_relay(
            cfg, jpeg, "SMOKE", time.time(), IDLE_FPS, False, requests.Session()
        )
        print(json.dumps(out, indent=2)[:2000] if out else "relay failed")
        return
    run(cfg)


if __name__ == "__main__":
    main()
