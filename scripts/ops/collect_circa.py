#!/usr/bin/env python3
"""
Circa proprietary-number collection script.

Passive public sources only. Writes raw observations to local SQLite.
No auth bypass, no rate-limit evasion.

Six observables (§1-§6 of the Circa derivation doc):
  §1 ridge feature weights   -> needs their opens + nflfastR features
  §2 injury adjustment       -> needs news timeline + line at T-1h / T+2h
  §3 weather curves          -> needs Open-Meteo historical + outdoor subset
  §4 sharp-money response    -> needs Circa + sharp book polled every 15s
  §5 opening policy          -> needs first-appearance timestamps per market
  §6 limit ladder            -> needs bet-slip limits per market type

Data sources actually reachable without an account:
  SBR        - odds tables embedded in the page as __NEXT_DATA__ (verified)
  VegasInsider - Schema.org ld+json SportsEvent blocks (verified)
  nflfastR   - GitHub release CSVs (public)
  Open-Meteo - archive-api.open-meteo.com (public, no key)
  Pinnacle   - public odds page (structure stubbed; no key)
  Circa app  - needs a free account; aggregator feed covers it in the meantime

The SBR parser is the load-bearing one: the __NEXT_DATA__ payload carries
per-book opening and current lines per game, which is exactly what §4 and §5
need. Everything else is stubbed with a clear endpoint and return shape so a
later pass can fill it in without restructuring.
"""

import json
import re
import sqlite3
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = Path(__file__).parent / "circa_observations.db"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"

SBR_NFL = "https://www.sportsbookreview.com/betting-odds/nfl-football/"

# SBR publishes each market on its own page. The default page is point-spread
# only. Totals and money-line pages carry the same __NEXT_DATA__ envelope with
# viewType TotalDataOpeningAndLatestOddsDataView / MoneyLineDataOpeningAndLatestOddsDataView.
# Both verified reachable (518 KB each, next_data present, 12 game rows).
SBR_NFL_TOTAL = "https://www.sportsbookreview.com/betting-odds/nfl-football/totals/"
SBR_NFL_MONEYLINE = "https://www.sportsbookreview.com/betting-odds/nfl-football/money-line/"

