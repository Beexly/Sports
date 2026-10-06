#!/usr/bin/env python3
# PROVENANCE — gse-intelligence-build / coaching / build / build_tables.py
# Build-time data generator for the coaching tendency engine.
# Implements: corpus-intelligence/deep/c03/buildable-systems.md §1 (M01–M12 data tables).
# Research basis: 1575 (τ publication gate n>=25, 200-bootstrap uncertainty ritual);
#   0598 (permutation regime gate — weekly series feed); Paganetti situational splits
#   (2nd-&-1 anchors: 2025 20.6%, 2026 32.7%); 1638 (aggressiveness template —
#   script-elasticity as the NFL analog of initial-vs-final scheme).
#
# BUILD-TIME deps: pyarrow + numpy (reads the base pipeline's pbp_*.parquet).
# RUNTIME deps stay pure Python + numpy (tests/README.md rule 5): this script's
# outputs are plain CSVs under coaching/data/, read by the runtime via stdlib csv.
# The play filters come from coaching/common.py — the single source of truth —
# so build-time and runtime definitions can never disagree.
#
# Run:  cd ~/workspace/gse-intelligence-build && .venv/bin/python coaching/build/build_tables.py
"""Generate coaching/data/*.csv from nflverse pbp parquet (2022-2026)."""
import csv
import math
import os
import sys

import numpy as np
import pyarrow.parquet as pq

BUILD_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, BUILD_ROOT)

from coaching import common as C  # noqa: E402

DATA_IN = os.path.expanduser("~/workspace/coaching-tendencies/data")
DATA_OUT = os.path.join(BUILD_ROOT, "coaching", "data")
SEASONS = [2022, 2023, 2024, 2025, 2026]

COLS = ["season", "week", "game_id", "drive", "play_id", "posteam", "defteam",
        "down", "ydstogo", "yardline_100", "play_type", "pass_attempt",
        "rush_attempt", "qb_dropback", "qb_kneel", "qb_spike", "aborted_play",
        "shotgun", "no_huddle", "air_yards", "wp", "epa", "sack", "qb_hit",
        "tackled_for_loss", "timeout", "timeout_team", "game_seconds_remaining",
        "qtr", "touchdown", "two_point_attempt"]


def f(v, default=0.0):
    """Float-or-default (nflverse NULLs -> 0 for flag/count columns)."""
    if v is None:
        return default
    try:
        x = float(v)
    except (TypeError, ValueError):
        return default
    return default if math.isnan(x) else x


def load_season(season):
    t = pq.read_table(os.path.join(DATA_IN, f"pbp_{season}.parquet"), columns=COLS)
    rows = t.to_pylist()
    for r in rows:
        r["season"] = season
    return rows


def write_csv(name, fieldnames, rows):
    path = os.path.join(DATA_OUT, name)
    with open(path, "w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=fieldnames)
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k, "") for k in fieldnames})
    print(f"wrote {path} ({len(rows)} rows)")


