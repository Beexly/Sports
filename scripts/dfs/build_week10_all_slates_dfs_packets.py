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
import hashlib
import json
import math
import os
import sys
import tempfile
from datetime import date
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
SCRATCH_DIR = Path(os.environ.get("GSE_DFS_SCRATCH_DIR") or r"C:\c\scratch\week10-sunday-launch")


def _resolve_scratch_json_path(filename: str, scratch_dir: Path | None = None) -> Path:
    candidates: list[Path] = []
    if scratch_dir is not None:
        candidates.append(Path(scratch_dir) / filename)
    env_dir = os.environ.get("GSE_DFS_SCRATCH_DIR")
    if env_dir:
        candidates.append(Path(env_dir) / filename)
    candidates.append(Path(r"C:\c\scratch\week10-sunday-launch") / filename)
    candidates.append(Path(tempfile.gettempdir()) / "week10-sunday-launch" / filename)
    for cand in candidates:
        if cand.is_file():
            return cand
    return candidates[0]

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


def sync_dk_draftables_to_csvs(
    scratch_dir: Path | None = None,
    dfs_dir: Path = DATA_DFS_DIR,
    skip_slates: set[str] | None = None,
) -> dict[str, Path]:
    """Normalize cached DraftKings Draftables JSONs into canonical CSVs in `dfs_dir`."""
    dfs_dir.mkdir(parents=True, exist_ok=True)
    written: dict[str, Path] = {}
    for slate_key, spec in SLATE_SPECS.items():
        if skip_slates and slate_key in skip_slates:
            continue
        csv_path = dfs_dir / spec["salary_csv"]
        json_path = _resolve_scratch_json_path(spec["scratch_json"], scratch_dir=scratch_dir)
        if not json_path.is_file():
            fallback_csv = DATA_DFS_DIR / spec["salary_csv"]
            if csv_path.is_file():
                written[slate_key] = csv_path
                continue
            if fallback_csv.is_file():
                mtime_iso = fallback_csv.stat().st_mtime
                print(
                    f"[DFS WARN] Missing DK JSON {json_path}; using fallback CSV {fallback_csv} (mtime={mtime_iso:.0f})",
                    file=sys.stderr,
                )
                csv_path.write_text(fallback_csv.read_text(encoding="utf-8"), encoding="utf-8")
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
            dk_id_raw = item.get("draftableId") or item.get("playerId")
            if dk_id_raw is None or not str(dk_id_raw).strip():
                raise ValueError(f"Missing DraftKings draftableId/playerId for {name} ({team} {pos}) in {slate_key}")
            dk_id = str(dk_id_raw).strip()
            cpt_sal = cpt_salary_by_key.get(key, int(round((1.5 * sal) / 100.0) * 100))
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
        val = v.get(stat_field)
        if val is None:
            val = v.get("mean")
        if val is not None:
            out = float(val)
            if not math.isfinite(out):
                raise ValueError(f"Non-finite projection value for {key}.{stat_field}: {val!r}")
            return out
        return 0.0
    if isinstance(v, (int, float)):
        out = float(v)
        if not math.isfinite(out):
            raise ValueError(f"Non-finite scalar projection value for {key}: {v!r}")
        return out
    return 0.0


def _dk_fpts_from_dossier_record(
    rec: Mapping[str, Any],
    pos: str,
    td_prob: float,
) -> tuple[float, float, float]:
    """Compute DraftKings (mean, p25_floor, p90_ceiling) via RSS sub-Gaussian variance aggregation.

    Avoids the comonotonic quantile-sum fallacy (summing independent category P90s).
    """
    pr = rec.get("projections") or {}

    if pos == "K":
        fg_m = _metric_val(pr, "fg_made", "mean")
        pat_m = _metric_val(pr, "pat_made", "mean")
        med = round(3.3 * fg_m + 1.0 * pat_m, 3) if (fg_m > 0 or pat_m > 0) else round(_metric_val(pr, "kicking_points", "mean"), 3)
        std_k = max(1.8, _metric_val(pr, "kicking_points", "std"))
        p25 = round(max(0.5, med - 0.674 * std_k), 3)
        p90 = round(max(med + 1.2, med + 1.282 * std_k), 3)
        return med, p25, p90

    pass_yds = _metric_val(pr, "pass_yds", "mean")
    pass_tds = _metric_val(pr, "pass_tds", "mean")
    ints = _metric_val(pr, "interceptions", "mean")
    rush_yds = _metric_val(pr, "rush_yds", "mean")
    rec_yds = _metric_val(pr, "rec_yds", "mean")
    recs = _metric_val(pr, "receptions", "mean")
    rec_tds = _metric_val(pr, "rec_tds", "mean")
    if "rush_tds" in pr and isinstance(pr.get("rush_tds"), Mapping):
        rush_tds = _metric_val(pr, "rush_tds", "mean")
    else:
        lam_td = -math.log(max(1e-6, 1.0 - min(0.92, max(0.0, td_prob)))) if td_prob > 0 else 0.0
        rush_tds = max(0.0, lam_td - rec_tds)
    if pos == "QB":
        rush_tds = min(0.45, rush_tds)

    def _metric_sigma(metric_name: str, mean_val: float, rel: float = 0.35) -> float:
        s = _metric_val(pr, metric_name, "std")
        if s > 0.2:
            return s
        p90_v = _metric_val(pr, metric_name, "p90")
        p10_v = _metric_val(pr, metric_name, "p10")
        if p90_v > p10_v:
            return max(0.25, (p90_v - p10_v) / 2.563)
        return max(0.25, rel * abs(mean_val)) if mean_val > 0 else 0.0

    def _tail_bonus_prob(metric_name: str, thresh: float, val: float) -> float:
        if val <= 0.0:
            return 0.0
        sigma = max(1.0, _metric_sigma(metric_name, val))
        z = (thresh - val) / (sigma * math.sqrt(2.0))
        return min(1.0, max(0.0, 0.5 * math.erfc(z)))

    med = round(
        max(
            0.0,
            0.04 * pass_yds
            + 4.0 * pass_tds
            - 1.0 * ints
            + 0.1 * rush_yds
            + 1.0 * recs
            + 0.1 * rec_yds
            + 6.0 * (rec_tds + rush_tds)
            + 3.0 * _tail_bonus_prob("pass_yds", 300.0, pass_yds)
            + 3.0 * _tail_bonus_prob("rush_yds", 100.0, rush_yds)
            + 3.0 * _tail_bonus_prob("rec_yds", 100.0, rec_yds),
        ),
        3,
    )

    std_py = _metric_sigma("pass_yds", pass_yds)
    std_ptd = _metric_sigma("pass_tds", pass_tds, 0.55)
    std_int = _metric_sigma("interceptions", ints, 0.70)
    std_ry = _metric_sigma("rush_yds", rush_yds)
    std_recy = _metric_sigma("rec_yds", rec_yds)
    std_rec = _metric_sigma("receptions", recs)
    std_rtd = _metric_sigma("rush_tds", rush_tds, 0.75)
    std_rectd = _metric_sigma("rec_tds", rec_tds, 0.75)

    sigma_fpts = math.sqrt(
        (0.04 * std_py) ** 2
        + (4.0 * std_ptd) ** 2
        + (1.0 * std_int) ** 2
        + (0.10 * std_ry) ** 2
        + (0.10 * std_recy + 0.85 * std_rec) ** 2
        + (6.0 * math.sqrt(std_rtd ** 2 + std_rectd ** 2)) ** 2
    )
    sigma_fpts = max(2.2, min(11.5, sigma_fpts))
    p25 = round(max(0.1, med - 0.674 * sigma_fpts), 3)
    p90 = round(max(med + 1.5, med + 1.282 * sigma_fpts), 3)
    return round(med, 3), p25, p90


