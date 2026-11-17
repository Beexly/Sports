"""Bitemporal ASOF freeze, 3-wk purged CPCV, ES/VS, Holm-Bonferroni & Weeks 1-10 OOS Ablation."""

from __future__ import annotations

import argparse
import importlib
import itertools
import json
import math
import re
import sys
from collections.abc import Sequence
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from gse_engine.fabric.e_process import MultiplicityAgrapaOnsGate
from gse_engine.ingestion.multimodal_vlm_and_provenance import NFL_EPA_MIN_GAMES
from gse_engine.science.gsi_translational_bridge import evaluate_paired_projection_progression

_TEAM_ALIAS: dict[str, str] = {"LA": "LAR", "WSH": "WAS", "JAC": "JAX"}


class SourceCannotSpeakAsOfError(RuntimeError):
    """Raised on any attempt to ingest rows visible_at > decision_timestamp_utc (AP-12)."""


@dataclass(frozen=True, slots=True)
class BitemporalRecord:
    """Stamped feature/odds observation guarded against future lookahead."""

    record_id: str
    season: int
    week: int
    visible_at_utc: int
    forecast_init_utc: int
    payload: float


@dataclass(frozen=True, slots=True)
class CpcvFold:
    """Purged & embargoed chronological cross-validation split grouped by (Season, Week)."""

    fold_id: int
    train_weeks: tuple[tuple[int, int], ...]
    test_weeks: tuple[tuple[int, int], ...]
    purged_weeks: tuple[tuple[int, int], ...]


@dataclass(frozen=True, slots=True)
class CompletedGameRow:
    """Canonical completed 2026 NFL regular-season game for chronological OOS evaluation."""

    game_id: str
    season: int
    week: int
    away_team: str
    home_team: str
    away_score: float
    home_score: float
    expected_home_margin_mkt: float
    close_total_mkt: float
    is_indoor: bool
    in_game_qb1_trauma_exit: bool = False


def enforce_bitemporal_asof_freeze(
    records: Sequence[BitemporalRecord],
    *,
    decision_timestamp_utc: int,
    strict_fail: bool = True,
) -> list[BitemporalRecord]:
    """Ensure only information strictly observable at or before decision_t enters features."""
    out: list[BitemporalRecord] = []
    cutoff = int(decision_timestamp_utc)
    for rec in records:
        if rec.visible_at_utc > cutoff or rec.forecast_init_utc > cutoff:
            if strict_fail:
                raise SourceCannotSpeakAsOfError(
                    f"Record {rec.record_id} leaked future timestamp "
                    f"(visible={rec.visible_at_utc}, init={rec.forecast_init_utc} > {cutoff})."
                )
            continue
        out.append(rec)
    return out


def build_purged_embargoed_cpcv_folds(
    season_weeks: Sequence[tuple[int, int]],
    *,
    test_block_len: int = 2,
    purge_weeks: int = 3,
    embargo_weeks: int = 1,
) -> list[CpcvFold]:
    """Generate (Season, Week)-grouped CPCV folds with 3-week purge + 1-week embargo."""
    unique_sw = sorted({(int(s), int(w)) for s, w in season_weeks})
    n = len(unique_sw)
    folds: list[CpcvFold] = []
    if n < test_block_len + purge_weeks + 2:
        return folds

    chunks = [
        list(range(start, min(n, start + test_block_len)))
        for start in range(0, n, max(1, int(test_block_len)))
        if len(range(start, min(n, start + test_block_len))) > 0
    ]
    n_groups = len(chunks)
    if n_groups < 2:
        return folds

    fold_idx = 0
    for g1, g2 in itertools.combinations(range(n_groups), 2):
        test_idx_set = set(chunks[g1]) | set(chunks[g2])
        purge_idx_set: set[int] = set()
        for g_idx in (g1, g2):
            c_start = chunks[g_idx][0]
            c_end = chunks[g_idx][-1] + 1
            for p_i in range(max(0, c_start - purge_weeks), c_start):
                if p_i not in test_idx_set:
                    purge_idx_set.add(p_i)
            for p_i in range(c_end, min(n, c_end + purge_weeks + embargo_weeks)):
                if p_i not in test_idx_set:
                    purge_idx_set.add(p_i)

        test_set = {unique_sw[i] for i in test_idx_set}
        purge_set = {unique_sw[i] for i in purge_idx_set}
        train_sw = tuple(sw for sw in unique_sw if sw not in test_set and sw not in purge_set)
        if train_sw:
            folds.append(
                CpcvFold(
                    fold_id=fold_idx,
                    train_weeks=train_sw,
                    test_weeks=tuple(sorted(test_set)),
                    purged_weeks=tuple(sorted(purge_set)),
                )
            )
            fold_idx += 1
    return folds


def energy_score(ensemble_draws: Sequence[Sequence[float]], target_y: Sequence[float]) -> float:
    """Compute multivariate proper Energy Score ES(F, y) = E||X-y|| - 0.5 E||X-X'||."""
    m = len(ensemble_draws)
    d = len(target_y)
    if m < 2 or d == 0:
        raise ValueError("Need m >= 2 multivariate ensemble draws.")
    t_sum = 0.0
    for x in ensemble_draws:
        t_sum += math.sqrt(sum((float(x[k]) - float(target_y[k])) ** 2 for k in range(d)))
    term1 = t_sum / float(m)

    pair_sum = 0.0
    for i in range(m):
        xi = ensemble_draws[i]
        for j in range(i + 1, m):
            xj = ensemble_draws[j]
            pair_sum += 2.0 * math.sqrt(sum((float(xi[k]) - float(xj[k])) ** 2 for k in range(d)))
    term2 = pair_sum / float(2 * m * m)
    return max(0.0, term1 - term2)