def main():
    os.makedirs(DATA_OUT, exist_ok=True)
    plays = []
    for s in SEASONS:
        plays.extend(load_season(s))
    print(f"loaded {len(plays)} plays")

    scr = [p for p in plays if C.is_scrimmage_play(p)]
    print(f"scrimmage plays: {len(scr)}")

    # ---- cell counts per (season, team, down_group, ydstogo_bin): LOYO base ----
    cells = {}
    for p in scr:
        dg = C.down_group(p.get("down"))
        yb = C.ydstogo_bin(p.get("ydstogo"))
        if dg is None or yb is None:
            continue
        key = (p["season"], p["posteam"], dg, yb)
        c = cells.setdefault(key, [0.0, 0.0, 0])
        c[0] += f(p.get("pass_attempt"))
        c[1] += f(p.get("rush_attempt"))
        c[2] += 1
    write_csv("pass_rate_cells.csv",
              ["season", "team", "down_group", "ydstogo_bin", "n_pass", "n_rush", "n_plays"],
              [dict(season=k[0], team=k[1], down_group=k[2], ydstogo_bin=k[3],
                    n_pass=v[0], n_rush=v[1], n_plays=v[2])
               for k, v in sorted(cells.items())])

    # ---- M01: PROE (neutral-script early-down pass rate over LOYO expectation) ----
    neutral_early = [p for p in scr
                     if C.is_early_down(p) and C.is_neutral_script(p)]
    team_plays = {}
    for p in neutral_early:
        dg, yb = "early", C.ydstogo_bin(p.get("ydstogo"))
        if yb is None:
            continue
        key = (p["season"], p["posteam"], yb)
        c = team_plays.setdefault(key, [0.0, 0.0, 0])
        c[0] += f(p.get("pass_attempt"))
        c[1] += f(p.get("rush_attempt"))
        c[2] += 1
    # league cell totals per (season, yb) for LOYO
    league = {}
    for (season, team, yb), (np_, nr_, n_) in team_plays.items():
        L = league.setdefault((season, yb), [0.0, 0.0])
        L[0] += np_
        L[1] += nr_
    # aggregate per (season, team)
    agg = {}
    for (season, team, yb), (np_, nr_, n_) in team_plays.items():
        a = agg.setdefault((season, team), {"np": 0.0, "nr": 0.0, "exp_num": 0.0, "exp_den": 0.0})
        a["np"] += np_
        a["nr"] += nr_
        L = league[(season, yb)]
        loyo = C.safe_div(L[0] - np_, (L[0] - np_) + (L[1] - nr_))
        w = np_ + nr_
        if not math.isnan(loyo):
            a["exp_num"] += loyo * w
            a["exp_den"] += w
    k_med = float(np.median([a["np"] + a["nr"] for a in agg.values()])) if agg else 200.0
    proe_rows = []
    for (season, team), a in sorted(agg.items()):
        n = a["np"] + a["nr"]
        actual = C.pass_rate(a["np"], a["nr"])
        expected = C.safe_div(a["exp_num"], a["exp_den"])
        raw = actual - expected if not (math.isnan(actual) or math.isnan(expected)) else math.nan
        proe_rows.append(dict(
            season=season, team=team, n_plays=int(n),
            pass_rate_actual=round(actual, 6) if not math.isnan(actual) else "",
            pass_rate_expected=round(expected, 6) if not math.isnan(expected) else "",
            proe_raw=round(raw, 6) if not math.isnan(raw) else "",
            proe=round(C.empbayes_shrink(raw, n, k_med), 6) if not math.isnan(raw) else "",
            proe_se=round(C.rate_se(actual, n), 6) if not math.isnan(actual) else "",
        ))
    write_csv("proe_early_neutral.csv",
              ["season", "team", "n_plays", "pass_rate_actual", "pass_rate_expected",
               "proe_raw", "proe", "proe_se"], proe_rows)
    print(f"PROE EB k (league-median n) = {k_med:.1f}")

    # ---- weekly tendencies (regime-gate + adjustments feed) ----
    wk = {}
    for p in scr:
        key = (p["season"], p["week"], p["posteam"])
        w = wk.setdefault(key, {"n": 0, "ep": 0.0, "er": 0.0, "sg": 0.0,
                                "nh": 0.0, "ay": [], "pa": 0.0, "pr": 0.0})
        w["n"] += 1
        if C.is_early_down(p):
            w["ep"] += f(p.get("pass_attempt"))
            w["er"] += f(p.get("rush_attempt"))
        w["sg"] += f(p.get("shotgun"))
        w["nh"] += f(p.get("no_huddle"))
        ay = p.get("air_yards")
        if C.is_pass_attempt(p) and ay is not None:
            try:
                x = float(ay)
                if not math.isnan(x):
                    w["ay"].append(x)
            except (TypeError, ValueError):
                pass
        w["pa"] += f(p.get("pass_attempt"))
        w["pr"] += f(p.get("rush_attempt"))
    wk_rows = []
    for (season, week, team), w in sorted(wk.items()):
        ay = w["ay"]
        wk_rows.append(dict(
            season=season, week=week, team=team, n_plays=w["n"],
            early_down_pass_rate=round(C.pass_rate(w["ep"], w["er"]), 4),
            shotgun_rate=round(C.safe_div(w["sg"], w["n"]), 4),
            no_huddle_rate=round(C.safe_div(w["nh"], w["n"]), 4),
            quick_game_rate=round(float(np.mean([x <= 5 for x in ay])), 4) if ay else "",
            avg_air_yards=round(float(np.mean(ay)), 4) if ay else "",
            pass_rate_all=round(C.pass_rate(w["pa"], w["pr"]), 4),
        ))
    write_csv("weekly_tendencies.csv",
              ["season", "week", "team", "n_plays", "early_down_pass_rate",
               "shotgun_rate", "no_huddle_rate", "quick_game_rate",
               "avg_air_yards", "pass_rate_all"], wk_rows)

    # ---- M08: first-order sequencing (same game+drive, prev play = run) ----
    by_game = {}
    for p in scr:
        by_game.setdefault((p["season"], p["game_id"]), []).append(p)
    seq = {}
    for (season, gid), gp in by_game.items():
        gp.sort(key=lambda p: (f(p.get("drive")), f(p.get("play_id"))))
        prev = None
        for p in gp:
            if prev is not None and prev.get("drive") == p.get("drive") \
                    and p.get("down") in (2, 3):
                if prev.get("play_type") == "run":
                    epa = prev.get("epa")
                    try:
                        succ = float(epa) > 0
                    except (TypeError, ValueError):
                        succ = False
                    key = (season, p["posteam"], p["down"], succ)
                    s = seq.setdefault(key, [0, 0])
                    s[1] += 1
                    if p.get("play_type") == "pass":
                        s[0] += 1
            prev = p
    seq_rows = []
    tmp = {}
    for (season, team, down, succ), (np_, n_) in seq.items():
        tmp.setdefault((season, team, down), {})[succ] = (np_, n_)
    for (season, team, down), d in sorted(tmp.items()):
        s1, s0 = d.get(True, (0, 0)), d.get(False, (0, 0))
        p1 = C.safe_div(s1[0], s1[1])
        p0 = C.safe_div(s0[0], s0[1])
        contrast = p1 - p0 if not (math.isnan(p1) or math.isnan(p0)) else math.nan
        se = math.sqrt(C.rate_se(p1, s1[1]) ** 2 + C.rate_se(p0, s0[1]) ** 2) \
            if not (math.isnan(p1) or math.isnan(p0)) else math.nan
        seq_rows.append(dict(
            season=season, team=team, down=down, n_pairs=s1[1] + s0[1],
            p_pass_after_succ_run=round(p1, 4) if not math.isnan(p1) else "",
            p_pass_after_fail_run=round(p0, 4) if not math.isnan(p0) else "",
            contrast=round(contrast, 4) if not math.isnan(contrast) else "",
            contrast_se=round(se, 4) if not math.isnan(se) else "",
        ))
    write_csv("sequencing.csv",
              ["season", "team", "down", "n_pairs", "p_pass_after_succ_run",
               "p_pass_after_fail_run", "contrast", "contrast_se"], seq_rows)

    # ---- M06: script elasticity (OLS slope of early-down pass rate on WP bin) ----
    el = {}
    for p in scr:
        if not C.is_early_down(p):
            continue
        wp = p.get("wp")
        try:
            wp = float(wp)
        except (TypeError, ValueError):
            continue
        if math.isnan(wp):
            continue
        b = min(int(wp * 10), 9)
        key = (p["season"], p["posteam"], b)
        e = el.setdefault(key, [0.0, 0.0])
        e[0] += f(p.get("pass_attempt"))
        e[1] += f(p.get("rush_attempt"))
    el_rows = []
    eb = {}
    for (season, team, b), (np_, nr_) in el.items():
        eb.setdefault((season, team), []).append((b, np_, nr_))
    for (season, team), bins in sorted(eb.items()):
        xs, ys, ws = [], [], []
        nplays = 0
        for b, np_, nr_ in bins:
            n = np_ + nr_
            nplays += n
            if n >= 5:
                xs.append(b / 10.0 + 0.05)
                ys.append(np_ / n)
                ws.append(n)
        beta = float(np.polyfit(xs, ys, 1, w=ws)[0]) if len(xs) >= 4 else math.nan
        el_rows.append(dict(season=season, team=team,
                            beta_script=round(beta, 4) if not math.isnan(beta) else "",
                            n_plays=int(nplays)))
    write_csv("script_elasticity.csv",
              ["season", "team", "beta_script", "n_plays"], el_rows)

    # ---- M05: red-zone mix + RZ PROE ----
    rz = [p for p in scr if f(p.get("yardline_100"), 999) <= 20]
    rz_cells = {}
    for p in rz:
        dg = C.down_group(p.get("down"))
        yb = C.ydstogo_bin(p.get("ydstogo"))
        if dg is None or yb is None:
            continue
        key = (p["season"], p["posteam"], dg, yb)
        c = rz_cells.setdefault(key, [0.0, 0.0, 0])
        c[0] += f(p.get("pass_attempt"))
        c[1] += f(p.get("rush_attempt"))
        c[2] += 1
    rz_league = {}
    for (season, team, dg, yb), (np_, nr_, n_) in rz_cells.items():
        L = rz_league.setdefault((season, dg, yb), [0.0, 0.0])
        L[0] += np_
        L[1] += nr_
    rz_agg, gtg = {}, {}
    for (season, team, dg, yb), (np_, nr_, n_) in rz_cells.items():
        a = rz_agg.setdefault((season, team), {"np": 0.0, "nr": 0.0, "en": 0.0, "ed": 0.0})
        a["np"] += np_
        a["nr"] += nr_
        L = rz_league[(season, dg, yb)]
        loyo = C.safe_div(L[0] - np_, (L[0] - np_) + (L[1] - nr_))
        w = np_ + nr_
        if not math.isnan(loyo):
            a["en"] += loyo * w
            a["ed"] += w
    for p in rz:
        if f(p.get("yardline_100"), 999) <= 10:
            g = gtg.setdefault((p["season"], p["posteam"]), [0.0, 0.0])
            g[0] += f(p.get("pass_attempt"))
            g[1] += f(p.get("rush_attempt"))
    rz_rows = []
    for (season, team), a in sorted(rz_agg.items()):
        n = a["np"] + a["nr"]
        actual = C.pass_rate(a["np"], a["nr"])
        expected = C.safe_div(a["en"], a["ed"])
        raw = actual - expected if not (math.isnan(actual) or math.isnan(expected)) else math.nan
        g = gtg.get((season, team), [0.0, 0.0])
        rz_rows.append(dict(
            season=season, team=team, n_rz_plays=int(n),
            rz_pass_rate=round(actual, 4) if not math.isnan(actual) else "",
            rz_proe=round(C.empbayes_shrink(raw, n, 60.0), 4) if not math.isnan(raw) else "",
            rz_proe_se=round(C.rate_se(actual, n), 4) if not math.isnan(actual) else "",
            gtg_pass_rate=round(C.pass_rate(g[0], g[1]), 4),
            n_gtg_plays=int(g[0] + g[1]),
        ))
    write_csv("rz_mix.csv",
              ["season", "team", "n_rz_plays", "rz_pass_rate", "rz_proe",
               "rz_proe_se", "gtg_pass_rate", "n_gtg_plays"], rz_rows)

    # ---- 2nd-and-short pass rates (Paganetti anchors) ----
    s2 = {}
    for p in scr:
        if p.get("down") == 2:
            y = f(p.get("ydstogo"), 999)
            for label, ok in (("2n1", y == 1), ("2n_short", y <= 3)):
                if ok:
                    key = (p["season"], p["posteam"], label)
                    c = s2.setdefault(key, [0.0, 0.0])
                    c[0] += f(p.get("pass_attempt"))
                    c[1] += f(p.get("rush_attempt"))
    write_csv("second_and_short.csv", ["season", "team", "situation", "n_plays", "pass_rate"],
              [dict(season=k[0], team=k[1], situation=k[2], n_plays=int(v[0] + v[1]),
                    pass_rate=round(C.pass_rate(v[0], v[1]), 4))
               for k, v in sorted(s2.items())])

    # ---- M09: tempo ----
    by_gd = {}
    for p in scr:
        by_gd.setdefault((p["season"], p["game_id"], p["drive"], p["posteam"]), []).append(p)
    diffs, hurry = {}, {}
    for (season, gid, drive, team), gp in by_gd.items():
        gp.sort(key=lambda p: f(p.get("game_seconds_remaining"), 9999), reverse=True)
        s = [f(p.get("game_seconds_remaining"), math.nan) for p in gp]
        d = [a - b for a, b in zip(s[:-1], s[1:])
             if not (math.isnan(a) or math.isnan(b)) and 4 < (a - b) < 120]
        diffs.setdefault((season, team), []).extend(d)
        for p in gp:
            wp = p.get("wp")
            try:
                wp = float(wp)
            except (TypeError, ValueError):
                continue
            if math.isnan(wp) or wp >= 0.35:
                continue
            gsr = f(p.get("game_seconds_remaining"), 9999)
            if gsr < 300 and p.get("qtr") in (2, 4):
                h = hurry.setdefault((season, team), [0, 0])
                h[1] += 1
                if f(p.get("no_huddle")) == 1:
                    h[0] += 1
    tempo_rows = []
    for (season, team), d in sorted(diffs.items()):
        h = hurry.get((season, team), [0, 0])
        tempo_rows.append(dict(
            season=season, team=team,
            pace_p25=round(float(np.percentile(d, 25)), 1) if d else "",
            pace_med=round(float(np.median(d)), 1) if d else "",
            pace_p75=round(float(np.percentile(d, 75)), 1) if d else "",
            hurryup_rate=round(C.safe_div(h[0], h[1]), 4),
            n_diffs=len(d)))
    write_csv("tempo.csv",
              ["season", "team", "pace_p25", "pace_med", "pace_p75",
               "hurryup_rate", "n_diffs"], tempo_rows)

    # ---- M11: DC pressure by down/distance (outcome proxies, labeled) ----
    dcp = {}
    for p in scr:
        if p.get("down") not in (1, 2, 3) or not p.get("defteam"):
            continue
        yb = C.ydstogo_bin(p.get("ydstogo"))
        if yb is None:
            continue
        key = (p["season"], p["defteam"], p["down"], yb)
        d = dcp.setdefault(key, [0.0, 0.0, 0.0, 0])
        if f(p.get("qb_dropback")) == 1:
            d[2] += 1
            d[0] += f(p.get("sack")) + f(p.get("qb_hit"))
        if f(p.get("rush_attempt")) == 1:
            d[1] += f(p.get("tackled_for_loss"))
        d[3] += 1
    write_csv("dc_pressure.csv",
              ["season", "team", "down", "dist_bin", "pressure_proxy",
               "tfl_rate_vs_rush_proxy", "n_dropbacks", "proxy_label"],
              [dict(season=k[0], team=k[1], down=k[2], dist_bin=k[3],
                    pressure_proxy=round(C.safe_div(v[0], v[2]), 4),
                    tfl_rate_vs_rush_proxy="",
                    n_dropbacks=int(v[2]),
                    proxy_label="outcome-not-frequency")
               for k, v in sorted(dcp.items())])

    # ---- M12: timeouts (descriptive; challenge fields not in pbp -> not emitted) ----
    to, games = {}, {}
    for p in scr:
        if f(p.get("timeout")) == 1 and p.get("timeout_team"):
            key = (p["season"], p["timeout_team"])
            t = to.setdefault(key, [0, 0])
            t[0] += 1
            gsr = f(p.get("game_seconds_remaining"), 9999)
            after_2mw = p.get("qtr") in (2, 4) and gsr <= 120
            if not after_2mw:
                t[1] += 1
    for p in scr:
        games.setdefault((p["season"], p["posteam"]), set()).add(p["game_id"])
        games.setdefault((p["season"], p["defteam"]), set()).add(p["game_id"])
    write_csv("timeouts.csv",
              ["season", "team", "timeouts_per_game", "share_before_2mw",
               "n_games", "challenge_note"],
              [dict(season=k[0], team=k[1],
                    timeouts_per_game=round(C.safe_div(v[0], len(games.get(k, {1}))), 3),
                    share_before_2mw=round(C.safe_div(v[1], v[0]), 3),
                    n_games=len(games.get(k, set())),
                    challenge_note="challenge fields not in nflverse pbp; not emitted")
               for k, v in sorted(to.items())])

    # ---- M10: weekly adjustment scores (Mahalanobis vs season-to-date baseline) ----
    wk_lookup = {(r["season"], r["week"], r["team"]): r for r in wk_rows}
    adj_rows = []
    seasons_teams = sorted({(r["season"], r["team"]) for r in wk_rows})
    for season, team in seasons_teams:
        weeks = sorted(w for (s, w, t) in wk_lookup if s == season and t == team)
        hist = []
        for w_ in weeks:
            r = wk_lookup[(season, w_, team)]
            try:
                vec = [float(r["quick_game_rate"]), float(r["avg_air_yards"]) / 10.0,
                       float(r["shotgun_rate"]), float(r["early_down_pass_rate"]),
                       float(r["no_huddle_rate"])]
            except (TypeError, ValueError):
                continue
            if hist:
                base = np.mean(hist, axis=0)
                harr = np.array(hist)
                sd = np.std(harr, axis=0) if len(hist) > 1 else np.ones(5)
                sd = np.where(sd == 0, 1.0, sd)
                dist = float(np.sqrt(np.sum(((np.array(vec) - base) / sd) ** 2)))
                deltas = {k: round(float(vec[i] - base[i]), 4) for i, k in enumerate(
                    ["quick_game_rate", "avg_air_yards_x10", "shotgun_rate",
                     "early_down_pass_rate", "no_huddle_rate"])}
                adj_rows.append(dict(season=season, team=team, week=w_,
                                     mahal_dist=round(dist, 4),
                                     delta_json=str(deltas)))
            hist.append(vec)
    # percentile ranks within season
    by_season = {}
    for r in adj_rows:
        by_season.setdefault(r["season"], []).append(r["mahal_dist"])
    for r in adj_rows:
        dists = sorted(by_season[r["season"]])
        r["pct_rank"] = round(sum(1 for d in dists if d <= r["mahal_dist"]) / len(dists), 4)
    write_csv("adjustments.csv",
              ["season", "team", "week", "mahal_dist", "pct_rank", "delta_json",
               "context_note"],
              [dict(**r, context_note="OL-injury / opp-pass-rush tags: nullable until OL lane lands")
               for r in adj_rows])

    print("done.")


if __name__ == "__main__":
    main()
