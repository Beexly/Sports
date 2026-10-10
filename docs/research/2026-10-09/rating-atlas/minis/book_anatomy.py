#!/usr/bin/env python3
"""
book_anatomy.py — HOW THE BOOKS ARE MADE, measured from 4 seasons of CFB closes.
For each book (DK, ESPN Bet, Bovada, Caesars/William Hill):
  1. HOLD curve: overround on moneyline pairs, by season
  2. FAVORITE-LONGSHOT bias: where the hold is extracted (fav side vs dog side)
  3. SHADING: book spread vs the cross-book market spine (per-game median)
  4. SHARPNESS: residual sigma of outcome vs book's own close + CRPS leaderboard
  5. TOTALS shading: book total vs market spine total
Kalshi: exchange fee curve = the synthetic spread that replaces vig.
stdlib only.
"""
import json, math, statistics, os
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data")
SEASONS = [2023, 2024, 2025, 2026]
BOOKS = ["DraftKings", "ESPN Bet", "Bovada", "William Hill (New Jersey)", "Caesars Sportsbook (Colorado)"]

def amer_to_imp(a):
    if a is None: return None
    a = float(a)
    return (-a) / (-a + 100) if a < 0 else 100 / (a + 100)

def parse_ts(iso):
    from datetime import datetime
    return datetime.fromisoformat(iso.replace("Z", "+00:00")).timestamp()

def load():
    games = {}          # gid -> row
    for y in SEASONS:
        for g in json.load(open(f"{DATA}/games_{y}.json")):
            if g.get("completed") and g.get("homePoints") is not None \
               and g.get("homeClassification") == "fbs" and g.get("awayClassification") == "fbs":
                games[g["id"]] = g
    # per game per book: latest line-set before kickoff (the close)
    book_lines = defaultdict(dict)   # book -> gid -> {spread, ou, hml, aml, ts}
    for y in SEASONS:
        for lr in json.load(open(f"{DATA}/lines_{y}.json")):
            gid = lr["id"]
            if gid not in games: continue
            for ln in lr.get("lines", []):
                p = ln.get("provider")
                if p not in BOOKS: continue
                ts = ln.get("lastUpdate") or ""
                cur = book_lines[p].get(gid)
                if cur is None or ts >= cur.get("ts", ""):
                    book_lines[p][gid] = {"spread": ln.get("spread"), "ou": ln.get("overUnder"),
                                          "hml": ln.get("homeMoneyline"), "aml": ln.get("awayMoneyline"),
                                          "ts": ts}
    return games, book_lines