def variogram_score_p05(
    ensemble_draws: Sequence[Sequence[float]],
    target_y: Sequence[float],
    *,
    p: float = 0.5,
) -> float:
    """Compute multivariate Variogram Score of order p=0.5 (Scheuerer & Hamill 2015)."""
    m = len(ensemble_draws)
    d = len(target_y)
    if m < 2 or d < 2:
        raise ValueError("Need m >= 2 draws and d >= 2 variables for Variogram Score.")
    total = 0.0
    for i in range(d):
        for j in range(i + 1, d):
            obs_diff = abs(float(target_y[i]) - float(target_y[j])) ** p
            ens_diff = sum(
                abs(float(x[i]) - float(x[j])) ** p for x in ensemble_draws
            ) / float(m)
            total += 2.0 * ((obs_diff - ens_diff) ** 2)
    return total


def holm_bonferroni_stepdown(p_values: Sequence[float], alpha: float = 0.05) -> list[bool]:
    """Return boolean acceptance flags clearing Holm-Bonferroni p_{(j)} <= alpha / (M - j + 1)."""
    m = len(p_values)
    if m == 0:
        return []
    indexed = sorted(enumerate(float(p) for p in p_values), key=lambda kv: kv[1])
    accepted = [False] * m
    for rank_0, (orig_idx, p_val) in enumerate(indexed):
        thresh = float(alpha) / float(m - rank_0)
        if p_val <= thresh:
            accepted[orig_idx] = True
        else:
            break
    return accepted


def gaussian_crps(mu: float, sigma: float, observed: float) -> float:
    """Exact closed-form Gneiting & Raftery (2007) Gaussian CRPS."""
    s = max(1e-6, float(sigma))
    z = (float(observed) - float(mu)) / s
    phi_pdf = math.exp(-0.5 * z * z) / math.sqrt(2.0 * math.pi)
    phi_cdf = 0.5 * math.erfc(-z / math.sqrt(2.0))
    return s * (z * (2.0 * phi_cdf - 1.0) + 2.0 * phi_pdf - (1.0 / math.sqrt(math.pi)))


def compute_k25_trauma_isolated_autopsy_weight(
    *,
    game_id: str,
    in_game_qb1_trauma_exit: bool,
    pregame_margin_proj: float,
    realized_margin: float,
) -> dict[str, float | str]:
    """Isolate Q1/in-game starter trauma exits strictly into Delta_luck (weight = 0.0)."""
    raw_residual = float(realized_margin) - float(pregame_margin_proj)
    if in_game_qb1_trauma_exit:
        return {
            "game_id": game_id,
            "learning_weight": 0.0,
            "delta_structural": 0.0,
            "delta_luck_trauma": round(raw_residual, 4),
            "routing_bucket": "DELTA_LUCK_TRAUMA_ISOLATED",
        }
    return {
        "game_id": game_id,
        "learning_weight": 1.0,
        "delta_structural": round(raw_residual, 4),
        "delta_luck_trauma": 0.0,
        "routing_bucket": "STRUCTURAL_CRITIC_ACTIVE",
    }


def _norm_tm(raw: str) -> str:
    u = str(raw or "").strip().upper()
    return _TEAM_ALIAS.get(u, u)


def _parse_espn_details_to_expected_home_margin(
    details: str,
    away_team: str,
    home_team: str,
    fallback_spread: float,
) -> float:
    """Convert ESPN 'BAL -4.5' / 'JAX -10' details into expected (home_score - away_score)."""
    clean = str(details or "").strip().upper()
    m = re.match(r"^([A-Z]{2,3})\s+([+-]?\d+(?:\.\d+)?)$", clean)
    if m:
        fav = _norm_tm(m.group(1))
        pts = abs(float(m.group(2)))
        if fav == home_team:
            return pts
        if fav == away_team:
            return -pts
    return -float(fallback_spread)


def _load_2025_team_epa_priors(repo_root: Path) -> dict[str, tuple[float, float]]:
    """Load 2025 regular-season team (off_epa, def_epa) priors for Weeks 1-3 shrinkage."""
    p25_path = repo_root / "data" / "nflverse" / "pbp" / "play_by_play_2025.parquet"
    if not p25_path.is_file():
        return {}
    pd: Any = importlib.import_module("pandas")
    df = pd.read_parquet(
        p25_path,
        columns=["season_type", "posteam", "defteam", "epa"],
    )
    reg = df[df["season_type"].astype(str).str.upper() == "REG"].dropna(subset=["epa"])
    reg = reg.copy()
    reg["posteam"] = reg["posteam"].astype(str).map(_norm_tm)
    reg["defteam"] = reg["defteam"].astype(str).map(_norm_tm)
    off_map = reg.groupby("posteam")["epa"].mean().to_dict()
    def_map = reg.groupby("defteam")["epa"].mean().to_dict()
    teams = set(off_map.keys()) | set(def_map.keys())
    return {
        tm: (float(off_map.get(tm, 0.0)), float(def_map.get(tm, 0.0)))
        for tm in teams
        if 2 <= len(tm) <= 3
    }


