"""
Kalshi ingestion patterns (keyless public trade API).

Cursor pagination, open markets, price extraction.
Additive. Mirrors patterns useful from kalshi-scout style clients.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlencode
from urllib.request import Request, urlopen

OUTPUT = Path("artifacts/gse_integrations/kalshi")
OUTPUT.mkdir(parents=True, exist_ok=True)

BASE = "https://api.elections.kalshi.com/trade-api/v2"
UA = "Mozilla/5.0 (compatible; GSE-Kalshi/1.0)"


def _get(path: str, params: dict[str, Any] | None = None) -> tuple[int, Any]:
    url = BASE + path
    if params:
        url += "?" + urlencode({k: v for k, v in params.items() if v is not None})
    req = Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urlopen(req, timeout=20) as r:
        return r.status, json.loads(r.read().decode())


def fetch_markets(status: str = "open", limit: int = 100, max_pages: int = 3) -> list[dict[str, Any]]:
    """Cursor-paginated open markets."""
    all_markets: list[dict[str, Any]] = []
    cursor = None
    for _ in range(max_pages):
        params = {"status": status, "limit": limit}
        if cursor:
            params["cursor"] = cursor
        code, data = _get("/markets", params)
        if code != 200 or not isinstance(data, dict):
            break
        batch = data.get("markets", [])
        all_markets.extend(batch)
        cursor = data.get("cursor")
        if not cursor or not batch:
            break
    meta = {
        "source": "kalshi",
        "status": "ok",
        "markets": len(all_markets),
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "honesty": "public trade-api v2, no key",
    }
    path = OUTPUT / f"markets_{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}.json"
    path.write_text(json.dumps({"meta": meta, "markets": all_markets}, indent=2))
    return all_markets


def extract_prices(markets: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Pull yes/no dollar prices when present."""
    out = []
    for m in markets:
        out.append({
            "ticker": m.get("ticker"),
            "title": m.get("title"),
            "yes_bid": m.get("yes_bid_dollars") or m.get("yes_bid"),
            "yes_ask": m.get("yes_ask_dollars") or m.get("yes_ask"),
            "no_bid": m.get("no_bid_dollars") or m.get("no_bid"),
            "volume": m.get("volume"),
            "status": m.get("status"),
        })
    return out


if __name__ == "__main__":
    mkts = fetch_markets(limit=50, max_pages=2)
    print(f"markets={len(mkts)}")
    prices = extract_prices(mkts[:5])
    print(json.dumps(prices, indent=2))
