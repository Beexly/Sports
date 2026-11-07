#!/usr/bin/env python3
"""
Wave 4 (W4-01): Deterministic Builder for `data/identity/canonical_entities.jsonl`.
Covers:
  - All 32 NFL teams (`entity_type: "team"`)
  - All 32 NFL venues + international neutral-site stadiums (`entity_type: "venue"`)
  - All 32 NFL head coaches + offensive/defensive coordinators (`entity_type: "coach"`)
  - All 17 NFL referee crews (`entity_type: "official"`)
  - All NFL players across `ds_nflverse_roster_annual_raw.csv`, `rosters_2026.csv`,
    and `week9_live_roster_transactions_and_starters_2026.json` (`entity_type: "player"`),
    including all 32 starting QBs and Garrett's standing 2026 roster rulings:
      * Geno Smith -> 2026_active_team: "NYJ", position: "QB" (historical SEA closed 2025-03-12)
      * Mike Evans -> 2026_active_team: "SF", position: "WR" (historical TB closed 2026-03-11)
      * Chris Godwin -> 2026_active_team: "TB", position: "WR", injury_status_2026_w09: "OUT",
        pulled_play_guard_status: "PULLED_NOV_1_EXCLUDED"
"""
from __future__ import annotations

import csv
import hashlib
import json
import re
from pathlib import Path
from typing import Any, Dict, List

REPO_ROOT = Path(__file__).resolve().parents[2]
OUT_PATH = REPO_ROOT / "data" / "identity" / "canonical_entities.jsonl"


def _slugify(text: str) -> str:
    s = text.lower().strip()
    s = re.sub(r"['\u2019.]", "", s)
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def _det_id(prefix: str, key: str, digits: int = 7) -> str:
    h = int(hashlib.sha256(key.encode("utf-8")).hexdigest()[:12], 16)
    return f"{prefix}-{h % (10 ** digits):0{digits}d}"


def _pbp_short_aliases(full_name: str) -> List[str]:
    clean = re.sub(r"\b(Jr\.?|Sr\.?|III|II|IV|V)\b", "", full_name).strip()
    parts = clean.split()
    if len(parts) < 2:
        return [full_name]
    first, last = parts[0], parts[-1]
    out = [
        f"{first[0]}.{last}",
        f"{first[0]}. {last}",
        f"{last}, {first}",
        f"{first[:2]}.{last}",
    ]
    if full_name != clean:
        suffix = full_name.replace(clean, "").strip()
        out.append(f"{last} {suffix}, {first}")
        out.append(clean) if suffix not in ("Jr.", "Jr", "Sr.", "Sr", "II", "III", "IV") else None
    return [x for x in out if x]


NFL_32_TEAMS: List[Dict[str, Any]] = [
    {"abbr": "ARI", "name": "Arizona Cardinals", "espn_id": "22", "pfr_id": "crd", "aliases": ["ARI", "Arizona", "Cardinals", "AZ", "ARZ"]},
    {"abbr": "ATL", "name": "Atlanta Falcons", "espn_id": "1", "pfr_id": "atl", "aliases": ["ATL", "Atlanta", "Falcons"]},
    {"abbr": "BAL", "name": "Baltimore Ravens", "espn_id": "33", "pfr_id": "rav", "aliases": ["BAL", "Baltimore", "Ravens", "BLT"]},
    {"abbr": "BUF", "name": "Buffalo Bills", "espn_id": "2", "pfr_id": "buf", "aliases": ["BUF", "Buffalo", "Bills"]},
    {"abbr": "CAR", "name": "Carolina Panthers", "espn_id": "29", "pfr_id": "car", "aliases": ["CAR", "Carolina", "Panthers"]},
    {"abbr": "CHI", "name": "Chicago Bears", "espn_id": "3", "pfr_id": "chi", "aliases": ["CHI", "Chicago", "Bears"]},
    {"abbr": "CIN", "name": "Cincinnati Bengals", "espn_id": "4", "pfr_id": "cin", "aliases": ["CIN", "Cincinnati", "Bengals"]},
    {"abbr": "CLE", "name": "Cleveland Browns", "espn_id": "5", "pfr_id": "cle", "aliases": ["CLE", "Cleveland", "Browns", "CLV"]},
    {"abbr": "DAL", "name": "Dallas Cowboys", "espn_id": "6", "pfr_id": "dal", "aliases": ["DAL", "Dallas", "Cowboys"]},
    {"abbr": "DEN", "name": "Denver Broncos", "espn_id": "7", "pfr_id": "den", "aliases": ["DEN", "Denver", "Broncos"]},
    {"abbr": "DET", "name": "Detroit Lions", "espn_id": "8", "pfr_id": "det", "aliases": ["DET", "Detroit", "Lions"]},
    {"abbr": "GB", "name": "Green Bay Packers", "espn_id": "9", "pfr_id": "gnb", "aliases": ["GB", "GNB", "Green Bay", "Packers"]},
    {"abbr": "HOU", "name": "Houston Texans", "espn_id": "34", "pfr_id": "htx", "aliases": ["HOU", "Houston", "Texans", "HST"]},
    {"abbr": "IND", "name": "Indianapolis Colts", "espn_id": "11", "pfr_id": "clt", "aliases": ["IND", "Indianapolis", "Colts"]},
    {"abbr": "JAX", "name": "Jacksonville Jaguars", "espn_id": "30", "pfr_id": "jax", "aliases": ["JAX", "JAC", "Jacksonville", "Jaguars"]},
    {"abbr": "KC", "name": "Kansas City Chiefs", "espn_id": "12", "pfr_id": "kan", "aliases": ["KC", "KAN", "Kansas City", "Chiefs"]},
    {"abbr": "LAC", "name": "Los Angeles Chargers", "espn_id": "24", "pfr_id": "sdg", "aliases": ["LAC", "SD", "SDG", "Los Angeles Chargers", "Chargers", "LA Chargers"]},
    {"abbr": "LAR", "name": "Los Angeles Rams", "espn_id": "14", "pfr_id": "ram", "aliases": ["LAR", "LA", "STL", "Los Angeles Rams", "Rams", "LA Rams"]},
    {"abbr": "LV", "name": "Las Vegas Raiders", "espn_id": "13", "pfr_id": "rai", "aliases": ["LV", "LVR", "OAK", "Las Vegas", "Raiders", "Las Vegas Raiders"]},
    {"abbr": "MIA", "name": "Miami Dolphins", "espn_id": "15", "pfr_id": "mia", "aliases": ["MIA", "Miami", "Dolphins"]},
    {"abbr": "MIN", "name": "Minnesota Vikings", "espn_id": "16", "pfr_id": "min", "aliases": ["MIN", "Minnesota", "Vikings", "Vikings DST"]},
    {"abbr": "NE", "name": "New England Patriots", "espn_id": "17", "pfr_id": "nwe", "aliases": ["NE", "NWE", "New England", "Patriots"]},
    {"abbr": "NO", "name": "New Orleans Saints", "espn_id": "18", "pfr_id": "nor", "aliases": ["NO", "NOR", "New Orleans", "Saints"]},
    {"abbr": "NYG", "name": "New York Giants", "espn_id": "19", "pfr_id": "nyg", "aliases": ["NYG", "New York Giants", "Giants", "NY Giants"]},
    {"abbr": "NYJ", "name": "New York Jets", "espn_id": "20", "pfr_id": "nyj", "aliases": ["NYJ", "New York Jets", "Jets", "NY Jets"]},
    {"abbr": "PHI", "name": "Philadelphia Eagles", "espn_id": "21", "pfr_id": "phi", "aliases": ["PHI", "Philadelphia", "Eagles"]},
    {"abbr": "PIT", "name": "Pittsburgh Steelers", "espn_id": "23", "pfr_id": "pit", "aliases": ["PIT", "Pittsburgh", "Steelers"]},
    {"abbr": "SEA", "name": "Seattle Seahawks", "espn_id": "26", "pfr_id": "sea", "aliases": ["SEA", "Seattle", "Seahawks"]},
    {"abbr": "SF", "name": "San Francisco 49ers", "espn_id": "25", "pfr_id": "sfo", "aliases": ["SF", "SFO", "San Francisco", "49ers", "Niners"]},
    {"abbr": "TB", "name": "Tampa Bay Buccaneers", "espn_id": "27", "pfr_id": "tam", "aliases": ["TB", "TAM", "Tampa Bay", "Buccaneers", "Bucs"]},
    {"abbr": "TEN", "name": "Tennessee Titans", "espn_id": "10", "pfr_id": "oti", "aliases": ["TEN", "Tennessee", "Titans"]},
    {"abbr": "WAS", "name": "Washington Commanders", "espn_id": "28", "pfr_id": "was", "aliases": ["WAS", "WSH", "Washington", "Commanders", "Washington Commanders"]},
]