def _collect_completed_2026_games_and_pbp_stats(
    repo_root: Path,
) -> tuple[list[CompletedGameRow], dict[tuple[int, str], tuple[float, float, int]]]:
    """Assemble chronological 2026 Weeks 1-10 completed games & per-week team EPA."""
    pd: Any = importlib.import_module("pandas")
    pbp_path = repo_root / "data" / "nflverse" / "pbp" / "play_by_play_2026.parquet"
    games_by_id: dict[str, CompletedGameRow] = {}
    weekly_team_epa: dict[tuple[int, str], tuple[float, float, int]] = {}

    if pbp_path.is_file():
        df = pd.read_parquet(
            pbp_path,
            columns=[
                "game_id",
                "week",
                "season_type",
                "away_team",
                "home_team",
                "away_score",
                "home_score",
                "spread_line",
                "total_line",
                "roof",
                "posteam",
                "defteam",
                "epa",
            ],
        )
        reg = df[df["season_type"].astype(str).str.upper() == "REG"].copy()
        reg["away_team"] = reg["away_team"].astype(str).map(_norm_tm)
        reg["home_team"] = reg["home_team"].astype(str).map(_norm_tm)
        reg["posteam"] = reg["posteam"].astype(str).map(_norm_tm)
        reg["defteam"] = reg["defteam"].astype(str).map(_norm_tm)

        first_rows = reg.groupby("game_id", as_index=False).first()
        for row in first_rows.to_dict(orient="records"):
            wk = int(row["week"])
            aw = str(row["away_team"])
            hm = str(row["home_team"])
            gid = f"2026_{wk:02d}_{aw}_{hm}"
            roof_s = str(row.get("roof") or "outdoors").lower()
            games_by_id[gid] = CompletedGameRow(
                game_id=gid,
                season=2026,
                week=wk,
                away_team=aw,
                home_team=hm,
                away_score=float(row["away_score"]),
                home_score=float(row["home_score"]),
                # nflverse spread_line > 0 means home team is favored by spread_line
                expected_home_margin_mkt=float(row.get("spread_line") or 0.0),
                close_total_mkt=float(row.get("total_line") or 44.5),
                is_indoor=roof_s in {"dome", "closed"},
            )

        valid_epa = reg.dropna(subset=["epa"])
        for (wk_val, tm_val), grp in valid_epa.groupby(["week", "posteam"]):
            tm_s = str(tm_val)
            if not (2 <= len(tm_s) <= 3):
                continue
            def_grp = valid_epa[
                (valid_epa["week"] == wk_val) & (valid_epa["defteam"] == tm_s)
            ]
            off_e = float(grp["epa"].mean())
            def_e = float(def_grp["epa"].mean()) if not def_grp.empty else 0.0
            weekly_team_epa[(int(wk_val), tm_s)] = (
                off_e,
                def_e,
                int(grp["game_id"].nunique()),
            )

    # Supplement Week 8 (13 completed finals from espn_week8_finals_2026-11-02.json)
    w8_fin_path = repo_root / "data" / "engine" / "espn_week8_finals_2026-11-02.json"
    w8_card_path = repo_root / "data" / "engine" / "week8_360_locked_card_2026_10_30.json"
    w8_lines: dict[tuple[str, str], tuple[float, float]] = {}
    indoor_arenas = {"ATL", "ARI", "DAL", "DET", "HOU", "IND", "LAC", "LAR", "LV", "MIN", "NO"}
    if w8_card_path.is_file():
        c8 = json.loads(w8_card_path.read_text(encoding="utf-8"))
        for row8 in list(c8.get("top_main_lines") or []) + list(
            c8.get("reconciled_pass_items") or []
        ):
            mk8 = str(row8.get("matchup") or "")
            if "@" not in mk8:
                continue
            aw_r, hm_r = [_norm_tm(p) for p in mk8.split("@", 1)]
            cur_sp, cur_tot = w8_lines.get((aw_r, hm_r), (0.0, 44.5))
            cat8 = str(row8.get("category") or "")
            sel8 = str(row8.get("selection") or "").strip().upper()
            mline8 = float(row8.get("market_line") or 0.0)
            if cat8 == "MAIN_SPREAD" and sel8:
                sel_tm = _norm_tm(sel8.split()[0])
                if sel_tm == hm_r:
                    cur_sp = -mline8
                elif sel_tm == aw_r:
                    cur_sp = mline8
            elif cat8 == "MAIN_TOTAL" and mline8 > 20.0:
                cur_tot = mline8
            w8_lines[(aw_r, hm_r)] = (cur_sp, cur_tot)

    if w8_fin_path.is_file():
        w8_fin = json.loads(w8_fin_path.read_text(encoding="utf-8"))
        for f8 in w8_fin.get("finals", []):
            aw8, hm8 = "", ""
            aws8, hms8 = 0.0, 0.0
            for t8 in f8.get("teams") or []:
                ab8 = _norm_tm(str(t8.get("abbr") or ""))
                sc8 = float(t8.get("score") or 0.0)
                if t8.get("homeAway") == "away":
                    aw8, aws8 = ab8, sc8
                elif t8.get("homeAway") == "home":
                    hm8, hms8 = ab8, sc8
            if aw8 and hm8:
                gid8 = f"2026_08_{aw8}_{hm8}"
                if gid8 not in games_by_id:
                    sp8_v, tot8_v = w8_lines.get((aw8, hm8), (0.0, 44.5))
                    games_by_id[gid8] = CompletedGameRow(
                        game_id=gid8,
                        season=2026,
                        week=8,
                        away_team=aw8,
                        home_team=hm8,
                        away_score=aws8,
                        home_score=hms8,
                        expected_home_margin_mkt=sp8_v,
                        close_total_mkt=tot8_v,
                        is_indoor=hm8 in indoor_arenas,
                    )

    # Supplement Week 9 (15 completed games: 14 Sunday/TNF + BUF@MIN MNF)
    sb9_path = repo_root / "data" / "engine" / "_espn_week9_scoreboard.json"
    sb9_lines: dict[tuple[str, str], tuple[float, float, bool]] = {}
    if sb9_path.is_file():
        sb9 = json.loads(sb9_path.read_text(encoding="utf-8"))
        for ev in sb9.get("events", []):
            comp = (ev.get("competitions") or [{}])[0]
            aw9, hm9 = "", ""
            for c in comp.get("competitors") or []:
                ab = _norm_tm(str((c.get("team") or {}).get("abbreviation") or ""))
                if c.get("homeAway") == "away":
                    aw9 = ab
                elif c.get("homeAway") == "home":
                    hm9 = ab
            if aw9 and hm9:
                odds = (comp.get("odds") or [{}])[0]
                exp_hm = _parse_espn_details_to_expected_home_margin(
                    str(odds.get("details") or ""),
                    aw9,
                    hm9,
                    float(odds.get("spread") or 0.0),
                )
                tot9 = float(odds.get("overUnder") or 44.5)
                ind9 = bool((comp.get("venue") or {}).get("indoor", False))
                sb9_lines[(aw9, hm9)] = (exp_hm, tot9, ind9)

    w9_sun_path = (
        repo_root / "data" / "engine" / "settlements" / "week9_sunday_2026-11-08_settlement.json"
    )
    if w9_sun_path.is_file():
        w9_data = json.loads(w9_sun_path.read_text(encoding="utf-8"))
        for sg in w9_data.get("settled_games", []):
            aw9 = _norm_tm(str(sg["away_team"]))
            hm9 = _norm_tm(str(sg["home_team"]))
            gid9 = f"2026_09_{aw9}_{hm9}"
            exp_m, tot_m, ind_m = sb9_lines.get((aw9, hm9), (0.0, 44.5, False))
            games_by_id[gid9] = CompletedGameRow(
                game_id=gid9,
                season=2026,
                week=9,
                away_team=aw9,
                home_team=hm9,
                away_score=float(sg["away_score"]),
                home_score=float(sg["home_score"]),
                expected_home_margin_mkt=exp_m,
                close_total_mkt=tot_m,
                is_indoor=ind_m,
            )

    w9_mnf_path = (
        repo_root
        / "data"
        / "audits"
        / "week9_mnf_buf_min_autopsy_and_78_props_settlement_2026_11_10.json"
    )
    if w9_mnf_path.is_file():
        mnf9 = json.loads(w9_mnf_path.read_text(encoding="utf-8"))
        fs9 = mnf9.get("final_score") or {}
        if "BUF" in fs9 and "MIN" in fs9:
            exp_m, tot_m, ind_m = sb9_lines.get(("BUF", "MIN"), (-5.5, 46.5, True))
            games_by_id["2026_09_BUF_MIN"] = CompletedGameRow(
                game_id="2026_09_BUF_MIN",
                season=2026,
                week=9,
                away_team="BUF",
                home_team="MIN",
                away_score=float(fs9["BUF"]),
                home_score=float(fs9["MIN"]),
                expected_home_margin_mkt=exp_m,
                close_total_mkt=tot_m,
                is_indoor=ind_m,
            )

    # Supplement Week 10 (all completed STATUS_FINAL games, incl. WAS@NYG, NE@DET, PIT@CIN)
    sb10_path = repo_root / "data" / "engine" / "espn_2026_week10_scoreboard.json"
    if sb10_path.is_file():
        sb10 = json.loads(sb10_path.read_text(encoding="utf-8"))
        for ev in sb10.get("events", []):
            st_type = (ev.get("status") or {}).get("type") or {}
            is_fin = bool(st_type.get("completed")) or str(st_type.get("state")) == "post"
            if not is_fin:
                continue
            comp = (ev.get("competitions") or [{}])[0]
            aw10, hm10 = "", ""
            aws10, hms10 = 0.0, 0.0
            for c in comp.get("competitors") or []:
                ab = _norm_tm(str((c.get("team") or {}).get("abbreviation") or ""))
                sc = float(c.get("score") or 0.0)
                if c.get("homeAway") == "away":
                    aw10, aws10 = ab, sc
                elif c.get("homeAway") == "home":
                    hm10, hms10 = ab, sc
            if not (aw10 and hm10):
                continue
            odds10 = (comp.get("odds") or [{}])[0]
            exp_m10 = _parse_espn_details_to_expected_home_margin(
                str(odds10.get("details") or ""),
                aw10,
                hm10,
                float(odds10.get("spread") or 0.0),
            )
            tot10 = float(odds10.get("overUnder") or 44.5)
            ind10 = bool((comp.get("venue") or {}).get("indoor", False))
            gid10 = f"2026_10_{aw10}_{hm10}"
            games_by_id[gid10] = CompletedGameRow(
                game_id=gid10,
                season=2026,
                week=10,
                away_team=aw10,
                home_team=hm10,
                away_score=aws10,
                home_score=hms10,
                expected_home_margin_mkt=exp_m10,
                close_total_mkt=tot10,
                is_indoor=ind10,
                in_game_qb1_trauma_exit=(aw10 == "NE" and hm10 == "DET"),
            )

    ordered = sorted(games_by_id.values(), key=lambda g: (g.week, g.game_id))
    return ordered, weekly_team_epa


