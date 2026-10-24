# Validation And Accuracy Test Harness

As of: 2026-06-09

## Required Checks

- no active player assigned to multiple active teams unless conflict record exists
- no current player shown on stale team when newer transaction says otherwise
- no duplicate active player rows
- no duplicate jersey number conflicts unless allowed by status/source
- all public player cards have source evidence
- all current team assignments have freshness timestamp
- all roster statuses use normalized taxonomy
- all staff roles use normalized taxonomy
- no mock/demo player data leaks into production public surfaces
- no hardcoded roster constants without source annotation
- all team abbreviations normalize correctly
- stale data over threshold is flagged
- conflicts create review records
- source failures do not silently overwrite canonical truth
- source parser errors are logged
- regression examples are tested after current-source verification

## Commands To Add Later

- pnpm roster:audit
- pnpm roster:verify
- pnpm roster:diff
- pnpm roster:conflicts
- pnpm roster:stale
- pnpm test:roster

## Smoke Test Rule

Najee Harris and Rico Dowdle tests should assert that if current source evidence says the canonical team/status differs from rendered value, validation fails. Do not hardcode the replacement team in the test without refreshing fixtures.