def extract_active_decoy_keys(injury_decoy_audit: Mapping[str, Any] | None) -> set[str]:
    """Return normalized keys strictly for flagged active decoy / over-gated players."""
    out: set[str] = set()
    if not isinstance(injury_decoy_audit, Mapping):
        return out
    for k, v in injury_decoy_audit.items():
        if not isinstance(v, Mapping):
            continue
        if bool(v.get("is_decoy_trap")) or bool(v.get("block_over_bets")):
            nk = _norm_player_key(str(k))
            if nk:
                out.add(nk)
    return out


def _dst_fpts_from_team_dossier(
    team: str,
    opp: str,
    s34: Mapping[str, Any],
) -> tuple[float, float, float]:
    """Derive DraftKings DST projection strictly from opponent Stage 3/4 team & QB stats."""
    t_proj = (s34.get("team_post_sim_projections") or {}).get(opp) or {}
    if not t_proj:
        raise ValueError(f"Missing team_post_sim_projections for opp={opp} in DST derivation for {team}")
    opp_pts = t_proj.get("points") or {}
    ap = s34.get("athlete_post_sim_projections") or {}
    qb_name = str(t_proj.get("qb1_starter") or "").strip()
    if not qb_name:
        raise ValueError(f"Missing qb1_starter for opp={opp} in DST derivation for {team}")
    qb_entry = ap.get(qb_name)
    if not isinstance(qb_entry, Mapping):
        qb_norm = _norm_player_key(qb_name)
        for ak, av in ap.items():
            if _norm_player_key(str(ak)) == qb_norm and isinstance(av, Mapping):
                qb_entry = av
                break
    qb_pr = (qb_entry or {}).get("projections") or {}
    if not qb_pr:
        raise ValueError(f"Missing QB1 projections for opp={opp} qb={qb_name} in DST derivation for {team}")

    sacks_mean = _metric_val(qb_pr, "sacks_taken", "mean")
    sacks_low = _metric_val(qb_pr, "sacks_taken", "p25")
    sacks_high = _metric_val(qb_pr, "sacks_taken", "p90")
    ints_mean = _metric_val(qb_pr, "interceptions", "mean")
    ints_low = _metric_val(qb_pr, "interceptions", "p25")
    ints_high = _metric_val(qb_pr, "interceptions", "p90")

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

    # Expected PA inverted vs quantile: low opponent p25 points -> DST ceiling; high p90 -> floor
    raw_pa_mean = opp_pts.get("mean")
    raw_pa_low = opp_pts.get("p25")
    raw_pa_high = opp_pts.get("p90")
    if raw_pa_mean is None or raw_pa_low is None or raw_pa_high is None:
        raise ValueError(
            f"Missing opponent team_total_pts quantiles (mean/p25/p90) for {opp} against {team} DST"
        )
    pa_mean = float(raw_pa_mean)
    pa_low = float(raw_pa_low)
    pa_high = float(raw_pa_high)
    if not (math.isfinite(pa_mean) and math.isfinite(pa_low) and math.isfinite(pa_high)):
        raise ValueError(
            f"Non-finite opponent team_total_pts quantiles for {opp} against {team} DST"
        )
    ev_mean = 1.0 * sacks_mean + 2.0 * ints_mean + 1.2
    ev_floor = 1.0 * min(sacks_low, sacks_mean) + 2.0 * min(ints_low, ints_mean) + 0.8
    ev_ceil = 1.0 * max(sacks_high, sacks_mean) + 2.0 * max(ints_high, ints_mean) + 1.8
    med = max(1.0, _pa_bonus(pa_mean) + ev_mean)
    p25 = min(med, max(0.1, _pa_bonus(pa_high) + ev_floor))
    p90 = max(med + 2.0, _pa_bonus(pa_low) + ev_ceil)
    return round(med, 3), round(p25, 3), round(p90, 3)


def _is_hex64(val: Any) -> bool:
    s = str(val or "").strip().lower()
    return len(s) == 64 and all(ch in "0123456789abcdef" for ch in s)


