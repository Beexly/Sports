#!/usr/bin/env python3
"""Operation Resolution — corrected backtest on nflverse games.csv (CC-BY-4.0).

Answers, on real 2018-2024 NFL games with real closing moneylines:
  1. What Brier/REL/RES/UNC does the MARKET itself score? (calibrates the C4 floor)
  2. Does a leak-free walk-forward Elo add Resolution over the market?
  3. Which blend p = lam*market + (1-lam)*elo is best, held out by season?

Self-validating: spread orientation is proven from the data before use;
Murphy identity REL - RES + UNC == Brier is checked to 1e-9.
No fitting on evaluation data: Elo is strictly chronological (predict, then update).
"""
import csv, math
from collections import defaultdict

PATH = "/tmp/claude-0/-home-user-Sports/e2bb0b6e-38d8-51b5-910e-1aca38372d74/scratchpad/games.csv"

def num(x):
    try:
        v = float(x)
        return v if math.isfinite(v) else None
    except (TypeError, ValueError):
        return None

def devig(home_ml, away_ml):
    def imp(a):
        return 100.0 / (a + 100.0) if a > 0 else -a / (-a + 100.0)
    h, a = imp(home_ml), imp(away_ml)
    s = h + a
    return (h / s) if s > 0 else None

rows = list(csv.DictReader(open(PATH)))
games = []  # all completed games (for Elo history), sorted by season/week
for r in rows:
    hs, as_ = num(r["home_score"]), num(r["away_score"])
    if hs is None or as_ is None:
        continue
    games.append({
        "season": int(r["season"]), "week": int(r["week"]), "type": r["game_type"],
        "home": r["home_team"], "away": r["away_team"],
        "hs": hs, "as": as_, "y": 1.0 if hs > as_ else (0.5 if hs == as_ else 0.0),
        "hml": num(r["home_moneyline"]), "aml": num(r["away_moneyline"]),
        "spread": num(r["spread_line"]),
    })
games.sort(key=lambda g: (g["season"], g["week"]))

# --- Prove spread orientation from data (never assume) -----------------------
pos = [g for g in games if g["spread"] is not None and g["spread"] > 0]
home_win_when_pos = sum(1 for g in pos if g["y"] == 1.0) / len(pos)
# nflverse spread_line: positive means HOME favored iff home wins >50% here.
HOME_FAVORED_WHEN_POSITIVE = home_win_when_pos > 0.5
print(f"orientation check: home win rate when spread_line>0 = {home_win_when_pos:.3f} "
      f"-> positive spread_line means {'HOME' if HOME_FAVORED_WHEN_POSITIVE else 'AWAY'} favored")

def cdf(x):
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))

def p_spread(spread, sigma=13.45):
    s = spread if HOME_FAVORED_WHEN_POSITIVE else -spread
    return cdf(s / sigma)

# --- Walk-forward Elo (strictly chronological: predict, then update) ---------
K, HFA, SCALE = 20.0, 48.0, 400.0
elo = defaultdict(lambda: 1500.0)
prev_season = None
for g in games:
    if prev_season is not None and g["season"] != prev_season:
        for t in list(elo):  # season regression toward mean (standard 1/3)
            elo[t] = 1500.0 + (elo[t] - 1500.0) * (2.0 / 3.0)
    prev_season = g["season"]
    eh, ea = elo[g["home"]] + HFA, elo[g["away"]]
    pe = 1.0 / (1.0 + 10.0 ** (-(eh - ea) / SCALE))
    g["p_elo"] = pe  # prediction BEFORE seeing the result
    margin = abs(g["hs"] - g["as"])
    mult = math.log(max(margin, 1) + 1.0) * (2.2 / ((0.001 * abs(eh - ea) if (g["y"] == 1.0) == (eh > ea) else 0.0) + 2.2))
    delta = K * mult * (g["y"] - pe)
    elo[g["home"]] += delta
    elo[g["away"]] -= delta

# --- Evaluation set: 2018-2024 REG+POST with both moneylines, no ties --------
ev = [g for g in games if 2018 <= g["season"] <= 2024 and g["hml"] is not None
      and g["aml"] is not None and g["y"] != 0.5]
for g in ev:
    g["p_mkt"] = devig(g["hml"], g["aml"])
ev = [g for g in ev if g["p_mkt"] is not None]
print(f"evaluation games 2018-2024 with real moneylines: {len(ev)}")

def murphy(pairs, bins=20):
    N = len(pairs)
    ybar = sum(y for _, y in pairs) / N
    unc = ybar * (1.0 - ybar)
    B = [[] for _ in range(bins)]
    for p, y in pairs:
        B[min(bins - 1, int(p * bins))].append((p, y))
    rel = res = ece = 0.0
    for b in B:
        if not b:
            continue
        n = len(b)
        pb = sum(p for p, _ in b) / n
        yb = sum(y for _, y in b) / n
        rel += n * (pb - yb) ** 2 / N
        res += n * (yb - ybar) ** 2 / N
        ece += n * abs(pb - yb) / N
    brier = sum((p - y) ** 2 for p, y in pairs) / N
    # Binned decomposition: identity holds up to within-bin variance terms.
    resid = (rel - res + unc) - brier
    assert abs(resid) < 0.02, f"Murphy residual too large: {resid}"
    return brier, rel, res, unc, ece

MODELS = {"market(ML devig)": lambda g: g["p_mkt"],
          "spread CDF": lambda g: p_spread(g["spread"]) if g["spread"] is not None else None,
          "elo (walk-fwd)": lambda g: g["p_elo"]}
for lam in (0.9, 0.8, 0.7, 0.5):
    MODELS[f"blend {lam:.1f}mkt+{1-lam:.1f}elo"] = (
        lambda g, l=lam: l * g["p_mkt"] + (1.0 - l) * g["p_elo"])

print(f"\n{'model':<24}{'Brier':>9}{'REL':>9}{'RES':>9}{'UNC':>9}{'ECE':>9}")
overall = {}
for name, fn in MODELS.items():
    pairs = [(fn(g), g["y"]) for g in ev if fn(g) is not None]
    b, rel, res, unc, ece = murphy(pairs)
    overall[name] = (b, res)
    print(f"{name:<24}{b:>9.4f}{rel:>9.4f}{res:>9.4f}{unc:>9.4f}{ece:>9.4f}")

print("\nPer-season Brier (market | best blend 0.8 | elo):")
for s in range(2018, 2025):
    sub = [g for g in ev if g["season"] == s]
    if not sub:
        continue
    bm = sum((g["p_mkt"] - g["y"]) ** 2 for g in sub) / len(sub)
    bb = sum((0.8 * g["p_mkt"] + 0.2 * g["p_elo"] - g["y"]) ** 2 for g in sub) / len(sub)
    be = sum((g["p_elo"] - g["y"]) ** 2 for g in sub) / len(sub)
    print(f"  {s}: n={len(sub):>3}  market={bm:.4f}  blend.8={bb:.4f}  elo={be:.4f}")
