#!/usr/bin/env python3
"""General NFL Slate Two-Sided DraftKings Odds, Injury & Full-Board Prop Fetcher.

Replaces hardcoded single-game fetchers with a parameterized CLI/library that:
1. Resolves any NFL event by (`--away`, `--home`, `--week`) or explicit `--event-id`.
2. Pulls live DraftKings (`provider=100`) spread, total, moneyline, and spread juice
   from ESPN `summary?event=...` `pickcenter`.
3. Pulls paginated (`page=1..N`, `limit=1000`) DraftKings `propBets` across all ~77
   market categories (`1Q-4Q`, `1H/2H`, Team Totals, OT, QB, Skill, Longest,
   Kicking, IDP Tackles & Sacks, and TD Scorers).
4. Strictly preserves real two-sided American odds (`over_odds` / `under_odds` / `yes_odds`
   / `no_odds`) WITHOUT EVER fabricating `-110/-110` defaults so Stage 5 Class B
   de-vig gates cleanly reject unpriced lines as `PASS`.
"""
from __future__ import annotations

import argparse
import concurrent.futures
import json
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
TEAM_ALIASES = {"JAC": "JAX", "WSH": "WAS", "LVR": "LV", "LA": "LAR"}

BINARY_MARKET_KEYWORDS = (
    "touchdown scorer",
    "score 2",
    "score 3",
    "overtime",
    "moneyline",
)


def normalize_team(code: str) -> str:
    c = (code or "").strip().upper()
    return TEAM_ALIASES.get(c, c)


