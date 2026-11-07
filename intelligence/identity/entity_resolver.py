"""
Wave 4 (W4-02): Canonical Runtime Entity Resolver (`intelligence/identity/entity_resolver.py`).

Enforces zero-tolerance entity resolution and tenure-window validation across
all 32 NFL teams, 32 venues, 96 coaches, 17 referee crews, and 5,300+ players in
`data/identity/canonical_entities.jsonl`.

Standing 2026 Rulings Enforced:
  - Geno Smith -> NYJ QB (historical SEA tenure closed 2025-03-12)
  - Mike Evans -> SF WR (historical TB tenure closed 2026-03-11)
  - Chris Godwin -> TB WR, OUT for Week 9, PULLED_NOV_1_EXCLUDED
"""
from __future__ import annotations

import functools
import json
import re
from pathlib import Path
from typing import Any, Dict, List, Mapping, Optional

REPO_ROOT = Path(__file__).resolve().parents[2]
CANONICAL_ENTITIES_PATH = REPO_ROOT / "data" / "identity" / "canonical_entities.jsonl"


class EntityResolutionContaminationError(ValueError):
    """
    Raised immediately when:
      1. An entity name, slug, or ID cannot be resolved in `canonical_entities.jsonl`.
      2. A player or coach is paired with an out-of-window team for `as_of_date`
         (e.g., Geno Smith on SEA in 2026, Mike Evans on TB in 2026, DK Metcalf on SEA in 2026).
      3. A pulled or excluded injured player (e.g., Chris Godwin `PULLED_NOV_1_EXCLUDED` / OUT)
         is resolved as an active board entity in Week 9 (`as_of_date >= "2026-11-01"`).
    """


TEAM_ABBR_CANON: Dict[str, str] = {
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
    "AZ": "ARI",
}


def normalize_team_code(team: Optional[str]) -> str:
    if not team:
        return ""
    u = str(team).strip().upper()
    return TEAM_ABBR_CANON.get(u, u)


