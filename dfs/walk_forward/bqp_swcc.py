#!/usr/bin/env python3
"""BQP and SWCC residual-scale modulators.  DIAGNOSTIC ONLY.  mu = close; features only rescale the
predictive distribution: scale *= exp(gamma * z), z = (feature - mean_prior) / sd_prior over earlier
games with the feature present; gamma by MLE (golden section on [-1, 1]) on strictly earlier games,
refit weekly.  A game whose feature is omitted (failed-closed join) uses z = 0 = baseline scale and
still counts.  Not wired; emission unchanged.  CVI is not touched or re-scored.

BQP (backup quality penalty), per team side, positions QB / RB / WR / TE:
  player EPA attribution  QB: plays where he is passer_player_id or rusher_player_id (dropbacks + runs);
                          RB: rusher_player_id plays; WR/TE: receiver_player_id plays (targets).
                          Position = nflverse snap_counts position for the team's prior games.
  snap adjustment         EPA/play shrunk toward the position's league prior mean:
                          (sum_epa + K * mu_pos) / (plays + K), K = 50 plays; all from prior games only.
  starter / backup        by mean offense_pct over the team's last 4 games strictly before kickoff; QB, RB:
                          rank 1 = starter, rank 2 = backup; WR: ranks 1-2 starters, rank 3 backup; TE: 1 / 2.
  BQP_p                   EPA_starter_prior - EPA_backup_prior (snap-adjusted).
  trigger                 counted only when the starter has an nflverse injury row for (season, week, team)
                          with date_modified <= kickoff and report_status Out/Doubtful or practice DNP/Limited.
  game BQP                sum over both sides and positions of max(0, BQP_p) for triggered starters.
  fail closed (omit)      injury file for the season lacks date_modified (2025); team has < 4 prior games
                          of snap counts; a needed pfr->gsis crosswalk is missing for a triggered starter
                          or backup; no prior PBP plays for starter or backup.
  depth charts            not used: legacy files have no timestamp; 2025 has dt but 2025 injuries are
                          omitted anyway, so the trigger cannot fire there.
SWCC (short-week cumulative cost), per team:
  rest_deficit = max(0, 7 - rest_days) from games.csv home_rest/away_rest
  travel_miles = schedule_meta away_travel_miles for the away team, 0 for the home team at its own venue
  prior_game_snaps = team offense snaps + defense snaps in its previous game (max offense_snaps +
                     max defense_snaps over that game's snap_counts rows), strictly before kickoff
  SWCC_team = rest_deficit * ln(1 + travel_miles) * prior_game_snaps / 1000
  game SWCC = SWCC_home + SWCC_away
  fail closed (omit)  neutral-site game (home travel unknown); away travel null; rest missing; no prior game snaps.
"""
import csv, json, math, os, sys, collections, hashlib, time
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(os.path.dirname(HERE), "ingest"))
import wf_models as wm  # noqa: E402
import wf_margin_crps as w  # noqa: E402
from cvi import load_games, PBP_DIRS, CACHE, BAD_REPORT, BAD_PRACTICE, _iso  # noqa: E402

K_SHRINK, W_SNAP = 50, 4
SIGMA_FIXED = 13.45
GAMES_CSV = "/workspace/games.csv"


# ---------------- data ----------------
def _inj_index(lo, hi, fails):
    inj = collections.defaultdict(lambda: collections.defaultdict(list)); has_asof = {}
    for y in range(lo, hi + 1):
        p = os.path.join(CACHE, f"injuries_{y}.csv")
        rd = list(csv.DictReader(open(p, encoding="utf-8")))
        has_asof[y] = bool(rd) and "date_modified" in rd[0]
        for r in rd:
            if r.get("date_modified") in (None, "", "NA"):
                fails["injury_row_no_date_modified"] += 1; continue
            inj[(int(r["season"]), int(r["week"]), r["team"])][r["gsis_id"]].append(
                (r["date_modified"], r.get("report_status", ""), r.get("practice_status", "")))
    return inj, has_asof


