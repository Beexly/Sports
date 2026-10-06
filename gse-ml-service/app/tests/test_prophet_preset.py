import pytest
import numpy as np

try:
    import pandas as pd
    from prophet import Prophet
    from app.models.prophet_preset import ProphetSportsPredictor
    HAVE_PROPHET = True
except ImportError:
    HAVE_PROPHET = False

@pytest.mark.skipif(not HAVE_PROPHET, reason="Prophet/pandas not installed")
def test_prophet_sports_predictor_presets():
    """Test that correct presets are applied per sport."""
    predictor_nfl = ProphetSportsPredictor("NFL")
    assert predictor_nfl.sport == "NFL"
    assert "wind" in predictor_nfl._regressors
    assert "temp" in predictor_nfl._regressors
    assert "short_week" in predictor_nfl._regressors
    assert "bye" in predictor_nfl._regressors

    predictor_nba = ProphetSportsPredictor("NBA")
    assert "back_to_back" in predictor_nba._regressors
    assert "in_season_tournament" in predictor_nba._regressors

    predictor_mlb = ProphetSportsPredictor("MLB")
    assert "wind" in predictor_mlb._regressors
    assert "temp" in predictor_mlb._regressors

    predictor_nhl = ProphetSportsPredictor("NHL")
    assert "back_to_back" in predictor_nhl._regressors

    predictor_soccer = ProphetSportsPredictor("SOCCER")
    assert "fixture_congestion" in predictor_soccer._regressors

    with pytest.raises(ValueError):
        ProphetSportsPredictor("BASKETWEAVING")

@pytest.mark.skipif(not HAVE_PROPHET, reason="Prophet/pandas not installed")
def test_prophet_multiple_seasonalities():
    """Test (a) multiple seasonalities fit and (c) missing dates don't break it."""
    # Generate a gappy series with a trend + yearly + weekly seasonality
    dates = pd.date_range("2020-01-01", "2022-01-01")
    # Introduce missing dates
    mask = (dates.day % 3 != 0)  # Keep some days
    dates = dates[mask]

    # Create the series
    df = pd.DataFrame({"ds": dates})

    # Yearly seasonality (approx 365.25 days)
    yearly = 5.0 * np.sin(2 * np.pi * df["ds"].dt.dayofyear / 365.25)
    # Weekly seasonality (7 days)
    weekly = 3.0 * np.cos(2 * np.pi * df["ds"].dt.dayofweek / 7.0)
    # Trend
    trend = 0.01 * np.arange(len(df))
    # Noise
    np.random.seed(42)
    noise = np.random.normal(0, 0.5, len(df))

    df["y"] = trend + yearly + weekly + noise
    # Add NFL regressors (just zeros for this test)
    df["wind"] = 0
    df["temp"] = 70
    df["short_week"] = 0
    df["bye"] = 0

    predictor = ProphetSportsPredictor("NFL", yearly_seasonality=True)
    predictor.fit(df)

    # Predict on the same dates
    future = predictor.predict(df)

    # Check that predictions are close to actuals (meaning it learned the seasonalities despite gaps)
    mae = np.abs(df["y"] - future["fcst"]).mean()
    assert mae < 1.0, f"MAE is too high: {mae}, it did not learn multiple seasonalities properly."
    assert len(future) == len(df), "Missing dates broke the output shape."

@pytest.mark.skipif(not HAVE_PROPHET, reason="Prophet/pandas not installed")
def test_prophet_regressors():
    """Test (b) a regressor moves the forecast the right direction."""
    dates = pd.date_range("2020-01-01", "2020-01-30")
    df = pd.DataFrame({"ds": dates})

    # Base values
    df["y"] = 100.0

    # Create a back_to_back regressor that heavily affects y
    df["back_to_back"] = 0
    df["in_season_tournament"] = 0  # Require for NBA model

    df.loc[df.index % 4 == 0, "back_to_back"] = 1
    # Effect of back_to_back is -10 points
    df["y"] -= 10.0 * df["back_to_back"]

    predictor = ProphetSportsPredictor("NBA")
    predictor.fit(df)

    # Now create a future dataframe where everything is back-to-back
    future1 = pd.DataFrame({"ds": pd.date_range("2020-02-01", "2020-02-05")})
    future1["back_to_back"] = 1
    future1["in_season_tournament"] = 0

    # Create a future dataframe where nothing is back-to-back
    future0 = pd.DataFrame({"ds": pd.date_range("2020-02-01", "2020-02-05")})
    future0["back_to_back"] = 0
    future0["in_season_tournament"] = 0

    pred1 = predictor.predict(future1)
    pred0 = predictor.predict(future0)

    # Check that the regressor moves the forecast in the right direction
    # A back_to_back should be lower than not back_to_back
    assert pred1["fcst"].mean() < pred0["fcst"].mean()
    # Specifically, it should learn roughly a 10 point drop
    diff = pred0["fcst"].mean() - pred1["fcst"].mean()
    assert 9.0 < diff < 11.0, f"Regressor effect {diff} is not correctly captured"
