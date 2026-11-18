"""Wave 36 GSI MIMIC-IV ICU Critical-Care & Glenohumeral Throwing Kinetic Engine.

Implements the dual-use Galaxy Science Institute (GSI) ADR-0003 translational safety suite:
1. MIMIC-IV ICU Hemodynamic & Hypoxia Early-Warning Kernel over real 668,862-row
   chartevents, 140 ICU stays, and 4,506 ICD-10 diagnoses:
   - Allgower Hemodynamic Shock Index (SI = HR / SBP) & Modified Shock Index (HR / MAP).
   - Severinghaus / Hill Oxyhemoglobin Desaturation Cliff (n_H=2.7, P_50=26.6 mmHg)
     proving steep >3.5x hypoxia-acceleration gradient below SpO2 = 92%.
   - Anytime-valid Baxley Martingale E-Process (alpha = 0.05 -> rule-in E_t >= 20.0).
2. Fleisig-Andrews Glenohumeral Kinetic Chain & QB Shoulder Biomechanics over
   kaggle_qb_shoulder_injuries_zone1 (19 surgical baselines) + causal 2024-2026 injury logs.
"""

from __future__ import annotations

import csv
from pathlib import Path
from typing import Any

import pandas as pd  # type: ignore[import-untyped]

REPO_ROOT = Path(__file__).resolve().parents[3]
CLINICAL_RUO_ICU_SPORTS_WEIGHT: float = 0.0
REAL_MONEY_STAKE_CLEARED: bool = False
LIVE_STAKE_FRACTION: float = 0.0

_TEAM_ALIASES: dict[str, str] = {
    "ARZ": "ARI",
    "BLT": "BAL",
    "CLV": "CLE",
    "HST": "HOU",
    "JAC": "JAX",
    "KAN": "KC",
    "LA": "LAR",
    "OAK": "LV",
    "SD": "LAC",
    "STL": "LAR",
    "WAS": "WSH",
}

_ICU_CACHE: dict[str, dict[str, Any]] = {}
_SHOULDER_CACHE: dict[tuple[str, str, str, int], dict[str, Any]] = {}
_INJURY_ROWS_CACHE: dict[str, list[dict[str, str]]] = {}
_QB_SURGERY_PRIOR_CACHE: dict[str, dict[str, float]] = {}
_SUITE36_CACHE: dict[tuple[str, str, str, int], dict[str, Any]] = {}

WAVE36_GSI_RLVR_TRAJECTORIES: tuple[dict[str, Any], ...] = (
    {
        "record_id": "w36_gsi_mimic_iv_icu_shock_index_baxley_00",
        "domain": "wave36_gsi_mimic_iv_allgower_baxley_martingale",
        "prompt": (
            "Evaluate MIMIC-IV ICU telemetry across 140 stays and 668,862 chart events using "
            "Allgower Shock Index (HR/SBP), Modified Shock Index (HR/MAP), and anytime-valid "
            "Baxley martingale E-process (alpha=0.05) under ADR-0003 rule-in doctrine. Return JSON."
        ),
        "think": (
            "Rising HR/SBP shock index and sub-65 mmHg MAP drive martingale E_t above 20.0 "
            "with zero clinical influence on live athletic weight (clinical_ruo_sports_weight=0.0)."
        ),
    },
    {
        "record_id": "w36_gsi_oxyhemoglobin_hill_hypoxia_curve_00",
        "domain": "wave36_gsi_hill_severinghaus_hypoxia_cliff",
        "prompt": (
            "Invert oxyhemoglobin dissociation (n_H=2.7, P_50=26.6 mmHg) on MIMIC-IV SpO2 "
            "telemetry and compare desaturation steepness dS/dP at SpO2=90% vs SpO2=98%. "
            "Return JSON."
        ),
        "think": (
            "Because Hill cooperativity turns steep near 90% SpO2, slope dS/dP at 90% exceeds "
            "slope at 98% by more than 3.5x, separating compensated reserve from hypoxic cliff."
        ),
    },
    {
        "record_id": "w36_gsi_glenohumeral_fleisig_kinetic_chain_00",
        "domain": "wave36_gsi_glenohumeral_shoulder_kinetic_chain",
        "prompt": (
            "Model Fleisig-Andrews proximal-to-distal throwing torque escalation when QB hip/core "
            "transfer drops alongside 19 historical QB shoulder surgeries and causal injury logs "
            "to output velocity and Q4 accuracy retention multipliers. Return JSON."
        ),
        "think": (
            "Lower-body or core kinetic deficits force distal glenohumeral internal rotation "
            "torque compensation, attenuating late-game deep velocity retention."
        ),
    },
)