def _snaps(lo, hi, ko):
    s = collections.defaultdict(dict); team_tot = {}
    for y in range(lo, hi + 1):
        for r in csv.DictReader(open(os.path.join(CACHE, f"snap_counts_{y}.csv"), encoding="utf-8")):
            if r["game_id"] not in ko: continue
            key = (r["team"], r["game_id"])
            op = float(r["offense_pct"]) if r.get("offense_pct") not in ("", "NA", None) else 0.0
            s[key][r["pfr_player_id"]] = (r["position"], op)
            o = float(r["offense_snaps"] or 0) if r.get("offense_snaps") not in ("", "NA") else 0
            d = float(r["defense_snaps"] or 0) if r.get("defense_snaps") not in ("", "NA") else 0
            t = team_tot.get(key, (0, 0)); team_tot[key] = (max(t[0], o), max(t[1], d))
    return s, team_tot


def _pbp_player_epa(lo, hi, ko):
    """per gsis: list of (kickoff, epa_sum, plays, role) per game."""
    import pyarrow.parquet as pq
    out = collections.defaultdict(list)
    for y in range(lo, hi + 1):
        path = next((os.path.join(d, f"play_by_play_{y}.parquet") for d in PBP_DIRS
                     if os.path.exists(os.path.join(d, f"play_by_play_{y}.parquet"))), None)
        if not path: continue
        t = pq.read_table(path, columns=["game_id", "epa", "passer_player_id", "rusher_player_id", "receiver_player_id"]).to_pandas()
        t = t[t["epa"].notna() & t["game_id"].isin(ko.keys())]
        for col, role in (("passer_player_id", "pass"), ("rusher_player_id", "rush"), ("receiver_player_id", "rec")):
            g = t[t[col].notna()].groupby(["game_id", col])["epa"].agg(["sum", "count"])
            for (gid, pid), v in g.iterrows():
                out[pid].append((ko[gid], float(v["sum"]), int(v["count"]), role))
    for pid in out: out[pid].sort(key=lambda x: x[0])
    return out


ROLES = {"QB": ("pass", "rush"), "RB": ("rush",), "WR": ("rec",), "TE": ("rec",)}
SLOTS = {"QB": (1, [2]), "RB": (1, [2]), "WR": (2, [3]), "TE": (1, [2])}


