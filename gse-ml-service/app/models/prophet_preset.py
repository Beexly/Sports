"""Prophet preset wrapper for gse-ml-service.

This wrapper wraps Prophet with sports-specific presets and handles the dependencies constraint.

Since we cannot use Kats directly due to dependency constraints (numpy<1.22, pandas<=1.3.5 pins)
and Prophet is the ONLY Kats model with true multiple seasonality, we vendor Kats `ProphetModel` here.

Prophet itself is a Stan build — if it is unavailable in this environment, we provide
a clear fallback error.
"""

import sys
import pandas as pd
import numpy as np

try:
    from app.models.kats.models.prophet import ProphetModel, ProphetParams
    from app.models.kats.consts import TimeSeriesData
    _HAVE_VENDOR_KATS = True
except ImportError as exc:
    _HAVE_VENDOR_KATS = False
    _KATS_IMPORT_ERROR = exc


def _require_kats():
    if not _HAVE_VENDOR_KATS:
        raise RuntimeError("Kats vendored components failed to import.") from _KATS_IMPORT_ERROR


class ProphetSportsPredictor:
    """Wrapper around Kats ProphetModel for sports seasonal + regressor problems.

    Prophet is TIMESTAMP-BASED (ds column) — it handles missing dates and gappy series natively.
    It supports multiple seasonality (yearly/weekly/daily auto or Fourier terms, custom dicts, holidays).
    """

    def __init__(self, sport: str, **kwargs):
        """Initialize the predictor with presets for a specific sport.

        Args:
            sport: The sport name (NFL, NBA, MLB, NHL, Soccer).
            **kwargs: Additional kwargs to pass to the Kats ProphetParams constructor.
        """
        _require_kats()

        self.sport = sport.upper()

        # Base Prophet parameters
        prophet_kwargs = {
            "yearly_seasonality": False,
            "weekly_seasonality": False,
            "daily_seasonality": False,
        }

        # Override with any custom kwargs
        prophet_kwargs.update(kwargs)

        # Apply presets
        self._regressors = []
        self._custom_seasonalities = []

        if self.sport == "NFL":
            # NFL: weekly seasonality on intraday line-movement series; regressors: weather (wind/temp), rest (short weeks, bye).
            prophet_kwargs["weekly_seasonality"] = True
            self._regressors.extend(["wind", "temp", "short_week", "bye"])

        elif self.sport == "NBA":
            # NBA: back-to-back rest-days regressor (huge edge), weekly rhythm, in-season tournament regime handling.
            prophet_kwargs["weekly_seasonality"] = True
            self._regressors.extend(["back_to_back", "in_season_tournament"])

        elif self.sport == "MLB":
            # MLB: weather regressors (wind, temperature) via extra_regressors; yearly seasonality.
            prophet_kwargs["yearly_seasonality"] = True
            self._regressors.extend(["wind", "temp"])

        elif self.sport == "NHL":
            # NHL: rest-days regressor (back-to-backs hit harder than NBA).
            self._regressors.extend(["back_to_back"])

        elif self.sport == "SOCCER":
            # Soccer: fixture-congestion regressor (critical Dec/Apr); custom seasonalities per competition.
            self._regressors.extend(["fixture_congestion"])

        else:
            raise ValueError(f"Unknown sport preset: {sport}")

        # For Kats, extra regressors are specified as a list of dictionaries with "name".
        if self._regressors:
            prophet_kwargs["extra_regressors"] = [{"name": reg} for reg in self._regressors]

        # Initialize ProphetParams
        self.params = ProphetParams(**prophet_kwargs)
        self.model = None

    def fit(self, df):
        """Fit the model to a dataframe with 'ds', 'y' and required regressor columns."""
        # Ensure we have a valid time column for Kats TimeSeriesData
        df_copy = df.copy()
        if 'ds' in df_copy.columns and not pd.api.types.is_datetime64_any_dtype(df_copy['ds']):
            df_copy['ds'] = pd.to_datetime(df_copy['ds'])

        ts = TimeSeriesData(df_copy, time_col_name="ds")
        self.model = ProphetModel(data=ts, params=self.params)
        self.model.fit()
        return self

    def predict(self, df=None):
        """Predict using the model for a given dataframe with 'ds' and regressor columns."""
        if df is None:
            # Predict over the training data
            return self.model.predict(steps=0, include_history=True)

        df_copy = df.copy()
        if 'ds' in df_copy.columns and not pd.api.types.is_datetime64_any_dtype(df_copy['ds']):
            df_copy['ds'] = pd.to_datetime(df_copy['ds'])

        self.model.raw_future_df_hack = df_copy
        return self.model.predict(steps=len(df_copy), future=df_copy)