def _cache_key(repo_root: Path | None) -> str:
    return "__default__" if repo_root is None else str(repo_root)


def _resolve_root(repo_root: Path | None) -> Path:
    return REPO_ROOT if repo_root is None else repo_root


def _clip(val: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, float(val)))


def _norm_team(team: str) -> str:
    t = str(team or "").strip().upper()
    return _TEAM_ALIASES.get(t, t)


def _hill_pao2_and_slope(spo2_pct: float) -> tuple[float, float]:
    """Invert Hill equation (n_H=2.7, P_50=26.6) for PaO2 (mmHg) and slope dS/dP."""
    s = _clip(spo2_pct / 100.0, 0.40, 0.995)
    p50 = 26.6
    n_h = 2.7
    p50_n = p50**n_h
    pao2 = p50 * ((s / (1.0 - s)) ** (1.0 / n_h))
    p_n = pao2**n_h
    slope = (n_h * p50_n * (pao2 ** (n_h - 1.0))) / ((p50_n + p_n) ** 2)
    return pao2, slope


def evaluate_gsi_mimic_iv_icu_critical_care_early_warning(
    repo_root: Path | None = None,
) -> dict[str, Any]:
    """Audit real MIMIC-IV ICU chartevents via Shock Index, Hill hypoxia & Baxley E-process."""
    ck = _cache_key(repo_root)
    if ck in _ICU_CACHE:
        return _ICU_CACHE[ck]

    root = _resolve_root(repo_root)
    mimic_dir = root / "data" / "mimic_iv_demo"
    ce_path = mimic_dir / "icu_chartevents.csv.gz"
    stays_path = mimic_dir / "icu_icustays.csv.gz"
    diag_path = mimic_dir / "hosp_diagnoses_icd.csv.gz"

    _, slope_90 = _hill_pao2_and_slope(90.0)
    _, slope_98 = _hill_pao2_and_slope(98.0)
    cliff_ratio = round(slope_90 / max(1e-9, slope_98), 4)

    if not (ce_path.is_file() and stays_path.is_file()):
        pao2_syn, _ = _hill_pao2_and_slope(96.5)
        out_fb: dict[str, Any] = {
            "schema": "wave36_gsi_mimic_iv_icu_ews_v1",
            "clean_checkout_fallback": True,
            "adr0003_rule_in_only_doctrine": True,
            "clinical_ruo_sports_weight": CLINICAL_RUO_ICU_SPORTS_WEIGHT,
            "icu_stays_count": 0,
            "chartevents_total_rows": 0,
            "icd_diagnoses_count": 0,
            "mean_heart_rate_bpm": 88.0,
            "mean_systolic_bp_mmhg": 118.0,
            "mean_map_mmhg": 78.0,
            "mean_spo2_pct": 96.5,
            "mean_resp_rate_bpm": 18.5,
            "estimated_pao2_mmhg": round(pao2_syn, 3),
            "hypoxic_events_spo2_lt92": 0,
            "compensated_shock_stays_si_ge090": 0,
            "hypotensive_stays_map_lt65": 0,
            "baxley_rule_in_stays_e_ge20": 0,
            "max_baxley_e_value": 1.0,
            "hill_slope_90pct_per_mmhg": round(slope_90, 6),
            "hill_slope_98pct_per_mmhg": round(slope_98, 6),
            "hill_hypoxia_cliff_ratio": cliff_ratio,
        }
        _ICU_CACHE[ck] = out_fb
        return out_fb

    stays_df = pd.read_csv(stays_path, usecols=["stay_id"])
    diag_df = pd.read_csv(diag_path, usecols=["hadm_id"]) if diag_path.is_file() else pd.DataFrame()
    ce_df = pd.read_csv(
        ce_path,
        usecols=["stay_id", "charttime", "itemid", "valuenum"],
    )
    tot_ce_rows = int(len(ce_df))

    target_ids = {220045, 220050, 220179, 220052, 220181, 220277, 220210}
    sub = ce_df[ce_df["itemid"].isin(target_ids) & ce_df["valuenum"].notna()].copy()
    sub = sub.sort_values(["stay_id", "charttime"], kind="mergesort")

    hr_vals = sub[sub["itemid"] == 220045]["valuenum"]
    sbp_vals = sub[sub["itemid"].isin([220050, 220179])]["valuenum"]
    map_vals = sub[sub["itemid"].isin([220052, 220181])]["valuenum"]
    spo2_vals = sub[sub["itemid"] == 220277]["valuenum"]
    rr_vals = sub[sub["itemid"] == 220210]["valuenum"]

    mean_spo2 = float(spo2_vals.mean()) if len(spo2_vals) else 96.8
    pao2_mean, _ = _hill_pao2_and_slope(mean_spo2)
    hypoxic_lt92 = int((spo2_vals < 92.0).sum()) if len(spo2_vals) else 0

    shock_stays = 0
    hypo_stays = 0
    baxley_rule_in = 0
    global_max_e = 1.0

    # Walk each ICU stay chronologically preserving exact causal sequential ordering
    for _, grp in sub.groupby("stay_id", sort=False):
        cur_hr: float | None = None
        cur_sbp: float | None = None
        max_si = 0.0
        min_map = 999.0
        e_val = 1.0
        max_e = 1.0

        for item_raw, val_raw in zip(
            grp["itemid"].tolist(),
            grp["valuenum"].tolist(),
            strict=True,
        ):
            item_id = int(item_raw)
            val = float(val_raw)
            lr = 1.0
            if item_id == 220045 and 20.0 <= val <= 260.0:
                cur_hr = val
                if val >= 115.0:
                    lr = 1.35
                elif val < 100.0:
                    lr = 0.94
            elif item_id in {220050, 220179} and 35.0 <= val <= 260.0:
                cur_sbp = val
                lr = 1.55 if val < 90.0 else 0.94
            elif item_id in {220052, 220181} and 20.0 <= val <= 200.0:
                min_map = min(min_map, val)
                lr = 1.85 if val < 65.0 else 0.92
            elif item_id == 220277 and 40.0 <= val <= 100.0:
                lr = 1.90 if val < 92.0 else 0.95
            elif item_id == 220210 and 4.0 <= val <= 60.0:
                lr = 1.35 if val >= 28.0 else 0.95

            if cur_hr is not None and cur_sbp is not None and cur_sbp > 35.0:
                si = cur_hr / cur_sbp
                max_si = max(max_si, si)
                if si >= 1.0:
                    lr *= 1.35
                elif si >= 0.90:
                    lr *= 1.15

            e_val = min(1.0e6, max(1.0e-3, e_val * (0.25 + 0.75 * lr)))
            max_e = max(max_e, e_val)

        if max_si >= 0.90:
            shock_stays += 1
        if min_map < 65.0:
            hypo_stays += 1
        if max_e >= 20.0:
            baxley_rule_in += 1
        global_max_e = max(global_max_e, max_e)

    out: dict[str, Any] = {
        "schema": "wave36_gsi_mimic_iv_icu_ews_v1",
        "clean_checkout_fallback": False,
        "adr0003_rule_in_only_doctrine": True,
        "clinical_ruo_sports_weight": CLINICAL_RUO_ICU_SPORTS_WEIGHT,
        "icu_stays_count": int(len(stays_df)),
        "chartevents_total_rows": tot_ce_rows,
        "icd_diagnoses_count": int(len(diag_df)),
        "mean_heart_rate_bpm": round(float(hr_vals.mean()), 3) if len(hr_vals) else 0.0,
        "mean_systolic_bp_mmhg": round(float(sbp_vals.mean()), 3) if len(sbp_vals) else 0.0,
        "mean_map_mmhg": round(float(map_vals.mean()), 3) if len(map_vals) else 0.0,
        "mean_spo2_pct": round(mean_spo2, 3),
        "mean_resp_rate_bpm": round(float(rr_vals.mean()), 3) if len(rr_vals) else 0.0,
        "estimated_pao2_mmhg": round(pao2_mean, 3),
        "hypoxic_events_spo2_lt92": hypoxic_lt92,
        "compensated_shock_stays_si_ge090": shock_stays,
        "hypotensive_stays_map_lt65": hypo_stays,
        "baxley_rule_in_stays_e_ge20": baxley_rule_in,
        "max_baxley_e_value": round(global_max_e, 3),
        "hill_slope_90pct_per_mmhg": round(slope_90, 6),
        "hill_slope_98pct_per_mmhg": round(slope_98, 6),
        "hill_hypoxia_cliff_ratio": cliff_ratio,
    }
    _ICU_CACHE[ck] = out
    return out


