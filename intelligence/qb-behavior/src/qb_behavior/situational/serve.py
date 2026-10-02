# PROVENANCE — qb-behavior / situational / serve.py
# Runtime server for c02 situational tables (stdlib + csv ONLY — no polars,
# per tests/README.md rule 5; the build job did the heavy lifting).
# Implements: corpus-intelligence/deep/c02/buildable-systems.md (Systems 1–2);
# verified-claims.md SIT-5 (EB ladder M=25), SIT-6 (cells), PRESS-1/2 (guards).
# Cell definitions: situational/cells.py (single source of truth).
"""Serve precomputed situational tables.

INT-by-situation uses the EB shrinkage ladder (verified-claims.md SIT-5):
  cell = (w + M * p_parent) / (n + M), M = 25, league -> team -> QB.
Null floors: no leaf at n < 30 (auto back-off); no QB pressure (p=1) cell
below 100 pooled pressured dropbacks (proposal :23, via a06).
"""
from __future__ import annotations

import csv
import os
from typing import Any

M_EB = 25                      # SIT-5: denoised-rate auditor precedent
INT_BASELINE = 0.01867         # c01 metrics.py INT_BASELINE_PER_DROPBACK
LEAF_MIN_N = 30                # SIT-5 null floor
MIN_PRESSURED_DROPBACKS = 100  # proposal :23


def _eb(n: int, w: int, parent: float) -> float:
    return (w + M_EB * parent) / (n + M_EB)


