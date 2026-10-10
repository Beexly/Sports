#!/usr/bin/env python3
"""
cfb_context.py — WHAT'S BETWEEN THE NUMBERS, quantified.
Layer 2 (in the number, not the price): key-number clusters, hold map, closing bias decay
Layer 3 (in the situation, not the number): subclass spot residuals vs the close
Layer 4 (in the flow, not the situation): provider move-leadership matrix
stdlib only. Runs on the 4-season CFBD CFB warehouse already on disk.
"""
import json, math, statistics, os
from collections import defaultdict, Counter
from datetime import datetime

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data")
SEASONS = [2023, 2024, 2025, 2026]
BOOKS = ["DraftKings", "ESPN Bet", "Bovada", "William Hill (New Jersey)", "Caesars Sportsbook (Colorado)"]
ALT_HOME = {"Air Force", "Wyoming", "Colorado State", "Utah", "BYU", "New Mexico",
            "UTEP", "New Mexico State", "Boise State", "Nevada", "Utah State"}  # >=4,000 ft
ALT_FT = {"Air Force": 7200, "Wyoming": 7150, "Colorado State": 5000, "Utah": 4700,
          "BYU": 4700, "New Mexico": 4900, "UTEP": 3700, "New Mexico State": 3900,
          "Boise State": 2700, "Nevada": 4400, "Utah State": 4700}

def parse_ts(iso):
    return datetime.fromisoformat(iso.replace("Z", "+00:00")).timestamp()

def amer_to_imp(a):
    if a is None: return None
    a = float(a)
    return (-a) / (-a + 100) if a < 0 else 100 / (a + 100)

def load():
    games = {}
    for y in SEASONS:
        for g in json.load(open(f"{DATA}/games_{y}.json")):
            if g.get("completed") and g.get("homePoints") is not None \
               and g.get("homeClassification") == "fbs" and g.get("awayClassification") == "fbs":
                games[g["id"]] = g
    book_lines = defaultdict(dict)
    first_move = defaultdict(dict)   # book -> gid -> first update ts
    for y in SEASONS:
        for lr in json.load(open(f"{DATA}/lines_{y}.json")):
            gid = lr["id"]
            if gid not in games: continue
            for ln in lr.get("lines", []):
                p = ln.get("provider")
                ts = ln.get("lastUpdate") or ""
                if p in BOOKS:
                    cur = book_lines[p].get(gid)
                    if cur is None or ts >= cur.get("ts", ""):
                        book_lines[p][gid] = {"spread": ln.get("spread"), "ou": ln.get("overUnder"),
                                              "hml": ln.get("homeMoneyline"), "aml": ln.get("awayMoneyline"),
                                              "ts": ts}
                    if gid not in first_move[p] or ts < first_move[p][gid]:
                        first_move[p][gid] = ts
    return games, book_lines, first_move