def build_features(seasons):
    lo, hi = min(seasons), max(seasons)
    G = load_games(GAMES_CSV, lo - 1, hi)
    ko = {g["game_id"]: g["ko"] for g in G}
    gmeta = {g["game_id"]: g for g in csv.DictReader(open(GAMES_CSV, encoding="utf-8")) if g["game_id"] in ko}
    sched = {r["game_id"]: r for r in json.load(open(os.path.join(CACHE, "schedule_meta_2015_2025.json")))["rows"]}
    xw = {r["pfr_id"]: r["gsis_id"] for r in csv.DictReader(open(os.path.join(CACHE, "players.csv"), encoding="utf-8"))
          if r.get("pfr_id") not in (None, "", "NA") and r.get("gsis_id") not in (None, "", "NA")}
    fb = collections.Counter(); fs = collections.Counter()
    inj, has_asof = _inj_index(lo - 1, hi, fb)
    snaps, team_tot = _snaps(lo - 1, hi, ko)
    pepa = _pbp_player_epa(lo - 1, hi, ko)
    team_games = collections.defaultdict(list)
    for g in G:
        for t in (g["home"], g["away"]):
            if (t, g["game_id"]) in snaps: team_games[t].append(g["game_id"])
    # league prior mean EPA/play per position role set, cumulative by time (computed on the fly, prior only)
    role_events = sorted(((k, s, n, r) for pid, ev in pepa.items() for (k, s, n, r) in ev), key=lambda x: x[0])
    rk = [e[0] for e in role_events]
    import bisect
    cs = {r: np.cumsum([e[1] if e[3] == r else 0.0 for e in role_events]) for r in ("pass", "rush", "rec")}
    cn = {r: np.cumsum([e[2] if e[3] == r else 0 for e in role_events]) for r in ("pass", "rush", "rec")}

    def league_mu(roles, t):
        i = bisect.bisect_left(rk, t)
        if i == 0: return None
        s = sum(cs[r][i - 1] for r in roles); n = sum(cn[r][i - 1] for r in roles)
        return s / n if n else None

    def player_epa(gsis, roles, t, mu):
        ev = [e for e in pepa.get(gsis, []) if e[0] < t and e[3] in roles]
        n = sum(e[2] for e in ev)
        if n == 0: return None
        return (sum(e[1] for e in ev) + K_SHRINK * mu) / (n + K_SHRINK)

    def side_bqp(team, g):
        t = g["ko"]
        if not has_asof.get(g["season"], False):
            fb["omit_injury_season_no_date_modified"] += 1; return None
        prior = [x for x in team_games[team] if ko[x] < t][-W_SNAP:]
        if len(prior) < W_SNAP:
            fb["omit_lt4_prior_snap_games"] += 1; return None
        share = collections.defaultdict(float); pos = {}
        for x in prior:
            for pid, (p, pct) in snaps[(team, x)].items():
                share[pid] += pct / W_SNAP; pos[pid] = p
        rec = inj.get((g["season"], g["week"], team), {})
        total = 0.0
        for P, roles in ROLES.items():
            ranked = sorted((pid for pid in share if pos[pid] == P), key=lambda q: -share[q])
            n_start, backs = SLOTS[P]
            starters = ranked[:n_start]; backup = ranked[backs[0] - 1] if len(ranked) >= backs[0] else None
            mu = league_mu(roles, t)
            for s in starters:
                gs = xw.get(s)
                if gs is None:
                    fb["starter_no_crosswalk_untestable"] += 1; continue
                rows = [r for r in rec.get(gs, []) if r[0] <= _iso(t)]
                if not rows: continue
                last = max(rows)
                if not (last[1] in BAD_REPORT or last[2] in BAD_PRACTICE): continue
                gb = xw.get(backup) if backup else None
                if backup is None or gb is None:
                    fb["omit_triggered_no_backup_or_crosswalk"] += 1; return None
                es, eb = player_epa(gs, roles, t, mu), player_epa(gb, roles, t, mu)
                if es is None or eb is None or mu is None:
                    fb["omit_triggered_no_prior_pbp"] += 1; return None
                total += max(0.0, es - eb)
        return total

    def side_swcc(team, g, is_home):
        m = gmeta[g["game_id"]]; sm = sched.get(g["game_id"], {})
        rest = m["home_rest" if is_home else "away_rest"]
        if rest in ("", "NA", None):
            fs["omit_rest_missing"] += 1; return None
        if is_home:
            miles = 0.0
        else:
            miles = sm.get("away_travel_miles")
            if miles is None:
                fs["omit_away_travel_null"] += 1; return None
        prev = [x for x in team_games[team] if ko[x] < g["ko"]]
        if not prev:
            fs["omit_no_prior_game_snaps"] += 1; return None
        o, d = team_tot[(team, prev[-1])]
        return max(0.0, 7 - float(rest)) * math.log1p(miles) * (o + d) / 1000.0

    bqp, swcc = {}, {}
    for g in G:
        if g["season"] < lo: continue
        h, a = side_bqp(g["home"], g), side_bqp(g["away"], g)
        bqp[g["game_id"]] = None if (h is None or a is None) else h + a
        if gmeta[g["game_id"]]["location"] != "Home":
            fs["omit_neutral_site"] += 1; swcc[g["game_id"]] = None
        else:
            sh, sa = side_swcc(g["home"], g, True), side_swcc(g["away"], g, False)
            swcc[g["game_id"]] = None if (sh is None or sa is None) else sh + sa
    return {"bqp": bqp, "swcc": swcc, "fails_bqp": dict(fb), "fails_swcc": dict(fs)}


