#!/usr/bin/env python3
"""wf_margin_crps.py -- point-in-time walk-forward CRPS of the home-margin predictive
distribution against the market close.  DIAGNOSTIC ONLY.  Nothing promoted.

Model (Garrett, 2026-10-14):  Y ~ Laplace(mu, b(T,S))
  Y  = final home margin = home_score - away_score, from the manifest's own score fields.
       The manifest's final_diff column has the wrong sign on 340 of 855 rows (checked
       against its own scores and nflverse games.csv), so final_diff is NOT used; the
       mismatch count is recorded in walk_forward.json.
  mu = spread_line, the closing spread as predicted home margin (nflverse convention:
       positive = home favored).  The close itself; never a fitted mean.
  T  = closing total (total_line), S = closing spread (bins use |S|).
  b(T,S) = mean |Y - mu| over STRICTLY EARLIER games (earlier (season, week)) in that
       (T,S) cell; if the cell has < CELL_MIN prior games, fall back to mean |Y - mu|
       over all earlier games.
Baseline: Gaussian(mu = close, sigma = 13.45 fixed) on the same games.
Comparison: one-scale Laplace (b = mean |e| over all earlier games).
Scored games: every game after the warm-up season (the first season in the manifest).

Read path: FreshnessGate read_fresh.  Residual e computed in memory only.  Any row
missing a required field stops the run (exit 2); no imputation, fail-closed.
"""
import json, math, os, sys, hashlib, importlib.util, time

HERE = os.path.dirname(os.path.abspath(__file__))
DFS = os.path.dirname(HERE)
ROOT = os.path.dirname(DFS)
sys.path.insert(0, DFS)
from freshnessgate_wiring import read_fresh, _ledger_append  # noqa: E402

_spec = importlib.util.spec_from_file_location(
    "engine_math", os.path.join(ROOT, "intelligence", "ratings", "engine_math.py"))
_em = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(_em)
crps_gaussian = _em.crps_gaussian  # crps_gaussian(mu, sd, x)

REQUIRED = ("game_id", "season", "week", "spread_line", "total_line", "home_score", "away_score")
T_EDGES = [41.0, 45.0, 48.0]   # T<41 | 41<=T<45 | 45<=T<48 | T>=48
S_EDGES = [3.5, 7.5]           # |S|<3.5 | 3.5<=|S|<7.5 | |S|>=7.5
CELL_MIN = 30
SIGMA_FIXED = 13.45
DELTA_BAR = 0.01
N_MIN = 150
FROZEN_MAX_AGE_H = 24 * 3650   # frozen historical manifest: age is not a staleness signal
DEFAULT_MANIFEST = os.path.join(DFS, "nfl_rvc_manifest.json")
DEFAULT_OUT = os.path.join(HERE, "walk_forward.json")


class FailClosed(Exception):
    pass


def laplace_cdf(y, mu, b):
    if y < mu:
        return 0.5 * math.exp((y - mu) / b)
    return 1.0 - 0.5 * math.exp(-(y - mu) / b)


def p_cover(spread, b):
    """P(Y <= spread) under Laplace(mu=spread, b) -- always 0.5 by construction."""
    return laplace_cdf(spread, spread, b)


def p_home_win(spread, b):
    """P(Y > 0) = 1 - F(0).  F(0) itself is P(home margin <= 0)."""
    return 1.0 - laplace_cdf(0.0, spread, b)


def crps_laplace(mu, b, x):
    a = abs(x - mu)
    return a + b * math.exp(-a / b) - 0.75 * b


def _bin(v, edges):
    for i, e in enumerate(edges):
        if v < e:
            return i
    return len(edges)


def cell(total, spread):
    return (_bin(total, T_EDGES), _bin(abs(spread), S_EDGES))


def _num(r, k):
    v = r.get(k)
    if v is None or isinstance(v, bool):
        raise FailClosed(f"{r.get('game_id')}: field {k} missing")
    try:
        f = float(v)
    except (TypeError, ValueError):
        raise FailClosed(f"{r.get('game_id')}: field {k} non-numeric ({v!r})")
    if math.isnan(f):
        raise FailClosed(f"{r.get('game_id')}: field {k} is NaN")
    return f


