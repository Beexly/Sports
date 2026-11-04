"""
Real-data sports backtest v2: weekly skill-player touch workload -> next-week Out/Doubtful.

Fixes vs v1: joins on gsis_id (pbp passer/rusher/receiver ids == injuries gsis_id; no name
matching) and uses 2024-2026 REG play-by-play (more injury events).
Workload per player-week = pass attempts + rush attempts + targets (QB/RB/WR/TE only;
OL/defense have no touch data in pbp -- stated limitation).
Label y = player listed Out/Doubtful in week w+1, requires team played week w+1.
Scores (no fitting, one pass, pre-registered): acwr, prior_inj (listed any status in w),
csd (galaxy AR(1) score on touch series), galaxy_kin (hazard on ACWR).
Known confound: players already hurt see fewer touches -> low-workload predicts Out
(reverse causation). So we additionally report 'acwr_healthy': ACWR AUC restricted to
players NOT on the injury report in week w, which removes the main leak.
Bootstrap resamples PLAYERS (clustered) for 95% CI.
"""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from galaxy_conformal_ot import (compute_critical_slowing_down_index,  # noqa: E402
                                 evaluate_injury_survival_hazard)


def auc(y, s):
    y, s = np.asarray(y), np.asarray(s, dtype=float)
    npos = int((y == 1).sum()); nneg = int((y == 0).sum())
    if npos == 0 or nneg == 0:
        return float("nan")
    r = pd.Series(s).rank().values
    return float((r[y == 1].sum() - npos * (npos + 1) / 2) / (npos * nneg))


def cboot(d, col, n=300, seed=0):
    rng = np.random.default_rng(seed)
    groups = {k: g for k, g in d.groupby("pid")}
    keys = np.array(list(groups))
    vals = []
    for _ in range(n):
        pick = rng.choice(keys, len(keys))
        b = pd.concat([groups[k] for k in pick])
        a = auc(b.y.values, b[col].values)
        if not np.isnan(a):
            vals.append(a)
    return [float(np.percentile(vals, 2.5)), float(np.percentile(vals, 97.5))]


def workload():
    frames = []
    for yr in (2024, 2025, 2026):
        p = pd.read_parquet(ROOT / f"data/nflverse/pbp/play_by_play_{yr}.parquet",
                            columns=["season", "season_type", "week", "posteam", "play_type",
                                     "passer_player_id", "rusher_player_id", "receiver_player_id"])
        p = p[(p.season_type == "REG") & p.play_type.isin(["pass", "run"])]
        for col in ("passer_player_id", "rusher_player_id", "receiver_player_id"):
            q = p[["season", "week", "posteam", col]].dropna().rename(columns={col: "pid"})
            frames.append(q)
    w = pd.concat(frames).groupby(["season", "week", "posteam", "pid"]).size().rename("touches").reset_index()
    return w


def build():
    w = workload()
    inj = pd.concat([pd.read_csv(ROOT / f"data/nflverse/injuries_{y}.csv") for y in (2024, 2025, 2026)])
    inj = inj[inj.game_type == "REG"] if "game_type" in inj else inj
    out = inj[inj.report_status.isin(["Out", "Doubtful"])][["season", "week", "gsis_id"]].drop_duplicates()
    out["out"] = 1
    listed = inj[inj.report_status.notna() | inj.practice_status.notna()][["season", "week", "gsis_id"]].drop_duplicates()
    listed["listed"] = 1
    played = set(zip(w.season, w.week, w.posteam))
    rows = []
    for (s, pid), g in w.groupby(["season", "pid"]):
        g = g.sort_values("week")
        wk = dict(zip(g.week, g.touches))
        team = dict(zip(g.week, g.posteam))
        for k in sorted(wk):
            if k < 4:
                continue
            hist = [wk.get(x, 0) for x in range(max(1, k - 5), k + 1)]
            if len(hist) < 3 or (s, k + 1, team[k]) not in played:
                continue
            rows.append({"season": s, "pid": pid, "week": k, "acute": hist[-1],
                         "chronic": float(np.mean(hist[:-1])), "series": hist})
    d = pd.DataFrame(rows)
    nxt = out.assign(week=out.week - 1).rename(columns={"gsis_id": "pid"})
    d = d.merge(nxt, on=["season", "week", "pid"], how="left")
    d["y"] = d.out.fillna(0).astype(int)
    d = d.merge(listed.rename(columns={"gsis_id": "pid"}), on=["season", "week", "pid"], how="left")
    d["listed"] = d.listed.fillna(0)
    return d


def main():
    d = build()
    d = d[d.chronic >= 3].copy()  # meaningful chronic usage
    d["acwr"] = d.acute / d.chronic.clip(lower=1.0)
    d["csd"] = d.series.map(lambda s: compute_critical_slowing_down_index(np.diff(s) if len(s) > 3 else s)["csd_bifurcation_score"])
    d["galaxy_kin"] = d.acwr.map(lambda a: evaluate_injury_survival_hazard(min(a, 5.0), 5.0)["instant_hazard_rate"])
    h = d[d.listed == 0]
    res = {"n": int(len(d)), "positives": int(d.y.sum()), "players": int(d.pid.nunique()),
           "healthy_subset_n": int(len(h)), "healthy_subset_positives": int(h.y.sum()), "scores": {}}
    for name, df, col in [("acwr", d, "acwr"), ("prior_inj", d, "listed"), ("csd", d, "csd"),
                          ("galaxy_kin", d, "galaxy_kin"),
                          ("acwr_healthy_only", h, "acwr"), ("csd_healthy_only", h, "csd"),
                          ("galaxy_kin_healthy_only", h, "galaxy_kin")]:
        res["scores"][name] = {"auc": auc(df.y, df[col]), "ci95_player_clustered": cboot(df, col)}
    print(json.dumps(res, indent=2))
    Path(__file__).with_name("results_sports_real_v2.json").write_text(json.dumps(res, indent=2))


if __name__ == "__main__":
    main()
