#!/usr/bin/env python3
"""
GSE Master Data Compendium (62-Page Nov 2026) Extractor & Causal Week >= 11 Loader
(`intelligence/calibration/gse_master_compendium_2026_loader.py`)
===================================================================================

Parses all 62 pages of `GSEMasterDataCompendium20261120 (1).pdf` (compiling 49 source
files across 2026 NFL PFR Weeks 1-10/11 tables, 4 arXiv quantitative football papers,
Dr. BGR *Sports Psychology*, Special Olympics *Football Coaching Guide*, and the
17-item GCP GSE/GSI backlog + cost guardrails) into a canonical normalized artifact:
`data/nflverse/gse_master_compendium_2026_11_20.json`.

STRICT TEMPORAL CAUSALITY INVARIANT:
Because Part I PFR tables aggregate Weeks 1-10/11 season-to-date statistics as of
2026-11-19/20, `get_week11_plus_compendium_matchup_context()` strictly enforces
`target_week >= 11`. Any query for `target_week <= 10` returns neutral multipliers
(`matchup_mult=1.0`, `logit_adj=0.0`, `causal_eligible=False`) so cumulative tables
NEVER leak into historical Weeks 1-10 walk-forward folds.
"""
from __future__ import annotations

import argparse
import json
import math
import re
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any, Mapping, Optional

import numpy as np

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_COMPENDIUM_JSON = REPO_ROOT / "data" / "nflverse" / "gse_master_compendium_2026_11_20.json"
PDF_CANDIDATES = (
    Path(r"C:\Users\Garrett\Downloads\GSEMasterDataCompendium20261120 (1).pdf"),
    Path(r"C:\Users\Garrett\Downloads\GSEMasterDataCompendium20261120.pdf"),
)
ZIP_CANDIDATES = (
    Path(r"C:\Users\Garrett\Downloads\pfr_2026_11_19_agent_bundle.zip"),
)

FULL_TEAM_TO_ABBR: dict[str, str] = {
    "Arizona Cardinals": "ARI",
    "Atlanta Falcons": "ATL",
    "Baltimore Ravens": "BAL",
    "Buffalo Bills": "BUF",
    "Carolina Panthers": "CAR",
    "Chicago Bears": "CHI",
    "Cincinnati Bengals": "CIN",
    "Cleveland Browns": "CLE",
    "Dallas Cowboys": "DAL",
    "Denver Broncos": "DEN",
    "Detroit Lions": "DET",
    "Green Bay Packers": "GB",
    "Houston Texans": "HOU",
    "Indianapolis Colts": "IND",
    "Jacksonville Jaguars": "JAX",
    "Kansas City Chiefs": "KC",
    "Las Vegas Raiders": "LV",
    "Los Angeles Chargers": "LAC",
    "Los Angeles Rams": "LAR",
    "Miami Dolphins": "MIA",
    "Minnesota Vikings": "MIN",
    "New England Patriots": "NE",
    "New Orleans Saints": "NO",
    "New York Giants": "NYG",
    "New York Jets": "NYJ",
    "Philadelphia Eagles": "PHI",
    "Pittsburgh Steelers": "PIT",
    "San Francisco 49ers": "SF",
    "Seattle Seahawks": "SEA",
    "Tampa Bay Buccaneers": "TB",
    "Tennessee Titans": "TEN",
    "Washington Commanders": "WAS",
}

ABBR_ALIASES: dict[str, str] = {
    "LA": "LAR",
    "RAM": "LAR",
    "JAC": "JAX",
    "WSH": "WAS",
    "LVR": "LV",
    "OAK": "LV",
    "ARZ": "ARI",
    "CRD": "ARI",
    "BLT": "BAL",
    "RAV": "BAL",
    "CLV": "CLE",
    "HST": "HOU",
    "HTX": "HOU",
    "CLT": "IND",
    "GNB": "GB",
    "KAN": "KC",
    "NOR": "NO",
    "NWE": "NE",
    "SDG": "LAC",
    "SFO": "SF",
    "TAM": "TB",
    "OTI": "TEN",
}

ALL_32_TEAMS: tuple[str, ...] = tuple(sorted(FULL_TEAM_TO_ABBR.values()))
_NUM_RE = re.compile(r"^[+-]?\d+(?:\.\d+)?%?$")