def _load_slate_dossiers(
    games: Sequence[tuple[str, str]],
) -> tuple[dict[str, dict[str, Any]], dict[str, dict[str, str]], str]:
    out: dict[str, dict[str, Any]] = {}
    provenance: dict[str, dict[str, str]] = {}
    stage_checks = (
        ("stage0_receipt_sha256", "stage0_roster_and_board_allowlist"),
        ("stage1a_receipt_sha256", "stage1a_coaching_mind_and_schemes"),
        ("stage1b_receipt_sha256", "stage1b_5367_equations_pre_sim_review"),
        ("stage2_receipt_sha256", "stage2_jev_spine_and_10k_simulation"),
        ("stage3_4_receipt_sha256", "stage3_4_conserved_post_sim_projections"),
        ("stage5_receipt_sha256", "stage5_360_conjunction_gate"),
    )
    for away, home in games:
        dossier_rel = f"data/engine/connected_workflow_dossier_{away.lower()}_{home.lower()}_week10.json"
        dp = DATA_ENGINE_DIR / f"connected_workflow_dossier_{away.lower()}_{home.lower()}_week10.json"
        if not dp.is_file():
            raise FileNotFoundError(f"Missing Week 10 dossier required for DFS hydration: {dp}")
        dp_bytes = dp.read_bytes()
        file_sha = hashlib.sha256(dp_bytes).hexdigest()
        d = json.loads(dp_bytes.decode("utf-8"))
        bundle_sha = str(d.get("master_bundle_sha256") or "")
        if not _is_hex64(bundle_sha):
            raise ValueError(f"Missing or invalid master_bundle_sha256 in {dp}: {bundle_sha!r}")
        chain = d.get("cryptographic_receipt_chain") or {}
        for sha_field, stage_key in stage_checks:
            chain_sha = str(chain.get(sha_field) or "")
            embedded_sha = str((d.get(stage_key) or {}).get(sha_field) or "")
            if not _is_hex64(chain_sha) or not _is_hex64(embedded_sha) or chain_sha != embedded_sha:
                raise ValueError(
                    f"Cryptographic receipt mismatch for {dp} ({sha_field}): "
                    f"chain={chain_sha!r} embedded={embedded_sha!r}"
                )
        s34 = d.get("stage3_4_conserved_post_sim_projections") or {}
        ap = s34.get("athlete_post_sim_projections") or {}
        td_probs = (s34.get("derivatives_and_exotics_360") or {}).get("touchdown_scorer_probabilities") or {}
        ap_by_norm = {_norm_player_key(k): (k, v) for k, v in ap.items()}
        td_by_norm = {
            _norm_player_key(k): float((v or {}).get("anytime_td_prob") or 0.0)
            for k, v in td_probs.items()
            if isinstance(v, Mapping)
        }
        decoys = extract_active_decoy_keys(s34.get("injury_decoy_audit"))
        s34_sha = str(chain["stage3_4_receipt_sha256"])
        matchup_lbl = f"{away}@{home}"
        provenance[matchup_lbl] = {
            "dossier_file": dossier_rel,
            "dossier_file_sha256": file_sha,
            "master_bundle_sha256": bundle_sha,
            "stage3_4_receipt_sha256": s34_sha,
        }
        entry = {
            "opponent": home,
            "s34": s34,
            "ap_by_norm": ap_by_norm,
            "td_by_norm": td_by_norm,
            "decoys": decoys,
        }
        out[away] = entry
        out[home] = {**entry, "opponent": away}

    if len(provenance) == 1:
        slate_sha = next(iter(provenance.values()))["master_bundle_sha256"]
    else:
        canonical_pairs = "|".join(
            f"{k}:{provenance[k]['master_bundle_sha256']}" for k in sorted(provenance)
        )
        slate_sha = hashlib.sha256(canonical_pairs.encode("utf-8")).hexdigest()
    return out, provenance, slate_sha


def _apply_vacated_volume_and_trench_conservation(
    pool_df: pd.DataFrame,
    team_bundles: Mapping[str, Mapping[str, Any]],
    cfg: Mapping[str, Any],
) -> None:
    """Conserve team pass/rush yards, completions, and TDs across active Stage-0 survivors after IR/OUT exclusions."""
    front7_pos = {"DE", "DT", "NT", "DL", "LB", "ILB", "OLB", "MLB"}
    front7_outs_by_team: dict[str, set[str]] = {}
    wr_outs_by_team: dict[str, set[str]] = {}
    te_outs_by_team: dict[str, set[str]] = {}
    rb_outs_by_team: dict[str, set[str]] = {}

    for p in cfg.get("excluded_players") or []:
        if not isinstance(p, Mapping):
            continue
        tm = _normalize_team(p.get("team"))
        pos = str(p.get("position") or "").upper()
        nm = _norm_player_key(str(p.get("name") or ""))
        if not tm or not nm:
            continue
        if pos in front7_pos:
            front7_outs_by_team.setdefault(tm, set()).add(nm)
        elif pos == "WR":
            wr_outs_by_team.setdefault(tm, set()).add(nm)
        elif pos == "TE":
            te_outs_by_team.setdefault(tm, set()).add(nm)
        elif pos == "RB":
            rb_outs_by_team.setdefault(tm, set()).add(nm)

    for tm, b in team_bundles.items():
        s34 = b["s34"]
        opp = b["opponent"]
        t_proj = (s34.get("team_post_sim_projections") or {}).get(tm) or {}
        ap = s34.get("athlete_post_sim_projections") or {}
        qb_name = str(t_proj.get("qb1_starter") or "").strip()
        qb_rec = ap.get(qb_name) or {}
        qb_pr = qb_rec.get("projections") or {}

        team_pass_yds = _metric_val(qb_pr, "pass_yds", "mean")
        team_comps = _metric_val(qb_pr, "pass_completions", "mean")
        if team_comps <= 0.0:
            team_comps = _metric_val(qb_pr, "completions", "mean")
        team_pass_tds = _metric_val(qb_pr, "pass_tds", "mean")
        team_rush_yds = _metric_val(t_proj, "rush_yds", "mean")
        team_pts = _metric_val(t_proj, "points", "mean")
        est_total_tds = max(team_pass_tds + 0.35, (team_pts - 4.2) / 6.6)
        team_rush_tds = max(0.30, est_total_tds - team_pass_tds)

        sub_idx = list(
            pool_df[(pool_df["team"] == tm) & (pool_df["position"].isin(["QB", "RB", "WR", "TE"]))].index
        )
        if not sub_idx:
            continue

        raw_rush: dict[int, float] = {}
        raw_rec: dict[int, float] = {}
        raw_recs: dict[int, float] = {}
        for idx in sub_idx:
            nm = str(pool_df.loc[idx, "name"])
            hit = b["ap_by_norm"].get(_norm_player_key(nm))
            pr = (hit[1].get("projections") or {}) if hit else {}
            raw_rush[idx] = _metric_val(pr, "rush_yds", "mean")
            raw_rec[idx] = _metric_val(pr, "rec_yds", "mean")
            raw_recs[idx] = _metric_val(pr, "receptions", "mean")

        rb_idxs = [i for i in sub_idx if pool_df.loc[i, "position"] == "RB"]
        pass_idxs = [i for i in sub_idx if pool_df.loc[i, "position"] in ("RB", "WR", "TE")]

        opp_f7_outs = len(front7_outs_by_team.get(opp, set()))
        wr_ir_cnt = len(wr_outs_by_team.get(tm, set()))
        te_ir_cnt = len(te_outs_by_team.get(tm, set()))
        rb_ir_cnt = len(rb_outs_by_team.get(tm, set()))

        # Team rushing & passing totals in connected dossiers ALREADY incorporate Stage 2/3
        # opposing front-7 injury priors -- do NOT re-multiply team_rush_yds by opp_f7_outs.
        effective_team_rush = team_rush_yds

        vac_rush = max(0.0, effective_team_rush - sum(raw_rush.values()))
        vac_rec = max(0.0, team_pass_yds - sum(raw_rec.values()))
        vac_recs = max(0.0, team_comps - sum(raw_recs.values()))

        rb_rush_sum = sum(raw_rush[i] for i in rb_idxs) or 1.0
        rec_weights: dict[int, float] = {}
        for i in pass_idxs:
            pos = str(pool_df.loc[i, "position"])
            w = max(1.0, raw_rec[i])
            if pos == "TE" and wr_ir_cnt >= 2:
                w *= 1.0 + 0.35 * min(2, wr_ir_cnt) + 0.15 * min(2, te_ir_cnt)
            elif pos == "RB" and (len(rb_idxs) == 1 or rb_ir_cnt >= 2):
                w *= 1.25
            rec_weights[i] = w
        rec_w_sum = sum(rec_weights.values()) or 1.0

        for i in sub_idx:
            pos = str(pool_df.loc[i, "position"])
            if pos == "QB":
                continue
            r_share = min(0.68, (raw_rush[i] / rb_rush_sum)) if (pos == "RB" and rb_idxs) else 0.0
            c_share = min(0.34, rec_weights.get(i, 0.0) / rec_w_sum)

            new_rush = raw_rush[i] + vac_rush * r_share
            new_rec = raw_rec[i] + vac_rec * c_share
            new_recs = raw_recs[i] + vac_recs * c_share
            rush_td = (
                team_rush_tds * (0.78 * r_share)
                if pos == "RB"
                else 0.0
            )
            rec_td = team_pass_tds * c_share

            bonus_100_rush = 1.5 * max(0.0, min(1.0, (new_rush - 70.0) / 55.0))
            bonus_100_rec = 1.5 * max(0.0, min(1.0, (new_rec - 70.0) / 55.0))
            conserved_med = round(
                0.1 * new_rush
                + 0.1 * new_rec
                + 1.0 * new_recs
                + 6.0 * (rush_td + rec_td)
                + bonus_100_rush
                + bonus_100_rec,
                3,
            )
            old_med = float(pool_df.loc[i, "median_fpts"])
            if conserved_med > old_med:
                # Cap post-conserved uplift to avoid compounding single-RB saturation
                adj_med = round(min(conserved_med, old_med + max(3.5, 0.25 * old_med)), 3)
                delta_med = adj_med - old_med
                sigma_est = max(
                    3.2,
                    min(10.5, (float(pool_df.loc[i, "p90_ceiling_fpts"]) - old_med) / 1.282),
                )
                pool_df.loc[i, "median_fpts"] = adj_med
                pool_df.loc[i, "projection"] = adj_med
                pool_df.loc[i, "p25_floor_fpts"] = round(
                    max(0.5, adj_med - 0.674 * sigma_est), 3
                )
                pool_df.loc[i, "p90_ceiling_fpts"] = round(
                    max(adj_med + 1.5, adj_med + 1.282 * (sigma_est + 0.20 * max(0.0, delta_med))),
                    3,
                )