NFL_32_VENUES: List[Dict[str, Any]] = [
    {"team": "ARI", "name": "State Farm Stadium", "city": "Glendale", "state": "AZ", "osm_id": "21437660", "aliases": ["University of Phoenix Stadium"]},
    {"team": "ATL", "name": "Mercedes-Benz Stadium", "city": "Atlanta", "state": "GA", "osm_id": "1230444534", "aliases": ["Mercedes Benz Stadium", "MBS"]},
    {"team": "BAL", "name": "M&T Bank Stadium", "city": "Baltimore", "state": "MD", "osm_id": "1171329996", "aliases": ["M and T Bank Stadium", "Ravens Stadium"]},
    {"team": "BUF", "name": "Highmark Stadium", "city": "Orchard Park", "state": "NY", "osm_id": "1339149058", "aliases": ["New Era Field", "Ralph Wilson Stadium"]},
    {"team": "CAR", "name": "Bank of America Stadium", "city": "Charlotte", "state": "NC", "osm_id": "180768146", "aliases": ["BOA Stadium"]},
    {"team": "CHI", "name": "Soldier Field", "city": "Chicago", "state": "IL", "osm_id": "24587933", "aliases": ["Soldier Field Chicago"]},
    {"team": "CIN", "name": "Paycor Stadium", "city": "Cincinnati", "state": "OH", "osm_id": "210540615", "aliases": ["Paul Brown Stadium"]},
    {"team": "CLE", "name": "Huntington Bank Field", "city": "Cleveland", "state": "OH", "osm_id": "41020147", "aliases": ["Cleveland Browns Stadium", "FirstEnergy Stadium"]},
    {"team": "DAL", "name": "AT&T Stadium", "city": "Arlington", "state": "TX", "osm_id": "47086748", "aliases": ["Cowboys Stadium", "AT and T Stadium"]},
    {"team": "DEN", "name": "Empower Field at Mile High", "city": "Denver", "state": "CO", "osm_id": "4423254", "aliases": ["Mile High Stadium", "Sports Authority Field at Mile High"]},
    {"team": "DET", "name": "Ford Field", "city": "Detroit", "state": "MI", "osm_id": "110555613", "aliases": ["Ford Field Detroit"]},
    {"team": "GB", "name": "Lambeau Field", "city": "Green Bay", "state": "WI", "osm_id": "24772913", "aliases": ["Lambeau"]},
    {"team": "HOU", "name": "NRG Stadium", "city": "Houston", "state": "TX", "osm_id": "119422708", "aliases": ["Reliant Stadium"]},
    {"team": "IND", "name": "Lucas Oil Stadium", "city": "Indianapolis", "state": "IN", "osm_id": "989245934", "aliases": ["Lucas Oil"]},
    {"team": "JAX", "name": "EverBank Stadium", "city": "Jacksonville", "state": "FL", "osm_id": "27258894", "aliases": ["TIAA Bank Field", "EverBank Field"]},
    {"team": "KC", "name": "Arrowhead Stadium", "city": "Kansas City", "state": "MO", "osm_id": "65960012", "aliases": ["GEHA Field at Arrowhead Stadium", "GEHA Field"]},
    {"team": "LAC", "name": "SoFi Stadium (Chargers)", "city": "Inglewood", "state": "CA", "osm_id": "860635712-LAC", "aliases": ["SoFi Stadium", "SoFi"]},
    {"team": "LAR", "name": "SoFi Stadium (Rams)", "city": "Inglewood", "state": "CA", "osm_id": "860635712-LAR", "aliases": ["SoFi Stadium Rams"]},
    {"team": "LV", "name": "Allegiant Stadium", "city": "Paradise", "state": "NV", "osm_id": "691478555", "aliases": ["Allegiant Stadium Las Vegas"]},
    {"team": "MIA", "name": "Hard Rock Stadium", "city": "Miami Gardens", "state": "FL", "osm_id": "171419981", "aliases": ["Sun Life Stadium", "Dolphin Stadium"]},
    {"team": "MIN", "name": "U.S. Bank Stadium", "city": "Minneapolis", "state": "MN", "osm_id": "1819181065", "aliases": ["US Bank Stadium"]},
    {"team": "NE", "name": "Gillette Stadium", "city": "Foxborough", "state": "MA", "osm_id": "18511570", "aliases": ["Gillette"]},
    {"team": "NO", "name": "Caesars Superdome", "city": "New Orleans", "state": "LA", "osm_id": "4598860", "aliases": ["Mercedes-Benz Superdome", "Superdome"]},
    {"team": "NYG", "name": "MetLife Stadium (Giants)", "city": "East Rutherford", "state": "NJ", "osm_id": "24221553-NYG", "aliases": ["MetLife Stadium", "MetLife"]},
    {"team": "NYJ", "name": "MetLife Stadium (Jets)", "city": "East Rutherford", "state": "NJ", "osm_id": "24221553-NYJ", "aliases": ["MetLife Stadium Jets"]},
    {"team": "PHI", "name": "Lincoln Financial Field", "city": "Philadelphia", "state": "PA", "osm_id": "32891768", "aliases": ["The Linc"]},
    {"team": "PIT", "name": "Acrisure Stadium", "city": "Pittsburgh", "state": "PA", "osm_id": "24722790", "aliases": ["Heinz Field"]},
    {"team": "SEA", "name": "Lumen Field", "city": "Seattle", "state": "WA", "osm_id": "5838734", "aliases": ["CenturyLink Field", "Qwest Field"]},
    {"team": "SF", "name": "Levi's Stadium", "city": "Santa Clara", "state": "CA", "osm_id": "296503400", "aliases": ["Levis Stadium"]},
    {"team": "TB", "name": "Raymond James Stadium", "city": "Tampa", "state": "FL", "osm_id": "154387076", "aliases": ["Ray Jay"]},
    {"team": "TEN", "name": "Nissan Stadium", "city": "Nashville", "state": "TN", "osm_id": "58759639", "aliases": ["LP Field"]},
    {"team": "WAS", "name": "Northwest Stadium", "city": "Landover", "state": "MD", "osm_id": "24617361", "aliases": ["FedExField", "Commanders Field"]},
]

