#!/usr/bin/env python3
"""Coverage Vulnerability Index (CVI) walk-forward test.  DIAGNOSTIC ONLY.  mu = close; CVI only
modulates the predictive SCALE: scale *= (1 + gamma * CVI_game), gamma fitted by MLE on strictly
earlier games.  Never moves mu.  Not wired into emission.

CVI_D(g) = (cascade_count / 4) * (opp_deep_rate / league_avg) * backup_quality_multiplier
for defense D in game g at kickoff t.  CVI_game = CVI_home_defense + CVI_away_defense.

Definitions (recorded in cvi_result.json):
  window          D's last W_DEF=4 games strictly before g (snap_counts, any season).
  residual        a DB's snap-adjusted residual = trailing mean defense_pct over the window (absent
                  game = 0) minus STARTER_THR = 0.60.
  starter slots   top-2 CB (position CB) and top-2 S (S/FS/SS) by trailing share = 4 slots.
  cascaded slot   residual < 0 (slot already held by a below-threshold player), OR the slot's
                  starter has an nflverse injury row for (season, week, D) with date_modified <= t and
                  report_status in {Out, Doubtful} or practice_status in {DNP, Limited}.
  backup_quality  mean over cascaded slots of: injury slot -> starter_share / backup_share (backup =
                  next-highest non-starter in the group); below-threshold slot -> STARTER_THR / share;
                  clipped to [1, 3]; a slot whose replacement has no snaps contributes 1.0.  This is a
                  SNAP-SHARE proxy for quality, not a coverage-performance residual: no per-defender
                  coverage outcome is available from real data in this repo for 2016-2025.
  opp_deep_rate   opponent offense's deep targets (pass_attempt==1 and air_yards>=20) per dropback
                  (qb_dropback==1) over its last W_OFF=8 games strictly before g (nflverse PBP).
  league_avg      the same rate over every team's plays in games strictly before g, last 365 days.
Fail-closed: a game with fewer than 4 prior defensive games or no prior offensive PBP for either side
gets CVI = None and is excluded from the CVI-filtered set (the without-CVI baseline is scored on the
same filtered set).  Injury rows lacking date_modified (nflverse 2025) are rejected at ingest, so the
injury branch is empty for 2025: CVI there reflects only below-threshold slots.
"""
import csv, json, math, os, sys, collections, bisect
from datetime import datetime, timedelta
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(os.path.dirname(HERE), "ingest"))
import wf_models as wm  # noqa: E402
from schedule_meta import kickoff_utc  # noqa: E402

CACHE = os.environ.get("NFLVERSE_CACHE", "/workspace/nflverse_cache")
ROOT = os.path.dirname(os.path.dirname(HERE))
PBP_DIRS = [CACHE, os.path.join(ROOT, "intelligence", "coaching", "data")]
W_DEF, W_OFF, STARTER_THR = 4, 8, 0.60
BAD_REPORT = {"Out", "Doubtful"}
BAD_PRACTICE = {"Did Not Participate In Practice", "Limited Participation in Practice"}
GAMMA_GRID = np.round(np.arange(-0.5, 1.5001, 0.01), 2)
CB, SAF = {"CB"}, {"S", "FS", "SS"}


def _iso(dt):
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def load_games(games_csv, lo, hi):
    out = []
    for g in csv.DictReader(open(games_csv, encoding="utf-8")):
        if lo <= int(g["season"]) <= hi and g["result"] not in ("", "NA"):
            ko = kickoff_utc(g)
            if ko:
                out.append({"game_id": g["game_id"], "season": int(g["season"]), "week": int(g["week"]),
                            "home": g["home_team"], "away": g["away_team"], "ko": ko})
    return sorted(out, key=lambda x: x["ko"])


