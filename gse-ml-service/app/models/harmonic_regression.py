# MIT License
#
# This file contains a vendored re-implementation of harmonic regression
# conceptually attributed to facebookresearch/Kats (https://github.com/facebookresearch/Kats)
#
# Copyright (c) Facebook, Inc. and its affiliates.
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.
"""
Harmonic Regression for gappy series.

This module provides `HarmonicRegression` and `StackedHarmonicRegression`
for modeling periodic signals in gappy, non-uniform time series data.
It operates directly on raw numpy arrays of epoch seconds rather than assuming
equally spaced indices.

Stacking Pattern:
To model multiple overlapping periodic signals (e.g., a daily 24h cycle
and a weekly 168h cycle), use `StackedHarmonicRegression`. It jointly fits
Fourier features for all provided periods in a single Ordinary Least Squares
regression, which cleanly handles non-orthogonal overlapping frequencies.
"""

import numpy as np

class HarmonicRegression:
    """
    Fits a harmonic (Fourier) regression for a single period.
    """
    def __init__(self, period: float):
        """
        :param period: Period in hours.
        """
        self.period = period
        self.period_seconds = period * 3600.0
        self.coef_ = None
        self.intercept_ = 0.0

    def fit(self, timestamps: np.ndarray, y: np.ndarray):
        """
        Fit the harmonic regression.
        :param timestamps: 1D numpy array of absolute epoch seconds.
        :param y: 1D numpy array of target values.
        """
        timestamps = np.asarray(timestamps)
        y = np.asarray(y)

        # Features: [sin(2pi * t / p), cos(2pi * t / p), 1]
        X = np.column_stack([
            np.sin(2 * np.pi * timestamps / self.period_seconds),
            np.cos(2 * np.pi * timestamps / self.period_seconds),
            np.ones_like(timestamps)
        ])

        # Solve OLS
        params, _, _, _ = np.linalg.lstsq(X, y, rcond=None)

        self.coef_ = params[:2]
        self.intercept_ = params[2]
        return self

    def predict(self, timestamps: np.ndarray) -> np.ndarray:
        """
        Predict values at given timestamps.
        :param timestamps: 1D numpy array of absolute epoch seconds.
        :return: 1D numpy array of predicted values.
        """
        if self.coef_ is None:
            raise ValueError("Model must be fitted before calling predict.")

        timestamps = np.asarray(timestamps)

        X = np.column_stack([
            np.sin(2 * np.pi * timestamps / self.period_seconds),
            np.cos(2 * np.pi * timestamps / self.period_seconds)
        ])

        return X @ self.coef_ + self.intercept_


class StackedHarmonicRegression:
    """
    Fits a harmonic regression for multiple periods simultaneously.
    """
    def __init__(self, periods: list[float]):
        """
        :param periods: List of periods in hours.
        """
        self.periods = periods
        self.period_seconds = [p * 3600.0 for p in periods]
        self.coef_ = None
        self.intercept_ = 0.0

    def fit(self, timestamps: np.ndarray, y: np.ndarray):
        """
        Fit the stacked harmonic regression.
        :param timestamps: 1D numpy array of absolute epoch seconds.
        :param y: 1D numpy array of target values.
        """
        timestamps = np.asarray(timestamps)
        y = np.asarray(y)

        features = []
        for p_sec in self.period_seconds:
            features.append(np.sin(2 * np.pi * timestamps / p_sec))
            features.append(np.cos(2 * np.pi * timestamps / p_sec))

        features.append(np.ones_like(timestamps))
        X = np.column_stack(features)

        params, _, _, _ = np.linalg.lstsq(X, y, rcond=None)

        self.coef_ = params[:-1]
        self.intercept_ = params[-1]
        return self

    def predict(self, timestamps: np.ndarray) -> np.ndarray:
        """
        Predict values at given timestamps.
        :param timestamps: 1D numpy array of absolute epoch seconds.
        :return: 1D numpy array of predicted values.
        """
        if self.coef_ is None:
            raise ValueError("Model must be fitted before calling predict.")

        timestamps = np.asarray(timestamps)

        features = []
        for p_sec in self.period_seconds:
            features.append(np.sin(2 * np.pi * timestamps / p_sec))
            features.append(np.cos(2 * np.pi * timestamps / p_sec))

        X = np.column_stack(features)

        return X @ self.coef_ + self.intercept_