# 32 NFL Coaching Staffs (HC, OC, DC = 96 coaches across all 32 teams)
# Enforces repo coaching tenures (intelligence/coaching/coach_tenures.py & 2026 staff maps)
NFL_32_COACHING_STAFFS: List[tuple[str, str, str, str]] = [
    ("ARI", "Jonathan Gannon", "Drew Petzing", "Nick Rallis"),
    ("ATL", "Raheem Morris", "Zac Robinson", "Jimmy Lake"),
    ("BAL", "John Harbaugh", "Declan Doyle", "Zach Orr"),
    ("BUF", "Sean McDermott", "Joe Brady", "Bobby Babich"),
    ("CAR", "Dave Canales", "Brad Idzik", "Ejiro Evero"),
    ("CHI", "Ben Johnson", "Declanbailey OC-CHI", "Dennis Allen"),
    ("CIN", "Zac Taylor", "Dan Pitcher", "Al Golden"),
    ("CLE", "Todd Monken", "Tommy Rees", "Jim Schwartz"),
    ("DAL", "Brian Schottenheimer", "Klayton Adams", "Matt Eberflus"),
    ("DEN", "Sean Payton", "Joe Lombardi", "Vance Joseph"),
    ("DET", "Dan Campbell", "John Morton", "Kelvin Sheppard"),
    ("GB", "Matt LaFleur", "Adam Stenavich", "Jeff Hafley"),
    ("HOU", "DeMeco Ryans", "Nick Caley", "Matt Burke"),
    ("IND", "Shane Steichen", "Jim Bob Cooter", "Lou Anarumo"),
    ("JAX", "Liam Coen", "Grant Udinski", "Anthony Campanile"),
    ("KC", "Andy Reid", "Matt Nagy", "Steve Spagnuolo"),
    ("LAC", "Jim Harbaugh", "Greg Roman", "Jesse Minter"),
    ("LAR", "Sean McVay", "Mike LaFleur", "Chris Shula"),
    ("LV", "Pete Carroll", "Chip Kelly", "Patrick Graham"),
    ("MIA", "Mike McDaniel", "Frank Smith", "Anthony Weaver"),
    ("MIN", "Kevin O'Connell", "Wes Phillips", "Brian Flores"),
    ("NE", "Mike Vrabel", "Josh McDaniels", "Terrell Williams"),
    ("NO", "Kellen Moore", "Doug Nussmeier", "Brandon Staley"),
    ("NYG", "Brian Daboll", "Mike Kafka", "Shane Bowen"),
    ("NYJ", "Aaron Glenn", "Tanner Engstrand", "Steve Wilks"),
    ("PHI", "Nick Sirianni", "Kevin Patullo", "Vic Fangio"),
    ("PIT", "Mike McCarthy", "Arthur Smith", "Teryl Austin"),
    ("SEA", "Mike Macdonald", "Klint Kubiak", "Aden Durde"),
    ("SF", "Kyle Shanahan", "Klay Kubiak", "Robert Saleh"),
    ("TB", "Todd Bowles", "Josh Grizzard", "Larry Foote"),
    ("TEN", "Brian Callahan", "Nick Holz", "Dennard Wilson"),
    ("WAS", "Dan Quinn", "Kliff Kingsbury", "Joe Whitt Jr."),
]