# ---------------- scoring ----------------
def _gold(f, a=-1.0, b=1.0, it=60):
    gr = (math.sqrt(5) - 1) / 2; c, d = b - gr * (b - a), a + gr * (b - a)
    fc, fd = f(c), f(d)
    for _ in range(it):
        if fc < fd: b, d, fd = d, c, fc; c = b - gr * (b - a); fc = f(c)
        else: a, c, fc = c, d, fd; d = a + gr * (b - a); fd = f(d)
    return (a + b) / 2


def _nll_g(r, s): return float(np.sum(np.log(s) + 0.5 * (r / s) ** 2))


def _nll_nm(r, p, m):
    s1, s2 = p["s1"] * m, p["s2"] * m
    return float(-np.sum(np.log(p["pi"] * np.exp(-0.5 * (r / s1) ** 2) / s1 + (1 - p["pi"]) * np.exp(-0.5 * (r / s2) ** 2) / s2)))


def harness(rows, feats, target="margin"):
    """feats: list of dicts game_id -> value|None (1 or 2 features).  target margin: baselines
    Gaussian 13.45 + two-normal mixture; target total: Gaussian fitted sigma + two-normal mixture."""
    rows = sorted(rows, key=lambda g: (g["season"], g["week"], g["game_id"]))
    warm = rows[0]["season"]
    R, F = [], []
    res = collections.defaultdict(list); seasons = []; last = {}; n_feat = 0
    for block in wm._weeks(rows):
        if block[0]["season"] != warm and R:
            r = np.array(R); nm = wm.fit_norm_mix(r)
            sg = SIGMA_FIXED if target == "margin" else float(np.sqrt(np.mean(r * r)))
            Fa = np.array([[np.nan if v is None else v for v in x] for x in F])
            mus = np.nanmean(Fa, 0); sds = np.nanstd(Fa, 0); sds[sds == 0] = 1
            Z = np.nan_to_num((Fa - mus) / sds)
            gam_g, gam_n = [0.0] * Z.shape[1], [0.0] * Z.shape[1]
            for _ in range(2 if Z.shape[1] > 1 else 1):  # coordinate ascent for 2 features
                for j in range(Z.shape[1]):
                    def off(gs, jj, gv): return np.exp(sum((gv if i == jj else gs[i]) * Z[:, i] for i in range(Z.shape[1])))
                    gam_g[j] = _gold(lambda gv: _nll_g(r, sg * off(gam_g, j, gv)))
                    gam_n[j] = _gold(lambda gv: _nll_nm(r, nm, off(gam_n, j, gv)))
            last = {"gamma_gaussian": [round(x, 4) for x in gam_g], "gamma_mixture": [round(x, 4) for x in gam_n],
                    "feature_mean": [round(float(x), 4) for x in mus], "feature_sd": [round(float(x), 4) for x in sds], "n_train": len(R)}
            for g in block:
                vals = [f.get(g["game_id"]) for f in feats]
                z = [0.0 if v is None else (v - mus[i]) / sds[i] for i, v in enumerate(vals)]
                n_feat += all(v is not None for v in vals)
                mg = math.exp(sum(a * b for a, b in zip(gam_g, z))); mn = math.exp(sum(a * b for a, b in zip(gam_n, z)))
                mu = g["S"] if target == "margin" else g["T"]; x = g["Y"] if target == "margin" else g["TOT"]
                seasons.append(g["season"])
                res["gaussian"].append(wm.crps_numeric(lambda y: wm.cdf_normal(y - mu, sg), x))
                res["gaussian+feat"].append(wm.crps_numeric(lambda y: wm.cdf_normal(y - mu, sg * mg), x))
                p0 = {"pi": nm["pi"], "s1": nm["s1"], "s2": nm["s2"]}; p1 = {"pi": nm["pi"], "s1": nm["s1"] * mn, "s2": nm["s2"] * mn}
                res["normal_mixture_2"].append(wm.crps_numeric(lambda y: wm.cdf_norm_mix(y - mu, p0), x))
                res["normal_mixture_2+feat"].append(wm.crps_numeric(lambda y: wm.cdf_norm_mix(y - mu, p1), x))
        for g in block:
            R.append((g["Y"] - g["S"]) if target == "margin" else (g["TOT"] - g["T"]))
            F.append([f.get(g["game_id"]) for f in feats])
    mm = lambda v: round(float(np.mean(v)), 4)
    n = len(res["gaussian"])
    out = {"target": target, "n": n, "n_feature_present": n_feat, "coverage": round(n_feat / n, 4) if n else None,
           "warmup_season": warm, "scored_seasons": sorted(set(seasons)),
           "baseline_gaussian": "sigma 13.45 fixed" if target == "margin" else "sigma = RMS of earlier total residuals",
           "crps": {k: mm(v) for k, v in res.items()},
           "per_season": {k: {str(s): mm([a for a, ss in zip(v, seasons) if ss == s]) for s in sorted(set(seasons))} for k, v in res.items()},
           "fit_final_window": last}
    c = out["crps"]
    out["delta_feature_vs_own_baseline"] = {"gaussian": round(c["gaussian"] - c["gaussian+feat"], 4),
                                            "normal_mixture_2": round(c["normal_mixture_2"] - c["normal_mixture_2+feat"], 4)}
    out["delta_vs_same_games_gaussian"] = {k: round(c["gaussian"] - v, 4) for k, v in c.items()}
    return out


