# Wave 3 live-market poller: ESPN status + SBR two-sided lines (8 books) + Munich summary.
# Free public endpoints only. DK nash API is 403 IP-blocked on this host (documented, not retried).
# Snapshots: scratch/wave3/snap_<ts>.json; moves: moves.jsonl; failures: poller.log.
import json, re, time, os, sys, urllib.request, datetime, traceback

SCRATCH = r"C:\Users\Garrett\AppData\Local\hermes\cache\scratch\wave3"
os.makedirs(SCRATCH, exist_ok=True)
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
CUTOFF = datetime.datetime(2026, 11, 15, 14, 5, tzinfo=datetime.timezone.utc)  # 08:05 CST
INACTIVES_START = datetime.datetime(2026, 11, 15, 12, 30, tzinfo=datetime.timezone.utc)  # 06:30 CST
MUNICH_EVENT = "401873053"

CITY = {"New England":"NE","Detroit":"DET","Buffalo":"BUF","Kansas City":"KC","Atlanta":"ATL",
 "Houston":"HOU","Cleveland":"CLE","Minnesota":"MIN","Green Bay":"GB","Jacksonville":"JAX",
 "Tennessee":"TEN","Miami":"MIA","Indianapolis":"IND","Carolina":"CAR","New Orleans":"NO",
 "Seattle":"SEA","Las Vegas":"LV","San Francisco":"SF","Dallas":"DAL","Pittsburgh":"PIT",
 "Cincinnati":"CIN","Baltimore":"BAL","Washington":"WAS","Arizona":"ARI","Chicago":"CHI",
 "Denver":"DEN","Philadelphia":"PHI","Tampa Bay":"TB"}

def log(msg):
    line = f"{datetime.datetime.now(datetime.timezone.utc).isoformat()} {msg}"
    print(line, flush=True)
    with open(os.path.join(SCRATCH, "poller.log"), "a", encoding="utf-8") as f:
        f.write(line + "\n")

def fetch(url, timeout=40):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", errors="ignore")

def matchup_key(away, home, start):
    a = CITY.get(away, away); h = CITY.get(home, home)
    if away == "Los Angeles": a = "LAC" if start.startswith("2026-11-16") else "LAR"
    if home == "Los Angeles": h = "LAC" if start.startswith("2026-11-16") else "LAR"
    if home == "New York": h = "NYG" if a == "WAS" else "NYJ"
    if away == "New York": a = "NYG" if h == "WAS" else "NYJ"
    return f"{a} @ {h}"

def parse_sbr(html, market):
    m = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html, re.S)
    if not m: return None
    d = json.loads(m.group(1))
    rows = []
    for t in d["props"]["pageProps"].get("oddsTables", []):
        for gr in t.get("oddsTableModel", {}).get("gameRows", []):
            gv = gr.get("gameView", {})
            aw = gv.get("awayTeam", {}).get("name", ""); ho = gv.get("homeTeam", {}).get("name", "")
            start = gv.get("startDate", "")
            if not start.startswith("2026-11-15") and not start.startswith("2026-11-16"): continue
            mk = matchup_key(aw, ho, start)
            for v in gr.get("oddsViews", []):
                rows.append({"matchup": mk, "market": market, "book": v.get("sportsbook"),
                             "start_utc": start, "game_id": gv.get("gameId"),
                             "current": v.get("currentLine"), "opening": v.get("openingLine")})
    return rows