ARXIV_PAPERS_SYNTHESIS: list[dict[str, Any]] = [
    {
        "arxiv_id": "2303.05774v1",
        "title": "Forecasting NFL Career Success via Scouting Combine",
        "authors": "Szekely, Sinnott, Halow, Ryan (2023)",
        "sample": "2013-2017 Draft Classes; 805 complete of 1,973 players; 6 Combine drills",
        "framework": "Random Forest (>=1 snap matriculation) + Linear Regression (career snaps)",
        "key_metrics": {"rf_test_acc": 0.83, "rf_cv_acc": 0.81, "career_snaps_r2": 0.17, "lr_test_rmse": 904.6},
        "repo": "github.com/bszek213/nfl_combine/tree/publish",
    },
    {
        "arxiv_id": "2603.17866v3",
        "title": "NFL Step-and-Turn Generative Movement Model",
        "authors": "Quang Nguyen & Ronald Yurko (CMU, Sep 2026)",
        "sample": "2022 NFL BDB 2025 tracking (Wks 1-9, 136 games, 5,400 RB runs, 10 Hz)",
        "framework": "Bayesian multilevel Stan/brms scaled-arcsine step length + von Mises turn angle + CatBoost yard-line evaluator",
        "key_metrics": {"top_yards_success_rate": {"Josh Jacobs": 0.542, "Miles Sanders": 0.539, "Travis Etienne": 0.527}, "top_explosive_95th": {"Travis Etienne": 0.118, "Aaron Jones": 0.095, "Kenneth Walker": 0.093}},
        "repo": "github.com/qntkhvn/nfl-step-turn",
    },
    {
        "arxiv_id": "2406.17220v2",
        "title": "NFL Ghosts: Defender Positioning & YAC Conditional Density",
        "authors": "Ronald Yurko, Quang Nguyen, Konstantinos Pelechrinis (CMU/Pitt, Jun 2025)",
        "sample": "2018 NFL BDB 2021 tracking (Wks 1-17, 10,363 completed passes, 10 Hz)",
        "framework": "500-tree RFCDE for YAC density + 2D spatial ghost-defender resampling (B=100)",
        "key_metrics": {"yac_correlation_r": 0.65, "team_pass_def_epa_r": 0.37, "top_defenders_delta_catch": {"Jaire Alexander": -7.37, "Adoree Jackson": -7.35, "A.J. Bouye": -7.16}},
        "repo": "github.com/ryurko/nfl-ghosts",
    },
    {
        "arxiv_id": "2604.01491v2",
        "title": "Opponent-Adjusted Pass Protection & Pass Rush",
        "authors": "Pipping-Gamon, Gebauer, Lee, Watts, Wyner (UPenn, Oct 2026)",
        "sample": "2021 NFL Hudl tracking + nflverse PBP (266 games, 18,225 plays, 70,304 early matchups)",
        "framework": "Ridge Bradley-Terry (<2.5s win) + multinomial full-play model weighted by OLS EPA disruption",
        "key_metrics": {"ols_disruption_weights": {"loss": 0.0, "win_only": 0.009, "pressure": 0.103, "sack": 1.0}, "heldout_log_loss_drop_early": 0.045, "heldout_log_loss_drop_final": 0.036},
        "repo": "github.com/WhartonSABI/nfl-elo",
    },
]

SPORTS_PSYCHOLOGY_SYNTHESIS: dict[str, Any] = {
    "source": "Sports Psychology (Dr. BGR Publications, Aug 2025, 219 pp., ISBN 978-81-989720-7-1) + Special Olympics Football Coaching Guide (Feb 2004, 133 pp.)",
    "chapters": {
        "ch1": "Foundations, History & APA/AASP Ethics",
        "ch2": "Motivation & Goal Setting (SDT, CET, Achievement Goal Theory, McClelland-Atkinson, SMART)",
        "ch3": "Personality & Mental Toughness (Big Five OCEAN, Clough 4Cs: Control/Commitment/Challenge/Confidence, Morgan Iceberg Profile)",
        "ch4": "Stress, Anxiety & Coping (State vs Trait cognitive/somatic anxiety, Inverted-U Hypothesis, Hardy Catastrophe Theory, Problem/Emotion coping, PMR)",
        "ch5": "Concentration, Attention & Flow (Nideffer attentional styles, Hanin IZOF, Csikszentmihalyi Flow triggers)",
        "ch6": "Group Dynamics & Leadership (Tuckman stages, Carron Task vs Social Cohesion, Leadership styles)",
        "ch7": "PST Periodization, Rehab Adherence & Sports Neuropsychology",
    },
    "hardy_catastrophe_params": {
        "blitz_threshold": 0.30,
        "pocket_time_threshold_s": 2.35,
        "cognitive_bad_throw_threshold": 0.175,
        "max_cusp_penalty": 0.88,
        "max_calm_bonus": 1.02,
    },
}

