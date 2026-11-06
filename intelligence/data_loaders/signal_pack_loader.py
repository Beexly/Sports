#!/usr/bin/env python3
"""
intelligence/data_loaders/signal_pack_loader.py — Signal-Pack Consumer (New Wire 1),
`gate_decisions` Append-Only Writer (New Wire 3), `nflverse` Pure-Count Situational
Functions (New Wire 4), and `harvest_situational_signals` (Kernel 7).
"""
from __future__ import annotations

import csv
import json
import statistics
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Sequence

_REPO_ROOT = Path(__file__).resolve().parents[2]

SIGNAL_PACK_LAYER_MAP: Dict[str, str] = {
    "01_red_zone_xtd_share.csv": "usage/redzone",
    "02_missed_tackles_by_defense.csv": "defense/tackling",
    "03_qb_throwaway_rate.csv": "qb/throwaways",
    "04_rb_rushing_epa.csv": "rushing/epa",
    "05_big_plays_vs_success.csv": "offense/explosiveness",
    "06_defensive_epa_by_quarter.csv": "defense/quarter_splits",
    "07_paired_flip_leverage.csv": "simulation/leverage",
}

SIGNAL_PACK_7_FILES: tuple[str, ...] = tuple(SIGNAL_PACK_LAYER_MAP.keys())

SFDATA9ERS_COMPOSITE_QB_WEIGHTS: Dict[str, float] = {
    "qbr": 0.30,
    "epa_per_play": 0.20,
    "cpoe": 0.15,
    "success_rate": 0.15,
    "bad_throw_pct_inv": 0.10,
    "pressure_to_sack_pct_inv": 0.10,
}

TIMO_PAIRED_FLIP_DEFAULT_RATIO: float = 1.3607067279535205


def _read_csv_rows(path: Path) -> List[Dict[str, str]]:
    with path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        return [dict(row) for row in reader]


def compute_sfdata9ers_composite_qb_score(
    qbr_pctile: float,
    epa_pctile: float,
    cpoe_pctile: float,
    sr_pctile: float,
    bad_throw_inv_pctile: float,
    p2s_inv_pctile: float,
) -> float:
    """@sfdata9ers composite QB efficiency formula (0.30 QBR + 0.20 EPA + 0.15 CPOE + 0.15 SR + 0.10 BadThrow% + 0.10 P2S%)."""
    w = SFDATA9ERS_COMPOSITE_QB_WEIGHTS
    return float(
        w["qbr"] * float(qbr_pctile)
        + w["epa_per_play"] * float(epa_pctile)
        + w["cpoe"] * float(cpoe_pctile)
        + w["success_rate"] * float(sr_pctile)
        + w["bad_throw_pct_inv"] * float(bad_throw_inv_pctile)
        + w["pressure_to_sack_pct_inv"] * float(p2s_inv_pctile)
    )


