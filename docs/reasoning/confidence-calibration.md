# Confidence calibration

Not computed.

`reasonAbout` does not emit confidence. The aggregation trace emits a count ratio and marks `confidenceIsProbability: false`. Scoring that ratio against `home_win` would treat a non-probability as a forecast. No reliability diagram and no Brier score of confidence were produced.

The one number that was scored against the 2025 outcomes is the spread-bucket gate in [gate-1910-08858-2025.md](gate-1910-08858-2025.md). That is a gate measurement, not a calibration of this trace.
