#!/usr/bin/env python3
"""
Offline PFR 39-Table + Agent Bundle (25 CSV) + Gapfill (3 CSV) Intelligence Extractor
======================================================================================

Parses and deduplicates all locally downloaded Pro-Football-Reference 2026 exports
(`sportsref_download*.xls`, `pfr_2026_11_19_agent_bundle.zip`, and
`pfr_2026_11_19_gapfill_and_tnf_pack.zip`), normalizes all 32 canonical NFL teams,
computes cross-sectional z-scored composite trench, scheme, pocket-protection,
contact/YAC, defensive-havoc, penalty-discipline, and positional-vulnerability indices
bounded to [-3.0, +3.0], and persists ONLY GSE-derived mathematical priors (zero
raw PFR dumps and zero player names) into:

    data/engine/gse_derived_trench_scheme_contact_priors_2026.json

Standing doctrine:
- Rights hygiene (NOTICE / DATASET_LICENSES.json): pure numeric z-scored derived
  team composites only; raw PFR HTML/CSVs never enter version control.
- Pure 7-bit ASCII JSON (`ensure_ascii=True`).
"""

from __future__ import annotations

import argparse
from collections import defaultdict
import csv
import datetime as dt
import hashlib
from html import unescape
import io
import json
import math
from pathlib import Path
import re
from typing import Any, Dict, Iterable, List, Optional, Tuple
import zipfile

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DOWNLOADS_DIR = Path.home() / "Downloads"
DEFAULT_BUNDLE_ZIP = DEFAULT_DOWNLOADS_DIR / "pfr_2026_11_19_agent_bundle.zip"
DEFAULT_GAPFILL_ZIP = (
    Path("G:/My Drive/GSE Autonomous Support Pack (2026-11-19)/pfr_2026_11_19_gapfill_and_tnf_pack.zip")
)
DEFAULT_OUT_PATH = (
    REPO_ROOT / "data" / "engine" / "gse_derived_trench_scheme_contact_priors_2026.json"
)

CANONICAL_32_TEAMS: Tuple[str, ...] = (
    "ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE",
    "DAL", "DEN", "DET", "GB", "HOU", "IND", "JAX", "KC",
    "LA", "LAC", "LV", "MIA", "MIN", "NE", "NO", "NYG",
    "NYJ", "PHI", "PIT", "SEA", "SF", "TB", "TEN", "WAS",
)

TEAM_ALIASES: Dict[str, str] = {
    "ARI": "ARI", "ARZ": "ARI", "ARIZONA CARDINALS": "ARI",
    "ATL": "ATL", "ATLANTA FALCONS": "ATL",
    "BAL": "BAL", "BLT": "BAL", "BALTIMORE RAVENS": "BAL",
    "BUF": "BUF", "BUFFALO BILLS": "BUF",
    "CAR": "CAR", "CAROLINA PANTHERS": "CAR",
    "CHI": "CHI", "CHICAGO BEARS": "CHI",
    "CIN": "CIN", "CINCINNATI BENGALS": "CIN",
    "CLE": "CLE", "CLV": "CLE", "CLEVELAND BROWNS": "CLE",
    "DAL": "DAL", "DALLAS COWBOYS": "DAL",
    "DEN": "DEN", "DENVER BRONCOS": "DEN",
    "DET": "DET", "DETROIT LIONS": "DET",
    "GB": "GB", "GNB": "GB", "GREEN BAY PACKERS": "GB",
    "HOU": "HOU", "HST": "HOU", "HOUSTON TEXANS": "HOU",
    "IND": "IND", "INDIANAPOLIS COLTS": "IND",
    "JAX": "JAX", "JAC": "JAX", "JACKSONVILLE JAGUARS": "JAX",
    "KC": "KC", "KAN": "KC", "KCC": "KC", "KANSAS CITY CHIEFS": "KC",
    "LA": "LA", "LAR": "LA", "STL": "LA", "LOS ANGELES RAMS": "LA",
    "LAC": "LAC", "SD": "LAC", "SDC": "LAC", "LOS ANGELES CHARGERS": "LAC",
    "LV": "LV", "LVR": "LV", "OAK": "LV", "LAS VEGAS RAIDERS": "LV",
    "MIA": "MIA", "MIAMI DOLPHINS": "MIA",
    "MIN": "MIN", "MINNESOTA VIKINGS": "MIN",
    "NE": "NE", "NWE": "NE", "NEP": "NE", "NEW ENGLAND PATRIOTS": "NE",
    "NO": "NO", "NOR": "NO", "NOS": "NO", "NEW ORLEANS SAINTS": "NO",
    "NYG": "NYG", "NEW YORK GIANTS": "NYG",
    "NYJ": "NYJ", "NEW YORK JETS": "NYJ",
    "PHI": "PHI", "PHILADELPHIA EAGLES": "PHI",
    "PIT": "PIT", "PITTSBURGH STEELERS": "PIT",
    "SEA": "SEA", "SEATTLE SEAHAWKS": "SEA",
    "SF": "SF", "SFO": "SF", "SAN FRANCISCO 49ERS": "SF",
    "TB": "TB", "TAM": "TB", "TBB": "TB", "TAMPA BAY BUCCANEERS": "TB",
    "TEN": "TEN", "TENNESSEE TITANS": "TEN",
    "WAS": "WAS", "WSH": "WAS", "WASHINGTON COMMANDERS": "WAS",
}

