"""Wave 38 GSI GTEx v10 Transcriptomic Partitioning & Schrodinger Bridge Cellular Recovery Engine.

Implements the dual-use Galaxy Science Institute (GSI) ADR-0003 translational safety suite:
1. GTEx v10 (GENCODE v39) 54-tissue human transcriptomic selectivity across 7 canonical
   mechanogenetic & neuro-cardiac markers (ACTN3, TNNI3, MAPT, COL1A1, COL5A1, PPARGC1A, TPM1):
   - Fast-twitch sarcomeric selectivity (ACTN3 Skeletal Muscle vs Heart Left Ventricle)
   - Cardiac troponin specificity (TNNI3 Heart Left Ventricle vs Skeletal Muscle)
   - Central nervous microtubule tau expression (MAPT Brain Cortex/Cerebellum vs Fibroblasts)
   - Extracellular matrix remodeling transcripts (COL1A1 + COL5A1 Fibroblasts/Aorta)
   - Mitochondrial oxidative biogenesis regulator (PPARGC1A Muscle/Cardiac balance)
   - Strict ADR-0003 RUO isolation: CLINICAL_RUO_GTEX_SPORTS_WEIGHT = 0.0.
2. Schrodinger Bridge Entropic Optimal Transport (Sinkhorn-Knopp P* = diag(u) K diag(v))
   modeling stochastic 5-state cellular recovery kinetics from acute snap stress toward homeostatic
   fast-twitch readiness under causal W1-10 workloads and pre-kickoff rest differentials.
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd  # type: ignore[import-untyped]

REPO_ROOT = Path(__file__).resolve().parents[3]
CLINICAL_RUO_GTEX_SPORTS_WEIGHT: float = 0.0
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

_STATES_5: tuple[str, ...] = (
    "acute_glycolytic_depletion",
    "micro_sarcomeric_strain",
    "ecm_fibroblast_remodeling",
    "pgc1a_mitochondrial_biogenesis",
    "homeostatic_fast_twitch_readiness",
)

_GTEX_CACHE: dict[str, dict[str, Any]] = {}
_SB_SNAP_CACHE: dict[str, dict[tuple[str, int], float]] = {}
_SB_SCHED_CACHE: dict[str, dict[tuple[int, str, str], tuple[float, float]]] = {}
_SB_PAIR_CACHE: dict[tuple[str, str, str, int], dict[str, Any]] = {}
_SUITE38_CACHE: dict[tuple[str, str, str, int], dict[str, Any]] = {}

WAVE38_GSI_RLVR_TRAJECTORIES: tuple[dict[str, Any], ...] = (
    {
        "record_id": "w38_gsi_gtex_v10_54tissue_selectivity_00",
        "domain": "wave38_gsi_gtex_v10_transcriptomics",
        "prompt": (
            "Quantify GTEx v10 (GENCODE v39) 54-tissue human RNA expression selectivity for "
            "ACTN3 (skeletal fast-twitch Z-disc vs left ventricle), COL1A1/COL5A1 fibroblast "
            "ECM repair, and PPARGC1A oxidative biogenesis under ADR-0003 doctrine. Return JSON."
        ),
        "think": (
            "ACTN3 expresses strongly in skeletal muscle (108.963 TPM) with near-zero cardiac "
            "expression (0.048 TPM, >2000x selectivity), while COL1A1/COL5A1 anchor tendon ECM "
            "repair at clinical_ruo_sports_weight fixed at 0.0."
        ),
    },
    {
        "record_id": "w38_gsi_tnni3_mapt_biomarker_isolation_00",
        "domain": "wave38_gsi_cardiac_neural_biomarkers",
        "prompt": (
            "Verify tissue selectivity ratios for TNNI3 (myocardial troponin I) and MAPT "
            "(cortical/cerebellar microtubule tau) across 54 GTEx v10 tissues to prevent cross-"
            "compartment biomarker false alarms under RUO rule-in-only isolation. Return JSON."
        ),
        "think": (
            "TNNI3 exhibits >900x heart-over-skeletal specificity and MAPT shows >350x brain-"
            "over-fibroblast enrichment, isolating true organ stress at 0.0 weight."
        ),
    },
    {
        "record_id": "w38_gsi_schrodinger_bridge_sinkhorn_recovery_00",
        "domain": "wave38_gsi_schrodinger_bridge_ot",
        "prompt": (
            "Solve a discrete 5-state Schrodinger Bridge Entropic Optimal Transport plan via "
            "Sinkhorn-Knopp scaling (l1 marginal error < 1e-6) linking causal W1-10 snap load "
            "and rest days to fast-twitch recovery readiness for KC @ DEN. Return JSON."
        ),
        "think": (
            "Sinkhorn-Knopp iterative scaling P* = diag(u) K diag(v) converges below 1e-9 l1 "
            "marginal divergence, quantifying entropic transport cost across rest-day gaps."
        ),
    },
)


def _norm_team(team: str) -> str:
    t = str(team or "").strip().upper()
    return _TEAM_ALIASES.get(t, t)


def _clip(val: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, val))


def _resolve_root(repo_root: Path | None) -> Path:
    return Path(repo_root).resolve() if repo_root is not None else REPO_ROOT


def _shannon_tissue_specificity(tpm_map: dict[str, float]) -> float:
    vals = np.array([max(0.0, float(v)) for v in tpm_map.values()], dtype=float)
    tot = float(np.sum(vals))
    n = len(vals)
    if tot <= 1e-12 or n <= 1:
        return 0.0
    probs = vals / tot
    nz = probs[probs > 1e-12]
    entropy = -float(np.sum(nz * np.log2(nz)))
    return float(_clip(1.0 - (entropy / math.log2(float(n))), 0.0, 1.0))


def evaluate_gsi_gtex_v10_tissue_transcriptomic_partition(
    repo_root: Path | None = None,
) -> dict[str, Any]:
    """Compute real GTEx v10 (GENCODE v39) 54-tissue selectivity & Shannon specificity indices."""
    root = _resolve_root(repo_root)
    ck = str(root)
    if ck in _GTEX_CACHE:
        return _GTEX_CACHE[ck]

    gtex_p = root / "data" / "science" / "gtex_v10_human_tissue_transcriptomics_2026.json"
    if not gtex_p.is_file():
        fb: dict[str, Any] = {
            "schema": "wave38_gsi_gtex_v10_partition_v1",
            "clean_checkout_fallback": True,
            "adr0003_rule_in_only_doctrine": True,
            "clinical_ruo_sports_weight": CLINICAL_RUO_GTEX_SPORTS_WEIGHT,
            "real_money_stake_cleared": REAL_MONEY_STAKE_CLEARED,
            "live_stake_fraction": LIVE_STAKE_FRACTION,
            "tissues_count": 0,
            "genes_count": 0,
            "records_count": 0,
            "actn3_skeletal_tpm": 108.963,
            "actn3_cardiac_lv_tpm": 0.048,
            "actn3_skeletal_to_cardiac_ratio": 2270.0625,
            "tnni3_cardiac_to_skeletal_ratio": 979.3097,
            "mapt_brain_to_fibroblast_ratio": 380.3258,
            "col1a1_col5a1_fibroblast_ecm_tpm": 4197.37,
            "ppargc1a_oxidative_muscle_cardiac_mean_tpm": 11.444,
            "tpm1_cardiac_to_skeletal_ratio": 3.0731,
            "specificity_by_gene": {},
        }
        _GTEX_CACHE[ck] = fb
        return fb

    raw = json.loads(gtex_p.read_text(encoding="ascii"))
    genes = dict(raw.get("genes", {}))

    def _tpm(sym: str, tissue: str, default: float = 0.0) -> float:
        gmap = dict(genes.get(sym, {}).get("median_tpm_by_tissue", {}))
        return float(gmap.get(tissue, default))

    actn3_sk = _tpm("ACTN3", "Muscle_Skeletal", 0.0)
    actn3_lv = _tpm("ACTN3", "Heart_Left_Ventricle", 0.0)
    tnni3_lv = _tpm("TNNI3", "Heart_Left_Ventricle", 0.0)
    tnni3_sk = _tpm("TNNI3", "Muscle_Skeletal", 0.0)
    mapt_cx = _tpm("MAPT", "Brain_Cortex", 0.0)
    mapt_fb = _tpm("MAPT", "Cells_Cultured_fibroblasts", 0.0)
    col1_fb = _tpm("COL1A1", "Cells_Cultured_fibroblasts", 0.0)
    col5_fb = _tpm("COL5A1", "Cells_Cultured_fibroblasts", 0.0)
    pgc_sk = _tpm("PPARGC1A", "Muscle_Skeletal", 0.0)
    pgc_lv = _tpm("PPARGC1A", "Heart_Left_Ventricle", 0.0)
    pgc_aa = _tpm("PPARGC1A", "Heart_Atrial_Appendage", 0.0)
    tpm1_lv = _tpm("TPM1", "Heart_Left_Ventricle", 0.0)
    tpm1_sk = _tpm("TPM1", "Muscle_Skeletal", 0.0)

    spec_by_gene: dict[str, float] = {}
    for sym, ginfo in genes.items():
        tmap = {str(k): float(v) for k, v in dict(ginfo.get("median_tpm_by_tissue", {})).items()}
        spec_by_gene[str(sym)] = round(_shannon_tissue_specificity(tmap), 5)

    out: dict[str, Any] = {
        "schema": "wave38_gsi_gtex_v10_partition_v1",
        "clean_checkout_fallback": False,
        "adr0003_rule_in_only_doctrine": True,
        "clinical_ruo_sports_weight": CLINICAL_RUO_GTEX_SPORTS_WEIGHT,
        "real_money_stake_cleared": REAL_MONEY_STAKE_CLEARED,
        "live_stake_fraction": LIVE_STAKE_FRACTION,
        "payload_sha256": str(raw.get("payload_sha256", "")),
        "tissues_count": int(raw.get("tissues_count", 0)),
        "genes_count": int(raw.get("genes_count", 0)),
        "records_count": int(raw.get("records_count", 0)),
        "actn3_skeletal_tpm": round(actn3_sk, 4),
        "actn3_cardiac_lv_tpm": round(actn3_lv, 4),
        "actn3_skeletal_to_cardiac_ratio": round(actn3_sk / max(1e-4, actn3_lv), 4),
        "tnni3_cardiac_to_skeletal_ratio": round(tnni3_lv / max(1e-4, tnni3_sk), 4),
        "mapt_brain_to_fibroblast_ratio": round(mapt_cx / max(1e-4, mapt_fb), 4),
        "col1a1_col5a1_fibroblast_ecm_tpm": round(col1_fb + col5_fb, 4),
        "ppargc1a_oxidative_muscle_cardiac_mean_tpm": round(
            (pgc_sk + pgc_lv + pgc_aa) / 3.0, 4
        ),
        "tpm1_cardiac_to_skeletal_ratio": round(tpm1_lv / max(1e-4, tpm1_sk), 4),
        "specificity_by_gene": spec_by_gene,
    }
    _GTEX_CACHE[ck] = out
    return out


def _load_sb_tables(
    root: Path,
) -> tuple[dict[tuple[str, int], float], dict[tuple[int, str, str], tuple[float, float]]]:
    key = str(root)
    if key in _SB_SNAP_CACHE and key in _SB_SCHED_CACHE:
        return _SB_SNAP_CACHE[key], _SB_SCHED_CACHE[key]

    snap_map: dict[tuple[str, int], float] = {}
    snap_p = root / "data" / "nflverse" / "snap_counts_2026_w1_w10.parquet"
    if snap_p.is_file():
        sn = pd.read_parquet(snap_p, columns=["team", "week", "offense_snaps", "defense_snaps"])
        sn["tm"] = sn["team"].fillna("").map(lambda x: _norm_team(str(x)))
        sn["tot_snaps"] = sn["offense_snaps"].fillna(0.0) + sn["defense_snaps"].fillna(0.0)
        for (tm, wk), grp in sn.groupby(["tm", "week"]):
            snap_map[(str(tm), int(wk))] = float(grp["tot_snaps"].sum())

    sched_map: dict[tuple[int, str, str], tuple[float, float]] = {}
    sched_p = root / "data" / "nflverse" / "schedules_games_through_2026_w10.parquet"
    if sched_p.is_file():
        sc = pd.read_parquet(
            sched_p,
            columns=["season", "week", "home_team", "away_team", "home_rest", "away_rest"],
        )
        sc26 = sc[(sc["season"] == 2026) & (sc["week"] <= 10)]
        for _, r in sc26.iterrows():
            wk_i = int(r["week"])
            hm = _norm_team(str(r["home_team"]))
            aw = _norm_team(str(r["away_team"]))
            hr = float(r["home_rest"]) if pd.notna(r["home_rest"]) else 7.0
            ar = float(r["away_rest"]) if pd.notna(r["away_rest"]) else 7.0
            sched_map[(wk_i, hm, aw)] = (hr, ar)

    _SB_SNAP_CACHE[key] = snap_map
    _SB_SCHED_CACHE[key] = sched_map
    return snap_map, sched_map


def _solve_sinkhorn_schrodinger_bridge(
    mu0: np.ndarray,
    mu1: np.ndarray,
    *,
    epsilon: float = 0.28,
    max_iter: int = 300,
) -> dict[str, Any]:
    """Solve discrete Schrodinger Bridge P* = diag(u) K diag(v) via Sinkhorn-Knopp scaling."""
    n = len(mu0)
    idx = np.arange(n, dtype=float)
    cost = ((idx[:, None] - idx[None, :]) / max(1.0, float(n - 1))) ** 2
    kernel = np.exp(-cost / max(0.05, float(epsilon)))
    u = np.ones(n, dtype=float)
    v = np.ones(n, dtype=float)
    for _ in range(max_iter):
        kv = kernel @ v
        u = mu0 / np.maximum(1e-15, kv)
        kt_u = kernel.T @ u
        v = mu1 / np.maximum(1e-15, kt_u)
    plan = (u[:, None] * kernel) * v[None, :]
    row_err = float(np.sum(np.abs(plan.sum(axis=1) - mu0)))
    col_err = float(np.sum(np.abs(plan.sum(axis=0) - mu1)))
    max_l1 = max(row_err, col_err)
    kl_cost = float(np.sum(plan * np.log(np.maximum(1e-15, plan / np.maximum(1e-15, kernel)))))
    w_cost = float(np.sum(plan * cost))
    return {
        "max_l1_marginal_err": max_l1,
        "entropic_kl_cost": kl_cost,
        "quadratic_wasserstein_cost": w_cost,
        "terminal_readiness_mass": float(mu1[-1]),
    }


def evaluate_gsi_schrodinger_bridge_cellular_recovery(
    *,
    away_team: str,
    home_team: str,
    as_of_week: int = 10,
    repo_root: Path | None = None,
) -> dict[str, Any]:
    """Compute Schrodinger Bridge Sinkhorn recovery plans conditioned on GTEx & W1-10 stress."""
    root = _resolve_root(repo_root)
    aw = _norm_team(away_team)
    hm = _norm_team(home_team)
    wk = min(max(1, int(as_of_week)), 10)
    ck = (str(root), aw, hm, wk)
    if ck in _SB_PAIR_CACHE:
        return _SB_PAIR_CACHE[ck]

    gtex = evaluate_gsi_gtex_v10_tissue_transcriptomic_partition(root)
    snap_map, sched_map = _load_sb_tables(root)
    hr, ar = sched_map.get((wk, hm, aw), (7.0, 7.0))

    actn3_factor = _clip(math.log10(max(10.0, float(gtex["actn3_skeletal_to_cardiac_ratio"]))) / 3.5, 0.85, 1.10)  # noqa: E501
    pgc_factor = _clip(float(gtex["ppargc1a_oxidative_muscle_cardiac_mean_tpm"]) / 11.444, 0.90, 1.10)  # noqa: E501

    def _team_bridge(tm: str, rest_days: float) -> dict[str, Any]:
        prior_tot = [snap_map[(tm, w)] for w in range(1, wk) if (tm, w) in snap_map]
        mean_snaps = float(np.mean(prior_tot)) if prior_tot else 1400.0
        load_stress = _clip(mean_snaps / 1450.0, 0.78, 1.25)
        rest_gain = _clip((rest_days - 4.0) / 10.0, 0.10, 1.00)

        # Initial metabolic/sarcomeric stress marginal mu0 and target recovery marginal mu1
        mu0_raw = np.array(
            [
                0.28 * load_stress,
                0.30 * load_stress,
                0.22,
                0.12 * pgc_factor,
                0.08 / load_stress,
            ],
            dtype=float,
        )
        mu1_raw = np.array(
            [
                0.04 / max(0.3, rest_gain),
                0.09 / max(0.3, rest_gain),
                0.17,
                0.28 * pgc_factor,
                0.42 * rest_gain * actn3_factor + 0.15,
            ],
            dtype=float,
        )
        mu0 = mu0_raw / float(np.sum(mu0_raw))
        mu1 = mu1_raw / float(np.sum(mu1_raw))
        ot = _solve_sinkhorn_schrodinger_bridge(mu0, mu1, epsilon=0.28, max_iter=300)

        readiness = float(ot["terminal_readiness_mass"])
        ft_mult = round(_clip(0.955 + 0.105 * readiness - 0.035 * float(ot["quadratic_wasserstein_cost"]), 0.93, 1.04), 5)  # noqa: E501
        q4_stamina = round(_clip(0.960 + 0.090 * readiness * pgc_factor - 0.025 * load_stress, 0.93, 1.04), 5)  # noqa: E501
        return {
            "team": tm,
            "rest_days": rest_days,
            "mean_prior_total_snaps": round(mean_snaps, 1),
            "load_stress_index": round(load_stress, 5),
            "sinkhorn_l1_marginal_error": round(float(ot["max_l1_marginal_err"]), 12),
            "entropic_kl_cost": round(float(ot["entropic_kl_cost"]), 6),
            "quadratic_wasserstein_cost": round(float(ot["quadratic_wasserstein_cost"]), 6),
            "terminal_readiness_mass": round(readiness, 5),
            "fast_twitch_power_retention_mult": ft_mult,
            "mitochondrial_q4_stamina_mult": q4_stamina,
        }

    out: dict[str, Any] = {
        "schema": "wave38_gsi_schrodinger_bridge_recovery_v1",
        "matchup": f"{aw} @ {hm}",
        "as_of_week": wk,
        "states": list(_STATES_5),
        "away": _team_bridge(aw, ar),
        "home": _team_bridge(hm, hr),
    }
    _SB_PAIR_CACHE[ck] = out
    return out


def evaluate_wave38_gsi_gtex_and_schrodinger_suite(
    *,
    away_team: str = "KC",
    home_team: str = "DEN",
    as_of_week: int = 10,
    repo_root: Path | None = None,
) -> dict[str, Any]:
    """Combined Wave 38 GSI GTEx v10 54-tissue partition & Schrodinger Bridge recovery suite."""
    root = _resolve_root(repo_root)
    aw = _norm_team(away_team)
    hm = _norm_team(home_team)
    wk = min(max(1, int(as_of_week)), 10)
    ck = (str(root), aw, hm, wk)
    if ck in _SUITE38_CACHE:
        return _SUITE38_CACHE[ck]

    gtex_part = evaluate_gsi_gtex_v10_tissue_transcriptomic_partition(root)
    sb_rec = evaluate_gsi_schrodinger_bridge_cellular_recovery(
        away_team=aw, home_team=hm, as_of_week=wk, repo_root=root
    )
    out: dict[str, Any] = {
        "schema": "wave38_gsi_gtex_and_schrodinger_suite_v1",
        "wired": True,
        "matchup": f"{aw} @ {hm}",
        "as_of_week": wk,
        "adr0003_rule_in_only_doctrine": True,
        "clinical_ruo_sports_weight": CLINICAL_RUO_GTEX_SPORTS_WEIGHT,
        "real_money_stake_cleared": REAL_MONEY_STAKE_CLEARED,
        "live_stake_fraction": LIVE_STAKE_FRACTION,
        "gtex_v10_partition": gtex_part,
        "schrodinger_bridge_recovery": sb_rec,
    }
    _SUITE38_CACHE[ck] = out
    return out