def consume_signal_pack(
    pack_dir: str | Path | None = None,
    weeks: Sequence[int] = (1, 2, 3, 4, 5, 6, 7),
    require_all_tables: bool = True,
) -> Dict[str, Any]:
    """
    New Wire 1 — Consume `docs/research/2026-10-30/signal-pack/`:
    - Maps each of the 7 tables to its layer (`SIGNAL_PACK_LAYER_MAP`).
    - Refuses a missing table (`FileNotFoundError`) instead of fabricating it.
    - Enforces `weeks` within `1..7` only (`ValueError` otherwise).
    - `broken_tackles_allowed` returns `'NOT_AVAILABLE'`.
    - Keeps the PFR-recomputed throwaway rate columns (`thawy_per_dropback`, `thawy_per_attempt`)
      and never overwrites with the post's Young 12.7 / Nix 11.5 / Daniels 11.2.
    """
    week_list = [int(w) for w in weeks]
    if not week_list or any(w < 1 or w > 7 for w in week_list):
        raise ValueError(f"Signal pack weeks must be within 1..7 only; got {week_list}")

    base_dir = (
        Path(pack_dir)
        if pack_dir is not None
        else (_REPO_ROOT / "docs" / "research" / "2026-10-30" / "signal-pack" / "outputs")
    )
    if (base_dir / "outputs").is_dir():
        base_dir = base_dir / "outputs"

    by_layer: Dict[str, List[Dict[str, str]]] = {}
    by_file: Dict[str, List[Dict[str, str]]] = {}
    for fname, layer in SIGNAL_PACK_LAYER_MAP.items():
        fpath = base_dir / fname
        if not fpath.is_file():
            if require_all_tables:
                raise FileNotFoundError(f"Refusing missing signal-pack table: {fpath}")
            continue
        rows = _read_csv_rows(fpath)
        by_file[fname] = rows
        by_layer[layer] = rows

    # Verify PFR-recomputed throwaway columns are preserved untouched
    thawy_rows = by_file.get("03_qb_throwaway_rate.csv") or []
    pfr_throwaway_preserved = all(
        "thawy_per_dropback" in r and "thawy_per_attempt" in r for r in thawy_rows
    )

    timo_ratio = TIMO_PAIRED_FLIP_DEFAULT_RATIO
    for row in by_file.get("07_paired_flip_leverage.csv") or []:
        if row.get("config") == "contender" and row.get("inflation_ratio"):
            timo_ratio = float(row["inflation_ratio"])
            break

    return {
        "weeks": tuple(week_list),
        "by_layer": by_layer,
        "by_file": by_file,
        "table_count": len(by_file),
        "broken_tackles_allowed": "NOT_AVAILABLE",
        "pfr_throwaway_columns_preserved": pfr_throwaway_preserved,
        "timo_paired_flip_inflation_ratio": timo_ratio,
    }


def load_signal_pack_and_full_tables(repo_root: str | Path | None = None) -> Dict[str, Any]:
    """
    Loads the 7 signal-pack tables and the on-disk full-tables CSVs without scraping.
    """
    root = Path(repo_root) if repo_root is not None else _REPO_ROOT
    sp = consume_signal_pack(root / "docs" / "research" / "2026-10-30" / "signal-pack" / "outputs")
    ft_dir = root / "docs" / "research" / "2026-10-30" / "full-tables"
    full_tables: Dict[str, List[Dict[str, str]]] = {}
    if ft_dir.is_dir():
        for csv_path in sorted(ft_dir.glob("*.csv")):
            full_tables[csv_path.name] = _read_csv_rows(csv_path)

    return {
        "signal_pack_table_count": sp["table_count"],
        "full_tables_csv_count": len(full_tables),
        "signal_pack_tables": sp["by_file"],
        "signal_pack_by_layer": sp["by_layer"],
        "broken_tackles_allowed": sp["broken_tackles_allowed"],
        "pfr_throwaway_columns_preserved": sp["pfr_throwaway_columns_preserved"],
        "full_tables": full_tables,
        "timo_paired_flip_inflation_ratio": sp["timo_paired_flip_inflation_ratio"],
        "sfdata9ers_composite_qb_weights": dict(SFDATA9ERS_COMPOSITE_QB_WEIGHTS),
    }


# ============================================================================
# New Wire 3 — `gate_decisions` Append-Only Writer
# Matches Prisma `gate_decisions` schema (`20260522223500_add_gate_decisions`)
# ============================================================================

LEGAL_GATE_DECISIONS = frozenset({"PASS", "REJECT", "ABSTAIN"})


