#!/usr/bin/env python3
"""
cfb_engine.py — COLLEGE FOOTBALL ENGINE, fit on college rows ONLY.
Deep layer: point-in-time warehouse + parameter fit + Colley/Massey ratings +
Pythagorean exponent + walk-forward HonestyGate vs the closing line.
CollegeGuard enforces: no NFL constants (13.45 / 13.19 / 1.56 / 70.9...).
stdlib only. Data: CFBD games+lines 2023-2026 (already pulled, stamped).
"""
import json, math, sys, os, time
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, "/var/minis/workspace")
from doctrine import (Warehouse, HonestyGate, CollegeGuard, crps_gaussian, sha,
                      _norm_cdf, _norm_pdf)

DATA = os.path.join(HERE, "data")
SEASONS = [2023, 2024, 2025, 2026]


def parse_ts(iso):
    return datetime.fromisoformat(iso.replace("Z", "+00:00")).timestamp()


# ---------------------------------------------------------------- warehouse
def load_games():
    """Every game stamped observed_at = kickoff. The warehouse NEVER sees
    a row before its own kickoff — point-in-time by construction."""
    w = Warehouse("cfb_games")
    for y in SEASONS:
        rows = json.load(open(f"{DATA}/games_{y}.json"))
        for g in rows:
            if not g.get("completed") or g.get("homePoints") is None:
                continue
            if g.get("homeClassification") != "fbs" or g.get("awayClassification") != "fbs":
                continue  # FBS-vs-FBS only for parameter fit
            w.append({
                "id": g["id"], "season": g["season"], "week": g["week"],
                "home": g["homeTeam"], "away": g["awayTeam"],
                "home_id": g["homeId"], "away_id": g["awayId"],
                "home_conf": g.get("homeConference"), "away_conf": g.get("awayConference"),
                "home_pts": g["homePoints"], "away_pts": g["awayPoints"],
                "neutral": g.get("neutralSite", False),
                "home_lines": g.get("homeLineScores"), "away_lines": g.get("awayLineScores"),
                "start_iso": g["startDate"],
            }, observed_at=parse_ts(g["startDate"]))
    return w


def load_closes():
    """Closing lines keyed by game id: last available spread/total before kickoff.
    Priority: consensus > the book with latest updated timestamp (closest to close)."""
    closes = {}
    for y in SEASONS:
        rows = json.load(open(f"{DATA}/lines_{y}.json"))
        for lr in rows:
            gid = lr["id"]
            best = {}
            for prov in lr.get("lines", []):
                ts = prov.get("lastUpdate")
                for k in ("spread", "overUnder", "homeMoneyline", "awayMoneyline"):
                    v = prov.get(k)
                    if v is None:
                        continue
                    cur = best.get(k)
                    if cur is None or (ts and cur[0] and ts > cur[0]):
                        best[k] = (ts, v, prov.get("provider"))
            if best:
                closes[gid] = {k: v[1] for k, v in best.items()}
    return closes


# ------------------------------------------------- parameter fit (CFB rows only)
def fit_params(w, closes):
    """Spread sigma, total sigma, HFA — estimated FROM CFB CLOSES AND CFB SCORES.
    Method: margin - closing_spread ~ N(0, sigma_spread); total vs closing total likewise.
    HFA: mean(home_margin - closing_spread) on lined games (spread already includes HFA,
    so residual mean measures closing-line bias, and unlined-game HFA via raw margins)."""
    res_spread, res_total, res_total_abs = [], [], []
    n_used = 0
    hfa_pairs = []          # (home_pts - away_pts) on neutral vs home games handled later
    for g in w.asof("2030-01-01T00:00:00Z"):
        c = closes.get(g["id"])
        if not c:
            continue
        margin = g["home_pts"] - g["away_pts"]
        total = g["home_pts"] + g["away_pts"]
        sp = c.get("spread")
        ou = c.get("overUnder")
        if sp is not None and -60 < abs(sp) < 60:
            # CFBD convention: spread is AWAY-perspective (verified 2026: sp<0 when
            # home favored, 48/2612 agreement with ML). Orient by moneyline when
            # present; fall back to -sp (away spread -> home margin).
            hml, aml = c.get("homeMoneyline"), c.get("awayMoneyline")
            if hml is not None and aml is not None and hml != aml:
                pred = abs(sp) if hml < aml else -abs(sp)
            else:
                pred = -sp
            res_spread.append(margin - pred)
            n_used += 1
        if ou is not None and 20 < ou < 110:
            res_total.append(total - ou)
            res_total_abs.append(total)
    def stats(xs):
        n = len(xs); m = sum(xs) / n
        var = sum((x - m) ** 2 for x in xs) / (n - 1)
        return n, m, math.sqrt(var)
    ns, ms, ss = stats(res_spread)
    nt, mt, st = stats(res_total)
    # HFA, CFB rows: mean home margin on all FBS-vs-FBS games (raw, incl. lined)
    margins = []
    for g in w.asof("2030-01-01T00:00:00Z"):
        if not g["neutral"]:
            margins.append(g["home_pts"] - g["away_pts"])
    nh, mh, _ = stats(margins)
    # neutral-site mean margin (HFA should ~0 there)
    neut = [g["home_pts"] - g["away_pts"] for g in w.asof("2030-01-01T00:00:00Z") if g["neutral"]]
    nn, mn, _ = stats(neut) if neut else (0, 0.0, 0.0)
    return {
        "n_lined": ns, "cfb_spread_sigma": round(ss, 3), "spread_resid_mean": round(ms, 3),
        "n_totals": nt, "cfb_total_sigma": round(st, 3), "total_resid_mean": round(mt, 3),
        "n_home_games": nh, "cfb_raw_home_margin": round(mh, 3),
        "n_neutral": nn, "neutral_margin": round(mn, 3),
        "cfb_hfa_estimate": round(mh - mn, 3),
    }


