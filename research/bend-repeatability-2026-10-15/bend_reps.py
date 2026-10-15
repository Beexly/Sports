"""Bend rep extraction, following the StevanHRG implementation's CODE
(vendor clone: bend-stevanhrg/src/features.py + src/final_metric.py),
not its prose.

Two rep routes:

ROUTE A - combine drill attempts (the implementation's native unit).
  final_metric.py groups combine tracking by (nfl_id, drill_name, attempt)
  over the ARC drills and takes, per attempt, the peak centripetal
  acceleration from features.centripetal():
      heading h = unwrap(arctan2(dy, dx)) from the x/y path,
      omega     = |dh/dt|            (dt = 0.1 s, 10 Hz),
      ac        = s * omega, 3-frame moving-average smoothed,
      rep value = ac_max over the attempt (ac_p90 also recorded).
  One attempt trajectory = one rep ("bend segment" in the implementation:
  the whole arc-drill attempt is a single sustained bend).

ROUTE B - in-game tracking segments (WO-3 design's harvesting rules,
  ac series computed with the identical code formula as Route A):
  within one player-play at 10 Hz, a bend segment is a maximal run of
  frames with ac above the 75th percentile of that player's game
  distribution, subject to the design's rules:
    * qualifying run starts at >=3 consecutive above-threshold frames;
    * segments separated by <0.5 s (5 frames) below threshold are merged
      (a new segment requires >=0.5 s back below threshold);
    * segment duration must be >=0.4 s (4 frames);
    * segments beginning or ending within 1 s (10 frames) of the play's
      first/last frame (snap/whistle proxies) are excluded;
    * segments spanning a missing frame (frameId gap) are excluded.
  Rep value = peak smoothed ac inside the segment (same reduction as
  the implementation's ac_max).

Ambiguity note (per build instructions): the design text presents the
percentile/duration numbers with "e.g."; the implementation contains no
game-tracking segmenter at all. Where the two could conflict we follow
the CODE for everything the code specifies (the ac formula, smoothing,
peak reduction) and the DESIGN's numbers for segmentation, which the
code leaves unspecified. This is recorded here, not hidden.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

ARC_DRILLS = [
    "FRONT_START_WAVE_DRILL_AND_LATERAL_REACTION",
    "RUN_THE_HOOP_DRILL",
    "RUN_AND_CLUB_DRILL",
]
DT = 0.1          # 10 Hz
SMOOTH = 3        # implementation's smoothing window (frames)


def centripetal_series(x: np.ndarray, y: np.ndarray, s: np.ndarray,
                       dt: float = DT, smooth: int = SMOOTH) -> np.ndarray:
    """Per-frame centripetal acceleration (yd/s^2). Line-for-line port of
    StevanHRG features.centripetal() inner computation:
        h = unwrap(arctan2(gradient(y), gradient(x)))
        omega = |gradient(h)| / dt
        ac = smooth_mean(s * omega, window=smooth)
    """
    x, y, s = np.asarray(x, float), np.asarray(y, float), np.asarray(s, float)
    h = np.unwrap(np.arctan2(np.gradient(y), np.gradient(x)))
    omega = np.abs(np.gradient(h)) / dt
    ac = np.convolve(s * omega, np.ones(smooth) / smooth, mode="same")
    return ac


def attempt_reps(ct: pd.DataFrame) -> pd.DataFrame:
    """ROUTE A. ct: combine tracking rows with columns
    nfl_id, drill_name, attempt, x, y, s (time-ordered within attempt).
    Returns one row per rep: nfl_id, drill_name, attempt, ac_max, ac_p90,
    n_frames. Mirrors final_metric.py's grouping and reduction.
    """
    rows = []
    for (pid, drill, att), g in ct.groupby(["nfl_id", "drill_name", "attempt"], sort=True):
        if len(g) < 6:                      # implementation skips len < 6
            continue
        ac = centripetal_series(g["x"].to_numpy(), g["y"].to_numpy(), g["s"].to_numpy())
        rows.append(dict(nfl_id=pid, drill_name=drill, attempt=att,
                         ac_max=float(ac.max()), ac_p90=float(np.percentile(ac, 90)),
                         n_frames=int(len(g))))
    return pd.DataFrame(rows)


def _runs(mask: np.ndarray) -> list[tuple[int, int]]:
    """Maximal True runs as [start, end) index pairs."""
    out, i, n = [], 0, len(mask)
    while i < n:
        if mask[i]:
            j = i
            while j < n and mask[j]:
                j += 1
            out.append((i, j))
            i = j
        else:
            i += 1
    return out


def segment_play(ac: np.ndarray, frame_ids: np.ndarray, threshold: float,
                 min_onset: int = 3, min_dur: int = 4, merge_gap: int = 5,
                 edge_guard: int = 10) -> list[dict]:
    """ROUTE B segmentation of one player-play's ac series.
    Returns segments with start/stop frame indices, peak ac, mean ac.
    Rules per module docstring (WO-3 design numbers, code formula).
    """
    n = len(ac)
    if n == 0:
        return []
    above = ac > threshold
    runs = [r for r in _runs(above) if r[1] - r[0] >= min_onset]
    if not runs:
        return []
    # merge runs separated by < merge_gap below-threshold frames
    merged = [list(runs[0])]
    for st, en in runs[1:]:
        if st - merged[-1][1] < merge_gap:
            merged[-1][1] = en
        else:
            merged.append([st, en])
    segs = []
    for st, en in merged:
        if en - st < min_dur:
            continue
        if st < edge_guard or (n - en) < edge_guard:     # snap/whistle guard
            continue
        fids = frame_ids[st:en]
        if len(fids) and (np.diff(fids) != 1).any():     # missing frame inside
            continue
        seg_ac = ac[st:en]
        segs.append(dict(start=int(st), stop=int(en),
                         ac_peak=float(seg_ac.max()), ac_mean=float(seg_ac.mean()),
                         n_frames=int(en - st)))
    return segs


def game_reps(tracking: pd.DataFrame, pct: float = 75.0) -> pd.DataFrame:
    """ROUTE B. tracking: BDB-style rows with columns
    gameId, playId, nflId, frameId, x, y, s (time-ordered within play).
    Threshold per player-game = pct-th percentile of that player's ac
    across the whole game (design: 75th percentile of the player's game
    distribution). Returns one row per bend segment (rep).
    """
    rows = []
    tr = tracking.sort_values(["gameId", "nflId", "playId", "frameId"])
    for (gid, pid), g in tr.groupby(["gameId", "nflId"], sort=True):
        # player-game ac distribution -> threshold
        ac_all = []
        plays = {}
        for play_id, pg in g.groupby("playId", sort=True):
            ac = centripetal_series(pg["x"].to_numpy(), pg["y"].to_numpy(), pg["s"].to_numpy())
            plays[play_id] = (pg["frameId"].to_numpy(), ac)
            ac_all.append(ac)
        if not ac_all:
            continue
        thr = float(np.percentile(np.concatenate(ac_all), pct))
        for play_id, (fids, ac) in plays.items():
            for seg in segment_play(ac, fids, thr):
                rows.append(dict(game_id=gid, nfl_id=pid, play_id=play_id,
                                 threshold=thr, **seg))
    return pd.DataFrame(rows)