MULTI_TEAM_TOKENS = {"2TM", "3TM", "4TM", "5TM", ""}

_TR_RE = re.compile(r"<tr[^>]*>(.*?)</tr>", re.IGNORECASE | re.DOTALL)
_TBODY_RE = re.compile(r"<tbody[^>]*>(.*?)</tbody>", re.IGNORECASE | re.DOTALL)
_CELL_RE = re.compile(r'data-stat="([^"]+)"[^>]*>(.*?)</t[dh]>', re.IGNORECASE | re.DOTALL)
_TAG_RE = re.compile(r"<[^>]+>")


def normalize_team(raw: Any) -> Optional[str]:
    key = re.sub(r"[*+]", "", str(raw or "")).strip().upper()
    key = re.sub(r"\s+", " ", key)
    if key in MULTI_TEAM_TOKENS:
        return None
    return TEAM_ALIASES.get(key)


def _to_float(val: Any, default: float = 0.0) -> float:
    if val is None:
        return default
    s = str(val).strip().rstrip("%")
    if not s or s == "--":
        return default
    try:
        out = float(s)
        return out if math.isfinite(out) else default
    except ValueError:
        return default


def _parse_html_table(raw_html: str) -> Tuple[List[str], List[Dict[str, str]]]:
    cols: List[str] = []
    for tr in _TR_RE.findall(raw_html):
        if "over_header" in tr:
            continue
        found = re.findall(r'data-stat="([^"]+)"', tr)
        if len(found) >= 5:
            cols = found
            break
    m = _TBODY_RE.search(raw_html)
    tbody = m.group(1) if m else raw_html
    rows: List[Dict[str, str]] = []
    for tr in _TR_RE.findall(tbody):
        if 'class="thead"' in tr or "over_header" in tr:
            continue
        pairs = _CELL_RE.findall(tr)
        if not pairs:
            continue
        rec: Dict[str, str] = {}
        for k, v in pairs:
            txt = unescape(_TAG_RE.sub("", v)).strip()
            rec[k] = txt
        if rec:
            rows.append(rec)
    return cols, rows


def _z_scores(values: Dict[str, float], invert: bool = False) -> Dict[str, float]:
    xs = [float(values[t]) for t in CANONICAL_32_TEAMS]
    mean = sum(xs) / float(len(xs))
    var = sum((x - mean) ** 2 for x in xs) / float(len(xs))
    sd = math.sqrt(var) if var > 1e-12 else 1.0
    out: Dict[str, float] = {}
    for t in CANONICAL_32_TEAMS:
        z = (float(values[t]) - mean) / max(sd, 1e-6)
        if invert:
            z = -z
        out[t] = round(max(-3.0, min(3.0, z)), 4)
    return out


