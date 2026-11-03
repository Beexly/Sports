"""Factorized coverage features from BDB 2025 tracking (arXiv:2603.25901 direction).

The point of this module
------------------------
Pre-snap context (formation, personnel, box count) predicts coverage at 35.1%
against a 31.1% majority baseline -- measured and committed at 26797f767. That
is the disguise problem: defenses are built to look alike before the snap.

BDB 2025 ships the thing needed to attack it: per-defender ground truth.

    player_play.csv            354,727 rows
    pff_defensiveCoverageAssignment         65,774 non-null, 19 classes
    pff_primaryDefensiveCoverageMatchupNflId 43,484 non-null
    pff_secondary...MatchupNflId              2,387 non-null
    routeRan                                  42,779 non-null

This module builds per-defender trajectory features at three horizons and lets a
model be scored at each, so "coverage is disguised" stops being an assertion and
becomes a measured difference between horizons:

    pre_snap      frames up to SNAP
    through_throw from SNAP to pass_forward  (+0.5/1.0/1.5s samples)
    through_arrival up to pass_arrived

Features stay deliberately interpretable: depth behind the ball at the snap,
lateral position, pre-snap creep, post-snap displacement and turn rate.

Not implemented here: the paper's factorized attention encoder. A gradient-boosted
model on the same features answers the question this module exists to answer --
does post-snap information actually beat pre-snap information -- without needing
a GPU. Swap in the transformer once that is settled.
"""

from __future__ import annotations

from pathlib import Path
from typing import Iterable

import numpy as np
import pandas as pd

DATA = Path(r"C:\Users\Garrett\Sports\intelligence\vision\data")

TRACK_COLS = ["gameId", "playId", "nflId", "frameId", "frameType", "x", "y",
              "s", "a", "dir", "o", "event", "club", "playDirection"]

HORIZONS = ("pre_snap", "through_throw", "through_arrival")


def load_assignment_labels(data_dir: Path = DATA) -> pd.DataFrame:
    """Defender rows with a PFF coverage assignment."""
    pp = pd.read_csv(data_dir / "player_play.csv", low_memory=False,
                     usecols=["gameId", "playId", "nflId", "teamAbbr",
                              "pff_defensiveCoverageAssignment",
                              "pff_primaryDefensiveCoverageMatchupNflId",
                              "wasTargettedReceiver", "routeRan"])
    lab = pp[pp["pff_defensiveCoverageAssignment"].notna()].copy()
    return lab


def load_tracking(weeks: Iterable[int], data_dir: Path = DATA,
                  keys: set[tuple[int, int]] | None = None) -> pd.DataFrame:
    """Load tracking parquet/csv for the given weeks, optionally filtered to plays."""
    frames = []
    for w in weeks:
        f = data_dir / f"tracking_week_{w}.csv"
        if not f.exists():
            continue
        df = pd.read_csv(f, usecols=TRACK_COLS, low_memory=False)
        if keys is not None:
            df = df[[k in keys for k in zip(df["gameId"], df["playId"])]]
        frames.append(df)
    if not frames:
        raise FileNotFoundError(f"no tracking_week files under {data_dir}")
    return pd.concat(frames, ignore_index=True)


def _snap_index(tr: pd.DataFrame) -> pd.DataFrame:
    """(gameId, playId) -> frameId of the snap and the passing events.

    The snap frame comes from frameType == "SNAP"; the event column names it
    "ball_snap", so keying off event values alone misses it entirely.
    """
    snap = (tr.loc[tr["frameType"] == "SNAP"]
              .groupby(["gameId", "playId"])["frameId"].min().rename("snap"))
    ev = (tr.loc[tr["event"].notna()]
            .groupby(["gameId", "playId", "event"])["frameId"].min()
            .unstack("event"))
    return pd.concat([snap, ev], axis=1)


