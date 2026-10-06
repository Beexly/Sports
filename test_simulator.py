import sys
sys.path.append('gse-ml-service')
from app.models.simulator.harness import mlb_pitcher_injury
df = mlb_pitcher_injury()
from app.models.simulator.changepoint_detectors import bocpd_lite
xs = df["value"].tolist()
w = max(5, min(50, len(xs) // 4))
mu0 = sum(xs[:w]) / w
cp_probs = bocpd_lite(xs, hazard=1/100.0, mu0=mu0, kappa0=1.0, alpha0=1.0, beta0=1.0)
print(max(cp_probs[70:]), 70 + cp_probs[70:].index(max(cp_probs[70:])))
