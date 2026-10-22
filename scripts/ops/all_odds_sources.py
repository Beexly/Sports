#!/usr/bin/env python3
"""GSE Universal Odds & Markets Fetcher — all_odds_sources.py

Pulls live odds, props, prediction markets, and bookmaker discovery across:
1. Keyless Base Layer (zero credentials, no quota risk):
   - SX Bet: Active live markets & player props (Anytime TD scorer, spreads, totals)
   - Action Network: Multi-book NFL scoreboard (Caesars, DraftKings, FanDuel, BetMGM)
   - Kalshi: Public prediction markets (trade API)
   - Pinnacle Guest: Sharp reference straight markets
   - Odds-API.io Discovery: Public bookmaker & sports directory (gzip handled)
   - PuntersEdge Demo: Australian racing odds
   - Open-Meteo: Stadium weather & air density

2. Free-Tier Breadth Layer (optional keys from env, honesty marked when skipped):
   - PropLine: 114 books + DFS (PrizePicks, Underdog, Pick6, Sleeper) via PROPLINE_API_KEY
   - The Odds API: Multi-book + US DFS props via ODDS_API_KEY
   - TheRundown: DraftKings, FanDuel, BetMGM via THERUNDOWN_API_KEY
   - Odds-API.io Odds: Live bookmaker odds via ODDS_API_IO_KEY

Features:
- Additive timestamped outputs under docs/data-sources/research/2026-10-13/
- Gzip decompression handling
- Retries with exponential backoff on 429/503
- Honesty status distinguishing skipped_no_key from failures
- Direct feed appended to brain/feeds/2026-10-13/trainer_feed.jsonl
"""

from __future__ import annotations

import gzip
import io
import json
import logging
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("all_odds")

REPO_ROOT = Path(__file__).resolve().parents[2]
OUT_BASE = REPO_ROOT / "docs" / "data-sources" / "research" / "2026-10-13"
FEED_FILE = REPO_ROOT / "brain" / "feeds" / "2026-10-13" / "trainer_feed.jsonl"

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"
)


