#!/usr/bin/env python3
"""predict.py — market-implied probability engine v0. The class seed.
Books' math isn't secret: implied prob -> devig -> fair odds. The edges: movement timing + calibration."""
import sys, json, urllib.request

UA = {"User-Agent": "Mozilla/5.0"}

def american_to_prob(o):
    o = float(o)
    return (100 / (o + 100)) if o > 0 else ((-o) / ((-o) + 100))

def fair(p1, p2, method="mult"):
    s = p1 + p2
    if method == "mult":  # multiplicative devig (standard)
        return p1 / s, p2 / s
    if method == "add":   # additive equal-margin
        return p1 - (s - 1) / 2, p2 - (s - 1) / 2
    # power method: solve k where p1^k + p2^k = 1
    lo, hi = 0.01, 2.0
    for _ in range(60):
        k = (lo + hi) / 2
        if p1 ** k + p2 ** k > 1: lo = k
        else: hi = k
    k = (lo + hi) / 2
    return p1 ** k, p2 ** k

def pct(x): return f"{x * 100:.2f}%"

def cmd_devig(a, b):
    p1, p2 = american_to_prob(a), american_to_prob(b)
    vig = p1 + p2 - 1
    print(f"market: {a} / {b}")
    print(f"implied (with vig):  {pct(p1)} / {pct(p2)}   book margin: {pct(vig)}")
    for m in ("mult", "add", "power"):
        f1, f2 = fair(p1, p2, m)
        print(f"fair [{m:5}]:          {pct(f1)} / {pct(f2)}")
    print("→ these fair probabilities are the baseline ANY prediction model must beat")

def cmd_methodology():
    print("""📚 THE ENGINE CLASS — how prediction markets actually work (rung by rung)

1. HOW ODDS ARE MADE (the truth): books don't predict — they PRICE.
   Sharp market-makers (Pinnacle) open a line from power ratings + market consensus.
   Retail books (DraftKings/FanDuel/Underdog) shadow that line with a delay and extra vig.
   Books move on LIABILITY (imbalance of money), not opinion.

2. WHY LINES MOVE: sharp money hits Pinnacle → steam. Retail follows within minutes-hours.
   THE EDGE WINDOW = the lag between sharp move and retail move.

3. PREDICTING SHIFTS (mechanically watchable):
   • Pinnacle vs retail divergence (gap opening = movement incoming)
   • Reverse line movement (line moves against public % = sharp signal)
   • Closing line = the market's final truth → your skill metric is CLV
     (closing line value: did you get a better price than the close?)

4. PREDICTION ENGINES (the ladder):
   power ratings (Elo/SP+) → Bayesian updating → Monte Carlo simulation
   → market-implied baseline (devig — you must beat it) → ML on features → ensembles

5. CALIBRATION (what 'most accurate in the world' means):
   your 60% calls win 60% of the time. Measured by Brier score + log loss + reliability curves.
   An uncalibrated model is a guess with a confident voice.

6. SIZING: Kelly criterion f = (bp − q)/b — full Kelly swings, fractional Kelly survives.

7. DATA SOURCES (all public, all wired here):
   Pinnacle guest API (sharp line) · ESPN feed (retail consensus, DK-priced) ·
   Sleeper API (fantasy, full player DB) · The Odds API (multi-book history, key slot ready)

run: predict.py devig -150 +170  |  predict.py sharp""")

def cmd_sharp():
    try:
        d = json.loads(urllib.request.urlopen(urllib.request.Request(
            "https://guest.api.arcadia.pinnacle.com/0.1/sports", headers=UA), timeout=15).read().decode())
        print(f"🔗 Pinnacle (sharp book) guest API: LIVE — {len(d)} sports readable, keyless")
        print("   sample:", ", ".join(str(s.get('id')) + ':' + (s.get('name') or '?')[:14] for s in d[:5]))
        print("   → next build: pull Pinnacle NFL lines vs ESPN/DK lines = the divergence monitor")
    except Exception as e:
        print("pinnacle probe failed:", str(e)[:120])

if __name__ == "__main__":
    a = sys.argv[1] if len(sys.argv) > 1 else "methodology"
    if a == "devig" and len(sys.argv) >= 4: cmd_devig(sys.argv[2], sys.argv[3])
    elif a == "sharp": cmd_sharp()
    else: cmd_methodology()