def load_and_gate_slate_pool(
    slate_key: str,
    today: date | None = None,
    dfs_dir: Path = DATA_DFS_DIR,
) -> tuple[pd.DataFrame, dict[str, Any]]:
    """Load DK salary CSV, apply Stage-0 gate, and hydrate strictly from Week 10 dossiers."""
    if slate_key not in SLATE_SPECS:
        raise KeyError(f"Unknown Week 10 slate_key: {slate_key}")
    spec = SLATE_SPECS[slate_key]
    csv_path = dfs_dir / spec["salary_csv"]
    if not csv_path.is_file():
        sync_dk_draftables_to_csvs(dfs_dir=dfs_dir)
    csv_bytes = csv_path.read_bytes()
    dk_salary_csv_provenance = {
        "salary_csv": spec["salary_csv"],
        "sha256": hashlib.sha256(csv_bytes).hexdigest(),
        "mtime_epoch": round(csv_path.stat().st_mtime, 3),
    }
    json_path = _resolve_scratch_json_path(spec["scratch_json"])
    dk_scratch_json_provenance = {
        "scratch_json": spec["scratch_json"],
        "exists": json_path.is_file(),
        "sha256": hashlib.sha256(json_path.read_bytes()).hexdigest() if json_path.is_file() else None,
        "mtime_epoch": round(json_path.stat().st_mtime, 3) if json_path.is_file() else None,
    }

    raw_df = pd.read_csv(csv_path, dtype={"draftable_id": str})
    raw_df["status"] = raw_df["status"].fillna("").astype(str)
    cfg = require_week(10, today=today)
    gated_df, removal_log = apply_gate(
        raw_df, cfg, name_col="name", team_col="team", pos_col="position", status_col="status", salary_col="salary", qb_gate=True
    )

    team_bundles, provenance, slate_sha = _load_slate_dossiers(spec["games"])
    hydrated_rows: list[dict[str, Any]] = []
    for _, row in gated_df.iterrows():
        tm = _normalize_team(row["team"])
        if tm not in team_bundles:
            continue
        bundle_info = team_bundles[tm]
        opp = bundle_info["opponent"]
        s34 = bundle_info["s34"]
        ap_by_norm = bundle_info["ap_by_norm"]
        td_by_norm = bundle_info["td_by_norm"]
        decoys = bundle_info["decoys"]

        pos = str(row["position"]).strip().upper()
        name = str(row["name"]).strip()
        is_decoy = _norm_player_key(name) in decoys

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
            "is_decoy_trap": is_decoy,
            "block_cash_dfs": is_decoy,
            "is_sub_floor_trap": is_decoy,
            "is_out": False,
        })

    out_df = pd.DataFrame(hydrated_rows).reset_index(drop=True)
    if not out_df.empty and slate_key != "munich_ne_det":
        _apply_vacated_volume_and_trench_conservation(out_df, team_bundles, cfg)
    return out_df, {
        "removed_count": len(removal_log),
        "removal_log": removal_log,
        "slate_pool_count": len(out_df),
        "master_bundle_sha256": slate_sha,
        "dossier_provenance": provenance,
        "dk_salary_csv_provenance": dk_salary_csv_provenance,
        "dk_scratch_json_provenance": dk_scratch_json_provenance,
    }


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
        p_med = float(p.get("median_fpts", p.get("dk_p50", 0.0)))
        p_sal = float(p.get("flex_salary", 0))
        if p["is_out"] or (p_sal <= 1000 and p_med <= 0.5):
            base_ub[i] = 0.0
            base_ub[n + i] = 0.0
        elif p["is_decoy_trap"] or p_sal <= 1000 or p_med < 4.5:
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


