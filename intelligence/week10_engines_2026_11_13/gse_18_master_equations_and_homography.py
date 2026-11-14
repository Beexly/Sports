"""Galaxy Sports Network LLC (DBA Galaxy Sports Edge, galaxysportsedge.com)
Production Mathematical Package: 18 Native Equations, Kickoff-to-Victory-Formation
NFL Projection Architecture, 8-DoF Hartley-Normalized DLT + Joint Point-and-Line
Homography with Analytical Jacobian Covariance Propagation, EDGE#1b Key-Number +
EDGE#2 Overtime Locked-Mean CRPS Engine, and 00-TRUTH-FILE Governance.

Primary Google Drive Technical Sources Referenced:
1. Google_Drive_18_Native_GDoc_Equations_Master
   (file_id: 16yGdnBQ5GTiYY5WLyz3lxpspMAbzlkXm1WC4BeH7h-k)
2. Unified Quantitative NFL Projection Architecture
   (file_id: 1gmnDbtS7qA-7ZvJqnoGGbC3tKO4zFgizEnD6REiFI8k)
3. 00-TRUTH-FILE
   (file_id: 1HI8FMFrLOES11_GWLDCpGiJnK8_e7-F66TVJSKBzy-A)
4. Projective Geometry, Joint Point-and-Line Calibration, and Multi-Plane Coverage
   Optimization in the Galaxy Sports Edge NFL Architecture
   (file_id: 1kdaACWX4TJDkviugVgA8XxA2cF1rvbN04Xd6vJBQcHo)
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Mapping, Optional, Sequence, Tuple

import numpy as np
from scipy import optimize, special, stats

# =============================================================================
# SECTION 0: CONSTANTS & LOCKED PRODUCTION GOVERNANCE (00-TRUTH-FILE & GSN-01/03)
# =============================================================================

LEGAL_ENTITY_NAME: str = "Galaxy Sports Network LLC"
DBA_BRAND_NAME: str = "Galaxy Sports Edge"
CANONICAL_WEB_DOMAIN: str = "galaxysportsedge.com"
PUBLIC_LEDGER_URL: str = "https://galaxysportsedge.com/calibration"
PUBLIC_LEDGER_DISCLOSURE: str = (
    "Every pick is on the public ledger, wins and losses: "
    "https://galaxysportsedge.com/calibration"
)

NFL_FIELD_LENGTH_YARDS: float = 120.0
NFL_FIELD_WIDTH_YARDS: float = 53.333333333333336
YARDS_TO_METERS: float = 0.9144
NFL_FIELD_LENGTH_METERS: float = 109.728  # 120 yd * 0.9144 m/yd (GSN-01 EQ-06)
NFL_FIELD_WIDTH_METERS: float = 48.768    # 53.3333 yd * 0.9144 m/yd (GSN-01 EQ-06)

GAUSSIAN_BASELINE_SIGMA: float = 13.45
HARD_GATE_CRPS_THRESHOLD: float = 7.099
HARD_GATE_MIN_GAMES: int = 150
CANONICAL_WALK_FORWARD_GAMES: int = 2462
MEASURED_GAUSSIAN_BASELINE_CRPS: float = 7.1540
MEASURED_LAPLACE_BASELINE_CRPS: float = 7.1597

NFL_KEY_NUMBERS: Tuple[int, ...] = (3, 7, 6, 10, 14)

GALAXY_LOCKED_STATE: Dict[str, Any] = {
    "entity": LEGAL_ENTITY_NAME,
    "dba": DBA_BRAND_NAME,
    "domain": CANONICAL_WEB_DOMAIN,
    "mu": "market_close",
    "vision_weight": 0.0,
    "zero_imputation": True,
    "pass_veto": "unconditional",
    "gate": "CRPS <= 7.099 on n >= 150 (measured on 2,462 regular-season games)",
    "current_measured_baseline": {
        "filter": "REG 2017 W1 - 2026 W5 (expanding window, prior weeks only)",
        "n": CANONICAL_WALK_FORWARD_GAMES,
        "gaussian_13.45_crps": MEASURED_GAUSSIAN_BASELINE_CRPS,
        "cell_scaled_laplace_crps": MEASURED_LAPLACE_BASELINE_CRPS,
        "passed": False,
        "action": "emission_locked_at_0_picks_parlays_dfs",
    },
}

ALLOWED_AUTONOMOUS_ACTIONS: Tuple[str, ...] = (
    "find",
    "draft",
    "monitor",
    "rank",
    "package",
    "report",
)
PROHIBITED_AUTONOMOUS_ACTIONS: Tuple[str, ...] = (
    "send",
    "submit",
    "post",
    "pay",
    "deploy",
)


# =============================================================================
# SECTION 1: 00-TRUTH-FILE PUBLIC-COPY ENFORCEMENT
# Source: 00-TRUTH-FILE (file_id: 1HI8FMFrLOES11_GWLDCpGiJnK8_e7-F66TVJSKBzy-A)
# =============================================================================

def format_confidence_score(score: float | int) -> str:
    """Format confidence strictly as an integer 'XX/100' badge (zero '%' badges).

    Source: 00-TRUTH-FILE (1HI8FMFrLOES11_GWLDCpGiJnK8_e7-F66TVJSKBzy-A) &
    GSE public-copy governance rules.
    """
    if isinstance(score, bool) or not math.isfinite(float(score)):
        raise ValueError("Confidence score must be a finite numeric value in [0, 100].")
    val = float(score)
    if val < 0.0 or val > 100.0:
        raise ValueError(f"Confidence score {score} outside [0, 100].")
    rounded = int(round(val))
    return f"{rounded}/100"


_DISALLOWED_RECORD_PATTERN = re.compile(r"\b6" + r"2-23-1\b")
_DISALLOWED_HEADLINE_WINRATE_PATTERN = re.compile(
    r"\b(?:71\.2\s*%|72\.9\s*%|47-19-1|38-13-1|36-13-1)\b", re.IGNORECASE
)
_PERCENT_CONFIDENCE_BADGE_PATTERN = re.compile(
    r"(?:\b\d+(?:\.\d+)?\s*%\s*(?:confidence|conf\b|edge\s*badge|rating))"
    r"|(?:(?:confidence|conf)\s*[:=]?\s*\d+(?:\.\d+)?\s*%)",
    re.IGNORECASE,
)
_BARE_PERCENT_BADGE_PATTERN = re.compile(r"\[\s*\d+(?:\.\d+)?\s*%\s*\]")
_DISALLOWED_ENTITIES_AND_CLAIMS: Tuple[Tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"Golden\s+Ratio\s+Technologies", re.IGNORECASE), "forbidden_entity_golden_ratio"),
    (re.compile(r"Golden\s+State\s+Insights", re.IGNORECASE), "forbidden_entity_golden_state"),
    (re.compile(r"501\s*\(\s*c\s*\)\s*\(\s*3\s*\)\s+approved", re.IGNORECASE), "forbidden_501c3_approved"),
    (re.compile(r"\bdetermined\b(?=.*501\s*\(\s*c\s*\)\s*\(\s*3\s*\))", re.IGNORECASE), "forbidden_501c3_determined"),
    (
        re.compile(
            r"\b(?:Galaxy\s+Science\s+Institute|Galaxy\s+Sports\s+Institute|GSI)\b"
            r"[^.\n]{0,120}\b(?:grant|SBIR|STTR|ARPA-H|MTEC|DARPA|ARIA|NIH|NSF|award|funding)\b",
            re.IGNORECASE,
        ),
        "forbidden_standalone_gsi_grant_claim",
    ),
    (re.compile(r"\brefutes\s+ETH\b", re.IGNORECASE), "unverified_claim_refutes_eth"),
    (
        re.compile(r"6\.5-hour\s+pre-shock\s+sepsis\s+interception", re.IGNORECASE),
        "unverified_claim_sepsis_interception",
    ),
    (
        re.compile(r"0\.18\s*ms\s*#?3-SAT\s+verifier", re.IGNORECASE),
        "unverified_claim_3sat_verifier",
    ),
    (
        re.compile(r"\bcryptographically\s+sealed\b", re.IGNORECASE),
        "unverified_claim_cryptographically_sealed",
    ),
    (
        re.compile(
            r"https?://[^\s]*(?:aff=|affiliate|btag=|promo=|ref=sportsbook)",
            re.IGNORECASE,
        ),
        "forbidden_sportsbook_affiliate_link",
    ),
)


@dataclass(frozen=True)
class PublicCopyAuditResult:
    """Audit verdict for public-facing copy under 00-TRUTH-FILE."""

    passed: bool
    violations: Tuple[str, ...]
    sanitized_text: str


def audit_and_enforce_public_copy(text: str, *, strict: bool = False) -> PublicCopyAuditResult:
    """Audit and sanitize public-facing text against every rule in 00-TRUTH-FILE.

    Source: 00-TRUTH-FILE (file_id: 1HI8FMFrLOES11_GWLDCpGiJnK8_e7-F66TVJSKBzy-A), §§1-6.
    """
    violations: List[str] = []
    sanitized = text

    if _DISALLOWED_RECORD_PATTERN.search(sanitized):
        violations.append("forbidden_unreconciled_record_string")
        sanitized = _DISALLOWED_RECORD_PATTERN.sub(PUBLIC_LEDGER_DISCLOSURE, sanitized)

    if _DISALLOWED_HEADLINE_WINRATE_PATTERN.search(sanitized):
        violations.append("forbidden_winrate_headline_before_reconciliation")
        sanitized = _DISALLOWED_HEADLINE_WINRATE_PATTERN.sub(PUBLIC_LEDGER_DISCLOSURE, sanitized)

    if _PERCENT_CONFIDENCE_BADGE_PATTERN.search(sanitized) or _BARE_PERCENT_BADGE_PATTERN.search(sanitized):
        violations.append("forbidden_percent_confidence_badge_use_integer_xx_over_100")

        def _replace_pct_conf(match: re.Match[str]) -> str:
            num_match = re.search(r"\d+(?:\.\d+)?", match.group(0))
            val = float(num_match.group(0)) if num_match else 50.0
            clamped = max(0, min(100, int(round(val))))
            return f"Confidence {clamped}/100"

        sanitized = _PERCENT_CONFIDENCE_BADGE_PATTERN.sub(_replace_pct_conf, sanitized)
        sanitized = _BARE_PERCENT_BADGE_PATTERN.sub(_replace_pct_conf, sanitized)

    if re.search(r"FPR\s*0\.0\s*/\s*detection\s*1\.0", sanitized, re.IGNORECASE):
        if "on our synthetic fixtures" not in sanitized.lower():
            violations.append("unqualified_fpr_detection_claim_missing_synthetic_fixtures_qualifier")
            sanitized = re.sub(
                r"(FPR\s*0\.0\s*/\s*detection\s*1\.0)",
                r"\1 on our synthetic fixtures",
                sanitized,
                flags=re.IGNORECASE,
            )

    for pattern, code in _DISALLOWED_ENTITIES_AND_CLAIMS:
        if pattern.search(sanitized):
            violations.append(code)
            sanitized = pattern.sub(f"[REDACTED:{code}]", sanitized)

    if strict and violations:
        raise ValueError(f"00-TRUTH-FILE public-copy violation(s): {', '.join(violations)}")

    return PublicCopyAuditResult(
        passed=(len(violations) == 0),
        violations=tuple(violations),
        sanitized_text=sanitized,
    )


def enforce_autonomous_action_gate(action: str) -> Dict[str, Any]:
    """Enforce 00-TRUTH-FILE §6 autonomous engine execution boundary.

    Source: 00-TRUTH-FILE (1HI8FMFrLOES11_GWLDCpGiJnK8_e7-F66TVJSKBzy-A), §6.
    """
    normalized = action.strip().lower()
    if normalized in ALLOWED_AUTONOMOUS_ACTIONS:
        return {"action": normalized, "autonomous_allowed": True, "status": "EXECUTED"}
    if normalized in PROHIBITED_AUTONOMOUS_ACTIONS:
        return {
            "action": normalized,
            "autonomous_allowed": False,
            "status": "QUEUED_FOR_FOUNDER_TAP",
        }
    raise ValueError(f"Unrecognized engine action '{action}'.")


# =============================================================================
# SECTION 2: 8-DOF HARTLEY-NORMALIZED DLT + JOINT POINT-AND-LINE HOMOGRAPHY
#            & ANALYTICAL JACOBIAN SPATIAL UNCERTAINTY PROPAGATION
# Source: 1kdaACWX4TJDkviugVgA8XxA2cF1rvbN04Xd6vJBQcHo & GSN-01
# =============================================================================

@dataclass(frozen=True)
class HomographyDiagnostics:
    """Condition-number and geometric reprojection diagnostics for H."""

    H: np.ndarray
    T_img: np.ndarray
    T_field: np.ndarray
    raw_condition_number: float
    normalized_condition_number: float
    point_reprojection_rmse_m: float
    line_endpoint_rmse_px: float
    horizon_line_img: np.ndarray


def compute_hartley_normalization(points_2d: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """Compute Hartley isotropic similarity conditioning matrix T in R^(3x3).

    Source: 1kdaACWX4TJDkviugVgA8XxA2cF1rvbN04Xd6vJBQcHo & GSN-01.
    """
    pts = np.asarray(points_2d, dtype=np.float64)
    if pts.ndim != 2 or pts.shape[1] != 2 or pts.shape[0] < 2:
        raise ValueError("points_2d must have shape (N, 2) with N >= 2.")
    centroid = np.mean(pts, axis=0)
    shifted = pts - centroid
    dists = np.linalg.norm(shifted, axis=1)
    mean_dist = float(np.mean(dists))
    if mean_dist < 1e-12:
        raise ValueError("Degenerate point configuration: zero spatial spread.")
    scale = math.sqrt(2.0) / mean_dist
    T = np.array(
        [
            [scale, 0.0, -scale * centroid[0]],
            [0.0, scale, -scale * centroid[1]],
            [0.0, 0.0, 1.0],
        ],
        dtype=np.float64,
    )
    ones = np.ones((pts.shape[0], 1), dtype=np.float64)
    pts_h = np.hstack([pts, ones])
    pts_norm_h = (T @ pts_h.T).T
    return T, pts_norm_h[:, :2]


def _build_point_dlt_rows(img_pts: np.ndarray, field_pts: np.ndarray) -> np.ndarray:
    n = img_pts.shape[0]
    A = np.zeros((2 * n, 9), dtype=np.float64)
    for i in range(n):
        u, v = float(img_pts[i, 0]), float(img_pts[i, 1])
        x, y = float(field_pts[i, 0]), float(field_pts[i, 1])
        A[2 * i] = [-u, -v, -1.0, 0.0, 0.0, 0.0, x * u, x * v, x]
        A[2 * i + 1] = [0.0, 0.0, 0.0, -u, -v, -1.0, y * u, y * v, y]
    return A


def _condition_number_8dof(A: np.ndarray) -> float:
    singular_values = np.linalg.svd(A, compute_uv=False)
    if singular_values.shape[0] < 8 or singular_values[7] < 1e-15:
        return float("inf")
    return float(singular_values[0] / singular_values[7])


def project_pixels_to_field(H: np.ndarray, pixels_uv: np.ndarray) -> np.ndarray:
    """Eq. 01 (GSN-01 EQ-10): Planar projective mapping & perspective division.

    Source: 16yGdnBQ5GTiYY5WLyz3lxpspMAbzlkXm1WC4BeH7h-k (GSN-01 EQ-10) &
    1kdaACWX4TJDkviugVgA8XxA2cF1rvbN04Xd6vJBQcHo.
    """
    H_mat = np.asarray(H, dtype=np.float64)
    uv = np.asarray(pixels_uv, dtype=np.float64)
    single = uv.ndim == 1
    if single:
        uv = uv.reshape(1, 2)
    ones = np.ones((uv.shape[0], 1), dtype=np.float64)
    uv_h = np.hstack([uv, ones])
    x_tilde = (H_mat @ uv_h.T).T
    w = x_tilde[:, 2:3]
    if np.any(np.abs(w) < 1e-12):
        raise ZeroDivisionError("Point lies on or extremely near the projective horizon w(u,v)=0.")
    xy = x_tilde[:, :2] / w
    return xy[0] if single else xy


def estimate_homography_hartley_dlt(
    image_points_px: np.ndarray,
    field_points_m: np.ndarray,
) -> HomographyDiagnostics:
    """Estimate 8-DoF planar homography H via Hartley-Normalized DLT.

    Source: 1kdaACWX4TJDkviugVgA8XxA2cF1rvbN04Xd6vJBQcHo.
    """
    img_pts = np.asarray(image_points_px, dtype=np.float64)
    fld_pts = np.asarray(field_points_m, dtype=np.float64)
    if img_pts.shape != fld_pts.shape or img_pts.ndim != 2 or img_pts.shape[1] != 2:
        raise ValueError("image_points_px and field_points_m must both have shape (N, 2).")
    if img_pts.shape[0] < 4:
        raise ValueError("Point-only 8-DoF DLT requires N >= 4 point correspondences.")

    A_raw = _build_point_dlt_rows(img_pts, fld_pts)
    raw_cond = _condition_number_8dof(A_raw)

    T_img, img_norm = compute_hartley_normalization(img_pts)
    T_field, fld_norm = compute_hartley_normalization(fld_pts)

    A_norm = _build_point_dlt_rows(img_norm, fld_norm)
    norm_cond = _condition_number_8dof(A_norm)

    _, _, Vt = np.linalg.svd(A_norm)
    H_tilde = Vt[-1, :].reshape(3, 3)

    H = np.linalg.inv(T_field) @ H_tilde @ T_img
    if abs(H[2, 2]) > 1e-12:
        H = H / H[2, 2]
    else:
        H = H / np.linalg.norm(H)

    pred_fld = project_pixels_to_field(H, img_pts)
    rmse_m = float(np.sqrt(np.mean(np.sum((pred_fld - fld_pts) ** 2, axis=1))))

    return HomographyDiagnostics(
        H=H,
        T_img=T_img,
        T_field=T_field,
        raw_condition_number=raw_cond,
        normalized_condition_number=norm_cond,
        point_reprojection_rmse_m=rmse_m,
        line_endpoint_rmse_px=0.0,
        horizon_line_img=H[2, :].copy(),
    )


@dataclass(frozen=True)
class FieldLineCorrespondence:
    """Correspondence between detected pixel segment endpoints and an NFL field line."""

    endpoint_1_px: Tuple[float, float]
    endpoint_2_px: Tuple[float, float]
    line_field_homogeneous: Tuple[float, float, float]
    weight: float = 1.0


def estimate_joint_point_and_line_homography(
    image_points_px: np.ndarray,
    field_points_m: np.ndarray,
    line_correspondences: Sequence[FieldLineCorrespondence],
    *,
    alpha_line_weight: float = 0.5,
    refine_nonlinear: bool = True,
) -> HomographyDiagnostics:
    """Estimate 8-DoF Homography H from joint point and NFL yard/hash line constraints.

    Source: 1kdaACWX4TJDkviugVgA8XxA2cF1rvbN04Xd6vJBQcHo ('Deconstructing the Native
    PnLCalib Framework' & 'Five Architectural Improvements to PnLCalib for SkeleTrack v2').
    """
    img_pts = np.asarray(image_points_px, dtype=np.float64).reshape(-1, 2)
    fld_pts = np.asarray(field_points_m, dtype=np.float64).reshape(-1, 2)
    if img_pts.shape != fld_pts.shape:
        raise ValueError("image_points_px and field_points_m must have matching shapes.")

    n_pts = img_pts.shape[0]
    n_lines = len(line_correspondences)
    if 2 * n_pts + 2 * n_lines < 8:
        raise ValueError(
            f"Insufficient constraints for 8-DoF homography: 2*{n_pts} point eqs + "
            f"2*{n_lines} line endpoint eqs < 8."
        )

    all_px_list: List[np.ndarray] = []
    if n_pts > 0:
        all_px_list.append(img_pts)
    for lc in line_correspondences:
        all_px_list.append(np.array([lc.endpoint_1_px, lc.endpoint_2_px], dtype=np.float64))
    all_px = np.vstack(all_px_list)
    T_img, _ = compute_hartley_normalization(all_px)

    all_fld_list: List[np.ndarray] = []
    if n_pts > 0:
        all_fld_list.append(fld_pts)
    for lc in line_correspondences:
        L1, L2, L3 = lc.line_field_homogeneous
        norm_sq = L1 * L1 + L2 * L2
        if norm_sq < 1e-12:
            raise ValueError("Degenerate field line L1=L2=0.")
        p0 = np.array([-L1 * L3 / norm_sq, -L2 * L3 / norm_sq], dtype=np.float64)
        tangent = np.array([-L2, L1], dtype=np.float64) / math.sqrt(norm_sq)
        all_fld_list.append(np.vstack([p0, p0 + 10.0 * tangent]))
    all_fld = np.vstack(all_fld_list)
    T_field, _ = compute_hartley_normalization(all_fld)
    T_field_inv = np.linalg.inv(T_field)

    raw_rows: List[np.ndarray] = []
    norm_rows: List[np.ndarray] = []

    if n_pts > 0:
        raw_rows.append(_build_point_dlt_rows(img_pts, fld_pts))
        img_pts_h = np.hstack([img_pts, np.ones((n_pts, 1), dtype=np.float64)])
        fld_pts_h = np.hstack([fld_pts, np.ones((n_pts, 1), dtype=np.float64)])
        img_pts_norm = (T_img @ img_pts_h.T).T[:, :2]
        fld_pts_norm = (T_field @ fld_pts_h.T).T[:, :2]
        norm_rows.append(_build_point_dlt_rows(img_pts_norm, fld_pts_norm))

    line_scale = math.sqrt(max(alpha_line_weight, 1e-9))
    for lc in line_correspondences:
        L_vec = np.array(lc.line_field_homogeneous, dtype=np.float64)
        L_vec = L_vec / math.hypot(L_vec[0], L_vec[1])
        L_norm = T_field_inv.T @ L_vec
        L_norm = L_norm / math.hypot(L_norm[0], L_norm[1])
        w_sqrt = line_scale * math.sqrt(max(lc.weight, 0.0))

        for ep in (lc.endpoint_1_px, lc.endpoint_2_px):
            q_raw = np.array([ep[0], ep[1], 1.0], dtype=np.float64)
            q_norm = T_img @ q_raw
            raw_rows.append(
                (w_sqrt * np.concatenate([L_vec[0] * q_raw, L_vec[1] * q_raw, L_vec[2] * q_raw])).reshape(1, 9)
            )
            norm_rows.append(
                (w_sqrt * np.concatenate([L_norm[0] * q_norm, L_norm[1] * q_norm, L_norm[2] * q_norm])).reshape(1, 9)
            )

    A_raw = np.vstack(raw_rows)
    A_norm = np.vstack(norm_rows)
    raw_cond = _condition_number_8dof(A_raw)
    norm_cond = _condition_number_8dof(A_norm)

    _, _, Vt = np.linalg.svd(A_norm)
    H_tilde = Vt[-1, :].reshape(3, 3)
    H = T_field_inv @ H_tilde @ T_img
    if abs(H[2, 2]) > 1e-12:
        H = H / H[2, 2]
    else:
        H = H / np.linalg.norm(H)

    if refine_nonlinear:
        h0 = H.reshape(9)
        pivot_idx = int(np.argmax(np.abs(h0)))
        pivot_val = float(h0[pivot_idx])
        free_indices = [idx for idx in range(9) if idx != pivot_idx]
        p_init = h0[free_indices] / pivot_val

        def _unpack_H(params_8: np.ndarray) -> np.ndarray:
            vec = np.empty(9, dtype=np.float64)
            vec[pivot_idx] = 1.0
            for k_idx, f_idx in enumerate(free_indices):
                vec[f_idx] = params_8[k_idx]
            mat = vec.reshape(3, 3)
            if abs(mat[2, 2]) > 1e-12:
                mat = mat / mat[2, 2]
            return mat

        def _pnl_residuals(params_8: np.ndarray) -> np.ndarray:
            H_curr = _unpack_H(params_8)
            H_inv = np.linalg.inv(H_curr)
            res: List[float] = []
            if n_pts > 0:
                uv_proj = project_pixels_to_field(H_inv, fld_pts)
                res.extend((img_pts - uv_proj).reshape(-1).tolist())
            for lc in line_correspondences:
                L_vec = np.array(lc.line_field_homogeneous, dtype=np.float64)
                l_img = H_curr.T @ L_vec
                denom = math.hypot(float(l_img[0]), float(l_img[1]))
                w_eff = math.sqrt(max(alpha_line_weight * lc.weight, 0.0))
                for ep in (lc.endpoint_1_px, lc.endpoint_2_px):
                    if denom < 1e-12:
                        res.append(1e6)
                    else:
                        d_perp = (l_img[0] * ep[0] + l_img[1] * ep[1] + l_img[2]) / denom
                        res.append(float(w_eff * d_perp))
            return np.asarray(res, dtype=np.float64)

        opt = optimize.least_squares(_pnl_residuals, p_init, method="lm", max_nfev=500)
        H = _unpack_H(opt.x)

    pt_rmse_m = 0.0
    if n_pts > 0:
        pred_fld = project_pixels_to_field(H, img_pts)
        pt_rmse_m = float(np.sqrt(np.mean(np.sum((pred_fld - fld_pts) ** 2, axis=1))))

    line_sq_errs: List[float] = []
    for lc in line_correspondences:
        l_img = H.T @ np.array(lc.line_field_homogeneous, dtype=np.float64)
        denom = math.hypot(float(l_img[0]), float(l_img[1]))
        for ep in (lc.endpoint_1_px, lc.endpoint_2_px):
            d_perp = abs(l_img[0] * ep[0] + l_img[1] * ep[1] + l_img[2]) / max(denom, 1e-12)
            line_sq_errs.append(float(d_perp * d_perp))
    line_rmse_px = float(math.sqrt(np.mean(line_sq_errs))) if line_sq_errs else 0.0

    return HomographyDiagnostics(
        H=H,
        T_img=T_img,
        T_field=T_field,
        raw_condition_number=raw_cond,
        normalized_condition_number=norm_cond,
        point_reprojection_rmse_m=pt_rmse_m,
        line_endpoint_rmse_px=line_rmse_px,
        horizon_line_img=H[2, :].copy(),
    )


def estimate_homography_4dof_vanishing_points(
    vp_transverse_x: np.ndarray,
    vp_longitudinal_y: np.ndarray,
    image_points_px: np.ndarray,
    field_points_m: np.ndarray,
) -> np.ndarray:
    """Estimate 4-DoF Vanishing-Point Constrained Homography locking horizon l_inf = v_x x v_y.

    Source: 1kdaACWX4TJDkviugVgA8XxA2cF1rvbN04Xd6vJBQcHo, Eq. M_{4-DoF}.
    """
    vx = np.asarray(vp_transverse_x, dtype=np.float64).reshape(3)
    vy = np.asarray(vp_longitudinal_y, dtype=np.float64).reshape(3)
    img_pts = np.asarray(image_points_px, dtype=np.float64).reshape(-1, 2)
    fld_pts = np.asarray(field_points_m, dtype=np.float64).reshape(-1, 2)
    if img_pts.shape[0] < 2:
        raise ValueError("4-DoF VP-constrained DLT requires at least 2 landmark correspondences.")

    rows: List[List[float]] = []
    rhs: List[float] = []
    for i in range(img_pts.shape[0]):
        u, v = float(img_pts[i, 0]), float(img_pts[i, 1])
        X, Y = float(fld_pts[i, 0]), float(fld_pts[i, 1])
        rows.append([X * (vy[0] - u * vy[2]), Y * (vx[0] - u * vx[2]), 1.0, 0.0])
        rhs.append(u)
        rows.append([X * (vy[1] - v * vy[2]), Y * (vx[1] - v * vx[2]), 0.0, 1.0])
        rhs.append(v)

    sol, _, _, _ = np.linalg.lstsq(np.asarray(rows, dtype=np.float64), np.asarray(rhs, dtype=np.float64), rcond=None)
    lam1, lam2, m13, m23 = float(sol[0]), float(sol[1]), float(sol[2]), float(sol[3])
    M_4dof = np.array(
        [
            [lam1 * vy[0], lam2 * vx[0], m13],
            [lam1 * vy[1], lam2 * vx[1], m23],
            [lam1 * vy[2], lam2 * vx[2], 1.0],
        ],
        dtype=np.float64,
    )
    H_4dof = np.linalg.inv(M_4dof)
    if abs(H_4dof[2, 2]) > 1e-12:
        H_4dof = H_4dof / H_4dof[2, 2]
    return H_4dof


def generate_nfl_field_template_138_intersections() -> np.ndarray:
    """Generate the exact 138 primary planar NFL field intersections K_p in meters.

    Source: 1kdaACWX4TJDkviugVgA8XxA2cF1rvbN04Xd6vJBQcHo.
    """
    transverse_yd = [0.0, 10.0] + [float(x) for x in range(15, 110, 5)] + [110.0, 120.0]
    longitudinal_yd = [0.0, 12.0, 23.5833333333, 29.75, 41.3333333333, 53.3333333333]
    pts = [
        [x_yd * YARDS_TO_METERS, y_yd * YARDS_TO_METERS]
        for x_yd in transverse_yd
        for y_yd in longitudinal_yd
    ]
    return np.asarray(pts, dtype=np.float64)


def homography_analytical_jacobian(H: np.ndarray, u: float, v: float) -> np.ndarray:
    """Compute exact 2x2 analytical Jacobian J(u, v) = d(x, y) / d(u, v).

    Source: 1kdaACWX4TJDkviugVgA8XxA2cF1rvbN04Xd6vJBQcHo.
    """
    H_mat = np.asarray(H, dtype=np.float64)
    w_tilde = float(H_mat[2, 0] * u + H_mat[2, 1] * v + H_mat[2, 2])
    if abs(w_tilde) < 1e-12:
        raise ZeroDivisionError("Cannot evaluate Jacobian on projective horizon w_tilde=0.")
    x_val = float(H_mat[0, 0] * u + H_mat[0, 1] * v + H_mat[0, 2]) / w_tilde
    y_val = float(H_mat[1, 0] * u + H_mat[1, 1] * v + H_mat[1, 2]) / w_tilde
    return (1.0 / w_tilde) * np.array(
        [
            [H_mat[0, 0] - x_val * H_mat[2, 0], H_mat[0, 1] - x_val * H_mat[2, 1]],
            [H_mat[1, 0] - y_val * H_mat[2, 0], H_mat[1, 1] - y_val * H_mat[2, 1]],
        ],
        dtype=np.float64,
    )


def propagate_spatial_uncertainty_jacobian(
    H: np.ndarray,
    u: float,
    v: float,
    sigma_pixel: np.ndarray,
    *,
    torso_confidences: Optional[Sequence[float]] = None,
    tikhonov_eps_m2: float = 1e-6,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Propagate pixel measurement covariance Sigma_pixel to NFL field space (meters^2).

        Sigma_world(u,v) = J(u,v) @ Sigma_pixel_eff @ J(u,v)^T + eps * I_2

    Source: 1kdaACWX4TJDkviugVgA8XxA2cF1rvbN04Xd6vJBQcHo.
    """
    sig_px = np.asarray(sigma_pixel, dtype=np.float64)
    if sig_px.shape != (2, 2):
        raise ValueError("sigma_pixel must be a 2x2 covariance matrix.")
    conf_scale = 1.0
    if torso_confidences is not None and len(torso_confidences) > 0:
        c_bar = float(np.mean(np.asarray(torso_confidences, dtype=np.float64)))
        conf_scale = 1.0 / max(c_bar, 0.05)
    sig_px_eff = conf_scale * sig_px
    xy = project_pixels_to_field(H, np.array([u, v], dtype=np.float64))
    J = homography_analytical_jacobian(H, u, v)
    sigma_world = J @ sig_px_eff @ J.T + tikhonov_eps_m2 * np.eye(2, dtype=np.float64)
    return xy, J, sigma_world


def fuse_dual_view_information(
    z_sideline_m: np.ndarray,
    R_sideline_m2: np.ndarray,
    z_endzone_m: np.ndarray,
    R_endzone_m2: np.ndarray,
) -> Tuple[np.ndarray, np.ndarray]:
    """Information-form fusion of orthogonal Sideline and End-Zone tracking projections.

    Source: 1kdaACWX4TJDkviugVgA8XxA2cF1rvbN04Xd6vJBQcHo.
    """
    inv_s = np.linalg.inv(np.asarray(R_sideline_m2, dtype=np.float64))
    inv_e = np.linalg.inv(np.asarray(R_endzone_m2, dtype=np.float64))
    R_fused = np.linalg.inv(inv_s + inv_e)
    z_fused = R_fused @ (
        inv_s @ np.asarray(z_sideline_m, dtype=np.float64)
        + inv_e @ np.asarray(z_endzone_m, dtype=np.float64)
    )
    return z_fused, R_fused


# =============================================================================
# SECTION 3: ALL 18 NATIVE EQUATIONS FROM Google_Drive_18_Native_GDoc_Equations_Master
# Source: file_id 16yGdnBQ5GTiYY5WLyz3lxpspMAbzlkXm1WC4BeH7h-k (GSN-01 .. ROOT-18)
# =============================================================================

def eq01_gsn01_planar_homography_projection(H: np.ndarray, pixels_uv: np.ndarray) -> np.ndarray:
    """Master Eq. 01 [GSN-01, EQ-10]: Planar Projective Homography & Perspective Division.

    Source: Google_Drive_18_Native_GDoc_Equations_Master (16yGdnBQ5GTiYY5WLyz3lxpspMAbzlkXm1WC4BeH7h-k).
    """
    return project_pixels_to_field(H, pixels_uv)


def eq02_gsn02_kinematic_curvature_and_normalized_jerk(
    trajectory_xy: np.ndarray,
    dt: float,
) -> Dict[str, Any]:
    """Master Eq. 02 [GSN-02]: Trajectory Curvature, 2/3 Power Law & Normalized Jerk.

    Source: Google_Drive_18_Native_GDoc_Equations_Master (16yGdnBQ5GTiYY5WLyz3lxpspMAbzlkXm1WC4BeH7h-k).
    """
    r = np.asarray(trajectory_xy, dtype=np.float64)
    if r.ndim != 2 or r.shape[1] != 2 or r.shape[0] < 5 or dt <= 0.0:
        raise ValueError("trajectory_xy requires shape (N>=5, 2) and dt > 0.")
    vel = np.gradient(r, dt, axis=0)
    acc = np.gradient(vel, dt, axis=0)
    jerk = np.gradient(acc, dt, axis=0)

    speed = np.linalg.norm(vel, axis=1)
    denom = np.maximum(speed ** 3, 1e-12)
    curvature = np.abs(vel[:, 0] * acc[:, 1] - vel[:, 1] * acc[:, 0]) / denom

    T_total = float((r.shape[0] - 1) * dt)
    diffs = np.diff(r, axis=0)
    path_length_L = float(np.sum(np.linalg.norm(diffs, axis=1)))
    jerk_sq = np.sum(jerk ** 2, axis=1)
    jerk_integral = float(np.trapezoid(jerk_sq, dx=dt))
    normalized_jerk = (T_total ** 5 / max(path_length_L ** 2, 1e-12)) * jerk_integral

    valid = (speed > 1e-3) & (curvature > 1e-4)
    beta_hat = 1.0 / 3.0
    if int(np.sum(valid)) >= 3:
        slope, _ = np.polyfit(np.log(curvature[valid]), np.log(speed[valid]), 1)
        beta_hat = float(-slope)

    return {
        "speed": speed,
        "curvature": curvature,
        "jerk_integral": jerk_integral,
        "normalized_jerk": float(normalized_jerk),
        "power_law_beta_hat": beta_hat,
    }


def eq03_gsn03_locked_mean_crps_gaussian_and_laplace(
    y_observed: float,
    mu_locked_close: float,
    *,
    sigma_gaussian: float = GAUSSIAN_BASELINE_SIGMA,
    b_laplace: Optional[float] = None,
) -> Dict[str, float]:
    """Master Eq. 03 [GSN-03]: Closed-Form Gaussian & Laplace CRPS + Exact Derivatives.

    Source: Google_Drive_18_Native_GDoc_Equations_Master (16yGdnBQ5GTiYY5WLyz3lxpspMAbzlkXm1WC4BeH7h-k).
    """
    if sigma_gaussian <= 0.0:
        raise ValueError("sigma_gaussian must be > 0.")
    b = float(b_laplace) if b_laplace is not None else sigma_gaussian / math.sqrt(2.0)
    if b <= 0.0:
        raise ValueError("b_laplace must be > 0.")

    err = float(y_observed - mu_locked_close)
    abs_err = abs(err)
    z = err / sigma_gaussian
    phi_z = math.exp(-0.5 * z * z) / math.sqrt(2.0 * math.pi)
    Phi_z = 0.5 * (1.0 + math.erf(z / math.sqrt(2.0)))
    inv_sqrt_pi = 1.0 / math.sqrt(math.pi)

    crps_gauss = sigma_gaussian * (z * (2.0 * Phi_z - 1.0) + 2.0 * phi_z - inv_sqrt_pi)
    d_crps_gauss = 2.0 * phi_z - inv_sqrt_pi
    d2_crps_gauss = (2.0 * (err ** 2) / (sigma_gaussian ** 3)) * phi_z

    exp_term = math.exp(-abs_err / b)
    crps_lap = abs_err + b * exp_term - 0.75 * b
    d_crps_lap = (1.0 + abs_err / b) * exp_term - 0.75
    d2_crps_lap = ((err ** 2) / (b ** 3)) * exp_term

    return {
        "gaussian_crps": float(crps_gauss),
        "gaussian_d1_sigma": float(d_crps_gauss),
        "gaussian_d2_sigma": float(d2_crps_gauss),
        "laplace_crps": float(crps_lap),
        "laplace_d1_b": float(d_crps_lap),
        "laplace_d2_b": float(d2_crps_lap),
    }


def eq04_gsn04_conformal_cqr_and_jackknife_plus(
    cal_q_lo: np.ndarray,
    cal_q_hi: np.ndarray,
    cal_y: np.ndarray,
    test_q_lo: float,
    test_q_hi: float,
    *,
    alpha: float = 0.10,
    loo_test_preds: Optional[np.ndarray] = None,
    loo_abs_residuals: Optional[np.ndarray] = None,
) -> Dict[str, Any]:
    """Master Eq. 04 [GSN-04]: Split CQR Finite-Sample Rank & Fail-Closed Jackknife+ Fallback.

    Source: Google_Drive_18_Native_GDoc_Equations_Master (16yGdnBQ5GTiYY5WLyz3lxpspMAbzlkXm1WC4BeH7h-k).
    """
    q_lo = np.asarray(cal_q_lo, dtype=np.float64)
    q_hi = np.asarray(cal_q_hi, dtype=np.float64)
    y = np.asarray(cal_y, dtype=np.float64)
    n = int(y.shape[0])
    if q_lo.shape != (n,) or q_hi.shape != (n,):
        raise ValueError("Calibration arrays must share shape (n,).")
    if not (0.0 < alpha < 1.0):
        raise ValueError("alpha must lie in (0, 1).")

    rank_k = int(math.ceil((n + 1) * (1.0 - alpha)))
    min_n_required = int(math.ceil(1.0 / alpha) - 1)
    scores = np.maximum(q_lo - y, y - q_hi)
    sorted_scores = np.sort(scores)

    if rank_k > n or n < min_n_required:
        jk_interval: Optional[Tuple[float, float]] = None
        if loo_test_preds is not None and loo_abs_residuals is not None:
            preds = np.asarray(loo_test_preds, dtype=np.float64)
            res = np.asarray(loo_abs_residuals, dtype=np.float64)
            m = int(preds.shape[0])
            k_lo = max(1, int(math.floor(alpha * (m + 1))))
            k_hi = min(m, int(math.ceil((1.0 - alpha) * (m + 1))))
            lower_vals = np.sort(preds - res)
            upper_vals = np.sort(preds + res)
            jk_interval = (float(lower_vals[k_lo - 1]), float(upper_vals[k_hi - 1]))

        return {
            "n": n,
            "rank_k": rank_k,
            "cqr_valid": False,
            "decision": "NO_BET",
            "cqr_interval": (-float("inf"), float("inf")),
            "jackknife_plus_interval": jk_interval,
        }

    q_hat = float(sorted_scores[rank_k - 1])
    lo = float(min(test_q_lo, test_q_hi) - q_hat)
    hi = float(max(test_q_lo, test_q_hi) + q_hat)
    return {
        "n": n,
        "rank_k": rank_k,
        "q_hat": q_hat,
        "cqr_valid": True,
        "decision": "CALIBRATED",
        "cqr_interval": (lo, hi),
        "jackknife_plus_interval": None,
    }


def eq05_gsn05_bellman_q_decay_and_surrogate_reward(
    step_validities: Sequence[float],
    observed_noisy_feedback: int,
    *,
    gamma_decay: float = 0.95,
    false_positive_rho0: float = 0.05,
    false_negative_rho1: float = 0.10,
) -> Dict[str, Any]:
    """Master Eq. 05 [GSN-05]: Multiplicative Bellman Q-Decay & Noisy-Feedback Surrogate Reward.

    Source: Google_Drive_18_Native_GDoc_Equations_Master (16yGdnBQ5GTiYY5WLyz3lxpspMAbzlkXm1WC4BeH7h-k).
    """
    if observed_noisy_feedback not in (0, 1):
        raise ValueError("observed_noisy_feedback must be in {0, 1}.")
    denom = 1.0 - false_positive_rho0 - false_negative_rho1
    if denom <= 0.0:
        return {
            "halted": True,
            "q_trace": 0.0,
            "unbiased_surrogate_reward": None,
            "forward_weight": 0.0,
        }
    q_val = 1.0
    for v in step_validities:
        v_clamped = max(0.0, min(1.0, float(v)))
        q_val *= gamma_decay * v_clamped
    surrogate = (float(observed_noisy_feedback) - false_positive_rho0) / denom
    return {
        "halted": False,
        "q_trace": float(q_val),
        "unbiased_surrogate_reward": float(surrogate),
        "forward_weight": float(denom),
    }


def eq06_gsn06_pit_asof_join_and_fleet_routing(
    records: Sequence[Mapping[str, Any]],
    kickoff_utc: datetime,
    *,
    cutoff_seconds: float = 0.0,
    gsap_time_seconds: float = 1.0,
) -> Dict[str, Any]:
    """Master Eq. 06 [GSN-06 & GSN-03]: Fail-Closed Point-in-Time Join & Frame-Sync Tick.

    Source: Google_Drive_18_Native_GDoc_Equations_Master (16yGdnBQ5GTiYY5WLyz3lxpspMAbzlkXm1WC4BeH7h-k).
    """
    if kickoff_utc.tzinfo is None:
        kickoff_utc = kickoff_utc.replace(tzinfo=timezone.utc)
    deadline = kickoff_utc.timestamp() - cutoff_seconds

    best_rec: Optional[Mapping[str, Any]] = None
    best_ts = -float("inf")
    for row in records:
        raw_ts = row.get("observed_at")
        if raw_ts is None:
            continue
        s = str(raw_ts).strip()
        if not s or s in ("NA", "None", "null"):
            continue
        try:
            dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
        except ValueError:
            continue
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        ts_val = dt.timestamp()
        if ts_val <= deadline and ts_val >= best_ts:
            best_ts = ts_val
            best_rec = row

    return {
        "matched_record": best_rec,
        "join_passed": best_rec is not None,
        "lenis_raf_ms": float(gsap_time_seconds * 1000.0),
    }


def eq07_gsn07_glicko2_illinois_update(
    rating: float,
    rd: float,
    sigma: float,
    opponents: Sequence[Tuple[float, float, float]],
    *,
    tau: float = 0.5,
    eps: float = 1e-6,
) -> Dict[str, float]:
    """Master Eq. 07 [GSN-07]: Full Double-Precision Glicko-2 Rating & Illinois Volatility Solver.

    Source: Google_Drive_18_Native_GDoc_Equations_Master (16yGdnBQ5GTiYY5WLyz3lxpspMAbzlkXm1WC4BeH7h-k).
    """
    scale = 173.7178
    mu = (rating - 1500.0) / scale
    phi = rd / scale

    if len(opponents) == 0:
        phi_idle = math.hypot(phi, sigma)
        return {
            "rating": float(rating),
            "rd": float(scale * phi_idle),
            "sigma": float(sigma),
            "iterations": 0.0,
        }

    def _g(phi_j: float) -> float:
        return 1.0 / math.sqrt(1.0 + 3.0 * (phi_j ** 2) / (math.pi ** 2))

    v_inv = 0.0
    delta_sum = 0.0
    for r_j, rd_j, s_j in opponents:
        mu_j = (r_j - 1500.0) / scale
        phi_j = rd_j / scale
        g_j = _g(phi_j)
        E_j = 1.0 / (1.0 + math.exp(-g_j * (mu - mu_j)))
        v_inv += (g_j ** 2) * E_j * (1.0 - E_j)
        delta_sum += g_j * (s_j - E_j)

    v = 1.0 / v_inv
    Delta = v * delta_sum
    a = math.log(sigma ** 2)

    def _f(x: float) -> float:
        ex = math.exp(x)
        denom = phi ** 2 + v + ex
        return (ex * (Delta ** 2 - phi ** 2 - v - ex)) / (2.0 * (denom ** 2)) - (x - a) / (tau ** 2)

    A = a
    if Delta ** 2 > phi ** 2 + v:
        B = math.log(Delta ** 2 - phi ** 2 - v)
    else:
        k = 1
        while _f(a - k * tau) < 0.0 and k < 200:
            k += 1
        B = a - k * tau

    fA = _f(A)
    fB = _f(B)
    iters = 0
    while abs(B - A) > eps and iters < 200:
        C = A + (A - B) * fA / (fB - fA)
        fC = _f(C)
        if fC * fB <= 0.0:
            A = B
            fA = fB
        else:
            fA = 0.5 * fA
        B = C
        fB = fC
        iters += 1

    sigma_prime = math.exp(A / 2.0)
    phi_star = math.hypot(phi, sigma_prime)
    phi_prime = 1.0 / math.sqrt(1.0 / (phi_star ** 2) + 1.0 / v)
    mu_prime = mu + (phi_prime ** 2) * delta_sum

    return {
        "rating": float(scale * mu_prime + 1500.0),
        "rd": float(scale * phi_prime),
        "sigma": float(sigma_prime),
        "v": float(v),
        "delta": float(Delta),
        "iterations": float(iters),
    }


def eq08_gsn08_idle_rd_and_conjugate_shin_devig(
    rd: float,
    sigma: float,
    idle_periods: int,
    decimal_odds: Sequence[float],
) -> Dict[str, Any]:
    """Master Eq. 08 [GSN-08]: Idle-Period RD Inflation & Conjugate-Rationalized Shin Devig.

    Source: Google_Drive_18_Native_GDoc_Equations_Master (16yGdnBQ5GTiYY5WLyz3lxpspMAbzlkXm1WC4BeH7h-k).
    """
    scale = 173.7178
    phi = rd / scale
    phi_m = math.sqrt(phi ** 2 + float(idle_periods) * (sigma ** 2))
    rd_inflated = scale * phi_m

    odds = np.asarray(decimal_odds, dtype=np.float64)
    if np.any(odds <= 1.0) or odds.shape[0] < 2:
        raise ValueError("decimal_odds must have >= 2 entries all strictly > 1.0.")
    q = 1.0 / odds
    B = float(np.sum(q))
    if B <= 1.0 + 1e-12:
        probs = q / B
        return {"inflated_rd": float(rd_inflated), "shin_z": 0.0, "fair_probs": probs, "booksum": B}

    def _shin_probs(z: float) -> np.ndarray:
        q2_over_B = (q ** 2) / B
        rad = np.sqrt(z * z + 4.0 * (1.0 - z) * q2_over_B)
        return (2.0 * q2_over_B) / (z + rad)

    z_star = float(
        optimize.brentq(lambda z: float(np.sum(_shin_probs(z)) - 1.0), 1e-12, 1.0 - 1e-12, xtol=1e-13)
    )
    fair_probs = _shin_probs(z_star)
    fair_probs = fair_probs / np.sum(fair_probs)
    return {
        "inflated_rd": float(rd_inflated),
        "shin_z": z_star,
        "fair_probs": fair_probs,
        "booksum": B,
    }


def eq09_root09_sinkhorn_knopp_ipf(
    seed_matrix: np.ndarray,
    row_targets: np.ndarray,
    col_targets: np.ndarray,
    *,
    max_iter: int = 100,
    tol: float = 1e-14,
) -> Tuple[np.ndarray, float, int]:
    """Master Eq. 09 [ROOT-09]: Sinkhorn-Knopp / Iterative Proportional Fitting Coupling.

    Source: Google_Drive_18_Native_GDoc_Equations_Master (16yGdnBQ5GTiYY5WLyz3lxpspMAbzlkXm1WC4BeH7h-k).
    """
    M = np.asarray(seed_matrix, dtype=np.float64).copy()
    r = np.asarray(row_targets, dtype=np.float64)
    c = np.asarray(col_targets, dtype=np.float64)
    if np.any(M <= 0.0):
        raise ValueError("seed_matrix entries must be strictly positive.")
    if abs(float(np.sum(r)) - float(np.sum(c))) > 1e-8:
        raise ValueError("row_targets and col_targets must have equal total sum.")

    err = float("inf")
    iters = 0
    for it in range(1, max_iter + 1):
        row_sums = np.sum(M, axis=1)
        M = M * (r / np.maximum(row_sums, 1e-300))[:, None]
        col_sums = np.sum(M, axis=0)
        M = M * (c / np.maximum(col_sums, 1e-300))[None, :]
        err = float(
            max(
                np.max(np.abs(np.sum(M, axis=1) - r)),
                np.max(np.abs(np.sum(M, axis=0) - c)),
            )
        )
        iters = it
        if err <= tol:
            break
    return M, err, iters


def eq10_root10_grpo_proper_scoring_advantage(
    trajectory_crps_losses: Sequence[float],
    *,
    eps: float = 1e-8,
) -> Dict[str, np.ndarray]:
    """Master Eq. 10 [ROOT-10]: Online Test-Time GRPO Advantage over Proper Scoring Rewards.

    Source: Google_Drive_18_Native_GDoc_Equations_Master (16yGdnBQ5GTiYY5WLyz3lxpspMAbzlkXm1WC4BeH7h-k).
    """
    losses = np.asarray(trajectory_crps_losses, dtype=np.float64)
    if losses.ndim != 1 or losses.shape[0] < 2:
        raise ValueError("Require at least 2 trajectory losses for GRPO normalization.")
    rewards = -losses
    mean_r = float(np.mean(rewards))
    std_r = float(np.std(rewards, ddof=0))
    advantages = (rewards - mean_r) / (std_r + eps)
    return {"rewards": rewards, "advantages": advantages}


def eq11_root11_positive_part_james_stein(
    delta_cross: np.ndarray,
    sigma_boot_cov: np.ndarray,
    *,
    max_abs_log_odds_clamp: float = 0.35,
    eps: float = 1e-12,
) -> Tuple[np.ndarray, float]:
    """Master Eq. 11 [ROOT-11 & ROOT-12]: Positive-Part James-Stein Shrinkage + Stage D Clamp.

    Source: Google_Drive_18_Native_GDoc_Equations_Master (16yGdnBQ5GTiYY5WLyz3lxpspMAbzlkXm1WC4BeH7h-k).
    """
    d = np.asarray(delta_cross, dtype=np.float64)
    cov = np.asarray(sigma_boot_cov, dtype=np.float64)
    m = int(d.shape[0])
    if m < 3:
        raise ValueError("James-Stein shrinkage requires dimension m >= 3.")
    if cov.shape != (m, m):
        raise ValueError("sigma_boot_cov must have shape (m, m).")
    norm_sq = float(np.dot(d, d))
    shrinkage_factor = max(0.0, 1.0 - ((m - 2.0) * float(np.trace(cov))) / (norm_sq + eps))
    shrunk = shrinkage_factor * d
    shrunk_clamped = np.clip(shrunk, -max_abs_log_odds_clamp, max_abs_log_odds_clamp)
    return shrunk_clamped, float(shrinkage_factor)


def eq12_root12_layer2_price_and_coupled_interaction(
    p_slip: float,
    p_read: float,
    effective_weights: np.ndarray,
    feature_deltas: np.ndarray,
    interaction_gamma: np.ndarray,
    game_hessian: np.ndarray,
    ancestor_reliabilities: Sequence[Sequence[float]],
    *,
    tau_conformal: float = 0.25,
) -> Dict[str, Any]:
    """Master Eq. 12 [ROOT-12]: Layer-2 Price Rule, 2nd-Order Coupled Taylor & ITCR Graph Gate.

    Source: Google_Drive_18_Native_GDoc_Equations_Master (16yGdnBQ5GTiYY5WLyz3lxpspMAbzlkXm1WC4BeH7h-k).
    """
    w = np.asarray(effective_weights, dtype=np.float64)
    dx = np.asarray(feature_deltas, dtype=np.float64)
    gamma = np.asarray(interaction_gamma, dtype=np.float64)
    H_game = np.asarray(game_hessian, dtype=np.float64)

    linear_term = float(np.dot(w, dx))
    quad_mat = gamma * H_game * np.outer(w * dx, w * dx)
    np.fill_diagonal(quad_mat, 0.0)
    delta_y_coupled = linear_term + 0.5 * float(np.sum(quad_mat))

    node_risks = [1.0 - float(np.prod(np.asarray(anc, dtype=np.float64))) for anc in ancestor_reliabilities]
    alpha_itcr = max(node_risks) if node_risks else 0.0

    return {
        "delta_price": float(p_read - p_slip),
        "delta_y_coupled": delta_y_coupled,
        "alpha_itcr": float(alpha_itcr),
        "itcr_passed": bool(alpha_itcr <= tau_conformal),
    }


def eq13_root13_draftkings_classic_and_negbin_td(
    *,
    pass_yds: float = 0.0,
    pass_tds: int = 0,
    interceptions: int = 0,
    rush_yds: float = 0.0,
    rush_tds: int = 0,
    receptions: int = 0,
    rec_yds: float = 0.0,
    rec_tds: int = 0,
    two_pt_conversions: int = 0,
    fumbles_lost: int = 0,
    return_tds: int = 0,
    td_mean_mu: float = 0.8,
    td_dispersion_r: float = 0.92,
    td_count_d: int = 1,
) -> Dict[str, float]:
    """Master Eq. 13 [ROOT-13]: Exact DraftKings NFL Classic Scoring & Negative Binomial TD Tail.

    Source: Google_Drive_18_Native_GDoc_Equations_Master (16yGdnBQ5GTiYY5WLyz3lxpspMAbzlkXm1WC4BeH7h-k).
    """
    fpts = (
        0.04 * pass_yds
        + (3.0 if pass_yds >= 300.0 else 0.0)
        + 4.0 * pass_tds
        - 1.0 * interceptions
        + 0.10 * rush_yds
        + (3.0 if rush_yds >= 100.0 else 0.0)
        + 6.0 * rush_tds
        + 1.0 * receptions
        + 0.10 * rec_yds
        + (3.0 if rec_yds >= 100.0 else 0.0)
        + 6.0 * rec_tds
        + 2.0 * two_pt_conversions
        - 1.0 * fumbles_lost
        + 6.0 * return_tds
    )
    log_pmf = (
        special.gammaln(td_count_d + td_dispersion_r)
        - special.gammaln(td_count_d + 1.0)
        - special.gammaln(td_dispersion_r)
        + td_dispersion_r * math.log(td_dispersion_r / (td_dispersion_r + td_mean_mu))
        + td_count_d * math.log(td_mean_mu / (td_dispersion_r + td_mean_mu))
    )
    td_var = td_mean_mu + (td_mean_mu ** 2) / td_dispersion_r
    return {
        "dk_fpts": float(fpts),
        "negbin_td_pmf": float(math.exp(log_pmf)),
        "negbin_td_variance": float(td_var),
    }


def eq14_root14_observational_audio_consensus_filter(
    claims: Sequence[Mapping[str, Any]],
    kickoff_utc: datetime,
    locked_market_close_mu: float,
    *,
    unit_dollar_standard: float = 5.0,
) -> Dict[str, Any]:
    """Master Eq. 14 [ROOT-14 & ROOT-16]: Observational Audio/Slip Stream PIT Consensus Isolator.

    Source: Google_Drive_18_Native_GDoc_Equations_Master (16yGdnBQ5GTiYY5WLyz3lxpspMAbzlkXm1WC4BeH7h-k).
    """
    if kickoff_utc.tzinfo is None:
        kickoff_utc = kickoff_utc.replace(tzinfo=timezone.utc)
    valid_units_home = 0.0
    valid_units_away = 0.0
    dropped_late_or_unstamped = 0

    for item in claims:
        res = eq06_gsn06_pit_asof_join_and_fleet_routing([item], kickoff_utc)
        if not res["join_passed"]:
            dropped_late_or_unstamped += 1
            continue
        dollars = float(item.get("dollars_staked", unit_dollar_standard))
        units = dollars / unit_dollar_standard
        side = str(item.get("side", "")).lower()
        if side == "home":
            valid_units_home += units
        elif side == "away":
            valid_units_away += units

    total_units = valid_units_home + valid_units_away
    home_ticket_share = (valid_units_home / total_units) if total_units > 0.0 else 0.5
    return {
        "locked_mu_close": float(locked_market_close_mu),
        "valid_units_home": float(valid_units_home),
        "valid_units_away": float(valid_units_away),
        "retail_home_share": float(home_ticket_share),
        "dropped_claims": dropped_late_or_unstamped,
    }


def eq15_root15_mahler_volume_and_doctrine_gate(
    box_half_widths: np.ndarray,
    operator_a: np.ndarray,
    operator_b: np.ndarray,
    *,
    frozen_walk_forward_crps_delta: float,
    conformal_ess_c_hat: float,
    wasserstein_shift_w1: float,
    james_stein_max_abs_log_odds: float,
    circulation_residual: float = 0.0,
) -> Dict[str, Any]:
    """Master Eq. 15 [ROOT-15]: Mahler Volume Product, Non-Commutative Braid & 5-Gate Proof Verifier.

    Source: Google_Drive_18_Native_GDoc_Equations_Master (16yGdnBQ5GTiYY5WLyz3lxpspMAbzlkXm1WC4BeH7h-k).
    """
    widths = np.asarray(box_half_widths, dtype=np.float64)
    if np.any(widths <= 0.0):
        raise ValueError("box_half_widths must be strictly positive.")
    d = int(widths.shape[0])
    vol_k = float((2.0 ** d) * np.prod(widths))
    vol_polar = float((2.0 ** d) / (math.factorial(d) * np.prod(widths)))
    mahler_product = vol_k * vol_polar

    commutator_norm = float(np.linalg.norm(operator_a @ operator_b - operator_b @ operator_a, ord="fro"))

    violations: List[str] = []
    if frozen_walk_forward_crps_delta >= 0.0:
        violations.append(f"crps_delta_not_negative:{frozen_walk_forward_crps_delta:.4f}")
    if conformal_ess_c_hat > 12.42:
        violations.append(f"ess_c_hat_exceeded:{conformal_ess_c_hat:.4f}")
    if wasserstein_shift_w1 > 0.08:
        violations.append(f"wasserstein_w1_exceeded:{wasserstein_shift_w1:.4f}")
    if james_stein_max_abs_log_odds > 0.35:
        violations.append(f"james_stein_clamp_exceeded:{james_stein_max_abs_log_odds:.4f}")
    if circulation_residual > 1e-6:
        violations.append(f"circulation_residual_exceeded:{circulation_residual:.2e}")

    return {
        "mahler_volume_product": mahler_product,
        "commutator_frobenius_norm": commutator_norm,
        "gate_passed": len(violations) == 0,
        "violations": tuple(violations),
    }


def eq16_root16_phase_entropy_and_hou_li_filter(
    phases_rad: np.ndarray,
    wavenumbers_k: np.ndarray,
    grid_resolution_n: int,
) -> Dict[str, Any]:
    """Master Eq. 16 [ROOT-16]: 16-Bin Circular Phase Histogram Entropy & Hou-Li 36th-Order Filter.

    Source: Google_Drive_18_Native_GDoc_Equations_Master (16yGdnBQ5GTiYY5WLyz3lxpspMAbzlkXm1WC4BeH7h-k).
    """
    wrapped = np.mod(np.asarray(phases_rad, dtype=np.float64), 2.0 * math.pi)
    counts, _ = np.histogram(wrapped, bins=16, range=(0.0, 2.0 * math.pi))
    total = float(np.sum(counts))
    probs = counts / max(total, 1.0)
    nz = probs[probs > 0.0]
    s_phase = float(-np.sum(nz * np.log(nz)))

    k_arr = np.asarray(wavenumbers_k, dtype=np.float64)
    hou_li = np.exp(-36.0 * ((2.0 * np.abs(k_arr) / float(grid_resolution_n)) ** 36))
    return {"s_phase_16bin": s_phase, "hou_li_filter": hou_li}


def eq17_root17_cellular_sheaf_laplacian_and_ollivier_ricci(
    node_stalks: Sequence[np.ndarray],
    edges_and_restrictions: Sequence[Tuple[int, int, np.ndarray, np.ndarray]],
    phases_rad: np.ndarray,
    *,
    mu_u: Optional[np.ndarray] = None,
    mu_v: Optional[np.ndarray] = None,
    support_metric: Optional[np.ndarray] = None,
    edge_distance: float = 1.0,
) -> Dict[str, Any]:
    """Master Eq. 17 [ROOT-17]: Cellular Sheaf Laplacian Consistency, Ollivier-Ricci & Phase R.

    Source: Google_Drive_18_Native_GDoc_Equations_Master (16yGdnBQ5GTiYY5WLyz3lxpspMAbzlkXm1WC4BeH7h-k).
    """
    stalk_dims = [int(np.asarray(s).shape[0]) for s in node_stalks]
    offsets = np.cumsum([0] + stalk_dims)
    total_dim = int(offsets[-1])
    x_concat = np.concatenate([np.asarray(s, dtype=np.float64) for s in node_stalks])

    coboundary_blocks: List[np.ndarray] = []
    for u, v, F_u, F_v in edges_and_restrictions:
        F_u_mat = np.asarray(F_u, dtype=np.float64)
        F_v_mat = np.asarray(F_v, dtype=np.float64)
        edge_dim = F_u_mat.shape[0]
        row_blk = np.zeros((edge_dim, total_dim), dtype=np.float64)
        row_blk[:, offsets[u] : offsets[u + 1]] = F_u_mat
        row_blk[:, offsets[v] : offsets[v + 1]] = -F_v_mat
        coboundary_blocks.append(row_blk)

    delta_op = np.vstack(coboundary_blocks) if coboundary_blocks else np.zeros((0, total_dim))
    L_sheaf = delta_op.T @ delta_op
    disagreement_energy = float(x_concat.T @ L_sheaf @ x_concat)

    kappa_or: Optional[float] = None
    if mu_u is not None and mu_v is not None and support_metric is not None:
        p = np.asarray(mu_u, dtype=np.float64)
        q = np.asarray(mu_v, dtype=np.float64)
        C = np.asarray(support_metric, dtype=np.float64)
        n_sup = p.shape[0]
        c_vec = C.reshape(-1)
        A_eq = np.zeros((2 * n_sup, n_sup * n_sup), dtype=np.float64)
        for i in range(n_sup):
            A_eq[i, i * n_sup : (i + 1) * n_sup] = 1.0
            A_eq[n_sup + i, i::n_sup] = 1.0
        b_eq = np.concatenate([p, q])
        lp = optimize.linprog(c_vec, A_eq=A_eq[:-1], b_eq=b_eq[:-1], bounds=(0.0, None), method="highs")
        w1 = float(lp.fun) if lp.success else float("nan")
        kappa_or = 1.0 - w1 / max(edge_distance, 1e-12)

    th = np.asarray(phases_rad, dtype=np.float64)
    resultant_R = float(np.abs(np.mean(np.exp(1j * th))))

    return {
        "sheaf_laplacian": L_sheaf,
        "sheaf_disagreement_energy": disagreement_energy,
        "ollivier_ricci_curvature": kappa_or,
        "phase_resultant_R": resultant_R,
    }


def eq18_root18_cluster_james_stein_and_schur_damping(
    player_estimates: np.ndarray,
    cluster_ids: Sequence[int],
    sample_variance: float,
    covariance_matrix: np.ndarray,
    *,
    schur_lambda: float = 0.5,
) -> Dict[str, Any]:
    """Master Eq. 18 [ROOT-18]: Cluster-Seeking James-Stein Shrinkage & Cotton Schur Damping.

    Source: Google_Drive_18_Native_GDoc_Equations_Master (16yGdnBQ5GTiYY5WLyz3lxpspMAbzlkXm1WC4BeH7h-k).
    """
    x = np.asarray(player_estimates, dtype=np.float64)
    c_ids = np.asarray(cluster_ids, dtype=int)
    shrunk = x.copy()
    for cid in np.unique(c_ids):
        mask = c_ids == cid
        group = x[mask]
        k = int(group.shape[0])
        mean_c = float(np.mean(group))
        if k >= 4:
            ss = float(np.sum((group - mean_c) ** 2))
            factor = max(0.0, 1.0 - ((k - 3.0) * sample_variance) / max(ss, 1e-12))
            shrunk[mask] = mean_c + factor * (group - mean_c)
        elif k >= 2:
            shrunk[mask] = 0.5 * group + 0.5 * mean_c

    Sigma = np.asarray(covariance_matrix, dtype=np.float64)
    lam = max(0.0, min(1.0, float(schur_lambda)))
    diag_part = np.diag(np.diag(Sigma))
    sigma_damped = (1.0 - lam) * diag_part + lam * Sigma
    return {"cluster_shrunk_estimates": shrunk, "schur_damped_covariance": sigma_damped}


MASTER_18_EQUATIONS_REGISTRY: Dict[str, Callable[..., Any]] = {
    "GSN-01": eq01_gsn01_planar_homography_projection,
    "GSN-02": eq02_gsn02_kinematic_curvature_and_normalized_jerk,
    "GSN-03": eq03_gsn03_locked_mean_crps_gaussian_and_laplace,
    "GSN-04": eq04_gsn04_conformal_cqr_and_jackknife_plus,
    "GSN-05": eq05_gsn05_bellman_q_decay_and_surrogate_reward,
    "GSN-06": eq06_gsn06_pit_asof_join_and_fleet_routing,
    "GSN-07": eq07_gsn07_glicko2_illinois_update,
    "GSN-08": eq08_gsn08_idle_rd_and_conjugate_shin_devig,
    "ROOT-09": eq09_root09_sinkhorn_knopp_ipf,
    "ROOT-10": eq10_root10_grpo_proper_scoring_advantage,
    "ROOT-11": eq11_root11_positive_part_james_stein,
    "ROOT-12": eq12_root12_layer2_price_and_coupled_interaction,
    "ROOT-13": eq13_root13_draftkings_classic_and_negbin_td,
    "ROOT-14": eq14_root14_observational_audio_consensus_filter,
    "ROOT-15": eq15_root15_mahler_volume_and_doctrine_gate,
    "ROOT-16": eq16_root16_phase_entropy_and_hou_li_filter,
    "ROOT-17": eq17_root17_cellular_sheaf_laplacian_and_ollivier_ricci,
    "ROOT-18": eq18_root18_cluster_james_stein_and_schur_damping,
}


# =============================================================================
# SECTION 4: EDGE#1b KEY-NUMBER HYBRID + EDGE#2 OVERTIME BIMODAL MIXTURE
#            & LOCKED-MEAN CRPS <= 7.099 HARD GATE EVALUATOR
# Source: 1kdaACWX4TJDkviugVgA8XxA2cF1rvbN04Xd6vJBQcHo & GSN-01 / GSN-03
# =============================================================================

@dataclass(frozen=True)
class Edge1b2HybridDistribution:
    """Locked-mean discrete-continuous NFL margin hybrid + EDGE#2 overtime mixture."""

    mu_close: float
    total_line: float
    sigma_cell: float
    b_cont: float
    mu_cont: float
    w_cont: float
    w_ot: float
    ot_fav_prob: float
    ot_mode_pos_mean: float
    ot_mode_neg_mean: float
    ot_mode_sd: float
    discrete_atoms: Dict[int, float] = field(default_factory=dict)

    def expected_value(self) -> float:
        disc_mean = sum(float(k) * p for k, p in self.discrete_atoms.items())
        ot_mean = self.ot_fav_prob * self.ot_mode_pos_mean + (1.0 - self.ot_fav_prob) * self.ot_mode_neg_mean
        return self.w_cont * self.mu_cont + disc_mean + self.w_ot * ot_mean

    def cdf_array(self, xs: np.ndarray) -> np.ndarray:
        """Vectorized right-continuous CDF F(x) = P(M <= x) across NumPy array xs."""
        x_arr = np.asarray(xs, dtype=np.float64)
        diff = x_arr - self.mu_cont
        lap = np.where(
            diff < 0.0,
            0.5 * np.exp(diff / self.b_cont),
            1.0 - 0.5 * np.exp(-diff / self.b_cont),
        )
        inv_sqrt2 = 1.0 / math.sqrt(2.0)
        c_pos = 0.5 * (1.0 + special.erf((x_arr - self.ot_mode_pos_mean) / self.ot_mode_sd * inv_sqrt2))
        c_neg = 0.5 * (1.0 + special.erf((x_arr - self.ot_mode_neg_mean) / self.ot_mode_sd * inv_sqrt2))
        val = self.w_cont * lap + self.w_ot * (self.ot_fav_prob * c_pos + (1.0 - self.ot_fav_prob) * c_neg)
        for k, pk in self.discrete_atoms.items():
            val = val + np.where(x_arr >= float(k), pk, 0.0)
        return np.clip(val, 0.0, 1.0)

    def cdf(self, x: float) -> float:
        return float(self.cdf_array(np.array([x], dtype=np.float64))[0])

    def point_mass_at(self, x: float) -> float:
        nearest_int = int(round(x))
        if abs(x - float(nearest_int)) <= 1e-12:
            return float(self.discrete_atoms.get(nearest_int, 0.0))
        return 0.0

    def cdf_left_limit(self, x: float) -> float:
        return max(0.0, self.cdf(x) - self.point_mass_at(x))

    def allocate_spread_probabilities(self, listed_home_spread: float) -> Dict[str, float]:
        target = -float(listed_home_spread)
        p_leq = self.cdf(target)
        p_push = self.point_mass_at(target)
        p_less = max(0.0, p_leq - p_push)
        p_home_cover = max(0.0, 1.0 - p_leq)
        p_away_cover = p_less
        return {
            "target_margin": target,
            "p_home_cover": p_home_cover,
            "p_push": p_push,
            "p_away_cover": p_away_cover,
            "prob_sum": p_home_cover + p_push + p_away_cover,
        }


def build_edge1b_edge2_hybrid_distribution(
    mu_close: float,
    total_line: float = 44.5,
) -> Edge1b2HybridDistribution:
    """Construct the EDGE#1b (855-game T x S key-number) + EDGE#2 (OT bimodal) hybrid.

    Source: 1kdaACWX4TJDkviugVgA8XxA2cF1rvbN04Xd6vJBQcHo & 1gmnDbtS7qA-7ZvJqnoGGbC3tKO4zFgizEnD6REiFI8k.
    """
    S = abs(float(mu_close))
    T_clamped = max(34.0, min(58.0, float(total_line)))
    t_norm = (T_clamped - 34.0) / 24.0
    s_norm = min(S / 16.0, 1.0)

    sigma_cell = max(10.0, min(13.7, 10.0 + 2.3 * t_norm + 1.4 * s_norm))

    tightness = math.exp(-((S - 3.0) ** 2) / 36.0)
    fg_regime = 1.0 - 0.55 * t_norm
    m3_total = max(0.08, min(0.26, 0.085 + 0.145 * tightness * fg_regime))

    td_tightness = math.exp(-((S - 7.0) ** 2) / 49.0)
    m7_total = max(0.00, min(0.14, 0.035 + 0.095 * (0.45 + 0.55 * t_norm) * td_tightness))

    m6_total = 0.038 * math.exp(-((S - 6.0) ** 2) / 64.0)
    m10_total = 0.042 * math.exp(-((S - 10.0) ** 2) / 81.0)
    m14_total = 0.036 * math.exp(-((S - 14.0) ** 2) / 100.0)

    p_ot = max(0.045, min(0.074, 0.045 + 0.029 * math.exp(-((S / 6.5) ** 2))))
    p_tie = p_ot * 0.095
    w_ot_resolved = p_ot - p_tie

    b_ref = sigma_cell / math.sqrt(2.0)
    atoms: Dict[int, float] = {0: p_tie}
    for k, mass_k in ((3, m3_total), (7, m7_total), (6, m6_total), (10, m10_total), (14, m14_total)):
        w_pos = math.exp(-abs(float(k) - mu_close) / b_ref)
        w_neg = math.exp(-abs(float(-k) - mu_close) / b_ref)
        denom = w_pos + w_neg
        atoms[k] = mass_k * (w_pos / denom)
        atoms[-k] = mass_k * (w_neg / denom)

    w_disc = sum(atoms.values())
    w_cont = 1.0 - w_disc - w_ot_resolved
    if w_cont <= 0.15:
        scale_down = 0.78 / (w_disc + w_ot_resolved)
        atoms = {k: v * scale_down for k, v in atoms.items()}
        w_ot_resolved *= scale_down
        w_disc = sum(atoms.values())
        w_cont = 1.0 - w_disc - w_ot_resolved

    fav_sign = 1.0 if mu_close >= 0.0 else -1.0
    fav_ot_win_rate = 0.50 + 0.211 * math.tanh(S / 2.5)
    ot_pos_prob = fav_ot_win_rate if fav_sign > 0.0 else (1.0 - fav_ot_win_rate)

    ot_lobe_mean = 4.5
    ot_lobe_sd = 1.9

    disc_mean = sum(float(k) * pk for k, pk in atoms.items())
    ot_mean = ot_pos_prob * ot_lobe_mean + (1.0 - ot_pos_prob) * (-ot_lobe_mean)
    mu_cont = (float(mu_close) - disc_mean - w_ot_resolved * ot_mean) / w_cont
    b_cont = (0.86 * sigma_cell) / math.sqrt(2.0)

    return Edge1b2HybridDistribution(
        mu_close=float(mu_close),
        total_line=float(total_line),
        sigma_cell=sigma_cell,
        b_cont=b_cont,
        mu_cont=mu_cont,
        w_cont=w_cont,
        w_ot=w_ot_resolved,
        ot_fav_prob=ot_pos_prob,
        ot_mode_pos_mean=ot_lobe_mean,
        ot_mode_neg_mean=-ot_lobe_mean,
        ot_mode_sd=ot_lobe_sd,
        discrete_atoms=atoms,
    )


def edge2_overtime_total_injection_moments(
    regulation_tied_total: float,
    p_ot: float,
) -> Dict[str, float]:
    """Compute EDGE#2 overtime game-total points injection (+5.2 +/- 2.9 pts in OT).

    Source: 1kdaACWX4TJDkviugVgA8XxA2cF1rvbN04Xd6vJBQcHo, Panel 3.
    """
    ot_mean_add = 5.2
    ot_sd_add = 2.9
    expected_total_shift = p_ot * ot_mean_add
    ot_variance_contribution = p_ot * (ot_sd_add ** 2) + p_ot * (1.0 - p_ot) * (ot_mean_add ** 2)
    return {
        "conditional_ot_total_mean": regulation_tied_total + ot_mean_add,
        "conditional_ot_total_sd": ot_sd_add,
        "unconditional_total_mean_lift": expected_total_shift,
        "unconditional_total_var_lift": ot_variance_contribution,
    }


_GL_NODES_32, _GL_WEIGHTS_32 = np.polynomial.legendre.leggauss(32)


def compute_exact_piecewise_crps(
    dist_or_cdf: Edge1b2HybridDistribution | Callable[[float], float],
    y_observed: float,
    *,
    breakpoints: Sequence[float] = (-14.0, -10.0, -7.0, -6.0, -3.0, 0.0, 3.0, 6.0, 7.0, 10.0, 14.0),
    lower_bound: float = -95.0,
    upper_bound: float = 95.0,
) -> float:
    """Compute CRPS(F, y) = integral_{-inf}^{inf} (F(x) - 1{y <= x})^2 dx via exact
    piecewise 32-point Gauss-Legendre quadrature split at every discrete atom and y.

    Source: 1kdaACWX4TJDkviugVgA8XxA2cF1rvbN04Xd6vJBQcHo & GSN-03.
    """
    lo = min(lower_bound, y_observed - 75.0)
    hi = max(upper_bound, y_observed + 75.0)
    knots = np.array(
        sorted({lo, hi, float(y_observed), *[float(b) for b in breakpoints if lo < b < hi]}),
        dtype=np.float64,
    )
    a_vec = knots[:-1]
    b_vec = knots[1:]
    valid = (b_vec - a_vec) > 1e-14
    a_vec = a_vec[valid]
    b_vec = b_vec[valid]

    half = 0.5 * (b_vec - a_vec)
    mid = 0.5 * (a_vec + b_vec)
    xs_2d = mid[:, None] + half[:, None] * _GL_NODES_32[None, :]
    indicators = np.where(mid >= y_observed, 1.0, 0.0)[:, None]

    if isinstance(dist_or_cdf, Edge1b2HybridDistribution):
        f_vals = dist_or_cdf.cdf_array(xs_2d)
    else:
        flat_x = xs_2d.reshape(-1)
        f_vals = np.array([dist_or_cdf(float(v)) for v in flat_x], dtype=np.float64).reshape(xs_2d.shape)

    integrand = (f_vals - indicators) ** 2
    sub_integrals = half * (integrand @ _GL_WEIGHTS_32)
    return float(np.sum(sub_integrals))


@dataclass(frozen=True)
class LockedMeanCRPSGateReport:
    """Constitutional emission gate evaluation under GALAXY_LOCKED_STATE."""

    n_games: int
    mean_crps: float
    gaussian_baseline_crps: float
    crps_improvement_vs_gaussian: float
    max_locked_mean_drift: float
    passed: bool
    emission_payload: Dict[str, Any]


def evaluate_locked_mean_crps_gate(
    distributions: Sequence[Edge1b2HybridDistribution],
    observed_margins: Sequence[float],
    *,
    crps_gate_threshold: float = HARD_GATE_CRPS_THRESHOLD,
    min_games_gate: int = HARD_GATE_MIN_GAMES,
    mean_lock_tol: float = 1e-9,
) -> LockedMeanCRPSGateReport:
    """Evaluate a slate of locked-mean hybrid distributions against CRPS <= 7.099 (n >= 150).

    Source: 1kdaACWX4TJDkviugVgA8XxA2cF1rvbN04Xd6vJBQcHo (GALAXY_LOCKED_STATE) & GSN-03.
    """
    n = len(distributions)
    if n != len(observed_margins) or n == 0:
        raise ValueError("distributions and observed_margins must be non-empty and equal length.")

    hybrid_scores: List[float] = []
    gauss_scores: List[float] = []
    mean_drifts: List[float] = []

    for dist, y_obs in zip(distributions, observed_margins):
        drift = abs(dist.expected_value() - dist.mu_close)
        mean_drifts.append(drift)
        if drift > mean_lock_tol:
            raise AssertionError(
                f"Locked-mean violation: |E[M] - mu_close| = {drift:.3e} > {mean_lock_tol:.3e}"
            )
        hybrid_scores.append(compute_exact_piecewise_crps(dist, float(y_obs)))
        g_res = eq03_gsn03_locked_mean_crps_gaussian_and_laplace(
            float(y_obs), dist.mu_close, sigma_gaussian=GAUSSIAN_BASELINE_SIGMA
        )
        gauss_scores.append(g_res["gaussian_crps"])

    mean_hybrid = float(np.mean(hybrid_scores))
    mean_gauss = float(np.mean(gauss_scores))
    max_drift = float(np.max(mean_drifts))
    passed = bool(n >= min_games_gate and mean_hybrid <= crps_gate_threshold and max_drift <= mean_lock_tol)

    emission_payload: Dict[str, Any] = (
        {"passed": True, "status": "ELIGIBLE_FOR_DIAGNOSTIC_REVIEW", "n": n, "mean_crps": mean_hybrid}
        if passed
        else {"passed": False, "picks": [], "parlays": [], "dfs": [], "emission": 0}
    )

    return LockedMeanCRPSGateReport(
        n_games=n,
        mean_crps=mean_hybrid,
        gaussian_baseline_crps=mean_gauss,
        crps_improvement_vs_gaussian=float(mean_gauss - mean_hybrid),
        max_locked_mean_drift=max_drift,
        passed=passed,
        emission_payload=emission_payload,
    )


# =============================================================================
# SECTION 5: KICKOFF-TO-VICTORY-FORMATION QUANTITATIVE NFL PROJECTION EQUATIONS
# Source: Unified Quantitative NFL Projection Architecture
# (file_id: 1gmnDbtS7qA-7ZvJqnoGGbC3tKO4zFgizEnD6REiFI8k)
# =============================================================================

def compute_humid_air_density_and_pressure(
    temp_celsius: float,
    relative_humidity: float,
    elevation_m: float,
    *,
    sea_level_pressure_pa: float = 101325.0,
) -> Dict[str, float]:
    """Compute station pressure P(h), Buck saturation vapor pressure e_sat(T), & humid air density rho.

    Source: Unified Quantitative NFL Projection Architecture (1gmnDbtS7qA-7ZvJqnoGGbC3tKO4zFgizEnD6REiFI8k).
    """
    rh = max(0.0, min(1.0, float(relative_humidity)))
    L = 0.0065
    T0 = 288.15
    g = 9.80665
    M = 0.0289644
    R_star = 8.31446
    R_d = 287.058
    R_v = 461.495

    exponent = (g * M) / (R_star * L)
    p_station = sea_level_pressure_pa * ((1.0 - (L * elevation_m) / T0) ** exponent)
    if temp_celsius >= 0.0:
        e_sat = 611.21 * math.exp((18.678 - temp_celsius / 234.5) * temp_celsius / (257.14 + temp_celsius))
    else:
        e_sat = 611.15 * math.exp((23.036 - temp_celsius / 333.7) * temp_celsius / (279.82 + temp_celsius))

    p_v = rh * e_sat
    p_d = p_station - p_v
    T_K = temp_celsius + 273.15
    rho = p_d / (R_d * T_K) + p_v / (R_v * T_K)
    return {"pressure_pa": float(p_station), "e_sat_pa": float(e_sat), "air_density_kg_m3": float(rho)}


def simulate_prolate_spheroid_ballistics_rk4(
    v0_m_s: np.ndarray,
    wind_m_s: np.ndarray,
    omega_rad_s: np.ndarray,
    ball_axis_unit: np.ndarray,
    air_density_kg_m3: float,
    *,
    cd0: float = 0.19,
    cd90: float = 0.76,
    cl_coeff: float = 0.12,
    dt: float = 0.005,
    target_descent_height_m: float = 0.0,
) -> Dict[str, Any]:
    """Integrate 3D NFL football trajectory via 4th-order Runge-Kutta (RK4) with yaw drag & Magnus lift.

    Source: Unified Quantitative NFL Projection Architecture (1gmnDbtS7qA-7ZvJqnoGGbC3tKO4zFgizEnD6REiFI8k).
    """
    mass = 0.415
    area = 0.0233
    eff_radius_a = 0.086
    g_vec = np.array([0.0, 0.0, -9.80665], dtype=np.float64)

    pos = np.array([0.0, 0.0, 0.0], dtype=np.float64)
    vel = np.asarray(v0_m_s, dtype=np.float64).copy()
    wind = np.asarray(wind_m_s, dtype=np.float64)
    omega = np.asarray(omega_rad_s, dtype=np.float64)
    u_axis = np.asarray(ball_axis_unit, dtype=np.float64)
    u_axis = u_axis / max(float(np.linalg.norm(u_axis)), 1e-12)

    def _accel(v_curr: np.ndarray) -> np.ndarray:
        v_rel = v_curr - wind
        speed_rel = float(np.linalg.norm(v_rel))
        if speed_rel < 1e-9:
            return g_vec
        cos_psi = float(np.clip(np.dot(u_axis, v_rel / speed_rel), -1.0, 1.0))
        sin2_psi = max(0.0, 1.0 - cos_psi * cos_psi)
        cd_psi = cd0 + (cd90 - cd0) * sin2_psi
        f_drag = -0.5 * air_density_kg_m3 * area * cd_psi * speed_rel * v_rel
        f_magnus = cl_coeff * math.pi * air_density_kg_m3 * (eff_radius_a ** 3) * np.cross(omega, v_rel)
        return g_vec + (f_drag + f_magnus) / mass

    t = 0.0
    passed_apex = False
    for _ in range(4000):
        prev_pos = pos.copy()
        k1_v = _accel(vel)
        k1_x = vel
        k2_v = _accel(vel + 0.5 * dt * k1_v)
        k2_x = vel + 0.5 * dt * k1_v
        k3_v = _accel(vel + 0.5 * dt * k2_v)
        k3_x = vel + 0.5 * dt * k2_v
        k4_v = _accel(vel + dt * k3_v)
        k4_x = vel + dt * k3_v

        pos = pos + (dt / 6.0) * (k1_x + 2.0 * k2_x + 2.0 * k3_x + k4_x)
        vel = vel + (dt / 6.0) * (k1_v + 2.0 * k2_v + 2.0 * k3_v + k4_v)
        t += dt
        if vel[2] < 0.0:
            passed_apex = True
        if passed_apex and pos[2] <= target_descent_height_m and prev_pos[2] >= target_descent_height_m:
            frac = (prev_pos[2] - target_descent_height_m) / max(prev_pos[2] - pos[2], 1e-12)
            landing = prev_pos + frac * (pos - prev_pos)
            return {
                "carry_yards": float(landing[0] / YARDS_TO_METERS),
                "lateral_drift_yards": float(landing[1] / YARDS_TO_METERS),
                "hang_time_s": float(t - (1.0 - frac) * dt),
            }

    return {
        "carry_yards": float(pos[0] / YARDS_TO_METERS),
        "lateral_drift_yards": float(pos[1] / YARDS_TO_METERS),
        "hang_time_s": float(t),
    }


def resolve_2026_dynamic_kickoff_spot(
    *,
    kick_from_yardline: int = 35,
    flies_into_endzone_untouched: bool = False,
    bounces_in_landing_zone_into_endzone: bool = False,
    falls_short_of_landing_zone_or_oob: bool = False,
    return_tackled_yardline: int = 29,
) -> Dict[str, Any]:
    """Resolve 2025-2026 NFL Dynamic Kickoff starting field position & scoring regime prior.

    Source: Unified Quantitative NFL Projection Architecture (1gmnDbtS7qA-7ZvJqnoGGbC3tKO4zFgizEnD6REiFI8k).
    """
    if falls_short_of_landing_zone_or_oob:
        spot = 40
        drive_score_prob = 0.5306
    elif flies_into_endzone_untouched:
        spot = 20 if kick_from_yardline == 50 else 35
        drive_score_prob = 0.4946 if spot >= 35 else 0.3364
    elif bounces_in_landing_zone_into_endzone:
        spot = 20
        drive_score_prob = 0.3364
    else:
        spot = int(return_tackled_yardline)
        drive_score_prob = 0.4946 if spot >= 35 else 0.3364
    return {"own_yardline_spot": spot, "pff_drive_scoring_rate_prior": drive_score_prob}


def compute_officiating_penalty_hazard_logit(
    mu_m: float,
    crew_effect_u: float,
    gamma_home: float,
    is_home: float,
    crowd_db: float,
    covariates_x: np.ndarray,
    beta_m: np.ndarray,
    eta_matchup: float = 0.0,
) -> float:
    """Compute hierarchical officiating crew penalty hazard probability pi_{p,c,t}^{(m)}.

    Source: Unified Quantitative NFL Projection Architecture (1gmnDbtS7qA-7ZvJqnoGGbC3tKO4zFgizEnD6REiFI8k).
    """
    logit_val = (
        mu_m
        + crew_effect_u
        + gamma_home * is_home * crowd_db
        + float(np.dot(np.asarray(covariates_x, dtype=np.float64), np.asarray(beta_m, dtype=np.float64)))
        + eta_matchup
    )
    return float(1.0 / (1.0 + math.exp(-logit_val)))


def compute_circadian_performance_index(
    biological_kickoff_hour_24: float,
    time_zones_crossed: float,
    days_post_arrival: float,
    *,
    traveling_eastward: bool = True,
    psi_jet: float = 0.08,
) -> float:
    """Compute Circadian Performance Index CPI_k(t_kick) with directional jet-lag resynchronization.

    Source: Unified Quantitative NFL Projection Architecture (1gmnDbtS7qA-7ZvJqnoGGbC3tKO4zFgizEnD6REiFI8k).
    """
    phi_peak = 17.5
    r_dir = 0.75 if traveling_eastward else 1.15
    osc = math.cos(2.0 * math.pi * (biological_kickoff_hour_24 - phi_peak) / 24.0)
    residual_zones = max(0.0, abs(time_zones_crossed) - max(0.0, days_post_arrival) * r_dir)
    return float(osc - psi_jet * residual_zones)


def compute_catalytic_ep_loss_and_midas_loss(
    epoch_log_probs: Sequence[np.ndarray],
    smooth_gam_probs: np.ndarray,
    model_neutral_log_probs: np.ndarray,
    pred_pos: np.ndarray,
    pred_vel: np.ndarray,
    pred_acc: np.ndarray,
    *,
    tau_cat: float = 0.25,
    dt: float = 0.1,
    lambda_v: float = 0.5,
) -> Dict[str, float]:
    """Compute Catalytic-Prior Debiased EP Loss L_cat & MIDAS 10 Hz Kinematic Loss L_MIDAS.

    Source: Unified Quantitative NFL Projection Architecture (1gmnDbtS7qA-7ZvJqnoGGbC3tKO4zFgizEnD6REiFI8k).
    """
    emp_term = -sum(float(np.mean(lp)) for lp in epoch_log_probs)
    cat_term = -(tau_cat / float(smooth_gam_probs.shape[0])) * float(
        np.sum(smooth_gam_probs * model_neutral_log_probs)
    )
    l_cat = emp_term + cat_term

    p = np.asarray(pred_pos, dtype=np.float64)
    v = np.asarray(pred_vel, dtype=np.float64)
    a = np.asarray(pred_acc, dtype=np.float64)
    pos_res = p[:, 1:, :] - (p[:, :-1, :] + v[:, :-1, :] * dt + 0.5 * a[:, :-1, :] * (dt ** 2))
    vel_res = v[:, 1:, :] - (v[:, :-1, :] + a[:, :-1, :] * dt)
    l_midas = float(np.sum(pos_res ** 2) + lambda_v * np.sum(vel_res ** 2))
    return {"catalytic_ep_loss": float(l_cat), "midas_kinematic_loss": l_midas}


def compute_fractional_tackles_and_aipw_eps(
    v_start: float,
    v_pre: float,
    v_end: float,
    v_post: float,
    defenders_per_frame: Sequence[int],
    y_outcomes: np.ndarray,
    treatment_indicators: np.ndarray,
    mu0_hat: np.ndarray,
    mu1_hat: np.ndarray,
    propensity_pi_hat: np.ndarray,
) -> Dict[str, float]:
    """Compute Fractional Tackle Credit (w_ij, w_ijk) & Doubly Robust AIPW EPS_i.

    Source: Unified Quantitative NFL Projection Architecture (1gmnDbtS7qA-7ZvJqnoGGbC3tKO4zFgizEnD6REiFI8k).
    """
    if v_pre <= 0.0:
        raise ValueError("v_pre must be > 0.")
    w_ij = ((max(v_start, v_pre) - max(v_end, v_post)) / v_pre) if v_post < v_pre else 0.0
    w_ij = max(0.0, w_ij)
    T_ij = len(defenders_per_frame)
    w_ijk = sum(w_ij / (T_ij * max(k_t, 1)) for k_t in defenders_per_frame) if T_ij > 0 else 0.0

    Y = np.asarray(y_outcomes, dtype=np.float64)
    T = np.asarray(treatment_indicators, dtype=np.float64)
    m0 = np.asarray(mu0_hat, dtype=np.float64)
    m1 = np.asarray(mu1_hat, dtype=np.float64)
    pi = np.clip(np.asarray(propensity_pi_hat, dtype=np.float64), 1e-4, 1.0 - 1e-4)
    scores = m0 - m1 + ((1.0 - T) * (Y - m0)) / (1.0 - pi) - (T * (Y - m1)) / pi
    return {
        "window_velocity_drop_credit": float(w_ij),
        "single_defender_fractional_tackle": float(w_ijk),
        "aipw_eps": float(np.mean(scores)),
    }


def compute_hbpm_ridge_posterior_and_eb_shrinkage(
    design_X: np.ndarray,
    garbage_weighted_epa_y: np.ndarray,
    informed_prior_mean: np.ndarray,
    prior_variance_tau2: np.ndarray,
    obs_variance_sigma2: float,
    *,
    n_full_season: float = 550.0,
    r_yoy: float = 0.612,
    target_share: float = 0.26,
    air_yards_share: float = 0.34,
) -> Dict[str, Any]:
    """Compute Informed-Prior HBPM Posterior Mean, Spearman-Brown k_0.50 & WOPR.

    Source: Unified Quantitative NFL Projection Architecture (1gmnDbtS7qA-7ZvJqnoGGbC3tKO4zFgizEnD6REiFI8k).
    """
    X = np.asarray(design_X, dtype=np.float64)
    y = np.asarray(garbage_weighted_epa_y, dtype=np.float64)
    mu0 = np.asarray(informed_prior_mean, dtype=np.float64)
    tau2 = np.asarray(prior_variance_tau2, dtype=np.float64)

    prec_prior = np.diag(1.0 / np.maximum(tau2, 1e-9))
    prec_post = (X.T @ X) / obs_variance_sigma2 + prec_prior
    rhs = (X.T @ y) / obs_variance_sigma2 + prec_prior @ mu0
    beta_post = np.linalg.solve(prec_post, rhs)
    k_50 = n_full_season * (1.0 - r_yoy) / max(r_yoy, 1e-6)
    wopr = 1.5 * target_share + 0.7 * air_yards_share
    return {"hbpm_posterior_mean": beta_post, "spearman_brown_k50": float(k_50), "wopr": float(wopr)}


def compute_bqp_and_swcc_situational_metrics(
    *,
    epa_starter_prior: Optional[float],
    epa_backup_snap_adjusted: Optional[float],
    has_valid_pit_stamp: bool,
    rest_deficit_days: Optional[float],
    travel_miles: Optional[float],
    prior_game_snaps: Optional[float],
) -> Dict[str, Optional[float]]:
    """Compute PIT Fail-Closed BQP and SWCC Situational Metrics (never zero-imputed).

    Source: 1kdaACWX4TJDkviugVgA8XxA2cF1rvbN04Xd6vJBQcHo.
    """
    bqp: Optional[float] = None
    if has_valid_pit_stamp and epa_starter_prior is not None and epa_backup_snap_adjusted is not None:
        bqp = float(epa_starter_prior - epa_backup_snap_adjusted)

    swcc: Optional[float] = None
    if (
        has_valid_pit_stamp
        and rest_deficit_days is not None
        and travel_miles is not None
        and prior_game_snaps is not None
    ):
        swcc = float(rest_deficit_days * math.log1p(max(0.0, travel_miles)) * (prior_game_snaps / 1000.0))

    return {"bqp": bqp, "swcc": swcc}


def compute_logit_aqre_and_cvar_fourth_down(
    expected_utilities: np.ndarray,
    coordinator_biases: np.ndarray,
    prev_action_idx: int,
    lambda_precision: float,
    rho_serial: float,
    action_bootstrap_wp_samples: Mapping[str, np.ndarray],
    *,
    eta_risk: float = 0.25,
    cvar_alpha: float = 0.10,
) -> Dict[str, Any]:
    """Compute Coordinator Logit-AQRE Action Probabilities & Risk-Sensitive CVaR 4th-Down Bellman Policy.

    Source: Unified Quantitative NFL Projection Architecture (1gmnDbtS7qA-7ZvJqnoGGbC3tKO4zFgizEnD6REiFI8k).
    """
    eu = np.asarray(expected_utilities, dtype=np.float64)
    bias = np.asarray(coordinator_biases, dtype=np.float64)
    serial_vec = np.zeros_like(eu)
    if 0 <= prev_action_idx < eu.shape[0]:
        serial_vec[prev_action_idx] = rho_serial
    logits = lambda_precision * eu + bias + serial_vec
    logits = logits - np.max(logits)
    probs = np.exp(logits) / np.sum(np.exp(logits))

    action_scores: Dict[str, float] = {}
    for act_name, wp_draws in action_bootstrap_wp_samples.items():
        draws = np.sort(np.asarray(wp_draws, dtype=np.float64))
        cutoff = max(1, int(math.ceil(cvar_alpha * draws.shape[0])))
        cvar_val = float(np.mean(draws[:cutoff]))
        mean_val = float(np.mean(draws))
        action_scores[act_name] = (1.0 - eta_risk) * mean_val + eta_risk * cvar_val

    optimal_action = max(action_scores.items(), key=lambda kv: kv[1])[0]
    return {"aqre_probs": probs, "cvar_bellman_scores": action_scores, "optimal_action": optimal_action}


def simulate_rule4_victory_formation_automaton(
    clock_seconds: float,
    defensive_timeouts: int,
    *,
    down: int = 1,
    two_minute_warning_already_occurred: Optional[bool] = None,
    tau_kneel_seconds: float = 1.6,
    play_clock_seconds: float = 40.0,
) -> Dict[str, Any]:
    """Exact NFL Rule 4 Victory Formation Clock-Bleed Automaton (C6).

    Source: Unified Quantitative NFL Projection Architecture (1gmnDbtS7qA-7ZvJqnoGGbC3tKO4zFgizEnD6REiFI8k).
    """
    rem = float(clock_seconds)
    def_to = max(0, int(defensive_timeouts))
    has_had_2mw = (
        (rem <= 120.0)
        if two_minute_warning_already_occurred is None
        else bool(two_minute_warning_already_occurred)
    )
    start_clock = rem

    for current_down in range(int(down), 5):
        if rem <= 0.0:
            rem = 0.0
            break
        pre_snap = rem
        rem = max(0.0, rem - tau_kneel_seconds)
        if rem <= 0.0 or current_down == 4:
            break

        crossed_2mw = (not has_had_2mw) and (pre_snap > 120.0) and (rem <= 120.0)
        if crossed_2mw:
            has_had_2mw = True
            continue

        if def_to > 0:
            def_to -= 1
            continue

        if (not has_had_2mw) and (rem > 120.0):
            if rem - play_clock_seconds <= 120.0:
                rem = 120.0
                has_had_2mw = True
            else:
                rem -= play_clock_seconds
        else:
            rem = max(0.0, rem - play_clock_seconds)

    clock_exhausted = start_clock - rem
    p_kneel_loss = 0.00025 * 0.30 * (0.50 if rem > 0.0 else 0.05)
    return {
        "can_kneel_out": bool(rem <= 0.0),
        "clock_left_at_turnover_s": round(rem, 4),
        "clock_exhausted_s": round(clock_exhausted, 4),
        "single_kneel_loss_hazard": float(p_kneel_loss),
    }


def devig_all_six_methods(decimal_odds: Sequence[float]) -> Dict[str, np.ndarray]:
    """Compute all 6 exact mathematical devigging methods from Unified NFL Architecture.

    Source: Unified Quantitative NFL Projection Architecture (1gmnDbtS7qA-7ZvJqnoGGbC3tKO4zFgizEnD6REiFI8k).
    """
    odds = np.asarray(decimal_odds, dtype=np.float64)
    q = 1.0 / odds
    B = float(np.sum(q))
    n = int(q.shape[0])

    mult = q / B
    additive_wpo = q - (B - 1.0) / float(n)

    c_star = float(
        optimize.brentq(lambda c: float(np.sum(q / (c * (1.0 - q) + q)) - 1.0), 1.0, 500.0, xtol=1e-12)
    )
    cheung = q / (c_star * (1.0 - q) + q)

    z_q = stats.norm.ppf(np.clip(q, 1e-12, 1.0 - 1e-12))
    delta_star = float(
        optimize.brentq(lambda d: float(np.sum(stats.norm.cdf(z_q - d)) - 1.0), 0.0, 10.0, xtol=1e-12)
    )
    probit = stats.norm.cdf(z_q - delta_star)

    k_star = float(
        optimize.brentq(lambda k: float(np.sum(q ** k) - 1.0), 1.0, 100.0, xtol=1e-12)
    )
    power = q ** k_star

    shin_res = eq08_gsn08_idle_rd_and_conjugate_shin_devig(200.0, 0.06, 0, decimal_odds)
    return {
        "multiplicative": mult,
        "additive_wpo": additive_wpo,
        "cheung_odds_ratio": cheung,
        "probit_shift": probit,
        "power": power,
        "conjugate_shin": shin_res["fair_probs"],
    }


def black_litterman_market_synthesis(
    pi_market: np.ndarray,
    sigma_market: np.ndarray,
    tau_liquidity: float,
    pick_matrix_P: np.ndarray,
    mu_science: np.ndarray,
    omega_science: np.ndarray,
) -> np.ndarray:
    """Fuse fundamental science vector mu_sci with devigged market equilibrium pi_mkt.

    Source: Unified Quantitative NFL Projection Architecture (1gmnDbtS7qA-7ZvJqnoGGbC3tKO4zFgizEnD6REiFI8k).
    """
    inv_mkt = np.linalg.inv(tau_liquidity * np.asarray(sigma_market, dtype=np.float64))
    inv_sci = np.linalg.inv(np.asarray(omega_science, dtype=np.float64))
    P = np.asarray(pick_matrix_P, dtype=np.float64)
    prec = inv_mkt + P.T @ inv_sci @ P
    rhs = inv_mkt @ np.asarray(pi_market, dtype=np.float64) + P.T @ inv_sci @ np.asarray(mu_science, dtype=np.float64)
    return np.linalg.solve(prec, rhs)


def minimum_kl_entropic_tilting(
    constraint_features_G: np.ndarray,
    target_means_g_bar: np.ndarray,
) -> Dict[str, Any]:
    """Solve Minimum-KL Entropic Tilting across S joint player simulation draws via BFGS.

    Source: Unified Quantitative NFL Projection Architecture (1gmnDbtS7qA-7ZvJqnoGGbC3tKO4zFgizEnD6REiFI8k).
    """
    G = np.asarray(constraint_features_G, dtype=np.float64)
    g_bar = np.asarray(target_means_g_bar, dtype=np.float64)
    D = G - g_bar[None, :]
    S, M = D.shape

    def _dual_obj_and_grad(lam: np.ndarray) -> Tuple[float, np.ndarray]:
        z = D @ lam
        z_max = float(np.max(z))
        exp_shift = np.exp(z - z_max)
        sum_exp = float(np.sum(exp_shift))
        obj = z_max + math.log(sum_exp / float(S))
        weights = exp_shift / sum_exp
        grad = D.T @ weights
        return float(obj), grad

    res = optimize.minimize(
        _dual_obj_and_grad,
        np.zeros(M, dtype=np.float64),
        method="BFGS",
        jac=True,
        options={"gtol": 1e-11, "maxiter": 300},
    )
    lam_star = res.x
    z = D @ lam_star
    w = np.exp(z - float(np.max(z)))
    w = w / np.sum(w)
    tilted_means = G.T @ w
    max_moment_err = float(np.max(np.abs(tilted_means - g_bar)))
    kl_nats = float(np.sum(w * np.log(np.maximum(w * float(S), 1e-300))))
    ess = float(1.0 / np.sum(w ** 2))

    return {
        "weights": w,
        "lambda_star": lam_star,
        "tilted_means": tilted_means,
        "max_moment_error": max_moment_err,
        "kl_divergence_nats": kl_nats,
        "effective_sample_size": ess,
        "ess_ratio": ess / float(S),
    }


def student_t_copula_upper_tail_dependence(rho: float, nu_df: float = 4.0) -> float:
    """Compute exact upper-tail shootout dependence lambda_U^{t_nu}(rho) > 0 vs Gaussian 0.

    Source: Unified Quantitative NFL Projection Architecture (1gmnDbtS7qA-7ZvJqnoGGbC3tKO4zFgizEnD6REiFI8k).
    """
    if not (-1.0 < rho < 1.0) or nu_df <= 0.0:
        raise ValueError("Require rho in (-1, 1) and nu_df > 0.")
    arg = -math.sqrt((nu_df + 1.0) * (1.0 - rho) / (1.0 + rho))
    return float(2.0 * stats.t.cdf(arg, df=nu_df + 1.0))


def dma_and_aci_online_update(
    prior_weights: np.ndarray,
    predictive_densities: np.ndarray,
    alpha_t: float,
    err_t: float,
    *,
    forgetting_alpha: float = 0.96,
    gamma_aci: float = 0.02,
    alpha_target: float = 0.10,
) -> Dict[str, Any]:
    """Update Dynamic Model Averaging (DMA) filter weights and Adaptive Conformal alpha_{t+1}.

    Source: Unified Quantitative NFL Projection Architecture (1gmnDbtS7qA-7ZvJqnoGGbC3tKO4zFgizEnD6REiFI8k).
    """
    w_prev = np.asarray(prior_weights, dtype=np.float64)
    f_vals = np.asarray(predictive_densities, dtype=np.float64)
    w_pred = np.power(np.maximum(w_prev, 1e-15), forgetting_alpha)
    w_pred = w_pred / np.sum(w_pred)
    numer = w_pred * np.maximum(f_vals, 1e-300)
    w_post = numer / np.sum(numer)
    alpha_next = float(alpha_t + gamma_aci * (alpha_target - err_t))
    return {"predicted_weights": w_pred, "posterior_weights": w_post, "alpha_next": alpha_next}


def multivariate_energy_and_variogram_scores(
    forecast_draws: np.ndarray,
    observed_y: np.ndarray,
    *,
    p_order: float = 0.5,
) -> Dict[str, float]:
    """Compute Gneiting-Raftery Energy Score & Scheuerer-Hamill Variogram Score (p=0.5).

    Source: Unified Quantitative NFL Projection Architecture (1gmnDbtS7qA-7ZvJqnoGGbC3tKO4zFgizEnD6REiFI8k).
    """
    X = np.asarray(forecast_draws, dtype=np.float64)
    y = np.asarray(observed_y, dtype=np.float64)
    S, d = X.shape
    term1 = float(np.mean(np.linalg.norm(X - y[None, :], axis=1)))
    if S <= 400:
        diffs = X[:, None, :] - X[None, :, :]
        term2 = float(np.mean(np.linalg.norm(diffs, axis=2)))
    else:
        half = S // 2
        term2 = float(np.mean(np.linalg.norm(X[:half] - X[half : 2 * half], axis=1)))
    energy_score = term1 - 0.5 * term2

    vs = 0.0
    for i in range(d):
        for j in range(d):
            if i == j:
                continue
            obs_diff = abs(float(y[i] - y[j])) ** p_order
            exp_diff = float(np.mean(np.abs(X[:, i] - X[:, j]) ** p_order))
            vs += (obs_diff - exp_diff) ** 2

    return {"energy_score": float(energy_score), "variogram_score_p05": float(vs)}


def conformal_kelly_fraction(
    expected_edge_mu: float,
    rolling_unweighted_conformal_half_width_75: float,
    *,
    fractional_kelly_multiplier: float = 0.25,
    downside_break_rate_dial: float = 1.0,
) -> float:
    """Dual-Track Conformal Kelly Bankroll Position Sizing (Ryan 2026, arXiv:2608.01494).

    Source: 1kdaACWX4TJDkviugVgA8XxA2cF1rvbN04Xd6vJBQcHo.
    """
    if expected_edge_mu <= 0.0 or rolling_unweighted_conformal_half_width_75 <= 1e-9:
        return 0.0
    raw_f = expected_edge_mu / (rolling_unweighted_conformal_half_width_75 ** 2)
    dial = max(0.0, min(1.0, float(downside_break_rate_dial)))
    return float(max(0.0, fractional_kelly_multiplier * dial * raw_f))
