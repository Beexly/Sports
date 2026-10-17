"""Kalshi public-market patterns: cursor-paginated open markets + price extraction.

Fulfils the external agent's kalshi_patterns.py spec. Keyless public trade API:
  GET https://api.elections.kalshi.com/trade-api/v2/markets?status=open&limit=...&cursor=...

Rate-limit discipline (the agent hit HTTP 429): default 2 requests with
`--max-pages`; every request sleeps `--sleep` (default 1.5 s) after the
response; on 429 the module backs off 15 s once, then fails honestly rather
than hammering. Prices: yes_bid_dollars / yes_ask_dollars are dollars
(0..1 scale per Kalshi v2 convention) — kept as-is, no /100 guessing.

Lands timestamped evidence under docs/data-sources/research/<date>/kalshi/.
"""

from __future__ import annotations

import argparse
import json
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
OUTROOT = REPO / "docs" / "data-sources" / "research"
BASE = "https://api.elections.kalshi.com/trade-api/v2/markets"
UA = {"User-Agent": "GSE-kalshi-patterns/1.0 (keyless public API)"}


def _get(url: str, timeout: int = 30) -> dict:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _get_with_backoff(url: str, backoff_s: float) -> dict:
    try:
        return _get(url)
    except urllib.error.HTTPError as exc:
        if exc.code == 429:
            print(f"[kalshi] 429 rate-limited; backing off {backoff_s:.0f}s once, then failing honestly")
            time.sleep(backoff_s)
            return _get(url)  # second 429 propagates — no hammering
        raise


def fetch_open_markets(max_pages: int = 2, page_size: int = 200,
                       sleep_s: float = 1.5, backoff_s: float = 15.0,
                       series_ticker: str | None = "KXNFLGAME") -> tuple[list[dict], str | None, list[dict]]:
    """Returns (markets, final_cursor, raw_pages). Sleeps between pages.

    series_ticker defaults to KXNFLGAME: the unfiltered /markets feed returns
    thousands of KXMVECROSSCATEGORY rows with 0.0000/1.0000 placeholder quotes
    (verified 2026-10-14: 1,000 markets, only 22 with any nonzero price, all
    placeholder-shaped). Scoping to the NFL game series yields live two-sided
    books (yes_bid 0.51 / yes_ask 0.52 on the first row).
    """
    markets: list[dict] = []
    raw_pages: list[dict] = []
    cursor: str | None = None
    for page in range(max_pages):
        url = (f"{BASE}?status=open&limit={page_size}"
               + (f"&series_ticker={series_ticker}" if series_ticker else "")
               + (f"&cursor={cursor}" if cursor else ""))
        d = _get_with_backoff(url, backoff_s)
        batch = d.get("markets") or []
        markets.extend(batch)
        raw_pages.append({"page": page + 1, "count": len(batch),
                          "cursor_in": cursor, "cursor_out": d.get("cursor"),
                          "series_ticker": series_ticker})
        cursor = d.get("cursor")
        print(f"[kalshi] page {page + 1}/{max_pages}: +{len(batch)} markets (total {len(markets)})")
        if not cursor or not batch:
            break
        if page + 1 < max_pages:
            time.sleep(sleep_s)
    return markets, cursor, raw_pages


def price_rows(markets: dict | list) -> list[dict]:
    """Extract (ticker, yes_bid, yes_ask, mid) for two-sided markets.

    Kalshi v2 returns *_dollars as STRINGS ('0.5100'), not numbers —
    verified 2026-10-14. Coerce; skip rows that do not parse.
    """
    if isinstance(markets, dict):
        markets = markets.get("markets") or []
    rows: list[dict] = []

    def _f(v) -> float | None:
        try:
            return float(v)
        except (TypeError, ValueError):
            return None

    for m in markets:
        yb, ya = _f(m.get("yes_bid_dollars")), _f(m.get("yes_ask_dollars"))
        if yb is None or ya is None:
            continue
        rows.append({
            "ticker": m.get("ticker"),
            "title": m.get("title"),
            "yes_bid": yb,
            "yes_ask": ya,
            "mid": round((yb + ya) / 2, 4),
            "spread": round(ya - yb, 4),
            "status": m.get("status"),
            "close_time": m.get("close_time"),
        })
    return rows


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--max-pages", type=int, default=2, help="keep small unless you need depth (429 risk)")
    ap.add_argument("--page-size", type=int, default=200, help="Kalshi max is 1000")
    ap.add_argument("--series", default="KXNFLGAME",
                    help="series_ticker filter. Empty string = unfiltered (mostly placeholder quotes)")
    ap.add_argument("--sleep", type=float, default=1.5, help="seconds between pages")
    ap.add_argument("--no-write", action="store_true")
    args = ap.parse_args()

    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%SZ")
    now_iso = datetime.now(timezone.utc).isoformat()

    markets, cursor, raw_pages = fetch_open_markets(args.max_pages, args.page_size,
                                                    args.sleep, series_ticker=args.series or None)
    rows = price_rows(markets)
    two_sided = [r for r in rows if r["yes_bid"] > 0 and r["yes_ask"] < 1]

    summary = {
        "generated_utc": now_iso,
        "source": BASE,
        "pages_fetched": len(raw_pages),
        "final_cursor": cursor,
        "markets_total": len(markets),
        "with_two_sided_prices": len(two_sided),
        "mid_spread_mean": (round(sum(r["spread"] for r in two_sided) / len(two_sided), 4)
                            if two_sided else None),
    }
    print(json.dumps(summary, indent=1))
    if rows:
        print("sample:", json.dumps(rows[:3], indent=1)[:600])

    if not args.no_write:
        outdir = OUTROOT / datetime.now(timezone.utc).date().isoformat() / "kalshi"
        outdir.mkdir(parents=True, exist_ok=True)
        p = outdir / f"kalshi_open_markets_{stamp}.json"
        p.write_text(json.dumps({"generated_utc": now_iso, "source": BASE,
                                 "summary": summary, "rows": rows,
                                 "raw_pages": raw_pages}, indent=1), encoding="utf-8")
        print(f"landed: {p.name} ({p.stat().st_size} B) -> {outdir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
