#!/usr/bin/env python3
"""
scripts/ops/build_week10_game_boards.py

Generate the per-game DraftKings 360 matchup boards (schema
gse_360_matchup_board_v1) that the connected workflow's Stage 0/Stage 5 consume,
for every remaining Week 10 game. Source: ESPN Core API provider-100 (DraftKings)
propBets — the same keyless path refresh_live_dk_odds_and_props.py uses (bypasses
the direct DK IP block). Athlete -> team resolved via the ESPN athlete + teams API.

Output: data/engine/week10_{away}_{home}_dk_full_board_2026_11_06.json
Props match the verified NE@DET board: {athlete, team, position, market, line,
open_line, has_price}. has_price reflects whether DK over/under juice is present.

Resume-safe: skips games that already have a board unless --force.
Fail-closed: a game with zero fetched props is recorded as failed (exit 1).
"""
from __future__ import annotations

import argparse
import concurrent.futures
import json
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
WEEK = 10
BOARD_DATE_SUFFIX = "2026_11_06"
UA = {"User-Agent": "Mozilla/5.0"}

# The 14 full-game markets present on the verified NE@DET board.
BOARD_MARKETS = (
    "Total Passing Yards (incl. overtime)",
    "Total Pass Completions (incl. overtime)",
    "Total Passing Attempts (incl. overtime)",
    "Total Passing Touchdowns (incl. overtime)",
    "Total Passing Interceptions (incl. overtime)",
    "Total Rushing Yards (incl. overtime)",
    "Total Carries (incl. overtime)",
    "Total Receiving Yards (incl. overtime)",
    "Total Receptions (incl. overtime)",
    "Total Rushing Plus Receiving Yards (incl. overtime)",
    "Total Field Goals Made (incl. overtime)",
    "Total Kicking Points (incl. overtime)",
    "Total Extra Points Made (incl. overtime)",
    "Total Tackles Plus Assists (incl. overtime)",
)


def fetch_json(url: str, timeout: int = 20):
    req = urllib.request.Request(url, headers=UA)
    return json.loads(urllib.request.urlopen(req, timeout=timeout).read().decode("utf-8"))


def _norm_name(name: str) -> str:
    n = str(name).strip().lower()
    for suf in (" jr.", " sr.", " iii", " ii"):
        n = n.replace(suf, "")
    return n.replace(".", "").replace("'", "").strip()


def stage0_excluded() -> set[str]:
    """Authoritative Stage-0 exclusion set (require_week), normalized."""
    sys.path.insert(0, str(REPO_ROOT))
    from scripts.ops.preflight_live_roster_injury_gate import require_week
    cfg = require_week(WEEK)
    out: set[str] = set()
    for ep in cfg.get("excluded_players", []):
        nm = ep.get("name") if isinstance(ep, dict) else str(ep)
        if nm:
            out.add(_norm_name(nm))
    return out


def team_id_map() -> dict[str, str]:
    d = fetch_json("https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams?limit=50")
    out = {}
    for grp in d.get("sports", [{}])[0].get("leagues", [{}])[0].get("teams", []):
        t = grp.get("team", {})
        out[str(t.get("id"))] = t.get("abbreviation", "")
    return out


def athlete_info(ref: str, tid_map: dict[str, str]) -> dict:
    try:
        d = fetch_json(ref, timeout=15)
        team_ref = (d.get("team") or {}).get("$ref", "")
        team_id = team_ref.rstrip("/").split("/")[-1].split("?")[0] if team_ref else ""
        return {
            "name": d.get("displayName") or d.get("fullName") or "Unknown",
            "position": (d.get("position") or {}).get("abbreviation", ""),
            "team": tid_map.get(team_id, ""),
        }
    except Exception:
        return {"name": "Unknown", "position": "", "team": ""}


def fetch_event_propbets(ev_id: str) -> list[dict]:
    items: list[dict] = []
    page = 1
    while True:
        url = (f"https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/events/{ev_id}"
               f"/competitions/{ev_id}/odds/100/propBets?limit=1000&page={page}")
        try:
            d = fetch_json(url, timeout=25)
        except Exception as e:
            if page == 1:
                print(f"  [WARN] no propBets for {ev_id}: {e}", flush=True)
            break
        batch = d.get("items", [])
        items.extend(batch)
        if page >= d.get("pageCount", 1) or not batch:
            break
        page += 1
    return items