def fetch_json(url: str, timeout: int = 12) -> dict[str, Any]:
    req = urllib.request.Request(url, headers={"User-Agent": "GSE-Slate-Fetcher/2.0"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _parse_american_odds(raw: Any) -> int | None:
    if raw is None or isinstance(raw, bool):
        return None
    if isinstance(raw, (int, float)):
        val = int(round(float(raw)))
        return val if val != 0 else None
    s = str(raw).strip().upper()
    if s in ("", "EVEN", "EV"):
        return 100 if s in ("EVEN", "EV") else None
    try:
        return int(float(s.replace("+", "")))
    except Exception:
        return None


def _extract_side_odds(node: Any) -> int | None:
    if not isinstance(node, dict):
        return None
    for k in ("american", "odds", "alternateDisplayValue", "value"):
        v = node.get(k)
        if k == "alternateDisplayValue" or k == "american":
            parsed = _parse_american_odds(v)
            if parsed is not None and abs(parsed) >= 100:
                return parsed
    return None


def resolve_nfl_event(
    away: str,
    home: str,
    week: int,
    season: int = 2026,
    event_id: str | None = None,
) -> dict[str, Any]:
    away_u = normalize_team(away)
    home_u = normalize_team(home)
    if event_id:
        return {"event_id": str(event_id), "away": away_u, "home": home_u, "week": week, "season": season}

    urls = [
        f"https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&week={week}&dates={season}",
        "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard",
    ]
    for url in urls:
        try:
            sb = fetch_json(url, timeout=12)
        except Exception:
            continue
        for ev in sb.get("events", []):
            comp = (ev.get("competitions") or [{}])[0]
            comps = comp.get("competitors") or []
            hm = next((c for c in comps if c.get("homeAway") == "home"), {})
            aw = next((c for c in comps if c.get("homeAway") == "away"), {})
            hm_ab = normalize_team((hm.get("team") or {}).get("abbreviation", ""))
            aw_ab = normalize_team((aw.get("team") or {}).get("abbreviation", ""))
            if aw_ab == away_u and hm_ab == home_u:
                venue = comp.get("venue") or {}
                return {
                    "event_id": str(ev["id"]),
                    "matchup": f"{away_u} @ {home_u}",
                    "away": away_u,
                    "home": home_u,
                    "week": week,
                    "season": season,
                    "kickoff_utc": ev.get("date"),
                    "venue": venue.get("fullName", ""),
                    "indoor": bool(venue.get("indoor", False)),
                    "teams": {
                        str((hm.get("team") or {}).get("id", "")): home_u,
                        str((aw.get("team") or {}).get("id", "")): away_u,
                    },
                }
    raise RuntimeError(f"Could not resolve ESPN event_id for {away_u} @ {home_u} (week={week}, season={season})")


def _resolve_athlete_info(
    ref_url: str,
    cache: dict[str, dict[str, str]],
    team_id_map: dict[str, str],
) -> dict[str, str]:
    if not ref_url:
        return {"name": "", "id": "", "position": "", "team": ""}
    if ref_url in cache:
        return cache[ref_url]
    try:
        d = fetch_json(ref_url, timeout=8)
        tm_ref = ((d.get("team") or {}).get("$ref") or "")
        tm_id = tm_ref.rstrip("/").split("/")[-1].split("?")[0] if tm_ref else ""
        info = {
            "id": str(d.get("id", "")),
            "name": str(d.get("fullName") or d.get("displayName") or ""),
            "position": str((d.get("position") or {}).get("abbreviation", "")),
            "team": team_id_map.get(tm_id, ""),
        }
        cache[ref_url] = info
        return info
    except Exception:
        return {"name": "", "id": "", "position": "", "team": ""}


def fetch_slate_event_board(
    away: str,
    home: str,
    week: int,
    season: int = 2026,
    event_id: str | None = None,
    two_sided_only: bool = False,
) -> dict[str, Any]:
    event_meta = resolve_nfl_event(away, home, week, season=season, event_id=event_id)
    ev_id = event_meta["event_id"]
    summary = fetch_json(f"https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event={ev_id}", timeout=15)

    # Enrich teams/venue from header if resolved by explicit --event-id
    header = summary.get("header") or {}
    h_comp = (header.get("competitions") or [{}])[0]
    team_id_map: dict[str, str] = dict(event_meta.get("teams") or {})
    for c in h_comp.get("competitors") or []:
        t = c.get("team") or {}
        if t.get("id") and t.get("abbreviation"):
            team_id_map[str(t["id"])] = normalize_team(t["abbreviation"])
    if not event_meta.get("venue"):
        gi = summary.get("gameInfo") or {}
        vn = gi.get("venue") or {}
        event_meta["venue"] = vn.get("fullName", "")
        event_meta["indoor"] = bool(vn.get("indoor", False))
    event_meta["teams"] = team_id_map

    pc_list = summary.get("pickcenter") or []
    dk_pc = next((p for p in pc_list if str((p.get("provider") or {}).get("id")) == "100"), pc_list[0] if pc_list else {})
    game_lines = {
        "provider": (dk_pc.get("provider") or {}).get("name", "DraftKings"),
        "details": dk_pc.get("details"),
        "spread": dk_pc.get("spread"),
        "over_under": dk_pc.get("overUnder"),
        "over_odds": _parse_american_odds(dk_pc.get("overOdds")),
        "under_odds": _parse_american_odds(dk_pc.get("underOdds")),
        "away_ml": _parse_american_odds((dk_pc.get("awayTeamOdds") or {}).get("moneyLine")),
        "home_ml": _parse_american_odds((dk_pc.get("homeTeamOdds") or {}).get("moneyLine")),
        "away_spread_odds": _parse_american_odds((dk_pc.get("awayTeamOdds") or {}).get("spreadOdds")),
        "home_spread_odds": _parse_american_odds((dk_pc.get("homeTeamOdds") or {}).get("spreadOdds")),
    }

    live_injuries: list[dict[str, Any]] = []
    for tm_block in summary.get("injuries") or []:
        tm_ab = normalize_team((tm_block.get("team") or {}).get("abbreviation", ""))
        for inj in tm_block.get("injuries") or []:
            ath = inj.get("athlete") or {}
            det = inj.get("details") or {}
            live_injuries.append({
                "team": tm_ab,
                "athlete": ath.get("displayName") or ath.get("fullName") or "",
                "athlete_id": str(ath.get("id") or ""),
                "position": ((ath.get("position") or {}).get("abbreviation") or ""),
                "status": inj.get("status") or "",
                "injury_type": det.get("type") or "",
                "detail": det.get("detail") or "",
                "updated_at": inj.get("date") or "",
            })

    raw_items: list[dict[str, Any]] = []
    page = 1
    while True:
        url = (
            f"https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/events/"
            f"{ev_id}/competitions/{ev_id}/odds/100/propBets?limit=1000&page={page}"
        )
        try:
            data = fetch_json(url, timeout=15)
        except Exception:
            break
        items = data.get("items") or []
        raw_items.extend(items)
        if page >= int(data.get("pageCount", 1)) or not items:
            break
        page += 1

    athlete_refs = {((it.get("athlete") or {}).get("$ref") or "") for it in raw_items}
    athlete_refs.discard("")
    athlete_cache: dict[str, dict[str, str]] = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
        futs = [pool.submit(_resolve_athlete_info, ref, athlete_cache, team_id_map) for ref in sorted(athlete_refs)]
        for f in futs:
            f.result()

    props: list[dict[str, Any]] = []
    market_types: set[str] = set()
    two_sided_count = 0
    for it in raw_items:
        mkt = str((it.get("type") or {}).get("name") or "").strip()
        if not mkt:
            continue
        cur = it.get("current") or {}
        opn = it.get("open") or {}
        target_v = (cur.get("target") or {}).get("value")
        open_v = (opn.get("target") or {}).get("value")

        over_odds = _extract_side_odds(cur.get("over") or cur.get("yes") or cur.get("home"))
        under_odds = _extract_side_odds(cur.get("under") or cur.get("no") or cur.get("away"))
        if over_odds is None and under_odds is None:
            single_odds = _extract_side_odds(cur.get("total") or cur.get("alternate") or cur.get("moneyLine"))
        else:
            single_odds = None
        has_two_sided = over_odds is not None and under_odds is not None
        if two_sided_only and not has_two_sided:
            continue
        if has_two_sided:
            two_sided_count += 1

        ath_ref = ((it.get("athlete") or {}).get("$ref") or "")
        ath_inf = athlete_cache.get(ath_ref, {})
        tm_ref = ((it.get("team") or {}).get("$ref") or "")
        tm_id = tm_ref.rstrip("/").split("/")[-1].split("?")[0] if tm_ref else ""
        team_ab = ath_inf.get("team") or team_id_map.get(tm_id, "")
        ath_name = ath_inf.get("name") or ("Game" if not team_ab else "Team")

        market_types.add(mkt)
        props.append({
            "market": mkt,
            "athlete": ath_name,
            "athlete_id": ath_inf.get("id", ""),
            "position": ath_inf.get("position", ""),
            "team": team_ab,
            "line": float(target_v) if target_v is not None else None,
            "open_line": float(open_v) if open_v is not None else None,
            "over_odds": over_odds,
            "under_odds": under_odds,
            "single_side_odds": single_odds,
            "has_two_sided_odds": has_two_sided,
            "last_updated": it.get("lastUpdated"),
        })

    return {
        "schema": "gse_slate_full_board_v2",
        "fetched_at_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "event": event_meta,
        "game_lines": game_lines,
        "live_injuries": live_injuries,
        "market_type_count": len(market_types),
        "two_sided_priced_count": two_sided_count,
        "props_count": len(props),
        "props": props,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Fetch live DraftKings two-sided props & board for any NFL matchup")
    parser.add_argument("--away", required=True, help="Away team abbreviation (e.g. IND)")
    parser.add_argument("--home", required=True, help="Home team abbreviation (e.g. HOU)")
    parser.add_argument("--week", type=int, required=True, help="NFL week number")
    parser.add_argument("--season", type=int, default=2026)
    parser.add_argument("--event-id", default=None)
    parser.add_argument("--two-sided-only", action="store_true")
    parser.add_argument("--out", default=None)
    args = parser.parse_args(argv)

    board = fetch_slate_event_board(
        away=args.away,
        home=args.home,
        week=args.week,
        season=args.season,
        event_id=args.event_id,
        two_sided_only=args.two_sided_only,
    )
    away_u = normalize_team(args.away).lower()
    home_u = normalize_team(args.home).lower()
    out_p = Path(args.out) if args.out else REPO_ROOT / "data" / "engine" / f"slate_{away_u}_{home_u}_week{args.week}_board.json"
    out_p.parent.mkdir(parents=True, exist_ok=True)
    out_p.write_text(json.dumps(board, indent=2) + "\n", encoding="utf-8")
    print(
        f"[SLATE BOARD FETCHED] {board['event'].get('matchup', f'{args.away}@{args.home}')} | "
        f"markets={board['market_type_count']} | items={board['props_count']} | "
        f"two_sided={board['two_sided_priced_count']} -> {out_p}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
