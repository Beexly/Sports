#!/usr/bin/env python3
"""SOLUTIONS BATTERY V2 — more measured replacements, not a single path.

Instruments (each positive, each pre-registered kill line):
  H1 historical as-of Elo vs market Brier on nflverse games (NO LOOKAHEAD)
  H2 CLV population ladder (denominator honesty — Law 10)
  H3 realized information-edge bits (GSE2 information-edge-bits.ts port)
  H4 turnover occurrence vs recovery regressed (never raw fumble luck in Elo)
  H5 rest/weather Mondrian residuals on nflverse totals
  H6 CLV association decomposition (GSE2 clv-decomposition.ts port, association only)
  H7 per-sport CRPS residual scales (board-export margins when present)
  H8 moneyline implied-prob Brier on nflverse ML (market vs base rate)

Attribution: nflverse / Lee Sharpe schedules + pbp, CC BY 4.0.
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
from stats_json import write_report  # noqa: E402
from opponent_adjusted_epa import opponent_adjusted, sigmoid  # noqa: E402

GAMES = Path(r"C:\Users\Garrett\nfl_ot\games.csv")
TEAM_WEEK = Path("docs/ops/stats-lane/incoming/nflverse-pbp/stats_team_week_2024.csv")
PBP24 = Path("docs/ops/stats-lane/incoming/nflverse-pbp/play_by_play_2024.csv.gz")
EXPORT = Path("docs/ops/stats-lane/incoming/board-export.jsonl")
OUT = Path("docs/ops/stats-lane/out/solutions_battery_v2.json")


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


def american_to_prob(ml):
    ml = fnum(ml)
    if ml is None:
        return None
    if ml > 0:
        return 100.0 / (ml + 100.0)
    return (-ml) / ((-ml) + 100.0)


def brier(ps, ys):
    pairs = [(p, y) for p, y in zip(ps, ys) if p is not None and y is not None]
    if not pairs:
        return None, 0
    return sum((p - y) ** 2 for p, y in pairs) / len(pairs), len(pairs)


def entropy_bits(p: float, floor: float = 1e-6) -> float:
    p = min(max(p, floor), 1.0 - floor)
    return -(p * math.log2(p) + (1 - p) * math.log2(1 - p))


# ── H1: as-of Elo vs market ──────────────────────────────────────────────────

def h1_asof_elo_vs_market():
    """No-lookahead Elo on nflverse schedules vs closing market Brier."""
    if not GAMES.exists():
        return {"status": "DATA_BLOCKED", "need": "nflverse games.csv"}
    rows = []
    for rec in csv.DictReader(GAMES.open(encoding="utf-8")):
        if (rec.get("game_type") or "REG") != "REG":
            continue
        season = fnum(rec.get("season"))
        hs, aw = fnum(rec.get("home_score")), fnum(rec.get("away_score"))
        spread = fnum(rec.get("spread_line"))
        ml_h, ml_a = american_to_prob(rec.get("home_moneyline")), american_to_prob(rec.get("away_moneyline"))
        if season is None or hs is None or aw is None:
            continue
        rows.append(
            {
                "season": int(season),
                "gameday": rec.get("gameday") or "",
                "week": int(fnum(rec.get("week")) or 0),
                "home": rec.get("home_team"),
                "away": rec.get("away_team"),
                "home_score": hs,
                "away_score": aw,
                "margin": hs - aw,
                "spread": spread,
                "total_line": fnum(rec.get("total_line")),
                "total_actual": hs + aw,
                "ml_home": ml_h,
                "ml_away": ml_a,
                "home_rest": fnum(rec.get("home_rest")),
                "away_rest": fnum(rec.get("away_rest")),
                "roof": (rec.get("roof") or "").lower(),
                "temp": fnum(rec.get("temp")),
                "wind": fnum(rec.get("wind")),
            }
        )
    rows.sort(key=lambda r: (r["season"], r["gameday"], r["week"]))

    # Initialize Elo per team per season (fresh season = 1500) — as-of only prior games
    K, HOME_ADV, SCALE = 20.0, 48.0, 400.0  # points → logistic scale
    sigma_margin = 13.5  # typical NFL margin residual scale for market p
    elo_hist: dict[tuple[int, str], list[float]] = defaultdict(list)
    p_elo, p_mkt, p_ml, p_base, y_win = [], [], [], [], []
    cover_home, cover_away, total_over = [], [], []
    per_season = {}
    trail_margin = {}  # rolling cover residual vs spread

    for r in rows:
        season, h, a = r["season"], r["home"], r["away"]
        # season-start prior
        def cur(team):
            hist = elo_hist[(season, team)]
            return hist[-1] if hist else 1500.0

        eh, ea = cur(h), cur(a)
        elo_p = 1.0 / (1.0 + 10 ** (-((eh + HOME_ADV) - ea) / SCALE))
        y = 1.0 if r["home_score"] > r["away_score"] else 0.0 if r["home_score"] < r["away_score"] else None

        mkt_p = None
        if r["spread"] is not None:
            # MEASURED on this nflverse games.csv: spearman(margin, spread_line)=+0.43
            # and home wins ~68% when spread_line>0 => positive = home favored.
            # p_home = Phi(+spread / sigma). (First pass used -spread and inverted the market.)
            mkt_p = norm_cdf(r["spread"] / sigma_margin)

        if y is not None:
            p_elo.append(elo_p)
            p_mkt.append(mkt_p)
            p_ml.append(r["ml_home"])
            p_base.append(0.5)
            y_win.append(y)
            if r["spread"] is not None:
                # cover: home covers if margin > spread when positive=home fav
                # home_fav_line = spread_line (positive = home favored, measured 2026-09-19)
                home_cover = 1 if r["margin"] > r["spread"] else 0
                push = abs(r["margin"] - r["spread"]) < 0.01
                if not push:
                    cover_home.append(home_cover)
                    if season not in trail_margin:
                        trail_margin[season] = {}
                    # prior only: use pre-game team cover residual if we had it — use Elo residual proxy
                    trail_margin[season][r["home"]] = trail_margin[season].get(r["home"], 0.0)
            if r["total_line"] is not None and r["total_actual"] is not None:
                if r["total_actual"] > r["total_line"]:
                    total_over.append(1)
                elif r["total_actual"] < r["total_line"]:
                    total_over.append(0)

            # Elo update AFTER scoring (no lookahead)
            exp_h = 1.0 / (1.0 + 10 ** (-((eh + HOME_ADV) - ea) / SCALE))
            update = K * (y - exp_h)
            elo_hist[(season, h)].append(eh + update)
            elo_hist[(season, a)].append(ea - update)
            if season not in per_season:
                per_season[season] = {"n": 0, "p_elo": [], "p_mkt": [], "y": []}
            per_season[season]["n"] += 1
            per_season[season]["p_elo"].append(elo_p)
            per_season[season]["p_mkt"].append(mkt_p)
            per_season[season]["y"].append(y)

    b_elo, n_elo = brier(p_elo, y_win)
    b_mkt, n_mkt = brier(p_mkt, y_win)
    b_ml, n_ml = brier(p_ml, y_win)
    b_base, n_base = brier(p_base, y_win)

    # paired duel where both exist
    paired_e, paired_m, paired_y = [], [], []
    for pe, pm, y in zip(p_elo, p_mkt, y_win):
        if pm is not None and y is not None:
            paired_e.append(pe)
            paired_m.append(pm)
            paired_y.append(y)
    b_e_p, n_p = brier(paired_e, paired_y)
    b_m_p, _ = brier(paired_m, paired_y)
    delta = (b_m_p - b_e_p) if (b_e_p is not None and b_m_p is not None) else None
    # HONEST market baseline is moneyline implied prob, not Phi(-spread/sigma).
    # Phi(spread) is a misspecified risk-neutral map; using it as "market" inflates a fake Elo win.
    paired_e2, paired_ml, paired_y2 = [], [], []
    for pe, pm, y in zip(p_elo, p_ml, y_win):
        if pm is not None and y is not None:
            paired_e2.append(pe)
            paired_ml.append(pm)
            paired_y2.append(y)
    b_e_ml, n_ml_pair = brier(paired_e2, paired_y2)
    b_m_ml, _ = brier(paired_ml, paired_y2)
    delta_ml = (b_m_ml - b_e_ml) if (b_e_ml is not None and b_m_ml is not None) else None
    # kill line from PATH vs TRUE market (ML)
    kill_hit = delta_ml is not None and n_ml_pair >= 272 and (b_e_ml <= b_m_ml - 0.002)
    kill_hit_spread_phi = delta is not None and n_p >= 272 and (b_e_p <= b_m_p - 0.002)

    season_duel = []
    for s, a in sorted(per_season.items()):
        be, ne = brier(a["p_elo"], a["y"])
        bm, nm = brier(a["p_mkt"], a["y"])
        season_duel.append({"season": s, "n": a["n"], "brier_elo": be, "brier_market": bm})

    cover_rate = (sum(cover_home) / len(cover_home)) if cover_home else None
    over_rate = (sum(total_over) / len(total_over)) if total_over else None

    return {
        "status": "ok",
        "source": str(GAMES.name),
        "method": "season-fresh Elo K=20 HA=48 as-of prior games only; market p = Phi(-spread/13.5); settle after",
        "n_reg_scored": n_elo,
        "brier": {
            "elo_asof": b_elo,
            "market_spread": b_mkt,
            "market_ml": b_ml,
            "base_0.5": b_base,
        },
        "paired_n": n_p,
        "paired_brier_elo": b_e_p,
        "paired_brier_market_spread_phi": b_m_p,
        "delta_market_phi_minus_elo": delta,
        "kill_line_spread_phi": "Do NOT treat Phi(-spread/sigma) as market authority — misspecified risk-neutral map",
        "kill_line_phi_triggered_ARTIFACT": kill_hit_spread_phi,
        "paired_n_ml": n_ml_pair,
        "paired_brier_elo_vs_ml": b_e_ml,
        "paired_brier_market_ml": b_m_ml,
        "delta_market_ml_minus_elo": delta_ml,
        "kill_line": "wire independent Elo/adj-EPA only if Brier_model <= Brier_market_ml - 0.002 on n>=272",
        "kill_line_triggered": kill_hit,
        "verdict": (
            "ELO_BEATS_MARKET_ML_BY_KILL_LINE"
            if kill_hit
            else (
                "ELO_LOSES_TO_MARKET_ML"
                if delta_ml is not None
                else "DATA"
            )
        ),
        "correction_note": (
            "First pass compared Elo to Phi(-spread/13.5) and reported ELO_BEATS_MARKET. "
            "That map is misspecified (Brier ~0.35 vs moneyline market 0.211). "
            "Honest market baseline = home_moneyline implied p. Elo as-of 0.233 vs market ML 0.211 → Elo does NOT clear kill line."
        ),
        "season_duel": season_duel,
        "home_cover_rate_ex_push": cover_rate,
        "n_covers": len(cover_home),
        "over_rate_ex_push": over_rate,
        "n_totals": len(total_over),
        "replacement": (
            "If kill not hit: marketFairProb remains rank authority for book-priced NFL; "
            "Elo/adj-EPA stays research shadow until as-of PBP duel flips the line. "
            "Spread residual / cover base rates become display calibration captions (Law 10)."
        ),
    }


# ── H2: CLV population ladder ────────────────────────────────────────────────

def h2_clv_population_ladder():
    if not EXPORT.exists():
        return {"status": "DATA_BLOCKED", "need": "board-export.jsonl"}
    rows = [json.loads(line) for line in EXPORT.open(encoding="utf-8")]

    def clv_num(r):
        # realized CLV when both lines present: lock vs close, direction-aware is hard
        # without selection side — report beat/lost/matched composition + rate on MATCHED
        return None

    def pop_stats(subset, label):
        n = len(subset)
        if n == 0:
            return {"label": label, "n": 0, "clv_rate": None, "verdicts": {}}
        v = defaultdict(int)
        for r in subset:
            v[r.get("clvVerdict") or "NULL"] += 1
        with_close = [r for r in subset if r.get("clvCloseLine") is not None]
        decided = [r for r in subset if r.get("result") in ("WIN", "LOSS")]
        nonpush = [r for r in subset if r.get("result") in ("WIN", "LOSS")]
        matched = [r for r in subset if r.get("clvVerdict") == "MATCHED_CLOSE"]
        beat = [r for r in subset if r.get("clvVerdict") == "BEAT_CLOSE"]
        lost = [r for r in subset if r.get("clvVerdict") == "LOST_TO_CLOSE"]
        # Rate definitions (pre-registered)
        # R1 all-graded: any result WIN/LOSS/PUSH/VOID with a clvVerdict
        graded = [r for r in subset if r.get("clvVerdict") in ("MATCHED_CLOSE", "BEAT_CLOSE", "LOST_TO_CLOSE")]
        r1 = (sum(1 for r in graded if r.get("clvVerdict") == "BEAT_CLOSE") / len(graded)) if graded else None
        # R2 decided-only with verdict
        graded_dec = [r for r in graded if r.get("result") in ("WIN", "LOSS")]
        r2 = (sum(1 for r in graded_dec if r.get("clvVerdict") == "BEAT_CLOSE") / len(graded_dec)) if graded_dec else None
        # R3 MATCHED_CLOSE only (push-ish close) — BEAT share meaningless; use win rate
        r3 = (sum(1 for r in matched if r.get("result") == "WIN") / len(matched)) if matched else None
        # R4 BEAT vs LOST binary CLV win (exclude MATCHED)
        bl = beat + lost
        r4 = (len(beat) / len(bl)) if bl else None
        return {
            "label": label,
            "n": n,
            "verdict_counts": dict(v),
            "n_with_clvClose": len(with_close),
            "n_graded_clv": len(graded),
            "n_decided_with_clv": len(graded_dec),
            "rate_BEAT_among_graded": r1,
            "rate_BEAT_among_decided_graded": r2,
            "win_rate_among_MATCHED_CLOSE": r3,
            "rate_BEAT_among_BEAT_or_LOST": r4,
            "break_even_52_4": 0.524,
            "beats_break_even": {
                "R1_graded": r1 is not None and r1 >= 0.524 and len(graded) >= 30,
                "R2_decided": r2 is not None and r2 >= 0.524 and len(graded_dec) >= 30,
                "R4_beat_vs_lost": r4 is not None and r4 >= 0.524 and len(bl) >= 30,
            },
        }

    ladder = [
        pop_stats(rows, "ALL_rows"),
        pop_stats([r for r in rows if r.get("result") in ("WIN", "LOSS")], "decided_WIN_LOSS"),
        pop_stats([r for r in rows if r.get("result") not in ("VOID", "PENDING")], "excl_VOID_PENDING"),
        pop_stats([r for r in rows if r.get("isPublished")], "published"),
        pop_stats([r for r in rows if r.get("result") == "WIN" or r.get("result") == "LOSS"], "strict_nonpush"),
    ]
    by_sport = []
    sports = sorted({r.get("sport") for r in rows if r.get("sport")})
    for s in sports:
        by_sport.append(pop_stats([r for r in rows if r.get("sport") == s], f"sport:{s}"))
    by_pt = []
    for pt in ("SPREAD", "MONEYLINE", "TOTAL"):
        by_pt.append(pop_stats([r for r in rows if r.get("pickType") == pt], f"type:{pt}"))

    any_pass = any(
        any(st["beats_break_even"].values())
        for st in ladder + by_sport + by_pt
        if st.get("beats_break_even")
    )
    return {
        "status": "ok",
        "break_even": 0.524,
        "ladder": ladder,
        "by_sport": by_sport,
        "by_pickType": by_pt,
        "any_population_reaches_52_4_n30": any_pass,
        "kill_line": "Do not claim CLV skill unless a pre-registered population rate >= 0.524 with n>=30 and the population is named on the surface (Law 10).",
        "replacement": (
            "Totals-first + sport-stratified CLV dual denominators; "
            "never a single pooled CLV headline. MATCHED_CLOSE vs BEAT/LOST are different events."
        ),
        "honest_note": "This ladder re-labels denominators; it does not invent a filter that manufactures 52.4%.",
    }


# ── H3: realized information-edge bits ───────────────────────────────────────

def h3_information_edge_bits():
    if not EXPORT.exists():
        return {"status": "DATA_BLOCKED", "need": "board-export.jsonl"}
    rows = [
        json.loads(line)
        for line in EXPORT.open(encoding="utf-8")
    ]
    settled = [r for r in rows if r.get("result") in ("WIN", "LOSS")]

    def bits_for(key_fn, label):
        pts = []
        for r in settled:
            p = key_fn(r)
            if p is None:
                continue
            try:
                p = float(p)
            except Exception:
                continue
            if not (0.0 < p < 1.0) and p not in (0.0, 1.0):
                continue
            y = 1 if r.get("result") == "WIN" else 0
            pts.append((p, y))
        if len(pts) < 30:
            return {"label": label, "n": len(pts), "status": "UNDERPOWERED"}
        base = sum(y for _, y in pts) / len(pts)
        # prior basis (GAMEABLE — reported only as headroom)
        prior = entropy_bits(base) - mean(entropy_bits(p) for p, _ in pts)
        # realised basis (HONEST gate)
        realized = entropy_bits(base) - mean(
            -(y * math.log2(min(max(p, 1e-6), 1 - 1e-6)) + (1 - y) * math.log2(min(max(1 - p, 1e-6), 1 - 1e-6)))
            for p, y in pts
        )
        # Brier
        br, n = brier([p for p, _ in pts], [y for _, y in pts])
        return {
            "label": label,
            "n": n,
            "base_rate": base,
            "prior_only_bits": prior,
            "realised_bits": realized,
            "brier": br,
            "gate": "GATE_ON_REALISED",
            "publishable_bits": realized is not None and realized > 0.02,
            "note": "prior basis is gameable; only realised bits are skill evidence",
        }

    res = {
        "status": "ok",
        "instruments": [
            bits_for(lambda r: fnum(r.get("marketFairProb")), "marketFairProb"),
            bits_for(lambda r: (fnum(r.get("confidence")) / 100.0 if fnum(r.get("confidence")) else None), "confidence/100"),
            bits_for(lambda r: fnum(r.get("rankingP")), "rankingP"),
            bits_for(lambda r: fnum(r.get("independentTrueProb")), "independentTrueProb"),
        ],
        "kill_line": "Slate/feature publish gate uses realisedInformationGainBits > 0.02; never prior basis.",
        "replacement": (
            "Confidence display-only if its realised bits <= marketFairProb; "
            "market p + independent trueProb are the honest bit sources when realised > 0."
        ),
    }
    return res


# ── H4: turnover occurrence ──────────────────────────────────────────────────

def h4_turnover_occurrence():
    if not TEAM_WEEK.exists():
        return {"status": "DATA_BLOCKED", "need": "stats_team_week_2024.csv"}
    agg = defaultdict(lambda: {"games": 0, "ff": 0.0, "int": 0.0, "fum_lost": 0.0, "int_thrown": 0.0})
    for rec in csv.DictReader(TEAM_WEEK.open(encoding="utf-8")):
        if (rec.get("season_type") or "REG") != "REG":
            continue
        t = rec.get("team")
        if not t:
            continue

        def g(k):
            return fnum(rec.get(k)) or 0.0

        a = agg[t]
        a["games"] += 1
        a["ff"] += g("def_fumbles_forced")
        a["int"] += g("def_interceptions")
        a["fum_lost"] += g("fumbles_lost")
        a["int_thrown"] += g("passing_interceptions")
    league_rec = []  # recovery is not in team_week directly — use forced vs opponent lost proxy
    # Without opponent fumble-recovery column, regress DEF takeaways toward league mean rates
    rows = []
    for t, a in agg.items():
        if a["games"] < 8:
            continue
        gp = a["games"]
        rows.append(
            {
                "team": t,
                "games": gp,
                "def_int_pg": a["int"] / gp,
                "def_ff_pg": a["ff"] / gp,
                "fum_lost_pg": a["fum_lost"] / gp,
                "int_thrown_pg": a["int_thrown"] / gp,
                "takeaway_pg": (a["int"] + a["ff"]) / gp,
                "giveaway_pg": (a["fum_lost"] + a["int_thrown"]) / gp,
            }
        )
    if not rows:
        return {"status": "EMPTY"}
    league_ta = mean(r["takeaway_pg"] for r in rows)
    league_ga = mean(r["giveaway_pg"] for r in rows)
    for r in rows:
        # regressed turnover margin: 50% shrink toward league mean (occurrence not recovery luck)
        r["to_margin_raw"] = r["takeaway_pg"] - r["giveaway_pg"]
        r["to_margin_regressed"] = 0.5 * r["to_margin_raw"] + 0.5 * (league_ta - league_ga)
    rows.sort(key=lambda r: -r["to_margin_regressed"])
    return {
        "status": "ok",
        "source": TEAM_WEEK.name,
        "league_takeaway_pg": league_ta,
        "league_giveaway_pg": league_ga,
        "shrinkage": 0.5,
        "top5_regressed_to_margin": [
            {k: r[k] for k in ("team", "to_margin_raw", "to_margin_regressed", "def_int_pg", "def_ff_pg")}
            for r in rows[:5]
        ],
        "bot5_regressed_to_margin": [
            {k: r[k] for k in ("team", "to_margin_raw", "to_margin_regressed", "def_int_pg", "def_ff_pg")}
            for r in rows[-5:]
        ],
        "kill_line": "Never feed raw takeaway margin into Elo; wire only regressed occurrence rates into adj-EPA residual features after holdout Brier n>=272.",
        "replacement": "PATH C turnover-occurrence instrument — def INT/FF rates + 50% shrink; recovery-regression when opponent recovery columns land.",
        "limitation": "stats_team_week_2024 lacks opponent fumble-recovery share; recovery regression still DATA-blocked at play level.",
    }


# ── H5: rest/weather total residuals ─────────────────────────────────────────

def h5_rest_weather_totals():
    if not GAMES.exists():
        return {"status": "DATA_BLOCKED"}
    buckets = defaultdict(list)
    for rec in csv.DictReader(GAMES.open(encoding="utf-8")):
        if (rec.get("game_type") or "REG") != "REG":
            continue
        tl = fnum(rec.get("total_line"))
        hs, aw = fnum(rec.get("home_score")), fnum(rec.get("away_score"))
        if tl is None or hs is None or aw is None:
            continue
        resid = (hs + aw) - tl
        roof = (rec.get("roof") or "").lower()
        wind = fnum(rec.get("wind"))
        hr, ar = fnum(rec.get("home_rest")), fnum(rec.get("away_rest"))
        if roof in ("dome", "closed"):
            key = "dome"
        elif wind is None:
            key = "outdoor_wind_unknown"
        elif wind < 5:
            key = "wind_lt5"
        elif wind < 10:
            key = "wind_5_10"
        elif wind < 15:
            key = "wind_10_15"
        else:
            key = "wind_ge15"
        buckets[key].append(resid)
        if hr is not None and ar is not None:
            rest_diff = hr - ar
            rk = "rest_home_plus3" if rest_diff >= 3 else "rest_balanced" if abs(rest_diff) < 2 else "rest_away_plus3"
            buckets[rk].append(resid)
    out = []
    for k, arr in buckets.items():
        if len(arr) < 40:
            continue
        out.append(
            {
                "bucket": k,
                "n": len(arr),
                "mean_total_minus_line": mean(arr),
                "sd": pstdev(arr) if len(arr) > 1 else None,
            }
        )
    out.sort(key=lambda r: -abs(r["mean_total_minus_line"] or 0))
    return {
        "status": "ok",
        "source": GAMES.name,
        "buckets": out,
        "kill_line": "Weather/rest residual bands replace flat K3 only when Mondrian OOT coverage >= 0.85 on held-out board-export sport cells.",
        "replacement": "Expand MIMO-6 weather Mondrian with rest_diff buckets (free nflverse columns).",
    }


# ── H6: CLV association decomposition (no causation labels) ──────────────────

def h6_clv_association():
    if not EXPORT.exists():
        return {"status": "DATA_BLOCKED"}
    items = []
    for line in EXPORT.open(encoding="utf-8"):
        r = json.loads(line)
        if r.get("clvVerdict") not in ("BEAT_CLOSE", "LOST_TO_CLOSE", "MATCHED_CLOSE"):
            continue
        lock = fnum(r.get("clvLockLine"))
        close = fnum(r.get("clvCloseLine"))
        if lock is None or close is None:
            continue
        # association target: close − lock in points (direction-agnostic magnitude + signed)
        signed = close - lock
        conf = fnum(r.get("confidence"))
        books = fnum(r.get("bookmakerCount"))
        mfp = fnum(r.get("marketFairProb"))
        # hours to kickoff if commence/generated present
        hours = None
        try:
            gt = r.get("generatedAt")
            ct = r.get("commenceTime")
            if gt and ct:
                t0 = datetime.fromisoformat(str(gt).replace("Z", "+00:00"))
                t1 = datetime.fromisoformat(str(ct).replace("Z", "+00:00"))
                hours = (t1 - t0).total_seconds() / 3600.0
        except Exception:
            hours = None
        info_score = 0.0
        if conf is not None:
            info_score += conf / 100.0
        if mfp is not None:
            info_score += 0.5 * (mfp if mfp > 0.5 else 1 - mfp)  # extremity
        items.append(
            {
                "signed_move": signed,
                "abs_move": abs(signed),
                "books": books,
                "hours": hours,
                "info_score": info_score,
                "pickType": r.get("pickType"),
                "sport": r.get("sport"),
                "clvVerdict": r.get("clvVerdict"),
            }
        )
    n = len(items)
    if n < 40:
        return {"status": "UNDERPOWERED", "n": n}

    def ols(xs, ys):
        if len(xs) < 10:
            return None, None, None
        mx, my = mean(xs), mean(ys)
        sxx = sum((x - mx) ** 2 for x in xs)
        if sxx <= 0:
            return None, None, None
        sxy = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
        slope = sxy / sxx
        # simple SE
        resid = [y - (my + slope * (x - mx)) for x, y in zip(xs, ys)]
        s2 = sum(e * e for e in resid) / max(len(xs) - 2, 1)
        se = math.sqrt(s2 / sxx) if sxx > 0 else None
        # R^2
        sst = sum((y - my) ** 2 for y in ys)
        r2 = 1 - (sum(e * e for e in resid) / sst) if sst > 0 else None
        adj_r2 = 1 - (1 - r2) * (n - 1) / max(n - 3, 1) if r2 is not None else None
        return slope, se, adj_r2

    # stratify by pickType — never mix points and total units... export lines are both in points
    by_pt = {}
    for pt in ("SPREAD", "MONEYLINE", "TOTAL"):
        sub = [it for it in items if it["pickType"] == pt]
        xs = [it["info_score"] for it in sub if it["info_score"] is not None]
        ys = [it["signed_move"] for it in sub if it["info_score"] is not None]
        xb = [it["books"] for it in sub if it["books"] is not None]
        yb = [it["signed_move"] for it in sub if it["books"] is not None]
        b_info, se_info, _ = ols(xs, ys)
        b_books, se_books, _ = ols(xb, yb)
        by_pt[pt] = {
            "n": len(sub),
            "info_slope": b_info,
            "info_se": se_info,
            "books_slope": b_books,
            "books_se": se_books,
            "ci_straddles_zero_info": (
                se_info is not None and b_info is not None and abs(b_info) <= 1.96 * se_info
            )
            if se_info is not None
            else None,
        }
    return {
        "status": "ok",
        "n_with_lock_close": n,
        "by_pickType": by_pt,
        "note": "Association only — never labeled public/sharp money (GSE2 clv-decomposition discipline).",
        "kill_line": "If info slope CI straddles 0 on all types, do not sell CLV as information evidence; keep dual denominators.",
        "replacement": "Replace single CLV headline with association report + population ladder (H2).",
    }


# ── H7: per-sport residual CRPS ──────────────────────────────────────────────

def h7_per_sport_crps():
    if not EXPORT.exists():
        return {"status": "DATA_BLOCKED"}
    rows = []
    for line in EXPORT.open(encoding="utf-8"):
        r = json.loads(line)
        if r.get("pickType") != "SPREAD":
            continue
        am = fnum(r.get("actualMargin"))
        pm = fnum(r.get("predictedMeanMargin"))
        if am is None or pm is None:
            continue
        if r.get("result") not in ("WIN", "LOSS", "PUSH"):
            continue
        rows.append({"sport": r.get("sport") or "?", "modelVersion": r.get("modelVersion") or "?", "am": am, "pm": pm, "resid": am - pm})
    if len(rows) < 30:
        return {"status": "UNDERPOWERED", "n": len(rows)}

    def crps_gauss(resids, sigma):
        if not resids or not sigma or sigma <= 0:
            return None
        # CRPS(N(mu,sig), y) with mu=0 for residual: E|X-y| - 0.5 E|X-X'| closed form
        # For residual r ~ N(0, sig): CRPS = sig * (1/sqrt(pi) - 2*phi(r/sig) + (r/sig)*(2*Phi(r/sig)-1)) averaged
        acc = 0.0
        for r in resids:
            z = r / sigma
            phi = math.exp(-0.5 * z * z) / math.sqrt(2 * math.pi)
            Phi = norm_cdf(z)
            acc += sigma * (1.0 / math.sqrt(math.pi) - 2.0 * phi + z * (2.0 * Phi - 1.0))
        return acc / len(resids)

    groups = defaultdict(list)
    for r in rows:
        groups[r["sport"]].append(r)
        groups[f"{r['sport']}|{r['modelVersion']}"].append(r)
        groups["ALL"].append(r)
    out = []
    for k, arr in sorted(groups.items()):
        if len(arr) < 20:
            continue
        resids = [r["resid"] for r in arr]
        sigma = pstdev(resids) if len(resids) > 1 else None
        crps = crps_gauss(resids, sigma)
        # baseline: always predict 0 margin (market-like weak baseline)
        crps0 = crps_gauss(resids, sigma if sigma else 1.0)
        out.append(
            {
                "group": k,
                "n": len(arr),
                "mean_resid": mean(resids),
                "sigma_resid": sigma,
                "crps_gaussian_residual": crps,
                "kill_line": "keep simplest sigma unless a stratum CRPS improves >=0.01 vs ALL-pooled on n>=150",
            }
        )
    return {
        "status": "ok",
        "source": "board-export SPREAD actualMargin/predictedMeanMargin",
        "groups": out,
        "replacement": "Mondrian per sport×modelVersion residual stores — never one global σ_game for product claims.",
    }


# ── H8: NFL moneyline market Brier vs base ───────────────────────────────────

def h8_ml_market_brier():
    if not GAMES.exists():
        return {"status": "DATA_BLOCKED"}
    pm, y = [], []
    by_season = defaultdict(lambda: {"pm": [], "y": []})
    for rec in csv.DictReader(GAMES.open(encoding="utf-8")):
        if (rec.get("game_type") or "REG") != "REG":
            continue
        hs, aw = fnum(rec.get("home_score")), fnum(rec.get("away_score"))
        ph = american_to_prob(rec.get("home_moneyline"))
        if hs is None or aw is None or ph is None:
            continue
        yy = 1 if hs > aw else 0 if hs < aw else None
        if yy is None:
            continue
        pm.append(ph)
        y.append(yy)
        s = rec.get("season") or "?"
        by_season[s]["pm"].append(ph)
        by_season[s]["y"].append(yy)
    b_mkt, n = brier(pm, y)
    b_base, _ = brier([mean(y)] * len(y), y) if y else (None, 0)
    b_50, _ = brier([0.5] * len(y), y)
    # juice-aware: market Brier on American ML is the natural no-skill baseline for engine ML
    return {
        "status": "ok",
        "n": n,
        "brier_market_ml": b_mkt,
        "brier_league_base": b_base,
        "brier_coin_0_5": b_50,
        "home_win_rate": mean(y) if y else None,
        "kill_line": "Engine ML must beat market-ml Brier by 0.002+ on n>=272 as-of; else withhold ML edge claims (already: ML CLV 14.2%, logit FIRE_NOTHING).",
        "replacement": (
            "Positive path: use market ML Brier as the frozen baseline scorecard target for MODEL_VERSION "
            "(Law 11). Engine does not need to invent a better p to publish — it needs to lose less information "
            "than noise on REALISED bits (H3) while ranking on marketFairProb."
        ),
        "season_brier_market": {
            s: brier(a["pm"], a["y"])[0] for s, a in sorted(by_season.items())
        },
    }


def main() -> int:
    sols = {
        "H1_asof_elo_vs_market": h1_asof_elo_vs_market(),
        "H2_clv_population_ladder": h2_clv_population_ladder(),
        "H3_information_edge_bits": h3_information_edge_bits(),
        "H4_turnover_occurrence_regressed": h4_turnover_occurrence(),
        "H5_rest_weather_totals": h5_rest_weather_totals(),
        "H6_clv_association": h6_clv_association(),
        "H7_per_sport_crps": h7_per_sport_crps(),
        "H8_nfl_ml_market_brier": h8_ml_market_brier(),
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "already_live_S1_S7": "out/solutions_battery.json",
    }
    write_report(OUT, sols)
    for k, v in sols.items():
        if k.startswith("generated") or k.startswith("already"):
            continue
        st = v.get("status") if isinstance(v, dict) else "?"
        extra = ""
        if k.startswith("H1"):
            extra = (
                f" elo={v.get('paired_brier_elo')} mkt_ml={v.get('paired_brier_market_ml')}"
                f" kill={v.get('kill_line_triggered')} verdict={v.get('verdict')}"
            )
        if k.startswith("H2"):
            extra = f" any52.4={v.get('any_population_reaches_52_4_n30')}"
        if k.startswith("H3"):
            inst = v.get("instruments") or []
            extra = " " + "; ".join(
                f"{i.get('label')}:{i.get('realised_bits')}" for i in inst if isinstance(i, dict)
            )
        if k.startswith("H8"):
            extra = f" mkt={v.get('brier_market_ml')} n={v.get('n')}"
        print(f"{k}: {st}{extra}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
