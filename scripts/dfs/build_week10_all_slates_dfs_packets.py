#!/usr/bin/env python3
"""
scripts/dfs/build_week10_all_slates_dfs_packets.py

Week 10 DraftKings 5-Slate DFS Optimizer & Dry-Staged Packet Builder:
  1. munich_ne_det    - DG 156422 (NE @ DET Showdown)
  2. sun_main_classic - DG 156416 (Sunday Main 10-Game Classic)
  3. sun_mon_expanded - DG 156418 (Sun-Mon 12-Game Classic + 14-Player Core)
  4. snf_pit_cin      - DG 156433 (PIT @ CIN SNF Showdown)
  5. mnf_lac_bal      - DG 156434 (LAC @ BAL MNF Showdown)

Hydrates player projections strictly from Stage 3/4 conserved Week 10 dossiers,
enforces Stage-0 live roster/injury gates (`require_week(10)` + `apply_gate`),
and never sends automated emails (`auto_email_sent: False`).
"""
from __future__ import annotations

import csv
import json
import math
import sys
from pathlib import Path
from typing import Any, Mapping, Sequence

import numpy as np
import pandas as pd

try:
    from scipy.optimize import Bounds, LinearConstraint, milp
except ImportError:  # pragma: no cover
    Bounds = LinearConstraint = milp = None  # type: ignore[assignment]

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.dfs.build_week9_dual_slate_dfs_packets import _norm_player_key  # noqa: E402
from scripts.ops.dfs_stochastic_milp_optimizer import (  # noqa: E402
    build_default_covariance_bonus_matrix,
    optimize_dfs_portfolio,
)
from scripts.ops.preflight_live_roster_injury_gate import (  # noqa: E402
    apply_gate,
    assert_lineup_clean,
    require_week,
)
from scripts.ops.solve_showdown_dfs_milp import (  # noqa: E402
    _enrich_player_decoy_and_objectives,
    solve_dk_showdown_milp,
)

DATA_DFS_DIR = REPO_ROOT / "data" / "dfs"
DATA_ENGINE_DIR = REPO_ROOT / "data" / "engine"
SCRATCH_DIR = Path(r"C:\c\scratch\week10-sunday-launch")

SLATE_SPECS: dict[str, dict[str, Any]] = {
    "munich_ne_det": {
        "draft_group_id": 156422,
        "contest_type": "showdown",
        "title": "NE @ DET Munich Showdown (08:30 AM CST)",
        "matchup": "NE @ DET",
        "games": [("NE", "DET")],
        "scratch_json": "dk_munich_ne_det_156422.json",
        "salary_csv": "week10_munich_ne_det_dk_salaries.csv",
        "packet_json": "week10_munich_ne_det_showdown_packet.json",
        "upload_csv": "week10_munich_ne_det_dk_upload.csv",
    },
    "sun_main_classic": {
        "draft_group_id": 156416,
        "contest_type": "classic",
        "title": "Sunday Main 10-Game Classic",
        "matchup": "SUN_MAIN_10G",
        "games": [
            ("BUF", "NYJ"), ("CAR", "NO"), ("HOU", "CLE"), ("JAX", "TEN"),
            ("KC", "ATL"), ("LAR", "ARI"), ("MIA", "IND"), ("MIN", "GB"),
            ("SEA", "LV"), ("SF", "DAL"),
        ],
        "scratch_json": "dk_sun_main_156416.json",
        "salary_csv": "week10_sun_main_classic_dk_salaries.csv",
        "packet_json": "week10_sun_main_classic_packet.json",
        "upload_csv": "week10_sun_main_classic_dk_upload.csv",
    },
    "sun_mon_expanded": {
        "draft_group_id": 156418,
        "contest_type": "classic",
        "title": "Sunday-Monday 12-Game Expanded Classic & 14-Core",
        "matchup": "SUN_MON_12G",
        "games": [
            ("BUF", "NYJ"), ("CAR", "NO"), ("HOU", "CLE"), ("JAX", "TEN"),
            ("KC", "ATL"), ("LAR", "ARI"), ("MIA", "IND"), ("MIN", "GB"),
            ("SEA", "LV"), ("SF", "DAL"), ("PIT", "CIN"), ("LAC", "BAL"),
        ],
        "scratch_json": "dk_sun_mon_156418.json",
        "salary_csv": "week10_sun_mon_expanded_dk_salaries.csv",
        "packet_json": "week10_sun_mon_expanded_packet.json",
        "upload_csv": "week10_sun_mon_expanded_dk_upload.csv",
    },
    "snf_pit_cin": {
        "draft_group_id": 156433,
        "contest_type": "showdown",
        "title": "PIT @ CIN SNF Showdown",
        "matchup": "PIT @ CIN",
        "games": [("PIT", "CIN")],
        "scratch_json": "dk_snf_pit_cin_156433.json",
        "salary_csv": "week10_snf_pit_cin_dk_salaries.csv",
        "packet_json": "week10_snf_pit_cin_showdown_packet.json",
        "upload_csv": "week10_snf_pit_cin_dk_upload.csv",
    },
    "mnf_lac_bal": {
        "draft_group_id": 156434,
        "contest_type": "showdown",
        "title": "LAC @ BAL MNF Showdown",
        "matchup": "LAC @ BAL",
        "games": [("LAC", "BAL")],
        "scratch_json": "dk_mnf_lac_bal_156434.json",
        "salary_csv": "week10_mnf_lac_bal_dk_salaries.csv",
        "packet_json": "week10_mnf_lac_bal_showdown_packet.json",
        "upload_csv": "week10_mnf_lac_bal_dk_upload.csv",
    },
}

