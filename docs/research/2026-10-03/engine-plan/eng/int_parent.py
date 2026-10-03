#!/usr/bin/env python3
"""Point-in-time parent interception rate from int_cells counts.

Ladder (c02 buildable-systems): cell = (w + 25 * p_hat_parent) / (n + 25),
league -> team -> QB. Leaf not served when n < 30.

p_hat at a row is w/n when n > 0 else null.
For a QB leaf, p_hat_parent is the team cell rate at the prior season_key when
the team id is uniquely recoverable from qb_weekly.csv; otherwise the league
cell rate at that same prior season_key. No invented rates.
"""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

INT_CELLS = Path(r"C:\Users\Garrett\Sports-wt-engineplan\intelligence\qb-behavior\data\int_cells.csv")
QB_WEEKLY = Path(r"C:\Users\Garrett\Sports-wt-engineplan\intelligence\qb-behavior\data\qb_weekly.csv")
OUT_DIR = Path(r"C:\Users\Garrett\_research\ctx-2026-10-03\eng")
PARQUET = OUT_DIR / "int_parent.parquet"
COVERAGE = OUT_DIR / "int_parent_coverage.json"
M_EB = 25
LEAF_MIN_N = 30


def parse_season_key(sk: str) -> tuple[int, int | None]:
    """Return (season, week_or_None). Week keys look like 2026_w3."""
    s = str(sk)
    if "_w" in s:
        season_s, week_s = s.split("_w", 1)
        return int(season_s), int(week_s)
    return int(s), None


def season_key_sort_key(sk: str) -> tuple[int, int]:
    season, week = parse_season_key(sk)
    # Season-only keys sort before week keys of later seasons.
    # Within 2026, week keys order by week.
    return (season, 0 if week is None else week)


def build_prior_map(keys: list[str]) -> dict[str, str | None]:
    ordered = sorted(set(keys), key=season_key_sort_key)
    prior: dict[str, str | None] = {}
    for i, k in enumerate(ordered):
        prior[k] = ordered[i - 1] if i else None
    return prior