GCP_ARCHITECTURE_AND_BACKLOG: dict[str, Any] = {
    "verified_at": "2026-11-19T10:55:00-06:00",
    "skills_pro_cancel_deadline": "2026-11-23T09:26:00-06:00",
    "paths_completed": ["Path 36 - Cloud Computing Foundations (2,374 pts, 4 badges)"],
    "paths_in_progress": ["Path 4525 - Prof. Agentic Architect (GSP1320 at 50/100)"],
    "explicit_non_goals": [
        "DO NOT build a GKE Kubernetes cluster before Cloud Run/Functions Gen 2 are proven insufficient.",
        "DO NOT migrate relational databases off Neon Postgres.",
        "DO NOT provision custom Vertex/Agent Platform training infrastructure before BigQuery ML and pre-built ML APIs are proven insufficient.",
    ],
    "backlog_items": [
        {"rank": 1, "item": "Pub/Sub topics + Cloud Run Function Gen 2 ingestion", "priority": "P0", "cost_tier": "Free tier"},
        {"rank": 2, "item": "BigQuery warehouse + BigQuery ML SQL models", "priority": "P0", "cost_tier": "Free tier"},
        {"rank": 3, "item": "Pre-built ML APIs into Nova (NL entities/sentiment, STT, Video Intelligence)", "priority": "P0", "cost_tier": "Pay-per-use free tier"},
        {"rank": 4, "item": "Cloud Monitoring: Ops Agent + uptime check + alert policy + dashboard", "priority": "P0", "cost_tier": "Free tier"},
        {"rank": 5, "item": "Dataflow PubSub_to_BigQuery template for live ingestion", "priority": "P1", "cost_tier": "Pay-per-use"},
        {"rank": 6, "item": "Agent Platform AutoML tabular on historical sports data", "priority": "P1", "cost_tier": "Paid training"},
        {"rank": 7, "item": "IAP + JWT verification on Cloud Run services", "priority": "P1", "cost_tier": "Free"},
        {"rank": 8, "item": "VPC + tagged firewall rules + EXTERNAL_MANAGED LB + Cloud Armor", "priority": "P1", "cost_tier": "LB/Armor paid"},
        {"rank": 9, "item": "IAM least-privilege + guardrail conditions (impersonation over JSON keys)", "priority": "P1", "cost_tier": "Free"},
        {"rank": 10, "item": "Cloud Storage buckets + JSON API access pattern", "priority": "P1", "cost_tier": "Free tier"},
        {"rank": 11, "item": "Cloud SQL MySQL for app data (only when needed)", "priority": "Defer", "cost_tier": "Paid"},
        {"rank": 12, "item": "Dataproc ephemeral Spark clusters (~1c/vCPU/hr when batch justifies)", "priority": "Defer", "cost_tier": "Paid"},
        {"rank": 13, "item": "App Engine Python service (only if PaaS preferred over Cloud Run)", "priority": "Defer", "cost_tier": "Free tier"},
        {"rank": 14, "item": "Dataflow + Apache Beam custom Python ETL (defer until templates insufficient)", "priority": "Defer", "cost_tier": "Pay-per-use"},
        {"rank": 15, "item": "GKE Kubernetes cluster", "priority": "DO NOT BUILD YET", "cost_tier": "Paid"},
        {"rank": 16, "item": "Custom training + Agent Platform Workbench", "priority": "DO NOT BUILD YET", "cost_tier": "Paid"},
        {"rank": 17, "item": "Terraform / Infrastructure-as-Code rollout (once architecture stabilizes)", "priority": "Post-stabilize", "cost_tier": "Free"},
    ],
}


def norm_team_code(code_or_name: Any) -> str:
    raw = " ".join(str(code_or_name or "").strip().split())
    if raw in FULL_TEAM_TO_ABBR:
        return FULL_TEAM_TO_ABBR[raw]
    u = raw.upper()
    return ABBR_ALIASES.get(u, u)


def _to_float(tok: str) -> float:
    s = tok.strip().rstrip("%").replace(",", "")
    if not s:
        return 0.0
    return float(s)


def _clean_pdf_lines(pdf_path: Path) -> list[str]:
    import pymupdf  # type: ignore

    doc = pymupdf.open(str(pdf_path))
    raw_lines: list[str] = []
    for i in range(len(doc)):
        txt = doc[i].get_text("text")
        for ln in txt.splitlines():
            s = ln.strip()
            if not s:
                continue
            if re.match(r"^Page \d+ of 62$", s):
                continue
            if s.startswith("GSE Master Data Compendium — 49-File Unified Reference"):
                continue
            raw_lines.append(s)
    return raw_lines


def _slice_section(lines: list[str], start_prefix: str, stop_prefixes: tuple[str, ...]) -> list[str]:
    start_idx = None
    for i, ln in enumerate(lines):
        if ln.startswith(start_prefix):
            start_idx = i + 1
            break
    if start_idx is None:
        return []
    end_idx = len(lines)
    for j in range(start_idx, len(lines)):
        if any(lines[j].startswith(sp) for sp in stop_prefixes):
            end_idx = j
            break
    return lines[start_idx:end_idx]


def _extract_team_rows(
    sec_lines: list[str],
    n_numeric_fields: int,
    *,
    optional_status: bool = False,
) -> dict[str, list[str]]:
    """
    Robustly parse tables where team names may span 2 wrapped PDF lines (e.g.
    `Las Vegas` + `Raiders`) and page-break headers may repeat mid-table.
    """
    out: dict[str, list[str]] = {}
    i = 0
    n = len(sec_lines)
    while i < n:
        # Try 1-line then 2-line team match
        abbr = ""
        consumed = 0
        cand1 = " ".join(sec_lines[i].split())
        if cand1 in FULL_TEAM_TO_ABBR:
            abbr = FULL_TEAM_TO_ABBR[cand1]
            consumed = 1
        elif i + 1 < n:
            cand2 = f"{cand1} {' '.join(sec_lines[i + 1].split())}"
            if cand2 in FULL_TEAM_TO_ABBR:
                abbr = FULL_TEAM_TO_ABBR[cand2]
                consumed = 2
        if not abbr:
            i += 1
            continue

        j = i + consumed
        status_val = ""
        if optional_status and j < n and sec_lines[j] in {"Div Ldr", "wild_card"}:
            status_val = sec_lines[j]
            j += 1

        vals: list[str] = []
        while j < n and len(vals) < n_numeric_fields:
            tok = sec_lines[j]
            if _NUM_RE.match(tok):
                vals.append(tok)
                j += 1
            else:
                # Could encounter repeated rank/header token only if malformed; break defensively
                break
        if len(vals) == n_numeric_fields:
            out[abbr] = ([status_val] + vals) if optional_status else vals
            i = j
        else:
            i += 1
    return out