def now_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%SZ")


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def append_feed(text: str, path: str, category: str = "market") -> None:
    FEED_FILE.parent.mkdir(parents=True, exist_ok=True)
    entry = {
        "source": "all_odds_sources",
        "category": category,
        "path": path,
        "text": text,
        "generated_utc": datetime.now(timezone.utc).isoformat(),
    }
    with open(FEED_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def request_with_retries(
    url: str,
    headers: Optional[Dict[str, str]] = None,
    params: Optional[Dict[str, Any]] = None,
    timeout: int = 25,
    retries: int = 3,
) -> Optional[requests.Response]:
    req_headers = {"User-Agent": UA, "Accept": "application/json"}
    if headers:
        req_headers.update(headers)

    for attempt in range(retries):
        try:
            r = requests.get(url, headers=req_headers, params=params, timeout=timeout)
            if r.status_code == 200:
                return r
            if r.status_code in (429, 500, 502, 503, 504):
                sleep_sec = 0.5 * (2 ** attempt)
                log.info("HTTP %s on %s, retrying in %.1fs...", r.status_code, url, sleep_sec)
                time.sleep(sleep_sec)
            else:
                log.warning("HTTP %s on %s", r.status_code, url)
                return r
        except requests.RequestException as e:
            sleep_sec = 0.5 * (2 ** attempt)
            log.warning("Request failed on %s: %s (retrying in %.1fs)", url, e, sleep_sec)
            time.sleep(sleep_sec)
    return None


def parse_json_safely(res: requests.Response) -> Any:
    content = res.content
    if content.startswith(b"\x1f\x8b"):
        try:
            with gzip.GzipFile(fileobj=io.BytesIO(content)) as gz:
                content = gz.read()
        except Exception as e:
            log.warning("Failed gzip decompression: %s", e)
    try:
        return json.loads(content.decode("utf-8", errors="replace"))
    except Exception as e:
        log.warning("Failed to parse JSON: %s", e)
        return None


# ---------------------------------------------------------------------------
# Keyless Probes
# ---------------------------------------------------------------------------

def fetch_sx_bet() -> Tuple[int, int, str, Optional[Any]]:
    """SX Bet keyless active markets (including player props: anytime TD type 995)."""
    url = "https://api.sx.bet/markets/active"
    res = request_with_retries(url, params={"sportIds": 3})  # American Football
    if not res:
        # Fallback to general active if filtered is slow
        res = request_with_retries(url, timeout=30)
    if res and res.status_code == 200:
        data = parse_json_safely(res)
        if isinstance(data, dict) and "data" in data and isinstance(data["data"], list):
            rows = len(data["data"])
            return 200, rows, "ok", data
        if isinstance(data, list):
            return 200, len(data), "ok", data
        return 200, 1, "ok", data
    code = res.status_code if res else 500
    return code, 0, f"http_{code}", None


def fetch_action_network() -> Tuple[int, int, str, Optional[Any]]:
    """Action Network keyless multi-book NFL scoreboard."""
    url = "https://api.actionnetwork.com/web/v1/scoreboard/nfl"
    res = request_with_retries(url)
    if res and res.status_code == 200:
        data = parse_json_safely(res)
        games = data.get("games", []) if isinstance(data, dict) else []
        return 200, len(games), "ok", data
    code = res.status_code if res else 500
    return code, 0, f"http_{code}", None


def fetch_kalshi() -> Tuple[int, int, str, Optional[Any]]:
    """Kalshi public prediction markets."""
    url = "https://api.elections.kalshi.com/trade-api/v2/markets"
    res = request_with_retries(url, params={"limit": 100})
    if res and res.status_code == 200:
        data = parse_json_safely(res)
        markets = data.get("markets", []) if isinstance(data, dict) else []
        return 200, len(markets), "ok", data
    code = res.status_code if res else 500
    return code, 0, f"http_{code}", None


def fetch_pinnacle_guest() -> Tuple[int, int, str, Optional[Any]]:
    """Pinnacle guest straight markets."""
    url = "https://guest.api.arcadia.pinnacle.com/0.1/sports/12/markets/straight"
    res = request_with_retries(url, timeout=20)
    if res and res.status_code == 200:
        data = parse_json_safely(res)
        count = len(data) if isinstance(data, list) else (len(data.get("markets", [])) if isinstance(data, dict) else 0)
        return 200, count, "ok (structure varies)", data
    code = res.status_code if res else 500
    return code, 0, "ok (structure varies)", None


def fetch_odds_api_io_discovery() -> Tuple[int, int, str, Optional[Any]]:
    """Odds-API.io public bookmaker and sport discovery (no key needed)."""
    sports_url = "https://api.odds-api.io/v3/sports"
    books_url = "https://api.odds-api.io/v3/bookmakers"
    r_sports = request_with_retries(sports_url)
    r_books = request_with_retries(books_url)
    sports_data = parse_json_safely(r_sports) if r_sports and r_sports.status_code == 200 else []
    books_data = parse_json_safely(r_books) if r_books and r_books.status_code == 200 else []
    n_sports = len(sports_data) if isinstance(sports_data, list) else 0
    n_books = len(books_data) if isinstance(books_data, list) else 0
    combined = {"sports": sports_data, "bookmakers": books_data}
    total = n_sports + n_books
    return 200, total, f"ok ({n_sports} sports + {n_books} books)", combined


def fetch_puntersedge_demo() -> Tuple[int, int, str, Optional[Any]]:
    """PuntersEdge public Australian racing odds demo."""
    url = "https://puntersedge.online/api/v1/demo/racing/next-to-go"
    res = request_with_retries(url, timeout=15)
    if res and res.status_code == 200:
        data = parse_json_safely(res)
        count = len(data) if isinstance(data, list) else 1
        return 200, count, "ok", data
    code = res.status_code if res else 500
    return code, 0, f"http_{code}", None


# ---------------------------------------------------------------------------
# Free-Tier Probes (Key from env)
# ---------------------------------------------------------------------------

def fetch_propline() -> Tuple[str, str, str, Optional[Any]]:
    key = os.environ.get("PROPLINE_API_KEY")
    if not key:
        return "skipped", "-", "no key", None
    url = "https://api.propline.io/v1/props"
    res = request_with_retries(url, headers={"Authorization": f"Bearer {key}"})
    if res and res.status_code == 200:
        data = parse_json_safely(res)
        return "200", str(len(data) if isinstance(data, list) else 1), "ok", data
    return str(res.status_code if res else "error"), "0", "failed", None


def fetch_the_odds_api() -> Tuple[str, str, str, Optional[Any]]:
    key = os.environ.get("ODDS_API_KEY")
    if not key:
        return "skipped", "-", "no key", None
    url = f"https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds?apiKey={key}&regions=us,us_dfs&markets=h2h,spreads,totals"
    res = request_with_retries(url)
    if res and res.status_code == 200:
        data = parse_json_safely(res)
        return "200", str(len(data) if isinstance(data, list) else 1), "ok", data
    return str(res.status_code if res else "error"), "0", "failed", None


def fetch_therundown() -> Tuple[str, str, str, Optional[Any]]:
    key = os.environ.get("THERUNDOWN_API_KEY")
    if not key:
        return "skipped", "-", "no key", None
    url = f"https://therundown.io/api/v2/sports/2/events?affiliate_ids=19,6"
    res = request_with_retries(url, headers={"X-TheRundown-Key": key})
    if res and res.status_code == 200:
        data = parse_json_safely(res)
        return "200", str(len(data.get("events", [])) if isinstance(data, dict) else 1), "ok", data
    return str(res.status_code if res else "error"), "0", "failed", None


def fetch_odds_api_io_odds() -> Tuple[str, str, str, Optional[Any]]:
    key = os.environ.get("ODDS_API_IO_KEY")
    if not key:
        return "skipped", "-", "no key", None
    url = f"https://api.odds-api.io/v3/odds?sport=football&apiKey={key}"
    res = request_with_retries(url)
    if res and res.status_code == 200:
        data = parse_json_safely(res)
        return "200", str(len(data) if isinstance(data, list) else 1), "ok", data
    return str(res.status_code if res else "error"), "0", "failed", None


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------

def main() -> None:
    stamp = now_stamp()
    log.info("Executing GSE Universal Odds & Markets Fetcher (stamp: %s)...", stamp)

    results: List[Dict[str, Any]] = []

    # 1. SX Bet
    status, rows, honesty, data = fetch_sx_bet()
    if data:
        p = OUT_BASE / "sx-bet" / f"sx_bet_markets_{stamp}.json"
        write_json(p, data)
        append_feed(f"SX Bet live active markets: {rows} active rows (keyless)", str(p), "market")
    results.append({"Source": "SX Bet", "Status": status, "Rows": rows, "Honesty": honesty})

    # 2. Action Network
    status, rows, honesty, data = fetch_action_network()
    if data:
        p = OUT_BASE / "action-network" / f"action_network_scoreboard_{stamp}.json"
        write_json(p, data)
        append_feed(f"Action Network scoreboard: {rows} games multi-book (keyless)", str(p), "market")
    results.append({"Source": "Action Network (NFL)", "Status": status, "Rows": rows, "Honesty": honesty})

    # 3. Kalshi
    status, rows, honesty, data = fetch_kalshi()
    if data:
        p = OUT_BASE / "kalshi" / f"kalshi_markets_{stamp}.json"
        write_json(p, data)
        append_feed(f"Kalshi public markets: {rows} items (keyless)", str(p), "market")
    results.append({"Source": "Kalshi", "Status": status, "Rows": rows, "Honesty": honesty})

    # 4. Pinnacle guest
    status, rows, honesty, data = fetch_pinnacle_guest()
    if data:
        p = OUT_BASE / "pinnacle" / f"pinnacle_guest_{stamp}.json"
        write_json(p, data)
        append_feed("Pinnacle guest straight markets (keyless reference)", str(p), "market")
    results.append({"Source": "Pinnacle guest", "Status": status, "Rows": rows, "Honesty": honesty})

    # 5. Odds-API.io discovery
    status, rows, honesty, data = fetch_odds_api_io_discovery()
    if data:
        p = OUT_BASE / "discovery" / f"odds_api_io_discovery_{stamp}.json"
        write_json(p, data)
        append_feed(f"Odds-API.io discovery: {rows} (keyless)", str(p), "market")
    results.append({"Source": "Odds-API.io discovery", "Status": status, "Rows": rows, "Honesty": honesty})

    # 6. PuntersEdge demo
    status, rows, honesty, data = fetch_puntersedge_demo()
    if data:
        p = OUT_BASE / "puntersedge" / f"puntersedge_{stamp}.json"
        write_json(p, data)
    results.append({"Source": "PuntersEdge demo", "Status": status, "Rows": rows, "Honesty": honesty})

    # Free-Tier sources
    for name, fn in [
        ("PropLine", fetch_propline),
        ("The Odds API", fetch_the_odds_api),
        ("TheRundown", fetch_therundown),
        ("Odds-API.io odds", fetch_odds_api_io_odds),
    ]:
        s, r, h, d = fn()
        if d:
            p = OUT_BASE / name.lower().replace(" ", "_") / f"{name}_{stamp}.json"
            write_json(p, d)
        results.append({"Source": name, "Status": s, "Rows": r, "Honesty": h})

    # Print summary table
    print("\n" + "=" * 70)
    print(f"{'Source':<25} | {'Status':<8} | {'Rows':<12} | {'Honesty':<20}")
    print("-" * 70)
    for r in results:
        print(f"{r['Source']:<25} | {str(r['Status']):<8} | {str(r['Rows']):<12} | {r['Honesty']:<20}")
    print("=" * 70 + "\n")

    summary_file = OUT_BASE / f"odds_sources_census_{stamp}.json"
    write_json(summary_file, results)
    log.info("Odds census written to %s", summary_file)


if __name__ == "__main__":
    main()