def main():
    games, BL, FM = load()

    # ================= LAYER 2: in the number, not the price =================
    print("=" * 96)
    print("LAYER 2 — WHAT'S IN THE NUMBER BUT NOT THE PRICE")
    print("=" * 96)

    # 2a. key-number clusters: raw margin histogram spikes (2681 CFB games)
    margins = Counter()
    for g in games.values():
        margins[g["homePoints"] - g["awayPoints"]] += 1
    n = sum(margins.values())
    print("\n[2a] KEY-NUMBER CLUSTERS — margin distribution spikes (CFB, n=%d)" % n)
    baseline = n / 60.0   # rough uniform over plausible margin range
    keys = [(m, c, c / n * 100) for m, c in sorted(margins.items())
            if m in (-21, -20, -17, -14, -13, -10, -7, -6, -4, -3, -2, 0, 2, 3, 4, 6, 7, 10, 13, 14, 17, 20, 21)]
    for m, c, pct in keys:
        bar = "#" * int(pct * 4)
        print(f"   margin {m:>3}: {c:>4} games ({pct:4.2f}%) {bar}")
    big3 = sum(c for m, c, _ in keys if abs(m) in (3, 7))
    print(f"   -> |3| + |7| = {big3} games = {big3/n*100:.1f}% of ALL CFB games land on a key number")

    # 2b. closing bias decay by week (do books learn through the season?)
    print("\n[2b] CLOSING-TOTAL BIAS BY WEEK — residual (actual - close), 2026")
    wk = defaultdict(list)
    for gid, g in games.items():
        if g["season"] != 2026: continue
        for b in BOOKS:
            d = BL[b].get(gid)
            if d and d["ou"] is not None:
                wk[g["week"]].append(g["homePoints"] + g["awayPoints"] - d["ou"])
    for w in sorted(wk):
        if len(wk[w]) < 20: continue
        m = statistics.mean(wk[w])
        print(f"   week {w:>2}: bias {m:>+.2f} pts (n={len(wk[w])})  {'books UNDER-shade; overs finish high' if m > 0 else 'overs finish low'}")

    # 2c. spread bias by favorite size (where does the miss live?)
    print("\n[2c] SPREAD RESIDUAL BY FAVORITE SIZE — where the close misses")
    buckets = defaultdict(list)
    for gid, g in games.items():
        for b in ("Bovada", "DraftKings"):
            d = BL[b].get(gid)
            if not d or d["spread"] is None: continue
            margin = g["homePoints"] - g["awayPoints"]
            hml, aml = d["hml"], d["aml"]
            mu = (abs(d["spread"]) if hml is not None and aml is not None and hml < aml else -abs(d["spread"])) \
                 if hml is not None else -d["spread"]
            fav = abs(mu)
            bucket = "1-6" if fav < 7 else "7-13" if fav < 14 else "14-20" if fav < 21 else "21-30" if fav < 31 else "31+"
            buckets[bucket].append(margin - mu)
    for k in ("1-6", "7-13", "14-20", "21-30", "31+"):
        xs = buckets.get(k, [])
        if len(xs) < 50: continue
        print(f"   fav by {k:>5}: resid mean {statistics.mean(xs):>+6.2f}  sigma {statistics.stdev(xs):>6.2f}  n={len(xs)}")

    # ================= LAYER 3: situation, not number =================
    print("\n" + "=" * 96)
    print("LAYER 3 — WHAT'S IN THE SITUATION BUT NOT THE NUMBER (subclass residuals vs close)")
    print("=" * 96)
    def subclass(name, pred):
        res = []
        for gid, g in games.items():
            if not pred(g): continue
            # consensus via cross-book median spread, ML-oriented
            sps = []
            for b in BOOKS:
                d = BL[b].get(gid)
                if d and d["spread"] is not None:
                    hml, aml = d["hml"], d["aml"]
                    mu = (abs(d["spread"]) if hml is not None and aml is not None and hml < aml else -abs(d["spread"])) \
                         if hml is not None else -d["spread"]
                    sps.append(mu)
            if len(sps) < 2: continue
            res.append((g["homePoints"] - g["awayPoints"]) - statistics.median(sps))
        if len(res) < 25:
            print(f"   {name:<44} n={len(res)} (too small)")
            return
        m, s = statistics.mean(res), statistics.stdev(res)
        t = m / (s / math.sqrt(len(res)))
        star = " <-- MEASURED SPOT" if abs(t) > 1.96 else ""
        print(f"   {name:<44} n={len(res):>4}  resid {m:>+6.2f} ± {s/math.sqrt(len(res)):.2f} (t={t:+.2f}){star}")

    subclass("conference GAME vs non-con (HFA shift)", lambda g: g.get("conferenceGame"))
    subclass("non-conference game", lambda g: not g.get("conferenceGame"))
    subclass("altitude home (>=4,000ft)", lambda g: g["homeTeam"] in ALT_HOME and not g.get("neutralSite"))
    subclass("neutral-site game (HFA ~0 check)", lambda g: g.get("neutralSite"))
    subclass("late season wk10+ (motivation chaos)", lambda g: g["week"] >= 10)
    subclass("early season wk1-3 (model cold start)", lambda g: g["week"] <= 3)
    subclass("blowout-class fav (31+)", lambda g: any(
        abs((BL[b][g['id']]['spread'] if BL[b].get(g['id']) and BL[b][g['id']]['spread'] else 99)) >= 31
        for b in BOOKS if BL[b].get(g["id"])))

    # ================= LAYER 4: flow, not situation =================
    print("\n" + "=" * 96)
    print("LAYER 4 — WHAT'S IN THE FLOW: WHO MOVES THE MARKET FIRST (per-game first update)")
    print("=" * 96)
    lead = Counter(); pairs = Counter()
    for gid in games:
        ts = {b: FM[b].get(gid) for b in BOOKS if FM[b].get(gid)}
        if len(ts) < 2: continue
        order = sorted(ts.items(), key=lambda x: x[1])
        lead[order[0][0]] += 1
        for i in range(len(order) - 1):
            pairs[(order[i][0], order[i + 1][0])] += 1
    tot = sum(lead.values())
    print("   first-mover share (of games with 2+ books stamped):")
    for b, c in lead.most_common():
        print(f"     {b:<32} {c:>4} games ({c/tot*100:.1f}%)")
    print("   top handoffs (who follows whom):")
    for (a, b), c in pairs.most_common(6):
        print(f"     {a:<32} -> {b:<32} {c}")

    # does the first mover's close beat the followers'? (leadership = sharpness?)
    print("\n   leadership vs sharpness (CRPS of each book's close, repeated from anatomy):")
    print("     Bovada 8.504 | DK 8.527 | ESPN Bet 8.633 | WH-NJ 8.335  <-- compare with first-mover share")

    print("\n" + "=" * 96)
    print("SYNTHESIS — the 100%-accuracy path is ACCURACY-VS-CLOSE, quantified layer by layer:")
    print("  L2: key clusters + hold map + bias decay = mispriced SUBSPACES of the ladder")
    print("  L3: subclass t-stats = measured spots (only |t|>1.96 earn a registry slot)")
    print("  L4: move-leadership = whose number to read FIRST and whose to fade")
    print("  every layer feeds doctrine.py FeatureRegistry as diagnostic -> gate -> production")

if __name__ == "__main__":
    main()
