"""GSI (ADR-0003) translational sports-medicine, SAR, and statistical progression bridge."""

from __future__ import annotations

import json
import math
import re
from collections.abc import Sequence
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

import numpy as np
from scipy import stats  # type: ignore[import-untyped]

from gse_engine.fabric.philox import draw_raw_quad, uniform01_from_u32

_CLINICAL_ADVICE_RE = re.compile(
    r"\b(?:diagnosed\s+with|medical\s+advice|prescribe|clinical\s+clearance|"
    r"cleared\s+to\s+play|prognosis\s+is)\b",
    re.IGNORECASE,
)
_ANON_FP_RE = re.compile(r"^(?:FP|Bit)_\d+$", re.IGNORECASE)


@dataclass(frozen=True, slots=True)
class PairedModelProgressionReport:
    """Out-of-sample paired statistical validation comparing pre vs. post MAE arrays."""

    metric_name: str
    n_samples: int
    pre_mae: float
    post_mae: float
    mae_reduction: float
    mae_reduction_pct: float
    paired_t_stat: float
    paired_t_pvalue: float
    wilcoxon_stat: float
    wilcoxon_pvalue: float
    cohens_dz: float
    pearson_r: float
    pearson_pvalue: float
    spearman_rho: float
    spearman_pvalue: float
    ols_slope: float
    ols_intercept: float
    bootstrap_ci_low: float
    bootstrap_ci_high: float


@dataclass(frozen=True, slots=True)
class BiomarkerStructuralProfile:
    """AlphaFold DB structural confidence summary under ADR-0003 rule-in-only guardrails."""

    uniprot_id: str
    gene_symbol: str
    global_plddt: float
    very_high_pct: float
    very_low_pct: float
    rigid_domain_count: int
    domain_ranges: tuple[str, ...]
    intrinsically_disordered_warning: bool
    molecular_summary: str
    rule_in_only_doctrine: bool = True

    def __post_init__(self) -> None:
        """Enforce ADR-0003 rule-in-only, RUO, and disorder warning invariants."""
        if not self.rule_in_only_doctrine:
            raise ValueError(
                "ADR-0003 invariant violated: rule_in_only_doctrine must remain True; "
                "never clear athletes from blood biomarker decay alone."
            )
        if _CLINICAL_ADVICE_RE.search(self.molecular_summary):
            raise ValueError(
                "Research-use-only invariant violated: clinical diagnostic or clearance "
                "language is prohibited in molecular_summary."
            )
        for name, val in (
            ("global_plddt", self.global_plddt),
            ("very_high_pct", self.very_high_pct),
            ("very_low_pct", self.very_low_pct),
        ):
            if not (0.0 <= float(val) <= 100.0):
                raise ValueError(f"{name} must lie in [0, 100], got {val}.")
        if self.rigid_domain_count < 0:
            raise ValueError("rigid_domain_count must be non-negative.")
        if self.very_low_pct >= 15.0 and not self.intrinsically_disordered_warning:
            raise ValueError(
                "Disorder warning invariant: very_low_pct >= 15% requires "
                "intrinsically_disordered_warning=True."
            )


@dataclass(frozen=True, slots=True)
class ClinicalTrialPortfolioSummary:
    """ClinicalTrials.gov API v2 landscape summary for sports mTBI and tendinopathy."""

    condition_query: str
    total_count: int
    sampled_nct_ids: tuple[str, ...]
    recruiting_count: int
    completed_count: int
    phases_present: tuple[str, ...]

    def __post_init__(self) -> None:
        """Validate clinical trial count bounds."""
        if self.total_count < len(self.sampled_nct_ids) or len(self.sampled_nct_ids) < 0:
            raise ValueError("total_count must be >= len(sampled_nct_ids).")
        if self.recruiting_count < 0 or self.completed_count < 0:
            raise ValueError("Trial status counts must be non-negative.")


@dataclass(frozen=True, slots=True)
class CongenericSarSummary:
    """Full-series ChEMBL + RDKit QSAR summary with anti-downsampling & interpretability."""

    target_chembl_id: str
    target_name: str
    total_compounds: int
    evaluated_compounds: int
    downsampled: bool
    winning_model: str
    holdout_r2: float
    holdout_rmse: float
    cv_r2: float
    top_attributed_features: tuple[str, ...]

    def __post_init__(self) -> None:
        """Enforce 100% dataset evaluation and interpretable feature attribution."""
        if self.downsampled:
            raise ValueError(
                "100% dataset utilization invariant violated: downsampled must be False."
            )
        if self.evaluated_compounds <= 0 or self.evaluated_compounds > self.total_compounds:
            raise ValueError(
                "evaluated_compounds must be in [1, total_compounds] for valid QSAR evaluation."
            )
        for feat in self.top_attributed_features:
            if _ANON_FP_RE.match(feat.strip()):
                raise ValueError(
                    f"Interpretable feature attribution invariant violated by hash '{feat}'."
                )