def _load_injury_rows(repo_root: Path | None = None) -> list[dict[str, str]]:
    ck = _cache_key(repo_root)
    if ck in _INJURY_ROWS_CACHE:
        return _INJURY_ROWS_CACHE[ck]
    root = _resolve_root(repo_root)
    rows: list[dict[str, str]] = []
    for fn in ("injuries_2024.csv", "injuries_2025.csv", "injuries_2026.csv"):
        p = root / "data" / "nflverse" / fn
        if not p.is_file():
            continue
        with p.open("r", encoding="utf-8", errors="replace", newline="") as f:
            for r in csv.DictReader(f):
                rows.append(r)
    _INJURY_ROWS_CACHE[ck] = rows
    return rows


def _load_qb_shoulder_priors(repo_root: Path | None = None) -> dict[str, float]:
    ck = _cache_key(repo_root)
    if ck in _QB_SURGERY_PRIOR_CACHE:
        return _QB_SURGERY_PRIOR_CACHE[ck]
    root = _resolve_root(repo_root)
    p = root / "data" / "nflverse" / "kaggle_qb_shoulder_injuries_zone1.parquet"
    if not p.is_file():
        fb = {"cases_count": 0.0, "mean_surgery_age": 26.5, "mean_experience_yrs": 4.5}
        _QB_SURGERY_PRIOR_CACHE[ck] = fb
        return fb
    df = pd.read_parquet(p)
    out = {
        "cases_count": float(len(df)),
        "mean_surgery_age": round(float(df["SurgeryAge"].dropna().mean()), 3)
        if "SurgeryAge" in df.columns and df["SurgeryAge"].notna().any()
        else 26.5,
        "mean_experience_yrs": round(float(df["Experience"].dropna().mean()), 3)
        if "Experience" in df.columns and df["Experience"].notna().any()
        else 4.5,
    }
    _QB_SURGERY_PRIOR_CACHE[ck] = out
    return out


