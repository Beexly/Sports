"""STAGE 0 - Pre-flight live roster, transaction, starter & injury gate.

Runs BEFORE any simulation, pick, prop, SGP or DFS optimization. Hard-blocks
(raises PreflightRosterGateError) on stale config, and purges OUT/IR/D/season-ending,
traded-away and non-starting QBs from any candidate pool. Also asserts a finished
lineup contains none of them.

Origin: Week 9 TNF packet recommended Lamar Jackson (OUT) and Sunday pool carried IR players.
"""
from __future__ import annotations

import json
import os
import re
from datetime import date, datetime
from pathlib import Path
from typing import Iterable, Mapping

try:
    import pandas as pd
except ImportError:  # pragma: no cover
    pd = None  # type: ignore[assignment]

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CONFIG = ROOT / "data" / "nflverse" / "week9_live_roster_transactions_and_starters_2026.json"


class PreflightRosterGateError(RuntimeError):
    """Raised when Stage 0 fails. Callers must not catch and continue."""


def load_config(path: str | Path = DEFAULT_CONFIG, today: date | None = None) -> dict:
    cfg = json.loads(Path(path).read_text(encoding="utf-8"))
    today = today or date.today()
    as_of = datetime.strptime(cfg["as_of"], "%Y-%m-%d").date()
    age = (today - as_of).days
    if age > int(cfg.get("max_age_days", 3)):
        raise PreflightRosterGateError(
            f"roster config as_of {cfg['as_of']} is {age} days old (max {cfg['max_age_days']}); "
            "refresh transactions/injuries before running"
        )
    return cfg


def _norm(s: str) -> str:
    parts = [
        w
        for w in str(s).lower().replace(".", "").replace(",", "").split()
        if w not in ("jr", "sr", "ii", "iii", "iv")
    ]
    return " ".join(parts)


def apply_gate(
    df: pd.DataFrame,
    cfg: dict,
    name_col: str = "name",
    team_col: str = "team",
    pos_col: str = "position",
    status_col: str | None = "status",
    salary_col: str = "salary",
    qb_gate: bool = True,
) -> tuple[pd.DataFrame, list[dict]]:
    """Return (clean_df, removal_log). status_col may be absent from df."""
    blocked = {s.upper() for s in cfg["blocked_statuses"]}
    excl = {_norm(p["name"]): p for p in cfg["excluded_players"]}
    traded = {_norm(p["name"]): p for p in cfg["traded_players"]}
    qb1 = {t: _norm(n) for t, n in cfg["confirmed_qb1"].items()}
    log: list[dict] = []
    keep = pd.Series(True, index=df.index)

    def drop(i, reason):
        keep.loc[i] = False
        log.append({"name": df.at[i, name_col], "team": df.at[i, team_col],
                    "position": df.at[i, pos_col], "reason": reason})

    for i in df.index:
        n = _norm(df.at[i, name_col])
        team = str(df.at[i, team_col])
        if status_col and status_col in df.columns:
            st = str(df.at[i, status_col] or "").strip().upper()
            if st in blocked:
                drop(i, f"DK status {st}")
                continue
        if n in excl:
            drop(i, f"config exclusion: {excl[n]['reason']}")
            continue
        if n in traded and team == traded[n]["from"]:
            t_date = traded[n].get("date") or cfg.get("as_of") or "unknown"
            drop(i, f"traded {traded[n]['from']}->{traded[n]['to']} on {t_date}")
            continue

    clean = df[keep].copy()

    if qb_gate:
        qbs = clean[clean[pos_col] == "QB"]
        for team, grp in qbs.groupby(team_col):
            if team in qb1:
                starter = qb1[team]
                if not (grp[name_col].map(_norm) == starter).any():
                    # confirmed starter absent from pool (e.g. not on the DK slate): drop every QB of that team
                    # to avoid silently promoting a backup.
                    for i in grp.index:
                        keep.loc[i] = False
                        log.append({"name": clean.at[i, name_col], "team": team, "position": "QB",
                                    "reason": f"confirmed QB1 {cfg['confirmed_qb1'][team]} not in pool"})
                else:
                    for i in grp.index:
                        if _norm(clean.at[i, name_col]) != starter:
                            keep.loc[i] = False
                            log.append({"name": clean.at[i, name_col], "team": team, "position": "QB",
                                        "reason": f"not confirmed QB1 ({cfg['confirmed_qb1'][team]})"})
            else:
                top = grp[salary_col].idxmax()
                for i in grp.index:
                    if i != top:
                        keep.loc[i] = False
                        log.append({"name": clean.at[i, name_col], "team": team, "position": "QB",
                                    "reason": "backup QB (QB1 UNVERIFIED = highest salary)"})
        clean = df[keep & df.index.isin(clean.index)].copy()
    return clean, log


