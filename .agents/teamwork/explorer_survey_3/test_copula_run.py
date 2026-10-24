import json
import numpy as np
from pathlib import Path
import sys

repo = Path(r"c:\Users\Garrett\Sports")
sys.path.insert(0, str(repo))

from intelligence.sgp.sgp_copula_engine import (
    Leg,
    NormalMarginal,
    LogNormalMarginal,
    PoissonMarginal,
    price_sgp,
    over,
    under,
)

# Load empirical correlation matrix
corr_path = repo / "data" / "snapshots" / "sgp_correlations.json"
corr_data = json.loads(corr_path.read_text(encoding="utf-8"))
joint_8x8 = np.array(corr_data["joint_matrix"])
print("Loaded 8x8 empirical correlation matrix. Shape:", joint_8x8.shape)
print("Eigenvalues:", np.linalg.eigvalsh(joint_8x8))

# Test pricing a 3-leg SGP using the empirical correlation:
# e.g. QB Passing Yards (idx 0) + WR Receiving Yards (idx 2) + opposing QB Passing Yards (idx 4)
# Or QB Passing Yards + WR Receiving Yards + QB Passing TDs (idx 0, 1, 2)
sub_idx = [0, 1, 2]
sub_corr = joint_8x8[np.ix_(sub_idx, sub_idx)]
print("\nSub-correlation matrix [qb_pass_yds, qb_pass_tds, wr_rec_yds]:\n", sub_corr)

legs = [
    Leg(LogNormalMarginal(mean=265.0, sd=45.0), over(252.5), "C.J. Stroud Over 252.5 Pass Yds"),
    Leg(PoissonMarginal(lam=1.85), over(1.5), "C.J. Stroud Over 1.5 Pass TDs"),
    Leg(LogNormalMarginal(mean=82.0, sd=26.0), over(72.5), "Nico Collins Over 72.5 Rec Yds"),
]

res = price_sgp(
    legs=legs,
    correlation=sub_corr,
    copula="student-t",
    nu=4.0,
    n_draws=50000,
    book_price_american=425.0,
    seed=42,
)

print(f"\nResult:")
print(f"  Leg probs: {[round(p, 4) for p in res.leg_probabilities]}")
print(f"  Independent joint: {res.independent_joint:.4f}")
print(f"  True Student-t Copula joint: {res.true_joint:.4f}")
print(f"  Lift: {res.correlation_lift*100:.2f}% (z={res.z_score:+.2f})")
print(f"  Is edge vs +425: {res.is_edge}, Alpha: {res.alpha*100:.2f}%")
