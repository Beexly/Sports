#!/usr/bin/env python3
"""v5.3.0 L11 scorecard harness (Mimo overnight) — measurement only.

Law 11: no MODEL_VERSION bump without PICKS-H1 scorecard where candidate
beats market-anchored baseline. This harness PRODUCES the scorecard draft
from board-export settled rows. It never bumps MODEL_VERSION.

Baselines (locked):
  - market ML Brier 0.211 n=5051 (nflverse, Law 11)
  - marketFairProb as board public p when books priced
"""

from __future__ import annotations

import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from stats_json import write_report

EXPORT = Path("docs/ops/stats-lane/incoming/board-export.jsonl")
OUT = Path("docs/ops/stats-lane/out/v530_l11_scorecard_draft.json")
LAW11_ML_BRIER = 0.211


def fnum(x):
    try:
        if x is None or x == "":
            return None
        v = float(x)
        return v if math.isfinite(v) else None
    except Exception:
        return None


def wilson(w, n, z=1.96):
    if n <= 0:
        return (None, None)
    p = w / n
    d = 1 + z * z / n
    c = p + z * z / (2 * n)
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))
    return ((c - h) / d, (c + h) / d)


def score_arm(rows, key_fn, label):
    pts = []
    for r in rows:
        p = key_fn(r)
        if p is None:
            continue
        if r.get("result") not in ("WIN", "LOSS"):
            continue
        try:
            p = float(p)
        except Exception:
            continue
        if not (0.0 <= p <= 1.0):
            continue
        pts.append((min(max(p, 1e-6), 1 - 1e-6), 1 if r.get("result") == "WIN" else 0))
    if len(pts) < 30:
        return {"label": label, "n": len(pts), "status": "UNDERPOWERED", "brier": None}
    brier = sum((p - y) ** 2 for p, y in pts) / len(pts)
    hit = sum(y for _, y in pts) / len(pts)
    mean_p = sum(p for p, _ in pts) / len(pts)
    base = hit
    # realised bits
    def H(q):
        q = min(max(q, 1e-6), 1 - 1e-6)
        return -(q * math.log2(q) + (1 - q) * math.log2(1 - q))
    ce = sum(-(y * math.log2(p) + (1 - y) * math.log2(1 - p)) for p, y in pts) / len(pts)
    bits = H(base) - ce
    # ECE 10 bins
    bins = [[] for _ in range(10)]
    for p, y in pts:
        bins[min(9, int(p * 10))].append((p, y))
    ece = 0.0
    for b in bins:
        if not b:
            continue
        ece += (len(b) / len(pts)) * abs(sum(y for _, y in b) / len(b) - sum(p for p, _ in b) / len(b))
    return {
        "label": label,
        "n": len(pts),
        "status": "ok",
        "brier": brier,
        "mean_p": mean_p,
        "hit_rate": hit,
        "realised_bits": bits,
        "ece_10bin": ece,
        "hit_wilson95": wilson(sum(y for _, y in pts), len(pts)),
    }


def main() -> int:
    if not EXPORT.exists():
        write_report(OUT, {"ok": False, "status": "DATA_BLOCKED"})
        return 2
    rows = [json.loads(line) for line in EXPORT.open(encoding="utf-8")]
    settled = [r for r in rows if r.get("result") in ("WIN", "LOSS")]

    def conf100(r):
        c = fnum(r.get("confidence"))
        return (c / 100.0) if c is not None else None

    def mfp(r):
        return fnum(r.get("marketFairProb"))

    def rp(r):
        return fnum(r.get("rankingP"))

    def indep(r):
        return fnum(r.get("independentTrueProb"))

    def cand_refit_key(r):
        """v5.3.0 design ranking key: mfp else independent else rankingP (not conf)."""
        x = mfp(r)
        if x is not None:
            return x
        x = indep(r)
        if x is not None:
            return x
        return rp(r)

    arms = [
        score_arm(settled, mfp, "marketFairProb"),
        score_arm(settled, conf100, "confidence_100_ORDINAL"),
        score_arm(settled, rp, "rankingP"),
        score_arm(settled, indep, "independentTrueProb"),
        score_arm(settled, cand_refit_key, "v530_candidate_mfp_else_indep_else_rp"),
    ]
    by_pt = {}
    for pt in ("TOTAL", "SPREAD", "MONEYLINE"):
        sub = [r for r in settled if r.get("pickType") == pt]
        by_pt[pt] = [
            score_arm(sub, mfp, f"{pt}:mfp"),
            score_arm(sub, conf100, f"{pt}:conf"),
            score_arm(sub, cand_refit_key, f"{pt}:v530_cand"),
        ]

    mfp_arm = next(a for a in arms if a["label"] == "marketFairProb")
    conf_arm = next(a for a in arms if a["label"] == "confidence_100_ORDINAL")
    cand_arm = next(a for a in arms if a["label"].startswith("v530_candidate"))

    # L11 keep rule on THIS export (NOT PICKS-H1 frozen holdout — labeled)
    paired = []
    for r in settled:
        p1, p2, y = mfp(r), conf100(r), (1 if r.get("result") == "WIN" else 0)
        if p1 is None or p2 is None:
            continue
        paired.append((p1, p2, y))
    if paired:
        b_m = sum((a - y) ** 2 for a, _, y in paired) / len(paired)
        b_c = sum((c - y) ** 2 for _, c, y in paired) / len(paired)
        b_v = sum(
            (cand_refit_key(r) - (1 if r.get("result") == "WIN" else 0)) ** 2
            for r in settled
            if cand_refit_key(r) is not None
        ) / max(1, sum(1 for r in settled if cand_refit_key(r) is not None))
    else:
        b_m = b_c = None

    report = {
        "ok": True,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "model_version_frozen": "v5.2.7",
        "l11_status": "DRAFT_SCORECARD_ONLY — NOT a bump; PICKS-H1 frozen holdout still required",
        "law11_baseline_market_ml_brier": LAW11_ML_BRIER,
        "law11_note": (
            "Engine ML claims need as-of Brier <= 0.211-0.002 on n>=272 vs market ML. "
            "This export is book-path board, not a substitute for PICKS-H1."
        ),
        "arms": arms,
        "by_pickType": by_pt,
        "paired_brier_mfp_vs_conf_n": len(paired),
        "paired_brier_marketFairProb": b_m,
        "paired_brier_confidence": b_c,
        "delta_conf_minus_mfp": (b_c - b_m) if (b_m is not None and b_c is not None) else None,
        "v530_candidate_note": (
            "Candidate public key = marketFairProb else independentTrueProb else rankingP. "
            "Confidence display-only. consensus/depth weight 0."
        ),
        "keep_rule_for_founder": (
            "Bump MODEL_VERSION only if v5.3.0 candidate beats market-anchored baseline on "
            "PICKS-H1 scorecard with run_sha + factors YAML order gate. Export draft is evidence, not authorization."
        ),
        "positive_path": (
            "Ship display/rank on marketFairProb when books>=2 (withhold-only / display path exempt "
            "from bump). Founder MODEL_VERSION for weight zeros in scoring.ts."
        ),
    }
    write_report(OUT, report)
    for a in arms:
        print(
            a["label"],
            "n",
            a.get("n"),
            "brier",
            a.get("brier"),
            "bits",
            a.get("realised_bits"),
            "ece",
            a.get("ece_10bin"),
        )
    print("paired mfp", b_m, "conf", b_c, "delta", report["delta_conf_minus_mfp"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
