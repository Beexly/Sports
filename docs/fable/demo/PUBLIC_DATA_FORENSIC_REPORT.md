# Public Data Forensic Report

Fixture identity:
- `fixture-nfl-public-001`

Data source:
- Fixture-only record using the `nflverse` source id.

Source freshness:
- Fixture value: 42 minutes.
- This is not a live feed freshness claim.

Derived features:
- injury timing delta
- depth chart instability
- source freshness minutes

Model disagreement or uncertainty:
- Market-open probability: 0.48.
- Current model probability: 0.59.
- Fixture probability delta: 0.11.
- GSE would flag model-market probability disagreement.

Calibration caveat:
- No calibration improvement is claimed.
- This fixture does not estimate Brier, ECE, or hit rate.

Drift or segment caveat:
- The fixture does not have enough sample size for segment drift.

Market movement caveat:
- The fixture approximates market-open versus current-model disagreement.
- It does not verify live book movement.

What GSE would flag:
- Model-market probability disagreement.
- Public event timing changed after market open.
- Depth chart instability requires review.

What GSE would not claim:
- Betting edge.
- Prediction superiority.
- Live market accuracy.
- Official tracking-data equivalence.

Why this is safe:
- It is checked-in fixture data.
- It uses a source id already present in the rights registry.
- It does not scrape, store, or redistribute live third-party data.
