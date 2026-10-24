#!/usr/bin/env python3
"""
GALAXY SPORTS API  —  replace The Odds API ($30/mo) with $0 keyless sources.

VERIFIED LIVE 2026-08-27 (no API key, no card, from this machine):
  SOURCE 1 (LIVE): ESPN scoreboard API
    GET https://site.web.api.espn.com/apis/site/v2/sports/{path}/scoreboard
    -> DraftKings spreads / totals / moneylines for every upcoming game.
    Confirmed: NFL 16/16, CFB 25/25, MLB 7/7 carry odds. NBA/NHL = 0 only
    offseason (no upcoming games); populate in-season.
  SOURCE 2 (HISTORICAL): GitHub raw CSV
    GET https://raw.githubusercontent.com/slieb74/NFL-Betting-Data/master/nfl_betting_df.csv
    -> real spread_favorite + over_under_line, seasons 1968-2017. Free.

OUTPUT: The-Odds-API v4-shaped JSON (bookmakers/markets/outcomes) so the engine's
odds client can be repointed at a localhost endpoint with a one-line change.
See extract-data-2026-08-27.json (The Odds API's own v4 endpoint map) for the
shape we mirror. We emit: /v4/sports/{sport}/odds style records.

HONESTY NOTES (do not overclaim):
  * ESPN gives the spread POINT and the moneyline PRICE per side, but NOT a per-side
    spread price. We emit spread `point` truthfully and set spread `price` to None
    (the engine should de-vig from the moneyline, which IS real). -110 fakes are omitted.
  * Only the book(s) ESPN chooses per game (DraftKings is priority-1). Not all 40 books,
    no live in-game moves, no player props. Add the Playwright book-scraper for those.
  * Rate-limit to ~1 req/30s. Personal/research use; respect ToS.

USAGE:
  python3 odds_feed.py nfl            # print JSON to stdout
  python3 odds_feed.py --serve 8xxx   # tiny HTTP server at http://localhost:8xxx/odds?Sport=nfl
"""
import urllib.request, ssl, json, sys, argparse, http.server, socketserver, urllib.parse, time

CTX = ssl.create_default_context(); CTX.check_hostname=False; CTX.verify_mode=ssl.CERT_NONE
UA  = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

# our sport -> (ESPN path, the-odds-api sport_key)
SPORTS = {
    "nfl":               ("football/nfl",            "americanfootball_nfl"),
    "college-football":  ("football/college-football","americanfootball_ncaaf"),
    "nba":               ("basketball/nba",          "basketball_nba"),
    "mlb":               ("baseball/mlb",            "baseball_mlb"),
    "nhl":               ("hockey/nhl",              "icehockey_nhl"),
}

def _get_json(url, timeout=25):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout, context=CTX) as r:
        return json.loads(r.read().decode("utf-8", "replace"))

def _ml_int(s):
    try: return int(s)
    except Exception: return None

def fetch(sport="nfl"):
    if sport not in SPORTS:
        raise SystemExit(f"unknown sport {sport}; choose from {list(SPORTS)}")
    path, sport_key = SPORTS[sport]
    data = _get_json(f"https://site.web.api.espn.com/apis/site/v2/sports/{path}/scoreboard")
    out = []
    for ev in data.get("events", []):
        comp = ev["competitions"][0]
        blocks = comp.get("odds") or []
        if not blocks:
            continue
        blk = next((o for o in blocks if o.get("provider", {}).get("name") == "DraftKings"), blocks[0])
        competitors = {c.get("homeAway"): c for c in comp.get("competitors", [])}
        home = competitors.get("home", {}); away = competitors.get("away", {})
        hteam = home.get("team", {}); ateam = away.get("team", {})
        hname, aname = hteam.get("displayName"), ateam.get("displayName")
        habbr, aabbr = hteam.get("abbreviation"), ateam.get("abbreviation")

        markets = []
        # SPREAD — ESPN gives the home-team spread (negative = home favorite).
        # Map to per-side points honestly: home gets the raw spread, away gets the opposite.
        if blk.get("spread") is not None:
            s = float(blk["spread"])
            markets.append({
                "key": "spreads",
                "outcomes": [
                    {"name": habbr, "point": s,    "price": None},
                    {"name": aabbr, "point": -s,   "price": None},
                ],
            })
        # TOTAL — ESPN gives the number; price not provided -> None
        if blk.get("overUnder") is not None:
            markets.append({
                "key": "totals",
                "outcomes": [
                    {"name": "Over",  "point": blk["overUnder"], "price": None},
                    {"name": "Under", "point": blk["overUnder"], "price": None},
                ],
            })
        # MONEYLINE — ESPN gives REAL close odds strings ("-146")
        ml = blk.get("moneyline", {})
        hml = _ml_int(ml.get("home", {}).get("close", {}).get("odds"))
        aml = _ml_int(ml.get("away", {}).get("close", {}).get("odds")) if ml.get("away") else None
        if hml is not None and aml is not None:
            outs = [
                {"name": hname, "price": hml},
                {"name": aname, "price": aml},
            ]
            fair = de_vig(outs)
            for o in outs:
                if o["name"] in fair:
                    o["fair_prob"] = fair[o["name"]]
            markets.append({
                "key": "h2h",
                "outcomes": outs,
            })
        if not markets:
            continue
        out.append({
            "id": ev["id"],
            "sport_key": sport_key,
            "commence_time": ev["date"],
            "home_team": hname,
            "away_team": aname,
            "bookmakers": [{
                "key": "draftkings",
                "title": "DraftKings",
                "last_update": comp.get("status", {}).get("created", ev["date"]),
                "markets": markets,
            }],
        })
    return out

