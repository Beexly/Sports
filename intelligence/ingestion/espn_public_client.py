"""Keyless public ESPN client: scoreboard (spread/total/provider) + injuries.

Fulfils the external agent's espn_public_client.py spec against this repo's
conventions. Zero credentials; every response is timestamped and landed under
docs/data-sources/research/<date>/espn/ as evidence, never only printed.

Endpoints (keyless, verified live 2026-10-13/14):
  scoreboard : https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard
  injuries   : https://site.api.espn.com/apis/site/v2/sports/football/nfl/injuries

Spread/total extraction: ESPN inline odds carry `spread` (home-negative),
`overUnder` (total), and `provider.name`. De-vig belongs to
intelligence/reasoning/market_priors.py, not here — this module lands
raw quotes with provenance only.
"""

from __future__ import annotations

import argparse
import json
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
OUTROOT = REPO / "docs" / "data-sources" / "research"
UA = {"User-Agent": "GSE-public-espn-client/1.0 (keyless public API)"}


def _get(url: str, timeout: int = 30) -> dict:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def scoreboard() -> dict:
    return _get("https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard")


def injuries() -> dict:
    return _get("https://site.api.espn.com/apis/site/v2/sports/football/nfl/injuries")


def extract_lines(sb: dict) -> list[dict]:
    """Per-game spread (home-negative), total, provider name."""
    out: list[dict] = []
    for ev in sb.get("events", []):
        comp = (ev.get("competitions") or [{}])[0]
        odds = (comp.get("odds") or [{}])[0]
        details = odds.get("details") or ""
        row = {
            "gameId": ev.get("id"),
            "matchup": ev.get("name") or ev.get("shortName"),
            "date": ev.get("date"),
            "spread_detail": details,
            "spread_home": odds.get("spread") if isinstance(odds.get("spread"), (int, float)) else None,
            "spread_away": odds.get("awaySpread") if isinstance(odds.get("awaySpread"), (int, float)) else None,
            "total": odds.get("overUnder") if isinstance(odds.get("overUnder"), (int, float)) else None,
            "provider": (odds.get("provider") or {}).get("name"),
        }
        out.append(row)
    return out


def injury_summary(inj: dict) -> dict:
    teams = inj.get("items") or []
    return {
        "team_count": len(teams),
        "roster_teams": [
            (t.get("team") or {}).get("abbreviation") for t in teams
        ],
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--out-root", default=str(OUTROOT))
    ap.add_argument("--no-write", action="store_true", help="print only; do not land files")
    args = ap.parse_args()

    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%SZ")
    now_iso = datetime.now(timezone.utc).isoformat()

    sb = scoreboard()
    lines = extract_lines(sb)
    inj = injuries()
    isum = injury_summary(inj)

    result = {
        "generated_utc": now_iso,
        "source": "site.api.espn.com keyless public API",
        "scoreboard_events": len(sb.get("events", [])),
        "games_with_lines": sum(1 for r in lines if r["total"] is not None or r["spread_home"] is not None),
        "lines": lines,
        "injuries_team_count": isum["team_count"],
    }
    print(json.dumps(result, indent=1)[:2200])

    if not args.no_write:
        outdir = Path(args.out_root) / datetime.now(timezone.utc).date().isoformat() / "espn"
        outdir.mkdir(parents=True, exist_ok=True)
        p1 = outdir / f"public_scoreboard_{stamp}.json"
        p1.write_text(json.dumps({"generated_utc": now_iso, "source": result["source"],
                                  "lines": lines, "raw_events": sb.get("events", [])},
                                 indent=1), encoding="utf-8")
        p2 = outdir / f"public_injuries_{stamp}.json"
        p2.write_text(json.dumps({"generated_utc": now_iso, "source": result["source"],
                                  "team_count": isum["team_count"],
                                  "raw": inj}, indent=1), encoding="utf-8")
        print(f"landed: {p1.name} ({p1.stat().st_size} B), {p2.name} ({p2.stat().st_size} B) -> {outdir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