def load_rows(manifest_path):
    res = read_fresh(manifest_path, max_age_hours=FROZEN_MAX_AGE_H)
    if not res["audit"]["fresh"]:
        raise FailClosed(f"FreshnessGate refusal: {res['audit']}")
    rows = res["data"].get("manifest_rows")
    if not rows:
        raise FailClosed("manifest has no manifest_rows")
    out, bad_fd = [], 0
    for r in rows:
        for k in REQUIRED:
            if r.get(k) is None:
                raise FailClosed(f"{r.get('game_id')}: field {k} missing")
        out.append({"game_id": r["game_id"], "season": int(_num(r, "season")),
                    "week": int(_num(r, "week")), "S": _num(r, "spread_line"),
                    "T": _num(r, "total_line"), "Y": _num(r, "home_score") - _num(r, "away_score")})
        fd = r.get("final_diff")
        if fd is not None and not (isinstance(fd, float) and math.isnan(fd)) and float(fd) != out[-1]["Y"]:
            bad_fd += 1
    res["final_diff_sign_mismatches"] = bad_fd
    return res, out


def evaluate(rows):
    rows = sorted(rows, key=lambda g: (g["season"], g["week"], g["game_id"]))
    warm = rows[0]["season"]
    hist_all, hist_cell = [], {}
    scored, i = [], 0
    while i < len(rows):
        j = i
        while j < len(rows) and (rows[j]["season"], rows[j]["week"]) == (rows[i]["season"], rows[i]["week"]):
            j += 1
        block = rows[i:j]
        for g in block:  # predict with strictly earlier (season, week) only
            if g["season"] == warm or not hist_all:
                continue
            c = cell(g["T"], g["S"])
            b1 = sum(hist_all) / len(hist_all)
            hc = hist_cell.get(c, [])
            bc, fb = (sum(hc) / len(hc), False) if len(hc) >= CELL_MIN else (b1, True)
            e = g["Y"] - g["S"]
            scored.append({"season": g["season"], "cell": c, "fallback": fb,
                           "lap_cond": crps_laplace(g["S"], bc, g["Y"]),
                           "lap_one": crps_laplace(g["S"], b1, g["Y"]),
                           "gauss": crps_gaussian(g["S"], SIGMA_FIXED, g["Y"]),
                           "p_cover": p_cover(g["S"], bc), "p_home_win": p_home_win(g["S"], bc),
                           "abs_e": abs(e)})
        for g in block:
            a = abs(g["Y"] - g["S"])
            hist_all.append(a)
            hist_cell.setdefault(cell(g["T"], g["S"]), []).append(a)
        i = j
    return warm, scored


def _summ(s):
    n = len(s)
    if not n:
        return {"n": 0}
    m = lambda k: round(sum(x[k] for x in s) / n, 4)
    return {"n": n, "laplace_conditional_crps": m("lap_cond"), "laplace_one_scale_crps": m("lap_one"),
            "gaussian_close_crps": m("gauss"),
            "delta_conditional_vs_gaussian": round(m("gauss") - m("lap_cond"), 4),
            "delta_one_scale_vs_gaussian": round(m("gauss") - m("lap_one"), 4),
            "cell_fallbacks": sum(1 for x in s if x["fallback"])}


