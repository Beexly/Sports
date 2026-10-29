#!/usr/bin/env python3
"""
Fetches 100% REAL LIVE DraftKings (Provider 100) Game Lines (Spread, Total, ML)
and Player Prop Lines across ALL 14 NFL Games on the current slate from ESPN Core API,
and saves the canonical snapshot to `data/engine/live_dk_odds_and_props_2026_10_29.json`.
"""
import concurrent.futures
import json
import urllib.request
from pathlib import Path

REPO = Path(r"C:\Users\Garrett\Sports")
OUT_JSON = REPO / "data" / "engine" / "live_dk_odds_and_props_2026_10_29.json"

athlete_cache = {}


def fetch_json(url: str, timeout: int = 12):
    req = urllib.request.urlopen(url, timeout=timeout)
    return json.loads(req.read().decode("utf-8"))


def get_athlete_info(ref_url: str) -> dict:
    if not ref_url:
        return {"name": "Unknown", "id": ""}
    if ref_url in athlete_cache:
        return athlete_cache[ref_url]
    try:
        d = fetch_json(ref_url, timeout=8)
        info = {
            "id": str(d.get("id", "")),
            "name": d.get("fullName") or d.get("displayName") or "Unknown",
            "position": (d.get("position") or {}).get("abbreviation", ""),
        }
        athlete_cache[ref_url] = info
        return info
    except Exception:
        return {"name": "Unknown", "id": ""}


def fetch_event_props(ev_id: str) -> list[dict]:
    raw_items = []
    page = 1
    while True:
        url = f"https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/events/{ev_id}/competitions/{ev_id}/odds/100/propBets?limit=1000&page={page}"
        try:
            data = fetch_json(url, timeout=15)
        except Exception as e:
            if page == 1:
                print(f"  [WARN] No DK propBets for {ev_id}: {e}")
            break
        items = data.get("items", [])
        raw_items.extend(items)
        if page >= data.get("pageCount", 1) or not items:
            break
        page += 1

    wanted_markets = (
        # Full-Game Skill & QB
        "Total Passing Yards (incl. overtime)",
        "Total Pass Completions (incl. overtime)",
        "Total Passing Attempts (incl. overtime)",
        "Total Pass Attempts (incl. overtime)",
        "Total Passing Touchdowns (incl. overtime)",
        "Total Passing Interceptions (incl. overtime)",
        "Total Passing Plus Rushing Yards (incl. overtime)",
        "Longest Passing Completion (incl. overtime)",
        "Total Rushing Yards (incl. overtime)",
        "Total Carries (incl. overtime)",
        "Longest Rush (incl. overtime)",
        "Total Receiving Yards (incl. overtime)",
        "Total Receptions (incl. overtime)",
        "Total Rushing Plus Receiving Yards (incl. overtime)",
        "Longest Reception (incl. overtime)",
        # 1st Quarter & 1st Half Player Props
        "1st Quarter Total Passing Yards",
        "1st Quarter Total Rushing Yards",
        "1st Quarter Total Receiving Yards",
        "1st Half Total Passing Yards",
        "1st Half Total Rushing Yards",
        "1st Half Total Receiving Yards",
        # Quarters & Halves Game Lines
        "1st Quarter Spread",
        "1st Quarter Total",
        "2nd Quarter Spread",
        "2nd Quarter Total",
        "3rd Quarter Spread",
        "3rd Quarter Total",
        "4th Quarter Spread",
        "4th Quarter Total",
        "1st Half Spread",
        "1st Half Total",
        "Team 1st Half Total Points",
        "Team Total Touchdowns",
        # Kicking
        "Total Field Goals Made (incl. overtime)",
        "Total Kicking Points (incl. overtime)",
        "Total Extra Points Made (incl. overtime)",
        # Defense / IDP
        "Total Sacks (incl. overtime)",
        "Total Tackles Plus Assists (incl. overtime)",
        "Total Tackles (incl. overtime)",
        "Total Assists (incl. overtime)",
    )

    by_key = {}
    athlete_refs = set()
    for item in raw_items:
        t_name = (item.get("type") or {}).get("name", "")
        if t_name not in wanted_markets:
            continue
        ath_ref = (item.get("athlete") or {}).get("$ref", "")
        cur = item.get("current") or {}
        target = (cur.get("target") or {}).get("value")
        if not ath_ref or target is None:
            continue
        athlete_refs.add(ath_ref)
        key = (ath_ref, t_name)
        entry = by_key.setdefault(
            key,
            {
                "athlete_ref": ath_ref,
                "market_raw": t_name,
                "line": float(target),
                "open_line": float(((item.get("open") or {}).get("target") or {}).get("value") or target),
                "over_odds": None,
                "under_odds": None,
                "last_updated": item.get("lastUpdated"),
            },
        )
        odds_str = ((cur.get("over") or cur.get("under") or cur.get("total") or {}).get("alternateDisplayValue"))
        if "over" in cur and cur["over"]:
            entry["over_odds"] = cur["over"].get("alternateDisplayValue")
        if "under" in cur and cur["under"]:
            entry["under_odds"] = cur["under"].get("alternateDisplayValue")

    # Resolve athlete names concurrently
    with concurrent.futures.ThreadPoolExecutor(max_workers=16) as pool:
        futures = {pool.submit(get_athlete_info, ref): ref for ref in athlete_refs}
        for fut in concurrent.futures.as_completed(futures):
            fut.result()

    clean_market_map = {
        "Total Passing Yards (incl. overtime)": "Passing Yards",
        "Total Pass Completions (incl. overtime)": "Pass Completions",
        "Total Pass Attempts (incl. overtime)": "Pass Attempts",
        "Total Passing Touchdowns (incl. overtime)": "Passing TDs",
        "Total Rushing Yards (incl. overtime)": "Rushing Yards",
        "Total Carries (incl. overtime)": "Rushing Attempts",
        "Total Receiving Yards (incl. overtime)": "Receiving Yards",
        "Total Receptions (incl. overtime)": "Receptions",
        "Total Rushing Plus Receiving Yards (incl. overtime)": "Rush + Rec Yards",
    }

    props = []
    for (ath_ref, t_name), val in by_key.items():
        ath = athlete_cache.get(ath_ref, {"name": "Unknown", "id": "", "position": ""})
        props.append(
            {
                "player_id": ath["id"],
                "player_name": ath["name"],
                "position": ath.get("position", ""),
                "market": clean_market_map.get(t_name, t_name),
                "line": val["line"],
                "open_line": val["open_line"],
                "over_odds": val["over_odds"] or "-110",
                "under_odds": val["under_odds"] or "-110",
                "last_updated": val["last_updated"],
            }
        )
    props.sort(key=lambda x: (x["market"], -x["line"]))
    return props