def build_cvi(games_csv, seasons):
    lo, hi = min(seasons), max(seasons)
    G = load_games(games_csv, lo - 1, hi)
    ko = {g["game_id"]: g["ko"] for g in G}
    # crosswalk pfr -> gsis
    xw = {r["pfr_id"]: r["gsis_id"] for r in csv.DictReader(open(os.path.join(CACHE, "players.csv"), encoding="utf-8"))
          if r.get("pfr_id") not in (None, "", "NA") and r.get("gsis_id") not in (None, "", "NA")}
    # snap counts: per (team, game) -> {pfr: (pos, pct)}
    snaps = collections.defaultdict(dict)
    for y in range(lo - 1, hi + 1):
        p = os.path.join(CACHE, f"snap_counts_{y}.csv")
        if not os.path.exists(p): continue
        for r in csv.DictReader(open(p, encoding="utf-8")):
            if r["game_id"] in ko and r["defense_pct"] not in ("", "NA"):
                snaps[(r["team"], r["game_id"])][r["pfr_player_id"]] = (r["position"], float(r["defense_pct"]))
    team_games = collections.defaultdict(list)
    for g in G:
        for t in (g["home"], g["away"]):
            if (t, g["game_id"]) in snaps:
                team_games[t].append(g["game_id"])
    # injuries: (season, week, team) -> gsis -> list[(date_modified, report, practice)]
    inj = collections.defaultdict(lambda: collections.defaultdict(list))
    for y in range(lo - 1, hi + 1):
        p = os.path.join(CACHE, f"injuries_{y}.csv")
        if not os.path.exists(p): continue
        for r in csv.DictReader(open(p, encoding="utf-8")):
            if r.get("date_modified") in (None, "", "NA"):
                continue
            inj[(int(r["season"]), int(r["week"]), r["team"])][r["gsis_id"]].append(
                (r["date_modified"], r.get("report_status", ""), r.get("practice_status", "")))
    # PBP deep rate per (team, game)
    import pyarrow.parquet as pq
    off = {}
    for y in range(lo - 1, hi + 1):
        path = next((os.path.join(d, f"play_by_play_{y}.parquet") for d in PBP_DIRS
                     if os.path.exists(os.path.join(d, f"play_by_play_{y}.parquet"))), None)
        if not path: continue
        t = pq.read_table(path, columns=["game_id", "posteam", "pass_attempt", "air_yards", "qb_dropback"]).to_pandas()
        t = t[t["posteam"].notna()]
        t["deep"] = ((t["pass_attempt"] == 1) & (t["air_yards"] >= 20)).astype(int)
        t["db"] = (t["qb_dropback"] == 1).astype(int)
        for (gid, team), s in t.groupby(["game_id", "posteam"])[["deep", "db"]].sum().iterrows():
            if gid in ko:
                off[(team, gid)] = (int(s["deep"]), int(s["db"]))
    off_games = collections.defaultdict(list)
    for g in G:
        for t in (g["home"], g["away"]):
            if (t, g["game_id"]) in off: off_games[t].append(g["game_id"])
    league = sorted(((ko[gid], v) for (t, gid), v in off.items()), key=lambda x: x[0])
    lk = [x[0] for x in league]
    cum_d = np.cumsum([v[0] for _, v in league]); cum_b = np.cumsum([v[1] for _, v in league])

    def league_avg(t):
        i = bisect.bisect_left(lk, t); j = bisect.bisect_left(lk, t - timedelta(days=365))
        if i == 0 or i <= j: return None
        d = cum_d[i - 1] - (cum_d[j - 1] if j else 0); b = cum_b[i - 1] - (cum_b[j - 1] if j else 0)
        return d / b if b else None

    def defense_cvi(D, O, g):
        t = g["ko"]
        prior = [gid for gid in team_games[D] if ko[gid] < t][-W_DEF:]
        oprior = [gid for gid in off_games[O] if ko[gid] < t][-W_OFF:]
        if len(prior) < W_DEF or not oprior:
            return None
        share = collections.defaultdict(float); pos = {}
        for gid in prior:
            for pid, (p, pct) in snaps[(D, gid)].items():
                share[pid] += pct / W_DEF; pos[pid] = p
        rec = inj.get((g["season"], g["week"], D), {})
        cascade, mults, inj_hits = 0, [], 0
        for grp in (CB, SAF):
            ranked = sorted((pid for pid in share if pos[pid] in grp), key=lambda p: -share[p])
            starters, bench = ranked[:2], ranked[2:]
            for k in range(2):
                if k >= len(starters):
                    cascade += 1; mults.append(1.0); continue  # empty slot: no player at all
                s = starters[k]; sh = share[s]
                rows = [x for x in rec.get(xw.get(s, ""), []) if x[0] <= _iso(t)]
                listed = bool(rows) and (max(rows)[1] in BAD_REPORT or max(rows)[2] in BAD_PRACTICE)
                if listed:
                    cascade += 1; inj_hits += 1
                    b = bench.pop(0) if bench else None
                    bs = share[b] if b else 0.0
                    mults.append(1.0 if bs <= 0 else min(3.0, max(1.0, sh / bs)))
                elif sh - STARTER_THR < 0:
                    cascade += 1
                    mults.append(1.0 if sh <= 0 else min(3.0, max(1.0, STARTER_THR / sh)))
        d = sum(off[(O, x)][0] for x in oprior); b = sum(off[(O, x)][1] for x in oprior)
        la = league_avg(t)
        if not b or not la:
            return None
        mult = sum(mults) / len(mults) if mults else 1.0
        return {"cvi": (cascade / 4) * ((d / b) / la) * mult, "cascade": cascade, "inj_hits": inj_hits,
                "deep_ratio": (d / b) / la, "mult": mult}

    out = {}
    for g in G:
        if g["season"] < lo: continue
        h = defense_cvi(g["home"], g["away"], g); a = defense_cvi(g["away"], g["home"], g)
        out[g["game_id"]] = None if (h is None or a is None) else {"cvi": h["cvi"] + a["cvi"], "home": h, "away": a}
    return out


