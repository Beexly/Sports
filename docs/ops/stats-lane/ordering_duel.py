#!/usr/bin/env python3
"""Pre-registered ordering duel on sample P (version-fixed dual scores).

Stratify MONEYLINE / SPREAD / TOTAL. Intervals per ordering; overlap => say overlap.
Dumb baseline O4 = generatedAt time order (earliest = worse board position proxy) 
OR seeded shuffle — report both labeled.

Kill lines from PRE-REG-ordering-comparison YAML.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import random
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from statistics import mean

VERSIONS_P = {f"v5.2.{i}" for i in range(2, 8)}


def parse_iso(s):
    try:
        return datetime.fromisoformat(str(s).replace("Z", "+00:00"))
    except Exception:
        return None


def wilson(p: float, n: int, z: float = 1.96):
    if n <= 0:
        return (None, None)
    denom = 1 + z * z / n
    center = (p + z * z / (2 * n)) / denom
    half = (z * math.sqrt((p * (1 - p) + z * z / (4 * n)) / n)) / denom
    return (max(0.0, center - half), min(1.0, center + half))


def load(path: Path):
    rows = []
    if path.suffix.lower() == ".csv":
        rows = list(csv.DictReader(path.read_text(encoding="utf-8").splitlines()))
    else:
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def fnum(x):
    try:
        if x is None or x == "":
            return None
        v = float(x)
        return v if math.isfinite(v) else None
    except Exception:
        return None


def coerce(raw):
    if str(raw.get("isBootstrap", "false")).lower() in {"true", "1"}:
        return None
    if str(raw.get("isPublished", "true")).lower() in {"false", "0"}:
        return None
    if str(raw.get("isFounder", "false")).lower() in {"true", "1"}:
        return None
    res = raw.get("result")
    if res not in {"WIN", "LOSS"}:
        return None
    y = 1 if res == "WIN" else 0
    mv = str(raw.get("modelVersion") or "")
    if mv not in VERSIONS_P:
        return None
    gen = parse_iso(raw.get("generatedAt"))
    kick = parse_iso(raw.get("commenceTime"))
    if gen and kick and gen >= kick:
        return None  # pre-game only
    conf = fnum(raw.get("confidence"))
    rank = fnum(raw.get("rankingP"))
    mfp = fnum(raw.get("marketFairProb"))
    if conf is None or not (0 < conf < 100):
        return None
    if rank is None or not (0 < rank < 1):
        return None
    if mfp is None or not (0 < mfp < 1):
        return None
    return {
        "y": y,
        "conf_p": conf / 100.0,
        "rankingP": rank,
        "marketFairProb": mfp,
        "pickType": str(raw.get("pickType") or "UNK").upper(),
        "sport": str(raw.get("sport") or "UNK").upper(),
        "gen_ts": gen.timestamp() if gen else 0.0,
        "bookmakerCount": fnum(raw.get("bookmakerCount")),
        "rankingSource": raw.get("rankingSource"),
        "pickId": raw.get("pickId") or raw.get("id"),
    }


def decile_stats(rows, score_key):
    scored = sorted(rows, key=lambda r: r[score_key])
    n = len(scored)
    if n < 20:
        return {"n": n, "deciles": [], "inversions": None, "top_decile_hit": None, "top_wilson": [None, None], "kendall_note": "n<20"}
    k = max(2, min(10, n // 10))
    # equal-count bins
    bins = []
    inversions = 0
    prev_rate = None
    for i in range(k):
        a = i * n // k
        b = (i + 1) * n // k
        chunk = scored[a:b]
        if not chunk:
            continue
        rate = sum(r["y"] for r in chunk) / len(chunk)
        mean_s = mean(r[score_key] for r in chunk)
        bins.append({"bin": i, "n": len(chunk), "mean_score": mean_s, "hit": rate})
        if prev_rate is not None and rate < prev_rate - 1e-12:
            inversions += 1
        prev_rate = rate
    top = bins[-1] if bins else None
    lo, hi = wilson(top["hit"], top["n"]) if top else (None, None)
    # crude rank correlation: fraction of concordant pairs sample
    sample = rows if n <= 400 else random.Random(0).sample(rows, 400)
    conc = disc = 0
    for i in range(len(sample)):
        for j in range(i + 1, len(sample)):
            ds = sample[i][score_key] - sample[j][score_key]
            dy = sample[i]["y"] - sample[j]["y"]
            if ds == 0 or dy == 0:
                continue
            if ds * dy > 0:
                conc += 1
            else:
                disc += 1
    tau = (conc - disc) / (conc + disc) if (conc + disc) else None
    base = sum(r["y"] for r in rows) / n
    return {
        "n": n,
        "deciles": bins,
        "inversions": inversions,
        "hit_base": base,
        "top_decile_hit": top["hit"] if top else None,
        "top_decile_n": top["n"] if top else None,
        "top_wilson95": [lo, hi],
        "kendall_like_tau": tau,
    }


def brier(rows, key):
    if not rows:
        return None
    # map score to [0,1] already for rankingP/mfp; conf_p too
    return mean((r[key] - r["y"]) ** 2 for r in rows)


def intervals_overlap(a, b):
    if a[0] is None or b[0] is None or a[1] is None or b[1] is None:
        return True
    return not (a[1] < b[0] or b[1] < a[0])


def evaluate_stratum(rows, label):
    if len(rows) < 30:
        return {"stratum": label, "n": len(rows), "status": "UNDERPOWERED_n<30"}
    orderings = {
        "O1_confidence": "conf_p",
        "O2_rankingP": "rankingP",
        "O3_marketFairProb": "marketFairProb",
    }
    out = {"stratum": label, "n": len(rows), "orderings": {}}
    for name, key in orderings.items():
        st = decile_stats(rows, key)
        st["brier"] = brier(rows, key)
        out["orderings"][name] = st
    # O4 time order: sort by gen_ts ascending = chronological "board" order
    by_time = sorted(rows, key=lambda r: r["gen_ts"])
    # top decile = most recent
    n = len(by_time)
    top = by_time[int(n * 0.9) :]
    rate = sum(r["y"] for r in top) / len(top) if top else None
    lo, hi = wilson(rate, len(top)) if top else (None, None)
    out["orderings"]["O4_time_recent_top"] = {
        "n": n,
        "top_decile_hit": rate,
        "top_decile_n": len(top),
        "top_wilson95": [lo, hi],
        "brier_null": None,
        "note": "dumb baseline — recent rows top; not a skill ordering",
    }
    rng = random.Random(20260918)
    shuf = rows[:]
    rng.shuffle(shuf)
    st_sh = decile_stats(shuf, "conf_p")  # score ignored after shuffle — use random rank via index
    # proper shuffle baseline: random score
    for r in shuf:
        r["_rand"] = rng.random()
    st_r = decile_stats(shuf, "_rand")
    out["orderings"]["O4_shuffle"] = st_r
    # kill-line style comparisons
    o1 = out["orderings"]["O1_confidence"]
    o2 = out["orderings"]["O2_rankingP"]
    o3 = out["orderings"]["O3_marketFairProb"]
    out["kill_lines"] = {
        "K_monotone": {
            "prediction": "O2 inversions < O1 inversions",
            "o1_inversions": o1.get("inversions"),
            "o2_inversions": o2.get("inversions"),
            "result": (
                "NOT_RUN"
                if o1.get("inversions") is None or o2.get("inversions") is None
                else ("SURVIVES" if o2["inversions"] < o1["inversions"] else "KILLED")
            ),
        },
        "K_top_interval": {
            "prediction": "O2 top-decile Wilson does not overlap O1 — else product claim killed",
            "o1_top_wilson": o1.get("top_wilson95"),
            "o2_top_wilson": o2.get("top_wilson95"),
            "o1_top_hit": o1.get("top_decile_hit"),
            "o2_top_hit": o2.get("top_decile_hit"),
            "overlap": intervals_overlap(o1.get("top_wilson95") or (None, None), o2.get("top_wilson95") or (None, None)),
            "result": (
                "INTERVALS_OVERLAP_product_claim_killed"
                if intervals_overlap(o1.get("top_wilson95") or (None, None), o2.get("top_wilson95") or (None, None))
                else "INTERVALS_SEPARATE"
            ),
        },
        "K_beat_market_brier": {
            "prediction": "O1 or O2 decile/score Brier better than O3",
            "brier_O1": o1.get("brier"),
            "brier_O2": o2.get("brier"),
            "brier_O3": o3.get("brier"),
            "result": (
                "NOT_RUN"
                if None in (o1.get("brier"), o2.get("brier"), o3.get("brier"))
                else (
                    "MODEL_BEATS_MARKET"
                    if min(o1["brier"], o2["brier"]) < o3["brier"] - 1e-6
                    else "MARKET_WINS_or_TIE"
                )
            ),
        },
    }
    # interval overlap summary across O1-O3 top deciles
    tops = {
        k: out["orderings"][k].get("top_wilson95")
        for k in ("O1_confidence", "O2_rankingP", "O3_marketFairProb")
    }
    out["top_decile_intervals"] = tops
    out["report_rule"] = "If intervals overlap, say THEY OVERLAP — do not name a winner."
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    path = Path(args.input)
    if not path.exists():
        print(json.dumps({"ok": False, "status": "DATA_BLOCKED", "path": str(path), "need": "sample P export"}))
        return 2
    rows = [c for c in (coerce(r) for r in load(path)) if c]
    if not rows:
        print(json.dumps({"ok": False, "status": "EMPTY_SAMPLE_P", "path": str(path)}))
        return 2
    by_pt = defaultdict(list)
    for r in rows:
        by_pt[r["pickType"]].append(r)
    report = {
        "ok": True,
        "sample_P_n": len(rows),
        "input": str(path),
        "pre_reg": "docs/ops/stats-lane PRE-REG ordering + spec S2.3",
        "warning": "Totals rankingP may be confidence-echo — interpret TOTAL stratum separately.",
        "strata": {},
        "pooled_note": "Pooled winner call NOT published; stratified only.",
    }
    for pt, sub in sorted(by_pt.items(), key=lambda kv: -len(kv[1])):
        report["strata"][pt] = evaluate_stratum(sub, pt)
    # optional all-market diagnostic
    report["strata"]["ALL_markets_diagnostic_only"] = evaluate_stratum(rows, "ALL")
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({"ok": True, "out": str(out), "n": len(rows), "strata": list(report["strata"].keys())}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
