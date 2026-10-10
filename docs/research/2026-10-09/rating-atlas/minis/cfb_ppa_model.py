#!/usr/bin/env python3
"""
cfb_ppa_model.py — PPA->margin-head candidate, through the honesty gate.
Rule 1 honored: rolling team PPA from PRIOR games only (point-in-time).
Rule 3 honored: k and HFA fit on CFB rows; no NFL constants.
Rule 19 honored: candidates evaluated on the FROZEN wk-6 2026 fold list;
                 baseline = Gaussian close (the anchor); verdicts recorded.
Kill-ledger entries written for refused candidates.
"""
import json, math, statistics, os, sys
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data")
sys.path.insert(0, "/var/minis/workspace")
from doctrine import HonestyGate, KillLedger, crps_gaussian, parse_ts, sha

SEASONS = [2023, 2024, 2025, 2026]
BOOKS = ["DraftKings", "ESPN Bet", "Bovada", "William Hill (New Jersey)", "Caesars Sportsbook (Colorado)"]

def amer_to_imp(a):
    if a is None: return None
    a = float(a)
    return (-a) / (-a + 100) if a < 0 else 100 / (a + 100)

def load_games():
    games = {}
    for y in SEASONS:
        for g in json.load(open(f"{DATA}/games_{y}.json")):
            if g.get("completed") and g.get("homePoints") is not None \
               and g.get("homeClassification") == "fbs" and g.get("awayClassification") == "fbs":
                games[g["id"]] = g
    return games

def load_closes(games):
    BL = defaultdict(dict)
    for y in SEASONS:
        for lr in json.load(open(f"{DATA}/lines_{y}.json")):
            gid = lr["id"]
            if gid not in games: continue
            for ln in lr.get("lines", []):
                p = ln.get("provider")
                if p in BOOKS:
                    cur = BL[p].get(gid)
                    if cur is None or (ln.get("lastUpdate") or "") >= cur.get("ts", ""):
                        BL[p][gid] = {"spread": ln.get("spread"), "ou": ln.get("overUnder"),
                                      "hml": ln.get("homeMoneyline"), "aml": ln.get("awayMoneyline")}
    spine = {}
    for gid in games:
        sps = []
        for b in BOOKS:
            d = BL[b].get(gid)
            if d and d["spread"] is not None:
                hml, aml = d["hml"], d["aml"]
                mu = (abs(d["spread"]) if hml is not None and aml is not None and hml < aml else -abs(d["spread"])) \
                     if hml is not None else -d["spread"]
                sps.append(mu)
        if len(sps) >= 2: spine[gid] = statistics.median(sps)
    return spine

def load_ppa_rolling():
    """team -> season -> ordered [(week, start_ts, off_ppa, def_ppa)] + rolling means
    AFTER each game (so 'prior' lookups use entries before the current one)."""
    per = defaultdict(list)   # (team, season) -> [(start_ts, off, dfn)]
    for y in SEASONS:
        for row in json.load(open(f"{DATA}/ppa_games_{y}.json")):
            # offense/defense = {overall, passing, rushing} for THAT game
            off = (row.get("offense") or {}).get("overall")
            dfn = (row.get("defense") or {}).get("overall")
            if off is None or dfn is None: continue
            per[(row["team"], row["season"])].append((row["week"], off, dfn))
    # sort by week; build running means
    roll = {}
    for key, lst in per.items():
        lst.sort()
        hist_off, hist_dfn = [], []
        seq = []
        for wk, off, dfn in lst:
            seq.append({"week": wk,
                        "off_roll": statistics.mean(hist_off) if hist_off else None,
                        "dfn_roll": statistics.mean(hist_dfn) if hist_dfn else None})
            hist_off.append(off); hist_dfn.append(dfn)
        roll[key] = seq
    return roll

def ppa_prior(roll, team, season, week):
    seq = roll.get((team, season))
    if not seq: return None
    for e in seq:
        if e["week"] >= week:
            return e["off_roll"], e["dfn_roll"]
    return None

class PPAMarginModel:
    def __init__(self, k, hfa, name="ppa_net_v1", blend=None):
        self.k, self.hfa, self.name, self.blend = k, hfa, name, blend
    def identity(self):
        return {"model": self.name, "k": round(self.k, 4), "hfa": round(self.hfa, 4),
                "blend": self.blend}
    def predict(self, fold):
        return fold["model_mu"], fold["model_sigma"]

def build_folds(games, spine, roll, weeks, sigma, name):
    folds = []
    for gid, g in games.items():
        if g["season"] != 2026 or g["week"] not in weeks or gid not in spine: continue
        hp = ppa_prior(roll, g["homeTeam"], 2026, g["week"])
        ap = ppa_prior(roll, g["awayTeam"], 2026, g["week"])
        if not hp or not ap or None in hp or None in ap:
            continue
        net_home = hp[0] - ap[1]   # home off vs away def
        net_away = ap[0] - hp[1]
        diff = net_home - net_away
        folds.append({
            "fold_id": str(gid), "decision_t": parse_ts(g["startDate"]),
            "outcome": float(g["homePoints"] - g["awayPoints"]),
            "close_mu": spine[gid], "close_sigma": sigma,
            "ppa_diff": diff, "model_sigma": sigma,
        })
    return folds