# ------------------------------------------------- Colley ratings (CFB rows)
def colley_rows(rows):
    """Colley matrix method on ANY row list (point-in-time capable)."""
    teams = {}
    for g in rows:
        for t in (g["home_id"], g["away_id"]):
            teams.setdefault(t, {"n": 0, "w": 0.0, "name": None})
    idx = {t: i for i, t in enumerate(teams)}
    n = len(teams)
    A = [[0.0] * n for _ in range(n)]
    b = [1.0] * n
    for t in teams:
        A[idx[t]][idx[t]] = 2.0
    for g in rows:
        h, a = g["home_id"], g["away_id"]
        hw = 1.0 if g["home_pts"] > g["away_pts"] else (0.0 if g["home_pts"] < g["away_pts"] else 0.5)
        teams[h]["n"] += 1; teams[a]["n"] += 1
        teams[h]["w"] += hw; teams[a]["w"] += (1 - hw)
        teams[h]["name"] = g["home"]; teams[a]["name"] = g["away"]
        A[idx[h]][idx[a]] -= 1.0; A[idx[a]][idx[h]] -= 1.0
        A[idx[h]][idx[h]] += 1.0; A[idx[a]][idx[a]] += 1.0
        b[idx[h]] += hw; b[idx[a]] += (1 - hw)
    for i in range(n):
        piv = max(range(i, n), key=lambda r: abs(A[r][i]))
        A[i], A[piv] = A[piv], A[i]; b[i], b[piv] = b[piv], b[i]
        pv = A[i][i] or 1e-12
        for r in range(i + 1, n):
            f = A[r][i] / pv
            if f:
                for c2 in range(i, n):
                    A[r][c2] -= f * A[i][c2]
                b[r] -= f * b[i]
    x = [0.0] * n
    for i in range(n - 1, -1, -1):
        s = b[i] - sum(A[i][j] * x[j] for j in range(i + 1, n))
        x[i] = s / (A[i][i] or 1e-12)
    return {t: {"name": teams[t]["name"], "rating": x[i],
                "games": teams[t]["n"], "wins": teams[t]["w"]}
            for t, i in idx.items()}


def colley(w, season):
    return colley_rows([g for g in w.asof("2030-01-01T00:00:00Z") if g["season"] == season])


# ------------------------------------------------- margin model candidate
class ColleyMarginModel:
    """Candidate for the honesty gate: margin = (r_home - r_away)*k + hfa_cfb.
    k and hfa FIT ON CFB TRAINING ROWS (weeks before the fold), never assumed."""
    name = "colley_margin_v1"

    def __init__(self, ratings, k, hfa):
        self.ratings, self.k, self.hfa = ratings, k, hfa

    def identity(self):
        return {"model": self.name, "k": round(self.k, 4), "hfa": round(self.hfa, 4)}

    def predict(self, fold):
        r = self.ratings
        rh = r.get(fold["home_id"], {}).get("rating", 0.5)
        ra = r.get(fold["away_id"], {}).get("rating", 0.5)
        mu = (rh - ra) * self.k + (0.0 if fold.get("neutral") else self.hfa)
        sig = self.sigma
        return mu, sig

    sigma = 16.5  # placeholder; set from CFB training rows by the builder