_DST_TEAM_BY_NAME: dict[str, str] = {
    "cardinals": "ARI", "falcons": "ATL", "ravens": "BAL", "bills": "BUF",
    "panthers": "CAR", "bears": "CHI", "bengals": "CIN", "browns": "CLE",
    "cowboys": "DAL", "broncos": "DEN", "lions": "DET", "packers": "GB",
    "texans": "HOU", "colts": "IND", "jaguars": "JAX", "chiefs": "KC",
    "chargers": "LAC", "rams": "LAR", "raiders": "LV", "dolphins": "MIA",
    "vikings": "MIN", "patriots": "NE", "saints": "NO", "giants": "NYG",
    "jets": "NYJ", "eagles": "PHI", "steelers": "PIT", "seahawks": "SEA",
    "49ers": "SF", "buccaneers": "TB", "titans": "TEN", "commanders": "WAS",
}

_PRIMARY_CLASSIC_SLOTS = {66, 67, 68, 69, 71}


def _clean_status(raw: Any) -> str:
    s = "" if raw is None else str(raw).strip()
    return "" if s.lower() == "none" else s.upper()


def _normalize_team(tm: Any) -> str:
    u = str(tm or "").strip().upper()
    return {"LA": "LAR", "JAC": "JAX", "WSH": "WAS"}.get(u, u)


def sync_dk_draftables_to_csvs(scratch_dir: Path = SCRATCH_DIR) -> dict[str, Path]:
    """Normalize cached DraftKings Draftables JSONs into canonical CSVs in `data/dfs/`."""
    DATA_DFS_DIR.mkdir(parents=True, exist_ok=True)
    written: dict[str, Path] = {}
    for slate_key, spec in SLATE_SPECS.items():
        csv_path = DATA_DFS_DIR / spec["salary_csv"]
        json_path = scratch_dir / spec["scratch_json"]
        if not json_path.is_file():
            if csv_path.is_file():
                written[slate_key] = csv_path
                continue
            raise FileNotFoundError(f"Missing both DK scratch JSON {json_path} and CSV {csv_path}")

        raw = json.loads(json_path.read_text(encoding="utf-8"))
        draftables = raw.get("draftables", [])
        cpt_salary_by_key: dict[tuple[str, str, str], int] = {}
        for item in draftables:
            if item.get("rosterSlotId") == 511:
                k = (
                    str(item.get("displayName") or "").strip(),
                    _normalize_team(item.get("teamAbbreviation")),
                    str(item.get("position") or "").strip().upper(),
                )
                cpt_salary_by_key[k] = int(item.get("salary") or 0)

        rows: list[dict[str, Any]] = []
        seen_keys: set[tuple[str, str, str]] = set()
        target_slots = {512} if spec["contest_type"] == "showdown" else _PRIMARY_CLASSIC_SLOTS
        for item in draftables:
            if item.get("isDisabled"):
                continue
            if item.get("rosterSlotId") not in target_slots:
                continue
            name = str(item.get("displayName") or "").strip()
            team = _normalize_team(item.get("teamAbbreviation"))
            pos = str(item.get("position") or "").strip().upper()
            sal = int(item.get("salary") or 0)
            if not name or not team or sal <= 0:
                continue
            key = (name, team, pos)
            if key in seen_keys:
                continue
            seen_keys.add(key)
            comp = (item.get("competition") or {}).get("name") or spec["matchup"]
            dk_id = str(item.get("draftableId") or item.get("playerId") or name)
            cpt_sal = cpt_salary_by_key.get(key, int(round(1.5 * sal)))
            rows.append({
                "draftable_id": dk_id,
                "name": name,
                "name_with_id": f"{name} ({dk_id})",
                "position": pos,
                "team": team,
                "salary": sal,
                "cpt_salary": cpt_sal,
                "status": _clean_status(item.get("status")),
                "game_info": str(comp),
            })

        with csv_path.open("w", encoding="utf-8", newline="") as fh:
            writer = csv.DictWriter(
                fh,
                fieldnames=[
                    "draftable_id", "name", "name_with_id", "position",
                    "team", "salary", "cpt_salary", "status", "game_info",
                ],
            )
            writer.writeheader()
            writer.writerows(sorted(rows, key=lambda r: (-int(r["salary"]), r["name"])))
        written[slate_key] = csv_path
    return written


def _metric_val(proj_map: Mapping[str, Any], key: str, stat_field: str = "mean") -> float:
    v = proj_map.get(key)
    if isinstance(v, Mapping):
        return float(v.get(stat_field) or v.get("mean") or 0.0)
    if isinstance(v, (int, float)):
        return float(v)
    return 0.0