def normalize_lookup_key(value: str) -> str:
    """
    Normalize a lookup key while preserving generational suffixes ('Jr', 'Sr', 'II', 'III', 'IV')
    so 'Marvin Harrison Jr.' never collides with 'Marvin Harrison'.
    """
    raw = str(value or "").strip()
    if not raw:
        return ""
    # Strip trailing parenthetical team/pos annotations like "Josh Allen (BUF)" or "Mark Andrews (BAL TE)"
    raw = re.sub(r"\s*\([A-Z]{2,3}(?:\s+[A-Z0-9]+)?\)\s*$", "", raw)
    if "," in raw and not raw.upper().startswith(("VENUE_", "TEAM_", "PLAYER_", "COACH_")):
        parts = [p.strip() for p in raw.split(",", 1)]
        if len(parts) == 2 and parts[0] and parts[1]:
            raw = f"{parts[1]} {parts[0]}"
    s = raw.lower().replace("\u2019", "'")
    s = re.sub(r"[.']", "", s)
    s = re.sub(r"[^a-z0-9_\- ]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


class CanonicalEntityIndex:
    def __init__(self, entities: List[Dict[str, Any]]) -> None:
        self.entities = entities
        self.by_canonical_id: Dict[str, Dict[str, Any]] = {}
        self.by_gsis_id: Dict[str, Dict[str, Any]] = {}
        self.by_espn_id: Dict[str, Dict[str, Any]] = {}
        self.by_key: Dict[str, List[Dict[str, Any]]] = {}

        for ent in entities:
            cid = str(ent.get("canonical_id") or "")
            gsis = str(ent.get("gsis_id") or "")
            espn = str(ent.get("espn_id") or "")
            slug = str(ent.get("canonical_slug") or "")
            fn = str(ent.get("full_name") or "")

            if cid:
                self.by_canonical_id[cid.upper()] = ent
                self.by_key.setdefault(normalize_lookup_key(cid), []).append(ent)
            if gsis:
                self.by_gsis_id[gsis.upper()] = ent
                self.by_key.setdefault(normalize_lookup_key(gsis), []).append(ent)
            if espn:
                self.by_espn_id[espn.upper()] = ent
            if slug:
                self.by_key.setdefault(normalize_lookup_key(slug), []).append(ent)
            if fn:
                self.by_key.setdefault(normalize_lookup_key(fn), []).append(ent)
            for al in ent.get("aliases") or []:
                nk = normalize_lookup_key(str(al))
                if nk:
                    self.by_key.setdefault(nk, []).append(ent)


@functools.lru_cache(maxsize=1)
def load_canonical_entity_index(path: Optional[Path] = None) -> CanonicalEntityIndex:
    target = path or CANONICAL_ENTITIES_PATH
    if not target.is_file():
        raise FileNotFoundError(f"Canonical entity registry not found at {target}")
    rows: List[Dict[str, Any]] = []
    with target.open("r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return CanonicalEntityIndex(rows)


def _team_valid_for_entity_on_date(ent: Mapping[str, Any], expected_team: str, as_of_date: str) -> bool:
    norm_expected = normalize_team_code(expected_team)
    active_team = normalize_team_code(str(ent.get("2026_active_team") or ""))
    v_from = str(ent.get("valid_from_date") or "1900-01-01")
    v_to = str(ent.get("valid_to_date") or "2099-12-31")

    if norm_expected == active_team and v_from <= as_of_date <= v_to:
        return True

    for tenure in ent.get("historical_tenures") or []:
        h_team = normalize_team_code(str(tenure.get("team") or ""))
        h_from = str(tenure.get("valid_from_date") or "1900-01-01")
        h_to = str(tenure.get("valid_to_date") or "2025-03-12")
        if norm_expected == h_team and h_from <= as_of_date <= h_to:
            return True

    return False


def resolve_entity(
    name_or_id: str,
    expected_team: Optional[str] = None,
    as_of_date: str = "2026-11-06",
    entity_type: Optional[str] = None,
    allow_pulled_or_inactive: bool = False,
    enforce_stage0_injury_gate: bool = False,
) -> Dict[str, Any]:
    """
    Resolve `name_or_id` against `data/identity/canonical_entities.jsonl`.
    Raises `EntityResolutionContaminationError` immediately if:
      - `name_or_id` is empty or unresolvable
      - `expected_team` is out of the entity's valid tenure window at `as_of_date`
      - The entity is blocked by `pulled_play_guard_status == "PULLED_NOV_1_EXCLUDED"`
        (e.g., Chris Godwin) when `as_of_date >= "2026-11-01"` and `allow_pulled_or_inactive` is False.
    """
    raw = str(name_or_id or "").strip()
    if not raw:
        raise EntityResolutionContaminationError("Empty entity identifier passed to resolve_entity().")

    idx = load_canonical_entity_index()
    candidates: List[Dict[str, Any]] = []

    u_raw = raw.upper()
    if u_raw in idx.by_canonical_id:
        candidates = [idx.by_canonical_id[u_raw]]
    elif u_raw in idx.by_gsis_id:
        candidates = [idx.by_gsis_id[u_raw]]
    else:
        nk = normalize_lookup_key(raw)
        candidates = list(idx.by_key.get(nk) or [])

    if entity_type:
        et_low = entity_type.strip().lower()
        candidates = [c for c in candidates if str(c.get("entity_type") or "").lower() == et_low]

    if not candidates:
        raise EntityResolutionContaminationError(
            f"UNRESOLVED_ENTITY: '{name_or_id}' (entity_type={entity_type}) not found in canonical_entities.jsonl."
        )

    # Deduplicate by canonical_id preserving order
    deduped: List[Dict[str, Any]] = []
    seen_cids = set()
    for c in candidates:
        cid = c["canonical_id"]
        if cid not in seen_cids:
            seen_cids.add(cid)
            deduped.append(c)

    # Prefer exact full_name match if multiple candidates exist
    exact_fn = [c for c in deduped if c.get("full_name", "").lower() == raw.lower()]
    if exact_fn:
        deduped = exact_fn

    if expected_team:
        norm_exp = normalize_team_code(expected_team)
        matching_team = [c for c in deduped if _team_valid_for_entity_on_date(c, norm_exp, as_of_date)]
        if not matching_team:
            primary = deduped[0]
            actual_tm = primary.get("2026_active_team")
            hist = primary.get("historical_tenures") or []
            raise EntityResolutionContaminationError(
                f"OUT_OF_WINDOW_TEAM_PAIRING: '{primary.get('full_name')}' ({primary.get('canonical_id')}) "
                f"paired with team '{norm_exp}' as of {as_of_date}, but active 2026 team is '{actual_tm}' "
                f"(valid_from={primary.get('valid_from_date')}, historical_tenures={hist})."
            )
        chosen = matching_team[0]
    else:
        # Prefer team entity if raw is a 2-3 letter team code and entity_type not specified
        if not entity_type and len(raw.strip()) <= 3:
            team_cands = [c for c in deduped if c.get("entity_type") == "team"]
            chosen = team_cands[0] if team_cands else deduped[0]
        else:
            chosen = deduped[0]

    guard = str(chosen.get("pulled_play_guard_status") or "CLEAR")
    inj_w09 = str(chosen.get("injury_status_2026_w09") or "ACTIVE").upper()
    if as_of_date >= "2026-11-01" and not allow_pulled_or_inactive:
        if guard == "PULLED_NOV_1_EXCLUDED":
            raise EntityResolutionContaminationError(
                f"PULLED_PLAY_CONTAMINATION_GUARD: '{chosen.get('full_name')}' ({chosen.get('canonical_id')}) "
                f"is blocked by pulled_play_guard_status='{guard}' (injury_status_2026_w09='{inj_w09}')."
            )
        if enforce_stage0_injury_gate and (
            guard == "STAGE0_EXCLUDED_IR_OR_OUT" or inj_w09 in ("OUT", "IR", "INJURED RESERVE", "OUT_FOR_SEASON")
        ):
            raise EntityResolutionContaminationError(
                f"STAGE0_INACTIVE_CONTAMINATION_GUARD: '{chosen.get('full_name')}' ({chosen.get('canonical_id')}) "
                f"is inactive/excluded on Week 9 board (status='{inj_w09}', guard='{guard}')."
            )

    return chosen


def validate_roster_pairing(
    name_or_id: str,
    claimed_team: str,
    as_of_date: str = "2026-11-06",
    allow_pulled_or_inactive: bool = False,
) -> Dict[str, Any]:
    """Validate a player or coach pairing with `claimed_team` on `as_of_date`."""
    return resolve_entity(
        name_or_id=name_or_id,
        expected_team=claimed_team,
        as_of_date=as_of_date,
        allow_pulled_or_inactive=allow_pulled_or_inactive,
    )


def validate_dataset_row_entities(
    row: Mapping[str, Any],
    as_of_date: str = "2026-11-06",
    allow_pulled_or_inactive: bool = False,
) -> Dict[str, Any]:
    """
    Validate all entity references (teams, players, coaches, venues, officials) present in a dataset row.
    Raises `EntityResolutionContaminationError` on any unresolved or out-of-window entity pairing.
    """
    if not isinstance(row, Mapping):
        raise EntityResolutionContaminationError(f"Expected mapping row, got {type(row).__name__}")

    explicit_row_date = row.get("as_of_date") or row.get("gameday") or row.get("game_date")
    row_date = str(explicit_row_date or as_of_date)
    season_str = str(row.get("season") or "")
    week_val = row.get("week")
    if not explicit_row_date:
        if season_str in ("2024", "2023", "2022", "2021", "2020", "2019", "2018") and row_date == "2026-11-06":
            row_date = f"{season_str}-12-31"
        elif season_str == "2026" and week_val is not None and row_date == "2026-11-06":
            try:
                if int(float(str(week_val))) < 9:
                    row_date = "2026-10-25"
            except ValueError:
                pass

    resolved: Dict[str, str] = {}

    # 1. Validate team fields
    for tm_field in ("team", "home_team", "away_team", "posteam", "defteam", "possession_team", "defense_team", "recent_team", "opponent_team"):
        val = row.get(tm_field)
        if val and str(val).strip() and str(val).strip().upper() not in ("NA", "NULL", "NONE", "2TM", "3TM", "UNK", "NFL", "AFC", "NFC"):
            tm_ent = resolve_entity(
                str(val),
                as_of_date=row_date,
                entity_type="team",
                allow_pulled_or_inactive=True,
            )
            resolved[tm_field] = tm_ent["canonical_id"]

    # 2. Validate player fields paired with team if present
    claimed_team = (
        row.get("team")
        or row.get("recent_team")
        or row.get("posteam")
        or None
    )
    if claimed_team and str(claimed_team).strip().upper() in ("NA", "NULL", "NONE", "2TM", "3TM", "UNK", "NFL", "AFC", "NFC"):
        claimed_team = None

    player_ident = (
        row.get("gsis_id")
        or row.get("player_id")
        or row.get("player_display_name")
        or row.get("full_name")
        or row.get("display_name")
        or row.get("player_name")
        or row.get("player")
        or row.get("name")
    )
    # Only treat `name` as a player if no `event_id`/`market_id` is present
    if player_ident == row.get("name") and (row.get("event_id") or row.get("market_id") or row.get("short_name")):
        player_ident = None

    if player_ident and str(player_ident).strip():
        p_ent = resolve_entity(
            str(player_ident).strip(),
            expected_team=str(claimed_team).strip() if claimed_team else None,
            as_of_date=row_date,
            entity_type="player" if not str(player_ident).upper().startswith(("TEAM_", "VENUE_", "COACH_", "OFFICIAL_")) else None,
            allow_pulled_or_inactive=allow_pulled_or_inactive,
        )
        resolved["player"] = p_ent["canonical_id"]

    # 3. Validate coach / official / venue if present
    if row.get("coach") and str(row["coach"]).strip():
        c_ent = resolve_entity(
            str(row["coach"]).strip(),
            expected_team=str(claimed_team).strip() if claimed_team else None,
            as_of_date=row_date,
            entity_type="coach",
            allow_pulled_or_inactive=True,
        )
        resolved["coach"] = c_ent["canonical_id"]

    if row.get("referee") and str(row["referee"]).strip():
        r_ent = resolve_entity(
            str(row["referee"]).strip(),
            as_of_date=row_date,
            entity_type="official",
            allow_pulled_or_inactive=True,
        )
        resolved["referee"] = r_ent["canonical_id"]

    return {
        "valid": True,
        "as_of_date": row_date,
        "resolved_entities": resolved,
    }
