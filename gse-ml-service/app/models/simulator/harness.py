from datetime import timedelta
from typing import List, Dict, Any, Callable
import pandas as pd
import numpy as np

from .kats_simulator import Simulator


def nfl_steam_move() -> pd.DataFrame:
    """Synthetic steam moves on intraday line series."""
    sim = Simulator(n=300, freq="15min", start="2023-01-01")
    ts = sim.level_shift_sim(cp_arr=[200], level_arr=[0.0, 3.0], noise=0.1, seasonal_period=7, seasonal_magnitude=0.0)
    df = ts.to_dataframe()
    df["synthetic"] = True
    df["sport"] = "NFL"
    df["anomaly_type"] = "level_shift"
    df["anomaly_location"] = 200
    df["anomaly_magnitude"] = 3.0
    return df

def nba_rest_break() -> pd.DataFrame:
    """Synthetic rest-break structural breaks (load management)."""
    sim = Simulator(n=100, freq="1D", start="2023-01-01")
    ts = sim.level_shift_sim(cp_arr=[50], level_arr=[0.0, -15.0], noise=2.0, seasonal_period=7, seasonal_magnitude=0.0)
    df = ts.to_dataframe()
    df["synthetic"] = True
    df["sport"] = "NBA"
    df["anomaly_type"] = "level_shift"
    df["anomaly_location"] = 50
    df["anomaly_magnitude"] = -15.0
    return df

def mlb_pitcher_injury() -> pd.DataFrame:
    """Synthetic pitcher-injury form breaks."""
    # BOCPD usually relies on gaussian level assumptions; for a trend shift to be caught
    # well as a level shift, we make it a stronger magnitude.
    sim = Simulator(n=150, freq="1D", start="2023-01-01")
    # Kats trend shift uses intercept and slope.
    # we can use a level shift instead to simulate form break, because bocpd here is level-based
    ts = sim.level_shift_sim(cp_arr=[100], level_arr=[0.0, -5.0], noise=1.0, seasonal_period=7, seasonal_magnitude=0.0)
    df = ts.to_dataframe()
    df["synthetic"] = True
    df["sport"] = "MLB"
    df["anomaly_type"] = "level_shift"
    df["anomaly_location"] = 100
    df["anomaly_magnitude"] = -5.0
    return df

def nhl_goalie_change() -> pd.DataFrame:
    """Synthetic goalie-change breaks."""
    sim = Simulator(n=120, freq="1D", start="2023-01-01")
    ts = sim.level_shift_sim(cp_arr=[80], level_arr=[0.0, 1.0], noise=0.2, seasonal_period=7, seasonal_magnitude=0.0)
    df = ts.to_dataframe()
    df["synthetic"] = True
    df["sport"] = "NHL"
    df["anomaly_type"] = "level_shift"
    df["anomaly_location"] = 80
    df["anomaly_magnitude"] = 1.0
    return df

def soccer_transfer_window() -> pd.DataFrame:
    """Synthetic transfer-window structural breaks."""
    sim = Simulator(n=180, freq="1D", start="2023-01-01")
    ts = sim.level_shift_sim(cp_arr=[90], level_arr=[0.0, 2.5], noise=0.5, seasonal_period=7, seasonal_magnitude=0.0)
    df = ts.to_dataframe()
    df["synthetic"] = True
    df["sport"] = "Soccer"
    df["anomaly_type"] = "level_shift"
    df["anomaly_location"] = 90
    df["anomaly_magnitude"] = 2.5
    return df

def generate_all_scenarios() -> Dict[str, pd.DataFrame]:
    return {
        "NFL": nfl_steam_move(),
        "NBA": nba_rest_break(),
        "MLB": mlb_pitcher_injury(),
        "NHL": nhl_goalie_change(),
        "Soccer": soccer_transfer_window(),
    }