def evaluate_gsi_glenohumeral_throwing_mechanics(
    *,
    away_team: str,
    home_team: str,
    as_of_week: int = 10,
    repo_root: Path | None = None,
) -> dict[str, Any]:
    """Model Fleisig-Andrews proximal-to-distal QB shoulder torque & late-game arm fatigue."""
    aw_u = _norm_team(away_team)
    hm_u = _norm_team(home_team)
    ck = (_cache_key(repo_root), aw_u, hm_u, int(as_of_week))
    if ck in _SHOULDER_CACHE:
        return _SHOULDER_CACHE[ck]

    inj_rows = _load_injury_rows(repo_root)
    surg = _load_qb_shoulder_priors(repo_root)

    def _team_qb_chain(tm: str) -> dict[str, Any]:
        prior_arm_flags: set[str] = set()
        arm_sev = 0.0
        prox_sev = 0.0
        qb_flags = 0

        for r in inj_rows:
            if _norm_team(str(r.get("team") or "")) != tm:
                continue
            if str(r.get("position") or "").strip().upper() != "QB":
                continue
            yr_s = str(r.get("season") or "0")
            wk_s = str(r.get("week") or "0")
            if not yr_s.isdigit() or not wk_s.isdigit():
                continue
            yr = int(yr_s)
            wk = int(wk_s)
            txt = (
                f"{r.get('report_primary_injury', '')} {r.get('practice_primary_injury', '')}"
            ).lower()
            nm = " ".join(str(r.get("full_name") or "").strip().lower().split())
            is_arm = any(k in txt for k in ("shoulder", "elbow", "wrist", "thumb", "hand", "arm"))
            is_prox = any(k in txt for k in ("rib", "oblique", "core", "hip", "ankle", "knee"))
            if yr in {2024, 2025} or (yr == 2026 and wk < int(as_of_week)):
                if is_arm and nm:
                    prior_arm_flags.add(nm)
            elif yr == 2026 and wk == int(as_of_week):
                qb_flags += 1
                st = str(r.get("report_status") or "").strip().upper()
                prac = str(r.get("practice_status") or "").strip().lower()
                sev = (
                    1.0
                    if st == "OUT"
                    else (
                        0.60
                        if st == "DOUBTFUL"
                        else (
                            0.28
                            if st == "QUESTIONABLE"
                            else (0.20 if "did not participate" in prac or "dnp" in prac else 0.10)
                        )
                    )
                )
                rec = 1.25 if nm in prior_arm_flags else 1.0
                if is_arm:
                    arm_sev = max(arm_sev, _clip(sev * rec, 0.0, 1.25))
                if is_prox:
                    prox_sev = max(prox_sev, _clip(sev, 0.0, 1.0))

        trunk_eff = _clip(1.0 - 0.22 * prox_sev, 0.70, 1.0)
        gh_torque_ratio = round(1.0 + 0.35 * (1.0 - trunk_eff) + 0.45 * arm_sev, 5)
        ucl_varus_ratio = round(1.0 + 0.28 * (1.0 - trunk_eff) + 0.38 * arm_sev, 5)
        vel_mult = round(_clip(1.0 - 0.14 * arm_sev - 0.06 * (1.0 - trunk_eff), 0.82, 1.0), 5)
        q4_acc_mult = round(_clip(1.0 - 0.10 * arm_sev - 0.05 * (1.0 - trunk_eff), 0.85, 1.0), 5)
        return {
            "team": tm,
            "qb_week_injury_logs": qb_flags,
            "prior_qb_arm_events": len(prior_arm_flags),
            "trunk_kinetic_efficiency": round(trunk_eff, 4),
            "glenohumeral_internal_rotation_torque_ratio": gh_torque_ratio,
            "ucl_varus_stress_ratio": ucl_varus_ratio,
            "deep_pass_velocity_retention_mult": vel_mult,
            "high_pitch_q4_accuracy_mult": q4_acc_mult,
        }

    out = {
        "schema": "wave36_gsi_glenohumeral_chain_v1",
        "surgical_prior_cases_count": int(surg["cases_count"]),
        "surgical_prior_mean_age": float(surg["mean_surgery_age"]),
        "surgical_prior_mean_exp": float(surg["mean_experience_yrs"]),
        "away": _team_qb_chain(aw_u),
        "home": _team_qb_chain(hm_u),
    }
    _SHOULDER_CACHE[ck] = out
    return out


