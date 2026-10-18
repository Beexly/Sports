"""
live_roster_gate.py
===================
MANDATORY fail-closed live roster gate (Doctrine 6 / Law 9).

Every player referenced by any pick, prop, parlay, or DFS lineup MUST pass
`verify_players` before emission. Truth = ESPN public team rosters (primary)
cross-checked against Sleeper's player DB. Any of the following BLOCKS:
  - player not found on the claimed team's live ESPN roster
  - player found on a different team (stale roster, e.g. Montgomery -> DET)
  - player not on any active NFL roster (e.g. Diontae Johnson)
  - ESPN injury status OUT / IR / doubtful / suspended
  - Sleeper disagrees on team, or Sleeper status is inactive
  - any feed fetch failure (fail closed -- never assume clean)

Identity: names are normalised (case, punctuation, "Last, First" order) but
generational suffixes are KEPT as part of identity, and the resolved ESPN
athlete id is returned so downstream code keys on id, not name.
"""
from __future__ import annotations

import json
import re
import time
import urllib.request
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Callable, Dict, Iterable, List, Optional, Tuple

ESPN_ROSTER = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/{team}/roster"
SLEEPER_PLAYERS = "https://api.sleeper.app/v1/players/nfl"

NFL_TEAMS = [
    "ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE", "DAL", "DEN", "DET", "GB",
    "HOU", "IND", "JAX", "KC", "LV", "LAC", "LAR", "MIA", "MIN", "NE", "NO", "NYG",
    "NYJ", "PHI", "PIT", "SF", "SEA", "TB", "TEN", "WSH",
]
TEAM_ALIASES = {"WAS": "WSH", "JAC": "JAX", "LA": "LAR", "OAK": "LV", "SD": "LAC"}
BLOCKING_STATUS = ("out", "injured reserve", "ir", "doubtful", "suspended", "pup", "nfi", "reserve")

Fetcher = Callable[[str], object]


