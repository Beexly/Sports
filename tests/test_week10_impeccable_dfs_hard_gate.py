import csv
import json
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Set
import pytest

REPO_ROOT = Path(__file__).resolve().parents[1]
DFS_DIR = REPO_ROOT / "data" / "dfs"

MAIN_SLATE_TEAMS: Set[str] = {
    "KC", "ATL", "HOU", "CLE", "MIN", "GB", "JAX", "TEN", "MIA", "IND",
    "CAR", "NO", "BUF", "NYJ", "SEA", "LV", "LAR", "LA", "ARI", "SF", "DAL",
}
NON_MAIN_SLATE_TEAMS: Set[str] = {
    "NE", "DET", "WAS", "NYG", "PIT", "CIN", "LAC", "BAL", "CHI", "DEN", "PHI", "TB",
}
LATE_WINDOW_TEAMS: Set[str] = {"SEA", "LV", "LAR", "LA", "ARI", "SF", "DAL"}

OUT_OR_IR_PLAYERS: Set[str] = {
    "treveyon henderson",
    "kenneth walker iii",
    "mike evans",
    "josh jacobs",
    "jake ferguson",
    "sam darnold",
    "t.j. hockenson",
    "carnell tate",
    "divine deablo",
    "peter skoronski",
    "tommy townsend",
    "tyler goodson",
    "christen miller",
    "puka nacua",
    "davante adams",
    "malik willis",
    "gardner minshew",
    "andrei iosivas",
}
PERMITTED_ACTIVATED_PLAYERS: Set[str] = {
    "travis etienne jr.",
    "xavier legette",
    "deshaun watson",
}


def _norm(val: Any) -> str:
    return str(val or "").strip()


def _norm_name(val: Any) -> str:
    return _norm(val).lower()


def _iter_player_records(obj: Any) -> Iterable[Dict[str, Any]]:
    if isinstance(obj, dict):
        if any(k in obj for k in ("name", "player", "player_name")):
            yield obj
        for k, v in obj.items():
            if k in ("players", "pool", "player_pool", "lineups", "slots", "roster", "entries"):
                yield from _iter_player_records(v)
            elif isinstance(v, (list, dict)):
                yield from _iter_player_records(v)
    elif isinstance(obj, list):
        for item in obj:
            yield from _iter_player_records(item)


def _extract_lineups(obj: Any) -> List[Dict[str, Any]]:
    found: List[Dict[str, Any]] = []
    if isinstance(obj, dict):
        if isinstance(obj.get("lineups"), list):
            for lu in obj["lineups"]:
                if isinstance(lu, dict):
                    found.append(lu)
        for v in obj.values():
            if isinstance(v, (dict, list)):
                found.extend(_extract_lineups(v))
    elif isinstance(obj, list):
        for item in obj:
            found.extend(_extract_lineups(item))
    return found


def validate_pool_and_lineups(
    data: Any,
    *,
    is_main_slate: bool = False,
    slate_type: str = "classic",
) -> List[str]:
    errors: List[str] = []
    for rec in _iter_player_records(data):
        name = _norm(rec.get("name") or rec.get("player") or rec.get("player_name"))
        team = _norm(rec.get("team") or rec.get("team_abbr")).upper()
        lname = _norm_name(name)
        if lname in OUT_OR_IR_PLAYERS and lname not in PERMITTED_ACTIVATED_PLAYERS:
            errors.append(f"OUT/IR player leak: {name}")
        if is_main_slate and team:
            if team in NON_MAIN_SLATE_TEAMS or team not in MAIN_SLATE_TEAMS:
                errors.append(f"Non-main-slate team {team} for player {name or 'UNKNOWN'}")

    for idx, lu in enumerate(_extract_lineups(data)):
        slots = lu.get("slots") or lu.get("players") or lu.get("roster")
        if not isinstance(slots, list) or not slots:
            continue
        salaries = [s.get("salary") for s in slots if isinstance(s, dict) and s.get("salary") is not None]
        if salaries and sum(int(x) for x in salaries) > 50000:
            errors.append(f"Lineup {idx} exceeds 50000 salary cap: {sum(int(x) for x in salaries)}")
        total_sal = lu.get("salary") or lu.get("total_salary")
        if total_sal is not None and int(total_sal) > 50000:
            errors.append(f"Lineup {idx} total_salary exceeds 50000: {total_sal}")

        names = [_norm_name(s.get("name") or s.get("player") or s.get("player_name")) for s in slots if isinstance(s, dict)]
        if len(set(names)) != len(names):
            errors.append(f"Lineup {idx} has duplicate players")

        positions = [_norm(s.get("slot") or s.get("pos") or s.get("position")).upper() for s in slots if isinstance(s, dict)]
        if slate_type == "classic":
            if len(slots) != 9:
                errors.append(f"Classic lineup {idx} must have 9 players, got {len(slots)}")
            if any(p in ("K", "PK") for p in positions):
                errors.append(f"Classic lineup {idx} includes forbidden Kicker")
            dst_teams = {
                _norm(s.get("team")).upper()
                for s in slots
                if isinstance(s, dict) and _norm(s.get("slot") or s.get("pos") or s.get("position")).upper() == "DST"
            }
            off_teams = {
                _norm(s.get("team")).upper()
                for s in slots
                if isinstance(s, dict) and _norm(s.get("slot") or s.get("pos") or s.get("position")).upper() != "DST"
            }
            overlap = dst_teams & off_teams
            if overlap:
                errors.append(f"Lineup {idx} has Offense-vs-own-DST conflict: {sorted(overlap)}")

            flex_players = [
                s for s in slots
                if isinstance(s, dict) and _norm(s.get("slot")).upper() == "FLEX"
            ]
            non_flex_rwt = [
                s for s in slots
                if isinstance(s, dict)
                and _norm(s.get("slot")).upper() in ("RB", "WR", "TE")
                and _norm(s.get("pos") or s.get("position") or s.get("slot")).upper() in ("RB", "WR", "TE")
            ]
            if flex_players and non_flex_rwt:
                has_late_non_flex = any(_norm(s.get("team")).upper() in LATE_WINDOW_TEAMS for s in non_flex_rwt)
                has_early_non_flex = any(_norm(s.get("team")).upper() not in LATE_WINDOW_TEAMS for s in non_flex_rwt)
                flex_is_late = _norm(flex_players[0].get("team")).upper() in LATE_WINDOW_TEAMS
                if has_late_non_flex and has_early_non_flex and not flex_is_late:
                    errors.append(f"Lineup {idx} violates late-swap FLEX ordering (early player in FLEX)")
        elif slate_type == "showdown":
            if len(slots) != 6:
                errors.append(f"Showdown lineup {idx} must have 6 players, got {len(slots)}")
            teams = {_norm(s.get("team")).upper() for s in slots if isinstance(s, dict) and _norm(s.get("team"))}
            if len(teams) < 2:
                errors.append(f"Showdown lineup {idx} must include players from both teams")
    return errors


