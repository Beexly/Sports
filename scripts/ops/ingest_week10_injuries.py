#!/usr/bin/env python3
"""
Ingest 2026 Week 10 NFL injury reports for all teams playing Week 10
into Neon public.injuries (project summer-brook-99380762, branch main).

Source: ESPN public injuries endpoint
https://site.api.espn.com/apis/site/v2/sports/football/nfl/injuries

Idempotent upsert: ON CONFLICT (id) scoped to week 10 + sourceId.
"""

import json
import urllib.request
import uuid
import re
import os
from datetime import datetime, timezone

# Neon connection
NEON_CMD = 'neon psql main --project-id summer-brook-99380762 --role-name neondb_owner'

# Use forward-slash path for TEAM_ABBREV_MAP
TEAM_ABBREV_MAP = {
    "Arizona Cardinals": "ARI",
    "Atlanta Falcons": "ATL",
    "Baltimore Ravens": "BAL",
    "Buffalo Bills": "BUF",
    "Carolina Panthers": "CAR",
    "Chicago Bears": "CHI",
    "Cincinnati Bengals": "CIN",
    "Cleveland Browns": "CLE",
    "Dallas Cowboys": "DAL",
    "Denver Broncos": "DEN",
    "Detroit Lions": "DET",
    "Green Bay Packers": "GB",
    "Houston Texans": "HOU",
    "Indianapolis Colts": "IND",
    "Jacksonville Jaguars": "JAX",
    "Kansas City Chiefs": "KC",
    "Las Vegas Raiders": "LV",
    "Los Angeles Chargers": "LAC",
    "Los Angeles Rams": "LA",
    "Miami Dolphins": "MIA",
    "Minnesota Vikings": "MIN",
    "New England Patriots": "NE",
    "New Orleans Saints": "NO",
    "New York Giants": "NYG",
    "New York Jets": "NYJ",
    "Philadelphia Eagles": "PHI",
    "Pittsburgh Steelers": "PIT",
    "San Francisco 49ers": "SF",
    "Seattle Seahawks": "SEA",
    "Tampa Bay Buccaneers": "TB",
    "Tennessee Titans": "TEN",
    "Washington Commanders": "WAS",
}


def fetch_espn_injuries():
    url = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/injuries"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode())
    return data


def extract_primary_injury(comment):
    if not comment:
        return ""
    c = comment.lower()
    patterns = [
        (r'\bconcuss(i|ion)\b', 'Concussion'),
        (r'\b(knee|ligament|ACL|MCL|PCL)\b', 'Knee'),
        (r'\b(ankle)\b', 'Ankle'),
        (r'\b(hamstring)\b', 'Hamstring'),
        (r'\b(back|spine)\b', 'Back'),
        (r'\b(foot|toe)\b', 'Foot'),
        (r'\b(shoulder)\b', 'Shoulder'),
        (r'\b(rib|ribs)\b', 'Ribs'),
        (r'\b(elbow)\b', 'Elbow'),
        (r'\b(wrist)\b', 'Wrist'),
    ]
    for pattern, injury in patterns:
        if re.search(pattern, c):
            return injury
    return ""


def extract_practice_status(comment):
    if not comment:
        return ""
    c = comment.lower()
    if 'did not participate' in c or 'did-not-participate' in c:
        return "Did Not Participate In Practice"
    if 'limited participant' in c:
        return "Limited Participation in Practice"
    if 'full participation' in c:
        return "Full Participation in Practice"
    return ""


def map_injury(team_name, inj, source_id="espn"):
    athlete = inj['athlete']
    position_abbr = athlete['position']['abbreviation']
    team_abbr = TEAM_ABBREV_MAP.get(team_name, team_name[:3].upper())

    long_comment = inj.get('longComment', '') or ''
    short_comment = inj.get('shortComment', '') or ''
    combined_comment = f" {long_comment} {short_comment} "

    primary_injury = extract_primary_injury(combined_comment)
    practice_status = extract_practice_status(combined_comment)
    report_status = inj.get('status', '') or ''

    # Deterministic UUID5 based on ESPN data fields
    id_input = f"{inj['id']}_{athlete['displayName']}_{team_name}_{athlete['position']['abbreviation']}_{inj['date']}"
    row_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, id_input))

    # playerId: ESPN player ID from link
    player_id = ""
    for link in athlete.get('links', []):
        href = link.get('href', '')
        m = re.search(r'/id/(\d+)', href)
        if m:
            player_id = m.group(1)
            break

    # gsisId: ESPN doesn't provide GSIS IDs
    gsis_id = ""

    # rightsSnapshot jsonb
    now = datetime.now(timezone.utc).isoformat()
    rights_snapshot_dict = {
        "status": "espn_public",
        "source_id": source_id,
        "source_url": "https://site.api.espn.com/apis/site/v2/sports/football/nfl/injuries",
        "reviewed_at": now,
        "snapshotted_at": now,
        "storage_allowed": True,
        "attribution_text": "Data from ESPN (https://www.espn.com/nfl/injuries), public API",
        "attribution_required": True,
        "model_training_allowed": True,
        "derived_analytics_allowed": True,
        "public_logged_off_allowed": True,
        "commercial_display_allowed": True,
    }
    rights_snapshot = json.dumps(rights_snapshot_dict)

    return {
        "id": row_id,
        "playerId": player_id,
        "gsisId": gsis_id,
        "playerName": athlete['displayName'],
        "season": 2026,
        "week": 10,
        "team": team_abbr,
        "position": position_abbr,
        "reportStatus": report_status,
        "practiceStatus": practice_status,
        "primaryInjury": primary_injury,
        "sourceId": source_id,
        "rightsSnapshot": json.loads(rights_snapshot),
        "fetchedAt": now,
    }