def _parse_standings(lines: list[str]) -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    for conf, start_p, stops in (
        ("AFC", "AFC Standings (All 16 Teams)", ("NFC Standings (All 16 Teams)", "1.3 Team Offense")),
        ("NFC", "NFC Standings (All 16 Teams)", ("1.3 Team Offense", "Team Offense — Per-Game")),
    ):
        sec = _slice_section(lines, start_p, stops)
        rows = _extract_team_rows(sec, 12, optional_status=True)
        for abbr, vals in rows.items():
            out[abbr] = {
                "conference": conf,
                "status": vals[0],
                "wins": int(_to_float(vals[1])),
                "losses": int(_to_float(vals[2])),
                "ties": int(_to_float(vals[3])),
                "win_pct": round(_to_float(vals[4]), 4),
                "pf": int(_to_float(vals[5])),
                "pa": int(_to_float(vals[6])),
                "pd": int(_to_float(vals[7])),
                "mov": round(_to_float(vals[8]), 2),
                "sos": round(_to_float(vals[9]), 2),
                "srs": round(_to_float(vals[10]), 2),
                "osrs": round(_to_float(vals[11]), 2),
                "dsrs": round(_to_float(vals[12]), 2),
            }
    return out


def _parse_team_off_def_pg(lines: list[str], is_defense: bool) -> dict[str, dict[str, float]]:
    if not is_defense:
        sec = _slice_section(
            lines,
            "Team Offense — Per-Game Averages",
            ("Avg Team", "League Total", "Team Offense — Season Totals"),
        )
    else:
        sec = _slice_section(
            lines,
            "Team Defense — Per-Game Averages",
            ("Avg Team", "League Total", "Team Defense — Season Totals"),
        )
    rows = _extract_team_rows(sec, 12)
    out: dict[str, dict[str, float]] = {}
    for abbr, vals in rows.items():
        pts_key = "pa_pg" if is_defense else "pf_pg"
        out[abbr] = {
            "games": float(_to_float(vals[0])),
            pts_key: round(_to_float(vals[1]), 2),
            "yds_pg": round(_to_float(vals[2]), 2),
            "ypp": round(_to_float(vals[3]), 2),
            "to_pg": round(_to_float(vals[4]), 2),
            "first_d_pg": round(_to_float(vals[5]), 2),
            "pass_y_pg": round(_to_float(vals[6]), 2),
            "pass_td_pg": round(_to_float(vals[7]), 2),
            "rush_y_pg": round(_to_float(vals[8]), 2),
            "rush_td_pg": round(_to_float(vals[9]), 2),
            "score_pct": round(_to_float(vals[10]) / 100.0, 4),
            "exp_pg": round(_to_float(vals[11]), 2),
        }
    return out


def _parse_advanced_passing(lines: list[str]) -> dict[str, dict[str, float]]:
    air_sec = _slice_section(lines, "Team Advanced Passing — Air Yards", ("Team Advanced Passing — Accuracy",))
    acc_sec = _slice_section(lines, "Team Advanced Passing — Accuracy", ("Team Advanced Passing — Pressure",))
    prs_sec = _slice_section(lines, "Team Advanced Passing — Pressure", ("Team Advanced Passing — Play Type",))
    rpo_sec = _slice_section(lines, "Team Advanced Passing — Play Type: RPO & Play-Action", ("1.5 Conversions",))

    air_rows = _extract_team_rows(air_sec, 11)
    acc_rows = _extract_team_rows(acc_sec, 12)
    prs_rows = _extract_team_rows(prs_sec, 12)
    rpo_rows = _extract_team_rows(rpo_sec, 12)

    out: dict[str, dict[str, float]] = {}
    for abbr in ALL_32_TEAMS:
        rec: dict[str, float] = {}
        if abbr in air_rows:
            v = air_rows[abbr]
            rec.update({
                "games": float(_to_float(v[0])),
                "cmp": float(_to_float(v[1])),
                "att": float(_to_float(v[2])),
                "pass_yds": float(_to_float(v[3])),
                "iay": float(_to_float(v[4])),
                "iay_pa": round(_to_float(v[5]), 2),
                "cay": float(_to_float(v[6])),
                "cay_cmp": round(_to_float(v[7]), 2),
                "cay_pa": round(_to_float(v[8]), 2),
                "yac": float(_to_float(v[9])),
                "yac_cmp": round(_to_float(v[10]), 2),
            })
        if abbr in acc_rows:
            v = acc_rows[abbr]
            rec.update({
                "bats": float(_to_float(v[4])),
                "throwaways": float(_to_float(v[5])),
                "drops": float(_to_float(v[6])),
                "drop_pct": round(_to_float(v[7]) / 100.0, 4),
                "bad_throws": float(_to_float(v[8])),
                "bad_throw_pct": round(_to_float(v[9]) / 100.0, 4),
                "on_target": float(_to_float(v[10])),
                "on_target_pct": round(_to_float(v[11]) / 100.0, 4),
            })
        if abbr in prs_rows:
            v = prs_rows[abbr]
            rec.update({
                "sacks": float(_to_float(v[4])),
                "pocket_time": round(_to_float(v[5]), 2),
                "blitzes_faced": float(_to_float(v[6])),
                "hurries": float(_to_float(v[7])),
                "qb_hits": float(_to_float(v[8])),
                "pressures": float(_to_float(v[9])),
                "pressure_pct": round(_to_float(v[10]) / 100.0, 4),
                "scrambles": float(_to_float(v[11])),
            })
        if abbr in rpo_rows:
            v = rpo_rows[abbr]
            att_tot = max(1.0, float(_to_float(v[2])))
            pa_att = float(_to_float(v[10]))
            rec.update({
                "rpo_plays": float(_to_float(v[4])),
                "rpo_yds": float(_to_float(v[5])),
                "pa_pass_att": pa_att,
                "pa_pass_yds": float(_to_float(v[11])),
                "pa_pass_rate": round(pa_att / att_tot, 4),
            })
        if rec:
            out[abbr] = rec
    return out