class SituationalStore:
    """Loads data/*.csv once; serves weekly/season rows and INT cells."""

    def __init__(self, data_dir: str):
        self.data_dir = data_dir
        self.weekly: dict[tuple, dict] = {}   # (qb_id, season, week) -> row
        self.season: dict[tuple, dict] = {}   # (qb_id, season) -> row
        self.cells: dict[tuple, tuple[int, int]] = {}  # (scope, id, season_key, cell) -> (n, w)
        self.meta: dict[str, str] = {}
        self._load()

    # -- loading ---------------------------------------------------------
    def _load(self) -> None:
        p = os.path.join(self.data_dir, "qb_weekly.csv")
        if os.path.exists(p):
            with open(p, newline="") as f:
                for r in csv.DictReader(f):
                    self.weekly[(r["qb_id"], int(r["season"]), int(r["week"]))] = r
        p = os.path.join(self.data_dir, "qb_season.csv")
        if os.path.exists(p):
            with open(p, newline="") as f:
                for r in csv.DictReader(f):
                    self.season[(r["qb_id"], int(r["season"]))] = r
        p = os.path.join(self.data_dir, "int_cells.csv")
        if os.path.exists(p):
            with open(p, newline="") as f:
                for r in csv.DictReader(f):
                    self.cells[(r["scope"], r["id"], r["season_key"], r["cell"])] = (
                        int(r["n"]), int(r["w"]))
        p = os.path.join(self.data_dir, "meta.csv")
        if os.path.exists(p):
            with open(p, newline="") as f:
                for r in csv.DictReader(f):
                    self.meta[r["key"]] = r["value"]

    # -- weekly / season rows --------------------------------------------
    def weekly_row(self, qb_id: str, season: int, week: int) -> tuple[dict | None, int | None]:
        """Latest row with week <= requested (point-in-time). Returns (row, week_used)."""
        cands = [(w, r) for (q, s, w), r in self.weekly.items()
                 if q == qb_id and s == season and w <= week]
        if not cands:
            return None, None
        w, r = max(cands, key=lambda t: t[0])
        return r, w

    def season_row(self, qb_id: str, season: int) -> dict | None:
        return self.season.get((qb_id, season))

    def max_week(self, season: int) -> int | None:
        ws = [w for (q, s, w) in self.weekly if s == season]
        return max(ws) if ws else None

    def seasons(self) -> list[int]:
        return sorted({s for (q, s) in self.season})

    # -- INT cells ---------------------------------------------------------
    @staticmethod
    def season_key_for(season: int, week: int | None, max_week_2026: int | None = None) -> str:
        if season == 2026:
            # cap at the latest charted week (point-in-time: never reach past data)
            w = week if week is not None else max_week_2026
            if max_week_2026 is not None and w is not None:
                w = min(w, max_week_2026)
            return f"2026_w{w}"
        return str(season)

    def _pool_seasons(self, season_key: str) -> list[int]:
        if season_key.startswith("2026_w"):
            return [2024, 2025, 2026]
        s = int(season_key)
        return [x for x in (s - 2, s - 1, s)]

    def _cell(self, scope: str, id_: str, season_key: str, cell: str) -> tuple[int, int]:
        return self.cells.get((scope, id_, season_key, cell), (0, 0))

    def pool_pressured_dropbacks(self, qb_id: str, season_key: str) -> int:
        """Pooled pressured (floor) dropbacks for the :23 guard."""
        total = 0
        for s in self._pool_seasons(season_key):
            r = self.season.get((qb_id, s))
            if r and r.get("n_press"):
                total += int(float(r["n_press"]))
        return total

    def int_rate(self, qb_id: str, team: str | None, season_key: str,
                 cell: str) -> dict[str, Any]:
        """EB-shrunk INT rate for one cell. Returns rate (0-1), n, level,
        and the ladder components. Never raises on missing data (backs off)."""
        nL, wL = self._cell("L", "NFL", season_key, cell)
        nT, wT = self._cell("T", team or "", season_key, cell)
        nQ, wQ = self._cell("Q", qb_id, season_key, cell)
        rate_L = _eb(nL, wL, INT_BASELINE)
        rate_T = _eb(nT, wT, rate_L)
        rate_Q = _eb(nQ, wQ, rate_T)
        p = int(cell.split("_")[0][1:])
        if nQ >= LEAF_MIN_N and (p == 0 or
                                 self.pool_pressured_dropbacks(qb_id, season_key) >= MIN_PRESSURED_DROPBACKS):
            level, rate, n = "qb", rate_Q, nQ
        elif nT >= LEAF_MIN_N:
            level, rate, n = "team", rate_T, nT
        else:
            level, rate, n = "league", rate_L, nL
        return {"rate": rate, "n": n, "level": level,
                "rate_qb": rate_Q, "rate_team": rate_T, "rate_league": rate_L,
                "n_qb": nQ, "n_team": nT, "n_league": nL}

    def int_rate_marginal(self, qb_id: str, team: str | None, season_key: str,
                          pressured: int) -> dict[str, Any]:
        """EB-shrunk INT rate marginal over all cells with p=pressured."""
        agg: dict[tuple[str, str, str], list[int]] = {}
        for (scope, id_, sk, cell), (n, w) in self.cells.items():
            if sk != season_key or not cell.startswith(f"p{pressured}_"):
                continue
            k = (scope, id_)
            a = agg.setdefault(k, [0, 0])
            a[0] += n
            a[1] += w
        nL, wL = agg.get(("L", "NFL"), [0, 0])
        nT, wT = agg.get(("T", team or ""), [0, 0])
        nQ, wQ = agg.get(("Q", qb_id), [0, 0])
        rate_L = _eb(nL, wL, INT_BASELINE)
        rate_T = _eb(nT, wT, rate_L)
        rate_Q = _eb(nQ, wQ, rate_T)
        if nQ >= LEAF_MIN_N and (pressured == 0 or
                                 self.pool_pressured_dropbacks(qb_id, season_key) >= MIN_PRESSURED_DROPBACKS):
            level, rate, n = "qb", rate_Q, nQ
        elif nT >= LEAF_MIN_N:
            level, rate, n = "team", rate_T, nT
        else:
            level, rate, n = "league", rate_L, nL
        return {"rate": rate, "n": n, "level": level,
                "rate_qb": rate_Q, "rate_team": rate_T, "rate_league": rate_L,
                "n_qb": nQ, "n_team": nT, "n_league": nL}

    def int_rate_for_situation(self, qb_id: str, team: str | None, season: int,
                               week: int | None, situation: dict,
                               max_week_2026: int | None = None) -> dict[str, Any]:
        """INT rate for a query situation dict {pressured (0/1), qtr,
        score_differential, yardline_100, down, ydstogo}. Encodes via
        cells.int_cell_from_play — the same function the build used."""
        from .cells import int_cell_from_play
        key = self.season_key_for(season, week, max_week_2026)
        play = {
            "qb_hit": 1 if situation.get("pressured") else 0,
            "sack": 0,
            "qtr": situation.get("qtr"),
            "score_differential": situation.get("score_differential"),
            "yardline_100": situation.get("yardline_100"),
            "down": situation.get("down"),
            "ydstogo": situation.get("ydstogo"),
        }
        cell = int_cell_from_play(play)
        out = self.int_rate(qb_id, team, key, cell)
        out["cell"] = cell
        out["season_key"] = key
        return out
