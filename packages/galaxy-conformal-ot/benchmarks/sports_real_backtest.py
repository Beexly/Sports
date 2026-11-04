"""
Real-data sports backtest: weekly workload -> next-week Out/Doubtful.

Data: data/gse-dataset/current/snap_counts_2026.csv (weeks 1-7) joined by
(normalized name, team) to data/nflverse/injuries_2026.csv.
Label: player Out/Doubtful in week w+1 having played >=1 snap in week w.
Scores compared by AUC (rank-based, bootstrap 95% CI):
  acwr       - acute/chronic snap ratio (the standard baseline)
  prior_inj  - listed on injury report in week w (strong naive baseline)
  csd        - galaxy lag-1 autocorrelation score on snap-share series
  galaxy_kin - galaxy evaluate_injury_survival_hazard on ACWR
Pre-registered: no tuning; one pass; report whatever comes out.
"""
import json
import re
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from galaxy_conformal_ot import (compute_critical_slowing_down_index,  # noqa: E402
                                 evaluate_injury_survival_hazard)


def norm(n):
    return re.sub(r"[^a-z]", "", str(n).lower().replace(" jr.", "").replace(" sr.", ""))


def auc(y, s):
    y, s = np.asarray(y), np.asarray(s)
    pos, neg = s[y == 1], s[y == 0]
    if len(pos) == 0 or len(neg) == 0:
        return float("nan")
    r = pd.Series(np.concatenate([pos, neg])).rank().values
    return float((r[: len(pos)].sum() - len(pos) * (len(pos) + 1) / 2) / (len(pos) * len(neg)))


def boot(y, s, n=500, seed=0):
    rng = np.random.default_rng(seed)
    y, s = np.asarray(y), np.asarray(s)
    v = []
    for _ in range(n):
        i = rng.integers(0, len(y), len(y))
        a = auc(y[i], s[i])
        if not np.isnan(a):
            v.append(a)
    return [float(np.percentile(v, 2.5)), float(np.percentile(v, 97.5))]


def build():
    sc = pd.read_csv(ROOT / "data/gse-dataset/current/snap_counts_2026.csv")
    inj = pd.read_csv(ROOT / "data/nflverse/injuries_2026.csv")
    sc["k"] = sc.player.map(norm)
    sc["snaps"] = sc.offense_snaps.fillna(0) + sc.defense_snaps.fillna(0)
    inj["k"] = inj.full_name.map(norm)
    out = inj[inj.report_status.isin(["Out", "Doubtful"])][["k", "team", "week"]].drop_duplicates()
    out["out"] = 1
    listed = inj[inj.report_status.notna() | inj.practice_status.notna()][["k", "team", "week"]].drop_duplicates()
    listed["listed"] = 1
    rows = []
    for (k, team), g in sc.groupby(["k", "team"]):
        g = g.sort_values("week")
        wk = dict(zip(g.week, g.snaps))
        for w in sorted(wk):
            if w < 3 or wk[w] <= 0:
                continue
            hist = [wk.get(x, 0) for x in range(1, w + 1)]
            acute, chronic = hist[-1], np.mean(hist[:-1])
            rows.append({"k": k, "team": team, "week": w, "acute": acute, "chronic": chronic,
                         "series": hist})
    d = pd.DataFrame(rows)
    nxt = out.rename(columns={"week": "nw"}).assign(week=lambda x: x.nw - 1)[["k", "team", "week", "out"]]
    d = d.merge(nxt, on=["k", "team", "week"], how="left")
    d["y"] = d.out.fillna(0).astype(int)
    d = d.merge(listed, on=["k", "team", "week"], how="left")
    d["listed"] = d.listed.fillna(0)
    return d


def main():
    d = build()
    d["acwr"] = d.acute / d.chronic.clip(lower=1.0)
    d["csd"] = d.series.map(lambda s: compute_critical_slowing_down_index(np.diff(s) if len(s) > 3 else s)["csd_bifurcation_score"])
    d["galaxy_kin"] = d.acwr.map(lambda a: evaluate_injury_survival_hazard(a, 5.0)["instant_hazard_rate"])
    res = {"n": int(len(d)), "positives": int(d.y.sum()), "scores": {}}
    for name, col in [("acwr", "acwr"), ("prior_inj", "listed"), ("csd", "csd"), ("galaxy_kin", "galaxy_kin")]:
        res["scores"][name] = {"auc": auc(d.y, d[col]), "ci95": boot(d.y, d[col].values)}
    print(json.dumps(res, indent=2))
    Path(__file__).with_name("results_sports_real.json").write_text(json.dumps(res, indent=2))


if __name__ == "__main__":
    main()