def _restandardize_composite(
    parts: List[Tuple[Dict[str, float], float]],
    invert: bool = False,
) -> Dict[str, float]:
    raw_combo: Dict[str, float] = {}
    for t in CANONICAL_32_TEAMS:
        raw_combo[t] = sum(w * float(comp[t]) for comp, w in parts)
    return _z_scores(raw_combo, invert=invert)


def _is_per_game_table(rows: List[Dict[str, str]], col_name: str) -> bool:
    """Detect whether an XLS export stores per-game averages instead of totals."""
    for r in rows[:5]:
        v = str(r.get(col_name, "")).strip()
        if "." in v:
            return True
    return False


def build_priors(
    downloads_dir: Path = DEFAULT_DOWNLOADS_DIR,
    bundle_zip: Path = DEFAULT_BUNDLE_ZIP,
    gapfill_zip: Path = DEFAULT_GAPFILL_ZIP,
) -> Dict[str, Any]:
    xls_paths = sorted(downloads_dir.glob("sportsref_download*.xls"), key=lambda p: (len(p.name), p.name))
    if not xls_paths:
        raise FileNotFoundError(f"No sportsref_download*.xls files found in {downloads_dir}")
    if not bundle_zip.is_file():
        raise FileNotFoundError(f"Bundle zip missing: {bundle_zip}")
    if not gapfill_zip.is_file():
        raise FileNotFoundError(f"Gapfill zip missing: {gapfill_zip}")

    parsed_xls_manifest: List[Dict[str, Any]] = []
    team_tables: Dict[str, List[Dict[str, str]]] = {}
    player_tables: Dict[str, List[Dict[str, str]]] = {}
    seen_hashes: set[str] = set()

    for xp in xls_paths:
        raw = xp.read_text(encoding="utf-8", errors="replace")
        md5 = hashlib.md5(raw.encode("utf-8")).hexdigest()[:12]
        seen_hashes.add(md5)
        cols, rows = _parse_html_table(raw)
        colset = set(cols)

        role = "other"
        if "exp_pts_tot" in colset:
            role = "team_offense_per_game" if _is_per_game_table(rows, "points") else "team_offense_totals"
        elif "exp_pts_def_tot" in colset:
            role = "team_defense_per_game" if _is_per_game_table(rows, "points") else "team_defense_totals"
        elif {"pass_target_yds", "pass_air_yds", "pass_yac"}.issubset(colset) and "player" not in colset and "name_display" not in colset:
            role = "team_adv_pass_air"
        elif {"pass_batted_passes", "pass_throwaways", "pass_on_target_pct"}.issubset(colset) and "name_display" not in colset:
            role = "team_adv_pass_accuracy"
        elif {"pocket_time", "pass_blitzed", "pass_hurried", "pass_pressured_pct"}.issubset(colset) and "name_display" not in colset:
            role = "team_adv_pass_pressure"
        elif {"pass_rpo", "pass_play_action"}.issubset(colset) and "name_display" not in colset:
            role = "team_adv_pass_playaction_rpo"
        elif "pocket_time" in colset and "name_display" in colset:
            role = "player_adv_passing_pg" if _is_per_game_table(rows, "pass_att") else "player_adv_passing_totals"
        elif "rush_yds_before_contact" in colset:
            role = "player_adv_rushing_pg" if _is_per_game_table(rows, "rush_att") else "player_adv_rushing_totals"
        elif "rec_adot" in colset:
            role = "player_adv_receiving_pg" if _is_per_game_table(rows, "targets") else "player_adv_receiving_totals"
        elif {"blitzes", "qb_hurry", "tackles_missed_pct"}.issubset(colset):
            role = "player_adv_defense_pg" if _is_per_game_table(rows, "def_targets") else "player_adv_defense_totals"
        elif {"holding", "false_start", "penalties", "declined"}.issubset(colset):
            role = "player_penalties_totals"
        elif {"third_down_att", "red_zone_att"}.issubset(colset):
            role = "team_conversions_pg" if _is_per_game_table(rows, "third_down_att") else "team_conversions_totals"
        elif {"drives", "plays_per_drive"}.issubset(colset):
            role = "team_drives_pg" if _is_per_game_table(rows, "drives") else "team_drives_totals"
        elif "pass_adj_net_yds_per_att" in colset:
            role = "team_passing_pg" if _is_per_game_table(rows, "pass_att") else "team_passing_totals"
        elif "rush_yds_per_att" in colset and len(cols) == 11:
            role = "team_rushing_pg" if _is_per_game_table(rows, "rush_att") else "team_rushing_totals"

        parsed_xls_manifest.append(
            {"file": xp.name, "role": role, "rows": len(rows), "cols": len(cols), "md5_12": md5}
        )
        if role.startswith("team_") and role not in team_tables:
            team_tables[role] = rows
        elif role.startswith("player_") and role not in player_tables:
            player_tables[role] = rows

    # Parse bundle & gapfill CSVs
    csv_tables: Dict[str, List[Dict[str, str]]] = {}
    bundle_csv_count = 0
    gapfill_csv_count = 0
    with zipfile.ZipFile(bundle_zip) as zf:
        for name in sorted(zf.namelist()):
            if name.endswith(".csv"):
                bundle_csv_count += 1
                txt = zf.read(name).decode("utf-8", errors="replace")
                csv_tables[Path(name).name] = list(csv.DictReader(io.StringIO(txt)))
    with zipfile.ZipFile(gapfill_zip) as zf:
        for name in sorted(zf.namelist()):
            if name.endswith(".csv"):
                gapfill_csv_count += 1
                txt = zf.read(name).decode("utf-8", errors="replace")
                csv_tables[Path(name).name] = list(csv.DictReader(io.StringIO(txt)))

    # 1. Standings SRS / OSRS / DSRS / SoS
    standings_by_team: Dict[str, Dict[str, float]] = {}
    for fname in ("01_afc_standings.csv", "02_nfc_standings.csv"):
        for r in csv_tables.get(fname, []):
            tm = normalize_team(r.get("team"))
            if tm:
                standings_by_team[tm] = {
                    "srs": _to_float(r.get("srs")),
                    "osrs": _to_float(r.get("osrs")),
                    "dsrs": _to_float(r.get("dsrs")),
                    "sos": _to_float(r.get("strength_of_schedule")),
                }
    assert len(standings_by_team) == 32, f"Standings count {len(standings_by_team)}"

    # 2. Team Offense & Team Defense totals (from XLS (5) and (36), fallback CSV 05)
    off_tot_by_team: Dict[str, Dict[str, float]] = {}
    for r in team_tables.get("team_offense_totals", []):
        tm = normalize_team(r.get("team"))
        if tm:
            g = max(1.0, _to_float(r.get("g"), 1.0))
            off_tot_by_team[tm] = {
                "g": g,
                "pass_att": max(1.0, _to_float(r.get("pass_att"), 1.0)),
                "rush_att": max(1.0, _to_float(r.get("rush_att"), 1.0)),
                "penalties_pg": _to_float(r.get("penalties")) / g,
                "penalties_yds_pg": _to_float(r.get("penalties_yds")) / g,
            }
    def_tot_by_team: Dict[str, Dict[str, float]] = {}
    for r in team_tables.get("team_defense_totals", []):
        tm = normalize_team(r.get("team"))
        if tm:
            g = max(1.0, _to_float(r.get("g"), 1.0))
            def_tot_by_team[tm] = {
                "g": g,
                "opp_pass_att": max(1.0, _to_float(r.get("pass_att"), 1.0)),
                "exp_pts_def_tot": _to_float(r.get("exp_pts_def_tot")),
            }
    assert len(off_tot_by_team) == 32 and len(def_tot_by_team) == 32

    # 3. Team Offense Passing / Drives / Conversions
    pass_off_by_team: Dict[str, Dict[str, float]] = {}
    for r in team_tables.get("team_passing_totals", []):
        tm = normalize_team(r.get("team"))
        if tm:
            pass_off_by_team[tm] = {
                "sack_pct": _to_float(r.get("pass_sacked_perc")),
                "anya": _to_float(r.get("pass_adj_net_yds_per_att")),
            }

    # 4. Team Offense Advanced Passing ((31) Air, (32) Acc/Drops, (33) Pocket/Pressure, (34) PA/RPO)
    adv_pass_by_team: Dict[str, Dict[str, float]] = defaultdict(dict)
    for r in team_tables.get("team_adv_pass_air", []):
        tm = normalize_team(r.get("team"))
        if tm:
            att = max(1.0, _to_float(r.get("pass_att"), 1.0))
            cmp_n = max(1.0, _to_float(r.get("pass_cmp"), 1.0))
            adv_pass_by_team[tm]["yac_per_cmp"] = _to_float(r.get("pass_yac")) / cmp_n
            adv_pass_by_team[tm]["air_per_att"] = _to_float(r.get("pass_air_yds")) / att
    for r in team_tables.get("team_adv_pass_accuracy", []):
        tm = normalize_team(r.get("team"))
        if tm:
            att = max(1.0, _to_float(r.get("pass_att"), 1.0))
            adv_pass_by_team[tm]["on_target_pct"] = _to_float(r.get("pass_on_target_pct"))
            adv_pass_by_team[tm]["poor_throw_pct"] = _to_float(r.get("pass_poor_throw_pct"))
            adv_pass_by_team[tm]["drop_pct"] = _to_float(r.get("pass_drop_pct"))
            adv_pass_by_team[tm]["batted_rate"] = _to_float(r.get("pass_batted_passes")) / att
    for r in team_tables.get("team_adv_pass_pressure", []):
        tm = normalize_team(r.get("team"))
        if tm:
            att = max(1.0, _to_float(r.get("pass_att"), 1.0))
            adv_pass_by_team[tm]["pressured_pct"] = _to_float(r.get("pass_pressured_pct"))
            adv_pass_by_team[tm]["pocket_time"] = _to_float(r.get("pocket_time"), 2.3)
            adv_pass_by_team[tm]["hits_rate"] = _to_float(r.get("pass_hits")) / att
            adv_pass_by_team[tm]["blitz_rate"] = _to_float(r.get("pass_blitzed")) / att
    for r in team_tables.get("team_adv_pass_playaction_rpo", []):
        tm = normalize_team(r.get("team"))
        if tm:
            att = max(1.0, _to_float(r.get("pass_att"), 1.0))
            yds = max(1.0, _to_float(r.get("pass_yds"), 1.0))
            pa_rpo_plays = _to_float(r.get("pass_play_action")) + _to_float(r.get("pass_rpo"))
            pa_rpo_yds = _to_float(r.get("pass_play_action_pass_yds")) + _to_float(r.get("pass_rpo_yds"))
            adv_pass_by_team[tm]["pa_rpo_rate"] = pa_rpo_plays / att
            adv_pass_by_team[tm]["pa_rpo_yds_share"] = pa_rpo_yds / yds
    assert len(adv_pass_by_team) == 32

    # 5. Player Advanced Rushing ((25) totals -> aggregate per team excluding 2TM/3TM)
    rush_agg: Dict[str, Dict[str, float]] = defaultdict(lambda: defaultdict(float))
    for r in player_tables.get("player_adv_rushing_totals", []):
        tm = normalize_team(r.get("team_name_abbr"))
        if not tm:
            continue
        rush_agg[tm]["att"] += _to_float(r.get("rush_att"))
        rush_agg[tm]["ybc"] += _to_float(r.get("rush_yds_before_contact"))
        rush_agg[tm]["yac"] += _to_float(r.get("rush_yac"))
        rush_agg[tm]["bt"] += _to_float(r.get("rush_broken_tackles"))

    # 6. Player Advanced Receiving ((27) totals -> aggregate per team excluding 2TM/3TM)
    rec_agg: Dict[str, Dict[str, float]] = defaultdict(lambda: defaultdict(float))
    for r in player_tables.get("player_adv_receiving_totals", []):
        tm = normalize_team(r.get("team_name_abbr"))
        if not tm:
            continue
        rec_agg[tm]["targets"] += _to_float(r.get("targets"))
        rec_agg[tm]["rec"] += _to_float(r.get("rec"))
        rec_agg[tm]["yac"] += _to_float(r.get("rec_yac"))
        rec_agg[tm]["bt"] += _to_float(r.get("rec_broken_tackles"))

    # 7. Player Advanced Defense ((29) totals -> aggregate per team excluding 2TM/3TM)
    def_agg: Dict[str, Dict[str, float]] = defaultdict(lambda: defaultdict(float))
    for r in player_tables.get("player_adv_defense_totals", []):
        tm = normalize_team(r.get("team_name_abbr"))
        if not tm:
            continue
        def_agg[tm]["pressures"] += _to_float(r.get("pressures"))
        def_agg[tm]["sacks"] += _to_float(r.get("sacks"))
        def_agg[tm]["hurry"] += _to_float(r.get("qb_hurry"))
        def_agg[tm]["knockdown"] += _to_float(r.get("qb_knockdown"))
        def_agg[tm]["batted"] += _to_float(r.get("def_batted_passes"))
        def_agg[tm]["targets"] += _to_float(r.get("def_targets"))
        def_agg[tm]["cmp"] += _to_float(r.get("def_cmp"))
        def_agg[tm]["cmp_yds"] += _to_float(r.get("def_cmp_yds"))
        def_agg[tm]["yac"] += _to_float(r.get("def_yac"))
        def_agg[tm]["tackles_combined"] += _to_float(r.get("tackles_combined"))
        def_agg[tm]["tackles_missed"] += _to_float(r.get("tackles_missed"))

    # 8. Player Penalties ((35) -> holding + false_start per team)
    pen_agg: Dict[str, Dict[str, float]] = defaultdict(lambda: defaultdict(float))
    for r in player_tables.get("player_penalties_totals", []):
        tm = normalize_team(r.get("team"))
        if not tm:
            continue
        pen_agg[tm]["holding"] += _to_float(r.get("holding"))
        pen_agg[tm]["false_start"] += _to_float(r.get("false_start"))
        pen_agg[tm]["penalties"] += _to_float(r.get("penalties"))

    # 9. Defense vs Position (CSV 27 vs QB, CSV 24 vs RB, CSV 28 vs WR, CSV 25 vs TE)
    dvp_raw: Dict[str, Dict[str, float]] = {t: {} for t in CANONICAL_32_TEAMS}
    for key, fname in (
        ("vs_qb", "27_defense_vs_qb.csv"),
        ("vs_rb", "24_defense_vs_rb.csv"),
        ("vs_wr", "28_defense_vs_wr.csv"),
        ("vs_te", "25_defense_vs_te.csv"),
    ):
        rows = csv_tables.get(fname, [])
        for r in rows:
            tm = normalize_team(r.get("team"))
            if tm:
                dvp_raw[tm][key] = _to_float(r.get("fant_pt_per_game"))

    # Build normalized per-team metric dictionaries across all 32 teams
    z_srs = _z_scores({t: standings_by_team[t]["srs"] for t in CANONICAL_32_TEAMS})
    z_osrs = _z_scores({t: standings_by_team[t]["osrs"] for t in CANONICAL_32_TEAMS})
    z_dsrs = _z_scores({t: standings_by_team[t]["dsrs"] for t in CANONICAL_32_TEAMS})
    z_sos = _z_scores({t: standings_by_team[t]["sos"] for t in CANONICAL_32_TEAMS})

    z_vs_qb = _z_scores({t: dvp_raw[t]["vs_qb"] for t in CANONICAL_32_TEAMS})
    z_vs_rb = _z_scores({t: dvp_raw[t]["vs_rb"] for t in CANONICAL_32_TEAMS})
    z_vs_wr = _z_scores({t: dvp_raw[t]["vs_wr"] for t in CANONICAL_32_TEAMS})
    z_vs_te = _z_scores({t: dvp_raw[t]["vs_te"] for t in CANONICAL_32_TEAMS})

    # Composite 1: off_pocket_protection_z (higher = better protection)
    off_pocket_protection_z = _restandardize_composite(
        [
            (_z_scores({t: adv_pass_by_team[t]["pressured_pct"] for t in CANONICAL_32_TEAMS}, invert=True), 0.40),
            (_z_scores({t: pass_off_by_team[t]["sack_pct"] for t in CANONICAL_32_TEAMS}, invert=True), 0.30),
            (_z_scores({t: adv_pass_by_team[t]["pocket_time"] for t in CANONICAL_32_TEAMS}), 0.15),
            (_z_scores({t: adv_pass_by_team[t]["hits_rate"] for t in CANONICAL_32_TEAMS}, invert=True), 0.15),
        ]
    )

    # Composite 2: off_qb_accuracy_discipline_z (higher = sharper passing accuracy & lower drops)
    off_qb_accuracy_discipline_z = _restandardize_composite(
        [
            (_z_scores({t: adv_pass_by_team[t]["on_target_pct"] for t in CANONICAL_32_TEAMS}), 0.40),
            (_z_scores({t: adv_pass_by_team[t]["poor_throw_pct"] for t in CANONICAL_32_TEAMS}, invert=True), 0.30),
            (_z_scores({t: adv_pass_by_team[t]["drop_pct"] for t in CANONICAL_32_TEAMS}, invert=True), 0.15),
            (_z_scores({t: adv_pass_by_team[t]["batted_rate"] for t in CANONICAL_32_TEAMS}, invert=True), 0.15),
        ]
    )

    # Composite 3: off_scheme_pa_rpo_rate_z (higher = stronger PA + RPO usage and yield)
    off_scheme_pa_rpo_rate_z = _restandardize_composite(
        [
            (_z_scores({t: adv_pass_by_team[t]["pa_rpo_rate"] for t in CANONICAL_32_TEAMS}), 0.60),
            (_z_scores({t: adv_pass_by_team[t]["pa_rpo_yds_share"] for t in CANONICAL_32_TEAMS}), 0.40),
        ]
    )

    # Composite 4: off_run_trench_contact_z (higher = better OL push YBC + RB/WR contact balance & broken tackles)
    off_run_trench_contact_z = _restandardize_composite(
        [
            (_z_scores({t: rush_agg[t]["ybc"] / max(1.0, rush_agg[t]["att"]) for t in CANONICAL_32_TEAMS}), 0.40),
            (_z_scores({t: rush_agg[t]["yac"] / max(1.0, rush_agg[t]["att"]) for t in CANONICAL_32_TEAMS}), 0.30),
            (_z_scores({t: rush_agg[t]["bt"] / max(1.0, rush_agg[t]["att"]) for t in CANONICAL_32_TEAMS}), 0.20),
            (_z_scores({t: rec_agg[t]["bt"] / max(1.0, rec_agg[t]["rec"]) for t in CANONICAL_32_TEAMS}), 0.10),
        ]
    )

    # Composite 5: def_pressure_havoc_z (higher = more disruptive pass rush per opp pass att)
    def_pressure_havoc_z = _restandardize_composite(
        [
            (_z_scores({t: def_agg[t]["pressures"] / def_tot_by_team[t]["opp_pass_att"] for t in CANONICAL_32_TEAMS}), 0.45),
            (_z_scores({t: def_agg[t]["sacks"] / def_tot_by_team[t]["opp_pass_att"] for t in CANONICAL_32_TEAMS}), 0.30),
            (_z_scores({t: (def_agg[t]["hurry"] + def_agg[t]["knockdown"] + def_agg[t]["batted"]) / def_tot_by_team[t]["opp_pass_att"] for t in CANONICAL_32_TEAMS}), 0.25),
        ]
    )

    # Composite 6: def_coverage_tackling_z (higher = tighter coverage & lower missed-tackle rate)
    def_coverage_tackling_z = _restandardize_composite(
        [
            (_z_scores({t: def_agg[t]["tackles_missed"] / max(1.0, def_agg[t]["tackles_combined"] + def_agg[t]["tackles_missed"]) for t in CANONICAL_32_TEAMS}, invert=True), 0.35),
            (_z_scores({t: def_agg[t]["cmp_yds"] / max(1.0, def_agg[t]["targets"]) for t in CANONICAL_32_TEAMS}, invert=True), 0.30),
            (_z_scores({t: def_agg[t]["cmp"] / max(1.0, def_agg[t]["targets"]) for t in CANONICAL_32_TEAMS}, invert=True), 0.20),
            (_z_scores({t: def_agg[t]["yac"] / max(1.0, def_agg[t]["cmp"]) for t in CANONICAL_32_TEAMS}, invert=True), 0.15),
        ]
    )

    # Composite 7: penalty_discipline_z (higher = cleaner, fewer holding / false start / penalty yds)
    penalty_discipline_z = _restandardize_composite(
        [
            (_z_scores({t: off_tot_by_team[t]["penalties_pg"] for t in CANONICAL_32_TEAMS}, invert=True), 0.35),
            (_z_scores({t: off_tot_by_team[t]["penalties_yds_pg"] for t in CANONICAL_32_TEAMS}, invert=True), 0.30),
            (_z_scores({t: (pen_agg[t]["holding"] + pen_agg[t]["false_start"]) / off_tot_by_team[t]["g"] for t in CANONICAL_32_TEAMS}, invert=True), 0.35),
        ]
    )

    teams_out: Dict[str, Any] = {}
    for t in CANONICAL_32_TEAMS:
        teams_out[t] = {
            "off_pocket_protection_z": off_pocket_protection_z[t],
            "off_qb_accuracy_discipline_z": off_qb_accuracy_discipline_z[t],
            "off_scheme_pa_rpo_rate_z": off_scheme_pa_rpo_rate_z[t],
            "off_run_trench_contact_z": off_run_trench_contact_z[t],
            "def_pressure_havoc_z": def_pressure_havoc_z[t],
            "def_coverage_tackling_z": def_coverage_tackling_z[t],
            "penalty_discipline_z": penalty_discipline_z[t],
            "def_pos_vulnerability_z": {
                "vs_qb_z": z_vs_qb[t],
                "vs_rb_z": z_vs_rb[t],
                "vs_wr_z": z_vs_wr[t],
                "vs_te_z": z_vs_te[t],
            },
            "standings_strength_z": {
                "srs_z": z_srs[t],
                "osrs_z": z_osrs[t],
                "dsrs_z": z_dsrs[t],
                "sos_z": z_sos[t],
            },
        }

    return {
        "schema": "gse_derived_trench_scheme_contact_priors_2026_v1",
        "generated_at_utc": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "license_and_provenance": {
            "data_license": "GSE_DERIVED_COMPOSITE_ZSCORES_FROM_PFR_SNAPSHOT_2026_W10",
            "rights_policy": "INGEST-AND-LEARN; zero raw PFR dumps and zero player identities stored",
            "xls_files_scanned": len(xls_paths),
            "xls_unique_hashes": len(seen_hashes),
            "bundle_csvs_scanned": bundle_csv_count,
            "gapfill_csvs_scanned": gapfill_csv_count,
            "xls_roles": sorted({item["role"] for item in parsed_xls_manifest}),
        },
        "team_count": len(teams_out),
        "bounds": {"min_z": -3.0, "max_z": 3.0},
        "teams": teams_out,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Extract GSE-derived 32-team trench/scheme/contact priors.")
    parser.add_argument("--downloads-dir", type=Path, default=DEFAULT_DOWNLOADS_DIR)
    parser.add_argument("--bundle-zip", type=Path, default=DEFAULT_BUNDLE_ZIP)
    parser.add_argument("--gapfill-zip", type=Path, default=DEFAULT_GAPFILL_ZIP)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT_PATH)
    args = parser.parse_args()

    payload = build_priors(args.downloads_dir, args.bundle_zip, args.gapfill_zip)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(payload, indent=2, ensure_ascii=True, sort_keys=False) + "\n", encoding="utf-8")
    print(
        f"[LEARN_PFR_39TABLES_OK] teams={payload['team_count']} "
        f"xls={payload['license_and_provenance']['xls_files_scanned']} "
        f"bundle_csvs={payload['license_and_provenance']['bundle_csvs_scanned']} "
        f"gapfill_csvs={payload['license_and_provenance']['gapfill_csvs_scanned']} "
        f"out={args.out}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
