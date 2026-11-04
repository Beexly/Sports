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


# ---------------------------------------------------------------------------
# Crop-pose pipeline (Phase 7)
#
# A whole-frame pose model fails on broadcast football: players are 40-90 px
# tall, occlude each other, and the model's person detector fires on the
# crowd. Running pose on a per-player crop gives the model a full-resolution
# body, and the crop's known box supplies the correspondence the whole-frame
# model would have to guess.
#
# COCO 17-keypoint order:
#   0 nose, 1/2 eyes, 3/4 ears, 5/6 shoulders, 7/8 elbows, 9/10 wrists,
#   11/12 hips, 13/14 knees, 15/16 ankles
# ---------------------------------------------------------------------------

# (start, end) keypoint pairs for each limb segment.
LIMB_SEGMENTS = {
    "l_upper_arm": (5, 7), "l_forearm": (7, 9),
    "r_upper_arm": (6, 8), "r_forearm": (8, 10),
    "l_thigh": (11, 13), "l_shin": (13, 15),
    "r_thigh": (12, 14), "r_shin": (14, 16),
}

# Anthropometric priors: segment length as a fraction of shoulder width.
# Used to detect foreshortening (a limb pointing at the camera compresses).
LIMB_PRIORS = {
    "l_upper_arm": 0.95, "l_forearm": 0.85,
    "r_upper_arm": 0.95, "r_forearm": 0.85,
    "l_thigh": 1.35, "l_shin": 1.25,
    "r_thigh": 1.35, "r_shin": 1.25,
}

FORESHORTEN_RATIO = 0.45  # below this fraction of prior => foreshortened
MIN_KPT_CONF = 0.30


def load_pose_model(weights: Path | str = "yolo11n-pose.pt"):
    """Load the COCO-17 pose model (auto-downloads on first use)."""
    from ultralytics import YOLO

    return YOLO(str(weights))


def _crop_with_pad(img: np.ndarray, box: dict[str, Any], pad: float = 0.12):
    """Crop a player box with padding; returns (crop, x_off, y_off)."""
    h, w = img.shape[:2]
    bw = box["x2"] - box["x1"]
    bh = box["y2"] - box["y1"]
    x1 = int(max(0, box["x1"] - pad * bw))
    y1 = int(max(0, box["y1"] - pad * bh))
    x2 = int(min(w, box["x2"] + pad * bw))
    y2 = int(min(h, box["y2"] + pad * bh))
    if x2 - x1 < 8 or y2 - y1 < 8:
        return None, 0, 0
    return img[y1:y2, x1:x2], x1, y1


MIN_CROP_H = 256  # upscale small broadcast crops before pose


def pose_on_crop(pose_model, img: np.ndarray, box: dict[str, Any],
                 pad: float = 0.12) -> dict[str, Any] | None:
    """Run pose on one player crop; return keypoints in full-image coords.

    Broadcast players are 40-90 px tall. YOLO11n-pose cannot resolve a
    17-keypoint skeleton at that scale, so the crop is upscaled to at least
    MIN_CROP_H before inference and the keypoints are scaled back.

    Returns None when the crop is unusable or the model finds no person.
    """
    import cv2

    crop, x_off, y_off = _crop_with_pad(img, box, pad)
    if crop is None:
        return None
    h, w = crop.shape[:2]
    scale = max(1.0, MIN_CROP_H / float(h))
    if scale > 1.0:
        crop = cv2.resize(crop, (int(round(w * scale)), int(round(h * scale))),
                          interpolation=cv2.INTER_CUBIC)
    res = pose_model.predict(crop, conf=0.15, imgsz=640, verbose=False)[0]
    if res.keypoints is None or len(res.keypoints) == 0:
        return None
    # Take the highest-confidence person in the crop.
    kpts = res.keypoints.data.cpu().numpy()  # (n, 17, 3)
    conf_attr = getattr(res.keypoints, "conf", None)
    confs = conf_attr.cpu().numpy() if conf_attr is not None else None
    if confs is not None and confs.ndim == 2:
        best = int(np.argmax(confs.mean(axis=1)))
    else:
        best = 0
    kp = kpts[best].copy()
    # Undo the upscale, then shift into full-image coordinates.
    kp[:, 0] = kp[:, 0] / scale + x_off
    kp[:, 1] = kp[:, 1] / scale + y_off
    return {"keypoints": kp, "crop_box": [x_off, y_off, x_off + w, y_off + h],
            "crop_scale": scale}


def _footpoint(kp: np.ndarray) -> tuple[float, float] | None:
    """Midpoint of the two ankles, or the lowest confident keypoint."""
    if kp[15, 2] >= MIN_KPT_CONF and kp[16, 2] >= MIN_KPT_CONF:
        return float((kp[15, 0] + kp[16, 0]) / 2), float((kp[15, 1] + kp[16, 1]) / 2)
    valid = kp[kp[:, 2] >= MIN_KPT_CONF]
    if len(valid) == 0:
        return None
    lowest = valid[np.argmax(valid[:, 1])]
    return float(lowest[0]), float(lowest[1])