def main() -> None:
    cells = pd.read_csv(INT_CELLS, low_memory=False)
    cells["season_key"] = cells["season_key"].astype(str)
    cells["n"] = cells["n"].astype(int)
    cells["w"] = cells["w"].astype(int)
    scope_counts = cells["scope"].value_counts().to_dict()

    cells["p_hat"] = cells.apply(
        lambda r: (r["w"] / r["n"]) if r["n"] > 0 else None, axis=1
    )

    prior_of = build_prior_map(cells["season_key"].tolist())
    pit_rule = (
        "season_key values are either a calendar season (e.g. '2024') or a "
        "week-encoded key (e.g. '2026_w2'). Ordered timeline: seasons 2010..2025, "
        "then 2026_w1, 2026_w2, 2026_w3. For every QB row, parent_season_key is "
        "the single immediately preceding key in that order (strictly before). "
        "A season key's parent is the previous season; 2026_w1's parent is 2025; "
        "2026_wK's parent is 2026_w(K-1). No same-key parent. No pooling across "
        "multiple prior keys."
    )

    # Lookup: (scope, id, season_key, cell) -> (n, w, p_hat)
    lookup: dict[tuple[str, str, str, str], tuple[int, int, float]] = {}
    for r in cells.itertuples(index=False):
        if r.n > 0:
            lookup[(r.scope, r.id, r.season_key, r.cell)] = (
                int(r.n),
                int(r.w),
                float(r.w) / float(r.n),
            )

    # QB -> team from qb_weekly only, no guessing on multi-team grains
    qw = pd.read_csv(QB_WEEKLY, low_memory=False)
    qw["qb_id"] = qw["qb_id"].astype(str)
    qw["team"] = qw["team"].astype(str)
    qw["season"] = qw["season"].astype(int)
    qw["week"] = qw["week"].astype(int)

    season_teams = (
        qw.groupby(["qb_id", "season"])["team"]
        .agg(lambda s: s.drop_duplicates().tolist())
        .to_dict()
    )
    week_teams = (
        qw.groupby(["qb_id", "season", "week"])["team"]
        .agg(lambda s: s.drop_duplicates().tolist())
        .to_dict()
    )

    def team_for(qb_id: str, season_key: str) -> str | None:
        season, week = parse_season_key(season_key)
        if week is not None:
            teams = week_teams.get((qb_id, season, week))
        else:
            teams = season_teams.get((qb_id, season))
        if teams is None or len(teams) != 1:
            return None
        return teams[0]

    q = cells[cells["scope"] == "Q"].copy()
    rows = []
    n_team_parent = 0
    n_league_parent = 0
    n_no_parent = 0
    n_team_id_found = 0
    n_team_id_missing = 0
    n_multi_or_ambiguous = 0

    for r in q.itertuples(index=False):
        parent_sk = prior_of.get(r.season_key)
        team = team_for(r.id, r.season_key)
        parent_scope = None
        parent_id = None
        parent_n = None
        parent_w = None
        p_hat_parent = None
        parent_source = None

        if team is not None:
            n_team_id_found += 1
        else:
            n_team_id_missing += 1
            season, week = parse_season_key(r.season_key)
            if week is not None:
                teams = week_teams.get((r.id, season, week))
            else:
                teams = season_teams.get((r.id, season))
            if teams is not None and len(teams) > 1:
                n_multi_or_ambiguous += 1

        if parent_sk is not None:
            if team is not None:
                hit = lookup.get(("T", team, parent_sk, r.cell))
                if hit is not None:
                    parent_scope, parent_id = "T", team
                    parent_n, parent_w, p_hat_parent = hit
                    parent_source = "team_prior_season_key"
                    n_team_parent += 1
            if p_hat_parent is None:
                # No identifiable team, or team cell absent at prior key:
                # league parent at that prior season_key only (counts only).
                hit = lookup.get(("L", "NFL", parent_sk, r.cell))
                if hit is not None:
                    parent_scope, parent_id = "L", "NFL"
                    parent_n, parent_w, p_hat_parent = hit
                    parent_source = "league_prior_season_key"
                    n_league_parent += 1

        if p_hat_parent is None:
            n_no_parent += 1

        served = False
        cell_rate = None
        if r.n >= LEAF_MIN_N and p_hat_parent is not None:
            cell_rate = (r.w + M_EB * p_hat_parent) / (r.n + M_EB)
            served = True

        rows.append(
            {
                "scope": r.scope,
                "id": r.id,
                "season_key": r.season_key,
                "cell": r.cell,
                "n": int(r.n),
                "w": int(r.w),
                "p_hat": float(r.w) / float(r.n) if r.n > 0 else None,
                "team_id": team,
                "parent_season_key": parent_sk,
                "parent_scope": parent_scope,
                "parent_id": parent_id,
                "parent_n": parent_n,
                "parent_w": parent_w,
                "p_hat_parent": p_hat_parent,
                "parent_source": parent_source,
                "cell_rate": cell_rate,
                "served": served,
            }
        )

    out = pd.DataFrame(rows)
    out.to_parquet(PARQUET, index=False)

    nonnull_parent = int(out["p_hat_parent"].notna().sum())
    coverage = {
        "scopes_in_int_cells": scope_counts,
        "scope_values": sorted(scope_counts.keys()),
        "ladder_supported": set(scope_counts.keys()) == {"L", "T", "Q"},
        "pit_rule": pit_rule,
        "prior_season_key_map": {
            k: prior_of[k] for k in sorted(prior_of, key=season_key_sort_key)
        },
        "team_id_source": (
            "qb_weekly.csv (qb_id, team, season, week); season-level keys require "
            "exactly one distinct team across weeks in that season; week keys "
            "require exactly one team at that exact (season, week). Multi-team "
            "or missing -> no team id, league parent only."
        ),
        "p_hat_definition": "w/n when n>0 else null; never invented",
        "p_hat_parent_rule": (
            "QB leaf: team p_hat at parent_season_key same cell when team_id "
            "known and T row exists; else league p_hat at that parent_season_key "
            "same cell. No INT_BASELINE. No same-key parent."
        ),
        "formula": (
            "cell_rate = (w + 25 * p_hat_parent) / (n + 25) when n>=30 and "
            "p_hat_parent not null; else cell_rate null (not served)"
        ),
        "leaf_min_n": LEAF_MIN_N,
        "rows": int(len(out)),
        "p_hat_parent_non_null": nonnull_parent,
        "p_hat_parent_non_null_fraction": (
            float(nonnull_parent / len(out)) if len(out) else None
        ),
        "parent_source_counts": {
            "team_prior_season_key": n_team_parent,
            "league_prior_season_key": n_league_parent,
            "none": n_no_parent,
        },
        "team_id_found": n_team_id_found,
        "team_id_missing": n_team_id_missing,
        "team_id_ambiguous_multi": n_multi_or_ambiguous,
        "served_rows": int(out["served"].sum()),
        "parquet": str(PARQUET),
        "sources": {"int_cells": str(INT_CELLS), "qb_weekly": str(QB_WEEKLY)},
        "note": (
            "No fit, mint, commit, or push. Pressure 100-dropback guard not "
            "applied (not in this task)."
        ),
    }
    COVERAGE.write_text(json.dumps(coverage, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "rows": coverage["rows"],
                "p_hat_parent_non_null_fraction": coverage[
                    "p_hat_parent_non_null_fraction"
                ],
                "scopes": coverage["scope_values"],
                "served_rows": coverage["served_rows"],
                "parent_source_counts": coverage["parent_source_counts"],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
