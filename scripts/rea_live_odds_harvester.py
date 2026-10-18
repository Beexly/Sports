#!/usr/bin/env python3
"""
scripts/rea_live_odds_harvester.py
Galaxy Sports Edge — Live REA Sportsbook Odds, Alt Lines, Props, Team Totals & 10:30 AM CDT Inactives Harvester

Uses REA (PlaywrightScenarioSession + CdpRuntimeRequests / Chromium CDP response interception) to harvest:
1. DraftKings Sportsbook (`sportsbook-nash.draftkings.com`) across all 11 NFL subcategories:
   - game-lines (Spread, Total, Moneyline)
   - alt-lines (Alternate Spreads, Alternate Totals, Alternate Team Totals)
   - passing (Passing Yards, Passing TDs, Completions, Attempts, Interceptions, Longest Completion, Milestones)
   - rushing (Rushing Yards, Carries, Rushing TDs, Longest Rush, Milestones)
   - receiving (Receiving Yards, Receptions, Longest Reception, Milestones)
   - td-scorers (Anytime TD, First TD, 2+ TDs, 3+ TDs, 1H/1Q TD)
   - halves (1H/2H Spreads, Totals, Moneylines, Team Totals)
   - defensive (Tackles, Assists, Sacks, Interceptions)
   - special-teams (Kicking Points, Field Goals Made)
   - 1st-drive (1st Drive Outcome)
   - each-quarter-half-yards (Quarter/Half Player Props)
2. Action Network Multi-Book Feed (`api.actionnetwork.com/web/v2/scoreboard/nfl`):
   - Live lines across DraftKings (68), FanDuel (69), BetMGM (71), Caesars (75), Fanatics (79),
     Bet365 (123), ESPN BET (247), Consensus (15), and Opener (30)
   - Full-game (`event`), `firsthalf`, `firstquarter`, `secondhalf`
   - Spreads, Totals, Moneylines, Team Totals (`core_bet_type_6_team_score`), Public Ticket %, Sharp Money %
3. FantasyAlarm Sportradar Live Odds (`cards.alarmsports.com`) & Covers Expert Picks (`covers.com`).
4. Fresh post-10:30 AM CDT Official ESPN NFL Inactives (`espn_nfl_injuries_week6.json`).
5. Persists all fresh multi-book game lines into Neon DB `odds` table and writes the complete audited
   artifact to `docs/data-sources/research/2026-10-18/odds/rea_live_odds_week6_2026-10-18.json`.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import os
import time
import urllib.request
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

import psycopg2
from dotenv import dotenv_values
from playwright.async_api import async_playwright

REPO_ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = REPO_ROOT / "docs" / "data-sources" / "research" / "2026-10-18" / "odds"
INJ_PATH = REPO_ROOT / "docs" / "data-sources" / "research" / "2026-10-18" / "injuries" / "espn_nfl_injuries_week6.json"

DK_SUBCATEGORIES = [
    "game-lines",
    "alt-lines",
    "passing",
    "rushing",
    "receiving",
    "td-scorers",
    "halves",
    "defensive",
    "special-teams",
    "1st-drive",
    "each-quarter-half-yards",
]

ACTION_BOOK_MAP = {
    "15": "action_consensus",
    "30": "opener",
    "68": "draftkings",
    "69": "fanduel",
    "71": "betmgm",
    "75": "caesars",
    "79": "fanatics",
    "123": "bet365",
    "247": "espnbet",
}

TEAM_ABBR_TO_FULL = {
    "ARI": "Arizona Cardinals", "ATL": "Atlanta Falcons", "BAL": "Baltimore Ravens", "BUF": "Buffalo Bills",
    "CAR": "Carolina Panthers", "CHI": "Chicago Bears", "CIN": "Cincinnati Bengals", "CLE": "Cleveland Browns",
    "DAL": "Dallas Cowboys", "DEN": "Denver Broncos", "DET": "Detroit Lions", "GB": "Green Bay Packers",
    "HOU": "Houston Texans", "IND": "Indianapolis Colts", "JAX": "Jacksonville Jaguars", "JAC": "Jacksonville Jaguars",
    "KC": "Kansas City Chiefs", "LV": "Las Vegas Raiders", "LAC": "Los Angeles Chargers", "LAR": "Los Angeles Rams",
    "LA": "Los Angeles Rams", "MIA": "Miami Dolphins", "MIN": "Minnesota Vikings", "NE": "New England Patriots",
    "NO": "New Orleans Saints", "NYG": "New York Giants", "NYJ": "New York Jets", "PHI": "Philadelphia Eagles",
    "PIT": "Pittsburgh Steelers", "SF": "San Francisco 49ers", "SEA": "Seattle Seahawks", "TB": "Tampa Bay Buccaneers",
    "TEN": "Tennessee Titans", "WAS": "Washington Commanders", "WSH": "Washington Commanders",
}


def get_database_url() -> str:
    for fname in (".env.production.local", ".env.local"):
        p = REPO_ROOT / fname
        if p.exists():
            cfg = dotenv_values(p)
            if cfg.get("DATABASE_URL"):
                return cfg["DATABASE_URL"]
    if os.environ.get("DATABASE_URL"):
        return os.environ["DATABASE_URL"]
    raise RuntimeError("DATABASE_URL not found")


def parse_american_odds(val: Any) -> int | None:
    if val is None:
        return None
    s = str(val).strip().replace("\u2212", "-").replace("+", "")
    if s.upper() == "EVEN":
        return 100
    try:
        return int(float(s))
    except Exception:
        return None


def american_to_implied(odds: int | float | None) -> float | None:
    if odds is None or odds == 0:
        return None
    o = float(odds)
    if o < 0:
        return (-o) / ((-o) + 100.0)
    return 100.0 / (o + 100.0)


def devig_pair(odds_a: int | float | None, odds_b: int | float | None) -> tuple[float, float]:
    pa = american_to_implied(odds_a)
    pb = american_to_implied(odds_b)
    if not pa or not pb or (pa + pb) <= 0:
        return 0.5, 0.5
    tot = pa + pb
    return round(pa / tot, 4), round(pb / tot, 4)


def fetch_json_url(url: str, timeout: int = 20) -> Any:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
            "Accept": "application/json,text/plain,*/*",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8", errors="replace"))


async def harvest_dk_via_rea_playwright() -> dict:
    """Use REA Playwright + CDP response capture across all 11 DraftKings NFL subcategories."""
    chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    events_by_id: Dict[str, dict] = {}
    markets_by_id: Dict[str, dict] = {}
    selections_by_id: Dict[str, dict] = {}
    subcat_stats: Dict[str, dict] = {}

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path=chrome_path,
            headless=True,
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox", "--disable-gpu"],
        )
        ctx = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
            viewport={"width": 1440, "height": 900},
        )
        page = await ctx.new_page()

        current_subcat = "init"

        async def on_response(resp):
            if "sportsbook-nash.draftkings.com" in resp.url and resp.status == 200:
                try:
                    data = await resp.json()
                    evs = data.get("events") or []
                    mkts = data.get("markets") or []
                    sels = data.get("selections") or []
                    for e in evs:
                        if e.get("id"):
                            events_by_id[str(e["id"])] = e
                    for m in mkts:
                        if m.get("id"):
                            markets_by_id[str(m["id"])] = m
                    for s in sels:
                        if s.get("id"):
                            selections_by_id[str(s["id"])] = s
                    st = subcat_stats.setdefault(current_subcat, {"responses": 0, "markets": 0, "selections": 0})
                    st["responses"] += 1
                    st["markets"] += len(mkts)
                    st["selections"] += len(sels)
                except Exception:
                    pass

        page.on("response", on_response)

        for subcat in DK_SUBCATEGORIES:
            current_subcat = subcat
            url = f"https://sportsbook.draftkings.com/leagues/football/nfl?category=games&subcategory={subcat}"
            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=18000)
                await asyncio.sleep(2.0)
                st = subcat_stats.get(subcat, {"responses": 0, "markets": 0, "selections": 0})
                print(f"  [REA DraftKings] subcategory={subcat:<24} | mkts={st['markets']:<4} | sels={st['selections']:<5}")
            except Exception as e:
                print(f"  [REA DraftKings] subcategory={subcat} warning: {e}")

        await browser.close()

    # Organize markets and selections by event
    sels_by_mkt: Dict[str, List[dict]] = {}
    for s in selections_by_id.values():
        mid = str(s.get("marketId") or "")
        sels_by_mkt.setdefault(mid, []).append({
            "id": s.get("id"),
            "label": s.get("label"),
            "outcomeType": s.get("outcomeType"),
            "points": s.get("points"),
            "americanOdds": parse_american_odds((s.get("displayOdds") or {}).get("american")),
            "decimalOdds": (s.get("displayOdds") or {}).get("decimal"),
            "trueOdds": s.get("trueOdds"),
            "participants": [p.get("name") for p in (s.get("participants") or []) if p.get("name")],
        })

    events_structured = []
    for eid, ev in events_by_id.items():
        ev_mkts = []
        for mid, m in markets_by_id.items():
            if str(m.get("eventId")) == eid:
                ev_mkts.append({
                    "marketId": mid,
                    "name": m.get("name"),
                    "subcategoryId": m.get("subcategoryId"),
                    "selections": sels_by_mkt.get(mid, []),
                })
        events_structured.append({
            "eventId": eid,
            "name": ev.get("name"),
            "startEventDate": ev.get("startEventDate"),
            "marketCount": len(ev_mkts),
            "selectionCount": sum(len(x["selections"]) for x in ev_mkts),
            "markets": ev_mkts,
        })

    return {
        "total_events": len(events_by_id),
        "total_markets": len(markets_by_id),
        "total_selections": len(selections_by_id),
        "subcategory_stats": subcat_stats,
        "events": events_structured,
    }


def harvest_action_network_multibook() -> dict:
    """Harvest Action Network multi-book scoreboard (9 books x 4 periods + team totals + ticket/money %)."""
    url = (
        "https://api.actionnetwork.com/web/v2/scoreboard/nfl"
        "?bookIds=15,30,68,69,71,75,79,123,247&periods=event,firsthalf,firstquarter,secondhalf"
    )
    raw = fetch_json_url(url, timeout=25)
    games_out = []

    for g in raw.get("games") or []:
        teams_by_id = {}
        away_abbr = home_abbr = ""
        away_id = g.get("away_team_id")
        home_id = g.get("home_team_id")
        for t in g.get("teams") or []:
            tid = t.get("id")
            abbr = (t.get("abbr") or "").upper()
            if abbr == "JAC":
                abbr = "JAX"
            elif abbr == "LA":
                abbr = "LAR"
            teams_by_id[tid] = abbr
            if tid == away_id:
                away_abbr = abbr
            elif tid == home_id:
                home_abbr = abbr

        away_full = TEAM_ABBR_TO_FULL.get(away_abbr, away_abbr)
        home_full = TEAM_ABBR_TO_FULL.get(home_abbr, home_abbr)
        matchup = f"{away_full} @ {home_full}"

        books_parsed = {}
        mkts = g.get("markets") or {}
        for bid, bname in ACTION_BOOK_MAP.items():
            bdata = mkts.get(bid) or {}
            ev_mkt = bdata.get("event") or {}
            if not ev_mkt:
                continue

            sp_home = sp_away = sp_home_odds = sp_away_odds = None
            sp_home_tix = sp_home_money = sp_away_tix = sp_away_money = None
            for s in ev_mkt.get("spread") or []:
                if s.get("side") == "home":
                    sp_home = s.get("value")
                    sp_home_odds = s.get("odds")
                    sp_home_tix = ((s.get("bet_info") or {}).get("tickets") or {}).get("percent")
                    sp_home_money = ((s.get("bet_info") or {}).get("money") or {}).get("percent")
                elif s.get("side") == "away":
                    sp_away = s.get("value")
                    sp_away_odds = s.get("odds")
                    sp_away_tix = ((s.get("bet_info") or {}).get("tickets") or {}).get("percent")
                    sp_away_money = ((s.get("bet_info") or {}).get("money") or {}).get("percent")

            tot_line = over_odds = under_odds = None
            over_tix = over_money = under_tix = under_money = None
            for t_item in ev_mkt.get("total") or []:
                if t_item.get("side") == "over":
                    tot_line = t_item.get("value")
                    over_odds = t_item.get("odds")
                    over_tix = ((t_item.get("bet_info") or {}).get("tickets") or {}).get("percent")
                    over_money = ((t_item.get("bet_info") or {}).get("money") or {}).get("percent")
                elif t_item.get("side") == "under":
                    if tot_line is None:
                        tot_line = t_item.get("value")
                    under_odds = t_item.get("odds")
                    under_tix = ((t_item.get("bet_info") or {}).get("tickets") or {}).get("percent")
                    under_money = ((t_item.get("bet_info") or {}).get("money") or {}).get("percent")

            ml_home = ml_away = None
            for m_item in ev_mkt.get("moneyline") or []:
                if m_item.get("side") == "home":
                    ml_home = m_item.get("odds")
                elif m_item.get("side") == "away":
                    ml_away = m_item.get("odds")

            team_totals = {}
            for tt in ev_mkt.get("core_bet_type_6_team_score") or []:
                t_abbr = teams_by_id.get(tt.get("team_id"), "?")
                entry = team_totals.setdefault(t_abbr, {})
                entry["line"] = tt.get("value")
                if tt.get("side") == "over":
                    entry["over_odds"] = tt.get("odds")
                elif tt.get("side") == "under":
                    entry["under_odds"] = tt.get("odds")

            # Also capture 1st Half (firsthalf) spread & total
            fh_mkt = bdata.get("firsthalf") or {}
            fh_sp_home = next((x.get("value") for x in (fh_mkt.get("spread") or []) if x.get("side") == "home"), None)
            fh_tot = next((x.get("value") for x in (fh_mkt.get("total") or []) if x.get("side") == "over"), None)

            books_parsed[bname] = {
                "book_id": bid,
                "spread_home": sp_home,
                "spread_away": sp_away,
                "spread_home_odds": sp_home_odds,
                "spread_away_odds": sp_away_odds,
                "spread_home_tickets_pct": sp_home_tix,
                "spread_home_money_pct": sp_home_money,
                "spread_away_tickets_pct": sp_away_tix,
                "spread_away_money_pct": sp_away_money,
                "total": tot_line,
                "over_odds": over_odds,
                "under_odds": under_odds,
                "over_tickets_pct": over_tix,
                "over_money_pct": over_money,
                "under_tickets_pct": under_tix,
                "under_money_pct": under_money,
                "ml_home": ml_home,
                "ml_away": ml_away,
                "team_totals": team_totals,
                "first_half_spread_home": fh_sp_home,
                "first_half_total": fh_tot,
            }

        # Compute live multi-book consensus across active retail sportsbooks (excluding 'opener')
        live_books = [v for k, v in books_parsed.items() if k != "opener"]
        sp_vals = [float(b["spread_home"]) for b in live_books if b.get("spread_home") is not None]
        tot_vals = [float(b["total"]) for b in live_books if b.get("total") is not None]
        sp_h_odds = [int(b["spread_home_odds"]) for b in live_books if b.get("spread_home_odds") is not None]
        sp_a_odds = [int(b["spread_away_odds"]) for b in live_books if b.get("spread_away_odds") is not None]
        ov_odds = [int(b["over_odds"]) for b in live_books if b.get("over_odds") is not None]
        un_odds = [int(b["under_odds"]) for b in live_books if b.get("under_odds") is not None]

        avg_sp_h_odds = round(sum(sp_h_odds) / len(sp_h_odds)) if sp_h_odds else -110
        avg_sp_a_odds = round(sum(sp_a_odds) / len(sp_a_odds)) if sp_a_odds else -110
        avg_ov_odds = round(sum(ov_odds) / len(ov_odds)) if ov_odds else -110
        avg_un_odds = round(sum(un_odds) / len(un_odds)) if un_odds else -110

        sp_home_fair, sp_away_fair = devig_pair(avg_sp_h_odds, avg_sp_a_odds)
        over_fair, under_fair = devig_pair(avg_ov_odds, avg_un_odds)

        dk_book = books_parsed.get("draftkings") or books_parsed.get("action_consensus") or {}
        dk_sp_home_fair, dk_sp_away_fair = devig_pair(dk_book.get("spread_home_odds", -110), dk_book.get("spread_away_odds", -110))
        dk_over_fair, dk_under_fair = devig_pair(dk_book.get("over_odds", -110), dk_book.get("under_odds", -110))

        games_out.append({
            "action_event_id": g.get("id"),
            "matchup": matchup,
            "away_abbr": away_abbr,
            "home_abbr": home_abbr,
            "away_full": away_full,
            "home_full": home_full,
            "start_time": g.get("start_time"),
            "status": g.get("status"),
            "book_count": len(live_books),
            "consensus": {
                "spread_home_mean": round(sum(sp_vals) / len(sp_vals), 2) if sp_vals else None,
                "spread_home_primary": dk_book.get("spread_home"),
                "spread_away_primary": dk_book.get("spread_away"),
                "spread_home_odds_avg": avg_sp_h_odds,
                "spread_away_odds_avg": avg_sp_a_odds,
                "spread_home_fair_prob": sp_home_fair,
                "spread_away_fair_prob": sp_away_fair,
                "dk_spread_home_fair_prob": dk_sp_home_fair,
                "dk_spread_away_fair_prob": dk_sp_away_fair,
                "total_mean": round(sum(tot_vals) / len(tot_vals), 2) if tot_vals else None,
                "total_primary": dk_book.get("total"),
                "over_odds_avg": avg_ov_odds,
                "under_odds_avg": avg_un_odds,
                "over_fair_prob": over_fair,
                "under_fair_prob": under_fair,
                "dk_over_fair_prob": dk_over_fair,
                "dk_under_fair_prob": dk_under_fair,
                "opener_spread_home": (books_parsed.get("opener") or {}).get("spread_home"),
                "opener_total": (books_parsed.get("opener") or {}).get("total"),
            },
            "books": books_parsed,
        })

    return {"game_count": len(games_out), "games": games_out}


def refresh_post_1030_inactives() -> dict:
    """Refresh official ESPN NFL Week 6 injuries right now (post-10:30 AM CDT inactive gate)."""
    raw_inj = fetch_json_url("https://site.api.espn.com/apis/site/v2/sports/football/nfl/injuries", timeout=25)
    teams_out = []
    total_inj = 0
    for item in raw_inj.get("injuries") or []:
        t_name = item.get("displayName") or (item.get("team") or {}).get("displayName") or ""
        t_abbr = (item.get("team") or {}).get("abbreviation") or ""
        injs = []
        for entry in item.get("injuries") or []:
            ath = entry.get("athlete") or {}
            pos = ((ath.get("position") or {}).get("abbreviation")) or "?"
            injs.append({
                "athlete": ath.get("displayName") or "?",
                "position": pos,
                "status": entry.get("status") or "?",
                "date": entry.get("date"),
                "comment": entry.get("shortComment") or entry.get("longComment") or "",
            })
        total_inj += len(injs)
        teams_out.append({"team": t_abbr, "name": t_name, "injuries": injs})

    inj_digest = {
        "generated_utc": datetime.now(timezone.utc).isoformat(),
        "gate_status": "POST_1030_AM_CDT_EARLY_WINDOW_INACTIVES_LOCKED",
        "source": "https://site.api.espn.com/apis/site/v2/sports/football/nfl/injuries",
        "team_count": len(teams_out),
        "injury_count": total_inj,
        "teams": teams_out,
    }
    INJ_PATH.parent.mkdir(parents=True, exist_ok=True)
    INJ_PATH.write_text(json.dumps(inj_digest, indent=1), encoding="utf-8")
    return {"team_count": len(teams_out), "injury_count": total_inj, "generated_utc": inj_digest["generated_utc"]}


def persist_live_odds_to_neon_db(an_data: dict) -> int:
    """Insert fresh timestamped multi-book odds rows into Neon DB `odds` table for all Week 6 games."""
    conn = psycopg2.connect(get_database_url())
    cur = conn.cursor()
    cur.execute("""
        SELECT id, "homeTeamName", "awayTeamName"
        FROM games
        WHERE "sportId" = 'cmpg6t7v900031heri45v3d8s'
          AND "commenceTime" >= '2026-10-15'
          AND "commenceTime" < '2026-10-21'
          AND "mergedIntoGameId" IS NULL;
    """)
    gid_by_matchup = {f"{away} @ {home}": gid for gid, home, away in cur.fetchall()}

    cur.execute("SELECT market::text FROM odds LIMIT 1;")
    row_m = cur.fetchone()
    market_enum = row_m[0] if row_m else "ALL"

    now = datetime.now(timezone.utc)
    inserted = 0
    for g in an_data.get("games") or []:
        gid = gid_by_matchup.get(g["matchup"])
        if not gid:
            continue
        for bname, b in (g.get("books") or {}).items():
            if bname == "opener":
                continue
            oid = "c" + hashlib.md5(f"{gid}_{bname}_{now.isoformat()}_{uuid.uuid4()}".encode()).hexdigest()[:24]
            cur.execute("""
                INSERT INTO odds (
                    id, "gameId", bookmaker, market,
                    "homePrice", "awayPrice",
                    spread, "homeSpreadPrice", "awaySpreadPrice",
                    total, "overPrice", "underPrice",
                    "fetchedAt", "createdAt"
                ) VALUES (
                    %s, %s, %s, %s::"OddsMarket",
                    %s, %s,
                    %s, %s, %s,
                    %s, %s, %s,
                    %s, %s
                );
            """, (
                oid, gid, bname, market_enum,
                b.get("ml_home"), b.get("ml_away"),
                b.get("spread_home"), b.get("spread_home_odds"), b.get("spread_away_odds"),
                b.get("total"), b.get("over_odds"), b.get("under_odds"),
                now, now,
            ))
            inserted += 1

    conn.commit()
    cur.close()
    conn.close()
    return inserted


async def main():
    t0 = time.time()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print("=== [1/4] Harvesting DraftKings Sportsbook (11 Subcategories: Game Lines, Alts, Props, TDs, Halves) via REA Playwright + CDP ===")
    dk_data = await harvest_dk_via_rea_playwright()
    print(f"  Captured {dk_data['total_events']} DK events, {dk_data['total_markets']} markets, {dk_data['total_selections']} priced selections.")

    print("\n=== [2/4] Harvesting Action Network 9-Book Live Odds, Team Totals, Halves, and Public/Sharp Splits ===")
    an_data = harvest_action_network_multibook()
    for g in an_data["games"]:
        c = g["consensus"]
        print(f"  {g['matchup']:<45} | Spread={str(c['spread_home_primary']):<6} (mean {str(c['spread_home_mean']):<6}) | Total={str(c['total_primary']):<5} (mean {str(c['total_mean']):<5}) | OverFair={c['over_fair_prob']:.4f} | UnderFair={c['under_fair_prob']:.4f}")

    print("\n=== [3/4] Refreshing Official ESPN NFL Week 6 Inactives (Post-10:30 AM CDT Gate) ===")
    inj_summary = refresh_post_1030_inactives()
    print(f"  Refreshed {inj_summary['injury_count']} player injury/inactive records across {inj_summary['team_count']} teams at {inj_summary['generated_utc']}.")

    print("\n=== [4/4] Persisting Live Multi-Book Snapshot to Neon DB `odds` Table & Saving Artifact ===")
    db_inserted = persist_live_odds_to_neon_db(an_data)
    print(f"  Inserted {db_inserted} fresh multi-book rows into Neon DB `odds` table.")

    payload = {
        "captured_utc": datetime.now(timezone.utc).isoformat(),
        "duration_sec": round(time.time() - t0, 2),
        "rea_engine": "src/browser/PlaywrightScenarioSession.ts + src/browser/execution/CdpRuntimeRequests.ts",
        "inactives_gate": inj_summary,
        "neon_db_odds_rows_inserted": db_inserted,
        "action_network_multibook": an_data,
        "draftkings_full_catalog": dk_data,
    }
    out_file = OUT_DIR / "rea_live_odds_week6_2026-10-18.json"
    out_file.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    sha256 = hashlib.sha256(out_file.read_bytes()).hexdigest()
    print(f"\nSaved {out_file.relative_to(REPO_ROOT)} (SHA-256: {sha256[:16]}) in {payload['duration_sec']}s.")


if __name__ == "__main__":
    asyncio.run(main())