def assign_poses_to_players(players: list[dict[str, Any]],
                            poses: list[dict[str, Any] | None],
                            max_dist_px: float = 60.0) -> list[dict[str, Any] | None]:
    """Footpoint-to-tracklet correspondence.

    Each pose's footpoint is matched to the nearest player box's bottom-centre.
    A pose whose footpoint is farther than max_dist_px from every box is
    dropped (it belongs to a spectator or a different player in the crop).
    """
    assigned: list[dict[str, Any] | None] = [None] * len(players)
    if not players:
        return assigned
    box_feet = np.array([[(p["x1"] + p["x2"]) / 2, p["y2"]] for p in players])
    used = set()
    for pose in poses:
        if pose is None:
            continue
        fp = _footpoint(pose["keypoints"])
        if fp is None:
            continue
        d = np.hypot(box_feet[:, 0] - fp[0], box_feet[:, 1] - fp[1])
        order = np.argsort(d)
        for j in order:
            if j in used:
                continue
            if d[j] <= max_dist_px:
                assigned[int(j)] = pose
                used.add(int(j))
            break
    return assigned


def _seg_len(kp: np.ndarray, a: int, b: int) -> float | None:
    if kp[a, 2] < MIN_KPT_CONF or kp[b, 2] < MIN_KPT_CONF:
        return None
    return float(np.hypot(kp[a, 0] - kp[b, 0], kp[a, 1] - kp[b, 1]))


def repair_foreshortened_limbs(kp: np.ndarray) -> dict[str, Any]:
    """Flag and repair limbs compressed by camera foreshortening.

    A limb pointing at the camera projects to a short segment. We compare each
    segment against its anthropometric prior (fraction of shoulder width) and
    against its contralateral twin. A segment below FORESHORTEN_RATIO of the
    prior is marked foreshortened; its endpoint is extrapolated along the
    visible direction to the prior length so downstream geometry (route
    angles, stride) is not corrupted by the projection.
    """
    kp = kp.copy()
    shoulder_w = _seg_len(kp, 5, 6)
    if shoulder_w is None or shoulder_w < 4:
        return {"keypoints": kp, "foreshortened": [], "repaired": []}

    foreshortened, repaired = [], []
    for name, (a, b) in LIMB_SEGMENTS.items():
        seg = _seg_len(kp, a, b)
        prior = LIMB_PRIORS[name] * shoulder_w
        if seg is None:
            continue
        if seg < FORESHORTEN_RATIO * prior:
            foreshortened.append(name)
            # Extrapolate b along the a->b direction to the prior length.
            dx, dy = kp[b, 0] - kp[a, 0], kp[b, 1] - kp[a, 1]
            norm = float(np.hypot(dx, dy))
            if norm < 1e-6:
                # Degenerate: mirror the contralateral segment if available.
                twin = {"l_upper_arm": "r_upper_arm", "r_upper_arm": "l_upper_arm",
                        "l_forearm": "r_forearm", "r_forearm": "l_forearm",
                        "l_thigh": "r_thigh", "r_thigh": "l_thigh",
                        "l_shin": "r_shin", "r_shin": "l_shin"}[name]
                ta, tb = LIMB_SEGMENTS[twin]
                tdx, tdy = kp[tb, 0] - kp[ta, 0], kp[tb, 1] - kp[ta, 1]
                tnorm = float(np.hypot(tdx, tdy))
                if tnorm < 1e-6:
                    continue
                dx, dy, norm = tdx, tdy, tnorm
            scale = prior / norm
            kp[b, 0] = kp[a, 0] + dx * scale
            kp[b, 1] = kp[a, 1] + dy * scale
            repaired.append(name)
    return {"keypoints": kp, "foreshortened": foreshortened, "repaired": repaired}


def filter_sideline(players: list[dict[str, Any]],
                    poses: list[dict[str, Any] | None],
                    field_mask_arr: np.ndarray | None = None) -> list[int]:
    """Indices of players that are on the field and pose-consistent.

    Drops: (a) players whose feet are off the field mask, (b) players with no
    assigned pose, (c) players whose pose is implausibly small (crowd/coach).
    """
    keep = []
    for i, (p, pose) in enumerate(zip(players, poses)):
        if pose is None:
            continue
        if field_mask_arr is not None and not feet_in_field(field_mask_arr, p):
            continue
        kp = pose["keypoints"]
        shoulder_w = _seg_len(kp, 5, 6)
        if shoulder_w is None or shoulder_w < 6:
            continue
        keep.append(i)
    return keep


def analyse_frame_with_pose(model, pose_model, image_path: Path | str,
                            conf: float = 0.25, field_model=None) -> dict[str, Any]:
    """Full pipeline: detect -> crop-pose -> correspond -> repair -> filter."""
    import cv2

    img = cv2.imread(str(image_path))
    if img is None:
        raise RuntimeError(f"cannot read {image_path}")
    detected = detect_players(model, image_path, conf=conf)
    mask = field_mask(field_model, image_path) if field_model is not None else None
    players = [p for p in detected if feet_in_field(mask, p)]

    poses = [pose_on_crop(pose_model, img, p) for p in players]
    assigned = assign_poses_to_players(players, poses)
    repaired = []
    for pose in assigned:
        if pose is not None:
            r = repair_foreshortened_limbs(pose["keypoints"])
            pose["keypoints"] = r["keypoints"]
            pose["foreshortened"] = r["foreshortened"]
            pose["repaired"] = r["repaired"]
            repaired.extend(r["repaired"])

    keep = filter_sideline(players, assigned, mask)
    kept_players = [players[i] for i in keep]

    res = shell_proxy(kept_players)
    res["detected_raw"] = len(detected)
    res["filtered_off_field"] = len(detected) - len(players)
    res["pose_assigned"] = sum(1 for p in assigned if p is not None)
    res["pose_kept"] = len(keep)
    res["foreshortened_repaired"] = len(repaired)
    res["frame"] = Path(image_path).name
    return res


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