def build_upsert_sql(rows):
    if not rows:
        return ""

    VALUES_TEMPLATE = (
        "('{id}', (SELECT p.id FROM players p WHERE p.id = '{playerId}'), '{gsisId}', '{playerName}', {season}, {week}, "
        "'{team}', '{position}', '{reportStatus}', '{practiceStatus}', "
        "'{primaryInjury}', '{sourceId}', '{rightsSnapshot}'::jsonb, '{fetchedAt}')"
    )

    value_lines = []
    for row in rows:
        def sq(s):
            return str(s).replace("'", "''") if s else ""

        line = VALUES_TEMPLATE.format(
            id=row["id"],
            playerId=sq(row["playerId"]),
            gsisId=sq(row["gsisId"]),
            playerName=sq(row["playerName"]),
            season=row["season"],
            week=row["week"],
            team=sq(row["team"]),
            position=sq(row["position"]),
            reportStatus=sq(row["reportStatus"]),
            practiceStatus=sq(row["practiceStatus"]),
            primaryInjury=sq(row["primaryInjury"]),
            sourceId=sq(row["sourceId"]),
            rightsSnapshot=sq(json.dumps(row["rightsSnapshot"])),
            fetchedAt=sq(row["fetchedAt"]),
        )
        value_lines.append(line)

    value_str = ",\n  ".join(value_lines)

    sql = f"""
INSERT INTO public.injuries
  ("id", "playerId", "gsisId", "playerName", season, week, team, position,
   "reportStatus", "practiceStatus", "primaryInjury", "sourceId", "rightsSnapshot", "fetchedAt")
VALUES
  {value_str}
ON CONFLICT ("id") DO UPDATE SET
  "playerId" = EXCLUDED."playerId",
  "gsisId" = EXCLUDED."gsisId",
  "playerName" = EXCLUDED."playerName",
  season = EXCLUDED.season,
  week = EXCLUDED.week,
  team = EXCLUDED.team,
  position = EXCLUDED.position,
  "reportStatus" = EXCLUDED."reportStatus",
  "practiceStatus" = EXCLUDED."practiceStatus",
  "primaryInjury" = EXCLUDED."primaryInjury",
  "sourceId" = EXCLUDED."sourceId",
  "rightsSnapshot" = EXCLUDED."rightsSnapshot",
  "fetchedAt" = EXCLUDED."fetchedAt"
WHERE public.injuries.week = 10 AND public.injuries."sourceId" = 'espn';
"""
    return sql.strip()


def main():
    data = fetch_espn_injuries()
    all_rows = []

    for team_entry in data['injuries']:
        team_name = team_entry['displayName']
        injuries = team_entry['injuries']
        for inj in injuries:
            row = map_injury(team_name, inj, source_id="espn")
            all_rows.append(row)

    if not all_rows:
        print("No injury data fetched.")
        return

    sql = build_upsert_sql(all_rows)
    if not sql:
        print("No SQL to execute.")
        return

    # Write SQL to file and execute via neon psql -f
    # Avoid Windows command-line length limits
    sql_dir = "C:/Users/Garrett/Sports/scripts/ops"
    sql_file = "C:/Users/Garrett/Sports/scripts/ops/ingest_week10_injuries.sql"
    with open(sql_file, "w") as f:
        f.write(sql)

    cmd = f'{NEON_CMD} -- -f "{sql_file}"'
    import subprocess
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    combined = (result.stdout or "") + (result.stderr or "")
    if result.returncode != 0 or "ERROR:" in combined:
        print(f"FAILED executing SQL (rc={result.returncode}):")
        print(combined[-4000:])
        raise SystemExit(1)
    print(f"Success: {result.stdout}")

    # Summary
    team_counts = {}
    for row in all_rows:
        t = row["team"]
        team_counts[t] = team_counts.get(t, 0) + 1

    print(f"\n=== Summary ===")
    print(f"Total rows: {len(all_rows)}")
    print(f"Teams with data: {len(team_counts)}")
    for t in sorted(team_counts.keys()):
        print(f"  {t}: {team_counts[t]} injuries")
    print(f"\nScript path: C:/Users/Garrett/Sports/scripts/ops/ingest_week10_injuries.py")
    print(f"SQL file: {sql_file}")


if __name__ == "__main__":
    main()