"""NFL injury pull — production caller for the injury gate (G-02).

WHY THIS EXISTS
---------------
`intelligence/providers/injury_gate.py` refuses a LIVE injury pull before the
week's report is published (Friday 18:00 ET). Until now only its test wire
exercised the gate; no production pull ran through it. This module is that
caller: it gates BEFORE any live fetch, then pulls the ESPN public NFL injuries
endpoint (keyless) and lands a compact per-team digest under the dated
data-sources research bucket.

The gate does not guess the calendar: the caller supplies the NFL week AND that
week's Friday (`--week`, `--friday`), exactly as `require_injury_published`
demands. Pulling a week whose Friday 18:00 ET cutoff has not passed raises
InjuryNotPublished and fetches nothing.

Usage
-----
    # A published week (allowed): the Friday cutoff has passed
    python intelligence/providers/pull_nfl_injuries.py --week 6 --friday 2026-10-09

    # A not-yet-published week (refused by the gate, zero network calls)
    python intelligence/providers/pull_nfl_injuries.py --week 7 --friday 2026-10-16

Output: docs/data-sources/research/<today>/injuries/espn_nfl_injuries_<week>.json
(a compact digest: per-team athlete injury rows; the raw 8MB+ payload itself is
not committed).
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.request
from datetime import date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "intelligence"))

from providers.injury_gate import InjuryNotPublished, require_injury_published  # noqa: E402

ET = ZoneInfo("America/New_York")
ESPN_INJURIES_URL = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/injuries"


def fetch_injuries(url: str = ESPN_INJURIES_URL) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "GSE-injury-pull/1.0 (keyless ESPN public API)"})
    with urllib.request.urlopen(req, timeout=45) as resp:
        return json.loads(resp.read().decode("utf-8"))


def digest(payload: dict) -> dict:
    """Compact per-team digest; keeps every row but drops bloat fields.

    ESPN's injuries feed nests teams inconsistently across versions: some
    entries carry a top-level `team` object, others name the team only on the
    athlete (`athlete.team`). Both are honored; a row whose team cannot be
    resolved lands under the team key it declares, or is grouped as UNKNOWN
    rather than dropped (dropping would hide injuries from the engine).
    """
    grouped: dict[str, dict[str, Any]] = {}
    order: list[str] = []
    for entry in payload.get("injuries", []):
        t = entry.get("team", {}) or {}
        abbr = t.get("abbreviation") or t.get("displayName") or ""
        name = t.get("displayName") or ""
        rows = []
        for item in entry.get("injuries", []) or []:
            ath = item.get("athlete", {}) or {}
            at = ath.get("team", {}) or {}
            team_abbr = abbr or at.get("abbreviation") or "UNKNOWN"
            team_name = name or at.get("displayName") or team_abbr
            if team_abbr not in grouped:
                grouped[team_abbr] = {"team": team_abbr, "name": team_name, "injuries": []}
                order.append(team_abbr)
            rows.append(
                {
                    "athlete": ath.get("displayName"),
                    "position": (ath.get("position") or {}).get("abbreviation"),
                    "status": item.get("status"),
                    "date": item.get("date"),
                    "detail": (item.get("details") or {}).get("type") or item.get("type", {}).get("description") if isinstance(item.get("type"), dict) else item.get("type"),
                    "side": (item.get("details") or {}).get("side"),
                    "return_date": (item.get("details") or {}).get("returnDate"),
                }
            )
        if abbr and abbr not in grouped:
            grouped[abbr] = {"team": abbr, "name": name, "injuries": []}
            order.append(abbr)
        grouped[team_abbr_key(abbr, rows)]["injuries"].extend(rows) if False else None
        # rows were appended per entry below
        if abbr:
            grouped[abbr]["injuries"].extend(rows)
        else:
            # team unknown at entry level: group rows by athlete team
            by_team: dict[str, list] = {}
            for row, item in zip(rows, entry.get("injuries", []) or []):
                at = (item.get("athlete", {}) or {}).get("team", {}) or {}
                key = at.get("abbreviation") or "UNKNOWN"
                by_team.setdefault(key, []).append(row)
            for key, rws in by_team.items():
                if key not in grouped:
                    grouped[key] = {"team": key, "name": key, "injuries": []}
                    order.append(key)
                grouped[key]["injuries"].extend(rws)
    teams = [grouped[k] for k in order if k in grouped]
    return {"teams": teams, "team_count": len(teams), "row_count": sum(len(t["injuries"]) for t in teams)}


def team_abbr_key(abbr: str, rows: list) -> str:
    return abbr or "UNKNOWN"


def main() -> int:
    ap = argparse.ArgumentParser(description="Gate-checked ESPN NFL injury pull (G-02 production caller).")
    ap.add_argument("--week", type=int, required=True, help="NFL week number the pull is for")
    ap.add_argument("--friday", required=True, help="ISO date of that week's Friday (the caller supplies the calendar)")
    ap.add_argument("--out-dir", default=None, help="Output dir (default: docs/data-sources/research/<today>/injuries)")
    args = ap.parse_args()

    now = datetime.now(ET)
    friday = date.fromisoformat(args.friday)
    friday_dt = datetime(friday.year, friday.month, friday.day, tzinfo=ET)

    # GATE FIRST: refuse before the report week is published. No network on refusal.
    try:
        require_injury_published(args.week, now, friday_dt)
    except InjuryNotPublished as exc:
        print(f"[injury-pull] REFUSED by gate: {exc}")
        return 3

    payload = fetch_injuries()
    d = digest(payload)
    out_dir = Path(args.out_dir) if args.out_dir else REPO_ROOT / "docs" / "data-sources" / "research" / now.date().isoformat() / "injuries"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"espn_nfl_injuries_week{args.week}.json"
    out_path.write_text(
        json.dumps(
            {
                "source": ESPN_INJURIES_URL,
                "pulled_at": now.isoformat(),
                "week": args.week,
                "gate": "require_injury_published (Friday 18:00 ET)",
                "team_count": d["team_count"],
                "row_count": d["row_count"],
                "teams": d["teams"],
            },
            indent=1,
        ),
        encoding="utf-8",
    )
    print(f"[injury-pull] OK week={args.week}: {d['team_count']} teams, {d['row_count']} rows -> {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
