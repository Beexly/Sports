# PROVENANCE: implements corpus-intelligence/deep/c01/buildable-systems.md #1
# (per-QB rolling EPA/dropback, 16-game window, trade-following, anti-leakage
# availability weight) — ranked the single largest measured gain in the corpus:
# log loss 0.633→0.625, AUC 0.690→0.700; walk-forward 3,816 games 2012–2025,
# 65.2% accuracy, Brier 0.216. Upstream method: github.com/TreMatt03/nfl-game-predictor
# (MIT, with attribution). Marcel 40/30/20/10 (0495) is the alternative form
# model to beat.
#
# Research basis: c01 verified-claims (form beats team efficiency stats, which
# add nothing over Elo: 0.632 vs 0.632); partition-01 §4#1.
"""Per-QB rolling form: trailing-16-game EPA/dropback + availability weight.

Anti-leakage: the form for (season, week) uses ONLY games strictly before
that week — never the current week, never the future.
Trade-following: keyed by qb_id, not team — a midseason trade or takeover
continues one series (the Keenum-control-case requirement).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Mapping, Optional

WINDOW_GAMES = 16          # trailing window (the measured spec)
MIN_DROPBACKS = 100        # below this the form estimate is too noisy -> None
TYPICAL_DB_PER_GAME = 35.0  # full-time starter benchmark for the availability proxy


@dataclass(frozen=True)
class QBForm:
    """Rolling form for one QB ahead of one week."""
    qb_id: str
    season: int
    week: int
    form_epa: Optional[float]   # trailing EPA/dropback; None when below MIN_DROPBACKS
    n_dropbacks: int            # trailing dropbacks in the window
    n_games: int                # trailing games in the window
    availability: float         # 0..1 — trailing workload vs a full-time starter
    gap_note: Optional[str] = None


def _key_parts(r: Mapping) -> tuple:
    return (str(r["qb_id"]), int(r["season"]), int(r["week"]))


def to_weekly_increments(cumulative_rows: Iterable[Mapping]) -> list[dict]:
    """Convert season-to-date cumulative rows (the qb_weekly.csv grain) to
    per-week increments.

    Input: dicts with qb_id, season, week, db (cumulative dropbacks),
    epa (cumulative MEAN EPA/dropback). Output: one dict per (qb_id, season,
    week) with db/epa as that week's totals. A QB's first appearance in a
    season differences against zero (the <50-db floor means early weeks may
    be absent — the increment is still correct).
    """
    by_qb_season: dict[tuple, list[dict]] = {}
    for r in cumulative_rows:
        qb, season, week = _key_parts(r)
        by_qb_season.setdefault((qb, season), []).append(
            {"qb_id": qb, "season": season, "week": week,
             "db": float(r.get("db") or 0.0),
             "epa_mean": float(r.get("epa") or 0.0)})
    out: list[dict] = []
    for (qb, season), rows in by_qb_season.items():
        rows.sort(key=lambda d: d["week"])
        prev_db, prev_epa_tot = 0.0, 0.0
        for d in rows:
            db_tot = d["db"] * d["epa_mean"]
            wdb = max(0.0, d["db"] - prev_db)
            wepa = db_tot - prev_epa_tot
            out.append({"qb_id": qb, "season": season, "week": d["week"],
                        "db": wdb, "epa": wepa})
            prev_db, prev_epa_tot = d["db"], db_tot
    return out


def rolling_form(
    weekly_rows: Iterable[Mapping],
    window: int = WINDOW_GAMES,
    min_db: int = MIN_DROPBACKS,
    cumulative: bool = True,
) -> dict[tuple, QBForm]:
    """Compute trailing form for every (qb_id, season, week) in weekly_rows.

    weekly_rows: dicts with qb_id, season, week, db, epa. When cumulative
    (default — the qb_weekly.csv grain: season-to-date db and mean EPA/db),
    rows are first differenced to per-week increments. Pass cumulative=False
    for already-weekly rows (db = that week's dropbacks, epa = that week's
    total EPA).
    Multiple rows per (qb_id, season, week) are summed (defensive).
    Returns {(qb_id, season, week): QBForm} — form uses strictly earlier games.
    """
    rows = to_weekly_increments(weekly_rows) if cumulative else list(weekly_rows)
    # Aggregate to one row per (qb_id, season, week).
    agg: dict[tuple, dict] = {}
    for r in rows:
        k = _key_parts(r)
        a = agg.setdefault(k, {"db": 0.0, "epa": 0.0})
        a["db"] += float(r.get("db") or 0.0)
        a["epa"] += float(r.get("epa") or 0.0)

    # Order each QB's games chronologically (season, week); season boundary
    # does NOT reset the window — form carries across seasons (the measured spec).
    by_qb: dict[str, list[tuple]] = {}
    for (qb_id, season, week) in agg:
        by_qb.setdefault(qb_id, []).append((season, week))
    for qb_id in by_qb:
        by_qb[qb_id].sort()

    out: dict[tuple, QBForm] = {}
    for qb_id, games in by_qb.items():
        for i, (season, week) in enumerate(games):
            prior = games[max(0, i - window):i]  # strictly before this game
            db = sum(agg[(qb_id, s, w)]["db"] for s, w in prior)
            epa = sum(agg[(qb_id, s, w)]["epa"] for s, w in prior)
            n_db = int(round(db))
            if n_db >= min_db and db > 0:
                form_epa: Optional[float] = epa / db
                gap = None
            else:
                form_epa = None
                gap = (f"only {n_db} trailing dropbacks (< {min_db}); "
                       f"form withheld, not zeroed")
            availability = min(1.0, db / (window * TYPICAL_DB_PER_GAME)) if db > 0 else 0.0
            out[(qb_id, season, week)] = QBForm(
                qb_id=qb_id, season=season, week=week,
                form_epa=form_epa, n_dropbacks=n_db, n_games=len(prior),
                availability=round(availability, 4), gap_note=gap,
            )
    return out


def form_for(qb_id: str, season: int, week: int,
             table: dict[tuple, QBForm]) -> Optional[QBForm]:
    """Point-in-time lookup. Returns None (never a guess) when absent."""
    return table.get((str(qb_id), int(season), int(week)))


def form_ahead_of(qb_id: str, season: int, week: int,
                  weekly_rows: Iterable[Mapping],
                  window: int = WINDOW_GAMES,
                  min_db: int = MIN_DROPBACKS,
                  cumulative: bool = True) -> Optional[QBForm]:
    """Form for a week that may not be in weekly_rows yet (e.g. next week).

    Anti-leakage by construction: only games strictly before (season, week)
    are used, so this is safe to call for future weeks.
    """
    season, week = int(season), int(week)
    rows = (to_weekly_increments(weekly_rows) if cumulative
            else [dict(r, qb_id=str(r["qb_id"]), season=int(r["season"]),
                       week=int(r["week"])) for r in weekly_rows])
    prior = [r for r in rows
             if r["qb_id"] == str(qb_id)
             and (r["season"], r["week"]) < (season, week)]
    if not prior:
        return None
    # rolling_form keys each game; the last game in `prior` carries the
    # trailing window we want, but the target week differs — rebuild the
    # QBForm for the target directly.
    prior.sort(key=lambda r: (r["season"], r["week"]))
    tail = prior[-window:]
    db = sum(float(r.get("db") or 0.0) for r in tail)
    epa = sum(float(r.get("epa") or 0.0) for r in tail)
    n_db = int(round(db))
    if n_db >= min_db and db > 0:
        form_epa: Optional[float] = epa / db
        gap = None
    else:
        form_epa = None
        gap = (f"only {n_db} trailing dropbacks (< {min_db}); "
               f"form withheld, not zeroed")
    availability = min(1.0, db / (window * TYPICAL_DB_PER_GAME)) if db > 0 else 0.0
    return QBForm(qb_id=str(qb_id), season=season, week=week,
                  form_epa=form_epa, n_dropbacks=n_db, n_games=len(tail),
                  availability=round(availability, 4), gap_note=gap)