def _pure_dk_csv_names(slate_key: str) -> tuple[str, str]:
    return f"week10_{slate_key}_dk_cash_1up.csv", f"week10_{slate_key}_dk_20max_gpp.csv"


def _write_pure_showdown_dk_csvs(
    output_dir: Path,
    slate_key: str,
    cash_lu: Mapping[str, Any],
    gpp_lus: Sequence[Mapping[str, Any]],
) -> tuple[str, str]:
    cash_name, gpp_name = _pure_dk_csv_names(slate_key)
    output_dir.mkdir(parents=True, exist_ok=True)
    header = ["CPT", "FLEX", "FLEX", "FLEX", "FLEX", "FLEX"]

    def _row_cells(lu: Mapping[str, Any]) -> list[str]:
        roster = lu["roster"]
        cpts = [str(r.get("name_with_id") or r["player"]) for r in roster if str(r["slot"]).startswith("CPT")]
        flexs = [str(r.get("name_with_id") or r["player"]) for r in roster if r["slot"] == "FLEX"]
        if len(cpts) != 1 or len(flexs) != 5:
            raise ValueError(f"Invalid Showdown roster slots for {slate_key}: cpts={len(cpts)} flexs={len(flexs)}")
        return [cpts[0], *flexs]

    with (output_dir / cash_name).open("w", encoding="utf-8", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(header)
        w.writerow(_row_cells(cash_lu))

    with (output_dir / gpp_name).open("w", encoding="utf-8", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(header)
        for lu in list(gpp_lus)[:20]:
            w.writerow(_row_cells(lu))

    return cash_name, gpp_name


def _write_showdown_upload_csv(dest: Path, cash_lu: Mapping[str, Any], gpp_lus: Sequence[Mapping[str, Any]]) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    with dest.open("w", encoding="utf-8", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["CPT", "FLEX", "FLEX", "FLEX", "FLEX", "FLEX", "ContestMode", "Salary", "ProjMedian"])
        for label, lu in [("CASH", cash_lu), *[(f"GPP_{i + 1:02d}", g) for i, g in enumerate(gpp_lus)]]:
            roster = lu["roster"]
            cpts = [r.get("name_with_id") or r["player"] for r in roster if str(r["slot"]).startswith("CPT")]
            flexs = [r.get("name_with_id") or r["player"] for r in roster if r["slot"] == "FLEX"]
            if len(cpts) != 1 or len(flexs) != 5:
                raise ValueError(f"Invalid Showdown upload roster slots ({label}): cpts={len(cpts)} flexs={len(flexs)}")
            w.writerow([cpts[0], *flexs, label, lu["total_salary"], lu.get("projected_median_fpts", lu.get("projected_dk_points_mean"))])


def build_showdown_packet(
    slate_key: str,
    write_outputs: bool = True,
    today: date | None = None,
    output_dir: Path = DATA_DFS_DIR,
) -> dict[str, Any]:
    """Build Cash + 20-Max GPP packet and dry-staged upload CSV for a Week 10 Showdown slate."""
    spec = SLATE_SPECS[slate_key]
    if spec["contest_type"] != "showdown":
        raise ValueError(f"{slate_key} is not a Showdown slate")
    pool_df, gate_meta = load_and_gate_slate_pool(slate_key, today=today, dfs_dir=output_dir)
    records = pool_df.to_dict(orient="records")
    cash_lu = solve_dk_showdown_milp(records, mode="cash", salary_cap=50000, min_salary=42000)
    id_map_team = {
        (_norm_player_key(str(r["name"])), _normalize_team(r.get("team"))): str(r["name_with_id"])
        for r in records
    }
    id_map_name = {_norm_player_key(str(r["name"])): str(r["name_with_id"]) for r in records}
    for r in cash_lu["roster"]:
        pk = _norm_player_key(str(r["player"]))
        tm = _normalize_team(r.get("team"))
        r["name_with_id"] = id_map_team.get((pk, tm)) or id_map_name.get(pk, r["player"])

    gpp_lus = solve_showdown_20max_portfolio(records, num_lineups=20, salary_cap=50000, min_salary=42000)
    cfg = require_week(10, today=today)
    for lu in [cash_lu, *gpp_lus]:
        assert_lineup_clean(
            [r["player"] for r in lu["roster"]],
            cfg,
            {r["player"]: r["team"] for r in lu["roster"]},
        )

    cash_csv_name, gpp_csv_name = _pure_dk_csv_names(slate_key)
    packet = {
        "schema_version": "1.0.0",
        "slate_key": slate_key,
        "draft_group_id": spec["draft_group_id"],
        "contest_type": "DK_SHOWDOWN",
        "matchup": spec["matchup"],
        "title": spec["title"],
        "release_status": "HOLD_INTERNAL_CALIBRATION_ONLY_DO_NOT_STAKE_OR_ENTER",
        "publish_allowed": False,
        "auto_email_sent": False,
        "master_bundle_sha256": gate_meta["master_bundle_sha256"],
        "dossier_provenance": gate_meta["dossier_provenance"],
        "pure_dk_upload_csvs": {
            "cash_1up_csv": cash_csv_name,
            "gpp_20max_csv": gpp_csv_name,
        },
        "gate_meta": {
            "removed_count": gate_meta["removed_count"],
            "slate_pool_count": gate_meta["slate_pool_count"],
            "dk_salary_csv_provenance": gate_meta["dk_salary_csv_provenance"],
            "dk_scratch_json_provenance": gate_meta["dk_scratch_json_provenance"],
        },
        "cash_lineup": cash_lu,
        "gpp_lineups": gpp_lus,
    }
    if write_outputs:
        output_dir.mkdir(parents=True, exist_ok=True)
        (output_dir / spec["packet_json"]).write_text(json.dumps(packet, indent=2), encoding="utf-8")
        _write_showdown_upload_csv(output_dir / spec["upload_csv"], cash_lu, gpp_lus)
        _write_pure_showdown_dk_csvs(output_dir, slate_key, cash_lu, gpp_lus)
    return packet


def build_primetime_showdowns(
    write_outputs: bool = True,
    today: date | None = None,
    output_dir: Path = DATA_DFS_DIR,
) -> dict[str, dict[str, Any]]:
    """Build Cash + 20-Max GPP packets for SNF (PIT @ CIN) and MNF (LAC @ BAL)."""
    return {
        key: build_showdown_packet(key, write_outputs=write_outputs, today=today, output_dir=output_dir)
        for key in ("snf_pit_cin", "mnf_lac_bal")
    }


def _format_classic_lineup(df_lu: pd.DataFrame, mode: str, lineup_index: int, salary_cap: int = 50000) -> dict[str, Any]:
    recs = df_lu.to_dict(orient="records")
    by_pos: dict[str, list[dict[str, Any]]] = {"QB": [], "RB": [], "WR": [], "TE": [], "DST": []}
    for rec in recs:
        by_pos[str(rec["position"]).upper()].append(rec)

    # Validate Classic 9-man roster positional counts (1 QB, 2..3 RB, 3..4 WR, 1..2 TE, 1 DST, sum == 9)
    if (
        len(by_pos["QB"]) != 1
        or len(by_pos["DST"]) != 1
        or len(by_pos["RB"]) not in (2, 3)
        or len(by_pos["WR"]) not in (3, 4)
        or len(by_pos["TE"]) not in (1, 2)
        or (len(by_pos["RB"]) + len(by_pos["WR"]) + len(by_pos["TE"])) != 7
        or len(recs) != 9
    ):
        raise ValueError(f"Invalid Classic lineup positional counts: { {k: len(v) for k, v in by_pos.items()} }")

    # Late-swap FLEX optimization: positional starters by earliest kickoff first,
    # leaving the latest-kickoff eligible extra RB/WR/TE in FLEX (maximizing EQ-DFS-07 recourse optionality).
    def _player_kickoff_rank(r: Mapping[str, Any]) -> float:
        if "kickoff_epoch" in r and r["kickoff_epoch"] is not None:
            try:
                return float(r["kickoff_epoch"])
            except (ValueError, TypeError):
                pass
        t = str(r.get("team") or "").upper()
        if t in {"LAC", "BAL"}:
            return 4.0
        if t in {"PIT", "CIN"}:
            return 3.0
        if t in {"SEA", "LV", "LAR", "LA", "ARI", "SF", "DAL"}:
            return 2.0
        return 1.0

    rbs = list(by_pos["RB"])
    wrs = list(by_pos["WR"])
    tes = list(by_pos["TE"])

    if len(rbs) == 3:
        # 3-RB build: 2 RB starters by earliest kickoff, 3rd (latest kickoff) in FLEX
        rbs_sorted = sorted(rbs, key=lambda r: (_player_kickoff_rank(r), -float(r.get("median_fpts", 0.0) or 0.0)))
        rb_primary = rbs_sorted[:2]
        flex_candidate = rbs_sorted[2]
        wr_primary = sorted(wrs, key=lambda r: (_player_kickoff_rank(r), -float(r.get("median_fpts", 0.0) or 0.0)))
        te_primary = tes[:1]
    elif len(wrs) == 4:
        # 4-WR build: 3 WR starters by earliest kickoff, 4th (latest kickoff) in FLEX
        wrs_sorted = sorted(wrs, key=lambda r: (_player_kickoff_rank(r), -float(r.get("median_fpts", 0.0) or 0.0)))
        wr_primary = wrs_sorted[:3]
        flex_candidate = wrs_sorted[3]
        rb_primary = sorted(rbs, key=lambda r: (_player_kickoff_rank(r), -float(r.get("median_fpts", 0.0) or 0.0)))
        te_primary = tes[:1]
    elif len(tes) == 2:
        # 2-TE build: TE1 starter by earlier kickoff, 2nd TE (latest kickoff) in FLEX
        tes_sorted = sorted(tes, key=lambda r: (_player_kickoff_rank(r), -float(r.get("median_fpts", 0.0) or 0.0)))
        te_primary = tes_sorted[:1]
        flex_candidate = tes_sorted[1]
        rb_primary = sorted(rbs, key=lambda r: (_player_kickoff_rank(r), -float(r.get("median_fpts", 0.0) or 0.0)))
        wr_primary = sorted(wrs, key=lambda r: (_player_kickoff_rank(r), -float(r.get("median_fpts", 0.0) or 0.0)))
    else:
        raise ValueError(f"Could not assign Classic FLEX deterministically: { {k: len(v) for k, v in by_pos.items()} }")

    ordered: list[tuple[str, dict[str, Any]]] = [
        ("QB", by_pos["QB"][0]),
        ("RB", rb_primary[0]),
        ("RB", rb_primary[1]),
        ("WR", wr_primary[0]),
        ("WR", wr_primary[1]),
        ("WR", wr_primary[2]),
        ("TE", te_primary[0]),
        ("FLEX", flex_candidate),
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


def _write_pure_classic_dk_csvs(
    output_dir: Path,
    slate_key: str,
    cash_lu: Mapping[str, Any],
    gpp_lus: Sequence[Mapping[str, Any]],
) -> tuple[str, str]:
    cash_name, gpp_name = _pure_dk_csv_names(slate_key)
    output_dir.mkdir(parents=True, exist_ok=True)
    header = ["QB", "RB", "RB", "WR", "WR", "WR", "TE", "FLEX", "DST"]

    def _row_cells(lu: Mapping[str, Any]) -> list[str]:
        slots = [str(r["slot"]) for r in lu["roster"]]
        if slots != header:
            raise ValueError(f"Invalid Classic roster slots for {slate_key}: {slots!r}")
        return [str(r.get("name_with_id") or r["player"]) for r in lu["roster"]]

    with (output_dir / cash_name).open("w", encoding="utf-8", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(header)
        w.writerow(_row_cells(cash_lu))

    with (output_dir / gpp_name).open("w", encoding="utf-8", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(header)
        for lu in list(gpp_lus)[:20]:
            w.writerow(_row_cells(lu))

    return cash_name, gpp_name


def _write_classic_upload_csv(dest: Path, cash_lu: Mapping[str, Any], gpp_lus: Sequence[Mapping[str, Any]]) -> None:
    expected_slots = ["QB", "RB", "RB", "WR", "WR", "WR", "TE", "FLEX", "DST"]
    dest.parent.mkdir(parents=True, exist_ok=True)
    with dest.open("w", encoding="utf-8", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["QB", "RB", "RB", "WR", "WR", "WR", "TE", "FLEX", "DST", "ContestMode", "Salary", "ProjMedian"])
        for label, lu in [("CASH", cash_lu), *[(f"GPP_{i + 1:02d}", g) for i, g in enumerate(gpp_lus)]]:
            slots = [str(r["slot"]) for r in lu["roster"]]
            if slots != expected_slots:
                raise ValueError(f"Invalid Classic upload roster slots ({label}): {slots!r}")
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
        sub["has_gpp_exposure"] = sub["name"].map(lambda nm: exp_counts.get(str(nm), 0) > 0)
        sub["core_score"] = (
            sub["median_fpts"].astype(float)
            + 0.35 * sub["p90_ceiling_fpts"].astype(float)
            + sub["name"].map(lambda nm: 3.0 * (exp_counts.get(str(nm), 0) / n_gpp))
        )
        sub = sub.sort_values(["has_gpp_exposure", "core_score"], ascending=[False, False])
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


def build_classic_packet(
    slate_key: str,
    include_14_core: bool = False,
    write_outputs: bool = True,
    today: date | None = None,
    output_dir: Path = DATA_DFS_DIR,
) -> dict[str, Any]:
    """Build Cash + 20-Max GPP Classic packet (+ optional 14-Player Core) for Week 10."""
    spec = SLATE_SPECS[slate_key]
    if spec["contest_type"] != "classic":
        raise ValueError(f"{slate_key} is not a Classic slate")
    pool_df, gate_meta = load_and_gate_slate_pool(slate_key, today=today, dfs_dir=output_dir)

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
        max_tes=2,
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
        num_lineups=30,
        max_overlap=6,
        salary_cap=50000.0,
        min_teams=3,
        require_qb_stack=True,
        require_bring_back=True,
        covariance_bonuses=omega,
        min_salary=48000.0,
        max_per_team=4,
        max_tes=2,
        max_exposure=0.55,
    )
    if len(gpp_dfs) < 25:
        gpp_dfs = optimize_dfs_portfolio(
            gpp_opt_df,
            num_lineups=30,
            max_overlap=7,
            salary_cap=50000.0,
            min_teams=3,
            require_qb_stack=True,
            require_bring_back=False,
            covariance_bonuses=omega,
            min_salary=48000.0,
            max_per_team=4,
            max_tes=2,
            max_exposure=0.70,
        )

    def _flex_late_swap_valid(lu_dict: Mapping[str, Any]) -> bool:
        def _win_rank(team_str: str) -> int:
            tu = str(team_str or "").upper()
            if tu in {"LAC", "BAL"}:
                return 3
            if tu in {"PIT", "CIN"}:
                return 2
            if tu in {"SEA", "LV", "LAR", "LA", "ARI", "SF", "DAL"}:
                return 1
            return 0

        slots = lu_dict.get("roster") or []
        flex_items = [s for s in slots if str(s.get("slot") or "").upper() == "FLEX"]
        if not flex_items:
            return True
        flex_item = flex_items[0]
        flex_pos = str(flex_item.get("pos") or flex_item.get("position") or "").upper()
        same_pos_starters = [
            s for s in slots
            if str(s.get("slot") or "").upper() == flex_pos
        ]
        if not same_pos_starters:
            return True
        return _win_rank(str(flex_item.get("team") or "")) >= max(
            _win_rank(str(s.get("team") or "")) for s in same_pos_starters
        )

    raw_gpp_lus = [_format_classic_lineup(df_k, mode="gpp", lineup_index=idx + 1) for idx, df_k in enumerate(gpp_dfs)]
    valid_gpp = [lu for lu in raw_gpp_lus if _flex_late_swap_valid(lu)][:20]
    if len(valid_gpp) < 20:
        raise RuntimeError(f"GPP optimizer produced {len(valid_gpp)}/20 late-swap-valid Classic lineups for {slate_key}")
    gpp_lus = [
        {**lu, "lineup_index": idx + 1}
        for idx, lu in enumerate(valid_gpp)
    ]
    cfg = require_week(10, today=today)
    for lu in [cash_lu, *gpp_lus]:
        assert_lineup_clean(
            [r["player"] for r in lu["roster"]],
            cfg,
            {r["player"]: r["team"] for r in lu["roster"]},
        )

    cash_csv_name, gpp_csv_name = _pure_dk_csv_names(slate_key)
    packet: dict[str, Any] = {
        "schema_version": "1.0.0",
        "slate_key": slate_key,
        "draft_group_id": spec["draft_group_id"],
        "contest_type": "DK_CLASSIC",
        "matchup": spec["matchup"],
        "title": spec["title"],
        "release_status": "HOLD_INTERNAL_CALIBRATION_ONLY_DO_NOT_STAKE_OR_ENTER",
        "publish_allowed": False,
        "auto_email_sent": False,
        "master_bundle_sha256": gate_meta["master_bundle_sha256"],
        "dossier_provenance": gate_meta["dossier_provenance"],
        "pure_dk_upload_csvs": {
            "cash_1up_csv": cash_csv_name,
            "gpp_20max_csv": gpp_csv_name,
        },
        "gate_meta": {
            "removed_count": gate_meta["removed_count"],
            "slate_pool_count": gate_meta["slate_pool_count"],
            "dk_salary_csv_provenance": gate_meta["dk_salary_csv_provenance"],
            "dk_scratch_json_provenance": gate_meta["dk_scratch_json_provenance"],
        },
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
        output_dir.mkdir(parents=True, exist_ok=True)
        (output_dir / spec["packet_json"]).write_text(json.dumps(packet, indent=2), encoding="utf-8")
        _write_classic_upload_csv(output_dir / spec["upload_csv"], cash_lu, gpp_lus)
        _write_pure_classic_dk_csvs(output_dir, slate_key, cash_lu, gpp_lus)
    return packet


def _render_week10_dfs_markdown(packets: Mapping[str, Mapping[str, Any]]) -> str:
    lines: list[str] = [
        "# Week 10 DraftKings 5-Slate DFS Packet (Munich + Main + Sun-Mon + SNF + MNF)",
        "",
        "Generated from Stage 3/4 conserved Week 10 game projections under Stage-0 live roster gates.",
        "",
        "> HOLD STATUS: HOLD_INTERNAL_CALIBRATION_ONLY_DO_NOT_STAKE_OR_ENTER (`publish_allowed: False`). Wire-first calibration build held prior to official NFL 90-minute inactives and late-swap checks.",
        "",
        "- Scope: All 5 Week 10 DraftKings slates (DG 156422, DG 156416, DG 156418, DG 156433, DG 156434)",
        "- Cash vs GPP Separation: Cash optimizes 0.60 * median + 0.40 * p25 floor with zero-decoy prevents; 20-Max GPP optimizes ceiling, correlation stacks, and overlap diversity.",
        "- Direct DraftKings CSVs: Each slate emits both an audit CSV (`data/dfs/week10_*_dk_upload.csv`) and pure DraftKings upload CSVs (`*_dk_cash_1up.csv` 1 lineup, `*_dk_20max_gpp.csv` 20 lineups) containing only official slot columns and Name (ID) tokens.",
        "- Email Delivery Policy: auto_email_sent: False (dry-staged locally in data/dfs/ until morning kickoff confirmation).",
        "",
        "## Slate Summary",
        "",
        "| Slate Key | Draft Group | Contest Type | Release Status | Pool | Removed | Cash Salary | Cash Median | GPP Lineups | Pure Cash 1-Up CSV | Pure 20-Max GPP CSV | Audit CSV |",
        "|---|---|---|---|---|---|---|---|---|---|---|---|",
    ]
    for key in ("munich_ne_det", "sun_main_classic", "sun_mon_expanded", "snf_pit_cin", "mnf_lac_bal"):
        pkt = packets[key]
        spec = SLATE_SPECS[key]
        cash = pkt["cash_lineup"]
        pure_csvs = pkt.get("pure_dk_upload_csvs") or {}
        lines.append(
            f"| {key} | {pkt['draft_group_id']} | {pkt['contest_type']} | "
            f"{pkt.get('release_status', 'HOLD_INTERNAL_CALIBRATION_ONLY_DO_NOT_STAKE_OR_ENTER')} | "
            f"{pkt['gate_meta']['slate_pool_count']} | {pkt['gate_meta']['removed_count']} | "
            f"${cash['total_salary']} | {cash['projected_median_fpts']} | {len(pkt['gpp_lineups'])} | "
            f"`data/dfs/{pure_csvs.get('cash_1up_csv', '')}` | "
            f"`data/dfs/{pure_csvs.get('gpp_20max_csv', '')}` | "
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
            f"- Master Bundle SHA-256: `{pkt['master_bundle_sha256']}`",
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
    non_ascii = [(idx, ch, ord(ch)) for idx, ch in enumerate(raw_md) if ord(ch) > 127]
    if non_ascii:
        sample = ", ".join(f"pos={i} {c!r}(U+{cp:04X})" for i, c, cp in non_ascii[:5])
        raise ValueError(f"Non-ASCII characters detected in Week 10 DFS markdown: {sample}")
    return raw_md


def _load_existing_packet(slate_key: str, output_dir: Path) -> dict[str, Any]:
    pkt_path = output_dir / SLATE_SPECS[slate_key]["packet_json"]
    if not pkt_path.is_file():
        raise FileNotFoundError(f"Expected sealed packet {pkt_path} when skipping rebuild of {slate_key}")
    return json.loads(pkt_path.read_text(encoding="utf-8"))


def build_all_week10_slates(
    today: date | None = None,
    output_dir: Path = DATA_DFS_DIR,
    docs_md_path: Path | None = None,
    skip_munich: bool = False,
    slates: set[str] | None = None,
) -> dict[str, dict[str, Any]]:
    """Build selected Week 10 DraftKings DFS packets, upload CSVs, and research markdown packet."""
    active_slates = set(SLATE_SPECS.keys()) if not slates else set(slates)
    if skip_munich:
        active_slates.discard("munich_ne_det")
    skip_set = set(SLATE_SPECS.keys()) - active_slates
    sync_dk_draftables_to_csvs(dfs_dir=output_dir, skip_slates=skip_set)

    munich = (
        build_showdown_packet("munich_ne_det", write_outputs=True, today=today, output_dir=output_dir)
        if "munich_ne_det" in active_slates
        else _load_existing_packet("munich_ne_det", output_dir)
    )
    sun_main = (
        build_classic_packet("sun_main_classic", include_14_core=False, write_outputs=True, today=today, output_dir=output_dir)
        if "sun_main_classic" in active_slates
        else _load_existing_packet("sun_main_classic", output_dir)
    )
    sun_mon = (
        build_classic_packet("sun_mon_expanded", include_14_core=True, write_outputs=True, today=today, output_dir=output_dir)
        if "sun_mon_expanded" in active_slates
        else _load_existing_packet("sun_mon_expanded", output_dir)
    )

    if {"snf_pit_cin", "mnf_lac_bal"}.issubset(active_slates):
        primetime = build_primetime_showdowns(write_outputs=True, today=today, output_dir=output_dir)
    else:
        primetime = {
            sk: (
                build_showdown_packet(sk, write_outputs=True, today=today, output_dir=output_dir)
                if sk in active_slates
                else _load_existing_packet(sk, output_dir)
            )
            for sk in ("snf_pit_cin", "mnf_lac_bal")
        }

    packets: dict[str, dict[str, Any]] = {
        "munich_ne_det": munich,
        "sun_main_classic": sun_main,
        "sun_mon_expanded": sun_mon,
        "snf_pit_cin": primetime["snf_pit_cin"],
        "mnf_lac_bal": primetime["mnf_lac_bal"],
    }
    md_path = docs_md_path or (
        REPO_ROOT / "docs" / "dfs" / "research" / "2026-11-15" / "week10-munich-main-primetime-dfs-packet.md"
    )
    md_path.parent.mkdir(parents=True, exist_ok=True)
    md_path.write_text(_render_week10_dfs_markdown(packets), encoding="utf-8")
    return packets


if __name__ == "__main__":
    import argparse

    ap = argparse.ArgumentParser(description="Build Week 10 DraftKings DFS packets")
    ap.add_argument("--skip-munich", action="store_true", help="Do not rebuild or overwrite sealed munich_ne_det artifacts")
    ap.add_argument("--slates", default="", help="Comma-separated subset of slate keys to rebuild")
    cli_args = ap.parse_args()
    wanted_slates = {s.strip() for s in cli_args.slates.split(",") if s.strip()} or None
    all_packets = build_all_week10_slates(skip_munich=cli_args.skip_munich, slates=wanted_slates)
    for skey, spkt in all_packets.items():
        print(
            f"[DFS] {skey}: Cash=${spkt['cash_lineup']['total_salary']} "
            f"Med={spkt['cash_lineup']['projected_median_fpts']} GPP={len(spkt['gpp_lineups'])}"
        )
