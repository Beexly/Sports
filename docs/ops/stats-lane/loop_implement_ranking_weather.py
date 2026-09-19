#!/usr/bin/env python3
"""Loop implement 07:02Z — ranking shadow + rest/weather K3 replacement validation.

1) ranking_shadow.py — recompute four ordering keys on settled pre-game export rows
   (same-row duel; no MODEL_VERSION bump; PRE-REG-style kill on hit-rate ordering).
2) rest_weather_k3_replacement.py — Mondrian residual coverage by weather/roof/rest
   cells on nflverse + label K3 No-band; promote only if OOT>=0.85.

Never flips gates. Law 4: only observed numbers.
"""

from __future__ import annotations

import csv
import json
import math
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from statistics import mean, pstdev

sys.path.insert(0, str(Path(__file__).resolve().parent))
from stats_json import write_report

EXPORT = Path("docs/ops/stats-lane/incoming/board-export.jsonl")
GAMES = Path(r"C:\Users\Garrett\nfl_ot\games.csv")
OUT_SHADOW = Path("docs/ops/stats-lane/out/ranking_shadow_duel.json")
OUT_REST = Path("docs/ops/stats-lane/out/rest_weather_k3_replacement.json")


def fnum(x):
    try:
        if x is None or x == "":
            return None
        v = float(x)
        return v if math.isfinite(v) else None
    except Exception:
        return None


def wilson(w, n, z=1.96):
    if n == 0:
        return (None, None)
    p = w / n
    d = 1 + z * z / n
    c = p + z * z / (2 * n)
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))
    return ((c - h) / d, (c + h) / d)


