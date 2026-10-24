# Method Leakage Scan

As of: 2026-06-09

## Verified Safe Public Boundary

- /methodology returned 200.
- Public methodology copy explicitly says proprietary weights, constants, and aggregation formula stay private.
- apps/web/lib/trust-claims.ts and methodology UI appear designed to separate public claims from private method details.

## Private Source Exists

Private sports-intelligence logic and constants exist under packages/prediction-engine. That is expected, but release gates should scan public routes and bundles for accidental exposure.

## Launch Status

YELLOW. The visible methodology route is safe, but an automated public-bundle method leakage gate should be added before launch.
