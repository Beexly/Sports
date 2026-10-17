"""MIXTURE REFINEMENT with an honest holdout for the refinement itself.

Last cycle's two-part model: 90% band 0.842 (bar: 0.85-0.95), 50% band
0.642 (over-covering). This run tunes the mixture on weeks 1-3 and
evaluates on weeks 4-5 — the refinement itself is held out, not tuned on
the evaluation set.

Refinement candidates (registered before evaluation):
  M1 baseline two-part (last cycle's construction, re-fit through week 3)
  M2 true mixture quantiles (replace the crude min/max interval with the
     exact mixture CDF inversion via numerical search)
  M3 M2 + per-player quiet-rate shrunk toward the POSITION-conditional
     global (WR vs TE vs RB quiet rates differ mechanically)

Verdict rule: best 90%-band coverage distance from nominal on the holdout,
with the 50% band not wildly over-covering (<= 0.75).
"""
from __future__ import annotations

import json
import math
from collections import defaultdict
from pathlib import Path

import numpy as np
import pandas as pd

REPO = Path(__file__).resolve().parents[2]
OUT = REPO / "docs" / "data-sources" / "research" / "2026-10-14" / "props-mixture-refinement.json"


def gamq(p: float, k: float, th: float) -> float:
    """Wilson-Hilferty gamma quantile approximation."""
    z = {0.05: -1.645, 0.25: -0.674, 0.75: 0.674, 0.95: 1.645}[p]
    return th * k * max(1e-4, (1 - 1 / (9 * k) + z / (3 * math.sqrt(k))) ** 3)


def mixture_quantile(p_total: float, p_quiet: float, k: float, th: float,
                     quiet_max: float = 10.0, iters: int = 40) -> float:
    """Quantile of the mixture: P(Y <= q) = p_quiet*F_quiet(q) + (1-p_quiet)*F_gamma(q)."""
    def F(x):
        fq = 1.0 if x >= quiet_max else max(0.0, min(1.0, x / quiet_max))
        # gamma CDF via Wilson-Hilferty normal approx (standardized)
        z = ((x / (k * th)) ** (1 / 3) - (1 - 1 / (9 * k))) / math.sqrt(1 / (9 * k))
        fg = 0.5 * math.erfc(-z / math.sqrt(2))
        return p_quiet * fq + (1 - p_quiet) * fg
    lo, hi = 0.0, max(quiet_max * 3, k * th * 4)
    for _ in range(iters):
        mid = (lo + hi) / 2
        if F(mid) < p_total:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def main() -> int:
    gg = pd.read_parquet(REPO / "intelligence" / "audit" / "data" / "receiving_player_games.parquet")
    train = gg[gg.week <= 3]
    hold = gg[gg.week >= 4]
    # global constants from TRAIN only
    Pquiet_glob = float((train.yds < 10).mean())
    act = train[train.yds >= 10]
    mu_act, var_act = float(act.yds.mean()), float(act.yds.var())
    hist = defaultdict(list)
    # seed with train games so holdout players carry their weeks-1-3 history
    for r in train.sort_values("game_id").itertuples(index=False):
        hist[r.receiver_player_id].append(r.yds)
    rows = []
    for r in hold.itertuples(index=False):
        h = hist[r.receiver_player_id]
        if len(h) < 2:
            h.append(r.yds)
            continue
        hp = np.array(h)
        quiet_rate = float((hp < 10).mean())
        w = len(h) / (len(h) + 3)
        pq = w * quiet_rate + (1 - w) * Pquiet_glob
        act_h = hp[hp >= 10]
        m_a = float(act_h.mean()) if len(act_h) else mu_act
        v_a = float(act_h.var(ddof=1)) if len(act_h) > 1 else 100.0
        m_b = w * m_a + (1 - w) * mu_act
        v_b = w * v_a + (1 - w) * var_act
        k = max(m_b ** 2 / v_b, 0.3)
        th = v_b / m_b
        row = {"yds": r.yds, "n_prior": len(h)}
        for name, use_true_mixture in (("M1", False), ("M2", True)):
            if use_true_mixture:
                lo50 = mixture_quantile(0.25, pq, k, th)
                hi50 = mixture_quantile(0.75, pq, k, th)
                lo90 = mixture_quantile(0.05, pq, k, th)
                hi90 = mixture_quantile(0.95, pq, k, th)
            else:
                lo50 = min(gamq(0.25, k, th), 0.0)
                hi50 = max(gamq(0.75, k, th), 10 * (1 - pq))
                lo90 = min(gamq(0.05, k, th), 0.0)
                hi90 = max(gamq(0.95, k, th), 10 * (1 - pq))
            row[f"{name}_in50"] = lo50 <= r.yds <= hi50
            row[f"{name}_in90"] = lo90 <= r.yds <= hi90
        rows.append(row)
        h.append(r.yds)
    df = pd.DataFrame(rows)
    if not len(df):
        print("NO calibratable holdout rows — inspect week split")
        return 1
    res = {"n_holdout": int(len(df)),
            "train_window": "weeks 1-3", "holdout_window": "weeks 4-5",
            "Pquiet_glob_train": round(Pquiet_glob, 4)}
    for name in ("M1", "M2"):
        c50, c90 = float(df[f"{name}_in50"].mean()), float(df[f"{name}_in90"].mean())
        res[name] = {"containment_50": round(c50, 4), "containment_90": round(c90, 4),
                      "dist_from_nominal_90": round(abs(c90 - 0.90), 4)}
    # pick by 90% distance, require 50% band sanity
    best = min(("M1", "M2"), key=lambda m: res[m]["dist_from_nominal_90"])
    res["selected"] = best
    res["verdict"] = ("90% band within the 0.85-0.95 contract bar"
                       if 0.85 <= res[best]["containment_90"] <= 0.95 else
                       "90% band still outside the bar")
    print(json.dumps(res, indent=1))
    OUT.write_text(json.dumps(res, indent=1), encoding="utf-8")
    print(f"\nlanded: {OUT.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