# ---------------- scale-modulated scoring ----------------
def _nll_gauss(r, s):
    return float(np.sum(np.log(s) + 0.5 * (r / s) ** 2))


def _nll_nmix(r, p, f):
    s1, s2 = p["s1"] * f, p["s2"] * f
    l = p["pi"] * np.exp(-0.5 * (r / s1) ** 2) / s1 + (1 - p["pi"]) * np.exp(-0.5 * (r / s2) ** 2) / s2
    return float(-np.sum(np.log(l)))


def fit_gamma(r, c, nll):
    best = None
    for g in GAMMA_GRID:
        f = 1 + g * c
        if np.any(f <= 0.05): continue
        v = nll(r, f)
        if best is None or v < best[1]: best = (float(g), v)
    return best[0] if best else 0.0


def harness(rows, cvi, sigma_fixed=13.45):
    """rows: dicts with game_id, season, week, S, Y.  Scores seasons after the first; weekly refit."""
    rows = sorted(rows, key=lambda g: (g["season"], g["week"], g["game_id"]))
    warm = rows[0]["season"]
    R, C = [], []           # earlier residuals (all) and (residual, cvi) for CVI-available games
    res = collections.defaultdict(list); seasons = []; gam = {}
    n_scored_all = 0; n_cvi_pos = 0
    for block in wm._weeks(rows):
        if block[0]["season"] != warm and R:
            r_all = np.array(R)
            nm = wm.fit_norm_mix(r_all)
            if C:
                rc = np.array([x[0] for x in C]); cc = np.array([x[1] for x in C])
                gG = fit_gamma(rc, cc, lambda r, f: _nll_gauss(r, sigma_fixed * f))
                gN = fit_gamma(rc, cc, lambda r, f: _nll_nmix(r, nm, f))
            else:
                gG = gN = 0.0
            gam = {"gaussian_13.45": gG, "normal_mixture_2": gN, "n_train_cvi": len(C), "nm": nm}
            for g in block:
                n_scored_all += 1
                c = cvi.get(g["game_id"])
                if c is None: continue
                cv = c["cvi"]; n_cvi_pos += cv > 0
                mu, x = g["S"], g["Y"]; seasons.append(g["season"])
                fG, fN = 1 + gG * cv, 1 + gN * cv
                res["gaussian_13.45"].append(wm.crps_numeric(lambda y: wm.cdf_normal(y - mu, sigma_fixed), x))
                res["gaussian_13.45+cvi"].append(wm.crps_numeric(lambda y: wm.cdf_normal(y - mu, sigma_fixed * fG), x))
                pN = {"pi": nm["pi"], "s1": nm["s1"], "s2": nm["s2"]}
                pNc = {"pi": nm["pi"], "s1": nm["s1"] * fN, "s2": nm["s2"] * fN}
                res["normal_mixture_2"].append(wm.crps_numeric(lambda y: wm.cdf_norm_mix(y - mu, pN), x))
                res["normal_mixture_2+cvi"].append(wm.crps_numeric(lambda y: wm.cdf_norm_mix(y - mu, pNc), x))
                for lvl in (0.5, 0.8, 0.9):
                    zq = {0.5: 0.6745, 0.8: 1.2816, 0.9: 1.6449}[lvl]
                    res[f"cov{int(lvl*100)}_gauss"].append(abs(x - mu) <= zq * sigma_fixed)
                    res[f"cov{int(lvl*100)}_gauss_cvi"].append(abs(x - mu) <= zq * sigma_fixed * fG)
        for g in block:
            R.append(g["Y"] - g["S"])
            c = cvi.get(g["game_id"])
            if c is not None: C.append((g["Y"] - g["S"], c["cvi"]))
    m = lambda v: round(float(np.mean(v)), 4) if len(v) else None
    n = len(res["gaussian_13.45"])
    out = {"n_scored_all": n_scored_all, "n_cvi_filtered": n, "cvi_coverage": round(n / n_scored_all, 4) if n_scored_all else None,
           "share_cvi_positive": round(n_cvi_pos / n, 4) if n else None, "warmup_season": warm,
           "scored_seasons": sorted(set(seasons)), "crps": {}, "per_season": {}, "interval_coverage": {},
           "gamma_final_window": {k: v for k, v in gam.items() if k != "nm"}}
    for k in ("gaussian_13.45", "gaussian_13.45+cvi", "normal_mixture_2", "normal_mixture_2+cvi"):
        out["crps"][k] = m(res[k])
        out["per_season"][k] = {str(s): m([v for v, ss in zip(res[k], seasons) if ss == s]) for s in sorted(set(seasons))}
    out["delta_cvi_vs_without"] = {"gaussian_13.45": round(out["crps"]["gaussian_13.45"] - out["crps"]["gaussian_13.45+cvi"], 4),
                                   "normal_mixture_2": round(out["crps"]["normal_mixture_2"] - out["crps"]["normal_mixture_2+cvi"], 4)}
    out["delta_vs_same_games_gaussian_13.45"] = {k: round(out["crps"]["gaussian_13.45"] - out["crps"][k], 4) for k in out["crps"]}
    for lvl in (50, 80, 90):
        out["interval_coverage"][f"{lvl}%"] = {"gaussian_13.45": m(res[f"cov{lvl}_gauss"]), "gaussian_13.45+cvi": m(res[f"cov{lvl}_gauss_cvi"])}
    return out