def run(manifest_path=DEFAULT_MANIFEST, out_path=DEFAULT_OUT, ledger=True):
    res, rows = load_rows(manifest_path)
    warm, scored = evaluate(rows)
    pooled = _summ(scored)
    seasons = sorted({x["season"] for x in scored})
    delta = pooled.get("delta_conditional_vs_gaussian", 0.0)
    passed = bool(pooled["n"] >= N_MIN and delta >= DELTA_BAR)
    sha = hashlib.sha256(open(manifest_path, "rb").read()).hexdigest()
    out = {
        "label": "DIAGNOSTIC -- walk-forward margin CRPS; infrastructure only; nothing promoted",
        "gate_status": "CLEARED (provisional, diagnostic)" if passed else "NOT CLEARED",
        "passed": passed, "provisional": True,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "manifest": {"path": os.path.relpath(manifest_path, ROOT) if manifest_path.startswith(ROOT) else manifest_path,
                     "sha256": sha, "freshness_audit": res["audit"], "n_rows": len(rows),
                     "final_diff_mismatch_rows": res["final_diff_sign_mismatches"],
                     "margin_source": "home_score - away_score (final_diff column not used)"},
        "model": {"family": "Laplace(mu=close spread, b(T,S))",
                  "mu": "spread_line (closing spread as predicted home margin; not fitted)",
                  "b": f"mean |Y-mu| of strictly earlier (season,week) games in the (T,|S|) cell; fallback to all earlier if cell < {CELL_MIN}",
                  "cdf": "F(y)=0.5*exp((y-mu)/b) if y<mu else 1-0.5*exp(-(y-mu)/b); P(cover)=F(spread)=0.5; P(home win)=1-F(0)",
                  "bins": {"T_edges": T_EDGES, "T_bins": ["T<41", "41<=T<45", "45<=T<48", "T>=48"],
                           "absS_edges": S_EDGES, "absS_bins": ["|S|<3.5", "3.5<=|S|<7.5", "|S|>=7.5"],
                           "choice": "T edges near the 2023-25 closing-total quartiles; |S| split at the 3 and 7 key numbers"},
                  "cell_min": CELL_MIN},
        "baseline": {"family": "Gaussian(mu=close, sigma=13.45 fixed)", "same_games": True},
        "warmup_season": warm, "scored_seasons": seasons,
        "n": pooled["n"], "pooled": pooled,
        "per_season": {str(s): _summ([x for x in scored if x["season"] == s]) for s in seasons},
        "rule": {"passed_if": f"delta_conditional_vs_gaussian >= {DELTA_BAR} AND n >= {N_MIN}"},
        "honesty_notes": [
            "Gate is NOT cleared unless passed is true; even then nothing is promoted and mu stays the close.",
            "The absolute 7.109 / 7.099 bar was not reproduced on this manifest and is not used; comparison is same-games Gaussian(close, 13.45).",
            "Closes are nflverse point lines (spread_line/total_line), not de-vigged prices.",
            "Reader path unresolved: autonomous_cycle.py is not in any GitHub branch; the path it reads must be confirmed on Beexly.",
            "Garrett reference (n=2462, Laplace 7.1597, Gaussian 7.1540) is on a larger game set; this manifest covers 2023-2025 only.",
            "Manifest final_diff disagrees with home_score - away_score on final_diff_mismatch_rows rows (sign flipped); Y uses the score fields. The frozen manifest file itself is untouched.",
            "Vision weight 0. No imputation. Joins fail closed.",
        ],
    }
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=1)
    if ledger:
        _ledger_append({"id": "LR-20261014-WF-MARGIN-CRPS",
                        "verdict": "INFRASTRUCTURE PASS (diagnostic; gate cleared provisionally; not promoted)" if passed
                        else "REFUSED (gate NOT cleared: conditional Laplace did not beat Gaussian close 13.45 by >=0.01)",
                        "artifact": "dfs/walk_forward/walk_forward.json", "manifest_sha256": sha,
                        "n": pooled["n"], "laplace_conditional_crps": pooled["laplace_conditional_crps"],
                        "laplace_one_scale_crps": pooled["laplace_one_scale_crps"],
                        "gaussian_close_crps": pooled["gaussian_close_crps"], "delta": delta,
                        "passed": passed, "label": "DIAGNOSTIC", "promotion": "NONE"})
    return out


if __name__ == "__main__":
    try:
        o = run(*(sys.argv[1:3]))
    except FailClosed as e:
        print(f"FAIL-CLOSED: {e}", file=sys.stderr); sys.exit(2)
    print(json.dumps({"n": o["n"], "pooled": o["pooled"], "passed": o["passed"]}, indent=1))
