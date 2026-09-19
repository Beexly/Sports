#!/usr/bin/env python3
"""NCAAF MONEYLINE bookmakerCount=0 — evaluate pre-registered kill lines K1–K5.

Kill lines live in NCAAF_ML_ZERO_BOOK_TEST_2026-09-18.md — do not move them here.
Default verdict is H_artifact unless K1–K4 all pass.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import sys
from pathlib import Path
from statistics import mean
from datetime import datetime

sys.path.insert(0, str(Path(__file__).resolve().parent))
from stats_json import dumps_report, write_report  # noqa: E402
from sport_resolve import resolve_sport  # noqa: E402


def wilson(p: float, n: int, z: float = 1.96):
    if n <= 0:
        return (None, None)
    denom = 1 + z * z / n
    center = (p + z * z / (2 * n)) / denom
    half = (z * math.sqrt((p * (1 - p) + z * z / (4 * n)) / n)) / denom
    return (max(0.0, center - half), min(1.0, center + half))


def fnum(x):
    try:
        if x is None or x == "":
            return None
        v = float(x)
        return v if math.isfinite(v) else None
    except Exception:
        return None


def load(path: Path):
    if path.suffix.lower() == ".csv":
        return list(csv.DictReader(path.read_text(encoding="utf-8").splitlines()))
    out = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line:
            out.append(json.loads(line))
    return out


def coerce(raw):
    if str(raw.get("isBootstrap", "false")).lower() in {"true", "1"}:
        return None
    if str(raw.get("isPublished", "true")).lower() in {"false", "0"}:
        return None
    if str(raw.get("isFounder", "false")).lower() in {"true", "1"}:
        return None
    sport = resolve_sport(raw.get("sport"), raw.get("espnEventId"), raw.get("selection"))
    if sport not in {"NCAAF", "CFB"}:
        return None
    if str(raw.get("pickType") or "").upper() != "MONEYLINE":
        return None
    bc = raw.get("bookmakerCount")
    try:
        bci = int(bc) if bc is not None and bc != "" else None
    except Exception:
        bci = None
    if bci != 0:
        return None
    gen = raw.get("generatedAt")
    kick = raw.get("commenceTime")
    try:
        g = datetime.fromisoformat(str(gen).replace("Z", "+00:00"))
        c = datetime.fromisoformat(str(kick).replace("Z", "+00:00"))
        if g >= c:
            return None
    except Exception:
        pass
    res = raw.get("result")
    if res not in {"WIN", "LOSS"}:
        return None
    y = 1 if res == "WIN" else 0
    conf = fnum(raw.get("confidence"))
    return {
        "y": y,
        "mfp": fnum(raw.get("marketFairProb")),
        "p_conf": (conf / 100.0) if conf is not None else None,
        "publicImplied": fnum(raw.get("publicMlImpliedProb")),
        "confidence": conf,
        "pickId": raw.get("pickId") or raw.get("id"),
        "espnEventId": raw.get("espnEventId"),
        "selection": raw.get("selection"),
        "signalSlate": str(raw.get("selection") or "").lower().find("model signal") >= 0
        or fnum(raw.get("line")) == 0,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    path = Path(args.input)
    if not path.exists():
        payload = {"ok": False, "status": "DATA_BLOCKED", "path": str(path)}
        write_report(Path(args.out), payload)
        print(dumps_report(payload))
        return 2
    rows = [c for c in (coerce(r) for r in load(path)) if c]
    n = len(rows)
    wins = sum(r["y"] for r in rows)
    hit = wins / n if n else None
    lo, hi = wilson(hit, n) if n else (None, None)
    null_mfp = sum(1 for r in rows if r["mfp"] is None) / n if n else None
    confs = [r["confidence"] for r in rows if r["confidence"] is not None]
    mean_conf = mean(confs) if confs else None
    implied = [r["publicImplied"] for r in rows if r["publicImplied"] is not None]
    mean_imp = mean(implied) if implied else None
    slate_share = sum(1 for r in rows if r["signalSlate"]) / n if n else None

    k1 = "NOT_RUN_no_public_implied_p"
    if hit is not None and mean_imp is not None and n:
        delta = hit - mean_imp
        # Wilson on hit; LB of (hit - implied) approximated by LB(hit) - implied
        lb_delta = (lo - mean_imp) if lo is not None else None
        if delta < 0.03 or (lb_delta is not None and lb_delta <= 0):
            k1 = "KILLED_H_edge_gap_or_LB"
        else:
            k1 = "SURVIVES_K1_needs_replication_window"

    k2 = "NOT_RUN"
    if n:
        if (null_mfp or 0) >= 0.80 and (mean_conf or 0) >= 75:
            k2 = "K2_selection_signature_present"
        else:
            k2 = "K2_signature_absent_or_partial"

    report = {
        "ok": n > 0,
        "cohort": "NCAAF MONEYLINE bookmakerCount=0 pre-game decided",
        "n": n,
        "wins": wins,
        "hit_rate": hit,
        "hit_wilson95": [lo, hi],
        "null_marketFairProb_share": null_mfp,
        "mean_confidence": mean_conf,
        "signal_slate_share": slate_share,
        "n_with_public_implied": len(implied),
        "mean_public_implied": mean_imp,
        "kill_lines": {
            "K1_edge_vs_market": k1,
            "K2_selection_composition": k2,
            "K3_ground_truth": "NOT_RUN_need_espn_regrade",
            "K4_replication": "NOT_RUN_need_second_window",
            "K5_public_copy": "Must show n + 0-book lane label if any rate is published",
        },
        "default_verdict": (
            "H_edge_requires_K1_K4_pass"
            if k1.startswith("SURVIVES")
            else "H_artifact_default"
        ),
        "warning": "High ML win rate is not edge without price. Placeability: fairProb>=0.58 favorite selection.",
    }
    if n == 0:
        report["status"] = "EMPTY_COHORT_or_filters"
        report["ok"] = False
    out = Path(args.out)
    write_report(out, report)
    print(dumps_report({"ok": report["ok"], "out": str(out), "n": n, "hit": hit, "k1": k1, "verdict": report["default_verdict"]}))
    return 0 if n else 2


if __name__ == "__main__":
    raise SystemExit(main())