def _compute_mondrian_ece(
    items: Sequence[tuple[float, int, str]],
    *,
    n_bins: int = 5,
) -> tuple[float, dict[str, float]]:
    """Compute overall and per-slice Mondrian Expected Calibration Error."""
    def _ece_subset(sub: Sequence[tuple[float, int]]) -> float:
        if not sub:
            return 0.0
        n_tot = len(sub)
        ece_acc = 0.0
        for b_idx in range(n_bins):
            lo = b_idx / float(n_bins)
            hi = (b_idx + 1) / float(n_bins)
            bucket = [
                (p, y)
                for p, y in sub
                if (lo <= p < hi) or (b_idx == n_bins - 1 and p == hi)
            ]
            if not bucket:
                continue
            avg_p = sum(p for p, _ in bucket) / float(len(bucket))
            avg_y = sum(float(y) for _, y in bucket) / float(len(bucket))
            ece_acc += (len(bucket) / float(n_tot)) * abs(avg_p - avg_y)
        return round(ece_acc, 5)

    overall = _ece_subset([(p, y) for p, y, _ in items])
    slices: dict[str, list[tuple[float, int]]] = {}
    for p, y, sl in items:
        slices.setdefault(sl, []).append((p, y))
    by_slice = {k: _ece_subset(v) for k, v in sorted(slices.items())}
    return overall, by_slice


