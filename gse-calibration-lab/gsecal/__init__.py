"""
gsecal — GSE calibration lab core.

Pure-stdlib, read-only calibration analysis for Galaxy Sports Edge. No network,
no database, no writes to any product surface. Every metric is a proven port of
the production TypeScript (see metrics.py and parity/).

Why this exists: ECE is the single binding floor on the PROVEN gate, and the
pooled figure the gate reads can be lower than every stratum it is built from.
`decomposition.py` measures exactly how much of that gap is signed-error
cancellation, which is arithmetic no other tool in this repo performs.
"""

from gsecal.metrics import (  # noqa: F401
    BrierDecomposition,
    Bucket,
    Sample,
    base_rate,
    bin_index,
    brier_decomposition,
    brier_score,
    confidence_buckets,
    expected_calibration_error,
    maximum_calibration_error,
)

__version__ = "0.1.0"
