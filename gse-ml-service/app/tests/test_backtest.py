
import pytest
import pandas as pd
from datetime import datetime, timedelta
import numpy as np

from app.backtest.harness import GSEBacktestHarness, PointInTimeViolation, validate_point_in_time
from app.backtest.kats.emp_confidence_int import EmpConfidenceInt
from app.backtest.kats.consts import TimeSeriesData


def create_mock_nfl_data():
    dates = pd.date_range(start="2024-09-01", periods=100, freq="D")
    s1 = ["2024"] * 50
    s2 = ["2025"] * 50
    seasons = s1 + s2
    as_of_dates = pd.Timestamp("2024-01-01")

    df = pd.DataFrame({
        "time": dates,
        "season": seasons,
        "feature_1": np.random.randn(100),
        "feature_1_as_of": as_of_dates,
        "y": np.random.randn(100)
    })
    return df

def test_no_lookahead_multi_season():
    dates1 = pd.date_range(start="2024-09-01", periods=50, freq="D")
    dates2_nogap = pd.date_range(start="2024-10-21", periods=50, freq="D")
    dates2_gap = pd.date_range(start="2025-09-01", periods=50, freq="D")

    df_nogap = pd.DataFrame({
        "time": dates1.append(dates2_nogap),
        "season": ["2024"]*50 + ["2025"]*50,
        "feature_1": np.random.randn(100),
        "feature_1_as_of": pd.Timestamp("2024-01-01"),
        "y": np.random.randn(100)
    })

    harness = GSEBacktestHarness(sport="NFL", feature_as_of_cols={"feature_1": "feature_1_as_of"})

    with pytest.raises(ValueError, match="lacks the required offseason gap"):
        harness.get_partitions(df_nogap)

    df_gap = pd.DataFrame({
        "time": dates1.append(dates2_gap),
        "season": ["2024"]*50 + ["2025"]*50,
        "feature_1": np.random.randn(100),
        "feature_1_as_of": pd.Timestamp("2024-01-01"),
        "y": np.random.randn(100)
    })

    partitions = harness.get_partitions(df_gap)
    assert len(partitions) > 0


def test_deliberately_leaky_partition():
    df = create_mock_nfl_data()
    df["season"] = "2024"
    harness = GSEBacktestHarness(sport="NFL", feature_as_of_cols={"feature_1": "feature_1_as_of"})

    train_df = df.iloc[:30].copy()
    origin_time = df.iloc[30]["time"]

    train_df.loc[10, "feature_1_as_of"] = origin_time + timedelta(days=1)

    with pytest.raises(PointInTimeViolation, match="Feature 'feature_1' has data knowable after origin time"):
        validate_point_in_time(train_df, pd.DataFrame(), {"feature_1": "feature_1_as_of"}, origin_time)

    train_df = df.iloc[:30].copy()
    test_df = df.iloc[30:60].copy()
    test_df.loc[40, "feature_1_as_of"] = origin_time + timedelta(days=5)

    with pytest.raises(PointInTimeViolation, match="Feature 'feature_1' has data knowable after origin time"):
        validate_point_in_time(train_df, test_df, {"feature_1": "feature_1_as_of"}, origin_time)


class DummyParams:
    def validate_params(self):
        pass

class DummyModel:
    def __init__(self, data: TimeSeriesData, params):
        self.data = data
        self.params = params

    def fit(self):
        pass

    def predict(self, steps, include_history=False, **kwargs):
        last_time = self.data.time.max()
        future_dates = pd.date_range(start=last_time, periods=steps+1, freq="D")[1:]
        return pd.DataFrame({
            "time": future_dates,
            "fcst": np.ones(steps) * self.data.value.mean()
        })


def test_empirical_intervals_calibrate():
    dates = pd.date_range(start="2023-01-01", periods=100, freq="D")
    y = np.linspace(1, 10, 100) + np.random.randn(100) * 0.5
    df = pd.DataFrame({"time": dates, "y": y})
    ts = TimeSeriesData(df)

    eci = EmpConfidenceInt(
        error_methods=["mae"],
        data=ts,
        params=DummyParams(),
        train_percentage=50,
        test_percentage=10,
        sliding_steps=10,
        model_class=DummyModel,
        multi=True
    )

    intervals = eci.get_eci(steps=10)

    assert "fcst_lower" in intervals.columns
    assert "fcst_upper" in intervals.columns
    assert len(intervals) == 10
    assert (intervals["fcst_upper"] >= intervals["fcst_lower"]).all()
