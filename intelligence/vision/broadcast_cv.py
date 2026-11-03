"""Broadcast CV: player detection and coverage-shell proxy.

Why this exists
---------------
The vision-language model reads formation and down/distance off a broadcast
frame, but it cannot read the coverage shell: on 360p frames 50 of 75 live
frames came back "unknown". A language model does not count defensive backs;
that is a geometric question about where eleven bodies are standing.

This module answers it from pixels:
  1. detect players (American-football player model, classes: player/referee)
  2. split them into two teams by jersey colour (k-means on torso pixels)
  3. measure depth distribution and the deepest band, split left/right of the
     deepest player

The output is deliberately named *proxy*. A single broadcast frame has no
calibration to the line of scrimmage, and the camera may be a tight shot. A
"2-high" read here means two players occupy the deepest band on opposite sides
of the field, which is the visual signature of two deep safeties -- useful
corroboration for a formation model, not a substitute for tracking data.

Frames where detection returns fewer than 16 players are almost certainly tight
shots, huddles or graphics, and are reported as not_evaluable rather than being
silently coerced into a shell label.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np

MIN_PLAYERS_EVALUABLE = 16
DEEP_BAND_QUANTILE = 0.72  # top ~28% of the depth range


def load_detector(weights: Path | str):
    from ultralytics import YOLO

    return YOLO(str(weights))


# Role labels from lmarte17/gridiron-ai-football-detector. Its classes are
# position roles, not a generic "player", so filtering on label == "player"
# silently discards 100% of its boxes.
OFFENSE_ROLES = {"oline", "qb", "running_back", "tight_end", "wide_receiver"}
DEFENSE_ROLES = {"defense"}
VALID_PLAYER_LABELS = OFFENSE_ROLES | DEFENSE_ROLES | {"player"}
REF_LABELS = {"ref", "referee"}


def detect_players(model, image_path: Path | str, conf: float = 0.25,
                   imgsz: int = 960) -> list[dict[str, Any]]:
    """Return on-field player boxes with their role, referees dropped."""
    res = model.predict(str(image_path), conf=conf, imgsz=imgsz, verbose=False)[0]
    out = []
    names = model.names
    for box in res.boxes:
        label = str(names[int(box.cls)]).lower()
        if label in REF_LABELS or label not in VALID_PLAYER_LABELS:
            continue
        x1, y1, x2, y2 = (float(v) for v in box.xyxy[0])
        role_side = "defense" if label in DEFENSE_ROLES else (
            "offense" if label in OFFENSE_ROLES else "unknown")
        out.append({"x1": x1, "y1": y1, "x2": x2, "y2": y2,
                    "cx": (x1 + x2) / 2, "cy": (y1 + y2) / 2,
                    "conf": float(box.conf), "role": label,
                    "role_side": role_side})
    return out


def _torso_hue(img: np.ndarray, box: dict[str, Any]) -> float | None:
    """Median hue of the torso patch, or None when the patch is unusable."""
    import cv2

    h, w = img.shape[:2]
    # torso = upper 45% of the box, inset from the edges
    x1 = int(max(0, box["x1"] + 0.2 * (box["x2"] - box["x1"])))
    x2 = int(min(w, box["x2"] - 0.2 * (box["x2"] - box["x1"])))
    y1 = int(max(0, box["y1"] + 0.12 * (box["y2"] - box["y1"])))
    y2 = int(min(h, box["y1"] + 0.55 * (box["y2"] - box["y1"])))
    if x2 - x1 < 3 or y2 - y1 < 3:
        return None
    patch = img[y1:y2, x1:x2]
    hsv = cv2.cvtColor(patch, cv2.COLOR_BGR2HSV)
    # drop turf: hue 35-85 with any real saturation is grass/field paint
    mask = ~((hsv[..., 0] >= 35) & (hsv[..., 0] <= 85) & (hsv[..., 1] > 40))
    hues = hsv[..., 0][mask]
    if hues.size < 12:
        return None
    return float(np.median(hues))


def load_field_model(weights: Path | str):
    from ultralytics import YOLO

    return YOLO(str(weights))


def field_mask(field_model, image_path: Path | str) -> np.ndarray | None:
    """Boolean mask of the playing field at image resolution."""
    import cv2

    res = field_model.predict(str(image_path), conf=0.25, verbose=False)[0]
    if getattr(res, "masks", None) is None or len(res.masks) == 0:
        return None
    m = res.masks.data[0].cpu().numpy().astype(np.uint8)
    img = cv2.imread(str(image_path))
    if img is None:
        return None
    m = cv2.resize(m, (img.shape[1], img.shape[0]), interpolation=cv2.INTER_NEAREST)
    return m.astype(bool)


def feet_in_field(mask: np.ndarray | None, box: dict[str, Any], pad: int = 4) -> bool:
    """Player is on the field when the point under his feet is inside the mask."""
    if mask is None:
        return True
    h, w = mask.shape
    cx = int(round((box["x1"] + box["x2"]) / 2))
    cy = int(round(box["y2"]))
    x1, x2 = max(0, cx - pad), min(w - 1, cx + pad)
    y1, y2 = max(0, cy - pad), min(h - 1, cy + pad)
    if x2 < x1 or y2 < y1:
        return False
    return bool(mask[y1:y2 + 1, x1:x2 + 1].mean() > 0.3)


def on_turf(img: np.ndarray, box: dict[str, Any], pad: int = 3) -> bool:
    """True when a player's feet sit on grass.

    Broadcasting puts coaches, subs, chain crew and crowd in frame. Without
    this filter a wide shot yields 39-45 "players" and the team split goes
    12/33 -- numbers that are obviously not a football formation.
    """
    import cv2

    h, w = img.shape[:2]
    cx = int(round((box["x1"] + box["x2"]) / 2))
    cy = int(round(box["y2"]))
    x1, x2 = max(0, cx - pad), min(w, cx + pad + 1)
    y1, y2 = max(0, cy - pad), min(h, cy + pad + 1)
    if x2 <= x1 or y2 <= y1:
        return False
    patch = cv2.cvtColor(img[y1:y2, x1:x2], cv2.COLOR_BGR2HSV)
    green = ((patch[..., 0] >= 33) & (patch[..., 0] <= 90) & (patch[..., 1] > 30)).mean()
    return bool(green > 0.30)


def split_teams(img: np.ndarray, players: list[dict[str, Any]]) -> list[int]:
    """Assign each player to team 0/1 by jersey hue. -1 when unreadable."""
    import cv2

    hues, idx = [], []
    for i, p in enumerate(players):
        h = _torso_hue(img, p)
        if h is not None:
            hues.append(h)
            idx.append(i)
    labels = [-1] * len(players)
    if len(hues) < 4:
        return labels
    data = np.array(hues, dtype=np.float32).reshape(-1, 1)
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 1.0)
    _, lab, _ = cv2.kmeans(data, 2, None, criteria, 6, cv2.KMEANS_PP_CENTERS)
    lab = lab.flatten()
    for pos, player_idx in enumerate(idx):
        labels[player_idx] = int(lab[pos])
    return labels


def shell_proxy(players: list[dict[str, Any]]) -> dict[str, Any]:
    """Depth-based shell signature from player centroids."""
    if len(players) < MIN_PLAYERS_EVALUABLE:
        return {"shell": "not_evaluable", "n_players": len(players),
                "reason": f"only {len(players)} players detected (tight shot/huddle/graphic)"}

    ys = np.array([p["cy"] for p in players])
    xs = np.array([p["cx"] for p in players])
    cutoff = float(np.quantile(ys, DEEP_BAND_QUANTILE))
    deep_mask = ys >= cutoff
    n_deep = int(deep_mask.sum())

    if n_deep == 0:
        return {"shell": "not_evaluable", "n_players": len(players),
                "reason": "no players in deepest band"}

    # Split on the centre of the whole formation, not the median of the deep
    # players: splitting at their own median forces ~half to each side and
    # would report "2-high" for almost any two deep defenders.
    mid_x = float(np.median(xs))
    deep_x = xs[deep_mask]
    left = int((deep_x < mid_x).sum())
    right = int((deep_x >= mid_x).sum())

    if n_deep == 1:
        shell = "1-high"
    elif left >= 1 and right >= 1 and n_deep == 2:
        shell = "2-high"
    elif n_deep >= 3:
        shell = "0-or-3-deep"
    else:
        shell = "ambiguous"

    spread = float(np.std(xs[deep_mask])) if n_deep > 1 else 0.0
    return {
        "shell": shell,
        "n_players": int(len(players)),
        "n_deep": n_deep,
        "deep_left": left,
        "deep_right": right,
        "deep_spread_px": round(spread, 1),
        "depth_range_px": [round(float(ys.min()), 1), round(float(ys.max()), 1)],
    }


def analyse_frame(model, image_path: Path | str, conf: float = 0.25,
                  field_model=None) -> dict[str, Any]:
    import cv2

    img = cv2.imread(str(image_path))
    if img is None:
        raise RuntimeError(f"cannot read {image_path}")
    detected = detect_players(model, image_path, conf=conf)
    mask = field_mask(field_model, image_path) if field_model is not None else None
    players = [p for p in detected if feet_in_field(mask, p)]
    labels = split_teams(img, players)
    per_team = {0: labels.count(0), 1: labels.count(1), -1: labels.count(-1)}
    res = shell_proxy(players)
    res["teams"] = per_team
    res["detected_raw"] = len(detected)
    res["filtered_off_field"] = len(detected) - len(players)
    res["frame"] = Path(image_path).name

    # Plausibility gate. A football snap has 22 players on the field; anything
    # outside this band is a crowd shot, a tight close-up, a huddle, or a
    # graphic, and a "shell" read from it would be invented. Refuse it loudly
    # rather than emitting a confident wrong label.
    n = res["n_players"]
    t0, t1 = per_team[0], per_team[1]
    if not (MIN_PLAYERS_EVALUABLE <= n <= 26):
        res["shell"] = "not_evaluable"
        res["reject_reason"] = f"implausible player count {n} (expected 16-26 on a live snap)"
    elif abs(t0 - t1) > 8:
        res["shell"] = "not_evaluable"
        res["reject_reason"] = f"team split implausible {t0}/{t1}"
    return res
