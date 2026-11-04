"""Research-mindset feature extraction for NFL video replay (Phase 7).

Four features, each grounded in a published method, each falsifiable:

1. Disguise collapse hazard — AdversarialSchrodingerActiveHazardEngine
   (CSD + Schrodinger bridge + expected free energy + conformal gate).
   Measures how fast a pre-snap defensive picture collapses into a
   post-snap one; a fast collapse is a disguise that failed.

2. Trajectory irreversibility — Crooks/Seifert
   ln[P_F(omega) / P_R(-omega)]. A route that looks the same forwards and
   backwards carries no directional information; a high ratio means the
   path is strongly time-asymmetric (a real break, not noise).

3. QB cognitive load + zone void area — polygon_zone_breach
   MOT load = defenders inside the QB's scan radius weighted by closing
   speed. Zone void = area of coverage zones with fewer defenders than
   expected.

4. Route EM clusters — Bernstein/Bezier route_geometry
   GMM-style EM over Bezier control-point signatures; cluster purity is
   the falsifier (a cluster that does not separate route concepts is not
   a route concept).

Every candidate feature is gated through Benjamini-Hochberg FDR at
q <= 0.10 before it is allowed into the ledger.
"""
from __future__ import annotations

from typing import Any, Iterable

import numpy as np

# ---------------------------------------------------------------------------
# 1. Disguise collapse hazard
# ---------------------------------------------------------------------------


def _flatten_positions(xy: np.ndarray) -> np.ndarray:
    """(n_players, 2) -> flat vector for the hazard engine's marginals."""
    return np.asarray(xy, dtype=np.float64).reshape(-1)


def disguise_collapse_hazard(
    pre_snap_xy: np.ndarray,
    post_snap_xy: np.ndarray,
    calibration_scores: Iterable[float],
    alpha: float = 0.05,
) -> dict[str, Any]:
    """Run the hazard engine on a pre/post-snap defensive picture.

    pre_snap_xy / post_snap_xy: (n_players, 2) arrays of defender positions.
    calibration_scores: nonconformity scores from a held-out calibration set.
    """
    import sys
    from pathlib import Path

    pkg = Path(__file__).resolve().parents[2] / "packages" / "galaxy-conformal-ot"
    if pkg.exists() and str(pkg) not in sys.path:
        sys.path.insert(0, str(pkg))
    from galaxy_conformal_ot import AdversarialSchrodingerActiveHazardEngine

    pre = np.asarray(pre_snap_xy, dtype=np.float64)
    post = np.asarray(post_snap_xy, dtype=np.float64)
    if pre.shape != post.shape:
        raise ValueError(f"pre/post shape mismatch: {pre.shape} vs {post.shape}")

    # Micro-fluctuation series: per-player displacement magnitude over the snap.
    disp = np.linalg.norm(post - pre, axis=1)
    baseline_var = float(np.var(disp)) + 1e-9

    engine = AdversarialSchrodingerActiveHazardEngine(alpha_false_alarm_bound=alpha)
    out = engine.evaluate_phase_transition_warning(
        micro_fluctuation_series=disp,
        baseline_variance=baseline_var,
        source_network_load=_flatten_positions(pre),
        stressed_network_load=_flatten_positions(post),
        homeostatic_target_dist=_flatten_positions(pre),
        observation_ambiguity=np.full(len(_flatten_positions(pre)), 0.5),
        calibration_nonconformity_scores=list(calibration_scores),
    )
    out["mean_displacement_px"] = float(disp.mean())
    out["max_displacement_px"] = float(disp.max())
    return out


# ---------------------------------------------------------------------------
# 2. Trajectory irreversibility (Crooks/Seifert)
# ---------------------------------------------------------------------------


def trajectory_irreversibility(traj_xy: np.ndarray) -> float:
    """ln[P_F(omega) / P_R(-omega)] for a 2-D trajectory.

    Under an overdamped Langevin path measure with constant drift mu and
    diffusivity sigma^2, the log-ratio of forward to time-reversed path
    probability reduces to sum(mu . dx) / sigma^2. A value near zero means
    the path is statistically reversible (no directional information); a
    large positive value means the path is strongly time-asymmetric.
    """
    traj = np.asarray(traj_xy, dtype=np.float64)
    if traj.ndim != 2 or traj.shape[0] < 3:
        return 0.0
    dx = np.diff(traj, axis=0)
    mu = dx.mean(axis=0)
    sigma2 = float(dx.var(axis=0).mean()) + 1e-9
    return float(np.sum(dx @ mu) / sigma2)


# ---------------------------------------------------------------------------
# 3. QB cognitive load + zone void area
# ---------------------------------------------------------------------------