def main():
    sb = fetch_json("https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard")
    events_out = []
    for ev in sb.get("events", []):
        ev_id = str(ev["id"])
        short_name = ev.get("shortName", "")
        comp = (ev.get("competitions") or [{}])[0]
        odds_list = comp.get("odds") or []
        dk = odds_list[0] if odds_list else {}
        competitors = comp.get("competitors") or []
        home = next((c for c in competitors if c.get("homeAway") == "home"), {})
        away = next((c for c in competitors if c.get("homeAway") == "away"), {})

        # Also fetch pickcenter from summary for exact spread/ML/total juice
        summary = fetch_json(f"https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event={ev_id}")
        pc_list = summary.get("pickcenter") or []
        pc = pc_list[0] if pc_list else {}

        props = fetch_event_props(ev_id)
        ev_record = {
            "event_id": ev_id,
            "short_name": short_name,
            "date_utc": ev.get("date"),
            "status_detail": ((ev.get("status") or {}).get("type") or {}).get("shortDetail", ""),
            "away_abbr": (away.get("team") or {}).get("abbreviation", ""),
            "away_name": (away.get("team") or {}).get("displayName", ""),
            "home_abbr": (home.get("team") or {}).get("abbreviation", ""),
            "home_name": (home.get("team") or {}).get("displayName", ""),
            "provider": (pc.get("provider") or {}).get("name", "DraftKings"),
            "details": pc.get("details") or dk.get("details", ""),
            "spread": pc.get("spread") if pc.get("spread") is not None else dk.get("spread"),
            "over_under": pc.get("overUnder") if pc.get("overUnder") is not None else dk.get("overUnder"),
            "over_odds": pc.get("overOdds"),
            "under_odds": pc.get("underOdds"),
            "away_ml": (pc.get("awayTeamOdds") or {}).get("moneyLine"),
            "home_ml": (pc.get("homeTeamOdds") or {}).get("moneyLine"),
            "away_spread_odds": (pc.get("awayTeamOdds") or {}).get("spreadOdds"),
            "home_spread_odds": (pc.get("homeTeamOdds") or {}).get("spreadOdds"),
            "props_count": len(props),
            "props": props,
        }
        events_out.append(ev_record)
        print(
            f"EVENT {ev_id} | {short_name:10s} | {ev_record['details']:10s} | O/U {ev_record['over_under']} | "
            f"ML {ev_record['away_ml']}/{ev_record['home_ml']} | Props: {len(props)}"
        )

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps({"fetched_at_utc": sb.get("day", {}), "events": events_out}, indent=2), encoding="utf-8")
    print(f"\nSaved {len(events_out)} live events + props to {OUT_JSON}")


if __name__ == "__main__":
    main()