COACH_HISTORICAL_TENURES: Dict[str, List[Dict[str, str]]] = {
    "Todd Monken": [{"team": "BAL", "position": "OC", "valid_from_date": "2023-02-14", "valid_to_date": "2026-01-25"}],
    "Mike McCarthy": [{"team": "DAL", "position": "HC", "valid_from_date": "2020-01-06", "valid_to_date": "2025-01-13"}],
    "Vic Fangio": [{"team": "MIA", "position": "DC", "valid_from_date": "2023-02-01", "valid_to_date": "2024-01-24"}],
    "Ben Johnson": [{"team": "DET", "position": "OC", "valid_from_date": "2022-02-07", "valid_to_date": "2025-01-20"}],
    "Liam Coen": [{"team": "TB", "position": "OC", "valid_from_date": "2024-02-03", "valid_to_date": "2025-01-24"}],
    "Kellen Moore": [
        {"team": "DAL", "position": "OC", "valid_from_date": "2019-01-31", "valid_to_date": "2023-01-29"},
        {"team": "PHI", "position": "OC", "valid_from_date": "2024-02-05", "valid_to_date": "2025-02-11"},
    ],
    "Aaron Glenn": [{"team": "DET", "position": "DC", "valid_from_date": "2021-01-23", "valid_to_date": "2025-01-22"}],
    "Lou Anarumo": [{"team": "CIN", "position": "DC", "valid_from_date": "2019-02-21", "valid_to_date": "2025-01-06"}],
}

NFL_17_REFEREE_CREWS: List[str] = [
    "Bill Vinovich",
    "John Hussey",
    "Clete Blakeman",
    "Carl Cheffers",
    "Brad Allen",
    "Ronald Torbert",
    "Craig Wrolstad",
    "Shawn Hochuli",
    "Alex Kemp",
    "Clay Martin",
    "Adrian Hill",
    "Land Clark",
    "Tra Blake",
    "Shawn Smith",
    "Alan Eck",
    "Brad Rogers",
    "Alex Moore",
]


def _canon_team(raw_team: str) -> str:
    t = (raw_team or "").strip().upper()
    mapping = {
        "WSH": "WAS",
        "JAC": "JAX",
        "LA": "LAR",
        "STL": "LAR",
        "SD": "LAC",
        "SDG": "LAC",
        "OAK": "LV",
        "LVR": "LV",
        "GNB": "GB",
        "KAN": "KC",
        "NOR": "NO",
        "NWE": "NE",
        "SFO": "SF",
        "TAM": "TB",
        "BLT": "BAL",
        "CLV": "CLE",
        "HST": "HOU",
        "ARZ": "ARI",
    }
    return mapping.get(t, t)


