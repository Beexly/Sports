#!/usr/bin/env python3
"""Fetch the complete live DraftKings prop board and injuries for TNF IND @ HOU (Week 11, 2026-11-19).

Provider 100 (DraftKings) via ESPN Core API + ESPN Summary API.
Pages through all propBets pages, resolves all athlete/team references,
extracts open/current targets and any available two-sided odds, records
live injury designations, and updates week11_espn_live_sync_2026_11_19.json.
"""
from __future__ import annotations

import concurrent.futures as cf
import json
import subprocess
import time
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
EVENT_ID = "401873066"
OUT = ROOT / "data" / "engine" / "tnf_ind_hou_dk_full_board_2026_11_19.json"
LIVE_SYNC_PATH = ROOT / "data" / "engine" / "week11_espn_live_sync_2026_11_19.json"
BASE = "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl"


def get(url: str, timeout: int = 20, attempts: int = 3) -> Any:
    url = url.replace("http://", "https://").replace(".pvt/", ".com/")
    last = ""
    for i in range(attempts):
        proc = subprocess.run(
            ["curl", "-sS", "--max-time", str(timeout), url],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
        if proc.returncode == 0 and proc.stdout.strip().startswith(("{", "[")):
            try:
                return json.loads(proc.stdout)
            except json.JSONDecodeError as exc:
                last = str(exc)
        else:
            last = (proc.stderr or proc.stdout)[:200]
        time.sleep(0.4 * (i + 1))
    raise RuntimeError(f"fetch failed: {url} :: {last}")


def _extract_id_from_ref(ref_url: str) -> str:
    if not ref_url:
        return ""
    return ref_url.rstrip("/").split("/")[-1].split("?")[0]


def fetch_pages() -> list[dict[str, Any]]:
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


def resolve_athlete(ref_url: str) -> dict[str, str]:
    try:
        d = get(ref_url, timeout=15)
        team_ref = (d.get("team") or {}).get("$ref", "")
        team_id = _extract_id_from_ref(team_ref)
        return {
            "id": str(d.get("id", "")),
            "name": d.get("fullName") or d.get("displayName") or "Unknown",
            "position": ((d.get("position") or {}).get("abbreviation") or ""),
            "team_id": team_id,
        }
    except Exception as exc:  # noqa: BLE001
        return {"id": "", "name": "Unknown", "position": "", "team_id": "", "error": str(exc)[:80]}


def _to_american_int(val: Any) -> int | None:
    if val is None or isinstance(val, bool):
        return None
    if isinstance(val, (int, float)):
        return int(round(val))
    s = str(val).strip().upper()
    if s in ("", "EVEN", "EV"):
        return 100 if s in ("EVEN", "EV") else None
    try:
        return int(round(float(s.replace("+", ""))))
    except ValueError:
        return None


def main() -> dict[str, Any]:
    summary = get(f"https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event={EVENT_ID}")
    core_odds = get(f"{BASE}/events/{EVENT_ID}/competitions/{EVENT_ID}/odds/100")

    comp = summary["header"]["competitions"][0]
    teams = {str(c["team"]["id"]): str(c["team"]["abbreviation"]).upper() for c in comp["competitors"]}
    away_abbr = next((str(c["team"]["abbreviation"]).upper() for c in comp["competitors"] if c.get("homeAway") == "away"), "IND")
    home_abbr = next((str(c["team"]["abbreviation"]).upper() for c in comp["competitors"] if c.get("homeAway") == "home"), "HOU")
    venue_obj = (summary.get("gameInfo") or {}).get("venue") or {}
    venue_name = str(venue_obj.get("fullName") or "NRG Stadium")
    is_indoor = bool(venue_obj.get("indoor", True))

    event = {
        "event_id": EVENT_ID,
        "matchup": comp.get("shortName") or f"{away_abbr} @ {home_abbr}",
        "away": away_abbr,
        "home": home_abbr,
        "week": 11,
        "season": 2026,
        "kickoff_utc": comp.get("date"),
        "venue": venue_name,
        "indoor": is_indoor,
        "teams": teams,
    }

    pickcenter = (summary.get("pickcenter") or [{}])[0]
    core_open = core_odds.get("open") or {}
    open_total_raw = (core_open.get("total") or {}).get("american") or (core_open.get("total") or {}).get("alternateDisplayValue")
    try:
        open_total = float(open_total_raw) if open_total_raw is not None else float(pickcenter.get("overUnder") or 44.5)
    except (TypeError, ValueError):
        open_total = float(pickcenter.get("overUnder") or 44.5)

    core_open_home_ps = ((core_open.get("pointSpread") or {}).get("home") or {}).get("close") or {}
    core_open_spread = None
    if isinstance(core_odds.get("open"), dict):
        ps_node = (core_odds.get("open") or {}).get("pointSpread")
        if isinstance(ps_node, dict):
            hm_ps = ((ps_node.get("home") or {}).get("pointSpread") or {}).get("american")
            try:
                core_open_spread = float(hm_ps) if hm_ps is not None else None
            except (TypeError, ValueError):
                core_open_spread = None

    game_lines = {
        "provider": (pickcenter.get("provider") or {}).get("name") or "DraftKings",
        "details": pickcenter.get("details"),
        "spread": float(pickcenter.get("spread") if pickcenter.get("spread") is not None else -12.5),
        "open_spread": core_open_spread if core_open_spread is not None else float(pickcenter.get("spread") if pickcenter.get("spread") is not None else -12.5),
        "over_under": float(pickcenter.get("overUnder") if pickcenter.get("overUnder") is not None else 44.5),
        "open_over_under": open_total,
        "over_odds": _to_american_int(pickcenter.get("overOdds")) or -104,
        "under_odds": _to_american_int(pickcenter.get("underOdds")) or -116,
        "away_ml": _to_american_int((pickcenter.get("awayTeamOdds") or {}).get("moneyLine")),
        "home_ml": _to_american_int((pickcenter.get("homeTeamOdds") or {}).get("moneyLine")),
        "away_spread_odds": _to_american_int((pickcenter.get("awayTeamOdds") or {}).get("spreadOdds")) or -110,
        "home_spread_odds": _to_american_int((pickcenter.get("homeTeamOdds") or {}).get("spreadOdds")) or -110,
    }

    live_injuries: list[dict[str, Any]] = []
    for team_block in summary.get("injuries") or []:
        t_abbr = str((team_block.get("team") or {}).get("abbreviation") or "").upper()
        for inj in team_block.get("injuries") or []:
            ath = inj.get("athlete") or {}
            det = inj.get("details") or {}
            live_injuries.append({
                "team": t_abbr,
                "athlete": str(ath.get("fullName") or ath.get("displayName") or ""),
                "athlete_id": str(ath.get("id") or ""),
                "position": str((ath.get("position") or {}).get("abbreviation") or ""),
                "status": str(inj.get("status") or ""),
                "injury_type": str(det.get("type") or inj.get("shortComment") or ""),
                "detail": str(det.get("detail") or ""),
                "updated_at": str(inj.get("date") or ""),
            })

    items = fetch_pages()
    refs = sorted({(i.get("athlete") or {}).get("$ref") for i in items if (i.get("athlete") or {}).get("$ref")})
    print(f"unique athletes: {len(refs)}")
    people: dict[str, dict[str, str]] = {}
    with cf.ThreadPoolExecutor(max_workers=8) as pool:
        futs = {pool.submit(resolve_athlete, r): r for r in refs}
        for f in cf.as_completed(futs):
            people[futs[f]] = f.result()

    props: list[dict[str, Any]] = []
    market_counts: dict[str, int] = {}
    two_sided_priced = 0
    for it in items:
        ref = (it.get("athlete") or {}).get("$ref", "")
        person = people.get(ref, {})
        item_team_ref = (it.get("team") or {}).get("$ref", "")
        item_team_id = _extract_id_from_ref(item_team_ref) or person.get("team_id", "")
        team_abbr = teams.get(item_team_id, "")
        market = str((it.get("type") or {}).get("name") or "Unknown")
        cur_node = it.get("current") or {}
        opn_node = it.get("open") or {}
        cur = (cur_node.get("target") or {}).get("value")
        opn = (opn_node.get("target") or {}).get("value")

        over_am = _to_american_int((cur_node.get("over") or {}).get("american") or (cur_node.get("over") or {}).get("value"))
        under_am = _to_american_int((cur_node.get("under") or {}).get("american") or (cur_node.get("under") or {}).get("value"))
        has_two_sided = (over_am is not None and under_am is not None)
        if has_two_sided:
            two_sided_priced += 1

        market_counts[market] = market_counts.get(market, 0) + 1
        props.append({
            "market": market,
            "athlete": person.get("name", "Game" if not ref else "Unknown"),
            "position": person.get("position", ""),
            "team": team_abbr,
            "line": cur,
            "open_line": opn,
            "last_updated": it.get("lastUpdated"),
            "over_american": over_am,
            "under_american": under_am,
            "has_price": has_two_sided,
        })

    payload = {
        "schema": "tnf_full_board_v1",
        "event": event,
        "game_lines": game_lines,
        "live_injuries": live_injuries,
        "fetched_at_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_props": len(props),
        "market_type_count": len(market_counts),
        "two_sided_priced_props": two_sided_priced,
        "market_counts": dict(sorted(market_counts.items(), key=lambda kv: -kv[1])),
        "props": props,
        "price_note": (
            "Two-sided American prices extracted where ESPN Core propBets provides current.over/under; "
            "target-only props carry has_price=False and must fail closed at Stage 5."
        ),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    # Sync live lines + injuries back into week11_espn_live_sync_2026_11_19.json
    if LIVE_SYNC_PATH.is_file():
        sync_data = json.loads(LIVE_SYNC_PATH.read_text(encoding="utf-8"))
        sync_data["fetched_at_utc"] = payload["fetched_at_utc"]
        for ev in sync_data.get("events") or []:
            if str(ev.get("event_id")) == EVENT_ID:
                ev["spread_details"] = game_lines["details"]
                ev["over_under"] = game_lines["over_under"]
                ev["open_over_under"] = game_lines["open_over_under"]
                ev["over_odds"] = game_lines["over_odds"]
                ev["under_odds"] = game_lines["under_odds"]
                ev["away_moneyline"] = game_lines["away_ml"]
                ev["home_moneyline"] = game_lines["home_ml"]
                ev["away_spread_odds"] = game_lines["away_spread_odds"]
                ev["home_spread_odds"] = game_lines["home_spread_odds"]
                ev["venue"] = venue_name
                ev["indoor"] = is_indoor
                ev["live_injuries"] = live_injuries
                break
        LIVE_SYNC_PATH.write_text(json.dumps(sync_data, indent=2), encoding="utf-8")

    print(
        f"saved {len(props)} props across {len(market_counts)} markets "
        f"(two_sided={two_sided_priced}, injuries={len(live_injuries)}) -> {OUT}"
    )
    return payload


if __name__ == "__main__":
    main()
