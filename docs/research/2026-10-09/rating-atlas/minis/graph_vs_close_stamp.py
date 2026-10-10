#!/usr/bin/env python3
"""
graph_vs_close_stamp.py — the residual-vs-close stamp for the situational layer.
Candidate: drive-efficiency (points per drive, point-in-time rolling from the
drives warehouse — the situational graph's drive-level output) as a close-anchored
margin adjustment. Gate: frozen wk-6 2026 folds, Gaussian close baseline.
"""
import json, statistics, sys, math
from collections import defaultdict
sys.path.insert(0, "/var/minis/workspace")
from cfb_ppa_model import load_games, load_closes
from doctrine import HonestyGate, KillLedger

DATA = "/var/minis/workspace/cfb/data"
SIG = 15.15

def ppd_rolling(games):
    """(team, season) -> sorted [(week, ppd_roll)]; week sourced from games warehouse."""
    gid_meta = {g["id"]: (g["season"], g["week"]) for g in games.values()}
    gw = defaultdict(lambda: [0, 0])
    for y in (2024, 2025, 2026):
        for d in json.load(open(f"{DATA}/cfb_drives_{y}.json")):
            meta = gid_meta.get(d["gameId"])
            if not meta or meta[0] != y: continue
            key = (d["offense"], y, d["gameId"])
            gw[key][0] += max(0, (d.get("endOffenseScore") or 0) - (d.get("startOffenseScore") or 0))
            gw[key][1] += 1
    # rolling ppd per (team, season)
    roll = defaultdict(list)
    per_team_season = defaultdict(list)
    for (t, y, gid), (pts, n) in gw.items():
        week = gid_meta[gid][1]
        per_team_season[(t, y)].append((week, gid, pts / max(1, n)))
    for key, lst in per_team_season.items():
        lst.sort()
        hist = []
        for wk, gid, ppd in lst:
            roll[key].append({"week": wk, "ppd_roll": statistics.mean(hist) if hist else None})
            hist.append(ppd)
    return roll

def main():
    games = load_games(); spine = load_closes(games)
    roll = ppd_rolling(games)
    def prior(team, season, week):
        seq = roll.get((team, season))
        if not seq: return None
        for e in seq:
            if e["week"] is not None and e["week"] >= week: return e["ppd_roll"]
        return None
    # fit k on 2023-2025 point-in-time
    tr = []
    for gid, g in games.items():
        if g["season"] not in (2024, 2025) or gid not in spine: continue
        hp, ap = prior(g["homeTeam"], g["season"], g["week"]), prior(g["awayTeam"], g["season"], g["week"])
        if hp is None or ap is None: continue
        tr.append((hp - ap, float(g["homePoints"] - g["awayPoints"])))
    db = statistics.mean(x for x, _ in tr); mb = statistics.mean(m for _, m in tr)
    sxx = sum((x - db) ** 2 for x, _ in tr) or 1e-9
    k = sum((x - db) * (m - mb) for x, m in tr) / sxx
    shift = db
    print(f"[FIT] drive-PPD slope k={k:.2f} pts per PPD-diff (n={len(tr)}, 2024-2025 point-in-time)")

    folds = []
    for gid, g in games.items():
        if g["season"] != 2026 or g["week"] != 6 or gid not in spine: continue
        hp, ap = prior(g["homeTeam"], 2026, g["week"]), prior(g["awayTeam"], 2026, g["week"])
        if hp is None or ap is None: continue
        folds.append({"fold_id": str(gid), "decision_t": 0,
                      "outcome": float(g["homePoints"] - g["awayPoints"]),
                      "close_mu": spine[gid], "close_sigma": SIG,
                      "ppd_diff": hp - ap})
    gate = HonestyGate(sorted(folds, key=lambda f: f["fold_id"]), "cfb_gate_2026_w6_ppd")
    class Cand:
        name = "ppd_net_close_anchored"
        def identity(self): return {"model": self.name, "k": round(k, 3), "shift": round(shift, 3)}
        def predict(self, fold):
            return fold["close_mu"] + k * (fold["ppd_diff"] - shift), fold["close_sigma"]
    v = gate.evaluate(Cand())
    print(f"\n[GATE cfb_gate_2026_w6_ppd] n={len(folds)}")
    print(f"  close CRPS:        {v.baseline_crps:.4f}")
    print(f"  close+PPD CRPS:    {v.candidate_crps:.4f}")
    print(f"  VERDICT: {v.verdict} | folds won: {sum(1 for d in v.detail.values() if d > 0)}/{v.n_folds}")
    kl = KillLedger("/var/minis/workspace/cfb/kill_ledger.jsonl")
    kl.record("ppd_net_close_anchored", "cfb_gate_2026_w6_ppd (frozen)",
              f"{v.verdict}: {v.candidate_crps:.4f} vs close {v.baseline_crps:.4f}, won {sum(1 for d in v.detail.values() if d>0)}/{v.n_folds}",
              "REOPEN: pooled multi-week test (mirroring PPA pooled protocol), t>=1.96 on locked folds")
    print(f"  ledger: {len(kl._entries)} entries | chain {kl.verify_chain()}")

if __name__ == "__main__":
    main()
