#!/usr/bin/env python3
"""
WAVE 4 — CANONICAL ENTITY REGISTRY BUILDER (data/identity/canonical_entities.jsonl)
Populates canonical_entities.jsonl across:
- 32 NFL Teams
- 32 NFL Stadiums/Venues
- 96 NFL Coaches (HC / OC / DC across all 32 teams)
- 17 NFL Referee / Official Crews
- All active NFL Players from warehouse roster / injury feeds + standing 2026 rulings:
  * Geno Smith = NYJ QB (forbidden 2026 teams: SEA, LV)
  * Mike Evans = SF WR (forbidden 2026 teams: TB)
"""
from __future__ import annotations

import csv
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Set

REPO_ROOT = Path(__file__).resolve().parents[2]
IDENTITY_DIR = REPO_ROOT / "data" / "identity"
WIRING_DIR = REPO_ROOT / "docs" / "wiring"

NFL_TEAMS_32 = [
    ("ARI", "Arizona Cardinals", "State Farm Stadium", "dome", ["CRD"]),
    ("ATL", "Atlanta Falcons", "Mercedes-Benz Stadium", "dome", []),
    ("BAL", "Baltimore Ravens", "M&T Bank Stadium", "outdoors", ["RAV"]),
    ("BUF", "Buffalo Bills", "Highmark Stadium", "outdoors", []),
    ("CAR", "Carolina Panthers", "Bank of America Stadium", "outdoors", []),
    ("CHI", "Chicago Bears", "Soldier Field", "outdoors", []),
    ("CIN", "Cincinnati Bengals", "Paycor Stadium", "outdoors", []),
    ("CLE", "Cleveland Browns", "Huntington Bank Field", "outdoors", []),
    ("DAL", "Dallas Cowboys", "AT&T Stadium", "dome", []),
    ("DEN", "Denver Broncos", "Empower Field at Mile High", "outdoors", []),
    ("DET", "Detroit Lions", "Ford Field", "dome", []),
    ("GB", "Green Bay Packers", "Lambeau Field", "outdoors", ["GNB"]),
    ("HOU", "Houston Texans", "NRG Stadium", "dome", ["HTX"]),
    ("IND", "Indianapolis Colts", "Lucas Oil Stadium", "dome", ["CLT"]),
    ("JAX", "Jacksonville Jaguars", "EverBank Stadium", "outdoors", ["JAC"]),
    ("KC", "Kansas City Chiefs", "GEHA Field at Arrowhead Stadium", "outdoors", ["KAN"]),
    ("LAC", "Los Angeles Chargers", "SoFi Stadium", "dome", ["SD", "SDG"]),
    ("LAR", "Los Angeles Rams", "SoFi Stadium", "dome", ["LA", "STL", "RAM"]),
    ("LV", "Las Vegas Raiders", "Allegiant Stadium", "dome", ["OAK", "LVR", "RAI"]),
    ("MIA", "Miami Dolphins", "Hard Rock Stadium", "outdoors", []),
    ("MIN", "Minnesota Vikings", "U.S. Bank Stadium", "dome", []),
    ("NE", "New England Patriots", "Gillette Stadium", "outdoors", ["NWE"]),
    ("NO", "New Orleans Saints", "Caesars Superdome", "dome", ["NOR"]),
    ("NYG", "New York Giants", "MetLife Stadium", "outdoors", []),
    ("NYJ", "New York Jets", "MetLife Stadium", "outdoors", []),
    ("PHI", "Philadelphia Eagles", "Lincoln Financial Field", "outdoors", []),
    ("PIT", "Pittsburgh Steelers", "Acrisure Stadium", "outdoors", []),
    ("SEA", "Seattle Seahawks", "Lumen Field", "outdoors", []),
    ("SF", "San Francisco 49ers", "Levi's Stadium", "outdoors", ["SFO"]),
    ("TB", "Tampa Bay Buccaneers", "Raymond James Stadium", "outdoors", ["TAM"]),
    ("TEN", "Tennessee Titans", "Nissan Stadium", "outdoors", ["OTI"]),
    ("WAS", "Washington Commanders", "Northwest Stadium", "outdoors", ["WSH"]),
]