@dataclass(frozen=True, slots=True)
class MultiOmicsTargetAnnotation:
    """Genomic, constraint, epigenetic, tissue, and pathway annotation for a GSI target."""

    gene_symbol: str
    ensembl_id: str
    uniprot_id: str
    canonical_tss: str
    mane_select_transcript: str
    ontology_id: str
    ontology_label: str
    gnomad_pli: float | None
    gnomad_loeuf: float | None
    top_tissue: str
    subcellular_location: str
    encode_ccre_count: int
    interpro_domain_count: int
    open_targets_tractability: str
    molecular_notes: str

    def __post_init__(self) -> None:
        """Validate target identifiers, counts, and research-only framing."""
        if _CLINICAL_ADVICE_RE.search(self.molecular_notes):
            raise ValueError(
                "Research-use-only invariant violated: clinical diagnostic or clearance "
                "language is prohibited in molecular_notes."
            )
        if self.encode_ccre_count < 0 or self.interpro_domain_count < 0:
            raise ValueError("Annotation counts must be non-negative.")


@dataclass(frozen=True, slots=True)
class Wave16TranslationalBundle:
    """Complete verified Wave 16 GSI translational & statistical progression telemetry."""

    generated_utc: str
    progression_reports: tuple[PairedModelProgressionReport, ...]
    biomarker_structures: tuple[BiomarkerStructuralProfile, ...]
    clinical_trials: tuple[ClinicalTrialPortfolioSummary, ...]
    sar_benchmark: CongenericSarSummary
    multiomics_annotations: tuple[MultiOmicsTargetAnnotation, ...] = ()
    literature_citations: tuple[str, ...] = ()


def _validate_error_vectors(
    pre_errors: Sequence[float],
    post_errors: Sequence[float],
) -> tuple[np.ndarray, np.ndarray]:
    if len(pre_errors) != len(post_errors):
        raise ValueError("pre_errors and post_errors must have equal length.")
    if len(pre_errors) < 2:
        raise ValueError("At least 2 paired samples are required for statistical validation.")
    pre_arr = np.asarray([float(x) for x in pre_errors], dtype=np.float64)
    post_arr = np.asarray([float(x) for x in post_errors], dtype=np.float64)
    if not (np.all(np.isfinite(pre_arr)) and np.all(np.isfinite(post_arr))):
        raise ValueError("All error values must be finite numbers.")
    return np.abs(pre_arr), np.abs(post_arr)