def _dk_fpts_from_dossier_record(
    rec: Mapping[str, Any],
    pos: str,
    td_prob: float,
) -> tuple[float, float, float]:
    """Compute DraftKings (p50/mean, p25_floor, p90_ceiling) strictly from Stage 3/4 quantiles."""
    pr = rec.get("projections") or {}

    def _compute(sf: str) -> float:
        if pos == "K":
            fg = _metric_val(pr, "fg_made", sf)
            pat = _metric_val(pr, "pat_made", sf)
            if fg > 0 or pat > 0:
                return round(3.3 * fg + 1.0 * pat, 3)
            return round(_metric_val(pr, "kicking_points", sf), 3)

        pass_yds = _metric_val(pr, "pass_yds", sf)
        pass_tds = _metric_val(pr, "pass_tds", sf)
        ints = _metric_val(pr, "interceptions", sf)
        rush_yds = _metric_val(pr, "rush_yds", sf)
        rec_yds = _metric_val(pr, "rec_yds", sf)
        recs = _metric_val(pr, "receptions", sf)
        rec_tds = _metric_val(pr, "rec_tds", sf)
        lam_td = -math.log(max(1e-6, 1.0 - min(0.92, max(0.0, td_prob)))) if td_prob > 0 else 0.0
        extra_rush_td = max(0.0, lam_td - rec_tds)
        pts = (
            0.04 * pass_yds
            + 4.0 * pass_tds
            - 1.0 * ints
            + 0.1 * rush_yds
            + 1.0 * recs
            + 0.1 * rec_yds
            + 6.0 * (rec_tds + extra_rush_td)
        )
        if pass_yds >= 300.0:
            pts += 3.0
        if rush_yds >= 100.0:
            pts += 3.0
        if rec_yds >= 100.0:
            pts += 3.0
        return round(max(0.0, pts), 3)

    med = _compute("mean")
    p25 = min(med, _compute("p25"))
    p90 = max(med, _compute("p90"))
    return round(med, 3), round(max(0.1, p25), 3), round(max(med, p90), 3)


def _dst_fpts_from_team_dossier(
    team: str,
    opp: str,
    s34: Mapping[str, Any],
) -> tuple[float, float, float]:
    """Derive DraftKings DST projection strictly from opponent Stage 3/4 team & QB stats."""
    t_proj = (s34.get("team_post_sim_projections") or {}).get(opp) or {}
    opp_pts = t_proj.get("points") or {}
    ap = s34.get("athlete_post_sim_projections") or {}
    qb_name = t_proj.get("qb1_starter") or ""
    qb_pr = (ap.get(qb_name) or {}).get("projections") or {}
    sacks = _metric_val(qb_pr, "sacks_taken", "mean")
    ints = _metric_val(qb_pr, "interceptions", "mean")

    def _pa_bonus(pa: float) -> float:
        if pa <= 0.5:
            return 10.0
        if pa <= 6.5:
            return 7.0
        if pa <= 13.5:
            return 4.0
        if pa <= 20.5:
            return 1.0
        if pa <= 27.5:
            return 0.0
        if pa <= 34.5:
            return -1.0
        return -4.0

    # Expected PA inverted vs quantile: low opponent p25 points -> DST ceiling; high p75/p90 -> floor
    pa_mean = float(opp_pts.get("mean") or 21.5)
    pa_low = float(opp_pts.get("p25") or max(10.0, pa_mean - 6.0))
    pa_high = float(opp_pts.get("p90") or pa_mean + 10.0)
    turnover_ev = 1.0 * sacks + 2.0 * ints + 1.2
    med = max(1.0, _pa_bonus(pa_mean) + turnover_ev)
    p25 = max(0.1, _pa_bonus(pa_high) + 0.55 * turnover_ev)
    p90 = max(med + 2.0, _pa_bonus(pa_low) + 1.65 * turnover_ev + 1.5)
    return round(med, 3), round(p25, 3), round(p90, 3)


def _load_slate_dossiers(games: Sequence[tuple[str, str]]) -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    for away, home in games:
        dp = DATA_ENGINE_DIR / f"connected_workflow_dossier_{away.lower()}_{home.lower()}_week10.json"
        if not dp.is_file():
            raise FileNotFoundError(f"Missing Week 10 dossier required for DFS hydration: {dp}")
        d = json.loads(dp.read_text(encoding="utf-8"))
        out[away] = {"opponent": home, "dossier": d}
        out[home] = {"opponent": away, "dossier": d}
    return out


def load_and_gate_slate_pool(slate_key: str) -> tuple[pd.DataFrame, dict[str, Any]]:
    """Load DK salary CSV, apply Stage-0 gate, and hydrate strictly from Week 10 dossiers."""
    if slate_key not in SLATE_SPECS:
        raise KeyError(f"Unknown Week 10 slate_key: {slate_key}")
    spec = SLATE_SPECS[slate_key]
    csv_path = DATA_DFS_DIR / spec["salary_csv"]
    if not csv_path.is_file():
        sync_dk_draftables_to_csvs()

    raw_df = pd.read_csv(csv_path)
    raw_df["status"] = raw_df["status"].fillna("").astype(str)
    cfg = require_week(10)
    gated_df, removal_log = apply_gate(
        raw_df, cfg, name_col="name", team_col="team", pos_col="position", status_col="status", salary_col="salary", qb_gate=True
    )

    team_bundles = _load_slate_dossiers(spec["games"])
    hydrated_rows: list[dict[str, Any]] = []
    for _, row in gated_df.iterrows():
        tm = _normalize_team(row["team"])
        if tm not in team_bundles:
            continue
        bundle_info = team_bundles[tm]
        opp = bundle_info["opponent"]
        dossier = bundle_info["dossier"]
        s34 = dossier.get("stage3_4_conserved_post_sim_projections") or {}
        ap = s34.get("athlete_post_sim_projections") or {}
        decoys = {k.strip().lower() for k in (s34.get("injury_decoy_audit") or {})}
        td_probs = (s34.get("derivatives_and_exotics_360") or {}).get("touchdown_scorer_probabilities") or {}
        ap_by_norm = {_norm_player_key(k): (k, v) for k, v in ap.items()}
        td_by_norm = {_norm_player_key(k): float((v or {}).get("anytime_td_prob") or 0.0) for k, v in td_probs.items() if isinstance(v, Mapping)}

        pos = str(row["position"]).strip().upper()
        name = str(row["name"]).strip()
        is_decoy = name.strip().lower() in decoys

        if pos == "DST":
            med, p25, p90 = _dst_fpts_from_team_dossier(tm, opp, s34)
        else:
            hit = ap_by_norm.get(_norm_player_key(name))
            if hit is None:
                continue  # Never invent unprojected player numbers
            _, rec = hit
            if _normalize_team(rec.get("team")) != tm:
                continue
            med, p25, p90 = _dk_fpts_from_dossier_record(rec, pos, td_by_norm.get(_norm_player_key(name), 0.0))
            if med <= 0.0:
                continue

        sal = int(row["salary"])
        own = round(min(0.45, max(0.03, (med / max(1000, sal)) * 0.06)), 4)
        hydrated_rows.append({
            "draftable_id": str(row["draftable_id"]),
            "name": name,
            "player": name,
            "name_with_id": str(row["name_with_id"]),
            "team": tm,
            "opponent": opp,
            "position": pos,
            "pos": pos,
            "salary": sal,
            "cpt_salary": int(row["cpt_salary"]),
            "status": str(row["status"]),
            "game_info": str(row["game_info"]),
            "median_fpts": med,
            "projection": med,
            "p25_floor_fpts": p25,
            "p90_ceiling_fpts": p90,
            "ownership": own,
            "is_decoy_trap": is_decoy,
            "block_cash_dfs": is_decoy,
            "is_sub_floor_trap": is_decoy,
            "is_out": False,
        })

    out_df = pd.DataFrame(hydrated_rows).reset_index(drop=True)
    return out_df, {"removed_count": len(removal_log), "removal_log": removal_log, "slate_pool_count": len(out_df)}