def load_rows_with_totals():
    res = w.read_fresh(w.DEFAULT_MANIFEST, max_age_hours=w.FROZEN_MAX_AGE_H)
    if not res["audit"]["fresh"]: raise w.FailClosed(str(res["audit"]))
    m = []
    for r in res["data"]["manifest_rows"]:
        for k in ("game_id", "season", "week", "spread_line", "total_line", "home_score", "away_score"):
            if r.get(k) is None or (isinstance(r[k], float) and math.isnan(r[k])): raise w.FailClosed(f"{r.get('game_id')} missing {k}")
        m.append({"game_id": r["game_id"], "season": int(r["season"]), "week": int(r["week"]), "S": float(r["spread_line"]),
                  "T": float(r["total_line"]), "Y": float(r["home_score"]) - float(r["away_score"]), "TOT": float(r["home_score"]) + float(r["away_score"])})
    c = []
    for g in csv.DictReader(open(GAMES_CSV, encoding="utf-8")):
        if 2016 <= int(g["season"]) <= 2025 and all(g[k] not in ("", "NA") for k in ("home_score", "away_score", "spread_line", "total_line")):
            c.append({"game_id": g["game_id"], "season": int(g["season"]), "week": int(g["week"]), "S": float(g["spread_line"]),
                      "T": float(g["total_line"]), "Y": float(g["home_score"]) - float(g["away_score"]),
                      "TOT": float(g["home_score"]) + float(g["away_score"])})
    return res["audit"], m, c


def _gate(man, cc):
    best = min(("gaussian+feat", "normal_mixture_2+feat"), key=lambda k: man["crps"][k])
    def ok(b): return b["n"] >= 150 and b["crps"][best] <= w.ABS_BAR and b["delta_vs_same_games_gaussian"][best] >= w.DELTA_BAR
    base = best.replace("+feat", "")
    improves = man["delta_feature_vs_own_baseline"][base] > 0 and cc["delta_feature_vs_own_baseline"][base] > 0
    tech = ok(man); passed = bool(tech and ok(cc) and improves)
    if passed: st = "CLEARED (provisional, diagnostic)"
    else:
        why = []
        if tech: why.append("technical pass on manifest only")
        if not ok(cc): why.append("nflverse cross-check fails (CRPS above 7.099 or delta < 0.01)")
        if not improves: why.append(f"feature does not improve its own {base} baseline on both sets")
        st = "NOT CLEARED: " + "; ".join(why)
    return {"best_feature_model": best, "technical_pass_manifest": tech, "passed": passed, "gate_status": st}


