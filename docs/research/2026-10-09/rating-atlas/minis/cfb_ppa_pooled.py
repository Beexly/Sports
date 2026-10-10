#!/usr/bin/env python3
"""cfb_ppa_pooled.py — pooled 2026 test of the close-anchored PPA context (n~600)."""
import json, math, statistics, sys
from collections import defaultdict
sys.path.insert(0, "/var/minis/workspace")
from cfb_ppa_model import load_games, load_closes, load_ppa_rolling, ppa_prior

SIG = 15.15

def crps_g(mu, sig, x):
    z = (x - mu) / sig
    return sig * (z * (2 * 0.5 * (1 + math.erf(z / math.sqrt(2))) - 1)
                  + 2 * math.exp(-0.5 * z * z) / math.sqrt(2 * math.pi) - 1 / math.sqrt(math.pi))

games = load_games(); spine = load_closes(games); roll = load_ppa_rolling()

tr_d, tr_m = [], []
for gid, g in games.items():
    if g["season"] not in (2023, 2024, 2025) or gid not in spine: continue
    hp = ppa_prior(roll, g["homeTeam"], g["season"], g["week"])
    ap = ppa_prior(roll, g["awayTeam"], g["season"], g["week"])
    if not hp or not ap or None in hp or None in ap: continue
    tr_d.append((hp[0] - ap[1]) - (ap[0] - hp[1]))
    tr_m.append(float(g["homePoints"] - g["awayPoints"]))
dbar_tr = statistics.mean(tr_d)
db, mb = dbar_tr, statistics.mean(tr_m)
sdd = sum((d - db) ** 2 for d in tr_d) or 1e-9
k = sum((d - db) * (m - mb) for d, m in zip(tr_d, tr_m)) / sdd
print(f"[FIT] k={k:.2f} pts/ppa, hfa absorbed, n={len(tr_d)} (2023-2025, point-in-time PPA)")

wmap = defaultdict(lambda: ([], [], []))
for gid, g in games.items():
    if g["season"] != 2026 or g["week"] < 2 or gid not in spine: continue
    hp = ppa_prior(roll, g["homeTeam"], 2026, g["week"])
    ap = ppa_prior(roll, g["awayTeam"], 2026, g["week"])
    if not hp or not ap or None in hp or None in ap: continue
    diff = (hp[0] - ap[1]) - (ap[0] - hp[1]) - dbar_tr
    margin = float(g["homePoints"] - g["awayPoints"])
    mu_c = spine[gid]
    mu_m = mu_c + k * diff
    wmap[g["week"]][0].append(mu_c); wmap[g["week"]][1].append(mu_m)
    wmap[g["week"]][2].append(margin)

allc, allm = [], []
print(f"\n{'week':>4} | {'n':>4} | {'close CRPS':>10} | {'+PPA CRPS':>10} | {'delta':>7}")
for w in sorted(wmap):
    cs, ms_, os_ = wmap[w]
    c1 = statistics.mean(crps_g(m, SIG, o) for m, o in zip(cs, os_))
    c2 = statistics.mean(crps_g(m, SIG, o) for m, o in zip(ms_, os_))
    allc += [crps_g(m, SIG, o) for m, o in zip(cs, os_)]
    allm += [crps_g(m, SIG, o) for m, o in zip(ms_, os_)]
    print(f"{w:>4} | {len(os_):>4} | {c1:>10.4f} | {c2:>10.4f} | {c2-c1:>+7.4f}")
print(f"\nPOOLED n={len(allc)}: close {statistics.mean(allc):.4f} vs close+PPA {statistics.mean(allm):.4f} "
      f"({'PPA context WINS by' if statistics.mean(allm) < statistics.mean(allc) else 'close holds by'} "
      f"{abs(statistics.mean(allc)-statistics.mean(allm)):.4f})")

# residual regression: is PPA residual predictive after close? (the real question)
xs = [m - c for w in wmap for m, c, in zip(wmap[w][1], wmap[w][0])]
ys = [o - c for w in wmap for c, o in zip(wmap[w][0], wmap[w][2])]
db2, mb2 = statistics.mean(xs), statistics.mean(ys)
sxx = sum((x - db2) ** 2 for x in xs) or 1e-9
syy = sum((y - mb2) ** 2 for y in ys) or 1e-9
sxy = sum((x - db2) * (y - mb2) for x, y in zip(xs, ys))
r = sxy / math.sqrt(sxx * syy)
t = r * math.sqrt(len(xs) - 2) / math.sqrt(max(1e-9, 1 - r * r))
print(f"\n[DIAGNOSTIC] corr(close_model_delta, close_residual): r={r:.3f}, t={t:+.2f}, n={len(xs)}")
print("  t>~2 => PPA carries information the close has NOT priced -> registry candidate")