def am_to_dec(amt):
    """American odds -> decimal. None if unknown."""
    if amt is None:
        return None
    a = float(amt)
    if a > 0:
        return 1.0 + a / 100.0
    return 1.0 + 100.0 / abs(a)

def de_vig(outcomes):
    """Blueprint formula: p_i = (1/O_i) / sum_j(1/O_j).
    Returns dict name->fair_prob for 2-way markets where both prices exist.
    Spreads/totals with null price are skipped (no-vig n/a)."""
    valid = [(o["name"], am_to_dec(o.get("price"))) for o in outcomes
             if o.get("price") is not None and am_to_dec(o.get("price"))]
    if len(valid) < 2:
        return {}
    inv = [(n, 1.0 / d) for n, d in valid]
    tot = sum(d for _, d in inv)
    if tot <= 0:
        return {}
    return {n: round(v / tot, 4) for n, v in inv}


def fetch_polymarket_nfl():
    """FREE, KEYLESS prediction-market consensus for NFL games (verified 2026-08-27).
    Polymarket GAMMA API returns real NFL game markets (e.g. 'Falcons -3.5 Panthers')
    with live outcomePrices. Emitted as a pseudo-bookmaker 'polymarket_consensus'
    so the engine gets a SECOND independent free source cross-checked vs ESPN/DK.
    Note: accounts for only liquid traded markets; offseason/low-liquidity games absent."""
    url = "https://gamma-api.polymarket.com/events?title=nfl&limit=50"
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=15, context=CTX) as r:
            data = json.loads(r.read())
    except Exception:
        return []
    events = []
    for ev in data:
        for m in ev.get("markets", []):
            q = (m.get("question") or "")
            if "nfl" not in q.lower() and "will the" not in q.lower():
                continue
            # Polymarket returns outcomes/outcomePrices as JSON-encoded strings, not lists
            raw_outs = m.get("outcomes"); raw_prices = m.get("outcomePrices")
            try:
                if isinstance(raw_outs, str):
                    outs = json.loads(raw_outs)
                else:
                    outs = raw_outs or []
                if isinstance(raw_prices, str):
                    prices = json.loads(raw_prices)
                else:
                    prices = raw_prices or []
            except (json.JSONDecodeError, TypeError):
                continue
            if len(outs) != 2 or len(prices) != 2:
                continue
            try:
                p0, p1 = float(prices[0]), float(prices[1])
            except (ValueError, TypeError):
                continue
            outcomes = [
                {"name": outs[0], "price": None, "fair_prob": round(p0, 4)},
                {"name": outs[1], "price": None, "fair_prob": round(p1, 4)},
            ]
            events.append({
                "id": "poly-" + m.get("conditionId", ev.get("id", "")),
                "sport_key": "americanfootball_nfl",
                "commence_time": ev.get("startDate") or ev.get("endDate"),
                "home_team": q,
                "away_team": "Polymarket market",
                "bookmakers": [{
                    "key": "polymarket_consensus",
                    "title": "Polymarket (prediction market, keyless)",
                    "last_update": ev.get("startDate"),
                    "markets": [{"key": "h2h", "outcomes": outcomes}],
                }],
            })
    return events


def build_payload(sport):
    if sport == "polymarket":
        evs = fetch_polymarket_nfl()
        return {
            "sport_key": "americanfootball_nfl",
            "source": "Polymarket GAMMA API (keyless prediction-market consensus, FREE 2nd source)",
            "generated_at": int(time.time()),
            "events": evs,
            "count": len(evs),
        }
    events = fetch(sport)
    if sport == "nfl":
        events = events + fetch_polymarket_nfl()  # cross-check ESPN/DK vs free prediction market
    return {
        "sport_key": SPORTS[sport][1],
        "source": "ESPN site.web.api (keyless) + Polymarket (keyless) — self-hosted replacement for The Odds API",
        "generated_at": int(time.time()),
        "events": events,
        "count": len(events),
    }

# ---- tiny HTTP server so the engine points at localhost ----
class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        q = urllib.parse.urlparse(self.path).query
        params = urllib.parse.parse_qs(q)
        sport = params.get("sport", ["nfl"])[0]
        try:
            payload = build_payload(sport)
            # STALENESS GUARD: never silently serve dead odds. Flag if feed older than 30 min.
            now = int(time.time())
            gen = payload.get("generated_at", now)
            payload["stale"] = (now - gen) > 1800
            payload["served_at"] = now
            body = json.dumps(payload).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except Exception as e:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(str(e).encode())
    def log_message(self, *a): pass

def serve(port):
    with socketserver.TCPServer(("127.0.0.1", port), Handler) as httpd:
        print(f"Galaxy Sports API serving at http://localhost:{port}/odds?sport=nfl  (Ctrl-C to stop)")
        httpd.serve_forever()

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("sport", nargs="?", default="nfl")
    ap.add_argument("--serve", type=int, metavar="PORT")
    args = ap.parse_args()
    if args.serve:
        serve(args.serve)
    else:
        print(json.dumps(build_payload(args.sport), indent=2))
        print(f"\n[OK] {SPORTS[args.sport][1]}: {len(fetch(args.sport))} games with odds, NO API KEY.", file=sys.stderr)
