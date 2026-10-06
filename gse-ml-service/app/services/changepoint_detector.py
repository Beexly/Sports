import pandas as pd
import numpy as np
from typing import List, Dict, Any, Tuple, Optional
from datetime import timedelta

from app.kats_vendored.consts import TimeSeriesData
from app.kats_vendored.detectors.bocpd import BOCPDetector, BOCPDModelType
from app.kats_vendored.detectors.cusum_detection import CUSUMDetector
from app.kats_vendored.detectors.stat_sig_detector import StatSigDetectorModel

class ChangepointDetectorSuite:
    """
    Unified Changepoint Detection Suite for the GSE engine using vendored Kats detectors.

    CRITICAL CONSTRAINT:
    CUSUM, BOCPD, and OutlierDetector treat observations as equally spaced and operate on the value array
    by index. An offseason gap becomes "adjacent indices" if not handled carefully.
    Models here deliberately operate in GAME-INDEX space, per season.
    Never feed a series spanning an offseason to this detector suite.
    OutlierDetector silently interpolates if it fails pd.infer_freq, doing asfreq("D") + polynomial interpolation,
    which will fabricate months of daily data across an offseason gap.
    Therefore, always pass continuous, gap-less series representing game indexes, and this suite
    will construct dummy daily timestamps to bypass Kats' datetime requirement.
    """

    SPORT_PRESETS = {
        "NFL": {
            # Steam moves and injury shocks on INTRADAY line-movement series.
            "bocpd_model": BOCPDModelType.NORMAL_KNOWN_MODEL,
            "bocpd_threshold": 0.5,
            "cusum_scan_window": 10,
            "cusum_historical_window": 20,
            "stat_sig_window_size": 5,
        },
        "NBA": {
            # Load-management breaks, rotation changes, post-trade mean shifts.
            "bocpd_model": BOCPDModelType.NORMAL_KNOWN_MODEL,
            "bocpd_threshold": 0.5,
            "cusum_scan_window": 5,
            "cusum_historical_window": 15,
            "stat_sig_window_size": 7,
        },
        "MLB": {
            # Pitcher injury/form breaks, slow park-factor drift.
            "bocpd_model": BOCPDModelType.NORMAL_KNOWN_MODEL,
            "bocpd_threshold": 0.5,
            "cusum_scan_window": 15,
            "cusum_historical_window": 30,
            "stat_sig_window_size": 10,
        },
        "NHL": {
            # Goalie changes, coaching/system changes, xG mean shifts.
            "bocpd_model": BOCPDModelType.NORMAL_KNOWN_MODEL,
            "bocpd_threshold": 0.5,
            "cusum_scan_window": 8,
            "cusum_historical_window": 20,
            "stat_sig_window_size": 7,
        },
        "Soccer": {
            # Transfer windows (squad changes overnight), managerial changes.
            "bocpd_model": BOCPDModelType.NORMAL_KNOWN_MODEL,
            "bocpd_threshold": 0.5,
            "cusum_scan_window": 5,
            "cusum_historical_window": 10,
            "stat_sig_window_size": 5,
        }
    }

    @staticmethod
    def _to_kats_ts(series: List[float]) -> TimeSeriesData:
        """
        Converts a list of values into Kats TimeSeriesData.
        Creates dummy daily timestamps starting from 2000-01-01 to satisfy Kats,
        enforcing equal spacing and avoiding interpolation traps.
        """
        dates = pd.date_range(start="2000-01-01", periods=len(series), freq="D")
        df = pd.DataFrame({"time": dates, "value": series})
        return TimeSeriesData(df)

    def detect_bocpd(self, series: List[float], sport: str) -> List[int]:
        """Runs Bayesian Online Changepoint Detection (BOCPD)"""
        preset = self.SPORT_PRESETS.get(sport, self.SPORT_PRESETS["NBA"])
        ts = self._to_kats_ts(series)

        try:
            detector = BOCPDetector(ts)
            changepoints = detector.detector(model=preset["bocpd_model"], choose_priors=False)
            if not changepoints:
                return []

            detected_indices = []
            for cp in changepoints:
                if isinstance(cp, tuple):
                    cp_obj = cp[0]
                else:
                    cp_obj = cp
                # Find index of the changepoint time
                idx = (cp_obj.start_time - pd.Timestamp("2000-01-01")).days
                if getattr(cp_obj, "confidence", 1.0) >= preset["bocpd_threshold"]:
                    detected_indices.append(idx)
            return detected_indices
        except Exception as e:
            print(f"BOCPD Error: {e}")
            return []

    def detect_cusum(self, series: List[float], sport: str) -> List[int]:
        """Runs Cumulative Sum (CUSUM) Changepoint Detection"""
        preset = self.SPORT_PRESETS.get(sport, self.SPORT_PRESETS["NBA"])
        ts = self._to_kats_ts(series)

        try:
            detector = CUSUMDetector(ts)
            changepoints = detector.detector(
                scan_window=preset["cusum_scan_window"],
                historical_window=preset["cusum_historical_window"]
            )
            if not changepoints:
                return []

            detected_indices = []
            for cp in changepoints:
                idx = (cp.start_time - pd.Timestamp("2000-01-01")).days
                detected_indices.append(idx)
            return detected_indices
        except Exception as e:
            print(f"CUSUM Error: {e}")
            return []

    def detect_statsig(self, series: List[float], sport: str) -> List[int]:
        """Runs Statistical Significance Changepoint Detection"""
        preset = self.SPORT_PRESETS.get(sport, self.SPORT_PRESETS["NBA"])

        if len(series) < preset["stat_sig_window_size"] * 2:
            return [] # Series too short for window size

        ts = self._to_kats_ts(series)

        try:
            detector = StatSigDetectorModel(n_control=preset["stat_sig_window_size"], n_test=preset["stat_sig_window_size"])
            anomalies = detector.fit_predict(ts, window_size=preset["stat_sig_window_size"])

            # anomalies is an AnomalyResponse which has scores TimeSeriesData
            scores = anomalies.scores.value

            detected_indices = []

            # The stat sig detector returns 1.0 on anomaly. Since it's point by point,
            # we consider any value heavily significant as an anomaly,
            # but we debounce it by returning only the first index of a sequence

            in_anomaly = False
            for i in range(len(scores)):
                score = scores.iloc[i]
                if score >= 2.0: # Very strict threshold
                    if not in_anomaly:
                        detected_indices.append(i)
                        in_anomaly = True
                else:
                    in_anomaly = False

            return detected_indices
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"StatSig Error: {e}")
            return []

    def detect_all(self, series: List[float], sport: str) -> Dict[str, List[int]]:
        """Runs all detectors and returns dictionary of results"""
        if not series or len(series) < 3:
            return {"bocpd": [], "cusum": [], "statsig": []}

        return {
            "bocpd": self.detect_bocpd(series, sport),
            "cusum": self.detect_cusum(series, sport),
            "statsig": self.detect_statsig(series, sport)
        }
