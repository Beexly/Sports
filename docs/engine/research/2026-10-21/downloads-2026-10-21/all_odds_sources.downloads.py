#!/usr/bin/env python3
"""
Hyper-intelligent multi-source odds and markets fetcher.

Covers keyless sources and free-tier aggregators discussed for the GSE plane:
- SX Bet (keyless, markets + props)
- Action Network (keyless, multi-book game lines)
- Kalshi public (keyless, prediction markets)
- Pinnacle guest (keyless, sharp reference)
- Odds-API.io public discovery (keyless)
- PuntersEdge demo (keyless, Australian racing)
- PropLine (free tier, props + DFS)
- The Odds API (free tier, US books + DFS)
- TheRundown (free tier, DK/FD/BetMGM)

Additive timestamped outputs. Honesty notes on every source.
Retries with backoff. Optional free-tier keys via environment variables.
"""

from __future__ import annotations

import gzip
import json
import os
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

OUTPUT_DIR = Path("artifacts/live_fetch")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"
)

# Free-tier keys (optional). Leave blank to skip those sources.
PROPLINE_KEY = os.environ.get("PROPLINE_API_KEY", "")
ODDS_API_KEY = os.environ.get("ODDS_API_KEY", "")
THERUNDOWN_KEY = os.environ.get("THERUNDOWN_API_KEY", "")
ODDS_API_IO_KEY = os.environ.get("ODDS_API_IO_KEY", "")


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------

def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%SZ")


def _get(
    url: str,
    headers: dict[str, str] | None = None,
    timeout: int = 20,
    retries: int = 2,
) -> tuple[int, Any | None, str]:
    """Return (status, parsed_json_or_none, honesty_note)."""
    hdrs = {"User-Agent": USER_AGENT, "Accept": "application/json"}
    if headers:
        hdrs.update(headers)

    last_note = "ok"
    for attempt in range(retries + 1):
        try:
            req = Request(url, headers=hdrs)
            with urlopen(req, timeout=timeout) as resp:
                status = resp.status
                raw = resp.read()
                # Handle gzip if present
                if resp.headers.get("Content-Encoding") == "gzip" or raw[:2] == b"\x1f\x8b":
                    raw = gzip.decompress(raw)
                body = raw.decode("utf-8", errors="replace")
                try:
                    data = json.loads(body)
                except json.JSONDecodeError:
                    data = {"raw": body[:2000]}
                return status, data, "ok"
        except HTTPError as e:
            last_note = f"http_{e.code}"
            if e.code in (429, 503) and attempt < retries:
                time.sleep(1.5 * (attempt + 1))
                continue
            return e.code, None, last_note
        except URLError as e:
            last_note = f"url_error:{e.reason}"
            if attempt < retries:
                time.sleep(1.0)
                continue
            return 0, None, last_note
        except Exception as e:  # noqa: BLE001
            last_note = f"error:{type(e).__name__}"
            return 0, None, last_note
    return 0, None, last_note


def _save(name: str, payload: dict[str, Any]) -> Path:
    ts = _now_iso()
    path = OUTPUT_DIR / f"{name}_{ts}.json"
    path.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")
    return path


# ---------------------------------------------------------------------------
# Source fetchers
# ---------------------------------------------------------------------------

@dataclass
class SourceResult:
    name: str
    status: int
    honesty: str
    rows: int
    path: Path | None
    extra: dict[str, Any] = field(default_factory=dict)


def fetch_sx_bet() -> SourceResult:
    """Keyless. Live markets including player props (type 995 = Anytime TD)."""
    url = "https://api.sx.bet/markets/active?sportIds=3"
    status, data, note = _get(url)
    rows = 0
    if isinstance(data, dict):
        markets = data.get("data", {}).get("markets", [])
        rows = len(markets) if isinstance(markets, list) else 0
    payload = {
        "source": "sx_bet",
        "url": url,
        "status": status,
        "honesty": note,
        "rows": rows,
        "data": data,
    }
    path = _save("sx_bet", payload)
    return SourceResult("sx_bet", status, note, rows, path)