def run(out_path=os.path.join(HERE, "cvi_result.json"), games_csv="/workspace/games.csv"):
    import hashlib, time
    import wf_margin_crps as w
    _, mrows = w.load_rows(w.DEFAULT_MANIFEST)
    crow = w.load_nflverse_csv(games_csv, 2016, 2025)
    cv = build_cvi(games_csv, range(2016, 2026))
    man = harness(mrows, cv); cc = harness(crow, cv)

    def gate(b):  # CVI variants only; the no-CVI models are the comparison, not candidates
        best = min((k for k in b["crps"] if k.endswith("+cvi")), key=b["crps"].get)
        ok = b["n_cvi_filtered"] >= 150 and b["crps"][best] <= w.ABS_BAR and b["delta_vs_same_games_gaussian_13.45"][best] >= w.DELTA_BAR
        return best, ok
    bm, tech = gate(man)
    cc_ok = gate(cc)[1]
    adds = man["delta_cvi_vs_without"][bm.replace("+cvi", "")]
    okm = bool(tech and cc_ok and adds > 0)
    if okm:
        status = "CLEARED (provisional, diagnostic)"
    elif tech:
        status = (f"NOT CLEARED: technical pass on manifest only, inherited from {bm.replace('+cvi', '')} "
                  f"(CVI itself changes CRPS by {adds:+.4f}); nflverse cross-check "
                  f"{'above 7.099' if not cc_ok else 'passes'}")
    else:
        status = "NOT CLEARED"
    out = {"label": "DIAGNOSTIC -- CVI scale modulation; mu = close; not wired; nothing promoted",
           "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
           "gate_status": status, "technical_pass_manifest": tech,
           "passed": okm, "gate_rule": "a +CVI model with n >= 150 on the CVI-filtered set AND CRPS <= 7.099 (unreproduced bar) AND beats same-games Gaussian 13.45 by >= 0.01; status also requires the nflverse cross-check to pass and CVI to improve on its own no-CVI model (same doctrine as the walk_forward.json relabel)",
           "definitions": __doc__.split("Definitions (recorded in cvi_result.json):")[1].strip(),
           "params": {"W_DEF": W_DEF, "W_OFF": W_OFF, "STARTER_THR": STARTER_THR, "gamma_grid": [float(GAMMA_GRID[0]), float(GAMMA_GRID[-1]), 0.01],
                      "bad_report": sorted(BAD_REPORT), "bad_practice": sorted(BAD_PRACTICE)},
           "model": "scale *= (1 + gamma * CVI_game); gamma MLE on strictly earlier CVI-available games, refit weekly; base normal-mixture params MLE on all earlier residuals",
           "frozen_manifest": {**man, "best": bm, "manifest_sha256": hashlib.sha256(open(w.DEFAULT_MANIFEST, "rb").read()).hexdigest()},
           "nflverse_crosscheck_unfrozen": {**cc, "best": gate(cc)[0], "would_pass_rule": gate(cc)[1],
                                            "status": "UNFROZEN public nflverse games.csv 2016-2025 -- does NOT count for the gate",
                                            "games_csv_sha256": hashlib.sha256(open(games_csv, "rb").read()).hexdigest()},
           "inputs": {"cache": CACHE, "sources": "nflverse snap_counts, injuries (date_modified), players crosswalk, PBP (CC-BY-4.0) via dfs/ingest/nflverse_release.py; kickoff from games.csv"},
           "honesty_notes": ["7.099 is an unreproduced bar.", "backup_quality_multiplier is a snap-share proxy; a coverage-performance residual could not be built from real data here.",
                             "nflverse injuries 2025 lack date_modified and are rejected at ingest: the injury branch of cascade_count is empty for 2025.",
                             "Depth charts are not used: legacy (<=2024) depth charts carry no timestamp, so observed_at <= t cannot be proven.",
                             "mu never moves; vision weight 0; injury_adj not wired; emission unchanged."]}
    json.dump(out, open(out_path, "w"), indent=1)
    return out


if __name__ == "__main__":
    o = run()
    for k in ("frozen_manifest", "nflverse_crosscheck_unfrozen"):
        b = o[k]; print(k, b["n_scored_all"], b["n_cvi_filtered"], b["cvi_coverage"], b["share_cvi_positive"], b["crps"], b["delta_cvi_vs_without"], b["gamma_final_window"], b["interval_coverage"], b["per_season"])
    print(o["gate_status"])