def solve_showdown_20max_portfolio(
    players: Sequence[Mapping[str, Any]],
    num_lineups: int = 20,
    salary_cap: int = 50000,
    min_salary: int = 42000,
    max_cpt_repeats: int = 7,
) -> list[dict[str, Any]]:
    """Solve `num_lineups` distinct DraftKings Showdown GPP lineups via sequential MILP cuts."""
    if milp is None or LinearConstraint is None or Bounds is None:  # pragma: no cover
        raise RuntimeError("scipy.optimize.milp is required for 20-Max Showdown optimization")

    enriched = [_enrich_player_decoy_and_objectives(p) for p in players]
    n = len(enriched)
    if n < 6:
        raise ValueError(f"Need at least 6 Showdown candidates, got {n}")

    base_rows: list[np.ndarray] = []
    base_lhs: list[float] = []
    base_rhs: list[float] = []

    r_cpt = np.zeros(2 * n, dtype=np.float64)
    r_cpt[:n] = 1.0
    base_rows.append(r_cpt)
    base_lhs.append(1.0)
    base_rhs.append(1.0)

    r_flex = np.zeros(2 * n, dtype=np.float64)
    r_flex[n:] = 1.0
    base_rows.append(r_flex)
    base_lhs.append(5.0)
    base_rhs.append(5.0)

    for i in range(n):
        r_me = np.zeros(2 * n, dtype=np.float64)
        r_me[i] = 1.0
        r_me[n + i] = 1.0
        base_rows.append(r_me)
        base_lhs.append(0.0)
        base_rhs.append(1.0)

    r_sal = np.zeros(2 * n, dtype=np.float64)
    for i, p in enumerate(enriched):
        r_sal[i] = float(p["cpt_salary"])
        r_sal[n + i] = float(p["flex_salary"])
    base_rows.append(r_sal)
    base_lhs.append(float(min_salary))
    base_rhs.append(float(salary_cap))

    teams = sorted({p["team"] for p in enriched if not p["is_out"]})
    if len(teams) >= 2:
        for tm in teams:
            r_tm = np.zeros(2 * n, dtype=np.float64)
            for i, p in enumerate(enriched):
                if p["team"] == tm:
                    r_tm[i] = 1.0
                    r_tm[n + i] = 1.0
            base_rows.append(r_tm)
            base_lhs.append(1.0)
            base_rhs.append(5.0)

    integrality = np.ones(2 * n, dtype=np.float64)
    lb_vars = np.zeros(2 * n, dtype=np.float64)
    base_ub = np.ones(2 * n, dtype=np.float64)
    for i, p in enumerate(enriched):
        if p["is_out"]:
            base_ub[i] = 0.0
            base_ub[n + i] = 0.0
        elif p["is_decoy_trap"]:
            base_ub[i] = 0.0

    exposure = np.zeros(n, dtype=np.float64)
    cpt_counts = np.zeros(n, dtype=np.int32)
    cuts: list[tuple[int, list[int]]] = []
    lineups: list[dict[str, Any]] = []

    for idx_lu in range(num_lineups):
        rows = list(base_rows)
        lhs = list(base_lhs)
        rhs = list(base_rhs)
        for prev_cpt, prev_flex in cuts:
            r_cut = np.zeros(2 * n, dtype=np.float64)
            r_cut[prev_cpt] = 1.0
            for f_i in prev_flex:
                r_cut[n + f_i] = 1.0
            rows.append(r_cut)
            lhs.append(0.0)
            rhs.append(5.0)

        ub = base_ub.copy()
        for i in range(n):
            if cpt_counts[i] >= max_cpt_repeats:
                ub[i] = 0.0

        u_flex = np.array(
            [max(0.1, p["gpp_objective"] - 1.35 * exposure[i]) for i, p in enumerate(enriched)],
            dtype=np.float64,
        )
        c = -np.concatenate([1.5 * u_flex, u_flex])
        res = milp(c=c, integrality=integrality, bounds=Bounds(lb_vars, ub), constraints=LinearConstraint(np.vstack(rows), lhs, rhs))
        if not res.success or res.x is None:
            # Relax CPT cap only if necessary while still preserving exact uniqueness
            res = milp(c=c, integrality=integrality, bounds=Bounds(lb_vars, base_ub), constraints=LinearConstraint(np.vstack(rows), lhs, rhs))
        if not res.success or res.x is None:
            raise RuntimeError(f"SHOWDOWN_20MAX_INFEASIBLE at lineup {idx_lu + 1}: {res.message}")

        sol = np.round(res.x).astype(int)
        c_idx = [i for i in range(n) if sol[i] == 1][0]
        f_idxs = sorted([i for i in range(n) if sol[n + i] == 1], key=lambda k: -enriched[k]["flex_salary"])
        cuts.append((c_idx, f_idxs))
        cpt_counts[c_idx] += 1
        exposure[c_idx] += 1.0
        for fi in f_idxs:
            exposure[fi] += 1.0

        cp = enriched[c_idx]
        roster = [{
            "slot": "CPT (1.5x)",
            "player": cp["name"],
            "name": cp["name"],
            "name_with_id": cp.get("name_with_id", cp["name"]),
            "team": cp["team"],
            "pos": cp["pos"],
            "salary": cp["cpt_salary"],
            "proj_pts": round(1.5 * cp["median_fpts"], 2),
            "p25_pts": round(1.5 * cp["p25_floor_fpts"], 2),
            "p90_pts": round(1.5 * cp["p90_ceiling_fpts"], 2),
            "is_decoy_trap": cp["is_decoy_trap"],
        }]
        for fi in f_idxs:
            fp = enriched[fi]
            roster.append({
                "slot": "FLEX",
                "player": fp["name"],
                "name": fp["name"],
                "name_with_id": fp.get("name_with_id", fp["name"]),
                "team": fp["team"],
                "pos": fp["pos"],
                "salary": fp["flex_salary"],
                "proj_pts": round(fp["median_fpts"], 2),
                "p25_pts": round(fp["p25_floor_fpts"], 2),
                "p90_pts": round(fp["p90_ceiling_fpts"], 2),
                "is_decoy_trap": fp["is_decoy_trap"],
            })
        tot_sal = sum(int(r["salary"]) for r in roster)
        lineups.append({
            "lineup_index": idx_lu + 1,
            "mode": "gpp",
            "total_salary": tot_sal,
            "salary_remaining": salary_cap - tot_sal,
            "projected_median_fpts": round(sum(float(r["proj_pts"]) for r in roster), 2),
            "projected_dk_points_p90_ceiling": round(sum(float(r["p90_pts"]) for r in roster), 2),
            "roster": roster,
        })
    return lineups