def run():
    audit, mrows, crows = load_rows_with_totals()
    fe = build_features(range(2016, 2026))
    sha_m = hashlib.sha256(open(w.DEFAULT_MANIFEST, "rb").read()).hexdigest()
    sha_g = hashlib.sha256(open(GAMES_CSV, "rb").read()).hexdigest()
    common = {"label": "DIAGNOSTIC -- residual-scale modulator; mu = close; not wired; emission unchanged; nothing promoted",
              "gate_rule": "feature model n >= 150 AND CRPS <= 7.099 (unreproduced bar) AND beats same-games Gaussian 13.45 by >= 0.01 on the frozen manifest; AND the nflverse cross-check passes the same test; AND the feature improves its own baseline on both sets",
              "definitions": __doc__, "manifest_sha256": sha_m, "manifest_freshness": {**audit, "path": "dfs/nfl_rvc_manifest.json"},
              "nflverse_games_csv_sha256": sha_g, "nflverse_note": "UNFROZEN public nflverse games.csv 2016-2025 (warm-up 2016, n=2494 scored); Garrett's 2,462 filter is not reproduced; does NOT count alone for the gate",
              "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
    outs = {}
    for name, key, fails in (("bqp", "bqp", "fails_bqp"), ("swcc", "swcc", "fails_swcc")):
        man = harness(mrows, [fe[key]]); cc = harness(crows, [fe[key]])
        g = _gate(man, cc)
        o = {**common, **g, "feature": name, "frozen_manifest": man, "nflverse_crosscheck_unfrozen": cc,
             "failed_closed_joins": fe[fails], "feature_definition_key": name}
        if name == "swcc":
            o["total_target_diagnostic"] = {"frozen_manifest": harness(mrows, [fe[key]], "total"),
                                            "nflverse_crosscheck_unfrozen": harness(crows, [fe[key]], "total"),
                                            "note": "total residual = (home+away) - total_line; baseline Gaussian sigma fitted on earlier totals (no 13.45 analogue); not gated"}
        outs[name] = o
    imp = {k: (outs[k]["frozen_manifest"]["delta_feature_vs_own_baseline"]["normal_mixture_2"] > 0) for k in outs}
    combined = None
    if all(imp.values()):
        man = harness(mrows, [fe["bqp"], fe["swcc"]]); cc = harness(crows, [fe["bqp"], fe["swcc"]])
        combined = {**_gate(man, cc), "frozen_manifest": man, "nflverse_crosscheck_unfrozen": cc}
    for k in outs:
        outs[k]["combined_bqp_swcc"] = combined if combined else {"run": False, "reason": f"combined is run only if each improves its mixture baseline alone on the manifest; improves = {imp}"}
        json.dump(outs[k], open(os.path.join(HERE, f"{k}_result.json"), "w"), indent=1)
    return outs, combined


if __name__ == "__main__":
    outs, comb = run()
    for k, o in outs.items():
        for s in ("frozen_manifest", "nflverse_crosscheck_unfrozen"):
            b = o[s]; print(k, s, b["n"], b["coverage"], b["crps"], b["delta_feature_vs_own_baseline"], b["fit_final_window"].get("gamma_mixture"), b["fit_final_window"].get("gamma_gaussian"))
        print(k, o["gate_status"], o["failed_closed_joins"])
        if k == "swcc":
            for s in ("frozen_manifest", "nflverse_crosscheck_unfrozen"):
                b = o["total_target_diagnostic"][s]; print(" total", s, b["n"], b["crps"], b["delta_feature_vs_own_baseline"])
    print("combined", None if not comb else (comb["gate_status"], comb["frozen_manifest"]["crps"], comb["nflverse_crosscheck_unfrozen"]["crps"]))
