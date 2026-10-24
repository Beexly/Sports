"""ARCHIVE CROSS-REF MILL: is the totals market under-adjusted in high wind?

Claim from the local archive (NFLWindPropAdjustmentMapping.md, line 33):
"15-20 mph ... Totals under-adjusted by market here."
Pre-registered test: mean(actual total - closing total_line) for wind >= 15
vs wind <= 8, 2019-2025. Positive deviation in high wind = market sets totals
too high = UNDER (actual runs under). The archive's phrasing "under-adjusted" is
ambiguous; we test BOTH readings:
  (a) totals too HIGH in wind -> mean dev(wind>=15) < mean dev(wind<=8)
  (b) totals too LOW in wind -> mean dev(wind>=15) > mean dev(wind<=8)
Either way, a gap > ~1.5 pts with n >= 100 is a flag; inside that is efficient.
"""
import numpy as np
import pandas as pd

DATA = "data"
sched = pd.read_csv(f"{DATA}/schedules.csv", low_memory=False)
s = sched[(sched.game_type == "REG")].dropna(
    subset=["home_score", "away_score", "total_line", "wind"]).copy()
s["total"] = s.home_score + s.away_score
s["dev"] = s.total - s.total_line
s["bin"] = np.where(s.wind <= 8, "calm<=8",
                    np.where(s.wind < 15, "9-14", "wind>=15"))
g = s.groupby("bin").agg(n=("dev", "size"), mean_dev=("dev", "mean"),
                         sd=("dev", "std"))
print(g.round(2).to_string())
calm = s[s.bin == "calm<=8"].dev
windy = s[s.bin == "wind>=15"].dev
mid = s[s.bin == "9-14"].dev
diff = float(windy.mean() - calm.mean())
se = float(np.sqrt(windy.var() / len(windy) + calm.var() / len(calm)))
z = diff / se
print(f"\ndev(wind>=15) - dev(calm): {diff:+.2f} pts  (z={z:+.2f}, n_wind={len(windy)}, n_calm={len(calm)})")
direction = "totals run UNDER in wind (market sets too high)" if diff < 0 else \
    "totals run OVER in wind (market sets too low)"
print(f"reading: {direction}")
print(f"verdict vs 1.5-pt bar: {'FLAG - mispricing angle' if abs(diff) > 1.5 else 'efficient inside bar'}")
# completion cross-check of the archive's 20-25 tier claim, finer bin
fine = s[np.isfinite(s.wind)].copy()
fine["wbin"] = pd.cut(fine.wind, [0, 8, 14, 19, 24, 60],
                      labels=["<=8", "9-14", "15-19", "20-24", "25+"])
print("\nfine bins (mean dev):")
print(fine.groupby("wbin", observed=True).dev.agg(["size", "mean"]).round(2).to_string())
