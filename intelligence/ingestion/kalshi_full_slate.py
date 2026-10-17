"""Full-slate Kalshi two-sided book collector — event-driven, not feed-paged.

The /markets feed paginates 56 at a time and its order does not guarantee
full-slate coverage (verified: only 7 of our 14 week-6 games appeared in two
pages). The events endpoint lists all 28 open KXNFLGAME events; fetching
markets per event gives complete, correctly-attributed two-sided books.

Output schema is identical to kalshi_patterns.py rows, plus event_ticker and
a parsed away/home pair, so analyst.read_market's consumer logic is unchanged
in shape.
"""
from __future__ import annotations

import argparse
import json
import re
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
OUTROOT = REPO / "docs" / "data-sources" / "research"
BASE = "https://api.elections.kalshi.com/trade-api/v2"
UA = {"User-Agent": "GSE-kalshi-full-slate/1.0 (keyless public API)"}


def _get(url: str, timeout: int = 30) -> dict:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def open_events() -> list[str]:
    d = _get(f"{BASE}/events/?series_ticker=KXNFLGAME&status=open&limit=200")
    return [e["event_ticker"] for e in d.get("events") or []]


def markets_for_event(event_ticker: str) -> list[dict]:
    d = _get(f"{BASE}/markets?event_ticker={event_ticker}&status=open")
    return d.get("markets") or []


def parse_event_slug(event_ticker: str) -> tuple[str, str] | None:
    """KXNFLGAME-26OCT15SEADEN -> (SEA, DEN). Variable-length codes; split
    against the known 32-team list at both 3+3 and mixed widths."""
    m = re.match(r"KXNFLGAME-\d{2}[A-Z]{3}\d{2}([A-Z]{4,8})$", event_ticker)
    if not m:
        return None
    rest = m.group(1)
    TEAM_CODES = ["ARI","ATL","BAL","BUF","CAR","CHI","CIN","CLE","DAL","DEN","DET",
                  "GB","HOU","IND","JAC","KC","LAC","LAR","LV","MIA","MIN","NE","NO",
                  "NYG","NYJ","PHI","PIT","SEA","SF","TB","TEN","WAS"]
    # prefer 3+3, then try every split point
    for i in range(2, len(rest)):
        a, b = rest[:i], rest[i:]
        if a in TEAM_CODES and b in TEAM_CODES:
            return a, b
    return None


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--sleep", type=float, default=0.6)
    ap.add_argument("--no-write", action="store_true")
    args = ap.parse_args()

    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%SZ")
    now_iso = datetime.now(timezone.utc).isoformat()
    rows: list[dict] = []
    events = open_events()
    print(f"[full-slate] open KXNFLGAME events: {len(events)}")

    for i, ev in enumerate(events):
        try:
            ms = markets_for_event(ev)
        except Exception as exc:
            print(f"  {ev}: ERR {type(exc).__name__}: {exc}")
            continue
        pair = parse_event_slug(ev) or (None, None)
        for m in ms:
            try:
                yb = float(m.get("yes_bid_dollars"))
                ya = float(m.get("yes_ask_dollars"))
            except (TypeError, ValueError):
                continue
            rows.append({
                "event_ticker": ev,
                "away": pair[0], "home": pair[1],
                "ticker": m.get("ticker"),
                "title": m.get("title"),
                "yes_bid": yb, "yes_ask": ya,
                "mid": round((yb + ya) / 2, 4),
                "spread": round(ya - yb, 4),
                "status": m.get("status"),
                "close_time": m.get("close_time"),
            })
        print(f"  {ev} ({pair[0]}@{pair[1]}): {len(ms)} markets")
        if i + 1 < len(events):
            time.sleep(args.sleep)

    two_sided = [r for r in rows if 0 < r["yes_bid"] < 1 and 0 < r["yes_ask"] < 1]
    games = {r["event_ticker"] for r in rows}
    print(json.dumps({
        "events": len(events), "markets_total": len(rows),
        "two_sided": len(two_sided), "games": len(games),
    }, indent=1))

    if not args.no_write:
        outdir = OUTROOT / datetime.now(timezone.utc).date().isoformat() / "kalshi"
        outdir.mkdir(parents=True, exist_ok=True)
        p = outdir / f"kalshi_full_slate_{stamp}.json"
        p.write_text(json.dumps({
            "generated_utc": now_iso, "source": BASE + "/events + /markets",
            "method": "event-driven full sweep",
            "events": len(events), "rows": rows,
        }, indent=1), encoding="utf-8")
        print(f"landed: {p.name} ({p.stat().st_size} B)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
