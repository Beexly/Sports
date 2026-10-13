"""Kalshi NFL open-market ingest (2026-10-13).

Discovers game-level NFL series on Kalshi (public API, no auth for reads) and
lands a digest of their OPEN markets: prices are probabilities on a 0-100
scale, with bid/ask/volume, groupable by event_ticker.

Raw API base: https://api.elections.kalshi.com/trade-api/v2
"""

import json
import os
import urllib.parse
import urllib.request
from datetime import datetime, timezone

BASE = "https://api.elections.kalshi.com/trade-api/v2"
OUT_DIR = r"C:\Users\Garrett\Sports\docs\data-sources\research\2026-10-13\kalshi"
UA = {"User-Agent": "GSE-ingest-pilot/1.0 (Kalshi public read API)"}


def get(path: str, params: dict | None = None) -> dict:
    url = BASE + path + ("?" + urllib.parse.urlencode(params) if params else "")
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    now = datetime.now(timezone.utc).isoformat()

    series = get("/series/", {"category": "Sports"}).get("series", [])
    # game-level NFL series: ticker contains NFL and (GAME|WEEK|GAMEW|TOTAL|SPREAD|MWIN etc.)
    key_tokens = ("GAME", "WEEK", "SPREAD", "TOTAL", "MWIN", "WIN")
    candidates = [
        s for s in series
        if "NFL" in str(s.get("ticker", "")).upper()
        and any(tok in str(s.get("ticker", "")).upper() for tok in key_tokens)
    ]
    # prefer single-game style tickers first
    candidates.sort(key=lambda s: (0 if "GAME" in str(s.get("ticker", "")).upper() else 1, str(s.get("ticker"))))
    picked = candidates[:6]

    digest = {"generated_utc": now, "source": "Kalshi trade-api v2 (public reads)", "series": {}}
    md = ["# Kalshi NFL open markets digest (2026-10-13)", "", f"Generated {now} from api.elections.kalshi.com/trade-api/v2 (public, no auth).", "Prices are probabilities on a 0-100 scale.", ""]
    total = 0
    for s in picked:
        ticker = s.get("ticker")
        try:
            mk = get("/markets/", {"series_ticker": ticker, "status": "open", "limit": 200})
            markets = mk.get("markets", [])
        except Exception as e:
            digest["series"][ticker] = {"title": s.get("title"), "error": str(e)}
            md.append(f"## {ticker} - ERROR {e}")
            continue
        # Kalshi moved price fields to *_dollars strings (price_level_structure:
        # linear_cent). 0.51 dollars = 51% implied probability.
        rows = [
            {
                "ticker": m.get("ticker"),
                "event_ticker": m.get("event_ticker"),
                "title": m.get("title"),
                "yes_sub_title": m.get("yes_sub_title"),
                "yes_bid_dollars": m.get("yes_bid_dollars") or m.get("yes_bid"),
                "yes_ask_dollars": m.get("yes_ask_dollars") or m.get("yes_ask"),
                "last_price_dollars": m.get("last_price_dollars") or m.get("last_price"),
                "volume": m.get("volume_fp") or m.get("volume"),
                "open_interest": m.get("open_interest_fp") or m.get("open_interest"),
                "close_time": m.get("close_time"),
            }
            for m in markets
        ]
        total += len(rows)
        digest["series"][ticker] = {"title": s.get("title"), "open_markets": len(rows), "markets": rows}
        md.append(f"## {ticker} - {s.get('title')} ({len(rows)} open markets)")
        for r in rows[:15]:
            md.append(f"- {r['ticker']} | {r['yes_sub_title'] or r['title']} | last={r['last_price_dollars']} bid={r['yes_bid_dollars']} ask={r['yes_ask_dollars']} vol={r['volume']}")
        md.append("")
        print(f"{ticker}: {len(rows)} open markets")

    digest["total_open_markets"] = total
    with open(os.path.join(OUT_DIR, "kalshi-nfl-digest.json"), "w", encoding="utf-8") as f:
        json.dump(digest, f, indent=1)
    with open(os.path.join(OUT_DIR, "kalshi-nfl-digest.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(md) + "\n")
    print(f"TOTAL {total} open markets across {len(picked)} NFL series -> {OUT_DIR}")


if __name__ == "__main__":
    main()