def _write_showdown_upload_csv(dest: Path, cash_lu: Mapping[str, Any], gpp_lus: Sequence[Mapping[str, Any]]) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    with dest.open("w", encoding="utf-8", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["CPT", "FLEX", "FLEX", "FLEX", "FLEX", "FLEX", "ContestMode", "Salary", "ProjMedian"])
        for label, lu in [("CASH", cash_lu), *[(f"GPP_{i + 1:02d}", g) for i, g in enumerate(gpp_lus)]]:
            roster = lu["roster"]
            cpt = [r.get("name_with_id") or r["player"] for r in roster if str(r["slot"]).startswith("CPT")][0]
            flexs = [r.get("name_with_id") or r["player"] for r in roster if r["slot"] == "FLEX"]
            w.writerow([cpt, *flexs, label, lu["total_salary"], lu.get("projected_median_fpts", lu.get("projected_dk_points_mean"))])


def build_showdown_packet(slate_key: str, write_outputs: bool = True) -> dict[str, Any]:
    """Build Cash + 20-Max GPP packet and dry-staged upload CSV for a Week 10 Showdown slate."""
    spec = SLATE_SPECS[slate_key]
    if spec["contest_type"] != "showdown":
        raise ValueError(f"{slate_key} is not a Showdown slate")
    pool_df, gate_meta = load_and_gate_slate_pool(slate_key)
    records = pool_df.to_dict(orient="records")
    cash_lu = solve_dk_showdown_milp(records, mode="cash", salary_cap=50000, min_salary=42000)
    id_map = {str(r["name"]): str(r["name_with_id"]) for r in records}
    for r in cash_lu["roster"]:
        r["name_with_id"] = id_map.get(r["player"], r["player"])

    gpp_lus = solve_showdown_20max_portfolio(records, num_lineups=20, salary_cap=50000, min_salary=42000)
    cfg = require_week(10)
    for lu in [cash_lu, *gpp_lus]:
        assert_lineup_clean(
            [r["player"] for r in lu["roster"]],
            cfg,
            {r["player"]: r["team"] for r in lu["roster"]},
        )

    packet = {
        "schema_version": "1.0.0",
        "slate_key": slate_key,
        "draft_group_id": spec["draft_group_id"],
        "contest_type": "DK_SHOWDOWN",
        "matchup": spec["matchup"],
        "title": spec["title"],
        "auto_email_sent": False,
        "gate_meta": {"removed_count": gate_meta["removed_count"], "slate_pool_count": gate_meta["slate_pool_count"]},
        "cash_lineup": cash_lu,
        "gpp_lineups": gpp_lus,
    }
    if write_outputs:
        DATA_DFS_DIR.mkdir(parents=True, exist_ok=True)
        (DATA_DFS_DIR / spec["packet_json"]).write_text(json.dumps(packet, indent=2), encoding="utf-8")
        _write_showdown_upload_csv(DATA_DFS_DIR / spec["upload_csv"], cash_lu, gpp_lus)
    return packet


