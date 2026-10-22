# Source Discovery And Proof Hierarchy

As of: 2026-06-09

## Source Inventory

See source-inventory.csv.

## Proof Hierarchy

TIER 1 - Official current source: NFL/team roster pages, official team staff pages, official transaction/news, official injury/practice reports, gamebooks, media guides when public.

TIER 2 - Maintained open data source: nflverse/nflreadr/nflfastR/nfl-data-py style rosters, IDs, history, depth/supporting datasets.

TIER 3 - Reputable public sports media source: ESPN, CBS, Yahoo, FOX, PFR, public fantasy/reference sources after legal review.

TIER 4 - News/transaction confirmation source: official team news, NFL news, reputable public reporting. Use as trigger/review evidence.

TIER 5 - Weak/auxiliary: fantasy pools, historical references, stale pages, unverified social/news mentions.

## Truth Rules

- Official team/NFL source wins unless stale or contradicted by newer official transaction evidence.
- A current official transaction can override an older roster page but should create NEEDS_REVIEW until roster pages catch up.
- Two independent non-official sources can increase confidence but should not override a fresh official source by themselves.
- Social/news sources can trigger review but should not silently update canonical truth.
- Fantasy sources are useful for player pools/status hints, not canonical roster truth.
- Unknown beats wrong.

## Smoke-Test Interpretation

Najee Harris and Rico Dowdle should be regression examples for source-backed truth. The test is not "set Najee to X" or "set Rico to Y"; the test is "if current source evidence says the canonical value differs from the rendered value, validation fails."

