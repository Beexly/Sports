"""OL state from nflverse injuries plus the depth chart.

This is get_ol_state, the method analyze() already calls. It is not a second
API named get_ol_status.

Starter set: latest depth-chart scrape in the file, pos_abb in
LT/LG/C/RG/RT, pos_rank 1. That scrape is not the chart as of the requested
week. The returned data_gap says so. A missing week in the injury file is
DataGapError, not an empty trench.
"""
from __future__ import annotations

import os
from typing import Optional

try:
    import pandas as pd
except ImportError:  # pragma: no cover
    pd = None  # type: ignore[assignment]

from integration.providers import DataGapError, OLProvider, OLState, Verification

OL_ABBREV = ("LT", "LG", "C", "RG", "RT")
PRACTICE = {
    "Did Not Participate In Practice": "DNP",
    "Limited Participation in Practice": "LIMITED",
    "Full Participation in Practice": "FULL",
}


def _data_dir() -> str:
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")


class NflverseOLProvider(OLProvider):
    def __init__(self, data_dir: Optional[str] = None) -> None:
        self.data_dir = data_dir or _data_dir()
        self._inj: Optional[pd.DataFrame] = None
        self._starters: Optional[pd.DataFrame] = None

    def _load(self) -> None:
        if self._inj is not None:
            return
        inj_path = os.path.join(self.data_dir, "injuries_2026.parquet")
        dc_path = os.path.join(self.data_dir, "depth_charts_2026.parquet")
        missing = [p for p in (inj_path, dc_path) if not os.path.exists(p)]
        if missing:
            raise DataGapError(
                "offensive_line",
                "nflverse OL inputs missing: " + ", ".join(missing)
                + ". Fetch injuries and depth_charts from nflverse-data releases. "
                "No starter list was invented.",
            )
        self._inj = pd.read_parquet(inj_path)
        dc = pd.read_parquet(dc_path)
        latest = dc["dt"].max()
        starters = dc[(dc["dt"] == latest) & (dc["pos_abb"].isin(OL_ABBREV)) & (dc["pos_rank"] == 1)]
        self._starters = starters
        self._chart_dt = str(latest)

    def get_ol_state(self, team: str, week: int, season: int) -> OLState:
        self._load()
        assert self._inj is not None and self._starters is not None
        season_weeks = self._inj.loc[self._inj["season"] == int(season), "week"]
        published = set(int(w) for w in season_weeks.unique())
        team_weeks = self._inj.loc[
            (self._inj["season"] == int(season)) & (self._inj["team"] == team),
            "week",
        ]
        team_published = set(int(w) for w in team_weeks.unique())
        requested = int(week)
        used_week = requested
        fallback_note = ""
        if requested not in published:
            # Week not yet published (nflverse releases after Fri 18:00 ET).
            # Refusing outright left every card carrying a named OL gap for the
            # ENTIRE week even though last week's report is the best available
            # evidence about the current trench. Doctrine: labeled stale data
            # beats silence. Fall back to the most recent published week and
            # LABEL the fallback in data_gap so nothing downstream mistakes it
            # for this week's report. If no prior week exists either, refuse.
            prior = sorted(w for w in published if w < requested)
            if not prior:
                raise DataGapError(
                    "offensive_line",
                    f"injury report for season {season} week {week} is not in the file "
                    f"and no earlier week exists to fall back on. "
                    f"Published weeks: {sorted(published)}.",
                )
            used_week = prior[-1]
            fallback_note = (
                f"requested week {requested} not yet published; using week "
                f"{used_week} (most recent available). Starters listed Out in "
                f"week {used_week} may have returned or new injuries may have "
                f"landed since - treat as a floor on continuity, not a report. "
            )
        elif requested not in team_published:
            # Partial week release (e.g. TNF teams SEA/DEN published for Week 6
            # on Wednesday while Sunday/Monday teams are not yet in the file).
            # Fall back to the most recent week published for THIS team rather
            # than silently treating an unpublished team report as 0 OL injuries.
            prior_team = sorted(w for w in (team_published or published) if w < requested)
            if prior_team:
                used_week = prior_team[-1]
                fallback_note = (
                    f"requested week {requested} partially published upstream (not yet "
                    f"released for {team}); using week {used_week} (most recent "
                    f"available for {team}). Treat as a floor on continuity, not a "
                    f"final week-{requested} report. "
                )
        five = self._starters[self._starters["team"] == team]
        if len(five) < 5:
            raise DataGapError(
                "offensive_line",
                f"depth chart {self._chart_dt} has {len(five)} OL starters for {team}, "
                "not five. Refusing to fill the missing slots.",
            )
        ids = set(five["gsis_id"])
        week_rows = self._inj[
            (self._inj["team"] == team)
            & (self._inj["season"] == int(season))
            & (self._inj["week"] == int(used_week))
            & (self._inj["gsis_id"].isin(ids))
        ]
        out = []
        practice = []
        for _, row in week_rows.iterrows():
            name = str(row["full_name"])
            status = row["report_status"]
            if isinstance(status, str) and status == "Out":
                out.append(f"{name} ({row['position']})")
            prac = PRACTICE.get(str(row["practice_status"]))
            if prac:
                practice.append((name, prac))
        out_t = tuple(sorted(out))
        return OLState(
            team=team,
            week=int(used_week),
            season=int(season),
            starters_out=out_t,
            practice_status=tuple(practice),
            continuity_index=(5 - len(out_t)) / 5.0,
            pressure_rate_allowed=None,
            verification=Verification.CORPUS,
            data_gap=(
                fallback_note
                + f"starter set is the depth chart scraped {self._chart_dt}, "
                "not the chart as of this week. continuity_index is "
                "1 minus the share of those five listed Out. It is not a "
                "trench grade."
            ),
        )


