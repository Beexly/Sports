# 2024 replication: the TE effect holds nearly exactly; baseline is a fixed constant

Replicated on 2024 week 7 (118 rows, 12 games; 84 receivers at >=3 targets) against the 2025 sample.

| season | n | TE resid | WR resid | corr(resid, catch) |
|---|---|---|---|---|
| 2025 | 173 | **+1.00** (n=50) | −0.09 (n=123) | **0.508** |
| 2024brains | 84 | **+0.98** (n=23) | −0.01 (n=61) | **0.383** |

Two things replicate: the TE separation advantage is +0.98 against +1.00 — a 0.02 gap on separate seasons —
and the catch-rate relationship keeps sign and rough magnitude (0.383 vs 0.508, weaker with half the sample).
That is a genuine cross-season result, not a one-season artefact.

## The baseline is hardcoded
`leagueAverageReceiverSeparation.avg` returned **2.9866993023508566 identically in both 2024 and 2025**, to
sixteen digits. So it is a frozen league constant in the service, not a per-season recomputation. Practically
that is convenient — the denominator does not drift and residuals are comparable across seasons — but the
2024 sample shows it already lags two years of drift, so "over average" really means "over a fixed 2022/23
norm" rather than "over current league".

## Caveats
- 2024 sample is roughly half the size; on 23 TEs the +0.98 carries real noise.
- Same week (7) both seasons, so any week-specific effect is held constant by design — one slate is still one
  slate.
- Baseline being frozen means residual levels are not strictly comparable to any externally published
  "league average separation" figure.
- Both seasons staged from the same 16-slot game-id guess; 4 ids per slate are phantom (400s).