def main():
    games, BL = load()
    print(f"[DATA] {len(games)} completed FBS games; book close coverage: "
          + ", ".join(f"{b}: {len(v)}" for b, v in BL.items()))

    # market spine: cross-book median spread/total per game
    spine_sp, spine_ou = {}, {}
    for gid in games:
        sps, ous = [], []
        for b, d in BL.items():
            if gid in d:
                if d[gid]["spread"] is not None: sps.append(d[gid]["spread"])
                if d[gid]["ou"] is not None: ous.append(d[gid]["ou"])
        if len(sps) >= 3: spine_sp[gid] = statistics.median(sps)
        if len(ous) >= 3: spine_ou[gid] = statistics.median(ous)
    print(f"[SPINE] {len(spine_sp)} spreads, {len(spine_ou)} totals")

    print("\n" + "=" * 100)
    print("1) HOLD — moneyline overround by book (the book's gross margin on ML markets)")
    print(f"{'book':<32}{'2023':>8}{'2024':>8}{'2025':>8}{'2026':>8}{'all':>8}   n")
    holds_all = {}
    for b in BOOKS:
        per = defaultdict(list)
        for gid, d in BL[b].items():
            i1, i2 = amer_to_imp(d["hml"]), amer_to_imp(d["aml"])
            if i1 and i2:
                per[games[gid]["season"]].append(i1 + i2 - 1)
        if not per: continue
        row = [100 * statistics.mean(per[y]) if per[y] else float('nan') for y in SEASONS]
        al = [x for y in SEASONS for x in per[y]]
        holds_all[b] = statistics.mean(al)
        print(f"{b:<32}" + "".join(f"{v:>7.2f}%" for v in row) + f"{100*statistics.mean(al):>7.2f}%   {len(al)}")

    print("\n2) FAVORITE-LONGSHOT BIAS — hold extracted from dog side vs fav side")
    print(f"{'book':<32}{'avg fav prob':>13}{'dog excess p':>13}{'fav excess p':>13}")
    for b in BOOKS:
        dog_x, fav_x, favp = [], [], []
        for gid, d in BL[b].items():
            i1, i2 = amer_to_imp(d["hml"]), amer_to_imp(d["aml"])
            if not (i1 and i2): continue
            fav_i, dog_i = max(i1, i2), min(i1, i2)
            s = i1 + i2
            fair_f, fair_d = fav_i / s, dog_i / s
            favp.append(fair_f); dog_x.append(dog_i - fair_d); fav_x.append(fav_i - fair_f)
        if not favp: continue
        print(f"{b:<32}{statistics.mean(favp):>13.3f}{100*statistics.mean(dog_x):>12.2f}%{100*statistics.mean(fav_x):>12.2f}%")

    print("\n3) SHADING — book spread minus market-spine spread (negative = shaded toward home/fav side)")
    print(f"{'book':<32}{'n':>6}{'mean shade':>11}{'p10':>7}{'p90':>7}{'sigma':>7}")
    shade_all = {}
    for b in BOOKS:
        ds = [BL[b][gid]["spread"] - spine_sp[gid] for gid in BL[b] if gid in spine_sp
              and BL[b][gid]["spread"] is not None]
        if len(ds) < 30: continue
        ds.sort()
        shade_all[b] = statistics.mean(ds)
        p10 = ds[int(0.1 * len(ds))]; p90 = ds[int(0.9 * len(ds))]
        print(f"{b:<32}{len(ds):>6}{statistics.mean(ds):>11.2f}{p10:>7.1f}{p90:>7.1f}{statistics.stdev(ds):>7.2f}")

    print("\n4) SHARPNESS — CRPS of Gaussian(book close, CFB sigma=15.15) vs outcome; lower = sharper close")
    SIG = 15.15
    def crps_g(mu, sig, x):
        z = (x - mu) / sig
        return sig * (z * (2 * 0.5 * (1 + math.erf(z / math.sqrt(2))) - 1) +
                      2 * math.exp(-0.5 * z * z) / math.sqrt(2 * math.pi) - 1 / math.sqrt(math.pi))
    print(f"{'book':<32}{'n':>6}{'CRPS':>8}{'resid sigma':>12}{'resid mean':>11}")
    crps_all = {}
    for b in BOOKS:
        cs, rs = [], []
        for gid, d in BL[b].items():
            if d["spread"] is None: continue
            g = games[gid]
            margin = g["homePoints"] - g["awayPoints"]
            hml, aml = d["hml"], d["aml"]
            if hml is not None and aml is not None and hml != aml:
                mu = abs(d["spread"]) if hml < aml else -abs(d["spread"])
            else:
                mu = -d["spread"]   # CFBD away-perspective fallback
            cs.append(crps_g(mu, SIG, margin)); rs.append(margin - mu)
        if len(cs) < 100: continue
        crps_all[b] = statistics.mean(cs)
        print(f"{b:<32}{len(cs):>6}{statistics.mean(cs):>8.3f}{statistics.stdev(rs):>12.2f}{statistics.mean(rs):>11.2f}")

    print("\n5) TOTALS — book total vs spine total")
    print(f"{'book':<32}{'n':>6}{'mean diff':>10}{'sigma':>7}")
    for b in BOOKS:
        ds = [BL[b][gid]["ou"] - spine_ou[gid] for gid in BL[b]
              if gid in spine_ou and BL[b][gid]["ou"] is not None]
        if len(ds) < 30: continue
        print(f"{b:<32}{len(ds):>6}{statistics.mean(ds):>10.2f}{statistics.stdev(ds):>7.2f}")

    # ---------------- KALSHI: fee curve = synthetic spread ----------------
    print("\n6) KALSHI — exchange, no vig; the 7c quadratic taker fee IS the spread")
    print("   fee(cents) = 7 * p * (1-p);  round-trip taker cost vs p:")
    for p in (0.1, 0.25, 0.5, 0.75, 0.9):
        fee = 7 * p * (1 - p)
        print(f"   p={p:.2f}: taker fee {fee:.2f}c/contract; yes+no round trip {(p*100)+((1-p)*100):.1f}c "
              f"vs fair 100c => synthetic overround {fee*2:.2f}c (~{fee*2:.2f}% of notional)")
    print("   => Kalshi 'hold' equivalent at p=.5: 3.5c/side = 7c round trip = 7% — "
          "cheaper than retail ML holds above; maker side = free = the quoter's edge.")

    print("\n" + "=" * 100)
    print("REVENUE MODEL READ (how each book sleeps):")
    for b, h in sorted(holds_all.items(), key=lambda x: -x[1]):
        print(f"   {b:<32} ML hold {100*h:.2f}% | shade {shade_all.get(b, 0):+.2f} | CRPS {crps_all.get(b, 0):.3f}")
    json.dump({"holds": {k: round(v, 5) for k, v in holds_all.items()},
               "shade": {k: round(v, 3) for k, v in shade_all.items()},
               "crps": {k: round(v, 4) for k, v in crps_all.items()}},
              open(os.path.join(HERE, "book_anatomy_2026.json"), "w"), indent=1)
    print("saved book_anatomy_2026.json")

if __name__ == "__main__":
    main()
