#!/usr/bin/env python3
"""Fleet synthesis intake — Mimo independent CRPS walk-forward + doctrine bindings.

EXTERNAL claims from fleet (Grok/Hermes/Claude synthesis) are recorded, NOT
labeled Mimo OBS unless this script recomputes them on owned nflverse data.

Independent re-measure on games.csv REG:
  - Market closing (spread_line as home margin, + = home favored) CRPS/RMSE
  - Season-fresh Elo as-of CRPS/RMSE/Spearman
  - Prior-season-only EPA-style net (from pbp when present) CRPS
  - DAVE-style w=N/(N+8) using PRIOR only when N_current=0 (cold start)

Doctrine bindings (fleet-synchronized, no gate flips):
  - DAVE k=8 is Rung-2 team-strength prior; NOT a spread mu addend
  - NFL_EPA_MIN_GAMES=4 stays until founder-gated v5.3.0; bridge does not bypass
  - PASS veto = honesty standard (never mint PASS / expectedClv<0), NOT a
    win-rate booster; NFL PASS n too thin for rate claims
  - MLB SPEAK tiers untrusted until composite refit
"""

from __future__ import annotations

import csv
import gzip
import math
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from statistics import mean

sys.path.insert(0, str(Path(__file__).resolve().parent))
from stats_json import write_report

GAMES = Path(r"C:\Users\Garrett\nfl_ot\games.csv")
PBP_DIR = Path("docs/ops/stats-lane/incoming/nflverse-pbp")
OPPADJ = Path(r"C:\Users\Garrett\Sports-oppadj\docs\research\2026-09-19-opp-adj-epa-path")
OUT = Path("docs/ops/stats-lane/out/fleet_synthesis_mimo_2026-09-19.json")

FLEET_CLAIMS = {
    "source": "Fleet synthesis (Grok walk-forward 2019-2025 + Hermes README corrections) — EXTERNAL until recomputed",
    "dave_k8_crps": 7.500,
    "market_close_crps": 7.109,
    "elo_crps": 7.576,
    "play_pooled_epa_crps": 7.573,
    "last_year_only_crps": 7.778,
    "dave_spearman": 0.349,
    "play_pooled_spearman": 0.323,
    "boundaries": [
        "DAVE beats Elo/play-pooled but loses to market close → Rung 2 prior only, NOT spread addend",
        "NFL_EPA_MIN_GAMES=4 still null until >=4 games; bridge does not auto-bypass (founder v5.3.0)",
        "PASS veto = honesty of factor trail, not win-rate inflation",
        "MLB SPEAK 0.400 n=90 inverted — do not trust MLB decision tiers until composite refit",
        "Quarantined multi-season script: home/away orientation bug — do not reuse",
    ],
    "mimo_status": "CLAIMS_RECORDED_NOT_MIMO_OBS",
}


def fnum(x):
    try:
        if x is None or x == "":
            return None
        v = float(x)
        return v if math.isfinite(v) else None
    except Exception:
        return None


def norm_cdf(z: float) -> float:
    return 0.5 * (1.0 + math.erf(z / math.sqrt(2.0)))


def crps_ensemble_gaussian(preds, actuals):
    """CRPS for point forecasts treated as degenerate + residual scale? Use energy form for points:
    For deterministic forecasts CRPS = |pred - y| is MAE; for proper CRPS need a distribution.
    We report RMSE + MAE for point forecasts and Gaussian CRPS when sigma known.
    """
    pairs = [(p, y) for p, y in zip(preds, actuals) if p is not None and y is not None]
    if not pairs:
        return None, None, 0
    mae = mean(abs(p - y) for p, y in pairs)
    rmse = math.sqrt(mean((p - y) ** 2 for p, y in pairs))
    return mae, rmse, len(pairs)


def spearman(a, b):
    n = len(a)
    if n < 3:
        return None
    def rank(xs):
        order = sorted(range(n), key=lambda i: xs[i])
        r = [0.0] * n
        i = 0
        while i < n:
            j = i
            while j + 1 < n and xs[order[j + 1]] == xs[order[i]]:
                j += 1
            avg = (i + j) / 2 + 1
            for k in range(i, j + 1):
                r[order[k]] = avg
            i = j + 1
        return r
    ra, rb = rank(a), rank(b)
    ma, mb = mean(ra), mean(rb)
    num = sum((ra[i] - ma) * (rb[i] - mb) for i in range(n))
    da = math.sqrt(sum((x - ma) ** 2 for x in ra))
    db = math.sqrt(sum((x - mb) ** 2 for x in rb))
    if da == 0 or db == 0:
        return None
    return num / (da * db)