def assert_lineup_clean(
    players: Iterable[str],
    cfg: dict,
    player_teams: Mapping[str, str] | None = None,
) -> None:
    bad = []
    confirmed_starters = {_norm(v) for v in cfg.get("confirmed_qb1", {}).values()}
    names = {_norm(p["name"]) for p in cfg["excluded_players"]}
    traded_list = cfg.get("traded_players", [])
    if int(cfg.get("week", 9)) <= 9:
        names |= ({_norm(p["name"]) for p in traded_list} - confirmed_starters)
    else:
        for tp in traded_list:
            tp_norm = _norm(tp["name"])
            if tp.get("dfs_slate_ineligible") is True and tp_norm not in confirmed_starters:
                names.add(tp_norm)
    norm_player_teams = (
        {_norm(k): str(v).strip().upper() for k, v in player_teams.items()}
        if player_teams
        else {}
    )
    traded_from_by_name = {
        _norm(tp["name"]): str(tp.get("from") or "").strip().upper()
        for tp in traded_list
    }
    for n in players:
        nn = _norm(n)
        if nn in names:
            bad.append(n)
        elif nn in traded_from_by_name and nn in norm_player_teams:
            if norm_player_teams[nn] == traded_from_by_name[nn]:
                bad.append(n)
    if bad:
        raise PreflightRosterGateError(f"lineup contains Stage-0-blocked players: {bad}")


def assert_lineup_rules(salary: int, teams: list[str], classic: bool = True,
                        min_salary: int = 48500, max_per_team: int = 4) -> None:
    if not classic:
        return
    if salary < min_salary:
        raise PreflightRosterGateError(f"classic lineup salary {salary} < floor {min_salary}")
    worst = max(teams.count(t) for t in set(teams))
    if worst > max_per_team:
        raise PreflightRosterGateError(f"classic lineup has {worst} players from one team (max {max_per_team})")


def _week_config_path(week: int, season: int = 2026) -> Path:
    """Canonical per-week roster/transaction config naming convention."""
    return ROOT / "data" / "nflverse" / f"week{week}_live_roster_transactions_and_starters_{season}.json"


def resolve_active_week(season: int = 2026, today: date | None = None) -> int:
    """Resolve current NFL week dynamically from repo scoreboard / Stage-0 files (never pinned to Week 9)."""
    _ = today  # reserved for calendar refinement
    candidates: list[int] = []
    for p in (ROOT / "data" / "nflverse").glob(f"week*_live_roster_transactions_and_starters_{season}.json"):
        m = re.search(rf"week(\d+)_live_roster_transactions_and_starters_{season}\.json$", p.name)
        if m:
            candidates.append(int(m.group(1)))
    for p in (ROOT / "data" / "engine").glob(f"espn_{season}_week*_scoreboard.json"):
        m = re.search(rf"espn_{season}_week(\d+)_scoreboard\.json$", p.name)
        if m:
            candidates.append(int(m.group(1)))
    if candidates:
        return max(candidates)
    raise PreflightRosterGateError(f"Unable to auto-resolve active NFL week for season {season}")


def discover_latest_stage0_config(season: int = 2026, week: int | str = "auto") -> tuple[int, Path]:
    """Return `(resolved_week, config_path)` for `week='auto'` or an explicit week number."""
    if str(week).strip().lower() == "auto":
        resolved_wk = resolve_active_week(season=season)
    else:
        resolved_wk = int(week)
    cfg_path = _week_config_path(resolved_wk, season=season)
    if not cfg_path.is_file():
        raise PreflightRosterGateError(f"Missing Stage-0 config for week {resolved_wk}: {cfg_path}")
    return resolved_wk, cfg_path


def require_week(week: int | str, config_path: str | Path = DEFAULT_CONFIG) -> dict:
    """Hard gate for any simulation/pick entry point: a roster config for `week` must exist and be fresh.

    Explicit, logged retrospective path: STAGE0_RETROSPECTIVE=1 (returns {} - never for publishable output).
    """
    if os.environ.get("STAGE0_RETROSPECTIVE") == "1":
        print("[STAGE 0] RETROSPECTIVE mode - output is NOT publishable")
        return {}
    if str(week).strip().lower() == "auto":
        week, auto_path = discover_latest_stage0_config(week="auto")
        if Path(config_path) == DEFAULT_CONFIG:
            config_path = auto_path
    # Week-aware default (2026-11-13): when the caller did not pin a config,
    # prefer the config named for the requested week. Fail-closed: if it does
    # not exist, load_config below still raises on stale/mismatched defaults.
    elif Path(config_path) == DEFAULT_CONFIG:
        week_specific = _week_config_path(int(week))
        if week_specific.is_file():
            config_path = week_specific
    cfg = load_config(config_path)
    if int(cfg["week"]) != int(week):
        raise PreflightRosterGateError(
            f"no roster/transaction config for week {week} (config is week {cfg['week']}); "
            "refusing to run on stale rosters. Use STAGE0_RETROSPECTIVE=1 only for non-publishable replays."
        )
    print(f"[STAGE 0] LIVE | as_of {cfg['as_of']} | excluded {len(cfg['excluded_players'])} | QB1s {sorted(cfg['confirmed_qb1'])}")
    return cfg


def qb1_out_roles(cfg: dict) -> dict[str, list[str]]:
    """team -> ['QB1'] for teams whose QB1 slot is vacated by an excluded QB (feeds injury reallocation)."""
    out: dict[str, list[str]] = {}
    for p in cfg.get("excluded_players", []):
        if str(p.get("position", "")).upper() == "QB":
            out.setdefault(p["team"], ["QB1"])
    return out