def test_impeccable_dfs_validator_self_tests() -> None:
    bad_munich = {"players": [{"name": "Drake Maye", "team": "NE"}]}
    assert any("NE" in e for e in validate_pool_and_lineups(bad_munich, is_main_slate=True))

    bad_out = {"players": [{"name": "Kenneth Walker III", "team": "SEA"}, {"name": "TreVeyon Henderson", "team": "NE"}]}
    errs = validate_pool_and_lineups(bad_out, is_main_slate=False)
    assert any("Kenneth Walker III" in e for e in errs)
    assert any("TreVeyon Henderson" in e for e in errs)

    good_activated = {"players": [
        {"name": "Travis Etienne Jr.", "team": "NO"},
        {"name": "Xavier Legette", "team": "CAR"},
        {"name": "Deshaun Watson", "team": "CLE"},
    ]}
    assert validate_pool_and_lineups(good_activated, is_main_slate=True) == []

    bad_cannibal_and_flex = {
        "lineups": [{
            "slots": [
                {"slot": "QB", "pos": "QB", "name": "Patrick Mahomes", "team": "KC", "salary": 7000},
                {"slot": "RB", "pos": "RB", "name": "Breece Hall", "team": "NYJ", "salary": 6500},
                {"slot": "RB", "pos": "RB", "name": "Kyren Williams", "team": "LAR", "salary": 6800},
                {"slot": "WR", "pos": "WR", "name": "Rashee Rice", "team": "KC", "salary": 6400},
                {"slot": "WR", "pos": "WR", "name": "CeeDee Lamb", "team": "DAL", "salary": 7500},
                {"slot": "WR", "pos": "WR", "name": "Garrett Wilson", "team": "NYJ", "salary": 6000},
                {"slot": "TE", "pos": "TE", "name": "Travis Kelce", "team": "KC", "salary": 5500},
                {"slot": "FLEX", "pos": "RB", "name": "Chuba Hubbard", "team": "CAR", "salary": 2000},
                {"slot": "DST", "pos": "DST", "name": "Chiefs", "team": "KC", "salary": 2000},
            ]
        }]
    }
    lu_errs = validate_pool_and_lineups(bad_cannibal_and_flex, is_main_slate=True, slate_type="classic")
    assert any("DST" in e for e in lu_errs)
    assert any("FLEX" in e for e in lu_errs)


def _load_json_or_skip(filename: str) -> Any:
    path = DFS_DIR / filename
    if not path.exists():
        pytest.skip(f"{path} not emitted yet")
    return json.loads(path.read_text(encoding="utf-8"))


def test_week10_sunday_main_slate_artifact() -> None:
    data = _load_json_or_skip("week10_sunday_main_slate_pool_and_lineups_2026_11_15.json")
    errs = validate_pool_and_lineups(data, is_main_slate=True, slate_type="classic")
    assert not errs, f"Main slate violations: {errs}"


def test_week10_munich_showdown_artifact() -> None:
    data = _load_json_or_skip("week10_munich_showdown_ne_det_2026_11_15.json")
    errs = validate_pool_and_lineups(data, is_main_slate=False, slate_type="showdown")
    assert not errs, f"Munich showdown violations: {errs}"


def test_week10_snf_mnf_showdown_artifact() -> None:
    data = _load_json_or_skip("week10_snf_pit_cin_and_mnf_lac_bal_showdown_2026_11_15.json")
    errs = validate_pool_and_lineups(data, is_main_slate=False, slate_type="showdown")
    assert not errs, f"SNF/MNF showdown violations: {errs}"


def test_week10_dk_upload_csv_artifact() -> None:
    path = DFS_DIR / "week10_dk_upload_staged_2026_11_15.csv"
    if not path.exists():
        pytest.skip(f"{path} not emitted yet")
    with path.open("r", encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    for row in rows:
        for val in row.values():
            lname = _norm_name(val)
            for out_p in OUT_OR_IR_PLAYERS:
                assert out_p not in lname, f"OUT/IR player {out_p} found in staged DK CSV"
        team = _norm(row.get("TeamAbbrev") or row.get("Team") or row.get("team")).upper()
        if team:
            assert team in MAIN_SLATE_TEAMS and team not in NON_MAIN_SLATE_TEAMS, f"Non-main-slate team {team} in DK CSV"