def build_board(ev_id: str, away: str, home: str, tid_map: dict[str, str], excluded: set[str]) -> dict:
    raw = fetch_event_propbets(ev_id)
    by_key: dict[tuple, dict] = {}
    refs: set[str] = set()
    all_markets: set[str] = set()
    for it in raw:
        t_name = (it.get("type") or {}).get("name", "")
        all_markets.add(t_name)
        if t_name not in BOARD_MARKETS:
            continue
        ref = (it.get("athlete") or {}).get("$ref", "")
        cur = it.get("current") or {}
        target = (cur.get("target") or {}).get("value")
        if not ref or target is None:
            continue
        refs.add(ref)
        over = (cur.get("over") or {}).get("alternateDisplayValue")
        under = (cur.get("under") or {}).get("alternateDisplayValue")
        key = (ref, t_name)
        if key not in by_key:
            by_key[key] = {
                "ref": ref, "market": t_name, "line": float(target),
                "open_line": float(((it.get("open") or {}).get("target") or {}).get("value") or target),
                "has_price": bool(over and under),
            }
    info: dict[str, dict] = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=16) as pool:
        futs = {pool.submit(athlete_info, r, tid_map): r for r in refs}
        for f in concurrent.futures.as_completed(futs):
            info[futs[f]] = f.result()
    props = []
    for (ref, t_name), v in by_key.items():
        a = info.get(ref, {"name": "Unknown", "position": "", "team": ""})
        if a["team"] not in (away, home):
            continue
        if _norm_name(a["name"]) in excluded:
            continue
        props.append({
            "athlete": a["name"], "team": a["team"], "position": a["position"],
            "market": t_name, "line": v["line"], "open_line": v["open_line"],
            "has_price": v["has_price"],
        })
    props.sort(key=lambda p: (p["team"], p["athlete"], p["market"]))
    return {
        "schema": "gse_360_matchup_board_v1",
        "matchup": f"{away} @ {home}",
        "week": WEEK,
        "market_type_count": len(all_markets),
        "props_count": len(props),
        "props": props,
        "provenance": {
            "source": "ESPN Core API provider-100 (DraftKings) propBets",
            "event_id": ev_id,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "generator": "build_week10_game_boards.py",
        },
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--only", default="", help="Comma-separated AWAY@HOME filters")
    args = ap.parse_args()

    sb = json.loads((REPO_ROOT / "data" / "engine" / "espn_2026_week10_scoreboard.json").read_text(encoding="utf-8"))
    tid_map = team_id_map()
    excluded = stage0_excluded()
    print(f"team id map: {len(tid_map)} teams | Stage-0 excluded: {len(excluded)} names", flush=True)
    now = datetime.now(timezone.utc)
    games = []
    for ev in sb.get("events", []):
        comp = (ev.get("competitions") or [{}])[0]
        cs = comp.get("competitors") or []
        home = next((c for c in cs if c.get("homeAway") == "home"), {}).get("team", {}).get("abbreviation", "")
        away = next((c for c in cs if c.get("homeAway") == "away"), {}).get("team", {}).get("abbreviation", "")
        date_str = ev.get("date", "")
        try:
            kickoff = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        except Exception:
            continue
        if kickoff <= now:
            continue  # already started (e.g. WSH@NYG Thursday)
        games.append((str(ev["id"]), away, home))
    if args.only:
        wanted = {tuple(x.strip().split("@")) for x in args.only.split(",") if x.strip()}
        games = [g for g in games if (g[1], g[2]) in wanted]
    print(f"Week {WEEK} boards to build: {len(games)} games", flush=True)

    failures = []
    built = 0
    for ev_id, away, home in games:
        out = REPO_ROOT / "data" / "engine" / f"week{WEEK}_{away.lower()}_{home.lower()}_dk_full_board_{BOARD_DATE_SUFFIX}.json"
        if out.is_file() and not args.force:
            print(f"[{away}@{home}] SKIP board exists", flush=True)
            built += 1
            continue
        try:
            board = build_board(ev_id, away, home, tid_map, excluded)
            if board["props_count"] == 0:
                raise RuntimeError("zero props fetched")
            out.write_text(json.dumps(board, indent=2), encoding="utf-8")
            print(f"[{away}@{home}] DONE {board['props_count']} props, {board['market_type_count']} market types -> {out.name}", flush=True)
            built += 1
        except Exception as e:
            print(f"[{away}@{home}] FAILED: {e}", file=sys.stderr, flush=True)
            failures.append(f"{away}@{home}: {e}")
    print(f"\nBOARD BUILD: {built}/{len(games)} games, {len(failures)} failures", flush=True)
    if failures:
        print("REFUSE_PROJECTION: " + "; ".join(failures), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())