def evaluate_paired_projection_progression(
    pre_errors: Sequence[float],
    post_errors: Sequence[float],
    *,
    metric_name: str = "paired_mae",
    seed: int = 20261116,
    n_bootstrap: int = 1000,
) -> PairedModelProgressionReport:
    """Compute paired hypothesis tests and Philox-4x32-10 bootstrap CI on MAE reduction."""
    if n_bootstrap < 100:
        raise ValueError("n_bootstrap must be >= 100.")
    abs_pre, abs_post = _validate_error_vectors(pre_errors, post_errors)
    n = int(abs_pre.shape[0])
    diffs = abs_pre - abs_post
    pre_mae = float(np.mean(abs_pre))
    post_mae = float(np.mean(abs_post))
    mae_reduction = pre_mae - post_mae
    mae_reduction_pct = (mae_reduction / pre_mae * 100.0) if pre_mae > 1e-12 else 0.0

    diff_std = float(np.std(diffs, ddof=1))
    if diff_std <= 1e-12:
        t_stat = 0.0
        t_pval = 1.0
        w_stat = 0.0
        w_pval = 1.0
        cohens_dz = 0.0
    else:
        t_res = stats.ttest_rel(abs_pre, abs_post, nan_policy="raise")
        t_stat = float(t_res.statistic)
        t_pval = float(t_res.pvalue)
        cohens_dz = float(np.mean(diffs)) / diff_std
        nonzero = diffs[np.abs(diffs) > 1e-12]
        if len(nonzero) >= 1:
            w_res = stats.wilcoxon(nonzero, zero_method="wilcox")
            w_stat = float(w_res.statistic)
            w_pval = float(w_res.pvalue)
        else:
            w_stat = 0.0
            w_pval = 1.0

    if float(np.std(abs_pre)) <= 1e-12 or float(np.std(abs_post)) <= 1e-12:
        p_r, p_p = 0.0, 1.0
        s_rho, s_p = 0.0, 1.0
        ols_slope, ols_intercept = 0.0, post_mae
    else:
        pr = stats.pearsonr(abs_pre, abs_post)
        sr = stats.spearmanr(abs_pre, abs_post)
        p_r = float(pr.statistic)
        p_p = float(pr.pvalue)
        s_rho = float(sr.statistic)
        s_p = float(sr.pvalue)
        slope_raw, intercept_raw = np.polyfit(abs_pre, abs_post, 1)
        ols_slope = float(slope_raw) if math.isfinite(float(slope_raw)) else 0.0
        ols_intercept = float(intercept_raw) if math.isfinite(float(intercept_raw)) else post_mae

    boot_means = np.empty(n_bootstrap, dtype=np.float64)
    n_quads = (n + 3) // 4
    for b_idx in range(n_bootstrap):
        sample_sum = 0.0
        pos = 0
        for q_idx in range(n_quads):
            quad = draw_raw_quad(seed, f"boot:{metric_name}", b_idx, q_idx, substream=0)
            for word in quad:
                if pos >= n:
                    break
                draw_idx = min(n - 1, int(uniform01_from_u32(word) * n))
                sample_sum += float(diffs[draw_idx])
                pos += 1
        boot_means[b_idx] = sample_sum / float(n)

    ci_low, ci_high = np.percentile(boot_means, [2.5, 97.5])
    return PairedModelProgressionReport(
        metric_name=metric_name,
        n_samples=n,
        pre_mae=round(pre_mae, 4),
        post_mae=round(post_mae, 4),
        mae_reduction=round(mae_reduction, 4),
        mae_reduction_pct=round(mae_reduction_pct, 2),
        paired_t_stat=round(t_stat, 4),
        paired_t_pvalue=float(t_pval),
        wilcoxon_stat=round(w_stat, 4),
        wilcoxon_pvalue=float(w_pval),
        cohens_dz=round(cohens_dz, 4),
        pearson_r=round(p_r, 4),
        pearson_pvalue=float(p_p),
        spearman_rho=round(s_rho, 4),
        spearman_pvalue=float(s_p),
        ols_slope=round(ols_slope, 4),
        ols_intercept=round(ols_intercept, 4),
        bootstrap_ci_low=round(float(ci_low), 4),
        bootstrap_ci_high=round(float(ci_high), 4),
    )


def validate_and_serialize_wave16_bundle(
    bundle: Wave16TranslationalBundle,
    out_path: Path | None = None,
) -> dict[str, Any]:
    """Validate all ADR-0003 and QSAR invariants and optionally serialize ASCII JSON."""
    payload = asdict(bundle)
    if out_path is not None:
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(
            json.dumps(payload, indent=2, sort_keys=True, ensure_ascii=True),
            encoding="utf-8",
        )
    return payload


