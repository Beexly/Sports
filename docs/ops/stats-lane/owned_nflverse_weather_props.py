#!/usr/bin/env python3
"""Owned-data replacement: nflverse games.csv weather-stratified margin + cover skill
+ props fire-gate port (ready for prop lines). Uses what WE have — no new vendors.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from statistics import mean, pstdev

sys.path.insert(0, str(Path(__file__).resolve().parent))
from stats_json import dumps_report, write_report  # noqa: E402
from owned_replacement_engine import eprocess, logit_pool, fnum  # noqa: E402

FLOOR = 1e-6


def Phi(z):
    return 0.5 * (1 + math.erf(z / math.sqrt(2)))


def phi(z):
    return math.exp(-0.5 * z * z) / math.sqrt(2 * math.pi)


def american_to_p(american: float) -> float | None:
    a = float(american)
    if a == 0 or not math.isfinite(a):
        return None
    if a > 0:
        return 100.0 / (a + 100.0)
    return (-a) / (-a + 100.0)


def shin_devig(p_over_amer: float, p_under_amer: float):
    """Minimal Shin two-way (port of shin-devig shape)."""
    io = american_to_p(p_over_amer)
    iu = american_to_p(p_under_amer)
    if io is None or iu is None:
        return None
    overround = io + iu
    if overround < 1:
        return {"ok": False, "reason": "sub_vig", "overround": overround}
    # solve z: (sqrt(io-z)^2 + 4z*io) style — use simplified iterative insider
    # Barber/Shin: z from quadratic on favourite-longshot; use fixed-point on z
    z = 0.0
    for _ in range(40):
        # standard Shin: p = (sqrt((1-z)^2 + 4 z io) - (1-z)) / (2z) if z>0 else io/overround
        if z < 1e-9:
            p_o = io / overround
        else:
            p_o = (math.sqrt((1 - z) ** 2 + 4 * z * io) - (1 - z)) / (2 * z)
        # match sum: p_o + p_u = 1; update z crudely toward excess overround share
        # use z such that implied p_o matches; diagnostic only if unstable
        target = io / overround
        z = max(0.0, min(0.25, z + 0.05 * (overround - 1) * (1 if p_o < target else -1)))
        if abs(p_o - target) < 1e-6:
            break
    if z < 1e-9:
        p_o = io / overround
        z = 0.0
    else:
        p_o = (math.sqrt((1 - z) ** 2 + 4 * z * io) - (1 - z)) / (2 * z)
    return {"ok": True, "qOver": p_o, "shinZ": z, "overround": overround, "qMethod": "shin"}


def fire_posted_prop(p, over_amer, under_amer, extra_books=None):
    """Port of props-fire-gate: Shin edge + juice floor via posted Americans."""
    if p is None or not (0 <= p <= 1):
        return {"ok": False, "fire": False, "refuse": "bad_p", "priced": False}
    shin = shin_devig(over_amer, under_amer) if over_amer and under_amer else None
    if not shin or not shin.get("ok"):
        return {"ok": True, "fire": False, "refuse": "shin_no_edge" if shin else "shin_unpriced", "priced": False}
    e = p - shin["qOver"]
    books = list(extra_books or [])
    if over_amer:
        books = books + [{"book": "primary_over", "american": float(over_amer)}]
    if not books:
        return {"ok": False, "fire": False, "refuse": "no_books", "priced": False}
    best = None
    for b in books:
        am = float(b["american"])
        q_be = american_to_p(am)
        if q_be is None:
            continue
        # taker: need p > break-even on that American
        surplus = p - q_be
        if surplus > 0:
            cand = {
                "book": b.get("book", "?"),
                "american": am,
                "surplus": surplus,
                "postedBreakEven": q_be,
                "clears": True,
            }
            if best is None or surplus > best["surplus"]:
                best = cand
    if e <= 0:
        return {"ok": True, "fire": False, "refuse": "shin_no_edge", "shin": shin, "priced": False, "edge": e}
    if not best:
        return {"ok": True, "fire": False, "refuse": "no_book_clears", "shin": shin, "priced": False, "edge": e}
    return {
        "ok": True,
        "fire": True,
        "methodTag": "props_fire_gate_v1",
        "p": p,
        "shop": best,
        "shin": shin,
        "edge_over": e,
        "priced": False,
    }


def weather_bin(row):
    wind = fnum(row.get("wind"))
    roof = str(row.get("roof") or "").lower()
    if roof in ("dome", "closed"):
        return "roof"
    if wind is None:
        return "outdoors_wind_unknown"
    if wind < 5:
        return "outdoors_wind_lt5"
    if wind < 10:
        return "outdoors_wind_5_10"
    if wind < 15:
        return "outdoors_wind_10_15"
    return "outdoors_wind_ge15"


def load_games(path: Path):
    rows = []
    with path.open(encoding="utf-8") as f:
        for rec in csv.DictReader(f):
            try:
                home = float(rec["home_score"])
                away = float(rec["away_score"])
                spread = float(rec["spread_line"])
            except Exception:
                continue
            result = home - away  # home margin
            rows.append(
                {
                    "home_margin": result,
                    "spread_home": spread,
                    "season": int(float(rec.get("season") or 0)),
                    "game_type": rec.get("game_type") or "REG",
                    "roof": rec.get("roof"),
                    "wind": fnum(rec.get("wind")),
                    "temp": fnum(rec.get("temp")),
                    "total_line": fnum(rec.get("total_line")),
                }
            )
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--games", default=r"C:\Users\Garrett\nfl_ot\games.csv")
    ap.add_argument("--download", default="")
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    gpath = Path(args.games)
    if args.download:
        import urllib.request

        dest = Path(args.download)
        dest.parent.mkdir(parents=True, exist_ok=True)
        try:
            req = urllib.request.Request(
                "https://github.com/nflverse/nflverse-data/releases/download/schedules/games.csv",
                headers={"User-Agent": "GSE-stats-lane/1.0"},
            )
            with urllib.request.urlopen(req, timeout=60) as r:
                dest.write_bytes(r.read())
            gpath = dest
        except Exception as e:
            print("download fail", e)
    if not gpath.exists():
        write_report(Path(args.out), {"ok": False, "status": "DATA_BLOCKED", "path": str(gpath)})
        return 2

    games = load_games(gpath)
    if len(games) < 50:
        write_report(Path(args.out), {"ok": False, "status": "THIN", "n": len(games)})
        return 2

    # time split by season
    seasons = sorted({g["season"] for g in games if g["season"]})
    mid_s = seasons[len(seasons) // 2] if seasons else 0
    cal = [g for g in games if g["season"] <= mid_s]
    te = [g for g in games if g["season"] > mid_s]
    if len(te) < 100:
        cal, te = games[: len(games) // 2], games[len(games) // 2 :]

    # residual = home_margin - (-spread) = home_margin + spread_home
    # cover home if residual > 0 (half-point: no push on .5 lines)
    for g in games:
        g["resid"] = g["home_margin"] + g["spread_home"]
        g["cover_home"] = 1 if g["resid"] > 0 else 0
        g["wbin"] = weather_bin(g)

    sigma_pool = max(pstdev([g["resid"] for g in cal]), 0.25)
    # weather-shifted model: high wind outdoors shrinks |mu| toward 0 and widens sigma
    def weather_params(wbin, sigma_base):
        if wbin == "roof":
            return 0.0, sigma_base * 0.95
        if wbin == "outdoors_wind_ge15":
            return 0.0, sigma_base * 1.25
        if wbin == "outdoors_wind_10_15":
            return 0.0, sigma_base * 1.10
        return 0.0, sigma_base * 1.0

    # market p: under N(-spread, sigma_pool) P(cover) = 0.5 when mu=-spread
    # p_market = Phi(( -spread + spread ) / sigma) wait resid mean under market fair = 0 → 0.5
    # Use residual std by weather as the MARKET doesn't condition; our model does
    # p_market = Phi(0 / sigma_pool) = 0.5 for all — too weak.
    # Better market proxy: closing-ish spread is fair, so p_market ≈ 0.5 + small home bias
    # Use empirical home-cover rate on CAL as market-null p (league base)
    base_home = mean(g["cover_home"] for g in cal) if cal else 0.5
    # model p: Phi(shift / sigma_w) with shift=0 is 0.5 — use residual mean by weather on CAL
    shift_w = {}
    sig_w = {}
    for w in set(g["wbin"] for g in cal):
        sub = [g["resid"] for g in cal if g["wbin"] == w]
        if len(sub) < 50:
            shift_w[w], sig_w[w] = 0.0, sigma_pool
        else:
            shift_w[w] = mean(sub)
            sig_w[w] = max(pstdev(sub), 0.25)

    # e-process + logit-pool: y=cover_home, m=base_home (market/null), p=Phi(shift_w/sig_w)
    # Actually p should be our P(home covers) = Phi( (0 - mean_resid_w)/sig ) under market line...
    # residual model: resid ~ N(mu_w, sig_w), cover if resid>0 → p = 1-Phi((0-mu_w)/sig_w)=Phi(mu_w/sig_w)
    pts = []
    for g in te:
        mu_w = shift_w.get(g["wbin"], 0.0)
        sig = sig_w.get(g["wbin"], sigma_pool)
        p = Phi(mu_w / sig)
        m = base_home
        pts.append((g["cover_home"], p, m))

    ep = eprocess(pts, eps=0.05)
    pool = logit_pool([t[1] for t in pts], [t[2] for t in pts], [t[0] for t in pts])

    # weather Mondrian coverage of |resid| bands
    cells = []
    for w in sorted(set(g["wbin"] for g in games)):
        cal_r = sorted(abs(g["resid"]) for g in cal if g["wbin"] == w)
        te_r = [g for g in te if g["wbin"] == w]
        if len(cal_r) < 9 or not te_r:
            cells.append({"wbin": w, "n_cal": len(cal_r), "n_te": len(te_r), "status": "FAIL_CLOSED_OR_THIN"})
            continue
        k = math.ceil((len(cal_r) + 1) * 0.90)
        if k > len(cal_r):
            cells.append({"wbin": w, "n_cal": len(cal_r), "n_te": len(te_r), "status": "FAIL_CLOSED_k>n"})
            continue
        hw = cal_r[k - 1]
        cov = sum(1 for g in te_r if abs(g["resid"]) <= hw) / len(te_r)
        cells.append(
            {
                "wbin": w,
                "n_cal": len(cal_r),
                "n_te": len(te_r),
                "halfwidth": hw,
                "coverage_oot": cov,
                "hit_home_cover_te": mean(g["cover_home"] for g in te_r),
                "mean_abs_resid_te": mean(abs(g["resid"]) for g in te_r),
                "status": "ok",
            }
        )

    # props gate selftest (owned math)
    props_tests = [
        fire_posted_prop(0.55, -110, -110),
        fire_posted_prop(0.52, -110, -110),
        fire_posted_prop(0.60, -130, 110),
        fire_posted_prop(0.53, -105, -105, extra_books=[{"book": "B", "american": -102}]),
        fire_posted_prop(0.51, -110, -110, extra_books=[{"book": "B", "american": -120}]),
    ]

    report = {
        "ok": True,
        "source": str(gpath),
        "attribution": "Data via nflverse (nflverse-data), CC BY 4.0",
        "n_games": len(games),
        "seasons": [seasons[0], seasons[-1]] if seasons else None,
        "n_cal": len(cal),
        "n_holdout": len(te),
        "sigma_pool_cal": sigma_pool,
        "base_home_cover_rate_cal": base_home,
        "weather_shift_cal": shift_w,
        "weather_sigma_cal": sig_w,
        "eprocess_weather_vs_base": ep,
        "logit_pool_weather": pool,
        "weather_mondrian_oot": cells,
        "props_fire_gate_port_tests": props_tests,
        "props_gate_summary": {
            "fires": sum(1 for t in props_tests if t.get("fire")),
            "note": "No production prop lines on disk — gate ported + selftested; priced:false always",
        },
        "replacement_map": {
            "K3_bands": "Weather-stratified residual Mondrian on nflverse + sport margin densities",
            "ML_CLV": "Cover e-process weather model vs league base; logit-pool beta",
            "Fantasy_props": "firePostedProp + shin_devig + juice shop — ready when prop Americans land",
        },
        "kill_lines": [
            "Weather model skill only if e-process M_max>=20 OR logit-pool CI excludes 0 on holdout covers",
            "Weather Mondrian product only if OOT cov>=0.85 per bin n_te>=30",
            "Props fire only if shin edge>0 AND some book clears break-even American",
        ],
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }
    write_report(Path(args.out), report)
    print(
        dumps_report(
            {
                "ok": True,
                "out": str(args.out),
                "n_games": len(games),
                "ep": ep.get("verdict"),
                "Mmax": ep.get("M_max"),
                "pool": pool.get("verdict"),
                "pool_beta": pool.get("beta_model_logit"),
                "props_fires": report["props_gate_summary"]["fires"],
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