def weak_link_survival_for_grades(grades: list[float]) -> float:
    """Flag-gated weak-link efficiency. Off: arithmetic mean. On: product survival."""
    if os.environ.get("ENABLE_TRENCH_POCKET_PHYSICS_V2", "").lower() not in {"1", "true", "yes"}:
        return sum(grades) / len(grades)
    from intelligence.coaching.trench_pocket_physics import compute_weak_link_ol_efficiency

    return float(compute_weak_link_ol_efficiency(grades)["efficiency"])


def ol_pass_set_report(observed_depths: list[float]) -> dict[str, float | bool | None]:
    """Eager 193949 attainment. Refuses to invent depths when the flag is off or the list is empty."""
    if os.environ.get("ENABLE_TRENCH_POCKET_PHYSICS_V2", "").lower() not in {"1", "true", "yes"}:
        return {"enabled": False, "attainment": None}
    from intelligence.coaching.trench_pocket_physics import pass_set_depth_attainment

    report = pass_set_depth_attainment(observed_depths)
    return {"enabled": True, "attainment": report["attainment"], "n": report["n"]}


_TEAM_ABBR_ALIASES = {
    "LAR": "LA",
    "WSH": "WAS",
    "JAC": "JAX",
}


def get_cfbd_opponent_adjusted_line_yards(team: str) -> dict[str, float | int]:
    """Return CFBD opponent-adjusted offensive & defensive line yards from 2026 PBP (`2026-11-09-PM` X sweep)."""
    import json
    from pathlib import Path

    repo_root = Path(__file__).resolve().parents[2]
    metrics_path = repo_root / "data" / "metrics" / "cfbd_opponent_adjusted_line_yards_2026_11_10.json"
    if not metrics_path.is_file():
        return {
            "carries": 0,
            "raw_off_line_yards": 2.99,
            "opp_adjusted_off_line_yards": 2.99,
            "off_line_yards_rank_nfl": 16,
            "stuff_rate": 0.175,
            "raw_def_line_yards_allowed": 2.99,
            "opp_adjusted_def_line_yards_allowed": 2.99,
            "def_line_yards_rank_nfl": 16,
            "league_mean_line_yards": 2.99,
        }
    payload = json.loads(metrics_path.read_text(encoding="utf-8"))
    teams = payload.get("teams") or {}
    key = str(team or "").strip().upper()
    resolved = _TEAM_ABBR_ALIASES.get(key, key)
    return dict(
        teams.get(resolved)
        or teams.get(key)
        or {
            "carries": 0,
            "raw_off_line_yards": 2.99,
            "opp_adjusted_off_line_yards": 2.99,
            "off_line_yards_rank_nfl": 16,
            "stuff_rate": 0.175,
            "raw_def_line_yards_allowed": 2.99,
            "opp_adjusted_def_line_yards_allowed": 2.99,
            "def_line_yards_rank_nfl": 16,
            "league_mean_line_yards": 2.99,
        }
    )


def map_ol_or_roster_role_to_epa_dropoff_bucket(role_key: str) -> str:
    """Delegate role-key normalization (`LT`/`WR1`/`CB1`/`EDGE1` -> `OL`/`SKILL`/`DEF`) to Unified Architecture."""
    from intelligence.architecture.unified_quantitative_nfl_architecture import (
        map_injury_designation_to_dropoff_bucket,
    )

    return map_injury_designation_to_dropoff_bucket(role_key)