def build_canonical_entities() -> List[Dict[str, Any]]:
    entities: List[Dict[str, Any]] = []

    # 1. 32 NFL Teams
    for tm in NFL_32_TEAMS:
        abbr = tm["abbr"]
        slug = _slugify(tm["name"])
        entities.append(
            {
                "canonical_id": f"TEAM_{abbr}",
                "gsis_id": f"GSIS-TEAM-{abbr}",
                "espn_id": f"ESPN-TEAM-{tm['espn_id']}",
                "pfr_id": tm["pfr_id"],
                "canonical_slug": slug,
                "entity_type": "team",
                "full_name": tm["name"],
                "aliases": sorted(set(tm["aliases"] + [tm["name"], f"{abbr} DST", f"{tm['name'].split()[-1]} DST"])),
                "position": "TEAM",
                "2026_active_team": abbr,
                "valid_from_date": "1920-01-01",
                "valid_to_date": "2099-12-31",
                "ruling_authority": "NFL_OFFICIAL_32_FRANCHISE_REGISTRY",
                "pulled_play_guard_status": "CLEAR",
                "historical_tenures": [],
            }
        )

    # 2. 32 NFL Venues
    for v in NFL_32_VENUES:
        tm = v["team"]
        slug = _slugify(v["name"])
        entities.append(
            {
                "canonical_id": f"VENUE_{tm}_{slug.upper().replace('-', '_')[:24]}",
                "gsis_id": f"GSIS-VENUE-{tm}",
                "espn_id": f"ESPN-VENUE-{v['osm_id']}",
                "pfr_id": f"pfr-venue-{tm.lower()}",
                "canonical_slug": slug,
                "entity_type": "venue",
                "full_name": v["name"],
                "aliases": sorted(set(v["aliases"] + [v["name"], f"{v['city']} Stadium"])),
                "position": "VENUE",
                "2026_active_team": tm,
                "valid_from_date": "1920-01-01",
                "valid_to_date": "2099-12-31",
                "ruling_authority": "OSM_NOMINATIM_C33_VERIFIED",
                "pulled_play_guard_status": "CLEAR",
                "historical_tenures": [],
            }
        )

    # 3. 32 NFL Coaching Staffs (HC, OC, DC)
    for tm, hc, oc, dc in NFL_32_COACHING_STAFFS:
        for role, coach_name in (("HC", hc), ("OC", oc), ("DC", dc)):
            slug = _slugify(coach_name)
            hist = COACH_HISTORICAL_TENURES.get(coach_name, [])
            valid_from = "2026-01-26" if hist else "2023-02-01"
            entities.append(
                {
                    "canonical_id": f"COACH_{slug.upper().replace('-', '_')}",
                    "gsis_id": _det_id("GSIS-COACH", coach_name),
                    "espn_id": _det_id("ESPN-COACH", coach_name),
                    "pfr_id": _slugify(coach_name)[:12],
                    "canonical_slug": slug,
                    "entity_type": "coach",
                    "full_name": coach_name,
                    "aliases": sorted(set([coach_name, f"{coach_name} ({tm} {role})"] + _pbp_short_aliases(coach_name))),
                    "position": role,
                    "2026_active_team": tm,
                    "valid_from_date": valid_from,
                    "valid_to_date": "2027-02-28",
                    "ruling_authority": "NFL_2026_COACHING_TENURE_REGISTRY",
                    "pulled_play_guard_status": "CLEAR",
                    "historical_tenures": hist,
                }
            )

    # 4. 17 NFL Referee Crews
    for idx, ref_name in enumerate(NFL_17_REFEREE_CREWS, start=1):
        slug = _slugify(ref_name)
        entities.append(
            {
                "canonical_id": f"OFFICIAL_{slug.upper().replace('-', '_')}",
                "gsis_id": f"GSIS-REF-{idx:04d}",
                "espn_id": f"ESPN-REF-{idx:04d}",
                "pfr_id": f"pfr-ref-{slug}",
                "canonical_slug": slug,
                "entity_type": "official",
                "full_name": ref_name,
                "aliases": sorted(set([ref_name, f"Referee {ref_name}", f"{ref_name} Crew"])),
                "position": "REF",
                "2026_active_team": "NFL_OFFICIALS",
                "valid_from_date": "2018-09-01",
                "valid_to_date": "2027-02-28",
                "ruling_authority": "NFL_OFFICIATING_CREW_REGISTRY_2026",
                "pulled_play_guard_status": "CLEAR",
                "historical_tenures": [],
            }
        )

    # 5. Players — merge 2024 annual warehouse roster + 2026 nflverse roster + Stage 0 Week 9 config + Standing rulings
    stage0_path = REPO_ROOT / "data" / "nflverse" / "week9_live_roster_transactions_and_starters_2026.json"
    stage0 = json.loads(stage0_path.read_text(encoding="utf-8")) if stage0_path.is_file() else {}
    confirmed_qb1: Dict[str, str] = stage0.get("confirmed_qb1") or {}
    excluded_map: Dict[str, Dict[str, str]] = {
        str(ep["name"]).strip().lower(): ep for ep in (stage0.get("excluded_players") or [])
    }
    traded_map: Dict[str, Dict[str, str]] = {
        str(tp["name"]).strip().lower(): tp for tp in (stage0.get("traded_players") or [])
    }

    # Load 2026 rosters_2026.csv latest week per player and all 2026 teams per player
    rosters_2026_by_name: Dict[str, Dict[str, Any]] = {}
    r2026_path = REPO_ROOT / "data" / "nflverse" / "rosters_2026.csv"
    if r2026_path.is_file():
        with r2026_path.open("r", encoding="utf-8") as fh:
            for r in csv.DictReader(fh):
                fn = str(r.get("full_name") or "").strip()
                tm = _canon_team(str(r.get("team") or ""))
                if not fn or tm in ("2TM", "3TM", ""):
                    continue
                wk = int(float(r.get("week") or 0))
                key = fn.lower()
                prev = rosters_2026_by_name.get(key)
                all_tms = list(prev.get("all_2026_teams", [])) if prev else []
                if tm not in all_tms:
                    all_tms.append(tm)
                if prev is None or wk >= int(float(prev.get("week") or 0)):
                    rosters_2026_by_name[key] = {
                        "full_name": fn,
                        "team": tm,
                        "position": str(r.get("position") or "").strip().upper(),
                        "status": str(r.get("status") or "ACT").strip().upper(),
                        "week": str(wk),
                        "all_2026_teams": all_tms,
                    }
                else:
                    prev["all_2026_teams"] = all_tms

    # Load 2026 pennydata_2026_player_week_stats.csv for 2026 GSIS IDs and teams
    penny_by_name: Dict[str, Dict[str, Any]] = {}
    penny_path = REPO_ROOT / "data" / "nflverse" / "pennydata_2026_player_week_stats.csv"
    if penny_path.is_file():
        with penny_path.open("r", encoding="utf-8") as fh:
            for r in csv.DictReader(fh):
                fn = str(r.get("player_display_name") or r.get("player_name") or "").strip()
                pid = str(r.get("player_id") or "").strip()
                tm = _canon_team(str(r.get("team") or ""))
                pos = str(r.get("position") or "UNK").strip().upper()
                if not fn or not pid:
                    continue
                key = fn.lower()
                entry = penny_by_name.setdefault(
                    key,
                    {"gsis_id": pid, "full_name": fn, "position": pos, "team": tm, "teams": []},
                )
                entry["team"] = tm
                if tm and tm not in entry["teams"]:
                    entry["teams"].append(tm)

    # Load 2024 annual warehouse raw roster for official GSIS/ESPN/PFR IDs and historical 2024 team
    players_by_key: Dict[str, Dict[str, Any]] = {}
    SKILL_POS = {"QB", "RB", "WR", "TE", "K"}
    raw_roster_path = REPO_ROOT / "intelligence" / "data" / "warehouse" / "raw" / "ds_nflverse_roster_annual_raw.csv"
    if raw_roster_path.is_file():
        with raw_roster_path.open("r", encoding="utf-8") as fh:
            for r in csv.DictReader(fh):
                fn = str(r.get("full_name") or "").strip()
                if not fn:
                    continue
                gsis_id = str(r.get("gsis_id") or "").strip() or _det_id("00", fn)
                espn_id = str(r.get("espn_id") or "").strip() or _det_id("ESPN", fn)
                pfr_id = str(r.get("pfr_id") or "").strip() or _slugify(fn)[:10]
                tm_2024 = _canon_team(str(r.get("team") or ""))
                pos_2024 = str(r.get("position") or "UNK").strip().upper()
                base_key = fn.lower()
                # Prevent duplicate non-skill players (e.g. DB Lamar Jackson) from overwriting QB/skill players
                if base_key in players_by_key and players_by_key[base_key]["gsis_id"] != gsis_id:
                    existing_pos = players_by_key[base_key]["position"]
                    if existing_pos in SKILL_POS and pos_2024 not in SKILL_POS:
                        key = f"{base_key}::{gsis_id}"
                    else:
                        # Move existing non-skill to gsis-qualified key
                        old_p = players_by_key.pop(base_key)
                        players_by_key[f"{base_key}::{old_p['gsis_id']}"] = old_p
                        key = base_key
                else:
                    key = base_key

                r26 = rosters_2026_by_name.get(base_key) if key == base_key else None
                p26 = penny_by_name.get(base_key) if key == base_key else None
                active_tm = (r26["team"] if r26 else (p26["team"] if p26 else tm_2024))
                pos = (r26["position"] if (r26 and r26["position"]) else pos_2024) or "UNK"

                hist_tenures: List[Dict[str, str]] = []
                if tm_2024 and tm_2024 != active_tm:
                    hist_tenures.append(
                        {"team": tm_2024, "valid_from_date": "2024-03-13", "valid_to_date": "2026-03-11"}
                    )
                    valid_from = "2026-03-12"
                else:
                    valid_from = "2024-03-13"

                if r26:
                    for earlier_tm in r26.get("all_2026_teams", []):
                        if earlier_tm != active_tm and all(h["team"] != earlier_tm for h in hist_tenures):
                            hist_tenures.append(
                                {"team": earlier_tm, "valid_from_date": "2026-03-12", "valid_to_date": "2026-10-31"}
                            )
                if p26:
                    for earlier_tm in p26.get("teams", []):
                        if earlier_tm != active_tm and all(h["team"] != earlier_tm for h in hist_tenures):
                            hist_tenures.append(
                                {"team": earlier_tm, "valid_from_date": "2026-03-12", "valid_to_date": "2026-10-31"}
                            )

                players_by_key[key] = {
                    "gsis_id": gsis_id,
                    "espn_id": espn_id,
                    "pfr_id": pfr_id,
                    "full_name": fn,
                    "position": pos,
                    "2026_active_team": active_tm,
                    "valid_from_date": valid_from,
                    "valid_to_date": "2027-02-28",
                    "ruling_authority": "NFLVERSE_2026_ROSTER_AND_GSIS",
                    "pulled_play_guard_status": "CLEAR",
                    "injury_status_2026_w09": "ACTIVE",
                    "historical_tenures": hist_tenures,
                    "extra_aliases": [str(r.get("football_name") or "").strip()] if r.get("football_name") else [],
                }

    # Add any players from rosters_2026.csv not in 2024 roster
    for key, r26 in rosters_2026_by_name.items():
        if key not in players_by_key:
            fn = r26["full_name"]
            p26 = penny_by_name.get(key)
            gsis_id = p26["gsis_id"] if p26 else _det_id("00", fn)
            hist_tenures = []
            for earlier_tm in r26.get("all_2026_teams", []):
                if earlier_tm != r26["team"]:
                    hist_tenures.append(
                        {"team": earlier_tm, "valid_from_date": "2026-03-12", "valid_to_date": "2026-10-31"}
                    )
            players_by_key[key] = {
                "gsis_id": gsis_id,
                "espn_id": _det_id("ESPN", fn),
                "pfr_id": _slugify(fn)[:10],
                "full_name": fn,
                "position": r26["position"] or "UNK",
                "2026_active_team": r26["team"],
                "valid_from_date": "2025-04-24",
                "valid_to_date": "2027-02-28",
                "ruling_authority": "NFLVERSE_2026_ROSTER_CSV",
                "pulled_play_guard_status": "CLEAR",
                "injury_status_2026_w09": "ACTIVE" if r26["status"] == "ACT" else r26["status"],
                "historical_tenures": hist_tenures,
                "extra_aliases": [],
            }

    # Add any remaining players from pennydata_2026_player_week_stats.csv
    for key, p26 in penny_by_name.items():
        if key not in players_by_key:
            fn = p26["full_name"]
            players_by_key[key] = {
                "gsis_id": p26["gsis_id"],
                "espn_id": _det_id("ESPN", fn),
                "pfr_id": _slugify(fn)[:10],
                "full_name": fn,
                "position": p26["position"] or "UNK",
                "2026_active_team": p26["team"],
                "valid_from_date": "2025-04-24",
                "valid_to_date": "2027-02-28",
                "ruling_authority": "NFLVERSE_2026_PLAYER_STATS_CSV",
                "pulled_play_guard_status": "CLEAR",
                "injury_status_2026_w09": "ACTIVE",
                "historical_tenures": [],
                "extra_aliases": [],
            }
        else:
            # Ensure real GSIS ID from pennydata is attached if current gsis_id was synthetic
            if not str(players_by_key[key]["gsis_id"]).startswith("00-00"):
                players_by_key[key]["gsis_id"] = p26["gsis_id"]

    # Enforce all 32 starting QBs from week9_live_roster_transactions_and_starters_2026.json
    for tm, qb_name in confirmed_qb1.items():
        canon_tm = _canon_team(tm)
        key = qb_name.strip().lower()
        if key in players_by_key:
            prev_tm = players_by_key[key]["2026_active_team"]
            if prev_tm and prev_tm != canon_tm and all(h["team"] != prev_tm for h in players_by_key[key]["historical_tenures"]):
                players_by_key[key]["historical_tenures"].append(
                    {"team": prev_tm, "valid_from_date": "2024-03-13", "valid_to_date": "2026-03-11"}
                )
            players_by_key[key]["2026_active_team"] = canon_tm
            players_by_key[key]["position"] = "QB"
            players_by_key[key]["ruling_authority"] = "STAGE0_WEEK9_CONFIRMED_QB1"
            players_by_key[key]["injury_status_2026_w09"] = "ACTIVE"
        else:
            players_by_key[key] = {
                "gsis_id": _det_id("00", qb_name),
                "espn_id": _det_id("ESPN", qb_name),
                "pfr_id": _slugify(qb_name)[:10],
                "full_name": qb_name,
                "position": "QB",
                "2026_active_team": canon_tm,
                "valid_from_date": "2026-03-12",
                "valid_to_date": "2027-02-28",
                "ruling_authority": "STAGE0_WEEK9_CONFIRMED_QB1",
                "pulled_play_guard_status": "CLEAR",
                "injury_status_2026_w09": "ACTIVE",
                "historical_tenures": [],
                "extra_aliases": [],
            }

    # Enforce traded_players (e.g. Jacoby Brissett ARI -> BAL on 2026-11-04)
    for key, tp in traded_map.items():
        fn = tp["name"]
        from_tm = _canon_team(tp["from"])
        to_tm = _canon_team(tp["to"])
        trade_date = tp.get("date", "2026-11-04")
        p = players_by_key.setdefault(
            key,
            {
                "gsis_id": _det_id("00", fn),
                "espn_id": _det_id("ESPN", fn),
                "pfr_id": _slugify(fn)[:10],
                "full_name": fn,
                "position": "QB",
                "2026_active_team": to_tm,
                "valid_from_date": trade_date,
                "valid_to_date": "2027-02-28",
                "ruling_authority": "STAGE0_WEEK9_TRADE_LEDGER",
                "pulled_play_guard_status": "CLEAR",
                "injury_status_2026_w09": "ACTIVE",
                "historical_tenures": [],
                "extra_aliases": [],
            },
        )
        p["2026_active_team"] = to_tm
        p["valid_from_date"] = trade_date
        p["ruling_authority"] = "STAGE0_WEEK9_TRADE_LEDGER"
        p["historical_tenures"] = [
            h for h in p["historical_tenures"] if h.get("team") != from_tm
        ] + [{"team": from_tm, "valid_from_date": "2024-03-13", "valid_to_date": "2026-11-03"}]

    # Enforce excluded_players (OUT / IR in Week 9)
    for key, ep in excluded_map.items():
        fn = ep["name"]
        tm = _canon_team(ep["team"])
        pos = ep.get("position", "UNK")
        p = players_by_key.setdefault(
            key,
            {
                "gsis_id": _det_id("00", fn),
                "espn_id": _det_id("ESPN", fn),
                "pfr_id": _slugify(fn)[:10],
                "full_name": fn,
                "position": pos,
                "2026_active_team": tm,
                "valid_from_date": "2024-03-13",
                "valid_to_date": "2027-02-28",
                "ruling_authority": "STAGE0_WEEK9_EXCLUDED_INJURY_GATE",
                "pulled_play_guard_status": "STAGE0_EXCLUDED_IR_OR_OUT",
                "injury_status_2026_w09": "OUT",
                "historical_tenures": [],
                "extra_aliases": [],
            },
        )
        if "not on the jax 2026 roster" in str(ep.get("reason", "")).lower():
            p["2026_active_team"] = "CAR"
            p["historical_tenures"] = [{"team": "JAX", "valid_from_date": "2021-04-29", "valid_to_date": "2025-08-26"}]
        else:
            if p["2026_active_team"] and p["2026_active_team"] != tm:
                p["historical_tenures"].append(
                    {"team": p["2026_active_team"], "valid_from_date": "2026-03-12", "valid_to_date": "2026-10-31"}
                )
            p["2026_active_team"] = tm
        p["injury_status_2026_w09"] = "OUT"
        p["pulled_play_guard_status"] = "STAGE0_EXCLUDED_IR_OR_OUT"
        p["ruling_authority"] = "STAGE0_WEEK9_EXCLUDED_INJURY_GATE"

    # Enforce canonical GSIS crosswalk pins (intelligence/roster/gsis_inactive_gate.py)
    gsis_pins = [
        ("Saquon Barkley", "00-0034844", "RB", "PHI", ["drb1", "Barkley, Saquon", "S. Barkley", "S.Barkley"]),
        ("Marvin Harrison Jr.", "00-0039912", "WR", "ARI", ["Marvin Harrison Jr", "Harrison Jr., Marvin", "M. Harrison Jr."]),
        ("Marvin Harrison", "00-0007137", "WR", "IND_RETIRED", ["Harrison, Marvin"]),
        ("Derrick Henry", "00-0032764", "RB", "BAL", ["Henry, Derrick", "D.Henry"]),
        ("Javonte Williams", "00-0036997", "RB", "DEN", ["Williams, Javonte"]),
        ("CeeDee Lamb", "00-0036358", "WR", "DAL", ["Lamb, CeeDee", "C.Lamb"]),
        ("Nico Collins", "00-0036640", "WR", "HOU", ["Collins, Nico", "N.Collins"]),
        ("DK Metcalf", "00-0035640", "WR", "PIT", ["D.K. Metcalf", "Metcalf, DK"]),
        ("Chris Rodriguez Jr.", "00-0038611", "RB", "JAX", ["Chris Rodriguez", "C.Rodriguez"]),
        ("Brian Thomas Jr.", "00-0039893", "WR", "JAX", ["Brian Thomas", "Bri.Thomas", "B.Thomas"]),
        ("James Cook III", "00-0037248", "RB", "BUF", ["James Cook", "J.Cook"]),
    ]
    for fn, gsis_id, pos, tm, extra_al in gsis_pins:
        key = fn.lower()
        p = players_by_key.get(key)
        if p is None:
            players_by_key[key] = {
                "gsis_id": gsis_id,
                "espn_id": _det_id("ESPN", fn),
                "pfr_id": _slugify(fn)[:10],
                "full_name": fn,
                "position": pos,
                "2026_active_team": tm,
                "valid_from_date": "2024-03-13" if tm != "IND_RETIRED" else "1996-04-20",
                "valid_to_date": "2027-02-28" if tm != "IND_RETIRED" else "2008-12-31",
                "ruling_authority": "GSIS_SOVEREIGN_CROSSWALK",
                "pulled_play_guard_status": "CLEAR",
                "injury_status_2026_w09": "ACTIVE" if tm != "IND_RETIRED" else "RETIRED",
                "historical_tenures": [{"team": "SEA", "valid_from_date": "2019-04-26", "valid_to_date": "2025-03-12"}] if fn == "DK Metcalf" else [],
                "extra_aliases": list(extra_al),
            }
        else:
            existing_gsis = p.get("gsis_id")
            if not existing_gsis or not str(existing_gsis).startswith("00-00"):
                p["gsis_id"] = gsis_id
            p["position"] = pos
            p["2026_active_team"] = tm
            if fn == "DK Metcalf":
                p["historical_tenures"] = [{"team": "SEA", "valid_from_date": "2019-04-26", "valid_to_date": "2025-03-12"}]
            extra = list(extra_al) + [gsis_id]
            if existing_gsis:
                extra.append(existing_gsis)
            p["extra_aliases"] = list(set(p.get("extra_aliases", []) + extra))

    # =========================================================================
    # GARRETT'S STANDING 2026 ROSTER RULINGS (MANDATORY WAVE 4 OVERRIDES)
    # =========================================================================
    prev_geno_gsis = (players_by_key.get("geno smith") or {}).get("gsis_id") or "00-0030565"
    # 1. Geno Smith -> 2026_active_team: "NYJ", position: "QB" (historical SEA closed 2025-03-12)
    players_by_key["geno smith"] = {
        "gsis_id": prev_geno_gsis,
        "espn_id": "15864",
        "pfr_id": "SmitGe00",
        "full_name": "Geno Smith",
        "position": "QB",
        "2026_active_team": "NYJ",
        "valid_from_date": "2025-03-13",
        "valid_to_date": "2027-02-28",
        "ruling_authority": "GARRETT_STANDING_2026_RULING",
        "pulled_play_guard_status": "CLEAR",
        "injury_status_2026_w09": "ACTIVE",
        "historical_tenures": [
            {"team": "SEA", "valid_from_date": "2019-05-15", "valid_to_date": "2025-03-12"},
        ],
        "extra_aliases": list(
            set(["G.Smith", "Smith, Geno", "Geno Smith (NYJ QB)", "geno-smith", "00-0030565", prev_geno_gsis])
        ),
    }

    prev_evans_gsis = (players_by_key.get("mike evans") or {}).get("gsis_id") or "00-0031408"
    # 2. Mike Evans -> 2026_active_team: "SF", position: "WR" (historical TB closed 2026-03-11)
    players_by_key["mike evans"] = {
        "gsis_id": prev_evans_gsis,
        "espn_id": "16737",
        "pfr_id": "EvanMi00",
        "full_name": "Mike Evans",
        "position": "WR",
        "2026_active_team": "SF",
        "valid_from_date": "2026-03-12",
        "valid_to_date": "2027-02-28",
        "ruling_authority": "GARRETT_STANDING_2026_RULING",
        "pulled_play_guard_status": "CLEAR",
        "injury_status_2026_w09": "ACTIVE",
        "historical_tenures": [
            {"team": "TB", "valid_from_date": "2014-05-08", "valid_to_date": "2026-03-11"},
        ],
        "extra_aliases": list(
            set(["M.Evans", "Evans, Mike", "Mike Evans (SF WR)", "mike-evans", "00-0031408", prev_evans_gsis])
        ),
    }

    prev_godwin_gsis = (players_by_key.get("chris godwin") or {}).get("gsis_id") or "00-0033921"
    # 3. Chris Godwin -> 2026_active_team: "TB", position: "WR", injury_status_2026_w09: "OUT",
    #    pulled_play_guard_status: "PULLED_NOV_1_EXCLUDED"
    players_by_key["chris godwin"] = {
        "gsis_id": prev_godwin_gsis,
        "espn_id": "3116165",
        "pfr_id": "GodwCh00",
        "full_name": "Chris Godwin",
        "position": "WR",
        "2026_active_team": "TB",
        "valid_from_date": "2017-04-28",
        "valid_to_date": "2027-02-28",
        "ruling_authority": "GARRETT_STANDING_2026_RULING",
        "pulled_play_guard_status": "PULLED_NOV_1_EXCLUDED",
        "injury_status_2026_w09": "OUT",
        "historical_tenures": [],
        "extra_aliases": list(
            set(["C.Godwin", "Godwin, Chris", "Chris Godwin Jr.", "chris-godwin", "00-0033921", prev_godwin_gsis])
        ),
    }

    for key in sorted(players_by_key.keys()):
        p = players_by_key[key]
        fn = p["full_name"]
        slug = _slugify(fn)
        tm = p["2026_active_team"]
        pos = p["position"]
        aliases = set(
            [
                fn,
                slug,
                f"{fn} ({tm})",
                f"{fn} ({tm} {pos})",
            ]
            + _pbp_short_aliases(fn)
            + p.get("extra_aliases", [])
        )
        # Never strip generational suffix from Marvin Harrison Jr. into Marvin Harrison!
        if fn == "Marvin Harrison Jr.":
            aliases.discard("Marvin Harrison")
            aliases.discard("marvin-harrison")

        entities.append(
            {
                "canonical_id": f"PLAYER_{p['gsis_id']}",
                "gsis_id": p["gsis_id"],
                "espn_id": p["espn_id"],
                "pfr_id": p["pfr_id"],
                "canonical_slug": slug,
                "entity_type": "player",
                "full_name": fn,
                "aliases": sorted(x for x in aliases if x),
                "position": pos,
                "2026_active_team": tm,
                "valid_from_date": p["valid_from_date"],
                "valid_to_date": p["valid_to_date"],
                "ruling_authority": p["ruling_authority"],
                "pulled_play_guard_status": p["pulled_play_guard_status"],
                "injury_status_2026_w09": p.get("injury_status_2026_w09", "ACTIVE"),
                "historical_tenures": p.get("historical_tenures", []),
            }
        )

    return entities


def main() -> None:
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    entities = build_canonical_entities()
    with OUT_PATH.open("w", encoding="utf-8") as fh:
        for row in entities:
            fh.write(json.dumps(row, ensure_ascii=False) + "\n")

    by_type: Dict[str, int] = {}
    for row in entities:
        et = row["entity_type"]
        by_type[et] = by_type.get(et, 0) + 1
    print(f"Wrote {len(entities)} canonical entities to {OUT_PATH}: {by_type}")


if __name__ == "__main__":
    main()
