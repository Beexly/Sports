"""Sequence model for per-defender coverage assignment.

Why this exists
---------------
Two hand-crafted feature sets were measured against BDB 2025 ground truth and both
landed BELOW the majority baseline at every horizon (0.1799 / 0.1733 / 0.1630 vs
0.2006). That is not evidence about disguise; it is evidence that aggregating a
trajectory into ~27 summary numbers destroys the signal. Coverage assignment is a
function of how a defender's relationship to receivers evolves frame by frame.

So: feed the sequence, not the summary.

Design decisions (mine, stated so they can be argued with)
----------------------------------------------------------
* Per-frame features are relative to the ball at the snap and direction-normalised,
  so a play moving left and a play moving right are the same problem.
* Nearest-opponent distance is included per frame. It is the single most expensive
  feature to compute and the most likely to carry the signal, so it stays.
* Sequence length is capped at 60 frames (~6 s at 10 Hz) from 30 frames pre-snap to
  the horizon. Longer adds cost without adding coverage information.
* A GRU with attention pooling, not a transformer. On CPU with 65k sequences the
  transformer's quadratic attention buys nothing a GRU cannot reach, and this has to
  run on the machine that exists.
* Grouped CV by gameId, same as the tabular baseline, so the numbers are comparable.

The horizon is a truncation of the same sequence, which is what makes the
pre-snap vs post-snap comparison clean: identical model, identical features,
different amount of the play visible.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

DATA = Path(__file__).resolve().parent / "data"

TRACK_COLS = ["gameId", "playId", "nflId", "frameId", "frameType", "x", "y",
              "s", "a", "dir", "o", "event", "club", "playDirection"]

FEATURES = ["dx", "dy", "speed", "accel", "dir_sin", "dir_cos",
            "o_sin", "o_cos", "nearest_opp", "closing"]

MAX_LEN = 60
PRE_FRAMES = 30


def load_labels(data_dir: Path = DATA) -> pd.DataFrame:
    pp = pd.read_csv(data_dir / "player_play.csv", low_memory=False,
                     usecols=["gameId", "playId", "nflId",
                              "pff_defensiveCoverageAssignment"])
    return pp[pp["pff_defensiveCoverageAssignment"].notna()].copy()


def load_tracking(weeks, data_dir: Path = DATA, keys=None) -> pd.DataFrame:
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
        raise FileNotFoundError("no tracking files")
    return pd.concat(frames, ignore_index=True)


def _snap_frames(tr: pd.DataFrame) -> dict:
    snap = (tr.loc[tr["frameType"] == "SNAP"]
              .groupby(["gameId", "playId"])["frameId"].min())
    ev = (tr.loc[tr["event"].notna()]
            .groupby(["gameId", "playId", "event"])["frameId"].min()
            .unstack("event"))
    out = {}
    for k, v in snap.items():
        row = {"snap": int(v)}
        if k in ev.index:
            e = ev.loc[k]
            for name in ("pass_forward", "pass_arrived"):
                if name in e.index and not pd.isna(e[name]):
                    row[name] = int(e[name])
        out[k] = row
    return out


def build_sequences(tr: pd.DataFrame, labels: pd.DataFrame,
                    horizon: str = "through_throw") -> dict:
    """Return X (N, MAX_LEN, F), mask (N, MAX_LEN), y, groups, classes."""
    snaps = _snap_frames(tr)
    ball = tr[tr["club"] == "football"][["gameId", "playId", "frameId", "x", "y"]]
    ball_snap = ball.merge(
        pd.DataFrame([{"gameId": g, "playId": p, "snap": s["snap"]}
                      for (g, p), s in snaps.items()]),
        on=["gameId", "playId"], how="inner")
    ball_snap = ball_snap[ball_snap["frameId"] == ball_snap["snap"]]
    los = {(r.gameId, r.playId): (r.x, r.y) for r in ball_snap.itertuples()}

    direction = (tr.groupby(["gameId", "playId"])["playDirection"].first().to_dict())

    # Precompute per play, once. Doing this inside the label loop meant rebuilding
    # the same opponent-by-frame grouping for every defender on the play - 65k
    # times instead of 2.4k - and the build never finished.
    by_player = {}
    opp_cache = {}
    clubs_by_play = {}
    for (g, p), pdf in tr.groupby(["gameId", "playId"]):
        if (g, p) not in snaps:
            continue
        for nid, sub in pdf.groupby("nflId"):
            by_player[(g, p, nid)] = sub.set_index("frameId")
        for club, sub in pdf.groupby("club"):
            if club == "football":
                continue
            clubs_by_play.setdefault((g, p), []).append(club)
            opp_cache[(g, p, club)] = {
                f: s[["x", "y"]].to_numpy(dtype=float)
                for f, s in sub.groupby("frameId")}

    # Opponents of a defender are every tracked player NOT on his own club.
    # Keyed by (gameId, playId, my_club) and built lazily: at most one entry
    # per club per play, so this stays cheap. Previously this looked up
    # opp_cache[(g, p, my_club)], which returns the defender's own teammates
    # (himself included) and made nearest-opponent distance a constant 0.0.
    opp_for_cache = {}

    def opponents_for(key, my_club):
        ck = (key[0], key[1], my_club)
        if ck in opp_for_cache:
            return opp_for_cache[ck]
        merged = {}
        for club in clubs_by_play.get(key, []):
            if club == my_club:
                continue
            for f, pts in opp_cache.get((key[0], key[1], club), {}).items():
                merged[f] = pts if f not in merged else np.vstack([merged[f], pts])
        opp_for_cache[ck] = merged
        return merged

    classes = sorted(labels["pff_defensiveCoverageAssignment"].unique())
    cls_idx = {c: i for i, c in enumerate(classes)}

    X, M, y, groups = [], [], [], []
    snap_idx, throw_idx = [], []
    for (g, p, nid), grp in labels.groupby(["gameId", "playId", "nflId"]):
        key = (g, p)
        if key not in snaps or key not in los:
            continue
        player = by_player.get((g, p, nid))
        if player is None or player.empty:
            continue
        snap = snaps[key]["snap"]
        if horizon == "pre_snap":
            end = snap
        elif horizon == "through_throw":
            end = snaps[key].get("pass_forward", snap + 25)
        else:
            end = snaps[key].get("pass_arrived", snaps[key].get("pass_forward", snap + 35))

        start = max(snap - PRE_FRAMES, int(player.index.min()))
        frames = list(range(start, min(end, start + MAX_LEN) + 1))
        if len(frames) < 5:
            continue

        my_club = player["club"].iloc[0]
        bx, by = los[key]
        sign = 1.0 if str(direction.get(key)) == "right" else -1.0

        opp_by_frame = opponents_for(key, my_club)

        # Arrays, not .loc per frame: 60 pandas lookups x 65k defenders is ~4M
        # scalar lookups and dominated the build.
        px = player["x"].to_numpy(dtype=float)
        py = player["y"].to_numpy(dtype=float)
        ps = player["s"].to_numpy(dtype=float)
        pa = player["a"].to_numpy(dtype=float)
        pdir = np.nan_to_num(player["dir"].to_numpy(dtype=float))
        po = np.nan_to_num(player["o"].to_numpy(dtype=float))
        fidx = {f: i for i, f in enumerate(player.index)}

        seq = np.zeros((MAX_LEN, len(FEATURES)), dtype=np.float32)
        msk = np.zeros(MAX_LEN, dtype=np.float32)
        prev_d = None
        for i, f in enumerate(frames[:MAX_LEN]):
            j = fidx.get(f)
            if j is None:
                continue
            x_, y_ = px[j], py[j]
            d = np.radians(pdir[j])
            o = np.radians(po[j])
            pts = opp_by_frame.get(f)
            if pts is not None and len(pts):
                nearest = float(np.hypot(pts[:, 0] - x_, pts[:, 1] - y_).min())
            else:
                nearest = 25.0
            closing = 0.0 if prev_d is None else float(prev_d - nearest)
            prev_d = nearest
            seq[i] = [(x_ - bx) * sign, y_ - by, ps[j], pa[j],
                      np.sin(d), np.cos(d), np.sin(o), np.cos(o),
                      nearest, closing]
            msk[i] = 1.0

        if msk.sum() < 5:
            continue
        X.append(seq)
        M.append(msk)
        y.append(cls_idx[grp["pff_defensiveCoverageAssignment"].iloc[0]])
        groups.append(g)
        # Where the snap and the throw fall inside the window, so the same built
        # sequence can be truncated to a shorter horizon instead of rebuilt.
        snap_idx.append(int(np.clip(snap - start, 0, MAX_LEN - 1)))
        throw_idx.append(int(np.clip(snaps[key].get("pass_forward", snap + 25) - start,
                                     0, MAX_LEN - 1)))

    return {
        "X": np.stack(X) if X else np.zeros((0, MAX_LEN, len(FEATURES)), np.float32),
        "mask": np.stack(M) if M else np.zeros((0, MAX_LEN), np.float32),
        "y": np.array(y, dtype=np.int64),
        "groups": np.array(groups),
        "classes": classes,
        "snap_idx": np.array(snap_idx, dtype=np.int64),
        "throw_idx": np.array(throw_idx, dtype=np.int64),
    }


def truncate(data: dict, horizon: str) -> dict:
    """Cut a built sequence set down to a horizon without rebuilding it."""
    out = dict(data)
    m = data["mask"].copy()
    if horizon == "pre_snap":
        cut = data["snap_idx"]
    elif horizon == "through_throw":
        cut = data["throw_idx"]
    else:
        return out
    for i, c in enumerate(cut):
        m[i, c + 1:] = 0.0
    out["mask"] = m
    return out


def train_sequence(data: dict, folds: int = 3, epochs: int = 6, hidden: int = 64,
                   lr: float = 2e-3, seed: int = 0, verbose: bool = True) -> dict:
    """Grouped CV training. Returns accuracy, macro-F1, per-class recall."""
    import torch
    import torch.nn as nn
    from sklearn.metrics import accuracy_score, f1_score, confusion_matrix
    from sklearn.model_selection import GroupKFold

    torch.manual_seed(seed)
    X = torch.tensor(data["X"], dtype=torch.float32)
    M = torch.tensor(data["mask"], dtype=torch.float32)
    y = torch.tensor(data["y"], dtype=torch.long)
    n_classes = len(data["classes"])

    class Net(nn.Module):
        def __init__(self):
            super().__init__()
            self.gru = nn.GRU(len(FEATURES), hidden, num_layers=2,
                              batch_first=True, dropout=0.1)
            self.att = nn.Linear(hidden, 1)
            self.head = nn.Sequential(nn.LayerNorm(hidden), nn.Linear(hidden, n_classes))

        def forward(self, x, m):
            h, _ = self.gru(x)
            scores = self.att(h).squeeze(-1)
            scores = scores.masked_fill(m < 0.5, -1e9)
            w = torch.softmax(scores, dim=1).unsqueeze(-1)
            pooled = (h * w).sum(dim=1)
            return self.head(pooled)

    preds = np.full(len(y), -1)
    gkf = GroupKFold(n_splits=folds)
    for fold, (tr_i, te_i) in enumerate(gkf.split(X, y, groups=data["groups"]), 1):
        net = Net()
        opt = torch.optim.AdamW(net.parameters(), lr=lr, weight_decay=1e-4)
        lossf = nn.CrossEntropyLoss()
        xt, mt, yt = X[tr_i], M[tr_i], y[tr_i]
        n = len(xt)
        for ep in range(epochs):
            net.train()
            perm = torch.randperm(n)
            total = 0.0
            for i in range(0, n, 256):
                idx = perm[i:i + 256]
                opt.zero_grad()
                out = net(xt[idx], mt[idx])
                loss = lossf(out, yt[idx])
                loss.backward()
                nn.utils.clip_grad_norm_(net.parameters(), 1.0)
                opt.step()
                total += loss.detach().item() * len(idx)
            if verbose:
                print(f"    fold {fold} epoch {ep+1}/{epochs} loss={total/n:.4f}")
        net.eval()
        with torch.no_grad():
            for i in range(0, len(te_i), 512):
                idx = te_i[i:i + 512]
                preds[idx] = net(X[idx], M[idx]).argmax(1).numpy()

    cm = confusion_matrix(y.numpy(), preds, labels=list(range(n_classes)))
    per_class = {}
    for i, c in enumerate(data["classes"]):
        tot = cm[i].sum()
        per_class[c] = round(float(cm[i, i] / tot), 3) if tot else None
    return {
        "n": int(len(y)),
        "n_features": len(FEATURES),
        "max_len": MAX_LEN,
        "accuracy": round(float(accuracy_score(y.numpy(), preds)), 4),
        "macro_f1": round(float(f1_score(y.numpy(), preds, average="macro")), 4),
        "majority_baseline": round(float(pd.Series(y.numpy()).value_counts(normalize=True).max()), 4),
        "per_class_recall": per_class,
    }