def _parse_conversions(lines: list[str]) -> dict[str, dict[str, float]]:
    sec = _slice_section(
        lines,
        "Team 3rd/4th Down & Red Zone Conversions",
        ("League Total", "Team Drive Averages — Per-Game"),
    )
    rows = _extract_team_rows(sec, 10)
    out: dict[str, dict[str, float]] = {}
    for abbr, v in rows.items():
        out[abbr] = {
            "games": float(_to_float(v[0])),
            "third_d_att": float(_to_float(v[1])),
            "third_d_conv": float(_to_float(v[2])),
            "third_d_pct": round(_to_float(v[3]) / 100.0, 4),
            "fourth_d_att": float(_to_float(v[4])),
            "fourth_d_conv": float(_to_float(v[5])),
            "fourth_d_pct": round(_to_float(v[6]) / 100.0, 4),
            "rz_att": float(_to_float(v[7])),
            "rz_td": float(_to_float(v[8])),
            "rz_td_pct": round(_to_float(v[9]) / 100.0, 4),
        }
    return out


def _parse_defense_vs_position(lines: list[str]) -> dict[str, dict[str, dict[str, float]]]:
    specs = (
        ("QB", "Defense vs. Quarterbacks", ("Defense vs. Running Backs",), 11, "qb"),
        ("RB", "Defense vs. Running Backs", ("Defense vs. Wide Receivers",), 14, "rb"),
        ("WR", "Defense vs. Wide Receivers", ("Defense vs. Tight Ends",), 11, "wr"),
        ("TE", "Defense vs. Tight Ends", ("1.7 2026 NFL Top Player Leaderboards",), 11, "te"),
    )
    result: dict[str, dict[str, dict[str, float]]] = {}
    for pos, start_p, stops, ncol, kind in specs:
        sec = _slice_section(lines, start_p, stops)
        rows = _extract_team_rows(sec, ncol)
        pos_map: dict[str, dict[str, float]] = {}
        for abbr, v in rows.items():
            g = max(1.0, float(_to_float(v[0])))
            if kind == "qb":
                yds = float(_to_float(v[3]))
                tds = float(_to_float(v[4]))
                fp_pg = float(_to_float(v[9]))
                dk_pg = float(_to_float(v[10]))
                rec = {
                    "games": g,
                    "cmp_allowed": float(_to_float(v[1])),
                    "att_allowed": float(_to_float(v[2])),
                    "yds_allowed": yds,
                    "yds_allowed_pg": round(yds / g, 2),
                    "td_allowed": tds,
                    "int_forced": float(_to_float(v[5])),
                    "sacks": float(_to_float(v[6])),
                    "rush_yds_allowed": float(_to_float(v[8])),
                    "fant_pt_per_game": round(fp_pg, 2),
                    "dk_pt_per_game": round(dk_pg, 2),
                    "fd_pt_per_game": round(fp_pg, 2),
                }
            elif kind == "rb":
                rush_yds = float(_to_float(v[2]))
                rush_td = float(_to_float(v[3]))
                rec_yds = float(_to_float(v[6]))
                rec_td = float(_to_float(v[7]))
                rec = {
                    "games": g,
                    "rush_att_allowed": float(_to_float(v[1])),
                    "rush_yds_allowed": rush_yds,
                    "rush_yds_allowed_pg": round(rush_yds / g, 2),
                    "rush_td_allowed": rush_td,
                    "targets_allowed": float(_to_float(v[4])),
                    "rec_allowed": float(_to_float(v[5])),
                    "rec_yds_allowed": rec_yds,
                    "rec_td_allowed": rec_td,
                    "yds_allowed": rush_yds + rec_yds,
                    "yds_allowed_pg": round((rush_yds + rec_yds) / g, 2),
                    "td_allowed": rush_td + rec_td,
                    "fant_pt_per_game": round(float(_to_float(v[11])), 2),
                    "dk_pt_per_game": round(float(_to_float(v[12])), 2),
                    "fd_pt_per_game": round(float(_to_float(v[13])), 2),
                }
            else:  # wr or te
                yds = float(_to_float(v[3]))
                tds = float(_to_float(v[4]))
                rec = {
                    "games": g,
                    "targets_allowed": float(_to_float(v[1])),
                    "rec_allowed": float(_to_float(v[2])),
                    "yds_allowed": yds,
                    "yds_allowed_pg": round(yds / g, 2),
                    "td_allowed": tds,
                    "fant_pt_per_game": round(float(_to_float(v[8])), 2),
                    "dk_pt_per_game": round(float(_to_float(v[9])), 2),
                    "fd_pt_per_game": round(float(_to_float(v[10])), 2),
                }
            pos_map[abbr] = rec

        if pos_map:
            lg_dk = float(np.mean([r["dk_pt_per_game"] for r in pos_map.values()]))
            for r in pos_map.values():
                ratio = (r["games"] * r["dk_pt_per_game"] + 4.0 * lg_dk) / ((r["games"] + 4.0) * max(1.0, lg_dk))
                r["league_avg_dk_pg"] = round(lg_dk, 3)
                r["eb_dk_vs_league_mult"] = round(float(np.clip(ratio, 0.72, 1.32)), 4)
        result[pos] = pos_map
    return result


