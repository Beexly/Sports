"""S1 reference construction: archived line trajectories and the R0 reference.

Trajectory definition (SPEC-C §2.2): for one game, the archived spread at T0
(kickoff - 72h) and at T1 (the last archived capture before kickoff), under
the SPEC-A sign convention.

Sign convention (§2.2: "identical to SPEC-A §3"): the line archive stores the
home side's spread as points received (e.g. DEN home +2.5 with SEA favored
-2.5). The SPEC-A line is the home-strength number (mu = +spread_line), so:

    line_specA = -(archived home SPREAD line)

Categories (§2.2, ordered): AWAY: delta <= -0.5; FLAT: |delta| < 0.5;
HOME: delta >= +0.5, with delta = line(T1) - line(T0).

line(T0) rule: the last archived capture at or before T0. line(T1) rule: the
last archived capture strictly before kickoff. A game is a COMPLETED
trajectory when its kickoff is in the past and both anchors exist.

R0 (§2.2): point-in-time category frequencies from all archived games final
before the T0 in question. R1 switches in only when the trajectory pool
reaches 200 (§6 default); until then R = R0. With zero completed
trajectories, R0 is INSUFFICIENT_DATA — stated, never fabricated.
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from .dossier import categorize, parse_utc

T0_OFFSET = timedelta(hours=72)  # §6 default: T0 = kickoff - 72h
R1_SWITCH_MIN_TRAJECTORIES = 200  # §6 default


def load_flat_archive(path: str) -> list:
    """Load the flat archiver rows (gameId/capturedAt/market/side/line).

    Snapshot rows in other shapes (e.g. pickcenter payloads) are skipped and
    counted by the caller via the returned 'skipped' tally on the module —
    here we simply return (rows, skipped).
    """
    rows = []
    skipped = 0
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            rec = json.loads(line)
            if "gameId" in rec and "capturedAt" in rec and "market" in rec:
                rows.append(rec)
            else:
                skipped += 1
    return rows, skipped


def home_spread_series(rows: list, espn_game_id: str) -> list:
    """[(captured_utc, line_specA)] for the home SPREAD market, time-sorted."""
    out = []
    for r in rows:
        if r["gameId"] == espn_game_id and r["market"] == "SPREAD" and r["side"] == "home" and r["line"] is not None:
            out.append((parse_utc(r["capturedAt"]), -float(r["line"])))
    out.sort(key=lambda t: t[0])
    return out


def _last_at_or_before(series: list, when: datetime):
    best = None
    for ts, line in series:
        if ts <= when:
            best = (ts, line)
        else:
            break
    return best


def _last_before(series: list, when: datetime):
    best = None
    for ts, line in series:
        if ts < when:
            best = (ts, line)
        else:
            break
    return best


def build_trajectory(series: list, kickoff_utc: datetime, now: datetime) -> dict:
    t0 = kickoff_utc - T0_OFFSET
    anchor_t0 = _last_at_or_before(series, t0)
    anchor_t1 = _last_before(series, kickoff_utc)
    traj = {
        "kickoff_utc": kickoff_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "t0_utc": t0.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "captures": len(series),
        "line_t0": None,
        "line_t1": None,
        "delta": None,
        "category": None,
        "final_utc": kickoff_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "status": None,
    }
    if anchor_t0 is None:
        traj["status"] = "NO_T0_ANCHOR"
        return traj
    if anchor_t1 is None or anchor_t1[0] <= anchor_t0[0]:
        traj["status"] = "NO_T1_ANCHOR"
        return traj
    traj["line_t0"] = anchor_t0[1]
    traj["line_t1"] = anchor_t1[1]
    traj["delta"] = anchor_t1[1] - anchor_t0[1]
    traj["category"] = categorize(traj["delta"])
    traj["status"] = "COMPLETED" if kickoff_utc <= now else "IN_PROGRESS"
    return traj


def r0_frequencies(trajectories: list, before_t0: datetime = None) -> dict:
    """Category frequencies over COMPLETED trajectories.

    Point-in-time discipline: when `before_t0` is given, only trajectories
    whose game was final strictly before that instant are counted (§2.2 R0).
    """
    counts = {"AWAY": 0, "FLAT": 0, "HOME": 0}
    n = 0
    for t in trajectories:
        if t["status"] != "COMPLETED":
            continue
        if before_t0 is not None and not (parse_utc(t["final_utc"]) < before_t0):
            continue
        counts[t["category"]] += 1
        n += 1
    if n == 0:
        return {"status": "INSUFFICIENT_DATA", "n": 0, "frequencies": None, "counts": counts}
    return {
        "status": "OK",
        "n": n,
        "frequencies": [counts["AWAY"] / n, counts["FLAT"] / n, counts["HOME"] / n],
        "counts": counts,
    }


def reference_state(trajectories: list) -> dict:
    """Which reference is in force (R0 vs R1) under the frozen switch rule."""
    completed = sum(1 for t in trajectories if t["status"] == "COMPLETED")
    active = "R1" if completed >= R1_SWITCH_MIN_TRAJECTORIES else "R0"
    return {
        "active_reference": active,
        "completed_trajectories": completed,
        "r1_switch_threshold": R1_SWITCH_MIN_TRAJECTORIES,
        "r0": r0_frequencies(trajectories),
    }