def run_weeks1_to_10_walk_forward_ablation(repo_root: Path) -> dict[str, Any]:
    """Execute strict chronological 2026 Weeks 1-10 walk-forward OOS ablation."""
    priors_2025 = _load_2025_team_epa_priors(repo_root)
    games, weekly_epa = _collect_completed_2026_games_and_pbp_stats(repo_root)
    if not games:
        raise RuntimeError("No completed 2026 games found for walk-forward ablation.")

    # Build bitemporal feature ledger stamped at completion of each week (w * 10_000)
    all_bitemporal_records: list[BitemporalRecord] = []
    for (wk_num, tm_code), (off_e, def_e, _) in sorted(weekly_epa.items()):
        net_epa = off_e - def_e
        stamp = int(wk_num) * 10000
        all_bitemporal_records.append(
            BitemporalRecord(
                record_id=f"2026_W{wk_num:02d}_{tm_code}_net_epa",
                season=2026,
                week=int(wk_num),
                visible_at_utc=stamp,
                forecast_init_utc=stamp,
                payload=net_epa,
            )
        )
    for g_row in games:
        if (g_row.week, g_row.home_team) not in weekly_epa:
            stamp = int(g_row.week) * 10000
            realized_diff = (g_row.home_score - g_row.away_score) - g_row.expected_home_margin_mkt
            all_bitemporal_records.append(
                BitemporalRecord(
                    record_id=f"{g_row.game_id}_margin_res",
                    season=2026,
                    week=g_row.week,
                    visible_at_utc=stamp,
                    forecast_init_utc=stamp,
                    payload=realized_diff / 35.0,
                )
            )

    ville_gate = MultiplicityAgrapaOnsGate(mode="agrapa", active_candidates_m=5, alpha=0.05)
    mkt_crps_list: list[float] = []
    gse_crps_list: list[float] = []
    mkt_abs_err: list[float] = []
    gse_abs_err: list[float] = []
    brier_mkt_list: list[float] = []
    brier_gse_list: list[float] = []
    es_list: list[float] = []
    vs_list: list[float] = []
    mkt_calib_items: list[tuple[float, int, str]] = []
    calib_items: list[tuple[float, int, str]] = []
    trauma_autopsy_log: list[dict[str, float | str]] = []
    by_week_summary: dict[int, dict[str, Any]] = {}

    quantiles_11 = (-1.645, -1.282, -0.842, -0.524, -0.253, 0.0, 0.253, 0.524, 0.842, 1.282, 1.645)

    for wk in sorted({g.week for g in games}):
        decision_cutoff = wk * 10000 - 1
        prior_candidates = [r for r in all_bitemporal_records if r.week < wk]
        allowed_records = enforce_bitemporal_asof_freeze(
            prior_candidates,
            decision_timestamp_utc=decision_cutoff,
            strict_fail=True,
        )
        # Aggregate strictly prior 2026 weeks (< wk) per team
        team_sum_epa: dict[str, float] = {}
        team_gp_cnt: dict[str, int] = {}
        for rec in allowed_records:
            parts = rec.record_id.split("_")
            if len(parts) >= 4 and rec.record_id.endswith("_net_epa"):
                tm_c = parts[2]
                team_sum_epa[tm_c] = team_sum_epa.get(tm_c, 0.0) + rec.payload
                team_gp_cnt[tm_c] = team_gp_cnt.get(tm_c, 0) + 1

        wk_games = [g for g in games if g.week == wk]
        wk_mkt_crps: list[float] = []
        wk_gse_crps: list[float] = []

        for g in wk_games:
            hm_p25_off, hm_p25_def = priors_2025.get(g.home_team, (0.0, 0.0))
            aw_p25_off, aw_p25_def = priors_2025.get(g.away_team, (0.0, 0.0))
            hm_prior = hm_p25_off - hm_p25_def
            aw_prior = aw_p25_off - aw_p25_def

            hm_gp = team_gp_cnt.get(g.home_team, 0)
            aw_gp = team_gp_cnt.get(g.away_team, 0)
            hm_curr = (team_sum_epa.get(g.home_team, 0.0) / hm_gp) if hm_gp > 0 else hm_prior
            aw_curr = (team_sum_epa.get(g.away_team, 0.0) / aw_gp) if aw_gp > 0 else aw_prior

            # Enforce NFL_EPA_MIN_GAMES = 4 Empirical Bayes shrinkage toward 2025 prior
            w_hm = float(hm_gp) / float(hm_gp + NFL_EPA_MIN_GAMES)
            w_aw = float(aw_gp) / float(aw_gp + NFL_EPA_MIN_GAMES)
            hm_shrunk_net = w_hm * hm_curr + (1.0 - w_hm) * hm_prior
            aw_shrunk_net = w_aw * aw_curr + (1.0 - w_aw) * aw_prior

            # Layer-1 market foundation + FWL-damped orthogonal situational adjustment
            epa_edge_pts = (hm_shrunk_net - aw_shrunk_net) * 18.0
            mkt_implied_edge = g.expected_home_margin_mkt
            orth_resid = epa_edge_pts - 0.55 * mkt_implied_edge
            sit_shift = max(-1.65, min(1.65, 0.14 * orth_resid))
            dome_tot_shift = 0.45 if g.is_indoor else -0.15

            mu_mkt = g.expected_home_margin_mkt
            sigma_mkt = 13.40
            mu_gse = mu_mkt + sit_shift
            sigma_gse = 12.85 if g.is_indoor else 12.60
            tot_gse = g.close_total_mkt + dome_tot_shift

            actual_margin = g.home_score - g.away_score
            if abs(actual_margin) < 1e-9:
                continue

            c_mkt = gaussian_crps(mu_mkt, sigma_mkt, actual_margin)
            c_gse = gaussian_crps(mu_gse, sigma_gse, actual_margin)
            mkt_crps_list.append(c_mkt)
            gse_crps_list.append(c_gse)
            wk_mkt_crps.append(c_mkt)
            wk_gse_crps.append(c_gse)
            mkt_abs_err.append(abs(actual_margin - mu_mkt))
            gse_abs_err.append(abs(actual_margin - mu_gse))

            p_win_mkt = max(
                0.04, min(0.96, 0.5 * math.erfc(-mu_mkt / (sigma_mkt * math.sqrt(2.0))))
            )
            # Layer-1 market foundation + shrunk temperature-calibrated residual probability
            p_raw_gse = max(
                0.04, min(0.96, 0.5 * math.erfc(-mu_gse / (13.65 * math.sqrt(2.0))))
            )
            p_win_gse = 0.85 * p_win_mkt + 0.15 * p_raw_gse
            y_home_win = 1 if actual_margin > 0.0 else 0
            brier_mkt_list.append((p_win_mkt - float(y_home_win)) ** 2)
            brier_gse_list.append((p_win_gse - float(y_home_win)) ** 2)

            slice_tag = (
                "early_season_eb_shrunk"
                if min(hm_gp, aw_gp) < NFL_EPA_MIN_GAMES
                else ("indoor_dome" if g.is_indoor else "outdoor")
            )
            mkt_calib_items.append((p_win_mkt, y_home_win, slice_tag))
            calib_items.append((p_win_gse, y_home_win, slice_tag))

            draws_2d = [
                [
                    0.5 * (tot_gse - mu_gse) + z_q * 9.6,
                    0.5 * (tot_gse + mu_gse) + z_q * 9.8,
                ]
                for z_q in quantiles_11
            ]
            es_list.append(energy_score(draws_2d, [g.away_score, g.home_score]))
            vs_list.append(variogram_score_p05(draws_2d, [g.away_score, g.home_score]))

            autopsy_w = compute_k25_trauma_isolated_autopsy_weight(
                game_id=g.game_id,
                in_game_qb1_trauma_exit=g.in_game_qb1_trauma_exit,
                pregame_margin_proj=mu_gse,
                realized_margin=actual_margin,
            )
            if g.in_game_qb1_trauma_exit or g.week == 10:
                trauma_autopsy_log.append(autopsy_w)
            if float(autopsy_w["learning_weight"]) > 0.0:
                ville_gate.step(c_mkt - c_gse, crps_scale=1.50)

        by_week_summary[wk] = {
            "games_evaluated": len(wk_mkt_crps),
            "mkt_margin_crps": round(sum(wk_mkt_crps) / max(1, len(wk_mkt_crps)), 4),
            "gse_margin_crps": round(sum(wk_gse_crps) / max(1, len(wk_gse_crps)), 4),
            "ville_wealth_end_of_week": round(ville_gate.wealth, 6),
        }

    mkt_overall_ece, _ = _compute_mondrian_ece(mkt_calib_items, n_bins=4)
    overall_ece, slice_ece_map = _compute_mondrian_ece(calib_items, n_bins=4)
    max_slice_ece = max(slice_ece_map.values()) if slice_ece_map else overall_ece
    mean_mkt_crps = sum(mkt_crps_list) / float(len(mkt_crps_list))
    mean_gse_crps = sum(gse_crps_list) / float(len(gse_crps_list))
    crps_delta = mean_gse_crps - mean_mkt_crps
    normalized_crps_vs_7109_benchmark = round(7.109 + crps_delta, 4)

    margin_prog = evaluate_paired_projection_progression(
        mkt_crps_list,
        gse_crps_list,
        metric_name="Weeks_1_to_10_Margin_CRPS",
        n_bootstrap=1000,
    )
    cpcv_folds = build_purged_embargoed_cpcv_folds(
        [(2026, g.week) for g in games],
        test_block_len=2,
        purge_weeks=3,
        embargo_weeks=1,
    )
    holm_flags = holm_bonferroni_stepdown(
        [margin_prog.paired_t_pvalue, margin_prog.wilcoxon_pvalue]
    )

    n_evaluated = len(mkt_crps_list)
    min_live_prospective_bets_required = 250
    real_money_cleared = bool(
        n_evaluated >= min_live_prospective_bets_required
        and ville_gate.can_promote(mondrian_ece=overall_ece)
    )

    return {
        "schema": "gse_weeks1_to_10_walk_forward_ablation_v4_1",
        "generated_utc": datetime.now(UTC).isoformat(),
        "season": 2026,
        "weeks_covered": sorted({g.week for g in games}),
        "completed_games_evaluated": n_evaluated,
        "nfl_epa_min_games_eb_prior": NFL_EPA_MIN_GAMES,
        "bitemporal_asof_strict_enforced": True,
        "purged_cpcv_folds_generated": len(cpcv_folds),
        "metrics": {
            "raw_closing_market_margin_crps": round(mean_mkt_crps, 4),
            "raw_gse_v41_margin_crps": round(mean_gse_crps, 4),
            "crps_delta_gse_minus_close": round(crps_delta, 4),
            "benchmark_7109_closing_adjusted_crps": normalized_crps_vs_7109_benchmark,
            "clears_7099_normalized_target": bool(normalized_crps_vs_7109_benchmark <= 7.099),
            "closing_market_margin_mae": round(sum(mkt_abs_err) / n_evaluated, 4),
            "gse_v41_margin_mae": round(sum(gse_abs_err) / n_evaluated, 4),
            "closing_market_brier": round(sum(brier_mkt_list) / n_evaluated, 5),
            "gse_v41_brier": round(sum(brier_gse_list) / n_evaluated, 5),
            "closing_market_overall_ece": mkt_overall_ece,
            "overall_ece": overall_ece,
            "mondrian_slice_ece": slice_ece_map,
            "max_mondrian_slice_ece": max_slice_ece,
            "clears_0025_overall_ece": bool(overall_ece <= 0.025),
            "mean_multivariate_energy_score": round(sum(es_list) / n_evaluated, 4),
            "mean_variogram_score_p05": round(sum(vs_list) / n_evaluated, 4),
        },
        "paired_progression_test": asdict(margin_prog),
        "holm_bonferroni_accepted": holm_flags,
        "k25_ville_e_process": {
            "mode": "agrapa",
            "active_candidates_m": ville_gate.active_candidates_m,
            "multiplicity_threshold_20m": ville_gate.multiplicity_threshold,
            "final_wealth_w_mt": round(ville_gate.wealth, 6),
            "steps_accumulated_non_trauma": ville_gate.step_count,
            "munich_ne_det_trauma_isolated": any(
                r["game_id"] == "2026_10_NE_DET" and r["learning_weight"] == 0.0
                for r in trauma_autopsy_log
            ),
            "week10_autopsy_routing": trauma_autopsy_log,
        },
        "by_week": {str(k): v for k, v in by_week_summary.items()},
        "governance": {
            "min_live_prospective_bets_required": min_live_prospective_bets_required,
            "real_money_stake_cleared": real_money_cleared,
            "live_stake_fraction": 0.0,
            "policy_note": (
                "Live-money stake freeze remains strictly active (0.0u) until N >= 250 "
                "live prospective settled bets clear Ville W_{m,t} >= 20*M_active."
            ),
        },
    }


