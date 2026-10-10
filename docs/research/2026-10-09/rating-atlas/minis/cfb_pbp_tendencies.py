#!/usr/bin/env python3
"""
cfb_pbp_tendencies.py — coaching tendencies + tempo + penalties from CFBD
play-by-play (2026 wks 1-5 complete, wk-6 partial). All DIAGNOSTIC per doctrine.
"""
import json, glob, statistics, math, os
from collections import defaultdict, Counter

DATA = "/var/minis/workspace/cfb/data"

def load_plays():
    plays = []
    for f in sorted(glob.glob(f"{DATA}/pbp_2026_w*.json")):
        plays += json.load(open(f))
    return plays

def main():
    plays = load_plays()
    print(f"[DATA] {len(plays):,} plays (2026 wks1-6)")

    GO = {"Rush", "Pass Reception", "Pass Incompletion", "Sack",
          "Rushing Touchdown", "Passing Touchdown", "Fumble Recovery (Own)",
          "Fumble Recovery (Opponent)", "Interception Return", "Interception Return Touchdown"}

    # ---------------- 1. 4th-down aggression ----------------
    fourth = [p for p in plays if p.get("down") == 4 and p.get("distance") is not None
              and p.get("yardline") is not None and p.get("playType") not in ("End Period", "End of Game", "Timeout", "Penalty")]
    agg_pool = [p for p in fourth if p["distance"] <= 3 and p["yardline"] > 50]  # opp territory, short
    league_go = sum(1 for p in agg_pool if p["playType"] in GO) / max(1, len(agg_pool))
    team = defaultdict(lambda: [0, 0])   # go, n
    for p in agg_pool:
        t = p["offense"]; team[t][1] += 1
        if p["playType"] in GO: team[t][0] += 1
    zs = []
    p_g = league_go; sd0 = math.sqrt(max(1e-9, p_g * (1 - p_g)))
    for t, (g, n) in team.items():
        if n < 8: continue
        rate = g / n
        z = (rate - p_g) / (sd0 / math.sqrt(n))
        zs.append((t, rate, n, z))
    zs.sort(key=lambda x: -x[3])
    print(f"\n[1] 4TH-DOWN AGGRESSION (4th & <=3, opp territory) — league go-rate {league_go:.3f}, n={len(agg_pool)}")
    print("    most aggressive:")
    for t, r, n, z in zs[:8]:
        print(f"      {t:<22} go {r:.3f} (n={n}) z={z:+.2f}")
    print("    least aggressive:")
    for t, r, n, z in zs[-5:]:
        print(f"      {t:<22} go {r:.3f} (n={n}) z={z:+.2f}")

    # ---------------- 2. tempo ----------------
    from datetime import datetime
    tmp = defaultdict(list)
    by_game = defaultdict(list)
    for p in plays:
        by_game[p["gameId"]].append(p)
    for gid, gplays in by_game.items():
        gplays.sort(key=lambda p: (p.get("driveNumber") or 0, p.get("playNumber") or 0))
        prev = None
        for p in gplays:
            wt = p.get("wallclock")
            if prev and wt and p.get("offense") and p["driveNumber"] == prev.get("driveNumber") \
               and p["offense"] == prev.get("offense") and p.get("playType") not in ("Timeout", "End Period", "Penalty"):
                try:
                    dt = (datetime.fromisoformat(wt.replace("Z", "+00:00"))
                          - datetime.fromisoformat(prev["wallclock"].replace("Z", "+00:00"))).total_seconds()
                    if 1 <= dt <= 40:
                        tmp[p["offense"]].append(dt)
                except Exception:
                    pass
            prev = p
    tempo = sorted(((t, statistics.mean(v), len(v)) for t, v in tmp.items() if len(v) > 150),
                   key=lambda x: x[1])
    print(f"\n[2] TEMPO — seconds per play (same-drive consecutive, n>150 plays)")
    print("    fastest:")
    for t, s, n in tempo[:6]:
        print(f"      {t:<22} {s:.1f}s/play (n={n})")
    print("    slowest:")
    for t, s, n in tempo[-5:]:
        print(f"      {t:<22} {s:.1f}s/play (n={n})")

    # ---------------- 3. penalties ----------------
    pens = [p for p in plays if p.get("playType") == "Penalty"]
    team_plays = Counter(p["offense"] for p in plays if p.get("offense"))
    pen_rate = {t: c / team_plays[t] for t, c in Counter(p["offense"] for p in pens).items() if team_plays.get(t, 0) > 200}
    presnap = {"False Start", "Delay of Game", "Offside", "Offside On Defense", "Neutral Zone Infraction",
               "Illegal Formation", "Illegal Shift", "Illegal Motion", "12 Players In The Huddle", "Substitution Infraction"}
    ps = defaultdict(int)
    for p in pens:
        txt = (p.get("playText") or "")
        for k in presnap:
            if k.lower() in txt.lower():
                ps[p["offense"]] += 1
                break
    top_pen = sorted(pen_rate.items(), key=lambda x: -x[1])
    print(f"\n[3] PENALTIES — penalty-play rate (n={len(pens)} penalty plays)")
    print("    most penalized:")
    for t, r in top_pen[:6]:
        print(f"      {t:<22} {r:.4f} per play")
    pr = {t: ps[t] / max(1, team_plays[t]) for t in ps if team_plays.get(t, 0) > 200}
    top_ps = sorted(pr.items(), key=lambda x: -x[1])
    print("    most pre-snap-penalized:")
    for t, r in top_ps[:5]:
        print(f"      {t:<22} {r:.4f} per play")

    # ---------------- 4. halftime adjustment ----------------
    adj = defaultdict(list)
    for gid, gplays in by_game.items():
        h1 = defaultdict(int); h2 = defaultdict(int)
        for p in gplays:
            pt = p.get("playType") or ""
            off, dfn = p.get("offense"), p.get("defense")
            pts = 0
            if "Touchdown" in pt and "Return" not in pt: pts = 6
            elif pt == "Field Goal Good": pts = 3
            elif pt == "Two Point Conversion": pts = 2
            if not pts: continue
            bucket = h1 if (p.get("period") or 0) <= 2 else h2
            bucket[off] += pts; bucket[dfn] += 0
            if "Return" in pt or "Defensive" in pt:
                pass
        for t in set(list(h1.keys()) + list(h2.keys())):
            if t is None: continue
            m1 = h1.get(t, 0) - (sum(h1.values()) - h1.get(t, 0))
            m2 = h2.get(t, 0) - (sum(h2.values()) - h2.get(t, 0))
            adj[t].append(m2 - m1)
    adjr = sorted(((t, statistics.mean(v), len(v)) for t, v in adj.items() if len(v) >= 5),
                  key=lambda x: -x[1])
    print(f"\n[4] HALFTIME ADJUSTMENT — mean (2H margin − 1H margin), games>=5")
    print("    best second-half adjusters:")
    for t, m, n in adjr[:6]:
        print(f"      {t:<22} {m:+.2f} pts (n={n})")
    print("    worst:")
    for t, m, n in adjr[-4:]:
        print(f"      {t:<22} {m:+.2f} pts (n={n})")

    # ---------------- 5. success rate ----------------
    succ = defaultdict(lambda: [0, 0])
    for p in plays:
        d, dist, yg = p.get("down"), p.get("distance"), p.get("yardsGained")
        if d in (1, 2) and dist is not None and yg is not None and p.get("offense"):
            ok = yg >= 0.4 * dist
            succ[p["offense"]][0] += ok; succ[p["offense"]][1] += 1
    sr = sorted(((t, a / n, n) for t, (a, n) in succ.items() if n > 250), key=lambda x: -x[1])
    print(f"\n[5] SUCCESS RATE (std down-distance rule, n>250)")
    for t, r, n in sr[:6]:
        print(f"      {t:<22} {r:.3f} (n={n})")
    print("    ...")
    for t, r, n in sr[-4:]:
        print(f"      {t:<22} {r:.3f} (n={n})")

if __name__ == "__main__":
    main()