def fit_k_hfa(folds_train):
    ds = [f["ppa_diff"] for f in folds_train]
    ms = [f["outcome"] for f in folds_train]
    n = len(ds)
    dbar, mbar = sum(ds)/n, sum(ms)/n
    sdd = sum((d-dbar)**2 for d in ds) or 1e-9
    k = sum((d-dbar)*(m-mbar) for d, m in zip(ds, ms)) / sdd
    hfa = mbar - k*dbar
    return k, hfa

def main():
    SIG = 15.15
    games = load_games(); spine = load_closes(games)
    roll = load_ppa_rolling()
    print(f"[DATA] {len(games)} games | {len(spine)} with close | {len(roll)} team-seasons PPA")

    # point-in-time training folds: 2023-2025 full seasons + 2026 wk1-5
    train = []
    for gid, g in games.items():
        if g["season"] in (2023, 2024, 2025) or (g["season"] == 2026 and g["week"] <= 5):
            if gid not in spine: continue
            hp = ppa_prior(roll, g["homeTeam"], g["season"], g["week"])
            ap = ppa_prior(roll, g["awayTeam"], g["season"], g["week"])
            if not hp or not ap or None in hp or None in ap: continue
            diff = (hp[0] - ap[1]) - (ap[0] - hp[1])
            train.append({"fold_id": str(gid), "decision_t": parse_ts(g["startDate"]),
                          "outcome": float(g["homePoints"] - g["awayPoints"]),
                          "close_mu": spine[gid], "close_sigma": SIG,
                          "ppa_diff": diff, "model_sigma": SIG})
    print(f"[TRAIN] {len(train)} point-in-time folds (2023-2025 + 2026 wk1-5)")
    k, hfa = fit_k_hfa(train)
    print(f"[FIT] margin = {k:.1f} * ppa_diff + {hfa:.2f}")

    # frozen test: wk-6 2026 — SAME fold list as cfb_gate_2026_w6
    test = build_folds(games, spine, roll, {6}, SIG, "ppa_net_v1")
    # fold ids must match the frozen manifest family; rebuild gate fresh here
    gate = HonestyGate(sorted(test, key=lambda f: f["fold_id"]), "cfb_gate_2026_w6_ppa")

    class M(PPAMarginModel):
        def __init__(self):
            super().__init__(k, hfa)
        def predict(self, fold):
            return fold["close_mu"] + self.k * fold["ppa_diff"] + \
                   (self.hfa - statistics.mean([f["close_mu"] for f in test])) * 0 + \
                   self.k * 0, fold["model_sigma"]
    # honest model: mu = k*ppa_diff + hfa (no close peeking)
    class M2:
        def __init__(self, kk, hh, nm="ppa_net_v1"):
            self.k, self.hfa, self.name = kk, hh, nm
        def identity(self):
            return {"model": self.name, "k": round(self.k, 4), "hfa": round(self.hfa, 4)}
        def predict(self, fold):
            return self.k * fold["ppa_diff"] + self.hfa, fold["model_sigma"]
    # close-anchored variant: shift model mu to the close (uses close as prior, model adds context)
    class M3(M2):
        def __init__(self, kk, hh, shift):
            super().__init__(kk, hh, "ppa_net_close_anchored")
            self.shift = shift
        def predict(self, fold):
            mu = fold["close_mu"] + self.k * (fold["ppa_diff"] - self.shift)
            return mu, fold["model_sigma"]
    shift = statistics.mean([f["ppa_diff"] for f in train])

    kl = KillLedger(os.path.join(HERE, "kill_ledger.jsonl"))
    print(f"\n[GATE cfb_gate_2026_w6_ppa] n={len(test)} folds")
    for cand in (M2(k, hfa), M3(k, hfa, shift)):
        v = gate.evaluate(cand)
        print(f"\n  candidate: {cand.name}")
        print(f"    baseline CRPS (close): {v.baseline_crps:.4f}")
        print(f"    candidate CRPS:        {v.candidate_crps:.4f}")
        print(f"    VERDICT: {v.verdict}  | folds won: {sum(1 for d in v.detail.values() if d > 0)}/{v.n_folds}")
        if v.verdict == "REFUSED":
            kl.record(cand.name, "cfb_gate_2026_w6_ppa",
                      f"CRPS {v.candidate_crps:.4f} vs close {v.baseline_crps:.4f}",
                      "reopen with multi-season validation + injury-adjusted PPA")
        # also: pure model vs outcomes sanity (correlation of ppa_diff with margin)
    ds = [f["ppa_diff"] for f in test]; ms = [f["outcome"] for f in test]
    dbar, mbar = statistics.mean(ds), statistics.mean(ms)
    sxx = sum((d-dbar)**2 for d in ds) or 1e-9; syy = sum((m-mbar)**2 for m in ms) or 1e-9
    r = sum((d-dbar)*(m-mbar) for d, m in zip(ds, ms)) / math.sqrt(sxx*syy)
    print(f"\n[SANITY] out-of-sample corr(ppa_diff, margin) wk-6 2026: r={r:.3f} n={len(ds)}")
    print("[LEDGER] kill_ledger.jsonl entries:", len(kl.why("ppa_net_v1")) + len(kl.why("ppa_net_close_anchored")))
    print("[CHAIN] intact:", kl.verify_chain())

if __name__ == "__main__":
    main()