VI_NFL = "https://www.vegasinsider.com/nfl/odds/las-vegas/"
NEXT_DATA_RE = re.compile(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', re.S)
LDJSON_RE = re.compile(r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>', re.S)


# --------------------------------------------------------------------------
# Schema — one table per observable
# --------------------------------------------------------------------------

SCHEMA = """
CREATE TABLE IF NOT EXISTS odds_snapshots (
    ts          TEXT NOT NULL,
    game_id     TEXT NOT NULL,
    league      TEXT,
    start_utc   TEXT,
    away_team   TEXT,
    home_team   TEXT,
    sportsbook  TEXT NOT NULL,
    market      TEXT NOT NULL,
    open_line   REAL,
    open_home   INTEGER,
    open_away   INTEGER,
    curr_line   REAL,
    curr_home   INTEGER,
    curr_away   INTEGER,
    source      TEXT NOT NULL,
    PRIMARY KEY (ts, game_id, sportsbook, market)
);

CREATE TABLE IF NOT EXISTS sharp_moves (
    ts          TEXT NOT NULL,
    game_id     TEXT NOT NULL,
    book        TEXT NOT NULL,
    market      TEXT NOT NULL,
    delta       REAL NOT NULL,
    prev_line   REAL,
    new_line    REAL,
    latency_s   REAL,
    PRIMARY KEY (ts, game_id, book, market)
);

CREATE TABLE IF NOT EXISTS injuries (
    ts          TEXT NOT NULL,
    team        TEXT,
    player      TEXT,
    position    TEXT,
    status      TEXT,
    source      TEXT,
    game_id     TEXT,
    PRIMARY KEY (ts, team, player)
);

CREATE TABLE IF NOT EXISTS weather (
    ts          TEXT NOT NULL,
    game_id     TEXT,
    venue       TEXT,
    wind_mph    REAL,
    temp_f      REAL,
    precip_in   REAL,
    source      TEXT,
    PRIMARY KEY (ts, game_id)
);

CREATE TABLE IF NOT EXISTS openings (
    ts          TEXT NOT NULL,
    game_id     TEXT NOT NULL,
    sportsbook  TEXT NOT NULL,
    market      TEXT NOT NULL,
    line        REAL,
    home_odds   INTEGER,
    away_odds   INTEGER,
    hours_before_kickoff REAL,
    source      TEXT NOT NULL,
    PRIMARY KEY (ts, game_id, sportsbook, market)
);

CREATE TABLE IF NOT EXISTS limits (
    ts          TEXT NOT NULL,
    game_id     TEXT,
    sportsbook  TEXT,
    market_type TEXT,
    limit_usd   REAL,
    ratio_to_main REAL,
    source      TEXT,
    PRIMARY KEY (ts, game_id, sportsbook, market_type)
);

CREATE INDEX IF NOT EXISTS idx_odds_game ON odds_snapshots(game_id, ts);
CREATE INDEX IF NOT EXISTS idx_moves_game ON sharp_moves(game_id, ts);
"""


def init_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.executescript(SCHEMA)
    conn.commit()
    return conn


# --------------------------------------------------------------------------
# HTTP
# --------------------------------------------------------------------------

def fetch(url: str, timeout: int = 25) -> str:
    """Plain public GET. No cookies, no auth, no retry storm."""
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        charset = r.headers.get_content_charset() or "utf-8"
        return r.read().decode(charset, errors="ignore")


# --------------------------------------------------------------------------
# §4/§5 — SBR odds tables (VERIFIED real payload)
# --------------------------------------------------------------------------

def _line_from_block(block: dict | None) -> tuple[float | None, int | None, int | None]:
    """Pull (line, homeOdds, awayOdds) out of an openingLine/currentLine block."""
    if not block:
        return None, None, None
    line = block.get("homeSpread")
    return (
        float(line) if line is not None else None,
        block.get("homeOdds"),
        block.get("awayOdds"),
    )


def parse_sbr_odds(html: str, ts: str) -> list[dict]:
    """
    Extract per-book opening and current lines from SBR's __NEXT_DATA__.

    Shape (verified against live page):
      props.pageProps.oddsTables[i].oddsTableModel.gameRows[j]
        .gameView        {gameId, leagueName, startDate, awayTeam{name}, homeTeam{name}}
        .oddsViews[k]    {sportsbook, openingLine{...}, currentLine{...}, viewType}
    """
    m = NEXT_DATA_RE.search(html)
    if not m:
        return []
    try:
        data = json.loads(m.group(1))
    except json.JSONDecodeError:
        return []

    tables = data.get("props", {}).get("pageProps", {}).get("oddsTables") or []
    rows: list[dict] = []
    seen: set[tuple] = set()

    for table in tables:
        model = table.get("oddsTableModel") or {}
        for game in model.get("gameRows") or []:
            view = game.get("gameView") or {}
            game_id = str(view.get("gameId") or "")
            if not game_id:
                continue
            league = view.get("leagueName")
            start_utc = view.get("startDate")
            away = (view.get("awayTeam") or {}).get("name")
            home = (view.get("homeTeam") or {}).get("name")

            for odds in game.get("oddsViews") or []:
                book = odds.get("sportsbook")
                if not book:
                    continue
                view_type = odds.get("viewType") or ""
                # viewType tells us the market family
                if "Total" in view_type:
                    market = "total"
                elif "MoneyLine" in view_type or "Moneyline" in view_type:
                    market = "moneyline"
                else:
                    market = "spread"

                o_line, o_home, o_away = _line_from_block(odds.get("openingLine"))
                c_line, c_home, c_away = _line_from_block(odds.get("currentLine"))

                key = (game_id, book, market)
                if key in seen:
                    continue
                seen.add(key)

                rows.append({
                    "ts": ts, "game_id": game_id, "league": league,
                    "start_utc": start_utc, "away_team": away, "home_team": home,
                    "sportsbook": book, "market": market,
                    "open_line": o_line, "open_home": o_home, "open_away": o_away,
                    "curr_line": c_line, "curr_home": c_home, "curr_away": c_away,
                    "source": "sbr",
                })
    return rows


def sbr_openings(html: str, ts: str) -> list[dict]:
    """§5 opening policy — first-appearance timestamp and opening edge."""
    out = []
    for row in parse_sbr_odds(html, ts):
        if row["open_line"] is None and row["open_home"] is None:
            continue
        hours = None
        if row["start_utc"]:
            try:
                kick = datetime.fromisoformat(row["start_utc"])
                hours = round((kick - datetime.now(timezone.utc)).total_seconds() / 3600, 2)
            except ValueError:
                pass
        out.append({
            "ts": ts, "game_id": row["game_id"], "sportsbook": row["sportsbook"],
            "market": row["market"], "line": row["open_line"],
            "home_odds": row["open_home"], "away_odds": row["open_away"],
            "hours_before_kickoff": hours, "source": "sbr",
        })
    return out


# --------------------------------------------------------------------------
# VegasInsider — Schema.org SportsEvent blocks (VERIFIED payload type)
# --------------------------------------------------------------------------

def parse_vegas_insider(html: str, ts: str) -> list[dict]:
    """
    VegasInsider publishes SportsEvent ld+json blocks. The odds tables
    themselves are client-rendered by bam-scripts.esm.js (Action Network),
    so only event metadata + any embedded offers are reachable statically.
    Kept as a metadata cross-check on SBR's team/date pairing.
    """
    events = []
    for blob in LDJSON_RE.findall(html):
        try:
            obj = json.loads(blob.strip())
        except json.JSONDecodeError:
            continue
        graph = obj.get("@graph") if isinstance(obj, dict) else None
        items = graph if isinstance(graph, list) else [obj]
        for item in items:
            if not isinstance(item, dict):
                continue
            if item.get("@type") != "SportsEvent":
                continue
            events.append({
                "ts": ts,
                "name": item.get("name"),
                "start": item.get("startDate"),
                "venue": (item.get("location") or {}).get("name") if isinstance(item.get("location"), dict) else None,
                "source": "vegasinsider",
            })
    return events


# --------------------------------------------------------------------------
# §1 — nflfastR features (public GitHub release)
# --------------------------------------------------------------------------

def fetch_nflfastr_features(season: int = 2025) -> list[dict]:
    """
    Endpoint: https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_{season}.csv.gz

    Not fetched on the hot loop — it is a multi-MB gz. Download once, then
    groupby team-week to build EPA/play, success rate, explosive rate, pace.
    Return shape per team-week:
      {team, week, epa_off, epa_def, success, explosive, pace}
    """
    return []


# --------------------------------------------------------------------------
# §3 — Open-Meteo historical weather (public, no key)
# --------------------------------------------------------------------------

def fetch_open_meteo(lat: float, lon: float, date: str) -> dict:
    """
    Endpoint (verified public):
      https://archive-api.open-meteo.com/v1/archive
        ?latitude=&longitude=&start_date=&end_date=
        &hourly=temperature_2m,precipitation,wind_speed_10m
    Note: the field is wind_speed_10m, not the older windspeed_10m.
    """
    url = (
        "https://archive-api.open-meteo.com/v1/archive"
        f"?latitude={lat}&longitude={lon}"
        f"&start_date={date}&end_date={date}"
        "&hourly=temperature_2m,precipitation,wind_speed_10m"
    )
    try:
        return json.loads(fetch(url, timeout=20))
    except (urllib.error.URLError, json.JSONDecodeError, TimeoutError) as e:
        print(f"[weather] {e}")
        return {}


# --------------------------------------------------------------------------
# §4 — sharp book reference (Pinnacle public page)
# --------------------------------------------------------------------------

def poll_pinnacle(game_ids: list[str]) -> list[dict]:
    """
    Stub. Pinnacle's public odds page renders client-side; the JSON feed needs
    a browser capture to locate. Return shape when filled:
      {ts, game_id, market, line, home_odds, away_odds}
    """
    return []


# --------------------------------------------------------------------------
# §4 — Circa via aggregator (SBR book filter / VegasInsider / Covers)
# --------------------------------------------------------------------------

def poll_circa_via_aggregator(game_ids: list[str]) -> list[dict]:
    """
    Stub. SBR carries a per-book filter; the same __NEXT_DATA__ payload used
    above can be filtered to sportsbook == 'circa' once we confirm their
    slug in the sportsbooks list. Return shape matches poll_pinnacle.
    """
    return []


# --------------------------------------------------------------------------
# §2 — injury news timestamps
# --------------------------------------------------------------------------

def poll_injury_news() -> list[dict]:
    """
    Stub. Sources: team injury reports (Wed/Fri) and beat reporters on X.
    X requires API credentials; the team report pages are plain HTML.
    Return shape: {ts, team, player, position, status, source, game_id}
    """
    return []


# --------------------------------------------------------------------------
# §6 — limit ladder (Circa bet slip; needs the free account)
# --------------------------------------------------------------------------

def poll_limits() -> list[dict]:
    """
    Stub. Limits only appear in the authenticated bet slip. Return shape:
      {ts, game_id, sportsbook, market_type, limit_usd, ratio_to_main, source}
    """
    return []


# --------------------------------------------------------------------------
# §4 — sharp-move detection and latency
# --------------------------------------------------------------------------

def detect_sharp_moves(prev: dict, curr: dict, ts: str, now_epoch: float,
                       last_move: dict, threshold: float = 0.5) -> list[dict]:
    """
    Compare consecutive snapshots keyed by (game_id, book, market).
    A move >= threshold points counts as sharp. latency_s is seconds since the
    previous detected move for that key (a proxy until the Pinnacle feed lands).
    """
    moves = []
    for key, row in curr.items():
        before = prev.get(key)
        if not before:
            continue
        a, b = before.get("curr_line"), row.get("curr_line")
        if a is None or b is None:
            continue
        delta = float(b) - float(a)
        if abs(delta) < threshold:
            continue
        prev_ts = last_move.get(key)
        latency = round(now_epoch - prev_ts, 1) if prev_ts else None
        last_move[key] = now_epoch
        moves.append({
            "ts": ts, "game_id": row["game_id"], "book": row["sportsbook"],
            "market": row["market"], "delta": round(delta, 2),
            "prev_line": a, "new_line": b, "latency_s": latency,
        })
    return moves


# --------------------------------------------------------------------------
# Persistence
# --------------------------------------------------------------------------

def write_odds(conn, rows):
    conn.executemany(
        """INSERT OR REPLACE INTO odds_snapshots
           (ts, game_id, league, start_utc, away_team, home_team, sportsbook,
            market, open_line, open_home, open_away, curr_line, curr_home,
            curr_away, source)
           VALUES (:ts,:game_id,:league,:start_utc,:away_team,:home_team,
                   :sportsbook,:market,:open_line,:open_home,:open_away,
                   :curr_line,:curr_home,:curr_away,:source)""",
        rows,
    )


def write_openings(conn, rows):
    conn.executemany(
        """INSERT OR REPLACE INTO openings
           (ts, game_id, sportsbook, market, line, home_odds, away_odds,
            hours_before_kickoff, source)
           VALUES (:ts,:game_id,:sportsbook,:market,:line,:home_odds,
                   :away_odds,:hours_before_kickoff,:source)""",
        rows,
    )


def write_moves(conn, rows):
    conn.executemany(
        """INSERT OR REPLACE INTO sharp_moves
           (ts, game_id, book, market, delta, prev_line, new_line, latency_s)
           VALUES (:ts,:game_id,:book,:market,:delta,:prev_line,:new_line,:latency_s)""",
        rows,
    )


# --------------------------------------------------------------------------
# Main loop
# --------------------------------------------------------------------------

def main(poll_seconds: int = 15, max_cycles: int | None = None):
    conn = init_db()
    print(f"DB ready at {DB_PATH}")

    prev_snapshot: dict = {}
    last_move: dict = {}
    cycle = 0

    while True:
        cycle += 1
        now = datetime.now(timezone.utc)
        ts = now.isoformat(timespec="seconds")
        print(f"[{ts}] cycle {cycle}")

        # SBR publishes each market on its own page; the default page is
        # point-spread only. Poll all three so the snapshot carries spread,
        # total, and money-line together — a single-market snapshot cannot
        # detect cross-market steam or compute a complete opening edge.
        rows = []
        opens = []
        for url in (SBR_NFL, SBR_NFL_TOTAL, SBR_NFL_MONEYLINE):
            try:
                html = fetch(url)
            except (urllib.error.URLError, TimeoutError) as e:
                print(f"  [sbr] fetch failed ({url}): {e}")
                continue
            parsed = parse_sbr_odds(html, ts)
            rows.extend(parsed)
            opens.extend(sbr_openings(html, ts))
            label = "point-spread" if url == SBR_NFL else url.rstrip("/").split("/")[-1]
            print(f"  [sbr] {len(parsed)} rows from {label}")

        if not rows:
            print("  [sbr] no rows across all markets; skipping cycle")
            time.sleep(poll_seconds)
            continue

        # §4 sharp moves — compare against the previous cycle
        curr_snapshot = {(r["game_id"], r["sportsbook"], r["market"]): r for r in rows}
        moves = detect_sharp_moves(prev_snapshot, curr_snapshot, ts, now.timestamp(), last_move)
        if moves:
            print(f"  [sharp] {len(moves)} moves >= 0.5 pt")
            write_moves(conn, moves)

        # §5 openings
        if opens:
            write_openings(conn, opens)

        write_odds(conn, rows)
        conn.commit()

        # VegasInsider cross-check (cheap, one request per cycle)
        try:
            vi_html = fetch(VI_NFL)
            events = parse_vegas_insider(vi_html, ts)
            print(f"  [vi] {len(events)} events")
        except (urllib.error.URLError, TimeoutError) as e:
            print(f"  [vi] fetch failed: {e}")

        # Other observables — stubs return empty until endpoints are confirmed
        poll_pinnacle([])
        poll_circa_via_aggregator([])
        poll_injury_news()
        poll_limits()

        prev_snapshot = curr_snapshot

        if max_cycles and cycle >= max_cycles:
            print("max cycles reached")
            break
        time.sleep(poll_seconds)

    conn.close()


if __name__ == "__main__":
    import sys
    cycles = int(sys.argv[1]) if len(sys.argv) > 1 else None
    main(max_cycles=cycles)
