# PROVENANCE: implements corpus-intelligence/deep/c01/buildable-systems.md #3
# (QB trust-target profile table with absence conditionals: per-QB →
# per-receiver P(target); conditional recomputation under each pass-catcher's
# absence — the Pitts template → trust_delta_absent[qb][receiver]).
#
# Built from nflverse pbp targets (trust_targets.csv). First-read share,
# TPRR, and air-yard share need FTN charting and are NOT here — the module
# says so on every profile (never silently substituted). Report n alongside
# every delta (the research's reporting rule).
#
# Anti-leakage: strictly-before weeks only.
"""Per-QB trust-target profiles: who gets the ball, and what changes when they don't."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable, Mapping, Optional

WINDOW_WEEKS = 8             # trailing window for the target profile
MIN_TARGETS = 20            # below this the profile is withheld, not zeroed
MIN_SPLIT_WEEKS = 2         # per-side minimum for the absence conditional


@dataclass(frozen=True)
class ReceiverShare:
    receiver_id: str
    receiver_name: str
    targets: int
    share: float  # of the QB's charted targets in the window


@dataclass(frozen=True)
class TrustTargetProfile:
    qb_id: str
    season: int
    week: int
    n_targets: int
    n_weeks: int
    shares: tuple[ReceiverShare, ...]  # descending by share
    hhi: Optional[float]
    gap_note: Optional[str] = None


@dataclass(frozen=True)
class AbsenceDelta:
    """The Pitts template: target distribution with vs without receiver X."""
    qb_id: str
    receiver_id: str
    receiver_name: str
    weeks_present: int
    weeks_absent: int
    leader_share_with: Optional[float]
    leader_share_without: Optional[float]
    hhi_with: Optional[float]
    hhi_without: Optional[float]
    trust_delta_absent: Optional[float]  # leader_share_with - leader_share_without
    gap_note: Optional[str] = None


def _hhi(shares: list[float]) -> float:
    return round(sum(s * s for s in shares), 4)


def target_profile(qb_id: str, season: int, week: int,
                   target_rows: Iterable[Mapping],
                   window: int = WINDOW_WEEKS) -> Optional[TrustTargetProfile]:
    """Trailing-`window`-week P(target) per receiver for one QB.

    None when the QB has fewer than MIN_TARGETS charted targets in the
    window — withheld, never zeroed.
    """
    season, week = int(season), int(week)
    weeks: set[tuple[int, int]] = set()
    for r in target_rows:
        if str(r["qb_id"]) != str(qb_id):
            continue
        if (int(r["season"]), int(r["week"])) < (season, week):
            weeks.add((int(r["season"]), int(r["week"])))
    if not weeks:
        return None
    recent = set(sorted(weeks)[-window:])
    by_rc: dict[str, dict] = {}
    n = 0
    for r in target_rows:
        if str(r["qb_id"]) != str(qb_id):
            continue
        if (int(r["season"]), int(r["week"])) not in recent:
            continue
        t = int(r["targets"])
        d = by_rc.setdefault(str(r["receiver_id"]),
                             {"name": str(r.get("receiver_name") or ""),
                              "targets": 0})
        d["targets"] += t
        n += t
    gap = None
    if n < MIN_TARGETS:
        return TrustTargetProfile(
            qb_id=str(qb_id), season=season, week=week, n_targets=n,
            n_weeks=len(recent), shares=(), hhi=None,
            gap_note=f"only {n} charted targets (< {MIN_TARGETS}); profile withheld")
    shares = tuple(sorted(
        (ReceiverShare(rid, d["name"], d["targets"], round(d["targets"] / n, 4))
         for rid, d in by_rc.items()),
        key=lambda s: s.share, reverse=True))
    return TrustTargetProfile(
        qb_id=str(qb_id), season=season, week=week, n_targets=n,
        n_weeks=len(recent), shares=shares,
        hhi=_hhi([s.share for s in shares]), gap_note=gap)

def absence_delta(qb_id: str, receiver_id: str, season: int, week: int,
                  target_rows: Iterable[Mapping],
                  window: int = WINDOW_WEEKS) -> Optional[AbsenceDelta]:
    """Trust_delta_absent[qb][receiver]: with-X vs without-X distribution.

    Splits the QB's trailing-window weeks into weeks where the receiver saw
    ≥1 target (present) vs 0 targets (absent). Reports the leader's share and
    HHI on each side plus their delta. None (with gap note) when either side
    has fewer than MIN_SPLIT_WEEKS weeks — never computed on a sliver.
    """
    season, week = int(season), int(week)
    # The QB's charted weeks in the trailing window.
    qb_weeks: set[tuple[int, int]] = set()
    for r in target_rows:
        if str(r["qb_id"]) == str(qb_id) and \
                (int(r["season"]), int(r["week"])) < (season, week):
            qb_weeks.add((int(r["season"]), int(r["week"])))
    recent = sorted(qb_weeks)[-window:]
    if not recent:
        return None
    present = [sw for sw in recent
               if any(str(r["qb_id"]) == str(qb_id)
                      and str(r["receiver_id"]) == str(receiver_id)
                      and (int(r["season"]), int(r["week"])) == sw
                      and int(r["targets"]) > 0
                      for r in target_rows)]
    absent = [sw for sw in recent if sw not in present]

    def _side(weeks: list[tuple[int, int]]) -> tuple[Optional[float], Optional[float], int]:
        tot: dict[str, int] = {}
        n = 0
        for r in target_rows:
            if str(r["qb_id"]) != str(qb_id):
                continue
            if (int(r["season"]), int(r["week"])) not in weeks:
                continue
            t = int(r["targets"])
            tot[str(r["receiver_id"])] = tot.get(str(r["receiver_id"]), 0) + t
            n += t
        if n == 0:
            return None, None, 0
        sh = [v / n for v in tot.values()]
        return round(max(sh), 4), _hhi(sh), n

    lw, hw, nw = _side(present)
    la, ha, na = _side(absent)
    name = next((str(r.get("receiver_name") or "") for r in target_rows
                 if str(r["receiver_id"]) == str(receiver_id)), "")
    gap = None
    delta = None
    if len(present) < MIN_SPLIT_WEEKS or len(absent) < MIN_SPLIT_WEEKS:
        gap = (f"only {len(present)} present / {len(absent)} absent weeks "
               f"(need {MIN_SPLIT_WEEKS} each); delta withheld")
    elif lw is not None and la is not None:
        delta = round(lw - la, 4)
    return AbsenceDelta(qb_id=str(qb_id), receiver_id=str(receiver_id),
                        receiver_name=name, weeks_present=len(present),
                        weeks_absent=len(absent), leader_share_with=lw,
                        leader_share_without=la, hhi_with=hw, hhi_without=ha,
                        trust_delta_absent=delta, gap_note=gap)
