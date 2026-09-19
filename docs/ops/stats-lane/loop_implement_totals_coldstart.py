#!/usr/bin/env python3
"""Loop 07:19Z implement — totals CRPS path + cold-start prior Brier vs market ML.

Top replacements from loop_next_actions (positive, not delete-only):
  A. Totals density path (logit MODEL_ADDS_INFORMATION) — CRPS vs naive baselines
  B. Cold-start prior-only NFL win p vs market moneyline Brier (Law 11 baseline 0.211)
  C. Coach go-rate CANDIDATE registration artifact (not wired)

No gate flips. No DB. Law 4: observed numbers only.
"""

from __future__ import annotations

import csv
import gzip
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
PBP_DIR = Path("docs/ops/stats-lane/incoming/nflverse-pbp")
OUT = Path("docs/ops/stats-lane/out/loop_implement_0719_totals_coldstart.json")
COACH = Path("docs/ops/stats-lane/out/coach_go_rate_stickiness.json")


def fnum(x):
    try:
        if x is None or x == "":
            return None
        v = float(x)
        return v if math.isfinite(v) else None
    except Exception:
        return None


def american_to_prob(ml):
    ml = fnum(ml)
    if ml is None:
        return None
    return 100.0 / (ml + 100.0) if ml > 0 else (-ml) / ((-ml) + 100.0)


def crps_gauss_sample(resids):
    """CRPS of N(0, sigma) forecast vs residual sample (closed form mean)."""
    if len(resids) < 5:
        return None
    sigma = pstdev(resids)
    if sigma <= 0:
        return 0.0
    acc = 0.0
    for r in resids:
        z = r / sigma
        phi = math.exp(-0.5 * z * z) / math.sqrt(2 * math.pi)
        Phi = 0.5 * (1 + math.erf(z / math.sqrt(2)))
        acc += sigma * (1.0 / math.sqrt(math.pi) - 2.0 * phi + z * (2.0 * Phi - 1.0))
    return acc / len(resids)


def brier(ps, ys):
    pairs = [(p, y) for p, y in zip(ps, ys) if p is not None and y is not None]
    if not pairs:
        return None, 0
    return sum((p - y) ** 2 for p, y in pairs) / len(pairs), len(pairs)


def totals_crps_path():
    if not EXPORT.exists():
        return {"status": "DATA_BLOCKED"}
    rows = []
    for line in EXPORT.open(encoding="utf-8"):
        r = json.loads(line)
        if r.get("pickType") != "TOTAL":
            continue
        if r.get("result") not in ("WIN", "LOSS", "PUSH"):
            continue
        # Prefer actual vs predicted total residual when present
        am = fnum(r.get("actualMargin"))  # may be total residual or margin depending on type
        pm = fnum(r.get("predictedMeanMargin"))
        mfp = fnum(r.get("marketFairProb"))
        conf = fnum(r.get("confidence"))
        # For TOTALs on this export actualMargin/predictedMeanMargin may be total-points oriented
        if am is None:
            continue
        rows.append(
            {
                "actual": am,
                "pred": pm,
                "mfp": mfp,
                "conf100": (conf / 100.0 if conf is not None else None),
                "result": r.get("result"),
                "sport": r.get("sport") or "?",
                "modelVersion": r.get("modelVersion") or "?",
            }
        )
    if len(rows) < 30:
        return {"status": "UNDERPOWERED", "n": len(rows)}

    def resid(key):
        out = []
        for r in rows:
            p = r.get(key)
            if p is None:
                continue
            out.append(r["actual"] - p)
        return out

    res_pred = resid("pred")
    # baselines: predict 0 residual (market-neutral); predict mean residual
    base0 = [r["actual"] for r in rows]
    mu = mean(base0) if base0 else 0.0
    base_mu = [r["actual"] - mu for r in rows]

    out_groups = {}
    for gkey in ("ALL",):
        out_groups[gkey] = {
            "n": len(rows),
            "crps_model_residual": crps_gauss_sample(res_pred) if len(res_pred) >= 5 else None,
            "n_model_resid": len(res_pred),
            "crps_baseline_zero": crps_gauss_sample(base0),
            "crps_baseline_mean": crps_gauss_sample(base_mu),
            "mean_actual": mu,
            "mean_resid_model": mean(res_pred) if res_pred else None,
        }
    by_sport = defaultdict(list)
    for r in rows:
        if r["pred"] is not None:
            by_sport[r["sport"]].append(r["actual"] - r["pred"])
    for s, arr in by_sport.items():
        if len(arr) < 20:
            continue
        out_groups[f"sport:{s}"] = {
            "n": len(arr),
            "crps_model_residual": crps_gauss_sample(arr),
            "kill_line": "advance totals density only if CRPS_model <= CRPS_baseline - 0.01 on n>=150",
        }

    all_crps = out_groups["ALL"].get("crps_model_residual")
    base_crps = out_groups["ALL"].get("crps_baseline_zero")
    kill = (
        all_crps is not None
        and base_crps is not None
        and len(rows) >= 150
        and all_crps <= base_crps - 0.01
    )
    return {
        "status": "ok",
        "n_total_rows_settled": len(rows),
        "groups": out_groups,
        "kill_line": "Totals CRPS model beats naive residual baseline by >=0.01 on n>=150 or stay research density path",
        "kill_line_triggered": kill,
        "eprocess_note": "Logit-pool MODEL_ADDS_INFORMATION on totals stands; Ville skill language still requires M_max>=20 (suite ~4.4-10.3)",
        "replacement": "Totals-first product + CRPS density captions; ML remains FIRE_NOTHING / CLV gated",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }


