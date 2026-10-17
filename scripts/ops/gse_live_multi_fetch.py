#!/usr/bin/env python3
"""GSE Live Multi-Source Fetch — Production-grade multi-book & tracking pipeline.

Covers:
  - Action Network keyless multi-book (exits single-book plane)
  - NGS cookie-warmed statboard (RYOE, 8+ box, TTT, separation)
  - ESPN NFL injuries (keyless full roster injury status)
  - Kalshi public exchange & market reads
  - Open-Meteo weather & air density

All outputs are timestamped and additive under docs/data-sources/research/2026-10-13/.
Honesty notes on every soft gate.
Appends compact signal summaries to the trainer feed so the mind learns.
No overwrites. No pruning. Ready to schedule.
"""

from __future__ import annotations

import json
import logging
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("gse_live")

REPO_ROOT = Path(__file__).resolve().parents[2]
OUT_BASE = REPO_ROOT / "docs" / "data-sources" / "research" / "2026-10-13"
FEED_FILE = REPO_ROOT / "brain" / "feeds" / "2026-10-13" / "trainer_feed.jsonl"

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def now_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%SZ")


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def append_feed(text: str, path: str, category: str = "live_multi") -> None:
    FEED_FILE.parent.mkdir(parents=True, exist_ok=True)
    existing_hashes = set()
    if FEED_FILE.exists():
        with open(FEED_FILE, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        d = json.loads(line)
                        if "text" in d:
                            existing_hashes.add(d["text"])
                    except Exception:
                        pass

    if text not in existing_hashes:
        entry = {
            "source": "gse_live",
            "category": category,
            "path": path,
            "text": text,
            "generated_utc": datetime.now(timezone.utc).isoformat(),
        }
        with open(FEED_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
        log.info("Feed entry appended: %s", text[:80])


# ---------------------------------------------------------------------------
# Action Network — keyless multi-book (highest leverage)
# ---------------------------------------------------------------------------

def fetch_action_network() -> Optional[Dict[str, Any]]:
    """Keyless multi-book NFL scoreboard.
    Turns the single-book ESPN DK relay into a 2–4+ book plane.
    Exact recommendation from ODDS-SOURCE-COVERAGE §5 step 1.
    """
    url = "https://api.actionnetwork.com/web/v1/scoreboard/nfl"
    try:
        r = requests.get(url, headers={"User-Agent": UA, "Accept": "application/json"}, timeout=30)
        if r.status_code == 200:
            return r.json()
        log.warning("Action Network returned HTTP %s", r.status_code)
    except requests.RequestException as e:
        log.warning("Action Network exception: %s", e)
    return None


# ---------------------------------------------------------------------------
# NGS — cookie-warmed (soft gate)
# ---------------------------------------------------------------------------

def warm_ngs() -> requests.Session:
    """Pure anonymous requests hit intermittent 401s. Warm cookies once."""
    s = requests.Session()
    s.headers.update({
        "User-Agent": UA,
        "Referer": "https://nextgenstats.nfl.com/stats/rushing",
        "Accept": "application/json",
    })
    try:
        s.get("https://nextgenstats.nfl.com/", timeout=20)
    except Exception as exc:
        log.warning("NGS warm-up session warning: %s", exc)
    return s


def fetch_ngs(session: requests.Session, stat: str = "rushing", retries: int = 4) -> Optional[Dict[str, Any]]:
    params = {"season": 2026, "seasonType": "REG"}
    url = f"https://nextgenstats.nfl.com/api/statboard/{stat}"
    for attempt in range(retries):
        try:
            r = session.get(url, params=params, timeout=30)
            if r.status_code == 200:
                return r.json()
            if r.status_code in (401, 403, 429):
                log.info("NGS %s attempt %d: %s — re-warming session cookies", stat, attempt + 1, r.status_code)
                try:
                    session.get("https://nextgenstats.nfl.com/", timeout=15)
                except Exception:
                    pass
            time.sleep(0.5 * (2 ** attempt))
        except requests.RequestException:
            time.sleep(0.5 * (2 ** attempt))
    log.warning("NGS %s failed after %d retries", stat, retries)
    return None


# ---------------------------------------------------------------------------
# Other keyless sources
# ---------------------------------------------------------------------------

def fetch_espn_injuries() -> Optional[Dict[str, Any]]:
    url = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/injuries"
    try:
        r = requests.get(url, headers={"User-Agent": UA}, timeout=45)
        if r.status_code == 200:
            return r.json()
        log.warning("ESPN injuries returned HTTP %s", r.status_code)
    except requests.RequestException as e:
        log.warning("ESPN injuries exception: %s", e)
    return None


def fetch_kalshi_status() -> Optional[Dict[str, Any]]:
    url = "https://api.elections.kalshi.com/trade-api/v2/exchange/status"
    try:
        r = requests.get(url, headers={"User-Agent": UA}, timeout=15)
        if r.status_code == 200:
            return r.json()
    except requests.RequestException:
        pass
    return None


def fetch_open_meteo(lat: float = 33.95, lon: float = -118.34) -> Optional[Dict[str, Any]]:
    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}&hourly=temperature_2m,precipitation,wind_speed_10m,pressure_msl"
    )
    try:
        r = requests.get(url, headers={"User-Agent": UA}, timeout=20)
        if r.status_code == 200:
            return r.json()
    except requests.RequestException:
        pass
    return None