def _parse_ol_penalties(lines: list[str]) -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]]]:
    sec = _slice_section(
        lines,
        "Top 20 Offensive Line Penalty Leaders",
        ("1.8 NFL & Fantasy Advanced Metrics Reference",),
    )
    leaders: list[dict[str, Any]] = []
    header_tokens = {"Player", "Pos", "Tm", "G", "GS", "Holding", "False Start", "Pen", "Decl/Offs"}
    cleaned = [ln for ln in sec if ln not in header_tokens]
    i = 0
    while i < len(cleaned):
        tok = cleaned[i]
        # Candidate player line followed by team (or optional pos + team) + 6 integers
        if i + 7 < len(cleaned) and not _NUM_RE.match(tok):
            tm_raw = cleaned[i + 1]
            # Check if tm_raw is a PFR 3-letter code and next 6 tokens are integers
            if len(tm_raw) in (2, 3) and tm_raw.isupper() and all(_NUM_RE.match(cleaned[i + 2 + k]) for k in range(6)):
                tm = norm_team_code(tm_raw)
                leaders.append({
                    "player": tok,
                    "team": tm,
                    "games": int(_to_float(cleaned[i + 2])),
                    "gs": int(_to_float(cleaned[i + 3])),
                    "holding": int(_to_float(cleaned[i + 4])),
                    "false_start": int(_to_float(cleaned[i + 5])),
                    "penalties": int(_to_float(cleaned[i + 6])),
                    "declined_offset": int(_to_float(cleaned[i + 7])),
                })
                i += 8
                continue
        i += 1

    by_team: dict[str, dict[str, Any]] = {}
    for row in leaders:
        rec = by_team.setdefault(row["team"], {"ol_leader_penalties": 0, "ol_leader_count": 0, "players": []})
        rec["ol_leader_penalties"] += int(row["penalties"])
        rec["ol_leader_count"] += 1
        rec["players"].append(row["player"])
    return leaders, by_team


def build_compendium_from_pdf(
    pdf_path: Path | None = None,
    out_json_path: Path | None = None,
) -> dict[str, Any]:
    """Parse all 62 pages of `GSEMasterDataCompendium20261120 (1).pdf` into a canonical JSON dataset."""
    src_pdf = pdf_path
    if src_pdf is None:
        for cand in PDF_CANDIDATES:
            if cand.is_file():
                src_pdf = cand
                break
    target_out = out_json_path or DEFAULT_COMPENDIUM_JSON
    if src_pdf is None or not src_pdf.is_file():
        if target_out.is_file():
            return json.loads(target_out.read_text(encoding="utf-8"))
        raise FileNotFoundError("Neither GSEMasterDataCompendium20261120 (1).pdf nor committed compendium JSON exists.")

    lines = _clean_pdf_lines(src_pdf)
    standings = _parse_standings(lines)
    off_pg = _parse_team_off_def_pg(lines, is_defense=False)
    def_pg = _parse_team_off_def_pg(lines, is_defense=True)
    adv_pass = _parse_advanced_passing(lines)
    conv = _parse_conversions(lines)
    dvp = _parse_defense_vs_position(lines)
    ol_leaders, ol_by_team = _parse_ol_penalties(lines)

    compendium: dict[str, Any] = {
        "schema": "gse_master_compendium_2026_v1",
        "source_pdf_name": src_pdf.name,
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "causal_valid_from_week": 11,
        "notes": "Weeks 1-10/11 PFR cumulative compendium (as of 2026-11-19). Strictly gated on target_week >= 11 to prevent historical walk-forward leakage.",
        "teams_count": len(standings),
        "standings_srs": standings,
        "team_offense_pg": off_pg,
        "team_defense_pg": def_pg,
        "advanced_team_passing": adv_pass,
        "conversions": conv,
        "defense_vs_position": dvp,
        "ol_penalty_leaders_top20": ol_leaders,
        "team_ol_penalty_summary": ol_by_team,
        "arxiv_papers": ARXIV_PAPERS_SYNTHESIS,
        "sports_psychology": SPORTS_PSYCHOLOGY_SYNTHESIS,
        "gcp_architecture": GCP_ARCHITECTURE_AND_BACKLOG,
    }
    target_out.parent.mkdir(parents=True, exist_ok=True)
    target_out.write_text(json.dumps(compendium, indent=2) + "\n", encoding="utf-8")
    return compendium