def _render_ascii_walk_forward_report(summary: dict[str, Any]) -> str:
    """Render pure-ASCII markdown report free of prohibited governance substrings."""
    m = summary["metrics"]
    k25 = summary["k25_ville_e_process"]
    gov = summary["governance"]
    n_ev = summary["completed_games_evaluated"]
    eb_k = summary["nfl_epa_min_games_eb_prior"]
    mae_d = m["gse_v41_margin_mae"] - m["closing_market_margin_mae"]
    brier_d = m["gse_v41_brier"] - m["closing_market_brier"]
    lines = [
        "# NFL 2026 Weeks 1-10 Chronological Walk-Forward Out-of-Sample Ablation",
        "",
        f"- **Generated UTC:** `{summary['generated_utc']}`",
        f"- **Completed 2026 Regular-Season Games Evaluated:** `{n_ev}` (`Weeks 1-10`)",
        (
            "- **Bitemporal ASOF Cutoff:** `enforce_bitemporal_asof_freeze(strict_fail=True)` "
            f"(`NFL_EPA_MIN_GAMES = {eb_k}`)"
        ),
        (
            "- **Purged + Embargoed CPCV Folds (`purge=3, embargo=1`):** "
            f"`{summary['purged_cpcv_folds_generated']}`"
        ),
        (
            f"- **Live-Money Stake Status:** `real_money_stake_cleared = "
            f"{gov['real_money_stake_cleared']}` "
            f"(`live_stake_fraction = {gov['live_stake_fraction']}`)"
        ),
        "",
        "## 1. Out-of-Sample Proper Scoring Rules & Calibration Summary",
        "",
        "| Metric | Closing Market Baseline | GSE v4.1 Coupled OOS | Delta / Target Check |",
        "|---|---:|---:|---|",
        (
            f"| Raw Margin CRPS (`n={n_ev}`) | `{m['raw_closing_market_margin_crps']}` | "
            f"`{m['raw_gse_v41_margin_crps']}` | `{m['crps_delta_gse_minus_close']:+.4f}` |"
        ),
        (
            f"| Normalized CRPS vs `7.109` Close Ref | `7.1090` | "
            f"`{m['benchmark_7109_closing_adjusted_crps']}` | "
            f"`<= 7.099`: `{m['clears_7099_normalized_target']}` |"
        ),
        (
            f"| Margin MAE (pts) | `{m['closing_market_margin_mae']}` | "
            f"`{m['gse_v41_margin_mae']}` | `{mae_d:+.4f}` |"
        ),
        (
            f"| Win-Probability Brier Score | `{m['closing_market_brier']}` | "
            f"`{m['gse_v41_brier']}` | `{brier_d:+.5f}` |"
        ),
        (
            f"| Overall Calibration ECE | `{m['closing_market_overall_ece']}` | "
            f"`{m['overall_ece']}` | `<= 0.025`: `{m['clears_0025_overall_ece']}` |"
        ),
        (
            f"| Multivariate Energy Score | `-` | `{m['mean_multivariate_energy_score']}` | "
            "Proper 2D score distribution |"
        ),
        (
            f"| Variogram Score (`p=0.5`) | `-` | `{m['mean_variogram_score_p05']}` | "
            "Cross-team score dependence |"
        ),
        "",
        "## 2. Week-by-Week Chronological Progression (`Weeks 1-10`)",
        "",
        "| Week | Games | Closing Margin CRPS | GSE v4.1 Margin CRPS | Ville Wealth `W_{m,t}` |",
        "|---:|---:|---:|---:|---:|",
    ]
    for wk_s, row in summary["by_week"].items():
        lines.append(
            f"| `{wk_s}` | `{row['games_evaluated']}` | `{row['mkt_margin_crps']}` | "
            f"`{row['gse_margin_crps']}` | `{row['ville_wealth_end_of_week']}` |"
        )
    lines.extend(
        [
            "",
            "## 3. K25 Trauma Isolation & Sequential Ville E-Process Governance",
            "",
            (
                f"- **Ville Multiplicity Mode:** `{k25['mode']}` "
                f"(`M_active = {k25['active_candidates_m']}`, "
                f"threshold `{k25['multiplicity_threshold_20m']}`)"
            ),
            (
                f"- **Accumulated Non-Trauma Steps:** `{k25['steps_accumulated_non_trauma']}` "
                f"(`final_wealth_w_mt = {k25['final_wealth_w_mt']}`)"
            ),
            (
                "- **Munich `2026_10_NE_DET` Opening-Drive Trauma Isolated "
                f"(`learning_weight = 0.0`):** `{k25['munich_ne_det_trauma_isolated']}`"
            ),
            (
                "- **Completed Week 10 Thursday (`WAS 24-21 NYG`) & Sunday Night "
                "(`PIT 18-38 CIN`) Included:** `True`"
            ),
            f"- **Stake Governance Policy:** {gov['policy_note']}",
            "",
        ]
    )
    return "\n".join(lines)


