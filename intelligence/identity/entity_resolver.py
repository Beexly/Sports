#!/usr/bin/env python3
"""
WAVE 4 — CANONICAL ENTITY RESOLVER & CONTAMINATION FIREWALL
Enforces canonical resolution across players, coaches, 32 NFL teams, venues, and officials
from data/identity/canonical_entities.jsonl. Throws EntityResolutionContaminationError
on unresolved entities or out-of-window / contaminated team pairings (e.g., Mike Evans on TB in 2026,
Geno Smith on SEA/LV in 2026).
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CANONICAL_ENTITIES_PATH = REPO_ROOT / "data" / "identity" / "canonical_entities.jsonl"


class EntityResolutionContaminationError(ValueError):
    """Raised when an entity cannot be resolved or violates temporal/team tenure windows."""


class CanonicalEntityResolver:
    def __init__(self, entities_path: Optional[Path] = None) -> None:
        self.entities_path = Path(entities_path) if entities_path else DEFAULT_CANONICAL_ENTITIES_PATH
        self.by_id: Dict[str, Dict[str, Any]] = {}
        self.by_name_and_type: Dict[str, List[Dict[str, Any]]] = {}
        self.by_name: Dict[str, List[Dict[str, Any]]] = {}
        self._load()

    def _load(self) -> None:
        if not self.entities_path.exists():
            return
        with self.entities_path.open("r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                if not line.strip():
                    continue
                rec = json.loads(line)
                cid = str(rec.get("canonical_id", ""))
                ename = str(rec.get("canonical_name", "")).strip()
                etype = str(rec.get("entity_type", "")).strip().lower()
                if cid:
                    self.by_id[cid] = rec
                if ename:
                    nkey = ename.lower()
                    self.by_name.setdefault(nkey, []).append(rec)
                    self.by_name_and_type.setdefault(f"{etype}:{nkey}", []).append(rec)
                for alias in rec.get("aliases", []) or []:
                    akey = str(alias).strip().lower()
                    if akey:
                        self.by_name.setdefault(akey, []).append(rec)
                        self.by_name_and_type.setdefault(f"{etype}:{akey}", []).append(rec)

    @staticmethod
    def _normalize_team(team: str) -> str:
        t = team.strip().upper()
        aliases = {
            "JAC": "JAX",
            "WSH": "WAS",
            "LA": "LAR",
            "OAK": "LV",
            "SD": "LAC",
            "STL": "LAR",
        }
        return aliases.get(t, t)

    def resolve_entity(
        self,
        name_or_id: str,
        entity_type: Optional[str] = None,
        team_id: Optional[str] = None,
        as_of_date: str = "2026-11-06",
    ) -> Dict[str, Any]:
        key = name_or_id.strip()
        if not key:
            raise EntityResolutionContaminationError("Empty entity identifier passed to CanonicalEntityResolver")

        candidates: List[Dict[str, Any]] = []
        if key in self.by_id:
            candidates = [self.by_id[key]]
        elif entity_type:
            candidates = self.by_name_and_type.get(f"{entity_type.lower()}:{key.lower()}", [])
        if not candidates:
            candidates = self.by_name.get(key.lower(), [])

        if not candidates:
            raise EntityResolutionContaminationError(
                f"Unresolved entity '{name_or_id}' (type={entity_type}, team={team_id}, as_of={as_of_date})"
            )

        norm_team = self._normalize_team(team_id) if team_id else None

        # Filter by temporal window (valid_from <= as_of_date <= valid_to)
        window_matches: List[Dict[str, Any]] = []
        for cand in candidates:
            v_from = str(cand.get("valid_from") or "1900-01-01")
            v_to = str(cand.get("valid_to") or "2099-12-31")
            if v_from <= as_of_date <= v_to:
                window_matches.append(cand)

        if not window_matches:
            raise EntityResolutionContaminationError(
                f"Temporal window violation for '{name_or_id}' on as_of={as_of_date}: no active tenure record"
            )

        if norm_team:
            for cand in window_matches:
                cur_team = self._normalize_team(str(cand.get("current_team_id") or ""))
                forbidden = [self._normalize_team(str(ft)) for ft in (cand.get("forbidden_2026_teams") or [])]
                if as_of_date.startswith("2026") and norm_team in forbidden:
                    raise EntityResolutionContaminationError(
                        f"Standing 2026 Roster Contamination Error: '{cand.get('canonical_name')}' "
                        f"paired with forbidden team '{norm_team}' on {as_of_date} "
                        f"(canonical 2026 team is '{cur_team}')"
                    )
                if cur_team == norm_team or cur_team in ("NFL", "ALL", ""):
                    return cand

            # If none matched norm_team, raise contamination error showing canonical team
            expected_teams = sorted({str(c.get("current_team_id")) for c in window_matches})
            raise EntityResolutionContaminationError(
                f"Entity-Team Contamination Error for '{name_or_id}' on {as_of_date}: "
                f"asserted team '{norm_team}' does not match canonical team(s) {expected_teams}"
            )

        return window_matches[0]