def build_primetime_showdowns(write_outputs: bool = True) -> dict[str, dict[str, Any]]:
    """Build Cash + 20-Max GPP packets for SNF (PIT @ CIN) and MNF (LAC @ BAL)."""
    return {
        key: build_showdown_packet(key, write_outputs=write_outputs)
        for key in ("snf_pit_cin", "mnf_lac_bal")
    }


def _format_classic_lineup(df_lu: pd.DataFrame, mode: str, lineup_index: int, salary_cap: int = 50000) -> dict[str, Any]:
    recs = df_lu.to_dict(orient="records")
    by_pos: dict[str, list[dict[str, Any]]] = {"QB": [], "RB": [], "WR": [], "TE": [], "DST": []}
    for rec in recs:
        by_pos[str(rec["position"]).upper()].append(rec)
    for plist in by_pos.values():
        plist.sort(key=lambda r: float(r["median_fpts"]), reverse=True)

    if len(by_pos["QB"]) != 1 or len(by_pos["TE"]) != 1 or len(by_pos["DST"]) != 1:
        raise ValueError(f"Invalid Classic lineup positional counts: { {k: len(v) for k, v in by_pos.items()} }")

    rb_primary = by_pos["RB"][:2]
    wr_primary = by_pos["WR"][:3]
    flex_candidates = [*by_pos["RB"][2:], *by_pos["WR"][3:]]
    if len(rb_primary) != 2 or len(wr_primary) != 3 or len(flex_candidates) != 1:
        raise ValueError(f"Could not assign Classic FLEX deterministically: { {k: len(v) for k, v in by_pos.items()} }")

    ordered: list[tuple[str, dict[str, Any]]] = [
        ("QB", by_pos["QB"][0]),
        ("RB", rb_primary[0]),
        ("RB", rb_primary[1]),
        ("WR", wr_primary[0]),
        ("WR", wr_primary[1]),
        ("WR", wr_primary[2]),
        ("TE", by_pos["TE"][0]),
        ("FLEX", flex_candidates[0]),
        ("DST", by_pos["DST"][0]),
    ]
    roster: list[dict[str, Any]] = []
    for slot_label, r in ordered:
        roster.append({
            "slot": slot_label,
            "player": str(r["name"]),
            "name": str(r["name"]),
            "name_with_id": str(r.get("name_with_id") or r["name"]),
            "team": str(r["team"]),
            "opponent": str(r["opponent"]),
            "pos": str(r["position"]),
            "salary": int(r["salary"]),
            "proj_pts": round(float(r["median_fpts"]), 2),
            "p25_pts": round(float(r["p25_floor_fpts"]), 2),
            "p90_pts": round(float(r["p90_ceiling_fpts"]), 2),
            "is_decoy_trap": bool(r.get("is_decoy_trap", False)),
        })
    tot_sal = sum(int(item["salary"]) for item in roster)
    return {
        "lineup_index": lineup_index,
        "mode": mode,
        "total_salary": tot_sal,
        "salary_remaining": salary_cap - tot_sal,
        "projected_median_fpts": round(sum(float(item["proj_pts"]) for item in roster), 2),
        "projected_dk_points_p90_ceiling": round(sum(float(item["p90_pts"]) for item in roster), 2),
        "roster": roster,
    }


def _write_classic_upload_csv(dest: Path, cash_lu: Mapping[str, Any], gpp_lus: Sequence[Mapping[str, Any]]) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    with dest.open("w", encoding="utf-8", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["QB", "RB", "RB", "WR", "WR", "WR", "TE", "FLEX", "DST", "ContestMode", "Salary", "ProjMedian"])
        for label, lu in [("CASH", cash_lu), *[(f"GPP_{i + 1:02d}", g) for i, g in enumerate(gpp_lus)]]:
            tokens = [str(r.get("name_with_id") or r["player"]) for r in lu["roster"]]
            w.writerow([*tokens, label, lu["total_salary"], lu["projected_median_fpts"]])


def _select_expanded_14_core(pool_df: pd.DataFrame, gpp_lus: Sequence[Mapping[str, Any]]) -> list[dict[str, Any]]:
    exp_counts: dict[str, int] = {}
    for lu in gpp_lus:
        for r in lu["roster"]:
            exp_counts[str(r["player"])] = exp_counts.get(str(r["player"]), 0) + 1
    n_gpp = max(1, len(gpp_lus))

    clean_df = pool_df[~pool_df["is_decoy_trap"].astype(bool)].copy()
    quotas = [("QB", 2), ("RB", 4), ("WR", 4), ("TE", 2), ("DST", 2)]
    core: list[dict[str, Any]] = []
    seen_names: set[str] = set()
    for pos, quota in quotas:
        sub = clean_df[clean_df["position"] == pos].copy()
        sub["core_score"] = (
            sub["median_fpts"].astype(float)
            + 0.35 * sub["p90_ceiling_fpts"].astype(float)
            + sub["name"].map(lambda nm: 3.0 * (exp_counts.get(str(nm), 0) / n_gpp))
        )
        sub = sub.sort_values("core_score", ascending=False)
        picked = 0
        for _, row in sub.iterrows():
            nm = str(row["name"])
            if nm in seen_names:
                continue
            seen_names.add(nm)
            core.append({
                "pos": pos,
                "player": nm,
                "name_with_id": str(row.get("name_with_id") or nm),
                "team": str(row["team"]),
                "opponent": str(row["opponent"]),
                "salary": int(row["salary"]),
                "proj_pts": round(float(row["median_fpts"]), 2),
                "p25_pts": round(float(row["p25_floor_fpts"]), 2),
                "p90_pts": round(float(row["p90_ceiling_fpts"]), 2),
                "gpp_exposure_pct": round(100.0 * exp_counts.get(nm, 0) / n_gpp, 1),
            })
            picked += 1
            if picked >= quota:
                break
        if picked < quota:
            raise ValueError(f"Expanded 14-player core short at {pos}: needed {quota}, got {picked}")
    return core


