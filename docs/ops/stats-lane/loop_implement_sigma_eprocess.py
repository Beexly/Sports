#!/usr/bin/env python3
"""Loop 07:39Z — season sigma ladder + totals e-process refresh + hex32 residual list.

Fleet referee asked: early-season margin variance Weeks 1-4 vs late 5-18.
Mimo measures on owned nflverse games.csv (sign: +spread_line = home favored).
No gate flips. No fabricated rates.
"""

from __future__ import annotations

import csv
import json
import math
import subprocess
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from statistics import mean, pstdev

sys.path.insert(0, str(Path(__file__).resolve().parent))
from stats_json import write_report

HERE = Path(__file__).resolve().parent
GAMES = Path(r"C:\Users\Garrett\nfl_ot\games.csv")
EXPORT = HERE / "incoming" / "board-export.jsonl"
HEX = HERE / "out" / "resolved_game_ids_v3.json"
OUT = HERE / "out" / "loop_implement_0739_sigma_eprocess.json"


def fnum(x):
    try:
        if x is None or x == "":
            return None
        v = float(x)
        return v if math.isfinite(v) else None
    except Exception:
        return None


def sigma_ladder():
    if not GAMES.exists():
        return {"status": "DATA_BLOCKED"}
    buckets = defaultdict(list)
    cover = defaultdict(lambda: {"home": 0, "n": 0})
    for rec in csv.DictReader(GAMES.open(encoding="utf-8")):
        if (rec.get("game_type") or "REG") != "REG":
            continue
        hs, aw = fnum(rec.get("home_score")), fnum(rec.get("away_score"))
        sp = fnum(rec.get("spread_line"))
        wk = fnum(rec.get("week"))
        if hs is None or aw is None or wk is None:
            continue
        margin = hs - aw
        label = "weeks_1_4" if wk <= 4 else "weeks_5_18" if wk >= 5 else "other"
        buckets[label].append(margin)
        if sp is not None:
            # cover: home margin vs +spread (positive = home favored)
            if abs(margin - sp) < 0.01:
                continue  # push
            cover[label]["n"] += 1
            if margin > sp:
                cover[label]["home"] += 1
    out = []
    for k, arr in sorted(buckets.items()):
        if len(arr) < 30:
            continue
        sd = pstdev(arr)
        out.append(
            {
                "bucket": k,
                "n": len(arr),
                "mean_margin_home": mean(arr),
                "sigma_margin": sd,
                "variance_margin": sd * sd,
                "home_cover_rate_ex_push": (cover[k]["home"] / cover[k]["n"]) if cover[k]["n"] else None,
                "n_cover": cover[k]["n"],
            }
        )
    # fleet claim to check
    e = next((x for x in out if x["bucket"] == "weeks_1_4"), None)
    l = next((x for x in out if x["bucket"] == "weeks_5_18"), None)
    return {
        "status": "ok",
        "source": str(GAMES.name),
        "method": "Home margin SD by week bands on REG games; cover uses +spread_line",
        "buckets": out,
        "fleet_claim_external": {
            "weeks_1_4_sigma": 13.8,
            "weeks_5_18_sigma": 13.2,
            "note": "Opus referee claim — compare to observed; do not publish as Mimo OBS without this table",
        },
        "mimo_observed_sigma_early": e["sigma_margin"] if e else None,
        "mimo_observed_sigma_late": l["sigma_margin"] if l else None,
        "kill_line": (
            "Do not use a single global sigma for Phi(spread/sigma) product claims if early/late "
            "sigma differ by >0.5 pts; stratify UQ captions by week band. Market remains ranking authority."
        ),
        "positive_path": (
            "Week-band residual UQ captions (like rest/weather); never invent September edge from "
            "small-sample sigma. Phi conversion diagnostics only — public p stays marketFairProb."
        ),
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }


def totals_eprocess_refresh():
    script = HERE / "totals_eprocess_sweep.py"
    if not script.exists() or not EXPORT.exists():
        return {"status": "DATA_BLOCKED", "need": "totals_eprocess_sweep or export"}
    outp = HERE / "out" / "totals_eprocess_sweep.json"
    p = subprocess.run(
        [sys.executable, str(script), "--input", str(EXPORT), "--out", str(outp)],
        capture_output=True,
        text=True,
    )
    data = {}
    if outp.exists():
        try:
            data = json.loads(outp.read_text(encoding="utf-8"))
        except Exception:
            data = {}
    return {
        "status": "ok" if p.returncode == 0 else "NONZERO",
        "exit": p.returncode,
        "stdout_tail": (p.stdout or "")[-500:],
        "result": data,
        "kill_line": "Skill language only if e-process M_max >= 20 (Ville); else accumulate + shrinkage eps",
        "positive_path": "Totals-first product + density path; binary mfp bits +0.010 on n=241 TOTALS decided",
    }


def hex32_residual():
    if not HEX.exists():
        return {"status": "DATA_BLOCKED"}
    d = json.loads(HEX.read_text(encoding="utf-8"))
    # structure may vary
    unresolved = d.get("unresolved") or d.get("rows") or []
    if isinstance(unresolved, dict):
        unresolved = unresolved.get("UNRESOLVED_AFTER_RETRY") or []
    counts = d.get("statusCounts") or {}
    return {
        "status": "ok",
        "resolved": d.get("resolved"),
        "hex": d.get("hex"),
        "rate": d.get("rate"),
        "statusCounts": counts,
        "n_unresolved_after_retry": counts.get("UNRESOLVED_AFTER_RETRY", d.get("n_unresolved")),
        "ops_action": "Non-football scoreboards / remaining aliases if rate < 1.0; keep UNRESOLVED_ID visible",
    }


def main():
    a = sigma_ladder()
    b = totals_eprocess_refresh()
    c = hex32_residual()
    report = {
        "ok": True,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "A_sigma_ladder": a,
        "B_totals_eprocess": b,
        "C_hex32": c,
        "active_doctrine": [
            "marketFairProb public/rank p",
            "Law 11 market ML Brier 0.211",
            "DAVE/Elo research only",
            "PASS never mint; export v3 census incomplete",
            "CLV dual denom totals-first; no engine-wide skill",
            "consensus/depth rank weight 0 in v530 spec",
        ],
    }
    write_report(OUT, report)
    print("sigma early", a.get("mimo_observed_sigma_early"), "late", a.get("mimo_observed_sigma_late"))
    for x in a.get("buckets") or []:
        print(" ", x["bucket"], "n", x["n"], "sigma", round(x["sigma_margin"], 3) if x["sigma_margin"] else None,
              "cover", x["home_cover_rate_ex_push"])
    print("eprocess", b.get("status"), "keys", list((b.get("result") or {}).keys())[:8])
    res = b.get("result") or {}
    if "results" in res:
        print("  results", res["results"][:2] if isinstance(res["results"], list) else res["results"])
    elif "sweep" in res:
        print("  sweep", res["sweep"][:3] if isinstance(res["sweep"], list) else res["sweep"])
    print("hex32", c.get("rate"), c.get("n_unresolved_after_retry"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