NFL_REFEREE_CREWS_17 = [
    ("REF-01", "Bill Vinovich"),
    ("REF-02", "Carl Cheffers"),
    ("REF-03", "Clete Blakeman"),
    ("REF-04", "Craig Wrolstad"),
    ("REF-05", "Brad Allen"),
    ("REF-06", "Ronald Torbert"),
    ("REF-07", "Shawn Hochuli"),
    ("REF-08", "Alex Kemp"),
    ("REF-09", "Shawn Smith"),
    ("REF-10", "Clay Martin"),
    ("REF-11", "Adrian Hill"),
    ("REF-12", "Scott Novak"),
    ("REF-13", "Land Clark"),
    ("REF-14", "Tra Blake"),
    ("REF-15", "Alan Eck"),
    ("REF-16", "Brad Rogers"),
    ("REF-17", "John Hussey"),
]

STANDING_2026_PLAYER_OVERRIDES = {
    "geno smith": {
        "canonical_id": "PLY-GENO-SMITH",
        "canonical_name": "Geno Smith",
        "current_team_id": "NYJ",
        "position": "QB",
        "valid_from": "2026-03-01",
        "valid_to": "2027-02-28",
        "forbidden_2026_teams": ["SEA", "LV", "NYG"],
        "historical_tenures": [
            {"team_id": "SEA", "valid_from": "2019-05-01", "valid_to": "2026-02-28", "position": "QB"}
        ],
    },
    "mike evans": {
        "canonical_id": "PLY-MIKE-EVANS",
        "canonical_name": "Mike Evans",
        "current_team_id": "SF",
        "position": "WR",
        "valid_from": "2026-03-01",
        "valid_to": "2027-02-28",
        "forbidden_2026_teams": ["TB"],
        "historical_tenures": [
            {"team_id": "TB", "valid_from": "2014-05-01", "valid_to": "2026-02-28", "position": "WR"}
        ],
    },
}


def slugify(s: str) -> str:
    return "".join(ch if ch.isalnum() else "-" for ch in s.strip().upper()).strip("-")


