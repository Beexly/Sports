#!/usr/bin/env python3
"""books_api.py — GSE unified odds/props harvester with FALLBACK CHAINS.

Doctrine: no single point of failure. Every source has >=1 backup lane.
Shell-only lanes run here. Browser-session lanes are emitted as exact recipes
(they need a real browser context; the browser tab holds the recipe).

Verified live 2026-10-09 (see GSE_REVERSE_ENGINEERING.md for full recipes):
  PINNACLE  guest.api.arcadia.pinnacle.com/0.1            shell OK, keyless
  ESPN      site.api.espn.com/.../scoreboard|injuries      shell OK, keyless
  DK        sportsbook-nash.draftkings.com (in-browser)    shell BLOCKED (Akamai 403)
  FD        api.sportsbook.fanduel.com/sbapi (in-browser)  shell 400 (session gate)
  PP        api.prizepicks.com/projections (in-browser)    shell DataDome 403
  UNDERDOG  app.underdogsports.com                         login wall (parked)
"""
import json, os, time, urllib.request, sys

UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}
SNAP = os.path.join(os.path.dirname(os.path.abspath(__file__)), "snapshots")
os.makedirs(SNAP, exist_ok=True)
STAMP = time.strftime("%Y-%m-%d_%H%M")

def get(url, timeout=20):
    req = urllib.request.Request(url, headers={**UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode())

# ---------------- PROVIDERS (primary first, backups follow) ----------------

def pinnacle_nfl_games():
    """PRIMARY close source. Returns [(matchup_id, start, home, away)]."""
    ms = get("https://guest.api.arcadia.pinnacle.com/0.1/leagues/889/matchups")
    out = []
    for m in ms:
        if m.get("type") != "matchup":
            continue
        parts = {p.get("alignment"): p.get("name") for p in m.get("participants") or []}
        out.append((m["id"], m.get("startTime"), parts.get("home"), parts.get("away")))
    return out

def pinnacle_markets(mid):
    """Full market tree incl. alternates + limits. Retry x3 (occasional 401 flake)."""
    url = f"https://guest.api.arcadia.pinnacle.com/0.1/matchups/{mid}/markets/related/straight"
    for i in range(3):
        try:
            return get(url)
        except Exception as e:
            if i == 2:
                raise
            time.sleep(2 * (i + 1))

def espn_scoreboard():
    """BACKUP for game lines (DK-priced retail consensus) + scores."""
    return get("https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard")

def espn_injuries():
    """PRIMARY injury source (wish #3). 8.7MB, all 32 teams."""
    return get("https://site.api.espn.com/apis/site/v2/sports/football/nfl/injuries", timeout=60)

def espn_athletes_injury_summary(inj):
    """Condense the 8.7MB injury dump -> per-team starter-risk list."""
    rows = []
    for team in inj.get("injuries", []):
        t = (team.get("team") or {}).get("displayName", "?")
        for i in team.get("injuries", []):
            a = i.get("athlete") or {}
            d = i.get("details") or {}
            rows.append({
                "team": t, "player": a.get("displayName"), "pos": a.get("position", {}).get("abbreviation"),
                "status": i.get("status"), "type": d.get("type"), "returnDate": d.get("returnDate"),
            })
    return rows

# Browser-session providers: emit the exact recipe (run in browser tab on origin)
DK_RECIPE = """
DK (in browser tab on sportsbook.draftkings.com, execute_js):
  1) events:  GET https://sportsbook-nash.draftkings.com/sites/US-SB/api/sportscontent/navigation/dkuswv/v2/nav/leagues/88808
  2) markets: GET https://sportsbook-nash.draftkings.com/sites/US-SB/api/sportscontent/controldata/event/eventSubcategory/v1/markets
              ?templateVars={evId},{subId}&marketsQuery=$filter=eventId eq '{evId}' AND clientMetadata/subCategoryId eq '{subId}' AND tags/all(t: t ne 'SportcastBetBuilder')&include=Events&entity=events
  subIds: 4518 game lines | 13195 alt spread | 13196 alt total | 16719 team totals
          9524 passYds 9517 passAtt 9522 comps 9525 passTD | 9514 rushYds 9518 rushAtt 9533 longRush
          14114 recYds 14115 recs 16924 longRec | 18876/18883/18884 1H variants | 12424 anytimeTD
  full 189-node taxonomy: dk_submap.json
  selection fields: points, displayOdds.american (unicode minus!), tags (MainPointLine/SGP/PlayerProps)
  pacing: ~1.7 fetch/s sustained OK (420 fetches, 0 errors)
"""

FD_RECIPE = """
FanDuel (in browser tab on the event page, execute_js, ONE call per page load):
  GET https://api.sportsbook.fanduel.com/sbapi/event-page?_ak=FhMFpcPWXMeyZxOx&eventId={id}&useCombinedTouchdownsVirtualMarket=true&useQuickBets=true
  session gate: works immediately after loading THAT event's page; 400 afterward. Not referer-bound (tested).
  BACKUP (open, keyless, any time): POST https://smp.nj.sportsbook.fanduel.com/api/sports/fixedodds/readonly/v1/getMarketPrices?priceHistory=0
        body {"marketIds":["734.xxxxx"]}  -> runner odds (needs marketIds from an event-page call)
  runners carry previousWinRunnerOdds = built-in line movement.
"""

PP_RECIPE = """
PrizePicks (in browser tab on app.prizepicks.com, execute_js):
  GET https://api.prizepicks.com/projections?league_id=9&per_page=1000&single_stat=true&game_mode=pickem
  -> single page, ALL projections (~7.6k NFL) + included[] maps (players/stats/games)
  /leagues is open keyless even from shell; /projections is DataDome-gated from shell.
  fields: line_score, allowed_wager_types (over/under/under_or_over), trending_count, updated_at
"""

UNDERDOG_NOTE = """
Underdog: app.underdogsports.com pickem = LOGIN WALL (2026-10-09). api.underdogfantasy.com alive
(v1/features, v1/user/anonymous) but pickem paths 404 keyless. Backup for pick'em product = PrizePicks.
Future: harvest with a logged-in session (performance-entry capture then replay).
"""

def snapshot():
    """One-command snapshot: shell lanes now + recipes for browser lanes."""
    out = {"stamp": STAMP, "pinnacle": {}, "espn_scoreboard": None, "espn_injuries_summary": None, "errors": []}
    # 1) Pinnacle (primary close)
    try:
        games = pinnacle_nfl_games()
        for mid, start, home, away in games:
            try:
                out["pinnacle"][str(mid)] = {"start": start, "home": home, "away": away,
                                             "markets": pinnacle_markets(mid)}
                time.sleep(0.8)
            except Exception as e:
                out["errors"].append(f"pinnacle {mid}: {str(e)[:60]}")
    except Exception as e:
        out["errors"].append(f"pinnacle slate: {str(e)[:60]}")
    # 2) ESPN scoreboard (backup lines)
    try:
        out["espn_scoreboard"] = espn_scoreboard()
    except Exception as e:
        out["errors"].append(f"espn scoreboard: {str(e)[:60]}")
    # 3) ESPN injuries (primary injury)
    try:
        inj = espn_injuries()
        out["espn_injuries_summary"] = espn_athletes_injury_summary(inj)
        with open(os.path.join(SNAP, f"espn_injuries_{STAMP}.json"), "w") as f:
            json.dump(inj, f)
    except Exception as e:
        out["errors"].append(f"espn injuries: {str(e)[:60]}")
    path = os.path.join(SNAP, f"snapshot_{STAMP}.json")
    with open(path, "w") as f:
        json.dump(out, f)
    return path

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "snapshot"
    if mode == "snapshot":
        p = snapshot()
        d = json.load(open(p))
        print("SNAPSHOT:", p)
        print("pinnacle games:", len(d["pinnacle"]), "| espn sb:", "ok" if d["espn_scoreboard"] else "FAIL",
              "| injuries rows:", len(d["espn_injuries_summary"] or []), "| errors:", d["errors"])
    elif mode == "recipes":
        print(DK_RECIPE); print(FD_RECIPE); print(PP_RECIPE); print(UNDERDOG_NOTE)