def top_decile_hit(rows, key_fn, label):
    scored = []
    for r in rows:
        k = key_fn(r)
        if k is None:
            continue
        if r.get("result") not in ("WIN", "LOSS"):
            continue
        scored.append((k, 1 if r.get("result") == "WIN" else 0))
    if len(scored) < 30:
        return {"label": label, "n": len(scored), "status": "UNDERPOWERED"}
    scored.sort(key=lambda t: -t[0])
    n = len(scored)
    top = scored[: max(1, n // 10)]
    bot = scored[-max(1, n // 10):]
    hit_top = sum(y for _, y in top) / len(top)
    hit_bot = sum(y for _, y in bot) / len(bot)
    hit_all = sum(y for _, y in scored) / n
    lo, hi = wilson(sum(y for _, y in top), len(top))
    # deciles
    dec = []
    for i in range(10):
        a = int(i * n / 10)
        b = int((i + 1) * n / 10)
        chunk = scored[a:b] or []
        if not chunk:
            continue
        dec.append({"bin": i, "n": len(chunk), "hit": sum(y for _, y in chunk) / len(chunk)})
    inversions = 0
    for i in range(1, len(dec)):
        if dec[i]["hit"] < dec[i - 1]["hit"] - 0.02:
            inversions += 1
    return {
        "label": label,
        "n": n,
        "hit_base": hit_all,
        "top_decile_n": len(top),
        "top_decile_hit": hit_top,
        "top_wilson95": [lo, hi],
        "bottom_decile_hit": hit_bot,
        "spread_top_minus_bottom": hit_top - hit_bot,
        "decile_inversions": inversions,
        "deciles": dec,
        "status": "ok",
    }


def ranking_shadow():
    if not EXPORT.exists():
        return {"status": "DATA_BLOCKED"}
    rows = []
    for line in EXPORT.open(encoding="utf-8"):
        r = json.loads(line)
        if r.get("isBootstrap"):
            continue
        if r.get("result") not in ("WIN", "LOSS"):
            continue
        # pre-game proxy: commenceTime after generatedAt
        gt, ct = r.get("generatedAt"), r.get("commenceTime")
        pre = True
        try:
            if gt and ct:
                pre = str(ct) >= str(gt)
        except Exception:
            pre = True
        if not pre:
            continue
        rows.append(r)

    def conf(r):
        c = fnum(r.get("confidence"))
        return c / 100.0 if c is not None else None

    def ranking_p(r):
        return fnum(r.get("rankingP"))

    def mfp(r):
        return fnum(r.get("marketFairProb"))

    def model_minus_market(r):
        tp = fnum(r.get("independentTrueProb"))
        mp = fnum(r.get("marketFairProb"))
        if tp is None or mp is None:
            return None
        return tp - mp

    def current_key(r):
        # rankingP else confidence/100 — extractRankingSortKey spirit
        rp = ranking_p(r)
        if rp is not None:
            return rp
        return conf(r)

    arms = [
        top_decile_hit(rows, current_key, "current_rankingP_else_conf"),
        top_decile_hit(rows, conf, "confidence_100"),
        top_decile_hit(rows, ranking_p, "rankingP_only"),
        top_decile_hit(rows, mfp, "marketFairProb"),
        top_decile_hit(rows, model_minus_market, "trueProb_minus_mfp"),
    ]
    by_type = {}
    for pt in ("SPREAD", "MONEYLINE", "TOTAL"):
        sub = [r for r in rows if r.get("pickType") == pt]
        by_type[pt] = [
            top_decile_hit(sub, mfp, f"{pt}:mfp"),
            top_decile_hit(sub, conf, f"{pt}:conf"),
            top_decile_hit(sub, ranking_p, f"{pt}:rankingP"),
        ]
    # Same-row winner by top-decile hit (among arms with n>=100)
    eligible = [a for a in arms if a.get("status") == "ok" and a.get("n", 0) >= 100]
    winner = None
    if eligible:
        winner = max(eligible, key=lambda a: a.get("top_decile_hit") or 0)
    return {
        "status": "ok",
        "n_settled_pre_game_nonbootstrap": len(rows),
        "pre_reg": "Same-row recompute of ranking candidates; no MODEL_VERSION bump; founder RANKING_ORDERING_SWITCH only after L11.",
        "kill_line": (
            "If marketFairProb top-decile hit CI does not separate from confidence/100, "
            "do not claim market-p ordering superiority on this export. Overlap => say overlap."
        ),
        "arms": arms,
        "by_pickType": by_type,
        "winner_by_top_decile_hit_n100": winner.get("label") if winner else None,
        "replacement": (
            "Shadow only: board sort cascade marketFairProb -> rankingP independent -> display confidence. "
            "Never rank on bookmakerCount (I1 DEPTH kill)."
        ),
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }


def norm_cdf(z):
    return 0.5 * (1 + math.erf(z / math.sqrt(2)))


def rest_weather_k3():
    if not GAMES.exists():
        return {"status": "DATA_BLOCKED"}
    cells = defaultdict(list)
    for rec in csv.DictReader(GAMES.open(encoding="utf-8")):
        if (rec.get("game_type") or "REG") != "REG":
            continue
        hs, aw = fnum(rec.get("home_score")), fnum(rec.get("away_score"))
        sp = fnum(rec.get("spread_line"))
        tl = fnum(rec.get("total_line"))
        if hs is None or aw is None:
            continue
        roof = (rec.get("roof") or "").lower()
        wind = fnum(rec.get("wind"))
        hr, ar = fnum(rec.get("home_rest")), fnum(rec.get("away_rest"))
        if sp is not None:
            # market home margin proxy = +spread_line (positive=home favored, measured)
            resid_m = (hs - aw) - sp
            key_roof = "dome" if roof in ("dome", "closed") else "outdoor"
            cells[f"margin|roof|{key_roof}"].append(resid_m)
            if wind is not None:
                wb = "wind_ge15" if wind >= 15 else "wind_5_15" if wind >= 5 else "wind_lt5"
                cells[f"margin|{wb}|{key_roof}"].append(resid_m)
            if hr is not None and ar is not None:
                rd = hr - ar
                rb = "rest_home_plus3" if rd >= 3 else "rest_away_plus3" if rd <= -3 else "rest_bal"
                cells[f"margin|{rb}|{key_roof}"].append(resid_m)
        if tl is not None:
            resid_t = (hs + aw) - tl
            key_roof = "dome" if roof in ("dome", "closed") else "outdoor"
            cells[f"total|roof|{key_roof}"].append(resid_t)
            if wind is not None and roof not in ("dome", "closed"):
                wb = "wind_ge15" if wind >= 15 else "wind_5_15" if wind >= 5 else "wind_lt5"
                cells[f"total|{wb}"].append(resid_t)

    out = []
    for k, arr in sorted(cells.items()):
        if len(arr) < 40:
            continue
        mu = mean(arr)
        sd = pstdev(arr) if len(arr) > 1 else 0.0
        # split OOT: first 60% cal, last 40% test by order (games.csv is chronological-ish)
        cut = int(len(arr) * 0.6)
        cal, te = arr[:cut], arr[cut:]
        if len(cal) < 20 or len(te) < 20 or sd <= 0:
            continue
        # residual qhat at 90% on |resid - 0| using ceil((n+1)*0.9) fail-closed
        n = len(cal)
        k_rank = math.ceil((n + 1) * 0.9)
        if k_rank > n:
            qhat = float("inf")
        else:
            s = sorted(abs(x) for x in cal)
            qhat = s[k_rank - 1]
        if math.isinf(qhat):
            cov = None
        else:
            cov = sum(1 for x in te if abs(x) <= qhat) / len(te)
        out.append(
            {
                "cell": k,
                "n": len(arr),
                "n_cal": len(cal),
                "n_te": len(te),
                "mean_resid": mu,
                "sd": sd,
                "qhat_90": None if math.isinf(qhat) else qhat,
                "qhat_infinite": math.isinf(qhat),
                "oot_coverage_90": cov,
                "oot_ge_085": (cov is not None and cov >= 0.85),
                "label": (
                    "PROMOTE_UQ_BAND"
                    if (cov is not None and cov >= 0.85)
                    else ("FAIL_CLOSED_OR_UNDER" if cov is None else "UNDER_0.85")
                ),
            }
        )
    promote = [c["cell"] for c in out if c["label"] == "PROMOTE_UQ_BAND"]
    under = [c["cell"] for c in out if c["label"] != "PROMOTE_UQ_BAND"]
    return {
        "status": "ok",
        "source": str(GAMES.name),
        "method": (
            "Split 60/40; residual vs +spread_line (home margin) and total_line; "
            "Mondrian cells roof/wind/rest; fail-closed +Inf qhat when k>n; "
            "K3 product bands stay No-band regardless."
        ),
        "kill_line": "Promote a cell only if OOT coverage >=0.85 on n_te>=20; else No-band / research.",
        "cells": out,
        "promoted_cells": promote,
        "not_promoted": under,
        "k3_product_label": "NO_BAND",
        "replacement": (
            "Weather/roof/rest residual bands as NFL margin/total UQ captions where OOT>=0.85; "
            "never confidence-as-probability; never depth ranking."
        ),
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }


def main():
    a = ranking_shadow()
    b = rest_weather_k3()
    write_report(OUT_SHADOW, a)
    write_report(OUT_REST, b)
    print("ranking winner", a.get("winner_by_top_decile_hit_n100"))
    for arm in a.get("arms") or []:
        if isinstance(arm, dict):
            print(" ", arm.get("label"), "n", arm.get("n"), "top", arm.get("top_decile_hit"),
                  "spread", arm.get("spread_top_minus_bottom"))
    print("rest_weather promoted", b.get("promoted_cells"))
    print("rest_weather not_promoted", len(b.get("not_promoted") or []))
    for c in (b.get("cells") or [])[:8]:
        print(" ", c["cell"], "n", c["n"], "cov", c["oot_coverage_90"], c["label"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