def fetch_action_network(league: str = "nfl") -> SourceResult:
    """Keyless multi-book scoreboard (Caesars, DK, FD, BetMGM, etc.)."""
    url = f"https://api.actionnetwork.com/web/v1/scoreboard/{league}"
    status, data, note = _get(url)
    rows = 0
    if isinstance(data, dict):
        games = data.get("games", [])
        rows = len(games) if isinstance(games, list) else 0
    payload = {
        "source": "action_network",
        "url": url,
        "status": status,
        "honesty": note,
        "rows": rows,
        "data": data,
    }
    path = _save(f"action_network_{league}", payload)
    return SourceResult(f"action_network_{league}", status, note, rows, path)


def fetch_kalshi(limit: int = 100) -> SourceResult:
    """Keyless prediction markets. Cursor pagination available."""
    url = f"https://api.elections.kalshi.com/trade-api/v2/markets?limit={limit}&status=open"
    status, data, note = _get(url)
    rows = 0
    if isinstance(data, dict):
        markets = data.get("markets", [])
        rows = len(markets) if isinstance(markets, list) else 0
    payload = {
        "source": "kalshi",
        "url": url,
        "status": status,
        "honesty": note,
        "rows": rows,
        "data": data,
    }
    path = _save("kalshi", payload)
    return SourceResult("kalshi", status, note, rows, path)


def fetch_pinnacle_guest() -> SourceResult:
    """Keyless sharp reference (NFL sport id 12)."""
    url = "https://guest.api.arcadia.pinnacle.com/0.1/sports/12/markets/straight"
    status, data, note = _get(url)
    rows = 0
    if isinstance(data, dict):
        # Structure varies; count top-level keys or events if present
        rows = len(data) if data else 0
    payload = {
        "source": "pinnacle_guest",
        "url": url,
        "status": status,
        "honesty": note,
        "rows": rows,
        "data": data,
    }
    path = _save("pinnacle_guest", payload)
    return SourceResult("pinnacle_guest", status, note, rows, path)


def fetch_odds_api_io_discovery() -> SourceResult:
    """Keyless discovery: list of sports and bookmakers. Odds require a key."""
    sports_url = "https://api.odds-api.io/v3/sports"
    books_url = "https://api.odds-api.io/v3/bookmakers"
    s_status, s_data, s_note = _get(sports_url)
    b_status, b_data, b_note = _get(books_url)
    sports_count = len(s_data) if isinstance(s_data, list) else 0
    books_count = len(b_data) if isinstance(b_data, list) else 0
    payload = {
        "source": "odds_api_io_discovery",
        "sports_status": s_status,
        "books_status": b_status,
        "honesty": f"sports:{s_note};books:{b_note}",
        "sports_count": sports_count,
        "books_count": books_count,
        "sports": s_data,
        "bookmakers": b_data,
    }
    path = _save("odds_api_io_discovery", payload)
    return SourceResult(
        "odds_api_io_discovery",
        s_status if s_status else b_status,
        payload["honesty"],
        sports_count + books_count,
        path,
        {"sports": sports_count, "books": books_count},
    )


def fetch_puntersedge_demo() -> SourceResult:
    """Keyless Australian racing demo."""
    url = "https://puntersedge.online/api/v1/demo/racing/next-to-go"
    status, data, note = _get(url)
    rows = 0
    if isinstance(data, dict):
        # Best-effort count
        rows = len(data.get("races", data.get("data", []))) if isinstance(data, dict) else 0
    payload = {
        "source": "puntersedge_demo",
        "url": url,
        "status": status,
        "honesty": note,
        "rows": rows,
        "data": data,
    }
    path = _save("puntersedge_demo", payload)
    return SourceResult("puntersedge_demo", status, note, rows, path)


def fetch_propline_props() -> SourceResult:
    """Free tier (1,000 req/day). Props + DFS. Requires PROPLINE_API_KEY."""
    if not PROPLINE_KEY:
        return SourceResult("propline", 0, "skipped_no_key", 0, None)
    # Example: NFL events then props. Adjust endpoint as needed.
    url = (
        "https://api.prop-line.com/v1/sports/football_nfl/odds"
        f"?apiKey={PROPLINE_KEY}&markets=h2h,spreads,totals"
    )
    status, data, note = _get(url)
    rows = 0
    if isinstance(data, list):
        rows = len(data)
    elif isinstance(data, dict):
        rows = len(data.get("events", data.get("data", [])))
    payload = {
        "source": "propline",
        "url": url.split("?")[0],
        "status": status,
        "honesty": note,
        "rows": rows,
        "data": data,
    }
    path = _save("propline", payload)
    return SourceResult("propline", status, note, rows, path)


