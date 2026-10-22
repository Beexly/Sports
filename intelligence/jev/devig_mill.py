"""Devig-method calibration mill: proportional vs Shin, closing MLs 2019-2025.

The Architectural Blueprint mandates Shin devigging ("proportional overweights
favorites at extreme lines"); the production receipts deliberately use
mean-implied proportional (AGENTS.md, 2026-09-05/06 records). This mill tests
which devig method calibrates better on our corpus. Pre-stated readout:
per-bin implied-vs-realized for both methods + overall Brier/log-loss.
NOTE: our market-calibration mill found heavy favorites OUTPERFORM their
proportional-devigged implied prob (0.88 -> 0.918) - if Shin lowers favorite
probabilities further, it should WORSEN top-bin calibration on this corpus.
Prediction: proportional wins or ties on the 0.85+ bin.
"""
import numpy as np
import pandas as pd
from scipy.optimize import brentq

DATA = "data"
sched = pd.read_csv(f"{DATA}/schedules.csv", low_memory=False)
s = sched[(sched.game_type == "REG")].dropna(
    subset=["home_score", "away_score", "home_moneyline", "away_moneyline"]).copy()
s["margin"] = s.home_score - s.away_score
s["home_win"] = (s.margin > 0).astype(float)


def imp(o):
    o = float(o)
    return 100.0 / (100.0 + abs(o)) if o > 0 else abs(o) / (abs(o) + 100.0)


s["pi_h"] = s.home_moneyline.map(imp)
s["pi_a"] = s.away_moneyline.map(imp)
s["p_prop_h"] = s.pi_h / (s.pi_h + s.pi_a)


def shin_z(pi_fav, pi_dog):
    """Solve Shin's z: pi_dog*(1-z) + pi_fav - z*pi_fav*(pi_dog*(1-z)+... simplified
    form from Shin (1992/1993) for two-way markets. Standard formulation:
    pi_fav = z + (1-z)*p_fair_fav ; pi_dog = (1-z)*p_fair_dog ; sum p_fair = 1.
    => p_fair_fav = (pi_fav - z) / (1 - z), p_fair_dog = pi_dog / (1 - z),
    with (pi_fav - z + pi_dog) = (1 - z) -> z = pi_fav + pi_dog - 1.
    (Two-outcome closed form; z = overround share attributable to insider trades.)"""
    return pi_fav + pi_dog - 1.0


def shin_home_prob(pi_h, pi_a):
    pi_fav = max(pi_h, pi_a)
    pi_dog = min(pi_h, pi_a)
    z = shin_z(pi_fav, pi_dog)
    # guard: z in [0, overround)
    z = min(max(z, 0.0), pi_fav + pi_dog - 1e-9)
    p_fav = (pi_fav - z) / (1 - z)
    p_home = p_fav if pi_h >= pi_a else 1.0 - p_fav
    return p_home


s["p_shin_h"] = [shin_home_prob(h, a) for h, a in zip(s.pi_h, s.pi_a)]

print("bin        n    prop_impl  prop_real | shin_impl  shin_real")
for lo, hi in [(0.30, 0.40), (0.40, 0.50), (0.50, 0.60), (0.60, 0.70), (0.70, 0.85), (0.85, 1.0)]:
    d = s[(s.p_prop_h >= lo) & (s.p_prop_h < hi)]
    if len(d) < 50:
        continue
    print(f"{lo:.2f}-{hi:.2f}  {len(d):4d}   {d.p_prop_h.mean():.4f}    "
          f"{d.home_win.mean():.4f}  |  {d.p_shin_h.mean():.4f}    {d.home_win.mean():.4f}")

b_prop = float(np.mean((s.p_prop_h - s.home_win) ** 2))
b_shin = float(np.mean((s.p_shin_h - s.home_win) ** 2))
ll_prop = float(-np.mean(s.home_win * np.log(s.p_prop_h) + (1 - s.home_win) * np.log(1 - s.p_prop_h)))
ll_shin = float(-np.mean(s.home_win * np.log(s.p_shin_h) + (1 - s.home_win) * np.log(1 - s.p_shin_h)))
print(f"\nOVERALL  proportional: Brier {b_prop:.4f} logloss {ll_prop:.4f}")
print(f"         Shin:         Brier {b_shin:.4f} logloss {ll_shin:.4f}")
print(f"delta Brier (shin-prop): {b_shin - b_prop:+.4f}  |  "
      f"{'Shin better' if b_shin < b_prop else 'PROPORTIONAL better or tied'}")
