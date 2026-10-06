import pytest
from app.models.simulator.harness import generate_all_scenarios
from app.models.simulator.changepoint_detectors import cusum_detect, bocpd_lite

def test_scenarios():
    scenarios = generate_all_scenarios()

    for sport, df in scenarios.items():
        xs = df["value"].tolist()
        loc = df["anomaly_location"].iloc[0]

        # Test CUSUM
        k = 0.5
        h = 5.0
        # for MLB with small magnitude we might need a smaller h
        if sport == "MLB":
            k = 0.5
            h = 2.0
        elif sport == "NBA":
            h = 10.0

        alarms = cusum_detect(xs, k, h)
        assert len(alarms) > 0, f"CUSUM failed to detect anomaly in {sport}"

        # We allow a small delay for CUSUM to accumulate
        delay = 20
        found_near = any(loc <= a <= loc + delay for a in alarms)
        assert found_near, f"CUSUM detected anomaly at {alarms}, expected near {loc} for {sport}"

        # Test BOCPD
        # Set mu0 near the initial mean
        w = max(5, min(50, len(xs) // 4))
        mu0 = sum(xs[:w]) / w
        cp_probs = bocpd_lite(xs, hazard=1/50.0, mu0=mu0, kappa0=0.1, alpha0=1.0, beta0=1.0)

        max_prob = max(cp_probs)
        max_idx = cp_probs.index(max_prob)

        # BOCPD usually spikes right at or 1-2 steps after the change
        # Threshold at 0.1 for MLB trend change which might be slower to pick up
        assert max_prob > 0.1, f"BOCPD failed to find a strong changepoint in {sport}: {max_prob}"
        assert abs(max_idx - loc) <= delay, f"BOCPD max prob at {max_idx}, expected near {loc} in {sport}"
