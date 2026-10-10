#!/usr/bin/env python3
"""divergence.py — MARKET X-RAY: live ESPN/DK prices → devig (multiplicative + Shin)
→ fair probabilities, per-market hold, open-vs-current movement. Pinnacle slot ready."""
import json, os, sys, urllib.request
sys.path.insert(0, "/var/minis/workspace")
from engine_math import prob_from_american as american_to_prob, fair, shin_devig, amer_from_prob

UA = {"User-Agent": "Mozilla/5.0"}
SNAP = "/tmp/divergence_last.json"

def get(u):
    return json.loads(urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=15).read().decode())

def hold(p1, p2):
    return p1 + p2 - 1

def run_game(eid, name):
    try:
        core = get(f"https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/events/{eid}/competitions/{eid}/odds")
        it = core["items"][0]
    except Exception as e:
        return None
    home_ml = (it.get("homeTeamOdds") or {}).get("moneyLine")
    away_ml = (it.get("awayTeamOdds") or {}).get("moneyLine")
    sp_h = (it.get("homeTeamOdds") or {}).get("spreadOdds")
    sp_a = (it.get("awayTeamOdds") or {}).get("spreadOdds")
    o, u = it.get("overOdds"), it.get("underOdds")
    cur = {"spread": it.get("spread"), "total": it.get("overUnder")}
    # open vs current (movement)
    opens = {}
    try:
        ho = (it.get("homeTeamOdds") or {}).get("open") or {}
        opens["spread_open"] = ((ho.get("pointSpread") or {}).get("alternateDisplayValue"))
    except Exception:
        pass
    lines = [f"  {name}: spread {cur.get('spread')} (open {opens.get('spread_open','?')}), total {cur.get('total')}"]
    if home_ml is not None and away_ml is not None:
        p1, p2 = american_to_prob(home_ml), american_to_prob(away_ml)
        f1, f2 = fair(p1, p2, "mult")
        z, s1, s2 = shin_devig(p1, p2)
        lines.append(f"    ML {home_ml:+d}/{away_ml:+d} → hold {hold(p1,p2)*100:.1f}%")
        lines.append(f"    fair(mult): {f1*100:.1f}%/{f2*100:.1f}%  |  fair(Shin z={z*100:.1f}%): {s1*100:.1f}%/{s2*100:.1f}%")
    if sp_h is not None and sp_a is not None:
        ps1, ps2 = american_to_prob(sp_h), american_to_prob(sp_a)
        lines.append(f"    spread hold: {hold(ps1,ps2)*100:.1f}%  (main-line tax)")
    if o is not None and u is not None:
        po, pu = american_to_prob(o), american_to_prob(u)
        lines.append(f"    total hold: {hold(po,pu)*100:.1f}%")
    return "\n".join(lines), {"spread": cur.get("spread"), "total": cur.get("total")}

def main():
    score = get("https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard")
    print("🔬 MARKET X-RAY — DK-priced markets, devigged live (Shin + multiplicative)\n")
    snaps, n = {}, 0
    for ev in score.get("events", [])[:8]:
        r = run_game(ev["id"], ev.get("name", "?"))
        if r:
            txt, snap = r
            print(txt); snaps[ev.get("name", "?")] = snap; n += 1
    if os.path.exists(SNAP):
        prev = json.load(open(SNAP))
        moved = {k: (prev[k], v) for k, v in snaps.items() if prev.get(k) != v and prev.get(k)}
        if moved:
            print("\n📈 MOVEMENT since last X-ray:")
            for k, (a, b) in moved.items():
                print(f"  {k}: {a} → {b}")
    json.dump(snaps, open(SNAP, "w"))
    print(f"\n{x}-ray note: Pinnacle (sharp) prices need an authorized endpoint — slot ready; "
          f"divergence vs sharp consensus activates the moment we have both books in one table.")
    print(f"games X-rayed: {n}")

if __name__ == "__main__":
    main()