def fetch_odds_api_us() -> SourceResult:
    """Free tier. US books + optional DFS. Requires ODDS_API_KEY."""
    if not ODDS_API_KEY:
        return SourceResult("odds_api_us", 0, "skipped_no_key", 0, None)
    url = (
        "https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds"
        f"?regions=us&markets=h2h,spreads,totals"
        f"&bookmakers=draftkings,betonlineag,fanduel,betmgm"
        f"&apiKey={ODDS_API_KEY}"
    )
    status, data, note = _get(url)
    rows = len(data) if isinstance(data, list) else 0
    payload = {
        "source": "odds_api_us",
        "url": url.split("?")[0],
        "status": status,
        "honesty": note,
        "rows": rows,
        "data": data,
    }
    path = _save("odds_api_us", payload)
    return SourceResult("odds_api_us", status, note, rows, path)


def fetch_therundown_free() -> SourceResult:
    """Free tier. DraftKings / FanDuel / BetMGM. Requires THERUNDOWN_API_KEY."""
    if not THERUNDOWN_KEY:
        return SourceResult("therundown", 0, "skipped_no_key", 0, None)
    # Sport 2 = NFL. Affiliate 19=DK, 22=BetMGM, 23=FD.
    date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    url = (
        f"https://therundown.io/api/v2/sports/2/events/{date}"
        "?market_ids=1,2,3&affiliate_ids=19,22,23&main_line=true"
    )
    status, data, note = _get(url, headers={"X-TheRundown-Key": THERUNDOWN_KEY})
    rows = 0
    if isinstance(data, dict):
        events = data.get("events", [])
        rows = len(events) if isinstance(events, list) else 0
    payload = {
        "source": "therundown",
        "url": url,
        "status": status,
        "honesty": note,
        "rows": rows,
        "data": data,
    }
    path = _save("therundown", payload)
    return SourceResult("therundown", status, note, rows, path)


def fetch_odds_api_io_odds() -> SourceResult:
    """Optional. Odds from Odds-API.io if key present."""
    if not ODDS_API_IO_KEY:
        return SourceResult("odds_api_io_odds", 0, "skipped_no_key", 0, None)
    url = (
        "https://api.odds-api.io/v3/odds"
        f"?apiKey={ODDS_API_IO_KEY}&sport=football&bookmakers=DraftKings"
    )
    status, data, note = _get(url)
    rows = len(data) if isinstance(data, list) else 0
    payload = {
        "source": "odds_api_io_odds",
        "url": url.split("?")[0],
        "status": status,
        "honesty": note,
        "rows": rows,
        "data": data,
    }
    path = _save("odds_api_io_odds", payload)
    return SourceResult("odds_api_io_odds", status, note, rows, path)


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------

SOURCES: list[Callable[[], SourceResult]] = [
    fetch_sx_bet,
    lambda: fetch_action_network("nfl"),
    fetch_kalshi,
    fetch_pinnacle_guest,
    fetch_odds_api_io_discovery,
    fetch_puntersedge_demo,
    fetch_propline_props,
    fetch_odds_api_us,
    fetch_therundown_free,
    fetch_odds_api_io_odds,
]


def run_all() -> dict[str, Any]:
    """Fetch every source. Additive. Honesty-noted."""
    results: list[SourceResult] = []
    for fn in SOURCES:
        try:
            results.append(fn())
        except Exception as e:  # noqa: BLE001
            results.append(
                SourceResult(
                    name=getattr(fn, "__name__", "unknown"),
                    status=0,
                    honesty=f"exception:{type(e).__name__}",
                    rows=0,
                    path=None,
                )
            )

    summary = {
        "run_at": _now_iso(),
        "sources": [
            {
                "name": r.name,
                "status": r.status,
                "honesty": r.honesty,
                "rows": r.rows,
                "path": str(r.path) if r.path else None,
                **r.extra,
            }
            for r in results
        ],
        "total_rows": sum(r.rows for r in results),
        "successful": sum(1 for r in results if r.status == 200),
        "skipped_no_key": sum(1 for r in results if r.honesty == "skipped_no_key"),
    }
    summary_path = _save("ALL_SOURCES_SUMMARY", summary)
    summary["summary_path"] = str(summary_path)
    return summary


if __name__ == "__main__":
    result = run_all()
    print(json.dumps(result, indent=2))