def _trim_classic_pool(df: pd.DataFrame, max_candidates: int = 165) -> pd.DataFrame:
    if len(df) <= max_candidates:
        return df.reset_index(drop=True)
    # Keep all DSTs and top value/projection skill contributors so MILP stays fast without dropping starters
    dsts = df[df["position"] == "DST"]
    skill = df[df["position"] != "DST"].sort_values("projection", ascending=False).head(max_candidates - len(dsts))
    return pd.concat([skill, dsts], ignore_index=True)


def build_classic_packet(slate_key: str, include_14_core: bool = False, write_outputs: bool = True) -> dict[str, Any]:
    """Build Cash + 20-Max GPP Classic packet (+ optional 14-Player Core) for Week 10."""
    spec = SLATE_SPECS[slate_key]
    if spec["contest_type"] != "classic":
        raise ValueError(f"{slate_key} is not a Classic slate")
    pool_df, gate_meta = load_and_gate_slate_pool(slate_key)

    cash_df = pool_df.copy()
    cash_df["projection"] = (
        0.60 * cash_df["median_fpts"].astype(float) + 0.40 * cash_df["p25_floor_fpts"].astype(float)
    )
    cash_df["is_sub_floor_trap"] = cash_df["is_decoy_trap"].astype(bool)
    cash_opt_df = _trim_classic_pool(cash_df)
    cash_dfs = optimize_dfs_portfolio(
        cash_opt_df,
        num_lineups=1,
        max_overlap=8,
        salary_cap=50000.0,
        min_teams=3,
        require_qb_stack=False,
        require_bring_back=False,
        covariance_bonuses={},
        min_salary=48000.0,
        max_per_team=4,
        max_tes=1,
    )
    if not cash_dfs:
        raise RuntimeError(f"Cash optimizer failed to find a valid Classic lineup for {slate_key}")
    cash_lu = _format_classic_lineup(cash_dfs[0], mode="cash", lineup_index=1)

    gpp_df = pool_df.copy()
    gpp_df["is_sub_floor_trap"] = False
    value_edge = gpp_df["median_fpts"].astype(float) / (gpp_df["salary"].astype(float) / 1000.0).clip(lower=2.0)
    decoy_mult = np.where(gpp_df["is_decoy_trap"].astype(bool), 0.72, 1.0)
    gpp_df["projection"] = decoy_mult * (
        0.45 * gpp_df["median_fpts"].astype(float) + 0.40 * gpp_df["p90_ceiling_fpts"].astype(float) + 1.2 * value_edge
    )
    gpp_opt_df = _trim_classic_pool(gpp_df)
    omega = build_default_covariance_bonus_matrix(gpp_opt_df)
    gpp_dfs = optimize_dfs_portfolio(
        gpp_opt_df,
        num_lineups=20,
        max_overlap=6,
        salary_cap=50000.0,
        min_teams=3,
        require_qb_stack=True,
        require_bring_back=True,
        covariance_bonuses=omega,
        min_salary=48000.0,
        max_per_team=4,
        max_tes=1,
        max_exposure=0.55,
    )
    if len(gpp_dfs) < 20:
        gpp_dfs = optimize_dfs_portfolio(
            gpp_opt_df,
            num_lineups=20,
            max_overlap=7,
            salary_cap=50000.0,
            min_teams=3,
            require_qb_stack=True,
            require_bring_back=False,
            covariance_bonuses=omega,
            min_salary=48000.0,
            max_per_team=4,
            max_tes=1,
            max_exposure=0.70,
        )
    if len(gpp_dfs) != 20:
        raise RuntimeError(f"GPP optimizer produced {len(gpp_dfs)}/20 Classic lineups for {slate_key}")

    gpp_lus = [_format_classic_lineup(df_k, mode="gpp", lineup_index=idx + 1) for idx, df_k in enumerate(gpp_dfs)]
    cfg = require_week(10)
    for lu in [cash_lu, *gpp_lus]:
        assert_lineup_clean(
            [r["player"] for r in lu["roster"]],
            cfg,
            {r["player"]: r["team"] for r in lu["roster"]},
        )

    packet: dict[str, Any] = {
        "schema_version": "1.0.0",
        "slate_key": slate_key,
        "draft_group_id": spec["draft_group_id"],
        "contest_type": "DK_CLASSIC",
        "matchup": spec["matchup"],
        "title": spec["title"],
        "auto_email_sent": False,
        "gate_meta": {"removed_count": gate_meta["removed_count"], "slate_pool_count": gate_meta["slate_pool_count"]},
        "cash_lineup": cash_lu,
        "gpp_lineups": gpp_lus,
    }
    if include_14_core:
        core_14 = _select_expanded_14_core(pool_df, gpp_lus)
        assert_lineup_clean(
            [r["player"] for r in core_14],
            cfg,
            {r["player"]: r["team"] for r in core_14},
        )
        packet["expanded_14_player_core"] = core_14

    if write_outputs:
        DATA_DFS_DIR.mkdir(parents=True, exist_ok=True)
        (DATA_DFS_DIR / spec["packet_json"]).write_text(json.dumps(packet, indent=2), encoding="utf-8")
        _write_classic_upload_csv(DATA_DFS_DIR / spec["upload_csv"], cash_lu, gpp_lus)
    return packet