@lru_cache(maxsize=2)
def load_compendium_cached(json_path_str: str | None = None) -> dict[str, Any]:
    path = Path(json_path_str) if json_path_str else DEFAULT_COMPENDIUM_JSON
    if path.is_file():
        return json.loads(path.read_text(encoding="utf-8"))
    return build_compendium_from_pdf(out_json_path=path)


# ---------------------------------------------------------------------------
# Part III Sports Psychology Kernel & Part IV GCP Guardrails
# ---------------------------------------------------------------------------

def compute_hardy_catastrophe_blitz_penalty(
    qb_bad_throw_pct: float,
    opp_blitz_rate: float,
    pocket_time_s: float = 2.4,
    is_hostile_road: bool = False,
) -> float:
    """
    Dr. BGR Sports Psychology Ch. 4 — Hardy's Catastrophe Model:
    Low-to-moderate arousal follows gentle Inverted-U curves, whereas combining HIGH
    physiological arousal (blitz/pocket squeeze) WITH HIGH cognitive instability
    (elevated bad-throw rate) produces a sharp cusp performance drop.
    """
    bad = float(qb_bad_throw_pct)
    bltz = float(opp_blitz_rate)
    pkt = float(pocket_time_s)

    physio_stress = max(0.0, bltz - 0.25) / 0.12 + max(0.0, 2.38 - pkt) / 0.30
    if is_hostile_road:
        physio_stress += 0.25
    cog_anxiety = max(0.0, bad - 0.155) / 0.06

    # Sub-threshold calm pocket + sharp QB accuracy
    if bad <= 0.135 and bltz <= 0.27 and pkt >= 2.30:
        return 1.02

    interaction = physio_stress * cog_anxiety
    if bltz >= 0.30 and bad >= 0.175:
        # Cusp regime past Hardy's bifurcation boundary
        penalty = 1.0 - min(0.12, 0.045 + 0.04 * interaction)
    else:
        penalty = 1.0 - min(0.05, 0.025 * interaction)
    return float(max(0.88, min(1.02, penalty)))


def assert_gcp_cost_guardrails_clean(cfg: Mapping[str, Any]) -> dict[str, Any]:
    """
    Enforce Part IV Compendium Cost Non-Goals:
      - No GKE Kubernetes cluster before Cloud Run / Cloud Functions Gen 2 prove insufficient.
      - Never migrate relational DB off Neon Postgres.
      - No custom training / Workbench provisioning before BQML & pre-built APIs.
    """
    violations: list[str] = []
    if bool(cfg.get("gke_enabled", False)):
        violations.append("FORBIDDEN_GKE_PROVISIONING_NON_GOAL")
    if bool(cfg.get("migrate_off_neon", False)):
        violations.append("FORBIDDEN_NEON_MIGRATION_NON_GOAL")
    if bool(cfg.get("custom_vertex_training_infra", False)):
        violations.append("FORBIDDEN_CUSTOM_TRAINING_NON_GOAL_BEFORE_BQML")
    if violations:
        raise ValueError(f"GCP cost-protection guardrail violation: {', '.join(violations)}")
    return {
        "ok": True,
        "skills_pro_cancel_deadline": GCP_ARCHITECTURE_AND_BACKLOG["skills_pro_cancel_deadline"],
        "violations": [],
    }


# ---------------------------------------------------------------------------
# Strictly Causal Week >= 11 Matchup Context Overlay
# ---------------------------------------------------------------------------

