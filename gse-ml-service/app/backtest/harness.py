import pandas as pd
from datetime import timedelta
from typing import List, Dict, Any, Tuple
import logging

from app.backtest.kats.datapartition import RollingOriginDataParition
from app.backtest.kats.consts import TimeSeriesData

class PointInTimeViolation(Exception):
    pass


def validate_point_in_time(train_df: pd.DataFrame, test_df: pd.DataFrame, feature_as_of_cols: Dict[str, str], origin_time: pd.Timestamp):
    """
    Validates that any regressor used in a fold was knowable at the forecast origin.
    `feature_as_of_cols` maps a feature column name to its corresponding 'as_of' timestamp column.

    If any row in `train_df` or `test_df` contains a feature whose `as_of` timestamp is > `origin_time`,
    it is a violation.
    """
    for df in [train_df, test_df]:
        for feature_col, as_of_col in feature_as_of_cols.items():
            if as_of_col in df.columns:
                leaks = df[df[as_of_col] > origin_time]
                if not leaks.empty:
                    raise PointInTimeViolation(
                        f"Feature '{feature_col}' has data knowable after origin time {origin_time}. "
                        f"Found {len(leaks)} leaking rows."
                    )


def build_sport_partition_configs() -> Dict[str, Any]:
    """
    Build season-aware partition configs per sport.
    The splitter enforces time order by construction.
    Folds must not span an offseason without a gap.
    embargoes are modelled using window_frac gap between train and test.
    """
    return {
        "NFL": {
            "min_train_size": 30,
            "expanding_steps": 4,
            "window_frac": 0.05,
            "season_length": 150
        },
        "NBA": {
            "min_train_size": 20,
            "expanding_steps": 5,
            "window_frac": 0.02,
            "season_length": 180
        },
        "MLB": {
            "min_train_size": 40,
            "expanding_steps": 5,
            "window_frac": 0.01,
            "season_length": 180
        },
        "NHL": {
            "min_train_size": 20,
            "expanding_steps": 5,
            "window_frac": 0.02,
            "season_length": 180
        },
        "SOCCER": {
            "min_train_size": 10,
            "expanding_steps": 5,
            "window_frac": 0.05,
            "season_length": 300
        }
    }


def enforce_season_aware_partition(train_df: pd.DataFrame, time_col: str, season_col: str, season_length_days: int):
    """
    HARD INVARIANT: Never let a fold's training window span an offseason without a gap.
    We enforce that if multiple seasons are in the training fold, the time gap between
    the end of one season and the start of the next is explicitly present.
    """
    if len(train_df) < 2 or season_col not in train_df.columns:
        return

    train_df = train_df.sort_values(time_col)

    seasons = train_df[season_col].unique()
    if len(seasons) > 1:
        offseason_min_gap = 365 - season_length_days - 30 # rough approximation

        # Check the boundary between each consecutive season present in the fold
        for i in range(len(seasons) - 1):
            s1 = seasons[i]
            s2 = seasons[i+1]

            s1_end = train_df[train_df[season_col] == s1][time_col].max()
            s2_start = train_df[train_df[season_col] == s2][time_col].min()

            if (s2_start - s1_end).days < offseason_min_gap:
                raise ValueError(f"Training fold spans seasons {s1} and {s2} but lacks the required offseason gap of at least {offseason_min_gap} days at the boundary.")


class GSEBacktestHarness:
    def __init__(self, sport: str, feature_as_of_cols: Dict[str, str], time_col: str = "time", season_col: str = "season"):
        self.sport = sport
        self.configs = build_sport_partition_configs()
        if sport not in self.configs:
            raise ValueError(f"Unknown sport {sport}")
        self.config = self.configs[sport]
        self.feature_as_of_cols = feature_as_of_cols
        self.time_col = time_col
        self.season_col = season_col

    def get_partitions(self, df: pd.DataFrame) -> List[Tuple[pd.DataFrame, pd.DataFrame]]:
        """
        Returns list of (train_df, test_df)
        """
        # Kats expects numeric data, so we create a minimal df for it to partition
        minimal_df = df[[self.time_col]].copy()
        minimal_df['dummy'] = 1.0
        ts = TimeSeriesData(minimal_df, time_col_name=self.time_col)

        n = len(df)
        train_frac = self.config["min_train_size"] / n if n > 0 else 0.5
        train_frac = min(max(train_frac, 0.1), 0.9)

        test_frac = (1.0 - train_frac) / self.config["expanding_steps"]
        test_frac = min(test_frac, 0.9 - train_frac)

        window_frac = self.config["window_frac"]

        partitioner = RollingOriginDataParition(
            start_train_frac=train_frac,
            test_frac=test_frac,
            expanding_steps=self.config["expanding_steps"],
            window_frac=window_frac
        )

        splits = partitioner.split(ts)
        results = []

        indexed_df = df.set_index(self.time_col)

        for train_ts, test_ts in splits:
            # Reconstruct original train_df and test_df
            train_df = indexed_df.loc[train_ts.time.values].reset_index()
            test_df = indexed_df.loc[test_ts.time.values].reset_index()

            # Enforce season-aware partition invariant
            if self.season_col in train_df.columns and "season_length" in self.config:
                enforce_season_aware_partition(train_df, self.time_col, self.season_col, self.config["season_length"])

            # Point-in-time discipline
            origin_time = test_df[self.time_col].min()
            validate_point_in_time(train_df, test_df, self.feature_as_of_cols, origin_time)

            results.append((train_df, test_df))

        return results