def load_prior_nets(season: int):
    p = PBP_DIR / f"play_by_play_{season}.csv.gz"
    if not p.exists():
        return None
    game_team = defaultdict(lambda: {"n": 0, "epa": 0.0, "opp": None})
    with gzip.open(p, "rt", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            st = (row.get("season_type") or "").upper()
            if st and st != "REG":
                continue
            if (row.get("play_type") or "").lower() not in ("pass", "run"):
                continue
            epa = fnum(row.get("epa"))
            post, gid = row.get("posteam"), row.get("game_id")
            if not post or not gid or epa is None:
                continue
            g = game_team[(post, gid)]
            g["n"] += 1
            g["epa"] += epa
            g["opp"] = row.get("defteam")
    off = defaultdict(list)
    def_allow = defaultdict(list)
    for (t, _), g in game_team.items():
        if g["n"] < 15:
            continue
        rate = g["epa"] / g["n"]
        off[t].append(rate)
        if g.get("opp"):
            def_allow[g["opp"]].append(rate)
    nets = {}
    for t in off:
        o = mean(off[t])
        d = mean(def_allow[t]) if def_allow.get(t) else 0.0
        nets[t] = o - d
    return nets


def coldstart_brier_vs_market_ml():
    """As-of home-win Brier: prior-season net EPA (cold start) vs market ML. No current-season PBP."""
    if not GAMES.exists():
        return {"status": "DATA_BLOCKED"}
    seasons_pbp = set()
    for p in PBP_DIR.glob("play_by_play_*.csv.gz"):
        try:
            seasons_pbp.add(int(p.name.replace(".csv.gz", "").split("_")[-1]))
        except ValueError:
            pass
    pbp = {s: load_prior_nets(s) for s in sorted(seasons_pbp)}

    p_mkt, p_prior, y = [], [], []
    season_duel = defaultdict(lambda: {"m": [], "p": [], "y": []})
    for rec in csv.DictReader(GAMES.open(encoding="utf-8")):
        if (rec.get("game_type") or "REG") != "REG":
            continue
        s = fnum(rec.get("season"))
        hs, aw = fnum(rec.get("home_score")), fnum(rec.get("away_score"))
        if s is None or hs is None or aw is None:
            continue
        s = int(s)
        if hs == aw:
            continue
        yy = 1.0 if hs > aw else 0.0
        ph = american_to_prob(rec.get("home_moneyline"))
        nets = pbp.get(s - 1)
        h, a = rec.get("home_team"), rec.get("away_team")
        pp = None
        if nets and h in nets and a in nets:
            # margin then logistic; scale fleet 42.54 + HFA 2 — label as research conversion
            margin = 42.54 * (nets[h] - nets[a]) + 2.0
            pp = 1.0 / (1.0 + math.exp(-margin / 13.5))
        if ph is None:
            continue
        p_mkt.append(ph)
        p_prior.append(pp)
        y.append(yy)
        season_duel[s]["m"].append(ph)
        season_duel[s]["p"].append(pp)
        season_duel[s]["y"].append(yy)

    bm, nm = brier(p_mkt, y)
    bp, npri = brier(p_prior, y)
    # paired where prior exists
    pe, me, ye = [], [], []
    for a, b, c in zip(p_prior, p_mkt, y):
        if a is not None:
            pe.append(a)
            me.append(b)
            ye.append(c)
    bp2, n2 = brier(pe, ye)
    bm2, _ = brier(me, ye)
    delta = (bm2 - bp2) if (bp2 is not None and bm2 is not None) else None
    kill = delta is not None and n2 >= 272 and bp2 <= bm2 - 0.002
    seasons_out = []
    for s, a in sorted(season_duel.items()):
        b1, n1 = brier(a["p"], a["y"])
        b2, n2s = brier(a["m"], a["y"])
        seasons_out.append({"season": s, "n_mkt": n2s, "n_prior": n1, "brier_prior": b1, "brier_market_ml": b2})
    return {
        "status": "ok",
        "method": "Cold-start prior-season net EPA only (no current PBP); p=logit(42.54*net_diff+2 HFA /13.5); market=home ML implied",
        "brier_market_ml_all": bm,
        "n_market_ml": nm,
        "brier_prior_all_where_defined": bp,
        "n_prior_defined": npri,
        "paired_n": n2,
        "paired_brier_prior": bp2,
        "paired_brier_market_ml": bm2,
        "delta_mkt_minus_prior": delta,
        "law11_baseline": 0.211,
        "kill_line": "Wire independent fair p only if Brier <= market_ml - 0.002 on n>=272 as-of",
        "kill_line_triggered": kill,
        "verdict": (
            "PRIOR_BEATS_MARKET_ML"
            if kill
            else ("PRIOR_LOSES_TO_MARKET_ML" if delta is not None else "INSUFFICIENT")
        ),
        "season_duel": seasons_out,
        "replacement": (
            "Cold-start path: display marketFairProb; adj-EPA/DAVE remain research captions until as-of kill clears. "
            "NFL_EPA_MIN_GAMES stays founder-gated."
        ),
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }


def coach_candidate_registration():
    if not COACH.exists():
        return {"status": "DATA_BLOCKED"}
    d = json.loads(COACH.read_text(encoding="utf-8"))
    pairs = d.get("coach_stickiness") or []
    rs = [p.get("spearman") for p in pairs if isinstance(p.get("spearman"), (int, float))]
    reg = {
        "status": "CANDIDATE_REGISTERED_NOT_WIRED",
        "factor_name": "coach_go_rate_4th_short",
        "kill_line_stickiness_r": 0.20,
        "observed_spearman_pairs": rs,
        "mean_spearman": (sum(rs) / len(rs)) if rs else None,
        "wire_kill": "holdout Brier improves >=0.002 vs baseline on n>=272 after real coach-game join",
        "doctrine": "Never CLV admission; register factors YAML kill_line before run_sha (order gate)",
        "path": str(COACH),
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }
    write_report(Path("docs/ops/stats-lane/out/coach_factor_candidate_registration.json"), reg)
    return reg


def main():
    a = totals_crps_path()
    b = coldstart_brier_vs_market_ml()
    c = coach_candidate_registration()
    report = {
        "ok": True,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "A_totals_crps": a,
        "B_coldstart_vs_market_ml": b,
        "C_coach_candidate": c,
        "active_replacements": [
            "K3 No-band + rest/weather UQ captions (16/16 OOT>=0.85)",
            "marketFairProb public/rank p (bits +0.075; top-decile 0.912 shadow)",
            "Law 11 market ML Brier 0.211",
            "DAVE/Elo/prior research only (market wins RMSE/CRPS)",
            "PASS never mint; export v3 census ops",
            "Depth display-only; confidence display-only",
        ],
    }
    write_report(OUT, report)
    print("totals", a.get("status"), "n", a.get("n_total_rows_settled"), "kill", a.get("kill_line_triggered"))
    print("  crps model", (a.get("groups") or {}).get("ALL", {}).get("crps_model_residual"),
          "base0", (a.get("groups") or {}).get("ALL", {}).get("crps_baseline_zero"))
    print("coldstart", b.get("verdict"), "prior", b.get("paired_brier_prior"),
          "mkt", b.get("paired_brier_market_ml"), "n", b.get("paired_n"), "kill", b.get("kill_line_triggered"))
    print("coach", c.get("status"), "mean_r", c.get("mean_spearman"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