def append_gate_decision(
    game_id: str,
    market: str,
    model_prob: float,
    threshold: float,
    decision: str,
    reason: str,
    ledger_path: str | Path | None = None,
    model_version: str = "gse-v5.3.0-2026-10-30",
) -> Dict[str, Any]:
    """
    New Wire 3 — Append-only `gate_decisions` writer.
    - Validates `decision in {'PASS', 'REJECT', 'ABSTAIN'}` (`ABSTAIN` is a legal decision;
      never defaults a row to `PASS`).
    - Records `game_id`, `market`, `model_prob`, `threshold`, `decision`, `reason`, plus
      Prisma `gate_decisions` schema fields (`id`, `gameId`, `status`, `reasonCode`, `modelVersion`, `evaluatedAt`).
    - Pure local file append; does NOT open the fleet bus and does NOT bind a socket.
    """
    dec = str(decision).strip().upper()
    if dec not in LEGAL_GATE_DECISIONS:
        raise ValueError(f"Illegal gate decision '{decision}'; must be one of {sorted(LEGAL_GATE_DECISIONS)}")
    if not str(game_id).strip() or not str(market).strip() or not str(reason).strip():
        raise ValueError("game_id, market, and reason must be non-empty strings")
    mp = float(model_prob)
    th = float(threshold)
    if not (0.0 <= mp <= 1.0 and 0.0 <= th <= 1.0):
        raise ValueError("model_prob and threshold must lie in [0, 1]")

    status_enum = "PUBLISHED" if dec == "PASS" else "GATED"
    record: Dict[str, Any] = {
        "id": f"gd-{uuid.uuid4().hex[:12]}",
        "game_id": str(game_id).strip(),
        "gameId": str(game_id).strip(),
        "market": str(market).strip(),
        "model_prob": mp,
        "threshold": th,
        "decision": dec,
        "status": status_enum,
        "reason": str(reason).strip()[:240],
        "reasonCode": f"GATE_{dec}_{str(market).strip().upper()}",
        "modelVersion": model_version,
        "isBootstrap": False,
        "evaluatedAt": datetime.now(timezone.utc).isoformat(),
    }
    if ledger_path is not None:
        out_path = Path(ledger_path)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with out_path.open("a", encoding="utf-8", newline="\n") as f:
            f.write(json.dumps(record, sort_keys=True) + "\n")
    return record


# ============================================================================
# New Wire 4 & Kernel 7 — `nflverse` Situations (Pure Counts, No Chart Transcription)
# ============================================================================

def drive_start_yards(kick_returns: Iterable[Dict[str, Any] | float]) -> float | None:
    """
    Average starting field position on normal kickoffs only (`normal_kickoff=True`),
    no penalty on the play (`penalty=False`), minimum 7 valid returns, else `None`.
    """
    valid_starts: list[float] = []
    for item in kick_returns:
        if isinstance(item, dict):
            is_normal = bool(item.get("normal_kickoff", True))
            has_penalty = bool(item.get("penalty", False))
            if not is_normal or has_penalty:
                continue
            yl = item.get("start_yardline", item.get("yardline"))
            if yl is not None:
                valid_starts.append(float(yl))
        else:
            valid_starts.append(float(item))
    if len(valid_starts) < 7:
        return None
    return float(sum(valid_starts) / len(valid_starts))


def offense_average_drive_start(drives: Iterable[Dict[str, Any] | float]) -> float | None:
    """Team companion to `drive_start_yards`: offense average starting field position."""
    vals: list[float] = []
    for d in drives:
        if isinstance(d, dict):
            if d.get("start_yardline") is not None:
                vals.append(float(d["start_yardline"]))
        else:
            vals.append(float(d))
    if not vals:
        return None
    return float(sum(vals) / len(vals))


def rz_points_per_trip(trips: Iterable[Dict[str, Any] | float]) -> float | None:
    """
    Points scored or allowed on red-zone trips divided by trips. Rate, not a count.
    Returns `None` if `trips == 0`.
    """
    pts: list[float] = []
    for t in trips:
        if isinstance(t, dict):
            pts.append(float(t.get("points", 0.0)))
        else:
            pts.append(float(t))
    if len(pts) == 0:
        return None
    return float(sum(pts) / len(pts))