def load_and_verify_wave16_telemetry(
    telemetry_path: Path = Path(
        "data/engine/gsi_wave16_translational_and_datascience_telemetry_2026.json"
    ),
) -> Wave16TranslationalBundle:
    """Load persisted Wave 16 telemetry and reconstruct typed invariant-checked objects."""
    resolved_path = telemetry_path
    if not resolved_path.is_file() and not telemetry_path.is_absolute():
        repo_candidate = Path(__file__).resolve().parents[3] / telemetry_path
        if repo_candidate.is_file():
            resolved_path = repo_candidate
    if not resolved_path.is_file():
        raise FileNotFoundError(
            f"Wave 16 telemetry file missing: {telemetry_path}. Run science synthesis export first."
        )
    raw = json.loads(resolved_path.read_text(encoding="utf-8"))
    reports = tuple(
        PairedModelProgressionReport(**item) for item in raw.get("progression_reports", [])
    )
    structures = tuple(
        BiomarkerStructuralProfile(
            uniprot_id=str(s["uniprot_id"]),
            gene_symbol=str(s["gene_symbol"]),
            global_plddt=float(s["global_plddt"]),
            very_high_pct=float(s["very_high_pct"]),
            very_low_pct=float(s["very_low_pct"]),
            rigid_domain_count=int(s["rigid_domain_count"]),
            domain_ranges=tuple(str(r) for r in s.get("domain_ranges", ())),
            intrinsically_disordered_warning=bool(s["intrinsically_disordered_warning"]),
            molecular_summary=str(s["molecular_summary"]),
            rule_in_only_doctrine=bool(s.get("rule_in_only_doctrine", True)),
        )
        for s in raw.get("biomarker_structures", [])
    )
    trials = tuple(
        ClinicalTrialPortfolioSummary(
            condition_query=str(t["condition_query"]),
            total_count=int(t["total_count"]),
            sampled_nct_ids=tuple(str(nct) for nct in t.get("sampled_nct_ids", ())),
            recruiting_count=int(t["recruiting_count"]),
            completed_count=int(t["completed_count"]),
            phases_present=tuple(str(p) for p in t.get("phases_present", ())),
        )
        for t in raw.get("clinical_trials", [])
    )
    sar_raw = raw["sar_benchmark"]
    sar = CongenericSarSummary(
        target_chembl_id=str(sar_raw["target_chembl_id"]),
        target_name=str(sar_raw["target_name"]),
        total_compounds=int(sar_raw["total_compounds"]),
        evaluated_compounds=int(sar_raw["evaluated_compounds"]),
        downsampled=bool(sar_raw["downsampled"]),
        winning_model=str(sar_raw["winning_model"]),
        holdout_r2=float(sar_raw["holdout_r2"]),
        holdout_rmse=float(sar_raw["holdout_rmse"]),
        cv_r2=float(sar_raw["cv_r2"]),
        top_attributed_features=tuple(str(f) for f in sar_raw.get("top_attributed_features", ())),
    )
    multiomics = tuple(
        MultiOmicsTargetAnnotation(
            gene_symbol=str(m["gene_symbol"]),
            ensembl_id=str(m["ensembl_id"]),
            uniprot_id=str(m["uniprot_id"]),
            canonical_tss=str(m["canonical_tss"]),
            mane_select_transcript=str(m["mane_select_transcript"]),
            ontology_id=str(m["ontology_id"]),
            ontology_label=str(m["ontology_label"]),
            gnomad_pli=(float(m["gnomad_pli"]) if m.get("gnomad_pli") is not None else None),
            gnomad_loeuf=(
                float(m["gnomad_loeuf"]) if m.get("gnomad_loeuf") is not None else None
            ),
            top_tissue=str(m["top_tissue"]),
            subcellular_location=str(m["subcellular_location"]),
            encode_ccre_count=int(m["encode_ccre_count"]),
            interpro_domain_count=int(m["interpro_domain_count"]),
            open_targets_tractability=str(m["open_targets_tractability"]),
            molecular_notes=str(m["molecular_notes"]),
        )
        for m in raw.get("multiomics_annotations", [])
    )
    lit_cites = tuple(str(u) for u in raw.get("literature_citations", ()))
    return Wave16TranslationalBundle(
        generated_utc=str(raw["generated_utc"]),
        progression_reports=reports,
        biomarker_structures=structures,
        clinical_trials=trials,
        sar_benchmark=sar,
        multiomics_annotations=multiomics,
        literature_citations=lit_cites,
    )


def compute_k14_translational_tissue_hazard_prior(
    *,
    concussion_questionable_count: int = 0,
    lower_extremity_questionable_count: int = 0,
    telemetry_bundle: Wave16TranslationalBundle | None = None,
) -> dict[str, float]:
    """Compute K14 bounded hierarchical injury hazard prior under ADR-0003 rule-in-only.

    Combines Wave 16 AlphaFold structural confidence (GFAP terminal disorder,
    MMP-13 tissue remodeling) and ChEMBL QSAR holdout sensitivity to attenuate
    uncertain concussion/lower-extremity snap exposure without ever inflating
    or clearing an injured athlete.
    """
    bundle = telemetry_bundle or load_and_verify_wave16_telemetry()
    gfap_disorder = 0.192
    mmp13_order = 0.8862
    for struct in bundle.biomarker_structures:
        if not struct.rule_in_only_doctrine:
            raise ValueError("ADR-0003 rule_in_only_doctrine must remain True.")
        if struct.gene_symbol == "GFAP":
            gfap_disorder = float(struct.very_low_pct) / 100.0
        elif struct.gene_symbol == "MMP13":
            mmp13_order = float(struct.global_plddt) / 100.0

    sar_sensitivity = max(0.25, min(0.95, float(bundle.sar_benchmark.holdout_r2)))
    conc_n = max(0, min(4, int(concussion_questionable_count)))
    lower_n = max(0, min(6, int(lower_extremity_questionable_count)))

    conc_hazard = conc_n * (0.042 + 0.06 * gfap_disorder)
    soft_tissue_hazard = lower_n * (0.024 + 0.018 * (1.0 - mmp13_order) + 0.012 * sar_sensitivity)
    hazard_prior = max(0.0, min(0.18, conc_hazard + soft_tissue_hazard))
    snap_attenuation = max(0.84, min(1.0, 1.0 - 0.85 * hazard_prior))
    epa_penalty = -round(min(0.015, 0.065 * hazard_prior), 5)

    return {
        "k14_hazard_prior": round(hazard_prior, 5),
        "k14_snap_attenuation_mult": round(snap_attenuation, 5),
        "k14_epa_penalty": epa_penalty,
        "gfap_disorder_fraction": round(gfap_disorder, 4),
        "mmp13_qsar_holdout_r2": round(sar_sensitivity, 4),
    }