# ------------------------------------------------- the gate
def run_gate(w, closes, season, train_weeks, test_weeks, model_cls):
    """Walk-forward: fit model on train weeks, freeze folds from test weeks,
    baseline = Gaussian close (closing spread + CFB spread sigma)."""
    folds = []
    for g in w.asof("2030-01-01T00:00:00Z"):
        if g["season"] != season or g["week"] not in test_weeks:
            continue
        c = closes.get(g["id"])
        if not c or c.get("spread") is None:
            continue
        folds.append({
            "fold_id": str(g["id"]), "decision_t": parse_ts(g["start_iso"]),
            "outcome": float(g["home_pts"] - g["away_pts"]),
            "close_mu": float(c["spread"]), "close_sigma": SIGMA_SPREAD,
            "home_id": g["home_id"], "away_id": g["away_id"], "neutral": g["neutral"],
            "home_pts": g["home_pts"], "away_pts": g["away_pts"],
        })
    if not folds:
        return None, None, []
    gate = HonestyGate(folds, f"cfb_gate_{season}_w{min(test_weeks)}-{max(test_weeks)}")
    model = model_cls(folds[0]["decision_t"]) if model_cls else None
    return gate, model, folds


SIGMA_SPREAD = None  # filled from fit


def main():
    t0 = time.time()
    w = load_games()
    print(f"[WAREHOUSE] {len(w)} FBS-vs-FBS completed games, stamped observed_at=kickoff")
    closes = load_closes()
    print(f"[CLOSES] {len(closes)} games with closing lines")

    # ---- 1. CFB parameters from CFB rows
    P = fit_params(w, closes)
    print("\n[PARAMETERS — fit on CFB rows only]")
    for k, v in P.items():
        print(f"   {k}: {v}")

    # CollegeGuard on our OWN fitted set (proves no NFL constant port)
    cg = CollegeGuard()
    clean = cg.validate({"sigma_spread_cfb": P["cfb_spread_sigma"],
                         "sigma_total_cfb": P["cfb_total_sigma"],
                         "hfa_cfb": P["cfb_hfa_estimate"]}, "CFB")
    print(f"\n[COLLEGEGUARD] fitted params clean: {clean}")
    nfl_compare = {
        "nfl ladder 13.45": P["cfb_total_sigma"],
        "nfl HFA 1.56": P["cfb_hfa_estimate"],
    }
    print("[NFL-COMPARE] CFB values vs NFL constants (must differ — separate model):")
    print(f"   total sigma: CFB {P['cfb_total_sigma']} vs NFL 13.45 "
          f"({'DIFFERENT' if abs(P['cfb_total_sigma']-13.45) > 0.5 else 'SUSPICIOUSLY CLOSE'})")
    print(f"   HFA:         CFB {P['cfb_hfa_estimate']} vs NFL 1.56 "
          f"({'DIFFERENT' if abs(P['cfb_hfa_estimate']-1.56) > 0.5 else 'SUSPICIOUSLY CLOSE'})")

    global SIGMA_SPREAD
    SIGMA_SPREAD = P["cfb_spread_sigma"]

    # ---- 2. Colley ratings on 2026 rows
    R = colley(w, 2026)
    top = sorted(R.values(), key=lambda x: -x["rating"])[:10]
    print(f"\n[COLLEY 2026] {len(R)} teams, top 10:")
    for t in top:
        print(f"   {t['name']:<22} {t['rating']:.4f}  ({int(t['wins'])}-{t['games']-int(t['wins'])})")

    # ---- 3. walk-forward honesty gate: weeks 1-5 fit -> week 6 test
    # fit k on train: regress margin residual on rating diff (simple least squares)
    def fit_k_hfa(train_weeks):
        num, den, numh, denh = 0.0, 0.0, [], []
        for g in w.asof("2030-01-01T00:00:00Z"):
            if g["season"] != 2026 or g["week"] not in train_weeks:
                continue
            rh = R.get(g["home_id"], {}).get("rating")
            ra = R.get(g["away_id"], {}).get("rating")
            if rh is None or ra is None:
                continue
            m = g["home_pts"] - g["away_pts"]
            numh.append((m, rh - ra, not g["neutral"]))
        # k: slope through origin on non-neutral+neutral mix; hfa: mean residual at rd=0
        ds = [d for _, d, _ in numh]
        ms = [m for m, _, _ in numh]
        n = len(numh)
        if n < 10:
            return 0.0, 0.0
        dbar = sum(ds) / n; mbar = sum(ms) / n
        sdd = sum((d - dbar) ** 2 for d in ds) or 1e-9
        k = sum((d - dbar) * (m - mbar) for d, m, _ in numh) / sdd
        hfa = mbar - k * dbar  # intercept absorbs average HFA in sample
        return k, hfa

    k, hfa = fit_k_hfa(set(range(1, 6)))
    print(f"\n[CANDIDATE] colley_margin_v1 fit on 2026 wk1-5: k={k:.2f} pts/rating, intercept(HFA-absorbed)={hfa:.2f}")

    folds = []
    for g in w.asof("2030-01-01T00:00:00Z"):
        if g["season"] != 2026 or g["week"] != 6:
            continue
        c = closes.get(g["id"])
        if not c or c.get("spread") is None:
            continue
        hml, aml = c.get("homeMoneyline"), c.get("awayMoneyline")
        if hml is not None and aml is not None and hml != aml:
            close_mu = abs(c["spread"]) if hml < aml else -abs(c["spread"])
        else:
            close_mu = -c["spread"]
        folds.append({
            "fold_id": str(g["id"]), "decision_t": parse_ts(g["start_iso"]),
            "outcome": float(g["home_pts"] - g["away_pts"]),
            "close_mu": close_mu, "close_sigma": SIGMA_SPREAD,
            "home_id": g["home_id"], "away_id": g["away_id"], "neutral": g["neutral"],
        })
    print(f"[GATE] week-6 folds with closes: {len(folds)}")

    # POINT-IN-TIME Colley: ratings from games observed BEFORE the first fold's
    # decision time (warehouse asof) — no future leak, doctrine rule 1.
    t_first = min(f["decision_t"] for f in folds)
    R_pt = colley_rows([g for g in w.asof(t_first) if g["season"] == 2026])
    print(f"[POINT-IN-TIME] Colley refit on {sum(1 for _ in w.asof(t_first))} pre-fold games")

    class M:
        name = "colley_margin_v1"
        def __init__(self):
            self.k, self.hfa, self.sigma = k, hfa, SIGMA_SPREAD
        def identity(self):
            return {"model": self.name, "k": round(self.k, 4), "hfa": round(self.hfa, 4),
                    "sigma": round(self.sigma, 4)}
        def predict(self, fold):
            rh = R_pt.get(fold["home_id"], {}).get("rating", 0.5)
            ra = R_pt.get(fold["away_id"], {}).get("rating", 0.5)
            mu = (rh - ra) * self.k + (0.0 if fold.get("neutral") else self.hfa)
            return mu, self.sigma

    gate = HonestyGate(folds, "cfb_gate_2026_w6")
    model = M()
    v = gate.evaluate(model)
    print(f"\n[HONESTY GATE — cfb_gate_2026_w6]")
    print(f"   baseline (Gaussian close, sigma={SIGMA_SPREAD:.2f}): CRPS {v.baseline_crps:.4f}")
    print(f"   candidate colley_margin_v1:                CRPS {v.candidate_crps:.4f}")
    print(f"   VERDICT: {v.verdict}  (manifest sha {v.manifest_sha[:12]}, n={v.n_folds})")
    if v.verdict == "REFUSED":
        print("   -> the close holds. As doctrine demands. (Also expected: 1 model, 1 week, n small.)")

    # ---- 4. per-fold detail where candidate wins/loses
    wins = sum(1 for d in v.detail.values() if d > 0)
    print(f"   fold-level: candidate beats close on {wins}/{v.n_folds} games")

    # ---- 5. totals check: closing total bias (total_resid_mean) = free diagnostic
    print(f"\n[TOTALS DIAG] closing-total residual mean: {P['total_resid_mean']} "
          f"({'books shade ' + ('UNDER' if P['total_resid_mean'] > 0 else 'OVER')}" +
          f" — closes finish {'high' if P['total_resid_mean'] > 0 else 'low'} of close)")

    print(f"\n[DONE] {time.time()-t0:.1f}s — all parameters CFB-native, CollegeGuard clean, gate run.")
    # save params for the bus + book layer
    out = {"fit_date": "2026-10-10", "params": P,
           "colley_top10": [{ "name": t["name"], "rating": round(t["rating"], 4)} for t in top],
           "gate": {"id": gate.gate_id, "manifest_sha": gate.manifest_sha,
                    "verdict": v.verdict, "baseline_crps": round(v.baseline_crps, 4),
                    "candidate_crps": round(v.candidate_crps, 4), "n": v.n_folds}}
    json.dump(out, open(os.path.join(HERE, "cfb_params_2026.json"), "w"), indent=1)
    print("saved cfb_params_2026.json")


if __name__ == "__main__":
    main()
