#!/usr/bin/env python3
"""ML market-disagreement flag + totals e-process sketch (innovation pass).

Replaces "filter until ML wins" with honest gate logic + sequential skill test on totals.
No gate/env flips — analysis artifacts only.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path
from statistics import mean

sys.path.insert(0, str(Path(__file__).resolve().parent))
from stats_json import dumps_report, write_report  # noqa: E402


def wilson(p, n, z=1.96):
    if n <= 0:
        return [None, None]
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt((p * (1 - p) + z * z / (4 * n)) / n) / d
    return [max(0.0, c - h), min(1.0, c + h)]


def fnum(x):
    try:
        if x is None or x == "":
            return None
        v = float(x)
        return v if math.isfinite(v) else None
    except Exception:
        return None


def p_model(r):
    itp = fnum(r.get("independentTrueProb"))
    if itp is not None and 0 < itp < 1:
        return itp
    rp = fnum(r.get("rankingP"))
    if rp is not None and 0 < rp < 1:
        return rp
    conf = fnum(r.get("confidence"))
    return conf / 100.0 if conf is not None else None


def clv_np(rows):
    sub = [r for r in rows if r.get("clvVerdict") in ("BEAT_CLOSE", "LOST_TO_CLOSE")]
    if not sub:
        return {"n": 0, "rate": None, "wilson95": [None, None]}
    beat = sum(1 for r in sub if r.get("clvVerdict") == "BEAT_CLOSE")
    p = beat / len(sub)
    return {"n": len(sub), "beat": beat, "rate": p, "wilson95": wilson(p, len(sub))}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    path = Path(args.input)
    if not path.exists():
        write_report(Path(args.out), {"ok": False, "status": "DATA_BLOCKED"})
        return 2
    rows = [json.loads(l) for l in path.read_text(encoding="utf-8").splitlines() if l.strip()]
    graded = [r for r in rows if r.get("clvVerdict") in ("BEAT_CLOSE", "MATCHED_CLOSE", "LOST_TO_CLOSE")]
    for r in graded:
        r["_pm"] = p_model(r)
        r["_mfp"] = fnum(r.get("marketFairProb"))
        r["_pt"] = str(r.get("pickType") or "").upper()

    ml = [r for r in graded if r["_pt"] == "MONEYLINE"]
    agree = [r for r in ml if r["_pm"] is not None and r["_mfp"] is not None and r["_pm"] >= r["_mfp"]]
    disagree = [r for r in ml if r["_pm"] is not None and r["_mfp"] is not None and r["_pm"] < r["_mfp"]]
    no_mfp = [r for r in ml if r["_mfp"] is None]

    # Totals sequential "skill" vs 52.4% coin/vig — simple e-process style product log
    # O_t = 1 if BEAT else 0 on non-push; wealth vs fair coin at p0=0.524
    p0 = 0.524
    totals = [r for r in graded if r["_pt"] == "TOTAL" and r.get("clvVerdict") in ("BEAT_CLOSE", "LOST_TO_CLOSE")]
    # chronological
    def ts(r):
        try:
            from datetime import datetime

            return datetime.fromisoformat(str(r.get("settledAt") or r.get("commenceTime") or "1970-01-01").replace("Z", "+00:00")).timestamp()
        except Exception:
            return 0

    totals.sort(key=ts)
    wealth = 1.0
    path_w = [1.0]
    hits = 0
    for r in totals:
        hit = 1 if r.get("clvVerdict") == "BEAT_CLOSE" else 0
        hits += hit
        # beta-binomial style e-factor for p0 vs evidence — simple likelihood ratio on Bernoulli
        # Using constant bet fraction 0.05 Kelly-like on log wealth for diagnostic only
        f = 0.05
        if hit:
            wealth *= 1 + f * (1 / max(p0, 1e-6) - 1) * p0  # rough
        else:
            wealth *= 1 - f
        path_w.append(wealth)

    tot_np = clv_np(totals)
    ml_agree_np = clv_np(agree)
    ml_disagree_np = clv_np(disagree)
    ml_all_np = clv_np(ml)

    report = {
        "ok": True,
        "n_graded": len(graded),
        "moneyline": {
            "n_graded": len(ml),
            "non_push_all": ml_all_np,
            "market_agree_pm_ge_mfp": {**ml_agree_np, "n_graded": len(agree)},
            "market_disagree_pm_lt_mfp": {**ml_disagree_np, "n_graded": len(disagree)},
            "n_no_market_p": len(no_mfp),
            "gate_rule_replacement": (
                "FLAG market_disagrees when p_model < marketFairProb; "
                "do not claim beat-close on ML; show both probabilities (L10)"
            ),
        },
        "totals_eprocess_sketch": {
            "n_non_push": tot_np.get("n"),
            "beat_close_rate": tot_np.get("rate"),
            "wilson95": tot_np.get("wilson95"),
            "p0_break_even": p0,
            "diagnostic_wealth_path_end": wealth,
            "note": (
                "Illustrative constant-fraction path vs p0 — NOT a valid Ville e-process "
                "until likelihood ratio is specified under a pre-registered null. "
                "Keep as diagnostic; formal e-process is next research item."
            ),
        },
        "product_replacement": {
            "lead_with": "Totals + deep-books strata for CLV/performance copy",
            "withhold": "ML beat-close claims until true edge column + n>=100 non-push on kept filter",
            "never": "Blend ML into headline win/CLV rate without price context",
        },
    }
    write_report(Path(args.out), report)
    print(
        dumps_report(
            {
                "ok": True,
                "out": str(args.out),
                "ml_all": ml_all_np,
                "ml_agree": ml_agree_np,
                "ml_disagree": ml_disagree_np,
                "totals": tot_np,
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