# ---------------------------------------------------------------------------
# Main Orchestration Loop
# ---------------------------------------------------------------------------

def main() -> None:
    stamp = now_stamp()
    log.info("Starting GSE Live Multi-Source Fetch (timestamp: %s)...", stamp)

    summary: Dict[str, Any] = {
        "generated_utc": stamp,
        "gates": {
            "action_network": "Keyless public multi-book endpoint. Exits single-book plane.",
            "ngs": "Cookie-warmed session required (homepage GET seeds cookies to bypass soft 401).",
            "espn_injuries": "Keyless full roster injury feed.",
            "crons": "7 dark crons scheduled in vercel.json (refresh-wire at */10 * * * *).",
        },
        "sources": {},
    }

    # 1. Action Network Multi-Book
    an = fetch_action_network()
    if an and "games" in an:
        path = OUT_BASE / "action-network" / f"live_scoreboard_{stamp}.json"
        write_json(path, an)
        books: Set[int] = set()
        for g in an["games"]:
            for o in g.get("odds", []):
                bid = o.get("book_id")
                if bid is not None:
                    books.add(bid)
        book_list = sorted(books)
        # Verified 2026-10-13 against GET /web/v1/books `source_name`.
        # NOT 15=DraftKings / 68=Caesars — 15 is Consensus and 68 is DraftKings.
        LABELS = {15: "Consensus(synthetic)", 30: "Open(synthetic)", 68: "DraftKings",
                  69: "FanDuel", 71: "BetRivers", 74: "Parx", 75: "BetMGM", 79: "bet365"}
        labelled = ", ".join(f"{b}={LABELS.get(b, '?')}" for b in book_list)
        note = f"{len(an['games'])} games, books={book_list} ({labelled})"
        summary["sources"]["action_network"] = {
            "status": "ok",
            "games_count": len(an["games"]),
            "books": book_list,
            "path": str(path),
        }
        append_feed(f"Action Network multi-book: {note}", str(path), "market")
        log.info("Action Network: %s -> %s", note, path.name)
    else:
        summary["sources"]["action_network"] = {"status": "failed"}

    # 2. NGS Statboard (Rushing, Passing, Receiving)
    ngs_session = warm_ngs()
    for stat in ["rushing", "passing", "receiving"]:
        ngs = fetch_ngs(ngs_session, stat)
        if ngs and "stats" in ngs:
            path = OUT_BASE / "ngs" / f"live_{stat}_{stamp}.json"
            write_json(path, ngs)
            rows = len(ngs["stats"])
            top = ngs["stats"][0] if ngs["stats"] else {}
            if stat == "rushing":
                top_str = f"top={top.get('playerName')} RYOE={top.get('rushYardsOverExpected')} 8plus={top.get('percentAttemptsGteEightDefenders')}"
            elif stat == "passing":
                top_str = f"top={top.get('playerName')} passerRating={top.get('passerRating')} compPctOverExpected={top.get('completionPctOverExpected')}"
            else:
                top_str = f"top={top.get('playerName')} recYds={top.get('recYards')} avgSeparation={top.get('avgSeparation')}"
            note = f"NGS {stat}: {rows} rows | {top_str}"
            summary["sources"][f"ngs_{stat}"] = {
                "status": "ok",
                "rows_count": rows,
                "note": note,
                "path": str(path),
            }
            append_feed(f"NGS {stat} (cookie-warmed): {note}", str(path), "on_field")
            log.info("NGS: %s -> %s", note, path.name)
        else:
            summary["sources"][f"ngs_{stat}"] = {"status": "failed"}

    # 3. ESPN Injuries
    injuries = fetch_espn_injuries()
    if injuries:
        path = OUT_BASE / "injuries" / f"espn_injuries_{stamp}.json"
        write_json(path, injuries)
        team_count = len(injuries) if isinstance(injuries, list) else len(injuries.get("teams", injuries))
        summary["sources"]["espn_injuries"] = {
            "status": "ok",
            "teams_reported": team_count,
            "path": str(path),
        }
        append_feed(f"ESPN injuries live pull ({team_count} teams, keyless)", str(path), "physical")
        log.info("ESPN injuries: %d teams landed -> %s", team_count, path.name)
    else:
        summary["sources"]["espn_injuries"] = {"status": "failed"}

    # 4. Kalshi + Open-Meteo
    kalshi = fetch_kalshi_status()
    if kalshi:
        summary["sources"]["kalshi"] = {"status": "ok", "exchange_active": kalshi.get("exchange_active")}
        log.info("Kalshi exchange status: %s", kalshi.get("exchange_active"))

    weather = fetch_open_meteo()
    if weather:
        summary["sources"]["open_meteo"] = {"status": "ok", "elevation": weather.get("elevation")}
        log.info("Open-Meteo weather status: 200 OK")

    # 5. Emit Master Summary
    summary_path = OUT_BASE / f"live_summary_{stamp}.json"
    write_json(summary_path, summary)
    log.info("Live multi-source summary written to %s", summary_path)
    print(f"\n=== LIVE MULTI-SOURCE FETCH COMPLETE ===")
    print(f"Summary: {summary_path}")
    print(f"Trainer Feed Updated: {FEED_FILE}\n")


if __name__ == "__main__":
    main()
