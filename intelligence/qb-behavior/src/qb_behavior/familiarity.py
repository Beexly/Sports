# PROVENANCE: implements corpus-intelligence/deep/c01/buildable-systems.md #28
# (QB familiarity + availability: qb_familiarity = share of last 16 starts by
# the listed starter; backup-QB flag with the Keenum control-case template —
# backups get full profiles, never suppressed).
#
# "Starter" is inferred (most dropbacks in the team-week; see
# qb-behavior/build/build_starts.py) — marked as inference, never asserted
# as an official league start. Anti-leakage: strictly-before weeks only.
"""QB familiarity: how stable is the team's QB situation?"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Mapping, Optional

WINDOW_STARTS = 16           # trailing starts window (matches the form window)
BACKUP_THRESHOLD = 0.5      # trailing starter share below this -> backup flag


@dataclass(frozen=True)
class QBFamiliarity:
    team: str
    season: int
    week: int
    qb_id: str
    familiarity: Optional[float]  # share of trailing-16 team starts by qb_id
    n_starts: int                 # trailing team games with a charted starter
    backup_flag: Optional[bool]   # True when the QB situation is unstable
    gap_note: Optional[str] = None


def _parts(r: Mapping) -> tuple:
    return (str(r["team"]), int(r["season"]), int(r["week"]))


def familiarity(team: str, season: int, week: int, qb_id: Optional[str],
                starts_rows: Iterable[Mapping],
                window: int = WINDOW_STARTS) -> Optional[QBFamiliarity]:
    """Trailing starter-stability for (team, season, week).

    qb_id: the listed starter (e.g. from the game fixture). When None, the
    most recent charted starter is used and the result describes continuity
    under whoever is starting now. Returns None when the team has no charted
    starts before `week` — never a guess.
    """
    season, week = int(season), int(week)
    games: list[tuple[int, int, str]] = []  # (season, week, starter_qb_id)
    for r in starts_rows:
        t, s, w = _parts(r)
        if t != str(team) or (s, w) >= (season, week):
            continue
        qb = r.get("starter_qb_id")
        if qb:
            games.append((s, w, str(qb)))
    if not games:
        return None
    games.sort()
    tail = games[-window:]
    if qb_id is None:
        qb_id = tail[-1][2]  # most recent starter
    n = sum(1 for _, _, q in tail if q == str(qb_id))
    fam: Optional[float] = n / len(tail)
    backup: Optional[bool] = None
    gap = None
    if len(tail) < window // 2:
        gap = (f"only {len(tail)} trailing starts charted (< {window // 2}); "
               f"familiarity is provisional")
        backup = None  # not enough history to call it
    else:
        backup = fam < BACKUP_THRESHOLD
    return QBFamiliarity(team=str(team), season=season, week=week,
                         qb_id=str(qb_id), familiarity=round(fam, 4),
                         n_starts=len(tail), backup_flag=backup,
                         gap_note=gap)