def snapshot():
    ts = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    snap = {"ts_utc": ts, "espn": [], "sbr_spread": [], "sbr_total": [], "sbr_ml": [], "munich_summary": None, "errors": []}
    for dates in ("20261115", "20261116"):
        try:
            d = json.loads(fetch(f"https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates={dates}"))
            for e in d.get("events", []):
                c = e["competitions"][0]
                snap["espn"].append({"id": e["id"], "date": e.get("date"), "name": e.get("name"),
                    "status": e["status"]["type"]["name"], "detail": e["status"]["type"].get("detail"),
                    "competitors": [{"abbr": x["team"]["abbreviation"], "score": x.get("score")} for x in c["competitors"]]})
        except Exception as ex:
            snap["errors"].append(f"espn {dates}: {ex}"); log(f"ERR espn {dates}: {ex}")
    for market, url in [("spread", "https://www.sportsbookreview.com/betting-odds/nfl-football/"),
                        ("total", "https://www.sportsbookreview.com/betting-odds/nfl-football/totals/full-game/"),
                        ("moneyline", "https://www.sportsbookreview.com/betting-odds/nfl-football/money-line/full-game/")]:
        try:
            rows = parse_sbr(fetch(url), market)
            if rows is None:
                snap["errors"].append(f"sbr {market}: no __NEXT_DATA__"); log(f"ERR sbr {market}: no payload")
            else:
                snap["sbr_spread" if market == "spread" else ("sbr_total" if market == "total" else "sbr_ml")] = rows
        except Exception as ex:
            snap["errors"].append(f"sbr {market}: {ex}"); log(f"ERR sbr {market}: {ex}")
    now = datetime.datetime.now(datetime.timezone.utc)
    if now >= INACTIVES_START:
        try:
            d = json.loads(fetch(f"https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event={MUNICH_EVENT}"))
            keep = {"header": d.get("header", {}).get("competitions", [{}])[0].get("status"),
                    "injuries": d.get("injuries"), "gameInfo": d.get("gameInfo")}
            snap["munich_summary"] = keep
        except Exception as ex:
            snap["errors"].append(f"munich summary: {ex}"); log(f"ERR munich summary: {ex}")
    path = os.path.join(SCRATCH, f"snap_{ts}.json")
    with open(path, "w", encoding="utf-8") as f: json.dump(snap, f)
    with open(os.path.join(SCRATCH, "latest.json"), "w", encoding="utf-8") as f: json.dump(snap, f)
    # move detection vs previous snapshot
    prev_path = os.path.join(SCRATCH, "previous.json")
    if os.path.exists(prev_path):
        try:
            prev = json.load(open(prev_path, encoding="utf-8"))
            def keymap(s, field):
                return {(r["matchup"], r["market"], r["book"]): r for r in s.get(field, [])}
            moves = []
            for field in ("sbr_spread", "sbr_total", "sbr_ml"):
                pm, cm = keymap(prev, field), keymap(snap, field)
                for k, cur in cm.items():
                    old = pm.get(k)
                    if not old: continue
                    oc, cc = old.get("current") or {}, cur.get("current") or {}
                    for f_, thresh in [("homeSpread", 0.5), ("total", 0.5), ("homeOdds", 10), ("awayOdds", 10), ("overOdds", 10), ("underOdds", 10)]:
                        a, b = oc.get(f_), cc.get(f_)
                        if a is not None and b is not None and abs(a - b) >= thresh:
                            moves.append({"ts_utc": ts, "matchup": k[0], "market": k[1], "book": k[2],
                                          "field": f_, "prev": a, "new": b, "delta": round(b - a, 3)})
            if moves:
                with open(os.path.join(SCRATCH, "moves.jsonl"), "a", encoding="utf-8") as f:
                    for mv in moves: f.write(json.dumps(mv) + "\n")
                log(f"MOVES {len(moves)}: " + "; ".join(f"{m['matchup']} {m['book']} {m['field']} {m['prev']}->{m['new']}" for m in moves[:6]))
        except Exception as ex:
            log(f"ERR move-detect: {ex}")
    with open(prev_path, "w", encoding="utf-8") as f: json.dump(snap, f)
    log(f"SNAP {ts}: espn={len(snap['espn'])} spread={len(snap['sbr_spread'])} total={len(snap['sbr_total'])} ml={len(snap['sbr_ml'])} errors={len(snap['errors'])} munich={'yes' if snap['munich_summary'] else 'no'}")
    return snap

def main():
    log("poller start")
    while datetime.datetime.now(datetime.timezone.utc) < CUTOFF:
        try:
            snapshot()
        except Exception:
            log("ERR cycle:\n" + traceback.format_exc())
        time.sleep(900)
    log("poller cutoff reached, exiting")

if __name__ == "__main__":
    main()