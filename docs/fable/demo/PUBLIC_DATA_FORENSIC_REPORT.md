# Public Data Forensic Report

Updated: 2026-07-03

Fixture path:
- `docs/fable/demo/fixture-public-forensic.json`

Command:

```bash
npm run fable:demo
```

Exact fixture identity:
- `fixture-nfl-public-001`

Exact output from the verified command:

```json
{
  "fixture_id": "fixture-nfl-public-001",
  "gse_flags": [
    "model-market probability disagreement",
    "public event timing changed after market open",
    "depth chart instability requires review"
  ],
  "probability_delta": 0.11,
  "uncertainty_flag": true,
  "would_not_claim": [
    "betting edge",
    "prediction superiority",
    "live market accuracy",
    "official tracking-data equivalence"
  ]
}
```

Probability delta definition:
- `abs(current_model_probability - market_open_probability)`.
- Fixture values: `abs(0.59 - 0.48) = 0.11`.

Why fixture-only matters:
- no scraping
- no network
- no proprietary data
- no keys
- no paid provider calls
- reproducible in CI/local tests

What the demo proves:
- the checked-in fixture parses
- the local forensic demo computes the expected probability delta
- the output carries uncertainty and explicit non-claims
- public event timing and depth-chart instability can be represented as review flags

What the demo does not prove:
- live market accuracy
- model improvement
- data rights for any live source
- live feed freshness
- official tracking-data equivalence
- production deployment

Falsification:
- change the fixture probabilities and the delta must change deterministically
- remove required fixture fields and schema parsing must fail
- add live-source claims without evidence and `npm run fable:claims` should fail

Live-public mode would require:
- `GSE_FABLE_LIVE_PUBLIC_DEMO_ENABLED=true`
- approved public source list
- source-rights registry entry
- no secrets in logs
- network-safe fetch policy
- replayable command output
- owner approval

Current live-public setting:
- `GSE_FABLE_LIVE_PUBLIC_DEMO_ENABLED=false`
