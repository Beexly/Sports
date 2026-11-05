#!/usr/bin/env python3
"""Fetch the complete live DraftKings prop board for TNF JAX @ BAL (2026-11-05).

Provider 100 (DraftKings) via ESPN Core API. Pages until pageCount, keeps every
market type, resolves athlete names/positions/teams, and writes one canonical
snapshot. No market filtering: the 360 review needs 100% of the board.
"""
from __future__ import annotations

import concurrent.futures as cf
import json
import time
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EVENT_ID = "401873037"
OUT = ROOT / "data" / "engine" / "tnf_jax_bal_dk_full_board_2026_11_05.json"
BASE = "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl"


def get(url: str, timeout: int = 20, attempts: int = 3):
    url = url.replace("http://", "https://")
    last = ""
    for i in range(attempts):
        proc = subprocess.run(
            ["curl", "-sS", "--max-time", str(timeout), url],
            capture_output=True, text=True, encoding="utf-8", errors="replace",
        )
        if proc.returncode == 0 and proc.stdout.strip().startswith(("{", "[")):
            try:
                return json.loads(proc.stdout)
            except json.JSONDecodeError as exc:
                last = str(exc)
        else:
            last = (proc.stderr or proc.stdout)[:200]
        time.sleep(0.5 * (i + 1))
    raise RuntimeError(f"fetch failed: {url} :: {last}")


def fetch_pages() -> list[dict]:
    first = get(f"{BASE}/events/{EVENT_ID}/competitions/{EVENT_ID}/odds/100/propBets?limit=1000&page=1")
    pages = int(first.get("pageCount", 1))
    items = list(first.get("items", []))
    print(f"page 1/{pages}: {len(items)} items")
    for p in range(2, pages + 1):
        d = get(f"{BASE}/events/{EVENT_ID}/competitions/{EVENT_ID}/odds/100/propBets?limit=1000&page={p}")
        items.extend(d.get("items", []))
        print(f"page {p}/{pages}: {len(d.get('items', []))} items")
        time.sleep(0.2)
    return items


def resolve(ref_url: str) -> dict:
    try:
        d = get(ref_url, timeout=15)
        team_ref = (d.get("team") or {}).get("$ref", "")
        team_id = team_ref.rstrip("/").split("/")[-1].split("?")[0] if team_ref else ""
        return {
            "id": str(d.get("id", "")),
            "name": d.get("fullName") or d.get("displayName") or "Unknown",
            "position": ((d.get("position") or {}).get("abbreviation") or ""),
            "team_id": team_id,
        }
    except Exception as exc:  # noqa: BLE001
        return {"id": "", "name": "Unknown", "position": "", "team_id": "", "error": str(exc)[:80]}


def main() -> dict:
    summary = get(f"https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event={EVENT_ID}")
    comp = summary["header"]["competitions"][0]
    teams = {c["team"]["id"]: c["team"]["abbreviation"] for c in comp["competitors"]}
    event = {
        "event_id": EVENT_ID,
        "matchup": comp.get("shortName") or "JAX @ BAL",
        "kickoff_utc": comp.get("date"),
        "teams": teams,
    }
    pickcenter = (summary.get("pickcenter") or [{}])[0]
    game_lines = {
        "provider": (pickcenter.get("provider") or {}).get("name"),
        "details": pickcenter.get("details"),
        "spread": pickcenter.get("spread"),
        "over_under": pickcenter.get("overUnder"),
        "over_odds": pickcenter.get("overOdds"),
        "under_odds": pickcenter.get("underOdds"),
        "away_ml": (pickcenter.get("awayTeamOdds") or {}).get("moneyLine"),
        "home_ml": (pickcenter.get("homeTeamOdds") or {}).get("moneyLine"),
        "away_spread_odds": (pickcenter.get("awayTeamOdds") or {}).get("spreadOdds"),
        "home_spread_odds": (pickcenter.get("homeTeamOdds") or {}).get("spreadOdds"),
    }

    items = fetch_pages()
    refs = sorted({(i.get("athlete") or {}).get("$ref") for i in items if (i.get("athlete") or {}).get("$ref")})
    print(f"unique athletes: {len(refs)}")
    people: dict[str, dict] = {}
    with cf.ThreadPoolExecutor(max_workers=8) as pool:
        futs = {pool.submit(resolve, r): r for r in refs}
        for f in cf.as_completed(futs):
            people[futs[f]] = f.result()

    props = []
    market_counts: dict[str, int] = {}
    for it in items:
        ref = (it.get("athlete") or {}).get("$ref", "")
        person = people.get(ref, {})
        market = (it.get("type") or {}).get("name") or "Unknown"
        cur = ((it.get("current") or {}).get("target") or {}).get("value")
        opn = ((it.get("open") or {}).get("target") or {}).get("value")
        market_counts[market] = market_counts.get(market, 0) + 1
        props.append({
            "market": market,
            "athlete": person.get("name", "Unknown"),
            "position": person.get("position", ""),
            "team": teams.get(person.get("team_id", ""), ""),
            "line": cur,
            "open_line": opn,
            "last_updated": it.get("lastUpdated"),
            "has_price": False,
        })

    payload = {
        "schema": "tnf_full_board_v1",
        "event": event,
        "game_lines": game_lines,
        "fetched_at_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_props": len(props),
        "market_type_count": len(market_counts),
        "market_counts": dict(sorted(market_counts.items(), key=lambda kv: -kv[1])),
        "props": props,
        "price_note": "ESPN Core propBets exposes target lines only; no two-sided prices are published, so prop de-vig is impossible from this source.",
    }
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"saved {len(props)} props across {len(market_counts)} market types -> {OUT}")
    return payload


if __name__ == "__main__":
    main()
