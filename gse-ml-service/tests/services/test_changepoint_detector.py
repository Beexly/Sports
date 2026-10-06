import pytest
import numpy as np
from app.services.changepoint_detector import ChangepointDetectorSuite

def generate_flat_series(length: int = 50, noise: float = 0.1) -> list[float]:
    """Generates a flat series with some noise, no changepoints."""
    np.random.seed(42)
    return list(np.random.normal(10, noise, length))

def generate_step_series(length: int = 60, changepoint_idx: int = 30, step_size: float = 5.0, noise: float = 0.5) -> list[float]:
    """Generates a series with a clear mean shift at changepoint_idx."""
    np.random.seed(42)
    series = np.random.normal(10, noise, length)
    series[changepoint_idx:] += step_size
    return list(series)

class TestChangepointDetectorSuite:
    def setup_method(self):
        self.detector = ChangepointDetectorSuite()
        self.flat_series = generate_flat_series()
        # NFL specific setup - shorter windows for testing
        self.nfl_series = generate_step_series(length=80, changepoint_idx=40, step_size=8.0, noise=0.2)

    def test_flat_series_no_changepoints(self):
        """Detectors should stay quiet on a flat series."""
        results = self.detector.detect_all(self.flat_series, sport="NBA")

        # CUSUM and BOCPD should not detect spurious changepoints
        assert len(results["bocpd"]) == 0, f"BOCPD found unexpected changepoints: {results['bocpd']}"
        assert len(results["cusum"]) == 0, f"CUSUM found unexpected changepoints: {results['cusum']}"
        assert len(results["statsig"]) == 0, f"StatSig found unexpected changepoints: {results['statsig']}"

    def test_bocpd_detects_step(self):
        """BOCPD should fire on a known changepoint."""
        results = self.detector.detect_bocpd(self.nfl_series, sport="NFL")

        assert len(results) > 0, "BOCPD failed to detect the changepoint"
        # The detected changepoint should be near index 40
        assert any(35 <= cp <= 45 for cp in results), f"BOCPD changepoint {results} not near expected 40"

    def test_cusum_detects_step(self):
        """CUSUM should fire on a known changepoint."""
        results = self.detector.detect_cusum(self.nfl_series, sport="NFL")

        assert len(results) > 0, "CUSUM failed to detect the changepoint"
        # The detected changepoint should be near index 40
        assert any(35 <= cp <= 45 for cp in results), f"CUSUM changepoint {results} not near expected 40"

    def test_statsig_detects_step(self):
        """StatSig should fire on a known changepoint."""
        # Using a very clear, massive shift for statsig to ensure it fires
        massive_shift_series = generate_step_series(length=60, changepoint_idx=30, step_size=20.0, noise=0.1)
        results = self.detector.detect_statsig(massive_shift_series, sport="NBA")

        # We might get multiple stat sig peaks, but one should be near 30
        assert len(results) > 0, "StatSig failed to detect the changepoint"
        assert any(25 <= cp <= 35 for cp in results), f"StatSig changepoint {results} not near expected 30"