def _http_json(url: str, timeout: float = 15.0) -> object:
    req = urllib.request.Request(url, headers={"User-Agent": "gse-roster-gate/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)


def canon_team(t: str) -> str:
    t = (t or "").upper().strip()
    return TEAM_ALIASES.get(t, t)


_SUFFIX = re.compile(r"\b(jr|sr|ii|iii|iv|v)\b\.?", re.I)


def norm_name(name: str) -> str:
    """Normalise name; KEEP suffix so 'Marvin Harrison' != 'Marvin Harrison Jr.'."""
    n = (name or "").strip()
    if "," in n:  # "Barkley, Saquon" -> "Saquon Barkley"
        last, first = [p.strip() for p in n.split(",", 1)]
        n = f"{first} {last}"
    n = n.lower().replace("’", "'")
    n = re.sub(r"[.\u2019']", "", n)
    n = re.sub(r"[^a-z0-9 \-]", " ", n)
    return re.sub(r"\s+", " ", n).strip()


@dataclass
class RosterEntry:
    espn_id: str
    name: str
    team: str
    position: str
    status: str  # ESPN injury status or "active"


@dataclass
class PlayerVerdict:
    player: str
    claimed_team: str
    ok: bool
    reason: str
    espn_id: Optional[str] = None
    live_team: Optional[str] = None
    status: Optional[str] = None


@dataclass
class GateReport:
    checked_at: str
    passed: bool
    verdicts: List[PlayerVerdict] = field(default_factory=list)
    feed_errors: List[str] = field(default_factory=list)

    def blocked(self) -> List[PlayerVerdict]:
        return [v for v in self.verdicts if not v.ok]

    def to_json(self) -> str:
        return json.dumps(asdict(self), indent=2)


class LiveRosterGate:
    def __init__(self, fetch: Fetcher = _http_json, use_sleeper: bool = True):
        self._fetch = fetch
        self._use_sleeper = use_sleeper
        self._espn: Dict[str, List[RosterEntry]] = {}
        self._index: Dict[str, List[RosterEntry]] = {}
        self._sleeper: Dict[str, List[dict]] = {}
        self.feed_errors: List[str] = []
        self.loaded_at: Optional[float] = None

    # ---------- loading ----------
    def _load_team(self, team: str) -> None:
        data = self._fetch(ESPN_ROSTER.format(team=team.lower()))
        entries: List[RosterEntry] = []
        for grp in data.get("athletes", []):  # type: ignore[union-attr]
            for a in grp.get("items", []):
                inj = a.get("injuries") or []
                status = "active"
                if inj:
                    status = str(inj[0].get("status", "active")).lower()
                st = (a.get("status") or {}).get("type") or ""
                if st and st.lower() not in ("active", ""):
                    status = st.lower()
                entries.append(RosterEntry(
                    espn_id=str(a.get("id")), name=a.get("fullName", ""), team=team,
                    position=(a.get("position") or {}).get("abbreviation", ""), status=status,
                ))
        if not entries:
            raise ValueError(f"empty ESPN roster for {team}")
        self._espn[team] = entries

    def load(self, teams: Iterable[str] = NFL_TEAMS) -> None:
        for t in teams:
            t = canon_team(t)
            try:
                self._load_team(t)
            except Exception as e:  # fail closed: record, players on this team will block
                self.feed_errors.append(f"ESPN {t}: {e}")
        self._index = {}
        for entries in self._espn.values():
            for e in entries:
                self._index.setdefault(norm_name(e.name), []).append(e)
        if self._use_sleeper:
            try:
                raw = self._fetch(SLEEPER_PLAYERS)
                for p in raw.values():  # type: ignore[union-attr]
                    nm = p.get("full_name") or f"{p.get('first_name','')} {p.get('last_name','')}"
                    self._sleeper.setdefault(norm_name(nm), []).append(p)
            except Exception as e:
                self.feed_errors.append(f"Sleeper: {e}")
        self.loaded_at = time.time()

    # ---------- verification ----------
    def verify(self, player: str, claimed_team: str) -> PlayerVerdict:
        team = canon_team(claimed_team)
        key = norm_name(player)
        v = PlayerVerdict(player=player, claimed_team=team, ok=False, reason="")
        if team not in self._espn:
            v.reason = f"BLOCK: ESPN roster for {team} unavailable (fail closed)"
            return v
        hits = self._index.get(key, [])
        if not hits:
            v.reason = "BLOCK: not on any live NFL roster"
            return v
        on_team = [h for h in hits if h.team == team]
        if not on_team:
            v.live_team = hits[0].team
            v.espn_id = hits[0].espn_id
            v.reason = f"BLOCK: stale roster -- live team is {hits[0].team}, not {team}"
            return v
        if len(on_team) > 1:
            v.reason = "BLOCK: ambiguous identity (multiple same-name players on team)"
            return v
        h = on_team[0]
        v.espn_id, v.live_team, v.status = h.espn_id, h.team, h.status
        if any(s in h.status for s in BLOCKING_STATUS):
            v.reason = f"BLOCK: injury/roster status '{h.status}'"
            return v
        if self._use_sleeper:
            if any(e.startswith("Sleeper") for e in self.feed_errors):
                v.reason = "BLOCK: Sleeper cross-check unavailable (fail closed)"
                return v
            sl = [p for p in self._sleeper.get(key, []) if p.get("position") == h.position or not h.position]
            sl = sl or self._sleeper.get(key, [])
            if not sl:
                # Sleeper omits generational suffixes ("Marvin Harrison" for Jr.).
                # Identity is already fixed by ESPN; accept only same team + position.
                stripped = re.sub(r"\s+", " ", _SUFFIX.sub("", key)).strip()
                sl = [p for p in self._sleeper.get(stripped, [])
                      if canon_team(p.get("team") or "") == team and p.get("position") == h.position]
            if not sl:
                v.reason = "BLOCK: Sleeper cross-check has no record"
                return v
            teams = {canon_team(p.get("team") or "") for p in sl}
            if team not in teams:
                v.reason = f"BLOCK: Sleeper disagrees on team ({sorted(teams)})"
                return v
            sp = next(p for p in sl if canon_team(p.get("team") or "") == team)
            inj = str(sp.get("injury_status") or "").lower()
            if inj and any(s in inj for s in BLOCKING_STATUS):
                v.reason = f"BLOCK: Sleeper injury status '{inj}'"
                return v
        v.ok = True
        v.reason = "PASS"
        return v

    def verify_players(self, players: Iterable[Tuple[str, str]]) -> GateReport:
        verdicts = [self.verify(p, t) for p, t in players]
        return GateReport(
            checked_at=datetime.now(timezone.utc).isoformat(),
            passed=all(v.ok for v in verdicts) and bool(verdicts),
            verdicts=verdicts,
            feed_errors=list(self.feed_errors),
        )


def require_live_roster(players: Iterable[Tuple[str, str]], gate: Optional[LiveRosterGate] = None) -> GateReport:
    """Hard gate. Callers MUST drop/abstain every blocked player."""
    players = list(players)
    if gate is None:
        gate = LiveRosterGate()
        gate.load({canon_team(t) for _, t in players} | set(NFL_TEAMS))
    return gate.verify_players(players)