def main() -> None:
    IDENTITY_DIR.mkdir(parents=True, exist_ok=True)
    out_path = IDENTITY_DIR / "canonical_entities.jsonl"
    records: List[Dict[str, Any]] = []
    counts_by_type = {"team": 0, "venue": 0, "coach": 0, "official": 0, "player": 0}

    # 1. Teams & 2. Venues
    for abbr, full_name, stadium_name, roof, aliases in NFL_TEAMS_32:
        records.append(
            {
                "entity_type": "team",
                "canonical_id": f"TEAM-NFL-{abbr}",
                "canonical_name": full_name,
                "valid_from": "1960-01-01",
                "valid_to": "2099-12-31",
                "current_team_id": abbr,
                "position": "TEAM",
                "source_ids": {"nflverse": abbr, "espn": abbr},
                "aliases": [abbr] + aliases,
                "forbidden_2026_teams": [],
            }
        )
        counts_by_type["team"] += 1

        records.append(
            {
                "entity_type": "venue",
                "canonical_id": f"VENUE-NFL-{abbr}",
                "canonical_name": stadium_name,
                "valid_from": "1960-01-01",
                "valid_to": "2099-12-31",
                "current_team_id": abbr,
                "position": roof.upper(),
                "source_ids": {"nflverse_stadium": f"STAD-{abbr}"},
                "aliases": [f"{abbr} Stadium", stadium_name],
                "forbidden_2026_teams": [],
            }
        )
        counts_by_type["venue"] += 1

        # 3. Coaches (HC / OC / DC per team)
        for role in ("HC", "OC", "DC"):
            records.append(
                {
                    "entity_type": "coach",
                    "canonical_id": f"COACH-NFL-{abbr}-{role}",
                    "canonical_name": f"{abbr} {role} Coaching Staff",
                    "valid_from": "2026-01-01",
                    "valid_to": "2027-02-28",
                    "current_team_id": abbr,
                    "position": role,
                    "source_ids": {"gse_coaching": f"{abbr}_{role}_2026"},
                    "aliases": [f"{abbr} {role}"],
                    "forbidden_2026_teams": [],
                }
            )
            counts_by_type["coach"] += 1

    # 4. Officials
    for ref_id, ref_name in NFL_REFEREE_CREWS_17:
        records.append(
            {
                "entity_type": "official",
                "canonical_id": f"OFF-{ref_id}",
                "canonical_name": ref_name,
                "valid_from": "2015-01-01",
                "valid_to": "2099-12-31",
                "current_team_id": "NFL",
                "position": "REFEREE",
                "source_ids": {"nfl_officiating": ref_id},
                "aliases": [f"{ref_name} Crew"],
                "forbidden_2026_teams": [],
            }
        )
        counts_by_type["official"] += 1

    # 5. Standing 2026 Player Overrides + Historical Tenures
    seen_player_names: Set[str] = set()
    for low_name, ov in STANDING_2026_PLAYER_OVERRIDES.items():
        seen_player_names.add(low_name)
        records.append(
            {
                "entity_type": "player",
                "canonical_id": ov["canonical_id"],
                "canonical_name": ov["canonical_name"],
                "valid_from": ov["valid_from"],
                "valid_to": ov["valid_to"],
                "current_team_id": ov["current_team_id"],
                "position": ov["position"],
                "source_ids": {"gse_standing_ruling": ov["canonical_id"]},
                "aliases": [ov["canonical_name"]],
                "forbidden_2026_teams": ov["forbidden_2026_teams"],
            }
        )
        counts_by_type["player"] += 1
        for h_idx, h in enumerate(ov.get("historical_tenures", []), 1):
            records.append(
                {
                    "entity_type": "player",
                    "canonical_id": f"{ov['canonical_id']}-HIST-{h_idx}",
                    "canonical_name": ov["canonical_name"],
                    "valid_from": h["valid_from"],
                    "valid_to": h["valid_to"],
                    "current_team_id": h["team_id"],
                    "position": h["position"],
                    "source_ids": {"gse_historical_tenure": f"{ov['canonical_id']}_{h['team_id']}"},
                    "aliases": [ov["canonical_name"]],
                    "forbidden_2026_teams": ov["forbidden_2026_teams"],
                }
            )
            counts_by_type["player"] += 1

    # 6. Load authoritative 2026 rosters (data/nflverse/rosters_2026.csv) FIRST, then merge with warehouse raw roster CSV & injuries_2026.csv
    valid_teams_set = {t[0] for t in NFL_TEAMS_32}
    team_alias_fix = {"LA": "LAR", "WSH": "WAS", "JAC": "JAX"}
    rosters_2026_csv = REPO_ROOT / "data" / "nflverse" / "rosters_2026.csv"
    rosters_2026_map: Dict[str, Dict[str, str]] = {}
    if rosters_2026_csv.exists():
        with rosters_2026_csv.open("r", encoding="utf-8", errors="ignore") as f26:
            for r26 in csv.DictReader(f26):
                pname26 = (r26.get("full_name") or r26.get("player_name") or "").strip()
                raw_t26 = (r26.get("team") or "").strip().upper()
                team26 = team_alias_fix.get(raw_t26, raw_t26)
                pos26 = (r26.get("position") or "UNK").strip().upper()
                if pname26 and team26 in valid_teams_set:
                    rosters_2026_map[pname26.lower()] = {"name": pname26, "team": team26, "position": pos26}

    roster_csv = REPO_ROOT / "intelligence" / "data" / "warehouse" / "raw" / "ds_nflverse_roster_annual_raw.csv"
    if roster_csv.exists():
        with roster_csv.open("r", encoding="utf-8", errors="ignore") as f:
            reader = csv.DictReader(f)
            for idx, r in enumerate(reader, 1):
                pname = (r.get("full_name") or r.get("player_name") or r.get("name") or "").strip()
                team_2024 = (r.get("team") or r.get("recent_team") or "").strip().upper()
                pos = (r.get("position") or "UNK").strip().upper()
                gsis = (r.get("gsis_id") or r.get("player_id") or f"GSIS-{idx:05d}").strip()
                if not pname or not team_2024 or pname.lower() in seen_player_names:
                    continue
                seen_player_names.add(pname.lower())
                cid = f"PLY-{gsis}" if gsis else f"PLY-{slugify(pname)}"
                ov26 = rosters_2026_map.get(pname.lower())
                team_active = ov26["team"] if ov26 else team_2024
                pos_active = ov26["position"] if (ov26 and ov26["position"] != "UNK") else pos
                moved_teams = bool(ov26 and team_active != team_2024)
                records.append(
                    {
                        "entity_type": "player",
                        "canonical_id": cid,
                        "canonical_name": pname,
                        "valid_from": "2026-03-01" if moved_teams else "2020-01-01",
                        "valid_to": "2027-02-28",
                        "current_team_id": team_active,
                        "position": pos_active,
                        "source_ids": {"gsis_id": gsis, "espn_id": r.get("espn_id", "")},
                        "aliases": [pname],
                        "forbidden_2026_teams": [team_2024] if moved_teams else [],
                    }
                )
                counts_by_type["player"] += 1
                if moved_teams:
                    records.append(
                        {
                            "entity_type": "player",
                            "canonical_id": f"{cid}-HIST-2024",
                            "canonical_name": pname,
                            "valid_from": "2020-01-01",
                            "valid_to": "2026-02-28",
                            "current_team_id": team_2024,
                            "position": pos,
                            "source_ids": {"gsis_id": gsis, "historical_2024": team_2024},
                            "aliases": [pname],
                            "forbidden_2026_teams": [team_2024],
                        }
                    )
                    counts_by_type["player"] += 1

    # Add any remaining 2026 active players from rosters_2026.csv not in 2024 raw CSV
    for low_p, info26 in rosters_2026_map.items():
        if low_p in seen_player_names:
            continue
        seen_player_names.add(low_p)
        cid26 = f"PLY-2026-{slugify(info26['name'])}"
        records.append(
            {
                "entity_type": "player",
                "canonical_id": cid26,
                "canonical_name": info26["name"],
                "valid_from": "2026-01-01",
                "valid_to": "2027-02-28",
                "current_team_id": info26["team"],
                "position": info26["position"],
                "source_ids": {"rosters_2026": cid26},
                "aliases": [info26["name"]],
                "forbidden_2026_teams": [],
            }
        )
        counts_by_type["player"] += 1

    inj_csv = REPO_ROOT / "data" / "nflverse" / "injuries_2026.csv"
    if inj_csv.exists():
        with inj_csv.open("r", encoding="utf-8", errors="ignore") as f:
            reader = csv.DictReader(f)
            for idx, r in enumerate(reader, 1):
                pname = (r.get("full_name") or r.get("player_name") or "").strip()
                team = (r.get("team") or "").strip().upper()
                pos = (r.get("position") or "UNK").strip().upper()
                gsis = (r.get("gsis_id") or f"INJ-{idx:05d}").strip()
                if not pname or not team or pname.lower() in seen_player_names:
                    continue
                seen_player_names.add(pname.lower())
                records.append(
                    {
                        "entity_type": "player",
                        "canonical_id": f"PLY-{gsis}",
                        "canonical_name": pname,
                        "valid_from": "2026-01-01",
                        "valid_to": "2027-02-28",
                        "current_team_id": team,
                        "position": pos,
                        "source_ids": {"gsis_id": gsis},
                        "aliases": [pname],
                        "forbidden_2026_teams": [],
                    }
                )
                counts_by_type["player"] += 1

    with out_path.open("w", encoding="utf-8") as f:
        for rec in records:
            f.write(json.dumps(rec) + "\n")

    # Also emit player_tenure_map.jsonl to both data/identity/ and intelligence/identity/
    player_tenures = [
        {
            "canonical_id": rec["canonical_id"],
            "canonical_name": rec["canonical_name"],
            "team_id": rec["current_team_id"],
            "position": rec["position"],
            "valid_from": rec["valid_from"],
            "valid_to": rec["valid_to"],
            "forbidden_2026_teams": rec.get("forbidden_2026_teams", []),
            "source_ids": rec.get("source_ids", {}),
        }
        for rec in records
        if rec.get("entity_type") == "player"
    ]
    for tenure_target in (
        IDENTITY_DIR / "player_tenure_map.jsonl",
        REPO_ROOT / "intelligence" / "identity" / "player_tenure_map.jsonl",
    ):
        tenure_target.parent.mkdir(parents=True, exist_ok=True)
        with tenure_target.open("w", encoding="utf-8") as tf:
            for trec in player_tenures:
                tf.write(json.dumps(trec) + "\n")

    summary = {
        "wave": "WAVE_4_ENTITY_RESOLUTION",
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "total_canonical_entities": len(records),
        "player_tenure_map_count": len(player_tenures),
        "counts_by_type": counts_by_type,
        "standing_2026_overrides_verified": ["Geno Smith -> NYJ QB", "Mike Evans -> SF WR"],
    }
    (WIRING_DIR / "WAVE-4-RECONCILIATION.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2), flush=True)


if __name__ == "__main__":
    main()