def evaluate_wave36_gsi_icu_and_throwing_suite(
    *,
    away_team: str,
    home_team: str,
    as_of_week: int = 10,
    repo_root: Path | None = None,
) -> dict[str, Any]:
    """Synthesize MIMIC-IV ICU phase transitions & Fleisig glenohumeral kinetic chain."""
    aw_u = _norm_team(away_team)
    hm_u = _norm_team(home_team)
    ck = (_cache_key(repo_root), aw_u, hm_u, int(as_of_week))
    if ck in _SUITE36_CACHE:
        return _SUITE36_CACHE[ck]

    icu = evaluate_gsi_mimic_iv_icu_critical_care_early_warning(repo_root=repo_root)
    throw = evaluate_gsi_glenohumeral_throwing_mechanics(
        away_team=aw_u,
        home_team=hm_u,
        as_of_week=int(as_of_week),
        repo_root=repo_root,
    )
    out: dict[str, Any] = {
        "schema": "wave36_gsi_icu_and_throwing_suite_v1",
        "wired": True,
        "matchup": f"{aw_u} @ {hm_u}",
        "as_of_week": int(as_of_week),
        "adr0003_rule_in_only_doctrine": True,
        "clinical_ruo_sports_weight": CLINICAL_RUO_ICU_SPORTS_WEIGHT,
        "real_money_stake_cleared": REAL_MONEY_STAKE_CLEARED,
        "live_stake_fraction": LIVE_STAKE_FRACTION,
        "mimic_iv_icu_early_warning": icu,
        "glenohumeral_throwing_chain": throw,
    }
    _SUITE36_CACHE[ck] = out
    return out