def build_features(tr: pd.DataFrame, labels: pd.DataFrame,
                   horizon: str = "pre_snap") -> pd.DataFrame:
    """One row per (gameId, playId, nflId) defender with trajectory features."""
    if horizon not in HORIZONS:
        raise ValueError(f"horizon must be one of {HORIZONS}")

    events = _snap_index(tr)
    ball = tr[tr["club"] == "football"][["gameId", "playId", "frameId", "x", "y"]]
    ball_snap = ball.merge(events.reset_index()[["gameId", "playId", "snap"]],
                           on=["gameId", "playId"])
    ball_snap = ball_snap[ball_snap["frameId"] == ball_snap["snap"]]
    los = ball_snap.set_index(["gameId", "playId"])[["x", "y"]]

    def direction(gid, pid):
        d = tr.loc[(tr.gameId == gid) & (tr.playId == pid), "playDirection"]
        return 1.0 if (len(d) and str(d.iloc[0]) == "right") else -1.0

    rows = []
    # Index by player, not by play: a boolean mask per label row over 4.5M rows
    # made this loop take minutes. Keyed lookup is O(1) per player.
    by_player = {k: v.set_index("frameId").sort_index()
                 for k, v in tr.groupby(["gameId", "playId", "nflId"])}
    ev_index = events.to_dict("index")
    los_dict = los.to_dict("index")
    dir_lookup = (tr.groupby(["gameId", "playId"])["playDirection"]
                    .first().to_dict())
    keys = list(zip(labels["gameId"], labels["playId"], labels["nflId"]))

    for gid, pid, nid in keys:
        player = by_player.get((gid, pid, nid))
        if player is None or (gid, pid) not in ev_index:
            continue
        ev = ev_index[(gid, pid)]
        snap_f = ev.get("snap")
        throw_f = ev.get("pass_forward")
        arrive_f = ev.get("pass_arrived")
        if pd.isna(snap_f):
            continue
        snap_f = int(snap_f)

        if player.empty:
            continue
        if (gid, pid) not in los_dict:
            continue
        los_xy = los_dict[(gid, pid)]
        bx, by = los_xy["x"], los_xy["y"]
        sign = 1.0 if str(dir_lookup.get((gid, pid))) == "right" else -1.0

        pre = player[player.index < snap_f]
        f = {}
        if not pre.empty:
            last = pre.iloc[-1]
            f["pre_depth"] = float((last["x"] - bx) * sign)
            f["pre_lateral"] = float(last["y"] - by)
            f["pre_speed"] = float(last["s"])
            f["pre_move_x"] = float(last["x"] - pre.iloc[0]["x"])
            f["pre_move_y"] = float(last["y"] - pre.iloc[0]["y"])
            f["pre_frames"] = int(len(pre))
        else:
            f.update(pre_depth=np.nan, pre_lateral=np.nan, pre_speed=np.nan,
                     pre_move_x=np.nan, pre_move_y=np.nan, pre_frames=0)

        end_f = {"pre_snap": snap_f,
                 "through_throw": int(throw_f) if not pd.isna(throw_f) else snap_f + 10,
                 "through_arrival": int(arrive_f) if not pd.isna(arrive_f) else (
                     int(throw_f) if not pd.isna(throw_f) else snap_f + 25)}[horizon]

        post = player[(player.index > snap_f) & (player.index <= end_f)]
        if post.empty:
            post = player[player.index >= snap_f]
        if not post.empty:
            first = post.iloc[0]
            last = post.iloc[-1]
            f["post_dx"] = float((last["x"] - first["x"]) * sign)
            f["post_dy"] = float(last["y"] - first["y"])
            f["post_max_speed"] = float(post["s"].max())
            f["post_mean_speed"] = float(post["s"].mean())
            f["post_depth_end"] = float((last["x"] - bx) * sign)
            f["post_lateral_end"] = float(last["y"] - by)
            f["post_turn"] = float(abs((last["dir"] - first["dir"] + 180) % 360 - 180))
            # sample displacement at +0.5 / 1.0 / 1.5 s (10 Hz)
            for k, off in (("d05", 5), ("d10", 10), ("d15", 15)):
                tgt = snap_f + off
                near = post.reindex([tgt], method="nearest") if not post.empty else None
                if near is not None and not near.isna().all().all():
                    f[f"disp_{k}"] = float((near.iloc[0]["x"] - first["x"]) * sign)
                else:
                    f[f"disp_{k}"] = np.nan
            f["post_frames"] = int(len(post))
        else:
            for c in ("post_dx", "post_dy", "post_max_speed", "post_mean_speed",
                      "post_depth_end", "post_lateral_end", "post_turn",
                      "disp_d05", "disp_d10", "disp_d15"):
                f[c] = np.nan
            f["post_frames"] = 0

        f["gameId"] = gid
        f["playId"] = pid
        f["nflId"] = nid
        rows.append(f)

    feat = pd.DataFrame(rows)
    if feat.empty:
        return feat
    return feat.merge(
        labels[["gameId", "playId", "nflId", "pff_defensiveCoverageAssignment"]],
        on=["gameId", "playId", "nflId"], how="inner")


def train(feat: pd.DataFrame, target: str = "pff_defensiveCoverageAssignment",
          seed: int = 0) -> dict:
    """Game-grouped CV. Returns accuracy, macro-F1 and per-class recall."""
    from sklearn.ensemble import HistGradientBoostingClassifier
    from sklearn.metrics import accuracy_score, f1_score, confusion_matrix
    from sklearn.model_selection import GroupKFold

    drop = ["gameId", "playId", "nflId", target]
    X = feat[[c for c in feat.columns if c not in drop]].fillna(-1)
    y = feat[target].astype("category")
    classes = list(y.cat.categories)
    yc = y.cat.codes.to_numpy()
    groups = feat["gameId"].to_numpy()

    preds = np.full(len(yc), -1)
    for tr_i, te_i in GroupKFold(n_splits=5).split(X, yc, groups=groups):
        m = HistGradientBoostingClassifier(max_iter=300, learning_rate=0.08,
                                           max_depth=6, random_state=seed)
        m.fit(X.iloc[tr_i], yc[tr_i])
        preds[te_i] = m.predict(X.iloc[te_i])

    cm = confusion_matrix(yc, preds, labels=list(range(len(classes))))
    per_class = {}
    for i, c in enumerate(classes):
        tot = cm[i].sum()
        per_class[c] = round(float(cm[i, i] / tot), 3) if tot else None
    return {
        "n": int(len(yc)),
        "n_features": int(X.shape[1]),
        "accuracy": round(float(accuracy_score(yc, preds)), 4),
        "macro_f1": round(float(f1_score(yc, preds, average="macro")), 4),
        "majority_baseline": round(float(pd.Series(yc).value_counts(normalize=True).max()), 4),
        "per_class_recall": per_class,
    }
