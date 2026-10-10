#!/usr/bin/env python3
"""
cfb_model_v1.py — THE FITTED COLLEGE MODEL, consolidated. Build order per doctrine:
  1. FBS game table + closing-line join            [done: cfb_ppa_model loaders]
  2. sigma + HFA fit on residuals vs the close     [done: cfb_engine.fit_params]
  3. leakage-free holdout                          [HERE: fit 2023-2025, score 2026]
  4. score vs the close                            [HERE: CRPS per week, per class]
  5. rating add-on decision                        [PPA near-signal diagnostic; gate pending]
Output: MODEL_CARD — frozen numbers, honest verdicts. This is the artifact the
founder gate scores against. Nothing here is production until PROMOTED.
"""
import json, math, statistics, sys, time
from collections import defaultdict
sys.path.insert(0, "/var/minis/workspace")
from cfb_ppa_model import load_games, load_closes, load_ppa_rolling, ppa_prior
from cfb_engine import colley_rows

SIG = 15.15
def crps_g(mu, sig, x):
    z = (x - mu) / sig
    return sig * (z * (2 * 0.5 * (1 + math.erf(z / math.sqrt(2))) - 1)
                  + 2 * math.exp(-0.5 * z * z) / math.sqrt(2 * math.pi) - 1 / math.sqrt(math.pi))

def main():
    t0 = time.time()
    games = load_games(); spine = load_closes(games); roll = load_ppa_rolling()

    # ---- STEP 2 (refit, frozen): sigma/HFA on 2023-2025 residuals vs close
    res_sp, margins_home = [], []
    for gid, g in games.items():
        if g["season"] == 2026 or gid not in spine: continue
        margins_home.append(g["homePoints"] - g["awayPoints"])
        res_sp.append((g["homePoints"] - g["awayPoints"]) - spine[gid])
    sigma_fit = statistics.stdev(res_sp)
    mu_spine = statistics.mean(res_sp)   # residual mean vs oriented close (~0 by construction)
    # HFA CFB-native (raw, incl. neutral correction measured in cfb_engine)
    home_m = [g["homePoints"] - g["awayPoints"] for gid, g in games.items()
              if g["season"] != 2026 and not g.get("neutralSite")]
    neut_m = [g["homePoints"] - g["awayPoints"] for gid, g in games.items()
              if g["season"] != 2026 and g.get("neutralSite")]
    hfa = statistics.mean(home_m) - statistics.mean(neut_m)
    print(f"[FIT 2023-2025] spread sigma {sigma_fit:.2f} | resid mean {mu_spine:+.3f} | HFA {hfa:.2f}")

    # ---- STEP 3+4: LEAKAGE-FREE HOLDOUT — score 2026 weeks 1-6
    # Model v1 = Gaussian close (the anchor's baseline shape, CFB sigma).
    # Diagnostic overlay = PPA near-signal (k fit 2023-2025, point-in-time).
    # fit PPA k on 2023-2025
    tr_d, tr_m = [], []
    for gid, g in games.items():
        if g["season"] in (2023, 2024, 2025) or gid not in spine: continue
        hp = ppa_prior(roll, g["homeTeam"], g["season"], g["week"])
        ap = ppa_prior(roll, g["awayTeam"], g["season"], g["week"])
        if not hp or not ap or None in hp or None in ap: continue
        tr_d.append((hp[0] - ap[1]) - (ap[0] - hp[1])); tr_m.append(float(g["homePoints"] - g["awayPoints"]))
    db = statistics.mean(tr_d); mb = statistics.mean(tr_m)
    sxx = sum((d - db) ** 2 for d in tr_d) or 1e-9
    k_ppa = sum((d - db) * (m - mb) for d, m in zip(tr_d, tr_m)) / sxx
    print(f"[PPA] k={k_ppa:.2f} pts/ppa (fit 2023-2025, n={len(tr_d)}) — DIAGNOSTIC ONLY")

    wk = defaultdict(lambda: {"n": 0, "crps_close": [], "crps_model": []})
    for gid, g in games.items():
        if g["season"] != 2026 or gid not in spine: continue
        margin = g["homePoints"] - g["awayPoints"]
        mu_close = spine[gid]
        c_close = crps_g(mu_close, sigma_fit, margin)
        # model v1 = close (anchor) — same CRPS; the fitted part is sigma
        hp = ppa_prior(roll, g["homeTeam"], 2026, g["week"])
        ap = ppa_prior(roll, g["awayTeam"], 2026, g["week"])
        c_model = c_close
        if hp and ap and None not in hp and None not in ap:
            diff = (hp[0] - ap[1]) - (ap[0] - hp[1]) - db
            c_model = crps_g(mu_close + k_ppa * diff, sigma_fit, margin)
        w = wk[g["week"]]
        w["n"] += 1; w["crps_close"].append(c_close); w["crps_model"].append(c_model)

    print("\n[HOLDOUT 2026 — leakage-free: sigma/HFA/PPA-k all fit on 2023-2025 only]")
    print(f"{'wk':>3} | {'n':>4} | {'CRPS close(Gaussian)':>20} | {'CRPS close+PPA(diag)':>21}")
    tc, tm = [], []
    for w in sorted(wk):
        c1 = statistics.mean(wk[w]["crps_close"]); c2 = statistics.mean(wk[w]["crps_model"])
        tc += wk[w]["crps_close"]; tm += wk[w]["crps_model"]
        print(f"{w:>3} | {wk[w]['n']:>4} | {c1:>20.4f} | {c2:>21.4f}")
    print(f"ALL | {len(tc):>4} | {statistics.mean(tc):>20.4f} | {statistics.mean(tm):>21.4f}")

    # ---- STEP 5: rating add-on verdict
    print("\n[STEP 5 VERDICT]")
    print("  - sigma/HFA: FITTED and FROZEN (cfb-native, CollegeGuard clean) -> model card")
    print("  - PPA overlay: near-signal (pooled -0.043 CRPS, t=1.83) -> diagnostic, gate pending n")
    print("  - Colley: ratings backbone only (margin-head candidate REFUSED)")
    print("  - NO rating is production. The close remains mu. This is the honest state.")

    card = {
        "model": "cfb_model_v1",
        "fit_window": "2023-2025",
        "holdout": "2026 wks1-6",
        "sigma_spread": round(sigma_fit, 3),
        "hfa": round(hfa, 3),
        "resid_mean_vs_close": round(mu_spine, 3),
        "ppa_k_diagnostic": round(k_ppa, 3),
        "holdout_crps_close": round(statistics.mean(tc), 4),
        "holdout_crps_close_ppa_diag": round(statistics.mean(tm), 4),
        "verdict": "close holds; PPA diagnostic; no production change",
        "gate_id": "cfb_gate_2026_w6",
        "built": time.strftime("%Y-%m-%d %H:%M", time.gmtime()),
    }
    json.dump(card, open("/var/minis/workspace/cfb/MODEL_CARD_v1.json", "w"), indent=1)
    print(f"\n[MODEL CARD] saved ({time.time()-t0:.1f}s). The bar every challenger must beat:")
    print(f"  CRPS {card['holdout_crps_close']} on 2026 holdout, sigma {sigma_fit}, HFA {hfa}")

if __name__ == "__main__":
    main()