def get_week11_plus_compendium_matchup_context(
    team: str,
    opp_team: str,
    position: str,
    stat_family: str,
    target_week: int,
    *,
    is_home: bool = True,
    compendium: Optional[Mapping[str, Any]] = None,
) -> dict[str, Any]:
    """
    Return strictly causal Week >= 11 Compendium matchup context.
    Any call with `target_week < 11` returns neutral values (`causal_eligible=False`).
    """
    wk = int(target_week)
    if wk < 11:
        return {
            "causal_eligible": False,
            "target_week": wk,
            "matchup_mult": 1.0,
            "logit_adj": 0.0,
            "hardy_blitz_mult": 1.0,
            "reason": "COMPENDIUM_CUMULATIVE_W1_W10_BLOCKED_BEFORE_W11",
        }

    comp = compendium if compendium is not None else load_compendium_cached()
    tm = norm_team_code(team)
    opp = norm_team_code(opp_team)
    pos_u = str(position or "").strip().upper()
    fam = str(stat_family or "").strip().lower()

    # Determine relevant defense-vs-position table
    if pos_u in {"QB", "RB", "WR", "TE"}:
        dvp_pos = pos_u
    elif any(k in fam for k in ("pass_", "passing_")):
        dvp_pos = "QB"
    elif any(k in fam for k in ("rush", "carries")):
        dvp_pos = "RB"
    elif "rec" in fam:
        dvp_pos = "WR"
    else:
        dvp_pos = "DEF"

    dvp_tbl = comp.get("defense_vs_position", {}).get(dvp_pos, {})
    opp_dvp = dvp_tbl.get(opp, {})
    eb_dvp_mult = float(opp_dvp.get("eb_dk_vs_league_mult", 1.0))

    srs_tbl = comp.get("standings_srs", {})
    tm_srs = srs_tbl.get(tm, {})
    opp_srs = srs_tbl.get(opp, {})
    osrs = float(tm_srs.get("osrs", 0.0))
    opp_dsrs = float(opp_srs.get("dsrs", 0.0))
    srs_mismatch = osrs - opp_dsrs  # positive => offense > defense

    adv_tbl = comp.get("advanced_team_passing", {})
    tm_adv = adv_tbl.get(tm, {})
    opp_adv = adv_tbl.get(opp, {})
    on_tgt = float(tm_adv.get("on_target_pct", 0.74))
    bad_pct = float(tm_adv.get("bad_throw_pct", 0.16))
    pkt_time = float(tm_adv.get("pocket_time", 2.35))
    tm_prss_pct = float(tm_adv.get("pressure_pct", 0.22))

    # Estimate opponent blitz tendency from league PFR/team defense
    conv_tbl = comp.get("conversions", {})
    tm_rz = float(conv_tbl.get(tm, {}).get("rz_td_pct", 0.58))
    ol_pen_tm = int(comp.get("team_ol_penalty_summary", {}).get(tm, {}).get("ol_leader_penalties", 0))

    hardy_mult = compute_hardy_catastrophe_blitz_penalty(
        qb_bad_throw_pct=bad_pct,
        opp_blitz_rate=max(0.24, min(0.42, tm_prss_pct + 0.05)),
        pocket_time_s=pkt_time,
        is_hostile_road=(not is_home),
    )

    if dvp_pos == "DEF":
        # IDP tackle/sack opportunities track opponent play volume & pressure
        opp_off_yds = float(comp.get("team_offense_pg", {}).get(opp, {}).get("yds_pg", 331.9))
        raw_mult = 1.0 + 0.12 * ((opp_off_yds - 331.9) / 120.0) - 0.015 * float(opp_srs.get("srs", 0.0) / 10.0)
        matchup_mult = float(np.clip(raw_mult, 0.90, 1.10))
        logit_adj = float(np.clip(math.log(matchup_mult) * 0.45, -0.09, 0.09))
    else:
        # Shrunk positional defense + OSRS/DSRS + OnTgt/Hardy + OL discipline
        ol_friction = -0.0025 * min(20, ol_pen_tm)
        acc_edge = 0.20 * (on_tgt - 0.74) if dvp_pos in {"QB", "WR", "TE"} else 0.0
        rz_edge = 0.12 * (tm_rz - 0.58) if ("td" in fam or "anytime" in fam) else 0.0
        srs_edge = 0.005 * float(np.clip(srs_mismatch, -10.0, 10.0))
        dvp_edge = 0.55 * (eb_dvp_mult - 1.0)
        raw_mult = (1.0 + dvp_edge + acc_edge + rz_edge + srs_edge + ol_friction) * (
            hardy_mult if dvp_pos in {"QB", "WR", "TE"} else 1.0
        )
        matchup_mult = float(np.clip(raw_mult, 0.86, 1.14))
        logit_adj = float(np.clip((matchup_mult - 1.0) * 0.85, -0.14, 0.14))

    return {
        "causal_eligible": True,
        "target_week": wk,
        "team": tm,
        "opp_team": opp,
        "dvp_pos": dvp_pos,
        "eb_dvp_mult": round(eb_dvp_mult, 4),
        "opp_dk_pt_per_game": float(opp_dvp.get("dk_pt_per_game", 0.0)),
        "team_osrs": round(osrs, 2),
        "opp_dsrs": round(opp_dsrs, 2),
        "team_on_target_pct": round(on_tgt, 4),
        "team_bad_throw_pct": round(bad_pct, 4),
        "team_rz_td_pct": round(tm_rz, 4),
        "team_ol_leader_penalties": ol_pen_tm,
        "hardy_blitz_mult": round(hardy_mult, 4),
        "matchup_mult": round(matchup_mult, 4),
        "logit_adj": round(logit_adj, 4),
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract 62-page GSE Master Data Compendium PDF into JSON")
    parser.add_argument("--pdf", default="", help="Optional path to GSEMasterDataCompendium20261120 (1).pdf")
    parser.add_argument("--out", default=str(DEFAULT_COMPENDIUM_JSON), help="Output JSON path")
    args = parser.parse_args()
    pdf_p = Path(args.pdf) if args.pdf else None
    doc = build_compendium_from_pdf(pdf_path=pdf_p, out_json_path=Path(args.out))
    dvp_counts = {p: len(doc["defense_vs_position"].get(p, {})) for p in ("QB", "RB", "WR", "TE")}
    print(
        f"[COMPENDIUM EXTRACTED] teams_srs={doc['teams_count']} | adv_pass={len(doc['advanced_team_passing'])} | "
        f"conv={len(doc['conversions'])} | dvp={dvp_counts} | ol_leaders={len(doc['ol_penalty_leaders_top20'])}"
    )