def load_season_net_from_pbp(season: int):
    p = PBP_DIR / f"play_by_play_{season}.csv.gz"
    if not p.exists():
        return None
    game_team = defaultdict(lambda: {"n": 0, "epa": 0.0, "opp": None})
    with gzip.open(p, "rt", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            st = (row.get("season_type") or "").upper()
            if st and st != "REG":
                continue
            pt = (row.get("play_type") or "").lower()
            if pt not in ("pass", "run"):
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
    for (team, _gid), g in game_team.items():
        if g["n"] < 15:
            continue
        rate = g["epa"] / g["n"]
        off[team].append(rate)
        if g.get("opp"):
            def_allow[g["opp"]].append(rate)
    ratings = {}
    for t in set(off) | set(def_allow):
        if not off.get(t):
            continue
        o = mean(off[t])
        d = mean(def_allow[t]) if def_allow.get(t) else 0.0
        ratings[t] = o - d
    return ratings


def independent_walkforward():
    if not GAMES.exists():
        return {"status": "DATA_BLOCKED"}
    games = []
    for rec in csv.DictReader(GAMES.open(encoding="utf-8")):
        if (rec.get("game_type") or "REG") != "REG":
            continue
        s = fnum(rec.get("season"))
        hs, aw = fnum(rec.get("home_score")), fnum(rec.get("away_score"))
        if s is None or hs is None or aw is None:
            continue
        games.append(
            {
                "season": int(s),
                "week": int(fnum(rec.get("week")) or 0),
                "gameday": rec.get("gameday") or "",
                "home": rec.get("home_team"),
                "away": rec.get("away_team"),
                "margin": hs - aw,
                "spread": fnum(rec.get("spread_line")),  # + = home favored (measured)
                "total_line": fnum(rec.get("total_line")),
                "total_actual": hs + aw,
            }
        )
    games.sort(key=lambda r: (r["season"], r["gameday"], r["week"]))

    seasons = sorted({g["season"] for g in games})
    pbp_nets = {}
    for s in seasons:
        nets = load_season_net_from_pbp(s)
        if nets:
            pbp_nets[s] = nets

    K, HA, SCALE = 20.0, 48.0, 400.0
    elo_hist = defaultdict(list)
    p_market, p_elo, p_prior_epa, p_dave, y_all = [], [], [], [], []
    season_rows = []

    for g in games:
        s, h, a = g["season"], g["home"], g["away"]
        y = g["margin"]
        # market
        if g["spread"] is not None:
            p_market.append(g["spread"])
            y_all.append(y)
        # elo as-of
        eh = elo_hist[(s, h)][-1] if elo_hist[(s, h)] else 1500.0
        ea = elo_hist[(s, a)][-1] if elo_hist[(s, a)] else 1500.0
        exp_h = 1.0 / (1.0 + 10 ** (-((eh + HA) - ea) / SCALE))
        # convert Elo p to margin via scale fit later — use (exp_h-0.5)*2*13.5 as crude margin proxy
        # Better: store p and score Brier on home-win; for margin CRPS use rating net when available
        elo_margin = (exp_h - 0.5) * 2 * 13.5
        # prior EPA net
        prior_nets = pbp_nets.get(s - 1) or {}
        cur_nets = pbp_nets.get(s) or {}
        n_prior = elo_margin
        if h in prior_nets and a in prior_nets:
            # convert net EPA/play to points via SCALE_EPA (fleet 42.54 pts per net EPA)
            n_prior = 42.54 * (prior_nets[h] - prior_nets[a]) + 2.0
        # DAVE blend: w=N/(N+8), N from games played this season (as-of)
        # count prior games this season for h,a
        def n_played(team):
            return len(elo_hist[(s, team)])
        wh = n_played(h) / (n_played(h) + 8.0)
        wa = n_played(a) / (n_played(a) + 8.0)
        if h in cur_nets and a in cur_nets and h in prior_nets and a in prior_nets:
            # LEAKY if cur_nets is full-season; label
            nh = wh * cur_nets[h] + (1 - wh) * prior_nets[h]
            na = wa * cur_nets[a] + (1 - wa) * prior_nets[a]
            n_dave = 42.54 * (nh - na) + 2.0
            leaky = True
        else:
            n_dave = n_prior
            leaky = False

        if g["spread"] is not None:
            p_elo.append(elo_margin)
            p_prior_epa.append(n_prior)
            p_dave.append(n_dave)

        # elo update
        yy = 1.0 if y > 0 else 0.0 if y < 0 else 0.5
        update = K * (yy - exp_h)
        elo_hist[(s, h)].append(eh + update)
        elo_hist[(s, a)].append(ea - update)

    mae_m, rmse_m, n_m = crps_ensemble_gaussian(p_market, y_all)
    # align elo/prior/dave with market sample
    y_al = []
    pe, pp, pd = [], [], []
    # rebuild aligned: use y_all from market rows only — need parallel
    # Simpler: recompute with only games that have spread
    y_al, pe, pp, pd, pm = [], [], [], [], []
    for g in games:
        if g["spread"] is None:
            continue
        # We need the same as-of preds — recompute quickly from stored? 
        # For cleanliness, store during loop instead.
    # Re-loop store
    elo_hist = defaultdict(list)
    pm, pe, pp, pd, ys = [], [], [], [], []
    leaky_dave_n = 0
    for g in games:
        if g["spread"] is None:
            continue
        s, h, a = g["season"], g["home"], g["away"]
        y = g["margin"]
        eh = elo_hist[(s, h)][-1] if elo_hist[(s, h)] else 1500.0
        ea = elo_hist[(s, a)][-1] if elo_hist[(s, a)] else 1500.0
        exp_h = 1.0 / (1.0 + 10 ** (-((eh + HA) - ea) / SCALE))
        elo_margin = (exp_h - 0.5) * 2 * 13.5
        prior_nets = pbp_nets.get(s - 1) or {}
        cur_nets = pbp_nets.get(s) or {}
        n_prior = elo_margin
        if h in prior_nets and a in prior_nets:
            n_prior = 42.54 * (prior_nets[h] - prior_nets[a]) + 2.0
        def np_(t):
            return len(elo_hist[(s, t)])
        wh, wa = np_(h) / (np_(h) + 8.0), np_(a) / (np_(a) + 8.0)
        if h in cur_nets and a in cur_nets and h in prior_nets and a in prior_nets:
            nh = wh * cur_nets[h] + (1 - wh) * prior_nets[h]
            na = wa * cur_nets[a] + (1 - wa) * prior_nets[a]
            n_dave = 42.54 * (nh - na) + 2.0
            leaky_dave_n += 1
        else:
            n_dave = n_prior
        pm.append(g["spread"])
        pe.append(elo_margin)
        pp.append(n_prior)
        pd.append(n_dave)
        ys.append(y)
        yy = 1.0 if y > 0 else 0.0 if y < 0 else 0.5
        update = K * (yy - exp_h)
        elo_hist[(s, h)].append(eh + update)
        elo_hist[(s, a)].append(ea - update)

    mae_m, rmse_m, n = crps_ensemble_gaussian(pm, ys)
    mae_e, rmse_e, _ = crps_ensemble_gaussian(pe, ys)
    mae_p, rmse_p, _ = crps_ensemble_gaussian(pp, ys)
    mae_d, rmse_d, _ = crps_ensemble_gaussian(pd, ys)
    sp = {
        "market": spearman(pm, ys),
        "elo_margin_proxy": spearman(pe, ys),
        "prior_epa": spearman(pp, ys),
        "dave_or_prior": spearman(pd, ys),
    }
    # home-win Brier from elo vs market-implied Phi
    belo, bmkt = [], []
    for g in games:
        if g["spread"] is None:
            continue
        s, h, a = g["season"], g["home"], g["away"]
        # use last stored? simpler recompute not needed for this summary — skip detailed Brier here
    return {
        "status": "ok",
        "n_reg_with_spread": n,
        "note": (
            "Point-forecast MAE/RMSE (fleet quotes CRPS for distributional estimators; "
            "we do not relabel RMSE as CRPS). Market = +spread_line home margin. "
            f"DAVE uses full-season current PBP when present → LEAKY upper bound on n={leaky_dave_n} rows; "
            "cold-start path is prior-only."
        ),
        "market_spread": {"mae": mae_m, "rmse": rmse_m},
        "elo_margin_proxy_13p5pts": {"mae": mae_e, "rmse": rmse_e},
        "prior_season_epa_SCALE42p54": {"mae": mae_p, "rmse": rmse_p},
        "dave_k8_or_prior_when_no_cur": {"mae": mae_d, "rmse": rmse_d, "leaky_cur_n": leaky_dave_n},
        "spearman": sp,
        "orderings_observed": {
            "by_rmse": sorted(
                [
                    ("market", rmse_m),
                    ("elo_proxy", rmse_e),
                    ("prior_epa", rmse_p),
                    ("dave_or_prior", rmse_d),
                ],
                key=lambda t: (t[1] if t[1] is not None else 9e9),
            )
        },
        "doctrine": [
            "Market remains the efficient benchmark for ranking authority when priced",
            "DAVE/Elo/prior = Rung-2 team-strength research; not public spread addend",
            "NFL_EPA_MIN_GAMES=4 stays; founder v5.3.0 only for gate change",
            "PASS veto = honesty; never mint PASS/expectedClv<0",
            "MLB SPEAK untrusted until composite refit",
        ],
        "fleet_external": FLEET_CLAIMS,
        "kill_lines": [
            "Public p = marketFairProb when books priced (H3 bits +0.075)",
            "Law 11 scorecard vs market ML Brier 0.211 n=5051",
            "Independent NFL fair p only after as-of Brier beat market ML -0.002 n>=272",
            "No CLV admission; totals-first dual denominators",
        ],
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }


def main():
    report = independent_walkforward()
    write_report(OUT, report)
    print("n", report.get("n_reg_with_spread"))
    print("rmse order", report.get("orderings_observed"))
    print("spearman", report.get("spearman"))
    print("fleet mimo_status", report.get("fleet_external", {}).get("mimo_status"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