def success_rate_allowed_split(plays: Iterable[Dict[str, Any]]) -> Dict[str, float | None]:
    """
    Opponent success rate on passes and on runs, separately.
    """
    pass_succ: list[float] = []
    run_succ: list[float] = []
    for p in plays:
        ptype = str(p.get("play_type", "")).lower()
        succ = 1.0 if bool(p.get("success", float(p.get("epa", 0.0)) > 0.0)) else 0.0
        if ptype in ("pass", "dropback", "sack"):
            pass_succ.append(succ)
        elif ptype in ("run", "rush"):
            run_succ.append(succ)
    return {
        "pass_success_rate_allowed": (float(sum(pass_succ) / len(pass_succ)) if pass_succ else None),
        "run_success_rate_allowed": (float(sum(run_succ) / len(run_succ)) if run_succ else None),
    }


def stuff_rate(rushes: Sequence[float | Dict[str, Any]], window: int = 3) -> Dict[str, Any]:
    """
    Share of rushes with `yards <= 0`. `window` is an explicit rolling-window argument.
    """
    if window < 1:
        raise ValueError("window must be >= 1")
    yds: list[float] = [
        float(r["yards_gained"] if isinstance(r, dict) else r) for r in rushes
    ]
    if not yds:
        return {"overall_stuff_rate": None, "window_stuff_rate": None, "window": int(window)}
    overall = float(sum(1 for y in yds if y <= 0.0) / len(yds))
    tail = yds[-window:]
    win_rate = float(sum(1 for y in tail if y <= 0.0) / len(tail))
    return {
        "overall_stuff_rate": overall,
        "window_stuff_rate": win_rate,
        "window": int(window),
    }


def carry_distribution(yards: Sequence[float]) -> Dict[str, Any]:
    """
    Returns the empirical sorted list, the median, the share over 5 (`> 5`), and the count.
    Never collapses to yards per carry (YPC).
    """
    emp = sorted(float(y) for y in yards)
    n = len(emp)
    if n == 0:
        return {"yards": [], "median": None, "share_over_5": None, "count": 0}
    med = float(statistics.median(emp))
    over_5 = float(sum(1 for y in emp if y > 5.0) / n)
    return {
        "yards": emp,
        "median": med,
        "share_over_5": over_5,
        "count": n,
    }


def points_off_turnovers(drives: Iterable[Dict[str, Any]]) -> float:
    """Points scored or allowed on drives that start from a takeaway (`start_from_takeaway=True`)."""
    total = 0.0
    for d in drives:
        if bool(d.get("start_from_takeaway", False)):
            total += float(d.get("points", 0.0))
    return float(total)


def harvest_situational_signals(pbp: Sequence[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Kernel 7 — Extracts situation-controlled features from a play-by-play sequence
    (e.g., a 10-play synthetic drive).
    """
    sr_split = success_rate_allowed_split(pbp)
    rush_plays = [
        float(p.get("yards_gained", 0.0))
        for p in pbp
        if str(p.get("play_type", "")).lower() in ("run", "rush")
    ]
    pass_plays = [
        p for p in pbp if str(p.get("play_type", "")).lower() in ("pass", "dropback", "sack")
    ]
    pressures = sum(1 for p in pass_plays if bool(p.get("pressured", False)))
    blitzes = sum(1 for p in pass_plays if bool(p.get("blitzed", False)))
    p_rate = float(pressures / len(pass_plays)) if pass_plays else 0.0
    b_rate = float(blitzes / len(pass_plays)) if pass_plays else 0.0
    non_blitz_surplus = float(p_rate - 0.85 * b_rate)

    rz_trips = [p for p in pbp if bool(p.get("rz_trip_end", False))]
    return {
        "play_count": len(pbp),
        "success_rate_allowed_split": sr_split,
        "stuff_rate": stuff_rate(rush_plays, window=3),
        "carry_distribution": carry_distribution(rush_plays),
        "rz_points_per_trip": rz_points_per_trip(rz_trips),
        "non_blitz_pressure_surplus": non_blitz_surplus,
    }