def _render_week10_dfs_markdown(packets: Mapping[str, Mapping[str, Any]]) -> str:
    lines: list[str] = [
        "# Week 10 DraftKings 5-Slate DFS Packet (Munich + Main + Sun-Mon + SNF + MNF)",
        "",
        "Generated from Stage 3/4 conserved Week 10 game projections under Stage-0 live roster gates.",
        "",
        "- Scope: All 5 Week 10 DraftKings slates (DG 156422, DG 156416, DG 156418, DG 156433, DG 156434)",
        "- Cash vs GPP Separation: Cash optimizes 0.60 * median + 0.40 * p25 floor with zero-decoy blocks; 20-Max GPP optimizes ceiling, correlation stacks, and overlap diversity.",
        "- Email Delivery Policy: auto_email_sent: False (dry-staged locally in data/dfs/ until morning kickoff confirmation).",
        "",
        "## Slate Summary",
        "",
        "| Slate Key | Draft Group | Contest Type | Pool | Removed | Cash Salary | Cash Median | GPP Lineups | Upload CSV |",
        "|---|---|---|---|---|---|---|---|---|",
    ]
    for key in ("munich_ne_det", "sun_main_classic", "sun_mon_expanded", "snf_pit_cin", "mnf_lac_bal"):
        pkt = packets[key]
        spec = SLATE_SPECS[key]
        cash = pkt["cash_lineup"]
        lines.append(
            f"| {key} | {pkt['draft_group_id']} | {pkt['contest_type']} | "
            f"{pkt['gate_meta']['slate_pool_count']} | {pkt['gate_meta']['removed_count']} | "
            f"${cash['total_salary']} | {cash['projected_median_fpts']} | {len(pkt['gpp_lineups'])} | "
            f"`data/dfs/{spec['upload_csv']}` |"
        )

    for key in ("munich_ne_det", "sun_main_classic", "sun_mon_expanded", "snf_pit_cin", "mnf_lac_bal"):
        pkt = packets[key]
        cash = pkt["cash_lineup"]
        lines.extend([
            "",
            f"## {pkt['title']} (DG {pkt['draft_group_id']})",
            "",
            f"- auto_email_sent: {pkt['auto_email_sent']}",
            f"- Cash Total Salary: ${cash['total_salary']} | Median Proj: {cash['projected_median_fpts']} | P90 Ceiling: {cash['projected_dk_points_p90_ceiling']}",
            "",
            "| Slot | Player | Team | Pos | Salary | Median Proj | P25 Floor | P90 Ceiling |",
            "|---|---|---|---|---|---|---|---|",
        ])
        for r in cash["roster"]:
            lines.append(
                f"| {r['slot']} | {r['player']} | {r['team']} | {r['pos']} | "
                f"${r['salary']} | {r['proj_pts']} | {r['p25_pts']} | {r['p90_pts']} |"
            )

        exp: dict[str, int] = {}
        for lu in pkt["gpp_lineups"]:
            for r in lu["roster"]:
                lbl = f"{r['player']} ({r['team']} {r['pos']})"
                exp[lbl] = exp.get(lbl, 0) + 1
        top_exp = sorted(exp.items(), key=lambda kv: (-kv[1], kv[0]))[:8]
        lines.extend(["", "Top 20-Max GPP Exposures: " + ", ".join(f"{k}: {v}/20" for k, v in top_exp)])

        if "expanded_14_player_core" in pkt:
            lines.extend([
                "",
                "### Sun-Mon Expanded 14-Player Core (2 QB / 4 RB / 4 WR / 2 TE / 2 DST)",
                "",
                "| Pos | Player | Team | Matchup Opp | Salary | Median Proj | P90 Ceiling | GPP Exp % |",
                "|---|---|---|---|---|---|---|---|",
            ])
            for c in pkt["expanded_14_player_core"]:
                lines.append(
                    f"| {c['pos']} | {c['player']} | {c['team']} | {c['opponent']} | "
                    f"${c['salary']} | {c['proj_pts']} | {c['p90_pts']} | {c['gpp_exposure_pct']}% |"
                )

    raw_md = "\n".join(lines) + "\n"
    return raw_md.encode("ascii", "replace").decode("ascii")


def build_all_week10_slates() -> dict[str, dict[str, Any]]:
    """Build all 5 Week 10 DraftKings DFS packets, upload CSVs, and research markdown packet."""
    sync_dk_draftables_to_csvs()
    munich = build_showdown_packet("munich_ne_det", write_outputs=True)
    sun_main = build_classic_packet("sun_main_classic", include_14_core=False, write_outputs=True)
    sun_mon = build_classic_packet("sun_mon_expanded", include_14_core=True, write_outputs=True)
    primetime = build_primetime_showdowns(write_outputs=True)
    packets: dict[str, dict[str, Any]] = {
        "munich_ne_det": munich,
        "sun_main_classic": sun_main,
        "sun_mon_expanded": sun_mon,
        "snf_pit_cin": primetime["snf_pit_cin"],
        "mnf_lac_bal": primetime["mnf_lac_bal"],
    }
    md_path = REPO_ROOT / "docs" / "dfs" / "research" / "2026-11-15" / "week10-munich-main-primetime-dfs-packet.md"
    md_path.parent.mkdir(parents=True, exist_ok=True)
    md_path.write_text(_render_week10_dfs_markdown(packets), encoding="utf-8")
    return packets


if __name__ == "__main__":
    all_packets = build_all_week10_slates()
    for skey, spkt in all_packets.items():
        print(
            f"[DFS] {skey}: Cash=${spkt['cash_lineup']['total_salary']} "
            f"Med={spkt['cash_lineup']['projected_median_fpts']} GPP={len(spkt['gpp_lineups'])}"
        )