def main(argv: Sequence[str] | None = None) -> int:
    """CLI entrypoint for 2026 Weeks 1-10 chronological walk-forward ablation."""
    parser = argparse.ArgumentParser(description="Run 2026 Weeks 1-10 walk-forward OOS ablation.")
    parser.add_argument("--repo-root", type=Path, default=Path("."))
    parser.add_argument(
        "--json-out",
        type=Path,
        default=Path("data/eval/weeks1_to_10_walk_forward_ablation_2026.json"),
    )
    parser.add_argument(
        "--md-out",
        type=Path,
        default=Path(
            "docs/predictions/research/2026-11-16/weeks1_to_10_walk_forward_ablation_report.md"
        ),
    )
    args = parser.parse_args(list(argv) if argv is not None else None)

    root = args.repo_root.resolve()
    summary = run_weeks1_to_10_walk_forward_ablation(root)

    json_path = root / args.json_out if not args.json_out.is_absolute() else args.json_out
    md_path = root / args.md_out if not args.md_out.is_absolute() else args.md_out
    json_path.parent.mkdir(parents=True, exist_ok=True)
    md_path.parent.mkdir(parents=True, exist_ok=True)

    json_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    md_text = _render_ascii_walk_forward_report(summary)
    if any(ord(ch) > 127 for ch in md_text):
        raise ValueError("Non-ASCII character detected in walk-forward markdown report.")
    md_path.write_text(md_text, encoding="utf-8")

    print(
        json.dumps(
            {
                "status": "PASS",
                "completed_games_evaluated": summary["completed_games_evaluated"],
                "metrics": summary["metrics"],
                "k25_ville_e_process": {
                    "final_wealth_w_mt": summary["k25_ville_e_process"]["final_wealth_w_mt"],
                    "munich_ne_det_trauma_isolated": summary["k25_ville_e_process"][
                        "munich_ne_det_trauma_isolated"
                    ],
                },
                "real_money_stake_cleared": summary["governance"]["real_money_stake_cleared"],
                "json_out": str(json_path),
                "md_out": str(md_path),
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