def qb_cognitive_load(
    qb_xy: np.ndarray,
    defender_xy: np.ndarray,
    zone_polygons: dict[str, list[tuple[float, float]]] | None = None,
    scan_radius_px: float = 220.0,
) -> dict[str, Any]:
    """MOT load on the QB plus coverage-zone void area.

    qb_xy: (2,) or (n, 2) QB position(s).
    defender_xy: (n_defenders, 2) defender positions at the same instant.
    zone_polygons: optional {zone_name: [(x, y), ...]} coverage zones.
    """
    from intelligence.vision.polygon_zone_breach import compute_zone_void_breach

    qb = np.asarray(qb_xy, dtype=np.float64)
    if qb.ndim == 2:
        qb = qb[-1]
    defs = np.asarray(defender_xy, dtype=np.float64)
    if defs.ndim != 2 or defs.shape[1] != 2:
        raise ValueError("defender_xy must be (n, 2)")

    d = np.linalg.norm(defs - qb, axis=1)
    in_scan = d <= scan_radius_px
    # Closing speed proxy: inverse distance, so a defender bearing down
    # contributes more load than one drifting at the edge of the scan.
    weights = np.where(in_scan, 1.0 / (d + 1e-6), 0.0)
    mot_load = float(weights.sum())

    out: dict[str, Any] = {
        "mot_load": mot_load,
        "defenders_in_scan": int(in_scan.sum()),
        "nearest_defender_px": float(d.min()) if len(d) else None,
    }

    if zone_polygons:
        breach = compute_zone_void_breach(
            {f"d{i}": (float(x), float(y)) for i, (x, y) in enumerate(defs)},
            {name: [(float(x), float(y)) for x, y in poly]
             for name, poly in zone_polygons.items()},
        )
        out["zone_void_area_sq_yds"] = float(breach["total_void_area_sq_yds"])
        out["breached_zones"] = breach["breached_zones"]
    else:
        out["zone_void_area_sq_yds"] = 0.0
        out["breached_zones"] = []
    return out


# ---------------------------------------------------------------------------
# 4. Route EM clusters
# ---------------------------------------------------------------------------


def route_em_clusters(trajectories: list[np.ndarray], n_clusters: int = 9,
                      n_ctrl: int = 5) -> dict[str, Any]:
    """Bernstein/Bezier EM clustering over route trajectories."""
    from intelligence.vision.route_geometry import em_cluster_routes

    return em_cluster_routes(trajectories, n_clusters=n_clusters, n_ctrl=n_ctrl)


# ---------------------------------------------------------------------------
# 5. BH-FDR falsification gate
# ---------------------------------------------------------------------------


def bh_fdr(pvalues: Iterable[float], q: float = 0.10) -> dict[str, Any]:
    """Benjamini-Hochberg FDR control.

    Returns the reject mask, the adjusted p-values, and the largest rank
    that survives. A feature whose adjusted p-value exceeds q is not
    allowed into the ledger.
    """
    p = np.asarray(list(pvalues), dtype=np.float64)
    n = len(p)
    if n == 0:
        return {"reject": np.array([], dtype=bool), "adjusted": np.array([]),
                "n_reject": 0, "q": q}
    order = np.argsort(p)
    ranked = p[order]
    thresholds = q * np.arange(1, n + 1) / n
    passed = ranked <= thresholds
    reject = np.zeros(n, dtype=bool)
    if passed.any():
        k = int(np.max(np.where(passed)[0]))
        reject[order[: k + 1]] = True
    # Adjusted p-values (BH step-up), monotone from the largest down.
    adjusted = np.empty(n, dtype=np.float64)
    adjusted[order] = np.minimum.accumulate(
        (ranked * n / np.arange(1, n + 1))[::-1]
    )[::-1]
    adjusted = np.clip(adjusted, 0.0, 1.0)
    return {"reject": reject, "adjusted": adjusted,
            "n_reject": int(reject.sum()), "q": q}


def falsify_feature_matrix(
    feature_matrix: np.ndarray,
    labels: np.ndarray,
    feature_names: list[str],
    q: float = 0.10,
) -> dict[str, Any]:
    """Two-sample t-test per feature, then BH-FDR across features.

    feature_matrix: (n_samples, n_features).
    labels: (n_samples,) binary group labels.
    """
    from scipy import stats

    X = np.asarray(feature_matrix, dtype=np.float64)
    y = np.asarray(labels)
    if X.ndim != 2:
        raise ValueError("feature_matrix must be 2-D")
    if X.shape[0] != len(y):
        raise ValueError("feature_matrix rows must match labels")
    if X.shape[1] != len(feature_names):
        raise ValueError("feature_names length must match columns")

    pvals, stats_out = [], []
    for j in range(X.shape[1]):
        a = X[y == 0, j]
        b = X[y == 1, j]
        if len(a) < 2 or len(b) < 2:
            pvals.append(1.0)
            stats_out.append(0.0)
            continue
        t, p = stats.ttest_ind(a, b, equal_var=False, nan_policy="omit")
        pvals.append(float(p) if np.isfinite(p) else 1.0)
        stats_out.append(float(t) if np.isfinite(t) else 0.0)

    gate = bh_fdr(pvals, q=q)
    return {
        "feature_names": feature_names,
        "t_stat": stats_out,
        "p_value": pvals,
        "adjusted_p": gate["adjusted"].tolist(),
        "reject": gate["reject"].tolist(),
        "n_reject": gate["n_reject"],
        "q": q,
    }
