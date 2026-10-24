#!/usr/bin/env python3
"""
intelligence/models/player_linear_model.py
Drop-in regularized linear (Ridge) model consuming the 50-feature player interaction vector.
Includes a pure-numpy fallback when scikit-learn is unavailable so it runs in every environment.
"""

from __future__ import annotations
from typing import Any
import numpy as np

try:
    from sklearn.linear_model import Ridge
    from sklearn.preprocessing import StandardScaler
    from sklearn.pipeline import Pipeline
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False

FEATURE_NAMES: list[str] = [
    # base (9)
    "soe_yd", "avg_separation", "adot", "target_share", "tprr",
    "air_yard_share", "ryoe", "snap_share", "route_participation",
    # coverage interactions (12)
    "soe_x_two_high", "soe_x_man", "sep_x_two_high", "sep_x_man",
    "adot_x_two_high", "tprr_x_two_high", "air_x_two_high",
    "soe_x_pressure", "sep_x_pressure", "tprr_x_pressure",
    "adot_x_pressure", "air_x_pressure",
    # injury / vacated (6)
    "target_share_x_wr1_out", "tprr_x_wr1_out", "air_x_wr1_out",
    "soe_x_def_out", "sep_x_def_out", "ryoe_x_def_out",
    # script interactions (8)
    "target_share_x_trail", "tprr_x_trail", "ryoe_x_trail", "snap_x_trail",
    "adot_x_trail", "sep_x_trail", "soe_x_trail", "air_x_trail",
    # additional crossings (10)
    "ryoe_x_two_high", "ryoe_x_man", "snap_x_two_high", "route_x_two_high",
    "route_x_man", "route_x_pressure", "target_share_x_man",
    "target_share_x_pressure", "tprr_x_man", "snap_x_pressure",
    # residuals & context (5)
    "soe_residual_two_high", "tprr_residual_trail", "short_week", "is_home",
    "trailing_prob",
]  # 50 features


class _NumpyRidgePipeline:
    """Closed-form standardized Ridge fallback when scikit-learn is not installed."""

    def __init__(self, alpha: float = 1.0) -> None:
        self.alpha = float(alpha)
        self.mean_: np.ndarray = np.zeros(len(FEATURE_NAMES))
        self.scale_: np.ndarray = np.ones(len(FEATURE_NAMES))
        self.coef_: np.ndarray = np.zeros(len(FEATURE_NAMES))
        self.intercept_: float = 0.0
        self.named_steps = {"ridge": self}

    def fit(self, X: np.ndarray, y: np.ndarray) -> "_NumpyRidgePipeline":
        self.mean_ = X.mean(axis=0)
        std = X.std(axis=0)
        self.scale_ = np.where(std > 1e-9, std, 1.0)
        Xs = (X - self.mean_) / self.scale_
        y_mean = float(y.mean())
        yc = y - y_mean
        n_feat = Xs.shape[1]
        A = Xs.T @ Xs + self.alpha * np.eye(n_feat)
        self.coef_ = np.linalg.solve(A, Xs.T @ yc)
        self.intercept_ = y_mean
        return self

    def predict(self, X: np.ndarray) -> np.ndarray:
        Xs = (X - self.mean_) / self.scale_
        return Xs @ self.coef_ + self.intercept_


def build_design_matrix(feature_dicts: list[dict[str, Any]]) -> np.ndarray:
    """Turn a list of feature dicts into a (n_samples, 50) array."""
    return np.array([
        [float(fd.get(name, 0.0)) for name in FEATURE_NAMES]
        for fd in feature_dicts
    ], dtype=float)


def make_linear_model(alpha: float = 1.0) -> Any:
    """Ridge regression with standardization. 50 features."""
    if HAS_SKLEARN:
        return Pipeline([
            ("scaler", StandardScaler()),
            ("ridge", Ridge(alpha=alpha, fit_intercept=True)),
        ])
    return _NumpyRidgePipeline(alpha=alpha)


def train_player_model(X: np.ndarray, y: np.ndarray, alpha: float = 1.0) -> Any:
    model = make_linear_model(alpha=alpha)
    model.fit(X, y)
    return model


def predict_player(model: Any, feature_dict: dict[str, Any]) -> float:
    X = build_design_matrix([feature_dict])
    return float(model.predict(X)[0])


def get_coefficients(model: Any) -> dict[str, float]:
    ridge = model.named_steps["ridge"]
    return dict(zip(FEATURE_NAMES, ridge.coef_.tolist()))
