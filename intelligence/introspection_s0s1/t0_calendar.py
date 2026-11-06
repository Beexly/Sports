"""T0 accrual calendar: for every game, T0 = kickoff - 72h (§6 default).

Kickoff times come from the in-repo schedule (data/gse-dataset/games.jsonl:
`gameday` + `game_time_local`). Despite the field name, those times follow
the Eastern Time broadcast convention (verified against the record: the
London game HOU@JAX is listed 09:30, the Sunday/Monday night games 20:20 /
20:15 ET). They are interpreted as America/New_York and converted to UTC;
each row also shows T0 in America/Chicago for the fleet's working clock.

A game's status is computed against the server clock at generation time:
ELAPSED (T0 already past — no T0 forecast can ever be authored for it now;
it will score MISSING, i.e. as the reference) or UPCOMING (with the time
remaining). This is the accrual discipline of §5: every week without
stamped T0 forecasts is permanently lost primary-metric evidence.
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

ET = ZoneInfo("America/New_York")
CT = ZoneInfo("America/Chicago")
T0_OFFSET = timedelta(hours=72)


def kickoff_utc(row: dict) -> datetime:
    local = datetime.strptime(f"{row['gameday']} {row['game_time_local']}", "%Y-%m-%d %H:%M")
    return local.replace(tzinfo=ET).astimezone(timezone.utc)


def build_calendar(schedule_rows: list, season: int, weeks: list, now: datetime) -> list:
    out = []
    for row in schedule_rows:
        if int(row["season"]) != season or int(row["week"]) not in weeks:
            continue
        if not row.get("game_time_local"):
            continue
        ko = kickoff_utc(row)
        t0 = ko - T0_OFFSET
        elapsed = t0 <= now
        out.append(
            {
                "game_id": row["game_id"],
                "season": int(row["season"]),
                "week": int(row["week"]),
                "matchup": f"{row['away_team']} @ {row['home_team']}",
                "kickoff_utc": ko.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "t0_utc": t0.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "t0_ct": t0.astimezone(CT).strftime("%Y-%m-%d %H:%M CT"),
                "status": "ELAPSED" if elapsed else "UPCOMING",
                "hours_to_t0": None if elapsed else round((t0 - now).total_seconds() / 3600.0, 2),
            }
        )
    out.sort(key=lambda r: r["t0_utc"])
    return out


def load_schedule(path: str) -> list:
    rows = []
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows
