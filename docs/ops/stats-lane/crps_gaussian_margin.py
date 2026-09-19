#!/usr/bin/env python3
"""Gaussian CRPS closed form — replacement for Brier/MAE on continuous margins.

Blueprint kill line (pre-registered): density model must beat widened-Gaussian
baseline CRPS by <0.01 on n>=150 settled spreads before live execution —
i.e. KEEP density only if CRPS_density < CRPS_baseline - 0.01.

CRPS for N(μ,σ²) at observation y (Gneiting & Raftery):
  z = (y-μ)/σ
  CRPS = σ * [ z*(2Φ(z)-1) + 2φ(z) - 1/√π ]
"""

from __future__ import annotations

import math
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from stats_json import dumps_report, write_report  # noqa: E402

SQRT_PI = math.sqrt(math.pi)


def norm_cdf(z: float) -> float:
    return 0.5 * (1.0 + math.erf(z / math.sqrt(2.0)))


def norm_pdf(z: float) -> float:
    return math.exp(-0.5 * z * z) / math.sqrt(2.0 * math.pi)


def gaussian_crps(mu: float, sigma: float, y: float) -> float:
    if not math.isfinite(mu) or not math.isfinite(y) or not math.isfinite(sigma) or sigma <= 0:
        return float("nan")
    z = (y - mu) / sigma
    return sigma * (z * (2 * norm_cdf(z) - 1) + 2 * norm_pdf(z) - 1 / SQRT_PI)


def mean_crps(pairs: list[tuple[float, float, float]]) -> float | None:
    vals = [gaussian_crps(mu, sigma, y) for mu, sigma, y in pairs]
    vals = [v for v in vals if math.isfinite(v)]
    return sum(vals) / len(vals) if vals else None


def main() -> int:
    import argparse

    ap = argparse.ArgumentParser()
    ap.add_argument("--actuals", required=True, help="JSONL with actualMargin and predictedMeanMargin (or line)")
    ap.add_argument("--out", required=True)
    ap.add_argument(
        "--sigma-source",
        default="residual_std",
        help="residual_std | sport_residual_std (widened Gaussian baseline)",
    )
    args = ap.parse_args()
    import json
    from collections import defaultdict
    from statistics import mean, pstdev

    path = Path(args.actuals)
    if not path.exists():
        write_report(
            Path(args.out),
            {"ok": False, "status": "DATA_BLOCKED", "need": str(path)},
        )
        return 2
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        rec = json.loads(line)
        y = rec.get("actualMargin")
        if y is None:
            hs, aw = rec.get("homeScore"), rec.get("awayScore")
            if hs is not None and aw is not None:
                y = float(hs) - float(aw)
        mu = rec.get("predictedMeanMargin")
        if mu is None and rec.get("pickType") == "SPREAD" and rec.get("line") is not None:
            mu = -float(rec["line"])
        if y is None or mu is None:
            continue
        sport = str(rec.get("sport") or "UNK")
        rows.append({"y": float(y), "mu": float(mu), "sport": sport})

    if len(rows) < 30:
        write_report(
            Path(args.out),
            {"ok": False, "status": "THIN_n", "n": len(rows), "min_n": 150},
        )
        return 2

    residuals = [r["y"] - r["mu"] for r in rows]
    sigma_pool = pstdev(residuals) if len(residuals) > 1 else 0.0
    by_sport = defaultdict(list)
    for r in rows:
        by_sport[r["sport"]].append(r["y"] - r["mu"])
    sigma_by_sport = {
        sp: (pstdev(v) if len(v) > 1 else sigma_pool) for sp, v in by_sport.items()
    }

    # Point-estimate CRPS proxy: treat point forecast as degenerate — use MAE comparison too
    mae = mean(abs(r) for r in residuals)
    if args.sigma_source == "sport_residual_std":
        pairs = [(r["mu"], max(sigma_by_sport.get(r["sport"], sigma_pool), 1e-6), r["y"]) for r in rows]
    else:
        pairs = [(r["mu"], max(sigma_pool, 1e-6), r["y"]) for r in rows]
    crps_base = mean_crps(pairs)

    # Naive coin/mean baseline density: N(mean_y, sigma_pool)
    mean_y = mean(r["y"] for r in rows)
    crps_mean = mean_crps([(mean_y, max(sigma_pool, 1e-6), r["y"]) for r in rows])

    # CRPS by sport / books bucket (R2 research)
    from collections import Counter

    def crps_group(pred_fn, label):
        buckets = defaultdict(list)
        for r in rows:
            buckets[pred_fn(r)].append(r)
        out = []
        for k, sub in sorted(buckets.items(), key=lambda kv: -len(kv[1])):
            if len(sub) < 30:
                out.append({"group": k, "n": len(sub), "crps": None, "status": "THIN_n<30"})
                continue
            if args.sigma_source == "sport_residual_std":
                sig = max(sigma_by_sport.get(sub[0]["sport"], sigma_pool), 1e-6)
            else:
                sig = max(sigma_pool, 1e-6)
            # per-group sigma option
            res = [r["y"] - r["mu"] for r in sub]
            sig_g = max(pstdev(res), 1e-6) if len(res) > 1 else sig
            crps_g = mean_crps([(r["mu"], sig_g, r["y"]) for r in sub])
            out.append(
                {
                    "group": k,
                    "n": len(sub),
                    "sigma_group": sig_g,
                    "crps": crps_g,
                    "mae": mean(abs(x) for x in res),
                    "status": "ok",
                }
            )
        return {"axis": label, "groups": out}

    report = {
        "ok": True,
        "n": len(rows),
        "sigma_source": args.sigma_source,
        "sigma_pool": sigma_pool,
        "sigma_by_sport": sigma_by_sport,
        "mae_point": mae,
        "crps_widened_gaussian_on_model_mu": crps_base,
        "crps_mean_y_gaussian": crps_mean,
        "crps_by_sport": crps_group(lambda r: r["sport"], "sport"),
        "kill_line": "Advance density model only if CRPS < crps_widened_gaussian_on_model_mu - 0.01 on n>=150",
        "status": "BASELINE_PLUS_STRATIFIED",
        "note": "Replacement for Brier/MAE on continuous margins (blueprint Rung 2).",
        "attribution": "Gaussian CRPS closed form; nflverse-style residuals if export joined",
    }
    write_report(Path(args.out), report)
    print(dumps_report({"ok": True, "out": str(args.out), "n": len(rows), "crps_base": crps_base, "mae": mae}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
